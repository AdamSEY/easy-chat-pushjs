const { Server } = require('./lib/Server');
const fs = require('fs');

const { VERSION, ZMQ_ADDRESS, FIREBASE_API_KEY} = process.env;
const jwtPublicKey = '/etc/easy-chat-pushjs/config/jwtRS256.key.pub';

const config = {
    // zmqServerAddress: 'tcp://0.0.0.0:3500', // in case you want to connect to the server from another machine.
    // Not secure. Use firewall to allow access only from private/trusted IP addresses to the port.
    zmqServerAddress: ZMQ_ADDRESS !== 'null' ? ZMQ_ADDRESS : 'tcp://127.0.0.1:3500',
    version: VERSION ? VERSION : 1.0,
    jwtPublicKey: jwtPublicKey,
    wsPort: 5511,
    firebaseApiKey: FIREBASE_API_KEY ? FIREBASE_API_KEY : undefined,
    onUserDisconnects: (userInfo) => { console.log('user disconnected', { userInfo }) },
    onUserConnects: (userInfo) => { console.log('user connected', { userInfo }) }
}

if (!fs.existsSync(jwtPublicKey)) {
    console.log('JWT Public Key not found');
} else {
    const websocket = new Server(config);
    websocket.startServer();
}

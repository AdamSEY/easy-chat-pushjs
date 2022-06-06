const { Server } = require('./lib/Server');
const fs = require('fs');

const { VERSION, FIREBASE_DATABASE_URL, ZMQ_ADDRESS } = process.env;
const firebaseSdkPath = '/etc/easy-chat-pushjs/config/firebase_admin_sdk.json';
const jwtPublicKey = '/etc/easy-chat-pushjs/config/jwtRS256.key.pub';

const config = {
    // zmqServerAddress: 'tcp://0.0.0.0:3500', // in case you want to connect to the server from another machine.
    // Not secure. Use firewall to allow access only from private/trusted IP addresses to the port.
    zmqServerAddress: ZMQ_ADDRESS !== 'null' ? ZMQ_ADDRESS : 'tcp://127.0.0.1:3500',
    version: VERSION ? VERSION : 1.0,
    jwtPublicKey: jwtPublicKey,
    wsPort: 5511,
    onUserDisconnects: (userInfo) => { console.log('user disconnected', { userInfo }) },
    onUserConnects: (userInfo) => { console.log('user connected', { userInfo }) }
}

if (fs.existsSync(firebaseSdkPath) && fs.statSync(firebaseSdkPath).size > 0) {
    config.firebaseAdminSdkPath = firebaseSdkPath;
}
if (FIREBASE_DATABASE_URL && FIREBASE_DATABASE_URL !== 'null') {
    config.firebaseDatabaseURL = FIREBASE_DATABASE_URL;
}

console.log('Firebase Admin SDK Path:', config.firebaseAdminSdkPath ? config.firebaseAdminSdkPath : "NOT SET");
console.log('Firebase Database URL:', config.firebaseDatabaseURL ? config.firebaseDatabaseURL : "NOT SET");
if (!fs.existsSync(jwtPublicKey)) {
    console.log('JWT Public Key not found');
} else {
    const websocket = new Server(config);
    websocket.startServer();
}

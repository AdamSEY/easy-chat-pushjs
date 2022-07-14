//Starting the websocket server
const {Server} = require('easy-chat-pushjs');
const path = require('path');


const websocket = new Server({
    // zmqServerAddress: 'tcp://0.0.0.0:3500', // in case you want to connect to the server from another machine.
    // maybe if you're planning to have multiple websocket servers.
    // Not secure. Use firewall to allow access only from private/trusted IP addresses to the port.
    version: 1.0, // must match client's version, otherwise authentication will fail
    jwtPublicKey: path.dirname(__dirname) + './public.pem',
    firebaseApiKey: undefined,
    onMessageReceived: (decodedUserToken, websocketMessage)=>{ // onChatMessage received
        console.log({decodedUserToken, websocketMessage});
    },
    onUserDisconnects: (userInfo)=>{ console.log('User disconnected',{userInfo})}, // whenever a user disconnects. user is offline
    onUserConnects: (userInfo)=>{ console.log('User connected',{userInfo})} // // whenever a user connects. User is online
});

websocket.startServer();
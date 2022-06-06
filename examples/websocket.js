//Starting the websocket server
const {Server} = require('easy-chat-pushjs');
const path = require('path');


const firebaseAdminSdkPath = path.dirname(__dirname) + '/firebase_admin_sdk.json'; // get the file from firebase -> settings -> Service Account -> Firebase admin sdk.
const databaseUrl = 'https://EXAMPLE.firebaseio.com' // get the file from firebase -> settings -> Service Account -> Firebase admin sdk.

const websocket = new Server({
    // zmqServerAddress: 'tcp://0.0.0.0:3500', // in case you want to connect to the server from another machine.
    // maybe if you're planning to have multiple websocket servers.
    // Not secure. Use firewall to allow access only from private/trusted IP addresses to the port.
    version: 1.0, // must match client's version, otherwise authentication will fail
    firebaseAdminSdkPath: firebaseAdminSdkPath,// activating firebase notifications.
    firebaseDatabaseURL: databaseUrl, // // activating firebase notifications.
    jwtPublicKey: path.dirname(__dirname) + './public.pem',
    onMessageReceived: (decodedUserToken, websocketMessage)=>{ // onChatMessage received
        console.log({decodedUserToken, websocketMessage});
    },
    onUserDisconnects: (userInfo)=>{ console.log('User disconnected',{userInfo})}, // whenever a user disconnects. user is offline
    onUserConnects: (userInfo)=>{ console.log('User connected',{userInfo})} // // whenever a user connects. User is online
});

websocket.startServer();
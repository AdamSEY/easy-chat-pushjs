//Starting the websocket server
const {Server} = require('easy-chat-pushjs');
const path = require('path');


const firebaseAdminSdkPath = path.dirname(__dirname) + '/firebase_admin_sdk.json'; // get the file from firebase -> settings -> Service Account -> Firebase admin sdk.
const databaseUrl = 'https://EXAMPLE.firebaseio.com' // get the file from firebase -> settings -> Service Account -> Firebase admin sdk.

const websocket = new Server({
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
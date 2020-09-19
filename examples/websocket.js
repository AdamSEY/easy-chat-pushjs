const {Server} = require('../src/Server');
const path = require('path');
const fs = require('fs');

const firebaseAdminSdkPath = path.dirname(__dirname) + '/firebase_admin_sdk.json'; // get the file from firebase -> settings -> Service Account -> Firebase admin sdk.
const databaseUrl = 'https://EXAMPLE.firebaseio.com' // get the file from firebase -> settings -> Service Account -> Firebase admin sdk.

const websocket = new Server({
    version: 1.0,
    firebaseAdminSdkPath: firebaseAdminSdkPath,// activating firebase notifications.
    firebaseDatabaseURL: databaseUrl, // // activating firebase notifications.
    slackURL: "https://hooks.slack.com/EXAMPLE/...",
    jwtPublicKey: fs.readFileSync(path.dirname(__dirname) + './public.pem'),
    onMessageReceived: (decodedUserToken, websocketMessage)=>{
        console.log({decodedUserToken, websocketMessage});
    }
});

websocket.startServer();
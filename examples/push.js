const {User} = require('easy-chat-pushjs');
const path = require('path');

const user = new User({
    version: 1.0, // must match server's version, otherwise authentication will fail
    jwtPrivateKey: path.dirname(__dirname) + '/private.key',
    slackURL: "https://hooks.slack.com/EXAMPLE/...",
});
// create websocket token, send it to the client
const token = user.createUserToken(['gender', 'male'] , "CHAT_ROOM_NAME", 'USER_ID', "188.22.34.33",'signalling_room');

// publish a push notification to everyone connected to 'gender'
const publish = user.pushNotification('gender', {test: true} , null); // everyone in 'gender'
const publish2 = user.pushNotification(null, {test: true} , 'dasfasdasd2342'); // to a userID
const firebase = user.pushFirebaseNotifications(['FCM_TOKEN'], 'test', 'You have received a new request' );
const slack = user.pushSlackMessage('You have received a new request');

Promise.all([publish,publish2,firebase,slack,token]).then(res => {
    console.log(res);
})
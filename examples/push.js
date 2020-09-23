const {User} = require('easy-chat-pushjs');
const path = require('path');

const user = new User({
    version: 1.0,
    jwtPrivateKey: path.dirname(__dirname) + '/private.key',
    slackURL: "https://hooks.slack.com/EXAMPLE/...",
});

const token = user.createUserToken(['gender', 'male'] , null, 'dasfasdasd2342', {username: 'admin'});
const publish = user.pushNotification('gender', {test: true} , null);
const publish2 = user.pushNotification(null, {test: true} , 'dasfasdasd2342');
const firebase = user.pushFirebaseNotifications(['FCM_TOKEN'], 'test', 'You have received a new request' );
const slack = user.pushSlackMessage('You have received a new request');

Promise.all([publish,publish2,firebase,slack,token]).then(res => {
    console.log(res);
})
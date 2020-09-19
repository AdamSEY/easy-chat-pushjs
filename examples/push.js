const User = require('../src/User');
const fs = require('fs');
const path = require('path');

const user = new User({
    version: 1.0,
    jwtPrivateKey: fs.readFileSync(path.dirname(__dirname) + '/databases/private.key')
});

const token = user.createUserToken(['gender', 'male'] , false, 'dasfasdasd2342', {username: 'admin'});
const publish = user.pushNotification('gender', {test: true} , false);
const publish2 = user.pushNotification(false, {test: true} , 'dasfasdasd2342');
const firebase = user.pushFirebaseNotifications(['FCM_TOKEN'], 'test', 'You have received a new request' );
const slack = user.pushSlackMessage('You have received a new request');

Promise.all([publish,publish2,firebase,slack,token]).then(res => {
    console.log(res);
})
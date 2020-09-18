const User = require('../src/User');
const fs = require('fs');
const path = require('path');

const user = new User({
    version: 1.0,
    jwtPrivateKey: fs.readFileSync(path.dirname(__dirname) + '/databases/private.key')
});

const token = user.createUserToken('testChannelName' , false, 'Admin', 'dasfasdasd2342');
const publish = user.pushNotification('testChannelName', {test: true} , false)
const firebase = user.pushFirebaseNotifications(['dasdas'], 'test', 'You have received a new reqeuest' );
const slack = user.pushSlackMessage('You have received a new reqeuest');

Promise.all([publish,firebase,slack,token]).then(res => {
    console.log(res);
})
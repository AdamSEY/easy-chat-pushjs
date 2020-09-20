# This package is still under development and made for paidtabs.com & ziggs.io
it's not supposed be available for public, so some parts might be unclear.

## Your PR's are really apprecaited

**Sorry for the bad English, messy README file and all the mistakes. 29 hours no sleep**

### npm Installation

    npm install --save easy-chat-pushjs


### Server Installation

Install redis [required for onlyOneConnection feature]
Install ZMQ [required to push notifications to the websocket server]

### Features


- Serverless authenaction, JWT
- Push a message to slack channel
- The ability to disable multiple connections [ see uniqueToken -> createUserToken Function ]
- User can publish to speific room only.
- Subscribe to multiple rooms e.g. gender,male rooms in case you want to send a message to just the male rather than all genders.
- android, browser and IOS notifications directly from your app based on firebase cloud messaging. 
- Works remotely i.e you can have the websocket on a seperate server and use it from any other nodejs app. *zmq should listen to 0.0.0.0 instead of 127.0.0.1*

### Push notifications example


    const User = require('easy-chat-pushjs').User;
    const path = require('path');

    const user = new User({
        version: 1.0, // used to invalidate the old tokens (must match the server version)
        jwtPrivateKey: path.dirname(__dirname) + '/private.key' // absoulte path to the "jwt private key", used to encrypt the token.
    });

create token, client/ frontend gonna use this to connect to the websocket.

    const token = user.createUserToken(['gender', 'male'] , null, 'dasfasdasd2342', {username: 'admin'});
    
    
send a message to everyone in the room 'gender' (this message will be delivered to client's websocket);

    const publish = user.pushNotification('gender', {test: true} , null);
    
    
send a message to a speicifc user based on token's userId.

    const publish2 = user.pushNotification(null, {test: true} , 'dasfasdasd2342');
    
    
push a browser / android / ios notification based on user token. take a look on the following [link](https://developers.google.com/web/ilt/pwa/introduction-to-push-notifications) if you want to know how to get browser token.

    const firebase = user.pushFirebaseNotifications(['FCM_TOKEN'], 'test', 'You have received a new request' );
    
push slack notification, you need a webhook url to be set while configureing the server, for more information [click here](https://api.slack.com/messaging/webhooks)

    const slack = user.pushSlackMessage('You have received a new request');

If you want to wait to get a response of the functions run the following

    Promise.all([publish,publish2,firebase,slack,token]).then(res => {
        console.log(res);
    })
    

### More Examples

Take a look on the examples' directory, you'll find there:
- How to start the websocket server. Check websocket.js
- How to connect from frontend to the server and chat or receive push notifications. Check client.js
- How to push notifications, push messages to slack and Android- IOS (FCM). Check push.js



### Run WebSocket Server:

Make sure redis is up and running, in terminal type: `redis-server`
create your `server.js` file (see examples websocket.js)
create your jwt RS256 key pairs and set the path in the options object.

Run your `server.js` by calling `forever server.js`

**You may need to install forever (npm i forever -g)**

optionally you can enable FCM and Slack API if you're planning to use them.

### Notes
- Redis used to store when the last time we received a "ping" from the client, if we don't receive a ping every 15 seconds we will disconnect the client.
- production https://blog.jayway.com/2015/04/13/600k-concurrent-websocket-connections-on-aws-using-node-js/
- We used this tutorial to get an idea how to allow only one concurrent connection using same userId, https://hackernoon.com/enforcing-a-single-web-socket-connection-per-user-with-node-js-socket-io-and-redis-65f9eb57f66a






----

Next:
Make sure everything is working
learn imports / exports
use babel in defualt with nodejs and learn how does it work
server class exporting isn't working.

# This package is still under development and made for paidtabs.com & ziggs.io
it's not supposed to be available for public, so some segments might be ambiguous.

## Your PRs are really appreciated

### Features

- Compatible with Socket.io version 3
- Peer 2 Peer chat via webRTC
- Serverless authentication, JWT
- Push messages to Slack
- Limit connection times by user IP or UserID [ see uniqueToken -> createUserToken Function ]
- User can publish to specific rooms.
- Subscribe to multiple rooms e.g. gender, male...
- Firebase cloud messaging notifications (push notifications to mobile phones). 
- Client & server can be on separate servers. *zmq should listen to 0.0.0.0 instead of 127.0.0.1*


### npm Installation

    npm install --save easy-chat-pushjs


### Server Installation

- Install redis [required for onlyOneConnection feature] [learn more](https://www.digitalocean.com/community/tutorials/how-to-install-and-secure-redis-on-ubuntu-18-04)       
- Install ZMQ [required to push notifications to the websocket server] [learn more](https://zeromq.org/download/)


### How to create authentication token?

    const {User} = require('easy-chat-pushjs');
    const path = require('path');

    const user = new User({
        version: 1.0, // used to invalidate the old tokens (must match the server version)
        jwtPrivateKey: path.dirname(__dirname) + '/private.key', // absoulte path to the "jwt private key", used to encrypt the token.
        slackURL: "https://hooks.slack.com/services/EXAMPLE/....",
    });

    const token = user.createUserToken(['gender', 'male'] , "CHAT_ROOM_NAME", 'USER_ID', "188.22.34.33",'signalling_room');
    
Now, you send this token to your browser, and you're good to go!

### Push notifications example


    const {User} = require('easy-chat-pushjs');
    const path = require('path');

    const user = new User({
        version: 1.0, // used to invalidate the old tokens (must match the server version)
        jwtPrivateKey: path.dirname(__dirname) + '/private.key', // absoulte path to the "jwt private key", used to encrypt the token.
        slackURL: "https://hooks.slack.com/services/EXAMPLE/....",
    });

create token, client/ frontend gonna use this to connect to the websocket.

    
    const token = user.createUserToken(['gender', 'male'] , "CHAT_ROOM_NAME", 'USER_ID', "188.22.34.33",'signalling_room');
    // parameters
    createUserToken(rooms: Array<string>, chatRoomName: null|string, userId: string, uniqueToken : null | string = null,webRtcRoom: null|string = null ,extras: object = {})
    
Push a notification to anyone in 'gender', example

    const publish = user.pushNotification('gender', {message: 'hello there'});
    
    
send a message to a specific user based on token's userId.

    const publish2 = user.pushNotification(null, {message: hello} , 'userid_dasdad');
    
    
push a firebase notification, take a look at the following [link](https://developers.google.com/web/ilt/pwa/introduction-to-push-notifications) if you want to know how to get a browser token.

    const firebase = user.pushFirebaseNotifications(['FCM_TOKEN'], 'test', 'You have received a new request' );
    
push slack notification, you need a webhook url to be set while configuring the server, for more information [click here](https://api.slack.com/messaging/webhooks)

    const slack = user.pushSlackMessage('You have received a new request');

If you want to wait to get a response of the functions run the following

    Promise.all([publish,publish2,firebase,slack,token]).then(res => {
        console.log(res);
    })
    


### Run WebSocket Server:

Make sure redis is up and running, in terminal type: `redis-server`
create your `server.js` file (see examples websocket.js)
create your jwt RS256 key pairs and set the path in the options object. 

**Create RS256 key pairs on Unix-like OS**
    
    ssh-keygen -t rsa -b 4096 -m PEM -f jwtRS256.key
    openssl rsa -in jwtRS256.key -pubout -outform PEM -out jwtRS256.key.pub

Run your `server.js` by calling `forever server.js`

**You may need to install forever (npm i forever -g)**

optionally you can enable FCM and Slack API if you're planning to use them.

### Nginx Setup Proxy

    map $http_upgrade $connection_upgrade {
        default upgrade;
        '' close;
    }
    upstream socketio {
        server 127.0.0.1:5511;
    }
    
    Server{
    
      location ^~ /websocket/ {
           
            proxy_pass http://socketio;
            proxy_set_header Host $http_host;
            proxy_redirect off;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_read_timeout 86400;
            
            // if over loadbalancer or cloudflare 
            
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      }
      
    }  

### More Examples

Take a look on the examples' directory, you'll find there:
- How to start the websocket server. Check `websocket.js`
- How to connect from the browser to the server and chat or receive push notifications. Check `client.js`
- How to push notifications, push messages to Slack and Android- IOS (FCM). Check `push.js`



### Notes
- Redis used to store when the last time we received a "ping" from the client, if we don't receive a ping every 15 seconds we will disconnect the client.
- production https://blog.jayway.com/2015/04/13/600k-concurrent-websocket-connections-on-aws-using-node-js/
- We used this tutorial to get an idea how to allow only one concurrent connection using same userId, https://hackernoon.com/enforcing-a-single-web-socket-connection-per-user-with-node-js-socket-io-and-redis-65f9eb57f66a
- Make sure to add socket.io version 3 to your html file otherwise you'll a get an error.



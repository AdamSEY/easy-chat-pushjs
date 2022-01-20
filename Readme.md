# Easy-chat-pushjs

Get your advanced chat and pushjs server ready in minutes

## Features

- Compatible with Socket.io version 3
- Serverless authentication (JWT)
- Push messages to Slack
- Limit connection times by client's IP address or UserID (unqiueToken)
- Clients can publish to specific rooms.
- Join multiple rooms
- Firebase cloud messaging notifications (push notifications to mobile phones).
- Client & server can be on separate servers.
- Peer 2 Peer chat via webRTC (beta)

## npm Installation

    npm install --save easy-chat-pushjs


## Server Setup


### Docker

```
$ git clone https://github.com/AdamSEY/easy-chat-pushjs && cd easy-chat-pushjs/docker

```

Create your RS256 private and public keys used for JWT authentication between the server and the client.
We only need the public key for the server. You will need the private key to create JWT tokens for authentication.

```

ssh-keygen -t rsa -b 4096 -m PEM -f jwtRS256.key && openssl rsa -in jwtRS256.key -pubout -outform PEM -out jwtRS256.key.pub

```

If you want to use firebase cloud messaging notifications, add your firebase_admin_sdk.json to the directory.

PS: You can get this file from firebase -> settings -> Service Account -> Firebase admin sdk.


now you're ready to start the server

```
docker-compose up
```

### From scratch


- Install redis [required for onlyOneConnection feature] [learn more](https://www.digitalocean.com/community/tutorials/how-to-install-and-secure-redis-on-ubuntu-18-04)
- Install ZMQ [required to push notifications to the websocket server] [learn more](https://zeromq.org/download/)



#### Create JWT Token to connect to the server [frontend]

Create RS256 key pairs on Unix-like OS

    ssh-keygen -t rsa -b 4096 -m PEM -f jwtRS256.key && openssl rsa -in jwtRS256.key -pubout -outform PEM -out jwtRS256.key.pub


#### create users' authentication tokens [SERVER-SIDE][REST]

    const {User} = require('easy-chat-pushjs');
    const path = require('path');

    const user = new User({
        version: 1.0,
        jwtPrivateKey: path.dirname(__dirname) + '/private.key',
    });
    // version: used to invalidate the old tokens (must match the server version)
    // jwtPrivateKey: absoulte path to the jwt private key, used to encrypt the token.
    // slackURL: If you want to push notifications to slack (optional)

    const token = user.createUserToken([ARRAY_OF_ROOMS] ,"<PUBLISH_ROOM>" , '<USER_ID>', "<UNIQUE_ID>");

    // ARRAY_OF_ROOMS: (optional) array of rooms 
    // CHAT_ROOM: (optional) users can publish via socket.io frontend-side only to this channel.
    // USER_ID: (optional) used to push notifications to a speicifc user.
    // UNIQUE_ID: (optional) used to disallow multiple connections could be a user IP e.g. 188.22.34.33



*TIP: Check examples/client for more information about using this token*

Once your clients are connected to your websocket server, you're good to start pushing notifications

### Run and create the websocket server:

Make sure redis is up and running, in terminal type: `sudo service redis start`

create your jwt RS256 key pairs and set the path in the options object.

create your `server.js` file (see examples/websocket.js)

Run your `server.js` by calling `node server.js`



### Push notifications to connected clients

**Now we assume your clients have connected to the websocket server and they're ready to receive socket messages.**

if you'd like to push a message to all the clients who are connected to 'gender' you do the following

    const {User} = require('easy-chat-pushjs');
    const path = require('path');

    const user = new User({
        version: 1.0, 
        jwtPrivateKey: path.dirname(__dirname) + '/private.key', 
        slackURL: "https://hooks.slack.com/services/EXAMPLE/....",
    });

    user.pushNotification('gender', {message: 'hello there'}).then(() => {console.log("Message Pushed")});


Send a message to a specific user based on token's userId.

    user.pushNotification(null, {message: hello} , '<USER_ID>').then(() => {console.log("Message Pushed")});;


push a firebase notification, take a look at the following [link](https://developers.google.com/web/ilt/pwa/introduction-to-push-notifications) if you want to know how to get a browser token.

    user.pushFirebaseNotifications(['FCM_TOKEN'], 'test', 'You have received a new request' ).then(() => {console.log("Firebase Message Pushed")});;

push slack notification, you need a webhook url to be set while configuring the server, for more information [click here](https://api.slack.com/messaging/webhooks)

    user.pushSlackMessage('You have received a new request').then(() => {console.log("Slack Message Pushed")});;


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



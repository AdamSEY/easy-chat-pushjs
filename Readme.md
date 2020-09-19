### Installation

Install redis [required for onlyOneConnection feature]
Install ZMQ [required to push notifications to the websocket server]


### Using

Take a look on the examples directory, you'll find there
- How to start the websocket server (websocket.js)
- How to connect from frontend to the server and chat or receive push notifications client.js
- How to push notifications, push messages to slack and Android- IOS (FCM). push.js


### Run WebSocket Server:

Make sure redis is up and running, in terminal type: `redis-server`
create your server.js file (see examples websocket.js)
create your jwt RS256 key pairs and set the path in the options object.

and run your server.js by calling `node server.js`

optionally you can enable FCM and Slack API if you're planning to use them.

### Notes
- Redis used to store when the last time we received a "ping" from the client, if we don't receive a ping every 15 seconds we will disconnect the clinet.
- production https://blog.jayway.com/2015/04/13/600k-concurrent-websocket-connections-on-aws-using-node-js/
- We our own authentication function, we could use socketio-auth
- We used this tutorial to get an idea how to allow only one concurrent connection using same userId, https://hackernoon.com/enforcing-a-single-web-socket-connection-per-user-with-node-js-socket-io-and-redis-65f9eb57f66a






----

Next:
Make sure everything is working
learn imports / exports
use babel in defualt with nodejs and learn how does it work
server class exporting isn't working.

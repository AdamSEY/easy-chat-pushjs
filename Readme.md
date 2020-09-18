### Notes
- Redis used to store when the last time we received a "ping" from the client, if we don't receive a ping every 15 seconds we will disconnect the clinet.
- production https://blog.jayway.com/2015/04/13/600k-concurrent-websocket-connections-on-aws-using-node-js/
- We our own authentication function, we could use socketio-auth
- We used this tutorial to get an idea how to allow only one concurrent connection using same userId, https://hackernoon.com/enforcing-a-single-web-socket-connection-per-user-with-node-js-socket-io-and-redis-65f9eb57f66a


### Installation

Install redis [required for onlyOneConnection feature]
Install ZMQ [required to push notificaitons to the websocket server]


start project:

Make sure redis is up and running, in terminal type: `redis-server`

node Server.js


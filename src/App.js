const jwt = require('jsonwebtoken');
const fs = require('fs');
const redis = require("redis");
const bluebird = require('bluebird');
const client = redis.createClient();
bluebird.promisifyAll(redis);
const zmq = require("zeromq");
const server = require('http').createServer();
const p2p = require('socket.io-p2p-server').Server;
const Firebase = require('./Firebase');
const Slack = require('./Slack');

class App {

    constructor(options = {}) {
        // defaults
        this.options = {}
        this.options.zmqServerAddress = 'tcp://127.0.0.1:3500';
        this.options.wsPort = 3000;
        this.options.pingInterval = 10000;
        this.options.pingTimeout = 5000;
        this.options.slackURL = false;
        this.options.onlyOneConnection = false; // weither you want to allow users to connect multiple times using the same token.
        this.options.version = 1.0; // used to invalidate old tokens when you want. if client version different than this. authenacation will fail.
        this.options.jwtPublicKey = null; // used to invalidate old tokens when you want. if client version different than this. authenacation will fail.

        this.options.firebaseAdminSdkPath = false; // if you want to enable Firebase Cloud Messaging, download your authentication file from firebase, settings/serviceaccounts/adminsdk
        this.options.firebaseDatabaseURL = false; // available on firebase.google.com ... settings/serviceaccounts/adminsdk
        // override options
        if (options && typeof options === 'object') {
            for (const option in options) {
                this.options[option] = options[option];
            }
        }

        if (this.options.jwtPublicKey === null) throw new SocketError('Jwt public key path is required, make sure to create JWT RS256 key pair');

    }

    decodeJWT(token) {
        const publicKey = this.options.jwtPublicKey;
        let decoded;
        try {
            decoded = jwt.verify(token, publicKey);
        } catch (e) {
            return false;
        }
        return decoded;
    }

    verifyUser(token) {
        console.log('Verifying user..');
        return this.decodeJWT(token);
    }

    async disconnect(socket, io) {
        //  App.usersInfo(io,socket.userInfo);
        console.log('user disconnected');
        if (this.options.onlyOneConnection && socket.userInfo) {
            await client.delAsync(socket.userInfo.uniqueToken);
        }
        //  await App.delPinnedMessage(socket.id,socket.userInfo.channelName,io);
    }

    async connection(socket) {
        console.log('OnConnection Event Received');

        const userInfo = socket.userInfo; // was set on authencation

        if (this.options.onlyOneConnection) {
            socket.conn.on('packet', async (packet) => {
                if (socket.auth && packet.type === 'ping') {
                    await client.setAsync(userInfo.uniqueToken, true, 'XX', 'EX', 15);
                }
            });
        }


        return userInfo;
    }

    async authMiddleware(socket, next) {
        console.log('Auth middleware reached')
        const authToken = socket.handshake.query.token;
        const userInfo = this.verifyUser(authToken);

        if (userInfo === false) {
            console.log('authentication error');
            return next(new Error('authentication error'));
        }
        if (userInfo.version !== this.options.version) {
            console.log('Client - Server versions mismatch');
            return next(new Error('Client - Server versions mismatch'));
        }
        if (this.options.onlyOneConnection === true) {
            console.log('OnlyOneConnection mode is enabled')
            const canConnect = await client.setAsync(userInfo.uniqueToken, true, 'NX', 'EX', 15);
            // Expire is important because if we couldn't remove the token the user won't be able to connect anymore
            // we will renew that time using socketIO pings, in case server shut down and we didn't receive onDisconnet event
            // update: maybe not required since we're flushing all the keys in case our app crashed.
            console.log('canConnect', Boolean(canConnect));

            if (!canConnect) {
                console.log('Already Connected');
                return next(new Error('Already Connected'));
            } // already connected
        }
        socket.auth = true;
        socket.userInfo = userInfo;
        return next();
    }

    usersInfo(io, userInfo) {
        // count clients and send connected users
        io.in(userInfo.channelName).clients((err, clients) => {
            console.log('onconnection: getting total users and connected users');
            // clients will be array of socket ids , currently available in given room
            const clientsInfo = clients.map((value) => {
                return io.sockets.connected[value].userInfo;
            });
            const users = {'total': clientsInfo.length, 'users': clientsInfo};
            console.log('Total Connected:', clientsInfo.length);
            io.to(userInfo.channelName).emit('users', users);
        });

    }

    async flushAll() {
        await client.flushall();
    }

    async delPinnedMessage(socketID, channelName, io) {
        console.log('Deleting pinned message');
        let message = await client.getAsync(channelName);
        message = JSON.parse(message);
        if (message && typeof message.by !== 'undefined' && message.by === socketID) {
            console.log('Deleted pinned message');
            await client.delAsync(channelName);
            io.to(channelName).emit('pinned', null); // tell the clinet to remove pinnedMessage
        }
    }

    async setPinnedMessage(channelName, socketID, pinnedMessage) {
        if (typeof pinnedMessage === 'undefined') return;
        console.log('Setting pinned message');
        let isSet = await client.setAsync(channelName, JSON.stringify({
            'by': socketID,
            'message': pinnedMessage
        }), 'NX'); // set pinnedmessage only if it's not already set
        isSet = Boolean(isSet);
        if (!isSet) console.log("Failed to set a pinnedMessage because it's already set"); else {
            console.log('Successfully set pinned message');
        }
    }

    async getPinnedMessage(io, channelName) {
        console.log('Getting pinned message');
        const pinned = await client.getAsync(channelName);
        if (pinned) {
            const data = JSON.parse(pinned);
            console.log('Publishing pinned message', data.message);
            io.to(channelName).emit('pinned', data.message);
        }
    }

    async disconnectUser(socket, io, reason, channelName) {
        io.to(channelName).emit('disconnect', reason);
        socket.disconnect(true);
    }



    // ----
    startServer() {
        const io = require('socket.io')(server, {
            path: '/websocket',
            serveClient: false,
            // below are engine.IO options
            pingInterval: this.options.pingInterval,
            pingTimeout: this.options.pingTimeout,
            cookie: true
        });
        let fcm;
        if (this.options.firebaseDatabaseURL && this.options.firebaseAdminSdkPath) {
            fcm = new Firebase(this.options.firebaseAdminSdkPath, this.options.firebaseDatabaseURL);
        }

        const sock = zmq.socket('pull');
        sock.bindSync(this.options.zmqServerAddress);
        console.log('Producer bound to port 3500');
        sock.on('message', (msg) => {
            /*
            msg: Object
            channelName: string
            userId: string or false
            fcmTokens: array or false
            data: serverMessage object
             */
            const serverMessage = JSON.parse(msg);
            if (serverMessage.userId !== false) {
                io.to("userroom:" + serverMessage.userId).emit('push', serverMessage.data);
            } else {
                io.to(serverMessage.channelName).emit('push', serverMessage.data);
            }

            // sending fcm notification
            if (fcm && serverMessage.hasOwnProperty('fcmTokens')) {
                const d = fcm.sendMessage(serverMessage.fcmTokens, serverMessage.title, serverMessage.body, serverMessage.imageUrl, serverMessage.data);
                console.log('fcm message queued');
            }
            // sending slack message
            if (this.options.slackURL && serverMessage.hasOwnProperty('slackMessage')) {
                Slack.sendSlackMessage(this.options.slackURL, serverMessage.slackMessage);
                console.log('slack message queued');
            }
            console.log({ZMQ: "zmq message received", serverMessage});

        });

        //App.flushAll(); // required in case our nodejs crashed so we remove all the keys so our users can set pinned message. //disbaled since we're no longer using a pinned message.

        // this way

        // io.use((socket, next) => {
        //     return this.authMiddleware(socket, next);
        // });

        // or this way
        io.use(this.authMiddleware.bind(this));

        io.on('connection', async (socket) => {

            socket.on('disconnect', () => {
                console.log('OnDisconnect: getting total users and connected users');
                this.disconnect(socket, io)
            });

            const userInfo = await this.connection(socket); // when user connect we authenticate them and returns

          //  p2p(socket, null, userInfo.channelName, 'webrtc'); // init p2p connection. // enable for p2p i.e webRTC

            // disbaled, I think those should be implmented on frontend. they're working anyway, nothing incomplete.
            // await App.usersInfo(io, userInfo); // send users info
            // await App.setPinnedMessage(userInfo.channelName,socket.id, userInfo.pinned);
            // await App.getPinnedMessage(io,userInfo.channelName);


            console.log('joining push: ', userInfo.userId)
            socket.join("userroom:" + userInfo.userId); // used to send a message to a sepecific user
            socket.join(userInfo.channelName); // used to send a message a everyone in a specific room


            socket.on('chat', function (messageObj) { // chat message received
                console.log('chat message received');
                if (userInfo.canPublish === true) {
                    io.to(userInfo.channelName).emit('chat', messageObj);
                }
            })

            //   App.disconnectUser(socket, io, 'too many users' , userInfo.channelName);
            console.log('new connection');
        });


        server.listen(this.options.wsPort);
        console.log("Websocket listening to", this.options.wsPort);


    }
}


module.exports = App;
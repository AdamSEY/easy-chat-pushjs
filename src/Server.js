const jwt = require('jsonwebtoken');
const redis = require("redis");
const bluebird = require('bluebird');
bluebird.promisifyAll(redis);
const zmq = require("zeromq");
const server = require('http').createServer();
const p2p = require('socket.io-p2p-server').Server;
const Firebase = require('./Firebase');
const Slack = require('./Slack');
const User = require('./User');
class Server {

    constructor(options = {}) {
        // defaults
        this.options = {}
        this.redisClient = redis.createClient();
        this.options.zmqServerAddress = 'tcp://127.0.0.1:3500';
        this.options.wsPort = 3000;
        this.options.pingInterval = 10000;
        this.options.pingTimeout = 5000;
        this.options.slackURL = false;
        this.options.onlyOneConnection = false; // weither you want to allow users to connect multiple times using the same token.
        this.options.version = 1.0; // used to invalidate old tokens when you want. if client version different than this. authenacation will fail.
        this.options.jwtPublicKey = null; // used to invalidate old tokens when you want. if client version different than this. authenacation will fail.
        this.options.canPublish = null; // a callback function returns true or false, whether or not if the user can publish the chatRoomName
        this.options.onMessageReceived = null // a callback function(decodedUserToken, messageObject), in case you want to do something when the server receive a message from a user when they emitting 'chat' event.
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
        //  Server.usersInfo(io,socket.userInfo);
        console.log('user disconnected');
        if (this.options.onlyOneConnection && socket.userInfo) {
            await this.redisClient.delAsync(socket.userInfo.uniqueToken);
        }
        //  await Server.delPinnedMessage(socket.id,socket.userInfo.chatRoomName,io);
    }
    async connection(socket) {
        console.log('OnConnection Event Received');

        const userInfo = socket.userInfo; // was set on authentication

        if (this.options.onlyOneConnection) {
            socket.conn.on('packet', async (packet) => {
                if (socket.auth && packet.type === 'ping') {
                    await this.redisClient.setAsync(userInfo.uniqueToken, true, 'XX', 'EX', 15);
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
            const canConnect = await this.redisClient.setAsync(userInfo.uniqueToken, true, 'NX', 'EX', 15);
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
            roomName: string
            userId: string or false
            fcmTokens: array or false
            data: serverMessage object
             */
            const serverMessage = JSON.parse(msg);
            if (serverMessage.userId !== false) {
                io.to("userRoom:" + serverMessage.userId).emit('push', serverMessage.data);
            } else {
                io.to(serverMessage.roomName).emit('push', serverMessage.data);// sending notification to a specific room
            }

            // sending fcm notification
            if (fcm && serverMessage.hasOwnProperty('fcmTokens')) {
                const d = fcm.sendMessage(serverMessage.fcmTokens, serverMessage.title, serverMessage.body, serverMessage.imageUrl , serverMessage.data);
                console.log('fcm message queued');
            }
            // sending slack message
            if (this.options.slackURL && serverMessage.hasOwnProperty('slackMessage')) {
                Slack.sendSlackMessage(this.options.slackURL, serverMessage.slackMessage);
                console.log('slack message queued');
            }
            console.log({ZMQ: "zmq message received", serverMessage});

        });

        //Server.flushAll(); // required in case our nodejs crashed so we remove all the keys so our users can set pinned message. //disbaled since we're no longer using a pinned message.

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

            //  p2p(socket, null, userInfo.chatRoomName, 'webrtc'); // init p2p connection. // enable for p2p i.e webRTC

            // disbaled, I think those should be implmented on frontend. they're working anyway, nothing incomplete.
            // await Server.usersInfo(io, userInfo); // send users info
            // await Server.setPinnedMessage(userInfo.chatRoomName,socket.id, userInfo.pinned);
            // await Server.getPinnedMessage(io,userInfo.chatRoomName);


            console.log('joining push: ', userInfo.userId)
            socket.join("userRoom:" + userInfo.userId); // used to send a message to a specific user
            for (const room of userInfo.rooms){
                // user can join multiple rooms. for example: user can join a room called "Gender" as well as "male", you can push notification to both genders or just males.
                socket.join(room); // used to send a message a everyone in a specific room
            }



            socket.on('chat',  (messageObj) => { // chat message received
                console.log('chat message received');
                if (typeof this.options.onMessageReceived === "function"){
                    (async () => {
                        this.options.onMessageReceived(userInfo,messageObj);
                    })();
                }

                if (userInfo.chatRoomName){
                    console.log('Publish to room members: ' + userInfo.chatRoomName + ' succeed');
                    if (typeof this.options.onMessageReceived === "function"){
                        (async () => {
                            this.options.onMessageReceived(userInfo,messageObj);
                        })();
                    }
                    io.to(userInfo.chatRoomName).emit('chat', messageObj);
                }else{
                    console.log('Publish to room members: ' + userInfo.chatRoomName + ' failed');
                }

            })

            //   Server.disconnectUser(socket, io, 'too many users' , "userRoom:" + userInfo.userId);
            console.log('new connection');
        });


        server.listen(this.options.wsPort);
        console.log("Websocket listening to", this.options.wsPort);


    }

    async flushAll() {
        await this.redisClient.flushall();
    }
    usersInfo(io, userInfo) {
        // count clients and send connected users
        io.in(userInfo.chatRoomName).clients((err, clients) => {
            console.log('onconnection: getting total users and connected users');
            // clients will be array of socket ids , currently available in given room
            const clientsInfo = clients.map((value) => {
                return io.sockets.connected[value].userInfo;
            });
            const users = {'total': clientsInfo.length, 'users': clientsInfo};
            console.log('Total Connected:', clientsInfo.length);
            io.to(userInfo.chatRoomName).emit('users', users);
        });

    }
    async delPinnedMessage(socketID, chatRoomName, io) {
        console.log('Deleting pinned message');
        let message = await this.redisClient.getAsync(chatRoomName);
        message = JSON.parse(message);
        if (message && typeof message.by !== 'undefined' && message.by === socketID) {
            console.log('Deleted pinned message');
            await this.redisClient.delAsync(chatRoomName);
            io.to(chatRoomName).emit('pinned', null); // tell the clinet to remove pinnedMessage
        }
    }
    async setPinnedMessage(chatRoomName, socketID, pinnedMessage) {
        if (typeof pinnedMessage === 'undefined') return;
        console.log('Setting pinned message');
        let isSet = await this.redisClient.setAsync(chatRoomName, JSON.stringify({
            'by': socketID,
            'message': pinnedMessage
        }), 'NX'); // set pinnedMessage only if it's not already set
        isSet = Boolean(isSet);
        if (!isSet) console.log("Failed to set a pinnedMessage because it's already set"); else {
            console.log('Successfully set pinned message');
        }
    }
    async getPinnedMessage(io, chatRoomName) {
        console.log('Getting pinned message');
        const pinned = await this.redisClient.getAsync(chatRoomName);
        if (pinned) {
            const data = JSON.parse(pinned);
            console.log('Publishing pinned message', data.message);
            io.to(chatRoomName).emit('pinned', data.message);
        }
    }
    async disconnectUser(socket, io, reason, roomName) {
        io.to(roomName).emit('disconnect', reason);
        socket.disconnect(true);
    }




}


module.exports = {
    Server,
    User
};
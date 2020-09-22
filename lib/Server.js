"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = void 0;
const jwt = require('jsonwebtoken');
const redis = require('redis');
const bluebird = require('bluebird');
bluebird.promisifyAll(redis);
const zmq = require('zeromq');
const server = require('http').createServer();
const p2p = require('socket.io-p2p-server').Server;
const Firebase_1 = require("./Firebase");
const SocketError_1 = require("./SocketError");
const { Slack } = require('./Slack');
const fs = require('fs');
class Server {
    constructor(options) {
        // defaults
        // @ts-ignore
        this.options = {};
        this.redisClient = redis.createClient();
        this.options.zmqServerAddress = 'tcp://127.0.0.1:3500';
        this.options.wsPort = 3000;
        this.options.pingInterval = 10000;
        this.options.pingTimeout = 5000;
        this.options.onlyOneConnection = false; // weither you want to allow users to connect multiple times using the same token.
        this.options.version = 1.0; // used to invalidate old tokens when you want. if client version different than this. authenacation will fail.
        // override options
        if (options && typeof options === 'object') {
            for (const option in options) {
                // @ts-ignore
                this.options[option] = options[option];
            }
        }
        if (this.options.jwtPublicKey === null)
            throw new SocketError_1.default('Jwt public key path is required, make sure to create JWT RS256 key pair');
    }
    decodeJWT(token) {
        const publicKey = fs.readFileSync(this.options.jwtPublicKey);
        let decoded;
        try {
            decoded = jwt.verify(token, publicKey);
        }
        catch (e) {
            return false;
        }
        return decoded;
    }
    verifyUser(token) {
        console.log('Verifying user..');
        return this.decodeJWT(token);
    }
    disconnect(socket, io) {
        return __awaiter(this, void 0, void 0, function* () {
            //  Server.usersInfo(io,socket.userInfo);
            console.log('user disconnected');
            if (this.options.onlyOneConnection && socket.userInfo) {
                yield this.redisClient.delAsync(socket.userInfo.uniqueToken);
            }
            //  await Server.delPinnedMessage(socket.id,socket.userInfo.chatRoomName,io);
        });
    }
    connection(socket) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('OnConnection Event Received');
            const userInfo = socket.userInfo; // was set on authentication
            if (this.options.onlyOneConnection) {
                socket.conn.on('packet', (packet) => __awaiter(this, void 0, void 0, function* () {
                    if (socket.auth && packet.type === 'ping') {
                        yield this.redisClient.setAsync(userInfo.uniqueToken, true, 'XX', 'EX', 15);
                    }
                }));
            }
            return userInfo;
        });
    }
    authMiddleware(socket, next) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('Auth middleware reached');
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
            if (this.options.onlyOneConnection) {
                console.log('OnlyOneConnection mode is enabled');
                const canConnect = yield this.redisClient.setAsync(userInfo.uniqueToken, true, 'NX', 'EX', 15);
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
        });
    }
    startServer() {
        const io = require('socket.io')(server, {
            path: '/websocket',
            serveClient: false,
            // below are engine.IO options
            pingInterval: this.options.pingInterval,
            pingTimeout: this.options.pingTimeout,
            cookie: true,
        });
        let fcm;
        if (this.options.firebaseDatabaseURL && this.options.firebaseAdminSdkPath) {
            fcm = new Firebase_1.default(this.options.firebaseAdminSdkPath, this.options.firebaseDatabaseURL);
        }
        const sock = zmq.socket('pull');
        sock.bindSync(this.options.zmqServerAddress);
        console.log('ZMQ listening to ', this.options.zmqServerAddress);
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
                io.to('userRoom:' + serverMessage.userId).emit('push', serverMessage.data);
            }
            else {
                io.to(serverMessage.roomName).emit('push', serverMessage.data); // sending notification to a specific room
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
            console.log({ ZMQ: 'zmq message received', serverMessage });
        });
        //Server.flushAll(); // required in case our nodejs crashed so we remove all the keys so our users can set pinned message. //disbaled since we're no longer using a pinned message.
        // this way
        // io.use((socket, next) => {
        //     return this.authMiddleware(socket, next);
        // });
        // or this way
        io.use(this.authMiddleware.bind(this));
        io.on('connection', (socket) => __awaiter(this, void 0, void 0, function* () {
            socket.on('disconnect', () => {
                console.log('OnDisconnect: getting total users and connected users');
                this.disconnect(socket, io);
            });
            const userInfo = yield this.connection(socket); // when user connect we authenticate them and returns
            //  p2p(socket, null, userInfo.chatRoomName, 'webrtc'); // init p2p connection. // enable for p2p i.e webRTC
            // disbaled, I think those should be implmented on frontend. they're working anyway, nothing incomplete.
            // await Server.usersInfo(io, userInfo); // send users info
            // await Server.setPinnedMessage(userInfo.chatRoomName,socket.id, userInfo.pinned);
            // await Server.getPinnedMessage(io,userInfo.chatRoomName);
            console.log('joining push: ', userInfo.userId);
            socket.join('userRoom:' + userInfo.userId); // used to send a message to a specific user
            for (const room of userInfo.rooms) {
                // user can join multiple rooms. for example: user can join a room called "Gender" as well as "male", you can push notification to both genders or just males.
                socket.join(room); // used to send a message a everyone in a specific room
            }
            socket.on('chat', (messageObj) => {
                // chat message received
                console.log('chat message received');
                if (typeof this.options.onMessageReceived === 'function') {
                    (() => __awaiter(this, void 0, void 0, function* () {
                        if (typeof this.options.onMessageReceived !== "undefined") {
                            this.options.onMessageReceived(userInfo, messageObj);
                        }
                    }))();
                }
                if (userInfo.chatRoomName) {
                    console.log('Publish to room members: ' + userInfo.chatRoomName + ' succeed');
                    io.to(userInfo.chatRoomName).emit('chat', messageObj);
                }
                else {
                    console.log('Publish to room members: ' + userInfo.chatRoomName + ' failed');
                }
            });
            //   Server.disconnectUser(socket, io, 'too many users' , "userRoom:" + userInfo.userId);
            console.log('new connection');
        }));
        server.listen(this.options.wsPort);
        console.log('Websocket listening to', this.options.wsPort);
    }
    flushAll() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.redisClient.flushall();
        });
    }
    usersInfo(io, userInfo) {
        // count clients and send connected users
        io.in(userInfo.chatRoomName).clients((err, clients) => {
            console.log('onconnection: getting total users and connected users');
            // clients will be array of socket ids , currently available in given room
            const clientsInfo = clients.map((value) => {
                return io.sockets.connected[value].userInfo;
            });
            const users = { total: clientsInfo.length, users: clientsInfo };
            console.log('Total Connected:', clientsInfo.length);
            io.to(userInfo.chatRoomName).emit('users', users);
        });
    }
    delPinnedMessage(socketID, chatRoomName, io) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('Deleting pinned message');
            let message = yield this.redisClient.getAsync(chatRoomName);
            message = JSON.parse(message);
            if (message && typeof message.by !== 'undefined' && message.by === socketID) {
                console.log('Deleted pinned message');
                yield this.redisClient.delAsync(chatRoomName);
                io.to(chatRoomName).emit('pinned', null); // tell the client to remove pinnedMessage
            }
        });
    }
    setPinnedMessage(chatRoomName, socketID, pinnedMessage) {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof pinnedMessage === 'undefined')
                return;
            console.log('Setting pinned message');
            let isSet = yield this.redisClient.setAsync(chatRoomName, JSON.stringify({
                by: socketID,
                message: pinnedMessage,
            }), 'NX'); // set pinnedMessage only if it's not already set
            isSet = Boolean(isSet);
            if (!isSet)
                console.log("Failed to set a pinnedMessage because it's already set");
            else {
                console.log('Successfully set pinned message');
            }
        });
    }
    getPinnedMessage(io, chatRoomName) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('Getting pinned message');
            const pinned = yield this.redisClient.getAsync(chatRoomName);
            if (pinned) {
                const data = JSON.parse(pinned);
                console.log('Publishing pinned message', data.message);
                io.to(chatRoomName).emit('pinned', data.message);
            }
        });
    }
    disconnectUser(socket, io, reason, roomName) {
        return __awaiter(this, void 0, void 0, function* () {
            io.to(roomName).emit('disconnect', reason);
            socket.disconnect(true);
        });
    }
}
exports.Server = Server;

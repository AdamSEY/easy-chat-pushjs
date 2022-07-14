const jwt = require('jsonwebtoken');
const redis = require('redis');
const bluebird = require('bluebird');
bluebird.promisifyAll(redis);
const zmq = require('zeromq');
const server = require('http').createServer();
const p2p = require('../src/simplePeer').Server;
import Firebase from './Firebase';
import SocketError from "./SocketError";
import {UserObj} from "./UserObj";
const fs = require('fs');



interface optionsObj {
    firebaseApiKey?:  string;
    onMessageReceived?: Function;
    jwtPublicKey: Buffer;
    version?: number;
    onlyOneConnection?: boolean;
    pingTimeout?: number;
    pingInterval?: number;
    wsPort?: number;
    zmqServerAddress?: string;
    onUserDisconnects?: Function
    onUserConnects?: Function
}



export class Server {
    private readonly options: optionsObj;
    private redisClient: any;
    constructor(options: optionsObj) {
        // defaults
        // @ts-ignore
        this.options = {};
        this.redisClient = redis.createClient();
        this.options.zmqServerAddress = 'tcp://127.0.0.1:3500';
        this.options.wsPort = 3000;
        this.options.pingInterval = 10000;
        this.options.pingTimeout = 5000;
        this.options.onlyOneConnection = false; // either you want to allow users to connect multiple times using the same token.
        this.options.version = 1.0; // used to invalidate old tokens when you want. if client version different than this. authentication will fail.
        this.options.firebaseApiKey = undefined;
        // override options
        if (options && typeof options === 'object') {
            for (const option in options) {
                // @ts-ignore
                this.options[option] = options[option];
            }
        }

        if (this.options.jwtPublicKey === null)
            throw new SocketError('Jwt public key path is required, make sure to create JWT RS256 key pair');
    }

    decodeJWT(token: string) {
        const publicKey = fs.readFileSync(this.options.jwtPublicKey);
        let decoded;
        try {
            decoded = jwt.verify(token, publicKey);
        } catch (e) {
            return false;
        }
        return decoded;
    }

    verifyUser(token:string) {
        console.log('Verifying user..');
        return this.decodeJWT(token);
    }

    async disconnect(socket: any, io: any) {
        //  Server.usersInfo(io,socket.userInfo);
       console.log('user disconnected' , socket.userInfo);
        if (this.options.onlyOneConnection && socket.userInfo) {
             this.redisClient.delAsync(socket.userInfo.uniqueToken);
        }
        if (typeof this.options.onUserDisconnects === 'function') {
            this.options.onUserDisconnects(socket.userInfo);
        }

        //  await Server.delPinnedMessage(socket.id,socket.userInfo.chatRoomName,io);
    }
    async connection(socket: any){
        console.log('OnConnection Event Received');

        const userInfo = socket.userInfo; // was set on authentication

        if (this.options.onlyOneConnection) {
            socket.conn.on('packet', async (packet : any) => {
                if (socket.auth && packet.type === 'ping') {
                    await this.redisClient.setAsync(userInfo.uniqueToken, true, 'XX', 'EX', 15);
                }
            });
        }
        if (typeof this.options.onUserConnects === 'function') {
            this.options.onUserConnects(socket.userInfo);
        }

        return userInfo;
    }
    async authMiddleware(socket: any, next: any) {
        console.log('Auth middleware reached');
        const authToken = socket.handshake.query.token;
        const userInfo = this.verifyUser(authToken);

        if (userInfo === false) {
            console.log('authentication error');
            return next(new Error(JSON.stringify({error: "authentication failed", code: 1})));
        }
        if (userInfo.version !== this.options.version) {
            console.log('Client - Server versions mismatch');
            return next(new Error(JSON.stringify({error: "authentication failed - Version Mismatch", code: 3})));
        }
        if (this.options.onlyOneConnection) {
            console.log('OnlyOneConnection mode is enabled');
            const canConnect = await this.redisClient.setAsync(userInfo.uniqueToken, true, 'NX', 'EX', 15);
            // Expire is important because if we couldn't remove the token the user won't be able to connect anymore
            // we will renew that time using socketIO pings, in case server shut down and we didn't receive onDisconnect event
            // update: maybe not required since we're flushing all the keys in case our app crashed.
            console.log('canConnect', Boolean(canConnect));

            if (!canConnect) {
                console.log('Already Connected');
                return next(new Error(JSON.stringify({error: "authentication failed - already Connected", code: 2})));
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
            cookie: true,
        });
        let fcm: Firebase;
        if (this.options.firebaseApiKey) {
            fcm = new Firebase(this.options.firebaseApiKey);
        }

        // receiving events from ZMQ
        const socket = zmq.socket('pull');
        socket.bindSync(this.options.zmqServerAddress);
        console.log('ZMQ listening to ', this.options.zmqServerAddress);

        // io.use((socket, next) => {
        //     return this.authMiddleware(socket, next);
        // });

        // or this way
        // Users authentication
        io.use(this.authMiddleware.bind(this));

        io.on('connection', async (socket : any) => {
            socket.on('disconnect', () => {
                console.log('User Disconnect');
                this.disconnect(socket, io);
            });
            //      socket.disconnect();

            const userInfo = await this.connection(socket); // when user connect we authenticate them and returns

            if (userInfo.chatRoomName != null){
                socket.join('chatRoom:' + userInfo.chatRoomName);
            }

            if (userInfo.webRtcRoom) {
                p2p(socket, `webRTC:${userInfo.webRtcRoom}`, io);
            } // init p2p connection. // enable for p2p i.e webRTC

            // disabled, I think those should be implemented on frontend. they're working anyway, nothing incomplete.
            // await Server.usersInfo(io, userInfo); // send users info
            // await Server.setPinnedMessage(userInfo.chatRoomName,socket.id, userInfo.pinned);
            // await Server.getPinnedMessage(io,userInfo.chatRoomName);

            console.log('joining push: ', userInfo.userId);
            socket.join('userRoom:' + userInfo.userId); // used to send a message to a specific user
            for (const room of userInfo.rooms) {
                // user can join multiple rooms. for example: user can join a room called "Gender" as well as "male", you can push notification to both genders or just males.
                socket.join("room:" + room); // used to send a message a everyone in a specific room
            }

            socket.on('chat', (messageObj: any) => {
                // chat message received
                console.log('chat message received');
                if (typeof this.options.onMessageReceived === 'function') {
                    this.options.onMessageReceived(userInfo, messageObj);
                }

                // sending to users in this room 'userInfo.chatRoomName' by emitting chat event.
                if (userInfo.chatRoomName) {
                    console.log('Publish to room members: ' + 'chatRoom:' + userInfo.chatRoomName + ' succeed');
                    io.to('chatRoom:' + userInfo.chatRoomName).emit('chat', messageObj);
                }
            });

            //   Server.disconnectUser(socket, io, 'too many users' , "userRoom:" + userInfo.userId);
            console.log('new connection');
        });
        // ================================== direct connection from JS ==================================//
        socket.on('message', (msg : string) => {
            /*
                  msg: Object
                  roomName: string
                  userId: string or false
                  fcmTokens: array or false
                  data: serverMessage object
                   */
            const serverMessage = JSON.parse(msg);
            // we're sure that the message is json since it's coming only through our ZMQ server
            if (serverMessage.userId !== null) { // direct message
                io.to('userRoom:' + serverMessage.userId).emit('push', serverMessage.data);
            } else {
                io.to("room:"+serverMessage.roomName).emit('push', serverMessage.data); // sending notification to a specific room
            }

            // sending fcm notification
            if (this.options.firebaseApiKey && serverMessage.hasOwnProperty('fcmTokens')) {
                fcm.sendMessage(
                    serverMessage.fcmTokens,
                    serverMessage.title,
                    serverMessage.body,
                    serverMessage.imageUrl,
                    serverMessage.data,
                );
                console.log('fcm message queued');

                // todo send FCM message.
            }
            console.log({ ZMQ: 'zmq message received', serverMessage });
        });

        //Server.flushAll(); // required in case our nodejs crashed so we remove all the keys so our users can set pinned message. //disbaled since we're no longer using a pinned message.








        server.listen(this.options.wsPort);
        console.log('Websocket listening to', this.options.wsPort);
    }

    async flushAll() {
        await this.redisClient.flushall();
    }
    usersInfo(io: any, userInfo: UserObj) {
        // count clients and send connected users
        io.in(userInfo.chatRoomName).clients((err: any, clients: any) => {
            console.log('onconnection: getting total users and connected users');
            // clients will be array of socket ids , currently available in given room
            const clientsInfo = clients.map((value: any) => {
                return io.sockets.connected[value].userInfo;
            });
            const users = { total: clientsInfo.length, users: clientsInfo };
            console.log('Total Connected:', clientsInfo.length);
            io.to(userInfo.chatRoomName).emit('users', users);
        });
    }
    async delPinnedMessage(socketID: string, chatRoomName: string, io: any) {
        console.log('Deleting pinned message');
        let message = await this.redisClient.getAsync(chatRoomName);
        message = JSON.parse(message);
        if (message && typeof message.by !== 'undefined' && message.by === socketID) {
            console.log('Deleted pinned message');
            await this.redisClient.delAsync(chatRoomName);
            io.to(chatRoomName).emit('pinned', null); // tell the client to remove pinnedMessage
        }
    }
    async setPinnedMessage(chatRoomName: string, socketID: string, pinnedMessage: string) {
        if (typeof pinnedMessage === 'undefined') return;
        console.log('Setting pinned message');
        let isSet = await this.redisClient.setAsync(
            chatRoomName,
            JSON.stringify({
                by: socketID,
                message: pinnedMessage,
            }),
            'NX',
        ); // set pinnedMessage only if it's not already set
        isSet = Boolean(isSet);
        if (!isSet) console.log("Failed to set a pinnedMessage because it's already set");
        else {
            console.log('Successfully set pinned message');
        }
    }
    async getPinnedMessage(io: any, chatRoomName: string) {
        console.log('Getting pinned message');
        const pinned = await this.redisClient.getAsync(chatRoomName);
        if (pinned) {
            const data = JSON.parse(pinned);
            console.log('Publishing pinned message', data.message);
            io.to(chatRoomName).emit('pinned', data.message);
        }
    }
    async disconnectUser(socket: any, io:any, reason: any, roomName: string) {
        io.to(roomName).emit('disconnect', reason);
        socket.disconnect(true);
    }
}


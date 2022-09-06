import SocketError from "./SocketError";
const jwt = require('jsonwebtoken');
const zmq = require('zeromq');
const uuid = require('uuid');
const fs = require('fs');
const {Slack} = require('./Slack');
import {UserObj} from "./UserObj";


interface clientOptionsObj {
    jwtPrivateKey: Buffer;
    version?: number;
    jwtExpireSeconds?: number;
    zmqClientAddress?: string;
    slackURL?: string;
}

export class User {
    private readonly options: clientOptionsObj;
    constructor(options : clientOptionsObj) {
        // defaults
        // @ts-ignore
        this.options = {}
        this.options.zmqClientAddress = 'tcp://127.0.0.1:3500'; // for multiple hosts, separate with comma.
        this.options.jwtExpireSeconds = 365 * 24 * 60 * 60;
        this.options.version = 1.0; // used to invalidate old tokens when you want. if client version different than this. authenacation will fail.
        //
        // override options
        if (options && typeof options === 'object') {
            for (const option in options) {
                // @ts-ignore
                this.options[option] = options[option];
            }
        }
        //
        if (this.options.jwtPrivateKey === null)
            throw new SocketError('jwtPrivateKey should be Buffer, make sure to create JWT RS256 key pair and set the path.');

    }

    createUserToken(rooms: Array<string>, chatRoomName: null|string, userId: string, uniqueToken : null | string = null,webRtcRoom: null|string = null ,extras: object = {}) {
        // @ts-ignore
        const jwtToken: UserObj = {};

        jwtToken.userId = userId;
        jwtToken.chatRoomName = chatRoomName; // this room user can publish messages by emitting "chat" event, anyone in the same room will receive this message.
        jwtToken.rooms = rooms; // array of rooms
        jwtToken.webRtcRoom = webRtcRoom; // the room where all the signaling will happen. if null it's disabled.

        // jwtToken.pinnedMessage = pinnedMessage;
        jwtToken.joinTime = new Date().getTime();
        if (this.options.version != null) {
            jwtToken.version = this.options.version;
        } // change this to invalidate all previous tokens.
        jwtToken.uniqueToken = uniqueToken ? uniqueToken : uuid.v4(); // in case onlyOneConnection is enabled. if a user has the same token we don't allow them to join.
        // use case: if you want e.g. to disallow a user with same userId/ip to connect twice, unqiue token could be an IP address or userId.

        const issuedAt = parseInt((new Date().getTime() / 1000).toString());
        // @ts-ignore
        const expire = issuedAt + this.options.jwtExpireSeconds;
        const data = {
            iat: issuedAt, // Issued at: time when the token was generated
            nbf: issuedAt,
            exp: expire, // Expire
            ...jwtToken,
            ...extras,
        };
        return jwt.sign(data, fs.readFileSync(this.options.jwtPrivateKey), { algorithm: 'RS256' });
    }
    async pushNotification(roomName: null | string, data: object, userId : string | null = null) {
        // @fcmTokens: array of user fcm tokens.
        // @userId: if false, public will happen to everyone in a room
        // Note: roomName can be null if userId is not false.
        if (!roomName && !userId) throw new Error('Please specify where you would like to publish your message, choose a userID or a room name');

        return new Promise((resolve, reject) => {
            try {
                const zmqAddresses = this.options.zmqClientAddress ? this.options.zmqClientAddress.split(',') : [this.options.zmqClientAddress];

                for (const zmqAddress of zmqAddresses) {
                    const sock = zmq.socket('push');
                    sock.connect(zmqAddress);
                    sock.setsockopt('linger', 10000);
                    sock.send(
                        JSON.stringify({
                            roomName,
                            userId,
                            data,
                        }),
                    );
                    sock.close();
                }
                return resolve('Message Queued');
            } catch (e) {
                return reject(e);
            }
        });
    }
    async pushFirebaseNotifications(fcmTokens: object, title: string, body: string, subtitle: string | undefined, imageUrl : null | string = null, extras : object = {}) {
        // @fcmTokens: array of user fcm tokens.
        // @userId: if false, public will happen to everyone in a room
        // make sure configure firebase before using this, else it won't work

        return new Promise((resolve, reject) => {
            try {
                const sock = zmq.socket('push');
                sock.connect(this.options.zmqClientAddress);
                sock.setsockopt('linger', 10000);
                sock.send(
                    JSON.stringify({
                        fcmTokens,
                        title,
                        body,
                        subtitle,
                        imageUrl,
                        data: extras,
                    }),
                );
                sock.close();
                return resolve('Firebase Message Queued');
            } catch (e) {
                return reject(e);
            }
        });
    }
    async pushSlackMessage(markdownMessage: string) {
        // @markdownMessage: message string, could be markdown.
        return new Promise(async (resolve, reject) => {
            try {
                const res = await Slack.sendSlackMessage(this.options.slackURL, markdownMessage);
                return resolve(res);
            } catch (e) {
                return reject(e);
            }
        });
    }

    static validateRoomName(roomName: string) {
        // /^([0-9a-z_]+\.)*([0-9a-z_]+)$/
        const regex = new RegExp(/^([0-9a-z_]+\.)*([0-9a-z_]+)$/);
        return regex.test(roomName);
    }
}

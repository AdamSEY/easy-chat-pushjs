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
exports.User = void 0;
const SocketError_1 = require("./SocketError");
const jwt = require('jsonwebtoken');
const zmq = require('zeromq');
const uuid = require('uuid');
const fs = require('fs');
class User {
    constructor(options) {
        // defaults
        // @ts-ignore
        this.options = {};
        this.options.zmqClientAddress = 'tcp://127.0.0.1:3500';
        this.options.jwtExpireSeconds = 365 * 24 * 60 * 60;
        this.options.version = 1.0; // used to invalidate old tokens when you want. if client version different than this. authenacation will fail.
        // override options
        if (options && typeof options === 'object') {
            for (const option in options) {
                // @ts-ignore
                this.options[option] = options[option];
            }
        }
        if (this.options.jwtPrivateKey === null)
            throw new SocketError_1.default('jwtPrivateKey should be Buffer, make sure to create JWT RS256 key pair and set the path.');
    }
    createUserToken(rooms, chatRoomName, userId, uniqueToken = null, extras = {}) {
        // @ts-ignore
        const jwtToken = {};
        jwtToken.userId = userId;
        jwtToken.chatRoomName = chatRoomName; // this room user can publish messages by emitting "chat" event, anyone in the same room will receive this message.
        jwtToken.rooms = rooms; // array of rooms
        // jwtToken.pinnedMessage = pinnedMessage;
        jwtToken.joinTime = new Date().getTime();
        if (this.options.version != null) {
            jwtToken.version = this.options.version;
        } // change this to invalidate all previous tokens.
        jwtToken.uniqueToken = uniqueToken ? uniqueToken : uuid.v4(); // in case onlyOneConnection is enabled. if a user has the same token we don't allow them to join.
        // use example: if you want e.g. to disallow a user with same userId/ip to connect twice, unqiue token could be an IP address or userId.
        const issuedAt = parseInt((new Date().getTime() / 1000).toString());
        // @ts-ignore
        const expire = issuedAt + this.options.jwtExpireSeconds;
        const data = Object.assign(Object.assign({ iat: issuedAt, nbf: issuedAt, exp: expire }, jwtToken), extras);
        return jwt.sign(data, fs.readFileSync(this.options.jwtPrivateKey), { algorithm: 'RS256' });
    }
    pushNotification(roomName, data, userId = null) {
        return __awaiter(this, void 0, void 0, function* () {
            // @fcmTokens: array of user fcm tokens.
            // @userId: if false, public will happen to everyone in a room
            // Note: roomName can be null if userId is not false.
            return new Promise((resolve, reject) => {
                try {
                    const sock = zmq.socket('push');
                    sock.connect(this.options.zmqClientAddress);
                    sock.setsockopt('linger', 0);
                    sock.send(JSON.stringify({
                        roomName,
                        userId,
                        data: data,
                    }));
                    sock.close();
                    return resolve('Message Queued');
                }
                catch (e) {
                    return reject(e);
                }
            });
        });
    }
    pushFirebaseNotifications(fcmTokens, title, body, imageUrl = null, extras = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            // @fcmTokens: array of user fcm tokens.
            // @userId: if false, public will happen to everyone in a room
            // make sure configure firebase before using this, else it won't work
            return new Promise((resolve, reject) => {
                try {
                    const sock = zmq.socket('push');
                    sock.connect(this.options.zmqClientAddress);
                    sock.setsockopt('linger', 0);
                    sock.send(JSON.stringify({
                        fcmTokens,
                        title,
                        body,
                        imageUrl,
                        data: extras,
                    }));
                    sock.close();
                    return resolve('Firebase Message Queued');
                }
                catch (e) {
                    return reject(e);
                }
            });
        });
    }
    pushSlackMessage(markdownMessage) {
        return __awaiter(this, void 0, void 0, function* () {
            // @markdownMessage: message string, could be markdown.
            return new Promise((resolve, reject) => {
                try {
                    const sock = zmq.socket('push');
                    sock.connect(this.options.zmqClientAddress);
                    sock.setsockopt('linger', 0);
                    sock.send(JSON.stringify({
                        slackMessage: markdownMessage,
                    }));
                    sock.close();
                    return resolve('Slack Message Queued');
                }
                catch (e) {
                    return reject(e);
                }
            });
        });
    }
    static validateRoomName(roomName) {
        // /^([0-9a-z_]+\.)*([0-9a-z_]+)$/
        const regex = new RegExp(/^([0-9a-z_]+\.)*([0-9a-z_]+)$/);
        return !!regex.test(roomName);
    }
}
exports.User = User;

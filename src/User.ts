import * as fs from 'fs';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import * as zmq from 'zeromq';
import { Slack } from './Slack';
import SocketError from "./SocketError";
import { UserObj } from "./UserObj";

interface ClientOptionsObj {
    jwtPrivateKey: Buffer;
    version?: number;
    jwtExpireSeconds?: number;
    zmqClientAddress?: string;
    slackURL?: string;
}

export class User {
    private options: ClientOptionsObj;
    private static sock: zmq.Socket | null = null;

    constructor(options: ClientOptionsObj) {
        const defaults: ClientOptionsObj = {
            zmqClientAddress: 'tcp://127.0.0.1:3500', // Default ZMQ client address
            jwtExpireSeconds: 365 * 24 * 60 * 60, // Default JWT expiration time (1 year)
            version: 1.0, // Default version
            jwtPrivateKey: Buffer.alloc(0), // Placeholder, must be replaced by actual key
        };
        this.options = { ...defaults, ...options };
        if (!this.options.jwtPrivateKey || this.options.jwtPrivateKey.length === 0) {
            throw new SocketError('jwtPrivateKey must be provided and should be a non-empty Buffer.');
        }
    }

    private ensureSocketInitialized(): zmq.Socket {
        if (User.sock === null) {
            User.sock = zmq.socket('push');
            if (this.options.zmqClientAddress) {
                User.sock.connect(this.options.zmqClientAddress);
            }
            User.sock.setsockopt(zmq.ZMQ_LINGER, 10000);
        }
        return User.sock;
    }

    public async pushNotification(roomName: string | null, data: object, userId: string | null = null): Promise<string> {
        if (!roomName && !userId) {
            throw new Error('Please specify a target for your message.');
        }

        const sock = this.ensureSocketInitialized();
        const message = JSON.stringify({ roomName, userId, data });

        return new Promise((resolve, reject) => {
            try {
                sock.send(message);
                resolve('Message Queued');
            } catch (e) {
                reject(e);
            }
        });
    }

    public async pushFirebaseNotifications(fcmTokens: Array<string>, title: string, body: string, subtitle?: string, imageUrl: string | null = null, extras: object = {}): Promise<string> {
        const sock = this.ensureSocketInitialized();
        const message = JSON.stringify({
            fcmTokens,
            title,
            body,
            subtitle,
            imageUrl,
            data: extras,
        });

        return new Promise((resolve, reject) => {
            try {
                sock.send(message);
                resolve('Firebase Message Queued');
            } catch (e) {
                reject(e);
            }
        });
    }

    public createUserToken(rooms: Array<string>, chatRoomName: null | string, userId: string, uniqueToken: null | string = null, webRtcRoom: null | string = null, extras: object = {}): string {
        const jwtToken: UserObj = {
            userId: userId,
            chatRoomName: chatRoomName,
            rooms: rooms,
            webRtcRoom: webRtcRoom,
            joinTime: new Date().getTime(),
            uniqueToken: uniqueToken ? uniqueToken : uuidv4(),
        };

        if (typeof this.options.version === 'number') {
            jwtToken.version = this.options.version;
        }

        const issuedAt = Math.floor(new Date().getTime() / 1000);

        // Type guard to ensure jwtExpireSeconds is defined
        if (typeof this.options.jwtExpireSeconds !== 'number') {
            throw new Error('jwtExpireSeconds is not defined.');
        }

        const expire = issuedAt + this.options.jwtExpireSeconds; // Now safe to use directly

        const data = {
            iat: issuedAt,
            nbf: issuedAt,
            exp: expire,
            ...jwtToken,
            ...extras,
        };

        return jwt.sign(data, this.options.jwtPrivateKey, { algorithm: 'RS256' });
    }

    public async pushSlackMessage(markdownMessage: string): Promise<any> {
        try {
            if (!this.options.slackURL) {
                return 'Slack URL not provided';
            }
            const res = await Slack.sendSlackMessage(this.options.slackURL, markdownMessage);
            return res;
        } catch (e) {
            throw e;
        }
    }

    public static validateRoomName(roomName: string): boolean {
        const regex = new RegExp(/^([0-9a-z_]+\.)*([0-9a-z_]+)$/);
        return regex.test(roomName);
    }
}

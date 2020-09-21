/// <reference types="node" />
import { UserObj } from "./UserObj";
interface optionsObj {
    firebaseDatabaseURL?: string;
    firebaseAdminSdkPath?: string;
    onMessageReceived?: Function;
    jwtPublicKey: Buffer;
    version?: number;
    onlyOneConnection?: boolean;
    slackURL?: null | string;
    pingTimeout?: number;
    pingInterval?: number;
    wsPort?: number;
    zmqServerAddress?: string;
}
export declare class Server {
    private readonly options;
    private redisClient;
    constructor(options: optionsObj);
    decodeJWT(token: string): any;
    verifyUser(token: string): any;
    disconnect(socket: any, io: any): Promise<void>;
    connection(socket: any): Promise<any>;
    authMiddleware(socket: any, next: any): Promise<any>;
    startServer(): void;
    flushAll(): Promise<void>;
    usersInfo(io: any, userInfo: UserObj): void;
    delPinnedMessage(socketID: string, chatRoomName: string, io: any): Promise<void>;
    setPinnedMessage(chatRoomName: string, socketID: string, pinnedMessage: string): Promise<void>;
    getPinnedMessage(io: any, chatRoomName: string): Promise<void>;
    disconnectUser(socket: any, io: any, reason: any, roomName: string): Promise<void>;
}
export {};

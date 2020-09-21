/// <reference types="node" />
interface clientOptionsObj {
    jwtPrivateKey: Buffer;
    version?: number;
    jwtExpireSeconds?: number;
    zmqClientAddress?: string;
}
export declare class User {
    private readonly options;
    constructor(options: clientOptionsObj);
    createUserToken(rooms: object, chatRoomName: null | string, userId: string, uniqueToken?: null | string, extras?: object): any;
    pushNotification(roomName: null | string, data: object, userId?: string | null): Promise<unknown>;
    pushFirebaseNotifications(fcmTokens: object, title: string, body: string, imageUrl?: null | string, extras?: object): Promise<unknown>;
    pushSlackMessage(markdownMessage: string): Promise<unknown>;
    static validateRoomName(roomName: string): boolean;
}
export {};

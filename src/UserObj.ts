export interface UserObj{
    userId: string;
    chatRoomName : null | string;
    rooms: object;
    joinTime : number;
    version : number;
    uniqueToken : string;
}
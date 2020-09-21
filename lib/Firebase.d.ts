export default class {
    private readonly firebaseAdminSdkPath;
    private readonly databaseURL;
    constructor(firebaseAdminSdkPath: string, databaseURL: string);
    init(): void;
    sendMessage(tokens: object, title: string, body: string, imageUrl?: string | null, extras?: object | null): Promise<unknown>;
}

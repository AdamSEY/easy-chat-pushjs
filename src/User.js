const jwt = require('jsonwebtoken');
const zmq = require("zeromq");
const uuid = require("uuid");


class User{
    constructor(options = {}) {
        // defaults
        this.options = {};
        this.options.zmqClientAddress = 'tcp://127.0.0.1:3500';
        this.options.jwtExpireSeconds = (365 * 24 * 60 * 60);
        this.options.version = 1.0; // used to invalidate old tokens when you want. if client version different than this. authenacation will fail.
        this.options.jwtPrivateKey = null;

        // override options
        if (options && typeof options === 'object'){
            for (const option in options) {
                this.options[option] = options[option];
            }
        }
        if (this.options.jwtPrivateKey === null) throw new SocketError('Jwt private key path is required, make sure to create JWT RS256 private key');
    }

     createUserToken(channelName, canPublish, username, userId, uniqueToken = false ){

        const jwtToken = {};

        jwtToken.userId = userId;
        jwtToken.canPublish = canPublish;
        jwtToken.channelName = channelName;
       // jwtToken.pinnedMessage = pinnedMessage;
        jwtToken.username = username;
        jwtToken.joinTime = new Date().getTime();
        jwtToken.version = this.options.version; // change this to invalidate all previous tokens.
        jwtToken.uniqueToken = uniqueToken ? uniqueToken : uuid.v4(); // in case onlyOneConnection is enabled. if a user has the same token we don't allow them to join.
        // use example: if you want e.g. to disallow a user with same userId/ip to connect twice, unqiue token could be an IP address or userId.


        const issuedAt   = parseInt((new Date().getTime() / 1000).toString());
        const expire     =  issuedAt + this.options.jwtExpireSeconds;
        const data = {
            'iat'  : issuedAt,         // Issued at: time when the token was generated
            'nbf' : issuedAt,
            'exp' : expire,           // Expire
            ...jwtToken
    };
        return jwt.sign(data, this.options.jwtPrivateKey, { algorithm: 'RS256'});
    }
     async pushNotification(channelName, data , userId = false ){
        // @fcmTokens: array of user fcm tokens.
        // @userId: if false, public will happen to everyone in a room

        return new Promise((resolve, reject) => {
          try {
              const sock = zmq.socket('push');
              sock.connect(this.options.zmqClientAddress);
              sock.send(JSON.stringify({
                  channelName,
                  userId,
                  data:data
              }));
              sock.close();
              return resolve('Message Queued');
          }catch (e){
              return reject(e);
          }
        })

    }
     async pushFirebaseNotifications(fcmTokens, title, body, imageUrl = '', extras = {} ){
        // @fcmTokens: array of user fcm tokens.
        // @userId: if false, public will happen to everyone in a room
         // make sure configure firebase before using this, else it won't work

        return new Promise((resolve, reject) => {
          try {
              const sock = zmq.socket('push');
              sock.connect(this.options.zmqClientAddress);
              sock.send(JSON.stringify({
                  fcmTokens,
                  title,
                  body,
                  imageUrl,
                  data:extras
              }));
              sock.close();
              return resolve('Firebase Message Queued');
          }catch (e){
              return reject(e);
          }
        })

    }
     async pushSlackMessage(markdownMessage){
        // @markdownMessage: message string, could be markdown.

        return new Promise((resolve, reject) => {
          try {
              const sock = zmq.socket('push');
              sock.connect(this.options.zmqClientAddress);
              sock.send(JSON.stringify({
                slackMessage: markdownMessage
              }));
              sock.close();
              return resolve('Slack Message Queued');
          }catch (e){
              return reject(e);
          }
        })

    }


    static validateChannelName(channelName){
        // /^([0-9a-z_]+\.)*([0-9a-z_]+)$/
        const regex = new RegExp(/^([0-9a-z_]+\.)*([0-9a-z_]+)$/);
        return !!regex.test(channelName);
    }



}
module.exports = User;
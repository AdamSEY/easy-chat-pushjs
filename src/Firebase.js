const admin = require('firebase-admin');


class Firebase {
    constructor(firebaseAdminSdkPath, databaseURL) {
        this.firebaseAdminSdkPath = firebaseAdminSdkPath;
        this.databaseURL = databaseURL;
        this.init();
    }
    init(){
        const serviceAccount = require(this.firebaseAdminSdkPath);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: this.databaseURL
        });
    }
    sendMessage(tokens, title, body, imageUrl = null ,extras = {}) {
        const message = {
            data: extras,
            notification: {
                title: title,
                body: body,
            },
            webpush: {
                headers: {
                    Urgency: "high"
                },
                "notification": {
                    "body": body,
                    "requireInteraction": true,
                }
            },
            tokens: tokens,
        }
        if (imageUrl) message.webpush.notification.icon = imageUrl;
        console.log(message.notification);
        return new Promise((resolve, reject) => {
            admin.messaging().sendMulticast(message).then((response) => {
                console.log(response.successCount + ' messages were sent successfully');
                return resolve(response);
            }).catch(e => {
                console.log('Failed to send FCM message', e);
                return reject(e);
            });
        })


    }
}

module.exports = Firebase;
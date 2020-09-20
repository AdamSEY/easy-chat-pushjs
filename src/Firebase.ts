import { admin } from 'firebase-admin/lib/messaging';
import BatchResponse = admin.messaging.BatchResponse;

const admin = require('firebase-admin');

export default class {
  private readonly firebaseAdminSdkPath: string;
  private readonly databaseURL: string;

  constructor(firebaseAdminSdkPath: string, databaseURL: string) {
    this.firebaseAdminSdkPath = firebaseAdminSdkPath;
    this.databaseURL = databaseURL;
    this.init();
  }
  init() {
    const serviceAccount = require(this.firebaseAdminSdkPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: this.databaseURL,
    });
  }
  sendMessage(tokens: object, title: string, body: string, imageUrl: string | null = null, extras: object | null = {}) {
    const message = {
      data: extras,
      notification: {
        title: title,
        body: body,
      },
      webpush: {
        headers: {
          Urgency: 'high',
        },
        notification: {
          body: body,
          requireInteraction: true,
          icon: imageUrl,
        },
      },
      tokens: tokens,
    };
    console.log(message.notification);
    return new Promise((resolve, reject) => {
      admin
        .messaging()
        .sendMulticast(message)
        .then((response: BatchResponse) => {
          console.log(response.successCount + ' messages were sent successfully');
          return resolve(response);
        })
        .catch((e: any) => {
          console.log('Failed to send FCM message', e);
          return reject(e);
        });
    });
  }
}

export default class {
  private readonly firebaseApiKey: string;

  constructor(firebaseApiKey: string) {
    this.firebaseApiKey = firebaseApiKey;
  }
  sendMessage(
      tokens: Array<string>,
              title: string,
              body: string,
              subtitle: string | undefined,
              imageUrl: string | undefined = undefined,
              extras?: { [key: string]: string; }
    ) {


    const axios = require('axios');
    const object = {
      ...extras,
      "registration_ids": [...tokens],
      "notification": {
        "title": title,
        "body": body,
        "subtitle": subtitle,
        "content_available" : true,
        "sound":"default",
        "image": imageUrl
      },
      "android": {
        "notification": {
          "imageUrl": imageUrl
        }
      },
      "apns": {
        "payload": {
          "aps": {
            "mutable-content": "1",
            "content-available": "true"
          },
          "imageUrl": imageUrl,
          "fcm_options": {
            "imageUrl": imageUrl
          }
        },
        "headers": {
          "mutable-content": "1",
          "apns-push-type": "background",
          "apns-priority": "5",
          "apns-topic": "com.paidtabs"
        }
      },
      "webpush": {
        "headers": {
          "image": imageUrl
        }
      }
    }
    const data = JSON.stringify(object);

    const config = {
      method: 'post',
      url: 'https://fcm.googleapis.com/fcm/send',
      headers: {
        'Authorization': 'key=' + this.firebaseApiKey,
        'Content-Type': 'application/json'
      },
      data : data
    };

    axios(config)
        .then(function (response: any) {
          console.log(JSON.stringify(response.data));
        })
        .catch(function (error: any) {
          console.log(error);
        });



  }
}

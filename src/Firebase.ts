export default class {
  private readonly firebaseApiKey: string;

  constructor(firebaseApiKey: string) {
    this.firebaseApiKey = firebaseApiKey;
  }
  sendMessage(
      tokens: Array<string>,
              title: string,
              body: string,
              imageUrl: string | undefined = undefined,
              extras?: { [key: string]: string; }
    ) {


    const axios = require('axios');
    const data = JSON.stringify({
      ...extras,
      "registration_ids": [...tokens],
      "notification": {
        "title": title,
        "body": body,
        "content_available" : true,
        "priority" : "high",
        "sound":"default",
        "imageUrl": imageUrl,
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
            "mutable-content": 1
          }
        },
        "fcm_options": {
          "image": imageUrl
        }
      },
      "webpush": {
        "headers": {
          "image": imageUrl
        }
      }
    });

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

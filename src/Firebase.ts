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
      "registration_ids": [...tokens],
      "notification": {
        "title": title,
        "body": body,
        "imageUrl": imageUrl,
        "content_available" : true,
        "sound":"default",
        ...extras
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

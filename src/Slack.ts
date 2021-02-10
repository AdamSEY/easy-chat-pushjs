import {IncomingMessage} from "http";

export class Slack {
    static async sendSlackMessage(slackUrl: string, markdownMessage: string) {
        const url = require('url');
        const link = url.parse(slackUrl);

        const https = require('https');

        const data = JSON.stringify({ text: markdownMessage });

        // console.log(link);
        const options = {
            hostname: link.hostname,
            port: 443,
            path: link.path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length,
            },
        };
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res:IncomingMessage) => {
                res.setEncoding('utf8');
                let responseBody = '';

                res.on('data', (chunk:any) => {
                    responseBody += chunk;
                });

                res.on('end', () => {
                    resolve(responseBody);
                });
            });

            req.on('error', (err: any) => {
                reject(err);
            });

            req.write(data)
            req.end();
        });

    }
}

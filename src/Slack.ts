import {IncomingMessage} from "http";

export default class Slack {
    static async sendSlackMessage(slackUrl: string, markdownMessage: string) {
        const url = require('url');
        const link = url.parse(slackUrl);

        const https = require('https');

        const data = JSON.stringify({ text: markdownMessage });

        console.log(link);
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

        const req = https.request(options, (res: IncomingMessage) => {
            console.log(`statusCode: ${res.statusCode}`);

            res.on('data', (d: any) => {
                process.stdout.write(d);
            });
        });

        req.on('error', (error: Error) => {
            console.error(error);
        });

        req.write(data);
        req.end();
    }
}

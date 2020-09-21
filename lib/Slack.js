"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
class Slack {
    static sendSlackMessage(slackUrl, markdownMessage) {
        return __awaiter(this, void 0, void 0, function* () {
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
            const req = https.request(options, (res) => {
                console.log(`statusCode: ${res.statusCode}`);
                res.on('data', (d) => {
                    process.stdout.write(d);
                });
            });
            req.on('error', (error) => {
                console.error(error);
            });
            req.write(data);
            req.end();
        });
    }
}
exports.default = Slack;
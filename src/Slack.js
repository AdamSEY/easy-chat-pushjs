class Slack{
    static async sendSlackMessage(slackUrl, markdownMessage) {

        const url = require('url');
        const link =  url.parse(slackUrl);

        const https = require('https')

        const data = JSON.stringify({text: markdownMessage})

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
        }

        const req = https.request(options, (res) => {
            console.log(`statusCode: ${res.statusCode}`)

            res.on('data', (d) => {
                process.stdout.write(d)
            })
        })

        req.on('error', (error) => {
            console.error(error)
        })

        req.write(data)
        req.end()
    }
}
module.exports = Slack;
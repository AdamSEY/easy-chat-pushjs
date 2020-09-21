export default class Slack {
    static sendSlackMessage(slackUrl: string, markdownMessage: string): Promise<void>;
}

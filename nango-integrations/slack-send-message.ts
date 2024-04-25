import type { NangoAction, SlackSendMessageInput } from './models';

export default async function runAction(nango: NangoAction, input: SlackSendMessageInput): Promise<void> {
    const response = await nango.post({
        endpoint: `/chat.postMessage`,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        data: { channel: input.userSlackId, text: "Hello Hackernews!" }
    });

    const success = response && response.data && response.data['ok'];

    if (!success) {
        throw new nango.ActionError({
            message: 'Failed to send message',
            error: response?.data?.error
        });
    }
}
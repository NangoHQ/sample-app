import type { NangoAction, SlackSendMessageInput } from '../../models';

type SlackResponse =
  | {
      ok: boolean;
    }
  | { error: any };

export default async function runAction(
  nango: NangoAction,
  input: SlackSendMessageInput
): Promise<void> {
  const response = await nango.post<SlackResponse>({
    endpoint: `/chat.postMessage`,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    data: { channel: input.userSlackId, text: 'Hello World!' },
  });

  if (!('ok' in response.data)) {
    throw new nango.ActionError({
      message: 'Failed to send message',
      error: response.data.error,
    });
  }
}

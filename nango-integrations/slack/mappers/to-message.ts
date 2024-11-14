import type { SendMessageOutput } from '../../models';
import type { SlackResponse, SlackSuccessResponse } from '../types';

function isSlackSuccessResponse(
  response: SlackResponse
): response is SlackSuccessResponse {
  return response.ok;
}

export function toMessage(response: SlackResponse): SendMessageOutput {
  if (isSlackSuccessResponse(response)) {
    return {
      ok: response.ok,
      channel: response.channel,
      ts: response.ts,
      message: response.message.text,
      warning: response.warning,
      error: undefined,
      raw_json: JSON.stringify(response),
    };
  } else {
    return {
      ok: response.ok,
      channel: undefined,
      ts: undefined,
      message: undefined,
      warning: undefined,
      error: response.error,
      raw_json: JSON.stringify(response),
    };
  }
}

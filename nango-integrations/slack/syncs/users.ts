import type { SlackUser, NangoSync } from '../../models';

interface SlackResponse {
  ok: boolean;
  members: Array<{
    id: number;
    is_bot: boolean;
    profile: { real_name: string; image_48: string };
    deleted: boolean;
  }>;
  response_metadata: { next_cursor?: string };
}

export default async function fetchData(nango: NangoSync) {
  let nextCursor = '';
  const users: SlackUser[] = [];

  do {
    const response = await nango.get<SlackResponse>({
      endpoint: 'users.list',
      retries: 10,
      params: { limit: '200', cursor: nextCursor },
    });

    if (!response.data.ok) {
      break;
    }

    for (const member of response.data.members) {
      if (member.deleted || member.is_bot) {
        continue;
      }

      users.push({
        id: String(member.id),
        fullName: member.profile.real_name,
        deleted: member.deleted,
        avatar: member.profile.image_48,
      });
    }

    nextCursor = response.data.response_metadata.next_cursor || '';
  } while (nextCursor);

  await nango.batchSave(users, 'SlackUser');
}

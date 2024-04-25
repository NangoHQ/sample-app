import type { SlackUser, NangoSync } from './models';

export default async function fetchData(nango: NangoSync) {
    let nextCursor = '';
    const users: SlackUser[] = [];

    do {
        const response = await nango.get({
            endpoint: 'users.list',
            retries: 10,
            params: { limit: '200', cursor: nextCursor }
        });

        if (!response.data.ok) { break; }

        users.push(...response.data.members.map((member: any) => ({
            id: member.id,
            fullName: member.profile.real_name || null,
            deleted: member.deleted
        })));

        nextCursor = response.data.response_metadata.next_cursor || '';
    } while (nextCursor);

    await nango.batchSave(users, 'SlackUser');
}

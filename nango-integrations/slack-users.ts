import type { SlackUser, NangoSync } from './models';

export default async function fetchData(nango: NangoSync) {
    // Fetch all users (paginated)
    let nextCursor = '';
    let responses: any[] = [];

    do {
        const response = await nango.get({
            endpoint: 'users.list',
            retries: 10,
            params: {
                limit: '200',
                cursor: nextCursor !== 'x' ? nextCursor : ''
            }
        });

        if (!response.data.ok) {
            await nango.log(`Received a Slack API error: ${JSON.stringify(response.data, null, 2)}`, { level: 'error'});
            break;
        }

        const { members, response_metadata } = response.data;
        responses = responses.concat(members);
        nextCursor = response_metadata.next_cursor;
    } while (nextCursor !== '')

    // Transform users into our data model
    const users: SlackUser[] = responses.map((record: any) => {
        return {
            id: record.id,
            fullName: record.profile.real_name ? record.profile.real_name : null,
            deleted: record.deleted,
        };
    });

    await nango.batchSave(users, 'SlackUser');
}

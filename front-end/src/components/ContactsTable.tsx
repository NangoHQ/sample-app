import type { GetContacts } from 'back-end';
import { baseUrl } from '../utils';

export default function ContactsTable({
  contacts,
}: {
  contacts: GetContacts['contacts'] | undefined;
}) {
  if (!contacts) {
    return null;
  }

  async function sendMessage(slackUserId: string | null) {
    if (!slackUserId) {
      return;
    }
    
    try {
      await fetch(
        `${baseUrl}/send-slack-message`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            integration: 'slack',
            slackUserId: slackUserId
          })
        }
      );
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="mt-8 flow-root">
      <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                  >
                    ID
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >
                    Send Slack Message
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {!contacts.length ? (
                  <div className="mt-8 text-center h-20">No contacts found</div>
                ) : (
                  contacts.map((contact) => (
                    <tr key={contact.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {contact.id}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {contact.fullName}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <button
                          onClick={() => sendMessage(contact.id)}
                          className={"rounded gap-x-3 border border-transparent py-2 px-3 text-sm font-semibold bg-gray-200 hover:bg-gray-300 text-gray-800"}
                        >
                          Send
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

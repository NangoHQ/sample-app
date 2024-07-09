import type { GetContacts } from 'back-end';
import { useState } from 'react';
import { baseUrl } from '../utils';
import Spinner from './Spinner';

const Row: React.FC<{ contact: GetContacts['contacts'][0] }> = ({
  contact,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState<boolean>(false);

  async function sendMessage(slackUserId: string) {
    setLoading(true);
    setPosted(false);
    setError(null);

    try {
      await fetch(`${baseUrl}/send-slack-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          integration: 'slack',
          slackUserId: slackUserId,
        }),
      });
      setPosted(true);
    } catch (err) {
      console.error(err);
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <tr key={contact.id}>
      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
        {contact.id}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
        {contact.fullName}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
        <div className="flex gap-4 items-center">
          <button
            onClick={() => sendMessage(contact.id)}
            className={
              'flex items-center rounded gap-x-3 border border-transparent py-2 px-3 text-sm font-semibold bg-gray-200 hover:bg-gray-300 text-gray-800'
            }
            disabled={loading}
          >
            Send
            {loading && <Spinner size={1} className="text-gray-800" />}
          </button>
          {error && <div className="text-xs text-red-400">{error}</div>}
          {posted && (
            <div className="text-xs text-green-400">Sent to Slack</div>
          )}
        </div>
      </td>
    </tr>
  );
};

export const ContactsTable: React.FC<{
  contacts: GetContacts['contacts'] | undefined;
}> = ({ contacts }) => {
  if (!contacts) {
    return (
      <div className="mt-8 italic text-gray-500">
        No contacts, activate your webhooks and connect Slack...
      </div>
    );
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
                    <Row key={contact.id} contact={contact} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

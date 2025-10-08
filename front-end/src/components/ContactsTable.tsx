import type { GetContactsSuccess } from 'back-end';
import { useEffect, useState } from 'react';
import { Button } from '@headlessui/react';
import { IconCheck } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { baseUrl, cn, queryClient } from '../utils';
import { listContacts } from '../api';
import Spinner from './Spinner';

const Row: React.FC<{ contact: GetContactsSuccess['contacts'][0] }> = ({ contact }) => {
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
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    integration: 'slack',
                    slackUserId: slackUserId
                })
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
        <div className="transition-colors flex gap-2 justify-between items-center px-5 py-5 text-sm border-b hover:bg-gray-50">
            <div className="whitespace-nowrap text-[#292d32] flex gap-4 items-center">
                <img src={contact.avatar} alt="" className="rounded-full w-7" />
                {contact.fullName}
            </div>
            <div className="whitespace-nowrap text-gray-500">
                <div className="flex gap-4 items-center">
                    <Button
                        onClick={() => sendMessage(contact.id)}
                        className={cn(
                            'transition-all flex gap-2 items-center rounded py-1.5 px-3 text-xs font-medium bg-[#635cff] hover:bg-opacity-80 text-white',
                            posted && 'text-[#0e6245] bg-[#cbf4c9]'
                        )}
                        disabled={loading}
                    >
                        {posted ? 'Invited' : 'Invite'}
                        {loading && <Spinner size={1} className="text-gray-800" />}
                        {posted && <IconCheck className="text-[#0e6245]" size={16} />}
                    </Button>
                    {error && <div className="text-xs text-red-400">{error}</div>}
                </div>
            </div>
        </div>
    );
};

export const ContactsTable: React.FC = () => {
    const { data: resContacts, isLoading } = useQuery({
        queryKey: ['contacts'],
        queryFn: listContacts
    });
    useEffect(() => {
        const interval = setInterval(
            () => {
                void queryClient.refetchQueries({ queryKey: ['contacts'] });
            },
            resContacts !== undefined && resContacts.contacts.length > 0 ? 10000 : 1000
        );

        return () => {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [resContacts]);

    if (isLoading || !resContacts?.contacts) {
        return (
            <div className="w-full flex justify-center">
                <Spinner size={1} />
            </div>
        );
    }

    return (
        <div className="w-full">
            {!resContacts.contacts.length ? (
                <div className="mt-8 text-center h-20">No contacts found</div>
            ) : (
                resContacts.contacts.map((contact) => <Row key={contact.id} contact={contact} />)
            )}
        </div>
    );
};

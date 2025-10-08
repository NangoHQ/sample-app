import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { IconInfoCircle } from '@tabler/icons-react';

export default function InfoModal({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
    return (
        <Transition.Root show={open} as={Fragment}>
            <Dialog as="div" className="relative z-10" onClose={setOpen}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6">
                                <div>
                                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
                                        <IconInfoCircle className="h-12 w-12 text-red-600" aria-hidden="true" />
                                    </div>
                                    <div className="mt-3 text-center sm:mt-5">
                                        <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                                            Integration setup required
                                        </Dialog.Title>
                                        <div className="mt-2">
                                            <a target="_blank" href="https://app.nango.dev/signin" rel="noopener noreferrer">
                                                <span className="text-sm text-gray-600 underline cursor-pointer hover:text-gray-400">
                                                    Login to your Nango Cloud Account
                                                </span>
                                            </a>
                                            <span className="text-sm text-gray-600"> to connect your account. Then follow </span>
                                            <a
                                                target="_blank"
                                                href="https://docs.nango.dev/integrate/guides/authorize-an-api#create-an-integration"
                                                rel="noopener noreferrer"
                                            >
                                                <span className="text-sm text-gray-600 underline cursor-pointer hover:text-gray-400">these instructions</span>
                                            </a>
                                            <span className="text-sm text-gray-600"> to connect your account.</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-5 sm:mt-6">
                                    <button
                                        type="button"
                                        className="inline-flex w-full justify-center rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600"
                                        onClick={() => {
                                            setOpen(false);
                                        }}
                                    >
                                        Go back to dashboard
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
}

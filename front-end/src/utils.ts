import { twMerge } from 'tailwind-merge';
import { clsx, type ClassValue } from 'clsx';
import { QueryClient } from '@tanstack/react-query';
import type { Integration } from './types';

export const baseUrl = 'http://localhost:3003';
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const queryClient = new QueryClient();

export const requestedIntegrations: Integration[] = [
  {
    name: 'Slack',
    image: '/integration-logos/slack.svg',
    integrationId: 'slack',
    description: 'Connect your Slack account to Wolf CRM.',
    deployed: false,
    connected: false,
  },
  {
    name: 'Discord',
    image: '/integration-logos/discord.svg',
    integrationId: 'discord',
    description: 'Connect your Discord account to Wolf CRM.',
    deployed: false,
    connected: false,
  },
];

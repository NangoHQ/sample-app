import { Nango } from '@nangohq/node';

export const nango = new Nango({
    host: process.env['NANGO_HOST'] ?? 'https://api.nango.dev',
    secretKey: process.env['NANGO_SECRET_KEY']!
});

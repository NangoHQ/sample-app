import { Nango } from '@nangohq/node';

export const nango = new Nango({ secretKey: process.env['NANGO_SECRET_KEY']! });

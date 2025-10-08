import { PrismaClient } from '@prisma/client';

export const db = new PrismaClient();

export async function seedUser() {
    await db.users.upsert({
        where: { email: 'john.doe@example.com' },
        update: {},
        create: {
            email: 'john.doe@example.com',
            displayName: 'John Doe'
        }
    });
}

export async function getUserFromDatabase() {
    return await db.users.findFirst({ where: { email: 'john.doe@example.com' } });
}

export async function getUserConnection(userId: string, providerConfigKey: string) {
    return await db.userConnections.findFirst({
        where: {
            userId: userId,
            providerConfigKey: providerConfigKey
        }
    });
}

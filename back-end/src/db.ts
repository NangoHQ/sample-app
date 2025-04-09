import { PrismaClient } from '@prisma/client';

export const db = new PrismaClient();

export async function seedUser() {
  await db.users.upsert({
    where: { email: 'ayodeji.adeoti+dev@nango.dev' },
    update: {},
    create: {
      email: 'ayodeji.adeoti+dev@nango.dev',
      displayName: 'John Doe',
    },
  });
}

export async function getUserFromDatabase() {
  return await db.users.findFirst({ where: { email: 'ayodeji.adeoti+dev@nango.dev' } });
}

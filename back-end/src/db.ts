import pg from 'pg';
import { randomUUID } from 'crypto';

const { Pool } = pg;

export const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });


export interface User {
    id: string;
    email: string;
    displayName: string;
    password: string | null;
    connectionId: string | null;
}

export interface UserConnection {
    id: string;
    userId: string;
    connectionId: string;
    providerConfigKey: string;
    broken: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Contact {
    id: string;
    integrationId: string;
    connectionId: string;
    fullName: string;
    avatar: string;
    createdAt: Date | null;
    updatedAt: Date;
    deletedAt: Date | null;
}

export interface FileRecord {
    id: string;
    title: string;
    mimeType: string;
    url: string;
    size: number | null;
    driveId: string | null;
    createdTime: Date;
    integrationId: string;
    connectionId: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}

export interface SyncedRecord {
    id: string;
    integrationId: string;
    connectionId: string;
    model: string;
    data: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}

export interface SyncBookmark {
    connectionId: string;
    model: string;
    modifiedAfter: string;
    updatedAt: Date;
}

export interface WebhookEvent {
    id: string;
    type: string;
    provider: string;
    connectionId: string | null;
    operation: string | null;
    model: string | null;
    payload: unknown;
    receivedAt: Date;
}


export const db = {
    users: {
        async findUnique(args: { where: { email?: string; id?: string } }): Promise<User | null> {
            if (args.where.email !== undefined) {
                const r = await pool.query<User>('SELECT * FROM "Users" WHERE email = $1 LIMIT 1', [args.where.email]);
                return r.rows[0] ?? null;
            }
            const r = await pool.query<User>('SELECT * FROM "Users" WHERE id = $1 LIMIT 1', [args.where.id]);
            return r.rows[0] ?? null;
        },

        async findFirst(args: { where: { email?: string } }): Promise<User | null> {
            const r = await pool.query<User>('SELECT * FROM "Users" WHERE email = $1 LIMIT 1', [args.where.email]);
            return r.rows[0] ?? null;
        },

        async findMany(_args?: { orderBy?: { email?: string } }): Promise<User[]> {
            const r = await pool.query<User>('SELECT * FROM "Users" ORDER BY email ASC');
            return r.rows;
        },

        async create(args: { data: { email: string; displayName: string; password?: string; id?: string } }): Promise<User> {
            const { email, displayName, password, id } = args.data;
            const userId = id ?? randomUUID();
            const r = await pool.query<User>(
                'INSERT INTO "Users" (id, email, "displayName", password) VALUES ($1, $2, $3, $4) RETURNING *',
                [userId, email, displayName, password ?? null]
            );
            return r.rows[0]!;
        },

        async upsert(args: {
            where: { email: string };
            update: { displayName?: string };
            create: { id?: string; email: string; displayName: string; password?: string };
        }): Promise<User> {
            const { create } = args;
            const id = create.id ?? randomUUID();
            const r = await pool.query<User>(
                `INSERT INTO "Users" (id, email, "displayName", password)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (email) DO UPDATE SET "displayName" = EXCLUDED."displayName"
                 RETURNING *`,
                [id, create.email, create.displayName, create.password ?? null]
            );
            return r.rows[0]!;
        }
    },

    userConnections: {
        async findFirst(args: {
            where: { userId?: string; providerConfigKey?: string; connectionId?: string };
            select?: Record<string, boolean>;
        }): Promise<UserConnection | null> {
            const conditions: string[] = [];
            const values: unknown[] = [];
            let i = 1;
            if (args.where.userId !== undefined) { conditions.push(`"userId" = $${i++}`); values.push(args.where.userId); }
            if (args.where.providerConfigKey !== undefined) { conditions.push(`"providerConfigKey" = $${i++}`); values.push(args.where.providerConfigKey); }
            if (args.where.connectionId !== undefined) { conditions.push(`"connectionId" = $${i++}`); values.push(args.where.connectionId); }
            const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
            const r = await pool.query<UserConnection>(`SELECT * FROM "UserConnections" ${where} LIMIT 1`, values);
            return r.rows[0] ?? null;
        },

        async findMany(args: {
            where?: { userId?: string; providerConfigKey?: string };
            orderBy?: { createdAt?: string };
            select?: Record<string, boolean>;
        }): Promise<UserConnection[]> {
            const conditions: string[] = [];
            const values: unknown[] = [];
            let i = 1;
            if (args.where?.userId !== undefined) { conditions.push(`"userId" = $${i++}`); values.push(args.where.userId); }
            if (args.where?.providerConfigKey !== undefined) { conditions.push(`"providerConfigKey" = $${i++}`); values.push(args.where.providerConfigKey); }
            const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
            const order = args.orderBy?.createdAt === 'desc' ? 'ORDER BY "createdAt" DESC' : '';
            const r = await pool.query<UserConnection>(`SELECT * FROM "UserConnections" ${where} ${order}`, values);
            return r.rows;
        },

        async upsert(args: {
            where: { userId_providerConfigKey: { userId: string; providerConfigKey: string } };
            create: { userId: string; connectionId: string; providerConfigKey: string };
            update: { connectionId: string; updatedAt?: Date };
        }): Promise<void> {
            const { create } = args;
            await pool.query(
                `INSERT INTO "UserConnections" (id, "userId", "connectionId", "providerConfigKey", "updatedAt")
                 VALUES ($1, $2, $3, $4, NOW())
                 ON CONFLICT ("userId", "providerConfigKey")
                 DO UPDATE SET "connectionId" = EXCLUDED."connectionId", "updatedAt" = NOW()`,
                [randomUUID(), create.userId, create.connectionId, create.providerConfigKey]
            );
        },

        async setBroken(connectionId: string, broken: boolean): Promise<void> {
            await pool.query(
                'UPDATE "UserConnections" SET broken = $1, "updatedAt" = NOW() WHERE "connectionId" = $2',
                [broken, connectionId]
            );
        },

        async delete(args: { where: { id: string } }): Promise<void> {
            await pool.query('DELETE FROM "UserConnections" WHERE id = $1', [args.where.id]);
        }
    },

    contacts: {
        async findMany(args: {
            where: { integrationId: string; connectionId: string };
            orderBy?: { fullName?: string };
            take?: number;
        }): Promise<Contact[]> {
            const r = await pool.query<Contact>(
                `SELECT * FROM "Contacts" WHERE "integrationId" = $1 AND "connectionId" = $2 ORDER BY "fullName" ASC LIMIT $3`,
                [args.where.integrationId, args.where.connectionId, args.take ?? 100]
            );
            return r.rows;
        },

        async update(args: { where: { id: string }; data: { deletedAt?: Date | null } }): Promise<void> {
            await pool.query(
                'UPDATE "Contacts" SET "deletedAt" = $1, "updatedAt" = NOW() WHERE id = $2',
                [args.data.deletedAt ?? null, args.where.id]
            );
        },

        async upsert(args: {
            where: { id: string };
            create: { id: string; fullName: string; avatar: string; integrationId: string; connectionId: string; createdAt?: Date };
            update: { fullName: string; avatar: string; connectionId: string; integrationId: string; updatedAt?: Date };
        }): Promise<void> {
            const { create } = args;
            await pool.query(
                `INSERT INTO "Contacts" (id, "fullName", avatar, "integrationId", "connectionId", "createdAt", "updatedAt")
                 VALUES ($1, $2, $3, $4, $5, $6, NOW())
                 ON CONFLICT (id) DO UPDATE SET
                   "fullName" = EXCLUDED."fullName",
                   avatar = EXCLUDED.avatar,
                   "connectionId" = EXCLUDED."connectionId",
                   "integrationId" = EXCLUDED."integrationId",
                   "updatedAt" = NOW()`,
                [create.id, create.fullName, create.avatar, create.integrationId, create.connectionId, create.createdAt ?? new Date()]
            );
        },

        async deleteMany(args: { where: { connectionId: string } }): Promise<void> {
            await pool.query('DELETE FROM "Contacts" WHERE "connectionId" = $1', [args.where.connectionId]);
        }
    },

    files: {
        async findFirst(args: { where: { id: string; deletedAt: null } }): Promise<FileRecord | null> {
            const r = await pool.query<FileRecord>(
                'SELECT * FROM "Files" WHERE id = $1 AND "deletedAt" IS NULL LIMIT 1',
                [args.where.id]
            );
            return r.rows[0] ?? null;
        },

        async findMany(args: {
            where: { connectionId: { in: string[] }; deletedAt: null };
            orderBy?: { updatedAt?: string };
        }): Promise<FileRecord[]> {
            if (args.where.connectionId.in.length === 0) return [];
            const r = await pool.query<FileRecord>(
                `SELECT * FROM "Files" WHERE "connectionId" = ANY($1) AND "deletedAt" IS NULL ORDER BY "updatedAt" DESC`,
                [args.where.connectionId.in]
            );
            return r.rows;
        },

        async update(args: { where: { id: string }; data: { deletedAt?: Date | null } }): Promise<void> {
            await pool.query(
                'UPDATE "Files" SET "deletedAt" = $1, "updatedAt" = NOW() WHERE id = $2',
                [args.data.deletedAt ?? null, args.where.id]
            );
        },

        async upsert(args: {
            where: { id: string };
            create: { id: string; title: string; mimeType: string; url: string | null; size: number | null; driveId: string | null; createdTime: Date; integrationId: string; connectionId: string; createdAt: Date };
            update: { title: string; mimeType: string; url: string | null; size: number | null; driveId: string | null; createdTime: Date; updatedAt: Date; integrationId: string; connectionId: string };
        }): Promise<void> {
            const { create } = args;
            await pool.query(
                `INSERT INTO "Files" (id, title, "mimeType", url, size, "driveId", "createdTime", "integrationId", "connectionId", "createdAt", "updatedAt")
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
                 ON CONFLICT (id) DO UPDATE SET
                   title = EXCLUDED.title,
                   "mimeType" = EXCLUDED."mimeType",
                   url = EXCLUDED.url,
                   size = EXCLUDED.size,
                   "driveId" = EXCLUDED."driveId",
                   "createdTime" = EXCLUDED."createdTime",
                   "integrationId" = EXCLUDED."integrationId",
                   "connectionId" = EXCLUDED."connectionId",
                   "updatedAt" = NOW()`,
                [create.id, create.title, create.mimeType, create.url, create.size, create.driveId, create.createdTime, create.integrationId, create.connectionId, create.createdAt]
            );
        },

        async deleteMany(args: { where: { connectionId: string } }): Promise<void> {
            await pool.query('DELETE FROM "Files" WHERE "connectionId" = $1', [args.where.connectionId]);
        }
    },

    records: {
        async findMany(args: {
            where: { integrationId: string; connectionId: string; model?: string; deletedAt: null };
            orderBy?: { updatedAt?: string };
            take?: number;
        }): Promise<SyncedRecord[]> {
            const conditions = ['"integrationId" = $1', '"connectionId" = $2', '"deletedAt" IS NULL'];
            const values: unknown[] = [args.where.integrationId, args.where.connectionId];
            let i = 3;
            if (args.where.model !== undefined) {
                conditions.push(`model = $${i++}`);
                values.push(args.where.model);
            }
            values.push(args.take ?? 50);
            const r = await pool.query<SyncedRecord>(
                `SELECT * FROM "Records" WHERE ${conditions.join(' AND ')} ORDER BY "updatedAt" DESC LIMIT $${i}`,
                values
            );
            return r.rows;
        },

        async upsert(args: {
            where: { integrationId_connectionId_model_id: { integrationId: string; connectionId: string; model: string; id: string } };
            create: { id: string; integrationId: string; connectionId: string; model: string; data: Record<string, unknown> };
            update: { data: Record<string, unknown>; updatedAt: Date; deletedAt: null };
        }): Promise<void> {
            const { create } = args;
            await pool.query(
                `INSERT INTO "Records" (id, "integrationId", "connectionId", model, data, "createdAt", "updatedAt")
                 VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
                 ON CONFLICT ("integrationId", "connectionId", model, id) DO UPDATE SET
                   data = EXCLUDED.data,
                   "updatedAt" = NOW(),
                   "deletedAt" = NULL`,
                [create.id, create.integrationId, create.connectionId, create.model, JSON.stringify(create.data)]
            );
        },

        async updateMany(args: {
            where: { integrationId: string; connectionId: string; model: string; id: string };
            data: { deletedAt: Date };
        }): Promise<void> {
            await pool.query(
                `UPDATE "Records" SET "deletedAt" = $1, "updatedAt" = NOW()
                 WHERE "integrationId" = $2 AND "connectionId" = $3 AND model = $4 AND id = $5`,
                [args.data.deletedAt, args.where.integrationId, args.where.connectionId, args.where.model, args.where.id]
            );
        },

        async deleteMany(args: { where: { connectionId: string } }): Promise<void> {
            await pool.query('DELETE FROM "Records" WHERE "connectionId" = $1', [args.where.connectionId]);
        }
    },

    syncBookmarks: {
        async findUnique(args: { where: { connectionId_model: { connectionId: string; model: string } } }): Promise<SyncBookmark | null> {
            const { connectionId, model } = args.where.connectionId_model;
            const r = await pool.query<SyncBookmark>(
                `SELECT * FROM "SyncBookmarks" WHERE "connectionId" = $1 AND model = $2 LIMIT 1`,
                [connectionId, model]
            );
            return r.rows[0] ?? null;
        },

        async upsert(args: {
            where: { connectionId_model: { connectionId: string; model: string } };
            create: { connectionId: string; model: string; modifiedAfter: string };
            update: { modifiedAfter: string };
        }): Promise<void> {
            const { create, update } = args;
            await pool.query(
                `INSERT INTO "SyncBookmarks" ("connectionId", model, "modifiedAfter", "updatedAt")
                 VALUES ($1, $2, $3, NOW())
                 ON CONFLICT ("connectionId", model) DO UPDATE SET
                   "modifiedAfter" = $4,
                   "updatedAt" = NOW()`,
                [create.connectionId, create.model, create.modifiedAfter, update.modifiedAfter]
            );
        }
    },

    webhookEvents: {
        async create(args: {
            data: { id: string; type: string; provider: string; connectionId?: string | null; operation?: string; model?: string; payload: unknown; receivedAt: Date };
        }): Promise<void> {
            const { data } = args;
            await pool.query(
                `INSERT INTO "WebhookEvents" (id, type, provider, "connectionId", operation, model, payload, "receivedAt")
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [data.id, data.type, data.provider, data.connectionId ?? null, data.operation ?? null, data.model ?? null, JSON.stringify(data.payload), data.receivedAt]
            );
        },

        async findMany(args: {
            where?: { type?: string; provider?: string; connectionIds?: string[] };
            orderBy?: { receivedAt?: string };
            take?: number;
        }): Promise<WebhookEvent[]> {
            const conditions: string[] = [];
            const values: unknown[] = [];
            let i = 1;
            if (args.where?.type) { conditions.push(`type = $${i++}`); values.push(args.where.type); }
            if (args.where?.provider) { conditions.push(`provider = $${i++}`); values.push(args.where.provider); }
            if (args.where?.connectionIds?.length) {
                const placeholders = args.where.connectionIds.map(() => `$${i++}`).join(', ');
                conditions.push(`"connectionId" IN (${placeholders})`);
                values.push(...args.where.connectionIds);
            }
            values.push(args.take ?? 50);
            const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
            const r = await pool.query<WebhookEvent>(
                `SELECT * FROM "WebhookEvents" ${where} ORDER BY "receivedAt" DESC LIMIT $${i}`,
                values
            );
            return r.rows;
        },

        async truncate(): Promise<void> {
            await pool.query('TRUNCATE "WebhookEvents"');
        },

        async deleteMany(args: {
            where: {
                connectionId?: string;
                provider?: string;
                NOT?: { connectionId?: { in: string[] } };
            };
        }): Promise<void> {
            const conditions: string[] = [];
            const values: unknown[] = [];
            let i = 1;
            if (args.where.connectionId !== undefined) { conditions.push(`"connectionId" = $${i++}`); values.push(args.where.connectionId); }
            if (args.where.provider !== undefined) { conditions.push(`provider = $${i++}`); values.push(args.where.provider); }
            if (args.where.NOT?.connectionId?.in?.length) {
                const placeholders = args.where.NOT.connectionId.in.map(() => `$${i++}`).join(', ');
                conditions.push(`"connectionId" NOT IN (${placeholders})`);
                values.push(...args.where.NOT.connectionId.in);
            }
            if (conditions.length === 0) return;
            await pool.query(`DELETE FROM "WebhookEvents" WHERE ${conditions.join(' AND ')}`, values);
        }
    }
};


const DEMO_USERS = [
    { id: '00000000-0000-0000-0000-000000000001', email: 'alice@demo.dev', displayName: 'Alice Chen' },
    { id: '00000000-0000-0000-0000-000000000002', email: 'bob@demo.dev', displayName: 'Bob Martinez' },
    { id: '00000000-0000-0000-0000-000000000003', email: 'carol@demo.dev', displayName: 'Carol Kim' }
];

export async function seedUser() {
    for (const user of DEMO_USERS) {
        await db.users.upsert({
            where: { email: user.email },
            update: { displayName: user.displayName },
            create: { id: user.id, email: user.email, displayName: user.displayName }
        });
    }
}

export async function getUserById(userId: string) {
    return db.users.findUnique({ where: { id: userId } });
}

export async function getUserFromDatabase() {
    return db.users.findFirst({ where: { email: 'alice@demo.dev' } });
}

export async function getAllUsers() {
    return db.users.findMany({ orderBy: { email: 'asc' } });
}

export async function getUserConnection(userId: string, providerConfigKey: string) {
    return db.userConnections.findFirst({ where: { userId, providerConfigKey } });
}

import type { RouteHandler } from 'fastify';
import { getAllUsers } from '../db.js';

export const getUsers: RouteHandler = async (_req, reply) => {
    const users = await getAllUsers();
    await reply.status(200).send({
        users: users.map((u) => ({
            id: u.id,
            email: u.email,
            displayName: u.displayName
        }))
    });
};

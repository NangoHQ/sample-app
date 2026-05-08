import type { RouteHandler } from 'fastify';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';

const JWT_SECRET = process.env['JWT_SECRET']!;

export const postAuthLogin: RouteHandler<{
    Body: { email: string; password: string };
}> = async (req, reply) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return reply.status(400).send({ error: 'email and password are required' });
    }

    const user = await db.users.findUnique({ where: { email } });
    if (!user || !user.password) {
        return reply.status(401).send({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
        return reply.status(401).send({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
        { userId: user.id, email: user.email, displayName: user.displayName },
        JWT_SECRET,
        { algorithm: 'HS256', expiresIn: '7d' }
    );

    return reply.status(200).send({
        token,
        user: { id: user.id, email: user.email, displayName: user.displayName }
    });
};

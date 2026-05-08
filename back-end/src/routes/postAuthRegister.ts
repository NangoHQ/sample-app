import type { RouteHandler } from 'fastify';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';

const JWT_SECRET = process.env['JWT_SECRET']!;

export const postAuthRegister: RouteHandler<{
    Body: { email: string; password: string; displayName: string };
}> = async (req, reply) => {
    const { email, password, displayName } = req.body;

    if (!email || !password || !displayName) {
        return reply.status(400).send({ error: 'email, password, and displayName are required' });
    }

    if (
        password.length < 8 ||
        !/[A-Z]/.test(password) ||
        !/[a-z]/.test(password) ||
        !/[0-9]/.test(password) ||
        !/[^A-Za-z0-9]/.test(password)
    ) {
        return reply.status(400).send({
            error: 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character'
        });
    }

    if (!email.endsWith('@nango.dev')) {
        return reply.status(403).send({ error: 'Signups are restricted to @nango.dev accounts only' });
    }

    const existing = await db.users.findUnique({ where: { email } });
    if (existing) {
        return reply.status(409).send({ error: 'An account with this email already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await db.users.create({
        data: { email, displayName, password: hashed }
    });

    const token = jwt.sign(
        { userId: user.id, email: user.email, displayName: user.displayName },
        JWT_SECRET,
        { algorithm: 'HS256', expiresIn: '7d' }
    );

    return reply.status(201).send({
        token,
        user: { id: user.id, email: user.email, displayName: user.displayName }
    });
};

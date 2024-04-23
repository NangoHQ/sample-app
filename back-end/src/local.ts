import { fastify } from './app';

try {
  await fastify.listen({ port: 3003 });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}

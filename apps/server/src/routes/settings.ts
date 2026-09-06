import type { FastifyInstance } from 'fastify';
import type { Store } from '../db.js';

export async function registerSettings(app: FastifyInstance, store: Store): Promise<void> {
  app.get('/api/settings', async () => store.settings() ?? { settings: null, updatedAt: 0 });

  app.put<{ Body: { settings: unknown; updatedAt: unknown } }>(
    '/api/settings',
    async (request, reply) => {
      const body = request.body;
      if (typeof body !== 'object' || body === null) {
        return reply.code(400).send({ error: 'expected { settings, updatedAt }' });
      }
      const { settings, updatedAt } = body;
      if (typeof settings !== 'object' || settings === null || Array.isArray(settings)) {
        return reply.code(400).send({ error: 'settings must be an object' });
      }
      if (typeof updatedAt !== 'number' || !Number.isInteger(updatedAt) || updatedAt < 0) {
        return reply.code(400).send({ error: 'updatedAt must be an epoch in milliseconds' });
      }
      // The winner comes back either way, so a device that lost the race learns
      // what it lost to in the same round trip.
      return store.putSettings({ settings, updatedAt });
    },
  );
}

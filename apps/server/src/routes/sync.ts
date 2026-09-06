import type { FastifyInstance } from 'fastify';
import type { Attempt } from '@calcflow/shared';
import type { Store } from '../db.js';
import { attemptProblem, toAttempt } from '../validate.js';

const MAX_LIMIT = 5000;

export async function registerSync(app: FastifyInstance, store: Store): Promise<void> {
  app.get<{ Querystring: { since: number; limit: number } }>(
    '/api/sync',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            since: { type: 'integer', minimum: 0, default: 0 },
            limit: { type: 'integer', minimum: 1, maximum: MAX_LIMIT, default: 1000 },
          },
        },
      },
    },
    async (request) => {
      const { since, limit } = request.query;
      return store.read(since, limit);
    },
  );

  app.post<{ Body: { attempts: unknown } }>('/api/sync', async (request, reply) => {
    const body = request.body;
    if (typeof body !== 'object' || body === null || !Array.isArray(body.attempts)) {
      return reply.code(400).send({ error: 'expected { attempts: [] }' });
    }

    /*
     * A malformed attempt fails the whole batch rather than being skipped. Both
     * sides are generated from the same type, so this can only mean a bug, and
     * a bug that drops attempts silently is the one failure this log is meant
     * not to have. The client keeps its queue and the error says which row.
     */
    const attempts: Attempt[] = [];
    for (const [index, raw] of body.attempts.entries()) {
      const problem = attemptProblem(raw);
      if (problem) {
        return reply.code(400).send({ error: `attempts[${index}]: ${problem}` });
      }
      attempts.push(toAttempt(raw as Record<string, unknown>));
    }

    return store.append(attempts);
  });
}

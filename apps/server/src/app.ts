import { createHash, timingSafeEqual } from 'node:crypto';
import { sep } from 'node:path';
import cors from '@fastify/cors';
import staticFiles from '@fastify/static';
import Fastify, { type FastifyInstance } from 'fastify';
import type { Config } from './config.js';
import type { Store } from './db.js';
import { registerSync } from './routes/sync.js';
import { registerSettings } from './routes/settings.js';

export interface Deps {
  config: Config;
  store: Store;
}

export async function buildApp({ config, store }: Deps): Promise<FastifyInstance> {
  const app = Fastify({
    // A week offline on two devices is still only a few hundred attempts, but
    // the batch is the thing that has to fit, so leave it room.
    bodyLimit: 8 * 1024 * 1024,
    logger: { level: config.logLevel },
    trustProxy: true,
  });

  // Registered before the token check so a preflight is answered rather than
  // refused: the browser sends it without the header it is asking permission for.
  await app.register(cors, {
    origin: config.origins,
    methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    allowedHeaders: ['content-type', 'x-calcflow-token'],
    maxAge: 86400,
  });

  const expected = createHash('sha256').update(config.token).digest();
  app.addHook('onRequest', async (request, reply) => {
    if (request.method === 'OPTIONS') return;
    if (!request.url.startsWith('/api/') || request.url.startsWith('/api/health')) return;
    const given = request.headers['x-calcflow-token'];
    // Digests rather than the strings themselves: `timingSafeEqual` throws on a
    // length mismatch, which would leak the length of the token it is guarding.
    const offered = createHash('sha256')
      .update(typeof given === 'string' ? given : '')
      .digest();
    if (typeof given !== 'string' || !timingSafeEqual(offered, expected)) {
      await reply.code(401).send({ error: 'unauthorized' });
    }
  });

  app.get('/api/health', async () => ({ ok: true }));

  await registerSync(app, store);
  await registerSettings(app, store);

  if (config.webRoot) await serveApp(app, config.webRoot);

  return app;
}

/**
 * The built PWA, from the same origin as the API — which is the point of one
 * container. The app has exactly one HTML file and every route inside it is
 * client-side, so anything that is not a file on disk is answered with it.
 */
async function serveApp(app: FastifyInstance, root: string): Promise<void> {
  await app.register(staticFiles, {
    root,
    index: ['index.html'],
    // Off so `setHeaders` is the only thing deciding: left on, the plugin's own
    // `max-age=0` lands after it and quietly wins.
    cacheControl: false,
    setHeaders(reply, path) {
      // Vite fingerprints everything under /assets, so those can be kept
      // forever. The shell and the worker decide when the app updates and must
      // never be the stale copy that decides it never does.
      const forever = path.includes(`${sep}assets${sep}`);
      reply.setHeader(
        'cache-control',
        forever ? 'public, max-age=31536000, immutable' : 'no-cache',
      );
    },
  });

  app.setNotFoundHandler(async (request, reply) => {
    if (request.method !== 'GET' || request.url.startsWith('/api/')) {
      return reply.code(404).send({ error: 'not found' });
    }
    return reply.header('cache-control', 'no-cache').sendFile('index.html');
  });
}

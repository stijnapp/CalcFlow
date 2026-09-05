import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export interface Config {
  host: string;
  port: number;
  /** SQLite file. `:memory:` is honoured, which is what the tests use. */
  dbPath: string;
  /** Directory of the built PWA, or null to run as an API on its own. */
  webRoot: string | null;
  token: string;
  /** Allowed browser origins, or `true` to reflect whatever asks. */
  origins: string[] | true;
  logLevel: string;
}

class ConfigError extends Error {}

/**
 * Reads the environment, and refuses to start rather than start wrong. The one
 * thing it will not do is default the token: a sync endpoint that accepts
 * anything is a worse failure than a container that will not come up, and it is
 * a silent one — Tailscale in front of it is the reason this is unlikely to
 * matter and not a reason to skip it.
 */
export function readConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const token = env.CALCFLOW_TOKEN?.trim();
  if (!token) {
    throw new ConfigError(
      'CALCFLOW_TOKEN is not set. Put one in .env and give the same value to ' +
        `each device under Settings → Sync. A fresh one: ${randomBytes(24).toString('base64url')}`,
    );
  }
  if (token.length < 16) {
    throw new ConfigError('CALCFLOW_TOKEN is shorter than 16 characters; use a longer one.');
  }

  const webRoot = env.CALCFLOW_WEB?.trim() ? resolve(env.CALCFLOW_WEB.trim()) : null;
  if (webRoot && !existsSync(webRoot)) {
    throw new ConfigError(`CALCFLOW_WEB points at ${webRoot}, which does not exist.`);
  }

  const origins = env.CALCFLOW_ORIGINS?.trim();

  return {
    host: env.HOST?.trim() || '0.0.0.0',
    port: port(env.PORT),
    dbPath: env.CALCFLOW_DB?.trim() || 'calcflow.db',
    webRoot,
    token,
    origins: origins ? origins.split(',').map((o) => o.trim()).filter(Boolean) : true,
    logLevel: env.LOG_LEVEL?.trim() || 'info',
  };
}

function port(raw: string | undefined): number {
  if (!raw?.trim()) return 8787;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new ConfigError(`PORT is ${raw}, which is not a port number.`);
  }
  return value;
}

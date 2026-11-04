import { randomBytes } from 'node:crypto';
import { accessSync, constants, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

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
  const token = readToken(env.CALCFLOW_TOKEN);
  const webRoot = readWebRoot(env.CALCFLOW_WEB);
  return {
    host: text(env.HOST) ?? '0.0.0.0',
    port: port(env.PORT),
    dbPath: readDbPath(env.CALCFLOW_DB),
    webRoot,
    token,
    origins: text(env.CALCFLOW_ORIGINS)?.split(',').map((o) => o.trim()).filter(Boolean) ?? true,
    logLevel: text(env.LOG_LEVEL) ?? 'info',
  };
}

/** A variable's value, or undefined when it is unset or only whitespace. */
function text(raw: string | undefined): string | undefined {
  return raw?.trim() || undefined;
}

function readToken(raw: string | undefined): string {
  const token = text(raw);
  if (!token) {
    throw new ConfigError(
      'CALCFLOW_TOKEN is not set. Put one in .env and give the same value to ' +
        `each device under Settings → Sync. A fresh one: ${randomBytes(24).toString('base64url')}`,
    );
  }
  if (token.length < 16) {
    throw new ConfigError('CALCFLOW_TOKEN is shorter than 16 characters; use a longer one.');
  }
  return token;
}

/**
 * Checked here because SQLite's own complaint is `unable to open database
 * file`, in a restart loop. The usual cause is the Docker bind mount: the
 * container writes `./data` as uid 1000, and on a host where the checkout
 * belongs to someone else that folder is not its to write.
 */
function readDbPath(raw: string | undefined): string {
  const path = text(raw) ?? 'calcflow.db';
  if (path === ':memory:') return path;
  const dir = nearestExisting(dirname(resolve(path)));
  try {
    accessSync(dir, constants.W_OK);
  } catch {
    throw new ConfigError(
      `${dir} is not writable by uid ${process.getuid?.() ?? '?'}, so the database cannot go there. ` +
        'Under Docker that folder is ./data on the host; hand it to the container with ' +
        '`sudo chown -R 1000:1000 data`.',
    );
  }
  return path;
}

/** The store creates its own folder, so what has to be writable is the first one that exists. */
function nearestExisting(dir: string): string {
  let at = dir;
  while (!existsSync(at) && dirname(at) !== at) at = dirname(at);
  return at;
}

function readWebRoot(raw: string | undefined): string | null {
  const dir = text(raw);
  if (!dir) return null;
  const webRoot = resolve(dir);
  if (!existsSync(webRoot)) {
    throw new ConfigError(`CALCFLOW_WEB points at ${webRoot}, which does not exist.`);
  }
  return webRoot;
}

function port(raw: string | undefined): number {
  if (!text(raw)) return 8787;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new ConfigError(`PORT is ${raw}, which is not a port number.`);
  }
  return value;
}

import { promises as fs } from 'node:fs';

import { logger } from './lib/observability';

const CONFIG_PATH = process.env.CONFIG_FILE_PATH ?? '/var/lib/possible/config.env';

const parseEnvFile = (content: string): Record<string, string> => {
  const lines = content.split(/\r?\n/);
  const entries: Record<string, string> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const [key, ...rest] = trimmed.split('=');
    entries[key] = rest.join('=').replace(/^"|"$/g, '');
  }

  return entries;
};

async function hydrateEnvFromConfigFile() {
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf-8');
    const parsed = parseEnvFile(raw);
    for (const [key, value] of Object.entries(parsed)) {
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      logger.warn({ err: error }, 'setup config hydration failed');
    }
  }
}

export function register() {
  void hydrateEnvFromConfigFile();
  logger.debug?.('web instrumentation registered');
}

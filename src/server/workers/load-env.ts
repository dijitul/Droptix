/**
 * Preload: loads .env.production into process.env before any other module
 * has a chance to read it. This file has zero imports, so it evaluates first
 * in the worker's module graph. Import this before any `@/lib/env` consumer.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

try {
  const envPath = resolve(process.cwd(), '.env.production');
  const content = readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
} catch (err) {
  console.warn(
    '[worker:load-env] could not load .env.production:',
    err instanceof Error ? err.message : err,
  );
}

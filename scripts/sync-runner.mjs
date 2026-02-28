#!/usr/bin/env node

import { createHash, createHmac, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i];
    if (!raw || !raw.startsWith('--')) continue;
    const key = raw.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      result[key] = 'true';
      continue;
    }
    result[key] = next;
    i += 1;
  }
  return result;
}

function asBoolean(value, fallback = false) {
  if (value == null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function asInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sha256Hex(input) {
  return createHash('sha256').update(input).digest('hex');
}

function canonicalQuery(rawQuery) {
  if (!rawQuery) return '';
  return rawQuery
    .split('&')
    .filter(Boolean)
    .sort()
    .join('&');
}

function buildSignature({
  keySecret,
  method,
  path,
  query,
  timestamp,
  nonce,
  bodyHash,
}) {
  const canonical = [
    method.toUpperCase(),
    path,
    canonicalQuery(query),
    timestamp,
    nonce,
    bodyHash.toLowerCase(),
  ].join('\n');

  return createHmac('sha256', keySecret).update(canonical).digest('hex');
}

function runCommand(label, command, args = []) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
      shell: false,
    });

    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve({ ok: true });
        return;
      }
      const reason = signal ? `signal=${signal}` : `code=${code ?? 'unknown'}`;
      console.error(`[sync-runner] ${label} failed (${reason})`);
      resolve({ ok: false, reason });
    });
  });
}

function buildConfig(args) {
  return {
    loop: asBoolean(args.loop, false),
    profileEnabled: asBoolean(process.env.PROFILE_SYNC_ENABLED, true),
    searchEnabled: asBoolean(process.env.SEARCH_SYNC_ENABLED, true),
    apiBaseUrl: (
      process.env.TDP_API_BASE_URL ||
      process.env.NEXT_PUBLIC_TDP_API_BASE_URL ||
      'http://127.0.0.1:8080'
    ).replace(/\/$/, ''),
    internalKeyID: process.env.TDP_INTERNAL_KEY_ID || '',
    internalKeySecret: process.env.TDP_INTERNAL_KEY_SECRET || '',
    profileIntervalMs: Math.max(1, asInt(process.env.PROFILE_SYNC_INTERVAL_HOURS, 24)) * 60 * 60 * 1000,
    searchIntervalMs: Math.max(1, asInt(process.env.SEARCH_SYNC_INTERVAL_HOURS, 1)) * 60 * 60 * 1000,
    pollIntervalMs: Math.max(15_000, asInt(process.env.SYNC_RUNNER_POLL_MS, 60_000)),
  };
}

async function signedJson(config, pathWithQuery) {
  const [pathOnly, query = ''] = pathWithQuery.split('?');
  const timestamp = Date.now().toString();
  const nonce = randomUUID();
  const signature = buildSignature({
    keySecret: config.internalKeySecret,
    method: 'GET',
    path: pathOnly,
    query,
    timestamp,
    nonce,
    bodyHash: sha256Hex(''),
  });

  const response = await fetch(`${config.apiBaseUrl}${pathWithQuery}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'X-TDP-Key-Id': config.internalKeyID,
      'X-TDP-Timestamp': timestamp,
      'X-TDP-Nonce': nonce,
      'X-TDP-Signature': signature,
    },
    signal: AbortSignal.timeout(10_000),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`signed GET failed (${response.status}): ${text.slice(0, 320)}`);
  }
  return text ? JSON.parse(text) : {};
}

async function hasPendingSearchRefresh(config) {
  if (!config.internalKeyID || !config.internalKeySecret) {
    return false;
  }

  try {
    const payload = await signedJson(config, '/v1/internal/search-snapshot/status');
    return Boolean(payload?.item?.hasPending);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[sync-runner] search refresh status check failed: ${message}`);
    return false;
  }
}

async function runTask(label) {
  if (label === 'profile') {
    return runCommand('profile-sync', 'node', ['scripts/profile-sync.mjs']);
  }
  return runCommand('search-sync', 'pnpm', ['search:sync']);
}

async function runOnce(config) {
  let allOk = true;
  if (config.profileEnabled) {
    const result = await runTask('profile');
    allOk = allOk && result.ok;
  }
  if (config.searchEnabled) {
    const result = await runTask('search');
    allOk = allOk && result.ok;
  }
  return allOk;
}

async function runLoop(config) {
  const nextRunAt = {
    profile: config.profileEnabled ? 0 : Number.POSITIVE_INFINITY,
    search: config.searchEnabled ? 0 : Number.POSITIVE_INFINITY,
  };

  while (true) {
    const now = Date.now();

    if (config.profileEnabled && now >= nextRunAt.profile) {
      await runTask('profile');
      nextRunAt.profile = Date.now() + config.profileIntervalMs;
    }

    const searchPending = config.searchEnabled ? await hasPendingSearchRefresh(config) : false;

    if (config.searchEnabled && (now >= nextRunAt.search || searchPending)) {
      await runTask('search');
      nextRunAt.search = Date.now() + config.searchIntervalMs;
    }

    await sleep(config.pollIntervalMs);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = buildConfig(args);

  if (!config.loop) {
    const ok = await runOnce(config);
    if (!ok) {
      process.exit(1);
    }
    return;
  }

  await runLoop(config);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[sync-runner] ${message}`);
  process.exit(1);
});

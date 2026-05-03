import { spawn, type ChildProcess } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { resolve } from 'node:path';

const HEALTH_URL = process.env.TEST_API_URL
  ? `${process.env.TEST_API_URL}/api/healthz`
  : 'http://localhost:8080/api/healthz';

let spawned: ChildProcess | null = null;

async function isHealthy(): Promise<boolean> {
  try {
    const res = await fetch(HEALTH_URL);
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForHealth(maxSeconds: number): Promise<boolean> {
  for (let i = 0; i < maxSeconds; i++) {
    if (await isHealthy()) return true;
    await sleep(1000);
  }
  return false;
}

export async function setup(): Promise<void> {
  if (await isHealthy()) {
    console.log(`[test] API already serving at ${HEALTH_URL}, reusing.`);
    return;
  }

  console.log(`[test] API not reachable at ${HEALTH_URL}, spawning dev server...`);
  // Spawn from the workspace root so the pnpm filter works regardless of cwd.
  const workspaceRoot = resolve(__dirname, '..', '..');
  spawned = spawn('pnpm', ['--filter', '@workspace/api-server', 'run', 'dev'], {
    cwd: workspaceRoot,
    env: { ...process.env, PORT: process.env.PORT ?? '8080' },
    stdio: 'inherit',
    detached: false,
  });

  spawned.on('exit', (code, signal) => {
    if (code !== null && code !== 0) {
      console.error(`[test] spawned API server exited with code ${code} (signal=${signal})`);
    }
  });

  const ok = await waitForHealth(120);
  if (!ok) {
    throw new Error(
      `[test] API failed to become healthy at ${HEALTH_URL} within 120s after spawn.`,
    );
  }
  console.log('[test] spawned API is healthy.');
}

export async function teardown(): Promise<void> {
  if (spawned && !spawned.killed) {
    console.log('[test] killing spawned API dev server...');
    spawned.kill('SIGTERM');
    // Give it a moment to flush, then force-kill if still alive.
    await sleep(2000);
    if (!spawned.killed) {
      try {
        spawned.kill('SIGKILL');
      } catch {
        // ignore
      }
    }
  }
}

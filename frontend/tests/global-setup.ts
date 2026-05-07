import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { resolve } from 'node:path';

export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'test-admin@gradeflow.local';
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'test-admin-password-123';
export const API_URL = process.env.E2E_API_URL || 'http://localhost:8080';

export const TEST_CODE_PREFIXES = ['GRD-', 'RUB-', 'E2E-', 'TST-'];
export const TEST_STUDENT_PREFIXES = ['STU-', 'STU2-'];
// Regex that matches any auto-generated test externalId: WORD-13digits-6chars
export const TEST_STUDENT_ID_REGEX = /^[A-Z0-9]+-\d{10,}-[a-z0-9]{4,}$/;

async function waitFor(predicate: () => Promise<boolean>, maxSeconds: number): Promise<boolean> {
  for (let i = 0; i < maxSeconds; i++) {
    if (await predicate()) return true;
    await sleep(1000);
  }
  return false;
}

async function adminLogin(): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    if (res.status !== 200) return null;
    const setCookie = res.headers.get('set-cookie') ?? '';
    const match = /gradeflow_token=([^;]+)/.exec(setCookie);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function runSeed(): Promise<number> {
  const workspaceRoot = resolve(__dirname, '..', '..');
  return new Promise((resolveProc) => {
    const child = spawn('pnpm', ['--filter', '@workspace/api-server', 'run', 'seed'], {
      cwd: workspaceRoot,
      env: {
        ...process.env,
        SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL ?? ADMIN_EMAIL,
        SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD ?? ADMIN_PASSWORD,
        SEED_ADMIN_NAME: process.env.SEED_ADMIN_NAME ?? 'E2E Admin',
      },
      stdio: 'inherit',
    });
    child.on('close', (code) => resolveProc(code ?? 1));
  });
}

export async function deleteStaleTestCourses(token: string): Promise<void> {
  try {
    const res = await fetch(`${API_URL}/api/courses`, {
      headers: { cookie: `gradeflow_token=${token}` },
    });
    if (!res.ok) return;
    const courses = (await res.json()) as Array<{ id: number; code: string }>;
    const stale = courses.filter((c) => TEST_CODE_PREFIXES.some((p) => c.code.startsWith(p)));
    if (stale.length === 0) return;
    console.log(`[e2e setup] sweeping ${stale.length} stale test course(s) from previous runs...`);
    await Promise.all(
      stale.map((c) =>
        fetch(`${API_URL}/api/courses/${c.id}`, {
          method: 'DELETE',
          headers: { cookie: `gradeflow_token=${token}` },
        }).catch(() => undefined),
      ),
    );
  } catch {
  }
}

export async function deleteStaleTestStudents(token: string): Promise<void> {
  try {
    const res = await fetch(`${API_URL}/api/students`, {
      headers: { cookie: `gradeflow_token=${token}` },
    });
    if (!res.ok) return;
    const students = (await res.json()) as Array<{ id: number; externalId: string }>;
    const stale = students.filter((s) => TEST_STUDENT_ID_REGEX.test(s.externalId));
    if (stale.length === 0) return;
    console.log(`[e2e setup] sweeping ${stale.length} stale test student(s) from previous runs...`);
    await Promise.all(
      stale.map((s) =>
        fetch(`${API_URL}/api/students/${s.id}`, {
          method: 'DELETE',
          headers: { cookie: `gradeflow_token=${token}` },
        }).catch(() => undefined),
      ),
    );
  } catch {
  }
}

export default async function globalSetup(): Promise<void> {
  const apiUp = await waitFor(
    async () => {
      try {
        const r = await fetch(`${API_URL}/api/healthz`);
        return r.ok;
      } catch {
        return false;
      }
    },
    30,
  );
  if (!apiUp) {
    throw new Error(
      `[e2e setup] API at ${API_URL} did not become healthy within 30s; cannot continue.`,
    );
  }

  let token = await adminLogin();

  if (!token) {
    console.log(`[e2e setup] admin login failed; running backend seed to create ${ADMIN_EMAIL}...`);
    const code = await runSeed();
    if (code !== 0) {
      throw new Error(`[e2e setup] backend seed exited with code ${code}.`);
    }
    token = await adminLogin();
  }

  if (!token) {
    throw new Error(
      `[e2e setup] admin login still failing after seed. Check backend logs and credentials.`,
    );
  }

  console.log(`[e2e setup] admin login OK.`);
  await deleteStaleTestCourses(token);
  await deleteStaleTestStudents(token);
}

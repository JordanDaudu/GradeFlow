import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

/**
 * Tests run against the live dev API server (workflow `backend: API Server`)
 * on http://localhost:8080. We share a single PrismaClient + auth cookie
 * across every spec file via the cached singleton below.
 *
 * This keeps the test setup minimal and tests the real production code path
 * (including all Nest decorators, guards, validation pipes, and exception
 * filter) without re-bootstrapping a separate Nest app instance, which would
 * lose decorator metadata under Vite's TypeScript transform.
 */

export const API_URL = process.env.TEST_API_URL || 'http://localhost:8080';

export const ADMIN = {
  email: 'admin@gradeflow.app',
  password: 'admin123',
};

export interface TestContext {
  api: () => request.Agent;
  prisma: PrismaClient;
  authCookie: string;
  authToken: string;
}

let cached: TestContext | null = null;

async function waitForServer(maxWaitMs = 30_000): Promise<void> {
  const start = Date.now();
  let lastErr: unknown = null;
  while (Date.now() - start < maxWaitMs) {
    try {
      const res = await request(API_URL).get('/api/healthz');
      if (res.status === 200) return;
      lastErr = new Error(`healthz returned ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(
    `API server at ${API_URL} did not become ready within ${maxWaitMs}ms (last error: ${String(lastErr)})`,
  );
}

export async function getTestContext(): Promise<TestContext> {
  if (cached) return cached;

  await waitForServer();

  const prisma = new PrismaClient();

  // Ensure the admin user exists with the known password. Preserve any
  // developer-set name/role on an existing record; only reset the password
  // hash if the known credential no longer authenticates, so running the
  // tests does not overwrite local dev-admin customizations.
  const existing = await prisma.user.findUnique({ where: { email: ADMIN.email } });
  if (!existing) {
    const passwordHash = await bcrypt.hash(ADMIN.password, 10);
    await prisma.user.create({
      data: { email: ADMIN.email, passwordHash, name: 'GradeFlow Admin', role: 'admin' },
    });
  } else {
    const ok = await bcrypt.compare(ADMIN.password, existing.passwordHash);
    if (!ok) {
      const passwordHash = await bcrypt.hash(ADMIN.password, 10);
      await prisma.user.update({ where: { email: ADMIN.email }, data: { passwordHash } });
    }
  }

  const loginRes = await request(API_URL)
    .post('/api/auth/login')
    .send({ email: ADMIN.email, password: ADMIN.password });
  if (loginRes.status !== 200) {
    throw new Error(
      `Test admin login failed: ${loginRes.status} ${JSON.stringify(loginRes.body)}`,
    );
  }

  const setCookies = loginRes.headers['set-cookie'];
  const cookieHeader = Array.isArray(setCookies) ? setCookies[0] : (setCookies as unknown as string);
  if (!cookieHeader) {
    throw new Error('Login did not return a Set-Cookie header');
  }
  const authCookie = cookieHeader.split(';')[0];
  const authToken = authCookie.split('=')[1];

  cached = {
    api: () => request(API_URL),
    prisma,
    authCookie,
    authToken,
  };
  return cached;
}

export async function closeTestContext(): Promise<void> {
  if (cached) {
    await cached.prisma.$disconnect().catch(() => {});
    cached = null;
  }
}

export function unique(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

import { API_URL, ADMIN_EMAIL, ADMIN_PASSWORD, TEST_CODE_PREFIXES, TEST_STUDENT_ID_REGEX } from './global-setup';

async function adminToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gradeflow.app', password: 'admin123' }),
    });
    if (res.status !== 200) return null;
    const setCookie = res.headers.get('set-cookie') ?? '';
    const match = /gradeflow_token=([^;]+)/.exec(setCookie);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export default async function globalTeardown(): Promise<void> {
  const token = await adminToken();
  if (!token) return;

  try {
    const [coursesRes, studentsRes] = await Promise.all([
      fetch(`${API_URL}/api/courses`, { headers: { cookie: `gradeflow_token=${token}` } }),
      fetch(`${API_URL}/api/students`, { headers: { cookie: `gradeflow_token=${token}` } }),
    ]);

    const deletions: Promise<unknown>[] = [];

    if (coursesRes.ok) {
      const courses = (await coursesRes.json()) as Array<{ id: number; code: string }>;
      const stale = courses.filter((c) => TEST_CODE_PREFIXES.some((p) => c.code.startsWith(p)));
      if (stale.length > 0) {
        console.log(`[e2e teardown] deleting ${stale.length} test course(s)...`);
        stale.forEach((c) =>
          deletions.push(
            fetch(`${API_URL}/api/courses/${c.id}`, {
              method: 'DELETE',
              headers: { cookie: `gradeflow_token=${token}` },
            }).catch(() => undefined),
          ),
        );
      }
    }

    if (studentsRes.ok) {
      const students = (await studentsRes.json()) as Array<{ id: number; externalId: string }>;
      const stale = students.filter((s) => TEST_STUDENT_ID_REGEX.test(s.externalId));
      if (stale.length > 0) {
        console.log(`[e2e teardown] deleting ${stale.length} test student(s)...`);
        stale.forEach((s) =>
          deletions.push(
            fetch(`${API_URL}/api/students/${s.id}`, {
              method: 'DELETE',
              headers: { cookie: `gradeflow_token=${token}` },
            }).catch(() => undefined),
          ),
        );
      }
    }

    await Promise.all(deletions);
    if (deletions.length > 0) console.log('[e2e teardown] done.');
  } catch {
  }
}

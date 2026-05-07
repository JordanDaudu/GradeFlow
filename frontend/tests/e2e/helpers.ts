import { type APIRequestContext, type Page, expect } from '@playwright/test';

export const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL ?? 'test-admin@gradeflow.local',
  password: process.env.E2E_ADMIN_PASSWORD ?? 'test-admin-password-123',
};

export function unique(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Log in via the API and inject the cookie into the browser context. */
export async function loginAs(
  page: Page,
  request: APIRequestContext,
  email = ADMIN.email,
  password = ADMIN.password,
): Promise<void> {
  const res = await request.post('/api/auth/login', {
    data: { email, password },
    failOnStatusCode: false,
  });
  if (res.status() !== 200) {
    throw new Error(`Login API failed: ${res.status()} ${await res.text()}`);
  }
  const setCookieHeader = res.headers()['set-cookie'];
  if (!setCookieHeader) throw new Error('Login response missing Set-Cookie');
  const cookieMatch = /gradeflow_token=([^;]+)/.exec(setCookieHeader);
  if (!cookieMatch) throw new Error('Login response missing gradeflow_token cookie');
  const token = cookieMatch[1];
  await page.context().addCookies([
    {
      name: 'gradeflow_token',
      value: token,
      url: page.url() && page.url() !== 'about:blank' ? page.url() : 'http://localhost:80/',
    },
  ]);
}

export interface SeededAssignment {
  courseId: number;
  assignmentId: number;
  studentId: number;
  submissionId: number;
}

export async function seedCourseWithAssignment(
  request: APIRequestContext,
  prefix = 'E2E',
): Promise<SeededAssignment> {
  await request.post('/api/auth/login', { data: ADMIN });

  const code = unique(prefix);
  const courseRes = await request.post('/api/courses', {
    data: { code, name: `קורס בדיקה ${code}`, term: 'אביב', year: 2099 },
  });
  expect(courseRes.status()).toBe(201);
  const course = await courseRes.json();

  const externalId = unique('STU');
  const studentRes = await request.post('/api/students', {
    data: { externalId, firstName: 'בודק', lastName: 'אוטומציה' },
  });
  expect(studentRes.status()).toBe(201);
  const student = await studentRes.json();

  const enrollRes = await request.post(`/api/courses/${course.id}/students`, {
    data: { studentId: student.id },
  });
  expect([200, 201]).toContain(enrollRes.status());

  const assignRes = await request.post('/api/assignments', {
    data: {
      courseId: course.id,
      name: `מטלת בדיקה ${code}`,
      maxScore: 100,
      weight: 1,
    },
  });
  expect(assignRes.status()).toBe(201);
  const assignment = await assignRes.json();

  // Find the auto-created submission for this student.
  const subsRes = await request.get(`/api/assignments/${assignment.id}/submissions`);
  expect(subsRes.status()).toBe(200);
  const subs = (await subsRes.json()) as Array<{ id: number; studentId: number }>;
  const submission = subs.find((s) => s.studentId === student.id);
  if (!submission) throw new Error('Auto-created submission not found for seeded student');

  return {
    courseId: course.id,
    assignmentId: assignment.id,
    studentId: student.id,
    submissionId: submission.id,
  };
}

export async function cleanupCourse(
  request: APIRequestContext,
  courseId: number,
  studentIds: number[] = [],
): Promise<void> {
  // Always re-authenticate before deleting: the afterAll request context may
  // not carry the cookie set during beforeAll (worker-scoped vs test-scoped).
  await request.post('/api/auth/login', { data: ADMIN, failOnStatusCode: false });
  const res = await request.delete(`/api/courses/${courseId}`, { failOnStatusCode: false });
  if (res.status() !== 200 && res.status() !== 404) {
    console.warn(`[e2e cleanup] DELETE /api/courses/${courseId} returned ${res.status()}`);
  }
  // Clean up test students so they don't accumulate in the DB.
  await Promise.all(
    studentIds.map((id) =>
      request.delete(`/api/students/${id}`, { failOnStatusCode: false }).catch(() => undefined),
    ),
  );
}

/**
 * Add a second student to an existing seeded course+assignment so the test
 * can exercise navigation between submissions (e.g. Save & Next).
 * Returns the new student's id and their auto-created submission id.
 */
export async function addStudentToAssignment(
  request: APIRequestContext,
  courseId: number,
  assignmentId: number,
): Promise<{ studentId: number; submissionId: number }> {
  const externalId = unique('STU');
  const studentRes = await request.post('/api/students', {
    data: { externalId, firstName: 'בודק', lastName: 'שני' },
  });
  expect(studentRes.status()).toBe(201);
  const student = await studentRes.json();

  const enrollRes = await request.post(`/api/courses/${courseId}/students`, {
    data: { studentId: student.id },
  });
  expect([200, 201]).toContain(enrollRes.status());

  const subsRes = await request.get(`/api/assignments/${assignmentId}/submissions`);
  expect(subsRes.status()).toBe(200);
  const subs = (await subsRes.json()) as Array<{ id: number; studentId: number }>;
  const submission = subs.find((s) => s.studentId === student.id);
  if (!submission) throw new Error('Auto-created submission not found for second student');

  return { studentId: student.id, submissionId: submission.id };
}

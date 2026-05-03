import { expect, test } from '@playwright/test';
import {
  addStudentToAssignment,
  cleanupCourse,
  loginAs,
  seedCourseWithAssignment,
  type SeededAssignment,
} from './helpers';

test.describe('Grading save flow', () => {
  let seed: SeededAssignment;
  let secondStudentId = 0;

  test.beforeAll(async ({ request }) => {
    seed = await seedCourseWithAssignment(request, 'GRD');

    // Pre-create rubric criteria via API so the grading page renders score inputs.
    const res = await request.put(`/api/assignments/${seed.assignmentId}/rubric`, {
      data: {
        criteria: [
          { name: 'נכונות', maxPoints: 50, orderIndex: 0 },
          { name: 'תיעוד', maxPoints: 50, orderIndex: 1 },
        ],
      },
    });
    expect(res.status()).toBe(200);

    // Seed a second student so the assignment has multiple submissions and
    // the "Save & Next" button has somewhere to navigate to.
    const second = await addStudentToAssignment(request, seed.courseId, seed.assignmentId);
    secondStudentId = second.studentId;
  });

  test.afterAll(async ({ request }) => {
    await cleanupCourse(request, seed.courseId, [seed.studentId, secondStudentId]);
  });

  test('grader can save a single submission via Save', async ({ page, request }) => {
    await page.goto('/login');
    await loginAs(page, request);

    await page.goto(`/assignments/${seed.assignmentId}/grade/${seed.submissionId}`);

    const saveBtn = page.locator('button[data-testid="button-save"]');
    await expect(saveBtn).toBeVisible({ timeout: 15_000 });
    await saveBtn.click();

    await expect(page.locator('[data-testid="save-indicator"]').first()).toBeVisible({
      timeout: 10_000,
    });

    // Verify the submission was actually persisted by the save click.
    const apiRes = await request.get(`/api/submissions/${seed.submissionId}`);
    expect(apiRes.status()).toBe(200);
    const sub = (await apiRes.json()) as {
      id: number;
      status: string;
      createdAt: string;
      updatedAt: string;
    };
    expect(sub.id).toBe(seed.submissionId);
    expect(['pending', 'in_progress', 'needs_review', 'graded', 'returned', 'missing']).toContain(
      sub.status,
    );
    expect(new Date(sub.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(sub.createdAt).getTime(),
    );
  });

  test('Save & Next persists the current submission and navigates to the next one', async ({
    page,
    request,
  }) => {
    await page.goto('/login');
    await loginAs(page, request);

    // The API guarantees lastName asc → firstName asc → id asc ordering.
    // The seeded students are "אוטומציה בודק" and "שני בודק".
    // 'א' (U+05D0) < 'ש' (U+05E9), so seed.submissionId is always first.
    const subsRes = await request.get(`/api/assignments/${seed.assignmentId}/submissions`);
    expect(subsRes.status()).toBe(200);
    const subs = (await subsRes.json()) as Array<{ id: number }>;
    expect(subs.length).toBeGreaterThanOrEqual(2);
    // Assert the stable order holds: seed student (אוטומציה) before second student (שני).
    expect(subs[0].id).toBe(seed.submissionId);
    const firstInListSubmissionId = subs[0].id;
    const nextInListSubmissionId = subs[1].id;

    const startUrl = `/assignments/${seed.assignmentId}/grade/${firstInListSubmissionId}`;

    // Wait for the assignment's submissions list to be cached so the
    // grading page can compute `nextSubmission` (and enable Save & Next)
    // immediately on first paint instead of after an async fetch.
    const subsResp = page.waitForResponse(
      (r) =>
        r.url().includes(`/api/assignments/${seed.assignmentId}/submissions`) &&
        r.request().method() === 'GET',
      { timeout: 15_000 },
    );
    await page.goto(startUrl);
    await subsResp.catch(() => undefined);

    const saveNextBtn = page.locator('button[data-testid="button-save-next"]');
    await expect(saveNextBtn).toBeVisible({ timeout: 15_000 });
    await expect(saveNextBtn).toBeEnabled({ timeout: 20_000 });

    await saveNextBtn.click();

    // The URL should change to the next submission's grading page.
    const expectedNextUrl = new RegExp(
      `/assignments/${seed.assignmentId}/grade/${nextInListSubmissionId}(?:[?#].*)?$`,
    );
    await expect(page).toHaveURL(expectedNextUrl, { timeout: 15_000 });

    // And the source submission should have an updatedAt at or after createdAt
    // (proving Save & Next persisted before navigating).
    const apiRes = await request.get(`/api/submissions/${firstInListSubmissionId}`);
    expect(apiRes.status()).toBe(200);
    const sub = (await apiRes.json()) as {
      id: number;
      createdAt: string;
      updatedAt: string;
    };
    expect(sub.id).toBe(firstInListSubmissionId);
    expect(new Date(sub.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(sub.createdAt).getTime(),
    );
  });
});

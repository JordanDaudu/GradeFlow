import { expect, test } from '@playwright/test';
import { cleanupCourse, loginAs, seedCourseWithAssignment, type SeededAssignment } from './helpers';

test.describe('Assignment rubric editor', () => {
  let seed: SeededAssignment;

  test.beforeAll(async ({ request }) => {
    seed = await seedCourseWithAssignment(request, 'RUB');
  });

  test.afterAll(async ({ request }) => {
    await cleanupCourse(request, seed.courseId, [seed.studentId]);
  });

  test('admin can open the rubric tab, add a criterion, and save', async ({ page, request }) => {
    await page.goto('/login');
    await loginAs(page, request);

    await page.goto(`/assignments/${seed.assignmentId}`);
    // Switch to the rubric tab (default tab is gradebook).
    await page.getByRole('tab', { name: /עריכת מחוון/ }).click();
    await expect(page.getByRole('heading', { name: /מחוון בדיקה/ })).toBeVisible({ timeout: 15_000 });

    // Fill the first criterion (the form starts with one empty row).
    const nameInputs = page.locator('input[placeholder*="איכות הקוד"]');
    await expect(nameInputs.first()).toBeVisible();
    await nameInputs.first().fill('נכונות');

    const pointsInputs = page.locator('input[type="number"]');
    await expect(pointsInputs.first()).toBeVisible();
    await pointsInputs.first().fill('60');

    // Add a second criterion.
    await page.getByRole('button', { name: 'הוסף קריטריון' }).click();
    await expect(nameInputs.nth(1)).toBeVisible();
    await nameInputs.nth(1).fill('איכות הקוד');
    await pointsInputs.nth(1).fill('40');

    // Save.
    const saveBtn = page.getByRole('button', { name: /שמור מחוון/ });
    await saveBtn.click();
    await expect(page.getByText('המחוון נשמר בהצלחה')).toBeVisible({ timeout: 10_000 });

    // Verify via API that the criteria persisted.
    const apiRes = await request.get(`/api/assignments/${seed.assignmentId}/rubric`);
    expect(apiRes.status()).toBe(200);
    const criteria = (await apiRes.json()) as Array<{ name: string; maxPoints: number }>;
    expect(criteria).toHaveLength(2);
    expect(criteria.map((c) => c.name).sort()).toEqual(['איכות הקוד', 'נכונות']);
    expect(criteria.reduce((s, c) => s + c.maxPoints, 0)).toBe(100);
  });
});

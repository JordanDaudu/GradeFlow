import { expect, test } from '@playwright/test';
import { cleanupCourse, loginAs, seedCourseWithAssignment, unique, type SeededAssignment, ADMIN } from './helpers';

test.describe('Assignments page', () => {
  let seed: SeededAssignment;
  let archivedCourseId: number;

  test.beforeAll(async ({ request }) => {
    seed = await seedCourseWithAssignment(request, 'APGE');

    // Create and immediately archive a second course so the filter dropdown
    // has an archived group to display.
    const archCode = unique('ARCH');
    const archRes = await request.post('/api/courses', {
      data: { code: archCode, name: `ארכיון-בדיקה ${archCode}`, term: 'קיץ', year: 2099 },
    });
    expect(archRes.status()).toBe(201);
    const archCourse = await archRes.json();
    archivedCourseId = archCourse.id;

    const archiveRes = await request.post(`/api/courses/${archivedCourseId}/archive`);
    expect(archiveRes.status()).toBe(200);
  });

  test.afterAll(async ({ request }) => {
    await request.post('/api/auth/login', { data: ADMIN, failOnStatusCode: false });
    await cleanupCourse(request, seed.courseId, [seed.studentId]);
    await request.delete(`/api/courses/${archivedCourseId}`, { failOnStatusCode: false });
  });

  test('assignments list page renders after login', async ({ page, request }) => {
    await page.goto('/login');
    await loginAs(page, request);
    await page.goto('/assignments');

    await expect(page.getByRole('heading', { name: 'מטלות' })).toBeVisible({ timeout: 10_000 });
    // The seeded assignment should appear as a card
    await expect(page.getByRole('link', { name: new RegExp(`מטלת בדיקה`) }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('course filter dropdown shows active and archived groups', async ({ page, request }) => {
    await page.goto('/login');
    await loginAs(page, request);
    await page.goto('/assignments');

    // Open the course filter Select
    const filterTrigger = page.getByRole('combobox');
    await expect(filterTrigger).toBeVisible({ timeout: 10_000 });
    await filterTrigger.click();

    // The archived group label should be visible (exact match to avoid matching course names)
    await expect(page.getByText('ארכיון', { exact: true })).toBeVisible({ timeout: 5_000 });
    // The active group label should also be visible
    await expect(page.getByText('קורסים פעילים', { exact: true })).toBeVisible({ timeout: 5_000 });

    // Dismiss the dropdown
    await page.keyboard.press('Escape');
  });

  test('create assignment dialog: open, fill, submit, new card appears', async ({ page, request }) => {
    await page.goto('/login');
    await loginAs(page, request);
    await page.goto('/assignments');

    await expect(page.getByRole('heading', { name: 'מטלות' })).toBeVisible({ timeout: 10_000 });

    // Open the create dialog
    await page.getByRole('button', { name: 'צור מטלה' }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('יצירת מטלה חדשה')).toBeVisible({ timeout: 5_000 });

    const dialog = page.getByRole('dialog');

    // Select a course from the combobox (picks the first available active course)
    await dialog.getByRole('combobox').click();
    await page.getByRole('option').first().click();

    // Fill assignment name
    const newName = unique('מטלה-חדשה');
    await dialog.getByPlaceholder('לדוגמה: תרגיל בית 1').fill(newName);

    // Submit (maxScore and weight have sensible defaults of 100 / 10)
    await dialog.getByRole('button', { name: 'צור מטלה' }).click();

    // Success toast
    await expect(page.getByText('המטלה נוצרה בהצלחה')).toBeVisible({ timeout: 8_000 });

    // Dialog closes
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5_000 });

    // The new assignment card appears in the list
    await expect(page.getByRole('link', { name: newName }).first()).toBeVisible({ timeout: 8_000 });
  });

  test('close and reopen assignment via 3-dot menu', async ({ page, request }) => {
    await page.goto('/login');
    await loginAs(page, request);
    await page.goto('/assignments');

    await expect(page.getByRole('heading', { name: 'מטלות' })).toBeVisible({ timeout: 10_000 });

    // Find the seeded assignment card by matching a link with the partial assignment name
    const assignmentLink = page.getByRole('link', { name: /מטלת בדיקה/ }).first();
    await expect(assignmentLink).toBeVisible({ timeout: 10_000 });

    // Navigate up to the card root (has class "group") and find the 3-dot button
    // The card has two buttons: first = 3-dot menu trigger, last = "המשך בדיקה"
    const card = assignmentLink.locator('xpath=ancestor::div[contains(@class,"group")]').first();
    const menuBtn = card.getByRole('button').first();
    await menuBtn.click();

    // Click "סגור מטלה"
    await page.getByText('סגור מטלה').click();
    await expect(page.getByText('המטלה סגורה')).toBeVisible({ timeout: 8_000 });

    // After closing, the assignment is hidden. Show closed assignments to reveal it.
    await page.locator('button').filter({ hasText: /הצג סגורות/ }).click();

    // Find the card again (now visible as a closed assignment)
    const closedLink = page.getByRole('link', { name: /מטלת בדיקה/ }).first();
    await expect(closedLink).toBeVisible({ timeout: 8_000 });
    const closedCard = closedLink.locator('xpath=ancestor::div[contains(@class,"group")]').first();

    // Reopen via the 3-dot menu
    await closedCard.getByRole('button').first().click();
    await page.getByText('פתח מחדש').click();
    await expect(page.getByText('המטלה נפתחה מחדש')).toBeVisible({ timeout: 8_000 });
  });
});

import { expect, test } from '@playwright/test';
import {
  addStudentToAssignment,
  cleanupCourse,
  loginAs,
  seedCourseWithAssignment,
  type SeededAssignment,
} from './helpers';

test.describe('Mobile grading flow', () => {
  let seed: SeededAssignment;
  let secondStudentId = 0;

  test.beforeAll(async ({ request }) => {
    seed = await seedCourseWithAssignment(request, 'MOB');

    // Add a second student so Save & Next has somewhere to go.
    const second = await addStudentToAssignment(request, seed.courseId, seed.assignmentId);
    secondStudentId = second.studentId;
  });

  test.afterAll(async ({ request }) => {
    await cleanupCourse(request, seed.courseId, [seed.studentId, secondStudentId]);
  });

  test('mobile layout: PDF pane hidden, save buttons visible, sheet opens with submission tab', async ({
    page,
    request,
  }) => {
    // Set mobile viewport (iPhone 14 Pro dimensions).
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto('/login');
    await loginAs(page, request);

    await page.goto(`/assignments/${seed.assignmentId}/grade/${seed.submissionId}`);

    // Wait for the grading page to finish loading (mobile save button is a reliable marker).
    const mobileSaveBtn = page.locator('[data-testid="button-mobile-save"]');
    await expect(mobileSaveBtn).toBeVisible({ timeout: 15_000 });

    // 1. PDF pane must NOT be visible on mobile (hidden md:flex).
    const pdfPane = page.locator('[data-testid="pdf-pane"]');
    await expect(pdfPane).toBeHidden();

    // 2. Both mobile save buttons must be visible in the sticky bottom bar.
    await expect(mobileSaveBtn).toBeVisible();
    const mobileSaveNextBtn = page.locator('[data-testid="button-mobile-save-next"]');
    await expect(mobileSaveNextBtn).toBeVisible();

    // 3. The "תצוגה" preview button must be visible in the header.
    const previewBtn = page.locator('[data-testid="button-mobile-preview"]');
    await expect(previewBtn).toBeVisible();

    // 4. Click the preview button and assert the bottom sheet opens.
    await previewBtn.click();

    const sheet = page.locator('[data-testid="sheet-mobile-preview"]');
    await expect(sheet).toBeVisible({ timeout: 10_000 });

    // 5. The "הגשת סטודנט" tab must be visible inside the sheet.
    const submissionTab = page.locator('[data-testid="mobile-tab-submission"]');
    await expect(submissionTab).toBeVisible({ timeout: 10_000 });
  });

  test('mobile save: triggers save and shows success toast', async ({ page, request }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto('/login');
    await loginAs(page, request);

    await page.goto(`/assignments/${seed.assignmentId}/grade/${seed.submissionId}`);

    const mobileSaveBtn = page.locator('[data-testid="button-mobile-save"]');
    await expect(mobileSaveBtn).toBeVisible({ timeout: 15_000 });

    await mobileSaveBtn.click();

    // On mobile the save-indicator is hidden (hidden md:inline-flex).
    // Instead, a Sonner toast confirms the save succeeded.
    await expect(
      page.locator('[data-sonner-toast]').filter({ hasText: 'נשמר' }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});

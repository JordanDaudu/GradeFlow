import { expect, test } from '@playwright/test';
import { loginAs, seedCourseWithAssignment, cleanupCourse, unique } from './helpers';

test.describe('Course Edit', () => {
  let courseId: number;
  let studentId: number;

  test.beforeAll(async ({ request }) => {
    const seed = await seedCourseWithAssignment(request, 'E2E');
    courseId = seed.courseId;
    studentId = seed.studentId;
  });

  test.afterAll(async ({ request }) => {
    await cleanupCourse(request, courseId, [studentId]);
  });

  test('edit button opens dialog pre-filled with current course data', async ({ page, request }) => {
    await page.goto('/login');
    await loginAs(page, request);
    await page.goto(`/courses/${courseId}`);

    // Wait for the page to load course data
    await expect(page.getByTestId('button-edit-course')).toBeVisible({ timeout: 10_000 });

    // Open the edit dialog
    await page.getByTestId('button-edit-course').click();

    // Dialog should appear with the correct title
    await expect(page.getByText('עריכת פרטי קורס')).toBeVisible({ timeout: 5_000 });

    // Inputs should be pre-filled (not empty)
    const nameInput = page.getByPlaceholder('למשל: מבנה נתונים ואלגוריתמים');
    const codeInput = page.getByPlaceholder('למשל: CS-101');
    await expect(nameInput).not.toHaveValue('');
    await expect(codeInput).not.toHaveValue('');
  });

  test('saving edited course name updates the header', async ({ page, request }) => {
    const newName = unique('קורס-ערוך');

    await page.goto('/login');
    await loginAs(page, request);
    await page.goto(`/courses/${courseId}`);
    await expect(page.getByTestId('button-edit-course')).toBeVisible({ timeout: 10_000 });

    await page.getByTestId('button-edit-course').click();
    await expect(page.getByText('עריכת פרטי קורס')).toBeVisible({ timeout: 5_000 });

    // Clear and type new name
    const nameInput = page.getByPlaceholder('למשל: מבנה נתונים ואלגוריתמים');
    await nameInput.clear();
    await nameInput.fill(newName);

    // Save
    await page.getByRole('button', { name: 'שמור שינויים' }).click();

    // Toast success should appear
    await expect(page.getByText('פרטי הקורס עודכנו בהצלחה')).toBeVisible({ timeout: 8_000 });

    // Dialog should close
    await expect(page.getByText('עריכת פרטי קורס')).not.toBeVisible({ timeout: 5_000 });

    // The new name should appear on the page
    await expect(page.getByText(newName).first()).toBeVisible({ timeout: 5_000 });
  });
});

import { expect, test } from '@playwright/test';
import { cleanupCourse, loginAs, seedCourseWithAssignment, unique, type SeededAssignment } from './helpers';

test.describe('Students page', () => {
  let seed: SeededAssignment;

  test.beforeAll(async ({ request }) => {
    seed = await seedCourseWithAssignment(request, 'STPG');
  });

  test.afterAll(async ({ request }) => {
    await cleanupCourse(request, seed.courseId, [seed.studentId]);
  });

  test('students list page renders after login', async ({ page, request }) => {
    await page.goto('/login');
    await loginAs(page, request);
    await page.goto('/students');

    await expect(page.getByRole('heading', { name: 'סטודנטים' })).toBeVisible({ timeout: 10_000 });
    // The seeded student should appear in the table
    await expect(
      page.locator(`[data-testid="link-student-${seed.studentId}"]`),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('edit dialog opens pre-filled and saving updates the row', async ({ page, request }) => {
    await page.goto('/login');
    await loginAs(page, request);
    await page.goto('/students');

    // Find the seeded student's row
    const studentLink = page.locator(`[data-testid="link-student-${seed.studentId}"]`);
    await expect(studentLink).toBeVisible({ timeout: 10_000 });

    // The student row is a <tr>; find the 3-dot menu button within it
    const row = studentLink.locator('xpath=ancestor::tr').first();
    const menuBtn = row.getByRole('button');
    await menuBtn.click();

    // Click "ערוך פרטים"
    await page.getByText('ערוך פרטים').click();

    // Edit dialog should appear
    await expect(page.getByText('עריכת פרטי סטודנט')).toBeVisible({ timeout: 5_000 });

    // The firstName input should be pre-filled (seeded as "בודק")
    // Use role+label to avoid ambiguity with the lastName field (placeholder "ישראלי" shares prefix)
    const firstNameInput = page.getByRole('textbox', { name: 'שם פרטי' });
    await expect(firstNameInput).not.toHaveValue('');

    // Change the first name
    const newFirstName = unique('שם');
    await firstNameInput.clear();
    await firstNameInput.fill(newFirstName);

    // Save
    await page.getByRole('button', { name: 'שמור שינויים' }).click();

    // Toast success
    await expect(page.getByText('פרטי הסטודנט עודכנו')).toBeVisible({ timeout: 8_000 });

    // Dialog closes
    await expect(page.getByText('עריכת פרטי סטודנט')).not.toBeVisible({ timeout: 5_000 });

    // Updated name appears in the table
    await expect(page.getByText(newFirstName).first()).toBeVisible({ timeout: 5_000 });
  });
});

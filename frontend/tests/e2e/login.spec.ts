import { expect, test } from '@playwright/test';
import { ADMIN } from './helpers';

test.describe('Login flow', () => {
  test('renders the login form with Hebrew copy', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1', { hasText: 'GradeFlow' })).toBeVisible();
    await expect(page.getByText('התחברות למערכת')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'התחבר' })).toBeVisible();
  });

  test('shows error toast on bad credentials', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(ADMIN.email);
    await page.locator('input[type="password"]').fill('definitely-wrong');
    await page.getByRole('button', { name: 'התחבר' }).click();
    await expect(page.getByText(/שם משתמש או סיסמה שגויים/)).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/login$/);
  });

  test('logs in with valid admin credentials and lands on dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(ADMIN.email);
    await page.locator('input[type="password"]').fill(ADMIN.password);
    await page.getByRole('button', { name: 'התחבר' }).click();
    await expect(page).toHaveURL(/\/(?!login)/, { timeout: 15_000 });
    await expect(page.getByText(/לוח|דשבורד|GradeFlow/).first()).toBeVisible();
  });
});

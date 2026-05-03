import { expect, test } from '@playwright/test';
import { loginAs } from './helpers';

test.describe('Dashboard', () => {
  test('authenticated user sees stats and is not redirected to /login', async ({ page, request }) => {
    await page.goto('/login');
    await loginAs(page, request);
    await page.goto('/');
    await expect(page).not.toHaveURL(/\/login$/);

    // All four dashboard stat-card Hebrew labels should appear.
    const statLabels = ['קורסים פעילים', 'סטודנטים', 'מטלות פתוחות', 'ממתין לבדיקה'];
    for (const label of statLabels) {
      await expect(
        page.getByText(label).first(),
        `expected dashboard stat label "${label}" to be visible`,
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test('unauthenticated request to / redirects to /login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/, { timeout: 10_000 });
  });
});

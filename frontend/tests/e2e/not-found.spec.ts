import { expect, test } from '@playwright/test';
import { loginAs } from './helpers';

/**
 * Hebrew 404 page e2e tests.
 *
 * The NotFound page is rendered by the catch-all <Route> inside AuthWrapper.
 * Because AuthWrapper redirects unauthenticated requests to /login before the
 * Switch can match, the 404 page is only reachable when authenticated.
 *
 * Unauthenticated access to an unknown route is also tested to document the
 * intentional redirect-to-login behaviour.
 */

const UNKNOWN_ROUTE = '/blah-xyz-does-not-exist';

test.describe('Hebrew 404 page', () => {
  test('unauthenticated visitor is redirected to /login (404 is auth-gated)', async ({ page }) => {
    await page.goto(UNKNOWN_ROUTE);
    // AuthWrapper redirects to /login before the catch-all route fires.
    await expect(page).toHaveURL(/\/login$/, { timeout: 10_000 });
    await expect(
      page.getByRole('heading', { name: 'הדף לא נמצא' }),
      '404 heading must NOT appear for unauthenticated visitors (they see login)',
    ).not.toBeVisible();
  });

  test('authenticated user sees Hebrew 404 UI at unknown route', async ({ page, request }) => {
    await loginAs(page, request);
    await page.goto(UNKNOWN_ROUTE);

    await expect(
      page.getByRole('heading', { name: '404' }),
      '"404" heading should be visible',
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByRole('heading', { name: 'הדף לא נמצא' }),
      '"הדף לא נמצא" heading should be visible',
    ).toBeVisible();

    await expect(
      page.getByText('הדף שחיפשת אינו קיים'),
      'Hebrew explanation text should be visible',
    ).toBeVisible();

    await expect(
      page.getByRole('link', { name: 'חזרה לדף הבית' }),
      '"חזרה לדף הבית" link should be visible',
    ).toBeVisible();
  });

  test('no English placeholder text on the 404 page', async ({ page, request }) => {
    await loginAs(page, request);
    await page.goto(UNKNOWN_ROUTE);

    await expect(
      page.getByRole('heading', { name: 'הדף לא נמצא' }),
    ).toBeVisible({ timeout: 10_000 });

    for (const forbidden of ['Did you forget', 'Not Found', 'router', 'Wouter', '404 page']) {
      await expect(
        page.getByText(forbidden, { exact: false }),
        `English text "${forbidden}" must be absent from the DOM on the 404 page`,
      ).toHaveCount(0);
    }
  });

  test('"חזרה לדף הבית" navigates away from the 404 screen', async ({ page, request }) => {
    await loginAs(page, request);
    await page.goto(UNKNOWN_ROUTE);

    await expect(
      page.getByRole('heading', { name: 'הדף לא נמצא' }),
    ).toBeVisible({ timeout: 10_000 });

    await page.getByRole('link', { name: 'חזרה לדף הבית' }).click();

    // Should land on / (dashboard) — either way the 404 heading must be gone.
    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
    await expect(
      page.getByRole('heading', { name: 'הדף לא נמצא' }),
      '"הדף לא נמצא" must not be visible after clicking home',
    ).not.toBeVisible();
  });
});

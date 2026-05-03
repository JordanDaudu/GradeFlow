import { expect, test } from '@playwright/test';

/**
 * ErrorBoundary e2e tests.
 *
 * Strategy: the app ships a DEV-only <TestCrashTrigger> component (in App.tsx)
 * that throws a render error when `?__e2e_crash=1` is present in the URL.
 * This component is placed inside the <ErrorBoundary>, so the boundary catches
 * the crash and renders the Hebrew fallback UI — without any production code
 * needing a deliberate crash path (import.meta.env.DEV is false at build time).
 */

test.describe('ErrorBoundary', () => {
  test.beforeEach(async ({ page }) => {
    // Suppress the two expected console.error calls React emits when a boundary
    // catches: "The above error occurred..." and the component stack.  We
    // acknowledge them here so the test runner doesn't flag them as failures.
    page.on('console', () => {});
  });

  test('shows Hebrew fallback UI when a component crashes', async ({ page }) => {
    // Trigger the DEV-only crash path.
    await page.goto('/?__e2e_crash=1');

    // Heading
    await expect(
      page.getByText('אירעה שגיאה בלתי צפויה'),
      'Hebrew error heading should be visible',
    ).toBeVisible({ timeout: 10_000 });

    // Supporting copy
    await expect(
      page.getByText('משהו השתבש בהצגת הדף'),
      'Error explanation text should be visible',
    ).toBeVisible();

    // Action buttons
    await expect(
      page.getByRole('button', { name: 'נסה שוב' }),
      '"נסה שוב" (try again) button should be visible',
    ).toBeVisible();

    await expect(
      page.getByRole('button', { name: 'דף הבית' }),
      '"דף הבית" (home) button should be visible',
    ).toBeVisible();
  });

  test('"נסה שוב" resets the boundary and the app recovers when crash is cleared', async ({ page }) => {
    await page.goto('/?__e2e_crash=1');
    await expect(page.getByText('אירעה שגיאה בלתי צפויה')).toBeVisible({ timeout: 10_000 });

    // Remove the crash param from the URL *before* clicking reset so the
    // boundary re-renders into a crash-free environment.  This is the only
    // way to distinguish "reset worked" from "button did nothing".
    await page.evaluate(() => window.history.replaceState({}, '', '/'));

    await page.getByRole('button', { name: 'נסה שוב' }).click();

    // The error screen must disappear — the app renders normally (login or
    // dashboard, depending on auth state).
    await expect(
      page.getByText('אירעה שגיאה בלתי צפויה'),
      'Error heading should be gone after reset once the crash trigger is cleared',
    ).not.toBeVisible({ timeout: 10_000 });
  });

  test('"דף הבית" navigates to / and recovers from the crash', async ({ page }) => {
    await page.goto('/?__e2e_crash=1');
    await expect(page.getByText('אירעה שגיאה בלתי צפויה')).toBeVisible({ timeout: 10_000 });

    // Clicking "דף הבית" does window.location.href = "/" — no crash param → recovery.
    await page.getByRole('button', { name: 'דף הבית' }).click();

    // Should land on / (login or dashboard — either way, no longer on the error screen).
    await expect(page).toHaveURL(/\/(login)?$/, { timeout: 15_000 });
    await expect(
      page.getByText('אירעה שגיאה בלתי צפויה'),
      'Error heading should be gone after navigating home',
    ).not.toBeVisible();
  });
});

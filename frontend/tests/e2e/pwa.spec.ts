import { expect, test } from '@playwright/test';
import { loginAs } from './helpers';

// ─── Offline Banner ──────────────────────────────────────────────────────────

test.describe('PWA offline banner', () => {
  // Each test starts as an authenticated user on the dashboard.
  test.beforeEach(async ({ page, request }) => {
    await page.context().setOffline(false);
    await page.goto('/login');
    await loginAs(page, request);
    await page.goto('/');
    // Wait for the dashboard to be fully rendered before touching network state.
    await expect(page.getByText('לוח בקרה').first()).toBeVisible({ timeout: 10_000 });
  });

  test('banner is hidden when online', async ({ page }) => {
    await expect(page.getByTestId('offline-banner')).not.toBeVisible();
  });

  test('banner appears when browser goes offline', async ({ page }) => {
    // Banner must not be present before going offline.
    await expect(page.getByTestId('offline-banner')).not.toBeVisible();

    // Chromium emulates offline by firing the `offline` event and setting
    // navigator.onLine = false — exactly what OfflineBanner listens to.
    await page.context().setOffline(true);

    await expect(page.getByTestId('offline-banner')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('offline-banner')).toContainText('אין חיבור לאינטרנט');
  });

  test('banner disappears when browser comes back online', async ({ page }) => {
    // Go offline first.
    await page.context().setOffline(true);
    await expect(page.getByTestId('offline-banner')).toBeVisible({ timeout: 5_000 });

    // Restore connectivity.
    await page.context().setOffline(false);

    // Banner should vanish once the `online` event fires.
    await expect(page.getByTestId('offline-banner')).not.toBeVisible({ timeout: 5_000 });
  });
});

// ─── SW Update Prompt ────────────────────────────────────────────────────────

test.describe('SW update prompt', () => {
  // In dev mode, vite-plugin-pwa's virtual:pwa-register/react module is a
  // no-op (the service worker is not registered), so we cannot trigger
  // `needRefresh` through a real SW lifecycle.  SwUpdatePrompt exposes a
  // dev-only custom event (`__gradeflow_sw_update_available`) specifically for
  // this test — it is dead-code-eliminated in production builds by Vite.
  test('shows update toast when a new service worker version is available', async ({
    page,
    request,
  }) => {
    await page.goto('/login');
    await loginAs(page, request);
    await page.goto('/');

    // Wait for the app to fully mount before triggering the update event.
    await expect(page.getByText('לוח בקרה').first()).toBeVisible({ timeout: 10_000 });

    // Simulate a waiting service worker by dispatching the dev-only event.
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('__gradeflow_sw_update_available'));
    });

    // The update toast should appear with the correct Hebrew title and action.
    await expect(page.getByText('עדכון זמין')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('button', { name: 'טען מחדש' })).toBeVisible({ timeout: 5_000 });
  });
});

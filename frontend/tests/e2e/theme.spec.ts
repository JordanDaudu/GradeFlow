import { expect, test } from '@playwright/test';
import { loginAs } from './helpers';

const STORAGE_KEY = 'gradeflow-theme';

test.describe('Theme toggle', () => {
  test.beforeEach(async ({ page, request }) => {
    await page.goto('/login');
    await loginAs(page, request);
    // Clear any previously stored theme preference so tests start clean.
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('clicking the sidebar theme toggle adds .dark to <html> when currently light', async ({ page }) => {
    // Force light mode via localStorage and reload so React hydrates with the correct preference.
    await page.evaluate((key) => localStorage.setItem(key, 'light'), STORAGE_KEY);
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Confirm we start without .dark.
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    const toggle = page.getByTestId('button-theme-toggle');
    await expect(toggle).toBeVisible();
    await toggle.click();

    // After clicking, .dark should be on <html>.
    await expect(page.locator('html')).toHaveClass(/dark/, { timeout: 5_000 });
  });

  test('clicking the sidebar theme toggle removes .dark from <html> when currently dark', async ({ page }) => {
    // Force dark mode via localStorage and class.
    await page.evaluate((key) => {
      localStorage.setItem(key, 'dark');
      document.documentElement.classList.add('dark');
    }, STORAGE_KEY);

    // Reload so React picks up the stored preference.
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('html')).toHaveClass(/dark/);

    const toggle = page.getByTestId('button-theme-toggle');
    await expect(toggle).toBeVisible();
    await toggle.click();

    await expect(page.locator('html')).not.toHaveClass(/dark/, { timeout: 5_000 });
  });
});

test.describe('Appearance settings persistence', () => {
  test.beforeEach(async ({ page, request }) => {
    await page.goto('/login');
    await loginAs(page, request);
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
  });

  test('selecting Dark mode persists on reload — dark button is active and .dark class is present', async ({ page }) => {
    // Click the dark appearance button (data-testid="button-appearance-dark").
    const darkBtn = page.getByTestId('button-appearance-dark');
    await expect(darkBtn).toBeVisible();
    await darkBtn.click();

    // Immediately the active button should have aria-pressed=true.
    await expect(darkBtn).toHaveAttribute('aria-pressed', 'true', { timeout: 5_000 });
    // And .dark should be applied to <html>.
    await expect(page.locator('html')).toHaveClass(/dark/, { timeout: 5_000 });

    // Reload and confirm the preference was remembered.
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('html')).toHaveClass(/dark/, { timeout: 5_000 });
    await expect(page.getByTestId('button-appearance-dark')).toHaveAttribute('aria-pressed', 'true');
  });

  test('selecting Light mode persists on reload — light button is active and .dark class is absent', async ({ page }) => {
    // First switch to dark so there is a meaningful state change to verify.
    await page.evaluate((key) => {
      localStorage.setItem(key, 'dark');
      document.documentElement.classList.add('dark');
    }, STORAGE_KEY);
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Click the light appearance button (data-testid="button-appearance-light").
    const lightBtn = page.getByTestId('button-appearance-light');
    await expect(lightBtn).toBeVisible();
    await lightBtn.click();

    await expect(lightBtn).toHaveAttribute('aria-pressed', 'true', { timeout: 5_000 });
    await expect(page.locator('html')).not.toHaveClass(/dark/, { timeout: 5_000 });

    // Reload and confirm preference was remembered.
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('html')).not.toHaveClass(/dark/, { timeout: 5_000 });
    await expect(page.getByTestId('button-appearance-light')).toHaveAttribute('aria-pressed', 'true');
  });

  test('selecting System mode persists on reload — system button is active', async ({ page }) => {
    // Click the system appearance button (data-testid="button-appearance-system").
    const systemBtn = page.getByTestId('button-appearance-system');
    await expect(systemBtn).toBeVisible();
    await systemBtn.click();

    await expect(systemBtn).toHaveAttribute('aria-pressed', 'true', { timeout: 5_000 });

    // Reload and confirm the stored preference is "system".
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('button-appearance-system')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Phase 0 smoke', () => {
  test('home page renders with correct language', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-GB');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: /browse events/i })).toBeVisible();
  });

  test('health endpoint responds', async ({ request }) => {
    const res = await request.get('/api/health');
    // 200 if DB is up, 503 if not — both are valid healthy responses of the route itself
    expect([200, 503]).toContain(res.status());
  });

  test('home page has no critical a11y violations', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    expect(
      results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious'),
    ).toEqual([]);
  });

  test('manifest and robots are served', async ({ request }) => {
    expect((await request.get('/manifest.webmanifest')).status()).toBeLessThan(400);
    expect((await request.get('/robots.txt')).status()).toBe(200);
    expect((await request.get('/sitemap.xml')).status()).toBe(200);
  });
});

import { test, expect } from '@playwright/test';

const PANEL_ID = 'monzphere-servicetree-panel';

test.describe('Service Tree Panel — smoke', () => {
  test('plugin is listed in /api/plugins', async ({ request }) => {
    const res = await request.get('/api/plugins');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const found = body.find((p: { id: string }) => p.id === PANEL_ID);
    expect(found).toBeDefined();
    expect(found.type).toBe('panel');
  });

  test('plugin renders empty state when added to a new dashboard with no query', async ({ page }) => {
    await page.goto('/login');
    if (await page.locator('input[name="user"]').isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.fill('input[name="user"]', process.env.GRAFANA_ADMIN_USER ?? 'admin');
      await page.fill('input[name="password"]', process.env.GRAFANA_ADMIN_PASSWORD ?? 'admin');
      await page.click('button[type="submit"]');
    }

    await page.goto('/dashboard/new');
    await page.getByRole('button', { name: /add visualization/i }).first().click({ trial: false }).catch(() => {});

    // Open the visualization picker and search for Service Tree
    const search = page.getByPlaceholder(/search for a visualization/i);
    if (await search.isVisible({ timeout: 5000 }).catch(() => false)) {
      await search.fill('Service Tree');
      await page.getByText(/^Service Tree$/).first().click();
    }

    await expect(page.getByTestId('service-tree-panel')).toBeVisible({ timeout: 15_000 });
  });
});

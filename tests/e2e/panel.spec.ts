import { test, expect } from '@grafana/plugin-e2e';

const PANEL_ID = 'monzphere-servicetree-panel';

test.describe('Service Tree Panel — smoke', () => {
  test('plugin is registered as a panel', async ({ request }) => {
    const res = await request.get(`/api/plugins/${PANEL_ID}/settings`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.id).toBe(PANEL_ID);
    expect(body.type).toBe('panel');
  });
});

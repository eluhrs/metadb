import { test, expect } from '@playwright/test';

// Because we cannot easily mock the whole Google OAuth flow in a standard Playwright test
// without significant mocking infrastructure or real test accounts, we test the UI boundaries 
// and auth protection for the import mechanisms.

test.describe('Collection Import Workflow', () => {

  test('New Collection UI should reject unauthenticated access', async ({ page }) => {
    await page.goto('/admin/collections/new');
    await expect(page).toHaveURL(/.*\/api\/auth\/signin.*/);
  });

  test('API /api/collections/import should reject unauthenticated POST', async ({ request }) => {
    const response = await request.post('/api/collections/import', {
      data: { sheetUrl: 'https://docs.google.com/test' }
    });
    // NextAuth returns 403 unauthorized for the basic server-side check
    expect(response.status()).toBe(403);
  });

});

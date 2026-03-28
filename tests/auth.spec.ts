import { test, expect } from '@playwright/test';

test.describe('Authentication and Routing', () => {

  test('Homepage should be accessible without authentication', async ({ page }) => {
    await page.goto('/');
    // Check for standard navigation items indicating an unauthenticated state
    await expect(page.locator('text=MetaDB').first()).toBeVisible();
    await expect(page.locator('text=Sign in with Google')).toBeVisible();
  });

  test('Protected route /collections should redirect to signin if unauthenticated', async ({ page }) => {
    await page.goto('/collections');
    // NextAuth middleware automatically redirects unauthenticated users to the default signin page
    await expect(page).toHaveURL(/.*\/api\/auth\/signin.*/);
  });

  test('Protected route /admin should redirect to signin if unauthenticated', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/.*\/api\/auth\/signin.*/);
  });

});

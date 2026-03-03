import { test, expect } from '@playwright/test';

test('navigate and check trips', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'test@test.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');

    // Go to trips screen directly
    await page.waitForURL('http://localhost:5173/');
    await page.goto('http://localhost:5173/trips');
    await page.waitForTimeout(1000);  // wait for fetchTrips

    // Capture screenshot and extract DOM
    await page.screenshot({ path: 'trips_state.png' });
    const html = await page.evaluate(() => document.body.innerHTML);
    console.log(html);
});

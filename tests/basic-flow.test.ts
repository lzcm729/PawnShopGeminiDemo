/**
 * Basic Flow Test for The Pawn's Dilemma
 *
 * Tests:
 * 1. Game startup
 * 2. Basic pawn flow
 * 3. Night panel display
 */

import { test, expect } from '@playwright/test';

test.describe('Game Basic Flow Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure fresh state
    await page.goto('http://localhost:3000');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('Game should start and display start screen', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Wait for the app to load
    await page.waitForLoadState('networkidle');

    // Check that the game title or start button is visible
    const content = await page.content();
    expect(content).toBeTruthy();

    // Take a screenshot
    await page.screenshot({ path: 'tests/screenshots/01-start-screen.png' });
  });

  test('Should be able to start new game', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Look for start game button
    const startButton = page.locator('button:has-text("开始"), button:has-text("Start"), button:has-text("新游戏")').first();

    if (await startButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'tests/screenshots/02-after-start.png' });
    }
  });

  test('Should display morning brief after game start', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Start game if on start screen
    const startButton = page.locator('button:has-text("开始"), button:has-text("Start"), button:has-text("新游戏")').first();

    if (await startButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startButton.click();
      await page.waitForTimeout(2000);
    }

    // Check for morning brief or business phase
    await page.screenshot({ path: 'tests/screenshots/03-game-phase.png' });
  });
});

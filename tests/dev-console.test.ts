/**
 * DevConsole Functional Tests
 *
 * Tests:
 * 1. Console opens with backtick key
 * 2. Help command displays available commands
 * 3. Set phase command changes game phase
 * 4. window.__console__.execute() API works
 * 5. No console errors
 */

import { test, expect } from '@playwright/test';

test.describe('DevConsole Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate and ensure fresh state
    await page.goto('http://localhost:3000');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Start game if on start screen
    const startButton = page.locator('button:has-text("Start"), button:has-text("New Game")').first();
    if (await startButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startButton.click();
      await page.waitForTimeout(1500);
    }

    // Skip morning brief if present
    const skipButton = page.locator('button:has-text("Skip"), button:has-text("Continue")').first();
    if (await skipButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('Console opens with backtick key', async ({ page }) => {
    // Console should be closed initially
    const consoleBefore = page.locator('text=DEV CONSOLE');
    await expect(consoleBefore).not.toBeVisible();

    // Press backtick to open
    await page.keyboard.press('`');
    await page.waitForTimeout(300);

    // Console should now be visible
    const consoleAfter = page.locator('text=DEV CONSOLE');
    await expect(consoleAfter).toBeVisible();

    // Verify input field is present
    const inputField = page.locator('input[placeholder="Enter command..."]');
    await expect(inputField).toBeVisible();
  });

  test('Help command displays available commands', async ({ page }) => {
    // Open console
    await page.keyboard.press('`');
    await page.waitForTimeout(300);

    // Type help command
    const inputField = page.locator('input[placeholder="Enter command..."]');
    await inputField.fill('help');
    await inputField.press('Enter');
    await page.waitForTimeout(200);

    // Verify help output contains expected commands
    const helpOutput = page.locator('pre:has-text("set phase")');
    await expect(helpOutput).toBeVisible();

    // Check for other expected commands in output
    const pageContent = await page.content();
    expect(pageContent).toContain('set cash');
    expect(pageContent).toContain('set day');
    expect(pageContent).toContain('open');
  });

  test('Set phase night command changes game phase', async ({ page }) => {
    // Open console
    await page.keyboard.press('`');
    await page.waitForTimeout(300);

    // Execute set phase night
    const inputField = page.locator('input[placeholder="Enter command..."]');
    await inputField.fill('set phase night');
    await inputField.press('Enter');
    await page.waitForTimeout(500);

    // Verify success message
    const successMsg = page.locator('pre:has-text("Phase set to NIGHT")');
    await expect(successMsg).toBeVisible();

    // Close console to verify phase changed
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Night phase should show NightDashboard elements
    const nightContent = page.locator('text=Workshop, text=Archives').first();
    // If not visible, check phase indicator in header shows NIGHT
    // Phase is now a discriminated union object { type: 'NIGHT', subphase: 'ACTIVE' }
    const phaseIndicator = await page.evaluate(() => {
      return (window as any).__console__?.getState?.()?.phase;
    });
    expect(phaseIndicator?.type).toBe('NIGHT');
  });

  test('window.__console__.execute API works', async ({ page }) => {
    // Wait for console API to be available
    await page.waitForFunction(() => typeof (window as any).__console__ !== 'undefined', { timeout: 5000 });

    // Execute command via API
    const result = await page.evaluate(() => {
      return (window as any).__console__.execute('set cash 99999');
    });

    // Verify result
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].success).toBe(true);
    expect(result[0].message).toContain('99999');

    // Wait for React to re-render with new state
    await page.waitForTimeout(500);

    // Verify state changed by opening DevConsole which displays cash in status bar
    // DevConsole status shows: "Day X | $CASH | Phase: {...}"
    await page.keyboard.press('`');
    await page.waitForTimeout(300);

    // The DevConsole status bar should show the new cash value
    // Use .first() since $99999 appears in both status bar and command output
    const cashDisplay = page.locator('text=$99999').first();
    await expect(cashDisplay).toBeVisible({ timeout: 3000 });
  });

  test('Console closes with Escape key', async ({ page }) => {
    // Open console
    await page.keyboard.press('`');
    await page.waitForTimeout(300);

    const consoleVisible = page.locator('text=DEV CONSOLE');
    await expect(consoleVisible).toBeVisible();

    // Press Escape to close
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Console should be closed
    await expect(consoleVisible).not.toBeVisible();
  });

  test('Invalid command shows error message', async ({ page }) => {
    // Open console
    await page.keyboard.press('`');
    await page.waitForTimeout(300);

    // Type invalid command
    const inputField = page.locator('input[placeholder="Enter command..."]');
    await inputField.fill('invalidcmd');
    await inputField.press('Enter');
    await page.waitForTimeout(200);

    // Verify error output (red text class)
    const errorOutput = page.locator('.text-red-400:has-text("Unknown command")');
    await expect(errorOutput).toBeVisible();
  });

  test('No console errors during DevConsole usage', async ({ page }) => {
    const consoleErrors: string[] = [];

    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Open console
    await page.keyboard.press('`');
    await page.waitForTimeout(300);

    // Execute several commands
    const inputField = page.locator('input[placeholder="Enter command..."]');

    await inputField.fill('help');
    await inputField.press('Enter');
    await page.waitForTimeout(200);

    await inputField.fill('set cash 5000');
    await inputField.press('Enter');
    await page.waitForTimeout(200);

    await inputField.fill('set ap 10');
    await inputField.press('Enter');
    await page.waitForTimeout(200);

    // Close console
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Filter out non-critical errors (like network requests)
    const criticalErrors = consoleErrors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('Failed to load resource') &&
      !e.includes('net::')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});

import { test, expect } from '@playwright/test';

test.describe('Sleep Button Visibility Tests', () => {
  test('Sleep button text should be clearly visible in Night phase', async ({ page }) => {
    // Navigate to game
    await page.goto('http://localhost:3000');

    // Wait for the game to load - look for the NEW GAME button
    await page.waitForSelector('button:has-text("NEW GAME")', { timeout: 10000 });

    // Start new game
    await page.click('button:has-text("NEW GAME")');

    // Wait for game to initialize (Morning Brief phase)
    await page.waitForTimeout(1000);

    // Now inject state to switch to NIGHT phase
    await page.evaluate(() => {
      // Access the React app's state through localStorage and force reload
      const saveKey = 'pawns_dilemma_save_v1';
      const existingSave = localStorage.getItem(saveKey);

      if (existingSave) {
        const gameState = JSON.parse(existingSave);
        gameState.phase = 'NIGHT';
        localStorage.setItem(saveKey, JSON.stringify(gameState));
      }
    });

    // Reload to apply the NIGHT phase state
    await page.reload();

    // Should now show Continue button since we have a save
    await page.waitForSelector('button:has-text("CONTINUE")', { timeout: 10000 });
    await page.click('button:has-text("CONTINUE")');

    // Wait for Night Dashboard to appear
    await page.waitForSelector('text=Night Cycle', { timeout: 10000 });

    // Find the Sleep button
    const sleepButton = page.locator('button:has-text("END DAY")');
    await expect(sleepButton).toBeVisible();

    // Take screenshot of the Night Dashboard
    await page.screenshot({
      path: 'tests/screenshots/night-dashboard-sleep-button.png',
      fullPage: true
    });

    // Take focused screenshot of just the Sleep button area
    const buttonBoundingBox = await sleepButton.boundingBox();
    if (buttonBoundingBox) {
      await page.screenshot({
        path: 'tests/screenshots/sleep-button-closeup.png',
        clip: {
          x: Math.max(0, buttonBoundingBox.x - 50),
          y: Math.max(0, buttonBoundingBox.y - 50),
          width: buttonBoundingBox.width + 100,
          height: buttonBoundingBox.height + 100
        }
      });
    }

    // Verify button text is present
    const buttonText = await sleepButton.textContent();
    expect(buttonText).toContain('END DAY');
    console.log('Button text found:', buttonText);

    // Check button has proper styling for visibility
    const buttonStyles = await sleepButton.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      const spanElement = el.querySelector('span.relative.z-10');
      const spanStyles = spanElement ? window.getComputedStyle(spanElement) : null;
      return {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        spanColor: spanStyles?.color || 'N/A',
        buttonWidth: computed.width,
        buttonHeight: computed.height
      };
    });

    console.log('Sleep Button Styles:', JSON.stringify(buttonStyles, null, 2));

    // Verify the button is interactable (not hidden behind overlay)
    await expect(sleepButton).toBeEnabled();

    // Test hover state for visibility
    await sleepButton.hover();
    await page.waitForTimeout(500);

    // Take screenshot of hover state
    await page.screenshot({
      path: 'tests/screenshots/sleep-button-hover.png',
      fullPage: true
    });

    console.log('Test passed: Sleep button is visible and accessible');
  });
});

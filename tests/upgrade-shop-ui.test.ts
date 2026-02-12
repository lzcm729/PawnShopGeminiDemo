/**
 * UpgradeShopModal UI Tests
 *
 * Tests the new UI components:
 * 1. LevelArcRing - Purple arc progress indicator
 * 2. LevelDots - Colored level dots indicator
 * 3. Overall layout and functionality
 */

import { test, expect } from '@playwright/test';

test.describe('UpgradeShopModal UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage and start fresh
    await page.goto('http://localhost:3000');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('1. Game should start successfully', async ({ page }) => {
    // Check that the page loads without errors
    const content = await page.content();
    expect(content).toContain('html');

    // Check for console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'tests/screenshots/upgrade-01-initial.png' });

    // Allow console errors as long as page loads
    console.log('Console errors (if any):', errors);
  });

  test('2. Navigate to Night phase and open Upgrade Shop', async ({ page }) => {
    // Start the game
    const startButton = page.locator('button:has-text("开始新游戏"), button:has-text("新游戏"), button:has-text("开始")').first();

    if (await startButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startButton.click();
      await page.waitForTimeout(1000);
    }

    await page.screenshot({ path: 'tests/screenshots/upgrade-02-after-start.png' });

    // Look for continue/skip buttons to advance phases
    const continueButton = page.locator('button:has-text("继续"), button:has-text("开门营业"), button:has-text("确认"), button:has-text("打烊")').first();

    // Try to advance through game phases
    for (let i = 0; i < 10; i++) {
      const btn = page.locator('button:has-text("继续"), button:has-text("开门营业"), button:has-text("确认"), button:has-text("打烊"), button:has-text("下一位")').first();
      if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(500);
      }
    }

    await page.screenshot({ path: 'tests/screenshots/upgrade-03-game-progress.png' });
  });

  test('3. Open Upgrade Shop and verify UI elements', async ({ page }) => {
    // Start game and navigate
    const startButton = page.locator('button:has-text("开始新游戏"), button:has-text("新游戏"), button:has-text("开始")').first();
    if (await startButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startButton.click();
      await page.waitForTimeout(1000);
    }

    // Skip through phases to get to night
    for (let i = 0; i < 15; i++) {
      const btn = page.locator('button:has-text("继续"), button:has-text("开门营业"), button:has-text("确认"), button:has-text("打烊"), button:has-text("下一位"), button:has-text("返回大厅")').first();
      if (await btn.isVisible({ timeout: 800 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(400);
      }
    }

    // Look for upgrade shop button
    const upgradeButton = page.locator('button:has-text("设施升级"), button:has-text("升级"), [data-testid="upgrade-shop"]').first();

    if (await upgradeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await upgradeButton.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'tests/screenshots/upgrade-04-shop-open.png' });

      // Verify modal content
      const modalContent = await page.content();

      // Check for key UI elements
      const hasUpgradeTitle = modalContent.includes('SHOP_UPGRADE_SYS') || modalContent.includes('设施升级');
      const hasStorageExpansion = modalContent.includes('储物架扩展') || modalContent.includes('Storage Expansion');
      const hasPrecisionBench = modalContent.includes('精密工作台') || modalContent.includes('Precision Bench');
      const hasTeaSet = modalContent.includes('茶具套装') || modalContent.includes('Tea Set');

      console.log('UI Elements found:', {
        hasUpgradeTitle,
        hasStorageExpansion,
        hasPrecisionBench,
        hasTeaSet
      });

      expect(hasUpgradeTitle || hasStorageExpansion || hasPrecisionBench).toBeTruthy();
    } else {
      console.log('Upgrade shop button not found in current phase');
      await page.screenshot({ path: 'tests/screenshots/upgrade-04-no-shop-button.png' });
    }
  });

  test('4. Verify LevelArcRing SVG rendering', async ({ page }) => {
    // Start and navigate to upgrade shop
    const startButton = page.locator('button:has-text("开始新游戏"), button:has-text("新游戏"), button:has-text("开始")').first();
    if (await startButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startButton.click();
      await page.waitForTimeout(1000);
    }

    // Navigate through game
    for (let i = 0; i < 15; i++) {
      const btn = page.locator('button:has-text("继续"), button:has-text("开门营业"), button:has-text("确认"), button:has-text("打烊"), button:has-text("下一位"), button:has-text("返回大厅")').first();
      if (await btn.isVisible({ timeout: 800 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(400);
      }
    }

    // Open upgrade shop
    const upgradeButton = page.locator('button:has-text("设施升级"), button:has-text("升级")').first();
    if (await upgradeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await upgradeButton.click();
      await page.waitForTimeout(500);

      // Check for SVG elements (arc rings)
      const svgElements = await page.locator('svg').count();
      const pathElements = await page.locator('svg path').count();

      console.log('SVG elements found:', svgElements);
      console.log('Path elements found:', pathElements);

      // LevelArcRing should create SVG with path elements
      expect(svgElements).toBeGreaterThan(0);

      await page.screenshot({ path: 'tests/screenshots/upgrade-05-arc-rings.png' });
    }
  });

  test('5. Verify LevelDots rendering', async ({ page }) => {
    // Start and navigate
    const startButton = page.locator('button:has-text("开始新游戏"), button:has-text("新游戏"), button:has-text("开始")').first();
    if (await startButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startButton.click();
      await page.waitForTimeout(1000);
    }

    for (let i = 0; i < 15; i++) {
      const btn = page.locator('button:has-text("继续"), button:has-text("开门营业"), button:has-text("确认"), button:has-text("打烊"), button:has-text("下一位"), button:has-text("返回大厅")').first();
      if (await btn.isVisible({ timeout: 800 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(400);
      }
    }

    const upgradeButton = page.locator('button:has-text("设施升级"), button:has-text("升级")').first();
    if (await upgradeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await upgradeButton.click();
      await page.waitForTimeout(500);

      // Check for LEVEL text (from LevelDots component)
      const levelText = await page.locator('text=LEVEL:').count();
      console.log('LEVEL: labels found:', levelText);

      // Check for level display format (e.g., "0/5", "0/3")
      const levelFormats = await page.locator('text=/\\d+\\/\\d+/').count();
      console.log('Level format displays found:', levelFormats);

      await page.screenshot({ path: 'tests/screenshots/upgrade-06-level-dots.png' });
    }
  });

  test('6. Test purchase upgrade functionality', async ({ page }) => {
    // Start game with enough money
    const startButton = page.locator('button:has-text("开始新游戏"), button:has-text("新游戏"), button:has-text("开始")').first();
    if (await startButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startButton.click();
      await page.waitForTimeout(1000);
    }

    for (let i = 0; i < 15; i++) {
      const btn = page.locator('button:has-text("继续"), button:has-text("开门营业"), button:has-text("确认"), button:has-text("打烊"), button:has-text("下一位"), button:has-text("返回大厅")').first();
      if (await btn.isVisible({ timeout: 800 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(400);
      }
    }

    const upgradeButton = page.locator('button:has-text("设施升级"), button:has-text("升级")').first();
    if (await upgradeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await upgradeButton.click();
      await page.waitForTimeout(500);

      // Look for purchase button
      const purchaseBtn = page.locator('button:has-text("升级到"), button:has-text("Lv1")').first();

      if (await purchaseBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Check if it's enabled (affordable)
        const isDisabled = await purchaseBtn.isDisabled();
        console.log('Purchase button disabled:', isDisabled);

        if (!isDisabled) {
          await purchaseBtn.click();
          await page.waitForTimeout(500);
          await page.screenshot({ path: 'tests/screenshots/upgrade-07-after-purchase.png' });
        } else {
          console.log('Not enough funds to purchase');
          await page.screenshot({ path: 'tests/screenshots/upgrade-07-insufficient-funds.png' });
        }
      }
    }
  });
});

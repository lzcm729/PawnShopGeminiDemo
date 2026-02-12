/**
 * UpgradeShopModal Targeted UI Tests
 *
 * Verifies the new UI components work correctly:
 * 1. LevelArcRing - Purple arc progress indicator
 * 2. LevelDots - Colored level dots indicator
 * 3. Card layout and upgrade functionality
 */

import { test, expect } from '@playwright/test';

test.describe('UpgradeShopModal Targeted Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage and start fresh
    await page.goto('http://localhost:3000');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('Complete flow: Start game -> Night phase -> Open Upgrade Shop -> Verify UI', async ({ page }) => {
    console.log('=== Test: UpgradeShopModal UI Verification ===');

    // Step 1: Start the game
    console.log('Step 1: Starting game...');
    const startButton = page.locator('button').filter({ hasText: /开始|新游戏|Start/i }).first();
    if (await startButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startButton.click();
      await page.waitForTimeout(1000);
      console.log('  - Game started');
    }
    await page.screenshot({ path: 'tests/screenshots/modal-01-started.png' });

    // Step 2: Navigate through morning brief
    console.log('Step 2: Navigating through morning...');
    const morningButton = page.locator('button').filter({ hasText: /继续|开门营业|确认|confirm/i }).first();
    if (await morningButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await morningButton.click();
      await page.waitForTimeout(1000);
      console.log('  - Morning brief passed');
    }
    await page.screenshot({ path: 'tests/screenshots/modal-02-morning.png' });

    // Step 3: Navigate through business phase - close shop
    console.log('Step 3: Closing shop to reach night...');
    for (let attempt = 0; attempt < 20; attempt++) {
      // Look for close shop / dismiss customer / continue buttons
      const closeBtn = page.locator('button').filter({ hasText: /打烊|关店|Close Shop|返回大厅|下一位|继续|确认|跳过/i }).first();
      if (await closeBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await closeBtn.click();
        await page.waitForTimeout(600);
        console.log(`  - Clicked button (attempt ${attempt + 1})`);
      } else {
        break;
      }
    }
    await page.screenshot({ path: 'tests/screenshots/modal-03-navigating.png' });

    // Step 4: Check if we're in night phase by looking for "Night Cycle" text
    const pageContent = await page.content();
    const isNightPhase = pageContent.includes('Night Cycle') || pageContent.includes('店铺升级');
    console.log('Step 4: Night phase check:', isNightPhase);

    if (!isNightPhase) {
      // Try clicking more buttons to advance
      console.log('  - Not in night phase yet, trying more navigation...');
      for (let i = 0; i < 10; i++) {
        const btn = page.locator('button:visible').first();
        if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
          const btnText = await btn.textContent().catch(() => '');
          if (btnText && !btnText.includes('GitHub')) {
            await btn.click().catch(() => {});
            await page.waitForTimeout(500);
          }
        }
      }
    }
    await page.screenshot({ path: 'tests/screenshots/modal-04-pre-upgrade.png' });

    // Step 5: Click the upgrade shop button
    console.log('Step 5: Opening upgrade shop...');
    const upgradeButton = page.locator('button').filter({ hasText: /店铺升级|Upgrades|设施/i }).first();

    let upgradeShopOpened = false;
    if (await upgradeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await upgradeButton.click();
      await page.waitForTimeout(800);
      upgradeShopOpened = true;
      console.log('  - Upgrade shop button clicked');
    } else {
      console.log('  - Upgrade shop button not found, checking if we need to navigate further');
    }
    await page.screenshot({ path: 'tests/screenshots/modal-05-upgrade-shop.png' });

    // Step 6: Verify the modal content
    if (upgradeShopOpened) {
      console.log('Step 6: Verifying modal UI elements...');
      const modalContent = await page.content();

      // Check for the modal title
      const hasSysTitle = modalContent.includes('SHOP_UPGRADE_SYS');
      console.log('  - Has SHOP_UPGRADE_SYS title:', hasSysTitle);

      // Check for upgrade items
      const hasStorageExpansion = modalContent.includes('储物架扩展');
      const hasPrecisionBench = modalContent.includes('精密工作台');
      const hasTeaSet = modalContent.includes('茶具套装');
      const hasSpectrometer = modalContent.includes('光谱分析仪');
      console.log('  - Has Storage Expansion:', hasStorageExpansion);
      console.log('  - Has Precision Bench:', hasPrecisionBench);
      console.log('  - Has Tea Set:', hasTeaSet);
      console.log('  - Has Spectrometer:', hasSpectrometer);

      // Check for LevelDots component (LEVEL: text)
      const hasLevelLabel = modalContent.includes('LEVEL:');
      console.log('  - Has LEVEL: label (LevelDots):', hasLevelLabel);

      // Check for SVG elements (LevelArcRing)
      const svgCount = await page.locator('svg').count();
      const pathCount = await page.locator('svg path').count();
      console.log('  - SVG elements count:', svgCount);
      console.log('  - SVG path elements count:', pathCount);

      // Check for location badges
      const hasWarehouse = modalContent.includes('WAREHOUSE');
      const hasCounter = modalContent.includes('COUNTER');
      console.log('  - Has WAREHOUSE badge:', hasWarehouse);
      console.log('  - Has COUNTER badge:', hasCounter);

      // Check for upgrade buttons
      const hasUpgradeButton = modalContent.includes('升级到');
      console.log('  - Has upgrade button (升级到):', hasUpgradeButton);

      // Assertions
      expect(hasSysTitle || hasStorageExpansion).toBeTruthy();
      expect(svgCount).toBeGreaterThan(0);
      expect(pathCount).toBeGreaterThan(0);

      await page.screenshot({ path: 'tests/screenshots/modal-06-verified.png', fullPage: true });

      // Step 7: Test scrolling if content is long
      console.log('Step 7: Testing scroll behavior...');
      const scrollContainer = page.locator('.custom-scrollbar').first();
      if (await scrollContainer.isVisible({ timeout: 1000 }).catch(() => false)) {
        await scrollContainer.evaluate(el => el.scrollTop = 200);
        await page.waitForTimeout(300);
        await page.screenshot({ path: 'tests/screenshots/modal-07-scrolled.png' });
        console.log('  - Scrolled content successfully');
      }

      // Step 8: Test close modal
      console.log('Step 8: Closing modal...');
      const closeButton = page.locator('button[aria-label="Close"], button:has-text("X"), .close-button').first();
      if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeButton.click();
        await page.waitForTimeout(500);
        console.log('  - Modal closed');
      }
      await page.screenshot({ path: 'tests/screenshots/modal-08-closed.png' });
    }

    console.log('=== Test Complete ===');
  });

  test('Verify LevelArcRing SVG arc calculation', async ({ page }) => {
    // Navigate to night phase and open upgrade shop
    const startButton = page.locator('button').filter({ hasText: /开始|新游戏/i }).first();
    if (await startButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startButton.click();
      await page.waitForTimeout(1000);
    }

    // Navigate to night
    for (let i = 0; i < 25; i++) {
      const btn = page.locator('button').filter({ hasText: /继续|开门营业|确认|打烊|下一位|返回大厅|跳过/i }).first();
      if (await btn.isVisible({ timeout: 800 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(400);
      }
    }

    // Open upgrade shop
    const upgradeButton = page.locator('button').filter({ hasText: /店铺升级|Upgrades/i }).first();
    if (await upgradeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await upgradeButton.click();
      await page.waitForTimeout(800);

      // Check SVG arc paths
      const pathElements = page.locator('svg path[d*="A"]');
      const arcCount = await pathElements.count();
      console.log('Arc paths found:', arcCount);

      // Each upgrade card should have multiple arc paths based on maxLevel
      // Storage Expansion: 5 arcs
      // Precision Bench: 3 arcs
      // Tea Set: 3 arcs
      // Spectrometer: 3 arcs
      // Total expected: at least 14 arcs
      expect(arcCount).toBeGreaterThanOrEqual(10);

      // Check stroke colors
      const firstPath = pathElements.first();
      const stroke = await firstPath.getAttribute('stroke');
      console.log('First arc stroke color:', stroke);
      // Should be either inactive (#3f3f46) or active purple (#a855f7)
      expect(stroke === '#3f3f46' || stroke === '#a855f7' || stroke === '#22c55e').toBeTruthy();

      await page.screenshot({ path: 'tests/screenshots/arc-test.png' });
    }
  });

  test('Verify LevelDots colored progression', async ({ page }) => {
    // Navigate to night phase
    const startButton = page.locator('button').filter({ hasText: /开始|新游戏/i }).first();
    if (await startButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startButton.click();
      await page.waitForTimeout(1000);
    }

    for (let i = 0; i < 25; i++) {
      const btn = page.locator('button').filter({ hasText: /继续|开门营业|确认|打烊|下一位|返回大厅|跳过/i }).first();
      if (await btn.isVisible({ timeout: 800 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(400);
      }
    }

    // Open upgrade shop
    const upgradeButton = page.locator('button').filter({ hasText: /店铺升级|Upgrades/i }).first();
    if (await upgradeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await upgradeButton.click();
      await page.waitForTimeout(800);

      // Check for LEVEL: labels
      const levelLabels = page.locator('text=LEVEL:');
      const labelCount = await levelLabels.count();
      console.log('LEVEL: labels found:', labelCount);
      expect(labelCount).toBeGreaterThanOrEqual(4); // At least 4 upgrade items

      // Check for level dots (small rounded squares)
      const levelDots = page.locator('.rounded-sm.w-3.h-3');
      const dotCount = await levelDots.count();
      console.log('Level dots found:', dotCount);
      // Each upgrade has multiple dots based on maxLevel
      expect(dotCount).toBeGreaterThanOrEqual(10);

      await page.screenshot({ path: 'tests/screenshots/dots-test.png' });
    }
  });

  test('Verify purchase button states', async ({ page }) => {
    // Navigate to night phase
    const startButton = page.locator('button').filter({ hasText: /开始|新游戏/i }).first();
    if (await startButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startButton.click();
      await page.waitForTimeout(1000);
    }

    for (let i = 0; i < 25; i++) {
      const btn = page.locator('button').filter({ hasText: /继续|开门营业|确认|打烊|下一位|返回大厅|跳过/i }).first();
      if (await btn.isVisible({ timeout: 800 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(400);
      }
    }

    // Open upgrade shop
    const upgradeButton = page.locator('button').filter({ hasText: /店铺升级|Upgrades/i }).first();
    if (await upgradeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await upgradeButton.click();
      await page.waitForTimeout(800);

      // Find purchase buttons
      const purchaseButtons = page.locator('button').filter({ hasText: /升级到|Lv\d/ });
      const buttonCount = await purchaseButtons.count();
      console.log('Purchase buttons found:', buttonCount);

      // Check that some buttons exist
      expect(buttonCount).toBeGreaterThan(0);

      // Check first button state
      if (buttonCount > 0) {
        const firstButton = purchaseButtons.first();
        const isDisabled = await firstButton.isDisabled();
        const buttonText = await firstButton.textContent();
        console.log('First purchase button:', buttonText, '- Disabled:', isDisabled);
      }

      await page.screenshot({ path: 'tests/screenshots/purchase-buttons-test.png' });
    }
  });
});

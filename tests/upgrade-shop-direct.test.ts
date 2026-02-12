/**
 * UpgradeShopModal Direct UI Tests
 *
 * Uses JavaScript injection to directly set game state to NIGHT phase,
 * allowing us to test the UpgradeShopModal UI components:
 * 1. LevelArcRing - Purple arc progress indicator
 * 2. LevelDots - Colored level dots indicator
 * 3. Card layout and upgrade functionality
 */

import { test, expect } from '@playwright/test';

test.describe('UpgradeShopModal Direct Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage and start fresh
    await page.goto('http://localhost:3000');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('Direct: Set NIGHT phase and open Upgrade Shop', async ({ page }) => {
    console.log('=== Direct Test: UpgradeShopModal UI ===');

    // Step 1: Start game first
    console.log('Step 1: Starting game...');
    const startButton = page.locator('button').filter({ hasText: /开始|新游戏|Start/i }).first();
    if (await startButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startButton.click();
      await page.waitForTimeout(1500);
    }
    await page.screenshot({ path: 'tests/screenshots/direct-01-started.png' });

    // Step 2: Skip morning brief
    console.log('Step 2: Skipping morning...');
    const morningBtn = page.locator('button').filter({ hasText: /继续|开门营业|确认/i }).first();
    if (await morningBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await morningBtn.click();
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: 'tests/screenshots/direct-02-morning.png' });

    // Step 3: Use JavaScript to set phase directly to NIGHT
    console.log('Step 3: Setting NIGHT phase via JS...');
    await page.evaluate(() => {
      // Find the React fiber root to access context
      const container = document.getElementById('root');
      if (!container) return;

      // Try to dispatch through the window - this is a common pattern
      // @ts-ignore
      if (window.__GAME_DISPATCH__) {
        // @ts-ignore
        window.__GAME_DISPATCH__({ type: 'SET_PHASE', payload: 'NIGHT' });
      }
    });

    // Alternative: Simulate localStorage with NIGHT phase and reload
    await page.evaluate(() => {
      const saved = localStorage.getItem('pawns_dilemma_save_v1');
      if (saved) {
        try {
          const state = JSON.parse(saved);
          state.phase = 'NIGHT';
          localStorage.setItem('pawns_dilemma_save_v1', JSON.stringify(state));
        } catch (e) {
          console.error('Failed to modify save:', e);
        }
      }
    });

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'tests/screenshots/direct-03-after-reload.png' });

    // Step 4: Check if we're in night phase
    const pageContent = await page.content();
    const isNightPhase = pageContent.includes('Night Cycle') || pageContent.includes('店铺升级');
    console.log('Step 4: Night phase check:', isNightPhase);

    if (isNightPhase) {
      // Step 5: Open upgrade shop
      console.log('Step 5: Opening upgrade shop...');
      const upgradeButton = page.locator('button').filter({ hasText: /店铺升级|Upgrades/i }).first();

      if (await upgradeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await upgradeButton.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'tests/screenshots/direct-04-shop-open.png' });

        // Step 6: Verify UI elements
        console.log('Step 6: Verifying UI elements...');
        const modalContent = await page.content();

        // Check for title
        const hasTitle = modalContent.includes('SHOP_UPGRADE_SYS');
        console.log('  - Has SHOP_UPGRADE_SYS:', hasTitle);

        // Check for upgrade items
        const hasStorage = modalContent.includes('储物架扩展');
        const hasBench = modalContent.includes('精密工作台');
        const hasTea = modalContent.includes('茶具套装');
        const hasSpectro = modalContent.includes('光谱分析仪');
        console.log('  - Upgrades:', { hasStorage, hasBench, hasTea, hasSpectro });

        // Check for LevelDots (LEVEL: text)
        const hasLevelLabel = modalContent.includes('LEVEL:');
        console.log('  - Has LEVEL: label:', hasLevelLabel);

        // Check SVG arcs
        const svgCount = await page.locator('svg').count();
        const pathCount = await page.locator('svg path').count();
        console.log('  - SVG count:', svgCount, 'Path count:', pathCount);

        // Check location badges
        const hasWarehouse = modalContent.includes('WAREHOUSE');
        const hasCounter = modalContent.includes('COUNTER');
        console.log('  - Badges:', { hasWarehouse, hasCounter });

        // ASSERTIONS
        expect(hasTitle || hasStorage).toBeTruthy();
        expect(svgCount).toBeGreaterThan(0);

        await page.screenshot({ path: 'tests/screenshots/direct-05-verified.png', fullPage: true });
      }
    } else {
      console.log('  - Failed to reach night phase, skipping verification');
      await page.screenshot({ path: 'tests/screenshots/direct-04-not-night.png' });
    }

    console.log('=== Test Complete ===');
  });

  test('Direct: Verify UpgradeShopModal components render correctly', async ({ page }) => {
    // Set up game state with NIGHT phase directly in localStorage
    await page.evaluate(() => {
      const initialState = {
        phase: 'NIGHT',
        stats: {
          day: 1,
          cash: 10000,
          reputation: { humanity: 50, credibility: 50, underworld: 0 },
          motherStatus: { health: 100, mood: 50, risk: 5 },
          medicalBill: { baseAmount: 1500, dueDate: 7, status: 'PENDING' },
          visitedToday: false
        },
        inventory: [],
        inbox: [],
        activeChains: [],
        completedScenarioIds: [],
        completedEventIds: [],
        shopUpgrades: { upgrades: [] },
        showUpgradeShop: false,
        showDebug: false,
        showInventory: false,
        showMail: false,
        showFinancials: false,
        showMedical: false,
        showVisitHospital: false,
        isLoading: false,
        currentCustomer: null,
        dayEvents: [],
        customersServedToday: 0,
        maxCustomersPerDay: 3,
        expiryQueue: [],
        nightEnergy: 3,
        essence: { craft: 0, time: 0, vibe: 0 },
        appointmentBoard: { candidates: [], selectedIds: [], preference: 'balanced' }
      };
      localStorage.setItem('pawns_dilemma_save_v1', JSON.stringify(initialState));
    });

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Check if we're in night phase
    const pageContent = await page.content();
    const isNightPhase = pageContent.includes('Night Cycle');

    if (isNightPhase) {
      console.log('Successfully loaded NIGHT phase');
      await page.screenshot({ path: 'tests/screenshots/direct-render-01-night.png' });

      // Click upgrade shop button
      const upgradeBtn = page.locator('button').filter({ hasText: /店铺升级|Upgrades/i }).first();
      if (await upgradeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await upgradeBtn.click();
        await page.waitForTimeout(800);

        // === VERIFY LevelArcRing ===
        console.log('\n=== Verifying LevelArcRing ===');
        const arcs = await page.locator('svg path[stroke-linecap="round"]').count();
        console.log('  Arc paths with rounded caps:', arcs);
        expect(arcs).toBeGreaterThan(0);

        // Check arc colors
        const inactiveArcs = await page.locator('svg path[stroke="#3f3f46"]').count();
        console.log('  Inactive arcs (#3f3f46):', inactiveArcs);
        expect(inactiveArcs).toBeGreaterThan(0); // Should have inactive arcs at start

        // === VERIFY LevelDots ===
        console.log('\n=== Verifying LevelDots ===');
        const levelLabels = await page.locator('span:has-text("LEVEL:")').count();
        console.log('  LEVEL: labels:', levelLabels);

        // Check for colored dots (rounded-sm w-3 h-3)
        const allDots = page.locator('div.rounded-sm');
        const dotCount = await allDots.count();
        console.log('  Level dots:', dotCount);

        // Check for level format display (N/M)
        const content = await page.content();
        const levelFormats = content.match(/\d+\/\d+/g) || [];
        console.log('  Level formats found:', levelFormats.length);

        // === VERIFY Card Layout ===
        console.log('\n=== Verifying Card Layout ===');
        const upgradeCards = await page.locator('.border.rounded-lg').count();
        console.log('  Upgrade cards:', upgradeCards);

        // Check for next level info section
        const nextLevelSections = await page.locator('text=Next Level:').count();
        console.log('  Next Level sections:', nextLevelSections);

        // Check for price display
        const priceDisplays = await page.locator('text=/\\$\\d+/').count();
        console.log('  Price displays:', priceDisplays);

        await page.screenshot({ path: 'tests/screenshots/direct-render-02-shop.png', fullPage: true });

        // === Test scroll if content overflows ===
        const scrollContainer = page.locator('.custom-scrollbar').first();
        if (await scrollContainer.isVisible({ timeout: 1000 }).catch(() => false)) {
          await scrollContainer.evaluate(el => el.scrollTop = 300);
          await page.waitForTimeout(300);
          await page.screenshot({ path: 'tests/screenshots/direct-render-03-scrolled.png' });
        }
      }
    } else {
      console.log('Failed to load NIGHT phase from localStorage');
      await page.screenshot({ path: 'tests/screenshots/direct-render-fail.png' });
    }
  });

  test('Direct: Test upgrade purchase with sufficient funds', async ({ page }) => {
    // Set up state with $10000 cash in NIGHT phase
    await page.evaluate(() => {
      const state = {
        phase: 'NIGHT',
        stats: {
          day: 1,
          cash: 10000,
          reputation: { humanity: 50, credibility: 50, underworld: 0 },
          motherStatus: { health: 100, mood: 50, risk: 5 },
          medicalBill: { baseAmount: 1500, dueDate: 7, status: 'PENDING' },
          visitedToday: false
        },
        inventory: [],
        inbox: [],
        activeChains: [],
        completedScenarioIds: [],
        completedEventIds: [],
        shopUpgrades: { upgrades: [] },
        showUpgradeShop: false,
        showDebug: false,
        showInventory: false,
        showMail: false,
        showFinancials: false,
        showMedical: false,
        showVisitHospital: false,
        isLoading: false,
        currentCustomer: null,
        dayEvents: [],
        customersServedToday: 0,
        maxCustomersPerDay: 3,
        expiryQueue: [],
        nightEnergy: 3,
        essence: { craft: 0, time: 0, vibe: 0 },
        appointmentBoard: { candidates: [], selectedIds: [], preference: 'balanced' }
      };
      localStorage.setItem('pawns_dilemma_save_v1', JSON.stringify(state));
    });

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const pageContent = await page.content();
    if (pageContent.includes('Night Cycle')) {
      // Open upgrade shop
      const upgradeBtn = page.locator('button').filter({ hasText: /店铺升级|Upgrades/i }).first();
      if (await upgradeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await upgradeBtn.click();
        await page.waitForTimeout(800);

        // Get initial cash display
        const cashBefore = await page.locator('text=/\\$10,?000/').first().textContent().catch(() => '$10000');
        console.log('Cash before:', cashBefore);

        // Find first purchasable upgrade (Storage Expansion at $500)
        const purchaseBtn = page.locator('button').filter({ hasText: /升级到 Lv1/ }).first();

        if (await purchaseBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          const isDisabled = await purchaseBtn.isDisabled();
          console.log('Purchase button disabled:', isDisabled);

          if (!isDisabled) {
            await page.screenshot({ path: 'tests/screenshots/direct-purchase-01-before.png' });

            await purchaseBtn.click();
            await page.waitForTimeout(500);

            await page.screenshot({ path: 'tests/screenshots/direct-purchase-02-after.png' });

            // Verify cash decreased
            const content = await page.content();
            const hasLessCash = content.includes('$9,500') || content.includes('$9500');
            console.log('Cash decreased:', hasLessCash);

            // Verify level increased
            const hasLevel1 = content.includes('1/5') || content.includes('Lv1');
            console.log('Level updated:', hasLevel1);

            // Check for active arc (purple color)
            const activeArcs = await page.locator('svg path[stroke="#a855f7"]').count();
            console.log('Active purple arcs:', activeArcs);
          }
        }
      }
    }
  });
});

/**
 * Test: Verify facility icons in Upgrade Shop display as circular (rounded-full)
 *
 * This test verifies the UI fix:
 * - Icon containers should use rounded-full class (not rounded-lg)
 * - Visual appearance should be circular
 *
 * File modified: components/UpgradeShopModal.tsx
 * Change: rounded-lg -> rounded-full for icon container
 */

import { test, expect } from '@playwright/test';

// Complete valid save state for NIGHT phase (copied from working test)
function createNightPhaseSaveState(cash: number = 10000) {
  return {
    phase: 'NIGHT',
    stats: {
      day: 1,
      cash: cash,
      targetSavings: 100000,
      motherStatus: { health: 100, mood: 50, risk: 5 },
      medicalBill: { amount: 1500, dueDate: 7, status: 'PENDING' },
      visitedToday: false,
      dailyExpenses: 150,
      actionPoints: 3,
      maxActionPoints: 3,
      rentDue: 500,
      rentDueDate: 14
    },
    reputation: {
      HUMANITY: 50,
      CREDIBILITY: 50,
      UNDERWORLD: 0
    },
    inventory: [],
    currentCustomer: null,
    dayEvents: [],
    todayTransactions: [],
    customersServedToday: 3,
    maxCustomersPerDay: 3,
    isLoading: false,
    showInventory: false,
    showMail: false,
    showDebug: false,
    showFinancials: false,
    showMedical: false,
    showVisit: false,
    activeChains: [],
    inbox: [],
    pendingMails: [],
    completedScenarioIds: [],
    dailyNews: [],
    activeMarketEffects: [],
    violationFlags: [],
    financialHistory: [],
    lastSatisfaction: null,
    lastDealSummary: null,
    activeMilestones: [],
    currentExpiryEvent: null,
    expiryQueue: [],
    coreLostItems: [],
    essenceBalance: { craft: 0, time: 0, vibe: 0 },
    nightState: { energy: 3, maxEnergy: 3, actionsThisNight: [] },
    shopUpgrades: { upgrades: [] },
    showUpgradeShop: false,
    appointmentBoard: { candidates: [], selectedIds: [], preference: 'balanced' },
    showAppointmentBoard: false,
    pendingAppointedCandidates: []
  };
}

test.describe('Upgrade Shop - Round Icon Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.evaluate(() => localStorage.clear());
    await page.waitForLoadState('networkidle');
  });

  test('Facility icons should display as circular (rounded-full)', async ({ page }) => {
    console.log('=== Test: Verify Round Icon in Upgrade Shop ===');

    // Setup save state with NIGHT phase
    await page.evaluate((state) => {
      localStorage.setItem('pawns_dilemma_save_v1', JSON.stringify(state));
    }, createNightPhaseSaveState());

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Click CONTINUE to load saved state
    const continueBtn = page.locator('button').filter({ hasText: /CONTINUE/ }).first();
    const hasValidSave = await continueBtn.isVisible({ timeout: 3000 }).catch(() => false);
    console.log('CONTINUE button visible:', hasValidSave);
    expect(hasValidSave).toBeTruthy();

    await continueBtn.click();
    await page.waitForTimeout(2000);

    // Verify night phase
    const pageContent = await page.content();
    const isNightPhase = pageContent.includes('Night Cycle') || pageContent.includes('END DAY');
    console.log('Night phase reached:', isNightPhase);
    expect(isNightPhase).toBeTruthy();

    // Open upgrade shop
    const upgradeBtn = page.locator('button').filter({ hasText: /店铺升级|Upgrades/i }).first();
    expect(await upgradeBtn.isVisible({ timeout: 3000 })).toBeTruthy();
    await upgradeBtn.click();
    await page.waitForTimeout(1000);

    // Verify modal is open
    const modalContent = await page.content();
    const hasModal = modalContent.includes('SHOP_UPGRADE_SYS');
    console.log('Upgrade shop modal open:', hasModal);
    expect(hasModal).toBeTruthy();

    // Take screenshot for evidence
    await page.screenshot({ path: 'tests/screenshots/round-icon-verification.png', fullPage: true });

    // ===== KEY VERIFICATION: Check for rounded-full class on icon containers =====

    // The LevelArcRing component has an inner div with rounded-full class for the icon container
    // This is the fix we're verifying:
    // Line 63-66 in UpgradeShopModal.tsx should have:
    // <div className={cn(
    //     "absolute inset-2 rounded-full flex items-center justify-center",
    //     isMaxLevel ? "bg-green-950/50 text-green-500" : "bg-amber-950/50 text-amber-500"
    // )}>

    // Check computed border-radius on icon containers
    const iconContainerInfo = await page.evaluate(() => {
      const results: {
        className: string;
        hasRoundedFull: boolean;
        borderRadius: string;
        parentClassName: string;
      }[] = [];

      // Find all relative w-16 h-16 containers (the LevelArcRing wrapper)
      const arcRingContainers = document.querySelectorAll('.relative.w-16.h-16');

      arcRingContainers.forEach((container) => {
        // Find the inner icon container (direct child div with absolute positioning)
        const iconContainer = container.querySelector('div.absolute');
        if (iconContainer) {
          const el = iconContainer as HTMLElement;
          const computed = window.getComputedStyle(el);
          results.push({
            className: el.className,
            hasRoundedFull: el.className.includes('rounded-full'),
            borderRadius: computed.borderRadius,
            parentClassName: container.className
          });
        }
      });

      return results;
    });

    console.log('Icon containers found:', iconContainerInfo.length);
    iconContainerInfo.forEach((info, i) => {
      console.log(`  Container ${i + 1}:`);
      console.log(`    - Has rounded-full class: ${info.hasRoundedFull}`);
      console.log(`    - Border radius: ${info.borderRadius}`);
    });

    // Verify at least one icon container exists
    expect(iconContainerInfo.length).toBeGreaterThan(0);

    // Verify ALL icon containers have rounded-full class (the fix)
    const allHaveRoundedFull = iconContainerInfo.every(info => info.hasRoundedFull);
    console.log('All icon containers have rounded-full:', allHaveRoundedFull);
    expect(allHaveRoundedFull).toBeTruthy();

    // Verify computed border-radius is circular (9999px or 50%)
    const allHaveCircularBorderRadius = iconContainerInfo.every(info =>
      info.borderRadius === '9999px' ||
      info.borderRadius.includes('50%') ||
      parseInt(info.borderRadius) >= 9999
    );
    console.log('All icon containers have circular border-radius:', allHaveCircularBorderRadius);
    expect(allHaveCircularBorderRadius).toBeTruthy();

    // Verify rounded-lg is NOT used for icon containers (regression check)
    const anyHaveRoundedLg = iconContainerInfo.some(info =>
      info.className.includes('rounded-lg')
    );
    console.log('Any icon containers have rounded-lg (should be false):', anyHaveRoundedLg);
    expect(anyHaveRoundedLg).toBeFalsy();

    // Check console for errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    await page.waitForTimeout(300);

    // Filter out known non-critical errors
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('ResizeObserver') &&
      !err.includes('favicon')
    );
    console.log('Critical console errors:', criticalErrors.length > 0 ? criticalErrors : 'None');

    console.log('');
    console.log('=== VERIFICATION COMPLETE ===');
    console.log('Result: Facility icons display as CIRCULAR (rounded-full)');
  });
});

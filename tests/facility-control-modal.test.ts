/**
 * Facility Control Modal Isolation Tests
 *
 * Verifies that facility control has been properly isolated from UpgradeShopModal:
 * 1. Facility control button hidden when no counter facilities owned
 * 2. Facility control button appears after purchasing a counter facility
 * 3. Facility control button shows maintenance cost
 * 4. FacilityControlModal opens and allows toggling
 * 5. UpgradeShopModal no longer contains facility toggle controls
 */

import { test, expect, Page } from '@playwright/test';

// Create a complete valid save state for NIGHT phase
function createNightPhaseSaveState(cash: number = 5000) {
  return {
    phase: 'NIGHT',
    stats: {
      day: 1,
      cash: cash,
      targetSavings: 100000,
      motherStatus: { health: 80, mood: 50, risk: 5, status: 'Stable', careLevel: 'Basic' },
      medicalBill: { amount: 1500, dueDate: 7, status: 'PENDING' },
      visitedToday: false,
      dailyExpenses: 150,
      actionPoints: 3,
      maxActionPoints: 3,
      rentDue: 0,
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
    showFacilityControl: false,
    appointmentBoard: { candidates: [], selectedIds: [], preference: 'balanced' },
    showAppointmentBoard: false,
    pendingAppointedCandidates: []
  };
}

// Create a save state with Tea Set already purchased
function createNightPhaseWithTeaSet(cash: number = 4200) {
  const state = createNightPhaseSaveState(cash);
  state.shopUpgrades = {
    upgrades: [
      {
        upgradeId: 'tea_set',
        currentLevel: 1,
        enabled: true
      }
    ]
  };
  return state;
}

test.describe('Facility Control Modal Isolation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.evaluate(() => localStorage.clear());
    await page.waitForLoadState('networkidle');
  });

  test('Test 1: Facility control button hidden when no counter facilities', async ({ page }) => {
    // Set up save state with NO upgrades
    await page.evaluate((state) => {
      localStorage.setItem('pawns_dilemma_save_v1', JSON.stringify(state));
    }, createNightPhaseSaveState());

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Click Continue to enter the game
    const continueBtn = page.locator('button').filter({ hasText: /CONTINUE/i }).first();
    if (await continueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(1000);
    }

    // Verify we are in Night phase
    const nightTitle = page.locator('text=Night Cycle');
    await expect(nightTitle).toBeVisible({ timeout: 5000 });

    // Check that "Facility Control" button is NOT visible
    const facilityButton = page.locator('button').filter({ hasText: /Facility|设施控制/i });
    await expect(facilityButton).not.toBeVisible({ timeout: 2000 });
  });

  test('Test 2: Facility control button appears with counter facility purchased', async ({ page }) => {
    // Set up save state WITH Tea Set purchased
    await page.evaluate((state) => {
      localStorage.setItem('pawns_dilemma_save_v1', JSON.stringify(state));
    }, createNightPhaseWithTeaSet());

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Click Continue to enter the game
    const continueBtn = page.locator('button').filter({ hasText: /CONTINUE/i }).first();
    if (await continueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(1000);
    }

    // Verify we are in Night phase
    const nightTitle = page.locator('text=Night Cycle');
    await expect(nightTitle).toBeVisible({ timeout: 5000 });

    // Now facility control button should be visible
    const facilityButton = page.locator('button').filter({ hasText: /Facility|设施控制/i });
    await expect(facilityButton).toBeVisible({ timeout: 3000 });
  });

  test('Test 3: Facility control button shows maintenance cost', async ({ page }) => {
    // Set up save state WITH Tea Set purchased
    await page.evaluate((state) => {
      localStorage.setItem('pawns_dilemma_save_v1', JSON.stringify(state));
    }, createNightPhaseWithTeaSet());

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Click Continue to enter the game
    const continueBtn = page.locator('button').filter({ hasText: /CONTINUE/i }).first();
    if (await continueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(1000);
    }

    // Verify we are in Night phase
    const nightTitle = page.locator('text=Night Cycle');
    await expect(nightTitle).toBeVisible({ timeout: 5000 });

    // Check that facility control button shows maintenance cost ($20/day for Lv1 Tea Set)
    const maintenanceBadge = page.locator('text=-$20/day');
    await expect(maintenanceBadge).toBeVisible({ timeout: 3000 });
  });

  test('Test 4: FacilityControlModal opens and shows facilities', async ({ page }) => {
    // Set up save state WITH Tea Set purchased
    await page.evaluate((state) => {
      localStorage.setItem('pawns_dilemma_save_v1', JSON.stringify(state));
    }, createNightPhaseWithTeaSet());

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Click Continue to enter the game
    const continueBtn = page.locator('button').filter({ hasText: /CONTINUE/i }).first();
    if (await continueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(1000);
    }

    // Verify we are in Night phase
    const nightTitle = page.locator('text=Night Cycle');
    await expect(nightTitle).toBeVisible({ timeout: 5000 });

    // Click facility control button
    const facilityButton = page.locator('button').filter({ hasText: /Facility|设施控制/i });
    await expect(facilityButton).toBeVisible({ timeout: 3000 });
    await facilityButton.click();
    await page.waitForTimeout(500);

    // Verify FacilityControlModal is open
    const modalTitle = page.locator('text=FACILITY_CONTROL');
    await expect(modalTitle).toBeVisible({ timeout: 3000 });

    // Verify Tea Set is shown in the modal (Chinese name)
    const teaSetEntry = page.locator('text=茶具套装');
    await expect(teaSetEntry).toBeVisible({ timeout: 3000 });

    // Verify Daily Maintenance header is shown (use heading role for specificity)
    const maintenanceHeader = page.getByRole('heading', { name: /Daily Maintenance/i });
    await expect(maintenanceHeader).toBeVisible({ timeout: 2000 });
  });

  test('Test 5: Can toggle facility on/off in FacilityControlModal', async ({ page }) => {
    // Set up save state WITH Tea Set purchased
    await page.evaluate((state) => {
      localStorage.setItem('pawns_dilemma_save_v1', JSON.stringify(state));
    }, createNightPhaseWithTeaSet());

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Click Continue to enter the game
    const continueBtn = page.locator('button').filter({ hasText: /CONTINUE/i }).first();
    if (await continueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(1000);
    }

    // Verify we are in Night phase
    const nightTitle = page.locator('text=Night Cycle');
    await expect(nightTitle).toBeVisible({ timeout: 5000 });

    // Open facility control
    const facilityButton = page.locator('button').filter({ hasText: /Facility|设施控制/i });
    await expect(facilityButton).toBeVisible({ timeout: 3000 });
    await facilityButton.click();
    await page.waitForTimeout(500);

    // Verify modal is open
    const modalTitle = page.locator('text=FACILITY_CONTROL');
    await expect(modalTitle).toBeVisible({ timeout: 3000 });

    // Initial state: Tea Set should be enabled (green toggle icon visible)
    // The toggle button has ToggleRight icon with text-green-500 class
    const toggleOnIcon = page.locator('svg.lucide-toggle-right.text-green-500');
    await expect(toggleOnIcon).toBeVisible({ timeout: 3000 });

    // Click the toggle button to disable
    // The toggle button contains the ToggleRight icon - click on the button parent
    const toggleButton = page.locator('button:has(svg.lucide-toggle-right.text-green-500)');
    await toggleButton.click();
    await page.waitForTimeout(500);

    // After toggle: should be disabled (gray toggle with ToggleLeft icon)
    const toggleOffIcon = page.locator('svg.lucide-toggle-left.text-stone-500');
    await expect(toggleOffIcon).toBeVisible({ timeout: 3000 });

    // Maintenance cost text should show "Disabled - No cost"
    const disabledText = page.locator('text=Disabled - No cost');
    await expect(disabledText).toBeVisible({ timeout: 3000 });
  });

  test('Test 6: UpgradeShopModal no longer has facility toggle controls', async ({ page }) => {
    // Set up save state WITH Tea Set purchased
    await page.evaluate((state) => {
      localStorage.setItem('pawns_dilemma_save_v1', JSON.stringify(state));
    }, createNightPhaseWithTeaSet());

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Click Continue to enter the game
    const continueBtn = page.locator('button').filter({ hasText: /CONTINUE/i }).first();
    if (await continueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(1000);
    }

    // Verify we are in Night phase
    const nightTitle = page.locator('text=Night Cycle');
    await expect(nightTitle).toBeVisible({ timeout: 5000 });

    // Open upgrade shop
    const upgradeButton = page.locator('button').filter({ hasText: /Upgrades|店铺升级/i });
    await expect(upgradeButton).toBeVisible({ timeout: 3000 });
    await upgradeButton.click();
    await page.waitForTimeout(500);

    // Verify upgrade shop modal is open
    const modalTitle = page.locator('text=SHOP_UPGRADE_SYS');
    await expect(modalTitle).toBeVisible({ timeout: 3000 });

    // Verify there's NO "Counter Facility Controls" section in UpgradeShop
    const facilityControlsSection = page.locator('text=Counter Facility Controls');
    await expect(facilityControlsSection).not.toBeVisible({ timeout: 2000 });

    // Scope to the modal
    const modal = page.locator('div[role="dialog"], .fixed.inset-0').first();

    // The ToggleRight/ToggleLeft icons (interactive toggle buttons) should NOT be in UpgradeShop
    // Only ON/OFF status badges should appear
    // Check for ToggleRight and ToggleLeft class within BUTTONS (not just displayed)
    const interactiveToggle = modal.locator('button').filter({
      has: page.locator('svg.lucide-toggle-right, svg.lucide-toggle-left')
    });
    const toggleCount = await interactiveToggle.count();

    // There should be no interactive toggle buttons in upgrade shop
    // Note: The upgrade shop shows ON/OFF status badges but NOT clickable toggle buttons
    expect(toggleCount).toBe(0);
  });

  test('Test 7: No console errors during facility control operations', async ({ page }) => {
    const consoleErrors: string[] = [];

    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Set up save state WITH Tea Set purchased
    await page.evaluate((state) => {
      localStorage.setItem('pawns_dilemma_save_v1', JSON.stringify(state));
    }, createNightPhaseWithTeaSet());

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Click Continue to enter the game
    const continueBtn = page.locator('button').filter({ hasText: /CONTINUE/i }).first();
    if (await continueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(1000);
    }

    // Verify we are in Night phase
    const nightTitle = page.locator('text=Night Cycle');
    await expect(nightTitle).toBeVisible({ timeout: 5000 });

    // Open facility control
    const facilityButton = page.locator('button').filter({ hasText: /Facility|设施控制/i });
    await expect(facilityButton).toBeVisible({ timeout: 3000 });
    await facilityButton.click();
    await page.waitForTimeout(500);

    // Scope to modal
    const modal = page.locator('div[role="dialog"], .fixed.inset-0').first();

    // Toggle on/off - find the toggle button within the facility row
    const facilityRow = modal.locator('div').filter({ hasText: /茶具套装/ }).first();
    const toggleButton = facilityRow.locator('button').filter({ has: page.locator('svg') }).last();
    await toggleButton.click({ force: true });
    await page.waitForTimeout(300);
    await toggleButton.click({ force: true });
    await page.waitForTimeout(300);

    // Close modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Filter out non-critical errors
    const criticalErrors = consoleErrors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('Failed to load resource') &&
      !e.includes('net::')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});

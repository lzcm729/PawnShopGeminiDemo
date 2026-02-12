/**
 * Night Dashboard Locked Button State Tests
 *
 * Verifies that APPOINTMENTS and FACILITY buttons:
 * 1. Are ALWAYS visible (even when locked)
 * 2. Show lock icon when facility not purchased
 * 3. Show "Requires upgrade" text when locked
 * 4. Are disabled (not clickable) when locked
 * 5. Have grayscale/opacity styling when locked
 * 6. Become fully functional after upgrade purchase
 */

import { test, expect, Page } from '@playwright/test';

// Create a complete valid save state for NIGHT phase with NO upgrades
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

// Create save state with BOTH appointments AND tea set purchased
function createNightPhaseWithUpgrades(cash: number = 3000) {
  const state = createNightPhaseSaveState(cash);
  state.shopUpgrades = {
    upgrades: [
      {
        upgradeId: 'appointment_board',
        currentLevel: 1,
        enabled: true
      },
      {
        upgradeId: 'tea_set',
        currentLevel: 1,
        enabled: true
      }
    ]
  };
  return state;
}

test.describe('Night Dashboard Locked Button State Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.evaluate(() => localStorage.clear());
    await page.waitForLoadState('networkidle');
  });

  test('Test 1: APPOINTMENTS button visible but locked when no upgrade', async ({ page }) => {
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

    // Screenshot the full night dashboard
    await page.screenshot({ path: 'tests/screenshots/night-dashboard-locked.png', fullPage: true });

    // Also take a screenshot of just the button grid area
    const gridArea = page.locator('.grid.grid-cols-3').first();
    await gridArea.screenshot({ path: 'tests/screenshots/night-dashboard-grid-locked.png' });

    // Check that APPOINTMENTS button IS visible
    const appointmentsButton = page.locator('button').filter({ hasText: /Appointments/i });
    await expect(appointmentsButton).toBeVisible({ timeout: 3000 });

    // Check that it shows "Requires upgrade" text
    const requiresUpgradeText = appointmentsButton.locator('text=Requires upgrade');
    await expect(requiresUpgradeText).toBeVisible({ timeout: 2000 });

    // Check that it has disabled attribute
    await expect(appointmentsButton).toBeDisabled();

    // Check for lock icon (Lock class from lucide-react)
    const lockIcon = appointmentsButton.locator('svg.lucide-lock');
    await expect(lockIcon).toBeVisible({ timeout: 2000 });

    // Check for grayscale/opacity styling
    const buttonClasses = await appointmentsButton.getAttribute('class');
    expect(buttonClasses).toContain('grayscale');
    expect(buttonClasses).toContain('opacity-50');
  });

  test('Test 2: FACILITY button visible but locked when no counter facilities', async ({ page }) => {
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

    // Check that FACILITY button IS visible
    const facilityButton = page.locator('button').filter({ hasText: /Facility|设施控制/i });
    await expect(facilityButton).toBeVisible({ timeout: 3000 });

    // Check that it shows "Requires upgrade" text
    const requiresUpgradeText = facilityButton.locator('text=Requires upgrade');
    await expect(requiresUpgradeText).toBeVisible({ timeout: 2000 });

    // Check that it has disabled attribute
    await expect(facilityButton).toBeDisabled();

    // Check for lock icon
    const lockIcon = facilityButton.locator('svg.lucide-lock');
    await expect(lockIcon).toBeVisible({ timeout: 2000 });

    // Check for grayscale/opacity styling
    const buttonClasses = await facilityButton.getAttribute('class');
    expect(buttonClasses).toContain('grayscale');
    expect(buttonClasses).toContain('opacity-50');
  });

  test('Test 3: Both buttons unlocked after purchasing upgrades', async ({ page }) => {
    // Set up save state WITH both upgrades
    await page.evaluate((state) => {
      localStorage.setItem('pawns_dilemma_save_v1', JSON.stringify(state));
    }, createNightPhaseWithUpgrades());

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

    // Screenshot the unlocked state
    await page.screenshot({ path: 'tests/screenshots/night-dashboard-unlocked.png', fullPage: true });

    // Also take a screenshot of just the button grid area
    const gridArea = page.locator('.grid.grid-cols-3').first();
    await gridArea.screenshot({ path: 'tests/screenshots/night-dashboard-grid-unlocked.png' });

    // Check APPOINTMENTS button - should be enabled and not have lock icon
    const appointmentsButton = page.locator('button').filter({ hasText: /Appointments/i });
    await expect(appointmentsButton).toBeVisible({ timeout: 3000 });
    await expect(appointmentsButton).toBeEnabled();

    // Should show level indicator instead of "Requires upgrade"
    const appointmentLevel = appointmentsButton.locator('text=/Lv\\d+/');
    await expect(appointmentLevel).toBeVisible({ timeout: 2000 });

    // Lock icon should NOT be visible
    const appointmentLock = appointmentsButton.locator('svg.lucide-lock');
    await expect(appointmentLock).not.toBeVisible({ timeout: 1000 });

    // Check FACILITY button - should be enabled
    const facilityButton = page.locator('button').filter({ hasText: /Facility|设施控制/i });
    await expect(facilityButton).toBeVisible({ timeout: 3000 });
    await expect(facilityButton).toBeEnabled();

    // Lock icon should NOT be visible
    const facilityLock = facilityButton.locator('svg.lucide-lock');
    await expect(facilityLock).not.toBeVisible({ timeout: 1000 });

    // Should NOT have grayscale styling
    const buttonClasses = await facilityButton.getAttribute('class');
    expect(buttonClasses).not.toContain('grayscale');
  });

  test('Test 4: APPOINTMENTS button opens modal when unlocked', async ({ page }) => {
    // Set up save state WITH both upgrades
    await page.evaluate((state) => {
      localStorage.setItem('pawns_dilemma_save_v1', JSON.stringify(state));
    }, createNightPhaseWithUpgrades());

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

    // Click APPOINTMENTS button
    const appointmentsButton = page.locator('button').filter({ hasText: /Appointments/i });
    await appointmentsButton.click();
    await page.waitForTimeout(500);

    // Verify appointment board modal opens
    // Look for the modal title which is unique to the appointment board modal
    const modalTitle = page.locator('text=简易预约本');
    await expect(modalTitle).toBeVisible({ timeout: 3000 });
  });

  test('Test 5: FACILITY button opens modal when unlocked', async ({ page }) => {
    // Set up save state WITH both upgrades
    await page.evaluate((state) => {
      localStorage.setItem('pawns_dilemma_save_v1', JSON.stringify(state));
    }, createNightPhaseWithUpgrades());

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

    // Click FACILITY button
    const facilityButton = page.locator('button').filter({ hasText: /Facility|设施控制/i });
    await facilityButton.click();
    await page.waitForTimeout(500);

    // Verify facility control modal opens
    const modalTitle = page.locator('text=FACILITY_CONTROL');
    await expect(modalTitle).toBeVisible({ timeout: 3000 });

    // Tea Set should be visible
    const teaSetEntry = page.locator('text=茶具套装');
    await expect(teaSetEntry).toBeVisible({ timeout: 3000 });
  });

  test('Test 6: No console errors during button state transitions', async ({ page }) => {
    const consoleErrors: string[] = [];

    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Set up locked state first
    await page.evaluate((state) => {
      localStorage.setItem('pawns_dilemma_save_v1', JSON.stringify(state));
    }, createNightPhaseSaveState());

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Click Continue
    const continueBtn = page.locator('button').filter({ hasText: /CONTINUE/i }).first();
    if (await continueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(1000);
    }

    // Try clicking locked buttons (should do nothing, no errors)
    const appointmentsButton = page.locator('button').filter({ hasText: /Appointments/i });
    await appointmentsButton.click({ force: true }); // Force click even if disabled
    await page.waitForTimeout(300);

    const facilityButton = page.locator('button').filter({ hasText: /Facility|设施控制/i });
    await facilityButton.click({ force: true });
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

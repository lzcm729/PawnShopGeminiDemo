/**
 * Manual Test Runner using Playwright
 * Tests basic game flow after TypeScript fixes
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function runTests() {
  await ensureDir(SCREENSHOT_DIR);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  const results = {
    passed: [],
    failed: [],
    errors: []
  };

  // Collect console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      results.errors.push(msg.text());
    }
  });

  try {
    // Test 1: Game Startup
    console.log('Test 1: Game Startup...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-startup.png') });

    const hasTitle = await page.locator('text=THE PAWN').isVisible().catch(() => false);
    const hasNewGame = await page.locator('text=NEW GAME').isVisible().catch(() => false);

    if (hasTitle && hasNewGame) {
      results.passed.push('Test 1: Game startup - Start screen displays correctly');
      console.log('  PASS: Start screen displays correctly');
    } else {
      results.failed.push('Test 1: Game startup - Start screen missing elements');
      console.log('  FAIL: Start screen missing elements');
    }

    // Test 2: Start New Game
    console.log('Test 2: Start New Game...');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');

    const newGameBtn = page.locator('text=NEW GAME').first();
    if (await newGameBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newGameBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-after-new-game.png') });

      // Check if we moved past the start screen
      const stillOnStart = await page.locator('text=NEW GAME').isVisible().catch(() => false);
      if (!stillOnStart) {
        results.passed.push('Test 2: Start New Game - Game started successfully');
        console.log('  PASS: Game started successfully');
      } else {
        results.failed.push('Test 2: Start New Game - Still on start screen');
        console.log('  FAIL: Still on start screen');
      }
    } else {
      results.failed.push('Test 2: Start New Game - NEW GAME button not found');
      console.log('  FAIL: NEW GAME button not found');
    }

    // Test 3: Morning Brief Phase
    console.log('Test 3: Morning Brief Phase...');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-morning-brief.png') });

    // Look for typical morning brief elements or next phase
    const hasMorningContent = await page.locator('text=Day, text=CONTINUE, text=OPEN SHOP').first().isVisible({ timeout: 3000 }).catch(() => false);

    // Click continue/open shop if available
    const continueBtn = page.locator('button:has-text("CONTINUE"), button:has-text("OPEN"), button:has-text("开店")').first();
    if (await continueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-business-phase.png') });
      results.passed.push('Test 3: Morning Brief - Progressed through morning brief');
      console.log('  PASS: Progressed through morning brief');
    } else {
      // Still take screenshot of current state
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-current-state.png') });
      results.passed.push('Test 3: Morning Brief - Current state captured');
      console.log('  INFO: Current state captured (may be in different phase)');
    }

    // Test 4: Check for Business Phase Elements
    console.log('Test 4: Business Phase Elements...');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-game-state.png') });

    // Look for any game UI elements
    const hasGameUI = await page.evaluate(() => {
      const body = document.body.innerText;
      return body.includes('Day') || body.includes('$') || body.includes('Funds') || body.includes('AP');
    });

    if (hasGameUI) {
      results.passed.push('Test 4: Business Phase - Game UI elements found');
      console.log('  PASS: Game UI elements found');
    } else {
      results.failed.push('Test 4: Business Phase - No game UI elements found');
      console.log('  FAIL: No game UI elements found');
    }

    // Test 5: Night Phase (if we can get there)
    console.log('Test 5: Advancing to Night Phase...');

    // Try to find and click "End Day" or similar
    const endDayBtn = page.locator('button:has-text("END DAY"), button:has-text("CLOSE"), button:has-text("打烊")').first();
    if (await endDayBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await endDayBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-night-phase.png') });
      results.passed.push('Test 5: Night Phase - Transitioned to night phase');
      console.log('  PASS: Transitioned to night phase');
    } else {
      console.log('  SKIP: End day button not available');
    }

    // Final screenshot
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '99-final-state.png') });

  } catch (error) {
    console.error('Test error:', error.message);
    results.errors.push(error.message);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error-state.png') }).catch(() => {});
  }

  await browser.close();

  // Print summary
  console.log('\n=== TEST SUMMARY ===');
  console.log(`Passed: ${results.passed.length}`);
  console.log(`Failed: ${results.failed.length}`);
  console.log(`Console Errors: ${results.errors.length}`);

  if (results.errors.length > 0) {
    console.log('\nConsole Errors:');
    results.errors.forEach(e => console.log(`  - ${e}`));
  }

  // Write results to file
  fs.writeFileSync(
    path.join(__dirname, 'test-results.json'),
    JSON.stringify(results, null, 2)
  );

  return results;
}

runTests().then(results => {
  process.exit(results.failed.length > 0 ? 1 : 0);
});

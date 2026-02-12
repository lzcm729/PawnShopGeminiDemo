/**
 * Full Flow Test - Startup to Night Phase
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testFullFlow() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  try {
    console.log('=== Full Flow Test ===\n');

    // Start fresh
    await page.goto('http://localhost:3000');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 1. Start new game
    console.log('1. Starting new game...');
    await page.click('text=NEW GAME');
    await sleep(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'full-01-morning.png') });

    // 2. Open shop
    console.log('2. Opening shop...');
    await page.click('button:has-text("OPEN SHOP")');
    await sleep(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'full-02-business.png') });

    // 3. Submit offer
    console.log('3. Submitting offer...');
    await page.click('button:has-text("SUBMIT")');
    await sleep(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'full-03-after-submit.png') });

    // 4. Dismiss customer
    console.log('4. Dismissing customer...');
    await page.click('button:has-text("DISMISS"), button:has-text("送客")');
    await sleep(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'full-04-after-dismiss.png') });

    // 5. Check current state - might be more customers or end day
    console.log('5. Checking current state...');
    const pageText = await page.evaluate(() => document.body.innerText);
    console.log('   Current state indicators:', {
      hasEndDay: pageText.includes('END DAY') || pageText.includes('CLOSE'),
      hasNight: pageText.includes('NIGHT') || pageText.includes('夜间'),
      hasNextCustomer: pageText.includes('Customer') || pageText.includes('顾客')
    });

    // Try to find END DAY button
    const endDayBtn = page.locator('button:has-text("END DAY")').first();
    if (await endDayBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('6. Clicking END DAY...');
      await endDayBtn.click();
      await sleep(2000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'full-05-night.png') });
    } else {
      console.log('6. No END DAY button, checking for other options...');
      // Maybe we're already in a different state or need to handle more customers
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'full-05-state.png') });

      // Try clicking anywhere clickable
      const buttons = await page.locator('button').all();
      console.log(`   Found ${buttons.length} buttons`);
      for (const btn of buttons.slice(0, 5)) {
        const text = await btn.innerText().catch(() => '');
        console.log(`   - Button: "${text}"`);
      }
    }

    // 7. Check if we reached night phase
    console.log('7. Final state check...');
    const finalText = await page.evaluate(() => document.body.innerText);
    const nightIndicators = [
      'Night', 'NIGHT', '夜间', 'Today', 'Summary', 'Dashboard',
      'Mail', 'Calendar', 'Inventory', 'REST', 'NEXT DAY'
    ];
    const foundIndicators = nightIndicators.filter(ind => finalText.includes(ind));
    console.log('   Found indicators:', foundIndicators);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'full-99-final.png') });

    // Error summary
    console.log('\n=== RESULT ===');
    if (errors.length > 0) {
      console.log('Console Errors found:');
      errors.forEach(e => console.log(`  - ${e.substring(0, 150)}`));
    } else {
      console.log('No console errors!');
    }

  } catch (error) {
    console.error('Test error:', error.message);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'full-error.png') }).catch(() => {});
  }

  await browser.close();
}

testFullFlow();

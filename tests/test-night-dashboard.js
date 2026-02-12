/**
 * Test Night Dashboard Display
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

async function testNightDashboard() {
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
    console.log('=== Night Dashboard Test ===\n');

    // Start fresh
    await page.goto('http://localhost:3000');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Quick path to night
    console.log('1. Starting game...');
    await page.click('text=NEW GAME');
    await sleep(1500);

    console.log('2. Opening shop...');
    await page.click('button:has-text("OPEN SHOP")');
    await sleep(1500);

    console.log('3. Submitting offer...');
    await page.click('button:has-text("SUBMIT")');
    await sleep(1500);

    console.log('4. Dismissing customer...');
    await page.click('button:has-text("DISMISS")');
    await sleep(1500);

    console.log('5. Clicking CLOSE to enter night...');
    await page.click('button:has-text("CLOSE")');
    await sleep(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'night-dashboard-01.png') });

    // Check night dashboard elements
    console.log('6. Checking night dashboard elements...');
    const pageText = await page.evaluate(() => document.body.innerText);

    const expectedElements = [
      'Night', 'NIGHT',
      'Dashboard', 'Summary',
      'Mail', 'Calendar', 'Inventory',
      'REST', 'NEXT DAY', 'Day 2'
    ];

    console.log('   Found elements:');
    expectedElements.forEach(el => {
      const found = pageText.includes(el);
      console.log(`   - ${el}: ${found ? 'YES' : 'NO'}`);
    });

    // Look for interactive elements
    const buttons = await page.locator('button').all();
    console.log(`\n   Buttons in night phase (${buttons.length}):`);
    for (const btn of buttons.slice(0, 10)) {
      const text = await btn.innerText().catch(() => '');
      if (text.trim()) console.log(`   - "${text.trim()}"`);
    }

    // Try various night actions
    console.log('\n7. Testing night interactions...');

    // Check if there's a MAIL button
    const mailBtn = page.locator('button:has-text("MAIL"), button:has-text("邮件"), text=MAIL').first();
    if (await mailBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('   Found MAIL button');
    }

    // Check REST/NEXT DAY
    const restBtn = page.locator('button:has-text("REST"), button:has-text("NEXT DAY"), button:has-text("休息")').first();
    if (await restBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('   Found REST/NEXT DAY button');
      await restBtn.click();
      await sleep(2000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'night-dashboard-02-after-rest.png') });
    }

    // Final screenshot
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'night-dashboard-99-final.png') });

    // Error summary
    console.log('\n=== RESULT ===');
    if (errors.length > 0) {
      console.log('Console Errors:');
      errors.forEach(e => console.log(`  - ${e.substring(0, 200)}`));
    } else {
      console.log('No console errors!');
    }

  } catch (error) {
    console.error('Test error:', error.message);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'night-dashboard-error.png') }).catch(() => {});
  }

  await browser.close();
}

testNightDashboard();

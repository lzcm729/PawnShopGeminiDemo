/**
 * Test Night Phase Display
 * Tests night panel functionality after completing a pawn transaction
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

async function testNightPhase() {
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
    console.log('=== Night Phase Test ===\n');

    // Start fresh
    await page.goto('http://localhost:3000');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Start new game
    console.log('1. Starting new game...');
    await page.click('text=NEW GAME');
    await page.waitForTimeout(1500);

    // Open shop
    console.log('2. Opening shop...');
    const openShopBtn = page.locator('button:has-text("OPEN SHOP"), button:has-text("开店")').first();
    if (await openShopBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await openShopBtn.click();
      await page.waitForTimeout(1500);
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'night-01-business.png') });

    // Complete a transaction - submit offer
    console.log('3. Submitting offer...');
    const submitBtn = page.locator('button:has-text("SUBMIT"), button:has-text("提交")').first();
    if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'night-02-after-submit.png') });
    }

    // Check for any modal/dialog and close
    console.log('4. Handling post-submission...');
    const continueBtn = page.locator('button:has-text("Continue"), button:has-text("CONTINUE"), button:has-text("继续")').first();
    if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(1000);
    }

    // Try to close/end day
    console.log('5. Looking for End Day button...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'night-03-looking-for-end.png') });

    // Try various end day button variations
    const endDayButtons = [
      'button:has-text("END DAY")',
      'button:has-text("CLOSE SHOP")',
      'button:has-text("打烊")',
      'button:has-text("结束")',
      'text=END DAY',
      'text=CLOSE'
    ];

    let foundEndDay = false;
    for (const selector of endDayButtons) {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log(`   Found: ${selector}`);
        await btn.click();
        foundEndDay = true;
        await page.waitForTimeout(2000);
        break;
      }
    }

    if (!foundEndDay) {
      console.log('   No End Day button found in current state');
      // Maybe we need to dismiss the current customer first
      const nextBtn = page.locator('button:has-text("NEXT"), button:has-text("下一位")').first();
      if (await nextBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('   Found NEXT button, clicking...');
        await nextBtn.click();
        await page.waitForTimeout(1500);
      }
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'night-04-after-end-attempt.png') });

    // Look for night phase indicators
    console.log('6. Checking for Night Phase...');
    const pageContent = await page.content();
    const hasNightIndicators =
      pageContent.includes('Night') ||
      pageContent.includes('NIGHT') ||
      pageContent.includes('夜间') ||
      pageContent.includes('Today\'s Summary') ||
      pageContent.includes('今日总结');

    if (hasNightIndicators) {
      console.log('   Night phase indicators found!');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'night-05-night-phase.png') });
    } else {
      console.log('   Night phase not reached yet');
    }

    // Final state
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'night-99-final.png') });

    // Report errors
    if (errors.length > 0) {
      console.log('\nConsole Errors:');
      errors.forEach(e => console.log(`  - ${e.substring(0, 100)}...`));
    } else {
      console.log('\nNo console errors detected!');
    }

  } catch (error) {
    console.error('Test error:', error.message);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'night-error.png') }).catch(() => {});
  }

  await browser.close();
}

testNightPhase();

import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Navigate to about page
  await page.goto('http://localhost:3000/en/about');
  await page.waitForLoadState('networkidle');
  
  // Take screenshot of top
  await page.screenshot({ path: 'output/playwright/about-top.png', fullPage: false });
  console.log('Screenshot 1 saved: about-top.png');
  
  // Scroll down
  await page.evaluate(() => window.scrollBy(0, window.innerHeight));
  await page.waitForTimeout(1000);
  
  // Take screenshot of bottom
  await page.screenshot({ path: 'output/playwright/about-bottom.png', fullPage: false });
  console.log('Screenshot 2 saved: about-bottom.png');
  
  // Take full page screenshot
  await page.screenshot({ path: 'output/playwright/about-full.png', fullPage: true });
  console.log('Screenshot 3 saved: about-full.png');
  
  await browser.close();
})();

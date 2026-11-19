const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const assert = require('assert');

(async () => {
  const base = process.env.SHELF_BASE_URL;
  if (!base || !/^https:\/\//.test(base)) throw new Error('SHELF_BASE_URL must be an HTTPS URL');
  const root = new URL(base.endsWith('/') ? base : `${base}/`);
  const out = path.join(process.env.RUNNER_TEMP || '.', 'shelf-screenshots');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const width of [320, 390, 768, 1024, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 850 }, deviceScaleFactor: 1 });
      for (const file of ['index.html', 'research.html']) {
        const response = await page.goto(new URL(file, root).href, { waitUntil: 'networkidle' });
        assert(response && response.ok(), `${file} ${width}: response failed`);
        await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(image => { image.loading = 'eager'; return image.decode().catch(() => {}); })); });
        const checks = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
          badImages: [...document.images].filter(i => !i.complete || !i.naturalWidth).map(i => i.currentSrc || i.src),
          badFonts: [...document.fonts].filter(f => f.status === 'error').map(f => f.family)
        }));
        assert(!checks.overflow, `${file} ${width}: horizontal overflow`);
        assert.deepStrictEqual(checks.badImages, [], `${file} ${width}: broken images`);
        assert.deepStrictEqual(checks.badFonts, [], `${file} ${width}: failed fonts`);
        console.log(`PASS ${file} ${width}`);
      }
      if (width === 390 || width === 1440) {
        await page.goto(new URL('index.html', root).href, { waitUntil: 'networkidle' });
        await page.screenshot({ path: path.join(out, width === 390 ? 'mobile-cover.png' : 'desktop-cover.png') });
        if (width === 390) {
          await page.locator('#ticket').scrollIntoViewIfNeeded();
          await page.screenshot({ path: path.join(out, 'mobile-quiz.png') });
        }
      }
      await page.close();
    }
    const page = await browser.newPage({ viewport: { width: 390, height: 850 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    await page.goto(new URL('index.html', root).href, { waitUntil: 'networkidle' });
    await page.locator('[data-guess="short"]').click();
    assert(await page.locator('#answer').evaluate(e => e.open));
    assert.match(await page.locator('#verdict').innerText(), /10 of 32|Ten of 32/i);
    assert.match(await page.locator('#verdict').innerText(), /2 of 32|Two of 32/i);
    await page.locator('[data-guess="long"]').click();
    assert.equal(await page.locator('[data-guess="long"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('[data-guess="short"]').getAttribute('aria-pressed'), 'false');
    assert.match(await page.locator('#verdict').innerText(), /2 of 32|Two of 32/i);
    assert.match(await page.locator('#verdict').innerText(), /10 of 32|Ten of 32/i);
    await page.locator('[data-guess="same"]').tap();
    assert.equal(await page.locator('[data-guess="same"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('[data-guess="long"]').getAttribute('aria-pressed'), 'false');
    assert.match(await page.locator('#verdict').innerText(), /10 of 32|Ten of 32/i);
    assert.match(await page.locator('#verdict').innerText(), /2 of 32|Two of 32/i);
    await page.locator('#scene-toggle').tap();
    assert.equal(await page.locator('#scene-toggle').getAttribute('aria-expanded'), 'true');
    assert(await page.locator('#later-caption').isVisible());
    assert(!(await page.locator('#early-caption').isVisible()));
    assert(await page.locator('#evening-scene').evaluate(e => e.classList.contains('later')));
    assert(await page.locator('#later-frame').isVisible());
    await page.locator('#scene-toggle').tap();
    assert.equal(await page.locator('#scene-toggle').getAttribute('aria-expanded'), 'false');
    assert(!(await page.locator('#later-caption').isVisible()));
    assert(await page.locator('#early-caption').isVisible());
    assert(!(await page.locator('#evening-scene').evaluate(e => e.classList.contains('later'))));
    assert(!(await page.locator('#later-frame').isVisible()));
    await page.locator('#chapter-menu summary').click();
    assert(await page.locator('#chapter-menu').evaluate(e => e.open));
    await page.keyboard.press('Escape');
    assert(!(await page.locator('#chapter-menu').evaluate(e => e.open)));
    const mechanisms = page.locator('details.mechanism');
    await mechanisms.nth(1).locator('summary').click();
    assert(await mechanisms.nth(1).evaluate(e => e.open));
    assert(!(await mechanisms.nth(0).evaluate(e => e.open)));
    await page.locator('[name="pastime"]').selectOption('game');
    await page.locator('[name="cue"]').selectOption('weekend');
    await page.locator('#bookmark-form button[type="submit"]').click();
    assert(await page.locator('#bookmark-out').isVisible());
    assert.match(await page.locator('#plan-text').innerText(), /game/i);
    await page.locator('#keep-plan').click();
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('[name="pastime"]').inputValue(), 'game');
    assert.equal(await page.locator('[name="cue"]').inputValue(), 'weekend');
    assert(await page.locator('#bookmark-out').isVisible());
    await page.locator('#clear-plan').click();
    await page.reload({ waitUntil: 'networkidle' });
    assert(!(await page.locator('#bookmark-out').isVisible()));
    await page.close();
    const noJs = await browser.newPage({ viewport: { width: 320, height: 850 }, javaScriptEnabled: false });
    await noJs.goto(new URL('index.html', root).href, { waitUntil: 'load' });
    await noJs.locator('#answer summary').click();
    assert(await noJs.locator('#verdict').isVisible());
    assert.match(await noJs.locator('noscript p').first().innerText(), /./);
    await noJs.locator('details.mechanism').nth(1).locator('summary').click();
    assert(await noJs.locator('details.mechanism').nth(1).evaluate(e => e.open));
    await noJs.close();
    console.log('PASS interactive and JavaScript-disabled checks');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

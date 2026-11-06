// Test de la vue de détail (loupe) — Playwright + Chrome.  Usage : node tests/detail.test.js [url]
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const assert = (c, m) => { if (!c) { throw new Error('ÉCHEC : ' + m); } console.log('OK  ' + m); };
(async () => {
  const url = process.argv[2] || 'http://localhost:8766/touret_ar/index.html';
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errs = [];
  for (const vp of [{ width: 1366, height: 800, name: 'ordinateur' }, { width: 412, height: 860, name: 'mobile', mobile: true }]) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, hasTouch: !!vp.mobile, isMobile: !!vp.mobile });
    page.on('pageerror', e => errs.push(vp.name + ' ' + e.message));
    await page.goto(url); await page.waitForTimeout(3000);
    // position à l'écran du centre de la poulie (12), pièce visible de face
    const pt = await page.evaluate(() => {
      const THREE_V = window.TOURET.parts[12].g; const b = new (V.camera.position.constructor)();
      THREE_V.children[0].children[0].geometry.computeBoundingSphere();
      const m = THREE_V.children[0].children[0]; m.getWorldPosition(b);
      const s = m.geometry.boundingSphere.center.clone().applyMatrix4(m.matrixWorld); s.z = 2.2; s.y = 2.0;
      s.project(V.camera); const r = V.renderer.domElement.getBoundingClientRect();
      return { x: r.left + (s.x + 1) / 2 * r.width, y: r.top + (1 - s.y) / 2 * r.height };
    });
    if (vp.mobile) await page.touchscreen.tap(pt.x, pt.y); else await page.mouse.click(pt.x, pt.y);
    await page.waitForTimeout(800);
    let st = await page.evaluate(() => ({ open: DETAIL.open, title: document.getElementById('dv-title').textContent, hidden: document.getElementById('detail').hidden }));
    assert(st.open && !st.hidden, `[${vp.name}] clic sur une pièce → vue de détail ouverte (« ${st.title} »)`);
    assert(st.title === 'Poulie à gorges', `[${vp.name}] nom affiché = Poulie à gorges`);
    const az1 = await page.evaluate(() => DETAIL.controls.getAzimuthalAngle()); await page.waitForTimeout(3000);
    const az2 = await page.evaluate(() => DETAIL.controls.getAzimuthalAngle());
    assert(Math.abs(az2 - az1) > 0.004, `[${vp.name}] la pièce tourne en continu`);
    await page.click('#dv-play'); await page.waitForTimeout(3000); const az3 = await page.evaluate(() => DETAIL.controls.getAzimuthalAngle()); await page.waitForTimeout(2000);
    const az4 = await page.evaluate(() => DETAIL.controls.getAzimuthalAngle());
    assert(Math.abs(az4 - az3) < 0.003, `[${vp.name}] pause → la rotation s'arrête`);
    await page.click('#dv-play'); assert(await page.evaluate(() => DETAIL.spinning), `[${vp.name}] lecture → la rotation reprend`);
    await page.screenshot({ path: `/tmp/detail_${vp.name}.png` });
    // glisser-déposer manuel
    const c = await page.$('.dv-canvas canvas'); const bb = await c.boundingBox();
    await page.click('#dv-play');
    const a0 = await page.evaluate(() => DETAIL.controls.getAzimuthalAngle());
    await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down(); await page.mouse.move(bb.x + bb.width / 2 + 150, bb.y + bb.height / 2, { steps: 8 }); await page.mouse.up();
    await page.waitForTimeout(400); const a1 = await page.evaluate(() => DETAIL.controls.getAzimuthalAngle());
    assert(Math.abs(a1 - a0) > 0.2, `[${vp.name}] glisser → rotation manuelle`);
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    st = await page.evaluate(() => ({ open: DETAIL.open, hidden: document.getElementById('detail').hidden }));
    assert(!st.open && st.hidden, `[${vp.name}] Échap → retour à l'écran normal`);
    // ouverture par la nomenclature (accessible au clavier) puis fermeture par le bouton ✕
    await page.click('#nomtoggle'); await page.focus('.chip:nth-of-type(7)'); await page.keyboard.press('Enter'); await page.waitForTimeout(600);
    st = await page.evaluate(() => ({ open: DETAIL.open, title: document.getElementById('dv-title').textContent, focus: document.activeElement.id }));
    assert(st.open && st.title === 'Écrou à encoches', `[${vp.name}] clavier : nomenclature → « ${st.title} » ; focus sur ${st.focus}`);
    await page.click('#dv-close'); await page.waitForTimeout(400);
    assert(!(await page.evaluate(() => DETAIL.open)), `[${vp.name}] bouton ✕ → fermeture`);
    // les fonctions existantes marchent toujours
    await page.click('#nomtoggle'); await page.$eval('#seq', b => b.click()); await page.waitForTimeout(800);
    assert(await page.evaluate(() => V.P.seqOn === true), `[${vp.name}] montage pas à pas toujours actif`);
    await page.close();
  }
  console.log(errs.length ? 'ERREURS JS :\n' + errs.join('\n') : 'Aucune erreur JavaScript');
  await browser.close(); if (errs.length) process.exit(1);
})().catch(e => { console.error(e.message); process.exit(1); });

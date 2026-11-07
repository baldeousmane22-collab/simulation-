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
    await page.goto(url, { timeout: 90000 }); await page.waitForTimeout(3000);
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
    // schéma technique affiché en même temps, avec repère, désignation et zones A, B, C…
    const sch = await page.evaluate(() => ({ svg: !!document.querySelector('.dv-schema svg'), ttl: document.querySelector('.dv-schema .ttl').textContent, zones: DETAIL.zones.map(z => z.id + ':' + z.label), des: [...document.querySelectorAll('.dv-schema .tbk .v')].map(t => t.textContent).join(' | ') }));
    assert(sch.svg && /12/.test(sch.ttl) && sch.zones.length >= 3, `[${vp.name}] schéma technique : « ${sch.ttl} » ; zones ${sch.zones.join(' ; ')}`);
    assert(/Poulie à 2 gorges/.test(sch.des), `[${vp.name}] cartouche : ${sch.des}`);
    // schéma → modèle : clic sur la bulle A
    await page.locator('.dv-schema .bub[data-z="A"] .bc').click({ force: true }); await page.waitForTimeout(600);
    let lk = await page.evaluate(() => ({ pin: DETAIL.pinned, band: DETAIL.zonesById.A.A.meshes.some(m => m.visible), svgHot: document.querySelectorAll('.dv-schema .hot[data-z="A"]').length }));
    assert(lk.pin === 'A' && lk.band && lk.svgHot >= 2, `[${vp.name}] clic sur le repère A du schéma → zone A allumée sur la pièce 3D`);
    // modèle → schéma : on vise la gorge 2 sur la pièce 3D (projection du centre de la zone B)
    const zid = await page.evaluate(() => { const r = DETAIL.renderer.domElement.getBoundingClientRect(); const seen = {};
      for (let i = 1; i < 40; i++) for (let j = 1; j < 40; j++) { const z = DETAIL.zoneAt({ clientX: r.left + r.width * i / 40, clientY: r.top + r.height * j / 40 }); if (z) seen[z] = (seen[z] || 0) + 1; }
      return seen.B ? 'B' : JSON.stringify(seen); });
    assert(zid === 'B', `[${vp.name}] pointer la gorge 2 sur la pièce 3D → zone ${zid} reconnue`);
    await page.evaluate((id) => DETAIL.highlight(id), zid);
    assert(await page.evaluate(() => document.querySelectorAll('.dv-schema .hot[data-z="B"]').length >= 2), `[${vp.name}] la zone B s'allume dans le schéma`);
    await page.evaluate(() => DETAIL.pin(null));
    const az1 = await page.evaluate(() => DETAIL.controls.getAzimuthalAngle()); await page.waitForTimeout(3000);
    const az2 = await page.evaluate(() => DETAIL.controls.getAzimuthalAngle());
    assert(Math.abs(az2 - az1) > 0.004, `[${vp.name}] la pièce tourne en continu`);
    await page.click('#dv-play'); await page.waitForTimeout(3000); const az3 = await page.evaluate(() => DETAIL.controls.getAzimuthalAngle()); await page.waitForTimeout(2000);
    const az4 = await page.evaluate(() => DETAIL.controls.getAzimuthalAngle());
    assert(Math.abs(az4 - az3) < 0.003, `[${vp.name}] pause → la rotation s'arrête`);
    await page.click('#dv-play'); assert(await page.evaluate(() => DETAIL.spinning), `[${vp.name}] lecture → la rotation reprend`);
    await page.screenshot({ path: `/tmp/detail_${vp.name}.png` });
    // glisser-déposer manuel
    const c = await page.$('.dv-3d canvas'); const bb = await c.boundingBox();
    await page.click('#dv-play');
    const a0 = await page.evaluate(() => DETAIL.controls.getAzimuthalAngle());
    await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down(); await page.mouse.move(bb.x + bb.width / 2 + 150, bb.y + bb.height / 2, { steps: 8 }); await page.mouse.up();
    await page.waitForTimeout(400); const a1 = await page.evaluate(() => DETAIL.controls.getAzimuthalAngle());
    assert(Math.abs(a1 - a0) > 0.2, `[${vp.name}] glisser → rotation manuelle`);
    // vue éclatée sur un roulement (sous-composants réels), puis vue en coupe, puis retour vue normale
    await page.evaluate(() => DETAIL.show(3)); await page.click('[data-mode=eclatee]'); await page.waitForTimeout(3500);
    let ex = await page.evaluate(() => ({ e: DETAIL.e, n: DETAIL.units.length, moved: DETAIL.units.filter(u => u.obj.position.distanceTo(u.base) > 0.05).length, note: document.querySelector('.dv-note').textContent }));
    assert(ex.e > 0.3 && ex.moved >= 3, `[${vp.name}] vue éclatée : ${ex.moved}/${ex.n} sous-composants se séparent (« ${ex.note} »)`);
    await page.click('[data-mode=coupe]'); await page.waitForTimeout(3000);
    let cp = await page.evaluate(() => ({ vis: DETAIL.innerS.visible && !DETAIL.inner.visible, planes: DETAIL.matsS.filter(m => m.clippingPlanes && m.clippingPlanes.length).length, caps: (() => { let n = 0; DETAIL.innerS.traverse(o => { if (o.userData.isCap) n++; }); return n; })() }));
    assert(cp.vis && cp.planes > 0 && cp.caps > 0, `[${vp.name}] vue en coupe (plan de coupe sur ${cp.planes} matériaux, faces hachurées)`);
    await page.screenshot({ path: `/tmp/detail_coupe_${vp.name}.png` });
    await page.click('[data-mode=normal]'); await page.waitForTimeout(8000);
    let nm = await page.evaluate(() => ({ e: DETAIL.e, vis: DETAIL.inner.visible }));
    assert(nm.e < 0.2 && nm.vis, `[${vp.name}] retour à la vue normale (pièces rassemblées, coupe fermée)`);
    const nt = await page.evaluate(() => { DETAIL.show(7); DETAIL.setMode('eclatee'); return document.querySelector('.dv-note').textContent; });
    assert(/monobloc/.test(nt), `[${vp.name}] pièce monobloc signalée en vue éclatée`);
    const dbg = await page.evaluate(() => [DETAIL.open, document.activeElement && (document.activeElement.id || document.activeElement.tagName)]);
    await page.keyboard.press('Escape'); await page.waitForTimeout(1500);
    st = await page.evaluate(() => ({ open: DETAIL.open, hidden: document.getElementById('detail').hidden }));
    if (st.open || !st.hidden) console.log('debug', JSON.stringify(dbg), JSON.stringify(st));
    assert(!st.open && st.hidden, `[${vp.name}] Échap → retour à l'écran normal`);
    // ouverture par la nomenclature (accessible au clavier) puis fermeture par le bouton ✕
    await page.click('#nomtoggle'); await page.focus('.chip:nth-of-type(7)'); await page.keyboard.press('Enter'); await page.waitForTimeout(600);
    st = await page.evaluate(() => ({ open: DETAIL.open, title: document.getElementById('dv-title').textContent, focus: document.activeElement.id }));
    assert(st.open && st.title === 'Écrou à encoches', `[${vp.name}] clavier : nomenclature → « ${st.title} » ; focus sur ${st.focus}`);
    await page.click('#dv-close'); await page.waitForTimeout(400);
    assert(!(await page.evaluate(() => DETAIL.open)), `[${vp.name}] bouton ✕ → fermeture`);
    // l'état de la simulation est conservé après la loupe
    const before = await page.evaluate(() => ({ cut: V.P.cut, mode: V.P.mode, labels: V.P.labels }));
    await page.evaluate(() => DETAIL.show(12)); await page.waitForTimeout(300); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    const after = await page.evaluate(() => ({ cut: V.P.cut, mode: V.P.mode, labels: V.P.labels }));
    assert(JSON.stringify(before) === JSON.stringify(after), `[${vp.name}] état de la simulation conservé après fermeture`);
    // les fonctions existantes marchent toujours
    await page.click('#nomtoggle'); await page.$eval('#seq', b => b.click()); await page.waitForTimeout(800);
    assert(await page.evaluate(() => V.P.seqOn === true), `[${vp.name}] montage pas à pas toujours actif`);
    await page.close();
  }
  console.log(errs.length ? 'ERREURS JS :\n' + errs.join('\n') : 'Aucune erreur JavaScript');
  await browser.close(); if (errs.length) process.exit(1);
})().catch(e => { console.error(e.message); process.exit(1); });

import * as THREE from 'three';
import { buildTouret, PIECES, ROT, hatchTex } from './touret.js';
import { TAU } from './geo.js';
import SEQ from './seq.json';
import { finish } from './realism.js';

// matériaux réels (couleur, métallique, rugosité) — rendu « atelier »
const FONTE = [0x55635c, 0.25, 0.62], ACIER = [0xa9aeb4, 0.95, 0.32], BRUNI = [0x34373c, 0.75, 0.42], ZINGUE = [0xb7bec5, 0.9, 0.38];
export const REAL = {
  1: FONTE, 2: ACIER, 3: [0xd8dce0, 1.0, 0.16], 4: [0xd8dce0, 1.0, 0.16], 5: [0xb6babe, 0.95, 0.34], 6: ZINGUE, 7: BRUNI,
  8: [0xa8adb3, 0.95, 0.32], 9: [0x8b7b5b, 0.0, 0.9], 10: [0x506059, 0.25, 0.6], 11: [0x8e979e, 0.5, 0.4], 12: [0x585b5f, 0.6, 0.55],
  13: [0x6a7277, 0.45, 0.5], 14: [0x506059, 0.25, 0.6], 16: [0x1c1c1c, 0.0, 0.85], 17: [0xa3a9af, 0.9, 0.38], 18: BRUNI,
  19: [0x232629, 0.1, 0.45], 20: BRUNI, rp: ZINGUE, rm: ZINGUE, em: BRUNI, cm: [0x232629, 0.1, 0.45], vg: BRUNI, bc: [0xcfcfca, 0.0, 0.75],
};
const KIND = { 1: 'paint', 10: 'paint', 14: 'paint', 13: 'paint', 19: 'paint', cm: 'paint', 2: 'turned', 3: 'turned', 4: 'turned', 5: 'turned', 8: 'turned', 12: 'turned', 17: 'turned',
  6: 'oxide', rp: 'oxide', rm: 'oxide', 7: 'oxide', 18: 'oxide', em: 'oxide', 20: 'oxide', vg: 'oxide' };
const _w = new THREE.Vector3(), _sc = new THREE.Vector3();
const EXT = new Set([1, 10, 11, 12, 13, 15, 17, 19, 20]);  // repères visibles sans la coupe
const ease = u => u * u * (3 - 2 * u);
const clamp = u => Math.max(0, Math.min(1, u));

// ---------------------------------------------------------------- étincelles (déterministes : même image pour un même t)
function makeSparks(root) {
  const N = 700, LIFE = 0.55;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 6), col = new Float32Array(N * 6);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }); mat.color.setScalar(1.9);
  const lines = new THREE.LineSegments(geo, mat); lines.frustumCulled = false; root.add(lines);
  // point de contact meule / pièce (à l'avant, un peu au-dessus de l'axe)
  const R = 5.4, phi = 0.28, x0 = (258 - 950) / 100;
  const P0 = new THREE.Vector3(x0, R * Math.sin(phi), R * Math.cos(phi));
  const tang = new THREE.Vector3(0, -Math.cos(phi), Math.sin(phi)).normalize();   // sens de rotation de la meule
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const V = [], PH = [];
  for (let i = 0; i < N; i++) {
    const v = tang.clone().multiplyScalar(9 + 9 * rnd());
    v.x += (rnd() - 0.5) * 5; v.y += (rnd() - 0.5) * 3; v.z += rnd() * 4;
    V.push(v); PH.push(rnd() * LIFE);
  }
  const g = new THREE.Vector3(0, -14, 0);
  const at = (i, a, out) => out.copy(P0).addScaledVector(V[i], a).addScaledVector(g, 0.5 * a * a);
  const A = new THREE.Vector3(), B = new THREE.Vector3();
  // pièce à affûter + support d'outil (accessoires, sans repère)
  const steel = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.9, roughness: 0.3 });
  const work = new THREE.Group();
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 4.2), steel); bar.position.set(x0, P0.y - 0.05, P0.z + 2.05); bar.rotation.x = 0.12;
  const hot = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.47, 0.25), new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0xff5a00, emissiveIntensity: 3.0 }));
  hot.position.set(x0, P0.y - 0.05, P0.z + 0.08);
  const rest = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.25, 1.9), new THREE.MeshStandardMaterial({ color: 0x343a40, metalness: 0.6, roughness: 0.5 }));
  rest.position.set(x0, P0.y - 0.45, P0.z + 1.1);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.4, 0.3), rest.material); arm.position.set(x0 + 1.1, P0.y - 2.6, P0.z + 1.6);
  work.add(bar, hot, rest, arm); root.add(work);
  const light = new THREE.PointLight(0xff8a2a, 0, 9); light.position.copy(P0).add(new THREE.Vector3(0, -0.5, 0.8)); root.add(light);
  return {
    set(t, on, sc = 1) {
      lines.visible = work.visible = on; light.intensity = on ? (18 + 6 * Math.sin(t * 37)) * sc * sc : 0; light.distance = 9 * sc;
      if (!on) return;
      for (let i = 0; i < N; i++) {
        const a = (t + PH[i]) % LIFE;
        at(i, a, A); at(i, Math.max(0, a - 0.05), B);
        pos.set([A.x, A.y, A.z, B.x, B.y, B.z], i * 6);
        const k = 1 - a / LIFE;                               // refroidissement : blanc → orange → rouge
        const c1 = [1, 0.35 + 0.55 * k * k, 0.05 + 0.5 * k * k * k];
        col.set([...c1, 1, 0.3 + 0.3 * k, 0.05], i * 6);
      }
      geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
    },
  };
}

export const touretScene = {
  title: 'Touret à meuler',
  cut: true, explode0: 0, mode0: 'piece', floorY: -5.45, minD: 6, maxD: 70,
  bg: ['#6f777e', '#2c3137'],
  cam: [8.5, 7.5, 37, 0.6, 0.6, 0],
  SEQ,
  build(root) {
    const T = buildTouret(root);
    window.TOURET = T;
    const sparks = makeSparks(root);
    const base = {};
    for (const [k, l] of Object.entries(T.labelObjs)) base[k] = l.position.clone();
    const stepOf = {}; SEQ.steps.forEach((s, i) => { stepOf[s.k] = s; s.i = i; });
    let lastSeqOn = null, lastT = null, ang = 0, omega = 0.5;
    return {
      update(t, P) {
        // temps de la séquence de montage (−1 = pas de séquence)
        let s = -1;
        if (P.seqFixed !== undefined && P.seqFixed !== null) s = P.seqFixed;
        else if (P.seqStartMs) s = (performance.now() - P.seqStartMs) / 1000;
        const seqOn = s >= 0 && s < SEQ.end + 0.3;
        if (P.seqStartMs && s >= SEQ.end + 0.3) { P.seqStartMs = 0; if (P.onSeqEnd) P.onSeqEnd(); }
        P.seqActive = null;
        const running = !seqOn;
        // vitesse : lente pour l'étude, montée en régime quand on met « en marche », puis ralentissement
        const dt = lastT === null ? 0 : Math.max(0, Math.min(0.1, t - lastT)); lastT = t;
        const target = P.sparks ? 2.4 : 0.5;
        omega += (target - omega) * Math.min(1, dt * 0.9); ang += omega * TAU * dt;
        P.omega01 = Math.max(0, Math.min(1, (omega - 0.3) / 2.1)); P.grinding = !!P.sparks && (omega > 1.8 || P.fixedSpeed) && !P.cut;
        { const lm = T.parts[15].labelMats; if (lm) { const k = Math.max(0, Math.min(1, (omega - 1.1) / 1.0)); lm[0].opacity = 1 - k; lm[1].opacity = k; } }
        const th = running ? (P.fixedSpeed ? t * TAU * 0.5 : ang) : 0;
        const e = seqOn ? 0 : P.explode;
        for (const [key, p] of Object.entries(T.parts)) {
          if (p.bx === undefined) { p.bx = p.g.position.x; p.by = p.g.position.y; }
          let ox = (p.dx || 0) * e, oy = (p.dy || 0) * e, vis = true, extra = 0;
          const st = stepOf[key];
          if (seqOn && st) {
            const u = clamp((s - st.t0) / st.d);
            if (s < st.t0) vis = false;
            const k = 1 - ease(u);
            ox = st.from[0] * k; oy = st.from[1] * k;
            if (st.screw) extra = -k * TAU * 3;                 // vissage : l'écrou tourne en avançant
            if (u > 0 && u < 1 && !st.dup) P.seqActive = st;
          }
          p.g.visible = vis;
          p.g.position.x = p.bx + ox; p.g.position.y = p.by + oy;
          if (p.spin) p.spin.rotation.x = (p.rot ? th : 0) + extra;
          if (p.bearing) {
            p.bearing.set(-th, 0);
            p.bearing.balls.forEach(b => { b.getWorldPosition(_w); root.worldToLocal(_w); b.visible = !(P.cut && _w.z > 0.05); });
          }
        }
        if (seqOn && s >= SEQ.end - 0.01) P.seqActive = null;
        for (const [k, l] of Object.entries(T.labelObjs)) {
          const p = T.parts[k];
          l.position.set(base[k].x + p.g.position.x - p.bx, base[k].y + p.g.position.y - p.by, base[k].z);
          const st = stepOf[k];
          l.visible = P.labels && p.g.visible && (!seqOn || !st || s >= st.t0 + st.d * 0.9) && (P.cut || EXT.has(+k) || P.explode > 0.3);
        }
        root.getWorldScale(_sc); sparks.set(t, P.grinding && running && e < 0.02, _sc.x);
        lastSeqOn = seqOn;
      },
      onState(P) {
        for (const [key, p] of Object.entries(T.parts)) {
          if (p.num === 15) continue;                    // la meule garde son aspect abrasif
          if (p.num === 11 && P.mode !== 'reel') continue; // carter transparent
          const own = p.num && PIECES[p.num] ? PIECES[p.num][1] : (p.col || 0xadb5bd);
          let col = own, met = 0.4, rough = null;
          if (P.mode === 'rotation') col = p.rot ? 0xf5c816 : 0xb7bfc9;
          else if (P.mode === 'reel') { const r = REAL[key] || REAL[p.num] || ACIER; [col, met, rough] = r; }
          p.mats.forEach(m => { m.color.set(col); m.metalness = met; if (rough !== null) m.roughness = rough; else m.roughness = 0.45; finish(m, P.mode === 'reel' ? KIND[key] : null); });
          const cc = P.mode === 'reel' ? new THREE.Color(col).multiplyScalar(p.hatch ? 0.7 : 0.42).getHex() : col;   // face coupée un peu plus sombre (pas d'éblouissement)
          p.capMats.forEach(cm => { if (p.hatch) { cm.map = hatchTex(cc, p.dir || 1); cm.color.set(0xffffff); } else { cm.map = null; cm.color.set(cc); } cm.needsUpdate = true; });
        }
      },
    };
  },
};

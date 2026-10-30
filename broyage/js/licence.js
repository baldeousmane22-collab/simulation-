/* =====================================================================
   licence.js — Activation de l'application par code (licence)
   - Chaque appareil reçoit un identifiant (ex. K7Q2-M9XD) affiché au client.
   - Le vendeur crée un code avec generateur-codes.html et SA clé privée.
   - L'appli vérifie la signature avec la clé publique ci-dessous : on ne
     peut pas fabriquer de code sans la clé privée (jamais dans le dépôt).
   - Sans licence : mode démonstration de quelques minutes.
   ===================================================================== */
'use strict';
(() => {
  const CONFIG = {
    app: 'broyage',
    nomApp: 'Chaîne de broyage 3D',
    vendeur: 'Baldé, formateur IRAM Boké',
    whatsapp: '',          // numéro du vendeur au format international sans + (ex. 224620000000) ; vide = bouton masqué
    demoMinutes: 5,
    clePublique: { kty: 'EC', crv: 'P-256', x: 'EeM9sf_NQY1m0VYg2_LRQ35oMruzHb1eX7sA0SrrNS0', y: 'GNEgWuPDpHkTAEpKbnHj4bUv6k872o226xinMfXe-jM' }
  };
  const CLE_ID = 'licence-appareil', CLE_CODE = 'licence-code-' + CONFIG.app;

  const lire = (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } };
  const ecrire = (k, v) => { try { localStorage.setItem(k, v); } catch (_) { /* stockage indisponible */ } };

  // identifiant de l'appareil : 8 caractères faciles à dicter (sans 0/O, 1/I)
  function identifiant() {
    let id = lire(CLE_ID);
    if (!id || !/^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(id)) {
      const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', o = new Uint8Array(8);
      crypto.getRandomValues(o);
      const s = Array.from(o, b => A[b % A.length]).join('');
      id = s.slice(0, 4) + '-' + s.slice(4);
      ecrire(CLE_ID, id);
    }
    return id;
  }

  const b64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));

  // code = base64url(contenu) "." base64url(signature ECDSA P-256 / SHA-256)
  // contenu = "L1|app|identifiant|expiration AAAAMMJJ ou 0|client"
  async function verifier(code, id) {
    if (!window.crypto || !crypto.subtle) return { ok: false, err: 'Vérification impossible : ouvrez l\'appli en https ou depuis l\'APK.' };
    const brut = String(code || '').replace(/\s+/g, '');
    const [p, sg] = brut.split('.');
    if (!p || !sg) return { ok: false, err: 'Code incomplet : copiez-le en entier.' };
    let donnees, sig, txt;
    try { donnees = b64u(p); sig = b64u(sg); txt = new TextDecoder().decode(donnees); } catch (_) { return { ok: false, err: 'Code illisible.' }; }
    let valide = false;
    try {
      const cle = await crypto.subtle.importKey('jwk', CONFIG.clePublique, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
      valide = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, cle, sig, donnees);
    } catch (_) { valide = false; }
    if (!valide) return { ok: false, err: 'Code invalide.' };
    const [v, app, idc, exp, client] = txt.split('|');
    if (v !== 'L1' || app !== CONFIG.app) return { ok: false, err: 'Ce code est pour une autre application.' };
    if (idc !== id) return { ok: false, err: `Ce code est pour un autre appareil (${idc}).` };
    if (exp !== '0') {
      const d = new Date(+exp.slice(0, 4), +exp.slice(4, 6) - 1, +exp.slice(6, 8), 23, 59, 59);
      if (Date.now() > d.getTime()) return { ok: false, err: `Licence expirée le ${d.toLocaleDateString('fr-FR')}.` };
      return { ok: true, client, exp: d };
    }
    return { ok: true, client, exp: null };
  }

  // ---------- Écran d'activation ----------
  const style = document.createElement('style');
  style.textContent = `
  .lic-fond { position: fixed; inset: 0; z-index: 9999; background: rgba(2,6,23,.92); display: flex; align-items: center; justify-content: center; padding: 16px; }
  .lic-boite { width: min(420px, 100%); max-height: 100%; overflow-y: auto; background: #111c33; border: 1px solid #26334f; border-radius: 14px; padding: 16px; color: #e2e8f0; font: 15px/1.45 system-ui, sans-serif; }
  .lic-boite h2 { margin: 0 0 4px; font-size: 18px; color: #fde68a; }
  .lic-boite p { margin: 6px 0; font-size: 13.5px; color: #cbd5e1; }
  .lic-id { display: flex; gap: 8px; align-items: center; margin: 8px 0; }
  .lic-id b { font: 700 22px ui-monospace, Consolas, monospace; letter-spacing: 2px; color: #fff; background: #0b1220; border: 1px dashed #f59e0b; border-radius: 8px; padding: 4px 10px; }
  .lic-boite textarea { width: 100%; min-height: 70px; background: #0b1220; color: #e2e8f0; border: 1px solid #26334f; border-radius: 8px; padding: 8px; font: 12px ui-monospace, Consolas, monospace; resize: vertical; box-sizing: border-box; }
  .lic-boite button, .lic-boite a.lic-btn { display: inline-block; font: inherit; border-radius: 8px; padding: 8px 12px; margin: 8px 6px 0 0; cursor: pointer; border: 1px solid #26334f; background: #16213b; color: #e2e8f0; text-decoration: none; }
  .lic-boite .lic-prim { background: #f59e0b; border-color: #f59e0b; color: #111; font-weight: 700; }
  .lic-boite .lic-wa { background: #16a34a; border-color: #16a34a; color: #fff; }
  .lic-msg { min-height: 20px; font-size: 13px; margin-top: 6px; }
  .lic-msg.ko { color: #fca5a5; } .lic-msg.ok { color: #86efac; }
  .lic-demo { position: fixed; z-index: 9998; left: 50%; transform: translateX(-50%); top: 6px; background: rgba(127,29,29,.92); color: #fff; border-radius: 999px; padding: 3px 12px; font: 600 12px system-ui, sans-serif; pointer-events: none; }`;
  document.head.appendChild(style);

  const id = identifiant();
  let fond = null, bandeau = null, minuterie = null;

  function ecran(message) {
    if (fond) return;
    fond = document.createElement('div'); fond.className = 'lic-fond';
    const lienWa = CONFIG.whatsapp ? `https://wa.me/${encodeURIComponent(CONFIG.whatsapp)}?text=${encodeURIComponent(`Bonjour, je souhaite acheter une licence de « ${CONFIG.nomApp} ». Identifiant de mon appareil : ${id}`)}` : '';
    fond.innerHTML = `<div class="lic-boite" role="dialog" aria-modal="true" aria-labelledby="lic-titre">
      <h2 id="lic-titre">🔒 Activation de l'application</h2>
      <p><b>${CONFIG.nomApp}</b> — ${CONFIG.vendeur}</p>
      ${message ? `<p class="lic-msg ko">${message}</p>` : ''}
      <p>1. Envoyez cet <b>identifiant d'appareil</b> au vendeur :</p>
      <div class="lic-id"><b id="lic-id">${id}</b><button type="button" id="lic-copier">Copier</button></div>
      ${lienWa ? `<a class="lic-btn lic-wa" href="${lienWa}" target="_blank" rel="noopener">Acheter par WhatsApp</a>` : ''}
      <p>2. Collez ici le <b>code d'activation</b> reçu :</p>
      <textarea id="lic-code" spellcheck="false" autocomplete="off" placeholder="Collez le code d'activation"></textarea>
      <div class="lic-msg" id="lic-msg"></div>
      <button type="button" class="lic-prim" id="lic-activer">Activer</button>
      <button type="button" id="lic-demo">Essayer (démo ${CONFIG.demoMinutes} min)</button>
    </div>`;
    document.body.appendChild(fond);
    const msg = fond.querySelector('#lic-msg');
    fond.querySelector('#lic-copier').onclick = () => {
      (navigator.clipboard ? navigator.clipboard.writeText(id) : Promise.reject()).then(() => { msg.className = 'lic-msg ok'; msg.textContent = 'Identifiant copié.'; })
        .catch(() => { msg.className = 'lic-msg'; msg.textContent = 'Recopiez l\'identifiant : ' + id; });
    };
    fond.querySelector('#lic-activer').onclick = async () => {
      const code = fond.querySelector('#lic-code').value;
      const r = await verifier(code, id);
      if (!r.ok) { msg.className = 'lic-msg ko'; msg.textContent = r.err; return; }
      ecrire(CLE_CODE, code.replace(/\s+/g, ''));
      msg.className = 'lic-msg ok'; msg.textContent = 'Application activée. Merci !';
      setTimeout(() => activee(r), 700);
    };
    fond.querySelector('#lic-demo').onclick = demo;
    const pre = lireCodeLien();
    if (pre) { fond.querySelector('#lic-code').value = pre; fond.querySelector('#lic-activer').click(); }
  }
  function fermer() { if (fond) { fond.remove(); fond = null; } }

  function demo() {
    fermer();
    if (!bandeau) { bandeau = document.createElement('div'); bandeau.className = 'lic-demo'; document.body.appendChild(bandeau); }
    let reste = CONFIG.demoMinutes * 60;
    const maj = () => { bandeau.textContent = `Version de démonstration · ${Math.floor(reste / 60)}:${String(reste % 60).padStart(2, '0')}`; };
    maj();
    clearInterval(minuterie);
    minuterie = setInterval(() => {
      reste--; maj();
      if (reste <= 0) { clearInterval(minuterie); ecran('Fin de la démonstration : activez l\'application pour continuer.'); }
    }, 1000);
  }

  function activee(r) {
    fermer(); clearInterval(minuterie);
    if (bandeau) { bandeau.remove(); bandeau = null; }
    window.LICENCE = { client: r.client, expiration: r.exp, appareil: id };
    // rappel 7 jours avant la fin d'une licence limitée
    if (r.exp && r.exp.getTime() - Date.now() < 7 * 864e5) {
      const b = document.createElement('div'); b.className = 'lic-demo'; b.style.background = 'rgba(180,83,9,.92)';
      b.textContent = `Licence valable jusqu'au ${r.exp.toLocaleDateString('fr-FR')}`; document.body.appendChild(b);
      setTimeout(() => b.remove(), 8000);
    }
  }

  // code transmis par lien : …/broyage/#licence=CODE
  function lireCodeLien() {
    const m = location.hash.match(/licence=([A-Za-z0-9_.-]+)/);
    if (!m) return '';
    try { history.replaceState(null, '', location.pathname + location.search); } catch (_) { /* rien */ }
    return m[1];
  }

  async function demarrer() {
    const lien = lireCodeLien();
    const code = lien || lire(CLE_CODE);
    if (code) {
      const r = await verifier(code, id);
      if (r.ok) { if (lien) ecrire(CLE_CODE, lien); activee(r); return; }
      ecran(r.err);
      return;
    }
    ecran('');
  }
  if (document.body) demarrer(); else document.addEventListener('DOMContentLoaded', demarrer);
})();

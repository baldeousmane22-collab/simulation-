/* =====================================================================
   generateur.js — Création des codes d'activation (outil du vendeur)
   Signe "L1|app|identifiant|expiration|client" avec la clé privée ECDSA
   P-256 du vendeur. La clé reste dans ce navigateur.
   ===================================================================== */
'use strict';
(() => {
  const $ = (id) => document.getElementById(id);
  const LIENS = { broyage: 'https://baldeousmane22-collab.github.io/simulation-/broyage/' };
  const NOMS = { broyage: 'Chaîne de broyage 3D' };
  const K_CLE = 'vendeur-cle-privee', K_HIST = 'vendeur-ventes';
  let cle = null;
  const lire = (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } };
  const ecrire = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (_) { /* rien */ } };
  const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const echap = (t) => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  async function chargerCle(texte, memoriser) {
    const o = JSON.parse(texte), jwk = o.jwk || o;
    if (jwk.kty !== 'EC' || jwk.crv !== 'P-256' || !jwk.d) throw new Error('Ce fichier n\'est pas une clé privée valide.');
    cle = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
    cle.pub = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    if (memoriser) ecrire(K_CLE, texte);
    $('etat-cle').innerHTML = '<span class="ok">✔ Clé privée chargée.</span>' + (lire(K_CLE) ? ' (mémorisée sur cet appareil)' : '');
    $('oublier').hidden = !lire(K_CLE);
  }

  $('fichier').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { await chargerCle(await f.text(), $('memoriser').checked); } catch (err) { $('etat-cle').innerHTML = `<span class="ko">${echap(err.message)}</span>`; }
  };
  $('oublier').onclick = () => { ecrire(K_CLE, null); cle = null; $('etat-cle').textContent = 'Clé oubliée sur cet appareil.'; $('oublier').hidden = true; };
  $('duree').onchange = () => { $('date').disabled = $('duree').value !== 'date'; };
  $('appareil').oninput = (e) => {
    let v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    if (v.length > 4) v = v.slice(0, 4) + '-' + v.slice(4);
    e.target.value = v;
  };

  function expiration() {
    const d = $('duree').value;
    if (d === '0') return { txt: '0', lisible: 'illimitée' };
    let fin;
    if (d === 'date') { if (!$('date').value) return null; const [a, m, j] = $('date').value.split('-').map(Number); fin = new Date(a, m - 1, j); }
    else { fin = new Date(); fin.setDate(fin.getDate() + Number(d)); }
    const p = (n) => String(n).padStart(2, '0');
    return { txt: `${fin.getFullYear()}${p(fin.getMonth() + 1)}${p(fin.getDate())}`, lisible: 'jusqu\'au ' + fin.toLocaleDateString('fr-FR') };
  }

  $('generer').onclick = async () => {
    const msg = $('msg'); msg.className = 'note';
    if (!cle) { msg.className = 'ko'; msg.textContent = 'Chargez d\'abord votre clé privée (étape 1).'; return; }
    const client = $('client').value.replace(/[|\r\n]/g, ' ').trim().slice(0, 40);
    const id = $('appareil').value.trim();
    const app = $('appli').value, exp = expiration();
    if (!client) { msg.className = 'ko'; msg.textContent = 'Indiquez le nom du client.'; return; }
    if (!/^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(id)) { msg.className = 'ko'; msg.textContent = 'Identifiant d\'appareil invalide (format XXXX-XXXX, affiché dans l\'appli).'; return; }
    if (!exp) { msg.className = 'ko'; msg.textContent = 'Choisissez la date de fin.'; return; }
    const donnees = new TextEncoder().encode(['L1', app, id, exp.txt, client].join('|'));
    const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, cle, donnees);
    if (!(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, cle.pub, sig, donnees))) { msg.className = 'ko'; msg.textContent = 'Erreur de signature.'; return; }
    const code = b64u(donnees) + '.' + b64u(sig);
    const lien = `${LIENS[app]}#licence=${code}`;
    const texte = `Bonjour ${client},\nMerci pour votre achat de « ${NOMS[app]} » (licence ${exp.lisible}).\n\nCode d'activation (à coller dans l'appli) :\n${code}\n\nVersion web, activation directe :\n${lien}`;
    $('code').value = code;
    $('copier').onclick = () => navigator.clipboard.writeText(code).then(() => { msg.className = 'ok'; msg.textContent = 'Code copié.'; });
    $('copier-msg').onclick = () => navigator.clipboard.writeText(texte).then(() => { msg.className = 'ok'; msg.textContent = 'Message copié.'; });
    $('whatsapp').href = 'https://wa.me/?text=' + encodeURIComponent(texte);
    $('resultat').hidden = false;
    msg.className = 'ok'; msg.textContent = `Code créé pour ${client} (${id}), licence ${exp.lisible}.`;
    const h = JSON.parse(lire(K_HIST) || '[]');
    h.unshift({ date: new Date().toLocaleDateString('fr-FR'), client, appareil: id, app, licence: exp.lisible, prix: $('prix').value.trim(), code });
    ecrire(K_HIST, JSON.stringify(h.slice(0, 500)));
    afficherHistorique();
  };

  function afficherHistorique() {
    const h = JSON.parse(lire(K_HIST) || '[]');
    $('historique').innerHTML = h.length ? `<table><tr><th>Date</th><th>Client</th><th>Appareil</th><th>Licence</th><th>Prix</th></tr>${
      h.map(v => `<tr><td>${echap(v.date)}</td><td>${echap(v.client)}</td><td>${echap(v.appareil)}</td><td>${echap(v.licence)}</td><td>${echap(v.prix)}</td></tr>`).join('')}</table>` : 'Aucune vente.';
  }
  $('export').onclick = () => {
    const h = JSON.parse(lire(K_HIST) || '[]');
    const csv = '﻿Date;Client;Appareil;Application;Licence;Prix;Code\n' + h.map(v => [v.date, v.client, v.appareil, v.app, v.licence, v.prix, v.code].map(x => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'ventes-licences.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  if (!window.crypto || !crypto.subtle) $('etat-cle').innerHTML = '<span class="ko">Ouvrez cette page en https (lien GitHub Pages) : la signature est impossible ici.</span>';
  else if (lire(K_CLE)) chargerCle(lire(K_CLE), false).catch(() => {});
  afficherHistorique();
})();

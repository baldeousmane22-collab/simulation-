/* =====================================================================
   app.js — Interface du banc « pompe centrifuge » (appli autonome)
   ---------------------------------------------------------------------
   Commandes, mesures, courbes, pannes, quiz, fiches et boucle
   d'animation. Le bouton « retour » du téléphone ferme d'abord la fiche.
   ===================================================================== */

import { SimulationPompe, CARAC, pressionVapeur } from './simulation.js';
import { FICHES, PANNES, QUIZ, PROCEDURE } from './donnees.js';
import { svgCourbes, majCourbes } from './courbes.js';

const $ = (sel, racine = document) => racine.querySelector(sel);
const $$ = (sel, racine = document) => [...racine.querySelectorAll(sel)];
const fr = (v, d = 1) => v.toFixed(d).replace('.', ',').replace(/^-(0,0*)$/, '$1');

const sim = new SimulationPompe();
let scene = null;
let enCours = false, dernierTemps = 0, compteurUI = 0;
let ongletActif = 'commandes';
let panneMystere = null;

window.__pompe = { sim, get scene() { return scene; } };

/* =====================================================================
   3D ET BOUCLE D'ANIMATION
   ===================================================================== */
async function initialiser3D() {
  try {
    const essai = document.createElement('canvas');
    if (!(essai.getContext('webgl2') || essai.getContext('webgl'))) throw new Error('WebGL indisponible');
    const { ScenePompe } = await import('./scene3d.js');
    scene = new ScenePompe($('#pc-canvas'), (id) => ouvrirFiche(id));
    $('#pc-chargement').hidden = true;
    new ResizeObserver(() => { if (scene) { majZones(); scene.redimensionner(); } }).observe($('#pc-vue3d'));
    majZones();
    scene.redimensionner();
    demarrerBoucle();
  } catch (err) {
    console.error(err);
    $('#pc-chargement').hidden = true;
    $('#erreur-webgl').hidden = false;
  }
}

function demarrerBoucle() {
  if (enCours) return;
  enCours = true;
  dernierTemps = performance.now();
  requestAnimationFrame(image);
}
function arreterBoucle() { enCours = false; }

function image(t) {
  if (!enCours) return;
  requestAnimationFrame(image);
  const dt = Math.min(0.05, Math.max(0, (t - dernierTemps) / 1000));
  dernierTemps = t;
  if (!scene) return;
  sim.calculer(dt);
  scene.maj(sim, dt);
  scene.rendre(dt);
  if (++compteurUI % 6 === 0) majInterface();
}

document.addEventListener('visibilitychange', () => { if (document.hidden) arreterBoucle(); else demarrerBoucle(); });

/* Zones de la vue recouvertes par les boutons (cadrage et étiquettes) */
function majZones() {
  if (!scene) return;
  const zone = $('#pc-canvas').getBoundingClientRect();
  const rects = [];
  const ajouter = (el) => {
    if (!el || el.hidden || el.offsetParent === null) return null;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return null;
    const o = { x0: r.left - zone.left, y0: r.top - zone.top, x1: r.right - zone.left, y1: r.bottom - zone.top };
    rects.push(o);
    return o;
  };
  $$('#pompe .barre-haut > *').forEach(ajouter);
  $$('#pompe .hud-pression').forEach(ajouter);
  ajouter($('#pc-alerte'));
  const legende = ajouter($('#pompe .legende-3d'));
  const recentrer = ajouter($('#pc-recentrer'));
  scene.setObstacles(rects);
  const hud = $('#pompe .hud-ligne').getBoundingClientRect();
  const bas = [legende, recentrer].filter(Boolean).map(r => r.y0);
  scene.setMarges({
    haut: Math.max(0, hud.bottom - zone.top + 4),
    bas: bas.length ? Math.max(0, zone.height - Math.min(...bas) + 4) : 0,
    gauche: 0, droite: 0
  });
}

/* =====================================================================
   COMMANDES
   ===================================================================== */
$('#pc-recentrer').addEventListener('click', () => scene && scene.recentrer());
$('#pc-etiquettes').addEventListener('click', (e) => {
  const b = e.currentTarget;
  const val = b.getAttribute('aria-pressed') !== 'true';
  b.setAttribute('aria-pressed', String(val));
  scene && scene.setEtiquettes(val);
});
$('#pc-replier').addEventListener('click', () => $('#pc-panneau').classList.toggle('replie'));

$('#pc-marche').addEventListener('click', () => {
  sim.cmd.marche = !sim.cmd.marche;
  if (sim.cmd.marche && sim.cmd.vanneRef > 30) flash('Démarrage vanne de refoulement ouverte : l\'appel de puissance est plus fort. On démarre normalement vanne presque fermée, puis on ouvre progressivement.');
  majCommandes();
});
$$('#pompe [data-pc-vanne]').forEach(b => b.addEventListener('click', () => { sim.cmd.vanneRef = Number(b.dataset.pcVanne); majCommandes(); }));
$('#pc-vanne-asp').addEventListener('click', () => {
  sim.cmd.vanneAsp = !sim.cmd.vanneAsp;
  if (!sim.cmd.vanneAsp && sim.cmd.marche) flash('Vanne d\'aspiration fermée pompe en marche : regardez le vacuomètre et la cavitation. Rouvrez-la vite !');
  majCommandes();
});
$('#pc-amorcer').addEventListener('click', () => {
  if (sim.amorcee) { flash('La pompe est déjà amorcée : le corps et l\'aspiration sont pleins d\'eau.'); return; }
  if (!sim.amorcer()) { flash('Arrêtez d\'abord la pompe : on amorce pompe arrêtée, par le bouchon d\'amorçage (purge d\'air ouverte).'); return; }
  flash('Pompe amorcée : le corps de pompe et la conduite d\'aspiration sont remplis d\'eau (bouchon d\'amorçage).' + (sim.pannes.clapetPied ? ' Mais si le clapet de pied fuit, elle se videra au prochain arrêt…' : ''));
  majTout();
});

const curseurs = {
  vanneRef: ['#pc-curseur-v', (x) => `${x} %`],
  frequence: ['#pc-curseur-f', (x) => `${x} Hz (${Math.round(CARAC.N0 * x / 50)} tr/min)`],
  aspiration: ['#pc-curseur-a', (x) => x < 0 ? `en charge de ${fr(-x)} m` : x === 0 ? 'niveau à l\'axe' : `${fr(x)} m`],
  temperature: ['#pc-curseur-t', (x) => `${x} °C (Pv = ${fr(pressionVapeur(x), 2)} m)`]
};
for (const [cle, [sel]] of Object.entries(curseurs)) {
  $(sel).addEventListener('input', (e) => { sim.cmd[cle] = Number(e.target.value); majCommandes(); });
}

$('#pc-reinit').addEventListener('click', () => {
  sim.reinitialiser();
  panneMystere = null;
  $('#pc-mystere-choix').hidden = true; $('#pc-mystere-resultat').hidden = true; $('#pc-detail-panne').hidden = true;
  if (scene) { scene.selectionner(null); scene.recentrer(); }
  majTout();
});

let finFlash = 0;
function flash(texte) {
  finFlash = performance.now() + 4000;
  $('#pc-message').textContent = texte;
}

function majCommandes() {
  const c = sim.cmd;
  const b = $('#pc-marche');
  b.setAttribute('aria-pressed', String(c.marche));
  b.querySelector('small').textContent = c.marche ? 'MARCHE' : 'ARRÊT';
  $$('#pompe [data-pc-vanne]').forEach(x => x.classList.toggle('actif', Number(x.dataset.pcVanne) === c.vanneRef));
  const va = $('#pc-vanne-asp');
  va.setAttribute('aria-pressed', String(!c.vanneAsp));
  va.textContent = c.vanneAsp ? 'Vanne d\'aspiration : ouverte' : '⚠️ Vanne d\'aspiration : FERMÉE';
  for (const [cle, [sel, texte]] of Object.entries(curseurs)) {
    $(sel).value = c[cle];
    $(sel + '-val').textContent = texte(c[cle]);
  }
}

/* Procédure de démarrage : étapes cochées automatiquement */
const listeProc = $('#pc-procedure');
PROCEDURE.forEach(t => { const li = document.createElement('li'); li.textContent = t; listeProc.appendChild(li); });
function majProcedure() {
  const c = sim.cmd, tourne = sim.n > 0.3;
  const faits = [
    sim.amorcee,
    c.vanneAsp,
    tourne ? majProcedure.demarreFerme : c.vanneRef <= 15,
    tourne && !sim.pannes.sens,
    tourne && c.vanneRef > 15 && sim.cavitation < 0.15 && majProcedure.demarreFerme
  ];
  // On retient si la pompe a démarré vanne presque fermée
  if (!tourne) majProcedure.demarreFerme = c.vanneRef <= 15;
  $$('li', listeProc).forEach((li, k) => li.classList.toggle('faite', !!faits[k]));
}

/* Mesures, message et alerte (≈ 10 fois par seconde) */
function majInterface() {
  const r = sim.res;
  $('#pc-hud-q').textContent = fr(sim.Q);
  $('#pc-hud-h').textContent = fr(sim.H);
  $('#pc-m-n').textContent = `${Math.round(sim.vitesse)} tr/min`;
  $('#pc-m-q').textContent = `${fr(sim.Q)} m³/h`;
  $('#pc-m-pa').textContent = `${fr(r.pAsp, 2)} bar`;
  $('#pc-m-pr').textContent = `${fr(r.pRef, 2)} bar`;
  $('#pc-m-h').textContent = `${fr(sim.H)} m`;
  $('#pc-m-p').textContent = `${fr(r.puissance, 2)} kW`;
  $('#pc-m-i').textContent = `${fr(r.intensite)} A`;
  $('#pc-c-i').classList.toggle('alarme', r.intensite > CARAC.I_NOM * 1.05);
  $('#pc-m-eta').textContent = r.rendement > 0.01 ? `${Math.round(r.rendement * 100)} %` : '—';
  $('#pc-m-npsh').textContent = sim.n > 0.05 ? `${fr(r.npshDisp)} / ${fr(r.npshReq)} m` : `${fr(r.npshDisp)} m / —`;
  $('#pc-c-npsh').classList.toggle('alarme', sim.cavitation > 0.15);
  $('#pc-m-vib').textContent = `${fr(r.vibration)} mm/s`;
  $('#pc-c-vib').classList.toggle('alarme', r.vibration > 7.1);
  $('#pc-m-tc').textContent = `${Math.round(sim.tCorps)} °C`;
  $('#pc-c-tc').classList.toggle('alarme', sim.tCorps > 85);
  $('#pc-m-tp').textContent = `${Math.round(sim.tPalier)} °C`;
  $('#pc-c-tp').classList.toggle('alarme', sim.tPalier > 80);
  const hmt = (r.pRef - r.pAsp) * 10.2;
  const n = sim.n;
  $('#pc-calcul').innerHTML = `
    <p>HMT ≈ (p<sub>ref</sub> − p<sub>asp</sub>) × 10,2 = (${fr(r.pRef, 2)} − (${fr(r.pAsp, 2)})) × 10,2 ≈ <b>${fr(hmt)} m</b></p>
    <p>Puissance hydraulique = ρ·g·Q·H = 1000 × 9,81 × ${fr(sim.Q / 3600, 4)} m³/s × ${fr(sim.H)} m ≈ <b>${fr(r.puissanceHyd * 1000, 0)} W</b></p>
    <p>Rendement = P<sub>hyd</sub> / P<sub>absorbée</sub> = ${fr(r.puissanceHyd, 2)} / ${fr(r.puissance, 2)} kW ≈ <b>${r.rendement > 0.01 ? Math.round(r.rendement * 100) + ' %' : '—'}</b></p>
    <p>Similitude à ${fr(n * 50, 0)} Hz (N/N₀ = ${fr(n, 2)}) : Q × ${fr(n, 2)}, H × ${fr(n * n, 2)}, P × ${fr(n * n * n, 2)}</p>`;
  if (performance.now() > finFlash) {
    const m = $('#pc-message');
    if (m.textContent !== r.message) m.textContent = r.message;
  }
  const al = $('#pc-alerte');
  if (al.hidden !== !r.alerte) { al.hidden = !r.alerte; majZones(); }
  if (r.alerte && al.textContent !== r.alerte) al.textContent = r.alerte;
  al.classList.toggle('vert', !!r.alerteVerte);
  majProcedure();
  if (ongletActif === 'courbes') majCourbes($('#pc-courbes'), sim);
}

function majTout() { majCommandes(); majPannes(); majInterface(); }

/* =====================================================================
   ONGLETS
   ===================================================================== */
const TITRES = { commandes: 'Pompe centrifuge', courbes: 'Courbes caractéristiques', pannes: 'Pannes de pompe', quiz: 'Quiz pompe centrifuge' };
$$('[data-pc-onglet]').forEach(b => b.addEventListener('click', () => choisirOnglet(b.dataset.pcOnglet)));

function choisirOnglet(nom) {
  ongletActif = nom;
  $('#pc-panneau').classList.remove('replie');
  $$('[data-pc-onglet]').forEach(b => {
    b.classList.toggle('actif', b.dataset.pcOnglet === nom);
    b.setAttribute('aria-selected', String(b.dataset.pcOnglet === nom));
  });
  $$('[data-pc-contenu]').forEach(o => o.classList.toggle('actif', o.dataset.pcContenu === nom));
  $('#pc-titre').textContent = TITRES[nom];
  if (nom === 'courbes') {
    const cont = $('#pc-courbes');
    if (!cont.firstElementChild) cont.innerHTML = svgCourbes();
    majCourbes(cont, sim);
  }
  if (nom === 'quiz' && !quiz.commence) demarrerQuiz();
  $('#pc-contenu').scrollTop = 0;
}

/* =====================================================================
   FICHES DES COMPOSANTS (le bouton retour du téléphone ferme la fiche)
   ===================================================================== */
const liste = (t) => `<ul>${t.map(x => `<li>${x}</li>`).join('')}</ul>`;

function ouvrirFiche(id) {
  const f = FICHES[id];
  if (!f) return;
  $('#pc-fiche-nom').textContent = f.nom;
  $('#pc-fiche-corps').innerHTML = `
    <p class="symbole">${f.plaque}</p>
    <h3>Rôle</h3><p>${f.role}</p>
    <h3>Fonctionnement</h3><p>${f.fonctionnement}</p>
    <h3>Pannes courantes</h3>${liste(f.pannes)}`;
  $('#pc-fiche-corps').scrollTop = 0;
  if ($('#pc-fiche').hidden) history.pushState({ feuille: true }, '');
  $('#pc-fiche').hidden = false;
  if (scene) scene.selectionner(id);
}
function fermerFiche() {
  $('#pc-fiche').hidden = true;
  if (scene) scene.selectionner(null);
}
$('#pc-fermer').addEventListener('click', () => { if (!$('#pc-fiche').hidden) history.back(); });
window.addEventListener('popstate', () => { if (!$('#pc-fiche').hidden) fermerFiche(); });
history.replaceState({ feuille: false }, '');

/* =====================================================================
   PANNES
   ===================================================================== */
const listePannes = $('#pc-liste-pannes');
for (const [cle, p] of Object.entries(PANNES)) {
  const ligne = document.createElement('div');
  ligne.className = 'panne-ligne';
  ligne.dataset.panne = cle;
  ligne.innerHTML = `
    <label class="interrupteur" title="Activer la panne">
      <input type="checkbox" aria-label="${p.nom}"><span></span>
    </label>
    <span class="nom">${p.nom}</span>
    <button type="button" class="btn-info">Détails</button>`;
  const cb = $('input', ligne);
  cb.addEventListener('change', () => {
    if (panneMystere) { cb.checked = !cb.checked; return; }
    activerPanne(cle, cb.checked);
    if (cb.checked) {
      afficherDetailPanne(cle);
      if (scene) scene.selectionner(p.composant);
    }
    majTout();
  });
  $('.btn-info', ligne).addEventListener('click', () => afficherDetailPanne(cle));
  listePannes.appendChild(ligne);
}

function activerPanne(cle, actif) {
  sim.pannes[cle] = actif;
  if (!actif) return;
  // On met le banc en situation pour voir les symptômes
  sim.cmd.vanneAsp = true;
  if (sim.cmd.vanneRef < 30) sim.cmd.vanneRef = 40;
  if (cle === 'clapetPied') {
    flash('Panne du clapet de pied : arrêtez la pompe quelques secondes puis redémarrez-la…');
  } else sim.cmd.marche = true;
}

function afficherDetailPanne(cle) {
  const p = PANNES[cle];
  const d = $('#pc-detail-panne');
  d.hidden = false;
  d.innerHTML = `<h3>${p.nom}</h3>
    <h4>Symptômes</h4>${liste(p.symptomes)}
    <h4>Causes possibles</h4>${liste(p.causes)}
    <h4>Solutions</h4>${liste(p.solutions)}`;
}

function majPannes() {
  $$('#pc-liste-pannes .panne-ligne').forEach(l => {
    const actif = !!sim.pannes[l.dataset.panne];
    $('input', l).checked = actif && !panneMystere;
    l.classList.toggle('active', actif && !panneMystere);
    $('input', l).disabled = !!panneMystere;
  });
}

function toutReparer() { for (const k in sim.pannes) sim.pannes[k] = false; }

$('#pc-reparer').addEventListener('click', () => {
  toutReparer();
  panneMystere = null;
  $('#pc-mystere-choix').hidden = true;
  $('#pc-mystere-resultat').hidden = true;
  $('#pc-detail-panne').hidden = true;
  scene && scene.selectionner(null);
  majTout();
});

$('#pc-mystere').addEventListener('click', () => {
  const cles = Object.keys(PANNES);
  const precedente = panneMystere;
  do { panneMystere = cles[Math.floor(Math.random() * cles.length)]; } while (panneMystere === precedente);
  toutReparer();
  Object.assign(sim.cmd, { vanneAsp: true, vanneRef: 40, frequence: 50, aspiration: 2, temperature: 20 });
  sim.amorcer();
  activerPanne(panneMystere, true);
  if (panneMystere === 'clapetPied') { sim.amorcee = false; sim.cmd.marche = true; }   // pompe déjà désamorcée au démarrage
  $('#pc-detail-panne').hidden = true;
  if (scene) { scene.selectionner(null); scene.recentrer(); }
  const choix = $('#pc-mystere-choix');
  choix.hidden = false;
  choix.innerHTML = '<p class="aide">La pompe tourne. Regardez le vacuomètre, le manomètre, le débitmètre, la roue, les vibrations, les températures… Vous pouvez arrêter, amorcer et changer les réglages. Quelle est la panne ?</p>';
  for (const cle of cles) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = PANNES[cle].nom;
    b.addEventListener('click', () => repondreMystere(cle, b));
    choix.appendChild(b);
  }
  $('#pc-mystere-resultat').hidden = true;
  majTout();
});

function repondreMystere(cle, bouton) {
  if (!panneMystere) return;
  const bonne = cle === panneMystere;
  $$('#pc-mystere-choix button').forEach(b => { b.disabled = true; });
  bouton.classList.add(bonne ? 'bon' : 'faux');
  const res = $('#pc-mystere-resultat');
  res.hidden = false;
  res.className = 'resultat ' + (bonne ? 'bon' : 'faux');
  res.innerHTML = (bonne ? '✅ Bon diagnostic ! ' : '❌ Ce n\'est pas ça. ') + `La panne était : <b>${PANNES[panneMystere].nom}</b>.`;
  const vraie = panneMystere;
  panneMystere = null;
  majPannes();
  afficherDetailPanne(vraie);
  scene && scene.selectionner(PANNES[vraie].composant);
}

/* =====================================================================
   QUIZ
   ===================================================================== */
const quiz = { commence: false, index: 0, reponses: [], ordres: [] };

function melanger(t) {
  for (let i = t.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [t[i], t[j]] = [t[j], t[i]];
  }
  return t;
}

function demarrerQuiz() {
  quiz.commence = true;
  quiz.index = 0;
  quiz.reponses = new Array(QUIZ.length).fill(null);
  quiz.ordres = QUIZ.map(q => melanger(q.choix.map((_, i) => i)));
  afficherQuestion();
}

function afficherQuestion() {
  const q = QUIZ[quiz.index];
  const cont = $('#pc-quiz');
  const n = QUIZ.length;
  cont.innerHTML = `
    <div class="quiz-entete"><span>Question ${quiz.index + 1} / ${n}</span><span>${quiz.reponses.filter(r => r !== null).length} réponse(s)</span></div>
    <div class="quiz-barre"><i style="width:${(quiz.index / n) * 100}%"></i></div>
    <p class="quiz-question">${q.q}</p>
    <div class="choix">${quiz.ordres[quiz.index].map((i, k) => `<button type="button" data-i="${i}" class="${quiz.reponses[quiz.index] === i ? 'choisi' : ''}">${String.fromCharCode(65 + k)}. ${q.choix[i]}</button>`).join('')}</div>
    <div class="quiz-nav">
      <button type="button" class="btn-secondaire" data-q="prec" ${quiz.index === 0 ? 'disabled' : ''}>◀ Précédente</button>
      <button type="button" class="btn-principal" data-q="suiv" ${quiz.reponses[quiz.index] === null ? 'disabled' : ''}>${quiz.index === n - 1 ? 'Voir ma note' : 'Suivante ▶'}</button>
    </div>`;
  $$('.choix button', cont).forEach(b => b.addEventListener('click', () => {
    quiz.reponses[quiz.index] = Number(b.dataset.i);
    $$('.choix button', cont).forEach(x => x.classList.toggle('choisi', x === b));
    $('[data-q="suiv"]', cont).disabled = false;
  }));
  $('[data-q="prec"]', cont).addEventListener('click', () => { quiz.index--; afficherQuestion(); });
  $('[data-q="suiv"]', cont).addEventListener('click', () => {
    if (quiz.index < n - 1) { quiz.index++; afficherQuestion(); } else afficherCorrection();
  });
  $('#pc-contenu').scrollTop = 0;
}

function afficherCorrection() {
  const score = QUIZ.reduce((s, q, i) => s + (quiz.reponses[i] === q.bonne ? 1 : 0), 0);
  const ratio = score / QUIZ.length;
  const appreciation = ratio >= 0.9 ? 'Excellent ! 🏆' : ratio >= 0.7 ? 'Très bien 👍' : ratio >= 0.5 ? 'Peut mieux faire : relisez les fiches des composants.' : 'À retravailler : refaites les essais sur le banc puis le quiz.';
  $('#pc-quiz').innerHTML = `
    <div class="score"><span>Votre note</span><b>${score} / ${QUIZ.length}</b><span>${appreciation}</span></div>
    <h3>Correction</h3>
    ${QUIZ.map((q, i) => {
      const ok = quiz.reponses[i] === q.bonne;
      return `<div class="correction ${ok ? '' : 'faux'}">
        <p class="q">${i + 1}. ${q.q}</p>
        <p>${ok ? '✅' : '❌'} Votre réponse : ${q.choix[quiz.reponses[i]] ?? '—'}</p>
        ${ok ? '' : `<p>✔️ Bonne réponse : <b>${q.choix[q.bonne]}</b></p>`}
        <p class="expl">${q.expl}</p></div>`;
    }).join('')}
    <button type="button" class="btn-principal pleine-largeur" id="pc-quiz-recommencer">↺ Recommencer le quiz</button>`;
  $('#pc-quiz-recommencer').addEventListener('click', demarrerQuiz);
  $('#pc-contenu').scrollTop = 0;
}

/* =====================================================================
   HORS CONNEXION (service worker) et démarrage
   ===================================================================== */
const dansApk = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
if ('serviceWorker' in navigator && !dansApk && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW :', err)));
}

majTout();
initialiser3D();

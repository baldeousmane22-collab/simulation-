/* =====================================================================
   app.js — Interface du banc « circuit pneumatique » (appli autonome)
   ---------------------------------------------------------------------
   Commandes, mesures, schéma ISO, pannes, quiz, fiches, sons et boucle
   d'animation. Le bouton « retour » du téléphone ferme d'abord la fiche.
   ===================================================================== */

import { SimulationPneumatique, CARAC, P_ATM, S_PISTON, S_ANNULAIRE } from './simulation.js';
import { FICHES, PANNES, QUIZ } from './donnees.js';
import { svgSchema, majSchema } from './schema.js';
import { SonsPneumatiques } from './sons.js';

const $ = (sel, racine = document) => racine.querySelector(sel);
const $$ = (sel, racine = document) => [...racine.querySelectorAll(sel)];
const fr = (v, d = 1) => v.toFixed(d).replace('.', ',').replace(/^-(0,0*)$/, '$1');

const sim = new SimulationPneumatique();
const sons = new SonsPneumatiques();
let scene = null;
let enCours = false, dernierTemps = 0, compteurUI = 0;
let ongletActif = 'commandes';
let panneMystere = null;

window.__pneu = { sim, get scene() { return scene; } };

/* =====================================================================
   3D ET BOUCLE D'ANIMATION
   ===================================================================== */
async function initialiser3D() {
  try {
    const essai = document.createElement('canvas');
    if (!(essai.getContext('webgl2') || essai.getContext('webgl'))) throw new Error('WebGL indisponible');
    const { ScenePneumatique } = await import('./scene3d.js');
    scene = new ScenePneumatique($('#pn-canvas'), (id) => ouvrirFiche(id));
    $('#pn-chargement').hidden = true;
    new ResizeObserver(() => { if (scene) { majZones(); scene.redimensionner(); } }).observe($('#pn-vue3d'));
    majZones();
    scene.redimensionner();
    majTout();
    demarrerBoucle();
  } catch (err) {
    console.error(err);
    $('#pn-chargement').hidden = true;
    $('#erreur-webgl').hidden = false;
  }
}

function demarrerBoucle() {
  if (enCours) return;
  enCours = true;
  sons.reprendre();
  dernierTemps = performance.now();
  requestAnimationFrame(image);
}
function arreterBoucle() { enCours = false; sim.cmd.bouton = false; sons.pause(); }

function image(t) {
  if (!enCours) return;
  requestAnimationFrame(image);
  const dt = Math.min(0.05, Math.max(0, (t - dernierTemps) / 1000));
  dernierTemps = t;
  if (!scene) return;
  sim.calculer(dt);
  sons.maj(sim);
  scene.maj(sim, dt);
  scene.rendre(dt);
  if (++compteurUI % 6 === 0) majInterface();
}

/* Zones de la vue recouvertes par les boutons (cadrage et étiquettes) */
function majZones() {
  if (!scene) return;
  const zone = $('#pn-canvas').getBoundingClientRect();
  const rects = [];
  const ajouter = (el) => {
    if (!el || el.hidden || el.offsetParent === null) return null;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return null;
    const o = { x0: r.left - zone.left, y0: r.top - zone.top, x1: r.right - zone.left, y1: r.bottom - zone.top };
    rects.push(o);
    return o;
  };
  $$('#pneu .barre-haut > *').forEach(ajouter);
  $$('#pneu .hud-pression').forEach(ajouter);
  ajouter($('#pn-alerte'));
  const legende = ajouter($('#pneu .legende-3d'));
  const recentrer = ajouter($('#pn-recentrer'));
  scene.setObstacles(rects);
  const hud = $('#pneu .hud-ligne').getBoundingClientRect();
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
document.addEventListener('visibilitychange', () => { if (document.hidden) arreterBoucle(); else demarrerBoucle(); });
$('#pn-recentrer').addEventListener('click', () => scene && scene.recentrer());
$('#pn-etiquettes').addEventListener('click', (e) => {
  const b = e.currentTarget;
  const v = b.getAttribute('aria-pressed') !== 'true';
  b.setAttribute('aria-pressed', String(v));
  scene && scene.setEtiquettes(v);
});
$('#pn-replier').addEventListener('click', () => $('#pn-panneau').classList.toggle('replie'));

/* Sons : choix mémorisé ; le navigateur exige un geste de l'utilisateur pour démarrer l'audio */
let sonVoulu = true;
try { sonVoulu = localStorage.getItem('pneu-son') !== 'non'; } catch (e) { /* stockage indisponible */ }
function majBoutonSon() {
  const b = $('#pn-son');
  b.setAttribute('aria-pressed', String(sons.actif));
  b.textContent = sons.actif ? '🔊' : '🔇';
}
$('#pn-son').addEventListener('click', () => {
  sonVoulu = !sons.actif;
  sons.activer(sonVoulu);
  try { localStorage.setItem('pneu-son', sonVoulu ? 'oui' : 'non'); } catch (e) { /* stockage indisponible */ }
  majBoutonSon();
});
$('#pneu').addEventListener('pointerdown', (e) => {
  if (sonVoulu && !sons.actif && e.target.id !== 'pn-son') { sons.activer(true); majBoutonSon(); }
}, true);

/* Bouton poussoir 2V1 : actif tant qu'on le maintient (doigt, souris ou clavier) */
const bouton2v1 = $('#pn-bouton2v1');
const appuyer = (oui) => {
  if (sim.cmd.bouton === oui) return;
  sim.cmd.bouton = oui;
  bouton2v1.classList.toggle('enfonce', oui);
  bouton2v1.textContent = oui ? '🟢 Bouton 2V1 enfoncé… relâchez' : '🟢 Maintenir le bouton 2V1';
};
bouton2v1.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  appuyer(true);
  try { bouton2v1.setPointerCapture(e.pointerId); } catch (err) { /* doigt déjà relâché */ }
});
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) bouton2v1.addEventListener(ev, () => appuyer(false));
bouton2v1.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); appuyer(true); } });
bouton2v1.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') appuyer(false); });
bouton2v1.addEventListener('contextmenu', (e) => e.preventDefault());

$('#pn-compresseur').addEventListener('click', () => { sim.cmd.compresseur = !sim.cmd.compresseur; majCommandes(); });

$$('#pneu [data-pn-cmd]').forEach(b => b.addEventListener('click', () => {
  const cmd = b.dataset.pnCmd;
  if (cmd === 'auto') {
    sim.cmd.auto = !sim.cmd.auto;
    if (sim.cmd.auto) flash('Sélecteur 0V1 sur « Auto » : les capteurs sont alimentés, le distributeur est piloté par 1S1 (tige rentrée → sortie) et 1S2 (tige sortie → rentrée).');
  } else {
    if (sim.cmd.auto) { sim.cmd.auto = false; flash('Cycle automatique arrêté : commande manuelle.'); }
    sim.impulsionManuelle(cmd === 'sortie' ? 14 : 12);
  }
  majCommandes();
}));

$('#pn-vanne').addEventListener('click', () => {
  sim.cmd.vanne = !sim.cmd.vanne;
  if (!sim.cmd.vanne) flash('Vanne 3/2 fermée : l\'arrivée est coupée et le circuit se vide par l\'échappement. Vérifiez au manomètre que la pression tombe à 0.');
  majCommandes();
});
$('#pn-purger').addEventListener('click', () => {
  const avait = sim.eau > 0.3;
  sim.purger();
  if (scene) scene.purger();
  flash(avait ? 'Purge : l\'eau accumulée dans la cuve du filtre (et du compresseur) est évacuée. À faire chaque jour !' : 'Purge faite : presque pas d\'eau, le filtre est entretenu.');
  majTout();
});

const curseurs = {
  reglage: ['#pn-curseur-p', (v) => `${fr(v)} bar`],
  regleurSortie: ['#pn-curseur-rs', (v) => `${v} %`],
  regleurRentree: ['#pn-curseur-rr', (v) => `${v} %`],
  charge: ['#pn-curseur-m', (v) => `${v} kg (${Math.round((v + CARAC.MASSE_MOBILE) * 9.81)} N avec le plateau)`]
};
for (const [cle, [sel]] of Object.entries(curseurs)) {
  $(sel).addEventListener('input', (e) => { sim.cmd[cle] = Number(e.target.value); majCommandes(); });
}

$('#pn-reinit').addEventListener('click', () => {
  sim.reinitialiser();
  panneMystere = null;
  $('#pn-mystere-choix').hidden = true; $('#pn-mystere-resultat').hidden = true; $('#pn-detail-panne').hidden = true;
  if (scene) { scene.selectionner(null); scene.recentrer(); }
  majTout();
});

/* Message temporaire dans la zone d'explication */
let finFlash = 0;
function flash(texte) {
  finFlash = performance.now() + 3500;
  $('#pn-message').textContent = texte;
}

function majCommandes() {
  const c = sim.cmd;
  const b = $('#pn-compresseur');
  b.setAttribute('aria-pressed', String(c.compresseur));
  b.querySelector('small').textContent = !c.compresseur ? 'ARRÊT' : sim.compresseurTourne ? 'MARCHE' : 'AUTO (cuve pleine)';
  $$('#pneu [data-pn-cmd]').forEach(x => {
    const cmd = x.dataset.pnCmd;
    x.classList.toggle('actif', cmd === 'auto' ? c.auto : !c.auto && (cmd === 'sortie' ? sim.dist > 0 : sim.dist < 0));
  });
  const v = $('#pn-vanne');
  v.setAttribute('aria-pressed', String(!c.vanne));
  v.textContent = c.vanne ? '🔓 Vanne d\'arrivée ouverte : fermer (consigner)' : '🔒 Vanne fermée, circuit à l\'échappement : rouvrir';
  for (const [cle, [sel, texte]] of Object.entries(curseurs)) {
    $(sel).value = c[cle];
    $(sel + '-val').textContent = texte(c[cle]);
  }
}

/* Mesures, message et alerte (≈ 10 fois par seconde) */
function majInterface() {
  const r = sim.res;
  const bar = (p) => Math.max(0, p - P_ATM);
  const pc = bar(sim.pCuve), pr = bar(sim.pReseau), pa = bar(sim.pA), pb = bar(sim.pB);
  $('#pn-hud-cuve').textContent = fr(pc);
  $('#pn-hud-res').textContent = fr(pr);
  $('#pn-m-cuve').textContent = `${fr(pc)} bar`;
  $('#pn-m-res').textContent = `${fr(pr)} bar`;
  $('#pn-c-res').classList.toggle('alarme', sim.cmd.vanne && pr < sim.cmd.reglage - 1.2);
  $('#pn-m-pa').textContent = `${fr(pa)} bar`;
  $('#pn-m-pb').textContent = `${fr(pb)} bar`;
  $('#pn-m-v').textContent = `${Math.round(Math.abs(sim.v) * 1000)} mm/s ${sim.v > 0.004 ? '↑' : sim.v < -0.004 ? '↓' : ''}`;
  $('#pn-m-x').textContent = `${Math.round(sim.position * CARAC.COURSE)} mm`;
  $('#pn-m-f').textContent = `${Math.round(r.fDispo)} N`;
  $('#pn-m-poids').textContent = `${Math.round(r.fCharge)} N`;
  $('#pn-c-f').classList.toggle('alarme', r.fDispo < r.fCharge + CARAC.FROTTEMENT);
  $('#pn-m-taux').textContent = `${Math.round(sim.tauxMarche * 100)} %`;
  $('#pn-c-taux').classList.toggle('alarme', sim.tauxMarche > 0.6);
  $('#pn-m-q').textContent = `${Math.round(r.qReseau)} NL/min`;
  $('#pn-m-cycle').textContent = sim.cycles ? `${fr(sim.dureeCycle)} s` : '—';
  $('#pn-m-conso').textContent = sim.cycles ? `${fr(sim.conso, 2)} NL` : '—';
  $('#pn-m-n').textContent = String(sim.cycles);
  $('#pn-m-p2').textContent = `${fr(bar(sim.p2))} bar`;
  $('#pn-m-x2').textContent = `${Math.round(sim.position2 * CARAC.COURSE2)} mm`;
  $('#pn-m-capt').textContent = `1S1 ${r.capteur1 ? '●' : '○'} · 1S2 ${r.capteur2 ? '●' : '○'}`;
  // Calcul de l'effort (F = p × S)
  $('#pn-calcul').innerHTML = `
    <p>Sortie : F = p × S = ${fr(pr)} bar × ${Math.round(S_PISTON)} mm² = ${fr(pr / 10, 2)} N/mm² × ${Math.round(S_PISTON)} mm² ≈ <b>${Math.round(r.fDispo)} N</b></p>
    <p>Rentrée (section annulaire) : ${fr(pr / 10, 2)} × ${Math.round(S_ANNULAIRE)} mm² ≈ <b>${Math.round(r.fDispoRentree)} N</b></p>
    <p>Poids à soulever : (${sim.cmd.charge} + ${CARAC.MASSE_MOBILE}) kg × 9,81 ≈ <b>${Math.round(r.fCharge)} N</b> + frottements ≈ ${CARAC.FROTTEMENT} N →
      ${r.fDispo > r.fCharge + CARAC.FROTTEMENT ? '<span class="ok">le vérin soulève la charge</span>' : '<span class="ko">effort insuffisant : le vérin cale</span>'}</p>`;
  if (performance.now() > finFlash) {
    const m = $('#pn-message');
    if (m.textContent !== r.message) m.textContent = r.message;
  }
  const al = $('#pn-alerte');
  if (al.hidden !== !r.alerte) { al.hidden = !r.alerte; majZones(); }
  if (r.alerte && al.textContent !== r.alerte) al.textContent = r.alerte;
  al.classList.toggle('vert', !!r.alerteVerte);
  // L'état du compresseur et du distributeur changent seuls (pressostat, cycle)
  const etat = !sim.cmd.compresseur ? 'ARRÊT' : sim.compresseurTourne ? 'MARCHE' : 'AUTO (cuve pleine)';
  if ($('#pn-compresseur small').textContent !== etat || majCommandes.dist !== sim.dist) { majCommandes.dist = sim.dist; majCommandes(); }
  if (ongletActif === 'schema') majSchema($('#pn-schema'), sim);
}

function majTout() { majCommandes(); majPannes(); majInterface(); }

/* =====================================================================
   ONGLETS
   ===================================================================== */
const TITRES = { commandes: 'Banc pneumatique', schema: 'Schéma ISO 1219', pannes: 'Pannes pneumatiques', quiz: 'Quiz pneumatique' };
$$('[data-pn-onglet]').forEach(b => b.addEventListener('click', () => choisirOnglet(b.dataset.pnOnglet)));

function choisirOnglet(nom) {
  ongletActif = nom;
  $('#pn-panneau').classList.remove('replie');
  $$('[data-pn-onglet]').forEach(b => {
    b.classList.toggle('actif', b.dataset.pnOnglet === nom);
    b.setAttribute('aria-selected', String(b.dataset.pnOnglet === nom));
  });
  $$('[data-pn-contenu]').forEach(o => o.classList.toggle('actif', o.dataset.pnContenu === nom));
  $('#pn-titre').textContent = TITRES[nom];
  if (nom === 'schema') {
    const cont = $('#pn-schema');
    if (!cont.firstElementChild) cont.innerHTML = svgSchema();
    majSchema(cont, sim);
  }
  if (nom === 'quiz' && !quiz.commence) demarrerQuiz();
  $('#pn-contenu').scrollTop = 0;
}

/* =====================================================================
   FICHES DES COMPOSANTS
   ===================================================================== */
const liste = (t) => `<ul>${t.map(x => `<li>${x}</li>`).join('')}</ul>`;

function ouvrirFiche(id) {
  const f = FICHES[id];
  if (!f) return;
  ouvrirFeuille(f.nom, `
    <p class="symbole">${f.plaque}</p>
    <h3>Rôle</h3><p>${f.role}</p>
    <h3>Fonctionnement</h3><p>${f.fonctionnement}</p>
    <h3>Pannes courantes</h3>${liste(f.pannes)}`);
  if (scene) scene.selectionner(id);
}

function ouvrirFeuille(titre, html) {
  $('#pn-fiche-nom').textContent = titre;
  $('#pn-fiche-corps').innerHTML = html;
  $('#pn-fiche-corps').scrollTop = 0;
  if ($('#pn-fiche').hidden) history.pushState({ feuille: true }, '');
  $('#pn-fiche').hidden = false;
}
function fermerFiche() {
  $('#pn-fiche').hidden = true;
  if (scene) scene.selectionner(null);
}
$('[data-pn-fermer]').addEventListener('click', () => { if (!$('#pn-fiche').hidden) history.back(); });
window.addEventListener('popstate', () => { if (!$('#pn-fiche').hidden) fermerFiche(); });
history.replaceState({ feuille: false }, '');

/* =====================================================================
   PANNES
   ===================================================================== */
const listePannes = $('#pn-liste-pannes');
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
  if (cle === 'eau') sim.eau = actif ? 0.85 : 0.15;
  // On met le banc en situation pour voir les symptômes
  if (actif) {
    sim.cmd.vanne = true;
    sim.cmd.compresseur = true;
    if (cle === 'ressort' || cle === 'echapRapide') flash('Panne sur le circuit 2 : maintenez puis relâchez le bouton 2V1 et observez le vérin simple effet.');
    else if (cle !== 'fuite' && cle !== 'pressostat') sim.cmd.auto = true;
  }
}

function afficherDetailPanne(cle) {
  const p = PANNES[cle];
  const d = $('#pn-detail-panne');
  d.hidden = false;
  d.innerHTML = `<h3>${p.nom}</h3>
    <h4>Symptômes</h4>${liste(p.symptomes)}
    <h4>Causes possibles</h4>${liste(p.causes)}
    <h4>Solutions</h4>${liste(p.solutions)}`;
}

function majPannes() {
  $$('#pn-liste-pannes .panne-ligne').forEach(l => {
    const actif = !!sim.pannes[l.dataset.panne];
    $('input', l).checked = actif && !panneMystere;
    l.classList.toggle('active', actif && !panneMystere);
    $('input', l).disabled = !!panneMystere;
  });
}

function toutReparer() {
  for (const k in sim.pannes) sim.pannes[k] = false;
  sim.eau = Math.min(sim.eau, 0.15);
}

$('#pn-reparer').addEventListener('click', () => {
  toutReparer();
  panneMystere = null;
  $('#pn-mystere-choix').hidden = true;
  $('#pn-mystere-resultat').hidden = true;
  $('#pn-detail-panne').hidden = true;
  scene && scene.selectionner(null);
  majTout();
});

$('#pn-mystere').addEventListener('click', () => {
  const cles = Object.keys(PANNES);
  const precedente = panneMystere;
  do { panneMystere = cles[Math.floor(Math.random() * cles.length)]; } while (panneMystere === precedente);
  toutReparer();
  activerPanne(panneMystere, true);
  sim.cmd.auto = true;
  sim.cmd.reglage = 6;
  sim.cmd.charge = Math.max(sim.cmd.charge, 10);
  $('#pn-detail-panne').hidden = true;
  if (scene) { scene.selectionner(null); scene.recentrer(); }
  const choix = $('#pn-mystere-choix');
  choix.hidden = false;
  choix.innerHTML = '<p class="aide">Le banc tourne en cycle automatique. Regardez les manomètres, la vitesse du vérin, le compresseur, les échappements, le filtre… Vous pouvez arrêter le cycle, commander à la main et essayer le bouton 2V1. Quelle est la panne ?</p>';
  for (const cle of cles) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = PANNES[cle].nom;
    b.addEventListener('click', () => repondreMystere(cle, b));
    choix.appendChild(b);
  }
  $('#pn-mystere-resultat').hidden = true;
  majTout();
});

function repondreMystere(cle, bouton) {
  if (!panneMystere) return;
  const bonne = cle === panneMystere;
  $$('#pn-mystere-choix button').forEach(b => { b.disabled = true; });
  bouton.classList.add(bonne ? 'bon' : 'faux');
  const res = $('#pn-mystere-resultat');
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
  const cont = $('#pn-quiz');
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
  $('#pn-contenu').scrollTop = 0;
}

function afficherCorrection() {
  const score = QUIZ.reduce((s, q, i) => s + (quiz.reponses[i] === q.bonne ? 1 : 0), 0);
  const ratio = score / QUIZ.length;
  const appreciation = ratio >= 0.9 ? 'Excellent ! 🏆' : ratio >= 0.7 ? 'Très bien 👍' : ratio >= 0.5 ? 'Peut mieux faire : relisez les fiches des composants.' : 'À retravailler : refaites les essais sur le banc puis le quiz.';
  $('#pn-quiz').innerHTML = `
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
    <button type="button" class="btn-principal pleine-largeur" id="pn-quiz-recommencer">↺ Recommencer le quiz</button>`;
  $('#pn-quiz-recommencer').addEventListener('click', demarrerQuiz);
  $('#pn-contenu').scrollTop = 0;
}

/* =====================================================================
   HORS CONNEXION (service worker) et démarrage
   ===================================================================== */
const dansApk = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
if ('serviceWorker' in navigator && !dansApk && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW :', err)));
}

/* APK Android : le bouton « retour » du téléphone ferme d'abord la fiche, puis quitte l'appli */
if (dansApk && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
  const AppNative = window.Capacitor.Plugins.App;
  AppNative.addListener('backButton', () => {
    if (!$('#pn-fiche').hidden) history.back();
    else AppNative.exitApp();
  });
  // Appli mise en arrière-plan : on coupe la boucle et le son
  AppNative.addListener('pause', () => arreterBoucle());
  AppNative.addListener('resume', () => demarrerBoucle());
}

majTout();
initialiser3D();

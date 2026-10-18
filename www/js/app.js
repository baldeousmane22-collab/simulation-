/* =====================================================================
   app.js — Point d'entrée : écrans, commandes, modes et boucle d'animation
   ===================================================================== */

import { SimulationHydraulique, CARAC } from './simulation.js';
import { FICHES, ETAPES, PANNES, QUIZ } from './donnees.js';
import { svgSchema, majSchema } from './schema.js';
import { VERSION } from './version.js';
import { initBanc } from './accouplement/app.js';

const $ = (sel, racine = document) => racine.querySelector(sel);
const $$ = (sel, racine = document) => [...racine.querySelectorAll(sel)];

/* État global de l'application */
const sim = new SimulationHydraulique();
let scene = null;            // créée à la première ouverture de la simulation
let enCours = false;         // boucle d'animation active ?
let dernierTemps = 0;
let etapeCourante = 0;
let panneMystere = null;     // clé de la panne mystère en cours
let ongletActif = 'commandes';

// Accès pour les tests automatisés et le débogage
window.__app = { sim, get scene() { return scene; } };

$('#version').textContent = 'Version ' + VERSION;

/* =====================================================================
   NAVIGATION ENTRE ÉCRANS (avec gestion du bouton « retour » Android)
   ===================================================================== */
function afficherEcran(id) {
  $$('.ecran').forEach(e => e.classList.toggle('actif', e.id === id));
  if (id === 'sim') demarrerBoucle(); else arreterBoucle();
  if (id === 'accoup') banc.demarrerBoucle(); else banc.arreterBoucle();
}
// Banc « moteur + accouplement + réducteur » (écran #accoup, module séparé)
const banc = initBanc(afficherEcran);
const ECRANS_3D = ['sim', 'accoup'];

async function ouvrirSimulation(onglet = 'commandes', depuisHistorique = false) {
  if (!depuisHistorique) history.pushState({ ecran: 'sim' }, '');
  afficherEcran('sim');
  if (!scene) {
    const ok = await initialiser3D();
    if (!ok) return;
  }
  majZones();
  scene.redimensionner();
  majInterface();
  if (onglet === 'schema') { choisirOnglet('commandes'); ouvrirFeuille('schema'); }
  else choisirOnglet(onglet);
  afficherAstuce();
}

function retourAccueil() {
  fermerFeuilles(true);
  afficherEcran('accueil');
  if (window.__majEnAttente) location.reload();
}

// Bouton retour du téléphone / navigateur : ferme d'abord une feuille ouverte
window.addEventListener('popstate', (e) => {
  const st = e.state || {};
  if (feuilleOuverte()) { fermerFeuilles(true); if (ECRANS_3D.includes(st.ecran)) return; }
  if (ECRANS_3D.includes(st.ecran)) afficherEcran(st.ecran);
  else retourAccueil();
});

$('#btn-simulation').addEventListener('click', () => ouvrirSimulation('commandes'));
$$('[data-ouvrir]').forEach(b => b.addEventListener('click', () => ouvrirSimulation(b.dataset.ouvrir)));
$('#btn-retour').addEventListener('click', () => history.back());

/* =====================================================================
   INITIALISATION DE LA 3D (chargée à la demande pour un accueil rapide)
   ===================================================================== */
async function initialiser3D() {
  try {
    // Test rapide de la disponibilité de WebGL
    const essai = document.createElement('canvas');
    if (!(essai.getContext('webgl2') || essai.getContext('webgl'))) throw new Error('WebGL indisponible');
    const { Scene3D } = await import('./scene3d.js');
    scene = new Scene3D($('#canvas3d'), (id) => ouvrirFiche(id));
    window.__app.scene3d = scene;
    $('#chargement').hidden = true;
    new ResizeObserver(() => { if (scene) { majZones(); scene.redimensionner(); } }).observe($('#vue3d'));
    return true;
  } catch (err) {
    console.error(err);
    $('#erreur-webgl').hidden = false;
    return false;
  }
}

/* =====================================================================
   BOUCLE D'ANIMATION
   ===================================================================== */
function demarrerBoucle() {
  if (enCours) return;
  enCours = true;
  dernierTemps = performance.now();
  requestAnimationFrame(image);
}
function arreterBoucle() { enCours = false; }

let compteurUI = 0;
function image(t) {
  if (!enCours) return;
  requestAnimationFrame(image);
  const dt = Math.min(0.05, Math.max(0, (t - dernierTemps) / 1000));
  dernierTemps = t;
  if (!scene) return;
  sim.calculer(dt);
  scene.maj(sim, dt);
  scene.rendre(dt);
  // L'interface texte est rafraîchie ~10 fois par seconde (économie de batterie)
  if (++compteurUI % 6 === 0) majInterface();
}

// Pause automatique quand l'application passe en arrière-plan
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { arreterBoucle(); banc.arreterBoucle(); }
  else if ($('#sim').classList.contains('actif')) demarrerBoucle();
  else if ($('#accoup').classList.contains('actif')) banc.demarrerBoucle();
});

/* =====================================================================
   COMMANDES
   ===================================================================== */
const btnPompe = $('#btn-pompe');
btnPompe.addEventListener('click', () => { sim.cmd.pompe = !sim.cmd.pompe; majCommandes(); });

$$('#sim .segmente button').forEach(b => b.addEventListener('click', () => {
  sim.cmd.distributeur = Number(b.dataset.dist);
  majCommandes();
}));

const curDebit = $('#curseur-debit'), curTarage = $('#curseur-tarage');
curDebit.addEventListener('input', () => { sim.cmd.debitPct = Number(curDebit.value); majCommandes(); });
curTarage.addEventListener('input', () => { sim.cmd.tarage = Number(curTarage.value); majCommandes(); });

$('#btn-reinit').addEventListener('click', () => {
  sim.reinitialiser();
  panneMystere = null;
  majCommandes(); majPannes();
  $('#mystere-choix').hidden = true; $('#mystere-resultat').hidden = true;
  if (scene) { scene.selectionner(null); scene.recentrer(); }
});

$('#btn-recentrer').addEventListener('click', () => scene && scene.recentrer());
$('#btn-etiquettes').addEventListener('click', (e) => {
  const b = e.currentTarget;
  const v = b.getAttribute('aria-pressed') !== 'true';
  b.setAttribute('aria-pressed', String(v));
  scene && scene.setEtiquettes(v);
});
$('#btn-schema').addEventListener('click', () => ouvrirFeuille('schema'));
$('#btn-replier').addEventListener('click', () => {
  $('#panneau').classList.toggle('replie');
});

/* Synchronise les boutons/curseurs avec l'état de la simulation */
function majCommandes() {
  const c = sim.cmd;
  btnPompe.setAttribute('aria-pressed', String(c.pompe));
  btnPompe.querySelector('small').textContent = c.pompe ? 'MARCHE' : 'ARRÊT';
  $$('#sim .segmente button').forEach(b => b.classList.toggle('actif', Number(b.dataset.dist) === c.distributeur));
  curDebit.value = c.debitPct;
  curTarage.value = c.tarage;
  $('#val-debit').textContent = `${c.debitPct} % (${(CARAC.QNOM * c.debitPct / 100).toFixed(1)} L/min)`;
  $('#val-tarage').textContent = `${c.tarage} bar`;
}

/* Zones de la vue 3D recouvertes par les boutons : la caméra cadre le banc
   dans l'espace libre, et les étiquettes évitent ces zones. */
function majZones() {
  if (!scene) return;
  const zone = $('#canvas3d').getBoundingClientRect();
  const rects = [];
  const ajouter = (el) => {
    if (!el || el.hidden || el.offsetParent === null) return null;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return null;
    const o = { x0: r.left - zone.left, y0: r.top - zone.top, x1: r.right - zone.left, y1: r.bottom - zone.top };
    rects.push(o);
    return o;
  };
  $$('#sim .barre-haut > *').forEach(ajouter);
  $$('#sim .hud > *').forEach(ajouter);
  const legende = ajouter($('#sim .legende-3d'));
  const recentrer = ajouter($('#btn-recentrer'));
  scene.setObstacles(rects);
  // Marges pour le cadrage : barre du haut + afficheur de pression, et boutons du bas
  const barre = $('#sim .hud-pression').getBoundingClientRect();
  const basObjets = [legende, recentrer].filter(Boolean).map(r => r.y0);
  scene.setMarges({
    haut: Math.max(0, barre.bottom - zone.top + 4),
    bas: basObjets.length ? Math.max(0, zone.height - Math.min(...basObjets) + 4) : 0,
    gauche: 0, droite: 0
  });
}

/* Mesures, message et alerte (appelé ~10 fois/s) */
function majInterface() {
  const r = sim.res;
  const p = Math.round(r.pression);
  $('#hud-p').textContent = p;
  $('#m-pression').textContent = `${p} bar`;
  $('#m-qpompe').textContent = `${r.Qpompe.toFixed(1)} L/min`;
  $('#m-qlim').textContent = `${r.Qlimiteur.toFixed(1)} L/min`;
  $('#m-vitesse').textContent = `${Math.round(Math.abs(r.vitesseTige))} mm/s`;
  $('#m-force').textContent = `${Math.round(r.force)} N`;
  $('#m-position').textContent = `${Math.round(sim.positionVerin * CARAC.COURSE)} mm`;
  const msg = $('#message');
  if (msg.textContent !== r.message) msg.textContent = r.message;
  const al = $('#hud-alerte');
  const texteAlerte = r.ouvertureLimiteur > 0.3 && !r.alerte ? 'LIMITEUR OUVERT → retour réservoir' : r.alerte;
  if (al.hidden !== !texteAlerte) { al.hidden = !texteAlerte; majZones(); }
  if (texteAlerte && al.textContent !== texteAlerte) al.textContent = texteAlerte;
  al.classList.toggle('vert', texteAlerte === 'LIMITEUR OUVERT' || texteAlerte.startsWith('LIMITEUR'));
  if (!$('#schema').hidden) majSchema($('#schema-svg'), sim);
}

/* =====================================================================
   ONGLETS DU PANNEAU
   ===================================================================== */
const TITRES = { commandes: 'Simulation libre', pas: 'Mode pas à pas', pannes: 'Mode pannes', quiz: 'Quiz' };
$$('#sim .onglets button').forEach(b => b.addEventListener('click', () => choisirOnglet(b.dataset.onglet)));

function choisirOnglet(nom) {
  ongletActif = nom;
  $('#panneau').classList.remove('replie');
  $$('#sim .onglets button').forEach(b => {
    b.classList.toggle('actif', b.dataset.onglet === nom);
    b.setAttribute('aria-selected', String(b.dataset.onglet === nom));
  });
  $$('#sim .onglet').forEach(o => o.classList.toggle('actif', o.dataset.contenu === nom));
  $('#titre-mode').textContent = TITRES[nom] || 'Simulation';
  if (nom === 'pas') allerEtape(etapeCourante);
  if (nom === 'quiz' && !quiz.commence) demarrerQuiz();
  $('#sim .contenu-panneau').scrollTop = 0;
}

/* =====================================================================
   FICHES DES COMPOSANTS ET FEUILLES (schéma)
   ===================================================================== */
function ouvrirFiche(id) {
  const f = FICHES[id];
  if (!f) return;
  $('#fiche-nom').textContent = f.nom;
  $('#fiche-corps').innerHTML = `
    <p class="symbole">Symbole ISO : ${f.symbole}</p>
    <h3>Rôle</h3><p>${f.role}</p>
    <h3>Fonctionnement</h3><p>${f.fonctionnement}</p>
    <h3>Pannes courantes</h3><ul>${f.pannes.map(p => `<li>${p}</li>`).join('')}</ul>`;
  $('#fiche-corps').scrollTop = 0;
  ouvrirFeuille('fiche');
  if (scene) scene.selectionner(id);
}

function ouvrirFeuille(id) {
  const dejaOuverte = feuilleOuverte();
  $$('.feuille').forEach(f => { f.hidden = f.id !== id; });
  if (id === 'schema') {
    const cont = $('#schema-svg');
    if (!cont.firstElementChild) cont.innerHTML = svgSchema();
    majSchema(cont, sim);
  }
  if (!dejaOuverte) history.pushState({ ecran: 'sim', feuille: id }, '');
}
function feuilleOuverte() { return $$('.feuille').some(f => !f.hidden); }
/* depuisHistorique = true quand l'entrée d'historique a déjà été retirée */
function fermerFeuilles(depuisHistorique = false) {
  if (!feuilleOuverte()) return;
  $$('.feuille').forEach(f => { f.hidden = true; });
  if (scene && ongletActif !== 'pas') scene.selectionner(null);
  banc.surFermetureFeuilles();
  if (!depuisHistorique) history.back();
}
$$('[data-fermer]').forEach(b => b.addEventListener('click', () => fermerFeuilles()));

/* =====================================================================
   MODE PAS À PAS
   ===================================================================== */
const points = $('#etapes-points');
ETAPES.forEach((_, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.setAttribute('aria-label', 'Étape ' + (i + 1));
  b.addEventListener('click', () => allerEtape(i));
  points.appendChild(b);
});
$('#etape-prec').addEventListener('click', () => allerEtape(etapeCourante - 1));
$('#etape-suiv').addEventListener('click', () => {
  if (etapeCourante < ETAPES.length - 1) allerEtape(etapeCourante + 1);
  else { allerEtape(0); }
});

function allerEtape(i) {
  etapeCourante = Math.max(0, Math.min(ETAPES.length - 1, i));
  const e = ETAPES[etapeCourante];
  $('#etape-titre').textContent = e.titre;
  $('#etape-texte').textContent = e.texte;
  $$('button', points).forEach((b, k) => {
    b.classList.toggle('actif', k === etapeCourante);
    b.classList.toggle('fait', k < etapeCourante);
  });
  $('#etape-prec').disabled = etapeCourante === 0;
  $('#etape-suiv').textContent = etapeCourante === ETAPES.length - 1 ? '↺ Recommencer' : 'Suivant ▶';
  // On impose l'état du banc correspondant à l'étape (sans panne)
  for (const k in sim.pannes) sim.pannes[k] = false;
  panneMystere = null;
  sim.cmd.pompe = e.etat.pompe;
  sim.cmd.distributeur = e.etat.distributeur;
  sim.cmd.debitPct = 100;
  sim.cmd.tarage = 120;
  if (typeof e.etat.positionVerin === 'number') sim.positionVerin = e.etat.positionVerin;
  majCommandes(); majPannes();
  if (scene) { scene.focaliser(e.focus); scene.selectionner(e.focus); }
}

/* =====================================================================
   MODE PANNES
   ===================================================================== */
const listePannes = $('#liste-pannes');
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
    if (panneMystere) { cb.checked = !cb.checked; return; } // pas pendant la panne mystère
    sim.pannes[cle] = cb.checked;
    if (!sim.cmd.pompe && cb.checked) sim.cmd.pompe = true; // on démarre pour voir les symptômes
    majCommandes(); majPannes();
    if (cb.checked) afficherDetailPanne(cle);
    if (scene && cb.checked) { scene.selectionner(p.composant); }
  });
  $('.btn-info', ligne).addEventListener('click', () => afficherDetailPanne(cle));
  listePannes.appendChild(ligne);
}

function afficherDetailPanne(cle) {
  const p = PANNES[cle];
  const d = $('#detail-panne');
  d.hidden = false;
  const liste = (t) => `<ul>${t.map(x => `<li>${x}</li>`).join('')}</ul>`;
  d.innerHTML = `<h3>${p.nom}</h3>
    <h4>Symptômes</h4>${liste(p.symptomes)}
    <h4>Causes possibles</h4>${liste(p.causes)}
    <h4>Solutions</h4>${liste(p.solutions)}`;
}

function majPannes() {
  $$('#liste-pannes .panne-ligne').forEach(l => {
    const actif = !!sim.pannes[l.dataset.panne];
    $('input', l).checked = actif && !panneMystere;
    l.classList.toggle('active', actif && !panneMystere);
    $('input', l).disabled = !!panneMystere;
  });
}

$('#btn-reparer').addEventListener('click', () => {
  for (const k in sim.pannes) sim.pannes[k] = false;
  panneMystere = null;
  $('#mystere-choix').hidden = true;
  $('#mystere-resultat').hidden = true;
  $('#detail-panne').hidden = true;
  majPannes();
  scene && scene.selectionner(null);
});

/* Panne mystère : diagnostic par l'élève */
$('#btn-mystere').addEventListener('click', () => {
  const cles = Object.keys(PANNES);
  const precedente = panneMystere;
  do { panneMystere = cles[Math.floor(Math.random() * cles.length)]; } while (cles.length > 1 && panneMystere === precedente);
  for (const k in sim.pannes) sim.pannes[k] = k === panneMystere;
  sim.cmd.pompe = true;
  sim.cmd.distributeur = 1;
  sim.positionVerin = 0;
  majCommandes(); majPannes();
  $('#detail-panne').hidden = true;
  scene && scene.selectionner(null);
  scene && scene.recentrer();
  const choix = $('#mystere-choix');
  choix.hidden = false;
  choix.innerHTML = '<p class="aide">Utilisez le distributeur, observez le manomètre, le vérin, le réservoir… Quelle est la panne ?</p>';
  for (const [cle, p] of Object.entries(PANNES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = p.nom;
    b.addEventListener('click', () => repondreMystere(cle, b));
    choix.appendChild(b);
  }
  $('#mystere-resultat').hidden = true;
});

function repondreMystere(cle, bouton) {
  if (!panneMystere) return;
  const bonne = cle === panneMystere;
  $$('#mystere-choix button').forEach(b => { b.disabled = true; });
  bouton.classList.add(bonne ? 'bon' : 'faux');
  const res = $('#mystere-resultat');
  res.hidden = false;
  res.className = 'resultat ' + (bonne ? 'bon' : 'faux');
  res.innerHTML = (bonne ? '✅ Bon diagnostic ! ' : '❌ Ce n\'est pas ça. ') +
    `La panne était : <b>${PANNES[panneMystere].nom}</b>.`;
  const vraie = panneMystere;
  panneMystere = null;
  majPannes();
  afficherDetailPanne(vraie);
  scene && scene.selectionner(PANNES[vraie].composant);
}

/* =====================================================================
   QUIZ (10 questions, correction à la fin)
   ===================================================================== */
const quiz = { commence: false, index: 0, reponses: [], ordres: [] };

function demarrerQuiz() {
  quiz.commence = true;
  quiz.index = 0;
  quiz.reponses = new Array(QUIZ.length).fill(null);
  // Les réponses sont mélangées à chaque partie (la bonne n'est jamais toujours au même endroit)
  quiz.ordres = QUIZ.map(q => melanger(q.choix.map((_, i) => i)));
  afficherQuestion();
}

function melanger(t) {
  for (let i = t.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [t[i], t[j]] = [t[j], t[i]];
  }
  return t;
}

function afficherQuestion() {
  const q = QUIZ[quiz.index];
  const cont = $('#quiz');
  const n = QUIZ.length;
  cont.innerHTML = `
    <div class="quiz-entete"><span>Question ${quiz.index + 1} / ${n}</span><span>${quiz.reponses.filter(r => r !== null).length} réponse(s)</span></div>
    <div class="quiz-barre"><i style="width:${(quiz.index / n) * 100}%"></i></div>
    <p class="quiz-question">${q.q}</p>
    <div class="choix">${quiz.ordres[quiz.index].map((i, k) => `<button type="button" data-i="${i}" class="${quiz.reponses[quiz.index] === i ? 'choisi' : ''}">${String.fromCharCode(65 + k)}. ${q.choix[i]}</button>`).join('')}</div>
    <div class="quiz-nav">
      <button type="button" class="btn-secondaire" id="quiz-prec" ${quiz.index === 0 ? 'disabled' : ''}>◀ Précédente</button>
      <button type="button" class="btn-principal" id="quiz-suiv" ${quiz.reponses[quiz.index] === null ? 'disabled' : ''}>${quiz.index === n - 1 ? 'Voir ma note' : 'Suivante ▶'}</button>
    </div>`;
  $$('.choix button', cont).forEach(b => b.addEventListener('click', () => {
    quiz.reponses[quiz.index] = Number(b.dataset.i);
    $$('.choix button', cont).forEach(x => x.classList.toggle('choisi', x === b));
    $('#quiz-suiv').disabled = false;
  }));
  $('#quiz-prec').addEventListener('click', () => { quiz.index--; afficherQuestion(); });
  $('#quiz-suiv').addEventListener('click', () => {
    if (quiz.index < n - 1) { quiz.index++; afficherQuestion(); }
    else afficherCorrection();
  });
  $('#sim .contenu-panneau').scrollTop = 0;
}

function afficherCorrection() {
  const score = QUIZ.reduce((s, q, i) => s + (quiz.reponses[i] === q.bonne ? 1 : 0), 0);
  const appreciation = score >= 9 ? 'Excellent ! 🏆' : score >= 7 ? 'Très bien 👍' : score >= 5 ? 'Peut mieux faire : revoyez le mode pas à pas.' : 'À retravailler : refaites le pas à pas puis le quiz.';
  $('#quiz').innerHTML = `
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
    <button type="button" class="btn-principal" id="quiz-recommencer" style="width:100%">↺ Recommencer le quiz</button>`;
  $('#quiz-recommencer').addEventListener('click', demarrerQuiz);
  $('#sim .contenu-panneau').scrollTop = 0;
}

/* =====================================================================
   ASTUCE DES GESTES (affichée aux premières ouvertures)
   ===================================================================== */
function afficherAstuce() {
  let vu = 0;
  try { vu = Number(localStorage.getItem('astuceVue') || 0); } catch (_) { /* stockage indisponible */ }
  if (vu >= 2) return;
  try { localStorage.setItem('astuceVue', String(vu + 1)); } catch (_) { /* ignoré */ }
  const a = $('#astuce');
  a.hidden = false;
  const masquer = () => { a.hidden = true; $('#canvas3d').removeEventListener('pointerdown', masquer); };
  $('#canvas3d').addEventListener('pointerdown', masquer);
  setTimeout(masquer, 6000);
}

/* =====================================================================
   PWA : installation et fonctionnement hors connexion
   ===================================================================== */
let invitationInstall = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  invitationInstall = e;
  $('#btn-installer').hidden = false;
});
$('#btn-installer').addEventListener('click', async () => {
  if (!invitationInstall) return;
  invitationInstall.prompt();
  await invitationInstall.userChoice;
  invitationInstall = null;
  $('#btn-installer').hidden = true;
});
// Le service worker n'est utile que dans le navigateur (pas dans l'APK Capacitor)
const dansApk = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
if ('serviceWorker' in navigator && !dansApk && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW :', err)));
  // Nouvelle version installée : on recharge (tout de suite sur l'accueil,
  // sinon au prochain retour à l'accueil) pour l'afficher sans rien faire.
  const avaitUneVersion = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!avaitUneVersion) return; // première installation : rien à recharger
    if ($('#accueil').classList.contains('actif')) location.reload();
    else window.__majEnAttente = true;
  });
}

/* APK Android : le bouton « retour » du téléphone suit l'historique de l'appli
   (ferme une fiche, revient à l'accueil) puis quitte l'application. */
if (dansApk && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
  const AppNative = window.Capacitor.Plugins.App;
  AppNative.addListener('backButton', () => {
    if (feuilleOuverte() || ECRANS_3D.some(id => $('#' + id).classList.contains('actif'))) history.back();
    else AppNative.exitApp();
  });
}

/* iPhone / iPad : Safari n'affiche pas d'invitation d'installation,
   on explique donc la manipulation (sauf si l'appli est déjà installée). */
const surIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const dejaInstallee = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
if (surIOS && !dejaInstallee && !dansApk) $('#aide-ios').hidden = false;

/* Initialisation de l'affichage */
history.replaceState({ ecran: 'accueil' }, '');
majCommandes();
majPannes();

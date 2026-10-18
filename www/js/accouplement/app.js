/* =====================================================================
   accouplement/app.js — Interface du banc « moteur + réducteur »
   ---------------------------------------------------------------------
   Commandes, mesures, alignement au comparateur, pannes, quiz et boucle
   d'animation de l'écran #accoup. La navigation (historique, bouton
   retour) est partagée avec l'application principale (../app.js).
   ===================================================================== */

import { SimulationAccouplement, CARAC, TYPES, rendementReducteur, zoneVibration } from './simulation.js';
import { FICHES, PANNES, QUIZ, PROCEDURE, TYPES_ACCOUPLEMENT } from './donnees.js';

const $ = (sel, racine = document) => racine.querySelector(sel);
const $$ = (sel, racine = document) => [...racine.querySelectorAll(sel)];
const fr = (v, d = 2) => v.toFixed(d).replace('.', ',').replace(/^-(0,0+)$/, '$1');
const frSigne = (v, d = 2) => (v > 0.0049 ? '+' : '') + fr(Math.abs(v) < 0.005 ? 0 : v, d);

const sim = new SimulationAccouplement();
let scene = null;
let enCours = false, dernierTemps = 0, compteurUI = 0;
let ongletActif = 'commandes';
let panneMystere = null;
let epaisseur = 0.10;            // épaisseur de cale choisie (mm)
let mesureEnCours = null;        // animation de mesure { etape, t }
let thetaMesure = 0;             // angle des comparateurs (rad)
let exerciceEnCours = false;
let exerciceReussi = false;
let afficherEcranPrincipal = () => {};

window.__banc = { sim, get scene() { return scene; } };

/* =====================================================================
   OUVERTURE / BOUCLE
   ===================================================================== */
export function initBanc(afficherEcran) {
  afficherEcranPrincipal = afficherEcran;
  return { ouvrir, demarrerBoucle, arreterBoucle, surFermetureFeuilles };
}

async function ouvrir(depuisHistorique = false) {
  if (!depuisHistorique) history.pushState({ ecran: 'accoup' }, '');
  afficherEcranPrincipal('accoup');
  if (!scene) {
    const ok = await initialiser3D();
    if (!ok) return;
  }
  majZones();
  scene.redimensionner();
  majTout();
}

async function initialiser3D() {
  try {
    const essai = document.createElement('canvas');
    if (!(essai.getContext('webgl2') || essai.getContext('webgl'))) throw new Error('WebGL indisponible');
    const { SceneAccouplement } = await import('./scene3d.js');
    scene = new SceneAccouplement($('#ac-canvas'), (id) => ouvrirFiche(id));
    scene.setType(sim.cmd.type, nomEtiquette(sim.cmd.type));
    $('#ac-chargement').hidden = true;
    new ResizeObserver(() => { if (scene) { majZones(); scene.redimensionner(); } }).observe($('#ac-vue3d'));
    return true;
  } catch (err) {
    console.error(err);
    $('#erreur-webgl').hidden = false;
    return false;
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
  animerMesure(dt);
  scene.maj(sim, dt, { thetaMesure });
  scene.rendre(dt);
  if (++compteurUI % 6 === 0) majInterface();
}

/* Zones de la vue recouvertes par les boutons (cadrage et étiquettes) */
function majZones() {
  if (!scene) return;
  const zone = $('#ac-canvas').getBoundingClientRect();
  const rects = [];
  const ajouter = (el) => {
    if (!el || el.hidden || el.offsetParent === null) return null;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return null;
    const o = { x0: r.left - zone.left, y0: r.top - zone.top, x1: r.right - zone.left, y1: r.bottom - zone.top };
    rects.push(o);
    return o;
  };
  $$('#accoup .barre-haut > *').forEach(ajouter);
  $$('#accoup .hud-pression').forEach(ajouter);
  ajouter($('#ac-alerte'));
  const legende = ajouter($('#accoup .legende-3d'));
  const recentrer = ajouter($('#ac-recentrer'));
  scene.setObstacles(rects);
  const hud = $('#accoup .hud-ligne').getBoundingClientRect();
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
$('#btn-accouplement').addEventListener('click', () => ouvrir());
$('#ac-retour').addEventListener('click', () => history.back());
$('#ac-recentrer').addEventListener('click', () => scene && scene.recentrer());
$('#ac-etiquettes').addEventListener('click', (e) => {
  const b = e.currentTarget;
  const v = b.getAttribute('aria-pressed') !== 'true';
  b.setAttribute('aria-pressed', String(v));
  scene && scene.setEtiquettes(v);
});
$('#ac-replier').addEventListener('click', () => $('#ac-panneau').classList.toggle('replie'));

$('#ac-marche').addEventListener('click', () => {
  if (sim.consigne) { flash('Machine consignée : déconsignez-la (onglet Alignement) avant de démarrer.'); return; }
  if (sim.declenche) { flash('Le relais thermique est déclenché : réarmez-le d\'abord.'); return; }
  sim.cmd.marche = !sim.cmd.marche;
  majCommandes();
});
$$('#accoup [data-sens]').forEach(b => b.addEventListener('click', () => {
  sim.cmd.sens = Number(b.dataset.sens);
  majCommandes();
}));
const curF = $('#ac-curseur-f'), curC = $('#ac-curseur-c');
curF.addEventListener('input', () => { sim.cmd.frequence = Number(curF.value); majCommandes(); });
curC.addEventListener('input', () => { sim.cmd.charge = Number(curC.value); majCommandes(); });

const boiteRapports = $('#ac-rapports');
for (const i of CARAC.RAPPORTS) {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.rapport = i;
  b.textContent = 'i = ' + i;
  b.addEventListener('click', () => {
    // Changer de réducteur impose l'arrêt (on ne change pas de rapport en marche)
    if (Math.abs(sim.n) > 1 || sim.cmd.marche) { flash('Arrêtez le moteur pour changer de rapport de réduction.'); return; }
    sim.cmd.rapport = i;
    majCommandes();
  });
  boiteRapports.appendChild(b);
}

/* Choix du type d'accouplement (machine arrêtée : on change l'accouplement) */
const boiteTypes = $('#ac-types');
for (const [t, f] of Object.entries(TYPES_ACCOUPLEMENT)) {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.type = t;
  b.textContent = f.court;
  b.addEventListener('click', () => {
    if (sim.cmd.type === t) { ouvrirFiche('accouplement'); return; }
    if (Math.abs(sim.n) > 1 || sim.cmd.marche) { flash('Arrêtez le moteur (et consignez) avant de changer d\'accouplement.'); return; }
    if (panneMystere) { flash('Terminez d\'abord le diagnostic de la panne mystère.'); return; }
    sim.changerType(t);
    if (scene) scene.setType(t, nomEtiquette(t));
    flash(TYPES_ACCOUPLEMENT[t].nom + ' monté. ' + TYPES_ACCOUPLEMENT[t].role + ' (Touchez à nouveau le bouton pour sa fiche.)');
    construirePannes();
    majTout();
  });
  boiteTypes.appendChild(b);
}
function nomEtiquette(t) {
  const c = TYPES_ACCOUPLEMENT[t].court;
  return 'Accouplement ' + c.charAt(0).toLowerCase() + c.slice(1);
}

$('#ac-rearmer').addEventListener('click', () => {
  if (!sim.rearmer()) flash('Le relais est encore chaud : attendez quelques secondes avant de réarmer.');
  majCommandes();
});
$('#ac-reinit').addEventListener('click', () => {
  sim.reinitialiser();
  panneMystere = null; exerciceEnCours = false; exerciceReussi = false; mesureEnCours = null; thetaMesure = 0;
  $('#ac-mystere-choix').hidden = true; $('#ac-mystere-resultat').hidden = true; $('#ac-detail-panne').hidden = true;
  if (scene) { scene.selectionner(null); scene.recentrer(); }
  majTout();
});

/* Message temporaire dans la zone d'explication */
let finFlash = 0;
function flash(texte) {
  finFlash = performance.now() + 3500;
  const m = ongletActif === 'alignement' ? $('#ac-aide-reglage') : $('#ac-message');
  m.textContent = texte;
}

function majCommandes() {
  const c = sim.cmd;
  const b = $('#ac-marche');
  b.setAttribute('aria-pressed', String(c.marche));
  b.querySelector('small').textContent = sim.consigne ? 'CONSIGNÉ 🔒' : sim.declenche ? 'DÉFAUT' : c.marche ? 'MARCHE' : 'ARRÊT';
  $$('#accoup [data-sens]').forEach(x => x.classList.toggle('actif', Number(x.dataset.sens) === c.sens));
  curF.value = c.frequence;
  curC.value = c.charge;
  const ns = CARAC.N_SYNC * c.frequence / 50;
  $('#ac-val-f').textContent = `${c.frequence} Hz (ns = ${Math.round(ns)} tr/min)`;
  $('#ac-val-c').textContent = `${c.charge} N·m`;
  $$('#ac-rapports button').forEach(x => x.classList.toggle('actif', Number(x.dataset.rapport) === c.rapport));
  const eta = rendementReducteur(c.rapport);
  const etages = CARAC.ETAGES[c.rapport];
  $('#ac-val-i').textContent = `i = ${c.rapport} · ${etages} étage${etages > 1 ? 's' : ''} · η = ${fr(eta)}`;
  $('#ac-rearmer').hidden = !sim.declenche;
  $$('#ac-types button').forEach(x => x.classList.toggle('actif', x.dataset.type === c.type));
  majAlignement();
}

/* Mesures, message et alerte (≈ 10 fois par seconde) */
function majInterface() {
  const r = sim.res;
  const nAbs = Math.abs(sim.n), nsAbs = Math.abs(sim.nSortie);
  $('#ac-hud-n').textContent = Math.round(nAbs);
  $('#ac-hud-ns').textContent = nsAbs < 10 ? fr(nsAbs, 1) : Math.round(nsAbs);
  $('#ac-m-n').textContent = `${Math.round(nAbs)} tr/min`;
  $('#ac-m-c').textContent = `${fr(r.couple, 1)} N·m`;
  $('#ac-m-i').textContent = `${fr(r.intensite, 1)} A`;
  $('#ac-c-i').classList.toggle('alarme', r.intensite > CARAC.I_NOM * 1.05);
  $('#ac-m-ns').textContent = `${nsAbs < 10 ? fr(nsAbs, 1) : Math.round(nsAbs)} tr/min`;
  $('#ac-m-cs').textContent = `${Math.round(r.coupleSortie)} N·m`;
  $('#ac-m-p').textContent = `${Math.round(r.puissance)} W`;
  $('#ac-m-eta').textContent = r.rendement > 0 ? `${Math.round(r.rendement * 100)} %` : '—';
  $('#ac-m-g').textContent = nAbs > 10 ? `${fr(r.glissement * 100, 1)} %` : '—';
  const z = zoneVibration(r.vibration);
  const vib = $('#ac-m-vib');
  vib.textContent = nAbs > 5 ? `${fr(r.vibration, 1)} mm/s · ${z.zone}` : '0 mm/s';
  vib.className = nAbs > 5 ? z.classe : '';
  $('#ac-c-vib').classList.toggle('alarme', nAbs > 5 && z.zone === 'D');
  $('#ac-m-tred').textContent = `${Math.round(sim.tReducteur)} °C`;
  $('#ac-c-tred').classList.toggle('alarme', sim.tReducteur > 80);
  $('#ac-m-tacc').textContent = `${Math.round(sim.tAccouplement)} °C`;
  $('#ac-m-usure').textContent = r.elementHS ? 'HS' : `${Math.round(sim.usure * 100)} %`;
  $('#ac-c-usure').classList.toggle('alarme', r.elementHS);
  $('#ac-c-tacc').classList.toggle('alarme', sim.tAccouplement > 60);
  if (performance.now() > finFlash) {
    const m = $('#ac-message');
    if (m.textContent !== r.message) m.textContent = r.message;
  }
  const al = $('#ac-alerte');
  if (al.hidden !== !r.alerte) { al.hidden = !r.alerte; majZones(); }
  if (r.alerte && al.textContent !== r.alerte) al.textContent = r.alerte;
  al.classList.toggle('vert', !!r.alerteVerte);
  // L'état du bouton Marche peut changer seul (relais thermique)
  const etat = sim.consigne ? 'CONSIGNÉ 🔒' : sim.declenche ? 'DÉFAUT' : sim.cmd.marche ? 'MARCHE' : 'ARRÊT';
  if ($('#ac-marche small').textContent !== etat || $('#ac-rearmer').hidden === sim.declenche) majCommandes();
}

function majTout() { majCommandes(); majPannes(); majInterface(); }

/* =====================================================================
   ONGLETS
   ===================================================================== */
const TITRES = { commandes: 'Moteur + réducteur', alignement: 'Alignement au comparateur', pannes: 'Pannes de transmission', quiz: 'Quiz transmission' };
$$('[data-ac-onglet]').forEach(b => b.addEventListener('click', () => choisirOnglet(b.dataset.acOnglet)));

function choisirOnglet(nom) {
  ongletActif = nom;
  $('#ac-panneau').classList.remove('replie');
  $$('[data-ac-onglet]').forEach(b => {
    b.classList.toggle('actif', b.dataset.acOnglet === nom);
    b.setAttribute('aria-selected', String(b.dataset.acOnglet === nom));
  });
  $$('[data-ac-contenu]').forEach(o => o.classList.toggle('actif', o.dataset.acContenu === nom));
  $('#ac-titre').textContent = TITRES[nom];
  if (nom === 'quiz' && !quiz.commence) demarrerQuiz();
  if (nom === 'alignement') majAlignement();
  $('#ac-contenu').scrollTop = 0;
}

/* =====================================================================
   FICHES DES COMPOSANTS
   ===================================================================== */
function ouvrirFiche(id) {
  if (id === 'accouplement') { ouvrirFeuille(TYPES_ACCOUPLEMENT[sim.cmd.type].nom, htmlFicheType(sim.cmd.type)); if (scene) scene.selectionner(id); return; }
  const f = FICHES[id];
  if (!f) return;
  ouvrirFeuille(f.nom, `
    <p class="symbole">${f.plaque}</p>
    <h3>Rôle</h3><p>${f.role}</p>
    <h3>Fonctionnement</h3><p>${f.fonctionnement}</p>
    <h3>Pannes courantes</h3><ul>${f.pannes.map(p => `<li>${p}</li>`).join('')}</ul>`);
  if (scene) scene.selectionner(id);
}

const liste = (t) => `<ul>${t.map(x => `<li>${x}</li>`).join('')}</ul>`;

/* Fiche d'un type d'accouplement (avec ses tolérances et sa capacité) */
function htmlFicheType(type) {
  const f = TYPES_ACCOUPLEMENT[type], T = TYPES[type];
  return `
    <p class="symbole">${f.plaque}</p>
    <h3>Rôle</h3><p>${f.role}</p>
    <h3>Fonctionnement</h3><p>${f.fonctionnement}</p>
    <h3>Avantages</h3>${liste(f.avantages)}
    <h3>Limites</h3>${liste(f.limites)}
    <h3>Alignement</h3><p>Tolérance à respecter : décalage ≤ ${fr(T.tolDec)} mm, angulaire ≤ ${fr(T.tolAng)} mm/100 mm.
      Capacité de l'accouplement (au-delà, il s'abîme) : ≈ ${fr(T.capDec)} mm et ${fr(T.capAng)} mm/100 mm.</p>
    <h3>Entretien</h3><p>${f.entretien}</p>
    <h3>Emplois typiques</h3><p>${f.emploi}</p>
    <h3>Pannes courantes</h3>${liste([f.panneElement.nom + ' : ' + f.panneElement.symptomes.join(', ').toLowerCase() + '.'].concat(T.lubrifie ? ['Manque de graisse : échauffement, usure rapide.'] : []).concat(['Désalignement : vibrations, échauffement, usure.']))}`;
}

/* Tableau comparatif de tous les types */
function htmlComparatif() {
  const lignes = Object.entries(TYPES_ACCOUPLEMENT).map(([t, f]) => {
    const T = TYPES[t], c = f.comparatif;
    return `<tr class="${t === sim.cmd.type ? 'actif' : ''}"><td><b>${f.court}</b></td><td>${c.amorti}</td><td>${c.desal}</td><td>${c.graissage}</td><td>${c.jeu}</td><td>${fr(T.tolDec)} / ${fr(T.tolAng)}</td></tr>`;
  }).join('');
  return `<div class="defile-x"><table class="table-comparatif">
    <thead><tr><th>Type</th><th>Amortit les chocs</th><th>Désalignement admis</th><th>Graissage</th><th>Jeu</th><th>Tolérance d'alignement (mm · mm/100)</th></tr></thead>
    <tbody>${lignes}</tbody></table></div>
    <p class="aide">Souple ne veut pas dire « pas besoin d'aligner » : quelle que soit la capacité de l'accouplement, on aligne selon la table de vitesse (et plus finement encore pour un accouplement rigide).</p>
    <h3>Emplois typiques</h3>${liste(Object.values(TYPES_ACCOUPLEMENT).map(f => `<b>${f.court}</b> : ${f.emploi}`))}`;
}

function ouvrirFeuille(titre, html) {
  $('#ac-fiche-nom').textContent = titre;
  $('#ac-fiche-corps').innerHTML = html;
  $('#ac-fiche-corps').scrollTop = 0;
  const dejaOuverte = $$('.feuille').some(x => !x.hidden);
  $$('.feuille').forEach(x => { x.hidden = x.id !== 'ac-fiche'; });
  if (!dejaOuverte) history.pushState({ ecran: 'accoup', feuille: 'ac-fiche' }, '');
}
$('#ac-comparer').addEventListener('click', () => ouvrirFeuille('Comparatif des accouplements', htmlComparatif()));
$('[data-ac-fermer]').addEventListener('click', () => { if (!$('#ac-fiche').hidden) history.back(); });

/* Appelé par l'application principale quand les feuilles sont fermées */
function surFermetureFeuilles() { if (scene) scene.selectionner(null); }

/* =====================================================================
   ALIGNEMENT
   ===================================================================== */
const listeProc = $('#ac-procedure');
PROCEDURE.forEach(t => { const li = document.createElement('li'); li.textContent = t; listeProc.appendChild(li); });

const boiteEp = $('#ac-epaisseurs');
for (const e of [0.02, 0.05, 0.10, 0.20, 0.50]) {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.ep = e;
  b.textContent = fr(e) + ' mm';
  b.addEventListener('click', () => { epaisseur = e; majAlignement(); });
  boiteEp.appendChild(b);
}

$('#ac-consigner').addEventListener('click', () => {
  if (!sim.consigne) {
    if (Math.abs(sim.n) > 1 || sim.cmd.marche) {
      sim.cmd.marche = false;
      flash('Arrêt demandé : attendez l\'arrêt complet de la ligne d\'arbres, puis consignez.');
      majCommandes();
      return;
    }
    sim.consigne = true;
    thetaMesure = 0;
    if (scene) scene.focaliser(['accouplement', 'comparateur']);
  } else {
    sim.consigne = false;
    mesureEnCours = null;
    thetaMesure = 0;
    if (scene) scene.recentrer();
  }
  majCommandes();
});

$('#ac-exercice').addEventListener('click', () => {
  sim.nouvelExercice();
  sim.pannes.desalignement = false;
  exerciceEnCours = true;
  exerciceReussi = false;
  mesureEnCours = null;
  $('#ac-calcul').hidden = true;
  flash(sim.consigne
    ? 'Le moteur a été déposé puis remonté : il est désaligné. Mesurez au comparateur.'
    : 'Le moteur a été remonté sans alignement. Démarrez pour constater les vibrations, puis consignez et mesurez.');
  majCommandes();
});

$('#ac-mesurer').addEventListener('click', () => {
  if (!sim.consigne) { flash('Consignez d\'abord la machine : on ne pose pas de comparateurs sur une machine qui peut démarrer.'); return; }
  sim.mesure = { radial: [null, null, null, null], face: [null, null, null, null] };
  mesureEnCours = { etape: 0, t: 0 };
  thetaMesure = 0;
  $('#ac-calcul').hidden = true;
  majAlignement();
});

/* Rotation des arbres à la main : arrêt à 12 h, 3 h, 6 h, 9 h puis retour à 12 h */
function animerMesure(dt) {
  const m = mesureEnCours;
  if (!m || !sim.consigne || !sim.mesure) { mesureEnCours = null; return; }
  m.t += dt;
  const cible = m.etape * Math.PI / 2;
  thetaMesure = Math.min(cible, thetaMesure + dt * 2.2);
  if (thetaMesure >= cible && m.t > 0.9) {
    if (m.etape < 4) {
      const l = sim.lecture(m.etape * 90);
      const arr = (v) => Math.round(v * 100) / 100;
      sim.mesure.radial[m.etape] = arr(l.radial);
      sim.mesure.face[m.etape] = arr(l.face);
      majAlignement();
      m.etape++;
      m.t = 0;
    } else {
      thetaMesure = 0;
      mesureEnCours = null;
      majAlignement();
    }
  }
}

/* Défauts déduits de la mesure (ce que calcule le mécanicien) */
function defautsMesures() {
  const m = sim.mesure;
  if (!m || m.radial.some(v => v === null)) return null;
  const [r0, r90, r180, r270] = m.radial, [f0, f90, f180, f270] = m.face;
  const k = 100 / CARAC.D_MOYEU;   // lecture de face ramenée à 100 mm
  return {
    dv: -r180 / 2, dh: (r90 - r270) / 2,
    av: -f180 * k, ah: (f90 - f270) * k,
    validiteR: Math.abs((r90 + r270) - (r0 + r180)) <= 0.021,
    validiteF: Math.abs((f90 + f270) - (f0 + f180)) <= 0.021,
    r: m.radial, f: m.face
  };
}

$('#ac-calculer').addEventListener('click', () => {
  const d = defautsMesures();
  const c = $('#ac-calcul');
  if (!d) { c.hidden = false; c.innerHTML = '<p>Faites d\'abord une mesure complète (12 h, 3 h, 6 h, 9 h).</p>'; return; }
  const L1 = CARAC.L_AVANT, L2 = CARAC.L_ARRIERE;
  const cav = -(d.dv + d.av / 100 * L1), car = -(d.dv + d.av / 100 * L2);
  const lav = -(d.dh + d.ah / 100 * L1), lar = -(d.dh + d.ah / 100 * L2);
  const sens = (v, plus, moins) => Math.abs(v) < 0.025 ? 'rien à faire' : (v > 0 ? plus : moins) + ' ' + fr(Math.abs(v)) + ' mm';
  c.hidden = false;
  c.innerHTML = `
    <p><b>Décalage vertical</b> = −R(6 h) ÷ 2 = −(${frSigne(d.r[2])}) ÷ 2 = <b>${frSigne(d.dv)} mm</b> (+ = moteur trop haut)</p>
    <p><b>Angulaire vertical</b> = −F(6 h) × 100 / Ø${CARAC.D_MOYEU} = <b>${frSigne(d.av)} mm/100</b> (+ = arrière trop haut)</p>
    <p><b>Décalage horizontal</b> = (R(3 h) − R(9 h)) ÷ 2 = <b>${frSigne(d.dh)} mm</b> (+ = moteur côté opérateur)</p>
    <p><b>Angulaire horizontal</b> = (F(3 h) − F(9 h)) × 100 / Ø${CARAC.D_MOYEU} = <b>${frSigne(d.ah)} mm/100</b></p>
    <p>Pattes à ${L1} mm (avant) et ${L2} mm (arrière) du plan de l'accouplement :<br>
    correction = −(décalage + angulaire × distance / 100)</p>
    <p>Cales avant : <b>${sens(cav, 'ajouter', 'retirer')}</b> · Cales arrière : <b>${sens(car, 'ajouter', 'retirer')}</b></p>
    <p>Pattes avant : <b>${sens(lav, 'pousser vers l\'opérateur de', 'pousser vers le fond de')}</b><br>
    Pattes arrière : <b>${sens(lar, 'pousser vers l\'opérateur de', 'pousser vers le fond de')}</b></p>`;
});

$$('#accoup .reglage').forEach(l => {
  $$('button', l).forEach(b => b.addEventListener('click', () => {
    if (!sim.consigne) { flash('Consignez la machine avant d\'intervenir sur les cales ou les vis de poussée.'); return; }
    const delta = Number(b.dataset.signe) * epaisseur;
    const ok = l.dataset.type === 'cale' ? sim.ajusterCale(l.dataset.cote, delta) : sim.ajusterLateral(l.dataset.cote, delta);
    if (!ok) flash(delta < 0 ? 'Il ne reste pas assez de cales sous ces pattes.' : 'Épaisseur de cales maximale atteinte (3 mm) : le moteur est trop bas ? Retirez plutôt ailleurs.');
    mesureEnCours = null;
    thetaMesure = 0;
    $('#ac-calcul').hidden = true;
    majAlignement();
  }));
});

function majAlignement() {
  const consigne = sim.consigne;
  const bc = $('#ac-consigner');
  bc.setAttribute('aria-pressed', String(consigne));
  bc.textContent = consigne ? '🔓 Déconsigner' : '🔒 Consigner';
  $$('#ac-epaisseurs button').forEach(b => b.classList.toggle('actif', Number(b.dataset.ep) === epaisseur));
  const a = sim.align;
  $$('#accoup .reglage').forEach(l => {
    const v = l.dataset.type === 'cale' ? (l.dataset.cote === 'avant' ? a.caleAvant : a.caleArriere)
                                        : (l.dataset.cote === 'avant' ? a.latAvant : a.latArriere);
    $('output', l).textContent = (l.dataset.type === 'lat' ? frSigne(v) : fr(v)) + ' mm';
    $$('button', l).forEach(b => { b.disabled = !consigne || !!mesureEnCours; });
  });
  $('#ac-mesurer').disabled = !consigne || !!mesureEnCours;
  $('#ac-mesurer').textContent = mesureEnCours ? '⏳ Mesure en cours…' : '📏 Mesurer (tour complet)';
  if (performance.now() > finFlash) {
    $('#ac-aide-reglage').textContent = consigne
      ? 'Cales : + ajoute, − retire sous les deux pattes du côté choisi. Vis de poussée : déplacent le moteur latéralement. Remesurez après chaque réglage.'
      : 'Consignez la machine pour pouvoir caler et déplacer le moteur.';
  }
  // Tableau des lectures
  const m = sim.mesure;
  const cell = (ligne, k) => $$('td', $(ligne))[k + 1];
  for (let k = 0; k < 4; k++) {
    for (const [ligne, cle] of [['#ac-lig-r', 'radial'], ['#ac-lig-f', 'face']]) {
      const v = m ? m[cle][k] : null;
      const td = cell(ligne, k);
      td.textContent = v === null || v === undefined ? '—' : frSigne(v);
      td.classList.toggle('encours', !!mesureEnCours && mesureEnCours.etape === k);
    }
  }
  const d = defautsMesures();
  const val = $('#ac-validite');
  val.hidden = !d;
  if (d) {
    const ok = d.validiteR && d.validiteF;
    val.className = 'validite ' + (ok ? 'ok' : 'ko');
    val.textContent = ok
      ? `✔ Mesure valable : R(3 h) + R(9 h) = ${frSigne(d.r[1] + d.r[3])} = R(12 h) + R(6 h).`
      : '✖ 3 h + 9 h ≠ 12 h + 6 h : mesure douteuse, recommencez.';
  }
  const T = TYPES[sim.cmd.type];
  $('#ac-tol').textContent = `Tolérances (${TYPES_ACCOUPLEMENT[sim.cmd.type].court.toLowerCase()}, 1500 tr/min) : décalage ≤ ${fr(T.tolDec)} mm · angulaire ≤ ${fr(T.tolAng)} mm / 100 mm.`
    + (sim.cmd.type === 'rigide' ? ' Accouplement rigide : alignement au centième, utilisez les cales de 0,02 mm.' : '');
  const res = [['#ac-r-dv', d && d.dv, T.tolDec, 'mm'], ['#ac-r-av', d && d.av, T.tolAng, 'mm/100'],
               ['#ac-r-dh', d && d.dh, T.tolDec, 'mm'], ['#ac-r-ah', d && d.ah, T.tolAng, 'mm/100']];
  let toutBon = !!d;
  for (const [sel, v, tol, u] of res) {
    const el = $(sel);
    const ok = d ? Math.abs(v) <= tol + 1e-9 : null;
    if (d && !ok) toutBon = false;
    el.classList.toggle('ok', ok === true);
    el.classList.toggle('ko', ok === false);
    $('b', el).textContent = d ? `${frSigne(v)} ${u}` : '—';
  }
  // Avancement de la procédure
  const bravo = $('#ac-bravo');
  if (!consigne && exerciceEnCours && sim.severiteAlignement() < 1 && !sim.pannes.piedBoiteux) {
    exerciceEnCours = false;
    exerciceReussi = true;
    bravo.hidden = false;
    bravo.textContent = '✅ Exercice réussi : machine alignée et déconsignée. Démarrez le moteur et contrôlez le niveau vibratoire (zone A).';
  } else if (consigne && d && toutBon && exerciceEnCours) {
    bravo.hidden = false;
    bravo.textContent = '✅ Alignement dans les tolérances ! Resserrez les vis, remontez le carter et déconsignez, puis vérifiez les vibrations en marche.';
  } else if (exerciceEnCours || !d) {
    bravo.hidden = true;
  }
  const etapes = [consigne, consigne, consigne, !!d, !!d && toutBon, false];
  $$('li', listeProc).forEach((li, k) => li.classList.toggle('faite', exerciceReussi || !!etapes[k]));
}

/* =====================================================================
   PANNES
   ===================================================================== */
const listePannes = $('#ac-liste-pannes');

/* Panne vue pour le type d'accouplement monté (nom et textes de la pièce d'usure) */
function panne(cle) {
  const p = PANNES[cle];
  return cle === 'element' ? { ...p, ...TYPES_ACCOUPLEMENT[sim.cmd.type].panneElement } : p;
}
/* Pannes possibles : « manque de graisse » seulement pour les accouplements graissés */
function pannesPossibles() {
  return Object.keys(PANNES).filter(k => !PANNES[k].lubrifie || TYPES[sim.cmd.type].lubrifie);
}

function construirePannes() {
  listePannes.innerHTML = '';
  for (const cle of pannesPossibles()) {
    const p = panne(cle);
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
        if (!sim.consigne && !sim.declenche) sim.cmd.marche = true;   // on démarre pour voir les symptômes
        afficherDetailPanne(cle);
        if (scene) scene.selectionner(p.composant);
      }
      majTout();
    });
    $('.btn-info', ligne).addEventListener('click', () => afficherDetailPanne(cle));
    listePannes.appendChild(ligne);
  }
  $('#ac-detail-panne').hidden = true;
}
construirePannes();

function activerPanne(cle, actif) {
  sim.pannes[cle] = actif;
  if (cle === 'desalignement') { if (actif) sim.nouvelExercice(true); else sim.alignerParfaitement(); }
  if (cle === 'element' && !actif) sim.usure = 0;
}

function afficherDetailPanne(cle) {
  const p = panne(cle);
  const d = $('#ac-detail-panne');
  d.hidden = false;
  d.innerHTML = `<h3>${p.nom}</h3>
    <h4>Symptômes</h4>${liste(p.symptomes)}
    <h4>Causes possibles</h4>${liste(p.causes)}
    <h4>Solutions</h4>${liste(p.solutions)}`;
}

function majPannes() {
  $$('#ac-liste-pannes .panne-ligne').forEach(l => {
    const actif = !!sim.pannes[l.dataset.panne];
    $('input', l).checked = actif && !panneMystere;
    l.classList.toggle('active', actif && !panneMystere);
    $('input', l).disabled = !!panneMystere;
  });
}

function toutReparer() {
  for (const k in sim.pannes) sim.pannes[k] = false;
  sim.alignerParfaitement();
  sim.usure = 0;
  exerciceEnCours = false;
  exerciceReussi = false;
}

$('#ac-reparer').addEventListener('click', () => {
  toutReparer();
  panneMystere = null;
  $('#ac-mystere-choix').hidden = true;
  $('#ac-mystere-resultat').hidden = true;
  $('#ac-detail-panne').hidden = true;
  scene && scene.selectionner(null);
  majTout();
});

$('#ac-mystere').addEventListener('click', () => {
  const cles = pannesPossibles();
  const precedente = panneMystere;
  do { panneMystere = cles[Math.floor(Math.random() * cles.length)]; } while (cles.length > 1 && panneMystere === precedente);
  toutReparer();
  activerPanne(panneMystere, true);
  sim.consigne = false;
  if (sim.declenche) { sim.declenche = false; sim.thermique = 0; }
  sim.cmd.marche = true;
  sim.cmd.frequence = 50;
  $('#ac-detail-panne').hidden = true;
  if (scene) { scene.selectionner(null); scene.recentrer(); }
  const choix = $('#ac-mystere-choix');
  choix.hidden = false;
  choix.innerHTML = '<p class="aide">Regardez les mesures (onglet Commandes), l\'accouplement, le réducteur et l\'arbre de sortie… Quelle est la panne ?</p>';
  for (const cle of cles) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = panne(cle).nom;
    b.addEventListener('click', () => repondreMystere(cle, b));
    choix.appendChild(b);
  }
  $('#ac-mystere-resultat').hidden = true;
  majTout();
});

function repondreMystere(cle, bouton) {
  if (!panneMystere) return;
  const bonne = cle === panneMystere;
  $$('#ac-mystere-choix button').forEach(b => { b.disabled = true; });
  bouton.classList.add(bonne ? 'bon' : 'faux');
  const res = $('#ac-mystere-resultat');
  res.hidden = false;
  res.className = 'resultat ' + (bonne ? 'bon' : 'faux');
  res.innerHTML = (bonne ? '✅ Bon diagnostic ! ' : '❌ Ce n\'est pas ça. ') + `La panne était : <b>${panne(panneMystere).nom}</b>.`;
  const vraie = panneMystere;
  panneMystere = null;
  majPannes();
  afficherDetailPanne(vraie);
  scene && scene.selectionner(panne(vraie).composant);
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
  const cont = $('#ac-quiz');
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
  $('#ac-contenu').scrollTop = 0;
}

function afficherCorrection() {
  const score = QUIZ.reduce((s, q, i) => s + (quiz.reponses[i] === q.bonne ? 1 : 0), 0);
  const ratio = score / QUIZ.length;
  const appreciation = ratio >= 0.9 ? 'Excellent ! 🏆' : ratio >= 0.7 ? 'Très bien 👍' : ratio >= 0.5 ? 'Peut mieux faire : relisez les fiches des composants.' : 'À retravailler : refaites l\'alignement puis le quiz.';
  $('#ac-quiz').innerHTML = `
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
    <button type="button" class="btn-principal pleine-largeur" id="ac-quiz-recommencer">↺ Recommencer le quiz</button>`;
  $('#ac-quiz-recommencer').addEventListener('click', demarrerQuiz);
  $('#ac-contenu').scrollTop = 0;
}

majTout();

/* =====================================================================
   main.js — Navigation de l'appli (accueil ↔ banc 3D), bouton retour
   du téléphone, installation et fonctionnement hors connexion.
   Le banc lui-même est dans banc/app.js ; le sujet dans config.js.
   ===================================================================== */
import { initBanc } from './banc/app.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

function afficherEcran(id) {
  $$('.ecran').forEach(e => e.classList.toggle('actif', e.id === id));
  if (id === 'accoup') banc.demarrerBoucle(); else banc.arreterBoucle();
}
const banc = initBanc(afficherEcran);

function feuilleOuverte() { return $$('.feuille').some(f => !f.hidden); }
function fermerFeuilles() {
  if (!feuilleOuverte()) return;
  $$('.feuille').forEach(f => { f.hidden = true; });
  banc.surFermetureFeuilles();
}
function retourAccueil() {
  fermerFeuilles();
  afficherEcran('accueil');
  if (window.__majEnAttente) location.reload();
}

// Bouton retour du téléphone / navigateur : ferme d'abord une fiche ouverte
window.addEventListener('popstate', (e) => {
  const st = e.state || {};
  if (feuilleOuverte()) { fermerFeuilles(); if (st.ecran === 'accoup') return; }
  if (st.ecran === 'accoup') afficherEcran('accoup');
  else retourAccueil();
});

// Pause automatique quand l'application passe en arrière-plan
document.addEventListener('visibilitychange', () => {
  if (document.hidden) banc.arreterBoucle();
  else if ($('#accoup').classList.contains('actif')) banc.demarrerBoucle();
});

/* Installation (PWA) et hors connexion */
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
const dansApk = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
if ('serviceWorker' in navigator && !dansApk && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW :', err)));
  const avaitUneVersion = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!avaitUneVersion) return;
    if ($('#accueil').classList.contains('actif')) location.reload();
    else window.__majEnAttente = true;
  });
}

/* APK Android : le bouton « retour » suit l'historique puis quitte l'appli */
if (dansApk && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
  const AppNative = window.Capacitor.Plugins.App;
  AppNative.addListener('backButton', () => {
    if (feuilleOuverte() || $('#accoup').classList.contains('actif')) history.back();
    else AppNative.exitApp();
  });
}

/* iPhone / iPad : explication de l'installation */
const surIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const dejaInstallee = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
if (surIOS && !dejaInstallee && !dansApk) $('#aide-ios').hidden = false;

history.replaceState({ ecran: 'accueil' }, '');

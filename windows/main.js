// =====================================================================
// Simulations 3D — version Windows (Electron)
// - Embarque le site complet (accueil + toutes les applis) : hors connexion.
// - S'ouvre en plein écran (vidéoprojecteur). F11 : plein écran on/off.
// - Ctrl+Accueil : retour à l'accueil · Alt+← : page précédente
// - Ctrl + / Ctrl - / Ctrl 0 : agrandir / réduire / taille normale (texte lisible au fond de la classe)
// - F5 : recharger · l'écran ne se met pas en veille pendant l'utilisation.
// Les fichiers sont servis par le protocole interne app://simulations/ (modules JS,
// fetch et caméra RA fonctionnent comme sur GitHub Pages).
// =====================================================================
'use strict';
const { app, BrowserWindow, protocol, net, shell, session, powerSaveBlocker, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const SCHEMA = 'app';
const HOTE = 'simulations';
const ACCUEIL = `${SCHEMA}://${HOTE}/`;
const SITE = path.join(__dirname, 'site');

protocol.registerSchemesAsPrivileged([{
  scheme: SCHEMA,
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true }
}]);

// 3D garantie même sur un vieux PC de salle de classe : si la carte graphique est refusée par
// Chromium, la 3D passe par le rendu logiciel (SwiftShader). Sans risque ici : l'appli n'affiche
// que ses propres fichiers (la navigation vers Internet est bloquée).
app.commandLine.appendSwitch('enable-unsafe-swiftshader');
if (process.env.SIMULATIONS_AUTOTEST) app.commandLine.appendSwitch('ignore-gpu-blocklist');

// une seule fenêtre : un double-clic sur l'icône ramène la fenêtre existante
if (!app.requestSingleInstanceLock()) app.quit();

let fenetre = null;
let manquants = null; // relevé des fichiers absents (auto-test)

function fichierDepuisUrl(url) {
  const u = new URL(url);
  if (u.host !== HOTE) return null;
  let rel = decodeURIComponent(u.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const fichier = path.normalize(path.join(SITE, rel));
  // interdit de sortir du dossier du site (../)
  if (fichier !== SITE && !fichier.startsWith(SITE + path.sep)) return null;
  return fichier;
}

function creerFenetre() {
  fenetre = new BrowserWindow({
    width: 1280,
    height: 800,
    fullscreen: true,
    backgroundColor: '#0f172a',
    title: 'Simulations 3D',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  });
  fenetre.once('ready-to-show', () => fenetre.show());
  fenetre.loadURL(ACCUEIL);

  const wc = fenetre.webContents;

  // liens externes : ouverts dans le navigateur de Windows, jamais dans l'appli
  wc.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(ACCUEIL)) { wc.loadURL(url); return { action: 'deny' }; }
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  wc.on('will-navigate', (e, url) => {
    if (url.startsWith(ACCUEIL)) return;
    e.preventDefault();
    if (/^https:\/\//.test(url)) shell.openExternal(url);
  });

  // raccourcis clavier (le menu est masqué, on les gère ici)
  wc.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    const k = input.key;
    const ctrl = input.control || input.meta;
    let fait = true;
    if (k === 'F11') fenetre.setFullScreen(!fenetre.isFullScreen());
    else if (k === 'F5') wc.reload();
    else if (ctrl && k === 'Home') wc.loadURL(ACCUEIL);
    else if (input.alt && k === 'ArrowLeft') { if (wc.navigationHistory.canGoBack()) wc.navigationHistory.goBack(); }
    else if (ctrl && (k === '+' || k === '=' || k === 'Add')) wc.setZoomLevel(Math.min(wc.getZoomLevel() + 0.5, 4));
    else if (ctrl && (k === '-' || k === 'Subtract')) wc.setZoomLevel(Math.max(wc.getZoomLevel() - 0.5, -3));
    else if (ctrl && k === '0') wc.setZoomLevel(0);
    else if (ctrl && input.shift && k.toLowerCase() === 'i' && !app.isPackaged) wc.toggleDevTools();
    else fait = false;
    if (fait) e.preventDefault();
  });

  fenetre.on('closed', () => { fenetre = null; });
}

app.on('second-instance', () => {
  if (!fenetre) return;
  if (fenetre.isMinimized()) fenetre.restore();
  fenetre.focus();
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);

  protocol.handle(SCHEMA, (req) => {
    const fichier = fichierDepuisUrl(req.url);
    if (!fichier) return new Response('Accès refusé', { status: 403 });
    if (!fs.existsSync(fichier)) {
      if (manquants) manquants.push(`fichier manquant : ${req.url}`);
      return new Response('Fichier introuvable', { status: 404 });
    }
    return net.fetch(pathToFileURL(fichier).toString());
  });

  // autorisations : uniquement pour les pages de l'appli (caméra de la réalité augmentée, plein écran)
  const AUTORISEES = new Set(['media', 'fullscreen', 'clipboard-sanitized-write']);
  const ses = session.defaultSession;
  ses.setPermissionRequestHandler((wc, permission, rappel, details) => {
    const origine = details.requestingUrl || wc.getURL();
    rappel(origine.startsWith(ACCUEIL) && AUTORISEES.has(permission));
  });
  ses.setPermissionCheckHandler((wc, permission, origine) =>
    String(origine || '').startsWith(`${SCHEMA}://${HOTE}`) && AUTORISEES.has(permission));

  // pas de mise en veille de l'écran pendant la projection
  powerSaveBlocker.start('prevent-display-sleep');

  creerFenetre();
  if (process.env.SIMULATIONS_AUTOTEST) autotest();
});

// ---------------------------------------------------------------------
// Auto-test (GitHub Actions) : ouvre chaque appli de l'accueil, relève les
// erreurs JavaScript et les fichiers manquants, enregistre une capture.
// Lancement : SIMULATIONS_AUTOTEST=dossier-captures electron .
// ---------------------------------------------------------------------
async function autotest() {
  const sortie = path.resolve(process.env.SIMULATIONS_AUTOTEST);
  fs.mkdirSync(sortie, { recursive: true });
  const wc = fenetre.webContents;
  const pause = (ms) => new Promise(r => setTimeout(r, ms));
  let erreurs = [];
  wc.on('console-message', (e) => {
    const niveau = e.level ?? e.params?.level;
    const msg = e.message ?? e.params?.message ?? '';
    if (/ResizeObserver loop/.test(msg)) return; // avertissement sans conséquence de Chromium
    if (niveau === 'error' || niveau === 3) erreurs.push(`console : ${msg}`);
  });
  wc.on('did-fail-load', (_e, code, desc, url) => erreurs.push(`chargement ${url} : ${desc} (${code})`));
  wc.on('render-process-gone', (_e, d) => erreurs.push(`page plantée : ${d.reason}`));

  const html = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
  const dossiers = [...new Set([...html.matchAll(/href="([a-z0-9-]+)\/"/g)].map(m => m[1]))];
  const pages = ['', ...dossiers.map(d => d + '/')];
  let echecs = 0;
  const rapport = [];
  const ecrire = (l) => { console.log(l); rapport.push(l); };
  for (const p of pages) {
    erreurs = [];
    manquants = erreurs;
    try { await wc.loadURL(ACCUEIL + p); } catch (err) { erreurs.push(`loadURL : ${err.message}`); }
    await pause(4000);
    const titre = wc.getTitle();
    const img = await wc.capturePage();
    fs.writeFileSync(path.join(sortie, (p.replace(/\/$/, '') || 'accueil') + '.png'), img.toPNG());
    const ok = erreurs.length === 0;
    if (!ok) echecs++;
    ecrire(`${ok ? 'OK   ' : 'ÉCHEC'} /${p}  « ${titre} »`);
    for (const m of erreurs) ecrire(`        ${m}`);
  }
  ecrire(`${pages.length - echecs}/${pages.length} pages sans erreur.`);
  fs.writeFileSync(path.join(sortie, 'rapport.txt'), rapport.join('\n') + '\n');
  app.exit(echecs ? 1 : 0);
}

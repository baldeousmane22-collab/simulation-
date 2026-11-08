#!/usr/bin/env node
// Copie le site complet (accueil + toutes les applis) dans windows/site pour l'appli Windows.
// La liste des applis est lue dans www/index.html (les liens « dossier/ ») :
// une appli ajoutée à l'accueil est donc automatiquement incluse dans l'exe.
// Les projets Android (apk/, android/) ne sont pas copiés.
'use strict';
const fs = require('fs');
const path = require('path');

const racine = path.resolve(__dirname, '..', '..');
const dossierWin = path.resolve(__dirname, '..');
const site = path.join(dossierWin, 'site');
const EXCLUS = new Set(['apk', 'android', 'ios', 'node_modules', '.git']);

function copier(src, dst) {
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    if (EXCLUS.has(path.basename(src))) return;
    fs.mkdirSync(dst, { recursive: true });
    for (const n of fs.readdirSync(src)) copier(path.join(src, n), path.join(dst, n));
  } else {
    fs.copyFileSync(src, dst);
  }
}

fs.rmSync(site, { recursive: true, force: true });
fs.mkdirSync(site, { recursive: true });

const accueil = path.join(racine, 'www', 'index.html');
fs.copyFileSync(accueil, path.join(site, 'index.html'));

const html = fs.readFileSync(accueil, 'utf8');
const dossiers = [...new Set([...html.matchAll(/href="([a-z0-9-]+)\/"/g)].map(m => m[1]))];
if (!dossiers.length) throw new Error('Aucune appli trouvée dans www/index.html');

for (const d of dossiers) {
  // l'appli autonome à la racine du dépôt a priorité, sinon la copie déjà dans www/
  const candidats = [path.join(racine, d), path.join(racine, 'www', d)];
  const src = candidats.find(c => fs.existsSync(path.join(c, 'index.html')));
  if (!src) throw new Error(`Appli introuvable : ${d}/index.html`);
  copier(src, path.join(site, d));
  console.log(`  ✓ ${d}`);
}

// icône de l'exe (1024 px, convertie en .ico par electron-builder)
fs.mkdirSync(path.join(dossierWin, 'build'), { recursive: true });
fs.copyFileSync(path.join(racine, 'assets', 'icon-only.png'), path.join(dossierWin, 'build', 'icon.png'));

console.log(`Site prêt dans windows/site (${dossiers.length} applis).`);

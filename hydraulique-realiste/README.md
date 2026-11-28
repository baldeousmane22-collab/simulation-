# Hydraulique réaliste 3D

Lien : https://baldeousmane22-collab.github.io/simulation-/hydraulique-realiste/

- `js/physique.js` : modèle physique (pas de 40 µs) — pompe, limiteur, distributeur 4/3, réducteur, vérin, thermique.
- `js/scene3d.js` : scène Three.js (centrale, distributeur, vérin à tirants, flexibles, manomètres, vue en coupe).
- `js/app.js` : interface (commandes maintenues, curseurs, courbes, pannes, calculs, fiches).
- `js/sons.js` : sons Web Audio. `apk/` : projet Android (Capacitor), construit par
  `.github/workflows/hydraulique-realiste-apk.yml` et publié dans les Releases.

# Touret à meuler 3D + RA — sources

- `src/touret.js` : modèle 3D des pièces (profils relevés sur le dessin), données `PIECES` (nom, repère) et `ROT`.
- `src/scene_touret.js` : animation (rotation, éclaté, montage pas à pas `seq.json`, étincelles), matériaux réels `REAL`.
- `src/detail.js` : **vue de détail (loupe)** — clic sur une pièce → pièce agrandie, rotation continue, pause, glisser, fermeture.
- `src/ar_main.js` : page principale (3D, réalité augmentée WebXR, interface).
- `src/viewer.js`, `src/geo.js`, `src/realism.js` : moteur de vue, géométries, textures et son.
- Construire : `python3 build.py` → `../index.html`.  Tester : `node tests/detail.test.js http://localhost:8000/touret-a-meuler-ra/`.

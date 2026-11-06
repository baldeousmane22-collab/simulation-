# Touret à meuler 3D + RA — sources

- `src/touret.js` : modèle 3D des pièces (profils relevés sur le dessin), données `PIECES` (nom, repère) et `ROT`.
- `src/scene_touret.js` : animation (rotation, éclaté, montage pas à pas `seq.json`, étincelles), matériaux réels `REAL`.
- `src/detail.js` : **fenêtre de détail** — clic sur une pièce → 3D en grand (rotation lente, pause, glisser), vues normale / éclatée / coupe, lien 3D ↔ schéma.
- `src/schema.js` : **schéma technique SVG** généré depuis les données de la pièce (profil, cotes), repères A, B, C…, cartouche (repère, désignation, quantité, matière, fonction).

## Ajouter le schéma d'une nouvelle pièce
1. Dans `src/touret.js`, créer la pièce avec `add(num, profil, …)` : le profil (points `[x du dessin en px, rayon]`) est gardé dans `parts[clé].prof` et le schéma en demi-coupe est dessiné automatiquement (cotes L, Ø ext., Ø alésage). Pour une pièce qui n'est pas de révolution, ajouter un champ de données (comme `lock` pour les écrous, `screw` pour les vis) et une branche de dessin dans `buildSchema`.
2. Dans `src/touret.js`, `PIECES[num] = [nom, couleur]` donne le nom et le numéro de repère.
3. Dans `src/schema.js` : ajouter la désignation technique dans `DESIGNATION`, la fonction dans `FONCTION`, la matière dans `MATIERE` (`src/detail.js`).
4. Repères du schéma : dans `ZONES[num]`, une ligne par élément : `{ label, x: [x0, x1] (px du dessin), r: [r0, r1] }` — la zone est surlignée sur le schéma ET sur la pièce 3D (bande orange). Pour un sous-objet 3D précis, utiliser `objs: [maillages]`. Sans `ZONES`, des repères automatiques sont créés (diamètre extérieur, alésage, face d'appui).
5. `python3 build.py`, puis `node tests/detail.test.js <url>`.
- `src/ar_main.js` : page principale (3D, réalité augmentée WebXR, interface).
- `src/viewer.js`, `src/geo.js`, `src/realism.js` : moteur de vue, géométries, textures et son.
- Construire : `python3 build.py` → `../index.html`.  Tester : `node tests/detail.test.js http://localhost:8000/touret-a-meuler-ra/`.

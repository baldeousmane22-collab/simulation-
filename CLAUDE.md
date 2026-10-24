# Règles de travail (à appliquer à chaque projet, sans redemander)

## 1. Relecture systématique
Après chaque code écrit, relire TOUT le code soi-même, trouver les erreurs et les corriger sans attendre qu'on le demande.

## 2. Sécurité
- Aucune clé, aucun mot de passe ni aucun secret dans le code.
- Vérifier toutes les entrées de l'utilisateur.
- Pas de `innerHTML` avec du texte non sûr (utiliser `textContent` ou des éléments créés via le DOM).
- Pas de `eval` (ni `new Function`, ni `setTimeout` avec une chaîne).
- Liens externes en `https` avec `rel="noopener"` (et `noreferrer` si pertinent).
- Aucune bibliothèque douteuse ou obsolète.

## 3. Tests complets
Tester l'application (ouverture, boutons, animations, zoom, pincement, déplacement) sur ordinateur ET sur téléphone (émulation mobile tactile via Playwright).
S'il y a une erreur dans la console, la corriger puis retester, jusqu'à zéro erreur.

## 4. Amélioration proactive
Améliorer l'application de sa propre initiative : lisibilité, fluidité, couleurs, textes en français sans fautes, affichage adapté au téléphone.

## 5. Livraison
Ne livrer l'application que lorsque tout fonctionne. À la fin, donner un court résumé :
- ce qui a été corrigé ;
- ce qui a été amélioré ;
- le lien GitHub Pages.

## 6. Autonomie
Ne pas interrompre l'utilisateur pour de petites décisions : choisir soi-même la meilleure solution professionnelle.

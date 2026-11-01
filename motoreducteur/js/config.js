/* =====================================================================
   config.js — Sujet de cette appli (seul fichier qui change entre les
   applis « Moteur », « Motoréducteur » et « Banc d'accouplements »).
   ===================================================================== */
export const SUJET = {
  "id": "motoreducteur",
  "titre": "Motoréducteur",
  "reducteur": true,
  "choixType": false,
  "rapports": [
    5,
    10,
    20,
    40
  ],
  "rapportDefaut": 10,
  "jCharge": 2.0,
  "chargeMax": 400,
  "chargePas": 5,
  "chargeDefaut": 50,
  "pannes": [
    "huile",
    "clavette",
    "roulement",
    "bloquee"
  ],
  "quiz": [
    "reducteur",
    "moteur"
  ],
  "onglets": {
    "commandes": "Motoréducteur",
    "pannes": "Pannes du motoréducteur",
    "quiz": "Quiz motoréducteur"
  },
  "mesuresMasquees": [
    "#ac-c-tacc",
    "#ac-c-usure"
  ],
  "aideMystere": "Regardez les mesures (onglet Commandes), le réducteur, son huile et l'arbre de sortie… Quelle est la panne ?"
};

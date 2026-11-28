/* =====================================================================
   config.js — Sujet de cette appli (seul fichier qui change entre les
   applis « Moteur », « Motoréducteur » et « Banc d'accouplements »).
   ===================================================================== */
export const SUJET = {
  "id": "moteur",
  "titre": "Moteur asynchrone",
  "reducteur": false,
  "choixType": false,
  "rapports": [
    1
  ],
  "rapportDefaut": 1,
  "jCharge": 0.06,
  "chargeMax": 30,
  "chargePas": 1,
  "chargeDefaut": 5,
  "pannes": [
    "roulement",
    "piedBoiteux",
    "bloquee"
  ],
  "quiz": [
    "moteur"
  ],
  "onglets": {
    "commandes": "Moteur asynchrone",
    "pannes": "Pannes du moteur",
    "quiz": "Quiz moteur"
  },
  "mesuresMasquees": [
    "#ac-m-ns",
    "#ac-m-cs",
    "#ac-c-tred",
    "#ac-c-tacc",
    "#ac-c-usure"
  ],
  "aideMystere": "Regardez les mesures (onglet Commandes) : intensité, vitesse, vibrations, température… Quelle est la panne ?"
};

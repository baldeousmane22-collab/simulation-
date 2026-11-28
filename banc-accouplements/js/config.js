/* =====================================================================
   config.js — Sujet de cette appli (seul fichier qui change entre les
   applis « Moteur », « Motoréducteur » et « Banc d'accouplements »).
   ===================================================================== */
export const SUJET = {
  "id": "accouplements",
  "titre": "Banc d'accouplements",
  "reducteur": true,
  "choixType": true,
  "rapports": [
    10
  ],
  "rapportDefaut": 10,
  "jCharge": 2.0,
  "chargeMax": 400,
  "chargePas": 5,
  "chargeDefaut": 50,
  "pannes": [
    "desalignement",
    "element",
    "graisse",
    "piedBoiteux",
    "clavette"
  ],
  "quiz": [
    "accouplement"
  ],
  "onglets": {
    "commandes": "Accouplements",
    "alignement": "Alignement au comparateur",
    "pannes": "Pannes d'accouplement",
    "quiz": "Quiz accouplements"
  },
  "mesuresMasquees": [
    "#ac-c-tred"
  ],
  "aideMystere": "Regardez les mesures (onglet Commandes), l'accouplement et l'arbre de sortie… Quelle est la panne ?"
};

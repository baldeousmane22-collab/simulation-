/* =====================================================================
   simulation.js — Modèle physique simplifié du circuit hydraulique
   ---------------------------------------------------------------------
   Ce module ne dessine rien : il calcule les débits, les pressions et la
   position du vérin à partir des commandes (pompe, distributeur, curseurs)
   et des pannes actives. La scène 3D et l'interface lisent ensuite l'état.

   Hypothèses du modèle (volontairement simples et pédagogiques) :
   - pompe volumétrique à cylindrée fixe (le débit ne dépend que de la
     vitesse de rotation, sauf usure ou aspiration difficile) ;
   - régulateur de débit 2 voies en série : il limite le débit envoyé au
     distributeur ; le surplus de la pompe passe par le limiteur ;
   - distributeur 4/3 à centre tandem (neutre : P→T, A et B bloqués) ;
   - vérin double effet avec charge constante (pression de charge fixe).
   ===================================================================== */

/* ----------------------- Caractéristiques du banc ------------------- */
export const CARAC = {
  QNOM: 8,              // débit nominal de la pompe (L/min)
  DIAM_PISTON: 40,      // diamètre du piston (mm)
  DIAM_TIGE: 22,        // diamètre de la tige (mm)
  COURSE: 500,          // course du vérin (mm)
  FORCE_SORTIE: 4000,   // effort résistant en sortie de tige (N)
  FORCE_RENTREE: 1500,  // effort résistant en rentrée (frottements, N)
  P_MAX_MANO: 250,      // pleine échelle du manomètre (bar)
  P_MAX_POMPE_USEE: 65, // pression maximale que peut fournir une pompe usée (bar)
  VOLUME_RESERVOIR: 40  // volume du réservoir (L)
};

/* Surfaces utiles en cm² : S = π·d²/4 (d en cm) */
const SA = Math.PI * Math.pow(CARAC.DIAM_PISTON / 10, 2) / 4;              // côté fond (A)
const SB = SA - Math.PI * Math.pow(CARAC.DIAM_TIGE / 10, 2) / 4;           // côté tige (B)
export const SURFACES = { SA, SB };

/* Pression nécessaire pour vaincre la charge (bar) : p = F / S
   F en N, S en cm² → p (bar) = F / (S × 10) */
const P_CHARGE_SORTIE = CARAC.FORCE_SORTIE / (SA * 10);
const P_CHARGE_RENTREE = CARAC.FORCE_RENTREE / (SB * 10);

/* Petite fonction utilitaire : rapproche « valeur » de « cible »
   avec une constante de temps tau (lissage exponentiel). */
function lisser(valeur, cible, tau, dt) {
  if (tau <= 0) return cible;
  return valeur + (cible - valeur) * (1 - Math.exp(-dt / tau));
}

/* ---------------------------------------------------------------------
   Classe principale : instanciée une seule fois par l'application.
   --------------------------------------------------------------------- */
export class SimulationHydraulique {
  constructor() {
    // Commandes de l'utilisateur
    this.cmd = {
      pompe: false,       // pompe en marche ?
      distributeur: 0,    // -1 = rentrée, 0 = neutre, +1 = sortie
      debitPct: 100,      // ouverture du régulateur de débit (10 à 100 %)
      tarage: 120         // tarage du limiteur (bar)
    };
    // Pannes simulées
    this.pannes = { filtre: false, fuite: false, pompe: false, clapet: false };

    // État interne
    this.positionVerin = 0;    // 0 = tige rentrée, 1 = tige sortie
    this.vitesseRotation = 0;  // 0 à 1 (montée en vitesse du moteur)
    this.niveauHuile = 0.8;    // 0 à 1 (hauteur relative dans le réservoir)
    this.temps = 0;

    // Grandeurs calculées (lues par la 3D et l'interface)
    this.res = {
      Qpompe: 0, Qlimiteur: 0, Qverin: 0, Qfuite: 0,
      pressionCible: 0, pression: 0,     // pression pompe (bar), cible et affichée (lissée)
      pressionA: 0, pressionB: 0,
      ouvertureLimiteur: 0,              // 0 à 1, lissé
      vitesseTige: 0,                    // mm/s (signe = sens)
      force: 0,                          // N
      enButee: false, cavitation: false,
      lignes: {},                        // état de chaque conduite (type + débit)
      message: "", alerte: ""
    };
    this.calculer(0);
  }

  /* Remet le banc dans son état initial (bouton « Réinitialiser ») */
  reinitialiser() {
    this.cmd.pompe = false;
    this.cmd.distributeur = 0;
    this.cmd.debitPct = 100;
    this.cmd.tarage = 120;
    for (const k in this.pannes) this.pannes[k] = false;
    this.positionVerin = 0;
    this.niveauHuile = 0.8;
  }

  /* -------------------------------------------------------------------
     Calcul d'un pas de simulation (dt en secondes)
     ------------------------------------------------------------------- */
  calculer(dt) {
    const c = this.cmd, pn = this.pannes, r = this.res;
    dt = Math.min(dt, 0.1); // sécurité si l'onglet a été mis en pause
    this.temps += dt;

    // 1) Le moteur monte (ou descend) progressivement en vitesse
    this.vitesseRotation = lisser(this.vitesseRotation, c.pompe ? 1 : 0, 0.35, dt);
    const rot = this.vitesseRotation < 0.01 ? 0 : this.vitesseRotation;

    // 2) Débit théorique de la pompe, réduit par l'aspiration et l'usure
    const crepineDecouverte = this.niveauHuile < 0.38; // l'huile ne recouvre plus la crépine
    r.cavitation = rot > 0.2 && (pn.filtre || crepineDecouverte);
    let facteurAsp = 1;
    if (pn.filtre) facteurAsp *= 0.62;
    if (crepineDecouverte) facteurAsp *= 0.5;
    const Qth = CARAC.QNOM * rot * facteurAsp;

    // Débit réel de la pompe en fonction de la pression (fuites internes si usée)
    const debitPompe = (p) => {
      if (!pn.pompe) return Qth;
      return Math.max(0, Qth * 0.6 * (1 - p / CARAC.P_MAX_POMPE_USEE));
    };
    // Pression maximale que la pompe est capable de produire
    const pMaxPompe = pn.pompe ? CARAC.P_MAX_POMPE_USEE : Infinity;

    // 3) Ce que le circuit en aval peut accepter
    const Qreg = CARAC.QNOM * (c.debitPct / 100);   // débit max du régulateur
    const d = c.distributeur;
    const enButee = (d === 1 && this.positionVerin >= 0.999) || (d === -1 && this.positionVerin <= 0.001);
    r.enButee = enButee && rot > 0;

    let pAval = 0;          // pression nécessaire en aval du clapet (bar)
    let capacite = 0;       // débit max accepté en aval (L/min)
    let bloque = false;     // vrai si l'huile ne peut pas passer du tout

    if (pn.clapet) {
      bloque = true;        // clapet anti-retour bloqué fermé
    } else if (d === 0) {
      pAval = 3;            // centre tandem : P→T, quasiment sans pression
      capacite = Qreg;
    } else if (enButee) {
      bloque = true;        // fin de course : plus aucun déplacement possible
    } else {
      pAval = d === 1 ? P_CHARGE_SORTIE : P_CHARGE_RENTREE;
      capacite = Qreg;
    }

    // Fuite externe sur le raccord du vérin côté A (dépend de la pression de la ligne A)
    const fuiteSur = (pA) => (pn.fuite && rot > 0) ? 0.2 * CARAC.QNOM * Math.sqrt(Math.max(pA, 0) / 30) : 0;

    // 4) Résolution simplifiée : on cherche la pression de la pompe
    let P = 0, Qp = 0, Qacc = 0, Qrel = 0, Qfuite = 0, pA = 0, pB = 0;
    if (rot > 0) {
      const pertes = (q) => 2 + 5 * Math.pow(q / CARAC.QNOM, 2); // clapet + régulateur + tuyaux
      const pLimite = Math.min(c.tarage, pMaxPompe);
      if (bloque || pAval >= pLimite) {
        // L'huile ne peut pas passer (ou la charge est trop forte) : pression maximale
        P = pLimite;
        Qp = debitPompe(P);
        Qacc = 0;
      } else {
        // Le circuit accepte le débit : la pression est imposée par la charge
        const Qlibre = debitPompe(pAval + pertes(Math.min(Qth, capacite)));
        if (Qlibre <= capacite + 1e-6) {
          P = pAval + pertes(Qlibre);
          Qp = Qlibre;
          Qacc = Qlibre;
        } else {
          // Le régulateur limite : surplus par le limiteur, pression = tarage
          P = pLimite;
          Qp = debitPompe(P);
          Qacc = Math.min(capacite, Qp);
        }
      }
      // Débit qui part au réservoir par le limiteur (si la pompe atteint le tarage)
      Qrel = (P >= c.tarage - 0.01) ? Math.max(0, Qp - Qacc) : 0;

      // Pressions des chambres du vérin
      if (d === 1) { pA = enButee ? P : pAval; pB = 2; }
      else if (d === -1) { pB = enButee ? P : pAval; pA = 2; }
      else { pA = 0.5; pB = 0.5; }
      if (pn.clapet) { pA = d === 1 ? 0 : pA; pB = d === -1 ? 0 : pB; }

      // La fuite est prélevée sur le débit qui alimente la chambre A
      Qfuite = fuiteSur(pA);
      if (d === 1 && !enButee) Qfuite = Math.min(Qfuite, Qacc * 0.35);
      else if (d === 1 && enButee) Qfuite = Math.min(Qfuite, Qp * 0.3);
      else Qfuite = Math.min(Qfuite, 0.05 * CARAC.QNOM);
      if (pn.clapet) Qfuite = Math.min(Qfuite, 0.03 * CARAC.QNOM);
      if (d === 1 && enButee && Qfuite > 0) {
        // En butée, la fuite est alimentée par la pompe : moins de débit au limiteur
        Qacc = Qfuite;
        Qrel = Math.max(0, Qp - Qacc);
      }
    }

    // 5) Vitesse et déplacement du vérin : v = Q / S
    let Qverin = 0, vitesse = 0;
    if (rot > 0 && d !== 0 && !enButee && Qacc > 0) {
      const Qentree = d === 1 ? Math.max(0, Qacc - Qfuite) : Qacc;
      Qverin = Qentree;
      const S = d === 1 ? SA : SB;                 // cm²
      vitesse = d * (Qentree * 1000 / 60) / S * 10; // L/min → cm³/s → cm/s → mm/s
      this.positionVerin += (vitesse / CARAC.COURSE) * dt;
      this.positionVerin = Math.min(1, Math.max(0, this.positionVerin));
      // Arrivée en butée : on cale exactement la tige en fin de course
      if (this.positionVerin > 0.999) this.positionVerin = 1;
      if (this.positionVerin < 0.001) this.positionVerin = 0;
    }
    // Avec la fuite, la tige peut redescendre très lentement au neutre (huile perdue)
    if (pn.fuite && d === 0 && this.positionVerin > 0) {
      this.positionVerin = Math.max(0, this.positionVerin - 0.004 * dt);
    }

    // 6) Niveau d'huile : baisse avec la fuite, remonte quand la panne est réparée
    if (pn.fuite) {
      const perte = Math.max(Qfuite, rot > 0 ? 0.02 : 0) / 60 * dt;   // L perdus
      this.niveauHuile = Math.max(0.3, this.niveauHuile - perte / CARAC.VOLUME_RESERVOIR * 6);
    } else {
      this.niveauHuile = lisser(this.niveauHuile, 0.8, 1.5, dt);
    }

    // 7) Lissages pour une animation réaliste
    let Pcible = P;
    if (r.cavitation) Pcible *= 0.92 + 0.08 * Math.sin(this.temps * 37) * Math.sin(this.temps * 13);
    r.pressionCible = P;
    r.pression = lisser(r.pression, Pcible, enButee ? 0.35 : 0.2, dt);
    // Le limiteur ne s'ouvre que lorsque la pression a réellement atteint le tarage
    const ouvCible = (Qrel > 0.01 && r.pression >= 0.9 * c.tarage) ? Math.min(1, 0.35 + 0.65 * Qrel / CARAC.QNOM) : 0;
    r.ouvertureLimiteur = lisser(r.ouvertureLimiteur, ouvCible, 0.12, dt);

    r.Qpompe = Qp; r.Qlimiteur = Qrel; r.Qverin = Qverin; r.Qfuite = Qfuite;
    r.pressionA = pA; r.pressionB = pB;
    r.vitesseTige = vitesse;
    // Force développée par le vérin : F = p × S (bar × cm² × 10 = N)
    r.force = d === 1 ? pA * SA * 10 : d === -1 ? pB * SB * 10 : 0;

    // 8) État de chaque conduite pour l'animation des particules
    this._etatLignes(rot, Qp, Qacc, Qrel, Qverin, enButee);

    // 9) Message d'explication affiché en bas de l'écran
    this._messages(rot, enButee, Qrel, Qacc, pAval);
    return r;
  }

  /* Type de chaque conduite : 'asp' (bleu), 'hp' (rouge), 'ret' (vert), 'repos' (gris)
     Le débit est en L/min ; un débit négatif fait circuler les particules à l'envers. */
  _etatLignes(rot, Qp, Qacc, Qrel, Qverin, enButee) {
    const L = this.res.lignes;
    const on = rot > 0;
    const d = this.cmd.distributeur;
    const clapetBloque = this.pannes.clapet;
    const set = (id, type, debit) => { L[id] = { type: on ? type : 'repos', debit: on ? debit : 0 }; };

    set('aspiration', 'asp', Qp);
    set('refoulement', 'hp', Qp);
    set('manometre', 'hp', 0);
    set('limiteurEntree', 'hp', Qrel);
    set('limiteurRetour', Qrel > 0.01 ? 'ret' : 'repos', Qrel);
    set('pression1', 'hp', Qacc);
    set('pression2', clapetBloque ? 'repos' : 'hp', Qacc);
    set('pression3', clapetBloque ? 'repos' : 'hp', Qacc);

    // Débit qui sort du vérin (rapport des surfaces)
    const Qsortant = d === 1 ? Qverin * SB / SA : d === -1 ? Qverin * SA / SB : 0;
    if (d === 1) {
      set('ligneA', clapetBloque ? 'repos' : 'hp', Qverin + this.res.Qfuite);
      set('ligneB', 'ret', -Qsortant);
    } else if (d === -1) {
      set('ligneA', 'ret', -Qsortant);
      set('ligneB', clapetBloque ? 'repos' : 'hp', Qverin);
    } else {
      set('ligneA', 'repos', 0);
      set('ligneB', 'repos', 0);
    }
    // Retour par T : centre tandem (neutre) ou huile chassée par le vérin
    let Qt = 0;
    if (!clapetBloque) Qt = d === 0 ? Qacc : Qsortant;
    set('retour1', Qt > 0.01 ? 'ret' : 'repos', Qt);
    set('retour2', Qt > 0.01 ? 'ret' : 'repos', Qt);
  }

  _messages(rot, enButee, Qrel, Qacc, pAval) {
    const r = this.res, c = this.cmd, pn = this.pannes;
    let m = "", a = "";
    if (!c.pompe && rot === 0) {
      m = "Pompe arrêtée : aucun débit, pression nulle. Appuyez sur « Pompe » pour démarrer.";
    } else if (!c.pompe) {
      m = "Arrêt de la pompe en cours…";
    } else if (pn.clapet) {
      m = "Le clapet anti-retour est bloqué : l'huile ne passe plus, tout le débit part par le limiteur.";
      a = "Pression au tarage en permanence !";
    } else if (c.distributeur === 0) {
      m = "Neutre (centre tandem) : P→T, la pompe débite au réservoir presque sans pression. A et B sont bloqués : le vérin est immobilisé.";
    } else if (enButee) {
      m = "Fin de course : la tige est en butée, la pression monte au tarage, le limiteur s'ouvre et l'huile retourne au réservoir (elle chauffe).";
      a = "LIMITEUR OUVERT";
    } else if (pAval >= Math.min(c.tarage, pn.pompe ? CARAC.P_MAX_POMPE_USEE : Infinity)) {
      m = "La pression nécessaire (" + pAval.toFixed(0) + " bar) dépasse ce que le circuit peut fournir : le vérin ne bouge pas. Augmentez le tarage du limiteur.";
      a = "Force insuffisante";
    } else if (Qrel > 0.05) {
      m = (c.distributeur === 1 ? "Sortie de tige" : "Rentrée de tige") + " à vitesse réduite : le régulateur limite le débit, le surplus de la pompe passe par le limiteur.";
    } else {
      m = c.distributeur === 1
        ? "Sortie de tige : P→A, l'huile pousse le piston ; l'huile côté tige retourne au réservoir (B→T)."
        : "Rentrée de tige : P→B, la tige rentre plus vite (surface annulaire plus petite) ; A→T vers le réservoir.";
    }
    if (r.cavitation) a = "Cavitation : la pompe aspire mal (bruit, vibrations) !";
    if (pn.fuite && this.niveauHuile < 0.55) a = "Niveau d'huile bas : fuite !";
    r.message = m;
    r.alerte = a;
  }
}

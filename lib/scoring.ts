import {
  PASSI_AMPIEZZA,
  PASSI_AUTONOMIA,
  PASSI_COMPLESSITA,
  PASSI_CONOSCENZE,
  PASSI_DIMENSIONE,
  PASSI_IMPATTO,
  PASSI_LIBERTA,
  PASSI_RELAZIONI,
  PERCENTUALE_PROBLEM_SOLVING,
  PUNTI_COMPETENZA,
  PUNTI_RESPONSABILITA,
  SOGLIE_GRADE,
} from "./scoring.config";

export type LivelloAH = keyof typeof PASSI_CONOSCENZE;
export type LivelloAmpiezza = keyof typeof PASSI_AMPIEZZA;
export type LivelloRelazioni = keyof typeof PASSI_RELAZIONI;
export type LivelloComplessita = keyof typeof PASSI_COMPLESSITA;
export type TipoImpatto = keyof typeof PASSI_IMPATTO;

export interface LivelliRuolo {
  competenza: {
    conoscenze: LivelloAH;
    ampiezzaManageriale: LivelloAmpiezza;
    relazioni: LivelloRelazioni;
  };
  problemSolving: {
    libertaDiPensiero: LivelloAH;
    complessita: LivelloComplessita;
  };
  responsabilita: {
    autonomia: LivelloAH;
    dimensione: LivelloComplessita;
    impatto: TipoImpatto;
  };
}

export interface DettaglioPunti {
  punti: number;
  indice: number;
}

export interface RisultatoPesatura {
  competenza: DettaglioPunti;
  problemSolving: DettaglioPunti & { percentuale: number };
  responsabilita: DettaglioPunti;
  totale: number;
  grade: number;
}

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

type TabellaPassi = Record<string | number, number>;

function comeOggetto(value: unknown, etichetta: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${etichetta} mancante.`);
  }
  return value as Record<string, unknown>;
}

function leggiPasso(
  tabella: TabellaPassi,
  valore: unknown,
  etichetta: string,
): { passo: number; posizione: number } {
  if (typeof valore !== "string" && typeof valore !== "number") {
    throw new Error(`${etichetta} non valido.`);
  }

  const posizione = Object.keys(tabella).indexOf(String(valore));
  if (posizione === -1) {
    throw new Error(`${etichetta} non valido: ${String(valore)}.`);
  }

  const passo = tabella[valore];
  if (!Number.isInteger(passo) || passo < 0) {
    throw new Error(
      `Il passo di «${etichetta}» deve essere un intero maggiore o uguale a zero.`,
    );
  }

  return { passo, posizione };
}

function puntiDaScala(
  scala: readonly number[],
  indice: number,
  nome: string,
): number {
  if (!Number.isInteger(indice) || indice < 0 || indice >= scala.length) {
    throw new Error(
      `L'indice ${indice} esce dalla scala ${nome} (0–${scala.length - 1}). Allunga la tabella in lib/scoring.config.ts.`,
    );
  }

  const punti = scala[indice];
  if (!Number.isInteger(punti) || punti < 0) {
    throw new Error(`Valore non valido nella scala ${nome}, indice ${indice}.`);
  }

  return punti;
}

function percentualeProblemSolving(
  posizioneLiberta: number,
  posizioneComplessita: number,
): number {
  const righeAttese = Object.keys(PASSI_LIBERTA).length;
  const colonneAttese = Object.keys(PASSI_COMPLESSITA).length;

  if (PERCENTUALE_PROBLEM_SOLVING.length !== righeAttese) {
    throw new Error(
      "La tabella delle percentuali non ha una riga per ogni livello di libertà di pensiero.",
    );
  }

  const riga = PERCENTUALE_PROBLEM_SOLVING[posizioneLiberta];
  if (!riga || riga.length !== colonneAttese) {
    throw new Error(
      "La tabella delle percentuali non ha una colonna per ogni livello di complessità.",
    );
  }

  const percentuale = riga[posizioneComplessita];
  if (typeof percentuale !== "number" || !Number.isFinite(percentuale) || percentuale < 0) {
    throw new Error("Percentuale di problem solving non valida.");
  }

  return percentuale;
}

/** Il mezzo punto va all'intero superiore: 55,5 diventa 56. */
export function puntiDaPercentuale(puntiBase: number, percentuale: number): number {
  return Math.round((puntiBase * percentuale) / 100);
}

export function gradeDaTotale(totale: number): number {
  if (!Number.isFinite(totale) || totale < 0) {
    throw new Error("Il punteggio totale non è valido.");
  }

  let grade: number = 1;
  let precedente = -1;

  for (const fascia of GRADES) {
    const soglia = SOGLIE_GRADE[fascia];
    if (!Number.isInteger(soglia) || soglia < 0) {
      throw new Error(`Soglia del grade ${fascia} non valida.`);
    }
    if (soglia < precedente) {
      throw new Error(
        `Le soglie di grade non sono in ordine crescente (grade ${fascia}).`,
      );
    }
    precedente = soglia;
    if (totale >= soglia) grade = fascia;
  }

  return grade;
}

export function calcolaPesatura(input: LivelliRuolo): RisultatoPesatura {
  const dati = comeOggetto(input, "Classificazione");
  const competenza = comeOggetto(dati.competenza, "Competenza");
  const problemSolving = comeOggetto(dati.problemSolving, "Problem solving");
  const responsabilita = comeOggetto(dati.responsabilita, "Responsabilità");

  const conoscenze = leggiPasso(
    PASSI_CONOSCENZE,
    competenza.conoscenze,
    "Conoscenze specialistiche",
  );
  const ampiezza = leggiPasso(
    PASSI_AMPIEZZA,
    competenza.ampiezzaManageriale,
    "Ampiezza manageriale",
  );
  const relazioni = leggiPasso(
    PASSI_RELAZIONI,
    competenza.relazioni,
    "Relazioni interpersonali",
  );

  const liberta = leggiPasso(
    PASSI_LIBERTA,
    problemSolving.libertaDiPensiero,
    "Libertà di pensiero",
  );
  const complessita = leggiPasso(
    PASSI_COMPLESSITA,
    problemSolving.complessita,
    "Complessità dei problemi",
  );

  const autonomia = leggiPasso(
    PASSI_AUTONOMIA,
    responsabilita.autonomia,
    "Autonomia decisionale",
  );
  const dimensione = leggiPasso(
    PASSI_DIMENSIONE,
    responsabilita.dimensione,
    "Dimensione economica",
  );
  const impatto = leggiPasso(PASSI_IMPATTO, responsabilita.impatto, "Tipo di impatto");

  const indiceCompetenza = conoscenze.passo + ampiezza.passo + relazioni.passo;
  const puntiCompetenza = puntiDaScala(
    PUNTI_COMPETENZA,
    indiceCompetenza,
    "competenza",
  );

  const percentuale = percentualeProblemSolving(
    liberta.posizione,
    complessita.posizione,
  );
  const puntiProblemSolving = puntiDaPercentuale(puntiCompetenza, percentuale);

  const indiceResponsabilita = autonomia.passo + dimensione.passo + impatto.passo;
  const puntiResponsabilita = puntiDaScala(
    PUNTI_RESPONSABILITA,
    indiceResponsabilita,
    "responsabilità",
  );

  const totale = puntiCompetenza + puntiProblemSolving + puntiResponsabilita;

  return {
    competenza: { punti: puntiCompetenza, indice: indiceCompetenza },
    problemSolving: {
      punti: puntiProblemSolving,
      percentuale,
      indice: liberta.passo + complessita.passo,
    },
    responsabilita: { punti: puntiResponsabilita, indice: indiceResponsabilita },
    totale,
    grade: gradeDaTotale(totale),
  };
}

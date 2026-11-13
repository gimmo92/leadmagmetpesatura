import { z } from "zod";
import {
  ETICHETTE_AMPIEZZA,
  ETICHETTE_AUTONOMIA,
  ETICHETTE_COMPLESSITA,
  ETICHETTE_CONOSCENZE,
  ETICHETTE_DIMENSIONE,
  ETICHETTE_IMPEGNO,
  ETICHETTE_IMPATTO,
  ETICHETTE_LIBERTA,
  ETICHETTE_RELAZIONI,
  type LivelloImpegno,
} from "./etichette";
import { calcolaPesatura, type LivelliRuolo, type LivelloAH, type LivelloAmpiezza, type LivelloComplessita, type LivelloRelazioni, type TipoImpatto } from "./scoring";

const lettere = z.enum(["A", "B", "C", "D", "E", "F", "G", "H"]);
const ampiezza = z.enum(["I", "II", "III", "IV", "V"]);
const relazioni = z.enum(["1", "2", "3"]);
const scalaCinque = z.enum(["1", "2", "3", "4", "5"]);
const impatto = z.enum(["remoto", "contributivo", "condiviso", "primario"]);

const dimensione = <T extends z.ZodType>(livello: T) =>
  z.strictObject({
    livello,
    citazione: z.string().max(400),
    evidenza: z.boolean(),
  });

export const schemaClassificazione = z.strictObject({
  competenza: z.strictObject({
    conoscenze: dimensione(lettere),
    ampiezzaManageriale: dimensione(ampiezza),
    relazioni: dimensione(relazioni),
  }),
  problemSolving: z.strictObject({
    libertaDiPensiero: dimensione(lettere),
    complessita: dimensione(scalaCinque),
  }),
  responsabilita: z.strictObject({
    autonomia: dimensione(lettere),
    dimensione: dimensione(scalaCinque),
    impatto: dimensione(impatto),
  }),
  motivazioni: z.strictObject({
    competenza: z.string().min(1).max(800),
    problemSolving: z.string().min(1).max(800),
    responsabilita: z.string().min(1).max(800),
  }),
  impegno: z.strictObject({
    livello: z.enum(["1", "2", "3", "4", "5"]),
    citazione: z.string().max(400),
    evidenza: z.boolean(),
    motivazione: z.string().min(1).max(800),
  }),
  cosaManca: z.array(z.string().max(400)).max(16),
});

export type ClassificazioneGrezza = z.infer<typeof schemaClassificazione>;

export interface VoceLivello {
  nome: string;
  livello: string;
  etichetta: string;
  citazione: string;
  evidenza: boolean;
}

export interface FattoreReport {
  nome: string;
  punti: number;
  percentuale?: number;
  motivazione: string;
  voci: VoceLivello[];
}

export interface ImpegnoReport {
  livello: LivelloImpegno;
  etichetta: string;
  citazione: string;
  evidenza: boolean;
  motivazione: string;
}

export interface ReportRuolo {
  titolo: string;
  totale: number;
  grade: number;
  confidenza: "bassa" | "media" | "alta";
  cosaManca: string[];
  impegno: ImpegnoReport;
  fattori: {
    competenza: FattoreReport;
    problemSolving: FattoreReport;
    responsabilita: FattoreReport;
  };
  livelli: LivelliRuolo;
}

const CHIAVI_PUNTEGGIO = /^(punti|punteggio|grade|score|scores|points|percentuale|totale)$/i;

export function rimuoviPunteggi(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(rimuoviPunteggi);
  if (value !== null && typeof value === "object") {
    const risultato: Record<string, unknown> = {};
    for (const [chiave, valore] of Object.entries(value)) {
      if (CHIAVI_PUNTEGGIO.test(chiave)) continue;
      risultato[chiave] = rimuoviPunteggi(valore);
    }
    return risultato;
  }
  return value;
}

type DimensioneGrezza = { livello: string; citazione: string; evidenza: boolean };

function applicaLivello(
  dimensioneGrezza: DimensioneGrezza,
  minimo: string,
  nome: string,
  mancanze: string[],
  messaggio?: string,
): { livello: string; citazione: string; evidenza: boolean } {
  const citazione = dimensioneGrezza.citazione.trim();
  if (dimensioneGrezza.evidenza && citazione.length > 0) {
    return { livello: dimensioneGrezza.livello, citazione, evidenza: true };
  }

  const frase = messaggio ?? `Nella job description non c'è evidenza sufficiente sulle ${nome}: è stato usato il livello più prudente.`;
  if (!mancanze.some((voce) => voce.toLowerCase().includes(nome))) mancanze.push(frase);
  return { livello: minimo, citazione: "", evidenza: false };
}

function confidenzaDa(mancanti: number): ReportRuolo["confidenza"] {
  if (mancanti === 0) return "alta";
  if (mancanti <= 3) return "media";
  return "bassa";
}

function motivazione(testo: string, fattore: string): string {
  const pulita = testo.replace(/\s+/g, " ").trim();
  if (pulita) return pulita;
  return `La job description non consente una motivazione più precisa sulla ${fattore}.`;
}

export function componiReport(titolo: string, grezza: ClassificazioneGrezza): ReportRuolo {
  const mancanze = grezza.cosaManca.map((voce) => voce.trim()).filter(Boolean);
  const conoscenze = applicaLivello(grezza.competenza.conoscenze, "A", "conoscenze specialistiche", mancanze);
  const ampiezzaScelta = applicaLivello(grezza.competenza.ampiezzaManageriale, "I", "ampiezza manageriale", mancanze);
  const relazioniScelte = applicaLivello(grezza.competenza.relazioni, "1", "relazioni interpersonali", mancanze);
  const liberta = applicaLivello(grezza.problemSolving.libertaDiPensiero, "A", "libertà di pensiero", mancanze);
  const complessita = applicaLivello(grezza.problemSolving.complessita, "1", "complessità dei problemi", mancanze);
  const autonomia = applicaLivello(grezza.responsabilita.autonomia, "A", "autonomia decisionale", mancanze);
  const dimensioneEconomica = applicaLivello(grezza.responsabilita.dimensione, "1", "dimensione economica", mancanze);
  const tipoImpatto = applicaLivello(grezza.responsabilita.impatto, "remoto", "tipo di impatto", mancanze);
  const citazioneImpegno = grezza.impegno.citazione.trim();
  const impegnoScelto = applicaLivello(
    citazioneImpegno.length > 0 ? { ...grezza.impegno, citazione: citazioneImpegno, evidenza: true } : grezza.impegno,
    "1",
    "impegno",
    mancanze,
    "Nella job description non c'è evidenza sufficiente sull'impegno richiesto: è stato usato il livello più prudente.",
  );

  const livelli: LivelliRuolo = {
    competenza: {
      conoscenze: conoscenze.livello as LivelloAH,
      ampiezzaManageriale: ampiezzaScelta.livello as LivelloAmpiezza,
      relazioni: Number(relazioniScelte.livello) as LivelloRelazioni,
    },
    problemSolving: {
      libertaDiPensiero: liberta.livello as LivelloAH,
      complessita: Number(complessita.livello) as LivelloComplessita,
    },
    responsabilita: {
      autonomia: autonomia.livello as LivelloAH,
      dimensione: Number(dimensioneEconomica.livello) as LivelloComplessita,
      impatto: tipoImpatto.livello as TipoImpatto,
    },
  };

  const pesatura = calcolaPesatura(livelli);
  const mancanti = [
    conoscenze,
    ampiezzaScelta,
    relazioniScelte,
    liberta,
    complessita,
    autonomia,
    dimensioneEconomica,
    tipoImpatto,
    impegnoScelto,
  ].filter((voce) => !voce.evidenza).length;

  const voce = (
    nome: string,
    livello: string,
    etichetta: string,
    citazione: string,
    evidenza: boolean,
  ): VoceLivello => ({ nome, livello, etichetta, citazione, evidenza });

  return {
    titolo: titolo.trim(),
    totale: pesatura.totale,
    grade: pesatura.grade,
    confidenza: confidenzaDa(mancanti),
    cosaManca: citazioneImpegno.length > 0 ? mancanze.filter((voce) => !/impegno/i.test(voce)) : mancanze,
    impegno: {
      livello: impegnoScelto.livello as LivelloImpegno,
      etichetta: ETICHETTE_IMPEGNO[impegnoScelto.livello as LivelloImpegno],
      citazione: impegnoScelto.citazione,
      evidenza: impegnoScelto.evidenza,
      motivazione: motivazione(grezza.impegno.motivazione, "richiesta di impegno"),
    },
    livelli,
    fattori: {
      competenza: {
        nome: "Competenza",
        punti: pesatura.competenza.punti,
        motivazione: motivazione(grezza.motivazioni.competenza, "competenza"),
        voci: [
          voce("Conoscenze specialistiche", livelli.competenza.conoscenze, ETICHETTE_CONOSCENZE[livelli.competenza.conoscenze], conoscenze.citazione, conoscenze.evidenza),
          voce("Ampiezza manageriale", livelli.competenza.ampiezzaManageriale, ETICHETTE_AMPIEZZA[livelli.competenza.ampiezzaManageriale], ampiezzaScelta.citazione, ampiezzaScelta.evidenza),
          voce("Relazioni interpersonali", String(livelli.competenza.relazioni), ETICHETTE_RELAZIONI[livelli.competenza.relazioni], relazioniScelte.citazione, relazioniScelte.evidenza),
        ],
      },
      problemSolving: {
        nome: "Problem solving",
        punti: pesatura.problemSolving.punti,
        percentuale: pesatura.problemSolving.percentuale,
        motivazione: motivazione(grezza.motivazioni.problemSolving, "capacità di problem solving"),
        voci: [
          voce("Libertà di pensiero", livelli.problemSolving.libertaDiPensiero, ETICHETTE_LIBERTA[livelli.problemSolving.libertaDiPensiero], liberta.citazione, liberta.evidenza),
          voce("Complessità dei problemi", String(livelli.problemSolving.complessita), ETICHETTE_COMPLESSITA[livelli.problemSolving.complessita], complessita.citazione, complessita.evidenza),
        ],
      },
      responsabilita: {
        nome: "Responsabilità",
        punti: pesatura.responsabilita.punti,
        motivazione: motivazione(grezza.motivazioni.responsabilita, "responsabilità"),
        voci: [
          voce("Autonomia decisionale", livelli.responsabilita.autonomia, ETICHETTE_AUTONOMIA[livelli.responsabilita.autonomia], autonomia.citazione, autonomia.evidenza),
          voce("Dimensione economica", String(livelli.responsabilita.dimensione), ETICHETTE_DIMENSIONE[livelli.responsabilita.dimensione], dimensioneEconomica.citazione, dimensioneEconomica.evidenza),
          voce("Tipo di impatto", livelli.responsabilita.impatto, ETICHETTE_IMPATTO[livelli.responsabilita.impatto], tipoImpatto.citazione, tipoImpatto.evidenza),
        ],
      },
    },
  };
}

export function ordinaPerGrade<T extends { grade: number; totale: number; titolo: string }>(ruoli: T[]): T[] {
  return [...ruoli].sort(
    (a, b) => b.grade - a.grade || b.totale - a.totale || a.titolo.localeCompare(b.titolo, "it"),
  );
}

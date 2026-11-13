import { chiediJson } from "./anthropic";
import {
  componiReport,
  rimuoviPunteggi,
  schemaClassificazione,
  type ClassificazioneGrezza,
  type ReportRuolo,
} from "./classificazione";
import { ErroreRichiesta } from "./errori";
import { messaggioClassificazione, messaggioJd, SYSTEM_CLASSIFICAZIONE, SYSTEM_JD } from "./prompt";
import { schemaJdGenerata } from "./webhook";

export async function pesaRuolo(titolo: string, jd: string): Promise<ReportRuolo> {
  const grezza = await chiediJson({
    system: SYSTEM_CLASSIFICAZIONE,
    user: messaggioClassificazione(titolo, jd),
    schema: schemaClassificazione,
    maxTokens: 2500,
  });
  return componiReport(titolo, grezza);
}

export async function generaJd(input: {
  titolo: string;
  settore: string;
  dimensioneAzienda: string;
  riportaA: string;
  numeroRiporti: string;
  budgetOFatturato: string;
}): Promise<string> {
  const risultato = await chiediJson({
    system: SYSTEM_JD,
    user: messaggioJd(input),
    schema: schemaJdGenerata,
    maxTokens: 1800,
  });
  const jd = risultato.jd.trim();
  if (jd.length > 6000) {
    throw new ErroreRichiesta("La bozza generata è troppo lunga. Riprova.", 502);
  }
  return jd;
}

export function reportDaClassificazione(titolo: string, valore: unknown): ReportRuolo {
  const pulito = rimuoviPunteggi(valore);
  const parsed = schemaClassificazione.safeParse(pulito);
  if (!parsed.success) {
    throw new ErroreRichiesta("Uno dei ruoli non ha una classificazione valida.", 400);
  }
  return componiReport(titolo, parsed.data);
}

export type { ClassificazioneGrezza };

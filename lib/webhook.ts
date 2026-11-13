import { z } from "zod";
import { CHIAVI_UTM, MAX_JD, MAX_RUOLI, TOOL } from "./costanti";
import { schemaClassificazione } from "./classificazione";
import { MESSAGGIO_EMAIL_AZIENDALE, emailAziendaleConsentita } from "./domini";

export const schemaPesa = z.object({
  titolo: z
    .string("Scrivi il titolo del ruolo.")
    .trim()
    .min(2, "Scrivi il titolo del ruolo.")
    .max(120, "Il titolo è troppo lungo."),
  jd: z
    .string("Incolla la job description.")
    .trim()
    .min(40, "La job description è troppo corta per una pesatura.")
    .max(MAX_JD, "La job description supera i 6.000 caratteri."),
});

export const schemaDomande = z.object({
  titolo: z.string("Scrivi il titolo del ruolo.").trim().min(2, "Scrivi il titolo del ruolo.").max(120, "Il titolo è troppo lungo."),
  settore: z.string("Indica il settore.").trim().min(2, "Indica il settore.").max(200, "Il settore è troppo lungo."),
  dimensioneAzienda: z.string("Indica la dimensione dell'azienda.").trim().min(1, "Indica la dimensione dell'azienda.").max(200),
  riportaA: z.string("Indica a chi riporta il ruolo.").trim().min(2, "Indica a chi riporta il ruolo.").max(200),
  numeroRiporti: z.string("Indica il numero di riporti.").trim().min(1, "Indica il numero di riporti.").max(80),
  budgetOFatturato: z.string("Indica il budget o il fatturato gestito.").trim().min(1, "Indica il budget o il fatturato gestito.").max(200),
});

export const schemaJdGenerata = z.strictObject({
  jd: z.string().min(80).max(MAX_JD),
});

const schemaUtm = z.object({
  utm_source: z.string().max(120).optional(),
  utm_medium: z.string().max(120).optional(),
  utm_campaign: z.string().max(120).optional(),
  utm_term: z.string().max(120).optional(),
  utm_content: z.string().max(120).optional(),
});

export const schemaLead = z.object({
  email: z
    .email("Inserisci un'email valida.")
    .max(200)
    .refine(emailAziendaleConsentita, MESSAGGIO_EMAIL_AZIENDALE),
  consenso: z.literal(true, "Per continuare serve il consenso al trattamento dei dati."),
  honeypot: z.string().max(200).optional().default(""),
  utm: schemaUtm.optional(),
  ruoli: z
    .array(
      z.object({
        titolo: z.string().trim().min(2).max(120),
        classificazione: schemaClassificazione,
      }),
    )
    .min(1, "Manca almeno un ruolo pesato.")
    .max(MAX_RUOLI, "Puoi includere al massimo 10 ruoli."),
});

export type DatiLead = z.infer<typeof schemaLead>;

export interface PayloadWebhook {
  tool: typeof TOOL;
  timestamp: string;
  lead: {
    email: string;
  };
  ruoli: { titolo: string; punteggio: number; grade: number }[];
  utm: Partial<Record<(typeof CHIAVI_UTM)[number], string>>;
}

export function costruisciPayload(input: {
  lead: PayloadWebhook["lead"];
  ruoli: { titolo: string; punteggio: number; grade: number; jd?: string; citazione?: string }[];
  utm?: DatiLead["utm"];
  timestamp: string;
}): PayloadWebhook {
  const utm: PayloadWebhook["utm"] = {};
  for (const chiave of CHIAVI_UTM) {
    const valore = input.utm?.[chiave]?.trim();
    if (valore) utm[chiave] = valore.slice(0, 120);
  }

  return {
    tool: TOOL,
    timestamp: input.timestamp,
    lead: input.lead,
    ruoli: input.ruoli.map(({ titolo, punteggio, grade }) => ({ titolo, punteggio, grade })),
    utm,
  };
}

export async function inviaWebhook(payload: PayloadWebhook): Promise<void> {
  const url = process.env.LEAD_WEBHOOK_URL;
  if (!url) {
    console.error("LEAD_WEBHOOK_URL mancante: il lead non è stato inoltrato.");
    return;
  }

  let ultimo = "errore sconosciuto";
  for (let tentativo = 1; tentativo <= 2; tentativo += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(`risposta ${response.status}`);
      return;
    } catch (error) {
      ultimo = error instanceof Error ? error.message : "errore di rete";
      console.error(`Webhook lead fallito (tentativo ${tentativo}): ${ultimo}`);
    }
  }
}

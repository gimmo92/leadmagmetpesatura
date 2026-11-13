import { readFile } from "node:fs/promises";
import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import { inviaNotifica, inviaReport } from "@/lib/email";
import { leggiCorpo, gestisciErrore, ipDi, rispondi } from "@/lib/errori";
import { creaReportPdf } from "@/lib/pdf";
import { ordinaPerGrade } from "@/lib/classificazione";
import { reportDaClassificazione } from "@/lib/pesatura";
import { consumaInvio, restituisciQuota, sbloccaIp } from "@/lib/rate-limit";
import { costruisciPayload, inviaWebhook, schemaLead } from "@/lib/webhook";

export const maxDuration = 60;

export async function POST(request: Request) {
  const ip = ipDi(request);
  let quotaConsumata = false;
  let emailInviata = false;

  try {
    const corpo = await leggiCorpo(request);
    if (corpo && typeof corpo === "object" && "jd" in corpo) {
      delete (corpo as { jd?: unknown }).jd;
    }
    const dati = schemaLead.parse(corpo);
    if (dati.honeypot.trim()) return rispondi({ ok: true });

    const quota = await consumaInvio(ip);
    if (!quota.ok) return rispondi({ errore: quota.messaggio }, 429);
    quotaConsumata = true;

    const report = ordinaPerGrade(
      dati.ruoli.map((ruolo) => reportDaClassificazione(ruolo.titolo, ruolo.classificazione)),
    );
    const lead = { email: dati.email };
    const logo = await leggiLogo();
    const data = new Intl.DateTimeFormat("it-IT", {
      dateStyle: "long",
      timeZone: "Europe/Rome",
    }).format(new Date());
    const pdf = await renderToBuffer(
      creaReportPdf({ logo, azienda: dati.email, data, ruoli: report }),
    );
    await inviaReport({ lead, pdf });
    emailInviata = true;

    const timestamp = new Date().toISOString();
    const payload = costruisciPayload({
      lead,
      ruoli: report.map((ruolo) => ({
        titolo: ruolo.titolo,
        punteggio: ruolo.totale,
        grade: ruolo.grade,
      })),
      utm: dati.utm,
      timestamp,
    });

    await Promise.all([
      inviaNotifica({ lead, ruoli: payload.ruoli, utm: payload.utm, timestamp }),
      inviaWebhook(payload),
      sbloccaIp(ip),
    ]);

    return rispondi({
      ok: true,
      ruoli: report.map((ruolo) => ({
        titolo: ruolo.titolo,
        punteggio: ruolo.totale,
        grade: ruolo.grade,
      })),
    });
  } catch (error) {
    if (quotaConsumata && !emailInviata) await restituisciQuota(ip, "lead");
    return gestisciErrore(error);
  }
}

async function leggiLogo(): Promise<{ data: Buffer; format: "png" } | null> {
  try {
    const data = await readFile(path.join(process.cwd(), "public", "logo-spark.png"));
    return { data, format: "png" };
  } catch (error) {
    console.error(
      `Logo non letto: ${error instanceof Error ? error.message : "file assente"}`,
    );
    return null;
  }
}

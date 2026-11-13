import { leggiCorpo, gestisciErrore, ipDi, rispondi } from "@/lib/errori";
import { pesaRuolo } from "@/lib/pesatura";
import { consumaPesatura, restituisciQuota } from "@/lib/rate-limit";
import { schemaPesa } from "@/lib/webhook";

export const maxDuration = 60;

export async function POST(request: Request) {
  const ip = ipDi(request);
  let quotaConsumata = false;

  try {
    const corpo = await leggiCorpo(request, 20_000);
    const dati = schemaPesa.parse(corpo);
    const quota = await consumaPesatura(ip);
    if (!quota.ok) return rispondi({ errore: quota.messaggio }, 429);
    quotaConsumata = true;
    const report = await pesaRuolo(dati.titolo, dati.jd);
    return rispondi(report);
  } catch (error) {
    if (quotaConsumata) await restituisciQuota(ip, "conta");
    return gestisciErrore(error);
  }
}

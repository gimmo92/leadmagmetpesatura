import { leggiCorpo, gestisciErrore, ipDi, rispondi } from "@/lib/errori";
import { generaJd } from "@/lib/pesatura";
import { consumaBozza, restituisciQuota } from "@/lib/rate-limit";
import { schemaDomande } from "@/lib/webhook";

export const maxDuration = 60;

export async function POST(request: Request) {
  const ip = ipDi(request);
  let quotaConsumata = false;

  try {
    const corpo = await leggiCorpo(request, 8_000);
    const dati = schemaDomande.parse(corpo);
    const quota = await consumaBozza(ip);
    if (!quota.ok) return rispondi({ errore: quota.messaggio }, 429);
    quotaConsumata = true;
    const jd = await generaJd(dati);
    return rispondi({ jd });
  } catch (error) {
    if (quotaConsumata) await restituisciQuota(ip, "bozze");
    return gestisciErrore(error);
  }
}

import { gestisciErrore, ipDi, rispondi } from "@/lib/errori";
import { ipSbloccato, limitePesature, redisSeConfigurato } from "@/lib/rate-limit";

export async function GET(request: Request) {
  try {
    if (!redisSeConfigurato()) return rispondi({ sbloccato: false, limite: null });
    const sbloccato = await ipSbloccato(ipDi(request));
    return rispondi({ sbloccato, limite: limitePesature(sbloccato) });
  } catch (error) {
    return gestisciErrore(error);
  }
}

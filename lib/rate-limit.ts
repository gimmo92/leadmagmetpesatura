import { Redis } from "@upstash/redis";

const SECONDI_SBLOCCO = 60 * 60 * 24 * 30;

let client: Redis | undefined;

export function redisSeConfigurato(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  if (!client) client = new Redis({ url, token });
  return client;
}

export function limitePesature(sbloccato: boolean): number {
  return sbloccato ? 15 : 3;
}

export function secondiAllaMezzanotte(adesso = new Date()): number {
  const parti = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Rome",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(adesso);
  const leggi = (tipo: Intl.DateTimeFormatPartTypes) =>
    Number(parti.find((parte) => parte.type === tipo)?.value ?? "0");
  const trascorsi = leggi("hour") * 3600 + leggi("minute") * 60 + leggi("second");
  const restanti = 24 * 3600 - trascorsi;
  if (!Number.isFinite(restanti) || restanti <= 0) return 24 * 3600;
  return Math.min(24 * 3600, restanti);
}

async function consuma(chiave: string, limite: number, messaggio: string): Promise<{ ok: true } | { ok: false; messaggio: string }> {
  const redis = redisSeConfigurato();
  if (!redis) return { ok: true };

  try {
    const conteggio = await redis.incr(chiave);
    if (conteggio === 1) await redis.expire(chiave, secondiAllaMezzanotte());
    if (conteggio > limite) {
      await redis.decr(chiave);
      return { ok: false, messaggio };
    }
    return { ok: true };
  } catch (error) {
    console.error(
      `Rate limit non disponibile: ${error instanceof Error ? error.message : "errore redis"}`,
    );
    return { ok: true };
  }
}

function giornoRoma(adesso = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(adesso);
}

export async function ipSbloccato(ip: string): Promise<boolean> {
  const redis = redisSeConfigurato();
  if (!redis) return false;
  try {
    const valore = await redis.get(`pesatura:sblocco:${ip}`);
    return valore === "1" || valore === 1;
  } catch (error) {
    console.error(
      `Lettura sblocco non disponibile: ${error instanceof Error ? error.message : "errore redis"}`,
    );
    return false;
  }
}

export async function consumaPesatura(ip: string): Promise<{ ok: true } | { ok: false; messaggio: string }> {
  const sbloccato = await ipSbloccato(ip);
  const limite = limitePesature(sbloccato);
  return consuma(
    `pesatura:conta:${ip}:${giornoRoma()}`,
    limite,
    sbloccato
      ? "Hai raggiunto le 15 pesature di oggi. Riprova domani."
      : "Puoi pesare 3 ruoli al giorno senza lasciare l'email. Per continuare, compila il modulo.",
  );
}

export async function restituisciQuota(ip: string, tipo: "conta" | "bozze" | "lead"): Promise<void> {
  const redis = redisSeConfigurato();
  if (!redis) return;
  try {
    await redis.decr(`pesatura:${tipo}:${ip}:${giornoRoma()}`);
  } catch (error) {
    console.error(
      `Restituzione quota non riuscita: ${error instanceof Error ? error.message : "errore redis"}`,
    );
  }
}

export async function consumaBozza(ip: string): Promise<{ ok: true } | { ok: false; messaggio: string }> {
  return consuma(
    `pesatura:bozze:${ip}:${giornoRoma()}`,
    10,
    "Hai chiesto troppe bozze oggi. Riprova domani, oppure incolla una job description.",
  );
}

export async function consumaInvio(ip: string): Promise<{ ok: true } | { ok: false; messaggio: string }> {
  return consuma(
    `pesatura:lead:${ip}:${giornoRoma()}`,
    8,
    "Hai richiesto troppi report oggi. Riprova domani.",
  );
}

export async function sbloccaIp(ip: string): Promise<void> {
  const redis = redisSeConfigurato();
  if (!redis) return;
  try {
    await redis.set(`pesatura:sblocco:${ip}`, "1", { ex: SECONDI_SBLOCCO });
  } catch (error) {
    console.error(
      `Sblocco non salvato: ${error instanceof Error ? error.message : "errore redis"}`,
    );
  }
}

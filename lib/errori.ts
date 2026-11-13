import { ZodError } from "zod";

export class ErroreRichiesta extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ErroreRichiesta";
    this.status = status;
  }
}

export function rispondi(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

export function gestisciErrore(error: unknown): Response {
  if (error instanceof ErroreRichiesta) {
    return rispondi({ errore: error.message }, error.status);
  }
  if (error instanceof ZodError) {
    return rispondi(
      { errore: error.issues[0]?.message || "Controlla i campi e riprova." },
      400,
    );
  }
  console.error(error instanceof Error ? error.message : "Errore imprevisto");
  return rispondi({ errore: "Qualcosa non ha funzionato. Riprova tra poco." }, 500);
}

export async function leggiCorpo(request: Request, massimo = 80_000): Promise<unknown> {
  const testo = await request.text();
  if (testo.length > massimo) {
    throw new ErroreRichiesta("Il contenuto inviato è troppo lungo.", 413);
  }
  if (!testo.trim()) {
    throw new ErroreRichiesta("La richiesta è vuota.", 400);
  }
  try {
    return JSON.parse(testo) as unknown;
  } catch {
    throw new ErroreRichiesta("La richiesta non è un JSON valido.", 400);
  }
}

export function ipDi(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = (forwarded?.split(",")[0] ?? request.headers.get("x-real-ip") ?? "locale").trim();
  return ip.slice(0, 80) || "locale";
}

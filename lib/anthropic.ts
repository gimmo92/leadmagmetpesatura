import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { ErroreRichiesta } from "./errori";

function clientAnthropic(): { client: Anthropic; model: string } {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL;
  if (!apiKey || !model) {
    throw new ErroreRichiesta("Il servizio di classificazione non è configurato.", 500);
  }
  return { client: new Anthropic({ apiKey }), model };
}

export async function chiediJson<T>(opzioni: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  maxTokens: number;
}): Promise<T> {
  const { client, model } = clientAnthropic();
  let ultimoMessaggio = "risposta non valida";

  for (let tentativo = 0; tentativo < 2; tentativo += 1) {
    const user =
      tentativo === 0
        ? opzioni.user
        : `${opzioni.user}\n\nLa risposta precedente non rispettava lo schema. Restituisci solo il JSON richiesto, senza punteggi.`;

    try {
      const message = await creaMessaggio(client, {
        model,
        max_tokens: opzioni.maxTokens,
        system: opzioni.system,
        messages: [{ role: "user", content: user }],
        output_config: { format: zodOutputFormat(opzioni.schema) },
      });
      if (message.parsed_output !== null && message.parsed_output !== undefined) {
        return message.parsed_output as T;
      }
      ultimoMessaggio = "output vuoto";
    } catch (error) {
      if (error instanceof ErroreRichiesta) throw error;
      ultimoMessaggio = error instanceof Error ? error.message : "errore del modello";
      console.error(`Classificazione non valida (tentativo ${tentativo + 1}): ${ultimoMessaggio}`);
    }
  }

  console.error(`Classificazione abbandonata: ${ultimoMessaggio}`);
  throw new ErroreRichiesta(
    "Non sono riuscito a completare la classificazione. Riprova tra poco.",
    502,
  );
}

async function creaMessaggio(
  client: Anthropic,
  body: Anthropic.MessageCreateParamsNonStreaming,
): Promise<Anthropic.Message & { parsed_output?: unknown }> {
  const conTemperatura = {
    ...body,
    temperature: 0,
    thinking: { type: "disabled" as const },
  };

  try {
    return await client.messages.parse(conTemperatura);
  } catch (error) {
    const messaggio = error instanceof Error ? error.message : "";
    if (!/temperature|thinking/i.test(messaggio)) throw error;
    console.error("Il modello non accetta temperature 0 o thinking disattivato. Riprovo senza.");
    return client.messages.parse(body);
  }
}

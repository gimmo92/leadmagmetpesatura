import { CALENDLY_URL, CTA, DISCLAIMER } from "./costanti";
import { ErroreRichiesta } from "./errori";
import type { PayloadWebhook } from "./webhook";

function mittente(): { email: string; name: string } {
  const email = process.env.FROM_EMAIL;
  if (!email || !process.env.SENDGRID_API_KEY) {
    throw new ErroreRichiesta("L'invio email non è configurato.", 500);
  }
  return { email, name: "Spark" };
}

async function invia(body: unknown): Promise<void> {
  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    console.error(`SendGrid ha risposto ${response.status}`);
    throw new ErroreRichiesta("Non sono riuscito a inviare l'email. Riprova tra poco.", 502);
  }
}

export async function inviaReport(input: {
  lead: PayloadWebhook["lead"];
  pdf: Buffer;
}): Promise<void> {
  const from = mittente();
  const replyTo = process.env.NOTIFY_EMAIL;
  const testo = [
    "Ciao,",
    "",
    "in allegato c'è la pesatura dei ruoli che hai inserito.",
    `${CTA}: ${CALENDLY_URL}`,
    "",
    DISCLAIMER,
  ].join("\n");

  const messaggio: Record<string, unknown> = {
    personalizations: [{ to: [{ email: input.lead.email }] }],
    from,
    subject: "Il report di pesatura dei ruoli",
    content: [
      { type: "text/plain", value: testo },
      {
        type: "text/html",
        value: `<p>Ciao,</p><p>in allegato c'è la pesatura dei ruoli che hai inserito.</p><p><a href="${CALENDLY_URL}">${escapeHtml(CTA)}</a></p><p style="color:#5e6673;font-size:13px">${escapeHtml(DISCLAIMER)}</p>`,
      },
    ],
    attachments: [
      {
        content: input.pdf.toString("base64"),
        filename: "pesatura-ruoli-spark.pdf",
        type: "application/pdf",
        disposition: "attachment",
      },
    ],
  };
  if (replyTo) messaggio.reply_to = { email: replyTo };
  await invia(messaggio);
}

export async function inviaNotifica(input: {
  lead: PayloadWebhook["lead"];
  ruoli: PayloadWebhook["ruoli"];
  utm: PayloadWebhook["utm"];
  timestamp: string;
}): Promise<void> {
  const destinatario = process.env.NOTIFY_EMAIL;
  if (!destinatario) {
    console.error("NOTIFY_EMAIL mancante: notifica non inviata.");
    return;
  }

  const righe = input.ruoli
    .map((ruolo) => `- ${ruolo.titolo}: grade ${ruolo.grade}, ${ruolo.punteggio} punti`)
    .join("\n");
  const utm = Object.entries(input.utm)
    .map(([chiave, valore]) => `${chiave}: ${valore}`)
    .join("\n");
  const testo = [
    `Nuovo lead da pesatura Hay`,
    `Quando: ${input.timestamp}`,
    `Email: ${input.lead.email}`,
    "",
    "Ruoli pesati:",
    righe,
    "",
    utm ? `UTM:\n${utm}` : "UTM: nessuno",
  ].join("\n");

  try {
    await invia({
      personalizations: [{ to: [{ email: destinatario }] }],
      from: mittente(),
      subject: `Nuovo lead pesatura — ${input.lead.email}`.slice(0, 140),
      content: [{ type: "text/plain", value: testo }],
    });
  } catch (error) {
    console.error(
      `Notifica non inviata: ${error instanceof Error ? error.message : "errore email"}`,
    );
  }
}

function escapeHtml(valore: string): string {
  return valore
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

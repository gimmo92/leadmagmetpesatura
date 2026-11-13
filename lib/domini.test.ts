import { describe, expect, it } from "vitest";
import { MESSAGGIO_EMAIL_AZIENDALE, emailAziendaleConsentita } from "./domini";
import { schemaLead } from "./webhook";

describe("email aziendale", () => {
  it("rifiuta i domini gratuiti, anche con maiuscole o sottodominio", () => {
    for (const email of [
      "mario@gmail.com",
      "Mario@Gmail.com",
      "a@googlemail.com",
      "a@libero.it",
      "a@mail.libero.it",
      "a@hotmail.it",
      "a@outlook.com",
      "a@yahoo.it",
      "a@icloud.com",
      "a@virgilio.it",
      "a@tiscali.it",
    ]) {
      expect(emailAziendaleConsentita(email)).toBe(false);
    }
  });

  it("accetta un dominio aziendale", () => {
    expect(emailAziendaleConsentita("hr@azienda.it")).toBe(true);
    expect(emailAziendaleConsentita("hr@posta.azienda.it")).toBe(true);
  });

  it("spiega il rifiuto nel modulo", () => {
    const risultato = schemaLead.safeParse({
      email: "ada@gmail.com",
      consenso: true,
      ruoli: [ruoloMinimo()],
    });
    expect(risultato.success).toBe(false);
    if (!risultato.success) {
      expect(risultato.error.issues.some((issue) => issue.message === MESSAGGIO_EMAIL_AZIENDALE)).toBe(true);
    }
  });
});

function ruoloMinimo() {
  const voce = (livello: string) => ({ livello, citazione: "frase della scheda", evidenza: true });
  return {
    titolo: "Impiegato",
    classificazione: {
      competenza: {
        conoscenze: voce("A"),
        ampiezzaManageriale: voce("I"),
        relazioni: voce("1"),
      },
      problemSolving: {
        libertaDiPensiero: voce("A"),
        complessita: voce("1"),
      },
      responsabilita: {
        autonomia: voce("A"),
        dimensione: voce("1"),
        impatto: voce("remoto"),
      },
      motivazioni: {
        competenza: "Opera su procedure note.",
        problemSolving: "I problemi sono ripetitivi.",
        responsabilita: "Decide dentro istruzioni puntuali.",
      },
      impegno: {
        livello: "2",
        citazione: "orario di ufficio",
        evidenza: true,
        motivazione: "L'impegno è ordinario e prevedibile.",
      },
      cosaManca: [],
    },
  };
}

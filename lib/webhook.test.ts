import { describe, expect, it } from "vitest";
import { costruisciPayload } from "./webhook";

describe("webhook", () => {
  it("invia punteggi e grade, mai il testo della job description", () => {
    const payload = costruisciPayload({
      timestamp: "2026-11-13T15:00:00.000Z",
      lead: { email: "ada@azienda.it" },
      utm: { utm_source: "linkedin", utm_medium: "" },
      ruoli: [
        {
          titolo: "Controller",
          punteggio: 308,
          grade: 3,
          jd: "testo segreto della job description",
          citazione: "frase segreta copiata dalla jd",
        },
      ],
    });

    expect(payload.tool).toBe("pesatura-hay");
    expect(payload.ruoli).toEqual([{ titolo: "Controller", punteggio: 308, grade: 3 }]);
    expect(payload.utm).toEqual({ utm_source: "linkedin" });
    const serializzato = JSON.stringify(payload);
    expect(serializzato).not.toContain("segreto");
    expect(serializzato).not.toContain("job description");
  });
});

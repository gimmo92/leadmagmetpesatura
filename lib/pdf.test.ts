import { readFile } from "node:fs/promises";
import { renderToBuffer } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";
import { componiReport, schemaClassificazione } from "./classificazione";
import { creaReportPdf } from "./pdf";

describe("pdf", () => {
  it("produce un file PDF con il report", async () => {
    const report = componiReport(
      "Specialista",
      schemaClassificazione.parse({
        competenza: {
          conoscenze: { livello: "D", citazione: "specialista di controllo", evidenza: true },
          ampiezzaManageriale: { livello: "I", citazione: "singolo perimetro", evidenza: true },
          relazioni: { livello: "2", citazione: "confronta i responsabili", evidenza: true },
        },
        problemSolving: {
          libertaDiPensiero: { livello: "C", citazione: "adatta il metodo", evidenza: true },
          complessita: { livello: "2", citazione: "varianti dei chiusure", evidenza: true },
        },
        responsabilita: {
          autonomia: { livello: "C", citazione: "sceglie le analisi", evidenza: true },
          dimensione: { livello: "2", citazione: "budget del team", evidenza: true },
          impatto: { livello: "contributivo", citazione: "prepara la decisione", evidenza: true },
        },
        motivazioni: {
          competenza: "Ha una specializzazione e la usa nel perimetro del team.",
          problemSolving: "Adatta metodi noti.",
          responsabilita: "Prepara decisioni su un budget di team.",
        },
        impegno: {
          livello: "3",
          citazione: "attenzione continua sulle chiusure",
          evidenza: true,
          motivazione: "Lo sforzo è mentale e continuativo, senza carico fisico descritto.",
        },
        cosaManca: [],
      }),
    );
    const logo = await readFile("public/logo-spark.png");
    const buffer = await renderToBuffer(
      creaReportPdf({
        logo: { data: logo, format: "png" },
        azienda: "Rossi Srl",
        data: "13 novembre 2026",
        ruoli: [report],
      }),
    );

    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(1000);
  });
});

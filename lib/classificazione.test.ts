import { describe, expect, it } from "vitest";
import {
  componiReport,
  ordinaPerGrade,
  rimuoviPunteggi,
  schemaClassificazione,
  type ClassificazioneGrezza,
} from "./classificazione";

function voce(livello: string, evidenza = true) {
  return {
    livello,
    citazione: evidenza ? "frase presente nella job description" : "",
    evidenza,
  };
}

function classificazione(evidenza = true, sovrascritture: Record<string, string> = {}): ClassificazioneGrezza {
  const livello = (campo: string, base: string) => voce(sovrascritture[campo] ?? base, evidenza);
  return schemaClassificazione.parse({
    competenza: {
      conoscenze: livello("conoscenze", "D"),
      ampiezzaManageriale: livello("ampiezza", "I"),
      relazioni: livello("relazioni", "2"),
    },
    problemSolving: {
      libertaDiPensiero: livello("liberta", "C"),
      complessita: livello("complessita", "2"),
    },
    responsabilita: {
      autonomia: livello("autonomia", "C"),
      dimensione: livello("dimensione", "2"),
      impatto: livello("impatto", "contributivo"),
    },
    motivazioni: {
      competenza: "Conosce una specializzazione e la usa nei casi non di routine.",
      problemSolving: "Adatta metodi noti a varianti di problemi già visti.",
      responsabilita: "Contribuisce a un budget di team, senza la decisione finale.",
    },
    cosaManca: [],
  });
}

describe("componiReport", () => {
  it("calcola il grade dai livelli e ignora eventuali punteggi del modello", () => {
    const sporca = {
      ...classificazione(),
      competenza: { ...classificazione().competenza, punti: 9999, grade: 12 },
    };
    const pulita = rimuoviPunteggi(sporca);
    const report = componiReport("Specialista", schemaClassificazione.parse(pulita));

    expect(JSON.stringify(pulita)).not.toContain("9999");
    expect(report.totale).toBe(308);
    expect(report.grade).toBe(3);
    expect(report.confidenza).toBe("alta");
    expect(report.cosaManca).toEqual([]);
  });

  it("abbassa al livello prudente le dimensioni senza evidenza", () => {
    const report = componiReport(
      "Ruolo vago",
      classificazione(false, {
        conoscenze: "H",
        ampiezza: "V",
        relazioni: "3",
        liberta: "H",
        complessita: "5",
        autonomia: "H",
        dimensione: "5",
        impatto: "primario",
      }),
    );

    expect(report.livelli.competenza.conoscenze).toBe("A");
    expect(report.livelli.responsabilita.impatto).toBe("remoto");
    expect(report.totale).toBe(170);
    expect(report.grade).toBe(1);
    expect(report.confidenza).toBe("bassa");
    expect(report.cosaManca).toHaveLength(8);
  });

  it("pesa la stessa classificazione tre volte con lo stesso grade", () => {
    const grezza = classificazione();
    const pesature = [1, 2, 3].map(() => componiReport("Controller", grezza));

    expect(pesature.map((pesatura) => pesatura.grade)).toEqual([3, 3, 3]);
    expect(pesature[0].totale).toBe(pesature[1].totale);
    expect(pesature[1].totale).toBe(pesature[2].totale);
  });

  it("ordina i ruoli dal grade più alto", () => {
    const basso = componiReport("Junior", classificazione(false));
    const alto = componiReport("Specialista", classificazione());
    expect(ordinaPerGrade([basso, alto]).map((ruolo) => ruolo.titolo)).toEqual([
      "Specialista",
      "Junior",
    ]);
  });
});

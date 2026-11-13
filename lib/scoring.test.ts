import { describe, expect, it } from "vitest";
import {
  PASSI_AMPIEZZA,
  PASSI_AUTONOMIA,
  PASSI_COMPLESSITA,
  PASSI_CONOSCENZE,
  PASSI_DIMENSIONE,
  PASSI_IMPATTO,
  PASSI_LIBERTA,
  PASSI_RELAZIONI,
  PERCENTUALE_PROBLEM_SOLVING,
  PUNTI_COMPETENZA,
  PUNTI_RESPONSABILITA,
  SOGLIE_GRADE,
} from "./scoring.config";
import {
  calcolaPesatura,
  gradeDaTotale,
  puntiDaPercentuale,
  type LivelliRuolo,
} from "./scoring";

function geo(base: number, indice: number): number {
  let valore = BigInt(base);
  const fattore = BigInt(115);
  for (let passo = 0; passo < indice; passo += 1) valore *= fattore;
  const divisore = BigInt(100) ** BigInt(indice);
  const quoziente = valore / divisore;
  const resto = valore % divisore;
  const arrotondato = resto * BigInt(2) >= divisore ? quoziente + BigInt(1) : quoziente;
  return Number(arrotondato);
}

function profilo(parziale: {
  conoscenze?: LivelliRuolo["competenza"]["conoscenze"];
  ampiezza?: LivelliRuolo["competenza"]["ampiezzaManageriale"];
  relazioni?: LivelliRuolo["competenza"]["relazioni"];
  liberta?: LivelliRuolo["problemSolving"]["libertaDiPensiero"];
  complessita?: LivelliRuolo["problemSolving"]["complessita"];
  autonomia?: LivelliRuolo["responsabilita"]["autonomia"];
  dimensione?: LivelliRuolo["responsabilita"]["dimensione"];
  impatto?: LivelliRuolo["responsabilita"]["impatto"];
} = {}): LivelliRuolo {
  return {
    competenza: {
      conoscenze: parziale.conoscenze ?? "A",
      ampiezzaManageriale: parziale.ampiezza ?? "I",
      relazioni: parziale.relazioni ?? 1,
    },
    problemSolving: {
      libertaDiPensiero: parziale.liberta ?? "A",
      complessita: parziale.complessita ?? 1,
    },
    responsabilita: {
      autonomia: parziale.autonomia ?? "A",
      dimensione: parziale.dimensione ?? 1,
      impatto: parziale.impatto ?? "remoto",
    },
  };
}

const profiloMinimo = profilo();
const profiloSpecialista = profilo({
  conoscenze: "D",
  relazioni: 2,
  liberta: "C",
  complessita: 2,
  autonomia: "C",
  dimensione: 2,
  impatto: "contributivo",
});
const profiloResponsabile = profilo({
  conoscenze: "E",
  ampiezza: "III",
  relazioni: 2,
  liberta: "D",
  complessita: 3,
  autonomia: "D",
  dimensione: 3,
  impatto: "condiviso",
});
const profiloDirettore = profilo({
  conoscenze: "G",
  ampiezza: "IV",
  relazioni: 3,
  liberta: "F",
  complessita: 4,
  autonomia: "F",
  dimensione: 4,
  impatto: "primario",
});
const profiloVertice = profilo({
  conoscenze: "H",
  ampiezza: "V",
  relazioni: 3,
  liberta: "H",
  complessita: 5,
  autonomia: "H",
  dimensione: 5,
  impatto: "primario",
});

const esempi = [
  profiloMinimo,
  profiloSpecialista,
  profiloResponsabile,
  profiloDirettore,
  profiloVertice,
];

describe("calcolaPesatura", () => {
  it("somma i passi e legge i punti dalle tabelle", () => {
    for (const livelli of esempi) {
      const risultato = calcolaPesatura(livelli);
      const indiceCompetenza =
        PASSI_CONOSCENZE[livelli.competenza.conoscenze] +
        PASSI_AMPIEZZA[livelli.competenza.ampiezzaManageriale] +
        PASSI_RELAZIONI[livelli.competenza.relazioni];
      const indiceResponsabilita =
        PASSI_AUTONOMIA[livelli.responsabilita.autonomia] +
        PASSI_DIMENSIONE[livelli.responsabilita.dimensione] +
        PASSI_IMPATTO[livelli.responsabilita.impatto];
      const indiceProblemSolving =
        PASSI_LIBERTA[livelli.problemSolving.libertaDiPensiero] +
        PASSI_COMPLESSITA[livelli.problemSolving.complessita];

      expect(risultato.competenza.indice).toBe(indiceCompetenza);
      expect(risultato.competenza.punti).toBe(PUNTI_COMPETENZA[indiceCompetenza]);
      expect(risultato.responsabilita.indice).toBe(indiceResponsabilita);
      expect(risultato.responsabilita.punti).toBe(
        PUNTI_RESPONSABILITA[indiceResponsabilita],
      );
      expect(risultato.problemSolving.indice).toBe(indiceProblemSolving);
    }
  });

  it("esprime il problem solving come percentuale arrotondata della competenza", () => {
    for (const livelli of esempi) {
      const risultato = calcolaPesatura(livelli);
      const riga = Object.keys(PASSI_LIBERTA).indexOf(
        livelli.problemSolving.libertaDiPensiero,
      );
      const colonna = Object.keys(PASSI_COMPLESSITA).indexOf(
        String(livelli.problemSolving.complessita),
      );

      expect(risultato.problemSolving.percentuale).toBe(
        PERCENTUALE_PROBLEM_SOLVING[riga][colonna],
      );
      expect(risultato.problemSolving.punti).toBe(
        puntiDaPercentuale(
          risultato.competenza.punti,
          risultato.problemSolving.percentuale,
        ),
      );
      expect(risultato.totale).toBe(
        risultato.competenza.punti +
          risultato.problemSolving.punti +
          risultato.responsabilita.punti,
      );
    }
  });

  it("arrotonda il mezzo punto all'intero superiore", () => {
    const risultato = calcolaPesatura(
      profilo({
        conoscenze: "F",
        relazioni: 2,
        liberta: "D",
        complessita: 4,
      }),
    );

    expect(risultato.competenza.punti).toBe(185);
    expect(risultato.problemSolving.percentuale).toBe(30);
    expect(risultato.problemSolving.punti).toBe(56);
  });

  it("non diminuisce il totale quando sale un solo livello", () => {
    const dimensioni = [
      {
        livelli: Object.keys(PASSI_CONOSCENZE),
        applica: (livello: string) =>
          profilo({ conoscenze: livello as LivelliRuolo["competenza"]["conoscenze"] }),
      },
      {
        livelli: Object.keys(PASSI_AMPIEZZA),
        applica: (livello: string) =>
          profilo({
            ampiezza: livello as LivelliRuolo["competenza"]["ampiezzaManageriale"],
          }),
      },
      {
        livelli: Object.keys(PASSI_RELAZIONI),
        applica: (livello: string) => profilo({ relazioni: Number(livello) as 1 | 2 | 3 }),
      },
      {
        livelli: Object.keys(PASSI_LIBERTA),
        applica: (livello: string) =>
          profilo({
            liberta: livello as LivelliRuolo["problemSolving"]["libertaDiPensiero"],
          }),
      },
      {
        livelli: Object.keys(PASSI_COMPLESSITA),
        applica: (livello: string) =>
          profilo({ complessita: Number(livello) as 1 | 2 | 3 | 4 | 5 }),
      },
      {
        livelli: Object.keys(PASSI_AUTONOMIA),
        applica: (livello: string) =>
          profilo({
            autonomia: livello as LivelliRuolo["responsabilita"]["autonomia"],
          }),
      },
      {
        livelli: Object.keys(PASSI_DIMENSIONE),
        applica: (livello: string) =>
          profilo({ dimensione: Number(livello) as 1 | 2 | 3 | 4 | 5 }),
      },
      {
        livelli: Object.keys(PASSI_IMPATTO),
        applica: (livello: string) =>
          profilo({ impatto: livello as LivelliRuolo["responsabilita"]["impatto"] }),
      },
    ];

    for (const dimensione of dimensioni) {
      let precedente = -1;
      for (const livello of dimensione.livelli) {
        const totale = calcolaPesatura(dimensione.applica(livello)).totale;
        expect(totale).toBeGreaterThanOrEqual(precedente);
        precedente = totale;
      }
    }
  });

  it("rifiuta livelli sconosciuti e classificazioni incomplete", () => {
    expect(() => calcolaPesatura(null as unknown as LivelliRuolo)).toThrow(/mancante/);
    expect(() => calcolaPesatura({} as LivelliRuolo)).toThrow(/Competenza mancante/);
    expect(() =>
      calcolaPesatura(profilo({ conoscenze: "Z" as LivelliRuolo["competenza"]["conoscenze"] })),
    ).toThrow(/Conoscenze specialistiche non valido/);
    expect(() =>
      calcolaPesatura(profilo({ relazioni: 4 as LivelliRuolo["competenza"]["relazioni"] })),
    ).toThrow(/Relazioni interpersonali non valido/);
    expect(() =>
      calcolaPesatura(
        profilo({ impatto: "diretto" as LivelliRuolo["responsabilita"]["impatto"] }),
      ),
    ).toThrow(/Tipo di impatto non valido/);
  });
});

describe("grade", () => {
  it("assegna la fascia della soglia raggiunta e lascia aperto il grade 12", () => {
    expect(gradeDaTotale(0)).toBe(1);
    expect(gradeDaTotale(SOGLIE_GRADE[2] - 1)).toBe(1);

    for (let fascia = 2; fascia <= 12; fascia += 1) {
      const soglia = SOGLIE_GRADE[fascia as keyof typeof SOGLIE_GRADE];
      expect(gradeDaTotale(soglia)).toBe(fascia);
      expect(gradeDaTotale(soglia - 1)).toBe(fascia - 1);
    }

    expect(gradeDaTotale(SOGLIE_GRADE[12] + 10_000)).toBe(12);
  });

  it("rifiuta un totale negativo o non numerico", () => {
    expect(() => gradeDaTotale(-1)).toThrow(/non è valido/);
    expect(() => gradeDaTotale(Number.NaN)).toThrow(/non è valido/);
    expect(() => gradeDaTotale(Number.POSITIVE_INFINITY)).toThrow(/non è valido/);
  });
});

describe("scala di default", () => {
  it("usa una progressione geometrica al 15%", () => {
    PUNTI_COMPETENZA.forEach((punti, indice) => {
      expect(punti).toBe(geo(80, indice));
    });
    PUNTI_RESPONSABILITA.forEach((punti, indice) => {
      expect(punti).toBe(geo(80, indice));
    });
    PERCENTUALE_PROBLEM_SOLVING.forEach((riga, indiceRiga) => {
      riga.forEach((percentuale, indiceColonna) => {
        expect(percentuale).toBe(geo(13, indiceRiga + indiceColonna));
      });
    });
    expect(SOGLIE_GRADE[1]).toBe(0);
    for (let fascia = 2; fascia <= 12; fascia += 1) {
      expect(SOGLIE_GRADE[fascia as keyof typeof SOGLIE_GRADE]).toBe(geo(236, fascia - 2));
    }
  });

  it("pesa gli esempi di ruolo con grade attesi", () => {
    expect(calcolaPesatura(profiloMinimo)).toMatchObject({
      competenza: { punti: 80, indice: 0 },
      problemSolving: { percentuale: 13, punti: 10, indice: 0 },
      responsabilita: { punti: 80, indice: 0 },
      totale: 170,
      grade: 1,
    });
    expect(calcolaPesatura(profiloSpecialista)).toMatchObject({
      competenza: { punti: 140, indice: 4 },
      problemSolving: { percentuale: 20, punti: 28, indice: 3 },
      responsabilita: { punti: 140, indice: 4 },
      totale: 308,
      grade: 3,
    });
    expect(calcolaPesatura(profiloResponsabile)).toMatchObject({
      competenza: { punti: 213, indice: 7 },
      problemSolving: { percentuale: 26, punti: 55, indice: 5 },
      responsabilita: { punti: 213, indice: 7 },
      totale: 481,
      grade: 7,
    });
    expect(calcolaPesatura(profiloDirettore)).toMatchObject({
      competenza: { punti: 372, indice: 11 },
      problemSolving: { percentuale: 40, punti: 149, indice: 8 },
      responsabilita: { punti: 372, indice: 11 },
      totale: 893,
      grade: 11,
    });
    expect(calcolaPesatura(profiloVertice)).toMatchObject({
      competenza: { punti: 492, indice: 13 },
      problemSolving: { percentuale: 60, punti: 295, indice: 11 },
      responsabilita: { punti: 566, indice: 14 },
      totale: 1353,
      grade: 12,
    });
  });
});

describe("coerenza", () => {
  it("pesa la stessa classificazione tre volte con lo stesso grade", () => {
    for (const livelli of esempi) {
      const pesature = [1, 2, 3].map(() => calcolaPesatura(livelli));

      expect(pesature[0]).toEqual(pesature[1]);
      expect(pesature[1]).toEqual(pesature[2]);
      expect(pesature[0]).not.toBe(pesature[1]);
      expect(new Set(pesature.map((pesatura) => pesatura.grade)).size).toBe(1);
    }
  });
});

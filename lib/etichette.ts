import type { LivelloAH, LivelloAmpiezza, LivelloComplessita, LivelloRelazioni, TipoImpatto } from "./scoring";

export const ETICHETTE_CONOSCENZE: Record<LivelloAH, string> = {
  A: "Operativa di base",
  B: "Procedurale",
  C: "Tecnica di mestiere",
  D: "Specialistica",
  E: "Approfondita",
  F: "Esperta",
  G: "Autorevole sul tema",
  H: "Riferimento di dominio",
};

export const ETICHETTE_AMPIEZZA: Record<LivelloAmpiezza, string> = {
  I: "Un compito",
  II: "Attività omogenee",
  III: "Una funzione",
  IV: "Più funzioni",
  V: "L'azienda",
};

export const ETICHETTE_RELAZIONI: Record<LivelloRelazioni, string> = {
  1: "Scambio ordinario",
  2: "Influenza",
  3: "Negoziazione",
};

export const ETICHETTE_LIBERTA: Record<LivelloAH, string> = {
  A: "Procedure definite",
  B: "Alternative già tracciate",
  C: "Adattamento di metodi noti",
  D: "Metodo dentro una cornice",
  E: "Approccio in un ambito ampio",
  F: "Situazioni poco precedute",
  G: "Problema da riformulare",
  H: "Questioni nuove per l'azienda",
};

export const ETICHETTE_COMPLESSITA: Record<LivelloComplessita, string> = {
  1: "Problemi ripetitivi",
  2: "Varianti di casi noti",
  3: "Più variabili da analizzare",
  4: "Informazioni incomplete",
  5: "Problemi aperti",
};

export const ETICHETTE_AUTONOMIA: Record<LivelloAH, string> = {
  A: "Istruzioni puntuali",
  B: "Eccezioni minori",
  C: "Come raggiungere l'obiettivo",
  D: "Priorità del proprio ambito",
  E: "Risorse della funzione",
  F: "Decisioni che vincolano altre funzioni",
  G: "Scelte che cambiano un'area",
  H: "Indirizzi che impegnano l'azienda",
};

export const ETICHETTE_DIMENSIONE: Record<LivelloComplessita, string> = {
  1: "Importi contenuti",
  2: "Budget di team",
  3: "Risultato di una funzione",
  4: "Quota rilevante del conto economico",
  5: "Risultato complessivo dell'azienda",
};

export const ETICHETTE_IMPATTO: Record<TipoImpatto, string> = {
  remoto: "Remoto",
  contributivo: "Contributivo",
  condiviso: "Condiviso",
  primario: "Primario",
};

export function etichettaConfidenza(valore: "bassa" | "media" | "alta"): string {
  if (valore === "alta") return "Alta";
  if (valore === "media") return "Media";
  return "Bassa";
}

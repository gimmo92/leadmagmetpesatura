/**
 * Tabelle di pesatura. Il calcolo legge solo questi numeri:
 * per calibrare non serve toccare il resto del codice.
 *
 * Scala proprietaria, progressione geometrica al 15%.
 * Ogni valore di default è l'arrotondamento half-up di base × 1,15^indice
 * (il resto 0,5 va all'intero superiore).
 *
 * - Punti di competenza e responsabilità: base 80
 * - Percentuale di problem solving: base 13
 * - Soglia del grade 2: base 236; il grade 1 parte da 0
 *
 * L'indice di competenza è la somma dei passi di conoscenze, ampiezza
 * e relazioni. L'indice di responsabilità è la somma dei passi di
 * autonomia, dimensione e impatto. Il problem solving non ha punti propri:
 * è la percentuale, letta per riga (libertà A→H) e colonna (complessità 1→5),
 * applicata ai punti di competenza.
 */

export const PASSI_CONOSCENZE = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  E: 4,
  F: 5,
  G: 6,
  H: 7,
} as const;

export const PASSI_AMPIEZZA = {
  I: 0,
  II: 1,
  III: 2,
  IV: 3,
  V: 4,
} as const;

export const PASSI_RELAZIONI = {
  1: 0,
  2: 1,
  3: 2,
} as const;

export const PASSI_LIBERTA = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  E: 4,
  F: 5,
  G: 6,
  H: 7,
} as const;

export const PASSI_COMPLESSITA = {
  1: 0,
  2: 1,
  3: 2,
  4: 3,
  5: 4,
} as const;

export const PASSI_AUTONOMIA = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  E: 4,
  F: 5,
  G: 6,
  H: 7,
} as const;

export const PASSI_DIMENSIONE = {
  1: 0,
  2: 1,
  3: 2,
  4: 3,
  5: 4,
} as const;

export const PASSI_IMPATTO = {
  remoto: 0,
  contributivo: 1,
  condiviso: 2,
  primario: 3,
} as const;

export const PUNTI_COMPETENZA = [
  80, 92, 106, 122, 140, 161, 185, 213, 245, 281, 324, 372, 428, 492, 566, 651,
  749,
] as const;

export const PUNTI_RESPONSABILITA = [
  80, 92, 106, 122, 140, 161, 185, 213, 245, 281, 324, 372, 428, 492, 566, 651,
  749,
] as const;

export const PERCENTUALE_PROBLEM_SOLVING = [
  [13, 15, 17, 20, 23],
  [15, 17, 20, 23, 26],
  [17, 20, 23, 26, 30],
  [20, 23, 26, 30, 35],
  [23, 26, 30, 35, 40],
  [26, 30, 35, 40, 46],
  [30, 35, 40, 46, 53],
  [35, 40, 46, 53, 60],
] as const;

export const SOGLIE_GRADE = {
  1: 0,
  2: 236,
  3: 271,
  4: 312,
  5: 359,
  6: 413,
  7: 475,
  8: 546,
  9: 628,
  10: 722,
  11: 830,
  12: 955,
} as const;

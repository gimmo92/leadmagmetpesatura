export const DISCLAIMER =
  "Stima indicativa basata sui tre fattori del metodo Hay. Non sostituisce una valutazione professionale. Hay è un marchio di Korn Ferry, con cui Spark non è affiliata.";

export const CTA = "Pesa tutti i ruoli della tua azienda con Spark";

export const CALENDLY_URL = "https://calendly.com/gbasso-syyz/30-min-meeting";

export const TOOL = "pesatura-hay";

export const MAX_JD = 6000;

export const MAX_RUOLI = 10;

export const LOGO_SPARK =
  "https://tryspark.co/wp-content/uploads/2023/01/logo-spark-psd-6.png";

export const FASCE_DIPENDENTI = ["<50", "50-149", "150-249", "250-499", "500+"] as const;

export type FasciaDipendenti = (typeof FASCE_DIPENDENTI)[number];

export const CHIAVI_UTM = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

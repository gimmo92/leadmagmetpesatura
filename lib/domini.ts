const DOMINI_GRATUITI = new Set([
  "gmail.com",
  "googlemail.com",
  "libero.it",
  "hotmail.com",
  "hotmail.it",
  "hotmail.co.uk",
  "outlook.com",
  "outlook.it",
  "live.com",
  "live.it",
  "msn.com",
  "yahoo.com",
  "yahoo.it",
  "yahoo.fr",
  "yahoo.co.uk",
  "ymail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "virgilio.it",
  "tiscali.it",
  "tiscali.com",
  "alice.it",
  "tin.it",
  "email.it",
  "fastwebnet.it",
  "poste.it",
  "inwind.it",
  "katamail.com",
  "jumpy.it",
  "supereva.it",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "gmx.com",
  "gmx.it",
  "gmx.de",
  "gmx.net",
  "aol.com",
  "hey.com",
  "zoho.com",
  "mail.com",
  "mail.ru",
  "yandex.com",
  "yandex.ru",
]);

export const MESSAGGIO_EMAIL_AZIENDALE =
  "Per ricevere il report serve un'email aziendale. Gli indirizzi personali, come Gmail o Libero, non bastano.";

export function emailAziendaleConsentita(email: string): boolean {
  const dominio = email.trim().toLowerCase().split("@").at(-1) ?? "";
  if (!dominio || !dominio.includes(".") || email.trim().split("@").length !== 2) {
    return false;
  }

  const parti = dominio.split(".").filter(Boolean);
  for (let inizio = 0; inizio < parti.length - 1; inizio += 1) {
    if (DOMINI_GRATUITI.has(parti.slice(inizio).join("."))) return false;
  }
  return true;
}

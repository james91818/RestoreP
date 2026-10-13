// Detects whether an email address belongs to a company domain
// (i.e. NOT a known free / personal email provider).
const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com", "gmail.de", "gmail.at", "gmail.ch", "googlemail.com",
  "yahoo.com", "yahoo.co.uk", "yahoo.de", "yahoo.fr", "yahoo.it", "yahoo.es", "yahoo.ca", "yahoo.com.au", "ymail.com", "rocketmail.com",
  "hotmail.com", "hotmail.co.uk", "hotmail.de", "hotmail.fr", "hotmail.it", "hotmail.es", "hotmail.at", "hotmail.ch",
  "outlook.com", "outlook.de", "outlook.fr", "outlook.it", "outlook.es", "outlook.at", "outlook.ch",
  "live.com", "live.de", "live.fr", "live.it", "live.co.uk", "live.at", "live.ch",
  "msn.com", "me.com", "mac.com", "icloud.com",
  "aol.com", "aol.de", "aim.com",
  "gmx.de", "gmx.at", "gmx.ch", "gmx.com", "gmx.net",
  "web.de", "t-online.de", "online.de", "freenet.de", "arcor.de", "kabelmail.de", "1und1.de",
  "google.com", "google.de", "google.at", "google.ch", "google.co.uk", "google.fr", "google.it", "google.es",
  "crypto-boerse.com", "utmann-strategies.com",
  "vodafone.de", "vodafonemail.de", "vodafone.at", "vodafone.it", "vodafone.co.uk",
  "email.com", "email.de", "email.it", "e-mail.de",
  "mail.com", "mail.de", "mail.ru", "yandex.com", "yandex.ru",
  "posteo.de", "posteo.net", "mailbox.org",
  "proton.me", "protonmail.com", "pm.me", "tutanota.com", "tuta.io", "tutamail.com",
  "zoho.com", "fastmail.com", "hey.com",
  "qq.com", "163.com", "126.com", "naver.com", "daum.net",
  "free.fr", "orange.fr", "laposte.net", "wanadoo.fr", "sfr.fr",
  "libero.it", "tiscali.it", "virgilio.it", "alice.it", "tin.it", "fastwebnet.it",
  "bluewin.ch", "sunrise.ch", "hispeed.ch", "swissonline.ch",
  "aon.at", "chello.at", "a1.net", "inode.at", "drei.at", "magenta.at",
]);

export function isCompanyEmail(email?: string | null): boolean {
  if (!email) return false;
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!domain || !domain.includes(".")) return false;
  // Exclude any google.* or our own brand domains (typos included)
  if (/^(google|googlemail)\./.test(domain)) return false;
  if (/utmann-strategies\./.test(domain)) return false;
  return !FREE_EMAIL_DOMAINS.has(domain);
}

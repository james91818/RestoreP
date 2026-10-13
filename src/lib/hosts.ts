// Centralized hostname helpers for routing the backoffice vs. the public site.
//
// The backoffice lives on its own dedicated subdomain
// (backoffice.crypto-borse.com) so regular clients on the public domains
// cannot see or access it.

const getHostname = () =>
  typeof window !== "undefined" ? window.location.hostname : "";

export const BACKOFFICE_HOSTS = [
  "backoffice.crypto-borse.com",
];

/** Legacy backoffice hosts kept for redirect compatibility. */
export const LEGACY_BACKOFFICE_HOSTS: string[] = [
  "crm-crypto-boerse.com",
  "www.crm-crypto-boerse.com",
  "backoffice.crypto-boerse.com",
];

export const getLegacyBackofficeRedirectUrl = () => {
  if (typeof window === "undefined") return "https://backoffice.crypto-borse.com";
  return `https://backoffice.crypto-borse.com${window.location.pathname}${window.location.search}${window.location.hash}`;
};

export const CLIENT_PUBLIC_HOSTS = [
  "crypto-borse.com",
  "www.crypto-borse.com",
  "vip-crypto-boerse.com",
  "www.vip-crypto-boerse.com",
  "crypto-boerse.com",
  "www.crypto-boerse.com",
  "crypto-boerse.lovable.app",
];

/** True when running on a hostname dedicated to the admin backoffice. */
export const isBackofficeHost = () => BACKOFFICE_HOSTS.includes(getHostname());

/** True when running on the deprecated backoffice hostname. */
export const isLegacyBackofficeHost = () =>
  LEGACY_BACKOFFICE_HOSTS.includes(getHostname());

/** True when running on a public client-facing hostname. */
export const isClientPublicHost = () =>
  CLIENT_PUBLIC_HOSTS.includes(getHostname());

/**
 * True when we should treat the current context as backoffice — either the
 * dedicated backoffice host, or the /backoffice path on preview/dev hosts
 * (so staff can still log in from lovable.app previews and localhost).
 */
export const isBackofficeContext = () => {
  if (typeof window === "undefined") return false;
  if (isBackofficeHost()) return true;
  if (isClientPublicHost()) return false; // never on the public client site
  if (isLegacyBackofficeHost()) return false; // legacy host redirects to the new one
  // Previews / localhost / lovable.app subdomains: allow /backoffice paths so
  // staff can still test from the dev preview.
  return window.location.pathname.startsWith("/backoffice");
};

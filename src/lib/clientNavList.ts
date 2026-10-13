// Lightweight session-scoped store for navigating between client profiles
// using prev/next arrows on the AdminUserDetail page.
const KEY = "admin.clientNavList";

export type ClientNavList = {
  /** Ordered profile IDs the admin is currently browsing through. */
  ids: string[];
  /** Where the list originated (e.g. "Depositors", "Leads"). Shown as tooltip. */
  source?: string;
};

export function setClientNavList(list: ClientNavList) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

export function getClientNavList(): ClientNavList | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.ids)) return null;
    return parsed as ClientNavList;
  } catch {
    return null;
  }
}

export function getNavPosition(currentId: string) {
  const list = getClientNavList();
  if (!list || list.ids.length === 0) return null;
  const idx = list.ids.indexOf(currentId);
  if (idx < 0) return null;
  return {
    index: idx,
    total: list.ids.length,
    prevId: idx > 0 ? list.ids[idx - 1] : null,
    nextId: idx < list.ids.length - 1 ? list.ids[idx + 1] : null,
    source: list.source,
  };
}

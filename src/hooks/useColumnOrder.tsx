import { useState, useCallback } from "react";

export interface ColumnDef {
  key: string;
  label: string;
}

interface StoredState {
  order: string[];
  hidden: string[];
}

function loadState(storageKey: string): StoredState | null {
  try {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    // Backwards compat: previously stored as plain string[] (order only)
    if (Array.isArray(parsed)) return { order: parsed as string[], hidden: [] };
    if (parsed && Array.isArray(parsed.order)) {
      return { order: parsed.order, hidden: Array.isArray(parsed.hidden) ? parsed.hidden : [] };
    }
  } catch {}
  return null;
}

export function useColumnOrder(storageKey: string, defaultColumns: ColumnDef[]) {
  const [allColumns, setAllColumns] = useState<ColumnDef[]>(() => {
    const saved = loadState(storageKey);
    if (saved) {
      const colMap = new Map(defaultColumns.map(c => [c.key, c]));
      const ordered = saved.order.map(k => colMap.get(k)).filter(Boolean) as ColumnDef[];
      const savedSet = new Set(saved.order);
      defaultColumns.forEach(c => { if (!savedSet.has(c.key)) ordered.push(c); });
      return ordered;
    }
    return defaultColumns;
  });

  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(() => {
    const saved = loadState(storageKey);
    return new Set(saved?.hidden ?? []);
  });

  const persist = (cols: ColumnDef[], hidden: Set<string>) => {
    const state: StoredState = { order: cols.map(c => c.key), hidden: Array.from(hidden) };
    localStorage.setItem(storageKey, JSON.stringify(state));
  };

  const moveColumn = useCallback((key: string, direction: "left" | "right") => {
    setAllColumns(prev => {
      const idx = prev.findIndex(c => c.key === key);
      if (idx < 0) return prev;
      const swapIdx = direction === "left" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      persist(next, hiddenKeys);
      return next;
    });
  }, [storageKey, hiddenKeys]);

  const toggleColumnVisibility = useCallback((key: string) => {
    setHiddenKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      persist(allColumns, next);
      return next;
    });
  }, [allColumns]);

  const showAllColumns = useCallback(() => {
    setHiddenKeys(() => {
      const next = new Set<string>();
      persist(allColumns, next);
      return next;
    });
  }, [allColumns]);

  const visibleColumns = allColumns.filter(c => !hiddenKeys.has(c.key));

  return {
    columns: visibleColumns,
    allColumns,
    hiddenKeys,
    moveColumn,
    toggleColumnVisibility,
    showAllColumns,
  };
}

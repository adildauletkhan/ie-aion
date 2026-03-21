import { useMemo, useState } from "react";

export type SortDir = "asc" | "desc";

export interface SortState {
  col: string;
  dir: SortDir;
}

export function useSortFilter<T extends Record<string, unknown>>(items: T[]) {
  const [sort, setSort] = useState<SortState | null>(null);
  const [colFilters, setColFilters] = useState<Record<string, string>>({});

  const toggleSort = (col: string) => {
    setSort((prev) =>
      prev?.col === col
        ? { col, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { col, dir: "asc" }
    );
  };

  const setFilter = (col: string, val: string) =>
    setColFilters((prev) => ({ ...prev, [col]: val }));

  const resetFilters = () => setColFilters({});

  const processed = useMemo(() => {
    let result: T[] = [...items];

    // Column-level filters (exact match for selects, includes for text)
    for (const [col, val] of Object.entries(colFilters)) {
      if (!val) continue;
      result = result.filter((item) => {
        const v = item[col];
        if (v == null) return false;
        return String(v).toLowerCase().includes(val.toLowerCase());
      });
    }

    // Sort
    if (sort) {
      result.sort((a, b) => {
        const av = a[sort.col];
        const bv = b[sort.col];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        const cmp =
          typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av).localeCompare(String(bv), undefined, { numeric: true });
        return sort.dir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [items, sort, colFilters]);

  return { processed, sort, toggleSort, colFilters, setFilter, resetFilters };
}

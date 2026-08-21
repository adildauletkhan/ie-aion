import { useEffect, useState } from "react";
import { getAuthHeader } from "@/lib/auth";
import { useWorkspace } from "@/context/WorkspaceContext";

export interface OilFieldOption {
  id: number;
  name: string;
  shortName?: string | null;
  region?: string | null;
  extractionCompanyId?: number | null;
  ngduId?: number | null;
}

/**
 * Fetches oil fields respecting the active workspace scope.
 * - "all" (КМГ) → returns all oil fields
 * - "own" (ЭМГ) → returns only oil fields belonging to the active extraction company
 */
export function useOilFields() {
  const { activeCompanyId, isGlobalScope, loading: workspaceLoading } = useWorkspace();
  const [oilFields, setOilFields] = useState<OilFieldOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (workspaceLoading) return;

    const controller = new AbortController();
    const authHeader = getAuthHeader();

    let url = "/api/master-data/oil-fields";
    if (!isGlobalScope && activeCompanyId !== null) {
      url += `?extractionCompanyId=${activeCompanyId}`;
    }

    setLoading(true);
    fetch(url, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: OilFieldOption[]) => setOilFields(Array.isArray(data) ? data : []))
      .catch(() => setOilFields([]))
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [activeCompanyId, isGlobalScope, workspaceLoading]);

  return { oilFields, loading };
}

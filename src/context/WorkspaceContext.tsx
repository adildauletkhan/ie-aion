import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { getAuthHeader } from "@/lib/auth";

export interface Workspace {
  id: number;
  code: string;
  name: string;
  shortName?: string | null;
  /** "all" = КМГ (видит всё), "own" = дочерняя компания */
  workspaceScope: "all" | "own";
  isDefault: boolean;
}

interface WorkspaceContextValue {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  setActiveWorkspace: (ws: Workspace) => void;
  /** true — workspace КМГ-уровня, видит транспорт/экспорт/НПЗ */
  isGlobalScope: boolean;
  /** extraction_company_id для фильтрации API, или null если "all" */
  activeCompanyId: number | null;
  loading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  workspaces: [],
  activeWorkspace: null,
  setActiveWorkspace: () => {},
  isGlobalScope: true,
  activeCompanyId: null,
  loading: true,
});

const STORAGE_KEY = "active_workspace_id";

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  // Load workspaces from /api/me
  useEffect(() => {
    const header = getAuthHeader();
    if (!header) {
      setLoading(false);
      return;
    }
    fetch("/api/me", { headers: { Authorization: header } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { workspaces?: Workspace[]; active_workspace_id?: number | null } | null) => {
        if (!data) return;
        const wsList: Workspace[] = data.workspaces ?? [];
        setWorkspaces(wsList);

        if (wsList.length === 0) return;

        // Restore last selected workspace from localStorage
        const storedId = localStorage.getItem(STORAGE_KEY);
        const storedWs = storedId
          ? wsList.find((w) => w.id === Number(storedId))
          : null;

        // Fallback: use server-side active_workspace_id, then default, then first
        const serverActive = data.active_workspace_id
          ? wsList.find((w) => w.id === data.active_workspace_id)
          : null;
        const defaultWs = wsList.find((w) => w.isDefault);

        setActiveWorkspaceState(storedWs ?? serverActive ?? defaultWs ?? wsList[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const setActiveWorkspace = useCallback(
    (ws: Workspace) => {
      setActiveWorkspaceState(ws);
      localStorage.setItem(STORAGE_KEY, String(ws.id));

      // Persist to backend (best-effort)
      const header = getAuthHeader();
      if (header) {
        fetch("/api/me/workspace", {
          method: "PUT",
          headers: { Authorization: header, "Content-Type": "application/json" },
          body: JSON.stringify({ extractionCompanyId: ws.id }),
        }).catch(() => {});
      }
    },
    []
  );

  const isGlobalScope = activeWorkspace?.workspaceScope === "all";
  // For "all"-scope we don't filter by company; for "own" we pass the id.
  const activeCompanyId = isGlobalScope ? null : (activeWorkspace?.id ?? null);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        setActiveWorkspace,
        isGlobalScope,
        activeCompanyId,
        loading,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}

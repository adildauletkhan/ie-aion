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
  /** "all" = head company (full access), "own" = subsidiary */
  workspaceScope: "all" | "own";
  isDefault: boolean;
}

/** Static workspaces for oil pipeline / KazTransOil */
const OIL_PIPELINE_WORKSPACES: Workspace[] = [
  { id: 3001, code: 'KTO',        name: 'АО «КазТрансОйл»',       shortName: 'КазТрансОйл', workspaceScope: 'all', isDefault: true },
  { id: 3002, code: 'KTO_WEST',   name: 'КТО — Западный филиал',  shortName: 'КТО Запад',   workspaceScope: 'own', isDefault: false },
  { id: 3003, code: 'KTO_AKTAU',  name: 'Морской терминал Актау', shortName: 'МТА',          workspaceScope: 'own', isDefault: false },
]

/** Static workspaces for gas pipeline / QazaqGas */
const GAS_PIPELINE_WORKSPACES: Workspace[] = [
  { id: 4001, code: 'QAZAQGAS',   name: 'АО «QazaqGas»',                    shortName: 'QazaqGas',  workspaceScope: 'all', isDefault: true },
  { id: 4002, code: 'ICA',        name: 'АО «Интергаз Центральная Азия»',   shortName: 'ИЦА',       workspaceScope: 'own', isDefault: false },
  { id: 4003, code: 'KTGAIMAK',   name: 'АО «КазТрансГаз Аймак»',          shortName: 'КТГ Аймак', workspaceScope: 'own', isDefault: false },
]

/** Static workspaces for mining/GMK industry */
const MINING_WORKSPACES: Workspace[] = [
  {
    id: 2001,
    code: "KAZGMK",
    name: "АО «КазГМК»",
    shortName: "КазГМК",
    workspaceScope: "all",
    isDefault: true,
  },
  {
    id: 2002,
    code: "ZHEZKAZGAN",
    name: "АО «Жезказган Мыс»",
    shortName: "Жезказган Мыс",
    workspaceScope: "own",
    isDefault: false,
  },
  {
    id: 2003,
    code: "SOKOLOV",
    name: "АО «Соколовский ГОК»",
    shortName: "Соколовский ГОК",
    workspaceScope: "own",
    isDefault: false,
  },
];

/** Static workspaces injected for energy/KEGOC industry */
const KEGOC_WORKSPACES: Workspace[] = [
  {
    id: 1001,
    code: "KEGOC",
    name: "АО «KEGOC»",
    shortName: "KEGOC",
    workspaceScope: "all",
    isDefault: true,
  },
  {
    id: 1002,
    code: "ENERGOINFORM",
    name: "АО «Энергоинформ»",
    shortName: "Энергоинформ",
    workspaceScope: "own",
    isDefault: false,
  },
  {
    id: 1003,
    code: "BATYS",
    name: "АО «Батыс транзит»",
    shortName: "Батыс транзит",
    workspaceScope: "own",
    isDefault: false,
  },
];

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

function getInitialWorkspaces(): Workspace[] {
  try {
    const profile = JSON.parse(localStorage.getItem("aion_company_profile") ?? "{}");
    if (profile?.industry === "energy")       return KEGOC_WORKSPACES;
    if (profile?.industry === "mining")       return MINING_WORKSPACES;
    if (profile?.industry === "pipeline_oil") return OIL_PIPELINE_WORKSPACES;
    if (profile?.industry === "pipeline_gas") return GAS_PIPELINE_WORKSPACES;
  } catch {}
  return [];
}

function getInitialActive(wsList: Workspace[]): Workspace | null {
  if (wsList.length === 0) return null;
  try {
    const storedId = localStorage.getItem(STORAGE_KEY);
    if (storedId) {
      const found = wsList.find((w) => w.id === Number(storedId));
      if (found) return found;
    }
  } catch {}
  return wsList.find((w) => w.isDefault) ?? wsList[0];
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(getInitialWorkspaces);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(() => {
    const initial = getInitialWorkspaces();
    return getInitialActive(initial);
  });
  const [loading, setLoading] = useState(true);

  // Industry check is priority: energy always gets KEGOC workspaces
  const resolveWorkspaces = (apiList: Workspace[]): Workspace[] => {
    try {
      const profile = JSON.parse(localStorage.getItem("aion_company_profile") ?? "{}");
      if (profile?.industry === "energy")       return KEGOC_WORKSPACES;
      if (profile?.industry === "mining")       return MINING_WORKSPACES;
      if (profile?.industry === "pipeline_oil") return OIL_PIPELINE_WORKSPACES;
      if (profile?.industry === "pipeline_gas") return GAS_PIPELINE_WORKSPACES;
    } catch {}
    return apiList;
  };

  // Load workspaces from /api/me
  useEffect(() => {
    const header = getAuthHeader();
    if (!header) {
      // No auth header — still try to inject static workspaces for energy
      const wsList = resolveWorkspaces([]);
      if (wsList.length > 0) {
        setWorkspaces(wsList);
        const storedId = localStorage.getItem(STORAGE_KEY);
        const storedWs = storedId ? wsList.find((w) => w.id === Number(storedId)) : null;
        setActiveWorkspaceState(storedWs ?? wsList.find((w) => w.isDefault) ?? wsList[0]);
      }
      setLoading(false);
      return;
    }
    fetch("/api/me", { headers: { Authorization: header } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { workspaces?: Workspace[]; active_workspace_id?: number | null } | null) => {
        const wsList = resolveWorkspaces(data?.workspaces ?? []);
        setWorkspaces(wsList);

        if (wsList.length === 0) return;

        // Restore last selected workspace from localStorage
        const storedId = localStorage.getItem(STORAGE_KEY);
        const storedWs = storedId
          ? wsList.find((w) => w.id === Number(storedId))
          : null;

        // Fallback: use server-side active_workspace_id, then default, then first
        const serverActive = data?.active_workspace_id
          ? wsList.find((w) => w.id === data.active_workspace_id)
          : null;
        const defaultWs = wsList.find((w) => w.isDefault);

        setActiveWorkspaceState(storedWs ?? serverActive ?? defaultWs ?? wsList[0]);
      })
      .catch(() => {
        // On network error — still try static fallback
        const wsList = resolveWorkspaces([]);
        if (wsList.length > 0) {
          setWorkspaces(wsList);
          setActiveWorkspaceState(wsList.find((w) => w.isDefault) ?? wsList[0]);
        }
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Pencil, Trash2, ChevronRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { getAuthHeader } from "@/lib/auth";
import { CRISIS_ASSET_TYPES } from "@/lib/assetTypes";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useWorkspace } from "@/context/WorkspaceContext";
import { AssetsContent } from "@/pages/DataPage";
import { useSortFilter } from "@/hooks/useSortFilter";
import { SortableHeader } from "@/components/SortableHeader";

interface MasterDataRow {
  id: number;
  code: string;
  name: string;
  shortName?: string | null;
  capacity: number;
  currentMonth: number;
  currentDay: number;
  region?: string | null;
  status?: string | null;
}

interface WellItem {
  id: number;
  name: string;
  wellType?: string | null;
  status?: string | null;
  depthCurrent?: number | null;
  formationName?: string | null;
  zoneName?: string | null;
}

interface HorizonItem {
  id: number;
  name: string;
  code?: string | null;
  depthTop?: number | null;
  depthBottom?: number | null;
  porosity?: number | null;
  permeability?: number | null;
}

interface MasterDataFormState {
  code: string;
  name: string;
  shortName: string;
  capacity: string;
  currentMonth: string;
  currentDay: string;
  region: string;
  status: string;
}

type MasterDataKey =
  | "processing-plants"
  | "transportation-sections"
  | "nps-stations"
  | "oil-fields"
  | "extraction-companies"
  | "transportation-companies"
  | "export-destinations"
  | "ngdus";

const OTHER_MASTER_KEYS: MasterDataKey[] = ["nps-stations", "transportation-companies"];
const NGDU_ONLY_KEYS: MasterDataKey[] = ["ngdus"];

function getApiBase(): string {
  // Use relative /api - nginx will proxy to backend
  return "/api";
}

const statusStyles: Record<string, string> = {
  active: "bg-success/20 text-success",
  maintenance: "bg-accent/20 text-accent",
  offline: "bg-destructive/20 text-destructive",
};
export default function MasterDataPage() {
  const { t, translateData } = useLanguage();
  const { activeCompanyId, isGlobalScope } = useWorkspace();
  const [searchParams] = useSearchParams();
  const [outerTab, setOuterTab] = useState<"directory" | "assets">("directory");
  // Сначала те же типы активов, что и в кризисных событиях (для выбора по названию при регистрации), затем остальные
  // Для "own"-scope (ЭМГ) скрываем processing-plants — дочерние компании не имеют НПЗ.
  const allMasterDataSources: { key: MasterDataKey; label: string }[] = [
    ...CRISIS_ASSET_TYPES.map((asset) => ({ key: asset.apiKey as MasterDataKey, label: t(asset.labelKey) })),
    ...OTHER_MASTER_KEYS.map((key) => ({
      key,
      label: key === "nps-stations" ? t("npsStation") : t("transportationCompany"),
    })),
    ...NGDU_ONLY_KEYS.map((key) => ({ key, label: t("ngduTab") })),
  ];
  const masterDataSources = isGlobalScope
    ? allMasterDataSources
    : allMasterDataSources.filter((s) => s.key !== "processing-plants");
  const statusLabels: Record<string, string> = {
    active: t("statusActive"),
    maintenance: t("statusMaintenance"),
    offline: t("statusOffline"),
  };
  const [activeKey, setActiveKey] = useState<MasterDataKey>(masterDataSources[0].key);
  const [rows, setRows] = useState<MasterDataRow[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<MasterDataRow | null>(null);
  const [formState, setFormState] = useState<MasterDataFormState>({
    code: "",
    name: "",
    shortName: "",
    capacity: "",
    currentMonth: "",
    currentDay: "",
    region: "",
    status: "",
  });
  const [actionError, setActionError] = useState<string>("");

  // Oil field detail dialog (wells + horizons)
  const [oilFieldDetailOpen, setOilFieldDetailOpen] = useState(false);
  const [selectedOilField, setSelectedOilField] = useState<MasterDataRow | null>(null);
  const [detailTab, setDetailTab] = useState<"wells" | "objects">("wells");
  const [oilFieldWells, setOilFieldWells] = useState<WellItem[]>([]);
  const [oilFieldHorizons, setOilFieldHorizons] = useState<HorizonItem[]>([]);
  const [wellsLoading, setWellsLoading] = useState(false);
  const [horizonsLoading, setHorizonsLoading] = useState(false);

  // НГДУ detail dialog (list of oil fields)
  const [ngduDetailOpen, setNgduDetailOpen] = useState(false);
  const [selectedNgdu, setSelectedNgdu] = useState<MasterDataRow | null>(null);
  const [ngduOilFields, setNgduOilFields] = useState<MasterDataRow[]>([]);
  const [ngduOilFieldsLoading, setNgduOilFieldsLoading] = useState(false);
  const [ngduSearch, setNgduSearch] = useState("");

  // Sort/filter — main table
  const mainSort = useSortFilter<MasterDataRow>(rows);
  // Sort/filter — wells detail
  const wellsSort = useSortFilter<WellItem>(oilFieldWells);
  // Sort/filter — horizons detail
  const horizonsSort = useSortFilter<HorizonItem>(oilFieldHorizons);
  // Sort/filter — НГДУ oil fields
  const ngduFieldsSort = useSortFilter<MasterDataRow>(ngduOilFields);

  const defaultStatus = Object.keys(statusLabels)[0] ?? "active";

  const parseNumber = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const codeParam = searchParams.get("code");
    if (tabParam && masterDataSources.some((item) => item.key === tabParam)) {
      setActiveKey(tabParam as MasterDataKey);
    }
    if (codeParam) {
      setSearch(codeParam);
    }
  }, [searchParams]);

  const loadData = async (signal?: AbortSignal) => {
    setIsLoading(true);
    const authHeader = getAuthHeader();
    try {
      let url = `${getApiBase()}/master-data/${activeKey}`;
      if ((activeKey === "oil-fields" || activeKey === "ngdus") && !isGlobalScope && activeCompanyId !== null) {
        url += `?extractionCompanyId=${activeCompanyId}`;
      }
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        signal,
      });
      if (!response.ok) return;

      const payload = await response.json();
      if (activeKey === "ngdus") {
        // NgduRead has snake_case short_name, no capacity fields — map to MasterDataRow
        const mapped: MasterDataRow[] = (payload as any[]).map((item) => ({
          id: item.id,
          code: item.code,
          name: item.name,
          shortName: item.short_name ?? null,
          capacity: 0,
          currentMonth: 0,
          currentDay: 0,
          region: item.region ?? null,
          status: item.status ?? null,
        }));
        setRows(mapped);
      } else {
        setRows(payload as MasterDataRow[]);
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        // keep empty data on error
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenOilFieldDetail = async (row: MasterDataRow) => {
    setSelectedOilField(row);
    setDetailTab("wells");
    setOilFieldWells([]);
    setOilFieldHorizons([]);
    setOilFieldDetailOpen(true);

    const authHeader = getAuthHeader();
    const headers = {
      "Content-Type": "application/json",
      ...(authHeader ? { Authorization: authHeader } : {}),
    };

    setWellsLoading(true);
    fetch(`${getApiBase()}/wells?oil_field_id=${row.id}`, { headers })
      .then((r) => r.json())
      .then((data) => setOilFieldWells(data as WellItem[]))
      .catch(() => {})
      .finally(() => setWellsLoading(false));

    setHorizonsLoading(true);
    fetch(`${getApiBase()}/reservoir-twin/horizons?oil_field_id=${row.id}`, { headers })
      .then((r) => r.json())
      .then((data) => setOilFieldHorizons(data as HorizonItem[]))
      .catch(() => {})
      .finally(() => setHorizonsLoading(false));
  };

  const handleOpenNgduDetail = (row: MasterDataRow) => {
    setSelectedNgdu(row);
    setNgduOilFields([]);
    setNgduSearch("");
    setNgduDetailOpen(true);

    const authHeader = getAuthHeader();
    const headers = {
      "Content-Type": "application/json",
      ...(authHeader ? { Authorization: authHeader } : {}),
    };

    setNgduOilFieldsLoading(true);
    fetch(`${getApiBase()}/master-data/oil-fields?ngduId=${row.id}`, { headers })
      .then((r) => r.json())
      .then((data) => setNgduOilFields(data as MasterDataRow[]))
      .catch(() => {})
      .finally(() => setNgduOilFieldsLoading(false));
  };

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [activeKey, activeCompanyId, isGlobalScope]);

  // Text-search filtered, then passed through sort hook
  const searchFiltered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return mainSort.processed;
    return mainSort.processed.filter((row) => {
      const region = row.region ?? "";
      const shortName = row.shortName ?? "";
      const translatedName = translateData(row.name);
      const translatedRegion = translateData(region);
      return (
        row.name.toLowerCase().includes(query) ||
        row.code.toLowerCase().includes(query) ||
        shortName.toLowerCase().includes(query) ||
        region.toLowerCase().includes(query) ||
        translatedName.toLowerCase().includes(query) ||
        translatedRegion.toLowerCase().includes(query)
      );
    });
  }, [mainSort.processed, search]);
  const filtered = searchFiltered;

  const handleOpenCreate = () => {
    setEditingRow(null);
    setActionError("");
    setFormState({
      code: "",
      name: "",
      shortName: "",
      capacity: "",
      currentMonth: "",
      currentDay: "",
      region: "",
      status: defaultStatus,
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (row: MasterDataRow) => {
    setEditingRow(row);
    setActionError("");
    setFormState({
      code: row.code ?? "",
      name: row.name ?? "",
      shortName: row.shortName ?? "",
      capacity: String(row.capacity ?? 0),
      currentMonth: String(row.currentMonth ?? 0),
      currentDay: String(row.currentDay ?? 0),
      region: row.region ?? "",
      status: row.status ?? defaultStatus,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const authHeader = getAuthHeader();
    const payload = {
      code: formState.code.trim(),
      name: formState.name.trim(),
      shortName: formState.shortName.trim() || null,
      capacity: parseNumber(formState.capacity),
      currentMonth: parseNumber(formState.currentMonth),
      currentDay: parseNumber(formState.currentDay),
      region: formState.region.trim() || null,
      status: formState.status || null,
    };
    const isEdit = Boolean(editingRow);
    const url = isEdit
      ? `${getApiBase()}/master-data/${activeKey}/${editingRow?.id}`
      : `${getApiBase()}/master-data/${activeKey}`;
    const response = await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      setActionError(t("saveFailed"));
      return;
    }
    const saved = (await response.json()) as MasterDataRow;
    setRows((prev) => {
      if (isEdit) {
        return prev.map((row) => (row.id === saved.id ? saved : row));
      }
      return [saved, ...prev];
    });
    setIsDialogOpen(false);
  };

  const handleDelete = async (row: MasterDataRow) => {
    if (!window.confirm(t("deleteConfirm"))) return;
    const authHeader = getAuthHeader();
    const response = await fetch(`${getApiBase()}/master-data/${activeKey}/${row.id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });
    if (!response.ok) {
      setActionError(t("deleteFailed"));
      return;
    }
    setRows((prev) => prev.filter((item) => item.id !== row.id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("navData")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("masterDataSubtitle")}</p>
        </div>
        {/* Outer section switcher */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1 shrink-0">
          <button
            onClick={() => setOuterTab("directory")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              outerTab === "directory"
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("masterDataTitle")}
          </button>
          <button
            onClick={() => setOuterTab("assets")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              outerTab === "assets"
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("allEntities")}
          </button>
        </div>
      </div>

      {/* Все активы (entities) */}
      {outerTab === "assets" && <AssetsContent />}

      {/* Справочники (master data CRUD) */}
      {outerTab === "directory" && <><Card>
        <CardHeader>
          <div className="flex flex-col gap-3">
            <CardTitle className="text-base">{t("categories")}</CardTitle>
            <Tabs value={activeKey} onValueChange={(value) => setActiveKey(value as MasterDataKey)}>
              <TabsList className="flex flex-wrap h-auto gap-2">
                {masterDataSources.map((item) => (
                  <TabsTrigger key={item.key} value={item.key} className="text-xs h-8">
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {masterDataSources.map((item) => (
                <TabsContent key={item.key} value={item.key} className="mt-0" />
              ))}
            </Tabs>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative max-w-xs flex-1 min-w-[180px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("searchMaster")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-xs text-foreground min-w-[130px]"
                value={mainSort.colFilters["status"] ?? ""}
                onChange={(e) => mainSort.setFilter("status", e.target.value)}
              >
                <option value="">{t("status")}: {t("statusAll") ?? "Все"}</option>
                {Object.entries(statusLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <Button size="sm" onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 mr-1" /> {t("addItem")}
              </Button>
              {actionError && <span className="text-xs text-destructive">{actionError}</span>}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <SortableHeader col="id" label={t("id")} sort={mainSort.sort} onToggle={mainSort.toggleSort} />
                  <SortableHeader col="code" label={t("code")} sort={mainSort.sort} onToggle={mainSort.toggleSort} />
                  <SortableHeader col="name" label={t("name")} sort={mainSort.sort} onToggle={mainSort.toggleSort} />
                  <SortableHeader col="shortName" label={t("shortName")} sort={mainSort.sort} onToggle={mainSort.toggleSort} />
                  <SortableHeader col="region" label={t("region")} sort={mainSort.sort} onToggle={mainSort.toggleSort} />
                  {activeKey !== "ngdus" && <>
                    <SortableHeader col="capacity" label={t("capacity")} sort={mainSort.sort} onToggle={mainSort.toggleSort} align="right" />
                    <SortableHeader col="currentMonth" label={t("currentMonth")} sort={mainSort.sort} onToggle={mainSort.toggleSort} align="right" />
                    <SortableHeader col="currentDay" label={t("currentDay")} sort={mainSort.sort} onToggle={mainSort.toggleSort} align="right" />
                  </>}
                  <SortableHeader col="status" label={t("status")} sort={mainSort.sort} onToggle={mainSort.toggleSort} align="center" />
                  <th className="text-right py-3 px-2 font-medium">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${activeKey === "oil-fields" || activeKey === "ngdus" ? "cursor-pointer" : ""}`}
                    onClick={
                      activeKey === "oil-fields"
                        ? () => handleOpenOilFieldDetail(row)
                        : activeKey === "ngdus"
                          ? () => handleOpenNgduDetail(row)
                          : undefined
                    }
                  >
                    <td className="py-2.5 px-2 text-muted-foreground font-mono text-xs">{row.id}</td>
                    <td className="py-2.5 px-2 font-mono text-xs">{row.code}</td>
                    <td className="py-2.5 px-2 font-medium">
                      <span className="flex items-center gap-1">
                        {translateData(row.name)}
                        {(activeKey === "oil-fields" || activeKey === "ngdus") && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-muted-foreground">{row.shortName || "—"}</td>
                    <td className="py-2.5 px-2 text-muted-foreground">{row.region ? translateData(row.region) : "—"}</td>
                    {activeKey !== "ngdus" && <>
                      <td className="py-2.5 px-2 text-right font-mono">{row.capacity.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-right font-mono">{row.currentMonth.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-right font-mono">{row.currentDay.toLocaleString()}</td>
                    </>}
                    <td className="py-2.5 px-2 text-center">
                      {row.status ? (
                        <Badge className={statusStyles[row.status] ?? ""} variant="secondary">
                          {statusLabels[row.status] ?? row.status}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-2">
                        <Button size="icon" variant="ghost" onClick={() => handleOpenEdit(row)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(row)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            {isLoading ? t("loadingData") : `${t("shownCount")} ${filtered.length} ${t("shownOf")} ${rows.length} ${t("shownRecords")}`}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRow ? t("editItem") : t("addItem")}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t("code")}</label>
              <Input
                value={formState.code}
                onChange={(e) => setFormState((prev) => ({ ...prev, code: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t("name")}</label>
              <Input
                value={formState.name}
                onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t("shortName")}</label>
              <Input
                value={formState.shortName}
                onChange={(e) => setFormState((prev) => ({ ...prev, shortName: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t("capacity")}</label>
                <Input
                  type="number"
                  value={formState.capacity}
                  onChange={(e) => setFormState((prev) => ({ ...prev, capacity: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t("region")}</label>
                <Input
                  value={formState.region}
                  onChange={(e) => setFormState((prev) => ({ ...prev, region: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t("currentMonth")}</label>
                <Input
                  type="number"
                  value={formState.currentMonth}
                  onChange={(e) => setFormState((prev) => ({ ...prev, currentMonth: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t("currentDay")}</label>
                <Input
                  type="number"
                  value={formState.currentDay}
                  onChange={(e) => setFormState((prev) => ({ ...prev, currentDay: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t("status")}</label>
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                value={formState.status}
                onChange={(e) => setFormState((prev) => ({ ...prev, status: e.target.value }))}
              >
                <option value="">{t("statusEmpty")}</option>
                {Object.keys(statusLabels).map((key) => (
                  <option key={key} value={key}>
                    {statusLabels[key]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleSave}>{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Oil field detail dialog — wells & horizons */}
      <Dialog open={oilFieldDetailOpen} onOpenChange={setOilFieldDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {t("oilFieldDetailTitle")}
              {selectedOilField && (
                <span className="text-muted-foreground font-normal text-sm">— {translateData(selectedOilField.name)}</span>
              )}
            </DialogTitle>
          </DialogHeader>
          <Tabs value={detailTab} onValueChange={(v) => setDetailTab(v as "wells" | "objects")} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-full">
              <TabsTrigger value="wells" className="flex-1">{t("geoWellsTab")}</TabsTrigger>
              <TabsTrigger value="objects" className="flex-1">{t("oilFieldObjectsTab")}</TabsTrigger>
            </TabsList>

            {/* Wells tab */}
            <TabsContent value="wells" className="flex-1 overflow-auto mt-3">
              {wellsLoading ? (
                <div className="py-8 text-center text-muted-foreground text-sm">{t("loadingData")}</div>
              ) : oilFieldWells.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">{t("noWellsData")}</div>
              ) : (
                <>
                  {/* Well filters */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <select
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                      value={wellsSort.colFilters["wellType"] ?? ""}
                      onChange={(e) => wellsSort.setFilter("wellType", e.target.value)}
                    >
                      <option value="">{t("wellTypeLabel")}: Все</option>
                      {["production", "injection", "observation", "water"].map((wt) => (
                        <option key={wt} value={wt}>{t(`wellType_${wt}`)}</option>
                      ))}
                    </select>
                    <select
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                      value={wellsSort.colFilters["status"] ?? ""}
                      onChange={(e) => wellsSort.setFilter("status", e.target.value)}
                    >
                      <option value="">{t("status")}: {t("statusAll")}</option>
                      {Object.entries(statusLabels).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                    <Input
                      placeholder={t("modelsTabHorizons")}
                      value={wellsSort.colFilters["formationName"] ?? ""}
                      onChange={(e) => wellsSort.setFilter("formationName", e.target.value)}
                      className="h-8 text-xs w-40"
                    />
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <SortableHeader col="name" label={t("name")} sort={wellsSort.sort} onToggle={wellsSort.toggleSort} />
                        <SortableHeader col="wellType" label={t("wellTypeLabel")} sort={wellsSort.sort} onToggle={wellsSort.toggleSort} />
                        <SortableHeader col="status" label={t("status")} sort={wellsSort.sort} onToggle={wellsSort.toggleSort} />
                        <SortableHeader col="depthCurrent" label={t("depthM")} sort={wellsSort.sort} onToggle={wellsSort.toggleSort} align="right" />
                        <SortableHeader col="formationName" label={t("modelsTabHorizons")} sort={wellsSort.sort} onToggle={wellsSort.toggleSort} />
                      </tr>
                    </thead>
                    <tbody>
                      {wellsSort.processed.map((w) => (
                        <tr key={w.id} className="border-b border-border/40 hover:bg-muted/20">
                          <td className="py-2 px-2 font-medium">{w.name}</td>
                          <td className="py-2 px-2 text-muted-foreground">
                            {w.wellType ? t(`wellType_${w.wellType}`) : "—"}
                          </td>
                          <td className="py-2 px-2">
                            {w.status ? (
                              <Badge className={statusStyles[w.status] ?? ""} variant="secondary">
                                {statusLabels[w.status] ?? w.status}
                              </Badge>
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="py-2 px-2 text-right font-mono">
                            {w.depthCurrent != null ? w.depthCurrent.toFixed(1) : "—"}
                          </td>
                          <td className="py-2 px-2 text-muted-foreground text-xs">{w.formationName ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {t("shownCount")} {wellsSort.processed.length} {t("shownOf")} {oilFieldWells.length}
                  </div>
                </>
              )}
            </TabsContent>

            {/* Objects (horizons) tab */}
            <TabsContent value="objects" className="flex-1 overflow-auto mt-3">
              {horizonsLoading ? (
                <div className="py-8 text-center text-muted-foreground text-sm">{t("loadingData")}</div>
              ) : oilFieldHorizons.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">{t("noObjectsData")}</div>
              ) : (
                <>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <SortableHeader col="name" label={t("name")} sort={horizonsSort.sort} onToggle={horizonsSort.toggleSort} />
                        <SortableHeader col="code" label={t("horizonCode")} sort={horizonsSort.sort} onToggle={horizonsSort.toggleSort} />
                        <SortableHeader col="depthTop" label={t("horizonDepthTop")} sort={horizonsSort.sort} onToggle={horizonsSort.toggleSort} align="right" />
                        <SortableHeader col="depthBottom" label={t("horizonDepthBot")} sort={horizonsSort.sort} onToggle={horizonsSort.toggleSort} align="right" />
                        <SortableHeader col="porosity" label={t("horizonPorosity")} sort={horizonsSort.sort} onToggle={horizonsSort.toggleSort} align="right" />
                        <SortableHeader col="permeability" label={t("horizonPermeability")} sort={horizonsSort.sort} onToggle={horizonsSort.toggleSort} align="right" />
                      </tr>
                    </thead>
                    <tbody>
                      {horizonsSort.processed.map((h) => (
                        <tr key={h.id} className="border-b border-border/40 hover:bg-muted/20">
                          <td className="py-2 px-2 font-medium">{translateData(h.name)}</td>
                          <td className="py-2 px-2 font-mono text-xs text-muted-foreground">{h.code ?? "—"}</td>
                          <td className="py-2 px-2 text-right font-mono">{h.depthTop ?? "—"}</td>
                          <td className="py-2 px-2 text-right font-mono">{h.depthBottom ?? "—"}</td>
                          <td className="py-2 px-2 text-right font-mono">{h.porosity != null ? h.porosity.toFixed(3) : "—"}</td>
                          <td className="py-2 px-2 text-right font-mono">{h.permeability != null ? h.permeability.toFixed(1) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {t("shownCount")} {horizonsSort.processed.length}
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* НГДУ detail dialog — list of oil fields */}
      <Dialog open={ngduDetailOpen} onOpenChange={setNgduDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {t("ngduTab")}
              {selectedNgdu && (
                <span className="text-muted-foreground font-normal text-sm">— {translateData(selectedNgdu.name)}</span>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Search bar */}
          <div className="relative max-w-xs shrink-0">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("searchMaster")}
              value={ngduSearch}
              onChange={(e) => setNgduSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>

          {/* Status filter */}
          <div className="shrink-0">
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
              value={ngduFieldsSort.colFilters["status"] ?? ""}
              onChange={(e) => ngduFieldsSort.setFilter("status", e.target.value)}
            >
              <option value="">{t("status")}: {t("statusAll")}</option>
              {Object.entries(statusLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 overflow-auto">
            {ngduOilFieldsLoading ? (
              <div className="py-10 text-center text-muted-foreground text-sm">{t("loadingData")}</div>
            ) : ngduOilFields.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">{t("noObjectsData")}</div>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <SortableHeader col="id" label={t("id")} sort={ngduFieldsSort.sort} onToggle={ngduFieldsSort.toggleSort} />
                      <SortableHeader col="code" label={t("code")} sort={ngduFieldsSort.sort} onToggle={ngduFieldsSort.toggleSort} />
                      <SortableHeader col="name" label={t("name")} sort={ngduFieldsSort.sort} onToggle={ngduFieldsSort.toggleSort} />
                      <SortableHeader col="shortName" label={t("shortName")} sort={ngduFieldsSort.sort} onToggle={ngduFieldsSort.toggleSort} />
                      <SortableHeader col="region" label={t("region")} sort={ngduFieldsSort.sort} onToggle={ngduFieldsSort.toggleSort} />
                      <SortableHeader col="capacity" label={t("capacity")} sort={ngduFieldsSort.sort} onToggle={ngduFieldsSort.toggleSort} align="right" />
                      <SortableHeader col="currentMonth" label={t("currentMonth")} sort={ngduFieldsSort.sort} onToggle={ngduFieldsSort.toggleSort} align="right" />
                      <SortableHeader col="currentDay" label={t("currentDay")} sort={ngduFieldsSort.sort} onToggle={ngduFieldsSort.toggleSort} align="right" />
                      <SortableHeader col="status" label={t("status")} sort={ngduFieldsSort.sort} onToggle={ngduFieldsSort.toggleSort} align="center" />
                    </tr>
                  </thead>
                  <tbody>
                    {ngduFieldsSort.processed
                      .filter((f) => {
                        const q = ngduSearch.trim().toLowerCase();
                        if (!q) return true;
                        return (
                          f.name.toLowerCase().includes(q) ||
                          f.code.toLowerCase().includes(q) ||
                          (f.shortName ?? "").toLowerCase().includes(q) ||
                          (f.region ?? "").toLowerCase().includes(q) ||
                          translateData(f.name).toLowerCase().includes(q)
                        );
                      })
                      .map((f) => (
                        <tr
                          key={f.id}
                          className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => {
                            setNgduDetailOpen(false);
                            handleOpenOilFieldDetail(f);
                          }}
                        >
                          <td className="py-2.5 px-2 text-muted-foreground font-mono text-xs">{f.id}</td>
                          <td className="py-2.5 px-2 font-mono text-xs">{f.code}</td>
                          <td className="py-2.5 px-2 font-medium">
                            <span className="flex items-center gap-1">
                              {translateData(f.name)}
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-muted-foreground">{f.shortName || "—"}</td>
                          <td className="py-2.5 px-2 text-muted-foreground">{f.region ? translateData(f.region) : "—"}</td>
                          <td className="py-2.5 px-2 text-right font-mono">{f.capacity.toLocaleString()}</td>
                          <td className="py-2.5 px-2 text-right font-mono">{f.currentMonth.toLocaleString()}</td>
                          <td className="py-2.5 px-2 text-right font-mono">{f.currentDay.toLocaleString()}</td>
                          <td className="py-2.5 px-2 text-center">
                            {f.status ? (
                              <Badge className={statusStyles[f.status] ?? ""} variant="secondary">
                                {statusLabels[f.status] ?? f.status}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                <div className="mt-3 text-xs text-muted-foreground">
                  {t("shownCount")} {ngduFieldsSort.processed.length} {t("shownOf")} {ngduOilFields.length} {t("shownRecords")}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog></>}
    </div>
  );
}

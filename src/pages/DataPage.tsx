import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { getAuthHeader } from "@/lib/auth";
import { useWorkspace } from "@/context/WorkspaceContext";

interface DataRow {
  id: number;
  entity: string;
  type: "Завод" | "Склад" | "Линия";
  capacity: number;
  govPlan: number;
  corpPlan: number;
  region: string;
  status: "active" | "maintenance" | "offline";
  processingPlantId?: number | null;
  transportationSectionId?: number | null;
  npsStationId?: number | null;
  oilFieldId?: number | null;
  extractionCompanyId?: number | null;
  transportationCompanyId?: number | null;
  processingPlantCode?: string | null;
  transportationSectionCode?: string | null;
  npsStationCode?: string | null;
  oilFieldCode?: string | null;
  extractionCompanyCode?: string | null;
  transportationCompanyCode?: string | null;
}

function getApiBase(): string {
  // Use relative /api - nginx will proxy to backend
  return "/api";
}

const statusStyles: Record<string, string> = {
  active: "bg-success/20 text-success",
  maintenance: "bg-accent/20 text-accent",
  offline: "bg-destructive/20 text-destructive",
};
const statusLabels: Record<string, string> = {
  active: "Активен",
  maintenance: "Обслуж.",
  offline: "Оффлайн",
};

const linkTypeToMasterKey: Record<string, string> = {
  processingPlant: "processing-plants",
  transportationSection: "transportation-sections",
  npsStation: "nps-stations",
  oilField: "oil-fields",
  extractionCompany: "extraction-companies",
  transportationCompany: "transportation-companies",
};

/** Встраиваемый контент без заголовка страницы — используется в MasterDataPage */
export function AssetsContent() {
  const { t, translateData } = useLanguage();
  const { activeCompanyId, isGlobalScope } = useWorkspace();
  const linkTypeLabels: Record<string, string> = {
    processingPlant: t("processingPlant"),
    transportationSection: t("transportationSection"),
    npsStation: t("npsStation"),
    oilField: t("oilField"),
    extractionCompany: t("extractionCompany"),
    transportationCompany: t("transportationCompany"),
  };
  const [allData, setAllData] = useState<DataRow[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [linkFilter, setLinkFilter] = useState<string>("all");
  const [linkCodeFilter, setLinkCodeFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const authHeader = getAuthHeader();

    async function loadEntities() {
      try {
        const response = await fetch(`${getApiBase()}/entities`, {
          headers: {
            "Content-Type": "application/json",
            ...(authHeader ? { Authorization: authHeader } : {}),
          },
          signal: controller.signal,
        });
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as DataRow[];
        setAllData(payload);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          // keep empty data on error
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadEntities();
    return () => controller.abort();
  }, []);

  // Filter by workspace: for "own"-scope show only entities matching extractionCompanyId OR no extractionCompanyId
  const workspaceFilteredData = useMemo(() => {
    if (isGlobalScope || activeCompanyId === null) return allData;
    return allData.filter(
      (r) =>
        r.extractionCompanyId === activeCompanyId ||
        r.extractionCompanyId == null
    );
  }, [allData, activeCompanyId, isGlobalScope]);

  const getLinkInfo = (row: DataRow) => {
    if (row.processingPlantCode) return { type: "processingPlant", code: row.processingPlantCode, id: row.processingPlantId };
    if (row.transportationSectionCode) return { type: "transportationSection", code: row.transportationSectionCode, id: row.transportationSectionId };
    if (row.npsStationCode) return { type: "npsStation", code: row.npsStationCode, id: row.npsStationId };
    if (row.oilFieldCode) return { type: "oilField", code: row.oilFieldCode, id: row.oilFieldId };
    if (row.extractionCompanyCode) return { type: "extractionCompany", code: row.extractionCompanyCode, id: row.extractionCompanyId };
    if (row.transportationCompanyCode) return { type: "transportationCompany", code: row.transportationCompanyCode, id: row.transportationCompanyId };
    return { type: "none", code: "", id: null };
  };

  const linkCodeOptions = useMemo(() => {
    if (linkFilter === "all") {
      return [];
    }
    const codes = new Set<string>();
    for (const row of workspaceFilteredData) {
      const info = getLinkInfo(row);
      if (info.type === linkFilter && info.code) {
        codes.add(info.code);
      }
    }
    return Array.from(codes).sort();
  }, [workspaceFilteredData, linkFilter]);

  useEffect(() => {
    setLinkCodeFilter("all");
  }, [linkFilter]);

  const filtered = workspaceFilteredData.filter((r) => {
    const linkInfo = getLinkInfo(r);
    const displayEntity = translateData(r.entity);
    const displayRegion = translateData(r.region);
    const haystack = [
      r.entity,
      r.region,
      displayEntity,
      displayRegion,
      r.type,
      linkInfo.code,
      linkTypeLabels[linkInfo.type] ?? "",
    ]
      .join(" ")
      .toLowerCase();
    const matchSearch = haystack.includes(search.toLowerCase());
    const matchType = typeFilter === "all" || r.type === typeFilter;
    const matchLink = linkFilter === "all" || linkInfo.type === linkFilter;
    const matchLinkCode = linkCodeFilter === "all" || linkInfo.code === linkCodeFilter;
    return matchSearch && matchType && matchLink && matchLinkCode;
  });

  const types = ["all", ...Array.from(new Set(workspaceFilteredData.map((r) => r.type)))];
  const linkTypes = ["all", ...Object.keys(linkTypeLabels)];

  return (
    <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-base">{t("allEntities")}</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("search")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 w-48"
                />
              </div>
              <div className="flex gap-1">
                {types.map((typeValue) => (
                  <Button
                    key={typeValue}
                    size="sm"
                    variant={typeFilter === typeValue ? "default" : "outline"}
                    onClick={() => setTypeFilter(typeValue)}
                    className="text-xs h-9"
                  >
                    {typeValue === "all" ? t("all") : typeValue}
                  </Button>
                ))}
              </div>
              <div className="flex gap-1">
                {linkTypes.map((linkValue) => (
                  <Button
                    key={linkValue}
                    size="sm"
                    variant={linkFilter === linkValue ? "default" : "outline"}
                    onClick={() => setLinkFilter(linkValue)}
                    className="text-xs h-9"
                  >
                    {linkValue === "all" ? t("allLinks") : linkTypeLabels[linkValue]}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t("linkCode")}</span>
                <select
                  className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                  value={linkCodeFilter}
                  onChange={(e) => setLinkCodeFilter(e.target.value)}
                  disabled={linkFilter === "all"}
                >
                  <option value="all">{t("all")}</option>
                  {linkCodeOptions.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-3 px-2 font-medium">{t("id")}</th>
                  <th className="text-left py-3 px-2 font-medium">{t("entity")}</th>
                  <th className="text-left py-3 px-2 font-medium">{t("linkType")}</th>
                  <th className="text-left py-3 px-2 font-medium">{t("code")}</th>
                  <th className="text-left py-3 px-2 font-medium">{t("type")}</th>
                  <th className="text-left py-3 px-2 font-medium">{t("region")}</th>
                  <th className="text-right py-3 px-2 font-medium">{t("capacity")}</th>
                  <th className="text-right py-3 px-2 font-medium">GOV</th>
                  <th className="text-right py-3 px-2 font-medium">CORP</th>
                  <th className="text-right py-3 px-2 font-medium">GAP</th>
                  <th className="text-center py-3 px-2 font-medium">{t("status")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const gap = row.capacity - row.govPlan - row.corpPlan;
                  const linkInfo = getLinkInfo(row);
                  return (
                    <tr key={row.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-2 text-muted-foreground font-mono text-xs">{row.id}</td>
                      <td className="py-2.5 px-2 font-medium">{translateData(row.entity)}</td>
                      <td className="py-2.5 px-2">
                        {linkInfo.type === "none" ? (
                          <span className="text-muted-foreground text-xs">—</span>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            {linkTypeLabels[linkInfo.type]}
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-2 font-mono text-xs">
                        {linkInfo.code ? (
                          <Link
                            className="text-primary hover:underline"
                            to={`/master-data?tab=${linkTypeToMasterKey[linkInfo.type]}&code=${encodeURIComponent(linkInfo.code)}`}
                          >
                            {linkInfo.code}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2.5 px-2">
                        <Badge variant="secondary" className="text-xs">{row.type}</Badge>
                      </td>
                      <td className="py-2.5 px-2 text-muted-foreground">{translateData(row.region)}</td>
                      <td className="py-2.5 px-2 text-right font-mono">{row.capacity.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-right font-mono">{row.govPlan.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-right font-mono">{row.corpPlan.toLocaleString()}</td>
                      <td className={`py-2.5 px-2 text-right font-mono font-medium ${gap < 0 ? "text-destructive" : "text-success"}`}>
                        {gap > 0 ? "+" : ""}{gap.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <Badge className={statusStyles[row.status]} variant="secondary">{statusLabels[row.status]}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            {isLoading ? t("loadingData") : `${t("shownCount")} ${filtered.length} ${t("shownOf")} ${allData.length} ${t("shownRecords")}`}
          </div>
        </CardContent>
      </Card>
  );
}

/** Страница /data — оставлена для обратной совместимости */
export default function DataPage() {
  const { t } = useLanguage();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("dataTitle")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("dataSubtitle")}</p>
      </div>
      <AssetsContent />
    </div>
  );
}

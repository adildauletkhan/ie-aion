import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { getAuthHeader } from "@/lib/auth";
import { useOilFields } from "@/hooks/useOilFields";

interface OilFieldRow {
  id: number;
  name: string;
  shortName?: string | null;
  region?: string | null;
  capacity?: number | null;
  extractionCompanyId?: number | null;
}

interface ExtractionCompanyRow {
  id: number;
  name: string;
  shortName?: string | null;
  region?: string | null;
}

interface BasinRow {
  id: number;
  name: string;
  region?: string | null;
}

interface GeoMetricRow {
  id: string;
  fieldId: number | "";
  companyId: number | "";
  basinId: number | "";
  waterCut: string;
  history: string;
  gtm: string;
}

interface DynamicIndicatorRow {
  id: string;
  fieldId: number | "";
  companyId: number | "";
  basinId: number | "";
  currentRate: string;
  planRate: string;
  declineRate: string;
  remainingReserves: string;
  horizonYears: string;
  recoveryFactor: string;
}

interface WellProfileRow {
  id: string;
  fieldId: number | "";
  wellNumber: string;
  status: string;
  currentRate: string;
  waterCut: string;
  pressure: string;
  lastWorkover: string;
  nextWorkover: string;
  capex: string;
}

interface QualityRow {
  id: string;
  fieldId: number | "";
  apiGravity: string;
  sulfur: string;
  viscosity: string;
  paraffin: string;
  waterImpurities: string;
  lightFractions: string;
}

interface LogisticsRow {
  id: string;
  fieldId: number | "";
  sections: string;
  capacity: string;
  distance: string;
  alternatives: string;
  capex: string;
}

interface SeasonalityRow {
  id: string;
  fieldId: number | "";
  seasonal: string;
  climate: string;
  availability: string;
  floodPlans: string;
}

interface EconomicsRow {
  id: string;
  fieldId: number | "";
  opex: string;
  breakeven: string;
  marginalCost: string;
  transportCost: string;
  npv: string;
}

interface ProjectRow {
  id: string;
  fieldId: number | "";
  projectType: string;
  startDate: string;
  uplift: string;
  capex: string;
  status: string;
}

interface FinanceRow {
  id: string;
  fieldId: number | "";
  revenueMtd: string;
  revenueYtd: string;
  ebitda: string;
  share: string;
  sensitivity: string;
}

interface ComplianceRow {
  id: string;
  fieldId: number | "";
  license: string;
  licenseExpiry: string;
  quotas: string;
  ecoLimits: string;
  approvals: string;
}

interface DownstreamRow {
  id: string;
  fieldId: number | "";
  refineries: string;
  blend: string;
  margin: string;
  transportCost: string;
}

interface RealtimeRow {
  id: string;
  fieldId: number | "";
  realtimeRate: string;
  deviation: string;
  alerts: string;
  lastUpdate: string;
}

interface HistoryRow {
  id: string;
  fieldId: number | "";
  trend: string;
  forecast: string;
  variance: string;
  benchmarking: string;
}

function getApiBase(): string {
  // Use relative /api - nginx will proxy to backend
  return "/api";
}

const Index = () => {
  const { t, translateData } = useLanguage();
  const { oilFields: fields } = useOilFields();
  const [companies, setCompanies] = useState<ExtractionCompanyRow[]>([]);
  const [basins, setBasins] = useState<BasinRow[]>([]);
  const [search, setSearch] = useState("");
  const [metrics, setMetrics] = useState<GeoMetricRow[]>([]);
  const [dynamicIndicators, setDynamicIndicators] = useState<DynamicIndicatorRow[]>([]);
  const [wellProfiles, setWellProfiles] = useState<WellProfileRow[]>([]);
  const [qualities, setQualities] = useState<QualityRow[]>([]);
  const [logistics, setLogistics] = useState<LogisticsRow[]>([]);
  const [seasonality, setSeasonality] = useState<SeasonalityRow[]>([]);
  const [economics, setEconomics] = useState<EconomicsRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [finances, setFinances] = useState<FinanceRow[]>([]);
  const [compliance, setCompliance] = useState<ComplianceRow[]>([]);
  const [downstream, setDownstream] = useState<DownstreamRow[]>([]);
  const [realtime, setRealtime] = useState<RealtimeRow[]>([]);
  const [historyAnalytics, setHistoryAnalytics] = useState<HistoryRow[]>([]);
  const [draft, setDraft] = useState<GeoMetricRow>({
    id: crypto.randomUUID(),
    fieldId: "",
    companyId: "",
    basinId: "",
    waterCut: "",
    history: "",
    gtm: "",
  });
  const [dynamicDraft, setDynamicDraft] = useState<DynamicIndicatorRow>({
    id: crypto.randomUUID(),
    fieldId: "",
    companyId: "",
    basinId: "",
    currentRate: "",
    planRate: "",
    declineRate: "",
    remainingReserves: "",
    horizonYears: "",
    recoveryFactor: "",
  });
  const [wellDraft, setWellDraft] = useState<WellProfileRow>({
    id: crypto.randomUUID(),
    fieldId: "",
    wellNumber: "",
    status: "",
    currentRate: "",
    waterCut: "",
    pressure: "",
    lastWorkover: "",
    nextWorkover: "",
    capex: "",
  });
  const [qualityDraft, setQualityDraft] = useState<QualityRow>({
    id: crypto.randomUUID(),
    fieldId: "",
    apiGravity: "",
    sulfur: "",
    viscosity: "",
    paraffin: "",
    waterImpurities: "",
    lightFractions: "",
  });
  const [logisticsDraft, setLogisticsDraft] = useState<LogisticsRow>({
    id: crypto.randomUUID(),
    fieldId: "",
    sections: "",
    capacity: "",
    distance: "",
    alternatives: "",
    capex: "",
  });
  const [seasonalityDraft, setSeasonalityDraft] = useState<SeasonalityRow>({
    id: crypto.randomUUID(),
    fieldId: "",
    seasonal: "",
    climate: "",
    availability: "",
    floodPlans: "",
  });
  const [economicsDraft, setEconomicsDraft] = useState<EconomicsRow>({
    id: crypto.randomUUID(),
    fieldId: "",
    opex: "",
    breakeven: "",
    marginalCost: "",
    transportCost: "",
    npv: "",
  });
  const [projectDraft, setProjectDraft] = useState<ProjectRow>({
    id: crypto.randomUUID(),
    fieldId: "",
    projectType: "",
    startDate: "",
    uplift: "",
    capex: "",
    status: "",
  });
  const [financeDraft, setFinanceDraft] = useState<FinanceRow>({
    id: crypto.randomUUID(),
    fieldId: "",
    revenueMtd: "",
    revenueYtd: "",
    ebitda: "",
    share: "",
    sensitivity: "",
  });
  const [complianceDraft, setComplianceDraft] = useState<ComplianceRow>({
    id: crypto.randomUUID(),
    fieldId: "",
    license: "",
    licenseExpiry: "",
    quotas: "",
    ecoLimits: "",
    approvals: "",
  });
  const [downstreamDraft, setDownstreamDraft] = useState<DownstreamRow>({
    id: crypto.randomUUID(),
    fieldId: "",
    refineries: "",
    blend: "",
    margin: "",
    transportCost: "",
  });
  const [realtimeDraft, setRealtimeDraft] = useState<RealtimeRow>({
    id: crypto.randomUUID(),
    fieldId: "",
    realtimeRate: "",
    deviation: "",
    alerts: "",
    lastUpdate: "",
  });
  const [historyDraft, setHistoryDraft] = useState<HistoryRow>({
    id: crypto.randomUUID(),
    fieldId: "",
    trend: "",
    forecast: "",
    variance: "",
    benchmarking: "",
  });

  useEffect(() => {
    const controller = new AbortController();
    const authHeader = getAuthHeader();
    const loadList = async (path: string) => {
      const response = await fetch(`${getApiBase()}${path}`, {
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        signal: controller.signal,
      });
      if (!response.ok) return [];
      return (await response.json()) as any[];
    };
    const load = async () => {
      const extractionCompanies = await loadList("/master-data/extraction-companies");
      setCompanies(extractionCompanies);
      setBasins([
        { id: 1, name: "Каспийский бассейн", region: "Каспий" },
        { id: 2, name: "Западно-Казахстанский бассейн", region: "Запад" },
        { id: 3, name: "Тургайский бассейн", region: "Центр" },
      ]);
    };
    load();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!fields.length || !companies.length || !basins.length) return;
    const findCompany = (needle: string) =>
      companies.find((item) => item.name.toLowerCase().includes(needle.toLowerCase()))?.id ?? companies[0]?.id ?? 0;
    const basinByName = (needle: string) =>
      basins.find((item) => item.name.toLowerCase().includes(needle.toLowerCase()))?.id ?? basins[0]?.id ?? 0;
    const basinByField = (field: OilFieldRow, index: number) => {
      const region = (field.region ?? "").toLowerCase();
      if (region.includes("атырау") || region.includes("касп")) {
        return basinByName("Каспий");
      }
      if (region.includes("зко") || region.includes("запад")) {
        return basinByName("Запад");
      }
      if (region.includes("акты") || region.includes("кызыл") || region.includes("центр")) {
        return basinByName("Тургай");
      }
      return basins[index % basins.length]?.id ?? basins[0]?.id ?? 0;
    };
    const companyByField = (field: OilFieldRow) =>
      field.extractionCompanyId ?? findCompany(field.name);
    const fieldCode = (field: OilFieldRow) =>
      (field.shortName || field.name || "FIELD")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase()
        .slice(0, 4) || "FIELD";
    const fieldsWithMeta = fields.map((field, index) => ({
      field,
      index,
      companyId: companyByField(field),
      basinId: basinByField(field, index),
    }));

    if (dynamicIndicators.length === 0) {
      setDynamicIndicators(
        fieldsWithMeta.map(({ field, index, companyId, basinId }) => {
          const capacity = field.capacity ?? 12000;
          const currentRate = Math.max(120, Math.round(capacity / 12));
          const planRate = `${currentRate}/${Math.max(90, currentRate - 40)}/${Math.max(70, currentRate - 80)}/${Math.max(60, currentRate - 120)}`;
          return {
            id: crypto.randomUUID(),
            fieldId: field.id,
            companyId,
            basinId,
            currentRate: String(currentRate),
            planRate,
            declineRate: String(3 + (index % 4)),
            remainingReserves: String(Math.round(capacity * 1.8)),
            horizonYears: String(18 + (index % 10)),
            recoveryFactor: String(38 + (index % 12)),
          };
        })
      );
    }

    if (wellProfiles.length === 0) {
      setWellProfiles(
        fieldsWithMeta.flatMap(({ field, index }) => {
          const code = fieldCode(field);
          const baseRate = Math.max(60, Math.round((field.capacity ?? 8000) / 120));
          return [
            {
              id: crypto.randomUUID(),
              fieldId: field.id,
              wellNumber: `${code}-${String(index + 1).padStart(2, "0")}1`,
              status: "Активная",
              currentRate: String(baseRate + 40),
              waterCut: String(15 + (index % 15)),
              pressure: String(220 + (index % 30)),
              lastWorkover: "2025-07-10",
              nextWorkover: "2026-07-05",
              capex: "0.9 млн $",
            },
            {
              id: crypto.randomUUID(),
              fieldId: field.id,
              wellNumber: `${code}-${String(index + 1).padStart(2, "0")}2`,
              status: index % 3 === 0 ? "Консервация" : "Активная",
              currentRate: String(Math.max(0, baseRate - 10)),
              waterCut: String(20 + (index % 20)),
              pressure: String(200 + (index % 25)),
              lastWorkover: "2024-12-05",
              nextWorkover: "2026-03-20",
              capex: "0.6 млн $",
            },
          ];
        })
      );
    }

    if (qualities.length === 0) {
      setQualities(
        fieldsWithMeta.map(({ field, index }) => ({
          id: crypto.randomUUID(),
          fieldId: field.id,
          apiGravity: String(36 + (index % 10)),
          sulfur: (0.4 + (index % 6) * 0.15).toFixed(2),
          viscosity: (3 + (index % 6) * 0.4).toFixed(1),
          paraffin: (2 + (index % 5) * 0.3).toFixed(1),
          waterImpurities: (0.2 + (index % 5) * 0.1).toFixed(1),
          lightFractions: String(52 + (index % 10)),
        }))
      );
    }

    if (logistics.length === 0) {
      setLogistics(
        fieldsWithMeta.map(({ field, index }) => ({
          id: crypto.randomUUID(),
          fieldId: field.id,
          sections: index % 2 === 0 ? "КТК, Атырау–Самара" : "КТК, Кенкияк–Кумколь",
          capacity: `${2000 + index * 80} тыс. т/мес`,
          distance: String(90 + index * 15),
          alternatives: index % 2 === 0 ? "Ж/д на Атырау" : "Танкеры через Актау",
          capex: `${70 + index * 8} млн $`,
        }))
      );
    }

    if (seasonality.length === 0) {
      setSeasonality(
        fieldsWithMeta.map(({ field, index }) => ({
          id: crypto.randomUUID(),
          fieldId: field.id,
          seasonal: index % 2 === 0 ? "Зимой снижение дебита на 8-12%" : "Низкая сезонность",
          climate: index % 2 === 0 ? "Штормы, ледовая обстановка" : "Пыльные бури, жара",
          availability: index % 2 === 0 ? "Ограничения 2-3 месяца" : "Доступ круглогодичный",
          floodPlans: index % 2 === 0 ? "Усиление береговых сооружений" : "Плановые ревизии дамб",
        }))
      );
    }

    if (economics.length === 0) {
      setEconomics(
        fieldsWithMeta.map(({ field, index }) => ({
          id: crypto.randomUUID(),
          fieldId: field.id,
          opex: (6.5 + (index % 6) * 0.7).toFixed(1),
          breakeven: String(30 + (index % 8) * 2),
          marginalCost: String(16 + (index % 7) * 2),
          transportCost: String(5 + (index % 5)),
          npv: `${3.2 + (index % 6) * 0.6} млрд $`,
        }))
      );
    }

    if (projects.length === 0) {
      setProjects(
        fieldsWithMeta.map(({ field, index }) => ({
          id: crypto.randomUUID(),
          fieldId: field.id,
          projectType: index % 2 === 0 ? "ГРП" : "Закачка газа",
          startDate: index % 2 === 0 ? "2026-03-01" : "2026-06-15",
          uplift: `+${80 + index * 6} тыс. т/мес`,
          capex: `${35 + index * 4} млн $`,
          status: index % 3 === 0 ? "В бурении" : "В планах",
        }))
      );
    }

    if (finances.length === 0) {
      setFinances(
        fieldsWithMeta.map(({ field, index }) => ({
          id: crypto.randomUUID(),
          fieldId: field.id,
          revenueMtd: `${220 + index * 40} млн $`,
          revenueYtd: `${2.0 + index * 0.4} млрд $`,
          ebitda: `${1.0 + index * 0.25} млрд $`,
          share: String(12 + index * 2),
          sensitivity: `±${50 + index * 6} млн $/ $1`,
        }))
      );
    }

    if (compliance.length === 0) {
      setCompliance(
        fieldsWithMeta.map(({ field, index }) => ({
          id: crypto.randomUUID(),
          fieldId: field.id,
          license: `KZ-${String(2001 + index)}-${String(40 + index).padStart(3, "0")}`,
          licenseExpiry: `203${(index % 5) + 0}-12-31`,
          quotas: index % 2 === 0 ? "Без ограничений" : "Норматив ПНГ 95%",
          ecoLimits: index % 2 === 0 ? "CO2 ≤ 1.2 млн т/год" : "SOx ≤ 12 тыс. т/год",
          approvals: index % 3 === 0 ? "Согласовано (МПР)" : "Требует продления",
        }))
      );
    }

    if (downstream.length === 0) {
      setDownstream(
        fieldsWithMeta.map(({ field, index }) => ({
          id: crypto.randomUUID(),
          fieldId: field.id,
          refineries: index % 2 === 0 ? "АНПЗ, ПНХЗ" : "АНПЗ, ШНПЗ",
          blend: index % 2 === 0 ? "Blend A 70% + Blend B 30%" : "Blend B 60% + Blend C 40%",
          margin: `${8 + (index % 5)} $/баррель`,
          transportCost: `${6 + (index % 4)} $/баррель`,
        }))
      );
    }

    if (realtime.length === 0) {
      setRealtime(
        fieldsWithMeta.map(({ field, index }) => ({
          id: crypto.randomUUID(),
          fieldId: field.id,
          realtimeRate: `${1.0 + index * 0.15} тыс. т/сут`,
          deviation: index % 2 === 0 ? "+2%" : "-1%",
          alerts: index % 4 === 0 ? "OK" : "Нет",
          lastUpdate: "2026-02-09 14:30",
        }))
      );
    }

    if (historyAnalytics.length === 0) {
      setHistoryAnalytics(
        fieldsWithMeta.map(({ field, index }) => ({
          id: crypto.randomUUID(),
          fieldId: field.id,
          trend: index % 2 === 0 ? "CAGR +2.0%" : "Снижение -2.5%",
          forecast: index % 2 === 0 ? "Стабильный 12 мес" : "Плавное снижение",
          variance: index % 2 === 0 ? "-1.5% к плану" : "-3.0% к плану",
          benchmarking: index % 3 === 0 ? "Топ-10% по региону" : "Средний по региону",
        }))
      );
    }
  }, [fields, companies, basins]);

  const filteredMetrics = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return metrics;
    return metrics.filter((row) => {
      const field = fields.find((f) => f.id === row.fieldId)?.name ?? "";
      const company = companies.find((c) => c.id === row.companyId)?.name ?? "";
      const basin = basins.find((b) => b.id === row.basinId)?.name ?? "";
      return (
        field.toLowerCase().includes(q) ||
        company.toLowerCase().includes(q) ||
        basin.toLowerCase().includes(q) ||
        row.history.toLowerCase().includes(q) ||
        row.gtm.toLowerCase().includes(q)
      );
    });
  }, [metrics, search, fields, companies, basins]);

  const handleAdd = () => {
    if (!draft.fieldId || !draft.companyId || !draft.basinId) return;
    setMetrics((prev) => [draft, ...prev]);
    setDraft({
      id: crypto.randomUUID(),
      fieldId: "",
      companyId: "",
      basinId: "",
      waterCut: "",
      history: "",
      gtm: "",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("geologyTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("geologySubtitle")}</p>
        </div>
        <Button asChild size="sm" disabled={!fields.length}>
          <Link to={`/field-schemes/new?oilFieldId=${fields[0]?.id ?? ""}`}>
            Открыть технологическую карту
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="dynamic">
        <TabsList className="flex flex-wrap h-auto gap-2">
          <TabsTrigger value="dynamic">{t("geoDynamicTab")}</TabsTrigger>
          <TabsTrigger value="wells">{t("geoWellsTab")}</TabsTrigger>
          <TabsTrigger value="quality">{t("geoQualityTab")}</TabsTrigger>
          <TabsTrigger value="logistics">{t("geoLogisticsTab")}</TabsTrigger>
          <TabsTrigger value="season">{t("geoSeasonTab")}</TabsTrigger>
          <TabsTrigger value="economy">{t("geoEconomyTab")}</TabsTrigger>
          <TabsTrigger value="projects">{t("geoProjectsTab")}</TabsTrigger>
          <TabsTrigger value="finance">{t("geoFinanceTab")}</TabsTrigger>
          <TabsTrigger value="compliance">{t("geoComplianceTab")}</TabsTrigger>
          <TabsTrigger value="downstream">{t("geoDownstreamTab")}</TabsTrigger>
          <TabsTrigger value="realtime">{t("geoRealtimeTab")}</TabsTrigger>
          <TabsTrigger value="history">{t("geoHistoryTab")}</TabsTrigger>
        </TabsList>

        <TabsContent value="dynamic">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("geoDynamicTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("oilField")}</label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={dynamicDraft.fieldId}
                    onChange={(e) => setDynamicDraft((prev) => ({ ...prev, fieldId: Number(e.target.value) }))}
                  >
                    <option value="">{t("selectField")}</option>
                    {fields.map((item) => (
                      <option key={item.id} value={item.id}>
                        {translateData(item.name)} {item.shortName ? `(${item.shortName})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("extractionCompany")}</label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={dynamicDraft.companyId}
                    onChange={(e) => setDynamicDraft((prev) => ({ ...prev, companyId: Number(e.target.value) }))}
                  >
                    <option value="">{t("selectCompany")}</option>
                    {companies.map((item) => (
                      <option key={item.id} value={item.id}>
                        {translateData(item.name)} {item.shortName ? `(${item.shortName})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("basin")}</label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={dynamicDraft.basinId}
                    onChange={(e) => setDynamicDraft((prev) => ({ ...prev, basinId: Number(e.target.value) }))}
                  >
                    <option value="">{t("selectBasin")}</option>
                    {basins.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("currentRate")}</label>
                  <Input
                    value={dynamicDraft.currentRate}
                    onChange={(e) => setDynamicDraft((prev) => ({ ...prev, currentRate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("planRate")}</label>
                  <Input
                    value={dynamicDraft.planRate}
                    onChange={(e) => setDynamicDraft((prev) => ({ ...prev, planRate: e.target.value }))}
                    placeholder={t("planRatePlaceholder")}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("declineRate")}</label>
                  <Input
                    value={dynamicDraft.declineRate}
                    onChange={(e) => setDynamicDraft((prev) => ({ ...prev, declineRate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("remainingReserves")}</label>
                  <Input
                    value={dynamicDraft.remainingReserves}
                    onChange={(e) => setDynamicDraft((prev) => ({ ...prev, remainingReserves: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("horizonYears")}</label>
                  <Input
                    value={dynamicDraft.horizonYears}
                    onChange={(e) => setDynamicDraft((prev) => ({ ...prev, horizonYears: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("recoveryFactor")}</label>
                  <Input
                    value={dynamicDraft.recoveryFactor}
                    onChange={(e) => setDynamicDraft((prev) => ({ ...prev, recoveryFactor: e.target.value }))}
                  />
                </div>
              </div>
              <Button
                onClick={() => {
                  if (!dynamicDraft.fieldId) return;
                  setDynamicIndicators((prev) => [dynamicDraft, ...prev]);
                  setDynamicDraft({
                    id: crypto.randomUUID(),
                    fieldId: "",
                    companyId: "",
                    basinId: "",
                    currentRate: "",
                    planRate: "",
                    declineRate: "",
                    remainingReserves: "",
                    horizonYears: "",
                    recoveryFactor: "",
                  });
                }}
              >
                {t("addRecord")}
              </Button>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 px-2">{t("oilField")}</th>
                      <th className="text-left py-2 px-2">{t("currentRate")}</th>
                      <th className="text-left py-2 px-2">{t("planRate")}</th>
                      <th className="text-left py-2 px-2">{t("declineRate")}</th>
                      <th className="text-left py-2 px-2">{t("remainingReserves")}</th>
                      <th className="text-left py-2 px-2">{t("horizonYears")}</th>
                      <th className="text-left py-2 px-2">{t("recoveryFactor")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dynamicIndicators.map((row) => {
                      const field = fields.find((f) => f.id === row.fieldId);
                      return (
                        <tr key={row.id} className="border-b border-border/50">
                          <td className="py-2 px-2">{field ? translateData(field.name) : "—"}</td>
                          <td className="py-2 px-2">{row.currentRate || "—"}</td>
                          <td className="py-2 px-2">{row.planRate || "—"}</td>
                          <td className="py-2 px-2">{row.declineRate || "—"}</td>
                          <td className="py-2 px-2">{row.remainingReserves || "—"}</td>
                          <td className="py-2 px-2">{row.horizonYears || "—"}</td>
                          <td className="py-2 px-2">{row.recoveryFactor || "—"}</td>
                        </tr>
                      );
                    })}
                    {dynamicIndicators.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-4 text-center text-xs text-muted-foreground">
                          {t("noGeoData")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wells">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("geoWellsTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("oilField")}</label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={wellDraft.fieldId}
                    onChange={(e) => setWellDraft((prev) => ({ ...prev, fieldId: Number(e.target.value) }))}
                  >
                    <option value="">{t("selectField")}</option>
                    {fields.map((item) => (
                      <option key={item.id} value={item.id}>
                        {translateData(item.name)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("wellNumber")}</label>
                  <Input
                    value={wellDraft.wellNumber}
                    onChange={(e) => setWellDraft((prev) => ({ ...prev, wellNumber: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("wellStatus")}</label>
                  <Input
                    value={wellDraft.status}
                    onChange={(e) => setWellDraft((prev) => ({ ...prev, status: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("wellRate")}</label>
                  <Input
                    value={wellDraft.currentRate}
                    onChange={(e) => setWellDraft((prev) => ({ ...prev, currentRate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("waterCut")}</label>
                  <Input
                    value={wellDraft.waterCut}
                    onChange={(e) => setWellDraft((prev) => ({ ...prev, waterCut: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("pressure")}</label>
                  <Input
                    value={wellDraft.pressure}
                    onChange={(e) => setWellDraft((prev) => ({ ...prev, pressure: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("capexSupport")}</label>
                  <Input
                    value={wellDraft.capex}
                    onChange={(e) => setWellDraft((prev) => ({ ...prev, capex: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("lastWorkover")}</label>
                  <Input
                    value={wellDraft.lastWorkover}
                    onChange={(e) => setWellDraft((prev) => ({ ...prev, lastWorkover: e.target.value }))}
                    placeholder={t("datePlaceholder")}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("nextWorkover")}</label>
                  <Input
                    value={wellDraft.nextWorkover}
                    onChange={(e) => setWellDraft((prev) => ({ ...prev, nextWorkover: e.target.value }))}
                    placeholder={t("datePlaceholder")}
                  />
                </div>
              </div>
              <Button
                onClick={() => {
                  if (!wellDraft.fieldId || !wellDraft.wellNumber) return;
                  setWellProfiles((prev) => [wellDraft, ...prev]);
                  setWellDraft({
                    id: crypto.randomUUID(),
                    fieldId: "",
                    wellNumber: "",
                    status: "",
                    currentRate: "",
                    waterCut: "",
                    pressure: "",
                    lastWorkover: "",
                    nextWorkover: "",
                    capex: "",
                  });
                }}
              >
                {t("addRecord")}
              </Button>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 px-2">{t("wellNumber")}</th>
                      <th className="text-left py-2 px-2">{t("wellStatus")}</th>
                      <th className="text-left py-2 px-2">{t("wellRate")}</th>
                      <th className="text-left py-2 px-2">{t("waterCut")}</th>
                      <th className="text-left py-2 px-2">{t("pressure")}</th>
                      <th className="text-left py-2 px-2">{t("lastWorkover")}</th>
                      <th className="text-left py-2 px-2">{t("nextWorkover")}</th>
                      <th className="text-left py-2 px-2">{t("capexSupport")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wellProfiles.map((row) => (
                      <tr key={row.id} className="border-b border-border/50">
                        <td className="py-2 px-2">{row.wellNumber}</td>
                        <td className="py-2 px-2">{row.status || "—"}</td>
                        <td className="py-2 px-2">{row.currentRate || "—"}</td>
                        <td className="py-2 px-2">{row.waterCut || "—"}</td>
                        <td className="py-2 px-2">{row.pressure || "—"}</td>
                        <td className="py-2 px-2">{row.lastWorkover || "—"}</td>
                        <td className="py-2 px-2">{row.nextWorkover || "—"}</td>
                        <td className="py-2 px-2">{row.capex || "—"}</td>
                      </tr>
                    ))}
                    {wellProfiles.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-4 text-center text-xs text-muted-foreground">
                          {t("noGeoData")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("geoQualityTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("oilField")}</label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={qualityDraft.fieldId}
                    onChange={(e) => setQualityDraft((prev) => ({ ...prev, fieldId: Number(e.target.value) }))}
                  >
                    <option value="">{t("selectField")}</option>
                    {fields.map((item) => (
                      <option key={item.id} value={item.id}>
                        {translateData(item.name)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">API gravity</label>
                  <Input
                    value={qualityDraft.apiGravity}
                    onChange={(e) => setQualityDraft((prev) => ({ ...prev, apiGravity: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("sulfur")}</label>
                  <Input
                    value={qualityDraft.sulfur}
                    onChange={(e) => setQualityDraft((prev) => ({ ...prev, sulfur: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("viscosity")}</label>
                  <Input
                    value={qualityDraft.viscosity}
                    onChange={(e) => setQualityDraft((prev) => ({ ...prev, viscosity: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("paraffin")}</label>
                  <Input
                    value={qualityDraft.paraffin}
                    onChange={(e) => setQualityDraft((prev) => ({ ...prev, paraffin: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("waterImpurities")}</label>
                  <Input
                    value={qualityDraft.waterImpurities}
                    onChange={(e) => setQualityDraft((prev) => ({ ...prev, waterImpurities: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("lightFractions")}</label>
                  <Input
                    value={qualityDraft.lightFractions}
                    onChange={(e) => setQualityDraft((prev) => ({ ...prev, lightFractions: e.target.value }))}
                  />
                </div>
              </div>
              <Button
                onClick={() => {
                  if (!qualityDraft.fieldId) return;
                  setQualities((prev) => [qualityDraft, ...prev]);
                  setQualityDraft({
                    id: crypto.randomUUID(),
                    fieldId: "",
                    apiGravity: "",
                    sulfur: "",
                    viscosity: "",
                    paraffin: "",
                    waterImpurities: "",
                    lightFractions: "",
                  });
                }}
              >
                {t("addRecord")}
              </Button>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 px-2">{t("oilField")}</th>
                      <th className="text-left py-2 px-2">API</th>
                      <th className="text-left py-2 px-2">{t("sulfur")}</th>
                      <th className="text-left py-2 px-2">{t("viscosity")}</th>
                      <th className="text-left py-2 px-2">{t("paraffin")}</th>
                      <th className="text-left py-2 px-2">{t("waterImpurities")}</th>
                      <th className="text-left py-2 px-2">{t("lightFractions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {qualities.map((row) => {
                      const field = fields.find((f) => f.id === row.fieldId);
                      return (
                        <tr key={row.id} className="border-b border-border/50">
                          <td className="py-2 px-2">{field ? translateData(field.name) : "—"}</td>
                          <td className="py-2 px-2">{row.apiGravity || "—"}</td>
                          <td className="py-2 px-2">{row.sulfur || "—"}</td>
                          <td className="py-2 px-2">{row.viscosity || "—"}</td>
                          <td className="py-2 px-2">{row.paraffin || "—"}</td>
                          <td className="py-2 px-2">{row.waterImpurities || "—"}</td>
                          <td className="py-2 px-2">{row.lightFractions || "—"}</td>
                        </tr>
                      );
                    })}
                    {qualities.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-4 text-center text-xs text-muted-foreground">
                          {t("noGeoData")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logistics">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("geoLogisticsTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("oilField")}</label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={logisticsDraft.fieldId}
                    onChange={(e) => setLogisticsDraft((prev) => ({ ...prev, fieldId: Number(e.target.value) }))}
                  >
                    <option value="">{t("selectField")}</option>
                    {fields.map((item) => (
                      <option key={item.id} value={item.id}>
                        {translateData(item.name)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("logisticsSections")}</label>
                  <Input
                    value={logisticsDraft.sections}
                    onChange={(e) => setLogisticsDraft((prev) => ({ ...prev, sections: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("logisticsCapacity")}</label>
                  <Input
                    value={logisticsDraft.capacity}
                    onChange={(e) => setLogisticsDraft((prev) => ({ ...prev, capacity: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("logisticsDistance")}</label>
                  <Input
                    value={logisticsDraft.distance}
                    onChange={(e) => setLogisticsDraft((prev) => ({ ...prev, distance: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("logisticsAlt")}</label>
                  <Input
                    value={logisticsDraft.alternatives}
                    onChange={(e) => setLogisticsDraft((prev) => ({ ...prev, alternatives: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("capex")}</label>
                  <Input
                    value={logisticsDraft.capex}
                    onChange={(e) => setLogisticsDraft((prev) => ({ ...prev, capex: e.target.value }))}
                  />
                </div>
              </div>
              <Button
                onClick={() => {
                  if (!logisticsDraft.fieldId) return;
                  setLogistics((prev) => [logisticsDraft, ...prev]);
                  setLogisticsDraft({
                    id: crypto.randomUUID(),
                    fieldId: "",
                    sections: "",
                    capacity: "",
                    distance: "",
                    alternatives: "",
                    capex: "",
                  });
                }}
              >
                {t("addRecord")}
              </Button>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 px-2">{t("oilField")}</th>
                      <th className="text-left py-2 px-2">{t("logisticsSections")}</th>
                      <th className="text-left py-2 px-2">{t("logisticsCapacity")}</th>
                      <th className="text-left py-2 px-2">{t("logisticsDistance")}</th>
                      <th className="text-left py-2 px-2">{t("logisticsAlt")}</th>
                      <th className="text-left py-2 px-2">{t("capex")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logistics.map((row) => {
                      const field = fields.find((f) => f.id === row.fieldId);
                      return (
                        <tr key={row.id} className="border-b border-border/50">
                          <td className="py-2 px-2">{field ? translateData(field.name) : "—"}</td>
                          <td className="py-2 px-2">{row.sections || "—"}</td>
                          <td className="py-2 px-2">{row.capacity || "—"}</td>
                          <td className="py-2 px-2">{row.distance || "—"}</td>
                          <td className="py-2 px-2">{row.alternatives || "—"}</td>
                          <td className="py-2 px-2">{row.capex || "—"}</td>
                        </tr>
                      );
                    })}
                    {logistics.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-xs text-muted-foreground">
                          {t("noGeoData")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="season">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("geoSeasonTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("oilField")}</label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={seasonalityDraft.fieldId}
                    onChange={(e) => setSeasonalityDraft((prev) => ({ ...prev, fieldId: Number(e.target.value) }))}
                  >
                    <option value="">{t("selectField")}</option>
                    {fields.map((item) => (
                      <option key={item.id} value={item.id}>
                        {translateData(item.name)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("seasonalImpact")}</label>
                  <Input
                    value={seasonalityDraft.seasonal}
                    onChange={(e) => setSeasonalityDraft((prev) => ({ ...prev, seasonal: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("climateRisks")}</label>
                  <Input
                    value={seasonalityDraft.climate}
                    onChange={(e) => setSeasonalityDraft((prev) => ({ ...prev, climate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("infraAvailability")}</label>
                  <Input
                    value={seasonalityDraft.availability}
                    onChange={(e) => setSeasonalityDraft((prev) => ({ ...prev, availability: e.target.value }))}
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs text-muted-foreground">{t("floodPlans")}</label>
                  <Textarea
                    value={seasonalityDraft.floodPlans}
                    onChange={(e) => setSeasonalityDraft((prev) => ({ ...prev, floodPlans: e.target.value }))}
                    className="min-h-[72px]"
                  />
                </div>
              </div>
              <Button
                onClick={() => {
                  if (!seasonalityDraft.fieldId) return;
                  setSeasonality((prev) => [seasonalityDraft, ...prev]);
                  setSeasonalityDraft({
                    id: crypto.randomUUID(),
                    fieldId: "",
                    seasonal: "",
                    climate: "",
                    availability: "",
                    floodPlans: "",
                  });
                }}
              >
                {t("addRecord")}
              </Button>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 px-2">{t("oilField")}</th>
                      <th className="text-left py-2 px-2">{t("seasonalImpact")}</th>
                      <th className="text-left py-2 px-2">{t("climateRisks")}</th>
                      <th className="text-left py-2 px-2">{t("infraAvailability")}</th>
                      <th className="text-left py-2 px-2">{t("floodPlans")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seasonality.map((row) => {
                      const field = fields.find((f) => f.id === row.fieldId);
                      return (
                        <tr key={row.id} className="border-b border-border/50">
                          <td className="py-2 px-2">{field ? translateData(field.name) : "—"}</td>
                          <td className="py-2 px-2">{row.seasonal || "—"}</td>
                          <td className="py-2 px-2">{row.climate || "—"}</td>
                          <td className="py-2 px-2">{row.availability || "—"}</td>
                          <td className="py-2 px-2">{row.floodPlans || "—"}</td>
                        </tr>
                      );
                    })}
                    {seasonality.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-xs text-muted-foreground">
                          {t("noGeoData")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="economy">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("geoEconomyTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("oilField")}</label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={economicsDraft.fieldId}
                    onChange={(e) => setEconomicsDraft((prev) => ({ ...prev, fieldId: Number(e.target.value) }))}
                  >
                    <option value="">{t("selectField")}</option>
                    {fields.map((item) => (
                      <option key={item.id} value={item.id}>
                        {translateData(item.name)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("opex")}</label>
                  <Input value={economicsDraft.opex} onChange={(e) => setEconomicsDraft((prev) => ({ ...prev, opex: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("breakeven")}</label>
                  <Input
                    value={economicsDraft.breakeven}
                    onChange={(e) => setEconomicsDraft((prev) => ({ ...prev, breakeven: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("marginalCost")}</label>
                  <Input
                    value={economicsDraft.marginalCost}
                    onChange={(e) => setEconomicsDraft((prev) => ({ ...prev, marginalCost: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("transportCost")}</label>
                  <Input
                    value={economicsDraft.transportCost}
                    onChange={(e) => setEconomicsDraft((prev) => ({ ...prev, transportCost: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("npv")}</label>
                  <Input value={economicsDraft.npv} onChange={(e) => setEconomicsDraft((prev) => ({ ...prev, npv: e.target.value }))} />
                </div>
              </div>
              <Button
                onClick={() => {
                  if (!economicsDraft.fieldId) return;
                  setEconomics((prev) => [economicsDraft, ...prev]);
                  setEconomicsDraft({
                    id: crypto.randomUUID(),
                    fieldId: "",
                    opex: "",
                    breakeven: "",
                    marginalCost: "",
                    transportCost: "",
                    npv: "",
                  });
                }}
              >
                {t("addRecord")}
              </Button>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 px-2">{t("oilField")}</th>
                      <th className="text-left py-2 px-2">{t("opex")}</th>
                      <th className="text-left py-2 px-2">{t("breakeven")}</th>
                      <th className="text-left py-2 px-2">{t("marginalCost")}</th>
                      <th className="text-left py-2 px-2">{t("transportCost")}</th>
                      <th className="text-left py-2 px-2">{t("npv")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {economics.map((row) => {
                      const field = fields.find((f) => f.id === row.fieldId);
                      return (
                        <tr key={row.id} className="border-b border-border/50">
                          <td className="py-2 px-2">{field ? translateData(field.name) : "—"}</td>
                          <td className="py-2 px-2">{row.opex || "—"}</td>
                          <td className="py-2 px-2">{row.breakeven || "—"}</td>
                          <td className="py-2 px-2">{row.marginalCost || "—"}</td>
                          <td className="py-2 px-2">{row.transportCost || "—"}</td>
                          <td className="py-2 px-2">{row.npv || "—"}</td>
                        </tr>
                      );
                    })}
                    {economics.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-xs text-muted-foreground">
                          {t("noGeoData")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("geoProjectsTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("oilField")}</label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={projectDraft.fieldId}
                    onChange={(e) => setProjectDraft((prev) => ({ ...prev, fieldId: Number(e.target.value) }))}
                  >
                    <option value="">{t("selectField")}</option>
                    {fields.map((item) => (
                      <option key={item.id} value={item.id}>
                        {translateData(item.name)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("projectType")}</label>
                  <Input
                    value={projectDraft.projectType}
                    onChange={(e) => setProjectDraft((prev) => ({ ...prev, projectType: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("projectStart")}</label>
                  <Input
                    value={projectDraft.startDate}
                    onChange={(e) => setProjectDraft((prev) => ({ ...prev, startDate: e.target.value }))}
                    placeholder={t("datePlaceholder")}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("projectUplift")}</label>
                  <Input
                    value={projectDraft.uplift}
                    onChange={(e) => setProjectDraft((prev) => ({ ...prev, uplift: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("capex")}</label>
                  <Input
                    value={projectDraft.capex}
                    onChange={(e) => setProjectDraft((prev) => ({ ...prev, capex: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("projectStatus")}</label>
                  <Input
                    value={projectDraft.status}
                    onChange={(e) => setProjectDraft((prev) => ({ ...prev, status: e.target.value }))}
                  />
                </div>
              </div>
              <Button
                onClick={() => {
                  if (!projectDraft.fieldId) return;
                  setProjects((prev) => [projectDraft, ...prev]);
                  setProjectDraft({
                    id: crypto.randomUUID(),
                    fieldId: "",
                    projectType: "",
                    startDate: "",
                    uplift: "",
                    capex: "",
                    status: "",
                  });
                }}
              >
                {t("addRecord")}
              </Button>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 px-2">{t("oilField")}</th>
                      <th className="text-left py-2 px-2">{t("projectType")}</th>
                      <th className="text-left py-2 px-2">{t("projectStart")}</th>
                      <th className="text-left py-2 px-2">{t("projectUplift")}</th>
                      <th className="text-left py-2 px-2">{t("capex")}</th>
                      <th className="text-left py-2 px-2">{t("projectStatus")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((row) => {
                      const field = fields.find((f) => f.id === row.fieldId);
                      return (
                        <tr key={row.id} className="border-b border-border/50">
                          <td className="py-2 px-2">{field ? translateData(field.name) : "—"}</td>
                          <td className="py-2 px-2">{row.projectType || "—"}</td>
                          <td className="py-2 px-2">{row.startDate || "—"}</td>
                          <td className="py-2 px-2">{row.uplift || "—"}</td>
                          <td className="py-2 px-2">{row.capex || "—"}</td>
                          <td className="py-2 px-2">{row.status || "—"}</td>
                        </tr>
                      );
                    })}
                    {projects.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-xs text-muted-foreground">
                          {t("noGeoData")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finance">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("geoFinanceTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("oilField")}</label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={financeDraft.fieldId}
                    onChange={(e) => setFinanceDraft((prev) => ({ ...prev, fieldId: Number(e.target.value) }))}
                  >
                    <option value="">{t("selectField")}</option>
                    {fields.map((item) => (
                      <option key={item.id} value={item.id}>
                        {translateData(item.name)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("revenueMtd")}</label>
                  <Input
                    value={financeDraft.revenueMtd}
                    onChange={(e) => setFinanceDraft((prev) => ({ ...prev, revenueMtd: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("revenueYtd")}</label>
                  <Input
                    value={financeDraft.revenueYtd}
                    onChange={(e) => setFinanceDraft((prev) => ({ ...prev, revenueYtd: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("ebitda")}</label>
                  <Input value={financeDraft.ebitda} onChange={(e) => setFinanceDraft((prev) => ({ ...prev, ebitda: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("share")}</label>
                  <Input value={financeDraft.share} onChange={(e) => setFinanceDraft((prev) => ({ ...prev, share: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("priceSensitivity")}</label>
                  <Input
                    value={financeDraft.sensitivity}
                    onChange={(e) => setFinanceDraft((prev) => ({ ...prev, sensitivity: e.target.value }))}
                  />
                </div>
              </div>
              <Button
                onClick={() => {
                  if (!financeDraft.fieldId) return;
                  setFinances((prev) => [financeDraft, ...prev]);
                  setFinanceDraft({
                    id: crypto.randomUUID(),
                    fieldId: "",
                    revenueMtd: "",
                    revenueYtd: "",
                    ebitda: "",
                    share: "",
                    sensitivity: "",
                  });
                }}
              >
                {t("addRecord")}
              </Button>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 px-2">{t("oilField")}</th>
                      <th className="text-left py-2 px-2">{t("revenueMtd")}</th>
                      <th className="text-left py-2 px-2">{t("revenueYtd")}</th>
                      <th className="text-left py-2 px-2">{t("ebitda")}</th>
                      <th className="text-left py-2 px-2">{t("share")}</th>
                      <th className="text-left py-2 px-2">{t("priceSensitivity")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finances.map((row) => {
                      const field = fields.find((f) => f.id === row.fieldId);
                      return (
                        <tr key={row.id} className="border-b border-border/50">
                          <td className="py-2 px-2">{field ? translateData(field.name) : "—"}</td>
                          <td className="py-2 px-2">{row.revenueMtd || "—"}</td>
                          <td className="py-2 px-2">{row.revenueYtd || "—"}</td>
                          <td className="py-2 px-2">{row.ebitda || "—"}</td>
                          <td className="py-2 px-2">{row.share || "—"}</td>
                          <td className="py-2 px-2">{row.sensitivity || "—"}</td>
                        </tr>
                      );
                    })}
                    {finances.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-xs text-muted-foreground">
                          {t("noGeoData")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("geoComplianceTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("oilField")}</label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={complianceDraft.fieldId}
                    onChange={(e) => setComplianceDraft((prev) => ({ ...prev, fieldId: Number(e.target.value) }))}
                  >
                    <option value="">{t("selectField")}</option>
                    {fields.map((item) => (
                      <option key={item.id} value={item.id}>
                        {translateData(item.name)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("license")}</label>
                  <Input
                    value={complianceDraft.license}
                    onChange={(e) => setComplianceDraft((prev) => ({ ...prev, license: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("licenseExpiry")}</label>
                  <Input
                    value={complianceDraft.licenseExpiry}
                    onChange={(e) => setComplianceDraft((prev) => ({ ...prev, licenseExpiry: e.target.value }))}
                    placeholder={t("datePlaceholder")}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("quotas")}</label>
                  <Input value={complianceDraft.quotas} onChange={(e) => setComplianceDraft((prev) => ({ ...prev, quotas: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("ecoLimits")}</label>
                  <Input
                    value={complianceDraft.ecoLimits}
                    onChange={(e) => setComplianceDraft((prev) => ({ ...prev, ecoLimits: e.target.value }))}
                  />
                </div>
                <div className="space-y-1 md:col-span-3">
                  <label className="text-xs text-muted-foreground">{t("approvals")}</label>
                  <Textarea
                    value={complianceDraft.approvals}
                    onChange={(e) => setComplianceDraft((prev) => ({ ...prev, approvals: e.target.value }))}
                    className="min-h-[72px]"
                  />
                </div>
              </div>
              <Button
                onClick={() => {
                  if (!complianceDraft.fieldId) return;
                  setCompliance((prev) => [complianceDraft, ...prev]);
                  setComplianceDraft({
                    id: crypto.randomUUID(),
                    fieldId: "",
                    license: "",
                    licenseExpiry: "",
                    quotas: "",
                    ecoLimits: "",
                    approvals: "",
                  });
                }}
              >
                {t("addRecord")}
              </Button>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 px-2">{t("oilField")}</th>
                      <th className="text-left py-2 px-2">{t("license")}</th>
                      <th className="text-left py-2 px-2">{t("licenseExpiry")}</th>
                      <th className="text-left py-2 px-2">{t("quotas")}</th>
                      <th className="text-left py-2 px-2">{t("ecoLimits")}</th>
                      <th className="text-left py-2 px-2">{t("approvals")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compliance.map((row) => {
                      const field = fields.find((f) => f.id === row.fieldId);
                      return (
                        <tr key={row.id} className="border-b border-border/50">
                          <td className="py-2 px-2">{field ? translateData(field.name) : "—"}</td>
                          <td className="py-2 px-2">{row.license || "—"}</td>
                          <td className="py-2 px-2">{row.licenseExpiry || "—"}</td>
                          <td className="py-2 px-2">{row.quotas || "—"}</td>
                          <td className="py-2 px-2">{row.ecoLimits || "—"}</td>
                          <td className="py-2 px-2">{row.approvals || "—"}</td>
                        </tr>
                      );
                    })}
                    {compliance.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-xs text-muted-foreground">
                          {t("noGeoData")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="downstream">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("geoDownstreamTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("oilField")}</label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={downstreamDraft.fieldId}
                    onChange={(e) => setDownstreamDraft((prev) => ({ ...prev, fieldId: Number(e.target.value) }))}
                  >
                    <option value="">{t("selectField")}</option>
                    {fields.map((item) => (
                      <option key={item.id} value={item.id}>
                        {translateData(item.name)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("refineries")}</label>
                  <Input
                    value={downstreamDraft.refineries}
                    onChange={(e) => setDownstreamDraft((prev) => ({ ...prev, refineries: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("blend")}</label>
                  <Input
                    value={downstreamDraft.blend}
                    onChange={(e) => setDownstreamDraft((prev) => ({ ...prev, blend: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("marginPerBarrel")}</label>
                  <Input
                    value={downstreamDraft.margin}
                    onChange={(e) => setDownstreamDraft((prev) => ({ ...prev, margin: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("transportCost")}</label>
                  <Input
                    value={downstreamDraft.transportCost}
                    onChange={(e) => setDownstreamDraft((prev) => ({ ...prev, transportCost: e.target.value }))}
                  />
                </div>
              </div>
              <Button
                onClick={() => {
                  if (!downstreamDraft.fieldId) return;
                  setDownstream((prev) => [downstreamDraft, ...prev]);
                  setDownstreamDraft({
                    id: crypto.randomUUID(),
                    fieldId: "",
                    refineries: "",
                    blend: "",
                    margin: "",
                    transportCost: "",
                  });
                }}
              >
                {t("addRecord")}
              </Button>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 px-2">{t("oilField")}</th>
                      <th className="text-left py-2 px-2">{t("refineries")}</th>
                      <th className="text-left py-2 px-2">{t("blend")}</th>
                      <th className="text-left py-2 px-2">{t("marginPerBarrel")}</th>
                      <th className="text-left py-2 px-2">{t("transportCost")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {downstream.map((row) => {
                      const field = fields.find((f) => f.id === row.fieldId);
                      return (
                        <tr key={row.id} className="border-b border-border/50">
                          <td className="py-2 px-2">{field ? translateData(field.name) : "—"}</td>
                          <td className="py-2 px-2">{row.refineries || "—"}</td>
                          <td className="py-2 px-2">{row.blend || "—"}</td>
                          <td className="py-2 px-2">{row.margin || "—"}</td>
                          <td className="py-2 px-2">{row.transportCost || "—"}</td>
                        </tr>
                      );
                    })}
                    {downstream.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-xs text-muted-foreground">
                          {t("noGeoData")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="realtime">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("geoRealtimeTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("oilField")}</label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={realtimeDraft.fieldId}
                    onChange={(e) => setRealtimeDraft((prev) => ({ ...prev, fieldId: Number(e.target.value) }))}
                  >
                    <option value="">{t("selectField")}</option>
                    {fields.map((item) => (
                      <option key={item.id} value={item.id}>
                        {translateData(item.name)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("realtimeRate")}</label>
                  <Input
                    value={realtimeDraft.realtimeRate}
                    onChange={(e) => setRealtimeDraft((prev) => ({ ...prev, realtimeRate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("deviation")}</label>
                  <Input
                    value={realtimeDraft.deviation}
                    onChange={(e) => setRealtimeDraft((prev) => ({ ...prev, deviation: e.target.value }))}
                  />
                </div>
                <div className="space-y-1 md:col-span-3">
                  <label className="text-xs text-muted-foreground">{t("alerts")}</label>
                  <Input
                    value={realtimeDraft.alerts}
                    onChange={(e) => setRealtimeDraft((prev) => ({ ...prev, alerts: e.target.value }))}
                  />
                </div>
                <div className="space-y-1 md:col-span-3">
                  <label className="text-xs text-muted-foreground">{t("lastUpdate")}</label>
                  <Input
                    value={realtimeDraft.lastUpdate}
                    onChange={(e) => setRealtimeDraft((prev) => ({ ...prev, lastUpdate: e.target.value }))}
                    placeholder={t("datePlaceholder")}
                  />
                </div>
              </div>
              <Button
                onClick={() => {
                  if (!realtimeDraft.fieldId) return;
                  setRealtime((prev) => [realtimeDraft, ...prev]);
                  setRealtimeDraft({
                    id: crypto.randomUUID(),
                    fieldId: "",
                    realtimeRate: "",
                    deviation: "",
                    alerts: "",
                    lastUpdate: "",
                  });
                }}
              >
                {t("addRecord")}
              </Button>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 px-2">{t("oilField")}</th>
                      <th className="text-left py-2 px-2">{t("realtimeRate")}</th>
                      <th className="text-left py-2 px-2">{t("deviation")}</th>
                      <th className="text-left py-2 px-2">{t("alerts")}</th>
                      <th className="text-left py-2 px-2">{t("lastUpdate")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {realtime.map((row) => {
                      const field = fields.find((f) => f.id === row.fieldId);
                      return (
                        <tr key={row.id} className="border-b border-border/50">
                          <td className="py-2 px-2">{field ? translateData(field.name) : "—"}</td>
                          <td className="py-2 px-2">{row.realtimeRate || "—"}</td>
                          <td className="py-2 px-2">{row.deviation || "—"}</td>
                          <td className="py-2 px-2">{row.alerts || "—"}</td>
                          <td className="py-2 px-2">{row.lastUpdate || "—"}</td>
                        </tr>
                      );
                    })}
                    {realtime.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-xs text-muted-foreground">
                          {t("noGeoData")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("geoHistoryTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("oilField")}</label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={historyDraft.fieldId}
                    onChange={(e) => setHistoryDraft((prev) => ({ ...prev, fieldId: Number(e.target.value) }))}
                  >
                    <option value="">{t("selectField")}</option>
                    {fields.map((item) => (
                      <option key={item.id} value={item.id}>
                        {translateData(item.name)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("trend")}</label>
                  <Input value={historyDraft.trend} onChange={(e) => setHistoryDraft((prev) => ({ ...prev, trend: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("forecast")}</label>
                  <Input
                    value={historyDraft.forecast}
                    onChange={(e) => setHistoryDraft((prev) => ({ ...prev, forecast: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("variance")}</label>
                  <Input
                    value={historyDraft.variance}
                    onChange={(e) => setHistoryDraft((prev) => ({ ...prev, variance: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("benchmarking")}</label>
                  <Input
                    value={historyDraft.benchmarking}
                    onChange={(e) => setHistoryDraft((prev) => ({ ...prev, benchmarking: e.target.value }))}
                  />
                </div>
              </div>
              <Button
                onClick={() => {
                  if (!historyDraft.fieldId) return;
                  setHistoryAnalytics((prev) => [historyDraft, ...prev]);
                  setHistoryDraft({
                    id: crypto.randomUUID(),
                    fieldId: "",
                    trend: "",
                    forecast: "",
                    variance: "",
                    benchmarking: "",
                  });
                }}
              >
                {t("addRecord")}
              </Button>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 px-2">{t("oilField")}</th>
                      <th className="text-left py-2 px-2">{t("trend")}</th>
                      <th className="text-left py-2 px-2">{t("forecast")}</th>
                      <th className="text-left py-2 px-2">{t("variance")}</th>
                      <th className="text-left py-2 px-2">{t("benchmarking")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyAnalytics.map((row) => {
                      const field = fields.find((f) => f.id === row.fieldId);
                      return (
                        <tr key={row.id} className="border-b border-border/50">
                          <td className="py-2 px-2">{field ? translateData(field.name) : "—"}</td>
                          <td className="py-2 px-2">{row.trend || "—"}</td>
                          <td className="py-2 px-2">{row.forecast || "—"}</td>
                          <td className="py-2 px-2">{row.variance || "—"}</td>
                          <td className="py-2 px-2">{row.benchmarking || "—"}</td>
                        </tr>
                      );
                    })}
                    {historyAnalytics.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-xs text-muted-foreground">
                          {t("noGeoData")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;

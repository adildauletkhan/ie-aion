import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, FileText, CheckCircle2, TrendingUp, Building2, Plus, CalendarDays, User, ChevronRight, Clock } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { getAuthHeader } from "@/lib/auth";
import type { StageInput } from "@/lib/digitalTwinApi";
import { loadPlansList, extractPlanSummary, type ProdPlanMeta, type ProdPlanSummary } from "@/lib/prodPlanStore";
import { useWorkspace } from "@/context/WorkspaceContext";

type Stage = "UP" | "MID" | "DOWN" | "EXPORT";

interface AnnualPlan {
  id: string;
  name: string;
  year: number;
  status: "draft" | "approved";
  baselineSource: string;
  createdAt: string;
  owner?: string | null;
  company?: string | null;
  updatedAt?: string | null;
}

interface AnnualScenario {
  id: string;
  planId: string;
  name: string;
  status: "draft" | "approved";
  createdAt: string;
}

interface ExtendedScenario {
  id: string;
  name: string;
  description?: string | null;
  status?: string | null;
  stages?: StageInput[] | null;
}

interface AnnualLine {
  id: number;
  stage: Stage;
  assetType: string;
  assetCode: string;
  assetName: string;
  capacity: number;
  monthlyPlan: number[];
  notes: string;
}

interface AnnualIssue {
  id: number;
  severity: "critical" | "warning";
  month: number;
  stage: string;
  assetCode?: string | null;
  message: string;
  gap: number;
}

type StageConstraint = {
  monthlyTarget: number;
  monthlyCap: number;
};

function getApiBase(): string {
  // Use relative /api - nginx will proxy to backend
  return "/api";
}

export default function AnnualPlanning() {
  const { t, translateData, language } = useLanguage();
  const isEn = language === "en";
  const { isGlobalScope, activeCompanyId, activeWorkspace } = useWorkspace();

  const [plans, setPlans] = useState<AnnualPlan[]>([]);
  const [scenarios, setScenarios] = useState<AnnualScenario[]>([]);
  const [extendedScenarios, setExtendedScenarios] = useState<ExtendedScenario[]>([]);
  const [lines, setLines] = useState<AnnualLine[]>([]);
  const [issues, setIssues] = useState<AnnualIssue[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("");
  const [selectedExtendedIds, setSelectedExtendedIds] = useState<string[]>([]);
  // In own-scope (production company) default to extraction stage only
  const [stage, setStage] = useState<Stage>("UP");
  const [planName, setPlanName] = useState("Годовой план 2027");
  const [planYear, setPlanYear] = useState(new Date().getFullYear());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Reference list of oil field names belonging to the active company (for line filtering)
  const [companyFieldNames, setCompanyFieldNames] = useState<Set<string>>(new Set());

  // Production plans from Planning module
  const [prodPlanMetas, setProdPlanMetas] = useState<ProdPlanMeta[]>([]);
  const [selectedProdPlanId, setSelectedProdPlanId] = useState<string | null>(null);
  const [prodPlanSummary, setProdPlanSummary] = useState<ProdPlanSummary | null>(null);

  // Load production plans from localStorage
  useEffect(() => {
    const list = loadPlansList();
    setProdPlanMetas(list);
    if (list.length > 0 && !selectedProdPlanId) {
      setSelectedProdPlanId(list[0].id);
      setProdPlanSummary(extractPlanSummary(list[0]));
    }
  }, []);

  const selectProdPlan = (meta: ProdPlanMeta) => {
    setSelectedProdPlanId(meta.id);
    setProdPlanSummary(extractPlanSummary(meta));
  };
  const months = [
    t("jan"),
    t("feb"),
    t("mar"),
    t("apr"),
    t("may"),
    t("jun"),
    t("jul"),
    t("aug"),
    t("sep"),
    t("oct"),
    t("nov"),
    t("dec"),
  ];
  const stageLabels: Record<Stage, string> = {
    UP: t("stageUp"),
    MID: t("stageMid"),
    DOWN: t("stageDown"),
    EXPORT: t("stageExport"),
  };
  const systemScenarioOrder = ["conservative", "baseline", "aggressive"] as const;
  const getSystemScenarioKey = (name: string) => {
    const normalized = name.trim().toLowerCase();
    if (normalized.includes("conservative") || normalized.includes("консерватив")) return "conservative";
    if (normalized.includes("baseline") || normalized.includes("базов")) return "baseline";
    if (normalized.includes("aggressive") || normalized.includes("агрессив")) return "aggressive";
    return null;
  };
  const systemScenarios = useMemo(
    () =>
      scenarios
        .map((scenario) => ({
          scenario,
          key: getSystemScenarioKey(scenario.name),
        }))
        .filter((item): item is { scenario: AnnualScenario; key: (typeof systemScenarioOrder)[number] } => Boolean(item.key))
        .sort((a, b) => systemScenarioOrder.indexOf(a.key) - systemScenarioOrder.indexOf(b.key))
        .map((item) => item.scenario),
    [scenarios]
  );
  const extendedScenarioCandidates = useMemo(
    () => extendedScenarios.filter((scenario) => !getSystemScenarioKey(scenario.name)),
    [extendedScenarios]
  );
  const selectedExtendedScenarios = useMemo(
    () => extendedScenarios.filter((scenario) => selectedExtendedIds.includes(scenario.id)),
    [extendedScenarios, selectedExtendedIds]
  );
  const stageConstraints = useMemo(() => {
    const constraints: Partial<Record<Stage, StageConstraint>> = {};
    const minPlanTotals: Partial<Record<Stage, number>> = {};
    const minCapacities: Partial<Record<Stage, number>> = {};

    selectedExtendedScenarios.forEach((scenario) => {
      scenario.stages?.forEach((stageInput) => {
        const stageKey = stageInput.stage;
        const totalPlan = (stageInput.planGov ?? 0) + (stageInput.planCorp ?? 0);
        const capacity = stageInput.capacity ?? 0;
        if (totalPlan > 0) {
          minPlanTotals[stageKey] = Math.min(minPlanTotals[stageKey] ?? totalPlan, totalPlan);
        }
        if (capacity > 0) {
          minCapacities[stageKey] = Math.min(minCapacities[stageKey] ?? capacity, capacity);
        }
      });
    });

    (Object.keys(stageLabels) as Stage[]).forEach((stageKey) => {
      const planTotal = minPlanTotals[stageKey];
      const capacity = minCapacities[stageKey];
      if (planTotal === undefined && capacity === undefined) return;
      const monthlyTargetRaw = planTotal ? planTotal / 12 : 0;
      const monthlyCap = capacity ? capacity / 12 : Infinity;
      const monthlyTarget = monthlyTargetRaw ? Math.min(monthlyTargetRaw, monthlyCap) : monthlyCap;
      constraints[stageKey] = {
        monthlyTarget,
        monthlyCap,
      };
    });

    return constraints;
  }, [selectedExtendedScenarios, stageLabels]);

  const applyStageConstraint = (stageKey: Stage, sourceLines: AnnualLine[]) => {
    const constraint = stageConstraints[stageKey];
    if (!constraint || !sourceLines.length) {
      return sourceLines;
    }
    const totals = new Array(12).fill(0).map((_, idx) =>
      sourceLines.reduce((sum, line) => sum + (line.monthlyPlan[idx] ?? 0), 0)
    );
    const capacityTotals = sourceLines.reduce((sum, line) => sum + (line.capacity ?? 0), 0);

    return sourceLines.map((line) => {
      const maxMonthly = line.capacity ? line.capacity / 12 : Infinity;
      const monthlyPlan = line.monthlyPlan.map((value, idx) => {
        const baseTotal = totals[idx];
        const weight =
          baseTotal > 0
            ? value / baseTotal
            : capacityTotals > 0
              ? (line.capacity ?? 0) / capacityTotals
              : 1 / sourceLines.length;
        const scaled = constraint.monthlyTarget * weight;
        return Math.min(scaled, maxMonthly, constraint.monthlyCap);
      });
      return { ...line, monthlyPlan };
    });
  };

  // Load company oil fields for line filtering
  useEffect(() => {
    if (isGlobalScope || !activeCompanyId) {
      setCompanyFieldNames(new Set());
      return;
    }
    const authHeader = getAuthHeader();
    fetch(`${getApiBase()}/master-data/oil-fields?extractionCompanyId=${activeCompanyId}`, {
      headers: { "Content-Type": "application/json", ...(authHeader ? { Authorization: authHeader } : {}) },
    })
      .then(r => r.ok ? r.json() : [])
      .then((fields: { name: string; shortName?: string | null }[]) => {
        const names = new Set<string>();
        fields.forEach(f => {
          if (f.name) names.add(f.name.trim().toLowerCase());
          if (f.shortName) names.add(f.shortName.trim().toLowerCase());
        });
        setCompanyFieldNames(names);
      })
      .catch(() => setCompanyFieldNames(new Set()));
  }, [isGlobalScope, activeCompanyId]);

  useEffect(() => {
    const controller = new AbortController();
    const authHeader = getAuthHeader();
    async function loadPlans() {
      try {
        // Filter plans by company when in own-scope
        let url = `${getApiBase()}/annual-plans`;
        if (!isGlobalScope && activeCompanyId !== null) {
          url += `?extractionCompanyId=${activeCompanyId}`;
        }
        const response = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
            ...(authHeader ? { Authorization: authHeader } : {}),
          },
          signal: controller.signal,
        });
        if (!response.ok) return;
        const payload = (await response.json()) as AnnualPlan[];
        setPlans(payload);
        setSelectedPlanId(""); // reset selection when company changes
        if (payload.length) setSelectedPlanId(payload[0].id);
      } finally {
        setIsLoading(false);
      }
    }
    loadPlans();
    return () => controller.abort();
  }, [isGlobalScope, activeCompanyId]);

  useEffect(() => {
    const controller = new AbortController();
    const authHeader = getAuthHeader();
    async function loadExtendedScenarios() {
      const response = await fetch(`${getApiBase()}/scenarios`, {
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        signal: controller.signal,
      });
      if (!response.ok) return;
      const payload = (await response.json()) as ExtendedScenario[];
      setExtendedScenarios(payload);
    }
    loadExtendedScenarios();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedPlanId) return;
    const controller = new AbortController();
    const authHeader = getAuthHeader();
    async function loadScenarios() {
      const response = await fetch(`${getApiBase()}/annual-plans/${selectedPlanId}/scenarios`, {
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        signal: controller.signal,
      });
      if (!response.ok) return;
      const payload = (await response.json()) as AnnualScenario[];
      setScenarios(payload);
      if (!selectedScenarioId && payload.length) {
        setSelectedScenarioId(payload[0].id);
      }
    }
    loadScenarios();
    return () => controller.abort();
  }, [selectedPlanId, selectedScenarioId]);

  useEffect(() => {
    if (!selectedPlanId || !selectedScenarioId) return;
    const controller = new AbortController();
    const authHeader = getAuthHeader();
    async function loadLines() {
      const response = await fetch(
        `${getApiBase()}/annual-plans/${selectedPlanId}/scenarios/${selectedScenarioId}/lines?stage=${stage}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(authHeader ? { Authorization: authHeader } : {}),
          },
          signal: controller.signal,
        }
      );
      if (!response.ok) return;
      const payload = (await response.json()) as AnnualLine[];
      setLines(applyStageConstraint(stage, payload));
    }
    loadLines();
    return () => controller.abort();
  }, [selectedPlanId, selectedScenarioId, stage, stageConstraints]);

  // Filter lines to company scope when not global
  const filteredLines = useMemo(() => {
    if (isGlobalScope || companyFieldNames.size === 0) return lines;
    // Keep lines whose assetName matches a known field for this company
    // or whose assetType is "extractionCompany" matching the active workspace name
    return lines.filter(line => {
      const name = (line.assetName ?? "").trim().toLowerCase();
      if (companyFieldNames.has(name)) return true;
      // Also match the company itself by workspace name
      const wsName = (activeWorkspace?.name ?? "").trim().toLowerCase();
      const wsShort = (activeWorkspace?.shortName ?? "").trim().toLowerCase();
      if (wsName && name.includes(wsName)) return true;
      if (wsShort && name.includes(wsShort)) return true;
      return false;
    });
  }, [lines, isGlobalScope, companyFieldNames, activeWorkspace]);

  const totals = useMemo(() => {
    const total = new Array(12).fill(0);
    for (const line of filteredLines) {
      line.monthlyPlan.forEach((value, idx) => {
        total[idx] += value;
      });
    }
    return total;
  }, [filteredLines]);

  const handleCreatePlan = async () => {
    const authHeader = getAuthHeader();
    const response = await fetch(`${getApiBase()}/annual-plans`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify({
        name: planName,
        year: Number(planYear),
        status: "draft",
        baselineSource: "master-data",
      }),
    });
    if (!response.ok) return;
    const plan = (await response.json()) as AnnualPlan;
    setPlans((prev) => [plan, ...prev]);
    setSelectedPlanId(plan.id);
  };

  const handleSave = async () => {
    if (!selectedPlanId || !selectedScenarioId) return;
    const authHeader = getAuthHeader();
    await fetch(`${getApiBase()}/annual-plans/${selectedPlanId}/scenarios/${selectedScenarioId}/lines`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(
        lines.map((line) => ({
          id: line.id,
          monthlyPlan: line.monthlyPlan,
          notes: line.notes,
        }))
      ),
    });
  };

  const handleValidate = async () => {
    if (!selectedPlanId || !selectedScenarioId) return;
    const authHeader = getAuthHeader();
    const response = await fetch(
      `${getApiBase()}/annual-plans/${selectedPlanId}/scenarios/${selectedScenarioId}/validate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
      }
    );
    if (!response.ok) return;
    const payload = (await response.json()) as { issues: AnnualIssue[] };
    setIssues(payload.issues);
  };

  const handleAddExtendedScenario = async (scenario: ExtendedScenario) => {
    if (!selectedPlanId) return;
    const authHeader = getAuthHeader();
    const response = await fetch(`${getApiBase()}/annual-plans/${selectedPlanId}/scenarios`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify({
        name: scenario.name,
        status: "draft",
      }),
    });
    if (!response.ok) return;
    const created = (await response.json()) as AnnualScenario;
    setScenarios((prev) => [created, ...prev]);
    setSelectedScenarioId(created.id);
  };

  const toggleExtendedScenario = (scenario: ExtendedScenario) => {
    setSelectedExtendedIds((prev) =>
      prev.includes(scenario.id) ? prev.filter((id) => id !== scenario.id) : [...prev, scenario.id]
    );
    if (!selectedExtendedIds.includes(scenario.id)) {
      handleAddExtendedScenario(scenario);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("annualPlanningTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("annualPlanningSubtitle")}
          </p>
        </div>
        {!isGlobalScope && activeWorkspace && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/20 bg-primary/5 text-sm shrink-0">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="font-medium text-primary">
              {activeWorkspace.shortName ?? activeWorkspace.name}
            </span>
            <span className="text-muted-foreground text-xs">
              {isEn ? "— filtered view" : "— фильтр по компании"}
            </span>
          </div>
        )}
      </div>

      {/* ── Production Plans baseline selector ── */}
      <Card className="border-primary/20">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            {isEn ? "Production Plan (baseline)" : "Производственный план (базовый)"}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-3">
          {prodPlanMetas.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {isEn
                ? "No saved production plans. Go to Planning → Production Plan and save a plan."
                : "Нет сохранённых производственных планов. Перейдите в Планирование → Производственный план и сохраните план."}
            </p>
          ) : (
            <>
              {/* Compact plan list */}
              <div className="flex flex-wrap gap-1.5">
                {prodPlanMetas.map(meta => (
                  <button
                    key={meta.id}
                    onClick={() => selectProdPlan(meta)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-colors ${
                      selectedProdPlanId === meta.id
                        ? "bg-primary text-primary-foreground border-primary font-medium"
                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    <FileText className="h-3 w-3" />
                    {meta.name}
                    {selectedProdPlanId === meta.id && <CheckCircle2 className="h-3 w-3 ml-0.5" />}
                  </button>
                ))}
              </div>

              {/* Key metrics from selected plan */}
              {prodPlanSummary && (
                <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
                  <p className="text-[10px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">
                    {isEn ? "Oil Production, тhous.t — " : "Добыча нефти, тыс.т — "}
                    <span className="text-foreground normal-case font-semibold">{prodPlanSummary.name}</span>
                  </p>
                  {Object.keys(prodPlanSummary.oilByYear).length === 0 ? (
                    <p className="text-xs text-muted-foreground/60 italic">
                      {isEn ? "No oil production data in this plan (fill Section 2)." : "Данные по добыче нефти не заполнены (Раздел 2)."}
                    </p>
                  ) : (
                    <div className="flex gap-4 flex-wrap">
                      {["2026","2027","2028","2029","2030"].map(y => {
                        const val = prodPlanSummary.oilByYear[y];
                        if (!val) return null;
                        return (
                          <div key={y} className="text-center">
                            <div className="text-[10px] text-muted-foreground">{y}</div>
                            <div className="text-sm font-bold tabular-nums text-primary">
                              {Number(val).toLocaleString("ru-RU")}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    {isEn ? "Updated: " : "Обновлён: "}
                    {new Date(prodPlanSummary.updatedAt).toLocaleDateString(isEn ? "en-GB" : "ru-RU", {
                      day: "2-digit", month: "short", year: "numeric"
                    })}
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Scenario Analysis Registry ── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {isEn ? "Scenario Analysis Registry" : "Реестр сценарных анализов"}
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 text-xs"
              onClick={() => setShowCreateForm(v => !v)}
            >
              <Plus className="h-3.5 w-3.5" />
              {isEn ? "New analysis" : "Новый анализ"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Inline create form */}
          {showCreateForm && (
            <div className="mx-4 mb-3 p-3 rounded-lg border border-primary/30 bg-primary/5 flex flex-col sm:flex-row gap-2 items-end">
              <div className="flex-1 space-y-1">
                <label className="text-xs text-muted-foreground">{isEn ? "Analysis name" : "Название анализа"}</label>
                <Input
                  value={planName}
                  onChange={e => setPlanName(e.target.value)}
                  placeholder={isEn ? "e.g. Base plan 2026" : "напр. Базовый план 2026"}
                  className="h-8 text-sm"
                  onKeyDown={e => { if (e.key === "Enter") { handleCreatePlan(); setShowCreateForm(false); }}}
                  autoFocus
                />
              </div>
              <div className="w-24 space-y-1">
                <label className="text-xs text-muted-foreground">{isEn ? "Year" : "Год"}</label>
                <Input
                  type="number"
                  value={planYear}
                  onChange={e => setPlanYear(Number(e.target.value))}
                  className="h-8 text-sm"
                />
              </div>
              <Button
                size="sm"
                className="h-8 shrink-0"
                onClick={() => { handleCreatePlan(); setShowCreateForm(false); }}
              >
                {isEn ? "Create" : "Создать"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 shrink-0"
                onClick={() => setShowCreateForm(false)}
              >
                {isEn ? "Cancel" : "Отмена"}
              </Button>
            </div>
          )}

          {/* Registry table */}
          {isLoading ? (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">{t("loadingPlans")}</div>
          ) : plans.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <FileText className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">
                {isEn ? "No scenario analyses yet." : "Сценарных анализов пока нет."}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {isEn ? "Click «New analysis» to create one." : "Нажмите «Новый анализ» для создания."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground w-8">#</th>
                    <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">
                      {isEn ? "Name" : "Название"}
                    </th>
                    <th className="text-center px-3 py-2.5 text-xs font-medium text-muted-foreground w-16">
                      {isEn ? "Year" : "Год"}
                    </th>
                    <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">
                      {isEn ? "Company" : "Компания"}
                    </th>
                    <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">
                      {isEn ? "Status" : "Статус"}
                    </th>
                    <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">
                      {isEn ? "Author" : "Автор"}
                    </th>
                    <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">
                      {isEn ? "Created" : "Создан"}
                    </th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan, idx) => {
                    const isSelected = selectedPlanId === plan.id;
                    const createdDate = plan.createdAt
                      ? new Date(plan.createdAt).toLocaleDateString(isEn ? "en-GB" : "ru-RU", {
                          day: "2-digit", month: "short", year: "numeric",
                        })
                      : "—";
                    const companyLabel = plan.company
                      ?? (isGlobalScope ? "КМГ" : (activeWorkspace?.shortName ?? activeWorkspace?.name ?? "—"));

                    return (
                      <tr
                        key={plan.id}
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={`border-b border-border/50 cursor-pointer transition-colors group ${
                          isSelected
                            ? "bg-primary/8 hover:bg-primary/10"
                            : "hover:bg-muted/40"
                        }`}
                      >
                        {/* Row number */}
                        <td className="px-4 py-3 text-xs text-muted-foreground/60 tabular-nums">{idx + 1}</td>

                        {/* Name */}
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            {isSelected
                              ? <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                              : <div className="h-1.5 w-1.5 rounded-full bg-transparent shrink-0" />
                            }
                            <span className={`font-medium text-sm leading-snug ${isSelected ? "text-primary" : "text-foreground"}`}>
                              {plan.name}
                            </span>
                          </div>
                        </td>

                        {/* Year */}
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                            <CalendarDays className="h-3 w-3" />
                            {plan.year}
                          </span>
                        </td>

                        {/* Company */}
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted border border-border/60 text-muted-foreground">
                            <Building2 className="h-2.5 w-2.5" />
                            {companyLabel}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-3 py-3">
                          <Badge
                            variant={plan.status === "approved" ? "default" : "secondary"}
                            className={`text-xs h-5 ${
                              plan.status === "approved"
                                ? "bg-green-500/15 text-green-600 border-green-500/30 hover:bg-green-500/20"
                                : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            }`}
                          >
                            {plan.status === "approved"
                              ? (isEn ? "Approved" : "Согласован")
                              : (isEn ? "Draft" : "Черновик")}
                          </Badge>
                        </td>

                        {/* Author */}
                        <td className="px-3 py-3">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3 shrink-0" />
                            {plan.owner ?? (isEn ? "System" : "Система")}
                          </span>
                        </td>

                        {/* Created date */}
                        <td className="px-3 py-3">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 shrink-0" />
                            {createdDate}
                          </span>
                        </td>

                        {/* Arrow */}
                        <td className="px-2 py-3">
                          <ChevronRight className={`h-4 w-4 transition-colors ${isSelected ? "text-primary" : "text-muted-foreground/30 group-hover:text-muted-foreground"}`} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("scenariosTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Base / system scenarios */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              {isEn ? "Base scenarios" : "Базовые сценарии"}
            </p>
            <div className="flex flex-wrap gap-2">
              {systemScenarios.map((scenario) => (
                <Button
                  key={scenario.id}
                  size="sm"
                  className="gap-2"
                  variant={selectedScenarioId === scenario.id ? "default" : "outline"}
                  onClick={() => setSelectedScenarioId(scenario.id)}
                >
                  <span>{translateData(scenario.name)}</span>
                  <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center" aria-label="Системный">
                    <ShieldCheck className="h-3 w-3" />
                  </Badge>
                </Button>
              ))}
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Extended / user scenarios */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              {isEn ? "Extended scenarios" : "Расширенные сценарии"}
            </p>
            <div className="flex flex-wrap gap-2">
              {extendedScenarioCandidates.map((scenario) => (
                <Button
                  key={scenario.id}
                  size="sm"
                  variant={selectedExtendedIds.includes(scenario.id) ? "default" : "outline"}
                  onClick={() => toggleExtendedScenario(scenario)}
                >
                  {translateData(scenario.name)}
                </Button>
              ))}
              {extendedScenarioCandidates.length === 0 && (
                <span className="text-xs text-muted-foreground">{t("scenarioNotFound")}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("stageInputs")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            {(["UP", "MID", "DOWN", "EXPORT"] as Stage[]).map((value) => {
              // In own-scope (production company) only show relevant stages
              const isRelevant = isGlobalScope || value === "UP";
              if (!isRelevant) return null;
              return (
                <Button
                  key={value}
                  size="sm"
                  variant={stage === value ? "default" : "outline"}
                  onClick={() => setStage(value)}
                >
                  {stageLabels[value]}
                </Button>
              );
            })}
            {!isGlobalScope && activeWorkspace && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground ml-2 border border-border/50 rounded-full px-2.5 py-0.5 bg-muted/40">
                <Building2 className="h-3 w-3" />
                {activeWorkspace.shortName ?? activeWorkspace.name}
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2 px-2">{t("asset")}</th>
                  <th className="text-right py-2 px-2">{t("capacity")}</th>
                  {months.map((month) => (
                    <th key={month} className="text-right py-2 px-2">{month}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLines.map((line) => {
                  const rowIdx = lines.findIndex(l => l.id === line.id);
                  return (
                  <tr key={line.id} className="border-b border-border/50">
                    <td className="py-2 px-2 font-medium">{translateData(line.assetName)}</td>
                    <td className="py-2 px-2 text-right font-mono">{line.capacity.toFixed(0)}</td>
                    {line.monthlyPlan.map((value, idx) => (
                      <td key={`${line.id}-${idx}`} className="py-2 px-2">
                        <Input
                          type="number"
                          value={value}
                          onChange={(e) => {
                            const updated = [...lines];
                            if (rowIdx >= 0) {
                              const plan = [...updated[rowIdx].monthlyPlan];
                              plan[idx] = Number(e.target.value) || 0;
                              updated[rowIdx] = { ...updated[rowIdx], monthlyPlan: plan };
                              setLines(updated);
                            }
                          }}
                          className="h-7 text-xs text-right"
                        />
                      </td>
                    ))}
                  </tr>
                  );
                })}
                {filteredLines.length === 0 && (
                  <tr>
                    <td colSpan={14} className="py-4 text-center text-xs text-muted-foreground">
                      {lines.length > 0 && !isGlobalScope
                        ? isEn
                          ? `No assets found for "${activeWorkspace?.shortName ?? activeWorkspace?.name}". Check oil fields in Master Data.`
                          : `Активы не найдены для «${activeWorkspace?.shortName ?? activeWorkspace?.name}». Проверьте месторождения в Справочниках.`
                        : t("noStageData")}
                    </td>
                  </tr>
                )}
              </tbody>
              {filteredLines.length > 0 && (
                <tfoot>
                  <tr className="border-t border-border text-muted-foreground">
                    <td className="py-2 px-2 font-semibold">{t("total")}</td>
                    <td />
                    {totals.map((value, idx) => (
                      <td key={`total-${idx}`} className="py-2 px-2 text-right font-mono">
                        {value.toFixed(0)}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSave}>{t("saveInputs")}</Button>
            <Button onClick={handleValidate}>{t("validateChain")}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("issuesReport")}</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-2 px-2">{t("severity")}</th>
                <th className="text-left py-2 px-2">{t("stage")}</th>
                <th className="text-right py-2 px-2">{t("month")}</th>
                <th className="text-right py-2 px-2">{t("gap")}</th>
                <th className="text-left py-2 px-2">{t("message")}</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((issue) => (
                <tr key={issue.id} className="border-b border-border/50">
                  <td className="py-2 px-2">
                    <Badge variant={issue.severity === "critical" ? "destructive" : "secondary"}>
                      {issue.severity === "critical" ? t("critical") : t("warning")}
                    </Badge>
                  </td>
                  <td className="py-2 px-2">
                    {stageLabels[(issue.stage as Stage) ?? "UP"] ?? issue.stage}
                  </td>
                  <td className="py-2 px-2 text-right">{issue.month}</td>
                  <td className={`py-2 px-2 text-right font-mono ${issue.gap < 0 ? "text-destructive" : "text-success"}`}>
                    {issue.gap.toFixed(1)}
                  </td>
                  <td className="py-2 px-2">{issue.message}</td>
                </tr>
              ))}
              {issues.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-xs text-muted-foreground">
                    {t("noIssues")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Play, Plus, Trash2, GitCompare, CheckCircle2, Clock, Loader2, Save, ChevronDown } from "lucide-react";
import type { StageInput } from "@/lib/digitalTwinApi";
import { useLanguage } from "@/hooks/useLanguage";
import { useCompanyProfile } from "@/context/CompanyProfileContext";
import { getAuthHeader } from "@/lib/auth";

interface Scenario {
  id: string;
  name: string;
  description: string;
  status: "draft" | "running" | "done";
  owner: string;
  approvalStatus: "draft" | "approved";
  comments: string;
  usdKzt: number;
  oilPriceKz: number;
  brentPrice: number;
  kztInflation: number;
  result?: { totalGap: number; bottleneck: string; utilization: number };
  createdAt: string;
  stages?: StageInput[];
}

const defaultStagesUpstream: StageInput[] = [
  { stage: "UP", label: "Добыча (Upstream)", capacity: 12000, planCorp: 5500, planGov: 4800 },
  { stage: "MID", label: "Транспорт (Midstream)", capacity: 9500, planCorp: 4200, planGov: 4600 },
  { stage: "DOWN", label: "Переработка (Downstream)", capacity: 8000, planCorp: 3800, planGov: 4500 },
  { stage: "EXPORT", label: "Экспорт (Crude)", capacity: 6000, planCorp: 3000, planGov: 3000 },
];

const defaultStagesEnergy: StageInput[] = [
  { stage: "GEN",  label: "Генерация (ГРЭС/ТЭЦ/ГЭС/ВИЭ)", capacity: 22200, planCorp: 8400, planGov: 6320 },
  { stage: "TRAN", label: "Передача НЭС (500–220 кВ)", capacity: 18500, planCorp: 7200, planGov: 5800 },
  { stage: "DIST", label: "Распределение (110–35 кВ)", capacity: 16000, planCorp: 6500, planGov: 5200 },
  { stage: "CONS", label: "Потребление (ЕЭС РК)", capacity: 14520, planCorp: 6100, planGov: 4800 },
];

function getApiBase(): string {
  // Use relative /api - nginx will proxy to backend
  return "/api";
}

export default function Scenarios() {
  const { t, translateData } = useLanguage();
  const { getIndustryPack } = useCompanyProfile();
  const isEnergy = getIndustryPack().id === "energy";
  const defaultStages = isEnergy ? defaultStagesEnergy : defaultStagesUpstream;
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [comparing, setComparing] = useState<string[]>([]);
  const [loadingIds, setLoadingIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const loadScenarios = async (signal?: AbortSignal) => {
    const authHeader = getAuthHeader();
    const response = await fetch(`${getApiBase()}/scenarios`, {
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      signal,
    });
    if (!response.ok) {
      return;
    }
    const payload = (await response.json()) as Scenario[];
    setScenarios(payload);
    setCollapsed((prev) => {
      const next = { ...prev };
      payload.forEach((scenario) => {
        if (next[scenario.id] === undefined) {
          next[scenario.id] = true;
        }
      });
      return next;
    });
  };

  useEffect(() => {
    const controller = new AbortController();

    async function fetchScenarios() {
      try {
        await loadScenarios(controller.signal);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          // keep empty data on error
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchScenarios();
    return () => controller.abort();
  }, []);

  const addScenario = () => {
    const authHeader = getAuthHeader();
    const payload = {
      name: t("newScenario"),
      description: "",
      status: "draft",
      owner: "",
      approvalStatus: "draft",
      comments: "",
      usdKzt: 507,
      oilPriceKz: 70,
      brentPrice: 75,
      kztInflation: 8,
      stages: defaultStages,
    };
    fetch(`${getApiBase()}/scenarios`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(await res.text());
        }
        return res.json();
      })
      .then((scenario: Scenario) => {
        setScenarios((prev) => [scenario, ...prev]);
        setCollapsed((prev) => ({ ...prev, [scenario.id]: true }));
      })
      .catch(() => {});
  };

  const runScenario = (id: string) => {
    const authHeader = getAuthHeader();
    setLoadingIds((prev) => [...prev, id]);
    setScenarios((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "running" as const } : s))
    );
    fetch(`${getApiBase()}/scenarios/${id}/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(
        scenarios.find((s) => s.id === id)?.stages ?? defaultStages
      ),
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(await res.text());
        }
        return res.json();
      })
      .then((updated: Scenario) =>
        setScenarios((prev) => prev.map((s) => (s.id === id ? updated : s)))
      )
      .then(() => loadScenarios())
      .finally(() =>
        setLoadingIds((prev) => prev.filter((scenarioId) => scenarioId !== id))
      );
  };

  const deleteScenario = (id: string) => {
    const authHeader = getAuthHeader();
    fetch(`${getApiBase()}/scenarios/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to delete");
        }
        setScenarios((prev) => prev.filter((s) => s.id !== id));
        setComparing((prev) => prev.filter((c) => c !== id));
      })
      .catch(() => {});
  };

  const updateScenarioField = (id: string, field: keyof Scenario, value: string) => {
    const numericFields: Array<keyof Scenario> = ["usdKzt", "oilPriceKz", "brentPrice", "kztInflation"];
    setScenarios((prev) =>
      prev.map((scenario) =>
        scenario.id === id
          ? {
              ...scenario,
              [field]: numericFields.includes(field) ? Number(value) || 0 : value,
            }
          : scenario
      )
    );
  };

  const updateScenarioStage = (
    scenarioId: string,
    stageIndex: number,
    field: keyof StageInput,
    value: string
  ) => {
    setScenarios((prev) =>
      prev.map((scenario) => {
        if (scenario.id !== scenarioId) return scenario;
        const stages = scenario.stages?.length ? [...scenario.stages] : [...defaultStages];
        stages[stageIndex] = {
          ...stages[stageIndex],
          [field]: field === "label" || field === "stage" ? value : Number(value) || 0,
        };
        return { ...scenario, stages };
      })
    );
  };

  const saveScenario = (scenario: Scenario) => {
    const authHeader = getAuthHeader();
    setLoadingIds((prev) => [...prev, scenario.id]);
    const nextStatus = scenario.status === "draft" ? "done" : scenario.status;
    setScenarios((prev) =>
      prev.map((s) => (s.id === scenario.id ? { ...s, status: nextStatus } : s))
    );
    fetch(`${getApiBase()}/scenarios/${scenario.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify({
        name: scenario.name,
        description: scenario.description,
        status: nextStatus,
        owner: scenario.owner,
        approvalStatus: scenario.approvalStatus,
        comments: scenario.comments,
        usdKzt: scenario.usdKzt,
        oilPriceKz: scenario.oilPriceKz,
        brentPrice: scenario.brentPrice,
        kztInflation: scenario.kztInflation,
        stages: scenario.stages ?? defaultStages,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(await res.text());
        }
        return res.json();
      })
      .then((updated: Scenario) =>
        setScenarios((prev) => prev.map((s) => (s.id === scenario.id ? updated : s)))
      )
      .then(() => loadScenarios())
      .finally(() =>
        setLoadingIds((prev) => prev.filter((scenarioId) => scenarioId !== scenario.id))
      );
  };

  const toggleCompare = (id: string) => {
    setComparing((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  // Only scenarios that have actual result data can be compared
  const comparedScenarios = scenarios.filter((s) => comparing.includes(s.id) && s.result != null);

  const statusConfig = {
    draft: { label: t("statusDraft"), icon: Clock, className: "bg-warning/20 text-warning" },
    running: { label: t("statusRunning"), icon: Loader2, className: "bg-primary/20 text-primary" },
    done: { label: t("statusDone"), icon: CheckCircle2, className: "bg-success/20 text-success" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("scenariosTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("scenariosSubtitle")}</p>
        </div>
        <Button onClick={addScenario} size="sm">
          <Plus className="h-4 w-4 mr-1" /> {t("newScenario")}
        </Button>
      </div>

      {/* Scenario Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenarios.map((s) => {
          const cfg = statusConfig[s.status];
          const isCompared = comparing.includes(s.id);
          const isBusy = loadingIds.includes(s.id);
          const stages = s.stages?.length ? s.stages : defaultStages;
          const isCollapsed = collapsed[s.id] ?? false;
          return (
            <Collapsible
              key={s.id}
              open={!isCollapsed}
              onOpenChange={(open) => setCollapsed((prev) => ({ ...prev, [s.id]: !open }))}
              className={`transition-all ${isCompared ? "ring-2 ring-primary" : ""}`}
            >
              <Card>
                <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{translateData(s.name)}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={cfg.className} variant="secondary">
                      <cfg.icon className={`h-3 w-3 mr-1 ${s.status === "running" ? "animate-spin" : ""}`} />
                      {cfg.label}
                    </Badge>
                    <CollapsibleTrigger asChild>
                      <Button size="icon" variant="ghost" aria-label="Toggle">
                        <ChevronDown className={`h-4 w-4 transition-transform ${isCollapsed ? "" : "rotate-180"}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <Button size="icon" variant="ghost" onClick={() => deleteScenario(s.id)} disabled={isBusy}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {s.description ? translateData(s.description) : t("noDescription")}
                </p>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent>
                  <div className="space-y-3 mb-4">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">{t("name")}</label>
                      <Input
                        value={translateData(s.name)}
                        onChange={(e) => updateScenarioField(s.id, "name", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">{t("description")}</label>
                      <Textarea
                        value={translateData(s.description)}
                        onChange={(e) => updateScenarioField(s.id, "description", e.target.value)}
                        className="min-h-[64px]"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">{t("owner")}</label>
                        <Input
                          value={s.owner}
                          onChange={(e) => updateScenarioField(s.id, "owner", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">{t("approvalStatus")}</label>
                        <select
                          className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                          value={s.approvalStatus}
                          onChange={(e) => updateScenarioField(s.id, "approvalStatus", e.target.value)}
                        >
                          <option value="draft">{t("draft")}</option>
                          <option value="approved">{t("approved")}</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">{t("comments")}</label>
                      <Textarea
                        value={s.comments}
                        onChange={(e) => updateScenarioField(s.id, "comments", e.target.value)}
                        className="min-h-[72px]"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">USD/KZT</label>
                        <Input
                          type="number"
                          value={s.usdKzt}
                          onChange={(e) => updateScenarioField(s.id, "usdKzt", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          {isEnergy ? "Тариф электроэнергии, ₸/кВт·ч" : "KZ Oil Price"}
                        </label>
                        <Input
                          type="number"
                          value={s.oilPriceKz}
                          onChange={(e) => updateScenarioField(s.id, "oilPriceKz", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          {isEnergy ? "Цена мощности БРЭ, ₸/МВт·ч" : "Brent"}
                        </label>
                        <Input
                          type="number"
                          value={s.brentPrice}
                          onChange={(e) => updateScenarioField(s.id, "brentPrice", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          {isEnergy ? "Инфляция, %" : "KZT Inflation"}
                        </label>
                        <Input
                          type="number"
                          value={s.kztInflation}
                          onChange={(e) => updateScenarioField(s.id, "kztInflation", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">{t("chainSettings")}</div>
                      <div className="grid grid-cols-4 gap-2 text-[10px] text-muted-foreground uppercase tracking-wider">
                        <span>{t("stage")}</span>
                        <span>{t("capacity")}</span>
                        <span>{t("govPlan")}</span>
                        <span>{t("corpPlan")}</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {stages.map((stage, idx) => (
                          <div key={stage.stage} className="grid grid-cols-4 gap-2 items-center">
                            <span className="text-xs text-muted-foreground">{translateData(stage.label)}</span>
                            <Input
                              type="number"
                              value={stage.capacity}
                              onChange={(e) => updateScenarioStage(s.id, idx, "capacity", e.target.value)}
                              className="h-8 text-xs font-mono"
                            />
                            <Input
                              type="number"
                              value={stage.planGov}
                              onChange={(e) => updateScenarioStage(s.id, idx, "planGov", e.target.value)}
                              className="h-8 text-xs font-mono"
                            />
                            <Input
                              type="number"
                              value={stage.planCorp}
                              onChange={(e) => updateScenarioStage(s.id, idx, "planCorp", e.target.value)}
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {s.result && (
                    <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                      <div>
                        <div className="text-xs text-muted-foreground">GAP</div>
                        <div className={`text-sm font-bold ${s.result.totalGap >= 0 ? "text-success" : "text-destructive"}`}>
                          {s.result.totalGap > 0 ? "+" : ""}
                          {s.result.totalGap}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">{t("bottleneck")}</div>
                        <div className="text-sm font-medium">{translateData(s.result.bottleneck)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">{t("utilization")}</div>
                        <div className="text-sm font-bold">{s.result.utilization.toFixed(1)}%</div>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => saveScenario(s)} disabled={isBusy}>
                      <Save className="h-3 w-3 mr-1" /> {t("save")}
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => runScenario(s.id)} disabled={isBusy}>
                      {isBusy ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Play className="h-3 w-3 mr-1" />}
                      {t("run")}
                    </Button>
                    {/* Compare button — only for scenarios that have been calculated */}
                    {s.result != null ? (
                      <Button
                        size="sm"
                        variant={isCompared ? "default" : "outline"}
                        className="flex-1"
                        onClick={() => toggleCompare(s.id)}
                        title={comparing.length >= 3 && !isCompared ? "Можно сравнивать не более 3 сценариев" : undefined}
                        disabled={comparing.length >= 3 && !isCompared}
                      >
                        <GitCompare className="h-3 w-3 mr-1" />
                        {isCompared ? t("remove") : t("compare")}
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="flex-1 opacity-40 cursor-not-allowed" disabled title="Сначала запустите расчёт">
                        <GitCompare className="h-3 w-3 mr-1" /> {t("compare")}
                      </Button>
                    )}
                  </div>
                  {/* Hint when scenario has no result yet */}
                  {s.status === "done" && s.result == null && (
                    <p className="text-[11px] text-muted-foreground mt-2">
                      ⚠ Нет данных расчёта — нажмите «Запустить» для получения результатов
                    </p>
                  )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>

      {/* Comparison status hint */}
      {comparing.length > 0 && comparing.length < 2 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground rounded-lg border border-border px-4 py-3">
          <GitCompare className="h-4 w-4 shrink-0" />
          Выбран {comparing.length} из минимум 2 сценариев для сравнения.
          {comparedScenarios.length < comparing.length && (
            <span className="text-warning ml-1">
              (некоторые выбранные сценарии не имеют результатов расчёта)
            </span>
          )}
        </div>
      )}

      {/* Comparison Table */}
      {comparedScenarios.length >= 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <GitCompare className="h-4 w-4" /> {t("compareTitle")}
              </CardTitle>
              <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={() => setComparing([])}>
                Сбросить выбор
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-3 px-3 font-medium w-36">{t("metrics")}</th>
                    {comparedScenarios.map((s) => (
                      <th key={s.id} className="text-right py-3 px-3 font-medium min-w-[140px]">
                        <div className="truncate max-w-[140px] ml-auto">{translateData(s.name)}</div>
                        <div className="text-[10px] font-normal text-muted-foreground/60 truncate">
                          {s.owner || "—"} · {new Date(s.createdAt).toLocaleDateString("ru-RU")}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* GAP row */}
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-3 text-muted-foreground font-medium">{t("gap")}</td>
                    {comparedScenarios.map((s) => (
                      <td key={s.id} className={`py-3 px-3 text-right font-mono font-bold text-base ${s.result!.totalGap >= 0 ? "text-success" : "text-destructive"}`}>
                        {s.result!.totalGap > 0 ? "+" : ""}{s.result!.totalGap.toLocaleString()}
                      </td>
                    ))}
                  </tr>
                  {/* Bottleneck row */}
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-3 text-muted-foreground font-medium">{t("bottleneck")}</td>
                    {comparedScenarios.map((s) => (
                      <td key={s.id} className="py-3 px-3 text-right text-xs">
                        {translateData(s.result!.bottleneck)}
                      </td>
                    ))}
                  </tr>
                  {/* Utilization row with bar */}
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-3 text-muted-foreground font-medium">{t("utilization")}</td>
                    {comparedScenarios.map((s) => {
                      const pct = Math.min(100, Math.max(0, s.result!.utilization));
                      const color = pct >= 90 ? "bg-success" : pct >= 70 ? "bg-warning" : "bg-destructive";
                      return (
                        <td key={s.id} className="py-3 px-3">
                          <div className="flex flex-col items-end gap-1">
                            <span className="font-mono font-bold text-sm">{pct.toFixed(1)}%</span>
                            <div className="w-full max-w-[120px] h-2 rounded-full bg-muted overflow-hidden ml-auto">
                              <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                  {/* Economic params */}
                  {(isEnergy ? [
                    { label: "USD/KZT", key: "usdKzt" as const },
                    { label: "Тариф ₸/кВт·ч", key: "oilPriceKz" as const },
                    { label: "Цена мощности БРЭ", key: "brentPrice" as const },
                    { label: "Инфляция %", key: "kztInflation" as const },
                  ] : [
                    { label: "USD/KZT", key: "usdKzt" as const },
                    { label: "Brent ($/bbl)", key: "brentPrice" as const },
                    { label: "KZ Oil Price", key: "oilPriceKz" as const },
                    { label: "KZT Inflation %", key: "kztInflation" as const },
                  ]).map(({ label, key }) => (
                    <tr key={key} className="border-b border-border/50">
                      <td className="py-2 px-3 text-muted-foreground text-xs">{label}</td>
                      {comparedScenarios.map((s) => (
                        <td key={s.id} className="py-2 px-3 text-right font-mono text-xs">
                          {s[key] ?? "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Run Results Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("runResults")}</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-3 px-2 font-medium">{t("scenariosTitle")}</th>
                <th className="text-left py-3 px-2 font-medium">{t("status")}</th>
                <th className="text-right py-3 px-2 font-medium">{t("gap")}</th>
                <th className="text-left py-3 px-2 font-medium">{t("bottleneck")}</th>
                <th className="text-right py-3 px-2 font-medium">{t("utilization")}</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.filter((s) => s.result).map((s) => (
                <tr key={s.id} className="border-b border-border/50">
                  <td className="py-2 px-2 font-medium">{translateData(s.name)}</td>
                  <td className="py-2 px-2">
                    <Badge className={statusConfig[s.status].className} variant="secondary">
                      {statusConfig[s.status].label}
                    </Badge>
                  </td>
                  <td className={`py-2 px-2 text-right font-mono font-medium ${s.result!.totalGap >= 0 ? "text-success" : "text-destructive"}`}>
                    {s.result!.totalGap > 0 ? "+" : ""}{s.result!.totalGap}
                  </td>
                  <td className="py-2 px-2">{translateData(s.result!.bottleneck)}</td>
                  <td className="py-2 px-2 text-right font-mono">{s.result!.utilization.toFixed(1)}%</td>
                </tr>
              ))}
              {!scenarios.some((s) => s.result) && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-xs text-muted-foreground">
                    {t("noResults")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
      {isLoading && (
        <div className="text-xs text-muted-foreground">{t("loadingScenarios")}</div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { useTheme } from "@/hooks/useTheme";
import { getAuthHeader } from "@/lib/auth";
import {
  Droplets, Truck, Factory, Ship, ArrowRight, AlertTriangle,
  Gauge, TrendingDown, Activity, ChevronDown, ChevronUp, Filter,
} from "lucide-react";

interface MasterDataRow {
  id: number;
  code: string;
  name: string;
  capacity: number;
  currentMonth: number;
  currentDay: number;
  region?: string | null;
  status?: string | null;
}

interface StageConfig {
  key: string;
  label: string;
  icon: React.ElementType;
  color: string;
  colorLight: string;
}

const STAGES: StageConfig[] = [
  { key: "UP", label: "Добыча", icon: Droplets, color: "#5CE0D6", colorLight: "#0D9488" },
  { key: "MID", label: "Транспорт", icon: Truck, color: "#60A5FA", colorLight: "#2563EB" },
  { key: "DOWN", label: "Переработка", icon: Factory, color: "#FB923C", colorLight: "#EA580C" },
  { key: "EXPORT", label: "Экспорт", icon: Ship, color: "#4ADE80", colorLight: "#16A34A" },
];

interface StageResult {
  key: string;
  label: string;
  capacity: number;
  plan: number;
  utilization: number;
  surplus: number;
  status: "green" | "yellow" | "red";
  isBottleneck: boolean;
  companies: { name: string; capacity: number; utilization: number }[];
}

function getApiBase() { return "/api"; }

function calcUtilStatus(util: number): "green" | "yellow" | "red" {
  if (util >= 95) return "red";
  if (util >= 80) return "yellow";
  return "green";
}

const STATUS_COLORS = {
  green: { bg: "rgba(74,222,128,0.12)", border: "rgba(74,222,128,0.3)", text: "#4ADE80", label: "Норма" },
  yellow: { bg: "rgba(250,204,21,0.12)", border: "rgba(250,204,21,0.3)", text: "#FACC15", label: "Напряжение" },
  red: { bg: "rgba(251,113,133,0.12)", border: "rgba(251,113,133,0.3)", text: "#FB7185", label: "Ограничение" },
};

export default function DigitalTwin() {
  const { t, translateData } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [extractionCompanies, setExtractionCompanies] = useState<MasterDataRow[]>([]);
  const [transportSections, setTransportSections] = useState<MasterDataRow[]>([]);
  const [processingPlants, setProcessingPlants] = useState<MasterDataRow[]>([]);
  const [exportDests, setExportDests] = useState<MasterDataRow[]>([]);

  const [selExtraction, setSelExtraction] = useState<string[]>([]);
  const [selTransport, setSelTransport] = useState<string[]>([]);
  const [selProcessing, setSelProcessing] = useState<string[]>([]);
  const [selExport, setSelExport] = useState<string[]>([]);

  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const auth = getAuthHeader();
    const headers = { "Content-Type": "application/json", ...(auth ? { Authorization: auth } : {}) };
    const load = async (path: string) => {
      try {
        const res = await fetch(`${getApiBase()}${path}`, { headers, signal: controller.signal });
        return res.ok ? ((await res.json()) as MasterDataRow[]) : [];
      } catch { return []; }
    };
    (async () => {
      const [ext, trn, proc, exp] = await Promise.all([
        load("/master-data/extraction-companies"),
        load("/master-data/transportation-sections"),
        load("/master-data/processing-plants"),
        load("/master-data/export-destinations"),
      ]);
      setExtractionCompanies(ext);
      setTransportSections(trn);
      setProcessingPlants(proc);
      setExportDests(exp);
    })();
    return () => controller.abort();
  }, []);

  const dataMap: Record<string, { items: MasterDataRow[]; selected: string[] }> = {
    UP: { items: extractionCompanies, selected: selExtraction },
    MID: { items: transportSections, selected: selTransport },
    DOWN: { items: processingPlants, selected: selProcessing },
    EXPORT: { items: exportDests, selected: selExport },
  };

  const stageResults: StageResult[] = useMemo(() => {
    return STAGES.map((stage) => {
      const { items, selected } = dataMap[stage.key];
      const filtered = selected.length ? items.filter((i) => selected.includes(i.code)) : items;
      const capacity = filtered.reduce((s, i) => s + i.capacity, 0);
      const plan = filtered.reduce((s, i) => s + (i.currentMonth > 0 ? i.currentMonth : i.capacity * 0.85), 0);
      const utilization = capacity > 0 ? (plan / capacity) * 100 : 0;
      const surplus = capacity - plan;
      const companies = filtered.map((i) => {
        const p = i.currentMonth > 0 ? i.currentMonth : i.capacity * 0.85;
        return { name: i.name, capacity: i.capacity, utilization: i.capacity > 0 ? (p / i.capacity) * 100 : 0 };
      });
      return {
        key: stage.key,
        label: stage.label,
        capacity,
        plan: Math.round(plan),
        utilization: Math.round(utilization * 10) / 10,
        surplus: Math.round(surplus),
        status: calcUtilStatus(utilization),
        isBottleneck: false,
        companies,
      };
    });
  }, [extractionCompanies, transportSections, processingPlants, exportDests, selExtraction, selTransport, selProcessing, selExport]);

  const feasibleVolume = Math.min(...stageResults.map((s) => s.capacity));
  const bottleneckIdx = stageResults.findIndex((s) => s.capacity === feasibleVolume);
  const totalCapacity = stageResults.reduce((s, r) => s + r.capacity, 0);
  const avgUtilization = stageResults.length > 0
    ? Math.round(stageResults.reduce((s, r) => s + r.utilization, 0) / stageResults.length * 10) / 10
    : 0;
  const gap = stageResults.length > 0
    ? feasibleVolume - Math.max(...stageResults.map((s) => s.plan))
    : 0;

  if (bottleneckIdx >= 0) stageResults[bottleneckIdx].isBottleneck = true;

  const setterMap: Record<string, React.Dispatch<React.SetStateAction<string[]>>> = {
    UP: setSelExtraction, MID: setSelTransport, DOWN: setSelProcessing, EXPORT: setSelExport,
  };

  const toggleCode = (stageKey: string, code: string) => {
    const setter = setterMap[stageKey];
    setter((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]);
  };

  const clearFilter = (stageKey: string) => setterMap[stageKey]([]);

  const cardBg = isDark ? "rgba(12,18,30,0.70)" : "rgba(255,255,255,0.90)";
  const borderCol = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-xl font-bold tracking-tight">{t("digitalTwinTitle")}</h1>
          <Badge variant="outline" className="text-[10px] uppercase tracking-widest font-semibold border-primary/30 text-primary">
            Oil & Gas
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">Баланс мощностей цепочки: от добычи до экспорта</p>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Пропускная способность", value: `${feasibleVolume.toLocaleString()}`, unit: "тыс.т", icon: Gauge, color: "#5CE0D6" },
          { label: "Узкое место", value: bottleneckIdx >= 0 ? stageResults[bottleneckIdx].label : "—", unit: STAGES[bottleneckIdx]?.key ?? "", icon: AlertTriangle, color: "#FB7185" },
          { label: "Ср. загрузка", value: `${avgUtilization}%`, unit: "утилизация", icon: Activity, color: "#FACC15" },
          { label: "Резерв / Дефицит", value: `${gap > 0 ? "+" : ""}${gap.toLocaleString()}`, unit: "тыс.т", icon: TrendingDown, color: gap >= 0 ? "#4ADE80" : "#FB7185" },
        ].map((kpi, i) => (
          <div
            key={i}
            className="rounded-lg p-3"
            style={{ background: cardBg, border: `1px solid ${borderCol}` }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: kpi.color }}>{kpi.label}</span>
              <kpi.icon className="h-3.5 w-3.5" style={{ color: kpi.color }} />
            </div>
            <div className="text-xl font-bold" style={{ color: isDark ? "#fff" : "#0f172a" }}>{kpi.value}</div>
            <div className="text-[10px]" style={{ color: isDark ? "rgba(255,255,255,0.35)" : "rgba(15,23,42,0.45)" }}>{kpi.unit}</div>
          </div>
        ))}
      </div>

      {/* Visual Pipeline Flow */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] gap-0 items-stretch">
        {stageResults.map((result, i) => {
          const stage = STAGES[i];
          const StIcon = stage.icon;
          const accent = isDark ? stage.color : stage.colorLight;
          const sc = STATUS_COLORS[result.status];
          const isExpanded = expandedStage === stage.key;
          const { items, selected } = dataMap[stage.key];

          return (
            <div key={stage.key} className="contents">
              {/* Stage Card */}
              <div
                className="rounded-xl p-4 space-y-3 transition-all duration-300 cursor-pointer"
                style={{
                  background: cardBg,
                  border: result.isBottleneck
                    ? `2px solid ${sc.border}`
                    : `1px solid ${borderCol}`,
                  boxShadow: result.isBottleneck && isDark ? `0 0 20px ${sc.text}20` : "none",
                }}
                onClick={() => setExpandedStage(isExpanded ? null : stage.key)}
              >
                {/* Stage header */}
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: `${accent}20`, color: accent }}
                  >
                    <StIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold" style={{ color: isDark ? "#fff" : "#0f172a" }}>{result.label}</div>
                    <div className="text-[10px] font-mono" style={{ color: isDark ? "rgba(255,255,255,0.35)" : "rgba(15,23,42,0.40)" }}>{stage.key}</div>
                  </div>
                  {result.isBottleneck && (
                    <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }} className="text-[9px] px-1.5">
                      УЗКОЕ МЕСТО
                    </Badge>
                  )}
                </div>

                {/* Utilization bar */}
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span style={{ color: isDark ? "rgba(255,255,255,0.45)" : "rgba(15,23,42,0.50)" }}>Загрузка</span>
                    <span className="font-bold font-mono" style={{ color: sc.text }}>{result.utilization}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(result.utilization, 100)}%`,
                        background: `linear-gradient(90deg, ${accent}, ${sc.text})`,
                      }}
                    />
                  </div>
                </div>

                {/* Numbers */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <div style={{ color: isDark ? "rgba(255,255,255,0.35)" : "rgba(15,23,42,0.40)" }}>Мощность</div>
                    <div className="font-bold font-mono text-sm" style={{ color: isDark ? "#fff" : "#0f172a" }}>{result.capacity.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ color: isDark ? "rgba(255,255,255,0.35)" : "rgba(15,23,42,0.40)" }}>Объём</div>
                    <div className="font-bold font-mono text-sm" style={{ color: accent }}>{result.plan.toLocaleString()}</div>
                  </div>
                </div>

                {/* Surplus */}
                <div className="flex items-center justify-between text-[10px]">
                  <span style={{ color: isDark ? "rgba(255,255,255,0.30)" : "rgba(15,23,42,0.35)" }}>
                    Резерв: <span className="font-mono font-semibold" style={{ color: result.surplus >= 0 ? "#4ADE80" : "#FB7185" }}>
                      {result.surplus >= 0 ? "+" : ""}{result.surplus.toLocaleString()} тыс.т
                    </span>
                  </span>
                  {isExpanded ? <ChevronUp className="h-3 w-3" style={{ color: accent }} /> : <ChevronDown className="h-3 w-3" style={{ color: isDark ? "rgba(255,255,255,0.25)" : "rgba(15,23,42,0.30)" }} />}
                </div>

                {/* Filter dropdown */}
                <div className="pt-1 border-t" style={{ borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full h-7 text-[10px] justify-between gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1">
                          <Filter className="h-3 w-3" />
                          {selected.length === 0 ? "Все компании" : `Выбрано: ${selected.length}`}
                        </div>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[280px]" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuLabel className="text-[11px]">{result.label}</DropdownMenuLabel>
                      <DropdownMenuCheckboxItem
                        checked={selected.length === 0}
                        onCheckedChange={(checked) => { if (checked) clearFilter(stage.key); }}
                      >
                        Все
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuSeparator />
                      {items.map((item) => (
                        <DropdownMenuCheckboxItem
                          key={item.code}
                          checked={selected.includes(item.code)}
                          onCheckedChange={() => toggleCode(stage.key, item.code)}
                        >
                          <div className="flex justify-between w-full gap-2">
                            <span className="truncate">{translateData(item.name)}</span>
                            <span className="text-[10px] font-mono text-muted-foreground shrink-0">{item.capacity.toLocaleString()}</span>
                          </div>
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Arrow between stages */}
              {i < stageResults.length - 1 && (
                <div className="hidden md:flex items-center justify-center px-1">
                  <div className="flex flex-col items-center gap-1">
                    <ArrowRight
                      className="h-5 w-5"
                      style={{
                        color: isDark ? "rgba(92,224,214,0.4)" : "rgba(13,148,136,0.3)",
                      }}
                    />
                    <span className="text-[8px] font-mono" style={{ color: isDark ? "rgba(255,255,255,0.20)" : "rgba(15,23,42,0.25)" }}>
                      {Math.min(result.plan, stageResults[i + 1]?.capacity ?? Infinity).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Expanded detail for selected stage */}
      {expandedStage && (() => {
        const idx = stageResults.findIndex((s) => s.key === expandedStage);
        if (idx < 0) return null;
        const result = stageResults[idx];
        const stage = STAGES[idx];
        const accent = isDark ? stage.color : stage.colorLight;

        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <stage.icon className="h-4 w-4" style={{ color: accent }} />
                {result.label} — детализация по компаниям
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {result.companies.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">Нет данных</p>
                )}
                {result.companies
                  .sort((a, b) => b.capacity - a.capacity)
                  .map((c, ci) => {
                    const cStatus = calcUtilStatus(c.utilization);
                    const cSc = STATUS_COLORS[cStatus];
                    return (
                      <div
                        key={ci}
                        className="flex items-center gap-3 p-2.5 rounded-lg"
                        style={{ background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{translateData(c.name)}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {c.capacity.toLocaleString()} тыс.т
                          </div>
                        </div>
                        <div className="w-32 shrink-0">
                          <div className="flex justify-between text-[10px] mb-0.5">
                            <span className="text-muted-foreground">Загрузка</span>
                            <span className="font-mono font-bold" style={{ color: cSc.text }}>
                              {Math.round(c.utilization)}%
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(c.utilization, 100)}%`,
                                background: cSc.text,
                              }}
                            />
                          </div>
                        </div>
                        <Badge style={{ background: cSc.bg, color: cSc.text, border: `1px solid ${cSc.border}` }} className="text-[9px] px-1.5 shrink-0">
                          {cSc.label}
                        </Badge>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Recommendations */}
      {stageResults.length > 0 && stageResults.some((s) => s.status !== "green") && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Рекомендации
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stageResults.filter((s) => s.isBottleneck).map((s) => (
                <div key={`bn-${s.key}`} className="flex items-start gap-2 text-sm">
                  <span className="text-destructive font-semibold">●</span>
                  <span>
                    <strong>{s.label}</strong> является узким местом цепочки с мощностью{" "}
                    <span className="font-mono font-semibold">{s.capacity.toLocaleString()} тыс.т</span>.
                    Увеличение мощности этого звена позволит пропустить больший объём через всю цепочку.
                  </span>
                </div>
              ))}
              {stageResults.filter((s) => s.status === "red" && !s.isBottleneck).map((s) => (
                <div key={`red-${s.key}`} className="flex items-start gap-2 text-sm">
                  <span className="text-warning font-semibold">●</span>
                  <span>
                    <strong>{s.label}</strong> загружен на{" "}
                    <span className="font-mono font-semibold">{s.utilization}%</span> — близок к пределу.
                    Рекомендуется оптимизировать плановые объёмы или увеличить мощность.
                  </span>
                </div>
              ))}
              {stageResults.filter((s) => s.status === "yellow").map((s) => (
                <div key={`yel-${s.key}`} className="flex items-start gap-2 text-sm">
                  <span style={{ color: "#FACC15" }} className="font-semibold">●</span>
                  <span>
                    <strong>{s.label}</strong> загружен на{" "}
                    <span className="font-mono font-semibold">{s.utilization}%</span> — умеренная загрузка.
                    Мониторинг при росте объёмов.
                  </span>
                </div>
              ))}
              {stageResults.every((s) => s.status === "green") && (
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-success font-semibold">●</span>
                  <span>Все звенья цепочки работают в штатном режиме. Резерв мощностей достаточен.</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

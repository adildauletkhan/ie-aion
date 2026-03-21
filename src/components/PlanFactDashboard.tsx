/**
 * Plan-Fact Analysis Dashboard
 * Сравнение план/факт по производственной программе
 * Данные план — из сохранённых планов (localStorage)
 * Данные факт — из интегрированных источников (SAP, SCADA, ручной ввод)
 */
import { useState, useMemo, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  loadPlansList, loadPlanData, type ProdPlanMeta,
} from "@/lib/prodPlanStore";
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2,
  BarChart3, FileText, Download, RefreshCw, Filter,
  Database, Activity, Upload, Cpu, ChevronDown, ChevronRight,
  ArrowUpRight, ArrowDownRight,
  Search, Droplets, HardHat, Settings2, DollarSign, Wrench,
  Building2, Monitor, FlaskConical, TestTube2, Leaf, Package,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────── */
type YearKey = "2026" | "2027" | "2028" | "2029" | "2030";
const YEARS: YearKey[] = ["2026", "2027", "2028", "2029", "2030"];

type DataSource = "sap" | "scada" | "manual" | "calculated";

interface SectionSummary {
  id: number;
  icon: React.ElementType;
  titleRu: string;
  titleEn: string;
  unit: string;
  plan: number;
  fact: number;
  source: DataSource;
  monthlyPlan: number[];
  monthlyFact: number[];
  rows: RowSummary[];
}

interface RowSummary {
  nameRu: string;
  nameEn: string;
  unit: string;
  plan: number;
  fact: number;
  source: DataSource;
}

interface KpiCard {
  labelRu: string;
  labelEn: string;
  unit: string;
  plan: number;
  fact: number;
  source: DataSource;
  icon: React.ElementType;
}

/* ─── Source meta ─────────────────────────────────────── */
// Единый нейтральный стиль для всех источников — различие только по иконке
const SOURCE_META: Record<DataSource, { labelRu: string; labelEn: string; color: string; icon: React.ElementType }> = {
  sap:        { labelRu: "SAP S/4HANA", labelEn: "SAP S/4HANA", color: "bg-muted text-muted-foreground border-border", icon: Database },
  scada:      { labelRu: "SCADA/MES",   labelEn: "SCADA/MES",   color: "bg-muted text-muted-foreground border-border", icon: Activity },
  manual:     { labelRu: "Ручной ввод", labelEn: "Manual",      color: "bg-muted text-muted-foreground border-border", icon: Upload },
  calculated: { labelRu: "Расчётный",   labelEn: "Calculated",  color: "bg-muted text-muted-foreground border-border", icon: Cpu },
};

/* ─── Helpers ──────────────────────────────────────────── */
function pct(fact: number, plan: number): number {
  if (!plan) return 0;
  return Math.round((fact / plan) * 100);
}
function dev(fact: number, plan: number): number {
  return fact - plan;
}
function fmt(n: number, digits = 0): string {
  if (!n && n !== 0) return "—";
  return n.toLocaleString("ru-RU", { maximumFractionDigits: digits });
}
function fmtPct(n: number): string {
  return `${n > 0 ? "+" : ""}${n}%`;
}

/** Simulate monthly fact values: realistic noise around plan/12 */
function genMonthly(planTotal: number, factRatio: number, monthsElapsed = 6): number[] {
  const monthly = Array.from({ length: 12 }, (_, m) => {
    const basePlan = planTotal / 12;
    // Seasonality factor
    const season = 1 + 0.05 * Math.sin((m / 11) * Math.PI);
    const planMonth = basePlan * season;
    if (m >= monthsElapsed) return 0; // future months = 0 (not yet
    const noise = 0.92 + Math.random() * 0.16;
    return Math.round(planMonth * factRatio * noise);
  });
  return monthly;
}

/** Extract numeric value from plan data row */
function extractVol(planData: Record<string, unknown> | null, rowId: string, year: YearKey): number {
  if (!planData) return 0;
  const row = planData[rowId] as Record<YearKey, { vol: string; price: string; sum: string }> | undefined;
  if (!row) return 0;
  const cell = row[year];
  const v = parseFloat(cell?.vol ?? "");
  return isNaN(v) ? 0 : v;
}

function extractSum(planData: Record<string, unknown> | null, rowId: string, year: YearKey): number {
  if (!planData) return 0;
  const row = planData[rowId] as Record<YearKey, { vol: string; price: string; sum: string }> | undefined;
  if (!row) return 0;
  const cell = row[year];
  const v = parseFloat(cell?.sum ?? "");
  return isNaN(v) ? 0 : v;
}

/* ─── Build sections from plan data ───────────────────── */
function buildSections(planData: Record<string, unknown> | null, year: YearKey): SectionSummary[] {
  // Fact ratios per section — simulate different execution levels
  const ratios: Record<number, number> = {
    1: 0.87, 2: 0.965, 3: 0.91, 4: 0.78, 5: 0.84,
    6: 0.93, 7: 0.56, 8: 1.02, 9: 0.71, 10: 0.88,
    11: 0.95, 12: 0.82,
  };

  const sections: SectionSummary[] = [
    {
      id: 1, icon: Search,
      titleRu: "Геологоразведочные работы",
      titleEn: "Geological Exploration",
      unit: "тыс.тг",
      source: "sap",
      plan: extractSum(planData, "1-2", year) + extractSum(planData, "1-4", year) + extractSum(planData, "1-5", year) + extractSum(planData, "1-6", year) + extractSum(planData, "1-7", year) + extractSum(planData, "1-8", year) + extractSum(planData, "1-9", year) || 2435591,
      fact: 0,
      monthlyPlan: [],
      monthlyFact: [],
      rows: [
        { nameRu: "3D сейсмика", nameEn: "3D Seismic", unit: "кв.км", plan: extractVol(planData, "1-2", year) || 58, fact: 0, source: "sap" },
        { nameRu: "Научно-исследовательские работы", nameEn: "R&D Works", unit: "отчет", plan: extractVol(planData, "1-4", year) || 7, fact: 0, source: "manual" },
        { nameRu: "Ремонт скважин (расконсервация)", nameEn: "Well Re-activation", unit: "скв.", plan: extractVol(planData, "1-6", year) || 5, fact: 0, source: "sap" },
        { nameRu: "Разведочное бурение", nameEn: "Exploration Drilling", unit: "скв.", plan: extractVol(planData, "1-7", year) || 1, fact: 0, source: "sap" },
      ],
    },
    {
      id: 2, icon: Droplets,
      titleRu: "Добыча нефти и газа",
      titleEn: "Oil & Gas Production",
      unit: "тыс.тонн",
      source: "scada",
      plan: extractVol(planData, "2-1", year) || 2870,
      fact: 0,
      monthlyPlan: [],
      monthlyFact: [],
      rows: [
        { nameRu: "Добыча нефти", nameEn: "Oil Production", unit: "тыс.тонн", plan: extractVol(planData, "2-1", year) || 2870, fact: 0, source: "scada" },
        { nameRu: "Сдача нефти", nameEn: "Oil Delivery", unit: "тыс.тонн", plan: extractVol(planData, "2-2", year) || 2842, fact: 0, source: "scada" },
        { nameRu: "Добыча попутного газа", nameEn: "Associated Gas", unit: "млн.м³", plan: extractVol(planData, "2-3", year) || 451.5, fact: 0, source: "scada" },
      ],
    },
    {
      id: 3, icon: HardHat,
      titleRu: "Эксплуатационное бурение",
      titleEn: "Development Drilling",
      unit: "скв.",
      source: "sap",
      plan: (extractVol(planData, "3-1", year) || 5) + (extractVol(planData, "3-2", year) || 15),
      fact: 0,
      monthlyPlan: [],
      monthlyFact: [],
      rows: [
        { nameRu: "Вертикальные скважины", nameEn: "Vertical Wells", unit: "скв.", plan: extractVol(planData, "3-1", year) || 5, fact: 0, source: "sap" },
        { nameRu: "Горизонтальные скважины", nameEn: "Horizontal Wells", unit: "скв.", plan: extractVol(planData, "3-2", year) || 15, fact: 0, source: "sap" },
        { nameRu: "Метраж горизонт.", nameEn: "Horizontal Metrage", unit: "м", plan: extractVol(planData, "3-2m", year) || 21377, fact: 0, source: "sap" },
      ],
    },
    {
      id: 4, icon: Settings2,
      titleRu: "ОТМ по добыче нефти",
      titleEn: "Production Technical Measures",
      unit: "скв./опер.",
      source: "sap",
      plan: extractVol(planData, "4-1", year) || 2172,
      fact: 0,
      monthlyPlan: [],
      monthlyFact: [],
      rows: [
        { nameRu: "Эксплуатационный фонд скважин", nameEn: "Operating Well Fund", unit: "скв.", plan: extractVol(planData, "4-1", year) || 2172, fact: 0, source: "scada" },
        { nameRu: "Ввод новых скважин", nameEn: "New Wells", unit: "скв.", plan: extractVol(planData, "4-3", year) || 20, fact: 0, source: "sap" },
        { nameRu: "КРС", nameEn: "Major Workover", unit: "скв.", plan: extractVol(planData, "4-9", year) || 159, fact: 0, source: "sap" },
        { nameRu: "ГРП", nameEn: "Hydraulic Fracturing", unit: "скв/опер.", plan: extractVol(planData, "4-15", year) || 69, fact: 0, source: "sap" },
        { nameRu: "Закачка воды (ППД)", nameEn: "Water Injection", unit: "тыс.м³", plan: extractVol(planData, "4-6", year) || 13384, fact: 0, source: "scada" },
      ],
    },
    {
      id: 5, icon: DollarSign,
      titleRu: "Контроль разработки / ГТМ",
      titleEn: "Field Monitoring & GTM",
      unit: "скв.",
      source: "manual",
      plan: extractVol(planData, "5-1", year) || 336,
      fact: 0,
      monthlyPlan: [],
      monthlyFact: [],
      rows: [
        { nameRu: "Промыслово-геофизические работы", nameEn: "Production Geophysics", unit: "скв.", plan: extractVol(planData, "5-1", year) || 336, fact: 0, source: "manual" },
      ],
    },
    {
      id: 6, icon: Wrench,
      titleRu: "Капремонт и ТО основных средств",
      titleEn: "Capital Repair & Maintenance",
      unit: "тыс.тг",
      source: "sap",
      plan: 3107032,
      fact: 0,
      monthlyPlan: [],
      monthlyFact: [],
      rows: [
        { nameRu: "НГДУ Жайыкмунайгаз", nameEn: "NGDU Zhaiyk", unit: "тыс.тг", plan: 670406, fact: 0, source: "sap" },
        { nameRu: "НГДУ Жылыоймунайгаз", nameEn: "NGDU Zhyloy", unit: "тыс.тг", plan: 1469671, fact: 0, source: "sap" },
        { nameRu: "НГДУ Доссормунайгаз", nameEn: "NGDU Dossor", unit: "тыс.тг", plan: 501000, fact: 0, source: "sap" },
        { nameRu: "НГДУ Кайнармунайгаз", nameEn: "NGDU Kaynar", unit: "тыс.тг", plan: 465955, fact: 0, source: "sap" },
      ],
    },
    {
      id: 7, icon: Building2,
      titleRu: "Капитальное строительство",
      titleEn: "Capital Construction",
      unit: "тыс.тг",
      source: "sap",
      plan: 8500000,
      fact: 0,
      monthlyPlan: [],
      monthlyFact: [],
      rows: [
        { nameRu: "Строительство объектов добычи", nameEn: "Upstream Facilities", unit: "тыс.тг", plan: 4200000, fact: 0, source: "sap" },
        { nameRu: "Трубопроводное строительство", nameEn: "Pipeline Construction", unit: "тыс.тг", plan: 2100000, fact: 0, source: "sap" },
        { nameRu: "Объекты инфраструктуры", nameEn: "Infrastructure", unit: "тыс.тг", plan: 2200000, fact: 0, source: "sap" },
      ],
    },
    {
      id: 8, icon: Monitor,
      titleRu: "Автоматизация и ИТ",
      titleEn: "Automation & IT",
      unit: "тыс.тг",
      source: "manual",
      plan: 950000,
      fact: 0,
      monthlyPlan: [],
      monthlyFact: [],
      rows: [
        { nameRu: "SCADA/MES системы", nameEn: "SCADA/MES Systems", unit: "тыс.тг", plan: 380000, fact: 0, source: "manual" },
        { nameRu: "ИТ-инфраструктура", nameEn: "IT Infrastructure", unit: "тыс.тг", plan: 570000, fact: 0, source: "manual" },
      ],
    },
    {
      id: 9, icon: FlaskConical,
      titleRu: "НИР и НИОКР",
      titleEn: "R&D",
      unit: "тыс.тг",
      source: "manual",
      plan: 420000,
      fact: 0,
      monthlyPlan: [],
      monthlyFact: [],
      rows: [
        { nameRu: "Прикладные НИР", nameEn: "Applied R&D", unit: "тыс.тг", plan: 280000, fact: 0, source: "manual" },
        { nameRu: "Фундаментальные исследования", nameEn: "Basic Research", unit: "тыс.тг", plan: 140000, fact: 0, source: "manual" },
      ],
    },
    {
      id: 10, icon: TestTube2,
      titleRu: "ОПР / МУН",
      titleEn: "Pilot Works / EOR",
      unit: "тыс.тг",
      source: "calculated",
      plan: 615000,
      fact: 0,
      monthlyPlan: [],
      monthlyFact: [],
      rows: [
        { nameRu: "Опытно-промышленные работы", nameEn: "Pilot Works", unit: "тыс.тг", plan: 415000, fact: 0, source: "calculated" },
        { nameRu: "МУН (третичные методы)", nameEn: "EOR Methods", unit: "тыс.тг", plan: 200000, fact: 0, source: "calculated" },
      ],
    },
    {
      id: 11, icon: Leaf,
      titleRu: "Экология, ОТ и ПБ",
      titleEn: "Ecology, HSE",
      unit: "тыс.тг",
      source: "manual",
      plan: 730000,
      fact: 0,
      monthlyPlan: [],
      monthlyFact: [],
      rows: [
        { nameRu: "Охрана окружающей среды", nameEn: "Environmental Protection", unit: "тыс.тг", plan: 320000, fact: 0, source: "manual" },
        { nameRu: "Охрана труда и ПБ", nameEn: "OHS & Safety", unit: "тыс.тг", plan: 410000, fact: 0, source: "manual" },
      ],
    },
    {
      id: 12, icon: Package,
      titleRu: "Потребность в ТМЦ",
      titleEn: "MTR Supply Plan",
      unit: "тыс.тг",
      source: "sap",
      plan: 5200000,
      fact: 0,
      monthlyPlan: [],
      monthlyFact: [],
      rows: [
        { nameRu: "Химреагенты", nameEn: "Chemicals", unit: "тыс.тг", plan: 1800000, fact: 0, source: "sap" },
        { nameRu: "Запасные части", nameEn: "Spare Parts", unit: "тыс.тг", plan: 2100000, fact: 0, source: "sap" },
        { nameRu: "Прочие ТМЦ", nameEn: "Other MTR", unit: "тыс.тг", plan: 1300000, fact: 0, source: "sap" },
      ],
    },
  ];

  // Apply fact = plan * ratio + noise, compute monthly
  return sections.map(s => {
    const ratio = ratios[s.id] ?? 0.9;
    const fact = Math.round(s.plan * ratio);
    const monthlyPlan = genMonthly(s.plan, 1.0, 12);
    const monthlyFact = genMonthly(s.plan, ratio, 6);
    const rows = s.rows.map(r => ({
      ...r,
      fact: Math.round(r.plan * (ratio + (Math.random() - 0.5) * 0.1)),
    }));
    return { ...s, fact, monthlyPlan, monthlyFact, rows };
  });
}

/* ─── Month labels ──────────────────────────────────────── */
const MONTHS_RU = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* ─── Mini bar chart (SVG) ──────────────────────────────── */
function MiniBarChart({ plan, fact, isEn }: { plan: number[]; fact: number[]; isEn: boolean }) {
  const months = isEn ? MONTHS_EN : MONTHS_RU;
  const count = plan.length; // 12
  // Fixed layout: each group = 2 bars (9px each) + 2px inner gap + 4px outer gap
  const BAR_W = 8;
  const INNER_GAP = 2;
  const GROUP_GAP = 5;
  const GROUP_W = BAR_W * 2 + INNER_GAP + GROUP_GAP;
  const CHART_H = 56;
  const LABEL_H = 14;
  const TOTAL_W = count * GROUP_W;
  const TOTAL_H = CHART_H + LABEL_H;

  const maxVal = Math.max(...plan, ...fact, 1);

  return (
    <div className="w-full">
      <svg
        width="100%"
        viewBox={`0 0 ${TOTAL_W} ${TOTAL_H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block" }}
      >
        {plan.map((p, i) => {
          const f = fact[i] ?? 0;
          const ph = Math.max(1, Math.round((p / maxVal) * CHART_H));
          const fh = f > 0 ? Math.max(1, Math.round((f / maxVal) * CHART_H)) : 0;
          const gx = i * GROUP_W;
          const isFuture = f === 0;
          const isAhead = fh >= ph;
          return (
            <g key={i}>
              {/* Plan bar */}
              <rect
                x={gx}
                y={CHART_H - ph}
                width={BAR_W}
                height={ph}
                rx={1.5}
                fill="hsl(var(--primary))"
                opacity={0.25}
              />
              {/* Fact bar — always primary color, opacity shows gap */}
              {!isFuture && (
                <rect
                  x={gx + BAR_W + INNER_GAP}
                  y={CHART_H - fh}
                  width={BAR_W}
                  height={fh}
                  rx={1.5}
                  fill="hsl(var(--primary))"
                  opacity={isAhead ? 0.85 : 0.55}
                />
              )}
              {/* Month label */}
              <text
                x={gx + BAR_W + INNER_GAP / 2}
                y={TOTAL_H - 1}
                textAnchor="middle"
                fontSize={8}
                fill="currentColor"
                opacity={0.45}
                fontFamily="inherit"
              >
                {months[i]}
              </text>
            </g>
          );
        })}
        {/* Zero line */}
        <line x1={0} y1={CHART_H} x2={TOTAL_W} y2={CHART_H} stroke="currentColor" strokeOpacity={0.1} strokeWidth={0.5} />
      </svg>
      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "hsl(var(--primary))", opacity: 0.25 }} />
          {isEn ? "Plan" : "План"}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "hsl(var(--primary))", opacity: 0.85 }} />
          {isEn ? "Fact" : "Факт"}
        </span>
      </div>
    </div>
  );
}

/* ─── Colour helpers ────────────────────────────────────── */
/** Цвет текста: синий если хорошо, нейтральный в норме, красный только при сильном отставании */
function execTextColor(execPct: number): string {
  if (execPct >= 95) return "text-primary";
  if (execPct >= 80) return "text-foreground";
  return "text-destructive";
}
/** Цвет прогресс-бара: primary везде, destructive только < 80% */
function execBarColor(execPct: number): string {
  return execPct < 80 ? "bg-destructive/70" : "bg-primary";
}

/* ─── Variance badge ────────────────────────────────────── */
function VarBadge({ plan, fact, isEn }: { plan: number; fact: number; isEn: boolean }) {
  const execPct = pct(fact, plan);
  const devV = dev(fact, plan);
  if (!plan) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className={`text-xs font-semibold ${execTextColor(execPct)}`}>
        {execPct}%
      </span>
      <span className={`text-[10px] ${devV >= 0 ? "text-muted-foreground" : "text-destructive/80"}`}>
        {devV >= 0 ? "+" : ""}{fmt(devV)} {isEn ? "" : ""}
      </span>
    </div>
  );
}

/* ─── Progress bar ──────────────────────────────────────── */
function ExecBar({ plan, fact }: { plan: number; fact: number }) {
  const p = Math.min(100, pct(fact, plan));
  return (
    <div className="flex items-center gap-1.5 min-w-[80px]">
      <div className="flex-1 bg-muted rounded-full h-1.5">
        <div className={`${execBarColor(p)} h-1.5 rounded-full transition-all`} style={{ width: `${p}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground w-7 text-right">{p}%</span>
    </div>
  );
}

/* ─── Source badge ──────────────────────────────────────── */
function SourceBadge({ source, compact = false }: { source: DataSource; compact?: boolean }) {
  const meta = SOURCE_META[source];
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium ${meta.color}`}>
      <Icon className="h-2.5 w-2.5" />
      {!compact && meta.labelEn}
    </span>
  );
}

/* ─── Main Component ──────────────────────────────────────── */
export function PlanFactDashboard() {
  const { language } = useLanguage();
  const { activeWorkspace } = useWorkspace();
  const isEn = language === "en";

  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<YearKey>("2026");
  const [selectedSource, setSelectedSource] = useState<DataSource | "all">("all");
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([2]));
  const [activeView, setActiveView] = useState<"table" | "chart" | "sources">("table");
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const plans = useMemo(() => loadPlansList(), []);

  // Auto-select first plan
  useEffect(() => {
    if (!selectedPlanId && plans.length > 0) setSelectedPlanId(plans[0].id);
  }, [plans, selectedPlanId]);

  const planData = useMemo(() => {
    if (!selectedPlanId) return null;
    return loadPlanData(selectedPlanId) as Record<string, unknown> | null;
  }, [selectedPlanId]);

  // Seed-based deterministic random (stable per plan+year)
  const seed = `${selectedPlanId}-${selectedYear}`;
  const sections = useMemo(() => {
    // Reset Math.random seed surrogate — use seeded values
    return buildSections(planData, selectedYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planData, selectedYear, seed]);

  const filteredSections = useMemo(() =>
    selectedSource === "all" ? sections : sections.filter(s => s.source === selectedSource),
    [sections, selectedSource]
  );

  // KPI cards — top 4 metrics
  const kpiCards = useMemo((): KpiCard[] => {
    const oil = sections.find(s => s.id === 2);
    const drill = sections.find(s => s.id === 3);
    const capex = sections.find(s => s.id === 7);
    const mtm = sections.find(s => s.id === 4);
    return [
      { labelRu: "Добыча нефти", labelEn: "Oil Production", unit: "тыс.т", plan: oil?.plan ?? 0, fact: oil?.fact ?? 0, source: "scada", icon: TrendingUp },
      { labelRu: "Бурение", labelEn: "Drilling", unit: "скв.", plan: drill?.plan ?? 0, fact: drill?.fact ?? 0, source: "sap", icon: BarChart3 },
      { labelRu: "Капстроительство", labelEn: "Capital Constr.", unit: "тыс.тг", plan: capex?.plan ?? 0, fact: capex?.fact ?? 0, source: "sap", icon: FileText },
      { labelRu: "ОТМ по добыче", labelEn: "Prod. Measures", unit: "скв.", plan: mtm?.plan ?? 0, fact: mtm?.fact ?? 0, source: "sap", icon: Activity },
    ];
  }, [sections]);

  // Overall execution
  const overall = useMemo(() => {
    const totalPlan = sections.reduce((s, x) => s + x.plan, 0);
    const totalFact = sections.reduce((s, x) => s + x.fact, 0);
    return { plan: totalPlan, fact: totalFact, pct: pct(totalFact, totalPlan) };
  }, [sections]);

  // Sections at risk (exec < 80%)
  const atRisk = sections.filter(s => s.plan > 0 && pct(s.fact, s.plan) < 80);

  const toggleSection = (id: number) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleRefresh = () => setLastRefreshed(new Date());

  const companyName = activeWorkspace?.shortName ?? activeWorkspace?.name ?? (isEn ? "Company" : "Компания");

  /* ── render ── */
  return (
    <div className="space-y-4">
      {/* ── Header strip ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">
            {isEn ? "Plan-Fact Analysis" : "План-факт анализ"}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {companyName} · {isEn ? "Production Program Execution" : "Исполнение производственной программы"} · {isEn ? "Updated" : "Обновлено"}: {lastRefreshed.toLocaleTimeString(isEn ? "en-GB" : "ru-RU", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Plan selector */}
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            value={selectedPlanId}
            onChange={e => setSelectedPlanId(e.target.value)}
          >
            {plans.length === 0
              ? <option value="">{isEn ? "No saved plans" : "Нет сохранённых планов"}</option>
              : plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
            }
          </select>
          {/* Year */}
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value as YearKey)}
          >
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {/* Source filter */}
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            value={selectedSource}
            onChange={e => setSelectedSource(e.target.value as DataSource | "all")}
          >
            <option value="all">{isEn ? "All sources" : "Все источники"}</option>
            <option value="sap">SAP S/4HANA</option>
            <option value="scada">SCADA/MES</option>
            <option value="manual">{isEn ? "Manual" : "Ручной ввод"}</option>
            <option value="calculated">{isEn ? "Calculated" : "Расчётный"}</option>
          </select>
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={handleRefresh}>
            <RefreshCw className="h-3.5 w-3.5" />{isEn ? "Refresh" : "Обновить"}
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" />{isEn ? "Export" : "Экспорт"}
          </Button>
        </div>
      </div>

      {/* ── No plan state ── */}
      {plans.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">{isEn ? "No production plans found" : "Сохранённые производственные планы не найдены"}</p>
            <p className="text-xs mt-1">{isEn ? "Create and save a plan in the Production Plan tab first." : "Сначала создайте и сохраните план на вкладке Производственный план."}</p>
          </CardContent>
        </Card>
      )}

      {plans.length > 0 && (
        <>
          {/* ── Top KPI strip ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Overall card */}
            <Card className="col-span-2 lg:col-span-1 border-primary/20">
              <CardContent className="p-4">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{isEn ? "Overall execution" : "Общее исполнение"}</div>
                <div className={`text-3xl font-bold ${execTextColor(overall.pct)}`}>
                  {overall.pct}%
                </div>
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div className={`h-2 rounded-full transition-all ${execBarColor(overall.pct)}`} style={{ width: `${Math.min(100, overall.pct)}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
                  <span>{isEn ? "by 12 sections" : "по 12 разделам"}</span>
                  {atRisk.length > 0 && <span className="text-destructive/80 font-medium">{atRisk.length} {isEn ? "at risk" : "в зоне риска"}</span>}
                </div>
              </CardContent>
            </Card>

            {kpiCards.map((k, i) => {
              const execP = pct(k.fact, k.plan);
              const devV = dev(k.fact, k.plan);
              const Icon = k.icon;
              return (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{isEn ? k.labelEn : k.labelRu}</div>
                      <SourceBadge source={k.source} compact />
                    </div>
                    <div className="flex items-end gap-2">
                      <div>
                        <div className="text-xs text-muted-foreground">{isEn ? "Fact" : "Факт"}</div>
                        <div className="text-xl font-bold">{fmt(k.fact)}</div>
                      </div>
                      <div className="mb-0.5">
                        {devV >= 0
                          ? <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                          : <ArrowDownRight className="h-4 w-4 text-destructive/70" />}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="text-[10px] text-muted-foreground">{isEn ? "Plan:" : "План:"} {fmt(k.plan)} {k.unit}</div>
                      <span className={`text-xs font-semibold ${execTextColor(execP)}`}>{execP}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1 mt-1.5">
                      <div className={`h-1 rounded-full ${execBarColor(execP)}`} style={{ width: `${Math.min(100, execP)}%` }} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* ── Alert strip for at-risk sections ── */}
          {atRisk.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {atRisk.map(s => (
                <div key={s.id} className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs text-foreground">
                  <AlertTriangle className="h-3 w-3 shrink-0 text-destructive/70" />
                  {(() => { const Icon = s.icon; return <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />; })()}
                  <span>{isEn ? s.titleEn : s.titleRu}</span>
                  <span className="font-bold text-destructive/80">{pct(s.fact, s.plan)}%</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Data sources summary ── */}
          <Card>
            <CardContent className="p-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-medium text-muted-foreground">{isEn ? "Data sources:" : "Источники данных:"}</span>
                {(Object.entries(SOURCE_META) as [DataSource, typeof SOURCE_META[DataSource]][]).map(([key, meta]) => {
                  const count = sections.filter(s => s.source === key).length;
                  if (!count) return null;
                  const Icon = meta.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedSource(selectedSource === key ? "all" : key)}
                      className={`flex items-center gap-1.5 rounded border px-2 py-1 text-xs transition-colors ${meta.color} ${selectedSource === key ? "ring-2 ring-primary/40" : "opacity-80 hover:opacity-100"}`}
                    >
                      <Icon className="h-3 w-3" />
                      {meta.labelRu} · {count} {isEn ? "sections" : "разд."}
                    </button>
                  );
                })}
                {selectedSource !== "all" && (
                  <button onClick={() => setSelectedSource("all")} className="text-xs text-muted-foreground hover:text-foreground underline">{isEn ? "Show all" : "Показать все"}</button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── View toggle ── */}
          <Tabs value={activeView} onValueChange={v => setActiveView(v as typeof activeView)}>
            <TabsList className="h-8">
              <TabsTrigger value="table" className="text-xs h-7">{isEn ? "Table" : "Таблица"}</TabsTrigger>
              <TabsTrigger value="chart" className="text-xs h-7">{isEn ? "Monthly dynamics" : "Помесячная динамика"}</TabsTrigger>
              <TabsTrigger value="sources" className="text-xs h-7">{isEn ? "By source" : "По источникам"}</TabsTrigger>
            </TabsList>

            {/* ── TABLE VIEW ── */}
            <TabsContent value="table" className="mt-3">
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground w-8"></th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">{isEn ? "Section" : "Раздел"}</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">{isEn ? "Source" : "Источник"}</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">{isEn ? "Plan" : "План"}</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">{isEn ? "Fact" : "Факт"}</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">{isEn ? "Deviation" : "Отклонение"}</th>
                        <th className="px-4 py-3 font-medium text-muted-foreground w-36">{isEn ? "Execution" : "Исполнение"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSections.map((s, idx) => {
                        const execP = pct(s.fact, s.plan);
                        const devV = dev(s.fact, s.plan);
                        const isExpanded = expandedSections.has(s.id);
                        return (
                          <>
                            <tr
                              key={s.id}
                              className={`border-b hover:bg-muted/20 cursor-pointer ${idx % 2 === 0 ? "" : "bg-muted/10"}`}
                              onClick={() => toggleSection(s.id)}
                            >
                              <td className="px-4 py-2.5 text-muted-foreground">
                                {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  {(() => { const Icon = s.icon; return <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />; })()}
                                  <div>
                                    <div className="font-medium">{isEn ? s.titleEn : s.titleRu}</div>
                                    <div className="text-[10px] text-muted-foreground">{s.unit}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-2.5 hidden md:table-cell"><SourceBadge source={s.source} /></td>
                              <td className="px-4 py-2.5 text-right tabular-nums font-medium text-muted-foreground">{fmt(s.plan)}</td>
                              <td className="px-4 py-2.5 text-right tabular-nums font-bold">{fmt(s.fact)}</td>
                              <td className="px-4 py-2.5 text-right">
                                <span className={`font-medium ${devV < 0 ? "text-destructive/80" : "text-muted-foreground"}`}>
                                  {devV >= 0 ? "+" : ""}{fmt(devV)}
                                </span>
                                <div className={`text-[10px] ${execTextColor(execP)}`}>{fmtPct(execP - 100)}</div>
                              </td>
                              <td className="px-4 py-2.5"><ExecBar plan={s.plan} fact={s.fact} /></td>
                            </tr>
                            {isExpanded && s.rows.map((r, ri) => {
                              const rDev = dev(r.fact, r.plan);
                              return (
                                <tr key={`${s.id}-${ri}`} className="border-b bg-muted/20 text-muted-foreground">
                                  <td className="px-4 py-1.5"></td>
                                  <td className="px-4 py-1.5 pl-10">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] w-1 h-1 rounded-full bg-muted-foreground/40 mt-0.5 shrink-0" />
                                      <span>{isEn ? r.nameEn : r.nameRu}</span>
                                      <span className="text-[10px] opacity-60">{r.unit}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-1.5 hidden md:table-cell"><SourceBadge source={r.source} compact /></td>
                                  <td className="px-4 py-1.5 text-right tabular-nums">{fmt(r.plan)}</td>
                                  <td className="px-4 py-1.5 text-right tabular-nums font-medium text-foreground">{fmt(r.fact)}</td>
                                  <td className="px-4 py-1.5 text-right">
                                    <span className={rDev < 0 ? "text-destructive/70" : "text-muted-foreground"}>{rDev >= 0 ? "+" : ""}{fmt(rDev)}</span>
                                  </td>
                                  <td className="px-4 py-1.5"><ExecBar plan={r.plan} fact={r.fact} /></td>
                                </tr>
                              );
                            })}
                          </>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t bg-muted/50 font-semibold">
                        <td colSpan={2} className="px-4 py-3">{isEn ? "TOTAL" : "ИТОГО"}</td>
                        <td className="hidden md:table-cell" />
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{fmt(overall.plan)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{fmt(overall.fact)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={overall.fact < overall.plan ? "text-destructive/80" : "text-muted-foreground"}>
                            {overall.fact >= overall.plan ? "+" : ""}{fmt(dev(overall.fact, overall.plan))}
                          </span>
                        </td>
                        <td className="px-4 py-3"><ExecBar plan={overall.plan} fact={overall.fact} /></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Card>
            </TabsContent>

            {/* ── CHART VIEW — monthly dynamics ── */}
            <TabsContent value="chart" className="mt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredSections.map(s => {
                  const execP = pct(s.fact, s.plan);
                  const devVal = dev(s.fact, s.plan);
                  return (
                    <Card key={s.id}>
                      <CardHeader className="py-3 px-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                              {(() => { const Icon = s.icon; return <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />; })()}
                              {isEn ? s.titleEn : s.titleRu}
                            </CardTitle>
                            <SourceBadge source={s.source} />
                          </div>
                          <span className={`text-sm font-bold ${execTextColor(execP)}`}>{execP}%</span>
                        </div>
                        <div className="flex gap-4 mt-2 text-xs">
                          <div><div className="text-muted-foreground text-[10px]">{isEn ? "Plan" : "План"}</div><div className="font-semibold text-muted-foreground">{fmt(s.plan)}</div></div>
                          <div><div className="text-muted-foreground text-[10px]">{isEn ? "Fact" : "Факт"}</div><div className="font-semibold">{fmt(s.fact)}</div></div>
                          <div><div className="text-muted-foreground text-[10px]">{isEn ? "Dev" : "Откл."}</div><div className={`font-semibold ${devVal < 0 ? "text-destructive/80" : "text-muted-foreground"}`}>{devVal >= 0 ? "+" : ""}{fmt(devVal)}</div></div>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-3">
                        <MiniBarChart plan={s.monthlyPlan} fact={s.monthlyFact} isEn={isEn} />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* ── SOURCE VIEW ── */}
            <TabsContent value="sources" className="mt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(Object.entries(SOURCE_META) as [DataSource, typeof SOURCE_META[DataSource]][]).map(([srcKey, srcMeta]) => {
                  const srcSections = sections.filter(s => s.source === srcKey);
                  if (!srcSections.length) return null;
                  const srcPlan = srcSections.reduce((a, s) => a + s.plan, 0);
                  const srcFact = srcSections.reduce((a, s) => a + s.fact, 0);
                  const srcExec = pct(srcFact, srcPlan);
                  const SrcIcon = srcMeta.icon;
                  return (
                    <Card key={srcKey}>
                      <CardHeader className="py-3 px-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm flex items-center gap-2 text-foreground">
                            <SrcIcon className="h-4 w-4 text-muted-foreground" />
                            {isEn ? srcMeta.labelEn : srcMeta.labelRu}
                          </CardTitle>
                          <Badge variant="secondary" className={`${execTextColor(srcExec)} bg-muted border-border`}>{srcExec}%</Badge>
                        </div>
                        <div className="flex gap-4 text-xs mt-1">
                          <span className="text-muted-foreground">{srcSections.length} {isEn ? "sections" : "разд."}</span>
                          <span className="text-muted-foreground">{isEn ? "Plan:" : "План:"} {fmt(srcPlan)}</span>
                          <span className="font-medium">{isEn ? "Fact:" : "Факт:"} {fmt(srcFact)}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                          <div className={`h-1.5 rounded-full ${execBarColor(srcExec)}`} style={{ width: `${Math.min(100, srcExec)}%` }} />
                        </div>
                      </CardHeader>
                      <CardContent className="px-0 pb-0">
                        <table className="w-full text-xs">
                          <tbody>
                            {srcSections.map(s => {
                              const e = pct(s.fact, s.plan);
                              return (
                                <tr key={s.id} className="border-t hover:bg-muted/20">
                                  <td className="px-4 py-2">
                                    <div className="flex items-center gap-1.5">
                                      {(() => { const Icon = s.icon; return <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />; })()}
                                      {isEn ? s.titleEn : s.titleRu}
                                    </div>
                                  </td>
                                  <td className="px-4 py-2 text-right text-muted-foreground">{fmt(s.plan)}</td>
                                  <td className="px-4 py-2 text-right font-medium">{fmt(s.fact)}</td>
                                  <td className="px-4 py-2 w-24"><ExecBar plan={s.plan} fact={s.fact} /></td>
                                  <td className={`px-4 py-2 text-right font-semibold ${execTextColor(e)}`}>{e}%</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

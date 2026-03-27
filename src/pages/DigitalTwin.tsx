import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/hooks/useLanguage";
import { useTheme } from "@/hooks/useTheme";
import { useCompanyProfile } from "@/context/CompanyProfileContext";
import { getAuthHeader } from "@/lib/auth";
import {
  Droplets, Truck, Factory, Ship, ArrowRight, AlertTriangle,
  Gauge, TrendingDown, Activity, ChevronDown, ChevronUp, Filter,
  Zap, RefreshCw, CheckCircle2, Radio, Wind, Sun, Flame, Waves,
  ArrowLeftRight, TrendingUp, Globe, PlayCircle, XCircle, Info,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

/* ═══════════════════════════════════════════════════════════════
   ENERGY / KEGOC — Цифровой двойник НЭС
══════════════════════════════════════════════════════════════════ */

interface ZoneData {
  id: string;
  name: string;
  short: string;
  color: string;
  colorDim: string;
  installedMW: number;
  availableMW: number;
  loadMW: number;
  generationMW: number;
  genMix: { coal: number; gas: number; hydro: number; wind: number; solar: number; nuclear: number };
  regions: string[];
  substationsCount: number;
  linesCount: number;
  importMW: number;
  exportMW: number;
}

interface SubstationData {
  id: string;
  name: string;
  shortName: string;
  zone: string;
  voltage: string;
  loadPct: number;
  status: "normal" | "warning" | "critical";
  powerMW: number;
  transformers: number;
  x: number;
  y: number;
}

interface LineData {
  id: string;
  from: string;
  to: string;
  flowMW: number;
  capacityMW: number;
  status: "normal" | "warning" | "critical" | "import";
}

interface ScenarioResult {
  freqHz: number;
  reserveMW: number;
  deficitZone: string | null;
  deficitMW: number;
  status: "normal" | "warning" | "critical";
  alerts: string[];
}

interface ScenarioDef {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  run: () => ScenarioResult;
}

/* ─── Зональные данные ──────────────────────────────────────── */
const ZONES: ZoneData[] = [
  {
    id: "north",
    name: "Северная зона",
    short: "Север",
    color: "#3b82f6",
    colorDim: "rgba(59,130,246,0.12)",
    installedMW: 12_400,
    availableMW: 10_800,
    loadMW: 8_680,
    generationMW: 10_100,
    genMix: { coal: 7_800, gas: 820, hydro: 1_100, wind: 300, solar: 80, nuclear: 0 },
    regions: ["Карагандинская", "Павлодарская", "Акмолинская", "СКО", "Костанайская", "ВКО", "Абайская"],
    substationsCount: 14,
    linesCount: 42,
    importMW: 380,
    exportMW: 1_800,
  },
  {
    id: "south",
    name: "Южная зона",
    short: "Юг",
    color: "#f59e0b",
    colorDim: "rgba(245,158,11,0.12)",
    installedMW: 5_600,
    availableMW: 4_800,
    loadMW: 4_080,
    generationMW: 2_840,
    genMix: { coal: 180, gas: 2_480, hydro: 1_080, wind: 50, solar: 50, nuclear: 0 },
    regions: ["Алматинская", "Жамбылская", "Туркестанская", "Кызылординская", "Жетысуская"],
    substationsCount: 9,
    linesCount: 28,
    importMW: 1_240,
    exportMW: 0,
  },
  {
    id: "west",
    name: "Западная зона",
    short: "Запад",
    color: "#8b5cf6",
    colorDim: "rgba(139,92,246,0.12)",
    installedMW: 4_200,
    availableMW: 3_600,
    loadMW: 1_760,
    generationMW: 1_780,
    genMix: { coal: 0, gas: 2_980, hydro: 0, wind: 320, solar: 100, nuclear: 380 },
    regions: ["Актюбинская", "ЗКО", "Атырауская", "Мангыстауская"],
    substationsCount: 5,
    linesCount: 18,
    importMW: 180,
    exportMW: 200,
  },
];

/* ─── 500 кВ Подстанции ─────────────────────────────────────── */
const SUBSTATIONS: SubstationData[] = [
  { id: "ekibastuz",  name: "ПС 500кВ Экибастузская",  shortName: "Экибастуз",  zone: "north", voltage: "500кВ", loadPct: 72, status: "normal",   powerMW: 2_800, transformers: 4, x: 565, y: 118 },
  { id: "pavlodar",   name: "ПС 500кВ Павлодарская",   shortName: "Павлодар",   zone: "north", voltage: "500кВ", loadPct: 68, status: "normal",   powerMW: 1_600, transformers: 3, x: 625, y: 88  },
  { id: "ustkamen",   name: "ПС 500кВ УК (Шульба)",    shortName: "УК / Шульба",zone: "north", voltage: "500кВ", loadPct: 61, status: "normal",   powerMW: 1_200, transformers: 2, x: 700, y: 130 },
  { id: "astana",     name: "ПС 500кВ Астана",          shortName: "Астана",     zone: "north", voltage: "500кВ", loadPct: 65, status: "normal",   powerMW: 2_400, transformers: 4, x: 450, y: 130 },
  { id: "kokshetau",  name: "ПС 500кВ Кокшетауская",   shortName: "Кокшетау",   zone: "north", voltage: "500кВ", loadPct: 88, status: "warning",  powerMW: 900,  transformers: 2, x: 390, y: 83  },
  { id: "karaganda",  name: "ПС 500кВ Карагандинская",  shortName: "Карагандинск",zone:"north", voltage: "500кВ", loadPct: 78, status: "normal",   powerMW: 1_800, transformers: 3, x: 508, y: 200 },
  { id: "zhezkazgan", name: "ПС 500кВ Жезказганская",  shortName: "Жезказган",  zone: "north", voltage: "500кВ", loadPct: 62, status: "normal",   powerMW: 800,  transformers: 2, x: 370, y: 248 },
  { id: "aktobe",     name: "ПС 500кВ Актюбинская",    shortName: "Актобе",     zone: "west",  voltage: "500кВ", loadPct: 55, status: "normal",   powerMW: 700,  transformers: 2, x: 215, y: 200 },
  { id: "almaty",     name: "ПС 500кВ Алматинская",    shortName: "Алматы",     zone: "south", voltage: "500кВ", loadPct: 95, status: "critical", powerMW: 1_600, transformers: 3, x: 608, y: 340 },
  { id: "zhambyl",    name: "ПС 500кВ Жамбылская",     shortName: "Жамбыл",     zone: "south", voltage: "500кВ", loadPct: 71, status: "normal",   powerMW: 900,  transformers: 2, x: 482, y: 368 },
  { id: "shymkent",   name: "ПС 500кВ Шымкентская",   shortName: "Шымкент",    zone: "south", voltage: "500кВ", loadPct: 85, status: "warning",  powerMW: 1_100, transformers: 2, x: 428, y: 388 },
];

const LINES: LineData[] = [
  { id: "l-russia-astana",     from: "russia",    to: "astana",     flowMW: 380,   capacityMW: 1_000, status: "import"  },
  { id: "l-ekib-pavl",         from: "ekibastuz", to: "pavlodar",   flowMW: 800,   capacityMW: 1_200, status: "normal"  },
  { id: "l-ekib-astana",       from: "ekibastuz", to: "astana",     flowMW: 1_200, capacityMW: 1_600, status: "normal"  },
  { id: "l-pavl-ustkamen",     from: "pavlodar",  to: "ustkamen",   flowMW: 500,   capacityMW: 1_000, status: "normal"  },
  { id: "l-astana-koksh",      from: "astana",    to: "kokshetau",  flowMW: 620,   capacityMW: 800,   status: "warning" },
  { id: "l-astana-karaganda",  from: "astana",    to: "karaganda",  flowMW: 900,   capacityMW: 1_600, status: "normal"  },
  { id: "l-karaganda-zhezk",   from: "karaganda", to: "zhezkazgan", flowMW: 420,   capacityMW: 800,   status: "normal"  },
  { id: "l-karaganda-almaty",  from: "karaganda", to: "almaty",     flowMW: 1_240, capacityMW: 1_400, status: "warning" },
  { id: "l-zhezk-aktobe",      from: "zhezkazgan",to: "aktobe",     flowMW: -180,  capacityMW: 600,   status: "normal"  },
  { id: "l-almaty-zhambyl",    from: "almaty",    to: "zhambyl",    flowMW: 600,   capacityMW: 1_000, status: "normal"  },
  { id: "l-zhambyl-shymkent",  from: "zhambyl",   to: "shymkent",   flowMW: 400,   capacityMW: 800,   status: "normal"  },
];

/* ─── Сценарии N-1 ──────────────────────────────────────────── */
const SCENARIOS: ScenarioDef[] = [
  {
    id: "n1-ekibastuz",
    name: "N-1: Блок ГРЭС-1",
    description: "Отключение блока 500 МВт на Экибастузской ГРЭС-1",
    icon: Zap,
    run: () => ({
      freqHz: 49.87,
      reserveMW: 85,
      deficitZone: null,
      deficitMW: 0,
      status: "warning",
      alerts: [
        "Частота снизилась до 49.87 Гц — активирована АЧР ступень 1",
        "Резерв мощности сократился до 85 МВт (порог: 300 МВт)",
        "Рекомендуется повысить нагрузку Аксуской ГРЭС на 200 МВт",
        "Задействован импорт из России +120 МВт через Кокшетауское сечение",
      ],
    }),
  },
  {
    id: "n1-karaganda-almaty",
    name: "N-1: КарАл-сечение",
    description: "Авария 500кВ линии Карагандинская–Алматинская",
    icon: Zap,
    run: () => ({
      freqHz: 49.62,
      reserveMW: -840,
      deficitZone: "Южная зона",
      deficitMW: 840,
      status: "critical",
      alerts: [
        "КРИТИЧНО: Потеря 1 240 МВт транзита Север–Юг!",
        "Дефицит в Южной зоне: −840 МВт",
        "АЧР запущена: отключение 320 МВт нагрузки в Алматы, Шымкенте",
        "Частота в ЮЗ: 49.62 Гц — угроза каскадного отключения",
        "Требуется аварийная мобилизация Жамбылской ГРЭС на 100%",
      ],
    }),
  },
  {
    id: "peak-load",
    name: "Пиковая нагрузка +15%",
    description: "Рост потребления на 15% (волна жары / морозов)",
    icon: TrendingUp,
    run: () => ({
      freqHz: 49.94,
      reserveMW: 145,
      deficitZone: "Южная зона",
      deficitMW: 230,
      status: "warning",
      alerts: [
        "Нагрузка системы: +2 178 МВт сверх базы",
        "Резерв мощности: 145 МВт — ниже нормативного (300 МВт)",
        "Южная зона: дополнительный дефицит 230 МВт",
        "Рекомендуется ограничение крупных потребителей на 3 ч по регламенту ДП",
        "Импорт из России увеличен до максимума: +680 МВт",
      ],
    }),
  },
];

/* ─── Вспомогательные функции ───────────────────────────────── */
const STATUS_COLOR = { normal: "#22c55e", warning: "#f59e0b", critical: "#ef4444", import: "#60a5fa" };
const STATUS_LABEL = { normal: "Норма", warning: "Внимание", critical: "Критично", import: "Импорт" };
const GEN_COLORS: Record<string, string> = {
  coal: "#78716c", gas: "#f97316", hydro: "#3b82f6", wind: "#22d3ee", solar: "#fbbf24", nuclear: "#a78bfa",
};
const GEN_LABELS: Record<string, string> = {
  coal: "Уголь", gas: "Газ/ГТУ", hydro: "ГЭС", wind: "ВЭС", solar: "СЭС", nuclear: "АЭС",
};

function statusBg(s: "normal" | "warning" | "critical") {
  if (s === "critical") return "rgba(239,68,68,0.12)";
  if (s === "warning") return "rgba(245,158,11,0.12)";
  return "rgba(34,197,94,0.12)";
}

/* ─── Zone Card ─────────────────────────────────────────────── */
function ZoneCard({ zone, isDark }: { zone: ZoneData; isDark: boolean }) {
  const balance = zone.generationMW + zone.importMW - zone.exportMW - zone.loadMW;
  const utilPct = Math.round((zone.loadMW / zone.availableMW) * 100);
  const genTotal = Object.values(zone.genMix).reduce((a, b) => a + b, 0) || 1;

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        background: isDark ? "rgba(12,18,30,0.75)" : "rgba(255,255,255,0.9)",
        border: `1.5px solid ${zone.color}35`,
        boxShadow: isDark ? `0 0 24px ${zone.color}0a inset` : "none",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-bold" style={{ color: zone.color }}>{zone.name}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{zone.regions.length} регионов · {zone.substationsCount} ПС НЭС · {zone.linesCount} линий</div>
        </div>
        <Badge style={{ background: zone.colorDim, color: zone.color, borderColor: `${zone.color}40` }} className="text-[10px] border">
          {utilPct}% нагрузки
        </Badge>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Генерация", value: zone.generationMW.toLocaleString(), unit: "МВт", color: zone.color },
          { label: "Потребление", value: zone.loadMW.toLocaleString(),      unit: "МВт", color: isDark ? "#e2e8f0" : "#0f172a" },
          { label: "Баланс",     value: `${balance >= 0 ? "+" : ""}${balance.toLocaleString()}`, unit: "МВт",
            color: balance >= 0 ? "#22c55e" : "#ef4444" },
        ].map((kpi) => (
          <div key={kpi.label} className="text-center">
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{kpi.label}</div>
            <div className="text-sm font-bold font-mono mt-0.5" style={{ color: kpi.color }}>{kpi.value}</div>
            <div className="text-[9px] text-muted-foreground">{kpi.unit}</div>
          </div>
        ))}
      </div>

      {/* Utilization bar */}
      <div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.min(utilPct, 100)}%`, background: utilPct > 90 ? "#ef4444" : utilPct > 80 ? "#f59e0b" : zone.color }}
          />
        </div>
      </div>

      {/* Generation mix */}
      <div>
        <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1.5">Структура генерации</div>
        <div className="flex rounded-full overflow-hidden h-3 gap-px">
          {Object.entries(zone.genMix).filter(([, v]) => v > 0).map(([type, val]) => (
            <div
              key={type}
              style={{ width: `${(val / genTotal) * 100}%`, background: GEN_COLORS[type] }}
              title={`${GEN_LABELS[type]}: ${val.toLocaleString()} МВт`}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
          {Object.entries(zone.genMix).filter(([, v]) => v > 0).map(([type, val]) => (
            <div key={type} className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: GEN_COLORS[type] }} />
              <span className="text-[9px] text-muted-foreground">{GEN_LABELS[type]} {Math.round((val / genTotal) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Import/export */}
      {(zone.importMW > 0 || zone.exportMW > 0) && (
        <div className="flex items-center gap-2 text-[10px] pt-1 border-t" style={{ borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
          {zone.importMW > 0 && (
            <span style={{ color: "#60a5fa" }}>↓ Импорт: {zone.importMW.toLocaleString()} МВт</span>
          )}
          {zone.exportMW > 0 && (
            <span style={{ color: "#34d399" }}>↑ Экспорт: {zone.exportMW.toLocaleString()} МВт</span>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Topology SVG ──────────────────────────────────────────── */
const TOPO_NODES: Record<string, { x: number; y: number; label: string; zone: string; isRussia?: boolean }> = {
  russia:    { x: 450, y: 22,  label: "🇷🇺 РОССИЯ",  zone: "import", isRussia: true },
  ekibastuz: { x: 565, y: 118, label: "Экибастуз",   zone: "north"  },
  pavlodar:  { x: 625, y: 88,  label: "Павлодар",    zone: "north"  },
  ustkamen:  { x: 700, y: 130, label: "УК / Шульба", zone: "north"  },
  astana:    { x: 450, y: 130, label: "Астана",       zone: "north"  },
  kokshetau: { x: 388, y: 82,  label: "Кокшетау",    zone: "north"  },
  kostanay:  { x: 308, y: 92,  label: "Костанай",    zone: "north"  },
  karaganda: { x: 508, y: 202, label: "Карагандинск",zone: "north"  },
  zhezkazgan:{ x: 368, y: 250, label: "Жезказган",   zone: "north"  },
  aktobe:    { x: 215, y: 202, label: "Актобе",       zone: "west"   },
  uralsk:    { x: 162, y: 148, label: "Уральск",      zone: "west"   },
  atyrau:    { x: 162, y: 298, label: "Атырау",       zone: "west"   },
  aktau:     { x: 150, y: 365, label: "Актау (МАЭК)", zone: "west"   },
  almaty:    { x: 608, y: 342, label: "Алматы",       zone: "south"  },
  zhambyl:   { x: 482, y: 370, label: "Жамбыл",       zone: "south"  },
  shymkent:  { x: 428, y: 390, label: "Шымкент",      zone: "south"  },
  kyzylorda: { x: 348, y: 312, label: "Кызылорда",    zone: "south"  },
};

const TOPO_LINES: Array<{ from: string; to: string; status: "normal" | "warning" | "critical" | "import"; flowMW: number; capMW: number }> = [
  { from: "russia",    to: "astana",      status: "import",   flowMW: 380,   capMW: 1000 },
  { from: "russia",    to: "kokshetau",   status: "import",   flowMW: 0,     capMW: 600  },
  { from: "ekibastuz", to: "pavlodar",    status: "normal",   flowMW: 800,   capMW: 1200 },
  { from: "ekibastuz", to: "astana",      status: "normal",   flowMW: 1200,  capMW: 1600 },
  { from: "pavlodar",  to: "ustkamen",    status: "normal",   flowMW: 500,   capMW: 1000 },
  { from: "astana",    to: "kokshetau",   status: "warning",  flowMW: 620,   capMW: 800  },
  { from: "astana",    to: "karaganda",   status: "normal",   flowMW: 900,   capMW: 1600 },
  { from: "kokshetau", to: "kostanay",    status: "normal",   flowMW: 280,   capMW: 600  },
  { from: "karaganda", to: "zhezkazgan",  status: "normal",   flowMW: 420,   capMW: 800  },
  { from: "karaganda", to: "almaty",      status: "warning",  flowMW: 1240,  capMW: 1400 },
  { from: "zhezkazgan",to: "aktobe",      status: "normal",   flowMW: 180,   capMW: 600  },
  { from: "zhezkazgan",to: "kyzylorda",   status: "normal",   flowMW: 140,   capMW: 400  },
  { from: "aktobe",    to: "uralsk",      status: "normal",   flowMW: 120,   capMW: 400  },
  { from: "aktobe",    to: "atyrau",      status: "normal",   flowMW: 90,    capMW: 300  },
  { from: "atyrau",    to: "aktau",       status: "normal",   flowMW: 80,    capMW: 300  },
  { from: "almaty",    to: "zhambyl",     status: "normal",   flowMW: 600,   capMW: 1000 },
  { from: "zhambyl",   to: "shymkent",    status: "normal",   flowMW: 400,   capMW: 800  },
  { from: "zhambyl",   to: "kyzylorda",   status: "normal",   flowMW: 120,   capMW: 400  },
];

const ZONE_FILL: Record<string, string> = {
  north: "#3b82f6",
  south: "#f59e0b",
  west:  "#8b5cf6",
  import:"#60a5fa",
};

function GridTopology({ isDark, activeScenario }: { isDark: boolean; activeScenario: string | null }) {
  const lineStatus = activeScenario === "n1-karaganda-almaty"
    ? { ...Object.fromEntries(TOPO_LINES.map((l) => [l.from + "-" + l.to, l.status])), "karaganda-almaty": "critical" as const }
    : null;

  return (
    <svg
      viewBox="0 0 820 420"
      style={{ width: "100%", height: "auto", display: "block" }}
      aria-label="Топология 500кВ ЕЭС Казахстана"
    >
      {/* Background */}
      <rect width="820" height="420" fill={isDark ? "#0a1628" : "#f0f7ff"} rx="12" />

      {/* Zone region hints */}
      <text x="680" y="170" fontSize="10" fill={ZONE_FILL.north} opacity={0.35} fontWeight="700" letterSpacing="2">СЕВЕР</text>
      <text x="530" y="395" fontSize="10" fill={ZONE_FILL.south} opacity={0.35} fontWeight="700" letterSpacing="2">ЮГ</text>
      <text x="165" y="340" fontSize="10" fill={ZONE_FILL.west} opacity={0.35} fontWeight="700" letterSpacing="2" transform="rotate(-90,165,340)">ЗАПАД</text>

      {/* Lines */}
      {TOPO_LINES.map((line) => {
        const from = TOPO_NODES[line.from];
        const to   = TOPO_NODES[line.to];
        if (!from || !to) return null;
        const key = `${line.from}-${line.to}`;
        const currentStatus = lineStatus ? (lineStatus[key] ?? line.status) : line.status;
        const color = STATUS_COLOR[currentStatus] ?? STATUS_COLOR.normal;
        const isDashed = line.status === "import";
        const loadPct = (Math.abs(line.flowMW) / line.capMW) * 100;
        const strokeW = loadPct > 85 ? 2.8 : loadPct > 70 ? 2.2 : 1.8;

        const mx = (from.x + to.x) / 2;
        const my = (from.y + to.y) / 2;

        return (
          <g key={key}>
            <line
              x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke={color}
              strokeWidth={strokeW}
              strokeDasharray={isDashed ? "5 4" : undefined}
              strokeOpacity={currentStatus === "critical" ? 1 : 0.75}
            />
            {/* Flow label on significant lines */}
            {Math.abs(line.flowMW) >= 300 && (
              <text x={mx} y={my - 4} textAnchor="middle" fontSize="7.5" fill={color} fontFamily="monospace" opacity={0.85}>
                {line.flowMW > 0 ? "+" : ""}{line.flowMW} МВт
              </text>
            )}
          </g>
        );
      })}

      {/* Nodes */}
      {Object.entries(TOPO_NODES).map(([id, node]) => {
        const sub = SUBSTATIONS.find((s) => s.id === id);
        const fill = ZONE_FILL[node.zone] ?? "#94a3b8";
        const nodeStatus = sub ? sub.status : "normal";
        const isHighlighted = activeScenario === "n1-ekibastuz" && id === "ekibastuz";

        return (
          <g key={id}>
            {/* Pulse ring for critical/highlighted */}
            {(nodeStatus === "critical" || isHighlighted) && (
              <circle cx={node.x} cy={node.y} r={14} fill="none" stroke={STATUS_COLOR.critical} strokeWidth={1.5} opacity={0.5} />
            )}
            {node.isRussia ? (
              <>
                <rect x={node.x - 30} y={node.y - 9} width={60} height={18} rx={4}
                  fill={isDark ? "rgba(96,165,250,0.15)" : "rgba(96,165,250,0.12)"}
                  stroke="#60a5fa" strokeWidth={1} strokeDasharray="4 3"
                />
                <text x={node.x} y={node.y + 4} textAnchor="middle" fontSize="8.5" fill="#60a5fa" fontWeight="600">{node.label}</text>
              </>
            ) : (
              <>
                <circle cx={node.x} cy={node.y} r={9}
                  fill={isDark ? `${fill}25` : `${fill}18`}
                  stroke={nodeStatus !== "normal" ? STATUS_COLOR[nodeStatus] : fill}
                  strokeWidth={nodeStatus !== "normal" ? 2 : 1.5}
                />
                <circle cx={node.x} cy={node.y} r={4} fill={fill} opacity={0.9} />
                <text x={node.x} y={node.y + 20} textAnchor="middle" fontSize="7" fill={isDark ? "rgba(255,255,255,0.65)" : "rgba(15,23,42,0.60)"} fontFamily="Inter, sans-serif">
                  {node.label}
                </text>
              </>
            )}
          </g>
        );
      })}

      {/* Legend */}
      <g transform="translate(14, 14)">
        {[
          { color: STATUS_COLOR.normal,   label: "Норма" },
          { color: STATUS_COLOR.warning,  label: "Внимание" },
          { color: STATUS_COLOR.critical, label: "Критично" },
          { color: STATUS_COLOR.import,   label: "Импорт РФ" },
        ].map((l, i) => (
          <g key={l.label} transform={`translate(0, ${i * 14})`}>
            <line x1={0} y1={5} x2={14} y2={5} stroke={l.color} strokeWidth={2} strokeDasharray={l.label === "Импорт РФ" ? "4 3" : undefined} />
            <text x={18} y={9} fontSize="8" fill={isDark ? "rgba(255,255,255,0.55)" : "rgba(15,23,42,0.55)"}>{l.label}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

/* ─── Generation mix chart ──────────────────────────────────── */
function GenMixChart({ isDark }: { isDark: boolean }) {
  const data = [
    { name: "Уголь",     value: 8_600, color: GEN_COLORS.coal    },
    { name: "Газ/ГТУ",   value: 4_700, color: GEN_COLORS.gas     },
    { name: "ГЭС",       value: 1_100, color: GEN_COLORS.hydro   },
    { name: "ВЭС",       value: 390,   color: GEN_COLORS.wind    },
    { name: "СЭС",       value: 170,   color: GEN_COLORS.solar   },
    { name: "АЭС/МАЭК",  value: 380,   color: GEN_COLORS.nuclear },
  ];
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.name} className="flex items-center gap-2">
          <div className="w-20 text-[10px] text-right text-muted-foreground shrink-0">{d.name}</div>
          <div className="flex-1 h-5 rounded overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
            <div
              className="h-full rounded flex items-center px-2 transition-all duration-700"
              style={{ width: `${(d.value / total) * 100}%`, background: d.color }}
            >
              <span className="text-[9px] font-mono text-white font-semibold whitespace-nowrap">{d.value.toLocaleString()} МВт</span>
            </div>
          </div>
          <div className="w-8 text-[10px] text-muted-foreground font-mono shrink-0 text-right">
            {Math.round((d.value / total) * 100)}%
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Scenario Panel ────────────────────────────────────────── */
function ScenarioPanel({ isDark }: { isDark: boolean }) {
  const [active, setActive] = useState<string | null>(null);
  const [result, setResult] = useState<ScenarioResult | null>(null);

  const run = (scenario: ScenarioDef) => {
    if (active === scenario.id) {
      setActive(null);
      setResult(null);
    } else {
      setActive(scenario.id);
      setResult(scenario.run());
    }
  };

  return (
    <div className="space-y-3">
      {SCENARIOS.map((sc) => {
        const isActive = active === sc.id;
        const ScIcon = sc.icon;
        return (
          <div key={sc.id}>
            <button
              className="w-full rounded-lg p-3 text-left flex items-center gap-3 transition-all"
              style={{
                background: isActive
                  ? (result?.status === "critical" ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)")
                  : (isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"),
                border: `1px solid ${isActive ? (result?.status === "critical" ? "rgba(239,68,68,0.4)" : "rgba(245,158,11,0.4)") : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)")}`,
              }}
              onClick={() => run(sc)}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: isDark ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.10)" }}>
                <ScIcon className="h-4 w-4 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">{sc.name}</div>
                <div className="text-[10px] text-muted-foreground">{sc.description}</div>
              </div>
              {isActive
                ? <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                : <PlayCircle className="h-4 w-4 text-primary shrink-0" />
              }
            </button>

            {isActive && result && (
              <div
                className="rounded-b-lg px-4 py-3 space-y-2 -mt-0.5"
                style={{
                  background: result.status === "critical" ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.08)",
                  borderLeft: `3px solid ${STATUS_COLOR[result.status]}`,
                  borderRight: "1px solid transparent",
                  borderBottom: `1px solid ${STATUS_COLOR[result.status]}30`,
                }}
              >
                {/* Metrics */}
                <div className="grid grid-cols-3 gap-3 mb-2">
                  <div>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wide">Частота</div>
                    <div className="text-base font-bold font-mono" style={{ color: result.freqHz < 49.8 ? "#ef4444" : result.freqHz < 49.95 ? "#f59e0b" : "#22c55e" }}>
                      {result.freqHz.toFixed(2)} Гц
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wide">Резерв</div>
                    <div className="text-base font-bold font-mono" style={{ color: result.reserveMW < 0 ? "#ef4444" : result.reserveMW < 300 ? "#f59e0b" : "#22c55e" }}>
                      {result.reserveMW > 0 ? "+" : ""}{result.reserveMW.toLocaleString()} МВт
                    </div>
                  </div>
                  {result.deficitZone && (
                    <div>
                      <div className="text-[9px] text-muted-foreground uppercase tracking-wide">Дефицит</div>
                      <div className="text-base font-bold font-mono text-destructive">−{result.deficitMW} МВт</div>
                      <div className="text-[9px] text-muted-foreground">{result.deficitZone}</div>
                    </div>
                  )}
                </div>
                {/* Alerts */}
                {result.alerts.map((alert, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" style={{ color: STATUS_COLOR[result.status] }} />
                    <span style={{ color: isDark ? "rgba(255,255,255,0.8)" : "rgba(15,23,42,0.8)" }}>{alert}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main Energy Digital Twin ──────────────────────────────── */
function DigitalTwinEnergy() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [now, setNow] = useState(new Date());
  const [activeScenario] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const totalGenMW = ZONES.reduce((s, z) => s + z.generationMW, 0) + 380; // +Russia import
  const totalLoadMW = ZONES.reduce((s, z) => s + z.loadMW, 0);
  const reserveMW = totalGenMW - totalLoadMW;
  const freqHz = 50.01;
  const nsFlowMW = 1_240;

  const cardBg = isDark ? "rgba(12,18,30,0.75)" : "rgba(255,255,255,0.9)";
  const borderCol = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  const kpis = [
    { label: "Частота ЕЭС",     value: `${freqHz.toFixed(2)} Гц`, icon: Radio,          color: freqHz >= 49.95 ? "#22c55e" : "#f59e0b",  sub: "норм. 50.00 Гц" },
    { label: "Суммарная выработка", value: `${(totalGenMW / 1000).toFixed(2)} ГВт`, icon: Zap,  color: "#5CE0D6", sub: `${totalGenMW.toLocaleString()} МВт` },
    { label: "Суммарное потребление", value: `${(totalLoadMW / 1000).toFixed(2)} ГВт`, icon: Activity, color: "#f59e0b", sub: `${totalLoadMW.toLocaleString()} МВт` },
    { label: "Резерв мощности", value: `+${reserveMW.toLocaleString()} МВт`, icon: TrendingUp, color: "#22c55e", sub: `${Math.round((reserveMW / totalGenMW) * 100)}% от выработки` },
    { label: "Транзит Север–Юг", value: `${nsFlowMW.toLocaleString()} МВт`, icon: ArrowLeftRight, color: "#a78bfa", sub: "89% от пропускной сп." },
    { label: "Импорт/Экспорт",  value: `+${380} МВт`,               icon: Globe,         color: "#60a5fa", sub: "Импорт из России" },
  ];

  const criticals = SUBSTATIONS.filter((s) => s.status === "critical");
  const warnings  = SUBSTATIONS.filter((s) => s.status === "warning");

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight">Цифровой двойник НЭС</h1>
            <Badge className="text-[10px] uppercase tracking-widest font-semibold" style={{ background: "rgba(92,224,214,0.12)", color: "#5CE0D6", border: "1px solid rgba(92,224,214,0.30)" }}>
              KEGOC · ЕЭС РК
            </Badge>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-muted-foreground">Онлайн · EMS/SCADA</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Балансовая модель ЕЭС Казахстана · 3 зоны · {SUBSTATIONS.length} ПС 500кВ · {TOPO_LINES.length} сечений
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground font-mono">
            {now.toLocaleTimeString("ru-KZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setNow(new Date())}>
            <RefreshCw className="h-3.5 w-3.5" /> Обновить
          </Button>
        </div>
      </div>

      {/* ── Alerts strip ───────────────────────────────────────── */}
      {(criticals.length > 0 || warnings.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {criticals.map((s) => (
            <div key={s.id} className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs"
              style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)", color: "#ef4444" }}>
              <AlertTriangle className="h-3 w-3" />{s.shortName}: {s.loadPct}% загрузки
            </div>
          ))}
          {warnings.map((s) => (
            <div key={s.id} className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs"
              style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.35)", color: "#f59e0b" }}>
              <Info className="h-3 w-3" />{s.shortName}: {s.loadPct}% загрузки
            </div>
          ))}
        </div>
      )}

      {/* ── KPI Strip ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-xl p-3 space-y-1"
            style={{ background: cardBg, border: `1px solid ${borderCol}` }}>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground leading-tight">{kpi.label}</span>
              <kpi.icon className="h-3.5 w-3.5 shrink-0" style={{ color: kpi.color }} />
            </div>
            <div className="text-base font-bold font-mono" style={{ color: kpi.color }}>{kpi.value}</div>
            <div className="text-[9px] text-muted-foreground">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Zone Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ZONES.map((zone) => <ZoneCard key={zone.id} zone={zone} isDark={isDark} />)}
      </div>

      {/* ── Cross-zone Flow Visual ─────────────────────────────── */}
      <div
        className="rounded-xl p-4"
        style={{ background: cardBg, border: `1px solid ${borderCol}` }}
      >
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Межзональные перетоки мощности</div>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          {/* North */}
          <div className="rounded-lg px-4 py-3 text-center min-w-[110px]"
            style={{ background: "rgba(59,130,246,0.12)", border: "1.5px solid rgba(59,130,246,0.35)" }}>
            <div className="text-[10px] text-muted-foreground">Северная зона</div>
            <div className="text-lg font-bold font-mono" style={{ color: "#3b82f6" }}>{(10_100).toLocaleString()}</div>
            <div className="text-[9px] text-muted-foreground">МВт генерации</div>
          </div>

          <div className="flex flex-col items-center gap-1 text-xs">
            <div className="flex items-center gap-1" style={{ color: "#22c55e" }}>
              <span className="font-mono font-bold">+1 240 МВт</span>
              <ArrowRight className="h-4 w-4" />
            </div>
            <div className="text-[9px] text-muted-foreground">Сечение «КарАл»</div>
            <div className="flex items-center gap-1" style={{ color: "#a78bfa" }}>
              <ArrowRight className="h-4 w-4" />
              <span className="font-mono font-bold">+180 МВт</span>
            </div>
            <div className="text-[9px] text-muted-foreground">Жезказган–Актобе</div>
          </div>

          {/* South & West column */}
          <div className="flex flex-col gap-2">
            <div className="rounded-lg px-4 py-3 text-center min-w-[110px]"
              style={{ background: "rgba(245,158,11,0.12)", border: "1.5px solid rgba(245,158,11,0.35)" }}>
              <div className="text-[10px] text-muted-foreground">Южная зона</div>
              <div className="text-lg font-bold font-mono" style={{ color: "#f59e0b" }}>{(2_840).toLocaleString()}</div>
              <div className="text-[9px] text-muted-foreground">МВт генерации</div>
            </div>
            <div className="rounded-lg px-4 py-3 text-center min-w-[110px]"
              style={{ background: "rgba(139,92,246,0.12)", border: "1.5px solid rgba(139,92,246,0.35)" }}>
              <div className="text-[10px] text-muted-foreground">Западная зона</div>
              <div className="text-lg font-bold font-mono" style={{ color: "#8b5cf6" }}>{(1_780).toLocaleString()}</div>
              <div className="text-[9px] text-muted-foreground">МВт генерации</div>
            </div>
          </div>

          {/* Russia import */}
          <div className="flex flex-col items-center gap-1 text-xs">
            <div className="flex items-center gap-1" style={{ color: "#60a5fa" }}>
              <ArrowRight className="h-4 w-4 rotate-90" />
              <span className="font-mono font-bold">+380 МВт</span>
            </div>
            <div className="text-[9px] text-muted-foreground">Импорт РФ</div>
          </div>

          <div className="rounded-lg px-4 py-3 text-center min-w-[80px]"
            style={{ background: "rgba(96,165,250,0.10)", border: "1px dashed rgba(96,165,250,0.45)" }}>
            <div className="text-[10px] text-muted-foreground">Россия</div>
            <div className="text-base font-bold font-mono" style={{ color: "#60a5fa" }}>+380</div>
            <div className="text-[9px] text-muted-foreground">МВт</div>
          </div>
        </div>
      </div>

      {/* ── Grid Topology ──────────────────────────────────────── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: `1px solid ${borderCol}` }}
      >
        <div className="px-4 py-3 flex items-center justify-between"
          style={{ borderBottom: `1px solid ${borderCol}`, background: cardBg }}>
          <div>
            <div className="text-sm font-semibold">Топология 500кВ ЕЭС Казахстана</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Схема магистральных сечений НЭС KEGOC</div>
          </div>
          <Badge variant="outline" className="text-[10px]">{TOPO_LINES.length} сечений · {Object.keys(TOPO_NODES).length - 1} узлов</Badge>
        </div>
        <div style={{ background: isDark ? "#0a1628" : "#f0f7ff" }}>
          <GridTopology isDark={isDark} activeScenario={activeScenario} />
        </div>
      </div>

      {/* ── Bottom 2-col: Gen Mix + Equipment Status ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Generation Mix */}
        <div className="rounded-xl p-4 space-y-3" style={{ background: cardBg, border: `1px solid ${borderCol}` }}>
          <div>
            <div className="text-sm font-semibold">Структура выработки ЕЭС РК</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Итого: {(14_720).toLocaleString()} МВт
              {" · "}ВИЭ: {Math.round(((390 + 170) / 14_720) * 100)}%
            </div>
          </div>
          <GenMixChart isDark={isDark} />

          {/* Renewables badge */}
          <div className="flex items-center gap-3 pt-1 flex-wrap">
            {[
              { icon: Wind, label: "ВЭС: 390 МВт", color: GEN_COLORS.wind },
              { icon: Sun,  label: "СЭС: 170 МВт", color: GEN_COLORS.solar },
              { icon: Waves,label: "ГЭС: 1 100 МВт", color: GEN_COLORS.hydro },
            ].map((b) => (
              <div key={b.label} className="flex items-center gap-1.5 text-[10px]" style={{ color: b.color }}>
                <b.icon className="h-3 w-3" />{b.label}
              </div>
            ))}
          </div>
        </div>

        {/* Equipment Status */}
        <div className="rounded-xl p-4 space-y-3" style={{ background: cardBg, border: `1px solid ${borderCol}` }}>
          <div>
            <div className="text-sm font-semibold">Ключевые ПС 500кВ — статус оборудования</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {SUBSTATIONS.filter((s) => s.status === "normal").length} норма · {warnings.length} внимание · {criticals.length} критично
            </div>
          </div>
          <div className="space-y-1.5">
            {SUBSTATIONS.sort((a, b) => b.loadPct - a.loadPct).map((sub) => (
              <div
                key={sub.id}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2"
                style={{ background: statusBg(sub.status) }}
              >
                <div className="h-2 w-2 rounded-full shrink-0" style={{ background: STATUS_COLOR[sub.status] }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{sub.name}</div>
                  <div className="text-[9px] text-muted-foreground">{sub.powerMW.toLocaleString()} МВт · {sub.transformers} тр-ра</div>
                </div>
                <div className="w-24 shrink-0">
                  <div className="flex justify-between text-[9px] mb-0.5">
                    <span className="text-muted-foreground">Загр.</span>
                    <span className="font-mono font-bold" style={{ color: STATUS_COLOR[sub.status] }}>{sub.loadPct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)" }}>
                    <div className="h-full rounded-full" style={{ width: `${sub.loadPct}%`, background: STATUS_COLOR[sub.status] }} />
                  </div>
                </div>
                <Badge className="text-[9px] px-1.5 shrink-0" style={{ background: statusBg(sub.status), color: STATUS_COLOR[sub.status], border: `1px solid ${STATUS_COLOR[sub.status]}40` }}>
                  {STATUS_LABEL[sub.status]}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Scenario Simulation ────────────────────────────────── */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: cardBg, border: `1px solid ${borderCol}` }}>
        <div>
          <div className="text-sm font-semibold flex items-center gap-2">
            <PlayCircle className="h-4 w-4 text-primary" />
            Симуляция аварийных сценариев (N-1 / N-2)
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Нажмите на сценарий чтобы запустить расчёт и просмотреть воздействие на ЕЭС РК
          </div>
        </div>
        <ScenarioPanel isDark={isDark} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   UPSTREAM — existing Oil & Gas digital twin (unchanged)
══════════════════════════════════════════════════════════════════ */

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
  { key: "UP",     label: "Добыча",      icon: Droplets, color: "#5CE0D6", colorLight: "#0D9488" },
  { key: "MID",    label: "Транспорт",   icon: Truck,    color: "#60A5FA", colorLight: "#2563EB" },
  { key: "DOWN",   label: "Переработка", icon: Factory,  color: "#FB923C", colorLight: "#EA580C" },
  { key: "EXPORT", label: "Экспорт",     icon: Ship,     color: "#4ADE80", colorLight: "#16A34A" },
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
  green:  { bg: "rgba(74,222,128,0.12)",  border: "rgba(74,222,128,0.3)",  text: "#4ADE80", label: "Норма" },
  yellow: { bg: "rgba(250,204,21,0.12)",  border: "rgba(250,204,21,0.3)",  text: "#FACC15", label: "Напряжение" },
  red:    { bg: "rgba(251,113,133,0.12)", border: "rgba(251,113,133,0.3)", text: "#FB7185", label: "Ограничение" },
};

function DigitalTwinUpstream() {
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
    UP:     { items: extractionCompanies, selected: selExtraction },
    MID:    { items: transportSections,   selected: selTransport  },
    DOWN:   { items: processingPlants,    selected: selProcessing },
    EXPORT: { items: exportDests,         selected: selExport     },
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
        key: stage.key, label: stage.label, capacity,
        plan: Math.round(plan), utilization: Math.round(utilization * 10) / 10,
        surplus: Math.round(surplus), status: calcUtilStatus(utilization),
        isBottleneck: false, companies,
      };
    });
  }, [extractionCompanies, transportSections, processingPlants, exportDests, selExtraction, selTransport, selProcessing, selExport]); // eslint-disable-line react-hooks/exhaustive-deps

  const feasibleVolume = Math.min(...stageResults.map((s) => s.capacity));
  const bottleneckIdx  = stageResults.findIndex((s) => s.capacity === feasibleVolume);
  const avgUtilization = stageResults.length > 0
    ? Math.round(stageResults.reduce((s, r) => s + r.utilization, 0) / stageResults.length * 10) / 10 : 0;
  const gap = stageResults.length > 0 ? feasibleVolume - Math.max(...stageResults.map((s) => s.plan)) : 0;

  if (bottleneckIdx >= 0) stageResults[bottleneckIdx].isBottleneck = true;

  const setterMap: Record<string, React.Dispatch<React.SetStateAction<string[]>>> = {
    UP: setSelExtraction, MID: setSelTransport, DOWN: setSelProcessing, EXPORT: setSelExport,
  };
  const toggleCode = (stageKey: string, code: string) => {
    setterMap[stageKey]((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]);
  };
  const clearFilter = (stageKey: string) => setterMap[stageKey]([]);

  const cardBg  = isDark ? "rgba(12,18,30,0.70)" : "rgba(255,255,255,0.90)";
  const borderCol = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-xl font-bold tracking-tight">{t("digitalTwinTitle")}</h1>
          <Badge variant="outline" className="text-[10px] uppercase tracking-widest font-semibold border-primary/30 text-primary">
            Oil & Gas
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">Баланс мощностей цепочки: от добычи до экспорта</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Пропускная способность", value: `${feasibleVolume.toLocaleString()}`, unit: "тыс.т",     icon: Gauge,       color: "#5CE0D6" },
          { label: "Узкое место",            value: bottleneckIdx >= 0 ? stageResults[bottleneckIdx].label : "—", unit: STAGES[bottleneckIdx]?.key ?? "", icon: AlertTriangle, color: "#FB7185" },
          { label: "Ср. загрузка",           value: `${avgUtilization}%`,                unit: "утилизация", icon: Activity,    color: "#FACC15" },
          { label: "Резерв / Дефицит",       value: `${gap > 0 ? "+" : ""}${gap.toLocaleString()}`, unit: "тыс.т", icon: TrendingDown, color: gap >= 0 ? "#4ADE80" : "#FB7185" },
        ].map((kpi, i) => (
          <div key={i} className="rounded-lg p-3" style={{ background: cardBg, border: `1px solid ${borderCol}` }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: kpi.color }}>{kpi.label}</span>
              <kpi.icon className="h-3.5 w-3.5" style={{ color: kpi.color }} />
            </div>
            <div className="text-xl font-bold" style={{ color: isDark ? "#fff" : "#0f172a" }}>{kpi.value}</div>
            <div className="text-[10px]" style={{ color: isDark ? "rgba(255,255,255,0.35)" : "rgba(15,23,42,0.45)" }}>{kpi.unit}</div>
          </div>
        ))}
      </div>

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
              <div
                className="rounded-xl p-4 space-y-3 transition-all duration-300 cursor-pointer"
                style={{
                  background: cardBg,
                  border: result.isBottleneck ? `2px solid ${sc.border}` : `1px solid ${borderCol}`,
                  boxShadow: result.isBottleneck && isDark ? `0 0 20px ${sc.text}20` : "none",
                }}
                onClick={() => setExpandedStage(isExpanded ? null : stage.key)}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${accent}20`, color: accent }}>
                    <StIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold" style={{ color: isDark ? "#fff" : "#0f172a" }}>{result.label}</div>
                    <div className="text-[10px] font-mono" style={{ color: isDark ? "rgba(255,255,255,0.35)" : "rgba(15,23,42,0.40)" }}>{stage.key}</div>
                  </div>
                  {result.isBottleneck && (
                    <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }} className="text-[9px] px-1.5">УЗКОЕ МЕСТО</Badge>
                  )}
                </div>

                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span style={{ color: isDark ? "rgba(255,255,255,0.45)" : "rgba(15,23,42,0.50)" }}>Загрузка</span>
                    <span className="font-bold font-mono" style={{ color: sc.text }}>{result.utilization}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(result.utilization, 100)}%`, background: `linear-gradient(90deg, ${accent}, ${sc.text})` }} />
                  </div>
                </div>

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

                <div className="flex items-center justify-between text-[10px]">
                  <span style={{ color: isDark ? "rgba(255,255,255,0.30)" : "rgba(15,23,42,0.35)" }}>
                    Резерв: <span className="font-mono font-semibold" style={{ color: result.surplus >= 0 ? "#4ADE80" : "#FB7185" }}>
                      {result.surplus >= 0 ? "+" : ""}{result.surplus.toLocaleString()} тыс.т
                    </span>
                  </span>
                  {isExpanded ? <ChevronUp className="h-3 w-3" style={{ color: accent }} /> : <ChevronDown className="h-3 w-3" style={{ color: isDark ? "rgba(255,255,255,0.25)" : "rgba(15,23,42,0.30)" }} />}
                </div>

                <div className="pt-1 border-t" style={{ borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full h-7 text-[10px] justify-between gap-1" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Filter className="h-3 w-3" />
                          {selected.length === 0 ? "Все компании" : `Выбрано: ${selected.length}`}
                        </div>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[280px]" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuLabel className="text-[11px]">{result.label}</DropdownMenuLabel>
                      <DropdownMenuCheckboxItem checked={selected.length === 0} onCheckedChange={(checked) => { if (checked) clearFilter(stage.key); }}>Все</DropdownMenuCheckboxItem>
                      <DropdownMenuSeparator />
                      {items.map((item) => (
                        <DropdownMenuCheckboxItem key={item.code} checked={selected.includes(item.code)} onCheckedChange={() => toggleCode(stage.key, item.code)}>
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

              {i < stageResults.length - 1 && (
                <div className="hidden md:flex items-center justify-center px-1">
                  <div className="flex flex-col items-center gap-1">
                    <ArrowRight className="h-5 w-5" style={{ color: isDark ? "rgba(92,224,214,0.4)" : "rgba(13,148,136,0.3)" }} />
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

      {expandedStage && (() => {
        const idx = stageResults.findIndex((s) => s.key === expandedStage);
        if (idx < 0) return null;
        const result = stageResults[idx];
        const stage  = STAGES[idx];
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
                {result.companies.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Нет данных</p>}
                {result.companies.sort((a, b) => b.capacity - a.capacity).map((c, ci) => {
                  const cStatus = calcUtilStatus(c.utilization);
                  const cSc = STATUS_COLORS[cStatus];
                  return (
                    <div key={ci} className="flex items-center gap-3 p-2.5 rounded-lg"
                      style={{ background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{translateData(c.name)}</div>
                        <div className="text-[10px] text-muted-foreground">{c.capacity.toLocaleString()} тыс.т</div>
                      </div>
                      <div className="w-32 shrink-0">
                        <div className="flex justify-between text-[10px] mb-0.5">
                          <span className="text-muted-foreground">Загрузка</span>
                          <span className="font-mono font-bold" style={{ color: cSc.text }}>{Math.round(c.utilization)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                          <div className="h-full rounded-full" style={{ width: `${Math.min(c.utilization, 100)}%`, background: cSc.text }} />
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

      {stageResults.length > 0 && stageResults.some((s) => s.status !== "green") && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />Рекомендации
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stageResults.filter((s) => s.isBottleneck).map((s) => (
                <div key={`bn-${s.key}`} className="flex items-start gap-2 text-sm">
                  <span className="text-destructive font-semibold">●</span>
                  <span><strong>{s.label}</strong> является узким местом цепочки с мощностью <span className="font-mono font-semibold">{s.capacity.toLocaleString()} тыс.т</span>.</span>
                </div>
              ))}
              {stageResults.filter((s) => s.status === "red" && !s.isBottleneck).map((s) => (
                <div key={`red-${s.key}`} className="flex items-start gap-2 text-sm">
                  <span className="text-warning font-semibold">●</span>
                  <span><strong>{s.label}</strong> загружен на <span className="font-mono font-semibold">{s.utilization}%</span> — близок к пределу.</span>
                </div>
              ))}
              {stageResults.filter((s) => s.status === "yellow").map((s) => (
                <div key={`yel-${s.key}`} className="flex items-start gap-2 text-sm">
                  <span style={{ color: "#FACC15" }} className="font-semibold">●</span>
                  <span><strong>{s.label}</strong> загружен на <span className="font-mono font-semibold">{s.utilization}%</span> — умеренная загрузка.</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ROOT EXPORT — branches by industry
══════════════════════════════════════════════════════════════════ */
export default function DigitalTwin() {
  const { getIndustryPack } = useCompanyProfile();
  const pack = getIndustryPack();
  if (pack.id === "energy") return <DigitalTwinEnergy />;
  return <DigitalTwinUpstream />;
}

import { useState, useMemo } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useOilFields } from "@/hooks/useOilFields";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronDown, ChevronRight, Download, TrendingUp, TrendingDown,
  Minus, BarChart3, AlertTriangle, CheckCircle2, Clock,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────────── */
const MONTHS_RU = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн",
                   "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface MonthData { plan: number; fact: number | null }
interface FieldRow {
  id: number;
  name: string;
  ngdu: string;
  months: MonthData[];
  status: "on_track" | "behind" | "ahead" | "pending";
}

/* ─────────────────────────────────────────────────────────────────
   Mock data helpers  (replace with real API call when backend ready)
───────────────────────────────────────────────────────────────── */
function makeMonths(
  annualPlan: number,
  completedMonths: number,
  variance: number
): MonthData[] {
  const base = annualPlan / 12;
  return Array.from({ length: 12 }, (_, i) => ({
    plan: Math.round(base * (0.9 + 0.2 * Math.sin(i * 0.5 + 1))),
    fact: i < completedMonths
      ? Math.round(base * (0.9 + 0.2 * Math.sin(i * 0.5 + 1)) * (1 + variance * (Math.random() - 0.5)))
      : null,
  }));
}

const MOCK_2026: FieldRow[] = [
  { id: 1, name: "Жетыбай",            ngdu: "Жетыбаймунайгаз",    months: makeMonths(680000, 1, 0.06), status: "on_track" },
  { id: 2, name: "Узень",              ngdu: "Уземунайгаз",         months: makeMonths(820000, 1, 0.04), status: "on_track" },
  { id: 3, name: "Каракудук",          ngdu: "Жетыбаймунайгаз",    months: makeMonths(410000, 1, 0.08), status: "behind"   },
  { id: 4, name: "Северные Бузачи",    ngdu: "Бузачи",              months: makeMonths(520000, 1, 0.05), status: "on_track" },
  { id: 5, name: "Кенкияк",            ngdu: "Кенкиякнефть",        months: makeMonths(310000, 1, 0.02), status: "ahead"    },
  { id: 6, name: "Восточный Молдабек", ngdu: "Кайнармунайгаз",      months: makeMonths(95000,  1, 0.12), status: "behind"   },
  { id: 7, name: "Каламкас",           ngdu: "Каламкасмунайгаз",    months: makeMonths(590000, 1, 0.03), status: "on_track" },
  { id: 8, name: "Кумколь",            ngdu: "Кумкольнефть",        months: makeMonths(740000, 1, 0.07), status: "on_track" },
];

const MOCK_2025: FieldRow[] = MOCK_2026.map(r => ({
  ...r,
  months: makeMonths(
    r.months.reduce((s, m) => s + m.plan, 0) * 0.97,
    12,
    0.04
  ).map(m => ({ ...m, fact: m.plan })),
  status: "on_track" as const,
}));

const MOCK_DATA: Record<number, FieldRow[]> = { 2025: MOCK_2025, 2026: MOCK_2026 };

/* ─────────────────────────────────────────────────────────────────
   SVG Bar+Line Chart (plan vs fact)
───────────────────────────────────────────────────────────────── */
function PlanChart({
  rows,
  months,
}: {
  rows: FieldRow[];
  months: string[];
}) {
  const W = 820, H = 220, PL = 54, PR = 20, PT = 20, PB = 36;
  const cw = (W - PL - PR) / 12;
  const barW = cw * 0.35;

  const totals = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
      plan: rows.reduce((s, r) => s + r.months[i].plan, 0),
      fact: rows.every(r => r.months[i].fact === null)
        ? null
        : rows.reduce((s, r) => s + (r.months[i].fact ?? 0), 0),
    })),
    [rows]
  );

  const maxVal = Math.max(...totals.map(t => Math.max(t.plan, t.fact ?? 0)));
  const yScale = (v: number) => PT + (H - PT - PB) * (1 - v / (maxVal * 1.1));
  const xCenter = (i: number) => PL + i * cw + cw / 2;

  const factPoints = totals
    .map((t, i) => t.fact !== null ? `${xCenter(i)},${yScale(t.fact)}` : null)
    .filter(Boolean);

  const yTicks = 4;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
      {/* grid */}
      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const v = (maxVal * 1.1 * i) / yTicks;
        const y = yScale(v);
        return (
          <g key={i}>
            <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="#e2e8f0" strokeWidth="0.8" className="dark:stroke-slate-700" />
            <text x={PL - 4} y={y + 4} fontSize="9" fill="#94a3b8" textAnchor="end" fontFamily="monospace">
              {(v / 1000).toFixed(0)}к
            </text>
          </g>
        );
      })}

      {/* plan bars */}
      {totals.map((t, i) => (
        <rect
          key={`plan-${i}`}
          x={xCenter(i) - barW}
          y={yScale(t.plan)}
          width={barW * 2}
          height={H - PB - yScale(t.plan)}
          fill="#3b82f6"
          fillOpacity="0.25"
          rx="2"
        />
      ))}

      {/* fact bars */}
      {totals.map((t, i) =>
        t.fact !== null ? (
          <rect
            key={`fact-${i}`}
            x={xCenter(i) - barW * 0.7}
            y={yScale(t.fact)}
            width={barW * 1.4}
            height={H - PB - yScale(t.fact)}
            fill={t.fact >= t.plan ? "#22c55e" : "#f87171"}
            fillOpacity="0.8"
            rx="2"
          />
        ) : null
      )}

      {/* fact line */}
      {factPoints.length > 1 && (
        <polyline
          points={factPoints.join(" ")}
          fill="none"
          stroke="#22c55e"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      )}
      {totals.map((t, i) =>
        t.fact !== null ? (
          <circle key={`dot-${i}`} cx={xCenter(i)} cy={yScale(t.fact)} r="3.5"
            fill={t.fact >= t.plan ? "#22c55e" : "#f87171"} stroke="white" strokeWidth="1.5" />
        ) : null
      )}

      {/* plan line */}
      <polyline
        points={totals.map((t, i) => `${xCenter(i)},${yScale(t.plan)}`).join(" ")}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="1.5"
        strokeDasharray="5,3"
        strokeLinejoin="round"
      />

      {/* x axis labels */}
      {months.map((m, i) => (
        <text key={i} x={xCenter(i)} y={H - 6} fontSize="9" fill="#94a3b8" textAnchor="middle" fontFamily="monospace">
          {m}
        </text>
      ))}

      {/* x axis line */}
      <line x1={PL} y1={H - PB} x2={W - PR} y2={H - PB} stroke="#e2e8f0" strokeWidth="1" className="dark:stroke-slate-700" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Mini sparkline for table rows
───────────────────────────────────────────────────────────────── */
function Sparkline({ months }: { months: MonthData[] }) {
  const W = 80, H = 28;
  const values = months.filter(m => m.fact !== null).map(m => m.fact as number);
  if (values.length < 2) return <span className="text-xs text-muted-foreground">—</span>;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) =>
    `${(i / (values.length - 1)) * W},${H - 4 - ((v - min) / range) * (H - 8)}`
  ).join(" ");
  return (
    <svg width={W} height={H} className="inline-block">
      <polyline points={pts} fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Status badge
───────────────────────────────────────────────────────────────── */
function StatusBadge({ status, isEn }: { status: FieldRow["status"]; isEn: boolean }) {
  const map = {
    on_track: { label: isEn ? "On track" : "По плану",  icon: CheckCircle2,  cls: "text-green-600 bg-green-500/10 border-green-500/30" },
    ahead:    { label: isEn ? "Ahead"    : "Опережение",icon: TrendingUp,     cls: "text-blue-600  bg-blue-500/10  border-blue-500/30"  },
    behind:   { label: isEn ? "Behind"   : "Отставание",icon: TrendingDown,   cls: "text-red-600   bg-red-500/10   border-red-500/30"   },
    pending:  { label: isEn ? "Pending"  : "Ожидание",  icon: Clock,          cls: "text-slate-500 bg-slate-500/10 border-slate-500/30" },
  };
  const { label, icon: Icon, cls } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border font-medium ${cls}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Field detail row
───────────────────────────────────────────────────────────────── */
function FieldDetailRow({
  row,
  months,
  isEn,
}: {
  row: FieldRow;
  months: string[];
  isEn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const planTotal = row.months.reduce((s, m) => s + m.plan, 0);
  const factTotal = row.months.reduce((s, m) => s + (m.fact ?? 0), 0);
  const completedMonths = row.months.filter(m => m.fact !== null).length;
  const pct = completedMonths > 0
    ? ((factTotal / row.months.slice(0, completedMonths).reduce((s, m) => s + m.plan, 0)) * 100)
    : null;
  const delta = pct !== null ? pct - 100 : null;

  return (
    <>
      <tr
        className="border-b border-border/50 hover:bg-muted/40 cursor-pointer transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <td className="py-2.5 px-3">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            {open
              ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            }
            {row.name}
          </span>
        </td>
        <td className="py-2.5 px-3 text-sm text-muted-foreground">{row.ngdu}</td>
        <td className="py-2.5 px-3 text-sm text-right font-mono">
          {(planTotal / 1000).toFixed(1)}к т
        </td>
        <td className="py-2.5 px-3 text-sm text-right font-mono">
          {completedMonths > 0
            ? <>{(factTotal / 1000).toFixed(1)}к т</>
            : <span className="text-muted-foreground">—</span>
          }
        </td>
        <td className="py-2.5 px-3 text-sm text-right">
          {delta !== null ? (
            <span className={`font-mono font-medium ${delta >= 0 ? "text-green-600" : "text-red-500"}`}>
              {delta >= 0 ? "+" : ""}{delta.toFixed(1)}%
            </span>
          ) : <span className="text-muted-foreground">—</span>}
        </td>
        <td className="py-2.5 px-3">
          <Sparkline months={row.months} />
        </td>
        <td className="py-2.5 px-3">
          <StatusBadge status={row.status} isEn={isEn} />
        </td>
      </tr>

      {/* Expanded monthly breakdown */}
      {open && (
        <tr className="bg-muted/20">
          <td colSpan={7} className="px-4 pb-3 pt-1">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground">
                    <td className="py-1 pr-3 font-medium">{isEn ? "Metric" : "Показатель"}</td>
                    {months.map(m => (
                      <td key={m} className="py-1 px-2 text-center font-mono">{m}</td>
                    ))}
                    <td className="py-1 px-2 text-center font-mono">{isEn ? "Total" : "Итого"}</td>
                  </tr>
                </thead>
                <tbody>
                  <tr className="text-blue-600">
                    <td className="py-1 pr-3 font-medium">{isEn ? "Plan, t" : "План, т"}</td>
                    {row.months.map((m, i) => (
                      <td key={i} className="py-1 px-2 text-center font-mono">{m.plan.toLocaleString("ru")}</td>
                    ))}
                    <td className="py-1 px-2 text-center font-mono font-semibold">
                      {planTotal.toLocaleString("ru")}
                    </td>
                  </tr>
                  <tr className="text-green-600">
                    <td className="py-1 pr-3 font-medium">{isEn ? "Fact, t" : "Факт, т"}</td>
                    {row.months.map((m, i) => (
                      <td key={i} className="py-1 px-2 text-center font-mono">
                        {m.fact !== null
                          ? <span className={m.fact >= m.plan ? "text-green-600" : "text-red-500"}>
                              {m.fact.toLocaleString("ru")}
                            </span>
                          : <span className="text-muted-foreground">—</span>
                        }
                      </td>
                    ))}
                    <td className="py-1 px-2 text-center font-mono font-semibold">
                      {completedMonths > 0 ? factTotal.toLocaleString("ru") : "—"}
                    </td>
                  </tr>
                  <tr className="text-slate-500">
                    <td className="py-1 pr-3 font-medium">{isEn ? "Δ%" : "Откл., %"}</td>
                    {row.months.map((m, i) => (
                      <td key={i} className="py-1 px-2 text-center font-mono">
                        {m.fact !== null
                          ? <span className={m.fact >= m.plan ? "text-green-600" : "text-red-500"}>
                              {(((m.fact - m.plan) / m.plan) * 100).toFixed(1)}%
                            </span>
                          : <span className="text-muted-foreground">—</span>
                        }
                      </td>
                    ))}
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
   KPI Card
───────────────────────────────────────────────────────────────── */
function KpiCard({
  label, value, sub, trend, trendColor,
}: {
  label: string; value: string; sub?: string;
  trend?: string; trendColor?: "green" | "red" | "blue";
}) {
  const cls = trendColor === "green" ? "text-green-600"
    : trendColor === "red" ? "text-red-500" : "text-blue-500";
  return (
    <Card className="flex-1 min-w-[150px]">
      <CardContent className="pt-4 pb-3 px-4 space-y-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold font-mono tracking-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        {trend && <p className={`text-xs font-medium ${cls}`}>{trend}</p>}
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────────── */
export function ProductionPlan() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const { oilFields } = useOilFields();

  const [year, setYear] = useState(2026);
  const [selectedNgdu, setSelectedNgdu] = useState("all");
  const [view, setView] = useState<"chart" | "table">("chart");

  const months = isEn ? MONTHS_EN : MONTHS_RU;

  // Merge with real oil field names if available
  const rows = useMemo(() => {
    const base = MOCK_DATA[year] ?? MOCK_2026;
    if (oilFields.length === 0) return base;
    return base.map(r => {
      const real = oilFields.find(f => f.id === r.id || f.name === r.name);
      return real ? { ...r, name: real.name } : r;
    });
  }, [year, oilFields]);

  const ngdus = useMemo(() => {
    const set = new Set(rows.map(r => r.ngdu));
    return ["all", ...Array.from(set)];
  }, [rows]);

  const filtered = selectedNgdu === "all" ? rows : rows.filter(r => r.ngdu === selectedNgdu);

  // Totals
  const planYear   = filtered.reduce((s, r) => s + r.months.reduce((a, m) => a + m.plan, 0), 0);
  const factYear   = filtered.reduce((s, r) => s + r.months.reduce((a, m) => a + (m.fact ?? 0), 0), 0);
  const doneMonths = filtered[0]?.months.filter(m => m.fact !== null).length ?? 0;
  const planToDate = filtered.reduce((s, r) => s + r.months.slice(0, doneMonths).reduce((a, m) => a + m.plan, 0), 0);
  const execPct    = planToDate > 0 ? (factYear / planToDate) * 100 : null;
  const behind     = filtered.filter(r => r.status === "behind").length;

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Year selector */}
          <div className="flex rounded-md overflow-hidden border text-sm">
            {[2025, 2026].map(y => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={`px-4 py-1.5 transition-colors ${year === y
                  ? "bg-primary text-primary-foreground font-medium"
                  : "bg-background hover:bg-muted text-muted-foreground"}`}
              >
                {y}
              </button>
            ))}
          </div>

          {/* NGDU filter */}
          <select
            value={selectedNgdu}
            onChange={e => setSelectedNgdu(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-3 text-sm"
          >
            {ngdus.map(n => (
              <option key={n} value={n}>
                {n === "all" ? (isEn ? "All NGDU" : "Все НГДУ") : n}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-md overflow-hidden border text-sm">
            <button
              onClick={() => setView("chart")}
              className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors ${view === "chart"
                ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted text-muted-foreground"}`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              {isEn ? "Chart" : "График"}
            </button>
            <button
              onClick={() => setView("table")}
              className={`px-3 py-1.5 border-l flex items-center gap-1.5 transition-colors ${view === "table"
                ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted text-muted-foreground"}`}
            >
              {isEn ? "Table" : "Таблица"}
            </button>
          </div>

          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            {isEn ? "Export" : "Экспорт"}
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="flex flex-wrap gap-3">
        <KpiCard
          label={isEn ? `Annual plan ${year}, t` : `Годовой план ${year}, т`}
          value={`${(planYear / 1_000_000).toFixed(2)} млн`}
          sub={isEn ? `${filtered.length} fields` : `${filtered.length} м/р`}
        />
        <KpiCard
          label={isEn ? "Fact to date, t" : "Факт с начала года, т"}
          value={`${(factYear / 1_000_000).toFixed(2)} млн`}
          sub={isEn ? `${doneMonths} months completed` : `${doneMonths} мес. закрыто`}
          trend={execPct !== null
            ? `${execPct >= 100 ? "+" : ""}${(execPct - 100).toFixed(1)}% ${isEn ? "vs plan" : "к плану"}`
            : undefined}
          trendColor={execPct !== null ? (execPct >= 100 ? "green" : "red") : undefined}
        />
        <KpiCard
          label={isEn ? "Plan fulfilment" : "Исполнение плана"}
          value={execPct !== null ? `${execPct.toFixed(1)}%` : "—"}
          trend={execPct !== null
            ? (execPct >= 100
              ? (isEn ? "On track or ahead" : "По плану / опережение")
              : (isEn ? "Below plan" : "Ниже плана"))
            : undefined}
          trendColor={execPct !== null ? (execPct >= 100 ? "green" : "red") : undefined}
        />
        <KpiCard
          label={isEn ? "Fields behind plan" : "М/р с отставанием"}
          value={String(behind)}
          trend={behind === 0
            ? (isEn ? "All fields on track" : "Все м/р в норме")
            : (isEn ? `${behind} require attention` : `${behind} требуют внимания`)}
          trendColor={behind === 0 ? "green" : "red"}
        />
      </div>

      {/* Alerts */}
      {behind > 0 && (
        <div className="flex items-start gap-2.5 rounded-lg border border-yellow-500/30 bg-yellow-500/8 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
              {isEn ? "Attention required" : "Требуется внимание"}
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-300 mt-0.5">
              {filtered.filter(r => r.status === "behind").map(r => r.name).join(", ")}
              {isEn ? " are behind schedule." : " — отставание от плана."}
            </p>
          </div>
        </div>
      )}

      {/* Chart / Table toggle */}
      {view === "chart" ? (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                {isEn ? "Monthly production: Plan vs Fact" : "Добыча по месяцам: план vs факт"}
              </CardTitle>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-4 h-3 rounded bg-blue-500/25 border border-blue-500/60" />
                  {isEn ? "Plan" : "План"}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-4 h-2 rounded-full bg-green-500" />
                  {isEn ? "Fact" : "Факт"}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <PlanChart rows={filtered} months={months} />
          </CardContent>
        </Card>
      ) : null}

      {/* Detailed table */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">
            {isEn ? "Detailed plan by field" : "Детализация по месторождениям"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-xs text-muted-foreground bg-muted/40">
                  <th className="text-left py-2.5 px-3 font-medium">{isEn ? "Field" : "Месторождение"}</th>
                  <th className="text-left py-2.5 px-3 font-medium">{isEn ? "NGDU" : "НГДУ"}</th>
                  <th className="text-right py-2.5 px-3 font-medium">{isEn ? "Annual plan" : "План год"}</th>
                  <th className="text-right py-2.5 px-3 font-medium">{isEn ? "Fact YTD" : "Факт с НГ"}</th>
                  <th className="text-right py-2.5 px-3 font-medium">{isEn ? "Δ vs plan" : "Откл."}</th>
                  <th className="py-2.5 px-3 font-medium">{isEn ? "Trend" : "Тренд"}</th>
                  <th className="py-2.5 px-3 font-medium">{isEn ? "Status" : "Статус"}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => (
                  <FieldDetailRow key={row.id} row={row} months={months} isEn={isEn} />
                ))}
              </tbody>
              {/* Totals row */}
              <tfoot>
                <tr className="border-t bg-muted/30 font-semibold text-sm">
                  <td className="py-2.5 px-3" colSpan={2}>{isEn ? "Total" : "Итого"}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{(planYear / 1000).toFixed(1)}к т</td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    {doneMonths > 0
                      ? `${(factYear / 1000).toFixed(1)}к т`
                      : <span className="text-muted-foreground font-normal">—</span>
                    }
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {execPct !== null
                      ? <span className={`font-mono ${execPct >= 100 ? "text-green-600" : "text-red-500"}`}>
                          {execPct >= 100 ? "+" : ""}{(execPct - 100).toFixed(1)}%
                        </span>
                      : <span className="text-muted-foreground font-normal">—</span>
                    }
                  </td>
                  <td /><td />
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground/50 text-center">
        {isEn
          ? "* Data shown is indicative. Connect to production database for real-time figures."
          : "* Данные являются ориентировочными. Для актуальных значений подключите производственную БД."}
      </p>
    </div>
  );
}

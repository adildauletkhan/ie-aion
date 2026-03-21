import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getAuthHeader } from "@/lib/auth";
import {
  Activity,
  Droplets,
  Gauge,
  Search,
  Thermometer,
  Waves,
  Zap,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Well {
  id: number;
  name: string;
  wellType: string;
  status: string;
  depthCurrent: number | null;
  formationName: string | null;
  zoneName: string | null;
  oilFieldName: string | null;
}

interface WellMetrics {
  oilRate?: number;    // т/сут
  watercut?: number;   // %
  pressure: number;    // атм
  esp?: string;
  injection?: number;  // м³/сут
  temperature?: number;// °C
  glratio?: number;    // м³/т
}

// ── Deterministic pseudo-random helpers ───────────────────────────────────────
function seed(n: number, offset = 0) {
  return ((n * 6364136223846793005 + 1442695040888963407 + offset) & 0x7fffffff) >>> 0;
}
function seedFloat(n: number, offset = 0): number {
  return seed(n, offset) / 0x7fffffff;
}

function getWellMetrics(well: Well): WellMetrics {
  const s = parseInt(well.name) || well.id;
  if (well.wellType === "production") {
    return {
      oilRate:     Math.round(15 + seedFloat(s, 1) * 45),
      watercut:    Math.round(20 + seedFloat(s, 2) * 65),
      pressure:    Math.round(85 + seedFloat(s, 3) * 55),
      glratio:     Math.round(50 + seedFloat(s, 4) * 120),
      esp:         ["ЭЦН-50", "ЭЦН-80", "ЭВН-25", "ЭВН-50", "ШГН-44"][s % 5],
    };
  } else if (well.wellType === "injection") {
    return {
      injection: Math.round(80 + seedFloat(s, 5) * 140),
      pressure:  Math.round(120 + seedFloat(s, 6) * 60),
    };
  } else {
    return {
      pressure:    Math.round(90 + seedFloat(s, 7) * 50),
      temperature: Math.round(55 + seedFloat(s, 8) * 25),
    };
  }
}

// ── Badge helpers ─────────────────────────────────────────────────────────────
const WELL_TYPE_LABEL: Record<string, string> = {
  production:  "Добывающая",
  injection:   "Нагнетательная",
  observation: "Наблюдательная",
};
const WELL_TYPE_COLOR: Record<string, string> = {
  production:  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  injection:   "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  observation: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};
const STATUS_COLOR: Record<string, string> = {
  active:   "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  inactive: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  stopped:  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

// ── KPI Summary Card ──────────────────────────────────────────────────────────
function KpiMini({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-bold">{value}</p>
      </div>
    </div>
  );
}

// ── Wells Full Table ──────────────────────────────────────────────────────────
function WellsFullView({ wells, year }: { wells: Well[]; year: string }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return wells.filter((w) => {
      const matchType   = typeFilter === "all" || w.wellType === typeFilter;
      const matchSearch = !search || w.name.toLowerCase().includes(search.toLowerCase())
        || (w.formationName || "").toLowerCase().includes(search.toLowerCase())
        || (w.zoneName || "").toLowerCase().includes(search.toLowerCase());
      return matchType && matchSearch;
    });
  }, [wells, search, typeFilter]);

  const totalProduction = useMemo(() =>
    wells.filter((w) => w.wellType === "production")
         .reduce((sum, w) => sum + (getWellMetrics(w).oilRate ?? 0), 0),
  [wells]);

  const totalInjection = useMemo(() =>
    wells.filter((w) => w.wellType === "injection")
         .reduce((sum, w) => sum + (getWellMetrics(w).injection ?? 0), 0),
  [wells]);

  const activeCount = wells.filter((w) => w.status === "active").length;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiMini icon={Activity}  label="Всего скважин"     value={String(wells.length)}                               color="bg-primary/10 text-primary" />
        <KpiMini icon={Zap}       label="Активных"          value={`${activeCount} / ${wells.length}`}                 color="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" />
        <KpiMini icon={Droplets}  label="Суммарный дебит"   value={`${totalProduction} т/сут`}                        color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" />
        <KpiMini icon={Waves}     label="Закачка воды"      value={`${totalInjection} м³/сут`}                        color="bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Поиск по скважине, пласту, зоне..."
            className="pl-8 h-8 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {["all", "production", "injection", "observation"].map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              typeFilter === t
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            {t === "all" ? "Все" : WELL_TYPE_LABEL[t]}
          </button>
        ))}
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} из {wells.length} · Год: {year}
        </span>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-muted sticky top-0 z-10">
            <tr>
              <th className="text-left px-3 py-2.5 font-medium text-xs whitespace-nowrap">Скважина</th>
              <th className="text-left px-3 py-2.5 font-medium text-xs whitespace-nowrap">Тип</th>
              <th className="text-left px-3 py-2.5 font-medium text-xs whitespace-nowrap">Статус</th>
              <th className="text-left px-3 py-2.5 font-medium text-xs whitespace-nowrap">Пласт</th>
              <th className="text-left px-3 py-2.5 font-medium text-xs whitespace-nowrap">Зона дренирования</th>
              <th className="text-right px-3 py-2.5 font-medium text-xs whitespace-nowrap">Глубина, м</th>
              <th className="text-right px-3 py-2.5 font-medium text-xs whitespace-nowrap">Дебит нефти, т/сут</th>
              <th className="text-right px-3 py-2.5 font-medium text-xs whitespace-nowrap">Обводн., %</th>
              <th className="text-right px-3 py-2.5 font-medium text-xs whitespace-nowrap">Давление, атм</th>
              <th className="text-left px-3 py-2.5 font-medium text-xs whitespace-nowrap">Насос / ГФ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((well) => {
              const m = getWellMetrics(well);
              return (
                <tr key={well.id} className="border-t hover:bg-muted/40 transition-colors">
                  <td className="px-3 py-2 font-mono font-semibold text-xs">{well.name}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${WELL_TYPE_COLOR[well.wellType] ?? ""}`}>
                      {WELL_TYPE_LABEL[well.wellType] ?? well.wellType}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLOR[well.status] ?? ""}`}>
                      {well.status === "active" ? "Активна" : well.status === "inactive" ? "Остановлена" : well.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{well.formationName ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{well.zoneName ?? "—"}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {well.depthCurrent != null ? well.depthCurrent.toFixed(0) : "—"}
                  </td>
                  {/* Production-specific */}
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {well.wellType === "production" ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{m.oilRate}</span>
                    ) : well.wellType === "injection" ? (
                      <span className="text-blue-500 text-[11px]">↑ {m.injection} м³</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {well.wellType === "production" ? (
                      <WatercutBar value={m.watercut ?? 0} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{m.pressure}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {well.wellType === "production" ? m.esp
                      : well.wellType === "injection" ? "ЦНС-180"
                      : <span className="italic">Датчик</span>
                    }
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center py-8 text-muted-foreground text-sm">
                  Нет данных
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WatercutBar({ value }: { value: number }) {
  const color = value < 40 ? "bg-emerald-500" : value < 70 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-1.5 justify-end">
      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs w-7 text-right">{value}%</span>
    </div>
  );
}

// ── Flow Diagram (пласт → РВС) ────────────────────────────────────────────────
function FlowsView({ wells, year }: { wells: Well[]; year: string }) {
  // Group wells by formation
  const byFormation = useMemo(() => {
    const map = new Map<string, Well[]>();
    for (const w of wells) {
      const key = w.formationName ?? "Без пласта";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(w);
    }
    return Array.from(map.entries()).map(([formation, fWells]) => {
      const prodWells = fWells.filter((w) => w.wellType === "production");
      const injWells  = fWells.filter((w) => w.wellType === "injection");
      const totalOil  = prodWells.reduce((s, w) => s + (getWellMetrics(w).oilRate ?? 0), 0);
      const totalInj  = injWells.reduce((s, w) => s + (getWellMetrics(w).injection ?? 0), 0);
      const avgWC     = prodWells.length
        ? Math.round(prodWells.reduce((s, w) => s + (getWellMetrics(w).watercut ?? 0), 0) / prodWells.length)
        : 0;
      return { formation, fWells, prodWells, injWells, totalOil, totalInj, avgWC };
    });
  }, [wells]);

  const grandTotalOil = byFormation.reduce((s, f) => s + f.totalOil, 0);
  const grandTotalInj = byFormation.reduce((s, f) => s + f.totalInj, 0);

  // Mock collection infrastructure
  const dns  = "ДНС-1 Жетыбай";
  const rbs  = "РВС-1000 (×4)";
  const pipe = "Нефтепровод Жетыбай–КТЛ";

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiMini icon={Droplets}    label="Суммарный дебит нефти"  value={`${grandTotalOil} т/сут`}  color="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" />
        <KpiMini icon={Waves}       label="Суммарная закачка воды" value={`${grandTotalInj} м³/сут`} color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" />
        <KpiMini icon={Gauge}       label="Пластов в работе"       value={String(byFormation.length)} color="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" />
        <KpiMini icon={Activity}    label="Добывающих скважин"     value={String(byFormation.reduce((s, f) => s + f.prodWells.length, 0))} color="bg-primary/10 text-primary" />
      </div>

      {/* Flow diagram */}
      <div className="border rounded-xl overflow-hidden bg-card">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-center gap-0 bg-muted px-6 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          <span>Пласт / Горизонт</span>
          <span />
          <span>Скважины</span>
          <span />
          <span>Сбор / ДНС</span>
          <span />
          <span>РВС / Экспорт</span>
        </div>

        {/* Formation rows */}
        <div className="divide-y divide-border">
          {byFormation.map(({ formation, prodWells, injWells, totalOil, totalInj, avgWC }, idx) => (
            <div key={formation} className="grid grid-cols-[1fr_24px_1fr_24px_1fr_24px_1fr] items-center gap-0 px-6 py-4 hover:bg-muted/30 transition-colors">
              {/* Пласт */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                  <span className="text-sm font-semibold">{formation}</span>
                </div>
                <div className="ml-4.5 flex flex-wrap gap-1.5 mt-0.5">
                  <span className="text-[10px] bg-muted rounded px-1.5 py-0.5 text-muted-foreground">
                    {prodWells.length} доб.
                  </span>
                  {injWells.length > 0 && (
                    <span className="text-[10px] bg-muted rounded px-1.5 py-0.5 text-muted-foreground">
                      {injWells.length} нагн.
                    </span>
                  )}
                </div>
              </div>

              {/* Arrow 1 */}
              <FlowArrow />

              {/* Скважины */}
              <div className="bg-muted/60 rounded-lg px-3 py-2.5 flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Дебит нефти</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{totalOil} т/сут</span>
                </div>
                {injWells.length > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Закачка</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{totalInj} м³/сут</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Обводн. ср.</span>
                  <WatercutBar value={avgWC} />
                </div>
                {/* Well badges */}
                <div className="flex flex-wrap gap-1 mt-1">
                  {prodWells.slice(0, 8).map((w) => (
                    <span key={w.id} className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded px-1.5 py-0.5 font-mono">
                      {w.name}
                    </span>
                  ))}
                  {prodWells.length > 8 && (
                    <span className="text-[10px] text-muted-foreground">+{prodWells.length - 8}</span>
                  )}
                </div>
              </div>

              {/* Arrow 2 */}
              <FlowArrow />

              {/* ДНС */}
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/40 rounded-lg px-3 py-2.5 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Gauge className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">{dns}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Вход, нефть</span>
                  <span className="font-mono font-semibold">{totalOil} т/сут</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Давление вых.</span>
                  <span className="font-mono">{30 + idx * 5} атм</span>
                </div>
              </div>

              {/* Arrow 3 */}
              <FlowArrow />

              {/* РВС */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2.5 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Activity className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-xs font-semibold text-primary">{rbs}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Нефтепровод</span>
                  <span className="text-[10px] text-muted-foreground leading-tight max-w-[100px] text-right">{pipe}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Отгрузка</span>
                  <span className="font-mono font-semibold">{Math.round(totalOil * 0.97)} т/сут</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer totals */}
        <div className="border-t bg-muted/60 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-6">
            <span className="text-muted-foreground text-xs">ИТОГО за {year}:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              <Droplets className="h-3.5 w-3.5 inline mr-1" />
              {grandTotalOil} т/сут нефти
            </span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              <Waves className="h-3.5 w-3.5 inline mr-1" />
              {grandTotalInj} м³/сут закачки
            </span>
          </div>
          <span className="text-xs text-muted-foreground italic">
            * показатели скважин — модельные данные для визуализации
          </span>
        </div>
      </div>

      {/* Formation detail cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {byFormation.map(({ formation, fWells, prodWells, injWells, totalOil, avgWC }) => {
          const avgDepth = fWells.length
            ? Math.round(fWells.reduce((s, w) => s + (w.depthCurrent ?? 0), 0) / fWells.length)
            : 0;
          return (
            <div key={formation} className="border rounded-xl bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">{formation}</h4>
                <Badge variant="outline" className="text-[10px]">{fWells.length} скв.</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-muted/60 rounded-lg p-2.5">
                  <p className="text-muted-foreground mb-0.5">Дебит нефти</p>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400">{totalOil} т/сут</p>
                </div>
                <div className="bg-muted/60 rounded-lg p-2.5">
                  <p className="text-muted-foreground mb-0.5">Ср. обводн.</p>
                  <p className="font-bold">{avgWC}%</p>
                </div>
                <div className="bg-muted/60 rounded-lg p-2.5">
                  <p className="text-muted-foreground mb-0.5">Ср. глубина</p>
                  <p className="font-bold">{avgDepth} м</p>
                </div>
                <div className="bg-muted/60 rounded-lg p-2.5">
                  <p className="text-muted-foreground mb-0.5">Тип скважин</p>
                  <p className="font-bold">{prodWells.length}д / {injWells.length}н</p>
                </div>
              </div>
              {/* Mini well list */}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5">Добывающие</p>
                <div className="flex flex-wrap gap-1">
                  {prodWells.map((w) => {
                    const m = getWellMetrics(w);
                    return (
                      <div
                        key={w.id}
                        title={`Дебит: ${m.oilRate} т/сут | Обводн: ${m.watercut}% | Давл: ${m.pressure} атм | ${m.esp}`}
                        className="text-[10px] font-mono bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded px-2 py-0.5 cursor-default hover:ring-1 ring-emerald-400 transition-all"
                      >
                        {w.name}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex items-center justify-center">
      <svg width="24" height="16" viewBox="0 0 24 16" fill="none">
        <path d="M2 8 H18 M14 3 L20 8 L14 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary/50" />
      </svg>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
interface IntegratedModelTabProps {
  fieldId: string;
  year: string;
}

export function IntegratedModelTab({ fieldId, year }: IntegratedModelTabProps) {
  const [wells, setWells] = useState<Well[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!fieldId) return;
    const controller = new AbortController();
    setLoading(true);
    const authHeader = getAuthHeader();
    fetch(`/api/wells?oil_field_id=${fieldId}`, {
      headers: authHeader ? { Authorization: authHeader } : {},
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => { setWells(Array.isArray(data) ? data : []); })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [fieldId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
        <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        Загрузка данных скважин...
      </div>
    );
  }

  if (!wells.length) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Нет данных по скважинам для выбранного месторождения
      </div>
    );
  }

  return (
    <Tabs defaultValue="wells-full">
      <TabsList className="flex flex-wrap h-auto gap-2">
        <TabsTrigger value="wells-full">Скважины (полные)</TabsTrigger>
        <TabsTrigger value="flows">Потоки (пласт→РВС)</TabsTrigger>
      </TabsList>
      <TabsContent value="wells-full" className="mt-4">
        <WellsFullView wells={wells} year={year} />
      </TabsContent>
      <TabsContent value="flows" className="mt-4">
        <FlowsView wells={wells} year={year} />
      </TabsContent>
    </Tabs>
  );
}

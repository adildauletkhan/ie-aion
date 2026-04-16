/**
 * ТО и ремонты — модуль управления техническим обслуживанием для КазТрансОйл
 * Вкладки: ППР | Состояние оборудования | Предиктивная модель | 3D Модель НПС
 */
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  Wrench, AlertTriangle, CheckCircle2, Clock, Activity,
  Thermometer, Gauge, Calendar, Box, TrendingUp, Shield,
  Plus, RotateCcw, ChevronRight, Info, Cpu, AlertCircle,
  CheckCheck, Timer, Play,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

type WOStatus = "planned" | "in_progress" | "completed" | "overdue";
type EqStatus = "normal" | "warning" | "critical";
type Urgency  = "emergency" | "critical" | "high" | "medium" | "low";

interface WorkOrder {
  id: string; station: string; equipment: string; type: string;
  priority: string; status: WOStatus; plannedDate: string;
  responsible: string; duration: string;
}
interface Equipment {
  id: string; station: string; name: string; type: string;
  health: number; vibration: number; temp: number; pressure: number;
  runtime: number; status: EqStatus; lastMaint: string; nextMaint: string;
}
interface Prediction {
  equipment: string; probability: number; daysToFailure: number;
  cause: string; confidence: number; action: string; urgency: Urgency;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const WORK_ORDERS: WorkOrder[] = [
  { id: "WO-2026-0341", station: "НПС Кенкияк",    equipment: "Насосный агрегат НА-2",         type: "ТО-2",        priority: "high",     status: "in_progress", plannedDate: "25.03.2026", responsible: "Иванов А.С.",   duration: "8 ч"  },
  { id: "WO-2026-0342", station: "НПС Атырау",     equipment: "Электродвигатель М-1",           type: "ТО-1",        priority: "medium",   status: "planned",     plannedDate: "28.03.2026", responsible: "Петров Д.К.",   duration: "4 ч"  },
  { id: "WO-2026-0343", station: "ГНПС Тенгиз",   equipment: "Регулирующий клапан КР-7",       type: "Замена",      priority: "critical", status: "overdue",     plannedDate: "20.03.2026", responsible: "Сейткали Б.",   duration: "6 ч"  },
  { id: "WO-2026-0344", station: "НПС Шымкент",   equipment: "Насосный агрегат НА-1",          type: "ТО-1",        priority: "medium",   status: "planned",     plannedDate: "31.03.2026", responsible: "Ахметов Р.",    duration: "4 ч"  },
  { id: "WO-2026-0345", station: "НПС Кенкияк",   equipment: "Фильтр-грязеуловитель ФГ-3",     type: "Очистка",     priority: "low",      status: "completed",   plannedDate: "18.03.2026", responsible: "Байжанов М.",   duration: "2 ч"  },
  { id: "WO-2026-0346", station: "НПС Петрофилд", equipment: "Насосный агрегат НА-3",          type: "ТО-2",        priority: "medium",   status: "planned",     plannedDate: "05.04.2026", responsible: "Иванов А.С.",   duration: "8 ч"  },
  { id: "WO-2026-0347", station: "ГНПС Тенгиз",   equipment: "Трубопровод Ду500, уч. 12–18",  type: "Диагностика", priority: "high",     status: "planned",     plannedDate: "10.04.2026", responsible: "Касымов Т.",    duration: "12 ч" },
  { id: "WO-2026-0348", station: "НПС Атырау",    equipment: "Насосный агрегат НА-1",          type: "Капитальный", priority: "high",     status: "in_progress", plannedDate: "22.03.2026", responsible: "Петров Д.К.",   duration: "48 ч" },
];

const EQUIPMENT_LIST: Equipment[] = [
  { id: "eq1", station: "НПС Кенкияк",    name: "Насос НА-1",     type: "Центробежный насос",    health: 92, vibration: 1.8, temp: 62, pressure: 6.2, runtime: 12450, status: "normal",   lastMaint: "10.01.2026", nextMaint: "10.07.2026" },
  { id: "eq2", station: "НПС Кенкияк",    name: "Насос НА-2",     type: "Центробежный насос",    health: 64, vibration: 3.2, temp: 78, pressure: 5.8, runtime: 18200, status: "warning",  lastMaint: "05.09.2025", nextMaint: "05.03.2026" },
  { id: "eq3", station: "НПС Кенкияк",    name: "Насос НА-3",     type: "Центробежный насос",    health: 88, vibration: 2.1, temp: 65, pressure: 6.0, runtime:  9800, status: "normal",   lastMaint: "15.02.2026", nextMaint: "15.08.2026" },
  { id: "eq4", station: "ГНПС Тенгиз",   name: "Насос НА-1",     type: "Магистральный насос",   health: 95, vibration: 1.5, temp: 58, pressure: 8.4, runtime:  7200, status: "normal",   lastMaint: "20.02.2026", nextMaint: "20.08.2026" },
  { id: "eq5", station: "ГНПС Тенгиз",   name: "Клапан КР-7",    type: "Регулирующий клапан",   health: 38, vibration: 0.0, temp: 48, pressure: 7.9, runtime: 42000, status: "critical", lastMaint: "01.06.2025", nextMaint: "01.12.2025" },
  { id: "eq6", station: "НПС Атырау",    name: "Насос НА-1",     type: "Центробежный насос",    health: 71, vibration: 2.6, temp: 71, pressure: 5.5, runtime: 15600, status: "warning",  lastMaint: "12.11.2025", nextMaint: "12.05.2026" },
  { id: "eq7", station: "НПС Атырау",    name: "Мотор М-1",      type: "Электродвигатель",      health: 83, vibration: 1.9, temp: 68, pressure: 0.0, runtime: 14200, status: "normal",   lastMaint: "12.11.2025", nextMaint: "12.05.2026" },
  { id: "eq8", station: "НПС Шымкент",  name: "Насос НА-1",     type: "Центробежный насос",    health: 90, vibration: 2.0, temp: 63, pressure: 5.9, runtime:  8100, status: "normal",   lastMaint: "25.01.2026", nextMaint: "25.07.2026" },
];

const PREDICTIONS: Prediction[] = [
  { equipment: "НА-2 Кенкияк",    probability: 73, daysToFailure: 18,  cause: "Износ подшипников",             confidence: 91, action: "Замена подшипников",                urgency: "critical"  },
  { equipment: "КР-7 Тенгиз",     probability: 88, daysToFailure:  5,  cause: "Эрозия седла клапана",          confidence: 95, action: "Замена клапана (СРОЧНО)",           urgency: "emergency" },
  { equipment: "НА-1 Атырау",     probability: 45, daysToFailure: 35,  cause: "Кавитация рабочего колеса",     confidence: 78, action: "Балансировка и обследование",        urgency: "high"      },
  { equipment: "М-1 Атырау",      probability: 28, daysToFailure: 60,  cause: "Перегрев обмоток статора",      confidence: 72, action: "Термодиагностика",                   urgency: "medium"    },
  { equipment: "НА-3 Петрофилд",  probability: 19, daysToFailure: 90,  cause: "Износ торцевых уплотнений",     confidence: 68, action: "Плановая проверка уплотнений",       urgency: "low"       },
];

const TREND_DATA = [
  { month: "Окт",           vibration: 1.8, temp: 64, health: 88 },
  { month: "Ноя",           vibration: 2.0, temp: 66, health: 85 },
  { month: "Дек",           vibration: 2.3, temp: 69, health: 80 },
  { month: "Янв",           vibration: 2.7, temp: 72, health: 74 },
  { month: "Фев",           vibration: 3.0, temp: 75, health: 68 },
  { month: "Мар",           vibration: 3.2, temp: 78, health: 64 },
  { month: "Апр (прогноз)", vibration: 3.8, temp: 84, health: 55 },
  { month: "Май (прогноз)", vibration: 4.5, temp: 91, health: 43 },
];

const MONTHLY_PPR = [
  { month: "Янв", planned: 12, done: 11, overdue: 1 },
  { month: "Фев", planned: 9,  done: 9,  overdue: 0 },
  { month: "Мар", planned: 14, done: 8,  overdue: 3 },
  { month: "Апр", planned: 11, done: 0,  overdue: 0 },
  { month: "Май", planned: 13, done: 0,  overdue: 0 },
  { month: "Июн", planned: 8,  done: 0,  overdue: 0 },
];

// ─── Isometric SVG Visualization ─────────────────────────────────────────────

// Tile dimensions & scene origin
const TW = 34; const TH = 17;
const OX = 430; const OY = 190;

function ip(x: number, y: number, z = 0): [number, number] {
  return [OX + (x - y) * TW / 2, OY + (x + y) * TH / 2 - z * TH];
}
function poly(pts: [number, number][]): string {
  return pts.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)},${py.toFixed(1)}`).join(" ") + " Z";
}

interface IsoBoxProps {
  x: number; y: number; z?: number; w: number; d: number; h: number;
  tc: string; rc: string; fc: string;
  sw?: string; onClick?: () => void; selected?: boolean; opacity?: number;
}
function IsoBox({ x, y, z = 0, w, d, h, tc, rc, fc, sw = "#0f172a", onClick, selected, opacity = 1 }: IsoBoxProps) {
  const topD = poly([ip(x,y,z+h),ip(x+w,y,z+h),ip(x+w,y+d,z+h),ip(x,y+d,z+h)]);
  const rgtD = poly([ip(x+w,y,z),ip(x+w,y+d,z),ip(x+w,y+d,z+h),ip(x+w,y,z+h)]);
  const frtD = poly([ip(x,y+d,z),ip(x+w,y+d,z),ip(x+w,y+d,z+h),ip(x,y+d,z+h)]);
  const s = sw === "none" ? {} : { stroke: sw, strokeWidth: 0.5 };
  return (
    <g onClick={onClick} style={{ cursor: onClick ? "pointer" : "default" }} opacity={opacity}>
      <path d={frtD} fill={fc} {...s} />
      <path d={rgtD} fill={rc} {...s} />
      <path d={topD} fill={tc} {...s} />
      {selected && <>
        <path d={frtD} fill="none" stroke="#3b82f6" strokeWidth={2} />
        <path d={rgtD} fill="none" stroke="#3b82f6" strokeWidth={2} />
        <path d={topD} fill="none" stroke="#3b82f6" strokeWidth={2} />
      </>}
    </g>
  );
}

function StatusDot({ x, y, z, color }: { x: number; y: number; z: number; color: string }) {
  const [px, py] = ip(x, y, z);
  return (
    <g>
      <circle cx={px} cy={py} r={5} fill={color} opacity={0.25}>
        <animate attributeName="r" values="5;9;5" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx={px} cy={py} r={5} fill={color} />
    </g>
  );
}

interface IsoPumpProps {
  x: number; y: number; status: EqStatus;
  label: string; selected: boolean; onClick: () => void;
}
function IsoPump({ x, y, status, label, selected, onClick }: IsoPumpProps) {
  const C = {
    normal:   { tc: "#10b981", rc: "#065f46", fc: "#064e3b", dot: "#22c55e" },
    warning:  { tc: "#f59e0b", rc: "#b45309", fc: "#92400e", dot: "#fbbf24" },
    critical: { tc: "#ef4444", rc: "#b91c1c", fc: "#991b1b", dot: "#f87171" },
  }[status];
  const [lx, ly] = ip(x + 1, y + 2, 3.6);
  return (
    <g>
      {/* Baseplate */}
      <IsoBox x={x} y={y} z={0.3} w={2} d={4} h={0.12} tc="#374151" rc="#1e293b" fc="#1f2937" />
      {/* Pump casing */}
      <IsoBox x={x+0.3} y={y+0.1} z={0.42} w={1.4} d={1.7} h={1.3}
        tc={C.tc} rc={C.rc} fc={C.fc} onClick={onClick} selected={selected} />
      {/* Coupling */}
      <IsoBox x={x+0.65} y={y+1.8} z={0.55} w={0.7} d={0.5} h={0.5} tc="#64748b" rc="#475569" fc="#334155" />
      {/* Motor */}
      <IsoBox x={x+0.2} y={y+2.2} z={0.42} w={1.6} d={1.7} h={1.6}
        tc={C.tc} rc={C.rc} fc={C.fc} onClick={onClick} selected={selected} />
      {/* Motor fan end */}
      <IsoBox x={x+0.4} y={y+3.9} z={0.6} w={1.2} d={0.3} h={1.2} tc="#475569" rc="#334155" fc="#1e293b" />
      {/* Status dot */}
      <StatusDot x={x+1} y={y+2} z={2.6} color={C.dot} />
      {selected && (
        <text x={lx} y={ly - 6} textAnchor="middle" fill="#f1f5f9" fontSize={9}
          paintOrder="stroke" stroke="#060d1a" strokeWidth={3} style={{ pointerEvents: "none" }}>
          {label}
        </text>
      )}
    </g>
  );
}

function IsometricPumpStation({
  selectedId, onSelect,
}: { selectedId: string | null; onSelect: (id: string | null) => void }) {
  const pumps: { id: string; label: string; x: number; y: number; status: EqStatus }[] = [
    { id: "pump_na1", label: "НА-1 · 92% · Норма",    x: 1,   y: 0.3, status: "normal"  },
    { id: "pump_na2", label: "НА-2 · 64% · Внимание", x: 5,   y: 0.3, status: "warning" },
    { id: "pump_na3", label: "НА-3 · 88% · Норма",    x: 9,   y: 0.3, status: "normal"  },
  ];

  const lineB = (x1: number,y1: number,x2: number,y2: number) => {
    const [ax,ay]=ip(x1,y1,0), [bx,by]=ip(x2,y2,0);
    return <line x1={ax} y1={ay} x2={bx} y2={by} stroke="#1e293b" strokeWidth={0.6}/>;
  };

  return (
    <svg viewBox="0 0 880 520" style={{ width:"100%", height:"100%" }} className="select-none">
      <rect width={880} height={520} fill="#060d1a" />

      {/* Ground grid */}
      {[-4,-2,0,2,4,6,8,10,12,14].map(gx => lineB(gx,-3,gx,11))}
      {[-3,-1,1,3,5,7,9,11].map(gy => lineB(-4,gy,14,gy))}

      {/* Storage tank */}
      <IsoBox x={-6} y={1}   z={0}  w={3}   d={3}   h={7}   tc="#1e3a5f" rc="#1e40af" fc="#1d4ed8" />
      <IsoBox x={-5.5} y={1.5} z={7} w={2}  d={2}   h={1.5} tc="#2563eb" rc="#1e40af" fc="#1d4ed8" />
      {(() => { const [ax,ay]=ip(-3,3,0),[bx,by]=ip(-3,3,6.5);
        return <line x1={ax} y1={ay} x2={bx} y2={by} stroke="#3b82f6" strokeWidth={2.5}/>;})()}
      {(() => { const [lx,ly]=ip(-4.5,2.5,9);
        return <text x={lx} y={ly} textAnchor="middle" fill="#60a5fa" fontSize={8} opacity={0.7}>Резервуар</text>;})()}

      {/* Inlet manifold (back side) */}
      <IsoBox x={0} y={-0.9} z={1.1} w={13} d={0.9} h={0.5} tc="#64748b" rc="#475569" fc="#334155" />
      {[1.5,5,8.5].map(fx=><IsoBox key={fx} x={fx+0.2} y={-0.9} z={1.1} w={0.6} d={0.45} h={0.65} tc="#94a3b8" rc="#64748b" fc="#475569"/>)}
      {[1.5,5,8.5].map(fx=>{const[rx,ry]=ip(fx+0.5,-0.9,0);return<line key={`ri${fx}`} x1={rx} y1={ry} x2={rx} y2={ry+22} stroke="#475569" strokeWidth={4}/>;
      })}

      {/* Pump hall floor */}
      <IsoBox x={0} y={0} z={0} w={13} d={5} h={0.22} tc="#1e293b" rc="#111827" fc="#0f172a" />
      {/* Hall back wall */}
      <IsoBox x={0} y={0} z={0} w={13} d={0.3} h={4} tc="#2d3748" rc="#1e293b" fc="#1e293b" opacity={0.35} />
      {/* Left column */}
      <IsoBox x={0} y={0} z={0} w={0.3} d={5} h={4.2} tc="#374151" rc="#1e293b" fc="#2d3748" />
      {/* Right column */}
      <IsoBox x={12.7} y={0} z={0} w={0.3} d={5} h={4.2} tc="#374151" rc="#374151" fc="#2d3748" />
      {/* Roof slab */}
      <IsoBox x={0} y={0} z={4.2} w={13} d={5} h={0.3} tc="#111827" rc="#0a0f1e" fc="#111827" opacity={0.75} />
      {/* Trusses */}
      {[2,5.5,9].map(tx=><IsoBox key={tx} x={tx} y={0} z={3.9} w={0.2} d={5} h={0.25} tc="#1e293b" rc="#0f172a" fc="#1e293b"/>)}

      {/* Pumps (back to front = reverse x order for correct occlusion) */}
      {[...pumps].reverse().map(p=>(
        <IsoPump key={p.id} x={p.x} y={p.y} status={p.status} label={p.label}
          selected={selectedId===p.id} onClick={()=>onSelect(selectedId===p.id?null:p.id)}/>
      ))}

      {/* Outlet manifold (front side) */}
      <IsoBox x={0} y={5.1} z={1.1} w={13} d={0.9} h={0.5} tc="#64748b" rc="#475569" fc="#334155" />
      {[1.5,5,8.5].map(fx=><IsoBox key={fx} x={fx+0.2} y={5.1} z={1.1} w={0.6} d={0.45} h={0.65} tc="#94a3b8" rc="#64748b" fc="#475569"/>)}
      {[1.5,5,8.5].map(fx=>{const[rx,ry]=ip(fx+0.5,6,0);return<line key={`ro${fx}`} x1={rx} y1={ry} x2={rx} y2={ry+22} stroke="#475569" strokeWidth={4}/>;
      })}

      {/* Control room */}
      <IsoBox x={14} y={1} z={0} w={4} d={4} h={3.2} tc="#374151" rc="#4b5563" fc="#374151" />
      <IsoBox x={14} y={2} z={1.5} w={4} d={0.1} h={0.7} tc="#0ea5e9" rc="#0284c7" fc="#0369a1" opacity={0.8} />
      <IsoBox x={14} y={3} z={1.5} w={4} d={0.1} h={0.7} tc="#0ea5e9" rc="#0284c7" fc="#0369a1" opacity={0.8} />
      <IsoBox x={13.8} y={0.8} z={3.2} w={4.4} d={4.4} h={0.2} tc="#1f2937" rc="#111827" fc="#1f2937" />
      {(() => { const [lx,ly]=ip(16,3,3.8);
        return <text x={lx} y={ly} textAnchor="middle" fill="#94a3b8" fontSize={8} opacity={0.7}>ЦПУ</text>;})()}

      {/* Hall label */}
      {(() => { const [lx,ly]=ip(5,7,0.5);
        return <text x={lx} y={ly} textAnchor="middle" fill="#475569" fontSize={8}>НПС Кенкияк · Насосный зал</text>;})()}

      {/* Legend */}
      <g transform="translate(12, 460)">
        {[["#22c55e","Норма"],["#fbbf24","Внимание"],["#f87171","Критично"]].map(([c,l],i)=>(
          <g key={l} transform={`translate(${i*90},0)`}>
            <circle cx={6} cy={6} r={5} fill={c as string}/>
            <text x={16} y={10} fill="#94a3b8" fontSize={9}>{l}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

// ─── TAB 1: ППР ──────────────────────────────────────────────────────────────

const STATUS_CFG: Record<WOStatus, { label: string; color: string; icon: React.ElementType }> = {
  planned:     { label: "Запланировано",    color: "bg-blue-500/15 text-blue-400",   icon: Calendar    },
  in_progress: { label: "В работе",         color: "bg-amber-500/15 text-amber-400", icon: Play        },
  completed:   { label: "Выполнено",        color: "bg-green-500/15 text-green-400", icon: CheckCheck  },
  overdue:     { label: "Просрочено",       color: "bg-red-500/15 text-red-400",     icon: AlertCircle },
};

function PPRTab() {
  const [filterStatus, setFilterStatus] = useState<WOStatus | "all">("all");
  const [filterStation, setFilterStation] = useState("all");
  const stations = ["all", ...Array.from(new Set(WORK_ORDERS.map(w => w.station)))];

  const filtered = WORK_ORDERS.filter(w =>
    (filterStatus === "all" || w.status === filterStatus) &&
    (filterStation === "all" || w.station === filterStation)
  );

  const stats = {
    total: WORK_ORDERS.length,
    overdue: WORK_ORDERS.filter(w => w.status === "overdue").length,
    inProgress: WORK_ORDERS.filter(w => w.status === "in_progress").length,
    completed: WORK_ORDERS.filter(w => w.status === "completed").length,
  };

  const priorityBadge = (p: string) => ({
    critical: "bg-red-500/15 text-red-400",
    high:     "bg-orange-500/15 text-orange-400",
    medium:   "bg-yellow-500/15 text-yellow-400",
    low:      "bg-slate-500/15 text-slate-400",
  }[p] ?? "");

  return (
    <div className="p-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Всего нарядов",  value: stats.total,      icon: Wrench,       color: "text-blue-400"  },
          { label: "Просрочено",     value: stats.overdue,    icon: AlertCircle,  color: "text-red-400"   },
          { label: "В работе",       value: stats.inProgress, icon: Activity,     color: "text-amber-400" },
          { label: "Выполнено (март)",value: stats.completed, icon: CheckCheck,   color: "text-green-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-lg border bg-card p-4 flex items-center gap-3">
            <div className="rounded-md bg-muted p-2">
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm font-semibold mb-4">Выполнение ППР 2026 по месяцам</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={MONTHLY_PPR} barSize={20}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 6, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="planned" name="План"      fill="#3b82f6" radius={[3, 3, 0, 0]} />
            <Bar dataKey="done"    name="Факт"      fill="#22c55e" radius={[3, 3, 0, 0]} />
            <Bar dataKey="overdue" name="Просрочено" fill="#ef4444" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Filters + Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b">
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            value={filterStation}
            onChange={e => setFilterStation(e.target.value)}
          >
            {stations.map(s => (
              <option key={s} value={s}>{s === "all" ? "Все станции" : s}</option>
            ))}
          </select>
          <div className="flex gap-1 flex-wrap">
            {(["all", "planned", "in_progress", "overdue", "completed"] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                  filterStatus === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-input hover:bg-muted"
                }`}
              >
                {s === "all" ? "Все" : STATUS_CFG[s].label}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            className="ml-auto gap-1"
            onClick={() => toast.success("Наряд создан и отправлен в SAP PM")}
          >
            <Plus className="h-3.5 w-3.5" /> Создать наряд
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                {["№ наряда", "Станция", "Оборудование", "Тип", "Приоритет", "Дата", "Исполнитель", "Длит.", "Статус"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((wo, i) => {
                const cfg = STATUS_CFG[wo.status];
                const Icon = cfg.icon;
                return (
                  <tr key={wo.id} className={`border-b hover:bg-muted/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{wo.id}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{wo.station}</td>
                    <td className="px-4 py-2.5">{wo.equipment}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{wo.type}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityBadge(wo.priority)}`}>
                        {wo.priority === "critical" ? "Критич." : wo.priority === "high" ? "Высокий" : wo.priority === "medium" ? "Средний" : "Низкий"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{wo.plannedDate}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{wo.responsible}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{wo.duration}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                        <Icon className="h-3 w-3" /> {cfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── TAB 2: Состояние оборудования ───────────────────────────────────────────

function EquipmentStatusTab() {
  const [selectedEq, setSelectedEq] = useState<Equipment | null>(null);
  const healthy  = EQUIPMENT_LIST.filter(e => e.status === "normal").length;
  const warning  = EQUIPMENT_LIST.filter(e => e.status === "warning").length;
  const critical = EQUIPMENT_LIST.filter(e => e.status === "critical").length;

  const statusStyle: Record<EqStatus, string> = {
    normal:   "border-green-500/30 bg-green-500/5",
    warning:  "border-amber-500/40 bg-amber-500/5",
    critical: "border-red-500/50 bg-red-500/8 animate-pulse",
  };
  const statusDot: Record<EqStatus, string> = {
    normal:   "bg-green-400",
    warning:  "bg-amber-400",
    critical: "bg-red-500",
  };
  const statusLabel: Record<EqStatus, string> = {
    normal:   "Норма",
    warning:  "Внимание",
    critical: "Критично",
  };

  return (
    <div className="p-6 space-y-6">
      {/* Overview */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "В норме",    value: healthy,  color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
          { label: "Внимание",   value: warning,  color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
          { label: "Критично",   value: critical, color: "text-red-400",   bg: "bg-red-500/10 border-red-500/20"   },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`rounded-lg border p-5 text-center ${bg}`}>
            <p className={`text-4xl font-bold ${color}`}>{value}</p>
            <p className="text-sm text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Equipment grid */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {EQUIPMENT_LIST.map(eq => (
            <div
              key={eq.id}
              className={`rounded-lg border p-4 cursor-pointer transition-all hover:shadow-md ${statusStyle[eq.status]} ${selectedEq?.id === eq.id ? "ring-2 ring-primary" : ""}`}
              onClick={() => setSelectedEq(selectedEq?.id === eq.id ? null : eq)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${statusDot[eq.status]}`} />
                    <span className="font-semibold text-sm">{eq.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{eq.station} · {eq.type}</p>
                </div>
                <span className="text-2xl font-bold">{eq.health}<span className="text-sm text-muted-foreground">%</span></span>
              </div>
              <Progress value={eq.health} className="h-1.5 mb-3" />
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <div>
                  <p className={`font-semibold ${eq.vibration > 2.8 ? "text-red-400" : eq.vibration > 2.2 ? "text-amber-400" : "text-foreground"}`}>
                    {eq.vibration} <span className="font-normal">мм/с</span>
                  </p>
                  <p>Вибрация</p>
                </div>
                <div>
                  <p className={`font-semibold ${eq.temp > 75 ? "text-red-400" : eq.temp > 68 ? "text-amber-400" : "text-foreground"}`}>
                    {eq.temp}°<span className="font-normal">C</span>
                  </p>
                  <p>Темп.</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground">{eq.runtime.toLocaleString()} <span className="font-normal">ч</span></p>
                  <p>Наработка</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Detail panel */}
        <div className="rounded-lg border bg-card p-4">
          {selectedEq ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${statusDot[selectedEq.status]}`} />
                <h3 className="font-semibold">{selectedEq.name}</h3>
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                  selectedEq.status === "critical" ? "bg-red-500/15 text-red-400" :
                  selectedEq.status === "warning"  ? "bg-amber-500/15 text-amber-400" :
                  "bg-green-500/15 text-green-400"
                }`}>{statusLabel[selectedEq.status]}</span>
              </div>
              <div className="space-y-2 text-sm">
                {[
                  { label: "Станция",       value: selectedEq.station       },
                  { label: "Тип",           value: selectedEq.type          },
                  { label: "Индекс здоровья", value: `${selectedEq.health}%` },
                  { label: "Вибрация",      value: `${selectedEq.vibration} мм/с (норма < 2.8)` },
                  { label: "Температура",   value: `${selectedEq.temp}°C`   },
                  { label: "Давление",      value: selectedEq.pressure > 0 ? `${selectedEq.pressure} МПа` : "—" },
                  { label: "Наработка",     value: `${selectedEq.runtime.toLocaleString()} ч` },
                  { label: "Последнее ТО",  value: selectedEq.lastMaint     },
                  { label: "Следующее ТО",  value: selectedEq.nextMaint     },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium text-right">{value}</span>
                  </div>
                ))}
              </div>
              <Button
                className="w-full mt-2 gap-2" size="sm"
                onClick={() => toast.success(`Наряд на ТО создан для ${selectedEq.name}`)}
              >
                <Plus className="h-3.5 w-3.5" /> Создать наряд-задание
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center text-muted-foreground gap-3">
              <Info className="h-8 w-8 opacity-30" />
              <p className="text-sm">Выберите оборудование<br />для просмотра деталей</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TAB 3: Предиктивная модель ───────────────────────────────────────────────

const URGENCY_CFG: Record<Urgency, { label: string; color: string }> = {
  emergency: { label: "ЭКСТРЕННО",   color: "bg-red-600/20 text-red-400 border border-red-500/30" },
  critical:  { label: "Критично",    color: "bg-red-500/15 text-red-400"  },
  high:      { label: "Высокий",     color: "bg-orange-500/15 text-orange-400" },
  medium:    { label: "Средний",     color: "bg-yellow-500/15 text-yellow-400" },
  low:       { label: "Низкий",      color: "bg-slate-500/15 text-slate-400" },
};

function PredictiveTab() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-semibold text-lg">Предиктивная аналитика отказов</h2>
          <p className="text-sm text-muted-foreground">ML-модель на основе данных SCADA, вибродиагностики и термографии</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground border rounded-full px-3 py-1.5">
          <Cpu className="h-3.5 w-3.5 text-primary" />
          Модель v3.1 · Точность 91% · Обновлено 22.03.2026
        </div>
      </div>

      {/* Trend chart */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold">Деградация НА-2 Кенкияк (прогноз до отказа: ~18 дней)</p>
          <Badge variant="outline" className="text-red-400 border-red-500/30 text-xs">Критично</Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Тренды: вибрация (мм/с), температура (°C), индекс здоровья (%)</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={TREND_DATA}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 6, fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine x="Апр (прогноз)" stroke="#f59e0b" strokeDasharray="4 3" label={{ value: "прогноз", fill: "#f59e0b", fontSize: 10 }} />
            <Line type="monotone" dataKey="vibration" name="Вибрация мм/с" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="health"    name="Здоровье %"   stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 3" />
            <Line type="monotone" dataKey="temp"      name="Темп. °C"     stroke="#60a5fa" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Predictions table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Прогнозы отказов — топ 5 рисков</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                {["Оборудование", "Вероятность", "Дней до отказа", "Причина", "Точность ML", "Действие", "Приоритет"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PREDICTIONS.map((p, i) => {
                const cfg = URGENCY_CFG[p.urgency];
                return (
                  <tr key={i} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{p.equipment}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-muted rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${p.probability > 70 ? "bg-red-500" : p.probability > 40 ? "bg-amber-500" : "bg-blue-500"}`}
                            style={{ width: `${p.probability}%` }}
                          />
                        </div>
                        <span className="font-semibold">{p.probability}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${p.daysToFailure <= 7 ? "text-red-400" : p.daysToFailure <= 21 ? "text-amber-400" : "text-foreground"}`}>
                        {p.daysToFailure}
                      </span>
                      <span className="text-muted-foreground text-xs"> дн.</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{p.cause}</td>
                    <td className="px-4 py-3 text-center">{p.confidence}%</td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm" variant="outline" className="h-7 text-xs gap-1"
                        onClick={() => toast.success(`Задача создана: ${p.action}`)}
                      >
                        <ChevronRight className="h-3 w-3" /> {p.action}
                      </Button>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ML data sources */}
      <div className="flex flex-wrap gap-2">
        {["SCADA ОАО КТО", "Вибродиагностика ION", "ИК-термография", "SAP PM история", "Паспорта оборудования", "Стандарты ИСО 13374"].map(s => (
          <span key={s} className="text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1">{s}</span>
        ))}
      </div>
    </div>
  );
}

// ─── TAB 4: 3D Модель ─────────────────────────────────────────────────────────

const PUMP_DETAILS: Record<string, { title: string; data: { k: string; v: string }[] }> = {
  pump_na1: {
    title: "Насос НА-1 · НПС Кенкияк",
    data: [
      { k: "Статус",        v: "В работе — Норма" },
      { k: "Тип",           v: "Центробежный НМ 10000-210" },
      { k: "Производит.",   v: "10 000 м³/ч" },
      { k: "Давление",      v: "6.2 МПа" },
      { k: "Вибрация",      v: "1.8 мм/с ✓" },
      { k: "Температура",   v: "62°C ✓" },
      { k: "Наработка",     v: "12 450 ч" },
      { k: "Индекс здоровья", v: "92%" },
      { k: "След. ТО",      v: "10.07.2026" },
    ],
  },
  pump_na2: {
    title: "Насос НА-2 · НПС Кенкияк",
    data: [
      { k: "Статус",        v: "⚠️ Внимание — Износ подшипников" },
      { k: "Тип",           v: "Центробежный НМ 10000-210" },
      { k: "Производит.",   v: "9 700 м³/ч (снижение)" },
      { k: "Давление",      v: "5.8 МПа" },
      { k: "Вибрация",      v: "3.2 мм/с ⚠ (норма < 2.8)" },
      { k: "Температура",   v: "78°C ⚠" },
      { k: "Наработка",     v: "18 200 ч" },
      { k: "Индекс здоровья", v: "64%" },
      { k: "Прогноз отказа", v: "~18 дней (ML 91%)" },
    ],
  },
  pump_na3: {
    title: "Насос НА-3 · НПС Кенкияк",
    data: [
      { k: "Статус",        v: "В работе — Норма" },
      { k: "Тип",           v: "Центробежный НМ 10000-210" },
      { k: "Производит.",   v: "10 000 м³/ч" },
      { k: "Давление",      v: "6.0 МПа" },
      { k: "Вибрация",      v: "2.1 мм/с ✓" },
      { k: "Температура",   v: "65°C ✓" },
      { k: "Наработка",     v: "9 800 ч" },
      { k: "Индекс здоровья", v: "88%" },
      { k: "След. ТО",      v: "15.08.2026" },
    ],
  },
};


function Model3DTab() {
  const [selected, setSelected] = useState<string | null>(null);
  const detail = selected ? PUMP_DETAILS[selected] : null;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex flex-1 min-h-0">
        {/* Left legend */}
        <div className="w-52 shrink-0 border-r p-4 space-y-4 overflow-y-auto">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">НПС Кенкияк</p>
            <p className="text-xs text-muted-foreground">Кликните на агрегат для просмотра параметров</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Статусы</p>
            {[
              { dot: "bg-green-400", label: "Норма" },
              { dot: "bg-amber-400", label: "Внимание" },
              { dot: "bg-red-500",   label: "Критично" },
            ].map(({ dot, label }) => (
              <div key={label} className="flex items-center gap-2 text-xs">
                <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                {label}
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Состав НПС</p>
            {["3 × Насос НМ 10000", "Коллектор входной", "Коллектор выходной", "Ёмкость для нефти", "Диспетчерский блок"].map(s => (
              <p key={s} className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />{s}
              </p>
            ))}
          </div>
          <div className="text-xs text-muted-foreground border rounded-md p-2.5 space-y-1">
            <p className="font-medium text-foreground">Подсказка</p>
            <p>Кликните на насос</p>
            <p>для просмотра данных</p>
          </div>
        </div>

        {/* Isometric SVG scene */}
        <div className="flex-1 min-w-0 relative bg-[#060d1a]" style={{ minHeight: 480 }}>
          <IsometricPumpStation selectedId={selected} onSelect={setSelected} />
          <div className="absolute top-3 left-3 flex items-center gap-2 text-xs text-white/50 bg-black/40 rounded-md px-3 py-1.5 pointer-events-none">
            <Box className="h-3.5 w-3.5" /> Изометрическая модель НПС Кенкияк · КазТрансОйл
          </div>
        </div>

        {/* Right info panel */}
        <div className="w-64 shrink-0 border-l p-4 overflow-y-auto">
          {detail ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm leading-tight">{detail.title}</h3>
              <div className="space-y-2">
                {detail.data.map(({ k, v }) => (
                  <div key={k} className="text-xs space-y-0.5">
                    <p className="text-muted-foreground">{k}</p>
                    <p className="font-medium">{v}</p>
                  </div>
                ))}
              </div>
              <Button
                className="w-full mt-2 gap-2" size="sm"
                onClick={() => toast.success(`Наряд создан для ${detail.title.split(" · ")[0]}`)}
              >
                <Wrench className="h-3.5 w-3.5" /> Создать наряд
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center text-muted-foreground gap-3">
              <Box className="h-8 w-8 opacity-25" />
              <p className="text-xs">Нажмите на насосный<br />агрегат в 3D модели</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MaintenancePage() {
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b bg-background shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">ТО и ремонты</h1>
        <p className="text-sm text-muted-foreground mt-1">
          ППР, диагностика и предиктивное обслуживание оборудования КазТрансОйл
        </p>
      </div>

      <Tabs defaultValue="ppr" className="flex flex-col flex-1 min-h-0">
        <div className="px-6 border-b bg-background shrink-0">
          <TabsList className="h-auto p-0 bg-transparent gap-0 rounded-none">
            {[
              { id: "ppr",        icon: Calendar,   label: "ППР"                          },
              { id: "equipment",  icon: Gauge,       label: "Состояние оборудования"       },
              { id: "predictive", icon: TrendingUp,  label: "Предиктивная модель"          },
              { id: "model3d",    icon: Box,         label: "3D Модель НПС"                },
            ].map(({ id, icon: Icon, label }) => (
              <TabsTrigger
                key={id} value={id}
                className="flex items-center gap-2 px-4 py-3 text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent hover:text-foreground transition-colors"
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="ppr"        className="flex-1 overflow-auto m-0 p-0"><PPRTab /></TabsContent>
        <TabsContent value="equipment"  className="flex-1 overflow-auto m-0 p-0"><EquipmentStatusTab /></TabsContent>
        <TabsContent value="predictive" className="flex-1 overflow-auto m-0 p-0"><PredictiveTab /></TabsContent>
        <TabsContent value="model3d"    className="flex-1 min-h-0 m-0 p-0 flex flex-col"><Model3DTab /></TabsContent>
      </Tabs>
    </div>
  );
}

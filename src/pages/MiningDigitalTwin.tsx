import { useState, useEffect } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Activity, Wind, Thermometer, Droplets, Zap, Truck, AlertTriangle, CheckCircle2, RefreshCw, Radio } from 'lucide-react'
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'

/* ══ Mock Data ═══════════════════════════════════════════════════════════════ */

interface Sensor {
  id: string
  name: string
  value: number
  unit: string
  threshold: number
  status: 'ok' | 'warn' | 'crit'
  horizon: string
  trend: 'up' | 'down' | 'stable'
}

const SENSORS: Sensor[] = [
  { id: 'temp_220', name: 'Температура воздуха', value: 24.3, unit: '°C', threshold: 28, status: 'ok', horizon: 'Гор. −220', trend: 'stable' },
  { id: 'temp_260', name: 'Температура воздуха', value: 26.8, unit: '°C', threshold: 28, status: 'ok', horizon: 'Гор. −260', trend: 'up' },
  { id: 'temp_300', name: 'Температура воздуха', value: 29.1, unit: '°C', threshold: 28, status: 'warn', horizon: 'Гор. −300', trend: 'up' },
  { id: 'temp_340', name: 'Температура воздуха', value: 31.4, unit: '°C', threshold: 28, status: 'crit', horizon: 'Гор. −340', trend: 'up' },
  { id: 'co_220',  name: 'CO (оксид углерода)',  value: 8.2,  unit: 'ppm', threshold: 20, status: 'ok',   horizon: 'Гор. −220', trend: 'stable' },
  { id: 'co_260',  name: 'CO (оксид углерода)',  value: 14.7, unit: 'ppm', threshold: 20, status: 'ok',   horizon: 'Гор. −260', trend: 'up' },
  { id: 'co_300',  name: 'CO (оксид углерода)',  value: 22.3, unit: 'ppm', threshold: 20, status: 'warn', horizon: 'Гор. −300', trend: 'up' },
  { id: 'air_220', name: 'Скорость воздуха',     value: 3.4,  unit: 'м/с', threshold: 1.5, status: 'ok', horizon: 'Гор. −220', trend: 'stable' },
  { id: 'air_260', name: 'Скорость воздуха',     value: 2.8,  unit: 'м/с', threshold: 1.5, status: 'ok', horizon: 'Гор. −260', trend: 'down' },
  { id: 'air_300', name: 'Скорость воздуха',     value: 1.2,  unit: 'м/с', threshold: 1.5, status: 'warn', horizon: 'Гор. −300', trend: 'down' },
  { id: 'h2o_220', name: 'Водоприток',           value: 12.4, unit: 'м³/ч', threshold: 30, status: 'ok', horizon: 'Гор. −220', trend: 'stable' },
  { id: 'h2o_340', name: 'Водоприток',           value: 34.8, unit: 'м³/ч', threshold: 30, status: 'crit', horizon: 'Гор. −340', trend: 'up' },
]

const EQUIPMENT: { id: string; type: string; name: string; horizon: string; status: string; load_pct: number; fuel_pct?: number; hours_today: number }[] = [
  { id: 'BD-12', type: 'Буровой станок',    name: 'Atlas Copco Boomer M2C', horizon: 'Гор. −260', status: 'active',  load_pct: 87, hours_today: 14.2 },
  { id: 'BD-14', type: 'Буровой станок',    name: 'Atlas Copco Boomer M2C', horizon: 'Гор. −300', status: 'active',  load_pct: 72, hours_today: 11.8 },
  { id: 'BD-09', type: 'Буровой станок',    name: 'Sandvik DD421',          horizon: 'Гор. −220', status: 'repair',  load_pct: 0,  hours_today: 0 },
  { id: 'PG-33', type: 'Погрузчик ПДМ',    name: 'Sandvik LH621',          horizon: 'Гор. −300', status: 'active',  load_pct: 91, fuel_pct: 62, hours_today: 16.1 },
  { id: 'PG-31', type: 'Погрузчик ПДМ',    name: 'Sandvik LH621',          horizon: 'Гор. −260', status: 'active',  load_pct: 68, fuel_pct: 38, hours_today: 12.4 },
  { id: 'SM-07', type: 'Самосвал подз.',    name: 'Caterpillar AD55B',      horizon: 'Гор. −340', status: 'active',  load_pct: 84, fuel_pct: 51, hours_today: 17.3 },
  { id: 'SM-05', type: 'Самосвал подз.',    name: 'Caterpillar AD55B',      horizon: 'Гор. −300', status: 'idle',    load_pct: 0,  fuel_pct: 88, hours_today: 4.2 },
  { id: 'KM-02', type: 'Комбайн очистной', name: 'Sandvik MH620',          horizon: 'Гор. −260', status: 'active',  load_pct: 93, hours_today: 15.7 },
  { id: 'VO-01', type: 'Вентилятор гл.',   name: 'ВОД-50',                 horizon: 'Поверхность', status: 'active', load_pct: 78, hours_today: 24 },
  { id: 'VO-02', type: 'Вентилятор гл.',   name: 'ВОД-50',                 horizon: 'Поверхность', status: 'standby', load_pct: 0, hours_today: 0 },
]

const generateTimeSeries = (base: number, noise: number, pts = 24) =>
  Array.from({ length: pts }, (_, i) => ({
    t: `${String(i).padStart(2,'0')}:00`,
    v: +(base + (Math.random() - 0.5) * noise * 2).toFixed(1),
  }))

const TEMP_SERIES: Record<string, ReturnType<typeof generateTimeSeries>> = {
  '−220': generateTimeSeries(24, 0.8),
  '−260': generateTimeSeries(27, 1.2),
  '−300': generateTimeSeries(29, 1.5),
  '−340': generateTimeSeries(31.5, 1.8),
}

const ORE_FLOW = Array.from({ length: 12 }, (_, i) => ({
  month: ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'][i],
  plan: [820,760,830,810,850,800,780,840,820,860,810,790][i],
  fact: [811,774,827,798,843,792,0,0,0,0,0,0][i] || null,
}))

const HORIZONS = [
  { name: 'Гор. −180', status: 'depleted',    ore_mt: 87.6, capacity_pct: 100, personnel: 0 },
  { name: 'Гор. −220', status: 'partial',     ore_mt: 132.1, capacity_pct: 60, personnel: 38 },
  { name: 'Гор. −260', status: 'active',      ore_mt: 148.9, capacity_pct: 85, personnel: 124 },
  { name: 'Гор. −300', status: 'active',      ore_mt: 156.4, capacity_pct: 90, personnel: 142 },
  { name: 'Гор. −340', status: 'active',      ore_mt: 138.7, capacity_pct: 75, personnel: 96 },
  { name: 'Гор. −380', status: 'development', ore_mt: 112.3, capacity_pct: 30, personnel: 12 },
]

const HORIZON_COLORS: Record<string, string> = {
  depleted:    '#6b7280',
  partial:     '#f59e0b',
  active:      '#10b981',
  development: '#6366f1',
}

const STATUS_META_EQ: Record<string, { label: string; color: string }> = {
  active:  { label: 'В работе', color: '#10b981' },
  idle:    { label: 'Простой',  color: '#f59e0b' },
  repair:  { label: 'Ремонт',   color: '#ef4444' },
  standby: { label: 'Резерв',   color: '#6366f1' },
}

const TOOLTIP_STYLE = {
  fontSize: 11,
  background: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 6,
  color: 'hsl(var(--foreground))',
}

/* ══ Component ═══════════════════════════════════════════════════════════════ */

export default function MiningDigitalTwin() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [tick, setTick] = useState(0)
  const [selectedHorizon, setSelectedHorizon] = useState('−300')

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 4000)
    return () => clearInterval(id)
  }, [])

  const critSensors = SENSORS.filter((s) => s.status === 'crit').length
  const warnSensors = SENSORS.filter((s) => s.status === 'warn').length
  const activeEq = EQUIPMENT.filter((e) => e.status === 'active').length
  const totalPersonnel = HORIZONS.reduce((a, b) => a + b.personnel, 0)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Цифровой двойник — Жезказган</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Рудник «Жезказган-Центральный» · Онлайн-мониторинг · обновление каждые 4 с
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>LIVE</span>
          <RefreshCw className="h-3 w-3 animate-spin" style={{ animationDuration: '4s' }} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Activity,     label: 'Техника в работе',   value: `${activeEq} / ${EQUIPMENT.length}`, color: '#10b981' },
          { icon: AlertTriangle,label: 'Алармов',            value: `${critSensors} крит. / ${warnSensors} пред.`, color: critSensors > 0 ? '#ef4444' : '#f59e0b' },
          { icon: Truck,        label: 'Руда сегодня',       value: `${(811 + tick % 40).toLocaleString('ru-RU')} т', color: '#f59e0b'` },
          { icon: Radio,        label: 'Персонал под землёй',value: `${totalPersonnel} чел.`, color: '#6366f1' },
        ].map((k, i) => {
          const Icon = k.icon
          return (
            <Card key={i} className="border" style={{ borderColor: `${k.color}20` }}>
              <CardContent className="p-3.5 flex items-center gap-3">
                <div className="rounded-lg p-2" style={{ background: `${k.color}15` }}>
                  <Icon className="h-4 w-4" style={{ color: k.color }} />
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground">{k.label}</p>
                  <p className="text-sm font-bold" style={{ color: k.color }}>
                    {k.label === 'Руда сегодня' ? `${(811 + tick % 40).toLocaleString('ru-RU')} т` : k.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Tabs defaultValue="crosssection">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="crosssection">Разрез рудника</TabsTrigger>
          <TabsTrigger value="sensors">Датчики</TabsTrigger>
          <TabsTrigger value="equipment">Техника</TabsTrigger>
          <TabsTrigger value="production">Добыча</TabsTrigger>
        </TabsList>

        {/* ── Cross-section ─────────────────────────────────────────────── */}
        <TabsContent value="crosssection" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* SVG Mine cross-section */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Схема шахтных горизонтов</CardTitle>
              </CardHeader>
              <CardContent>
                <svg viewBox="0 0 700 440" className="w-full" style={{ maxHeight: 360 }}>
                  <rect width="700" height="440" fill={isDark ? 'rgba(10,15,28,0.5)' : '#f8fafc'} rx="8" />

                  {/* Surface */}
                  <rect x="0" y="0" width="700" height="40"
                    fill={isDark ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.12)'} />
                  <text x="12" y="26" fontSize="11" fill={isDark ? '#86efac' : '#16a34a'} fontWeight="600">Поверхность</text>

                  {/* Shaft */}
                  <rect x="320" y="40" width="24" height="400"
                    fill={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
                    stroke={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'} strokeWidth="1" />
                  <text x="290" y="36" fontSize="9" fill={isDark ? 'rgba(255,255,255,0.5)' : '#6b7280'}>Ствол</text>

                  {/* Shaft equipment: hoist rope */}
                  <line x1="332" y1="0" x2="332" y2="440" stroke={isDark ? 'rgba(255,255,255,0.2)' : '#cbd5e1'} strokeDasharray="4 4" strokeWidth="1" />

                  {/* Skip marker (animated by tick) */}
                  <rect x="321" y={40 + ((tick * 12) % 380)} width="22" height="12" rx="2"
                    fill="#f59e0b" opacity="0.9" />

                  {/* Horizon levels */}
                  {HORIZONS.map((h, i) => {
                    const y = 40 + (i + 1) * 58
                    const color = HORIZON_COLORS[h.status]
                    return (
                      <g key={i}>
                        {/* Tunnel */}
                        <rect x="40" y={y - 12} width="280" height="22" rx="4"
                          fill={color + '20'} stroke={color} strokeWidth="1.2" />
                        {/* Right tunnel */}
                        <rect x="344" y={y - 12} width="280" height="22" rx="4"
                          fill={color + '20'} stroke={color} strokeWidth="1.2" />
                        {/* Horizon label */}
                        <text x="48" y={y + 4} fontSize="10" fontWeight="600" fill={color}>{h.name}</text>
                        {/* Status */}
                        <text x="150" y={y + 4} fontSize="9" fill={isDark ? 'rgba(255,255,255,0.5)' : '#6b7280'}>
                          {h.personnel > 0 ? `${h.personnel} чел.` : '—'}
                        </text>
                        {/* Right label */}
                        <text x="350" y={y + 4} fontSize="9" fill={isDark ? 'rgba(255,255,255,0.5)' : '#6b7280'}>
                          {h.ore_mt.toFixed(0)} млн т
                        </text>
                        <text x="490" y={y + 4} fontSize="9" fill={color}>
                          {h.capacity_pct}% заг.
                        </text>
                        {/* Capacity bar */}
                        <rect x="550" y={y - 4} width="80" height="6" rx="3"
                          fill={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'} />
                        <rect x="550" y={y - 4} width={h.capacity_pct * 0.8} height="6" rx="3" fill={color} />
                      </g>
                    )
                  })}

                  {/* Ventilation arrows */}
                  <text x="660" y="80" fontSize="9" fill={isDark ? 'rgba(255,255,255,0.4)' : '#9ca3af'} textAnchor="middle">↑ свеж.</text>
                  <text x="660" y="420" fontSize="9" fill={isDark ? 'rgba(255,255,255,0.4)' : '#9ca3af'} textAnchor="middle">↓ отр.</text>
                  {[80,140,200,260,320,380].map((y, i) => (
                    <text key={i} x="660" y={y+20} fontSize="8" fill={isDark ? 'rgba(255,255,255,0.15)' : '#d1d5db'} textAnchor="middle">|</text>
                  ))}
                </svg>
              </CardContent>
            </Card>

            {/* Horizon selector + detail */}
            <div className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Горизонт</p>
              {HORIZONS.filter(h => h.status !== 'depleted').map((h) => {
                const hKey = h.name.replace('Гор. ', '')
                const color = HORIZON_COLORS[h.status]
                return (
                  <button key={h.name} onClick={() => setSelectedHorizon(hKey)}
                    className="w-full flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-all"
                    style={{
                      borderColor: selectedHorizon === hKey ? color : 'var(--border)',
                      background:  selectedHorizon === hKey ? `${color}12` : 'transparent',
                    }}>
                    <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                    <div className="flex-1">
                      <p className="text-[11px] font-semibold">{h.name}</p>
                      <p className="text-[10px] text-muted-foreground">{h.personnel} чел. · {h.capacity_pct}% заг.</p>
                    </div>
                  </button>
                )
              })}

              {/* Sensors on selected horizon */}
              {SENSORS.filter(s => s.horizon === `Гор. ${selectedHorizon}`).length > 0 && (
                <div className="border rounded-lg p-3 space-y-2">
                  <p className="text-[10px] font-semibold text-muted-foreground">Датчики · Гор. {selectedHorizon}</p>
                  {SENSORS.filter(s => s.horizon === `Гор. ${selectedHorizon}`).map((s) => {
                    const c = s.status === 'ok' ? '#10b981' : s.status === 'warn' ? '#f59e0b' : '#ef4444'
                    return (
                      <div key={s.id} className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">{s.name}</span>
                        <span className="font-mono font-semibold" style={{ color: c }}>{s.value} {s.unit}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Sensors ──────────────────────────────────────────────────────── */}
        <TabsContent value="sensors" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Temperature trend */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-red-400" />
                  Температура по горизонтам, °C
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={TEMP_SERIES['−300']}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'} />
                    <XAxis dataKey="t" tick={{ fontSize: 9 }} interval={3} />
                    <YAxis domain={[22, 35]} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Line type="monotone" data={TEMP_SERIES['−220']} dataKey="v" name="−220 м" stroke="#10b981" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" data={TEMP_SERIES['−260']} dataKey="v" name="−260 м" stroke="#6366f1" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" data={TEMP_SERIES['−300']} dataKey="v" name="−300 м" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" data={TEMP_SERIES['−340']} dataKey="v" name="−340 м" stroke="#ef4444" strokeWidth={1.5} dot={false} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Sensor table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-400" />
                  Сводка датчиков
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-y-auto max-h-[220px]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-background">
                      <tr className="border-b text-muted-foreground text-[9px] uppercase">
                        <th className="py-1.5 text-left">Датчик</th>
                        <th className="py-1.5 text-center">Гор.</th>
                        <th className="py-1.5 text-right">Значение</th>
                        <th className="py-1.5 text-center">Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SENSORS.map((s) => {
                        const c = s.status === 'ok' ? '#10b981' : s.status === 'warn' ? '#f59e0b' : '#ef4444'
                        const StatusIcon = s.status === 'ok' ? CheckCircle2 : AlertTriangle
                        return (
                          <tr key={s.id} className="border-b hover:bg-muted/30 transition-colors"
                            style={{ background: s.status === 'crit' ? 'rgba(239,68,68,0.05)' : s.status === 'warn' ? 'rgba(245,158,11,0.04)' : 'transparent' }}>
                            <td className="py-1.5 text-[10px]">{s.name}</td>
                            <td className="py-1.5 text-center font-mono text-[9px] text-muted-foreground">{s.horizon.replace('Гор. ', '')}</td>
                            <td className="py-1.5 text-right font-mono font-semibold text-[10px]" style={{ color: c }}>
                              {s.value} {s.unit}
                            </td>
                            <td className="py-1.5 text-center">
                              <StatusIcon className="h-3 w-3 mx-auto" style={{ color: c }} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ventilation */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wind className="h-4 w-4 text-cyan-400" />
                Вентиляция — скорость воздуха по горизонтам (м/с)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {SENSORS.filter(s => s.name === 'Скорость воздуха').map((s) => {
                  const ok = s.value >= s.threshold
                  const color = ok ? '#10b981' : '#ef4444'
                  const pct = Math.round((s.value / 5) * 100)
                  return (
                    <div key={s.id} className="flex items-center gap-3">
                      <span className="w-20 text-[11px] font-mono shrink-0">{s.horizon.replace('Гор. ', '')}</span>
                      <div className="flex-1">
                        <Progress value={pct} className="h-2" />
                      </div>
                      <span className="w-16 text-right font-mono text-[11px]" style={{ color }}>
                        {s.value} м/с
                      </span>
                      <Badge variant="outline" className="text-[9px] w-20 text-center shrink-0"
                        style={{ borderColor: `${color}40`, color }}>
                        {ok ? 'Норма' : 'Ниже нормы'}
                      </Badge>
                    </div>
                  )
                })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-3">
                Нормативная скорость: ≥ 1.5 м/с · ПБ 05-614-03 Правила безопасности в рудниках
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Equipment ────────────────────────────────────────────────────── */}
        <TabsContent value="equipment" className="space-y-4 pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(['active','idle','repair','standby'] as const).map((s) => {
              const cnt = EQUIPMENT.filter(e => e.status === s).length
              const meta = STATUS_META_EQ[s]
              return (
                <Card key={s} style={{ borderColor: `${meta.color}20` }}>
                  <CardContent className="p-3.5">
                    <p className="text-[9px] text-muted-foreground mb-1">{meta.label}</p>
                    <p className="text-xl font-bold" style={{ color: meta.color }}>{cnt}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground text-[10px] uppercase tracking-wider">
                  <th className="py-2 px-3 text-left">ID</th>
                  <th className="py-2 px-3 text-left">Тип</th>
                  <th className="py-2 px-3 text-left">Модель</th>
                  <th className="py-2 px-3 text-center">Горизонт</th>
                  <th className="py-2 px-3 text-center">Статус</th>
                  <th className="py-2 px-3 text-right">Загрузка</th>
                  <th className="py-2 px-3 text-right">Топливо</th>
                  <th className="py-2 px-3 text-right">Наработка сег.</th>
                </tr>
              </thead>
              <tbody>
                {EQUIPMENT.map((eq, i) => {
                  const meta = STATUS_META_EQ[eq.status]
                  return (
                    <tr key={i} className="border-b hover:bg-muted/30 transition-colors"
                      style={{ background: eq.status === 'repair' ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
                      <td className="py-2.5 px-3 font-mono font-semibold">{eq.id}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{eq.type}</td>
                      <td className="py-2.5 px-3">{eq.name}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-[10px]">{eq.horizon}</td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge variant="outline" className="text-[9px]"
                          style={{ borderColor: `${meta.color}40`, color: meta.color }}>
                          {meta.label}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {eq.load_pct > 0 ? (
                          <div className="flex items-center gap-2 justify-end">
                            <div className="w-12 h-1.5 rounded bg-muted overflow-hidden">
                              <div className="h-full rounded" style={{ width: `${eq.load_pct}%`, background: eq.load_pct > 80 ? '#10b981' : '#f59e0b' }} />
                            </div>
                            <span>{eq.load_pct}%</span>
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {eq.fuel_pct != null ? (
                          <span style={{ color: eq.fuel_pct < 40 ? '#ef4444' : eq.fuel_pct < 60 ? '#f59e0b' : '#10b981' }}>
                            {eq.fuel_pct}%
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {eq.hours_today > 0 ? `${eq.hours_today.toFixed(1)} ч` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ── Production ──────────────────────────────────────────────────── */}
        <TabsContent value="production" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Добыча руды — план vs факт (тыс. т/мес.)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={ORE_FLOW}>
                    <defs>
                      <linearGradient id="gplan" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gfact" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'} />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis domain={[700, 900]} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="plan" name="План" stroke="#6366f1" fill="url(#gplan)" strokeWidth={1.5} />
                    <Area type="monotone" dataKey="fact" name="Факт" stroke="#10b981" fill="url(#gfact)" strokeWidth={2} connectNulls={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground">Показатели смены (14:00–22:00)</p>
              {[
                { label: 'Вскрышные работы',    fact: '1 240 т', plan: '1 200 т', ok: true },
                { label: 'Добыча руды',          fact: '2 820 т', plan: '2 900 т', ok: false },
                { label: 'Транспортировка',      fact: '2 780 т', plan: '2 820 т', ok: false },
                { label: 'Переработка ОФ',       fact: '2 650 т', plan: '2 600 т', ok: true },
                { label: 'Отвальные хвосты',     fact: '2 320 т', plan: '2 350 т', ok: false },
              ].map((r, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border p-2.5">
                  <span className="text-[11px]">{r.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground">пл. {r.plan}</span>
                    <span className="text-[11px] font-semibold">{r.fact}</span>
                    {r.ok
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      : <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

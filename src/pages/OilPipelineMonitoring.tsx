import { useState, useEffect } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Droplets, Gauge, Activity, AlertTriangle, CheckCircle2, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine } from 'recharts'

/* ══ Data ════════════════════════════════════════════════════════════════════ */

const NPS_LIST = [
  { id: 'NPS-1',  name: 'НПС Атырау-1',       pipeline: 'А-С',  pressure_in: 0.4, pressure_out: 6.2, flow: 72.1, pump_load: 88, fuel_kwh_t: 4.2, status: 'ok' },
  { id: 'NPS-3',  name: 'НПС Кенкияк',         pipeline: 'А-С',  pressure_in: 4.8, pressure_out: 6.1, flow: 15.4, pump_load: 76, fuel_kwh_t: 4.5, status: 'ok' },
  { id: 'NPS-7',  name: 'НПС Актобе',           pipeline: 'А-С',  pressure_in: 4.6, pressure_out: 6.0, flow: 15.4, pump_load: 81, fuel_kwh_t: 4.3, status: 'ok' },
  { id: 'NPS-12', name: 'НПС Тенгиз-вход',      pipeline: 'КТК',  pressure_in: 0.6, pressure_out: 6.5, flow: 104.4, pump_load: 92, fuel_kwh_t: 3.9, status: 'ok' },
  { id: 'NPS-15', name: 'НПС Атасу',             pipeline: 'КККМ', pressure_in: 1.2, pressure_out: 5.8, flow: 34.5, pump_load: 73, fuel_kwh_t: 4.6, status: 'ok' },
  { id: 'NPS-18', name: 'НПС Павлодар',          pipeline: 'ПШ',   pressure_in: 1.8, pressure_out: 5.5, flow: 22.7, pump_load: 65, fuel_kwh_t: 5.1, status: 'maint' },
  { id: 'NPS-22', name: 'НПС Шымкент (вх.)',      pipeline: 'ПШ',   pressure_in: 3.2, pressure_out: 5.3, flow: 22.7, pump_load: 63, fuel_kwh_t: 5.3, status: 'maint' },
  { id: 'NPS-8',  name: 'НПС Узень',              pipeline: 'УА',   pressure_in: 0.5, pressure_out: 5.2, flow: 15.9, pump_load: 71, fuel_kwh_t: 4.8, status: 'ok' },
]

const HOURLY_FLOW = Array.from({ length: 24 }, (_, i) => ({
  h: `${String(i).padStart(2, '0')}:00`,
  atyrau_samara: +(15.2 + Math.sin(i * 0.3) * 0.6 + Math.random() * 0.2).toFixed(2),
  ktk:           +(37.8 + Math.sin(i * 0.2 + 1) * 1.2 + Math.random() * 0.3).toFixed(2),
  kkkm:          +(12.3 + Math.sin(i * 0.25 + 2) * 0.4 + Math.random() * 0.2).toFixed(2),
}))

const PRESSURE_TREND = Array.from({ length: 24 }, (_, i) => ({
  h: `${String(i).padStart(2, '0')}:00`,
  nps1: +(6.2 + Math.sin(i * 0.4) * 0.15 + Math.random() * 0.05).toFixed(2),
  nps12: +(6.5 + Math.sin(i * 0.35 + 0.5) * 0.18 + Math.random() * 0.06).toFixed(2),
  nps15: +(5.8 + Math.sin(i * 0.3 + 1) * 0.12 + Math.random() * 0.04).toFixed(2),
}))

const MONTHLY_THROUGHPUT = [
  { month: 'Янв', fact: 6.2, plan: 6.4 }, { month: 'Фев', fact: 5.9, plan: 6.0 },
  { month: 'Мар', fact: 6.5, plan: 6.5 }, { month: 'Апр', fact: 6.4, plan: 6.4 },
  { month: 'Май', fact: 6.7, plan: 6.6 }, { month: 'Июн', fact: 6.8, plan: 6.6 },
  { month: 'Июл', fact: 6.9, plan: 6.8 }, { month: 'Авг', fact: 7.0, plan: 6.9 },
  { month: 'Сен', fact: null, plan: 6.9 }, { month: 'Окт', fact: null, plan: 7.0 },
  { month: 'Ноя', fact: null, plan: 7.0 }, { month: 'Дек', fact: null, plan: 7.1 },
]

const INCIDENTS = [
  { id: 'I-2024-012', date: '14.11.2024', severity: 'P3', pipeline: 'А-С',  type: 'Плановое ТО НПС-7', status: 'resolved', duration_h: 4.2 },
  { id: 'I-2024-011', date: '02.11.2024', severity: 'P2', pipeline: 'ПШ',   type: 'Отказ насосного агрегата НПС-18', status: 'monitoring', duration_h: 18.5 },
  { id: 'I-2024-010', date: '22.10.2024', severity: 'P3', pipeline: 'КККМ', type: 'Повышение давления свыше 6.2 МПа', status: 'resolved', duration_h: 1.1 },
  { id: 'I-2024-009', date: '08.10.2024', severity: 'P3', pipeline: 'А-С',  type: 'Замена торцевых уплотнений', status: 'resolved', duration_h: 6.0 },
  { id: 'I-2024-008', date: '30.09.2024', severity: 'P2', pipeline: 'УА',   type: 'Пропуск уплотнения задвижки', status: 'resolved', duration_h: 3.5 },
]

const SEV_META = { P1: { color: '#ef4444' }, P2: { color: '#f59e0b' }, P3: { color: '#6366f1' } }
const INC_STATUS_META = { resolved: { label: 'Устранён', color: '#10b981' }, monitoring: { label: 'Наблюдение', color: '#f59e0b' }, active: { label: 'Активный', color: '#ef4444' } }
const TOOLTIP_STYLE = { fontSize: 11, background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, color: 'hsl(var(--foreground))' }

/* ══ Component ═══════════════════════════════════════════════════════════════ */
export default function OilPipelineMonitoring() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [tick, setTick] = useState(0)
  useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 5000); return () => clearInterval(id) }, [])

  const totalFlow = NPS_LIST.filter(n => n.pipeline === 'А-С')[0].flow
  const avgPressure = (NPS_LIST.reduce((a, b) => a + b.pressure_out, 0) / NPS_LIST.length).toFixed(1)
  const activeNPS = NPS_LIST.filter(n => n.status === 'ok').length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Мониторинг нефтепроводов</h1>
          <p className="text-xs text-muted-foreground mt-0.5">АО «КазТрансОйл» · SCADA Schneider Electric · OSIsoft PI</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-amber-400">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span>LIVE</span>
          <RefreshCw className="h-3 w-3 animate-spin" style={{ animationDuration: '5s' }} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Droplets,   label: 'Суточная перекачка',  value: `${(222 + tick % 5).toLocaleString('ru-RU')} тыс. т`,  color: '#f59e0b' },
          { icon: Gauge,      label: 'Давление (средн.)',    value: `${avgPressure} МПа`,                                   color: '#6366f1' },
          { icon: Activity,   label: 'НПС в работе',        value: `${activeNPS} / ${NPS_LIST.length}`,                    color: '#10b981' },
          { icon: AlertTriangle, label: 'Инцидентов (акт.)', value: `${INCIDENTS.filter(i => i.status !== 'resolved').length}`, color: '#f97316' },
        ].map((k, i) => {
          const Icon = k.icon
          return (
            <Card key={i} style={{ borderColor: `${k.color}20` }}>
              <CardContent className="p-3.5 flex items-center gap-3">
                <div className="rounded-lg p-2" style={{ background: `${k.color}15` }}><Icon className="h-4 w-4" style={{ color: k.color }} /></div>
                <div><p className="text-[9px] text-muted-foreground">{k.label}</p><p className="text-sm font-bold" style={{ color: k.color }}>{k.value}</p></div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Tabs defaultValue="stations">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="stations">НПС — статус</TabsTrigger>
          <TabsTrigger value="flow">Расход нефти</TabsTrigger>
          <TabsTrigger value="pressure">Давление</TabsTrigger>
          <TabsTrigger value="incidents">Инциденты</TabsTrigger>
        </TabsList>

        {/* ── NPS Status ─────────────────────────────────────────────────── */}
        <TabsContent value="stations" className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground text-[10px] uppercase tracking-wider">
                  <th className="py-2 px-3 text-left">НПС</th>
                  <th className="py-2 px-3 text-center">Маршрут</th>
                  <th className="py-2 px-3 text-right">P вх., МПа</th>
                  <th className="py-2 px-3 text-right">P вых., МПа</th>
                  <th className="py-2 px-3 text-right">Расход, тыс. т/сут</th>
                  <th className="py-2 px-3 text-right">Загрузка насосов</th>
                  <th className="py-2 px-3 text-right">Уд. расход, кВт·ч/т</th>
                  <th className="py-2 px-3 text-center">Статус</th>
                </tr>
              </thead>
              <tbody>
                {NPS_LIST.map((s, i) => (
                  <tr key={i} className="border-b hover:bg-muted/30 transition-colors"
                    style={{ background: s.status === 'maint' ? 'rgba(249,115,22,0.04)' : 'transparent' }}>
                    <td className="py-2.5 px-3 font-semibold">{s.name}</td>
                    <td className="py-2.5 px-3 text-center"><Badge variant="outline" className="text-[9px]">{s.pipeline}</Badge></td>
                    <td className="py-2.5 px-3 text-right font-mono">{s.pressure_in}</td>
                    <td className="py-2.5 px-3 text-right font-mono" style={{ color: s.pressure_out > 6.0 ? '#10b981' : '#f59e0b' }}>{s.pressure_out}</td>
                    <td className="py-2.5 px-3 text-right">{s.flow}</td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <div className="w-10 h-1.5 rounded bg-muted overflow-hidden">
                          <div className="h-full rounded" style={{ width: `${s.pump_load}%`, background: s.pump_load > 85 ? '#10b981' : '#f59e0b' }} />
                        </div>
                        <span>{s.pump_load}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">{s.fuel_kwh_t}</td>
                    <td className="py-2.5 px-3 text-center">
                      {s.status === 'ok'
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-400 mx-auto" />
                        : <Badge variant="outline" className="text-[9px] border-orange-500/30 text-orange-400">ТО</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ── Flow ───────────────────────────────────────────────────────── */}
        <TabsContent value="flow" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Почасовой расход по маршрутам (млн т/год экв.)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={HOURLY_FLOW}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'} />
                    <XAxis dataKey="h" tick={{ fontSize: 9 }} interval={3} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="atyrau_samara" name="А-Самара" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="ktk"           name="КТК"       stroke="#ef4444" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="kkkm"          name="КККМ"      stroke="#6366f1" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Месячный план / факт перекачки (млн т)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={MONTHLY_THROUGHPUT}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'} />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis domain={[5, 7.5]} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="plan" name="План" fill="#6366f1" opacity={0.4} radius={[3,3,0,0]} />
                    <Bar dataKey="fact" name="Факт" fill="#f59e0b" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Pressure ───────────────────────────────────────────────────── */}
        <TabsContent value="pressure" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Gauge className="h-4 w-4 text-amber-500" /> Давление на выходе НПС, МПа — последние 24 ч
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={PRESSURE_TREND}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'} />
                  <XAxis dataKey="h" tick={{ fontSize: 9 }} interval={3} />
                  <YAxis domain={[5.4, 7.0]} tickFormatter={v => `${v} МПа`} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v.toFixed(2)} МПа`, '']} />
                  <ReferenceLine y={6.5} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Пред. давление 6.5 МПа', fontSize: 9, fill: '#ef4444' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="nps1"  name="НПС-1 Атырау"  stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="nps12" name="НПС-12 Тенгиз" stroke="#ef4444" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="nps15" name="НПС-15 Атасу"  stroke="#6366f1" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] text-muted-foreground">
            Рабочее давление МГ Казахстана: 6.0–6.5 МПа. Предельное допустимое давление (ПДД): 6.5 МПа (РД 153-39.4-113-01). Автоматическое стравливание при давлении {'>'} 6.6 МПа через предохранительные клапаны.
          </div>
        </TabsContent>

        {/* ── Incidents ──────────────────────────────────────────────────── */}
        <TabsContent value="incidents" className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground text-[10px] uppercase tracking-wider">
                  <th className="py-2 px-3 text-left">ID</th>
                  <th className="py-2 px-3 text-left">Дата</th>
                  <th className="py-2 px-3 text-center">Сев.</th>
                  <th className="py-2 px-3 text-center">Маршрут</th>
                  <th className="py-2 px-3 text-left">Тип</th>
                  <th className="py-2 px-3 text-right">Длит., ч</th>
                  <th className="py-2 px-3 text-center">Статус</th>
                </tr>
              </thead>
              <tbody>
                {INCIDENTS.map((inc, i) => {
                  const sm = INC_STATUS_META[inc.status as keyof typeof INC_STATUS_META]
                  const sev = SEV_META[inc.severity as keyof typeof SEV_META]
                  return (
                    <tr key={i} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[10px]">{inc.id}</td>
                      <td className="py-2.5 px-3">{inc.date}</td>
                      <td className="py-2.5 px-3 text-center"><Badge variant="outline" className="text-[9px]" style={{ borderColor: `${sev.color}40`, color: sev.color }}>{inc.severity}</Badge></td>
                      <td className="py-2.5 px-3 text-center"><Badge variant="outline" className="text-[9px]">{inc.pipeline}</Badge></td>
                      <td className="py-2.5 px-3">{inc.type}</td>
                      <td className="py-2.5 px-3 text-right">{inc.duration_h.toFixed(1)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge variant="outline" className="text-[9px]" style={{ borderColor: `${sm.color}40`, color: sm.color }}>{sm.label}</Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: 'Разливов нефти 2024', value: '0', color: '#10b981' },
              { label: 'Средн. время ликвидации', value: '6.7 ч', color: '#f59e0b' },
              { label: 'Плановые ТО (выполн.)', value: '14 / 18', color: '#6366f1' },
            ].map((s, i) => (
              <div key={i} className="rounded-lg border p-3 text-center" style={{ borderColor: `${s.color}20` }}>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

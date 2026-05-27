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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="stations">НПС — статус</TabsTrigger>
          <TabsTrigger value="flow">Расход нефти</TabsTrigger>
          <TabsTrigger value="pressure">Давление</TabsTrigger>
          <TabsTrigger value="incidents">Инциденты</TabsTrigger>
          <TabsTrigger value="map">Схема МТ</TabsTrigger>
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
        {/* ── Map tab ─────────────────────────────────────────────────────── */}
        <TabsContent value="map" className="pt-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-bold">Схема движения нефти по МТ КТО</h2>
              <p className="text-[10px] text-muted-foreground">Анимация отражает фактическое направление и интенсивность потоков</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
              {[
                { c: '#ef4444', l: 'КТК · 38 млн т' },
                { c: '#f59e0b', l: 'А-С · 15 млн т' },
                { c: '#f97316', l: 'АКА · 10 млн т' },
                { c: '#dc2626', l: 'КККМ · 12 млн т' },
                { c: '#6366f1', l: 'П-Ш · 8 млн т' },
                { c: '#8b5cf6', l: 'У-А · 4 млн т' },
                { c: '#6b7280', l: 'О-П (импорт)' },
              ].map(({ c, l }) => (
                <div key={l} className="flex items-center gap-1">
                  <span className="h-0.5 w-6 rounded-full inline-block" style={{ background: c }} />
                  <span>{l}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border overflow-hidden" style={{ background: isDark ? '#0b1120' : '#e8f0f8' }}>
          {/* ── GEOGRAPHIC MAP SVG ──
              Projection: x = (lon-36)/48*1340+30   lon range [36,84]
                          y = (56-lat)/16*460+15    lat range [40,56]
              Key anchors:
              Atyrau  (51.9,47.1) → 474,271   Aktobe  (57.2,50.3) → 622,179
              Atasu   (71.6,48.6) → 1024,228  Pavlodar(77.0,52.3) → 1175,121
              Almaty  (76.9,43.3) → 1171,380  Alashankou(82.6,45.4)→1331,320
          ── */}
          <svg viewBox="0 0 1400 500" style={{ width: '100%', height: 'auto', display: 'block' }}>
            <style>{`
              .f1 { animation: f1 2.0s linear infinite; }
              .f2 { animation: f2 2.5s linear infinite; }
              .f3 { animation: f3 3.0s linear infinite; }
              .f4 { animation: f4 2.2s linear infinite; }
              .f5 { animation: f5 3.5s linear infinite; }
              .f6 { animation: f6 4.0s linear infinite; }
              @keyframes f1 { from{stroke-dashoffset:30}to{stroke-dashoffset:0} }
              @keyframes f2 { from{stroke-dashoffset:30}to{stroke-dashoffset:0} }
              @keyframes f3 { from{stroke-dashoffset:30}to{stroke-dashoffset:0} }
              @keyframes f4 { from{stroke-dashoffset:30}to{stroke-dashoffset:0} }
              @keyframes f5 { from{stroke-dashoffset:30}to{stroke-dashoffset:0} }
              @keyframes f6 { from{stroke-dashoffset:30}to{stroke-dashoffset:0} }
              .pls { animation: pls 2s ease-in-out infinite; }
              @keyframes pls { 0%,100%{r:9;opacity:1}50%{r:13;opacity:0.6} }
            `}</style>

            {/* ── BACKGROUND ── */}
            <rect width={1400} height={500} fill={isDark ? '#07101e' : '#cfe4f2'} />

            {/* ── KAZAKHSTAN TERRITORY (filled polygon, plotted from real lat/lon) ──
                Projection: x=(lon-36)/48*1340+30  y=(56-lat)/16*460+15
                Border points (clockwise from NW): */}
            <polygon
              points="449,144 532,116 672,87 811,73 923,44 1063,44 1202,87 1314,144 1342,216 1342,331 1314,389 1230,418 1063,446 895,446 811,475 645,461 532,446 477,418 463,360 435,303 463,274 449,188"
              fill={isDark ? 'rgba(22,56,110,0.45)' : 'rgba(195,225,248,0.65)'}
              stroke={isDark ? 'rgba(100,160,255,0.55)' : 'rgba(60,120,200,0.55)'}
              strokeWidth={2}
            />

            {/* ── RUSSIA ZONE (above KZ border) ── */}
            <text x={55} y={38} fontSize={12} fill={isDark ? 'rgba(148,163,184,0.5)' : 'rgba(70,90,130,0.5)'}
              fontWeight={700} letterSpacing={3}>РОССИЯ</text>
            <text x={820} y={32} fontSize={12} fill={isDark ? 'rgba(148,163,184,0.5)' : 'rgba(70,90,130,0.5)'}
              fontWeight={700} letterSpacing={3}>РОССИЯ</text>
            <line x1={0} y1={44} x2={923} y2={44} stroke={isDark ? 'rgba(148,163,184,0.15)' : 'rgba(70,90,130,0.2)'} strokeWidth={1} strokeDasharray="5,4" />

            {/* ── CHINA ZONE (right of border) ── */}
            <text x={1348} y={270} fontSize={11} fill={isDark ? 'rgba(220,38,38,0.55)' : 'rgba(180,50,50,0.5)'}
              fontWeight={700} letterSpacing={2} transform="rotate(90,1348,270)">КИТАЙ</text>

            {/* ── CENTRAL ASIA (south of KZ border) ── */}
            <text x={680} y={492} textAnchor="middle" fontSize={10}
              fill={isDark ? 'rgba(148,163,184,0.28)' : 'rgba(80,100,130,0.35)'}
              fontWeight={700} letterSpacing={2}>ЦЕНТРАЛЬНАЯ АЗИЯ</text>

            {/* ── КАЗАХСТАН label (center of territory) ── */}
            <text x={840} y={248} textAnchor="middle" fontSize={16}
              fill={isDark ? 'rgba(100,160,255,0.18)' : 'rgba(40,100,200,0.14)'}
              fontWeight={900} letterSpacing={5}>КАЗАХСТАН</text>

            {/* ── CASPIAN SEA ── */}
            <ellipse cx={395} cy={405} rx={55} ry={108}
              fill={isDark ? 'rgba(37,99,235,0.18)' : 'rgba(59,130,246,0.22)'}
              stroke={isDark ? 'rgba(99,162,255,0.28)' : 'rgba(59,130,246,0.38)'} strokeWidth={1.5} />
            <text x={395} y={398} textAnchor="middle" fontSize={8}
              fill={isDark ? 'rgba(99,162,255,0.55)' : 'rgba(37,99,235,0.6)'}
              fontStyle="italic" fontWeight={700}>КАСПИЙСКОЕ</text>
            <text x={395} y={410} textAnchor="middle" fontSize={8}
              fill={isDark ? 'rgba(99,162,255,0.55)' : 'rgba(37,99,235,0.6)'}
              fontStyle="italic" fontWeight={700}>МОРЕ</text>

            {/* ══════════════════════════════════════════
                PIPELINES  (new geographic coordinates)
                x=(lon-36)/48*1340+30  y=(56-lat)/16*460+15
                ══════════════════════════════════════════ */}

            {/* КТК (~38 млн т/г): Тенгиз(519,300)→Атырау(474,271)→NW→Новороссийск(80,340) */}
            <polyline points="519,300 474,271 430,268 360,275 280,285 190,312 128,330 80,340"
              fill="none" stroke="#ef4444" strokeWidth={5.5} strokeOpacity={0.75}
              strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="519,300 474,271 430,268 360,275 280,285 190,312 128,330 80,340"
              fill="none" stroke="#ef4444" strokeWidth={3.5} strokeDasharray="12,22"
              className="f1" strokeLinecap="round" />

            {/* А-С (~15 млн т/г): Атырау(474,271)→Уральск(454,153)→Самара(426,95) */}
            <polyline points="474,271 464,215 454,153 439,122 426,95"
              fill="none" stroke="#f59e0b" strokeWidth={4} strokeOpacity={0.8}
              strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="474,271 464,215 454,153 439,122 426,95"
              fill="none" stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="10,22"
              className="f2" strokeLinecap="round" />

            {/* АКА (~10 млн т/г): Атырау→Актобе(622,179)→Кенкияк(689,225)→Кумколь(854,337)→Атасу(1024,228) */}
            <polyline points="474,271 550,238 622,179 700,202 762,270 854,337 942,282 1024,228"
              fill="none" stroke="#f97316" strokeWidth={4} strokeOpacity={0.75}
              strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="474,271 550,238 622,179 700,202 762,270 854,337 942,282 1024,228"
              fill="none" stroke="#f97316" strokeWidth={2.5} strokeDasharray="10,22"
              className="f3" strokeLinecap="round" />

            {/* КККМ (~12 млн т/г): Атасу(1024,228)→Алматы(1171,380)→Алашанькоу(1331,320)→Китай */}
            <polyline points="1024,228 1090,268 1171,380 1255,352 1331,320 1385,305"
              fill="none" stroke="#dc2626" strokeWidth={5} strokeOpacity={0.8}
              strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="1024,228 1090,268 1171,380 1255,352 1331,320 1385,305"
              fill="none" stroke="#dc2626" strokeWidth={3} strokeDasharray="12,22"
              className="f4" strokeLinecap="round" />

            {/* П-Ш (~8 млн т/г): Павлодар(1175,121)→Астана(1021,153)→Атасу(1024,228)→Кумколь(854,337)→Шымкент(966,409) */}
            <polyline points="1175,121 1095,138 1021,153 1024,228 942,282 854,337 908,373 966,409"
              fill="none" stroke="#6366f1" strokeWidth={4.5} strokeOpacity={0.75}
              strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="1175,121 1095,138 1021,153 1024,228 942,282 854,337 908,373 966,409"
              fill="none" stroke="#6366f1" strokeWidth={2.5} strokeDasharray="10,22"
              className="f5" strokeLinecap="round" />

            {/* О-П (импорт ~3 млн т/г): Омск(1074,44)→Павлодар(1175,121) */}
            <polyline points="1074,44 1122,82 1175,121"
              fill="none" stroke="#6b7280" strokeWidth={3} strokeOpacity={0.65}
              strokeDasharray="8,7" strokeLinecap="round" />

            {/* У-А (~4 млн т/г): Узень(500,380)→Актау(454,369) */}
            <polyline points="500,380 476,375 454,369"
              fill="none" stroke="#8b5cf6" strokeWidth={4} strokeOpacity={0.8}
              strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="500,380 476,375 454,369"
              fill="none" stroke="#8b5cf6" strokeWidth={2.5} strokeDasharray="10,22"
              className="f6" strokeLinecap="round" />

            {/* Актау→Батуми (морской маршрут, Каспий→Чёрное море) */}
            <polyline points="454,369 388,378 318,388 255,408 189,429"
              fill="none" stroke="#10b981" strokeWidth={2.5} strokeDasharray="7,6"
              strokeOpacity={0.75} strokeLinecap="round" />

            {/* ══════════════════════════════════════
                PIPELINE LABELS
                ══════════════════════════════════════ */}
            <text x={230} y={305} fontSize={9.5} fill="#ef4444" fontWeight={700} transform="rotate(-3,230,305)">КТК</text>
            <text x={455} y={210} fontSize={9} fill="#f59e0b" fontWeight={700} transform="rotate(-82,455,210)">А-С</text>
            <text x={636} y={207} fontSize={9} fill="#f97316" fontWeight={700} transform="rotate(-12,636,207)">АКА</text>
            <text x={1098} y={294} fontSize={9} fill="#dc2626" fontWeight={700} transform="rotate(-22,1098,294)">КККМ</text>
            <text x={960} y={305} fontSize={9} fill="#6366f1" fontWeight={700} transform="rotate(75,960,305)">П-Ш</text>
            <text x={1085} y={66} fontSize={8.5} fill="#6b7280">О-П (имп.)</text>
            <text x={478} y={368} fontSize={8.5} fill="#8b5cf6" fontWeight={700}>У-А</text>
            <text x={298} y={404} fontSize={8} fill="#10b981" transform="rotate(-8,298,404)">Море</text>

            {/* ══════════════════════════════════════
                CITY NODES
                ══════════════════════════════════════ */}
            {([
              [426,  95,  'САМАРА',           '#f59e0b', true ],
              [801,  95,  'КОСТАНАЙ',         '#94a3b8', false],
              [957,  47,  'ПЕТРОПАВЛОВСК',    '#94a3b8', false],
              [1074, 44,  'ОМСК',             '#6b7280', false],
              [454,  153, 'УРАЛЬСК',          '#f59e0b', true ],
              [622,  179, 'АКТОБЕ',           '#f97316', true ],
              [1021, 153, 'АСТАНА',           '#6366f1', true ],
              [1175, 121, 'ПАВЛОДАР',         '#6366f1', true ],
              [454,  369, 'АКТАУ',            '#8b5cf6', true ],
              [500,  380, 'УЗЕНЬ',            '#8b5cf6', false],
              [474,  271, 'АТЫРАУ',           '#ef4444', true ],
              [519,  300, 'ТЕНГИЗ',           '#ef4444', false],
              [689,  225, 'КЕНКИЯК',          '#f97316', false],
              [854,  337, 'КУМКОЛЬ',          '#f97316', true ],
              [862,  337, 'КЫЗЫЛОРДА',        '#6366f1', false],
              [1024, 228, 'АТАСУ',            '#dc2626', true ],
              [966,  409, 'ШЫМКЕНТ',          '#6366f1', true ],
              [1171, 380, 'АЛМАТЫ',           '#94a3b8', true ],
            ] as [number, number, string, string, boolean][]).map(([x, y, name, color, large]) => (
              <g key={name}>
                <circle cx={x} cy={y} r={large ? 5 : 3.5} fill={color} fillOpacity={0.9} />
                <text x={x} y={y - 9} textAnchor="middle"
                  fontSize={large ? 9.5 : 8} fill={color} fontWeight={large ? 600 : 400}>{name}</text>
              </g>
            ))}

            {/* ── KEY GNPS (pulsing rings) ── */}
            {([
              [474,  271, '#ef4444', 'gnps-atyrau'   ],
              [1024, 228, '#dc2626', 'gnps-atasu'    ],
              [1175, 121, '#6366f1', 'gnps-pavlodar' ],
              [622,  179, '#f97316', 'gnps-aktobe'   ],
            ] as [number, number, string, string][]).map(([cx, cy, c, key]) => (
              <g key={key}>
                <circle cx={cx} cy={cy} r={11} fill={c} fillOpacity={0.1} />
                <circle cx={cx} cy={cy} r={7}  fill={c} fillOpacity={0.22} className="pls" />
                <circle cx={cx} cy={cy} r={4.5} fill={c} />
                <circle cx={cx} cy={cy} r={2}   fill={isDark ? '#07101e' : '#fff'} />
              </g>
            ))}

            {/* ── TERMINAL BADGES ── */}
            <rect x={24} y={330} width={56} height={18} rx={4}
              fill="#ef4444" fillOpacity={0.22} stroke="#ef4444" strokeWidth={1} />
            <text x={52} y={342} textAnchor="middle" fontSize={7.5} fill="#ef4444" fontWeight={600}>Новороссийск</text>

            <rect x={155} y={420} width={46} height={18} rx={4}
              fill="#10b981" fillOpacity={0.22} stroke="#10b981" strokeWidth={1} />
            <text x={178} y={432} textAnchor="middle" fontSize={7.5} fill="#10b981" fontWeight={600}>Батуми</text>

            <rect x={1348} y={297} width={48} height={18} rx={4}
              fill="#dc2626" fillOpacity={0.2} stroke="#dc2626" strokeWidth={1} />
            <text x={1372} y={309} textAnchor="middle" fontSize={7.5} fill="#dc2626" fontWeight={600}>→ Китай</text>

            {/* ── SUMMARY BOX ── */}
            <rect x={1078} y={408} width={295} height={80} rx={10}
              fill={isDark ? 'rgba(7,16,30,0.93)' : 'rgba(255,255,255,0.93)'}
              stroke={isDark ? '#1e3a5f' : '#c8daf0'} strokeWidth={1.5} />
            <text x={1225} y={428} textAnchor="middle" fontSize={10}
              fill={isDark ? '#94a3b8' : '#64748b'} fontWeight={700}>Сводка КТО</text>
            {[
              ['Общая прокачка:', '80.7 млн т/год', '#f97316'],
              ['Экспорт:', '65.1 млн т/год', '#ef4444'],
              ['Внутр. + импорт:', '15.6 млн т/год', '#6366f1'],
            ].map(([label, val, color], i) => (
              <g key={label}>
                <text x={1090} y={446 + i * 15} fontSize={9}
                  fill={isDark ? '#94a3b8' : '#64748b'}>{label}</text>
                <text x={1363} y={446 + i * 15} textAnchor="end" fontSize={9}
                  fill={color} fontWeight={700}>{val}</text>
              </g>
            ))}
          </svg>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

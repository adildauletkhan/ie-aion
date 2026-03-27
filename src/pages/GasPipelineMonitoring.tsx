import { useState, useEffect } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Wind, Gauge, Activity, AlertTriangle, CheckCircle2, RefreshCw, Flame, Zap } from 'lucide-react'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine } from 'recharts'

/* ══ Data ════════════════════════════════════════════════════════════════════ */

const CS_LIST = [
  { id: 'КС-1',  name: 'КС Бейнеу',        pipeline: 'ББШ/CAC', p_in: 4.8, p_out: 5.6, flow: 42.3, load: 84, fuel_pct: 3.2, status: 'ok' },
  { id: 'КС-3',  name: 'КС Бозой',          pipeline: 'ББШ',     p_in: 4.6, p_out: 5.3, flow: 18.1, load: 65, fuel_pct: 3.8, status: 'ok' },
  { id: 'КС-7',  name: 'КС Кызылорда',      pipeline: 'КЗ-КНР',  p_in: 4.3, p_out: 5.2, flow: 35.2, load: 72, fuel_pct: 4.1, status: 'maint' },
  { id: 'КС-10', name: 'КС Актобе-Газ',     pipeline: 'CAC',     p_in: 4.9, p_out: 5.6, flow: 45.2, load: 78, fuel_pct: 3.5, status: 'ok' },
  { id: 'КС-14', name: 'КС Шымкент',        pipeline: 'ББШ/КЗ',  p_in: 4.5, p_out: 5.0, flow: 26.4, load: 80, fuel_pct: 4.2, status: 'ok' },
  { id: 'КС-17', name: 'КС Атасу-Газ',      pipeline: 'КЗ-КНР',  p_in: 4.7, p_out: 5.3, flow: 18.3, load: 68, fuel_pct: 3.9, status: 'ok' },
  { id: 'КС-21', name: 'КС Кокшетау (Сарыарка)', pipeline: 'Сарыарка', p_in: 0, p_out: 0, flow: 0, load: 0, fuel_pct: 0, status: 'build' },
  { id: 'КС-19', name: 'КС Балхаш',         pipeline: 'Domestic', p_in: 4.2, p_out: 4.8, flow: 12.1, load: 52, fuel_pct: 5.1, status: 'ok' },
]

const GAS_QUALITY = [
  { label: 'Метан CH₄', value: 98.1, norm: '>= 92%', ok: true },
  { label: 'Этан C₂H₆', value: 1.2, norm: '<= 4%', ok: true },
  { label: 'Пропан C₃H₈', value: 0.4, norm: '<= 1.5%', ok: true },
  { label: 'Азот N₂', value: 0.2, norm: '<= 3.5%', ok: true },
  { label: 'CO₂', value: 0.05, norm: '<= 0.5%', ok: true },
  { label: 'H₂S', value: 0.001, norm: '<= 0.007%', ok: true },
  { label: 'Теплота сгорания', value: 36.8, norm: '>= 32.5 МДж/м³', ok: true },
  { label: 'Точка росы', value: -18, norm: '<= -5°C', ok: true },
]

const HOURLY_PRESSURE = Array.from({ length: 24 }, (_, i) => ({
  h: `${String(i).padStart(2, '0')}:00`,
  cac:  +(5.6 + Math.sin(i * 0.4) * 0.15 + Math.random() * 0.04).toFixed(2),
  bbs:  +(5.2 + Math.sin(i * 0.3 + 1) * 0.12 + Math.random() * 0.03).toFixed(2),
  china: +(5.4 + Math.sin(i * 0.35 + 2) * 0.1 + Math.random() * 0.03).toFixed(2),
}))

const MONTHLY_TRANSIT = [
  { month: 'Янв', transit: 3.9, domestic: 1.7 }, { month: 'Фев', transit: 3.6, domestic: 1.6 },
  { month: 'Мар', transit: 3.8, domestic: 1.5 }, { month: 'Апр', transit: 3.7, domestic: 1.4 },
  { month: 'Май', transit: 3.6, domestic: 1.3 }, { month: 'Июн', transit: 3.5, domestic: 1.2 },
  { month: 'Июл', transit: 3.7, domestic: 1.2 }, { month: 'Авг', transit: 3.8, domestic: 1.3 },
  { month: 'Сен', transit: null, domestic: null }, { month: 'Окт', transit: null, domestic: null },
  { month: 'Ноя', transit: null, domestic: null }, { month: 'Дек', transit: null, domestic: null },
]

const DISPATCH_LOG = [
  { time: '07:42', event: 'КС Кызылорда: агрегат ГПА-16 выведен в плановый ТО', severity: 'info' },
  { time: '09:15', event: 'Граница КНР: расход увеличен до 95% по заявке CNPC', severity: 'info' },
  { time: '10:30', event: 'CAC-3: автоматическое снижение давления — 5.62 МПа', severity: 'warn' },
  { time: '11:05', event: 'ББШ: восстановление нормального режима давления', severity: 'ok' },
  { time: '13:22', event: 'КС Актобе: смена режима работы ГПА — экономичный', severity: 'info' },
  { time: '14:48', event: 'Граница РФ (CAC): суточный объём транзита выполнен на 93%', severity: 'info' },
  { time: '15:30', event: 'Плановый обход ГРС Алматы — замечаний нет', severity: 'ok' },
  { time: '16:10', event: 'КС Шымкент: показатели качества газа в норме', severity: 'ok' },
]

const SEV_LOG_META = {
  info: { color: '#6366f1', dot: 'bg-indigo-400' },
  warn: { color: '#f59e0b', dot: 'bg-amber-400' },
  ok:   { color: '#10b981', dot: 'bg-emerald-400' },
}

const TOOLTIP_STYLE = { fontSize: 11, background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, color: 'hsl(var(--foreground))' }

/* ══ Component ═══════════════════════════════════════════════════════════════ */
export default function GasPipelineMonitoring() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [tick, setTick] = useState(0)
  useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 5000); return () => clearInterval(id) }, [])

  const activeCS = CS_LIST.filter(c => c.status === 'ok').length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Мониторинг газопроводов</h1>
          <p className="text-xs text-muted-foreground mt-0.5">QazaqGas · ИЦА · SCADA Emerson · SIMONE газодинамика</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-teal-400">
          <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
          <span>LIVE</span>
          <RefreshCw className="h-3 w-3 animate-spin" style={{ animationDuration: '5s' }} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Wind,   label: 'Транзит (млн м³/сут)',   value: `${(123 + tick % 5).toLocaleString('ru-RU')}`, color: '#0d9488' },
          { icon: Gauge,  label: 'Давление (средн.)',       value: '5.4 МПа',   color: '#6366f1' },
          { icon: Zap,    label: 'КС в работе',             value: `${activeCS} / ${CS_LIST.filter(c => c.status !== 'build').length}`, color: '#10b981' },
          { icon: Flame,  label: 'Качество CH₄',            value: '98.1%',     color: '#f59e0b' },
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
          <TabsTrigger value="stations">КС — статус</TabsTrigger>
          <TabsTrigger value="pressure">Давление / объёмы</TabsTrigger>
          <TabsTrigger value="quality">Качество газа</TabsTrigger>
          <TabsTrigger value="dispatch">Диспетчерский журнал</TabsTrigger>
        </TabsList>

        {/* ── KS Status ──────────────────────────────────────────────────── */}
        <TabsContent value="stations" className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground text-[10px] uppercase tracking-wider">
                  <th className="py-2 px-3 text-left">Станция</th>
                  <th className="py-2 px-3 text-center">Маршрут</th>
                  <th className="py-2 px-3 text-right">P вх., МПа</th>
                  <th className="py-2 px-3 text-right">P вых., МПа</th>
                  <th className="py-2 px-3 text-right">Расход, млн м³/сут</th>
                  <th className="py-2 px-3 text-right">Загрузка ГПА</th>
                  <th className="py-2 px-3 text-right">Топл. газ</th>
                  <th className="py-2 px-3 text-center">Статус</th>
                </tr>
              </thead>
              <tbody>
                {CS_LIST.map((cs, i) => (
                  <tr key={i} className="border-b hover:bg-muted/30 transition-colors"
                    style={{ background: cs.status === 'maint' ? 'rgba(249,115,22,0.04)' : cs.status === 'build' ? 'rgba(99,102,241,0.04)' : 'transparent' }}>
                    <td className="py-2.5 px-3 font-semibold">{cs.name}</td>
                    <td className="py-2.5 px-3 text-center"><Badge variant="outline" className="text-[9px]">{cs.pipeline}</Badge></td>
                    <td className="py-2.5 px-3 text-right font-mono">{cs.p_in > 0 ? cs.p_in : '—'}</td>
                    <td className="py-2.5 px-3 text-right font-mono" style={{ color: cs.p_out >= 5.2 ? '#10b981' : cs.p_out > 0 ? '#f59e0b' : undefined }}>{cs.p_out > 0 ? cs.p_out : '—'}</td>
                    <td className="py-2.5 px-3 text-right">{cs.flow > 0 ? cs.flow : '—'}</td>
                    <td className="py-2.5 px-3 text-right">
                      {cs.load > 0 ? (
                        <div className="flex items-center gap-1 justify-end">
                          <div className="w-10 h-1.5 rounded bg-muted overflow-hidden">
                            <div className="h-full rounded" style={{ width: `${cs.load}%`, background: cs.load > 80 ? '#10b981' : '#f59e0b' }} />
                          </div>
                          <span>{cs.load}%</span>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right">{cs.fuel_pct > 0 ? `${cs.fuel_pct}%` : '—'}</td>
                    <td className="py-2.5 px-3 text-center">
                      {cs.status === 'ok' ? <CheckCircle2 className="h-4 w-4 text-emerald-400 mx-auto" />
                        : cs.status === 'build' ? <Badge variant="outline" className="text-[9px] border-indigo-500/30 text-indigo-400">Строится</Badge>
                        : <Badge variant="outline" className="text-[9px] border-orange-500/30 text-orange-400">ТО</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ── Pressure / Volume ──────────────────────────────────────────── */}
        <TabsContent value="pressure" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Давление на выходе КС (МПа)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={HOURLY_PRESSURE}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'} />
                    <XAxis dataKey="h" tick={{ fontSize: 9 }} interval={3} />
                    <YAxis domain={[4.8, 6.2]} tickFormatter={v => `${v}`} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v.toFixed(2)} МПа`, '']} />
                    <ReferenceLine y={5.8} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Min 5.8', fontSize: 9, fill: '#f59e0b' }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="cac"   name="CAC"      stroke="#6366f1" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="bbs"   name="ББШ"      stroke="#0d9488" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="china" name="КЗ–КНР"   stroke="#dc2626" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Объёмы транзит / внутренние (млрд м³/мес.)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={MONTHLY_TRANSIT}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'} />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="transit"  name="Транзит"    fill="#6366f1" radius={[3,3,0,0]} />
                    <Bar dataKey="domestic" name="Внутренние" fill="#0d9488" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Gas Quality ────────────────────────────────────────────────── */}
        <TabsContent value="quality" className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Flame className="h-4 w-4 text-amber-400" />Состав и качество газа (ГОСТ 5542-2014)</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {GAS_QUALITY.map((q, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {q.ok ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> : <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />}
                        <span className="text-[11px]">{q.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">{q.norm}</span>
                        <span className="font-mono text-[11px] font-semibold" style={{ color: q.ok ? '#10b981' : '#ef4444' }}>
                          {q.value}{typeof q.value === 'number' && q.value > 0 && q.value < 100 && q.label.includes('°') ? '°C' : q.label.includes('сгорания') ? ' МДж/м³' : '%'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Точки замера качества</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    { point: 'Вход ТМ/УЗ (граница)',  ch4: 97.8, last_test: '08:00' },
                    { point: 'КС Бейнеу (выход)',      ch4: 98.0, last_test: '08:30' },
                    { point: 'КС Актобе (выход)',      ch4: 98.1, last_test: '09:00' },
                    { point: 'КС Шымкент (выход)',     ch4: 98.2, last_test: '09:15' },
                    { point: 'Граница КНР (Хоргос)',   ch4: 98.1, last_test: '09:30' },
                    { point: 'Граница РФ (CAC вых.)',  ch4: 97.9, last_test: '10:00' },
                  ].map((p, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border p-2.5 border-teal-500/15">
                      <span className="text-[11px]">{p.point}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-muted-foreground">{p.last_test}</span>
                        <span className="font-mono font-semibold text-[11px] text-emerald-400">{p.ch4}% CH₄</span>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Dispatch log ───────────────────────────────────────────────── */}
        <TabsContent value="dispatch" className="pt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Оперативный журнал диспетчера — {new Date().toLocaleDateString('ru-RU')}</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[420px] overflow-y-auto">
                {DISPATCH_LOG.map((entry, i) => {
                  const meta = SEV_LOG_META[entry.severity as keyof typeof SEV_LOG_META]
                  return (
                    <div key={i} className="flex items-start gap-3 rounded-lg border p-3"
                      style={{ borderColor: `${meta.color}15` }}>
                      <span className="text-[11px] font-mono font-semibold shrink-0" style={{ color: meta.color }}>{entry.time}</span>
                      <span className={`h-2 w-2 rounded-full mt-1 shrink-0 ${meta.dot}`} />
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{entry.event}</p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

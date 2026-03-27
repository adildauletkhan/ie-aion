import { useState } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { TrendingDown, TrendingUp, BarChart3, Layers, Drill, Mountain, AlertTriangle, CheckCircle2 } from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, Legend,
} from 'recharts'

/* ══ Data ════════════════════════════════════════════════════════════════════ */

const RESERVES = [
  {
    deposit: 'Жезказган (Cu)', metal: 'Cu', ore_t: 930, metal_kt: 7600,
    category: 'A+B+C1', grade_pct: 0.82, depth: 340, status: 'active',
    annual_kt: 100, depletion_yr: 76, viu_tlnk: 2100,
  },
  {
    deposit: 'Бозшакол (Cu)', metal: 'Cu', ore_t: 1200, metal_kt: 4320,
    category: 'A+B+C1', grade_pct: 0.36, depth: 180, status: 'active',
    annual_kt: 100, depletion_yr: 43, viu_tlnk: 980,
  },
  {
    deposit: 'Актогай (Cu)', metal: 'Cu', ore_t: 1800, metal_kt: 5940,
    category: 'A+B+C1', grade_pct: 0.33, depth: 220, status: 'active',
    annual_kt: 105, depletion_yr: 57, viu_tlnk: 1340,
  },
  {
    deposit: 'Соколов-Сарбай (Fe)', metal: 'Fe', ore_t: 3800, metal_kt: 1900000,
    category: 'A+B+C1', grade_pct: 50, depth: 420, status: 'active',
    annual_kt: 22000, depletion_yr: 87, viu_tlnk: 540,
  },
  {
    deposit: 'Жайрем (Zn+Pb)', metal: 'Zn', ore_t: 180, metal_kt: 14400,
    category: 'B+C1', grade_pct: 8.0, depth: 280, status: 'active',
    annual_kt: 500, depletion_yr: 22, viu_tlnk: 320,
  },
]

const GRADE_DYNAMICS = [
  { year: '2019', zhezkazgan: 0.90, bozshakol: 0.38, aktogay: 0.36 },
  { year: '2020', zhezkazgan: 0.88, bozshakol: 0.37, aktogay: 0.35 },
  { year: '2021', zhezkazgan: 0.86, bozshakol: 0.37, aktogay: 0.34 },
  { year: '2022', zhezkazgan: 0.85, bozshakol: 0.36, aktogay: 0.34 },
  { year: '2023', zhezkazgan: 0.83, bozshakol: 0.36, aktogay: 0.33 },
  { year: '2024', zhezkazgan: 0.82, bozshakol: 0.36, aktogay: 0.33 },
]

const DRILL_HOLES = [
  { id: 'DH-2401', x: 210, depth: 480, grade: 0.94, status: 'sampled',  horizon: '−340 м' },
  { id: 'DH-2402', x: 280, depth: 520, grade: 1.12, status: 'sampled',  horizon: '−380 м' },
  { id: 'DH-2403', x: 350, depth: 390, grade: 0.71, status: 'drilling', horizon: '−280 м' },
  { id: 'DH-2404', x: 420, depth: 440, grade: 0.85, status: 'sampled',  horizon: '−320 м' },
  { id: 'DH-2405', x: 490, depth: 360, grade: 0.65, status: 'planned',  horizon: '−260 м' },
  { id: 'DH-2406', x: 560, depth: 500, grade: 1.04, status: 'sampled',  horizon: '−360 м' },
  { id: 'DH-2407', x: 630, depth: 420, grade: 0.78, status: 'drilling', horizon: '−300 м' },
]

const HORIZON_BLOCKS = [
  { horizon: 'Гор. −140',  ore_mt: 42.3, cu_pct: 0.68, status: 'depleted' },
  { horizon: 'Гор. −180',  ore_mt: 87.6, cu_pct: 0.74, status: 'partial' },
  { horizon: 'Гор. −220',  ore_mt: 132.1, cu_pct: 0.81, status: 'active' },
  { horizon: 'Гор. −260',  ore_mt: 148.9, cu_pct: 0.85, status: 'active' },
  { horizon: 'Гор. −300',  ore_mt: 156.4, cu_pct: 0.89, status: 'active' },
  { horizon: 'Гор. −340',  ore_mt: 138.7, cu_pct: 0.82, status: 'active' },
  { horizon: 'Гор. −380',  ore_mt: 112.3, cu_pct: 0.78, status: 'exploration' },
  { horizon: 'Гор. −420',  ore_mt: 86.2, cu_pct: 0.72, status: 'exploration' },
]

const DEPLETION_FORECAST = [
  { year: '2024', zhezkazgan: 930, bozshakol: 1200, aktogay: 1800 },
  { year: '2026', zhezkazgan: 710, bozshakol: 1000, aktogay: 1590 },
  { year: '2028', zhezkazgan: 510, bozshakol: 800,  aktogay: 1380 },
  { year: '2030', zhezkazgan: 310, bozshakol: 600,  aktogay: 1170 },
  { year: '2032', zhezkazgan: 110, bozshakol: 400,  aktogay: 960  },
  { year: '2034', zhezkazgan: 0,   bozshakol: 200,  aktogay: 750  },
  { year: '2036', zhezkazgan: 0,   bozshakol: 0,    aktogay: 540  },
]

const DRILL_STATUS_META = {
  sampled:  { label: 'Опробован',  color: '#10b981' },
  drilling: { label: 'В бурении',  color: '#f59e0b' },
  planned:  { label: 'Запланирован', color: '#6366f1' },
}

const HORIZON_STATUS_META = {
  depleted:    { label: 'Отработан',    color: '#6b7280' },
  partial:     { label: 'Частично',     color: '#f59e0b' },
  active:      { label: 'Активный',     color: '#10b981' },
  exploration: { label: 'Разведка',     color: '#6366f1' },
}

/* ══ Component ═══════════════════════════════════════════════════════════════ */

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold">{title}</h2>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

const TOOLTIP_STYLE = { fontSize: 11, background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, color: 'hsl(var(--foreground))' }

export default function MiningGeology() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [activeDeposit, setActiveDeposit] = useState(0)

  const dep = RESERVES[activeDeposit]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Геология и рудная база</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Запасы, категории, содержания и прогноз истощения — АО «КазГМК» и партнёры
        </p>
      </div>

      <Tabs defaultValue="reserves">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="reserves">Рудная база</TabsTrigger>
          <TabsTrigger value="grade">Содержания</TabsTrigger>
          <TabsTrigger value="drill">Буровые данные</TabsTrigger>
          <TabsTrigger value="depletion">Прогноз истощения</TabsTrigger>
        </TabsList>

        {/* ── TAB 1: Reserves ─────────────────────────────────────────────── */}
        <TabsContent value="reserves" className="space-y-5 pt-4">
          <SectionTitle title="Запасы по объектам" sub="Категории A+B+C1 / B+C1 по классификации РК (ГКЗ)" />

          {/* Deposit selector */}
          <div className="flex gap-2 flex-wrap">
            {RESERVES.map((r, i) => (
              <button key={i} onClick={() => setActiveDeposit(i)}
                className="px-3 py-1.5 rounded-lg border text-xs font-medium transition-all"
                style={{
                  borderColor: activeDeposit === i ? '#f59e0b' : 'var(--border)',
                  background:  activeDeposit === i ? 'rgba(245,158,11,0.1)' : 'transparent',
                  color:       activeDeposit === i ? '#f59e0b' : undefined,
                }}>
                {r.deposit}
              </button>
            ))}
          </div>

          {/* Selected deposit cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Балансовые запасы руды', value: `${dep.ore_t.toLocaleString('ru-RU')} млн т`, icon: Mountain },
              { label: `Запасы ${dep.metal} (металл)`, value: dep.metal_kt > 10000 ? `${(dep.metal_kt/1000).toFixed(0)} млн т` : `${(dep.metal_kt/1000).toFixed(1)} млн т`, icon: Layers },
              { label: `Ср. содержание ${dep.metal}`, value: `${dep.grade_pct}%`, icon: BarChart3 },
              { label: 'Остаток ресурса', value: `${dep.depletion_yr} лет`, icon: TrendingDown },
            ].map((c, i) => {
              const Icon = c.icon
              return (
                <Card key={i} className="border-amber-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="h-3.5 w-3.5 text-amber-500" />
                      <p className="text-[10px] text-muted-foreground">{c.label}</p>
                    </div>
                    <p className="text-lg font-bold text-amber-500">{c.value}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Full reserves table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground text-[10px] uppercase tracking-wider">
                  <th className="py-2 px-3 text-left">Месторождение</th>
                  <th className="py-2 px-3 text-right">Руда, млн т</th>
                  <th className="py-2 px-3 text-center">Категория</th>
                  <th className="py-2 px-3 text-right">Содержание</th>
                  <th className="py-2 px-3 text-right">Глубина, м</th>
                  <th className="py-2 px-3 text-right">Остаток, лет</th>
                  <th className="py-2 px-3 text-center">Статус</th>
                </tr>
              </thead>
              <tbody>
                {RESERVES.map((r, i) => (
                  <tr key={i} className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setActiveDeposit(i)}>
                    <td className="py-2.5 px-3 font-medium">{r.deposit}</td>
                    <td className="py-2.5 px-3 text-right">{r.ore_t.toLocaleString('ru-RU')}</td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge variant="outline" className="text-[9px]">{r.category}</Badge>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">{r.grade_pct}%</td>
                    <td className="py-2.5 px-3 text-right">{r.depth}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={r.depletion_yr < 30 ? 'text-red-400 font-semibold' : r.depletion_yr < 50 ? 'text-amber-400' : 'text-emerald-400'}>
                        {r.depletion_yr}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="h-2 w-2 rounded-full inline-block bg-emerald-500" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ── TAB 2: Grade ────────────────────────────────────────────────── */}
        <TabsContent value="grade" className="space-y-5 pt-4">
          <SectionTitle title="Динамика содержания меди в руде, 2019–2024" sub="Среднее по добытой рудной массе, %" />
          <Card>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={GRADE_DYNAMICS}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'} />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0.28, 1.0]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v.toFixed(2)}%`, '']} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="zhezkazgan" name="Жезказган" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="bozshakol"  name="Бозшакол"  stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="aktogay"    name="Актогай"   stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <SectionTitle title="Горизонты Жезказганского месторождения" sub="Распределение руды по горизонтам, содержание Cu" />
          <div className="space-y-2">
            {HORIZON_BLOCKS.map((h, i) => {
              const meta = HORIZON_STATUS_META[h.status]
              const pct = Math.round((h.ore_mt / 160) * 100)
              return (
                <div key={i} className="flex items-center gap-3 rounded-lg border p-3"
                  style={{ borderColor: `${meta.color}20`, background: h.status === 'active' ? (isDark ? `${meta.color}08` : `${meta.color}04`) : 'transparent' }}>
                  <div className="w-24 shrink-0">
                    <p className="text-[11px] font-mono font-semibold">{h.horizon}</p>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground">{h.ore_mt.toFixed(1)} млн т</span>
                      <span className="text-[11px] font-semibold" style={{ color: meta.color }}>Cu {h.cu_pct.toFixed(2)}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5" style={{ '--progress-color': meta.color } as React.CSSProperties} />
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[9px]" style={{ borderColor: `${meta.color}40`, color: meta.color }}>
                    {meta.label}
                  </Badge>
                </div>
              )
            })}
          </div>
        </TabsContent>

        {/* ── TAB 3: Drill holes ──────────────────────────────────────────── */}
        <TabsContent value="drill" className="space-y-5 pt-4">
          <SectionTitle title="Буровые скважины — участок Жезказган-Центральный" sub="Подземное бурение разведочно-эксплуатационных скважин" />

          {/* Visual cross-section */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Разрез буровых скважин (план–факт)</CardTitle>
            </CardHeader>
            <CardContent>
              <svg viewBox="0 0 860 280" className="w-full" style={{ maxHeight: 280 }}>
                {/* Background */}
                <rect width="860" height="280" fill={isDark ? 'rgba(10,15,28,0.5)' : 'rgba(247,250,252,0.8)'} rx="6" />

                {/* Horizon lines */}
                {HORIZON_BLOCKS.filter(h => h.status !== 'depleted').slice(0, 5).map((h, i) => {
                  const y = 40 + i * 44
                  const meta = HORIZON_STATUS_META[h.status]
                  return (
                    <g key={i}>
                      <line x1="80" y1={y} x2="860" y2={y}
                        stroke={meta.color} strokeWidth="0.8" strokeDasharray="4 4" opacity="0.4" />
                      <text x="4" y={y + 4} fontSize="9" fill={isDark ? 'rgba(255,255,255,0.5)' : '#6b7280'}>{h.horizon}</text>
                    </g>
                  )
                })}

                {/* Drill holes */}
                {DRILL_HOLES.map((dh, i) => {
                  const startY = 16
                  const endY = Math.round((dh.depth / 550) * 240) + 16
                  const color = dh.grade > 1.0 ? '#10b981' : dh.grade > 0.8 ? '#f59e0b' : '#6366f1'
                  const statusColor = DRILL_STATUS_META[dh.status as keyof typeof DRILL_STATUS_META].color
                  return (
                    <g key={dh.id}>
                      <line x1={dh.x} y1={startY} x2={dh.x} y2={endY}
                        stroke={statusColor} strokeWidth="3" opacity="0.7" />
                      <circle cx={dh.x} cy={endY} r="6" fill={color} opacity="0.9" />
                      <text x={dh.x} y={endY + 18} textAnchor="middle" fontSize="8"
                        fill={isDark ? 'rgba(255,255,255,0.6)' : '#374151'}>
                        {dh.grade.toFixed(2)}%
                      </text>
                      <text x={dh.x} y={startY - 4} textAnchor="middle" fontSize="8"
                        fill={isDark ? 'rgba(255,255,255,0.5)' : '#6b7280'}>
                        {dh.id.slice(-4)}
                      </text>
                    </g>
                  )
                })}

                {/* Grade legend */}
                <g transform="translate(660, 220)">
                  <rect width="170" height="54" rx="4" fill={isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)'}
                    stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} strokeWidth="1" />
                  {[['> 1.0%', '#10b981'], ['0.8–1.0%', '#f59e0b'], ['< 0.8%', '#6366f1']].map(([l, c], i) => (
                    <g key={i} transform={`translate(8, ${i * 16 + 10})`}>
                      <circle cx="5" r="4" fill={c as string} />
                      <text x="14" y="4" fontSize="9" fill={isDark ? 'rgba(255,255,255,0.7)' : '#374151'}>Содержание {l}</text>
                    </g>
                  ))}
                </g>
              </svg>
            </CardContent>
          </Card>

          {/* Drill holes table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground text-[10px] uppercase tracking-wider">
                  <th className="py-2 px-3 text-left">Скважина</th>
                  <th className="py-2 px-3 text-right">Глубина, м</th>
                  <th className="py-2 px-3 text-right">Содержание Cu</th>
                  <th className="py-2 px-3 text-center">Горизонт</th>
                  <th className="py-2 px-3 text-center">Статус</th>
                  <th className="py-2 px-3 text-center">Оценка</th>
                </tr>
              </thead>
              <tbody>
                {DRILL_HOLES.map((dh, i) => {
                  const sm = DRILL_STATUS_META[dh.status as keyof typeof DRILL_STATUS_META]
                  const gradeColor = dh.grade > 1.0 ? '#10b981' : dh.grade > 0.8 ? '#f59e0b' : '#6366f1'
                  return (
                    <tr key={i} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-semibold">{dh.id}</td>
                      <td className="py-2.5 px-3 text-right">{dh.depth}</td>
                      <td className="py-2.5 px-3 text-right font-mono" style={{ color: gradeColor }}>{dh.grade.toFixed(2)}%</td>
                      <td className="py-2.5 px-3 text-center font-mono text-[10px]">{dh.horizon}</td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge variant="outline" className="text-[9px]" style={{ borderColor: `${sm.color}40`, color: sm.color }}>
                          {sm.label}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {dh.grade > 0.9 ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mx-auto" /> :
                          dh.grade < 0.7 ? <AlertTriangle className="h-3.5 w-3.5 text-amber-400 mx-auto" /> :
                          <span className="text-muted-foreground text-[10px]">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ── TAB 4: Depletion ────────────────────────────────────────────── */}
        <TabsContent value="depletion" className="space-y-5 pt-4">
          <SectionTitle title="Прогноз истощения запасов, 2024–2036" sub="Остаток балансовых запасов (млн т руды) при текущих темпах добычи" />
          <Card>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={DEPLETION_FORECAST}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'} />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v.toLocaleString('ru-RU')} млн т`, '']} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="aktogay"    name="Актогай"   fill="#10b981" radius={[3,3,0,0]} />
                  <Bar dataKey="bozshakol"  name="Бозшакол"  fill="#6366f1" radius={[3,3,0,0]} />
                  <Bar dataKey="zhezkazgan" name="Жезказган" fill="#f59e0b" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { deposit: 'Жезказган', years: 76, risk: 'high', annual: 100, note: 'Требует разведки глубоких горизонтов (>−400 м)' },
              { deposit: 'Бозшакол',  years: 43, risk: 'medium', annual: 100, note: 'Карьерная отработка ограничена глубиной' },
              { deposit: 'Актогай',   years: 57, risk: 'low', annual: 105, note: 'Резерв C2 — 0.9 млрд т под переоценку' },
            ].map((d, i) => {
              const color = d.risk === 'high' ? '#10b981' : d.risk === 'medium' ? '#f59e0b' : '#10b981'
              return (
                <Card key={i} className="border" style={{ borderColor: `${color}20` }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold">{d.deposit}</p>
                      <Badge variant="outline" style={{ borderColor: `${color}40`, color }}
                        className="text-[9px]">
                        {d.years} лет
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-2">{d.note}</p>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Годовая добыча:</span>
                      <span className="font-semibold">{d.annual} тыс. т Cu</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div className="text-[11px] text-muted-foreground">
                <span className="text-amber-400 font-semibold">Замечание по рудной базе: </span>
                При текущих темпах добычи (~305 тыс. т Cu/год) на горнодобывающих объектах КазГМК суммарный ресурс меди (A+B+C1) составляет 17.86 млн т металла. Критическим ограничением является истощение Жезказганского месторождения — флагманского объекта — в горизонте 2045–2050 гг., что требует ускорения геологоразведки на горизонтах ниже −400 м и оценки ресурсов категории C2.
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

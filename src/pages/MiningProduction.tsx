import { useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useTheme } from '@/hooks/useTheme'
import {
  Pickaxe, Factory, Truck, Zap, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownRight, Minus, BarChart3, Target, Gauge,
} from 'lucide-react'

/* ══════════════════════════════════════════════════════════ DATA ══ */

const productionByYear: Record<number, {
  ore:     { fact: number | null; plan: number; delta: string | null }
  grade:   { fact: number | null; plan: number; delta: string | null }
  cathode: { fact: number | null; plan: number; delta: string | null }
  recovery:{ fact: number | null; plan: number; delta: string | null }
}> = {
  2023: {
    ore:      { fact: 15.12, plan: 15.80, delta: '−4.3%' },
    grade:    { fact: 0.84,  plan: 0.86,  delta: '−0.02 п.п.' },
    cathode:  { fact: 421.5, plan: 445.0, delta: '−5.3%' },
    recovery: { fact: 90.2,  plan: 91.0,  delta: '−0.8 п.п.' },
  },
  2024: {
    ore:      { fact: 15.64, plan: 16.10, delta: '−2.9%' },
    grade:    { fact: 0.82,  plan: 0.85,  delta: '−0.03 п.п.' },
    cathode:  { fact: 455.2, plan: 467.3, delta: '−2.6%' },
    recovery: { fact: 91.4,  plan: 92.0,  delta: '−0.6 п.п.' },
  },
  2025: {
    ore:      { fact: null, plan: 16.80, delta: null },
    grade:    { fact: null, plan: 0.86,  delta: null },
    cathode:  { fact: null, plan: 485.0, delta: null },
    recovery: { fact: null, plan: 92.5,  delta: null },
  },
}

const oreDynamics = [
  { year: '2020', ore: 13.42, cathode: 385.1 },
  { year: '2021', ore: 14.18, cathode: 396.4 },
  { year: '2022', ore: 14.87, cathode: 410.2 },
  { year: '2023', ore: 15.12, cathode: 421.5 },
  { year: '2024', ore: 15.64, cathode: 455.2 },
]

const mineBreakdown = [
  { name: 'Жезказган Основной', ore: 8420, grade: 0.94, staff: 1840 },
  { name: 'Жезказган Северный', ore: 5930, grade: 0.76, staff: 1240 },
  { name: 'Жезказган Глубокий', ore: 4100, grade: 0.88, staff: 980  },
  { name: 'Итого / в т.ч. Соколов (ЖРО)', ore: 28100, grade: 0.82, staff: 4060 },
]

const fleetData = [
  { shift: '06:00', active: 168, maintenance: 22, total: 210 },
  { shift: '08:00', active: 181, maintenance: 18, total: 210 },
  { shift: '10:00', active: 184, maintenance: 16, total: 210 },
  { shift: '12:00', active: 178, maintenance: 21, total: 210 },
  { shift: '14:00', active: 186, maintenance: 15, total: 210 },
  { shift: '16:00', active: 184, maintenance: 17, total: 210 },
  { shift: '18:00', active: 172, maintenance: 24, total: 210 },
  { shift: '20:00', active: 158, maintenance: 30, total: 210 },
]

const fleetTypes = [
  { type: 'Экскаваторы ЭКГ', total: 38,  active: 34, avail: 89.5 },
  { type: 'Буровые станки',  total: 24,  active: 21, avail: 87.5 },
  { type: 'Самосвалы 130т',  total: 84,  active: 73, avail: 86.9 },
  { type: 'Самосвалы 220т',  total: 32,  active: 29, avail: 90.6 },
  { type: 'Бульдозеры',       total: 18,  active: 16, avail: 88.9 },
  { type: 'Грейдеры',         total: 14,  active: 11, avail: 78.6 },
]

const metalPrices = [
  { month: 'Ян', cu: 8420, zn: 2580, fe: 118 },
  { month: 'Фев', cu: 8680, zn: 2640, fe: 122 },
  { month: 'Мар', cu: 8920, zn: 2590, fe: 125 },
  { month: 'Апр', cu: 9140, zn: 2710, fe: 119 },
  { month: 'Май', cu: 9380, zn: 2760, fe: 124 },
  { month: 'Июн', cu: 9120, zn: 2680, fe: 121 },
  { month: 'Июл', cu: 9540, zn: 2820, fe: 128 },
  { month: 'Авг', cu: 9254, zn: 2790, fe: 126 },
]

const salesData = [
  { product: 'Медь катодная М00k',   volume: 455.2, price: 9254, revenue: 4212 },
  { product: 'Концентрат Cu 28.6%',  volume: 182.4, price: 3140, revenue: 573  },
  { product: 'Железорудный концентрат', volume: 8410, price: 118, revenue: 992 },
  { product: 'Цинк металлический',   volume: 64.2,  price: 2790, revenue: 179  },
]

const energyData = [
  { month: 'Ян', kwh: 540 }, { month: 'Фев', kwh: 528 },
  { month: 'Мар', kwh: 522 }, { month: 'Апр', kwh: 518 },
  { month: 'Май', kwh: 515 }, { month: 'Июн', kwh: 512 },
  { month: 'Июл', kwh: 508 }, { month: 'Авг', kwh: 505 },
]

/* ══════════════════════════════════════════════════════════ HELPERS ══ */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
      {children}
    </h3>
  )
}

function DeltaBadge({ delta }: { delta: string | null }) {
  if (!delta) return null
  const pos = delta.startsWith('+')
  const neg = delta.startsWith('−') || delta.startsWith('-')
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full
      ${pos ? 'bg-emerald-500/15 text-emerald-500' : neg ? 'bg-red-500/15 text-red-400' : 'bg-muted text-muted-foreground'}`}>
      {pos ? <ArrowUpRight className="h-2.5 w-2.5" /> : neg ? <ArrowDownRight className="h-2.5 w-2.5" /> : <Minus className="h-2.5 w-2.5" />}
      {delta}
    </span>
  )
}

/* ══════════════════════════════════════════════════════════ TAB 1 ══ */

function TabExtraction() {
  const [year, setYear] = useState<2023 | 2024 | 2025>(2024)
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const d = productionByYear[year]
  const amber = '#f59e0b'

  const metrics = [
    { label: 'Добыча руды', unit: 'млн т/год', ...d.ore,     color: amber,    icon: Pickaxe },
    { label: 'Содержание Cu', unit: '% в руде', ...d.grade,  color: '#6366f1', icon: BarChart3 },
    { label: 'Cu катодная', unit: 'тыс. т/год',  ...d.cathode,color: '#0d9488', icon: Factory },
    { label: 'Извлечение Cu', unit: '% на ОФ',   ...d.recovery,color: '#10b981', icon: Target },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Период:</span>
        {([2023, 2024, 2025] as const).map((y) => (
          <button key={y} onClick={() => setYear(y)}
            className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all
              ${year === y ? 'border-transparent text-white' : 'border-border hover:border-muted-foreground'}`}
            style={year === y ? { background: amber } : {}}>
            {y === 2025 ? '2025 (план)' : String(y)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((m) => {
          const Icon = m.icon
          return (
            <div key={m.label} className="rounded-xl border p-4"
              style={{ borderColor: `${m.color}25`, background: isDark ? `${m.color}07` : `${m.color}04` }}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-3.5 w-3.5" style={{ color: m.color }} />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground leading-snug">{m.label}</p>
              </div>
              <p className="text-2xl font-bold mb-1" style={{ color: m.color }}>
                {year === 2025 ? (m.plan?.toFixed(m.unit.includes('%') ? 1 : 2) ?? '—') : (m.fact?.toFixed(m.unit.includes('%') ? 1 : 2) ?? '—')}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-muted-foreground">{m.unit}</span>
                {year === 2025
                  ? <Badge variant="outline" className="text-[9px]" style={{ borderColor: `${m.color}40`, color: m.color }}>Прогноз</Badge>
                  : (
                    <>
                      {m.plan !== null && <span className="text-[10px] text-muted-foreground">план: {m.plan.toFixed(m.unit.includes('%') ? 1 : 2)}</span>}
                      <DeltaBadge delta={m.delta} />
                    </>
                  )
                }
              </div>
            </div>
          )
        })}
      </div>

      <div>
        <SectionTitle>Динамика добычи и производства 2020–2024</SectionTitle>
        <div className="rounded-xl border p-4" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={oreDynamics} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left"  domain={[12, 18]}  tick={{ fontSize: 11 }} unit=" млн т" width={60} />
              <YAxis yAxisId="right" orientation="right" domain={[360, 500]} tick={{ fontSize: 11 }} unit=" тыс.т" width={60} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => v === 'ore' ? 'Добыча руды, млн т' : 'Cu катодная, тыс. т'} />
              <Bar  yAxisId="left"  dataKey="ore"     fill={`${amber}55`}   radius={[3, 3, 0, 0]} />
              <Line yAxisId="right" dataKey="cathode"  stroke="#0d9488"     strokeWidth={2} dot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <SectionTitle>Разбивка по рудникам · 2024 (т/сут)</SectionTitle>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                {['Рудник', 'Добыча, т/сут', 'Содержание Cu, %', 'Персонал'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mineBreakdown.map((row, i) => (
                <tr key={i} className={`border-b last:border-0 ${row.name.includes('Итого') ? 'font-semibold bg-muted/30' : ''}`}>
                  <td className="px-4 py-2.5">{row.name}</td>
                  <td className="px-4 py-2.5 tabular-nums">{row.ore.toLocaleString('ru-RU')}</td>
                  <td className="px-4 py-2.5 tabular-nums">{row.grade.toFixed(2)}</td>
                  <td className="px-4 py-2.5 tabular-nums">{row.staff.toLocaleString('ru-RU')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════ TAB 2 ══ */

function TabFleet() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const purple = '#6366f1'

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Единиц в работе', value: '184 / 210', color: purple,    icon: Truck },
          { label: 'Готовность',      value: '87.4%',      color: '#0d9488', icon: Gauge },
          { label: 'На ТО / ремонте', value: '26 ед.',     color: '#f59e0b', icon: BarChart3 },
        ].map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="rounded-xl border p-4"
              style={{ borderColor: `${s.color}25`, background: isDark ? `${s.color}07` : `${s.color}04` }}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4" style={{ color: s.color }} />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          )
        })}
      </div>

      <div>
        <SectionTitle>Техника по типам</SectionTitle>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                {['Тип техники', 'Всего', 'В работе', 'Готовность %'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fleetTypes.map((row, i) => {
                const colorAvail = row.avail >= 88 ? '#10b981' : row.avail >= 80 ? '#f59e0b' : '#ef4444'
                return (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-4 py-2.5 font-medium">{row.type}</td>
                    <td className="px-4 py-2.5 tabular-nums">{row.total}</td>
                    <td className="px-4 py-2.5 tabular-nums">{row.active}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${row.avail}%`, background: colorAvail }} />
                        </div>
                        <span className="font-semibold" style={{ color: colorAvail }}>{row.avail}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <SectionTitle>Суточный профиль загруженности парка</SectionTitle>
        <div className="rounded-xl border p-4" style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={fleetData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="activeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={purple} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={purple} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
              <XAxis dataKey="shift" tick={{ fontSize: 11 }} />
              <YAxis domain={[140, 220]} tick={{ fontSize: 11 }} unit=" ед" width={45} />
              <Tooltip formatter={(v: number, name: string) => [v, name === 'active' ? 'В работе' : 'На ТО']} />
              <ReferenceLine y={210} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: 'Парк 210', fontSize: 9, fill: '#f59e0b' }} />
              <Area type="monotone" dataKey="active"      stroke={purple}   fill="url(#activeGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="maintenance" stroke="#f59e0b"  fill="#f59e0b18"        strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════ TAB 3 ══ */

function TabSales() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const tiffany = '#0d9488'

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle>Динамика цен LME · 2024, $/т</SectionTitle>
        <div className="rounded-xl border p-4" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metalPrices} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="cu" domain={[8000, 10000]} tick={{ fontSize: 11 }} unit="$/т" width={62} />
              <YAxis yAxisId="zn" orientation="right" domain={[2400, 2900]} tick={{ fontSize: 10 }} width={52} />
              <Tooltip formatter={(v: number, name: string) => [`$${v.toLocaleString('ru-RU')}/т`, name.toUpperCase()]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line yAxisId="cu" type="monotone" dataKey="cu" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="cu" />
              <Line yAxisId="zn" type="monotone" dataKey="zn" stroke={tiffany} strokeWidth={2} dot={{ r: 3 }} name="zn" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <SectionTitle>Структура выручки 2024</SectionTitle>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                {['Продукция', 'Объём, тыс. т', 'Цена LME, $/т', 'Выручка, млн $'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {salesData.map((row, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-4 py-2.5 font-medium">{row.product}</td>
                  <td className="px-4 py-2.5 tabular-nums">{row.volume.toLocaleString('ru-RU')}</td>
                  <td className="px-4 py-2.5 tabular-nums">{row.price.toLocaleString('ru-RU')}</td>
                  <td className="px-4 py-2.5 tabular-nums font-semibold" style={{ color: tiffany }}>
                    {row.revenue.toLocaleString('ru-RU')}
                  </td>
                </tr>
              ))}
              <tr className="font-bold bg-muted/30">
                <td className="px-4 py-2.5">Итого</td>
                <td className="px-4 py-2.5" />
                <td className="px-4 py-2.5" />
                <td className="px-4 py-2.5 tabular-nums" style={{ color: tiffany }}>
                  {salesData.reduce((a, b) => a + b.revenue, 0).toLocaleString('ru-RU')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Цены LME на дату отчётности. Выручка по экспортным контрактам в USD.
          Доля экспорта — 84% (КНР — 62%, Европа — 22%).
        </p>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════ TAB 4 ══ */

function TabEnergy() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const green = '#10b981'

  const kpis = [
    { label: 'Расход э/э на 1 т руды',  value: '505', unit: 'кВт·ч/т', target: '< 500', ok: false, color: '#f59e0b' },
    { label: 'Расход э/э на 1 т Cu',     value: '8 240', unit: 'кВт·ч/т', target: '< 8 000', ok: false, color: '#ef4444' },
    { label: 'Суммарный расход э/э',     value: '7.9',  unit: 'млрд кВт·ч/год', target: '< 8.2', ok: true, color: green },
    { label: 'Доля ВИЭ в балансе э/э',   value: '6.2',  unit: '%', target: '> 5%', ok: true, color: green },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border p-4"
            style={{ borderColor: `${k.color}25`, background: isDark ? `${k.color}07` : `${k.color}04` }}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 leading-snug">{k.label}</p>
            <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className="text-[10px] text-muted-foreground">{k.unit}</span>
              <Badge className={`text-[9px] border-0 font-medium ${k.ok ? 'bg-emerald-500/15 text-emerald-500' : 'bg-red-500/15 text-red-400'}`}>
                {k.ok ? '✓ Норма' : '↑ Выше цели'}
              </Badge>
              <span className="text-[9px] text-muted-foreground">цель: {k.target}</span>
            </div>
          </div>
        ))}
      </div>

      <div>
        <SectionTitle>Удельный расход э/э на добычу, кВт·ч/т · 2024</SectionTitle>
        <div className="rounded-xl border p-4" style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={energyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis domain={[490, 550]} tick={{ fontSize: 11 }} unit=" кВт·ч/т" width={72} />
              <Tooltip formatter={(v: number) => [`${v} кВт·ч/т`, 'Удельный расход']} />
              <ReferenceLine y={500} stroke={green} strokeDasharray="4 2"
                label={{ value: 'Цель 500', position: 'insideTopRight', fontSize: 9, fill: green }} />
              <Bar dataKey="kwh" fill="#6366f155" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-dashed p-3 text-[11px] text-muted-foreground">
          <Zap className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
          <span>
            Программа энергоэффективности 2024–2026: переход на частотно-регулируемые приводы насосов,
            замена осветительного оборудования на LED, установка рекуперативных систем на подъёмниках.
            Целевое снижение удельного расхода — 8% к 2026 г.
          </span>
        </div>
      </div>

      <div>
        <SectionTitle>Декарбонизация и ВИЭ</SectionTitle>
        <div className="space-y-3">
          {[
            { label: 'Доля ВИЭ в потреблении э/э', pct: 6.2,  target: 10, color: green },
            { label: 'Снижение выбросов CO₂',       pct: 47,   target: 100, color: '#0d9488', note: '−3.8% vs 2023' },
            { label: 'Программа рекультивации земель', pct: 38, target: 100, color: '#6366f1', note: '184 га из 490 га' },
          ].map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">{item.label} {item.note ? <span className="ml-2 text-[10px]">{item.note}</span> : null}</span>
                <span className="font-medium" style={{ color: item.color }}>{item.pct}%</span>
              </div>
              <Progress value={(item.pct / item.target) * 100} className="h-1.5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════ MAIN ══ */

export default function MiningProduction() {
  return (
    <div className="flex flex-col gap-5 p-5 min-h-screen">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Производственные показатели</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            АО «КазГМК» · Добыча, обогащение, металлургия · 2023–2025
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-[10px]" style={{ borderColor: '#f59e0b40', color: '#f59e0b' }}>
            <Pickaxe className="h-3 w-3 mr-1" />Горнодобыча
          </Badge>
          <Badge variant="outline" className="text-[10px]" style={{ borderColor: '#0d948840', color: '#0d9488' }}>
            <TrendingUp className="h-3 w-3 mr-1" />LME Cu: $9 254/т
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="extraction" className="flex-1">
        <TabsList className="flex w-full h-auto flex-wrap gap-1 bg-muted/50 p-1 rounded-xl">
          {[
            { value: 'extraction', label: 'Добыча и переработка' },
            { value: 'fleet',      label: 'Производительность техники' },
            { value: 'sales',      label: 'Металлургия и сбыт' },
            { value: 'energy',     label: 'Энергоэффективность' },
          ].map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="flex-1 min-w-[120px] text-xs font-medium">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-5">
          <TabsContent value="extraction" className="mt-0"><TabExtraction /></TabsContent>
          <TabsContent value="fleet"      className="mt-0"><TabFleet /></TabsContent>
          <TabsContent value="sales"      className="mt-0"><TabSales /></TabsContent>
          <TabsContent value="energy"     className="mt-0"><TabEnergy /></TabsContent>
        </div>
      </Tabs>

      <p className="text-[10px] text-muted-foreground border-t pt-3">
        Источник: производственные отчёты АО «КазГМК» 2023–2024, данные LME на дату формирования отчёта.
        Плановые показатели 2025 г. утверждены производственной программой.
      </p>
    </div>
  )
}

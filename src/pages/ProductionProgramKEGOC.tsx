import { useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useTheme } from '@/hooks/useTheme'
import {
  TrendingUp, TrendingDown, Zap, BarChart3, Shield,
  Target, AlertTriangle, CheckCircle2, Clock, Cpu,
  ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react'

/* ══════════════════════════════════════════════════════════ MOCK DATA ══ */

const serviceData: Record<number, {
  transmission: { fact: number | null; plan: number | null; delta: string | null }
  usage:        { fact: number | null; plan: number | null; delta: string | null }
  dispatching:  { fact: number | null; plan: number | null; delta: string | null }
  balancing:    { fact: number | null; plan: number | null; delta: string | null }
}> = {
  2023: {
    transmission: { fact: 31.2,  plan: 29.77, delta: '+4.8%' },
    usage:        { fact: 36.0,  plan: 35.61, delta: '+1.1%' },
    dispatching:  { fact: 106.3, plan: null,   delta: '+1.9% vs 2022' },
    balancing:    { fact: 205.4, plan: null,   delta: '+1.1% vs 2022' },
  },
  2024: {
    transmission: { fact: 19.0,  plan: 18.73, delta: '+1.2%' },
    usage:        { fact: 74.9,  plan: 73.64, delta: '+1.8%' },
    dispatching:  { fact: 110.9, plan: 106.3, delta: '+4.3%' },
    balancing:    { fact: 210.3, plan: 205.4, delta: '+2.4%' },
  },
  2025: {
    transmission: { fact: null, plan: 20.1,  delta: null },
    usage:        { fact: null, plan: 78.2,  delta: null },
    dispatching:  { fact: null, plan: 114.5, delta: null },
    balancing:    { fact: null, plan: 215.0, delta: null },
  },
}

const dynamicsData = [
  { year: '2020', dispatching: 98.99,  balancing: 192.86 },
  { year: '2021', dispatching: 105.04, balancing: 205.15 },
  { year: '2022', dispatching: 104.26, balancing: 203.12 },
  { year: '2023', dispatching: 106.28, balancing: 205.41 },
  { year: '2024', dispatching: 110.89, balancing: 210.29 },
]

const transmissionStructure = [
  { type: 'Межгосударственный транзит',  volume: 6.6,  pct: '34.7%', delta: '+27%' },
  { type: 'Экспорт в Кыргызстан',         volume: 1.2,  pct: '6.3%',  delta: '+9%'  },
  { type: 'Единый закупщик (ВИЭ / двуст.)',volume: 11.2, pct: '58.9%', delta: '+2%'  },
  { type: 'Итого',                         volume: 19.0, pct: '100%',  delta: '+1.5%'},
]

const strategyTimeline = [
  { year: '2023', label: 'Запуск балансирующего рынка', done: true },
  { year: '2024', label: 'Smart Grid пилот (3 ПС)',     done: true },
  { year: '2025', label: 'ВИЭ интеграция 15%',          done: false },
  { year: '2026', label: 'Цифровые ПС (10 объектов)',   done: false },
  { year: '2028', label: 'Smart Grid полное развёртывание', done: false },
  { year: '2030', label: 'ВИЭ интеграция 19%',          done: false },
  { year: '2032', label: 'Завершение стратегии',        done: false },
]

const investProjects = [
  { name: 'Реконструкция ПС 500 кВ',             budget: 52.3, spent: 48.1, pct: 92,    status: 'В работе'   },
  { name: 'Строительство ВЛ 220-500 кВ',          budget: 38.7, spent: 31.2, pct: 80.7,  status: 'В работе'   },
  { name: 'Цифровизация / Smart Grid',             budget: 24.1, spent: 18.4, pct: 76.3,  status: 'В работе'   },
  { name: 'Реконструкция ПС 220 кВ',              budget: 31.8, spent: 29.7, pct: 93.4,  status: 'Завершается'},
  { name: 'Системы защиты и автоматики (РЗА)',    budget: 18.5, spent: 16.8, pct: 90.8,  status: 'В работе'   },
  { name: 'АСКУЭ и телеметрия',                   budget: 12.2, spent: 10.1, pct: 82.8,  status: 'В работе'   },
  { name: 'Кибербезопасность (Claroty)',           budget: 9.8,  spent: 9.9,  pct: 101,   status: 'Выполнено'  },
]

const capexData = [
  { year: '2020', capex: 98.4  },
  { year: '2021', capex: 112.7 },
  { year: '2022', capex: 134.2 },
  { year: '2023', capex: 171.8 },
  { year: '2024', capex: 164.2 },
]

const hourlyLoad = [
  { hour: '00:00', load: 8200 },  { hour: '01:00', load: 7800 },
  { hour: '02:00', load: 7400 },  { hour: '03:00', load: 7100 },
  { hour: '04:00', load: 6900 },  { hour: '05:00', load: 7200 },
  { hour: '06:00', load: 8100 },  { hour: '07:00', load: 9400 },
  { hour: '08:00', load: 10800 }, { hour: '09:00', load: 11600 },
  { hour: '10:00', load: 12100 }, { hour: '11:00', load: 12400 },
  { hour: '12:00', load: 12200 }, { hour: '13:00', load: 11900 },
  { hour: '14:00', load: 12000 }, { hour: '15:00', load: 12300 },
  { hour: '16:00', load: 12800 }, { hour: '17:00', load: 13400 },
  { hour: '18:00', load: 13800 }, { hour: '19:00', load: 13200 },
  { hour: '20:00', load: 12400 }, { hour: '21:00', load: 11200 },
  { hour: '22:00', load: 10100 }, { hour: '23:00', load: 9000 },
]

const balancingComparison = [
  { label: 'Покупка, млн кВт·ч',         v2023: '1 752.8',  v2024: '1 925.9',  delta: '+9.9%'  },
  { label: 'Покупка, млн тенге',          v2023: '31 116.9', v2024: '35 859.2', delta: '+15.2%' },
  { label: 'Цена покупки, тенге/кВт·ч',  v2023: '17.75',    v2024: '18.62',    delta: '+4.9%'  },
  { label: 'Продажа, млн кВт·ч',         v2023: '1 329.2',  v2024: '1 456.1',  delta: '+9.5%'  },
  { label: 'Продажа, млн тенге',          v2023: '8 621.9',  v2024: '9 454.0',  delta: '+9.7%'  },
  { label: 'Цена продажи, тенге/кВт·ч',  v2023: '6.49',     v2024: '6.49',     delta: '0%'     },
  { label: 'Чистые затраты, млн тенге',   v2023: '22 495.0', v2024: '26 405.2', delta: '+17.4%' },
]

const reliabilityData = [
  { year: '2020', ga: 97.8, ait: 3.1, outages: 41 },
  { year: '2021', ga: 98.1, ait: 2.9, outages: 38 },
  { year: '2022', ga: 97.9, ait: 3.0, outages: 35 },
  { year: '2023', ga: 98.2, ait: 2.7, outages: 31 },
  { year: '2024', ga: 98.4, ait: 2.3, outages: 23 },
]

const wearData = [
  { type: 'Силовые трансформаторы 500 кВ', count: 48,    wear: 71, replace: 14,   priority: 'Высокий' },
  { type: 'Выключатели 220–500 кВ',         count: 312,   wear: 65, replace: 67,   priority: 'Высокий' },
  { type: 'Линии электропередачи (км)',      count: 28000, wear: 58, replace: 4200, priority: 'Средний' },
  { type: 'Системы РЗА',                    count: 1840,  wear: 48, replace: 210,  priority: 'Средний' },
  { type: 'АСКУЭ и телеметрия',             count: 2300,  wear: 34, replace: 180,  priority: 'Низкий'  },
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
  const zero = delta === '0%'
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full
      ${zero ? 'bg-muted text-muted-foreground' : pos ? 'bg-emerald-500/15 text-emerald-500' : 'bg-red-500/15 text-red-400'}`}>
      {zero ? <Minus className="h-2.5 w-2.5" /> : pos ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
      {delta}
    </span>
  )
}

/* ══════════════════════════════════════════════════════════ TAB 1 ══ */

function TabServices() {
  const [year, setYear] = useState<2023 | 2024 | 2025>(2024)
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const d = serviceData[year]
  const tiffany = '#0d9488'

  const metrics = [
    { label: 'Передача э/э по НЭС', unit: 'млрд кВт·ч', ...d.transmission, color: '#6366f1' },
    { label: 'Пользование НЭС',      unit: 'млрд кВт·ч', ...d.usage,        color: '#0d9488' },
    { label: 'Техническая диспетчеризация', unit: 'млрд кВт·ч', ...d.dispatching, color: '#f59e0b' },
    { label: 'Организация балансирования',  unit: 'млрд кВт·ч', ...d.balancing,   color: '#8b5cf6' },
  ]

  return (
    <div className="space-y-6">
      {/* Year switcher */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Период:</span>
        {([2023, 2024, 2025] as const).map((y) => (
          <button key={y} onClick={() => setYear(y)}
            className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all
              ${year === y ? 'border-transparent text-white' : 'border-border hover:border-muted-foreground'}`}
            style={year === y ? { background: tiffany } : {}}>
            {y === 2025 ? '2025 (план)' : String(y)}
          </button>
        ))}
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-xl border p-4"
            style={{ borderColor: `${m.color}25`, background: isDark ? `${m.color}07` : `${m.color}04` }}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 leading-snug">{m.label}</p>
            <div className="flex items-end gap-2 mb-1.5">
              <p className="text-2xl font-bold" style={{ color: m.color }}>
                {year === 2025 ? (m.plan?.toFixed(1) ?? '—') : (m.fact?.toFixed(1) ?? '—')}
              </p>
              <span className="text-[10px] text-muted-foreground mb-1">{m.unit}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {year === 2025
                ? <Badge variant="outline" className="text-[9px]" style={{ borderColor: `${m.color}40`, color: m.color }}>Прогноз</Badge>
                : (
                  <>
                    {m.plan && (
                      <span className="text-[10px] text-muted-foreground">
                        план: {m.plan.toFixed(2)}
                      </span>
                    )}
                    <DeltaBadge delta={m.delta} />
                  </>
                )
              }
            </div>
          </div>
        ))}
      </div>

      {/* Dynamics chart */}
      <div>
        <SectionTitle>Динамика объёмов услуг 2020–2024</SectionTitle>
        <div className="rounded-xl border p-4" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dynamicsData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis domain={[90, 220]} tick={{ fontSize: 11 }} unit=" млрд" width={72} />
              <Tooltip formatter={(v: number, name: string) => [
                `${v.toFixed(2)} млрд кВт·ч`,
                name === 'dispatching' ? 'Диспетчеризация' : 'Балансирование',
              ]} />
              <Legend formatter={(v) => v === 'dispatching' ? 'Диспетчеризация' : 'Балансирование'} wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="dispatching" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="balancing"   stroke="#0d9488" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Transmission structure table */}
      <div>
        <SectionTitle>Структура услуг по передаче 2024</SectionTitle>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                {['Вид услуги', 'Объём, млрд кВт·ч', 'Доля', 'vs 2023'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transmissionStructure.map((row, i) => (
                <tr key={i} className={`border-b last:border-0 ${row.type === 'Итого' ? 'font-semibold' : ''}`}>
                  <td className="px-4 py-2.5">{row.type}</td>
                  <td className="px-4 py-2.5 tabular-nums">{row.volume.toFixed(1)}</td>
                  <td className="px-4 py-2.5 tabular-nums">{row.pct}</td>
                  <td className="px-4 py-2.5"><DeltaBadge delta={row.delta} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
          С 1 июля 2023 года изменена структура услуг в связи с введением модели Единого закупщика электроэнергии
          и запуском балансирующего рынка (Закон «Об электроэнергетике» РК).
        </p>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════ TAB 2 ══ */

function ProgressBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium" style={{ color }}>{pct}%</span>
      </div>
      <Progress value={pct} className="h-1.5" style={{ ['--progress-bg' as string]: color }} />
    </div>
  )
}

function TabStrategy() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const goals = [
    {
      num: 1, color: '#6366f1',
      title: 'Надёжность ЕЭС в условиях энергоперехода',
      kpi: 'GA — AIT',
      tasks: [
        'Выполнение функций системного оператора ЕЭС РК',
        'Опережающее развитие НЭС, интеграция ВИЭ до 19%',
        'Внедрение Smart Grid и цифровых технологий',
      ],
      bars: [
        { label: 'Интеграция ВИЭ: 13.4% из 19%', pct: 70 },
        { label: 'Цифровизация НЭС',              pct: 45 },
        { label: 'Обновление активов НЭС',         pct: 38 },
      ],
      metrics: [
        { label: 'Доля ВИЭ (факт)', value: '13.4%', badge: 'В работе', badgeColor: '#f59e0b' },
        { label: 'Smart Grid ПС',    value: '3 из 50', badge: 'Пилот', badgeColor: '#6366f1' },
      ],
    },
    {
      num: 2, color: '#10b981',
      title: 'Устойчивое развитие ESG',
      kpi: 'LTIFR — ESG рейтинг',
      tasks: [
        'Снижение углеродного следа',
        'Развитие человеческого капитала',
        'Совершенствование корпоративного управления',
        'Профессиональная безопасность (LTIFR)',
      ],
      bars: [
        { label: 'LTIFR: 0.18 / цель < 0.20', pct: 88 },
        { label: 'ESG-рейтинг: BB / цель BBB', pct: 55 },
        { label: 'Снижение выбросов CO₂',       pct: 62 },
      ],
      metrics: [
        { label: 'LTIFR 2024',    value: '0.18', badge: 'В норме',  badgeColor: '#10b981' },
        { label: 'ESG-рейтинг',   value: 'BB',   badge: 'В работе', badgeColor: '#f59e0b' },
        { label: 'Выбросы CO₂',   value: '−3.2%', badge: 'Тренд ↓', badgeColor: '#10b981' },
      ],
    },
    {
      num: 3, color: '#f59e0b',
      title: 'Увеличение стоимости чистых активов',
      kpi: 'TSR — EBITDA margin',
      tasks: [
        'Укрепление финансовой устойчивости',
        'Развитие международного сотрудничества',
      ],
      bars: [
        { label: 'EBITDA margin: 34.7% / цель > 32%', pct: 92 },
        { label: 'TSR: +12.4% / цель > 8%',           pct: 78 },
        { label: 'Рост чистых активов',                pct: 65 },
      ],
      metrics: [
        { label: 'EBITDA margin',  value: '34.7%', badge: 'Выполнено', badgeColor: '#10b981' },
        { label: 'TSR 2024',       value: '+12.4%', badge: 'Выполнено', badgeColor: '#10b981' },
        { label: 'Чистые активы',  value: '847 млрд ₸', badge: '', badgeColor: '' },
      ],
    },
  ]

  return (
    <div className="space-y-6">
      {/* Goal cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {goals.map((g) => (
          <div key={g.num} className="rounded-xl border p-4 flex flex-col gap-3"
            style={{ borderColor: `${g.color}30`, background: isDark ? `${g.color}06` : `${g.color}04` }}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: g.color }}>
                  Цель {g.num}
                </span>
                <Badge variant="outline" className="text-[9px]" style={{ borderColor: `${g.color}40`, color: g.color }}>{g.kpi}</Badge>
              </div>
              <h4 className="text-sm font-semibold leading-snug">{g.title}</h4>
            </div>

            <ul className="space-y-1">
              {g.tasks.map((t, i) => (
                <li key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                  <span className="mt-1 h-1 w-1 rounded-full shrink-0" style={{ background: g.color }} />
                  {t}
                </li>
              ))}
            </ul>

            <div className="space-y-2 border-t pt-3" style={{ borderColor: `${g.color}15` }}>
              {g.bars.map((b, i) => (
                <ProgressBar key={i} label={b.label} pct={b.pct} color={g.color} />
              ))}
            </div>

            <div className="grid grid-cols-1 gap-1.5 border-t pt-3" style={{ borderColor: `${g.color}15` }}>
              {g.metrics.map((m, i) => (
                <div key={i} className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">{m.label}:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold">{m.value}</span>
                    {m.badge && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: `${m.badgeColor}18`, color: m.badgeColor }}>
                        {m.badge}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Strategy timeline */}
      <div>
        <SectionTitle>Стратегия 2023–2032</SectionTitle>
        <div className="rounded-xl border p-5">
          {/* Line */}
          <div className="relative">
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-border" />
            <div className="relative flex justify-between">
              {strategyTimeline.map((pt, i) => (
                <div key={i} className="flex flex-col items-center gap-2" style={{ flex: 1 }}>
                  <div className={`relative z-10 h-8 w-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold
                    transition-all`}
                    style={{
                      borderColor: pt.done ? '#10b981' : 'var(--border)',
                      background: pt.done ? '#10b981' : (isDark ? '#1a1a1a' : '#fff'),
                      color: pt.done ? '#fff' : 'var(--muted-foreground)',
                    }}>
                    {pt.done ? <CheckCircle2 className="h-4 w-4" /> : pt.year.slice(2)}
                  </div>
                  <div className="text-center max-w-[80px]">
                    <p className="text-[10px] font-semibold" style={{ color: pt.done ? '#10b981' : undefined }}>{pt.year}</p>
                    <p className="text-[9px] text-muted-foreground leading-tight">{pt.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════ TAB 3 ══ */

function TabInvestment() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const tiffany = '#0d9488'

  const summary = [
    { label: 'Объём инвестпрограммы 2024', value: '187.4', unit: 'млрд ₸', color: '#6366f1', icon: BarChart3 },
    { label: 'Освоено',                     value: '164.2', unit: 'млрд ₸ (87.6%)', color: tiffany, icon: CheckCircle2 },
    { label: 'Объектов в работе',           value: '47',    unit: 'объектов',       color: '#f59e0b', icon: Cpu },
  ]

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {summary.map((s) => (
          <div key={s.label} className="rounded-xl border p-4"
            style={{ borderColor: `${s.color}25`, background: isDark ? `${s.color}07` : `${s.color}04` }}>
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="h-4 w-4" style={{ color: s.color }} />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{s.unit}</p>
          </div>
        ))}
      </div>

      {/* Projects table */}
      <div>
        <SectionTitle>Инвестиционные проекты 2024</SectionTitle>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                {['Проект', 'Бюджет, млрд ₸', 'Освоено, млрд ₸', 'Выполнение', 'Статус'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {investProjects.map((row, i) => {
                const rowBg = row.pct >= 100
                  ? (isDark ? 'rgba(16,185,129,0.07)' : 'rgba(16,185,129,0.05)')
                  : row.pct < 80
                  ? (isDark ? 'rgba(245,158,11,0.07)' : 'rgba(245,158,11,0.05)')
                  : 'transparent'
                return (
                  <tr key={i} className="border-b last:border-0" style={{ background: rowBg }}>
                    <td className="px-4 py-2.5 font-medium">{row.name}</td>
                    <td className="px-4 py-2.5 tabular-nums">{row.budget.toFixed(1)}</td>
                    <td className="px-4 py-2.5 tabular-nums">{row.spent.toFixed(1)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full"
                            style={{
                              width: `${Math.min(row.pct, 100)}%`,
                              background: row.pct >= 100 ? '#10b981' : row.pct < 80 ? '#f59e0b' : tiffany,
                            }} />
                        </div>
                        <span className={`font-semibold ${row.pct >= 100 ? 'text-emerald-500' : row.pct < 80 ? 'text-amber-500' : ''}`}>
                          {row.pct}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium
                        ${row.status === 'Выполнено' ? 'bg-emerald-500/15 text-emerald-500' :
                          row.status === 'Завершается' ? 'bg-teal-500/15 text-teal-400' :
                          'bg-blue-500/15 text-blue-400'}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CapEx chart */}
      <div>
        <SectionTitle>Динамика капвложений 2020–2024, млрд тенге</SectionTitle>
        <div className="rounded-xl border p-4" style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={capexData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 200]} tick={{ fontSize: 11 }} unit=" млрд" width={68} />
              <Tooltip formatter={(v: number) => [`${v} млрд ₸`, 'Капвложения']} />
              <Bar dataKey="capex" fill={tiffany} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════ TAB 4 ══ */

function TabBalancing() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const summaryCards = [
    {
      label: 'Покупка э/э 2024',
      vol: '1 925.9 млн кВт·ч', cost: '35 859.2 млн ₸', price: '18.62 ₸/кВт·ч',
      color: '#ef4444', icon: TrendingUp,
    },
    {
      label: 'Продажа э/э 2024',
      vol: '1 456.1 млн кВт·ч', cost: '9 454.0 млн ₸', price: '6.49 ₸/кВт·ч',
      color: '#10b981', icon: TrendingDown,
    },
    {
      label: 'Чистые затраты на балансирование',
      vol: '', cost: '26 405.2 млн ₸', price: '+17.4% vs 2023',
      color: '#f59e0b', icon: Zap,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold">Операции купли-продажи электроэнергии</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Компенсация почасовых дисбалансов на границе ЕЭС РК — ЕЭС РФ
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {summaryCards.map((c) => (
          <div key={c.label} className="rounded-xl border p-4"
            style={{ borderColor: `${c.color}30`, background: isDark ? `${c.color}07` : `${c.color}04` }}>
            <div className="flex items-center gap-2 mb-2">
              <c.icon className="h-4 w-4" style={{ color: c.color }} />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.label}</span>
            </div>
            <p className="text-base font-bold" style={{ color: c.color }}>{c.cost}</p>
            {c.vol && <p className="text-[11px] text-muted-foreground mt-0.5">{c.vol}</p>}
            <p className="text-[11px] text-muted-foreground">{c.price}</p>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed rounded-lg border border-dashed p-3">
        Операции осуществляются в рамках Соглашения РК–РФ от 9 ноября 2023 года с ПАО «Интер РАО»
        для компенсации почасовых отклонений межгосударственного сальдо перетока на границе ЕЭС РК и ЕЭС РФ.
        Асимметрия цен покупки/продажи (18.62 vs 6.49 тенге/кВт·ч) отражает рыночную стоимость балансирующей услуги.
      </p>

      {/* Hourly profile */}
      <div>
        <SectionTitle>Почасовой профиль потребления ЕЭС РК (типовые сутки)</SectionTitle>
        <div className="rounded-xl border p-4" style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourlyLoad} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="loadGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
              <XAxis dataKey="hour" tick={{ fontSize: 9 }} interval={2} />
              <YAxis domain={[6000, 15000]} tick={{ fontSize: 11 }} unit=" МВт" width={62} />
              <Tooltip formatter={(v: number) => [`${v.toLocaleString('ru-RU')} МВт`, 'Нагрузка']} />
              <ReferenceLine x="08:00" stroke="#f59e0b" strokeDasharray="4 2" label={{ value: '↑ утро', position: 'top', fontSize: 9, fill: '#f59e0b' }} />
              <ReferenceLine x="18:00" stroke="#ef4444" strokeDasharray="4 2" label={{ value: '↑ вечер', position: 'top', fontSize: 9, fill: '#ef4444' }} />
              <Area type="monotone" dataKey="load" stroke="#6366f1" strokeWidth={2} fill="url(#loadGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">
          Вечерний максимум 18:00–20:00 — критическая зона дисбалансов (пик нагрузки 13 800 МВт).
        </p>
      </div>

      {/* Comparison table */}
      <div>
        <SectionTitle>Сравнение операций 2023 vs 2024</SectionTitle>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                {['Показатель', '2023', '2024', 'Δ'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {balancingComparison.map((row, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-4 py-2.5 font-medium">{row.label}</td>
                  <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{row.v2023}</td>
                  <td className="px-4 py-2.5 tabular-nums font-semibold">{row.v2024}</td>
                  <td className="px-4 py-2.5"><DeltaBadge delta={row.delta} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════ TAB 5 ══ */

function TabReliability() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const tiffany = '#0d9488'

  const kpis = [
    {
      label: 'GA (General Availability)', value: '98.4%',
      sub: 'цель > 98%', ok: true, icon: CheckCircle2, color: '#10b981',
    },
    {
      label: 'AIT (Среднее время восстановления)', value: '2.3 ч',
      sub: 'цель < 3 ч', ok: true, icon: Clock, color: '#10b981',
    },
    {
      label: 'Аварийных отключений 2024', value: '23',
      sub: '2023 было 31 / −25.8%', ok: true, icon: TrendingDown, color: '#10b981',
    },
    {
      label: 'Износ активов НЭС', value: '62.4%',
      sub: '', ok: false, critical: true, icon: AlertTriangle, color: '#ef4444',
    },
  ]

  const risks = [
    {
      title: 'Пропускная способность НЭС',
      text: 'Недостаточная пропускная способность с учётом прогнозируемого роста нагрузок',
      badge: 'Высокий риск', color: '#ef4444',
    },
    {
      title: 'Нестабильность ВИЭ',
      text: 'Высокие темпы ввода ВИЭ усугубляют дисбалансы — нехватка манёвренных мощностей',
      badge: 'Высокий риск', color: '#ef4444',
    },
    {
      title: 'Дефицит э/э и мощности',
      text: 'Дефицит электрической энергии и мощности в среднесрочной перспективе',
      badge: 'Критично', color: '#7f1d1d',
    },
  ]

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border p-4"
            style={{ borderColor: `${k.color}30`, background: isDark ? `${k.color}07` : `${k.color}04` }}>
            <div className="flex items-center gap-2 mb-2">
              <k.icon className="h-4 w-4" style={{ color: k.color }} />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground leading-snug">{k.label}</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
            <div className="flex items-center gap-1.5 mt-1">
              {(k as { critical?: boolean }).critical
                ? <Badge className="text-[9px] bg-red-600 text-white border-0">Критично</Badge>
                : k.ok
                ? <Badge className="text-[9px] bg-emerald-500/15 text-emerald-500 border-0">В норме</Badge>
                : null
              }
              {k.sub && <span className="text-[10px] text-muted-foreground">{k.sub}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Dynamics chart */}
      <div>
        <SectionTitle>Динамика надёжности 2020–2024</SectionTitle>
        <div className="rounded-xl border p-4" style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={reliabilityData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left"  domain={[97, 99.5]} tick={{ fontSize: 11 }} unit="%" width={45} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 50]} tick={{ fontSize: 11 }} unit=" шт" width={40} />
              <Tooltip
                formatter={(v: number, name: string) => {
                  if (name === 'ga')      return [`${v}%`, 'GA']
                  if (name === 'ait')     return [`${v} ч`, 'AIT']
                  if (name === 'outages') return [`${v} шт`, 'Отключений']
                  return [v, name]
                }}
              />
              <Legend formatter={(v) => v === 'ga' ? 'GA, %' : v === 'ait' ? 'AIT, ч' : 'Отключений'} wrapperStyle={{ fontSize: 11 }} />
              <Line yAxisId="left"  type="monotone" dataKey="ga"      stroke={tiffany}   strokeWidth={2} dot={{ r: 4 }} />
              <Line yAxisId="left"  type="monotone" dataKey="ait"     stroke="#f59e0b"   strokeWidth={2} dot={{ r: 4 }} />
              <Bar  yAxisId="right" dataKey="outages" fill="#ef444440" radius={[3, 3, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Wear table */}
      <div>
        <SectionTitle>Износ оборудования НЭС по типам</SectionTitle>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                {['Тип оборудования', 'Кол-во', 'Износ %', 'Под замену', 'Приоритет'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {wearData.map((row, i) => {
                const rowBg = row.wear > 60
                  ? (isDark ? 'rgba(239,68,68,0.07)' : 'rgba(239,68,68,0.05)')
                  : row.wear >= 40
                  ? (isDark ? 'rgba(245,158,11,0.07)' : 'rgba(245,158,11,0.05)')
                  : 'transparent'
                return (
                  <tr key={i} className="border-b last:border-0" style={{ background: rowBg }}>
                    <td className="px-4 py-2.5 font-medium">{row.type}</td>
                    <td className="px-4 py-2.5 tabular-nums">{row.count.toLocaleString('ru-RU')}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full"
                            style={{
                              width: `${row.wear}%`,
                              background: row.wear > 60 ? '#ef4444' : row.wear >= 40 ? '#f59e0b' : '#10b981',
                            }} />
                        </div>
                        <span className={`font-semibold ${row.wear > 60 ? 'text-red-500' : row.wear >= 40 ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {row.wear}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">{row.replace.toLocaleString('ru-RU')}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium
                        ${row.priority === 'Высокий' ? 'bg-red-500/15 text-red-400' :
                          row.priority === 'Средний' ? 'bg-amber-500/15 text-amber-500' :
                          'bg-emerald-500/15 text-emerald-500'}`}>
                        {row.priority}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Risk cards */}
      <div>
        <SectionTitle>Ключевые вызовы из Стратегии 2023–2032</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {risks.map((r, i) => (
            <div key={i} className="rounded-xl border p-4"
              style={{ borderColor: `${r.color}35`, background: isDark ? `${r.color}09` : `${r.color}05` }}>
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: r.color }} />
                <h4 className="text-xs font-semibold leading-snug">{r.title}</h4>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug mb-3">{r.text}</p>
              <Badge className="text-[9px] border-0 font-medium"
                style={{ background: `${r.color}20`, color: r.color }}>
                {r.badge}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════ MAIN ══ */

export default function ProductionProgramKEGOC() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="flex flex-col gap-5 p-5 min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Производственная программа</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            АО «KEGOC» · Данные годовых отчётов 2023–2024
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-[10px]" style={{ borderColor: '#0d948840', color: '#0d9488' }}>
            <Target className="h-3 w-3 mr-1" />Стратегия 2023–2032
          </Badge>
          <Badge variant="outline" className="text-[10px]" style={{ borderColor: '#6366f140', color: '#6366f1' }}>
            <Shield className="h-3 w-3 mr-1" />ЕЭС РК
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="services" className="flex-1">
        <TabsList className="flex w-full h-auto flex-wrap gap-1 bg-muted/50 p-1 rounded-xl">
          {[
            { value: 'services',    label: 'Системные услуги' },
            { value: 'strategy',   label: 'Стратегические цели' },
            { value: 'investment', label: 'Инвестпрограмма' },
            { value: 'balancing',  label: 'Балансирующий рынок' },
            { value: 'reliability',label: 'Надёжность НЭС' },
          ].map((t) => (
            <TabsTrigger key={t.value} value={t.value}
              className="flex-1 min-w-[120px] text-xs font-medium data-[state=active]:shadow-sm">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-5">
          <TabsContent value="services"    className="mt-0"><TabServices /></TabsContent>
          <TabsContent value="strategy"   className="mt-0"><TabStrategy /></TabsContent>
          <TabsContent value="investment" className="mt-0"><TabInvestment /></TabsContent>
          <TabsContent value="balancing"  className="mt-0"><TabBalancing /></TabsContent>
          <TabsContent value="reliability"className="mt-0"><TabReliability /></TabsContent>
        </div>
      </Tabs>

      {/* Footer */}
      <p className="text-[10px] text-muted-foreground border-t pt-3">
        Источник: Годовые отчёты АО «KEGOC» 2023–2024, Стратегия АО «KEGOC» 2023–2032.
        Данные 2025 г. — плановые показатели согласно утверждённой производственной программе.
      </p>
    </div>
  )
}

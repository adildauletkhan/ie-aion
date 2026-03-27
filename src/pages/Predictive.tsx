import { useState, useMemo } from 'react'
import {
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, BarChart, Bar, Cell, ComposedChart, Area, AreaChart,
  ReferenceLine, Line,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  AlertTriangle, BrainCircuit, Activity, CheckCircle2, Shield,
  Zap, TrendingUp, TrendingDown, ArrowRight, FileText,
  Radio, Wrench, BarChart3, Gauge,
} from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { toast } from 'sonner'

/* ═══════════════════════════════════════════════════════════════════════════
   MOCK DATA — Tab 1: Equipment Failures
   ═══════════════════════════════════════════════════════════════════════════ */

const failurePredictions = [
  {
    object: 'ПС 500кВ Экибастуз — AT-1',
    type: 'Автотрансформатор 500 кВ',
    region: 'Центральный',
    failureProbability: 87,
    ttf: 12,
    wear: 71,
    lastMaintenance: '2024-08-15',
    nextScheduled: '2025-06-01',
    anomaly: 'Повышенная температура масла +4.2°C, вибрация обмоток',
    priority: 'Критичный' as const,
    action: 'Внеплановый осмотр',
  },
  {
    object: 'ПС 220кВ Жезказган — В-110',
    type: 'Выключатель 110 кВ',
    region: 'Центральный',
    failureProbability: 74,
    ttf: 18,
    wear: 65,
    lastMaintenance: '2024-06-20',
    nextScheduled: '2025-06-20',
    anomaly: 'Ложное срабатывание РЗА (2 раза за 30 дней)',
    priority: 'Критичный' as const,
    action: 'Замена РЗА блока',
  },
  {
    object: 'ВЛ 500кВ Экибастуз — Агадырь, опора №247',
    type: 'Линия электропередачи 500 кВ',
    region: 'Центральный',
    failureProbability: 61,
    ttf: 28,
    wear: 58,
    lastMaintenance: '2024-11-10',
    nextScheduled: '2025-11-10',
    anomaly: 'Коррозия заземления, провис провода выше нормы',
    priority: 'Высокий' as const,
    action: 'Плановый объезд + замеры',
  },
  {
    object: 'ПС 500кВ Северная (Астана) — AT-2',
    type: 'Автотрансформатор 500 кВ',
    region: 'Центральный',
    failureProbability: 54,
    ttf: 35,
    wear: 68,
    lastMaintenance: '2024-09-05',
    nextScheduled: '2025-09-05',
    anomaly: 'Растворённые газы в масле — водород +18%',
    priority: 'Высокий' as const,
    action: 'Хроматографический анализ масла',
  },
  {
    object: 'ПС 220кВ Актобе — СШ-220',
    type: 'Сборные шины 220 кВ',
    region: 'Западный',
    failureProbability: 48,
    ttf: 42,
    wear: 55,
    lastMaintenance: '2024-07-12',
    nextScheduled: '2025-07-12',
    anomaly: 'Нагрев контактных соединений по тепловизору',
    priority: 'Высокий' as const,
    action: 'Подтяжка контактов при плановом ТО',
  },
  {
    object: 'ВЛ 220кВ Шымкент — Тараз, опора №89',
    type: 'Линия электропередачи 220 кВ',
    region: 'Южный',
    failureProbability: 38,
    ttf: 55,
    wear: 52,
    lastMaintenance: '2024-10-20',
    nextScheduled: '2025-10-20',
    anomaly: 'Повреждение грозозащитного троса',
    priority: 'Средний' as const,
    action: 'Включить в план ремонтов Q3 2025',
  },
  {
    object: 'ПС 110кВ Алматы-Север — В-34',
    type: 'Выключатель 110 кВ',
    region: 'Алматы',
    failureProbability: 29,
    ttf: 74,
    wear: 44,
    lastMaintenance: '2025-01-08',
    nextScheduled: '2025-07-08',
    anomaly: 'Износ дугогасительных камер по числу отключений',
    priority: 'Средний' as const,
    action: 'Плановая ревизия',
  },
]

const regionRisk = [
  { region: 'Центральный', critical: 3, high: 8, medium: 12 },
  { region: 'Южный', critical: 1, high: 5, medium: 9 },
  { region: 'Западный', critical: 2, high: 4, medium: 7 },
  { region: 'Алматы', critical: 1, high: 3, medium: 6 },
  { region: 'Восточный', critical: 0, high: 3, medium: 5 },
]

/* ═══════════════════════════════════════════════════════════════════════════
   MOCK DATA — Tab 2: Production KPIs
   ═══════════════════════════════════════════════════════════════════════════ */

const forecast2025 = [
  { service: 'Передача э/э по НЭС', unit: 'млрд кВт·ч', plan: 20.1, forecastYE: 20.4, currentPace: 19.8, delta: '+1.5%', trend: 'up' as const, risk: 'Низкий' },
  { service: 'Пользование НЭС', unit: 'млрд кВт·ч', plan: 78.2, forecastYE: 77.8, currentPace: 76.1, delta: '-0.5%', trend: 'down' as const, risk: 'Средний' },
  { service: 'Техническая диспетчеризация', unit: 'млрд кВт·ч', plan: 114.5, forecastYE: 116.2, currentPace: 112.8, delta: '+1.5%', trend: 'up' as const, risk: 'Низкий' },
  { service: 'Организация балансирования', unit: 'млрд кВт·ч', plan: 215.0, forecastYE: 213.4, currentPace: 209.7, delta: '-0.7%', trend: 'down' as const, risk: 'Средний' },
]

const monthlyForecast = [
  { month: 'Янв', plan: 9.8, fact: 9.6, forecast: null },
  { month: 'Фев', plan: 9.2, fact: 9.4, forecast: null },
  { month: 'Мар', plan: 9.5, fact: null, forecast: 9.7 },
  { month: 'Апр', plan: 8.8, fact: null, forecast: 9.0 },
  { month: 'Май', plan: 8.2, fact: null, forecast: 8.4 },
  { month: 'Июн', plan: 7.8, fact: null, forecast: 8.1 },
  { month: 'Июл', plan: 8.1, fact: null, forecast: 8.3 },
  { month: 'Авг', plan: 8.4, fact: null, forecast: 8.6 },
  { month: 'Сен', plan: 8.9, fact: null, forecast: 9.1 },
  { month: 'Окт', plan: 9.6, fact: null, forecast: 9.8 },
  { month: 'Ноя', plan: 10.2, fact: null, forecast: 10.4 },
  { month: 'Дек', plan: 11.5, fact: null, forecast: 11.2 },
]

const influenceFactors = [
  { label: 'Рост майнинговых нагрузок', impact: '+2.8 млрд кВт·ч', positive: true },
  { label: 'Межгосударственный транзит РФ-КЗ-КГ', impact: '+0.4 млрд кВт·ч', positive: true },
  { label: 'Тёплая зима 2025 — снижение бытового потребления', impact: '-1.2 млрд кВт·ч', positive: false },
  { label: 'Плановые ремонты ВЛ Q2 2025', impact: '-0.6 млрд кВт·ч', positive: false },
  { label: 'Подключение новых ВИЭ объектов (СЭС Туркестан)', impact: '+0.3 млрд кВт·ч', positive: true },
]

/* ═══════════════════════════════════════════════════════════════════════════
   MOCK DATA — Tab 3: Chain Reliability
   ═══════════════════════════════════════════════════════════════════════════ */

const reliabilityTrend = [
  { year: '2020', ga: 97.8, ait: 3.1 },
  { year: '2021', ga: 98.1, ait: 2.9 },
  { year: '2022', ga: 97.9, ait: 3.0 },
  { year: '2023', ga: 98.2, ait: 2.7 },
  { year: '2024', ga: 98.4, ait: 2.3 },
  { year: '2025П', ga: 98.6, ait: 2.1 },
]

const criticalNodes = [
  { node: 'ПС 500кВ Экибастуз (НЭС)', voltage: '1150/500 кВ', connectedLoad: '8 400 МВт', redundancy: 'N-1', riskScore: 9.2, consequence: 'Отключение Центрального и Северного РЭС', status: 'Критичный' },
  { node: 'ВЛ 500кВ Экибастуз — Агадырь', voltage: '500 кВ', connectedLoad: '4 100 МВт', redundancy: 'N-0 (одноцепная)', riskScore: 8.4, consequence: 'Разрыв связи Север-Центр ЕЭС РК', status: 'Критичный' },
  { node: 'ПС 500кВ Северная (Астана)', voltage: '500/220 кВ', connectedLoad: '3 200 МВт', redundancy: 'N-1', riskScore: 7.8, consequence: 'Перебои в столичном регионе', status: 'Высокий' },
  { node: 'ВЛ 500кВ граница РФ-КЗ (Рубцовск)', voltage: '500 кВ', connectedLoad: 'Межсистемная связь', redundancy: 'N-1', riskScore: 7.2, consequence: 'Потеря параллельной работы с ЕЭС РФ', status: 'Высокий' },
  { node: 'ПС 500кВ Алма (Алматы)', voltage: '500/220 кВ', connectedLoad: '2 800 МВт', redundancy: 'N-1', riskScore: 6.1, consequence: 'Частичное отключение Алматинского региона', status: 'Высокий' },
]

const reliabilityAlerts = [
  { status: 'critical' as const, text: 'ПС 500кВ Экибастуз AT-1 — температура масла выше нормы на 4.2°C. Вероятность отказа 87% в течение 12 дней.' },
  { status: 'warning' as const, text: 'ПС 110кВ Жезказган — просрочена плановая проверка РЗА на 4 дня.' },
  { status: 'warning' as const, text: 'ВЛ 220кВ Шымкент-Тараз — прогноз гололёда 23-24 марта, нагрузка на провод приближается к допустимой.' },
  { status: 'normal' as const, text: 'Межсистемная связь РК-РФ — работает штатно, сальдо перетока в норме.' },
]

/* ═══════════════════════════════════════════════════════════════════════════
   MOCK DATA — Tab 4: Load & Balance
   ═══════════════════════════════════════════════════════════════════════════ */

function buildLoad72h() {
  const hourlyBase = [
    9700, 9500, 9350, 9280, 9300, 9600, 10400,
    11600, 12800, 13500, 13900, 14200, 14100, 13800,
    13600, 13500, 13700, 14100, 14400, 14500, 14200,
    13500, 12400, 11100,
  ]
  const now = new Date()
  const currentHour = now.getHours()
  now.setMinutes(0, 0, 0)
  const data: { time: string; load: number | null; forecast: number | null; upper: number; lower: number; isPeak: boolean }[] = []
  for (let i = 0; i < 72; i++) {
    const t = new Date(now.getTime() + (i - currentHour) * 3600_000)
    const h = t.getHours()
    const label = `${t.getDate().toString().padStart(2, '0')}.${(t.getMonth() + 1).toString().padStart(2, '0')} ${h.toString().padStart(2, '0')}:00`
    const base = hourlyBase[h]
    const dayFactor = [0, 6].includes(t.getDay()) ? 0.93 : 1.0
    const val = Math.round(base * dayFactor + (Math.random() - 0.5) * 180)
    const isFuture = i > currentHour
    data.push({
      time: label,
      load: isFuture ? null : val,
      forecast: isFuture ? val : null,
      upper: Math.round(val * 1.05),
      lower: Math.round(val * 0.95),
      isPeak: val > 13000,
    })
  }
  return data
}

const load72hData = buildLoad72h()

const balancingForecast = [
  { month: 'Янв 25', imbalance: 182.4, cost: 3240, forecast: false },
  { month: 'Фев 25', imbalance: 168.2, cost: 2980, forecast: false },
  { month: 'Мар 25', imbalance: 195.1, cost: 3510, forecast: true },
  { month: 'Апр 25', imbalance: 178.3, cost: 3180, forecast: true },
  { month: 'Май 25', imbalance: 162.8, cost: 2890, forecast: true },
  { month: 'Июн 25', imbalance: 155.4, cost: 2760, forecast: true },
]

const imbalanceRiskFactors = [
  { factor: 'Низкая ветровая генерация (прогноз)', period: '23-25 мар', impact: '+240 МВт дефицит', recommendation: 'Запросить резерв у ИнтерРАО' },
  { factor: 'Плановое отключение ВЛ Экибастуз', period: '1-5 апр', impact: '+180 МВт перегрузка', recommendation: 'Перераспределить потоки через ПС Северная' },
  { factor: 'Рост майнинговых нагрузок (Карагандинская обл.)', period: 'Апр-Май', impact: '+320 МВт сверхплана', recommendation: 'Пересмотр прогноза потребления' },
  { factor: 'Пуск СЭС Туркестан 100 МВт', period: 'Май 2025', impact: '-100 МВт → профицит', recommendation: 'Обновить модель балансирования' },
  { factor: 'Параллельная работа с ЕЭС РФ (ограничение)', period: 'Июн-Авг', impact: '+150 МВт риск', recommendation: 'Мониторинг договора с ИнтерРАО' },
]

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

const PRIORITY_STYLE: Record<string, string> = {
  'Критичный': 'bg-red-500/15 text-red-400 border-red-500/30',
  'Высокий': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  'Средний': 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  'Низкий': 'bg-muted text-muted-foreground border-border',
}

const RISK_STYLE: Record<string, string> = {
  'Низкий': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'Средний': 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
}

const STATUS_COLOR = { critical: '#ef4444', warning: '#f59e0b', normal: '#22c55e' }

type EquipmentType = 'Все' | 'Трансформаторы' | 'Выключатели' | 'РЗА' | 'ЛЭП'
type PriorityFilter = 'Все' | 'Критичный' | 'Высокий' | 'Средний'
type RegionFilter = 'Все' | 'Центральный' | 'Южный' | 'Западный' | 'Восточный' | 'Алматы'

function matchEquipmentType(type: string, filter: EquipmentType): boolean {
  if (filter === 'Все') return true
  if (filter === 'Трансформаторы') return type.toLowerCase().includes('трансформатор')
  if (filter === 'Выключатели') return type.toLowerCase().includes('выключатель')
  if (filter === 'РЗА') return type.toLowerCase().includes('рза') || type.toLowerCase().includes('шины')
  if (filter === 'ЛЭП') return type.toLowerCase().includes('линия')
  return true
}

function probColor(p: number) {
  if (p >= 70) return '#ef4444'
  if (p >= 40) return '#f59e0b'
  return '#22c55e'
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export default function Predictive() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'
  const tickColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)'
  const tooltipBg = isDark ? '#0c1220' : '#fff'
  const tooltipBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'

  const [activeTab, setActiveTab] = useState('failures')
  const [period, setPeriod] = useState('30 дней')
  const [eqType, setEqType] = useState<EquipmentType>('Все')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('Все')
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('Все')

  const filteredFailures = useMemo(() =>
    failurePredictions.filter(r =>
      matchEquipmentType(r.type, eqType) &&
      (priorityFilter === 'Все' || r.priority === priorityFilter) &&
      (regionFilter === 'Все' || r.region === regionFilter)
    ), [eqType, priorityFilter, regionFilter])

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: isDark ? 'rgba(92,224,214,0.12)' : 'rgba(13,148,136,0.1)', color: isDark ? '#5CE0D6' : '#0D9488' }}
          >
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Предиктивная аналитика — АО «KEGOC»</h1>
            <p className="text-xs text-muted-foreground">ML-прогнозирование на основе SCADA, SAP PM, EMS, метеоданных</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">SCADA подключена ✓</Badge>
          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">SAP PM синхронизирован ✓</Badge>
          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Метеоданные обновлены 15 мин назад ✓</Badge>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => toast('Отчёт формируется...')}>
            <FileText className="h-3.5 w-3.5" /> Сгенерировать отчёт
          </Button>
        </div>
      </div>

      {/* ── Period selector ────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground mr-1">Горизонт прогноза:</span>
        {['7 дней', '30 дней', '90 дней', 'Год'].map(p => (
          <Button
            key={p}
            size="sm"
            variant={period === p ? 'default' : 'outline'}
            className="h-6 text-[11px] px-2.5"
            onClick={() => setPeriod(p)}
          >{p}</Button>
        ))}
      </div>

      {/* ── Tabs ──────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="failures" className="text-xs gap-1.5"><Wrench className="h-3.5 w-3.5" /> Отказы оборудования</TabsTrigger>
          <TabsTrigger value="kpi" className="text-xs gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Производственные показатели</TabsTrigger>
          <TabsTrigger value="reliability" className="text-xs gap-1.5"><Shield className="h-3.5 w-3.5" /> Надёжность цепочки</TabsTrigger>
          <TabsTrigger value="load" className="text-xs gap-1.5"><Gauge className="h-3.5 w-3.5" /> Нагрузка и баланс</TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════
            TAB 1: EQUIPMENT FAILURES
            ═══════════════════════════════════════════════════════ */}
        <TabsContent value="failures" className="space-y-5 mt-4">
          <div>
            <h2 className="text-base font-semibold">Предиктивное техническое обслуживание — НЭС РК</h2>
            <p className="text-xs text-muted-foreground">ML-модель на основе данных SCADA, SAP PM, паспортов оборудования</p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <FilterSelect label="Тип оборудования" value={eqType} options={['Все', 'Трансформаторы', 'Выключатели', 'РЗА', 'ЛЭП']} onChange={v => setEqType(v as EquipmentType)} />
            <FilterSelect label="Приоритет" value={priorityFilter} options={['Все', 'Критичный', 'Высокий', 'Средний']} onChange={v => setPriorityFilter(v as PriorityFilter)} />
            <FilterSelect label="РЭС" value={regionFilter} options={['Все', 'Центральный', 'Южный', 'Западный', 'Восточный', 'Алматы']} onChange={v => setRegionFilter(v as RegionFilter)} />
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard label="Объектов под мониторингом" value="4 500" color="#5CE0D6" icon={<Radio className="h-4 w-4" />} />
            <SummaryCard label="Критичных предупреждений" value="7" color="#ef4444" icon={<AlertTriangle className="h-4 w-4" />} />
            <SummaryCard label="Требует внимания" value="23" color="#f59e0b" icon={<AlertTriangle className="h-4 w-4" />} />
            <SummaryCard label="Запланировано ТОиР на неделю" value="12" color="#3b82f6" icon={<Wrench className="h-4 w-4" />} />
          </div>

          {/* Failure table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Прогноз отказов — ТОП объекты</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Объект / тип</TableHead>
                      <TableHead>РЭС</TableHead>
                      <TableHead className="text-right">Вероятность %</TableHead>
                      <TableHead className="text-right">TTF, дн.</TableHead>
                      <TableHead className="text-right">Износ %</TableHead>
                      <TableHead className="min-w-[220px]">Аномалия</TableHead>
                      <TableHead className="text-center">Приоритет</TableHead>
                      <TableHead className="min-w-[160px]">Рекомендация</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFailures.map(r => (
                      <TableRow key={r.object}>
                        <TableCell>
                          <div className="font-medium text-sm">{r.object}</div>
                          <div className="text-xs text-muted-foreground">{r.type}</div>
                        </TableCell>
                        <TableCell className="text-sm">{r.region}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-1.5 rounded-full" style={{ width: `${Math.round(r.failureProbability * 0.7)}px`, background: probColor(r.failureProbability) }} />
                            <span style={{ color: probColor(r.failureProbability) }}>{r.failureProbability}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{r.ttf}</TableCell>
                        <TableCell className="text-right">{r.wear}%</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.anomaly}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={PRIORITY_STYLE[r.priority]}>{r.priority}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{r.action}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" className="h-7 text-[10px] whitespace-nowrap" onClick={() => toast.success(`Задача создана в SAP PM: ${r.object}`)}>
                            Создать в SAP PM
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Region risk chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Распределение вероятностей отказов по РЭС</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={regionRisk} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                    <XAxis type="number" tick={{ fill: tickColor, fontSize: 11 }} />
                    <YAxis type="category" dataKey="region" tick={{ fill: tickColor, fontSize: 11 }} width={100} />
                    <Tooltip contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="critical" name="Критичный" fill="#ef4444" stackId="a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="high" name="Высокий" fill="#f59e0b" stackId="a" />
                    <Bar dataKey="medium" name="Средний" fill={isDark ? '#374151' : '#d1d5db'} stackId="a" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Data sources */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground mr-1">Источники данных для ML-модели:</span>
            {['SCADA / EMS', 'SAP PM (история ТОиР)', 'Тепловизионный контроль', 'Хроматографический анализ масла'].map(s => (
              <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
            ))}
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════
            TAB 2: PRODUCTION KPIs
            ═══════════════════════════════════════════════════════ */}
        <TabsContent value="kpi" className="space-y-5 mt-4">
          <div>
            <h2 className="text-base font-semibold">Прогноз выполнения плана системных услуг — 2025</h2>
          </div>

          {/* Forecast cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {forecast2025.map(f => (
              <Card key={f.service}>
                <CardContent className="pt-4 pb-3 px-4 space-y-3">
                  <div className="text-sm font-medium leading-tight">{f.service}</div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground">План 2025</div>
                      <div className="font-semibold text-sm">{f.plan.toFixed(1)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Прогноз ГИ</div>
                      <div className="font-semibold text-sm">{f.forecastYE.toFixed(1)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Текущий темп</div>
                      <div className="font-semibold text-sm">{f.currentPace.toFixed(1)}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs">
                      {f.trend === 'up'
                        ? <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                        : <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                      }
                      <span className={f.trend === 'up' ? 'text-emerald-400' : 'text-red-400'}>{f.delta}</span>
                      <span className="text-muted-foreground ml-1">{f.unit}</span>
                    </div>
                    <Badge variant="outline" className={RISK_STYLE[f.risk] ?? PRIORITY_STYLE[f.risk]}>{f.risk}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Monthly chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Прогноз vs план по месяцам 2025 (млрд кВт·ч — диспетчеризация)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyForecast} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="month" tick={{ fill: tickColor, fontSize: 11 }} />
                    <YAxis tick={{ fill: tickColor, fontSize: 11 }} domain={[6, 13]} tickFormatter={v => `${v}`} width={35} />
                    <Tooltip contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <ReferenceLine x="Фев" stroke={isDark ? '#5CE0D6' : '#0D9488'} strokeDasharray="4 4" label={{ value: 'Сегодня', fill: tickColor, fontSize: 10, position: 'top' }} />
                    <Line type="monotone" dataKey="plan" name="План" stroke={isDark ? '#6b7280' : '#9ca3af'} strokeDasharray="6 3" strokeWidth={2} dot={false} />
                    <Bar dataKey="fact" name="Факт" fill="#3b82f6" radius={[3, 3, 0, 0]} barSize={24} />
                    <Bar dataKey="forecast" name="Прогноз" fill="#3b82f680" radius={[3, 3, 0, 0]} barSize={24} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Influence factors */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Факторы влияния на выполнение плана</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {influenceFactors.map(f => (
                  <div key={f.label} className="flex items-start gap-3 rounded-lg border p-3" style={{ borderColor: f.positive ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)', background: f.positive ? (isDark ? 'rgba(34,197,94,0.05)' : 'rgba(34,197,94,0.03)') : (isDark ? 'rgba(239,68,68,0.05)' : 'rgba(239,68,68,0.03)') }}>
                    {f.positive
                      ? <TrendingUp className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                      : <TrendingDown className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                    }
                    <div>
                      <div className="text-xs font-medium">{f.label}</div>
                      <div className={`text-sm font-semibold mt-0.5 ${f.positive ? 'text-emerald-400' : 'text-red-400'}`}>{f.impact}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════
            TAB 3: CHAIN RELIABILITY
            ═══════════════════════════════════════════════════════ */}
        <TabsContent value="reliability" className="space-y-5 mt-4">
          <div>
            <h2 className="text-base font-semibold">Сквозной мониторинг надёжности — от генерации до потребителя</h2>
          </div>

          {/* Chain flow visualization */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-0">
            {[
              { label: 'Генерация ТЭС/ВИЭ', kpi: 'Доступность 96.8%', sub: 'Риск нехватки манёвр. мощности', status: 'warning' as const, icon: <Zap className="h-5 w-5" /> },
              { label: 'НЭС 500/220 кВ (KEGOC)', kpi: 'GA 98.4%', sub: 'Износ 62.4% · 7 критич. предупр.', status: 'warning' as const, icon: <Activity className="h-5 w-5" /> },
              { label: 'РЭС 110/35 кВ', kpi: 'AIT 2.3 ч', sub: 'Среднее время восстановления ✓', status: 'normal' as const, icon: <Radio className="h-5 w-5" /> },
              { label: 'Потребитель', kpi: 'SAIDI 3.2 ч/год', sub: 'SAIFI 1.4 отк/год ✓', status: 'normal' as const, icon: <CheckCircle2 className="h-5 w-5" /> },
            ].map((block, i) => (
              <div key={block.label} className="flex items-stretch">
                <div
                  className="flex-1 rounded-xl border p-4 space-y-2 min-h-[120px]"
                  style={{
                    borderColor: `${STATUS_COLOR[block.status]}30`,
                    background: isDark ? `${STATUS_COLOR[block.status]}08` : `${STATUS_COLOR[block.status]}05`,
                  }}
                >
                  <div className="flex items-center gap-2" style={{ color: STATUS_COLOR[block.status] }}>
                    {block.icon}
                    <span className="text-xs font-semibold">{block.label}</span>
                  </div>
                  <div className="text-lg font-bold">{block.kpi}</div>
                  <div className="text-[11px] text-muted-foreground">{block.sub}</div>
                </div>
                {i < 3 && (
                  <div className="hidden md:flex items-center px-1">
                    <ArrowRight className="h-5 w-5 text-muted-foreground/40" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* GA / AIT trend chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Динамика GA и AIT 2020–2024 с прогнозом 2025</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={reliabilityTrend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="year" tick={{ fill: tickColor, fontSize: 11 }} />
                    <YAxis yAxisId="ga" domain={[97, 99.5]} tick={{ fill: tickColor, fontSize: 11 }} tickFormatter={v => `${v}%`} width={45} />
                    <YAxis yAxisId="ait" orientation="right" domain={[1.5, 3.5]} tick={{ fill: tickColor, fontSize: 11 }} tickFormatter={v => `${v} ч`} width={40} />
                    <Tooltip contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line yAxisId="ga" type="monotone" dataKey="ga" name="GA, %" stroke="#5CE0D6" strokeWidth={2} dot={{ r: 4, fill: '#5CE0D6' }} />
                    <Bar yAxisId="ait" dataKey="ait" name="AIT, ч" fill={isDark ? '#3b82f640' : '#3b82f630'} radius={[3, 3, 0, 0]} barSize={28} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Critical nodes table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Критические узлы НЭС — риск каскадного отказа</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Узел</TableHead>
                      <TableHead>Напряжение</TableHead>
                      <TableHead>Нагрузка</TableHead>
                      <TableHead>Резервирование</TableHead>
                      <TableHead className="min-w-[130px]">Risk Score</TableHead>
                      <TableHead className="min-w-[220px]">Последствие отказа</TableHead>
                      <TableHead className="text-center">Статус</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {criticalNodes.map(n => (
                      <TableRow key={n.node}>
                        <TableCell className="font-medium text-sm">{n.node}</TableCell>
                        <TableCell className="text-sm">{n.voltage}</TableCell>
                        <TableCell className="text-sm">{n.connectedLoad}</TableCell>
                        <TableCell className="text-sm">{n.redundancy}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={n.riskScore * 10} className="h-2 flex-1" style={{ '--progress-color': n.riskScore >= 8 ? '#ef4444' : n.riskScore >= 6 ? '#f59e0b' : '#22c55e' } as React.CSSProperties} />
                            <span className="text-xs font-mono w-6 text-right">{n.riskScore}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{n.consequence}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={PRIORITY_STYLE[n.status]}>{n.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Reliability alerts */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              Алерты надёжности прямо сейчас
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {reliabilityAlerts.map((a, i) => {
                const c = STATUS_COLOR[a.status]
                const Icon = a.status === 'normal' ? CheckCircle2 : AlertTriangle
                return (
                  <div
                    key={i}
                    className="rounded-xl border p-4 flex items-start gap-3"
                    style={{ borderColor: `${c}30`, background: isDark ? `${c}08` : `${c}05` }}
                  >
                    <Icon className="h-4 w-4 mt-0.5 shrink-0" style={{ color: c }} />
                    <p className="text-xs leading-relaxed">{a.text}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════
            TAB 4: LOAD & BALANCE
            ═══════════════════════════════════════════════════════ */}
        <TabsContent value="load" className="space-y-5 mt-4">
          <div>
            <h2 className="text-base font-semibold">Прогноз нагрузки ЕЭС РК и управление дисбалансами</h2>
          </div>

          {/* Current status cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <SummaryCard label="Текущая нагрузка ЕЭС" value="13 240 МВт" sub="пиковая зона ⚠" color="#f59e0b" icon={<Zap className="h-4 w-4" />} />
            <SummaryCard label="Прогноз пика сегодня" value="13 850 МВт" sub="в 19:00" color="#3b82f6" icon={<TrendingUp className="h-4 w-4" />} />
            <SummaryCard label="Доступный резерв" value="1 420 МВт" sub="норма ✓" color="#22c55e" icon={<CheckCircle2 className="h-4 w-4" />} />
          </div>

          {/* 72h load chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Прогноз нагрузки ЕЭС РК на 72 часа</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={load72hData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="peakGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="loadGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#5CE0D6" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#5CE0D6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="time" tick={{ fill: tickColor, fontSize: 9 }} interval={5} tickLine={false} />
                    <YAxis
                      tick={{ fill: tickColor, fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={v => `${(v / 1000).toFixed(1)}`}
                      width={35}
                      domain={[8000, 16000]}
                      label={{ value: 'ГВт', angle: -90, position: 'insideLeft', fill: tickColor, fontSize: 10, dx: -5 }}
                    />
                    <Tooltip
                      contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8, fontSize: 12 }}
                      formatter={(value: number | null) => value ? [`${value.toLocaleString('ru-RU')} МВт`] : ['—']}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <ReferenceLine y={13000} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Пиковая зона 13 ГВт', fill: '#ef4444', fontSize: 10, position: 'right' }} />
                    <Area type="monotone" dataKey="upper" name="Верхняя граница +5%" stroke="#ef444440" fill="none" strokeDasharray="4 3" dot={false} />
                    <Area type="monotone" dataKey="lower" name="Нижняя граница -5%" stroke="#22c55e40" fill="none" strokeDasharray="4 3" dot={false} />
                    <Area type="monotone" dataKey="load" name="Факт" stroke="#5CE0D6" strokeWidth={2} fill="url(#loadGrad)" dot={false} connectNulls={false} />
                    <Area type="monotone" dataKey="forecast" name="Прогноз" stroke="#FACC15" strokeWidth={2} strokeDasharray="5 3" fill="none" dot={false} connectNulls={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Располагаемая мощность ЕЭС: 22 844 МВт · ночная впадина ≈ 9 300 МВт · дневной пик ≈ 14 500 МВт
              </p>
            </CardContent>
          </Card>

          {/* Balancing forecast */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Прогноз дисбалансов и затрат на балансирование</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={balancingForecast} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="month" tick={{ fill: tickColor, fontSize: 11 }} />
                    <YAxis yAxisId="imb" tick={{ fill: tickColor, fontSize: 10 }} width={50} tickFormatter={v => `${v}`} label={{ value: 'млн кВт·ч', angle: -90, position: 'insideLeft', fill: tickColor, fontSize: 9, dx: -10 }} />
                    <YAxis yAxisId="cost" orientation="right" tick={{ fill: tickColor, fontSize: 10 }} width={55} tickFormatter={v => `${v}`} label={{ value: 'млн ₸', angle: 90, position: 'insideRight', fill: tickColor, fontSize: 9, dx: 10 }} />
                    <Tooltip contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar yAxisId="imb" dataKey="imbalance" name="Дисбаланс, млн кВт·ч" radius={[3, 3, 0, 0]} barSize={32}>
                      {balancingForecast.map((entry, idx) => (
                        <Cell key={idx} fill={entry.forecast ? '#3b82f660' : '#3b82f6'} />
                      ))}
                    </Bar>
                    <Line yAxisId="cost" type="monotone" dataKey="cost" name="Затраты, млн ₸" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4, fill: '#f59e0b' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Imbalance risk factors */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Факторы риска дисбалансов</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[250px]">Фактор</TableHead>
                      <TableHead>Период</TableHead>
                      <TableHead>Влияние на дисбаланс</TableHead>
                      <TableHead className="min-w-[250px]">Рекомендация</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {imbalanceRiskFactors.map(r => (
                      <TableRow key={r.factor}>
                        <TableCell className="text-sm font-medium">{r.factor}</TableCell>
                        <TableCell className="text-sm">{r.period}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={r.impact.startsWith('+') ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}>
                            {r.impact}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.recommendation}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   SMALL HELPER COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

function SummaryCard({ label, value, sub, color, icon }: { label: string; value: string; sub?: string; color: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18`, color }}>
          {icon}
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-lg font-bold" style={{ color }}>{value}</div>
          {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  )
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{label}:</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-7 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

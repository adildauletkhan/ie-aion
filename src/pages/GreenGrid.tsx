import { useState } from 'react'
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine,
} from 'recharts'
import { Badge }   from '@/components/ui/badge'
import { Button }  from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Leaf, CheckCircle2, AlertCircle, XCircle, Award, AlertTriangle,
  Download, Plus, TrendingUp, TrendingDown,
} from 'lucide-react'
import { useTheme }  from '@/hooks/useTheme'
import { useToast }  from '@/hooks/use-toast'

/* ── Types ─────────────────────────────────────────────────────────────────── */
type QueueStatus = 'connection' | 'construction' | 'design' | 'approval'
type CheckStatus = 'ok' | 'attention' | 'violation'
type PueFilter   = 'all' | CheckStatus

/* ── ВИЭ объекты ────────────────────────────────────────────────────────────── */
const VRE_SOURCES = [
  { name: 'СЭС Бурное (ТОО «Самрук-Энерго»)',        type: 'Солнечная', capacity: 100, output: 183.2, share: 5.3 },
  { name: 'ВЭС Ерейментау (АО «Самрук-Энерго»)',     type: 'Ветровая',  capacity: 300, output: 141.8, share: 4.1 },
  { name: 'СЭС Капчагай (ТОО «Enel Green Power»)',   type: 'Солнечная', capacity: 60,  output: 108.6, share: 3.1 },
  { name: 'СЭС Шымкент (ТОО «Corum»)',               type: 'Солнечная', capacity: 50,  output: 87.4,  share: 2.5 },
  { name: 'ВЭС Жунгарские ворота (АО «ЖЭС»)',        type: 'Ветровая',  capacity: 300, output: 62.1,  share: 1.8 },
  { name: 'ГЭС Бухтарминская (ТОО «Казцинк»)',       type: 'Гидро',     capacity: 675, output: 131.4, share: 3.8 },
  { name: 'ГЭС Усть-Каменогорская (ТОО «АЭС УК»)',   type: 'Гидро',     capacity: 331, output: 55.2,  share: 1.6 },
  { name: 'ГЭС Шульбинская (ТОО «АЭС ШГЭ»)',         type: 'Гидро',     capacity: 702, output: 73.3,  share: 2.1 },
  { name: 'Прочие СЭС/ВЭС (≤ 20 МВт)',               type: 'Смешанная', capacity: 210, output: 57.3,  share: 1.7 },
]

/* ── Структура выработки ────────────────────────────────────────────────────── */
const PIE_DATA = [
  { name: 'ТЭС (ГРЭС национального значения)', value: 45.2 },
  { name: 'ТЭЦ (промышленные и региональные)', value: 34.9 },
  { name: 'ГЭС',                               value: 6.5  },
  { name: 'ВЭС',                               value: 5.9  },
  { name: 'СЭС',                               value: 7.5  },
]
const PIE_COLORS = ['#6B7280', '#FB923C', '#60A5FA', '#5CE0D6', '#FACC15']

const STACK_BAR = [
  { label: 'ТЭС', value: 45.2, color: '#6B7280' },
  { label: 'ТЭЦ', value: 34.9, color: '#FB923C' },
  { label: 'ГЭС', value: 6.5,  color: '#60A5FA' },
  { label: 'ВЭС', value: 5.9,  color: '#5CE0D6' },
  { label: 'СЭС', value: 7.5,  color: '#FACC15' },
]

/* ── Очередь подключения ВИЭ ────────────────────────────────────────────────── */
const VRE_QUEUE: {
  name: string; type: string; power: number; region: string
  status: QueueStatus; date: string; res: string
}[] = [
  { name: 'СЭС Жанатас-2 (Samruk)',     type: 'Солнечная', power: 200, region: 'Жамбыл',    status: 'design',       date: 'Q3 2026', res: 'РЭС Южный'       },
  { name: 'ВЭС Шелек (Total Eren)',      type: 'Ветровая',  power: 500, region: 'Алматы',    status: 'construction', date: 'Q1 2027', res: 'РЭС Алматы'      },
  { name: 'СЭС Кызылорда (ЦАТЭК)',       type: 'Солнечная', power: 150, region: 'Кызылорда', status: 'approval',     date: 'Q4 2026', res: 'РЭС Южный'       },
  { name: 'ВЭС Ерейментау-2',            type: 'Ветровая',  power: 300, region: 'Акмола',    status: 'construction', date: 'Q2 2027', res: 'РЭС Центральный' },
  { name: 'ГЭС Булакская',               type: 'Гидро',     power: 80,  region: 'ВКО',       status: 'design',       date: 'Q2 2028', res: 'РЭС Восточный'  },
  { name: 'СЭС Туркестан',               type: 'Солнечная', power: 100, region: 'Туркестан', status: 'connection',   date: 'Q2 2026', res: 'РЭС Южный'       },
  { name: 'ВЭС Актау (KazMunayGas)',     type: 'Ветровая',  power: 60,  region: 'Мангистау', status: 'approval',     date: 'Q1 2027', res: 'РЭС Западный'   },
]

const QUEUE_STATUS_CFG: Record<QueueStatus, { label: string; color: string; bg: string }> = {
  connection:   { label: 'Подключение',    color: '#22c55e', bg: 'rgba(34,197,94,0.12)'   },
  construction: { label: 'Строительство',  color: '#60a5fa', bg: 'rgba(96,165,250,0.12)'  },
  design:       { label: 'Проектирование', color: '#facc15', bg: 'rgba(250,204,21,0.12)'  },
  approval:     { label: 'Согласование',   color: '#9ca3af', bg: 'rgba(156,163,175,0.12)' },
}

/* ── Прогноз 48ч ─────────────────────────────────────────────────────────────── */
const FORECAST_TIMES = [
  '00:00', '01:30', '03:00', '04:30', '06:00', '07:30', '09:00', '10:30',
  '12:00', '13:30', '15:00', '16:30', '18:00', '19:30', '21:00', '22:30',
  'Д2 00:00', 'Д2 01:30', 'Д2 03:00', 'Д2 04:30', 'Д2 06:00', 'Д2 07:30',
  'Д2 09:00', 'Д2 10:30', 'Д2 12:00', 'Д2 13:30', 'Д2 15:00', 'Д2 16:30',
  'Д2 18:00', 'Д2 19:30', 'Д2 21:00', 'Д2 22:30',
]
const WIND_VALUES  = [420,380,510,490,320,280,190,210,340,410,480,390,310,290,180,200,350,420,490,510,440,380,410,390,320,280,190,180,310,380,420,490]
const SOLAR_VALUES = [0,0,0,0,80,280,520,740,890,980,1020,1040,980,860,720,540,320,120,0,0,0,0,0,0,0,0,0,0,60,260,500,720]
const FORECAST_DATA = FORECAST_TIMES.map((time, i) => ({
  time,
  wind:  WIND_VALUES[i],
  solar: SOLAR_VALUES[i],
  total: WIND_VALUES[i] + SOLAR_VALUES[i],
}))

/* ── Метеопрогноз ───────────────────────────────────────────────────────────── */
const WEATHER_ROWS = [
  { region: 'Акмола (ВЭС Ерейментау)',  wind: 8.4,  clouds: 20, windFcst: '280 МВт', windTrend:  1, solarFcst: '140 МВт', solarTrend:  0 },
  { region: 'Алматы (ВЭС Шелек)',        wind: 4.2,  clouds: 65, windFcst: '120 МВт', windTrend: -1, solarFcst: '80 МВт',  solarTrend: -1 },
  { region: 'Жамбыл (СЭС Жанатас)',      wind: 6.1,  clouds: 15, windFcst: '—',       windTrend:  0, solarFcst: '195 МВт', solarTrend:  1 },
  { region: 'Кызылорда (СЭС)',           wind: 3.8,  clouds: 30, windFcst: '—',       windTrend:  0, solarFcst: '110 МВт', solarTrend:  0 },
  { region: 'Мангистау (ВЭС Актау)',     wind: 11.2, clouds: 10, windFcst: '58 МВт',  windTrend:  0, solarFcst: '—',       solarTrend:  0 },
]

/* ── ПУЭ чеклист ─────────────────────────────────────────────────────────────── */
const PUE_CHECKLIST: {
  id: string; object: string; requirement: string; status: CheckStatus
  lastCheck: string; nextCheck: string; overdue: boolean
}[] = [
  { id: 'pue-1',  object: 'ПС 500кВ Алма',             requirement: 'Расстояния безопасности в ОРУ-500 (п. 4.2.44 ПУЭ)',                              status: 'ok',        lastCheck: '15.01.2026', nextCheck: '15.07.2026', overdue: false },
  { id: 'pue-2',  object: 'ПС 220кВ Шымкент',           requirement: 'Заземление нейтралей трансформаторов и автотрансформаторов (п. 3.1.8)',           status: 'ok',        lastCheck: '20.02.2026', nextCheck: '20.08.2026', overdue: false },
  { id: 'pue-3',  object: 'ПС 500кВ Экибастуз',         requirement: 'Защита от атмосферных и коммутационных перенапряжений 500 кВ (п. 4.2.133)',      status: 'attention', lastCheck: '10.11.2025', nextCheck: '10.05.2026', overdue: true  },
  { id: 'pue-4',  object: 'ПС 1150кВ Экибастуз (НЭС)',  requirement: 'Молниезащита ОРУ-1150 (п. 4.2.138). Ревизия тросовой защиты.',                  status: 'attention', lastCheck: '05.12.2025', nextCheck: '05.06.2026', overdue: false },
  { id: 'pue-5',  object: 'ПС 110кВ Жезказган',         requirement: 'Наличие основной и резервной РЗА (п. 3.2.14). После ложного срабатывания.',      status: 'violation', lastCheck: '18.10.2025', nextCheck: '18.04.2026', overdue: true  },
  { id: 'pue-6',  object: 'ПС 220кВ Актобе',            requirement: 'Освещённость ОРУ в ночное время ≥ 5 лк (п. 6.4.15)',                            status: 'violation', lastCheck: '22.01.2026', nextCheck: '22.07.2026', overdue: false },
  { id: 'pue-7',  object: 'ПС 500кВ Северная (Астана)', requirement: 'Противопожарные расстояния между маслонаполненными трансформаторами (п. 4.2.70)',status: 'ok',        lastCheck: '30.01.2026', nextCheck: '30.07.2026', overdue: false },
  { id: 'pue-8',  object: 'ПС 220кВ Петропавловск',     requirement: 'Компенсация реактивной мощности — мощность КУ по п. 14.1.12',                   status: 'attention', lastCheck: '12.12.2025', nextCheck: '12.06.2026', overdue: false },
  { id: 'pue-9',  object: 'ПС 500кВ Алма',              requirement: 'Уровень изоляции шин 500 кВ по климатическому исполнению (п. 4.2.11)',           status: 'attention', lastCheck: '08.02.2026', nextCheck: '08.08.2026', overdue: false },
  { id: 'pue-10', object: 'Все объекты НЭС',            requirement: 'Ведение оперативного журнала и суточной ведомости (п. 1.8.1 ПУЭ)',               status: 'ok',        lastCheck: '01.03.2026', nextCheck: '01.09.2026', overdue: false },
]

const STATUS_CFG: Record<CheckStatus, { label: string; color: string; Icon: React.ElementType }> = {
  ok:        { label: 'Соответствует',    color: '#22c55e', Icon: CheckCircle2 },
  attention: { label: 'Требует внимания', color: '#f59e0b', Icon: AlertCircle  },
  violation: { label: 'Нарушение',        color: '#ef4444', Icon: XCircle      },
}

const CERTS = { issued: 1847, available: 3200 }

/* ── Helper: type badge class ───────────────────────────────────────────────── */
function typeBadgeClass(type: string) {
  if (type === 'Солнечная') return 'border-yellow-500/30 text-yellow-400'
  if (type === 'Ветровая')  return 'border-blue-500/30 text-blue-400'
  if (type === 'Гидро')     return 'border-teal-500/30 text-teal-400'
  return 'border-purple-500/30 text-purple-400'
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function GreenGrid() {
  const { theme } = useTheme()
  const { toast }  = useToast()
  const isDark     = theme === 'dark'
  const tickColor  = isDark ? 'rgba(255,255,255,0.4)'  : 'rgba(0,0,0,0.45)'
  const gridColor  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const tooltipStyle = {
    background: isDark ? '#0c1220' : '#fff',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
    borderRadius: '8px',
    fontSize: 12,
  }

  const [pueFilter, setPueFilter] = useState<PueFilter>('all')
  const filteredPue = pueFilter === 'all'
    ? PUE_CHECKLIST
    : PUE_CHECKLIST.filter((p) => p.status === pueFilter)

  const filterColor = (v: PueFilter) =>
    v === 'all' ? (isDark ? '#5CE0D6' : '#0D9488') : STATUS_CFG[v].color

  const handleExport = () =>
    toast({ title: 'Отчёт формируется...', description: 'Функция в разработке' })

  const handleCreateTask = (item: typeof PUE_CHECKLIST[0]) =>
    toast({
      title: 'Задача создана в SAP PM',
      description: `${item.object} — ${item.requirement.slice(0, 60)}...`,
    })

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: isDark ? 'rgba(74,222,128,0.12)' : 'rgba(22,163,74,0.1)', color: isDark ? '#4ADE80' : '#16A34A' }}
        >
          <Leaf className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Green Grid / ПУЭ</h1>
          <p className="text-xs text-muted-foreground">
            ВИЭ в балансе ЕЭС РК · Единый закупщик: РФЦ ВИЭ · Оператор КОРЭМ · Нормативный контроль ПУЭ
          </p>
        </div>
      </div>

      <Tabs defaultValue="vre">
        <TabsList className="mb-4">
          <TabsTrigger value="vre">ВИЭ в балансе</TabsTrigger>
          <TabsTrigger value="forecast">Прогноз и балансирование</TabsTrigger>
          <TabsTrigger value="pue">Контроль ПУЭ</TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB 1 — ВИЭ В БАЛАНСЕ                                            */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="vre" className="space-y-5 mt-0">

          {/* Трекер целей + кнопка экспорта */}
          <div className="flex items-start gap-4">
            <Card className="flex-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  Трекер целей «Зелёная экономика»
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Прогресс-бар: 0% → 13.4% → 15% → 50% */}
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-muted-foreground">0%</span>
                    <span style={{ color: '#4ADE80' }}>Факт: 13.4%</span>
                    <span style={{ color: '#FACC15' }}>Цель 2026: 15%</span>
                    <span style={{ color: isDark ? '#5CE0D6' : '#0D9488' }}>Цель 2050: 50%</span>
                  </div>
                  <div
                    className="relative h-5 rounded-full"
                    style={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }}
                  >
                    <div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ width: `${(13.4 / 50) * 100}%`, background: 'linear-gradient(90deg, #4ADE80, #22c55e)' }}
                    />
                    {/* 2026 target marker */}
                    <div
                      className="absolute inset-y-[-3px] w-[3px] rounded-full z-10"
                      style={{ left: `${(15 / 50) * 100}%`, background: '#FACC15' }}
                    />
                  </div>
                  <div className="relative h-5 mt-1 text-[10px] font-semibold">
                    <span
                      className="absolute"
                      style={{ left: `${(13.4 / 50) * 100}%`, transform: 'translateX(-50%)', color: '#4ADE80' }}
                    >▲ 13.4%</span>
                    <span
                      className="absolute"
                      style={{ left: `${(15 / 50) * 100}%`, transform: 'translateX(-50%)', color: '#FACC15' }}
                    >15%</span>
                    <span className="absolute right-0" style={{ color: isDark ? '#5CE0D6' : '#0D9488' }}>50%</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <div
                    className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm shrink-0"
                    style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Отставание от плана: <strong className="ml-1">-0.8%</strong>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Для выполнения цели 2026 необходимо подключить ещё <strong>847 МВт</strong> ВИЭ.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Button
              variant="outline"
              size="sm"
              className="gap-2 shrink-0 mt-4"
              onClick={handleExport}
              style={{
                borderColor: isDark ? 'rgba(74,222,128,0.30)' : 'rgba(22,163,74,0.30)',
                color: isDark ? '#4ADE80' : '#16A34A',
              }}
            >
              <Download className="h-4 w-4" />
              Отчёт для KOREM
            </Button>
          </div>

          {/* Pie + ZSP */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Структура суточной выработки ЕЭС РК</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={PIE_DATA}
                        cx="50%" cy="50%"
                        innerRadius={54} outerRadius={90}
                        paddingAngle={3} dataKey="value"
                        label={({ value }) => `${value}%`}
                        labelLine={{ stroke: tickColor, strokeWidth: 1 }}
                      >
                        {PIE_DATA.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(val: number) => [`${val}%`]} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-muted-foreground text-center mt-1">
                  ВИЭ итого: 13.4% · цель программы «Зелёная экономика» — 15% к 2026 г.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Award className="h-4 w-4" style={{ color: isDark ? '#FACC15' : '#CA8A04' }} />
                  Зелёные сертификаты происхождения (ЗСП)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Выдано с начала года', value: CERTS.issued.toLocaleString('ru-RU'),    color: '#4ADE80' },
                    { label: 'Доступно к выдаче',    value: CERTS.available.toLocaleString('ru-RU'), color: isDark ? '#5CE0D6' : '#0D9488' },
                  ].map((c) => (
                    <div key={c.label} className="rounded-xl p-4 border text-center"
                      style={{ borderColor: `${c.color}30`, background: `${c.color}08` }}>
                      <p className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Исполнение плана выдачи ЗСП</span>
                    <span>{Math.round(CERTS.issued / CERTS.available * 100)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full"
                      style={{ width: `${Math.round(CERTS.issued / CERTS.available * 100)}%`, background: 'linear-gradient(90deg, #4ADE80, #22c55e)' }} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  ЗСП подтверждает выработку 1 МВт·ч из ВИЭ. Выдача осуществляется оператором KOREM
                  согласно Постановлению Правительства РК № 940. Закупка осуществляется Единым
                  закупщиком — ТОО «РФЦ ВИЭ» по долгосрочным договорам.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Таблица источников */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                Источники ВИЭ в ЕЭС РК
                <Badge variant="outline" className="ml-auto text-[10px]">
                  Приоритет закупки — Единый закупщик (РФЦ ВИЭ)
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Объект (владелец)</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead className="text-right">Мощность, МВт</TableHead>
                    <TableHead className="text-right">Выработка, ГВт·ч</TableHead>
                    <TableHead className="text-right">Доля в балансе, %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {VRE_SOURCES.map((row) => (
                    <TableRow key={row.name}>
                      <TableCell className="font-medium text-sm">{row.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={typeBadgeClass(row.type)}>{row.type}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{row.capacity}</TableCell>
                      <TableCell className="text-right">{row.output}</TableCell>
                      <TableCell className="text-right font-medium" style={{ color: isDark ? '#4ADE80' : '#16A34A' }}>
                        {row.share}%
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2">
                    <TableCell className="font-bold" colSpan={2}>Итого ВИЭ</TableCell>
                    <TableCell className="text-right font-bold">
                      {VRE_SOURCES.reduce((s, r) => s + r.capacity, 0).toLocaleString('ru-RU')}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {VRE_SOURCES.reduce((s, r) => s + r.output, 0).toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right font-bold" style={{ color: isDark ? '#4ADE80' : '#16A34A' }}>
                      {VRE_SOURCES.reduce((s, r) => s + r.share, 0).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Очередь подключения ВИЭ */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                Очередь подключения ВИЭ к НЭС
                <Badge variant="outline" className="ml-auto text-[10px]">
                  {VRE_QUEUE.reduce((s, r) => s + r.power, 0).toLocaleString('ru-RU')} МВт в очереди
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Объект</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead className="text-right">МВт</TableHead>
                    <TableHead>Регион</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Ожид. дата</TableHead>
                    <TableHead>РЭС</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {VRE_QUEUE.map((row) => {
                    const cfg = QUEUE_STATUS_CFG[row.status]
                    return (
                      <TableRow key={row.name}>
                        <TableCell className="font-medium text-sm">{row.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={typeBadgeClass(row.type)}>{row.type}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{row.power}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{row.region}</TableCell>
                        <TableCell>
                          <span
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40` }}
                          >{cfg.label}</span>
                        </TableCell>
                        <TableCell className="text-sm">{row.date}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{row.res}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB 2 — ПРОГНОЗ И БАЛАНСИРОВАНИЕ                                 */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="forecast" className="space-y-5 mt-0">

          {/* KPI карточки */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {([
              { label: 'ВИЭ генерация сейчас', value: '1 247 МВт', sub: 'Суммарно ВЭС + СЭС + ГЭС',  color: '#4ADE80' },
              { label: 'Резервная мощность',    value: '380 МВт',   sub: 'задействовано из 620 МВт',   color: '#FACC15' },
              { label: 'Профицит / Дефицит',    value: '+124 МВт',  sub: 'Профицит в ЕЭС РК',          color: '#4ADE80' },
            ] as const).map((c) => (
              <Card key={c.label}>
                <CardContent className="pt-5 pb-4">
                  <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
                  <p className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{c.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Стек-бар структуры генерации */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Структура генерации прямо сейчас</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex h-9 rounded-lg overflow-hidden gap-px">
                {STACK_BAR.map((seg) => (
                  <div
                    key={seg.label}
                    className="flex items-center justify-center text-[11px] font-bold text-white"
                    style={{ width: `${seg.value}%`, background: seg.color, minWidth: 36 }}
                    title={`${seg.label}: ${seg.value}%`}
                  >
                    {seg.value}%
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                {STACK_BAR.map((seg) => (
                  <div key={seg.label} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: seg.color }} />
                    <span className="text-xs text-muted-foreground">{seg.label} {seg.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Прогноз 48ч */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Прогноз выработки ВИЭ на 48 часов</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={FORECAST_DATA} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis
                      dataKey="time"
                      tick={{ fill: tickColor, fontSize: 10 }}
                      interval={3}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: tickColor, fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      unit=" МВт"
                      width={72}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(val: number, name: string) => [
                        `${val} МВт`,
                        name === 'wind' ? 'ВЭС суммарно' : name === 'solar' ? 'СЭС суммарно' : 'Суммарно ВИЭ',
                      ]}
                    />
                    <Legend
                      formatter={(v) => v === 'wind' ? 'ВЭС суммарно' : v === 'solar' ? 'СЭС суммарно' : 'Суммарно ВИЭ'}
                      wrapperStyle={{ fontSize: 11 }}
                    />
                    <ReferenceLine
                      x="12:00"
                      stroke={isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)'}
                      strokeDasharray="5 4"
                      label={{ value: 'Сейчас', position: 'top', fill: tickColor, fontSize: 10 }}
                    />
                    <Line type="monotone" dataKey="wind"  stroke="#60A5FA" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="solar" stroke="#FACC15" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="total" stroke="#4ADE80" strokeWidth={2} dot={false} strokeDasharray="6 3" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Предупреждение под графиком */}
              <div
                className="mt-3 flex items-start gap-3 rounded-lg px-4 py-3"
                style={{ background: isDark ? 'rgba(245,158,11,0.07)' : 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.25)' }}
              >
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#f59e0b' }} />
                <p className="text-sm" style={{ color: isDark ? 'rgba(255,255,255,0.82)' : 'rgba(15,23,42,0.82)' }}>
                  <strong style={{ color: '#f59e0b' }}>Завтра 03:00–06:00:</strong> низкая ветровая генерация
                  (прогноз 180 МВт). Рекомендуется подготовить резерв{' '}
                  <strong>420 МВт</strong>.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Метеопрогноз по регионам */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Метеопрогноз по регионам</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Регион</TableHead>
                    <TableHead className="text-right">Ветер, м/с</TableHead>
                    <TableHead className="text-right">Облачность</TableHead>
                    <TableHead className="text-right">Прогноз ВЭС</TableHead>
                    <TableHead className="text-right">Прогноз СЭС</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {WEATHER_ROWS.map((row) => (
                    <TableRow key={row.region}>
                      <TableCell className="font-medium text-sm">{row.region}</TableCell>
                      <TableCell className="text-right">{row.wind}</TableCell>
                      <TableCell className="text-right">{row.clouds}%</TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center justify-end gap-1">
                          {row.windFcst}
                          {row.windTrend  === 1  && <TrendingUp   className="h-3.5 w-3.5" style={{ color: '#22c55e' }} />}
                          {row.windTrend  === -1 && <TrendingDown  className="h-3.5 w-3.5" style={{ color: '#ef4444' }} />}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center justify-end gap-1">
                          {row.solarFcst}
                          {row.solarTrend === 1  && <TrendingUp   className="h-3.5 w-3.5" style={{ color: '#22c55e' }} />}
                          {row.solarTrend === -1 && <TrendingDown  className="h-3.5 w-3.5" style={{ color: '#ef4444' }} />}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB 3 — КОНТРОЛЬ ПУЭ                                             */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="pue" className="mt-0 space-y-4">

          {/* Панель фильтров */}
          <div className="flex items-center gap-2 flex-wrap">
            {(
              [
                { value: 'all'       as PueFilter, label: 'Все',              count: PUE_CHECKLIST.length },
                { value: 'violation' as PueFilter, label: 'Нарушения',        count: PUE_CHECKLIST.filter((p) => p.status === 'violation').length },
                { value: 'attention' as PueFilter, label: 'Требует внимания', count: PUE_CHECKLIST.filter((p) => p.status === 'attention').length },
                { value: 'ok'        as PueFilter, label: 'Соответствует',    count: PUE_CHECKLIST.filter((p) => p.status === 'ok').length },
              ]
            ).map(({ value, label, count }) => {
              const isActive = pueFilter === value
              const color    = filterColor(value)
              return (
                <button
                  key={value}
                  onClick={() => setPueFilter(value)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
                  style={{
                    background: isActive ? `${color}14` : 'transparent',
                    border: `1px solid ${isActive ? `${color}50` : (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)')}`,
                    color: isActive ? color : (isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)'),
                  }}
                >
                  {label}
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{
                      background: isActive ? `${color}20` : (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'),
                      color: isActive ? color : 'inherit',
                    }}
                  >{count}</span>
                </button>
              )
            })}
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                Контроль соответствия ПУЭ — объекты НЭС
                <div className="ml-auto flex items-center gap-2">
                  {(['ok', 'attention', 'violation'] as CheckStatus[]).map((s) => {
                    const c     = STATUS_CFG[s]
                    const count = PUE_CHECKLIST.filter((p) => p.status === s).length
                    return (
                      <Badge key={s} variant="outline" className="text-[10px] gap-1"
                        style={{ borderColor: `${c.color}40`, color: c.color }}>
                        {count} {c.label.toLowerCase()}
                      </Badge>
                    )
                  })}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Объект</TableHead>
                    <TableHead>Требование ПУЭ</TableHead>
                    <TableHead className="text-center w-36">Статус</TableHead>
                    <TableHead className="text-center whitespace-nowrap">Дата проверки</TableHead>
                    <TableHead className="text-center whitespace-nowrap">След. проверка</TableHead>
                    <TableHead className="text-center w-36">Действие</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPue.map((item) => {
                    const cfg      = STATUS_CFG[item.status]
                    const IconComp = cfg.Icon
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium whitespace-nowrap">{item.object}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{item.requirement}</TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: cfg.color }}>
                            <IconComp className="h-3.5 w-3.5" />
                            {cfg.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground whitespace-nowrap">
                          {item.lastCheck}
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          <span
                            className="text-sm"
                            style={{ color: item.overdue ? '#ef4444' : undefined, fontWeight: item.overdue ? 600 : undefined }}
                          >{item.nextCheck}</span>
                          {item.overdue && (
                            <span
                              className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded"
                              style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}
                            >!</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <button
                            onClick={() => handleCreateTask(item)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 whitespace-nowrap"
                            style={{
                              background: isDark ? 'rgba(92,224,214,0.08)' : 'rgba(13,148,136,0.06)',
                              border: isDark ? '1px solid rgba(92,224,214,0.20)' : '1px solid rgba(13,148,136,0.20)',
                              color: isDark ? '#5CE0D6' : '#0D9488',
                            }}
                          >
                            <Plus className="h-3 w-3" />
                            Создать задачу
                          </button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Итоговая строка */}
          <div
            className="flex items-center gap-3 rounded-lg px-4 py-3"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
          >
            <XCircle className="h-4 w-4 shrink-0" style={{ color: '#ef4444' }} />
            <p className="text-sm" style={{ color: '#ef4444' }}>
              <strong>Следующая плановая проверка: ПС 110кВ Жезказган</strong> — просрочена на 4 дня
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

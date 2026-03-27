import { useState, useEffect } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  AlertTriangle, AlertOctagon, Siren, Shield, HardHat, Radio, Phone, MapPin,
  Clock, CheckCircle2, Zap, Mountain, Activity, Wind, RefreshCw, TrendingDown, Users,
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from 'recharts'

/* ══ Data ════════════════════════════════════════════════════════════════════ */

type Severity = 'P1' | 'P2' | 'P3'
type IncStatus = 'active' | 'contained' | 'resolved' | 'monitoring'

interface Incident {
  id: string
  severity: Severity
  category: 'geo' | 'equip' | 'safety' | 'env' | 'seism'
  title: string
  location: string
  horizon: string
  reported: string
  status: IncStatus
  description: string
  actions: string[]
  personnel_risk: number
}

const INCIDENTS: Incident[] = [
  {
    id: 'INC-2024-047',
    severity: 'P1',
    category: 'seism',
    title: 'Микросейсмическое событие M 2.8',
    location: 'Блок 7-В, Гор. −340',
    horizon: '−340',
    reported: '08:14',
    status: 'monitoring',
    description: 'Зафиксировано сейсмическое событие магнитудой 2.8 в блоке выработки 7-В. Персонал эвакуирован с горизонта −340. Ведётся мониторинг активности.',
    actions: [
      'Эвакуация 96 человек с гор. −340 завершена',
      'Геомеханик произвёл осмотр — трещин в крепи нет',
      'Продолжается сейсмомониторинг (интервал 5 мин)',
      'Решение о возобновлении работ — через 4 ч',
    ],
    personnel_risk: 96,
  },
  {
    id: 'INC-2024-046',
    severity: 'P2',
    category: 'safety',
    title: 'Повышение CO на Гор. −300',
    location: 'Штрек 14Б, Гор. −300',
    horizon: '−300',
    reported: '11:37',
    status: 'contained',
    description: 'Датчики зафиксировали уровень CO 22.3 ppm при норме < 20 ppm. Источник — неполное сгорание дизтоплива ПДМ PG-33.',
    actions: [
      'ПДМ PG-33 выведен с горизонта',
      'Ускорен режим вентилятора ВОД-50 до 88%',
      'Уровень CO снижается: 22.3 → 18.1 ppm',
      'Ожидается нормализация через 40 мин',
    ],
    personnel_risk: 0,
  },
  {
    id: 'INC-2024-045',
    severity: 'P2',
    category: 'geo',
    title: 'Повышенный водоприток, Гор. −340',
    location: 'Водосборник В-4, Гор. −340',
    horizon: '−340',
    reported: '06:52',
    status: 'monitoring',
    description: 'Водоприток вырос с 28.4 до 34.8 м³/ч (норма ≤ 30). Запущен резервный насосный агрегат НА-6.',
    actions: [
      'Насосы НА-5 и НА-6 (резерв) в работе',
      'Уровень воды в водосборнике стабилен',
      'Гидрогеолог: вероятно, сезонное увеличение',
      'Мониторинг каждые 30 мин',
    ],
    personnel_risk: 0,
  },
  {
    id: 'INC-2024-044',
    severity: 'P3',
    category: 'equip',
    title: 'Остановка БУ-09 (буровой станок)',
    location: 'Забой 12А, Гор. −220',
    horizon: '−220',
    reported: '14:20',
    status: 'resolved',
    description: 'Аварийная остановка бурового станка Atlas Copco Boomer M2C (BD-09) из-за разрыва гидрошланга.',
    actions: [
      'Станок выведен в ремонтную нишу',
      'Гидрошланг DN25 заменён — склад ЗИП',
      'Испытание гидросистемы пройдено',
      'Ввод в работу через 2.5 ч',
    ],
    personnel_risk: 0,
  },
]

const SEISM_SERIES = Array.from({ length: 48 }, (_, i) => ({
  t: `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`,
  m: +(Math.random() < 0.05 ? (Math.random() * 2.5 + 0.5) : Math.random() * 0.4).toFixed(2),
}))

const RESCUE_TEAMS = [
  { id: 'ВГСЧ-1', name: 'Отряд №1',       status: 'ready',    persons: 8,  location: 'Штаб на поверхности',   eq: ['СИЗ', 'Носилки', 'Кислород', 'Связь'] },
  { id: 'ВГСЧ-2', name: 'Отряд №2',       status: 'deployed', persons: 6,  location: 'Гор. −340 — осмотр',    eq: ['СИЗ', 'Газоанализатор', 'Строп'] },
  { id: 'МЕД',    name: 'Медбригада',      status: 'ready',    persons: 4,  location: 'Медпункт ствол',        eq: ['Носилки', 'Дефибриллятор', 'Кислород'] },
  { id: 'ТЕХ',    name: 'Техбригада',      status: 'standby',  persons: 5,  location: 'АБК-1',                 eq: ['Инструмент', 'Сварка', 'Насос'] },
]

const MONTHLY_INCIDENTS = [
  { month: 'Янв', p1: 0, p2: 1, p3: 3 },
  { month: 'Фев', p1: 0, p2: 2, p3: 4 },
  { month: 'Мар', p1: 1, p2: 1, p3: 2 },
  { month: 'Апр', p1: 0, p2: 2, p3: 5 },
  { month: 'Май', p1: 0, p2: 1, p3: 3 },
  { month: 'Июн', p1: 1, p2: 3, p3: 4 },
  { month: 'Июл', p1: 0, p2: 1, p3: 2 },
]

const EVAC_ROUTES = [
  { id: 'EV-1', horizon: 'Гор. −340', route: 'Ствол №2 → уклон → Гор. −300 → Ствол №1 → поверхность', time_min: 18, status: 'clear' },
  { id: 'EV-2', horizon: 'Гор. −300', route: 'Ствол №1 напрямую → поверхность', time_min: 12, status: 'clear' },
  { id: 'EV-3', horizon: 'Гор. −260', route: 'Ствол №1 напрямую → поверхность', time_min: 9,  status: 'clear' },
  { id: 'EV-4', horizon: 'Гор. −220', route: 'Ствол №1 напрямую → поверхность', time_min: 7,  status: 'clear' },
  { id: 'EV-R', horizon: 'Резервный (все гор.)', route: 'Запасной ствол №3 → вент. штрек → поверхность', time_min: 25, status: 'clear' },
]

/* ══ Helpers ═════════════════════════════════════════════════════════════════ */

const SEV_META: Record<Severity, { label: string; color: string; bg: string }> = {
  P1: { label: 'P1 — Критично', color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
  P2: { label: 'P2 — Высокий',  color: '#f59e0b', bg: 'rgba(245,158,11,0.06)' },
  P3: { label: 'P3 — Средний',  color: '#6366f1', bg: 'rgba(99,102,241,0.05)' },
}

const STATUS_META: Record<IncStatus, { label: string; color: string }> = {
  active:     { label: 'Активный',       color: '#ef4444' },
  contained:  { label: 'Под контролем',  color: '#f59e0b' },
  resolved:   { label: 'Устранён',       color: '#10b981' },
  monitoring: { label: 'Мониторинг',     color: '#6366f1' },
}

const CAT_META = {
  geo:   { label: 'Геомеханика', icon: Mountain },
  equip: { label: 'Техника',     icon: Zap },
  safety:{ label: 'ПБ/ОТ',       icon: HardHat },
  env:   { label: 'Экология',    icon: Wind },
  seism: { label: 'Сейсмика',    icon: Activity },
}

const TOOLTIP_STYLE = {
  fontSize: 11,
  background: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 6,
  color: 'hsl(var(--foreground))',
}

/* ══ Component ═══════════════════════════════════════════════════════════════ */

export default function MiningCrisis() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [tick, setTick] = useState(0)
  const [selected, setSelected] = useState<Incident>(INCIDENTS[0])

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5000)
    return () => clearInterval(id)
  }, [])

  const activeInc   = INCIDENTS.filter(i => i.status === 'active' || i.status === 'monitoring').length
  const totalRisk   = INCIDENTS.reduce((a, b) => a + b.personnel_risk, 0)
  const deployedTeams = RESCUE_TEAMS.filter(t => t.status === 'deployed').length

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold tracking-tight">Кризис-центр</h1>
            {activeInc > 0 && (
              <Badge className="bg-red-500 text-white text-[10px] animate-pulse">
                {activeInc} активных
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Управление инцидентами и промышленная безопасность · Рудник «Жезказган»
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>LIVE</span>
          <RefreshCw className="h-3 w-3 animate-spin" style={{ animationDuration: '5s' }} />
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: AlertOctagon, label: 'Активных инцидентов', value: activeInc,       color: activeInc > 1 ? '#ef4444' : '#f59e0b' },
          { icon: HardHat,      label: 'Персонал в зоне риска', value: `${totalRisk} чел.`, color: totalRisk > 0 ? '#f59e0b' : '#10b981' },
          { icon: Shield,       label: 'Бригад ВГСЧ развёрнуто', value: deployedTeams, color: '#6366f1' },
          { icon: TrendingDown, label: 'Аварий с 01.01.2024',   value: '0 тяж.',      color: '#10b981' },
        ].map((k, i) => {
          const Icon = k.icon
          return (
            <Card key={i} style={{ borderColor: `${k.color}20` }}>
              <CardContent className="p-3.5 flex items-center gap-3">
                <div className="rounded-lg p-2" style={{ background: `${k.color}15` }}>
                  <Icon className="h-4 w-4" style={{ color: k.color }} />
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground">{k.label}</p>
                  <p className="text-sm font-bold" style={{ color: k.color }}>{k.value}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Tabs defaultValue="incidents">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="incidents">Инциденты</TabsTrigger>
          <TabsTrigger value="seismic">Сейсмомониторинг</TabsTrigger>
          <TabsTrigger value="rescue">Спасательные бригады</TabsTrigger>
          <TabsTrigger value="evacuation">Эвакуация</TabsTrigger>
        </TabsList>

        {/* ── Incidents ────────────────────────────────────────────────────── */}
        <TabsContent value="incidents" className="pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Incident list */}
            <div className="lg:col-span-2 space-y-2">
              {INCIDENTS.map((inc) => {
                const sev = SEV_META[inc.severity]
                const sta = STATUS_META[inc.status]
                const CatIcon = CAT_META[inc.category].icon
                return (
                  <button key={inc.id} onClick={() => setSelected(inc)}
                    className="w-full rounded-lg border p-3 text-left transition-all hover:scale-[1.01]"
                    style={{
                      borderColor: selected?.id === inc.id ? sev.color : `${sev.color}30`,
                      background:  selected?.id === inc.id ? sev.bg : 'transparent',
                    }}>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <CatIcon className="h-3.5 w-3.5 shrink-0" style={{ color: sev.color }} />
                        <span className="text-[11px] font-semibold leading-snug">{inc.title}</span>
                      </div>
                      <Badge variant="outline" className="text-[9px] shrink-0"
                        style={{ borderColor: `${sev.color}50`, color: sev.color }}>
                        {inc.severity}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-2.5 w-2.5" />{inc.location}
                      </span>
                      <span className="text-[10px] font-semibold" style={{ color: sta.color }}>{sta.label}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                      <span className="text-[9px] text-muted-foreground">{inc.reported} сегодня</span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Incident detail */}
            {selected && (
              <div className="lg:col-span-3 space-y-4">
                <Card style={{ borderColor: `${SEV_META[selected.severity].color}30` }}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge style={{ background: SEV_META[selected.severity].color, color: '#fff' }}
                            className="text-[10px]">
                            {SEV_META[selected.severity].label}
                          </Badge>
                          <Badge variant="outline" style={{ borderColor: `${STATUS_META[selected.status].color}50`, color: STATUS_META[selected.status].color }}
                            className="text-[10px]">
                            {STATUS_META[selected.status].label}
                          </Badge>
                        </div>
                        <CardTitle className="text-sm">{selected.title}</CardTitle>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{selected.id} · {selected.reported} · {selected.location}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-[12px] text-muted-foreground leading-relaxed">{selected.description}</p>

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Принятые меры</p>
                      <ul className="space-y-1.5">
                        {selected.actions.map((a, i) => (
                          <li key={i} className="flex items-start gap-2 text-[11px]">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                            <span>{a}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {selected.personnel_risk > 0 && (
                      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 flex items-center gap-2">
                        <Users className="h-4 w-4 text-amber-400 shrink-0" />
                        <p className="text-[11px] text-amber-300">
                          {selected.personnel_risk} человек эвакуировано с горизонта {selected.horizon}. Все учтены. Медосмотр пройден.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Monthly stats */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Инциденты по месяцам, 2024</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={130}>
                      <BarChart data={MONTHLY_INCIDENTS}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'} />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Bar dataKey="p1" name="P1" stackId="a" fill="#ef4444" radius={0} />
                        <Bar dataKey="p2" name="P2" stackId="a" fill="#f59e0b" radius={0} />
                        <Bar dataKey="p3" name="P3" stackId="a" fill="#6366f1" radius={[3,3,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Seismic ──────────────────────────────────────────────────────── */}
        <TabsContent value="seismic" className="space-y-4 pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Событий за 24ч',   value: SEISM_SERIES.filter(s => s.m > 0.3).length, color: '#f59e0b' },
              { label: 'Макс. магнитуда',  value: 'M 2.8',  color: '#ef4444' },
              { label: 'Активных зон',     value: '3',       color: '#6366f1' },
              { label: 'Датчиков онлайн',  value: '24 / 24', color: '#10b981' },
            ].map((k, i) => (
              <Card key={i} style={{ borderColor: `${k.color}20` }}>
                <CardContent className="p-3.5">
                  <p className="text-[9px] text-muted-foreground mb-1">{k.label}</p>
                  <p className="text-xl font-bold" style={{ color: k.color }}>{k.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-red-400" />
                Сейсмическая активность — последние 24 ч
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={SEISM_SERIES}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'} />
                  <XAxis dataKey="t" tick={{ fontSize: 8 }} interval={5} />
                  <YAxis domain={[0, 3.5]} tick={{ fontSize: 10 }} label={{ value: 'Магнитуда', angle: -90, position: 'insideLeft', fontSize: 9, fill: '#6b7280' }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`M ${v.toFixed(2)}`, 'Магнитуда']} />
                  <ReferenceLine y={2.0} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Порог P2: M 2.0', fontSize: 9, fill: '#f59e0b' }} />
                  <ReferenceLine y={3.0} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Порог P1: M 3.0', fontSize: 9, fill: '#ef4444' }} />
                  <Bar dataKey="m" name="Магнитуда"
                    fill="#6366f1"
                    radius={[2, 2, 0, 0]}
                    label={false}
                  />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-[10px] text-muted-foreground mt-2">
                Сейсмостанция «Жезказган-1» · 24 геофона на горизонтах −180 — −380 · Регистратор Seismograph Pro-6
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { zone: 'Блок 7-В (Гор. −340)', events: 4, max_m: 2.8, trend: 'up',   status: 'alert' },
              { zone: 'Блок 12-Б (Гор. −300)', events: 2, max_m: 1.2, trend: 'stable', status: 'watch' },
              { zone: 'Блок 3-А (Гор. −260)',  events: 1, max_m: 0.8, trend: 'down',  status: 'ok' },
            ].map((z, i) => {
              const color = z.status === 'alert' ? '#ef4444' : z.status === 'watch' ? '#f59e0b' : '#10b981'
              return (
                <Card key={i} style={{ borderColor: `${color}20` }}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-[11px] font-semibold">{z.zone}</p>
                      <Badge variant="outline" className="text-[9px]" style={{ borderColor: `${color}40`, color }}>
                        {z.status === 'alert' ? 'Алерт' : z.status === 'watch' ? 'Наблюдение' : 'Норма'}
                      </Badge>
                    </div>
                    <div className="text-[10px] text-muted-foreground space-y-1">
                      <div className="flex justify-between"><span>Событий за 24ч:</span><span className="font-semibold">{z.events}</span></div>
                      <div className="flex justify-between"><span>Макс. магнитуда:</span><span className="font-semibold" style={{ color }}>M {z.max_m.toFixed(1)}</span></div>
                      <div className="flex justify-between"><span>Тенденция:</span><span className={z.trend === 'up' ? 'text-red-400' : z.trend === 'down' ? 'text-emerald-400' : 'text-muted-foreground'}>
                        {z.trend === 'up' ? '↑ Рост' : z.trend === 'down' ? '↓ Спад' : '→ Стабильно'}
                      </span></div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* ── Rescue ───────────────────────────────────────────────────────── */}
        <TabsContent value="rescue" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {RESCUE_TEAMS.map((team) => {
              const color = team.status === 'ready' ? '#10b981' : team.status === 'deployed' ? '#ef4444' : '#f59e0b'
              const statusLabel = team.status === 'ready' ? 'Готова' : team.status === 'deployed' ? 'В работе' : 'Резерв'
              return (
                <Card key={team.id} style={{ borderColor: `${color}20` }}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="rounded-lg p-2" style={{ background: `${color}15` }}>
                          <Shield className="h-4 w-4" style={{ color }} />
                        </div>
                        <div>
                          <p className="text-sm font-bold">{team.name}</p>
                          <p className="text-[10px] text-muted-foreground">{team.id}</p>
                        </div>
                      </div>
                      <Badge style={{ background: `${color}20`, color }} className="text-[10px] border-0">
                        {statusLabel}
                      </Badge>
                    </div>
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex items-center gap-2">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span>{team.persons} человек</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">{team.location}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {team.eq.map((e, i) => (
                        <span key={i} className="text-[9px] px-2 py-0.5 rounded border" style={{ borderColor: `${color}25`, color: `${color}` }}>{e}</span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Экстренные контакты</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: 'ВГСЧ Жезказган',        phone: '+7 (7102) 7-01-00', color: '#ef4444' },
                  { label: 'Горноспасательный отряд', phone: '+7 (7102) 7-22-00', color: '#ef4444' },
                  { label: 'Скорая помощь',          phone: '103',               color: '#f59e0b' },
                  { label: 'Пожарная охрана',        phone: '101',               color: '#f59e0b' },
                  { label: 'Начальник смены',        phone: 'внут. 555',         color: '#6366f1' },
                  { label: 'Горный диспетчер',       phone: 'внут. 600',         color: '#6366f1' },
                ].map((c, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border p-2.5"
                    style={{ borderColor: `${c.color}20` }}>
                    <Phone className="h-3.5 w-3.5 shrink-0" style={{ color: c.color }} />
                    <div>
                      <p className="text-[10px] font-semibold">{c.label}</p>
                      <p className="text-[11px] font-mono" style={{ color: c.color }}>{c.phone}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Evacuation ───────────────────────────────────────────────────── */}
        <TabsContent value="evacuation" className="space-y-4 pt-4">
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
            <div className="text-[12px]">
              <span className="text-emerald-400 font-semibold">Все маршруты эвакуации свободны.</span>
              {' '}Плановая тренировка по эвакуации проведена 14 ноября 2024 г. Следующая — 14 февраля 2025 г.
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Маршруты эвакуации</p>
            {EVAC_ROUTES.map((r, i) => (
              <div key={i} className="rounded-lg border border-emerald-500/15 p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-[12px] font-semibold">{r.id} — {r.horizon}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{r.route}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-muted-foreground">Расч. время</p>
                    <p className="text-sm font-bold text-emerald-400">{r.time_min} мин</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-400">
                  Маршрут свободен
                </Badge>
              </div>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Камеры-убежища (самоспасатели)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-[11px]">
                {[
                  { loc: 'Гор. −260, ниша №3', cap: 40, stock: 42 },
                  { loc: 'Гор. −300, ниша №1', cap: 50, stock: 54 },
                  { loc: 'Гор. −300, ниша №4', cap: 40, stock: 40 },
                  { loc: 'Гор. −340, ниша №2', cap: 50, stock: 52 },
                  { loc: 'Гор. −380, ниша №1', cap: 20, stock: 22 },
                  { loc: 'Ствол №2 — площадка', cap: 30, stock: 31 },
                ].map((s, i) => (
                  <div key={i} className="rounded-lg border p-2.5">
                    <p className="font-semibold mb-1 leading-snug">{s.loc}</p>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Ёмк. / Запас:</span>
                      <span className={s.stock >= s.cap ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                        {s.cap} / {s.stock}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

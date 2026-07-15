/**
 * ConstructionProgress — контроль СМР «план / факт».
 *
 * Дашборд по портфельному проекту: KPI-полоса, S-кривая освоения (PV vs EV),
 * план/факт по захваткам и плоская таблица задач с фильтрами.
 *
 * Источник данных — mock-слой src/data/constructionMockData.ts.
 * Все запросы идут через react-query, чтобы при появлении бэкенда
 * поменялись только URL внутри fetchXxx, а UI остался прежним.
 */

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { MetricCard } from '@/components/MetricCard'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

import {
  Gauge, CalendarClock, AlertTriangle, TrendingUp, MapPin,
} from 'lucide-react'

import { useTheme } from '@/hooks/useTheme'
import {
  fetchProject, fetchTasks, fetchProgressCurve, fetchZonePlanFact,
  getCurrentProjectId, formatDate, formatTg, ZONE_LIST,
  type ScheduleTask, type TaskStatus,
} from '@/data/constructionMockData'

/* ──────────────────────────── ХЕЛПЕРЫ ──────────────────────────────────── */

const STATUS_META: Record<TaskStatus, { label: string; tone: string }> = {
  planned:     { label: 'План',        tone: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'В работе',    tone: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  done:        { label: 'Завершено',   tone: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
  late:        { label: 'Отставание',  tone: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
}

const PROJECT_ID = getCurrentProjectId()

/* ──────────────────────────── COMPONENT ────────────────────────────────── */

export default function ConstructionProgress() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // Серверные данные
  const project = useQuery({
    queryKey: ['construction', PROJECT_ID, 'project'],
    queryFn:  () => fetchProject(PROJECT_ID),
  })
  const tasks = useQuery({
    queryKey: ['construction', PROJECT_ID, 'tasks'],
    queryFn:  () => fetchTasks(PROJECT_ID),
  })
  const curve = useQuery({
    queryKey: ['construction', PROJECT_ID, 'curve'],
    queryFn:  () => fetchProgressCurve(PROJECT_ID),
  })
  const zonePlanFact = useQuery({
    queryKey: ['construction', PROJECT_ID, 'zone-plan-fact'],
    queryFn:  () => fetchZonePlanFact(PROJECT_ID),
  })

  // Фильтры
  const [zoneFilter,   setZoneFilter]   = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search,       setSearch]       = useState<string>('')

  const filtered = useMemo<ScheduleTask[]>(() => {
    const list = tasks.data ?? []
    return list.filter((t) => {
      if (zoneFilter !== 'all' && t.zone !== zoneFilter) return false
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      if (search.trim() && !`${t.wbs} ${t.name}`.toLowerCase().includes(search.trim().toLowerCase())) return false
      return true
    })
  }, [tasks.data, zoneFilter, statusFilter, search])

  // KPI на основе всех задач
  const kpis = useMemo(() => {
    const list = tasks.data ?? []
    if (list.length === 0) {
      return { physical: 0, spi: 1, scheduleVariance: 0, late: 0 }
    }
    const totalPv = list.reduce((a, t) => a + t.plannedValue, 0)
    const totalEv = list.reduce((a, t) => a + t.earnedValue, 0)
    const weightedProgress = totalPv > 0
      ? list.reduce((a, t) => a + (t.progressPct / 100) * t.plannedValue, 0) / totalPv * 100
      : 0
    const spi = totalPv > 0 ? totalEv / totalPv : 1
    const late = list.filter((t) => t.status === 'late').length
    const scheduleVariance = (zonePlanFact.data ?? [])
      .reduce((max, z) => Math.max(max, z.lagDays), 0)
    return {
      physical: +weightedProgress.toFixed(1),
      spi: +spi.toFixed(2),
      scheduleVariance,
      late,
    }
  }, [tasks.data, zonePlanFact.data])

  // Chart palettes под текущую тему
  const gridColor   = isDark ? '#1f2937' : '#e2e8f0'
  const axisColor   = isDark ? '#94a3b8' : '#64748b'
  const tooltipBg   = isDark ? 'rgba(12,18,30,0.95)' : 'rgba(255,255,255,0.98)'
  const planColor   = '#94a3b8'
  const factColor   = '#0d9488'
  const acColor     = '#f59e0b'

  const compactCurve = useMemo(() => {
    const points = curve.data ?? []
    return points.map((p) => ({
      date: p.date,
      label: new Date(p.date).toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' }),
      pv: Math.round(p.plannedValue / 1_000_000),
      ev: Math.round(p.earnedValue  / 1_000_000),
      ac: Math.round(p.actualCost   / 1_000_000),
    }))
  }, [curve.data])

  const zoneBars = useMemo(() => {
    const z = zonePlanFact.data ?? []
    return z.map((row) => ({
      zone:    row.zone,
      label:   row.zone.replace(' · ', '\n'),
      plan:    row.plannedPct,
      fact:    row.factPct,
      lagDays: row.lagDays,
    }))
  }, [zonePlanFact.data])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Контроль СМР · план / факт
          </p>
          <h1 className="text-2xl font-bold tracking-tight">
            {project.data?.name ?? 'Загрузка проекта…'}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {project.data?.code} · {project.data?.developer} · {project.data?.location} ·
            {' '}отчётная дата {project.data ? formatDate(project.data.dataDate) : '—'}
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] font-semibold">
          <Gauge className="h-3 w-3 mr-1" /> mock-данные · API позже
        </Badge>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          title="Физический прогресс"
          value={`${kpis.physical}%`}
          subtitle="взвешенно по PV"
          icon={<TrendingUp className="h-4 w-4" />}
          variant="primary"
        />
        <MetricCard
          title="SPI"
          value={kpis.spi.toFixed(2)}
          subtitle={kpis.spi >= 1 ? 'опережение графика' : 'отставание от графика'}
          icon={<Gauge className="h-4 w-4" />}
          variant={kpis.spi >= 1 ? 'success' : 'warning'}
        />
        <MetricCard
          title="Макс. отставание захватки"
          value={`${kpis.scheduleVariance} дн.`}
          subtitle="по плану vs факт"
          icon={<CalendarClock className="h-4 w-4" />}
          variant={kpis.scheduleVariance > 0 ? 'warning' : 'default'}
        />
        <MetricCard
          title="Задач со статусом «отставание»"
          value={kpis.late}
          subtitle={`из ${tasks.data?.length ?? 0} задач`}
          icon={<AlertTriangle className="h-4 w-4" />}
          variant={kpis.late > 0 ? 'destructive' : 'success'}
        />
      </div>

      {/* S-curve */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">S-кривая освоения портфеля</CardTitle>
          <CardDescription>
            Накопительные значения по месяцам, млн ₸ · PV (план), EV (освоено), AC (факт. затраты)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {curve.isLoading ? (
            <div className="h-72 flex items-center justify-center text-sm text-muted-foreground">Загрузка кривой…</div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={compactCurve} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="cpv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={planColor} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={planColor} stopOpacity={0}    />
                  </linearGradient>
                  <linearGradient id="cev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={factColor} stopOpacity={0.45} />
                    <stop offset="95%" stopColor={factColor} stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="label" stroke={axisColor} fontSize={11} />
                <YAxis stroke={axisColor} fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: tooltipBg, border: `1px solid ${gridColor}`,
                    borderRadius: 8, fontSize: 12,
                  }}
                  formatter={(value: number) => `${value.toLocaleString('ru-RU')} млн ₸`}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="pv" name="PV · план"   stroke={planColor} fillOpacity={1} fill="url(#cpv)" />
                <Area type="monotone" dataKey="ev" name="EV · освоено" stroke={factColor} fillOpacity={1} fill="url(#cev)" />
                <Area type="monotone" dataKey="ac" name="AC · затраты" stroke={acColor}  fill="none"     strokeDasharray="4 3" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Zone plan vs fact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">План / факт по захваткам</CardTitle>
          <CardDescription>Процент выполнения зоны на отчётную дату</CardDescription>
        </CardHeader>
        <CardContent>
          {zonePlanFact.isLoading ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Загрузка…</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={zoneBars} margin={{ top: 10, right: 20, left: 0, bottom: 36 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="zone" stroke={axisColor} fontSize={10} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis stroke={axisColor} fontSize={11} unit="%" />
                <Tooltip
                  contentStyle={{
                    background: tooltipBg, border: `1px solid ${gridColor}`,
                    borderRadius: 8, fontSize: 12,
                  }}
                  formatter={(value: number, name) =>
                    name === 'lagDays' ? `${value} дн.` : `${value}%`
                  }
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="plan" name="План"  fill={planColor} radius={[4, 4, 0, 0]} />
                <Bar dataKey="fact" name="Факт"  fill={factColor} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Filters + tasks table */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base">Журнал задач</CardTitle>
            <CardDescription>
              {filtered.length} из {tasks.data?.length ?? 0} задач — отфильтровано
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Поиск по WBS или названию…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-[220px]"
            />
            <Select value={zoneFilter} onValueChange={setZoneFilter}>
              <SelectTrigger className="h-9 w-[200px]"><SelectValue placeholder="Захватка" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все захватки</SelectItem>
                {ZONE_LIST.map((z) => (
                  <SelectItem key={z} value={z}>{z}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="Статус" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                {(Object.keys(STATUS_META) as TaskStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">WBS</TableHead>
                  <TableHead>Задача</TableHead>
                  <TableHead className="w-[170px]">
                    <MapPin className="h-3 w-3 inline mr-1" />Захватка
                  </TableHead>
                  <TableHead className="w-[110px]">План</TableHead>
                  <TableHead className="w-[110px]">Факт</TableHead>
                  <TableHead className="w-[160px]">Прогресс</TableHead>
                  <TableHead className="w-[100px] text-right">EV, ₸</TableHead>
                  <TableHead className="w-[110px]">Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.isLoading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                      Загрузка задач…
                    </TableCell>
                  </TableRow>
                )}
                {!tasks.isLoading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                      Нет задач, удовлетворяющих фильтру
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((t) => {
                  const meta = STATUS_META[t.status]
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">{t.wbs}</TableCell>
                      <TableCell className="text-sm">{t.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{t.zone}</TableCell>
                      <TableCell className="text-xs">
                        {formatDate(t.plannedStart)}<br />
                        <span className="text-muted-foreground">→ {formatDate(t.plannedFinish)}</span>
                      </TableCell>
                      <TableCell className="text-xs">
                        {t.actualStart ? formatDate(t.actualStart) : '—'}<br />
                        <span className="text-muted-foreground">
                          → {t.actualFinish ? formatDate(t.actualFinish) : '…'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={t.progressPct} className="h-1.5 w-24" />
                          <span className="text-xs font-mono w-9 text-right">{t.progressPct}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono">
                        {formatTg(t.earnedValue, { compact: true })}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] font-semibold px-2 py-0.5 ${meta.tone}`} variant="outline">
                          {meta.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

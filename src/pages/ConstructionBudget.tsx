/**
 * ConstructionBudget — смета и бюджет проекта.
 *
 * EVM-метрики (PV, EV, AC, BAC, CPI, SPI, EAC, ETC, VAC),
 * ComposedChart освоения по времени, таблица сметных позиций
 * с дельтами факт / план.
 *
 * Источник — mock-слой (см. ConstructionProgress).
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ComposedChart, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { MetricCard } from '@/components/MetricCard'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

import {
  Wallet, TrendingUp, TrendingDown, Gauge, AlertTriangle, FileBarChart2, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'

import { useTheme } from '@/hooks/useTheme'
import {
  fetchProject, fetchProgressCurve, fetchCostItems, fetchTasks,
  getCurrentProjectId, formatTg, formatDate,
} from '@/data/constructionMockData'

const PROJECT_ID = getCurrentProjectId()

export default function ConstructionBudget() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const project   = useQuery({ queryKey: ['construction', PROJECT_ID, 'project'],     queryFn: () => fetchProject(PROJECT_ID) })
  const curve     = useQuery({ queryKey: ['construction', PROJECT_ID, 'curve'],       queryFn: () => fetchProgressCurve(PROJECT_ID) })
  const costItems = useQuery({ queryKey: ['construction', PROJECT_ID, 'cost-items'],  queryFn: () => fetchCostItems(PROJECT_ID) })
  const tasks     = useQuery({ queryKey: ['construction', PROJECT_ID, 'tasks'],       queryFn: () => fetchTasks(PROJECT_ID) })

  // EVM-метрики
  const evm = useMemo(() => {
    const list = tasks.data ?? []
    const pv  = list.reduce((a, t) => a + t.plannedValue, 0)
    const ev  = list.reduce((a, t) => a + t.earnedValue, 0)
    const ac  = list.reduce((a, t) => a + t.actualCost,  0)
    const bac = project.data?.budgetTotal ?? 0
    const cpi = ac > 0 ? ev / ac : 1
    const spi = pv > 0 ? ev / pv : 1
    // EAC по индексу CPI (EAC = BAC / CPI) — самый распространённый прогноз
    const eac = cpi > 0 ? bac / cpi : bac
    const etc = Math.max(0, eac - ac)
    const vac = bac - eac    // отрицательное — перерасход
    return { pv, ev, ac, bac, cpi, spi, eac, etc, vac }
  }, [tasks.data, project.data])

  const chartData = useMemo(() => {
    const points = curve.data ?? []
    return points.map((p) => ({
      date: p.date,
      label: new Date(p.date).toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' }),
      pv: Math.round(p.plannedValue / 1_000_000),
      ev: Math.round(p.earnedValue  / 1_000_000),
      ac: Math.round(p.actualCost   / 1_000_000),
    }))
  }, [curve.data])

  // Цвета / chart theme
  const gridColor = isDark ? '#1f2937' : '#e2e8f0'
  const axisColor = isDark ? '#94a3b8' : '#64748b'
  const tooltipBg = isDark ? 'rgba(12,18,30,0.95)' : 'rgba(255,255,255,0.98)'
  const planColor = '#94a3b8'
  const factColor = '#0d9488'
  const acColor   = '#f59e0b'

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Смета и бюджет · EVM
          </p>
          <h1 className="text-2xl font-bold tracking-tight">
            {project.data?.name ?? 'Загрузка проекта…'}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            BAC: <span className="font-semibold">{project.data ? formatTg(project.data.budgetTotal, { compact: true }) : '—'}</span>
            {' '} · отчётная дата {project.data ? formatDate(project.data.dataDate) : '—'}
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] font-semibold">
          <FileBarChart2 className="h-3 w-3 mr-1" /> mock-данные · API позже
        </Badge>
      </div>

      {/* EVM cards · row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          title="PV · план (BCWS)"
          value={formatTg(evm.pv, { compact: true })}
          subtitle="сколько планировали освоить к датe"
          icon={<Wallet className="h-4 w-4" />}
        />
        <MetricCard
          title="EV · освоено (BCWP)"
          value={formatTg(evm.ev, { compact: true })}
          subtitle="физический объём в плановых ценах"
          icon={<TrendingUp className="h-4 w-4" />}
          variant="primary"
        />
        <MetricCard
          title="AC · затраты (ACWP)"
          value={formatTg(evm.ac, { compact: true })}
          subtitle="фактически потраченные средства"
          icon={<TrendingDown className="h-4 w-4" />}
          variant={evm.ac > evm.ev ? 'warning' : 'default'}
        />
        <MetricCard
          title="BAC · бюджет"
          value={formatTg(evm.bac, { compact: true })}
          subtitle="общий бюджет проекта"
          icon={<Gauge className="h-4 w-4" />}
        />
      </div>

      {/* EVM cards · row 2 (indices and forecasts) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          title="SPI"
          value={evm.spi.toFixed(2)}
          subtitle={evm.spi >= 1 ? 'график выполняется' : 'отставание от графика'}
          icon={<Gauge className="h-4 w-4" />}
          variant={evm.spi >= 1 ? 'success' : 'warning'}
        />
        <MetricCard
          title="CPI"
          value={evm.cpi.toFixed(2)}
          subtitle={evm.cpi >= 1 ? 'в рамках бюджета' : 'перерасход бюджета'}
          icon={<Gauge className="h-4 w-4" />}
          variant={evm.cpi >= 1 ? 'success' : 'destructive'}
        />
        <MetricCard
          title="EAC (прогноз стоимости)"
          value={formatTg(evm.eac, { compact: true })}
          subtitle="EAC = BAC / CPI"
          icon={<TrendingUp className="h-4 w-4" />}
          variant={evm.eac > evm.bac ? 'destructive' : 'success'}
        />
        <MetricCard
          title="VAC (отклонение)"
          value={`${evm.vac >= 0 ? '+' : '−'}${formatTg(Math.abs(evm.vac), { compact: true })}`}
          subtitle={evm.vac >= 0 ? 'экономия к BAC' : 'перерасход к BAC'}
          icon={evm.vac >= 0 ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
          variant={evm.vac >= 0 ? 'success' : 'destructive'}
        />
      </div>

      {/* EVM chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">PV / EV / AC по времени</CardTitle>
          <CardDescription>
            Накопительная динамика, млн ₸. EV под PV → отставание; AC над EV → перерасход.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {curve.isLoading ? (
            <div className="h-72 flex items-center justify-center text-sm text-muted-foreground">Загрузка кривой…</div>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="bpv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={planColor} stopOpacity={0.30} />
                    <stop offset="95%" stopColor={planColor} stopOpacity={0}    />
                  </linearGradient>
                  <linearGradient id="bev" x1="0" y1="0" x2="0" y2="1">
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
                <Area type="monotone" dataKey="pv" name="PV"     stroke={planColor} fillOpacity={1} fill="url(#bpv)" />
                <Area type="monotone" dataKey="ev" name="EV"     stroke={factColor} fillOpacity={1} fill="url(#bev)" />
                <Line type="monotone" dataKey="ac" name="AC"     stroke={acColor}   dot={false} strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Cost items table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Сметные позиции (cost items)</CardTitle>
          <CardDescription>
            Освоение по позициям. «Δ к плану» показывает экономию / перерасход.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Код</TableHead>
                  <TableHead>Позиция</TableHead>
                  <TableHead className="w-[80px]">Ед.</TableHead>
                  <TableHead className="w-[100px] text-right">Кол-во</TableHead>
                  <TableHead className="w-[120px] text-right">Цена ед.</TableHead>
                  <TableHead className="w-[140px] text-right">План, ₸</TableHead>
                  <TableHead className="w-[140px] text-right">Факт, ₸</TableHead>
                  <TableHead className="w-[140px] text-right">Δ к плану</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costItems.isLoading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                      Загрузка сметы…
                    </TableCell>
                  </TableRow>
                )}
                {(costItems.data ?? []).map((c) => {
                  const delta = c.actualCost - c.plannedValue
                  const sign  = delta === 0 ? '' : delta > 0 ? '+' : '−'
                  const tone  =
                    c.actualCost === 0      ? 'text-muted-foreground'
                    : delta > 0             ? 'text-destructive'
                    : delta < 0             ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-muted-foreground'
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">{c.externalCode}</TableCell>
                      <TableCell className="text-sm">{c.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.unit}</TableCell>
                      <TableCell className="text-xs text-right font-mono">
                        {c.quantity.toLocaleString('ru-RU')}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono">
                        {formatTg(c.unitPrice, { compact: true })}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono">
                        {formatTg(c.plannedValue, { compact: true })}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono">
                        {c.actualCost === 0 ? '—' : formatTg(c.actualCost, { compact: true })}
                      </TableCell>
                      <TableCell className={`text-xs text-right font-mono font-semibold ${tone}`}>
                        {c.actualCost === 0 ? '—' : `${sign}${formatTg(Math.abs(delta), { compact: true })}`}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Bottom hint */}
          {evm.eac > evm.bac && (
            <div className="mt-3 flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                Прогноз EAC ({formatTg(evm.eac, { compact: true })}) выше BAC
                ({formatTg(evm.bac, { compact: true })}) — ожидается перерасход
                {' '}{formatTg(Math.abs(evm.vac), { compact: true })}. CPI: {evm.cpi.toFixed(2)}.
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

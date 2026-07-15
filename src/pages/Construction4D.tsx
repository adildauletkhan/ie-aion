/**
 * Construction4D — страница 4D-вьюера BIM × график.
 *
 * Сцена @react-three/fiber вынесена в src/scene/construction/BuildingScene.tsx
 * и собирает реалистичные многоэтажные здания (сваи, ростверк, перекрытия,
 * колонны, фасады с окнами, ядро лестнично-лифтового узла, кровля, паркинг).
 *
 * Timeline-слайдер шагает по диапазону project.plannedStart..plannedFinish
 * с шагом 1 день. Прогресс каждой задачи на выбранную дату определяет:
 *   - сколько свай уже забурено;
 *   - присутствует ли ростверк;
 *   - сколько этажей нижнего/верхнего стека уже отлито;
 *   - есть ли кровля и парапет;
 *   - построено ли ядро.
 *
 * Hover/click на любом фрагменте здания выделяет соответствующий
 * BIM-элемент и показывает его атрибуты + связанную задачу графика.
 */

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

import {
  Box, Play, Pause, SkipBack, SkipForward,
  CalendarRange, Layers, Sparkles,
  Activity, TrendingUp, HardHat, Package, ListChecks,
} from 'lucide-react'

import { useTheme } from '@/hooks/useTheme'
import {
  fetchProject, fetchElements, fetchTasks,
  fetchCostItems, fetchResources, fetchAssignments, fetchProgressCurve,
  getCurrentProjectId, formatDate, formatTg,
  type ScheduleTask, type Resource, type TaskAssignment,
  type CostItem, type ProgressCurvePoint,
} from '@/data/constructionMockData'

import {
  ConstructionScene, computeElementsState, DAY_MS, type ElementState,
} from '@/scene/construction/BuildingScene'

const PROJECT_ID = getCurrentProjectId()

const STATE_LEGEND: { state: ElementState; label: string; color: string; opacity: number }[] = [
  { state: 'not_started', label: 'Не начат',    color: '#94a3b8', opacity: 0.45 },
  { state: 'in_progress', label: 'В работе',    color: '#0d9488', opacity: 1.0 },
  { state: 'completed',   label: 'Завершён',    color: '#16a34a', opacity: 1.0 },
]

/* ─────────────────── ХЕЛПЕРЫ ДЛЯ ПРАВОЙ ПАНЕЛИ ──────────────────── */

type Health = 'green' | 'amber' | 'red'

/** Плановый процент задачи на произвольную дату. */
function plannedPctAt(task: ScheduleTask, date: Date): number {
  const s = new Date(task.plannedStart).getTime()
  const f = new Date(task.plannedFinish).getTime()
  const t = date.getTime()
  if (t <= s) return 0
  if (t >= f) return 100
  return ((t - s) / (f - s)) * 100
}

/** Фактический процент задачи на дату (интерполяция от actualStart до dataDate). */
function factPctAt(task: ScheduleTask, date: Date, dataDate: Date): number {
  const t = date.getTime()
  const td = dataDate.getTime()
  if (!task.actualStart) return 0
  const as = new Date(task.actualStart).getTime()
  if (t <= as) return 0
  if (t >= td) return task.progressPct
  if (td <= as) return task.progressPct
  return ((t - as) / (td - as)) * task.progressPct
}

/** Оценка здоровья задачи на текущей дате: 'green' | 'amber' | 'red'. */
function taskHealth(task: ScheduleTask, date: Date, dataDate: Date): Health {
  const plan = plannedPctAt(task, date)
  const fact = factPctAt(task, date, dataDate)
  const overdue = new Date(task.plannedFinish).getTime() < date.getTime() && task.progressPct < 100
  if (overdue) return 'red'
  const delta = fact - plan
  if (delta < -10) return 'red'
  if (delta < -2)  return 'amber'
  return 'green'
}

const HEALTH_COLORS: Record<Health, { bg: string; border: string; text: string; label: string }> = {
  green: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/40', text: 'text-emerald-500', label: 'В графике' },
  amber: { bg: 'bg-amber-500/10',   border: 'border-amber-500/40',   text: 'text-amber-500',   label: 'Отставание' },
  red:   { bg: 'bg-rose-500/10',    border: 'border-rose-500/40',    text: 'text-rose-500',    label: 'Критическое' },
}

/** Парсит "3 800 чел-смен" / "150 маш-смен" → { count, unit } или null. */
function parseScope(scope: string | undefined): { count: number; unit: string } | null {
  if (!scope) return null
  const m = scope.replace(/\u00a0/g, ' ').match(/(\d[\d\s]*)\s*(чел-смен|маш-смен|п\.м|маш-смены|чел\.|комплект|комплекта|комплектов)/i)
  if (!m) return null
  const count = Number(m[1].replace(/\s+/g, ''))
  if (!Number.isFinite(count)) return null
  return { count, unit: m[2].toLowerCase() }
}

/** Пропорция, на которую задача "присутствует" на currentDate (0..1). */
function taskActivity(task: ScheduleTask, date: Date): number {
  const s = new Date(task.plannedStart).getTime()
  const f = new Date(task.plannedFinish).getTime()
  const t = date.getTime()
  if (t < s || t > f) return 0
  return 1
}

export default function Construction4D() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const project     = useQuery({ queryKey: ['construction', PROJECT_ID, 'project'],     queryFn: () => fetchProject(PROJECT_ID) })
  const elements    = useQuery({ queryKey: ['construction', PROJECT_ID, 'elements'],    queryFn: () => fetchElements(PROJECT_ID) })
  const tasks       = useQuery({ queryKey: ['construction', PROJECT_ID, 'tasks'],       queryFn: () => fetchTasks(PROJECT_ID) })
  const costItems   = useQuery({ queryKey: ['construction', PROJECT_ID, 'cost'],        queryFn: () => fetchCostItems(PROJECT_ID) })
  const resources   = useQuery({ queryKey: ['construction', PROJECT_ID, 'resources'],   queryFn: () => fetchResources(PROJECT_ID) })
  const assignments = useQuery({ queryKey: ['construction', PROJECT_ID, 'assignments'], queryFn: () => fetchAssignments(PROJECT_ID) })
  const curve       = useQuery({ queryKey: ['construction', PROJECT_ID, 'curve'],       queryFn: () => fetchProgressCurve(PROJECT_ID) })

  // Быстрый доступ к задаче по id
  const taskById = useMemo<Record<string, ScheduleTask>>(() => {
    const map: Record<string, ScheduleTask> = {}
    for (const t of tasks.data ?? []) map[t.id] = t
    return map
  }, [tasks.data])

  // Диапазон дат проекта
  const [startMs, totalDays] = useMemo(() => {
    if (!project.data) return [0, 0]
    const s = new Date(project.data.plannedStart).getTime()
    const f = new Date(project.data.plannedFinish).getTime()
    return [s, Math.max(1, Math.round((f - s) / DAY_MS))]
  }, [project.data])

  // Индекс текущего дня (0..totalDays). Старт — на отчётной дате проекта.
  const [dayIdx, setDayIdx] = useState<number>(0)
  useEffect(() => {
    if (project.data && totalDays > 0) {
      const d = Math.round((new Date(project.data.dataDate).getTime() - startMs) / DAY_MS)
      setDayIdx(Math.max(0, Math.min(totalDays, d)))
    }
  }, [project.data, startMs, totalDays])

  const currentDate = useMemo<Date | null>(() => {
    if (!startMs) return null
    return new Date(startMs + dayIdx * DAY_MS)
  }, [startMs, dayIdx])

  // Авто-проигрыш: шаг 7 дней / 220 мс
  const [playing, setPlaying] = useState(false)
  const playRef = useRef<number | null>(null)
  useEffect(() => {
    if (!playing || totalDays === 0) return
    playRef.current = window.setInterval(() => {
      setDayIdx((prev) => {
        const next = prev + 7
        if (next >= totalDays) {
          setPlaying(false)
          return totalDays
        }
        return next
      })
    }, 220)
    return () => {
      if (playRef.current) window.clearInterval(playRef.current)
    }
  }, [playing, totalDays])

  // Состояние элементов под текущую дату
  const elementsState = useMemo(
    () => computeElementsState(elements.data ?? [], taskById, currentDate),
    [elements.data, taskById, currentDate],
  )

  // Hover / selection
  const [hoverId,    setHoverId]    = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedEl  = useMemo(
    () => (elements.data ?? []).find((e) => e.id === selectedId) ?? null,
    [elements.data, selectedId],
  )
  const selectedTask = selectedEl ? taskById[selectedEl.taskId] : null

  // Счётчики для легенды
  const sceneStats = useMemo(() => {
    const list = elements.data ?? []
    const counts: Record<ElementState, number> = { not_started: 0, in_progress: 0, completed: 0 }
    for (const el of list) counts[elementsState[el.id] ?? 'not_started']++
    return counts
  }, [elements.data, elementsState])

  /* ─── Агрегаты для правой панели (под currentDate) ───────────────── */

  const dataDate = useMemo<Date | null>(
    () => (project.data ? new Date(project.data.dataDate) : null),
    [project.data],
  )

  /** Активные задачи на текущий день слайдера. */
  const activeTasks = useMemo<ScheduleTask[]>(() => {
    if (!currentDate) return []
    return (tasks.data ?? [])
      .filter((t) => taskActivity(t, currentDate) > 0)
      .sort((a, b) => a.plannedFinish.localeCompare(b.plannedFinish))
  }, [tasks.data, currentDate])

  /** KPI проекта на currentDate: плановый/фактический процент, дельта, отстающие задачи. */
  const projectKpi = useMemo(() => {
    const list = tasks.data ?? []
    if (!list.length || !currentDate || !dataDate) {
      return { planPct: 0, factPct: 0, deltaPct: 0, activeCount: 0, lateCount: 0, doneCount: 0, health: 'green' as Health }
    }
    const totalPv = list.reduce((s, t) => s + t.plannedValue, 0) || 1
    const planSum = list.reduce((s, t) => s + (plannedPctAt(t, currentDate) / 100) * t.plannedValue, 0)
    const factSum = list.reduce((s, t) => s + (factPctAt(t, currentDate, dataDate) / 100) * t.plannedValue, 0)
    const planPct = (planSum / totalPv) * 100
    const factPct = (factSum / totalPv) * 100
    const deltaPct = factPct - planPct
    let lateCount = 0
    let doneCount = 0
    for (const t of list) {
      const h = taskHealth(t, currentDate, dataDate)
      if (h === 'red') lateCount++
      if (plannedPctAt(t, currentDate) >= 100) doneCount++
    }
    const health: Health = deltaPct < -5 ? 'red' : deltaPct < -1.5 ? 'amber' : 'green'
    return {
      planPct: +planPct.toFixed(1),
      factPct: +factPct.toFixed(1),
      deltaPct: +deltaPct.toFixed(1),
      activeCount: activeTasks.length,
      lateCount,
      doneCount,
      health,
    }
  }, [tasks.data, currentDate, dataDate, activeTasks.length])

  /** Трудозатраты на сейчас: ресурсы из active assignments + объёмы. */
  const activeLabor = useMemo(() => {
    if (!currentDate || !assignments.data || !resources.data || !tasks.data) return []
    const activeTaskIds = new Set(activeTasks.map((t) => t.id))
    const acc = new Map<string, {
      resource: Resource
      tasksCount: number
      lead: boolean
      scopes: { count: number; unit: string }[]
      rawScopes: string[]
    }>()
    for (const a of assignments.data as TaskAssignment[]) {
      if (!activeTaskIds.has(a.taskId)) continue
      const r = resources.data.find((x) => x.id === a.resourceId)
      if (!r) continue
      const cur = acc.get(r.id) ?? { resource: r, tasksCount: 0, lead: false, scopes: [], rawScopes: [] }
      cur.tasksCount++
      cur.lead = cur.lead || a.lead
      const parsed = parseScope(a.plannedScope)
      if (parsed) cur.scopes.push(parsed)
      else if (a.plannedScope) cur.rawScopes.push(a.plannedScope)
      acc.set(r.id, cur)
    }
    return Array.from(acc.values()).map((row) => {
      // Суммируем количества по unit
      const totals = new Map<string, number>()
      for (const s of row.scopes) totals.set(s.unit, (totals.get(s.unit) ?? 0) + s.count)
      const scopeSummary = Array.from(totals.entries())
        .map(([unit, count]) => `${count.toLocaleString('ru-RU')} ${unit}`)
        .concat(row.rawScopes)
        .join(' · ') || '—'
      return { ...row, scopeSummary }
    }).sort((a, b) => Number(b.lead) - Number(a.lead) || b.tasksCount - a.tasksCount)
  }, [assignments.data, resources.data, tasks.data, activeTasks, currentDate])

  /** Топ материалов с освоением: actual / planned. */
  const topMaterials = useMemo(() => {
    const list = costItems.data ?? []
    return list
      .slice()
      .sort((a, b) => b.plannedValue - a.plannedValue)
      .slice(0, 6)
      .map((c) => {
        const absorbed = c.plannedValue > 0 ? c.actualCost / c.plannedValue : 0
        let health: Health = 'green'
        if (absorbed > 1.10) health = 'red'
        else if (absorbed > 1.03) health = 'amber'
        else if (absorbed > 0 && absorbed < 0.05) health = 'amber'
        return { item: c, absorbed, health }
      })
  }, [costItems.data])

  const handleSelect = (id: string) => setSelectedId((prev) => prev === id ? null : id)

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            4D-модель · BIM × график
          </p>
          <h1 className="text-2xl font-bold tracking-tight">
            {project.data?.name ?? 'Загрузка проекта…'}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {project.data && (
              <>
                {formatDate(project.data.plannedStart)} → {formatDate(project.data.plannedFinish)}
                {' '} · элементов в модели: {elements.data?.length ?? '—'}
              </>
            )}
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] font-semibold">
          <Sparkles className="h-3 w-3 mr-1" /> demo-сцена · IFC-загрузчик позже
        </Badge>
      </div>

      {/* Main grid: Canvas + right panel */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
        {/* ── Canvas ── */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="h-[600px] relative">
              <Canvas
                shadows
                camera={{ position: [44, 30, 48], fov: 38, near: 0.5, far: 500 }}
                gl={{
                  antialias: true,
                  logarithmicDepthBuffer: true,
                  powerPreference: 'high-performance',
                  stencil: false,
                }}
                dpr={[1, 2]}
                style={{ background: isDark ? '#050d18' : '#dde6f0' }}
              >
                <Suspense fallback={null}>
                  <ConstructionScene
                    isDark={isDark}
                    elements={elements.data ?? []}
                    taskById={taskById}
                    currentDate={currentDate}
                    hoverId={hoverId}
                    selectedId={selectedId}
                    onClick={handleSelect}
                    onHover={setHoverId}
                  />
                  <OrbitControls
                    makeDefault
                    enableDamping
                    dampingFactor={0.08}
                    minDistance={10}
                    maxDistance={160}
                    maxPolarAngle={Math.PI / 2 - 0.02}
                    target={[0, 16, 0]}
                  />
                </Suspense>
              </Canvas>

              {/* Legend overlay */}
              <div className="absolute top-3 left-3 rounded-lg border bg-background/85 backdrop-blur px-3 py-2 text-[11px] space-y-1">
                {STATE_LEGEND.map((l) => (
                  <div key={l.state} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: l.color, opacity: l.opacity }} />
                    {l.label} · {sceneStats[l.state]}
                  </div>
                ))}
              </div>

              {/* Helper hint */}
              <div className="absolute top-3 right-3 rounded-lg border bg-background/85 backdrop-blur px-3 py-1.5 text-[10px] text-muted-foreground">
                ЛКМ — выделить · перетянуть — вращать · колесо — приблизить
              </div>
            </div>

            {/* Timeline */}
            <div className="p-4 border-t space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-semibold">
                    {currentDate ? formatDate(currentDate.toISOString()) : '—'}
                  </span>
                  <span className="text-muted-foreground">
                    · день {dayIdx + 1} из {totalDays + 1}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDayIdx(0)}>
                    <SkipBack className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPlaying((p) => !p)}>
                    {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDayIdx(totalDays)}>
                    <SkipForward className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <Slider
                min={0}
                max={totalDays}
                step={1}
                value={[dayIdx]}
                onValueChange={(v) => setDayIdx(v[0] ?? 0)}
              />
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{project.data ? formatDate(project.data.plannedStart) : '—'}</span>
                <span>{project.data ? formatDate(project.data.dataDate) : '—'} · отчётная</span>
                <span>{project.data ? formatDate(project.data.plannedFinish) : '—'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Right side panel: scrollable stack ── */}
        <div className="lg:sticky lg:top-4 self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto space-y-3 pr-1">

          {/* Selected element details (shown only when something selected) */}
          {selectedEl && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Box className="h-4 w-4" /> Выбранный элемент
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Имя</p>
                  <p className="font-semibold text-sm">{selectedEl.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Тип</p>
                    <p className="font-mono text-[11px]">{selectedEl.type}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">GUID</p>
                    <p className="font-mono text-[11px]">{selectedEl.guid}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Уровень</p>
                    <p>{selectedEl.level}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Захватка</p>
                    <p className="truncate">{selectedEl.zone}</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                    <Layers className="h-3 w-3 inline mr-1" />Связанная задача
                  </p>
                  {selectedTask ? (
                    <div className="rounded-md border p-2 space-y-1">
                      <p className="font-semibold">{selectedTask.name}</p>
                      <p className="text-muted-foreground">
                        WBS: <span className="font-mono">{selectedTask.wbs}</span>
                      </p>
                      <p className="text-muted-foreground">
                        {formatDate(selectedTask.plannedStart)} → {formatDate(selectedTask.plannedFinish)}
                      </p>
                      <p>
                        Прогресс (факт на dataDate): <span className="font-semibold">{selectedTask.progressPct}%</span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Не привязан к задаче</p>
                  )}
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Сметная стоимость</span>
                  <span className="font-mono font-semibold">
                    {formatTg(selectedEl.cost, { compact: true })}
                  </span>
                </div>
                <Button
                  variant="outline" size="sm" className="w-full text-xs h-8"
                  onClick={() => setSelectedId(null)}
                >
                  Снять выделение
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 1. Индикаторы проекта */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs flex items-center gap-2">
                <Activity className="h-3.5 w-3.5" /> Индикаторы проекта
              </CardTitle>
              <CardDescription className="text-[10px]">
                На дату {currentDate ? formatDate(currentDate.toISOString()) : '—'}
                {dataDate && currentDate && currentDate > dataDate && (
                  <span className="text-amber-500"> · прогноз (после отчётной)</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pb-3">
              <div className="grid grid-cols-2 gap-2">
                <KpiTile
                  label="План"
                  value={`${projectKpi.planPct.toFixed(1)}%`}
                  hint={`PV-взвешенный`}
                  health="green"
                />
                <KpiTile
                  label="Факт"
                  value={`${projectKpi.factPct.toFixed(1)}%`}
                  hint={`${projectKpi.deltaPct >= 0 ? '+' : ''}${projectKpi.deltaPct.toFixed(1)} п.п.`}
                  health={projectKpi.health}
                />
                <KpiTile
                  label="Активно работ"
                  value={`${projectKpi.activeCount}`}
                  hint={`завершено: ${projectKpi.doneCount}`}
                  health={projectKpi.activeCount === 0 ? 'amber' : 'green'}
                />
                <KpiTile
                  label="Отстаёт задач"
                  value={`${projectKpi.lateCount}`}
                  hint={projectKpi.lateCount === 0 ? 'критических нет' : 'критическое'}
                  health={projectKpi.lateCount > 2 ? 'red' : projectKpi.lateCount > 0 ? 'amber' : 'green'}
                />
              </div>
              <div className={`rounded-md border px-2.5 py-1.5 text-[10px] flex items-center justify-between ${HEALTH_COLORS[projectKpi.health].border} ${HEALTH_COLORS[projectKpi.health].bg}`}>
                <span className="font-semibold uppercase tracking-wider">Статус проекта</span>
                <span className={`font-semibold ${HEALTH_COLORS[projectKpi.health].text}`}>
                  {HEALTH_COLORS[projectKpi.health].label}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 2. Динамика прогресса по времени */}
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5" /> Динамика прогресса
              </CardTitle>
              <CardDescription className="text-[10px]">
                План (пунктир) vs факт освоения · вертикаль — выбранная дата
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-1 pb-3">
              <MiniCurve
                data={curve.data ?? []}
                currentDate={currentDate}
                dataDate={dataDate}
              />
              <div className="flex items-center justify-between text-[10px] mt-1">
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-3 bg-muted-foreground" /> План
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-3 bg-emerald-500" /> Факт (EV)
                </span>
                <span className="flex items-center gap-1.5 text-amber-500">
                  <span className="h-3 w-px bg-amber-500" /> сейчас
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 3. Перечень работ (активных) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs flex items-center gap-2">
                <ListChecks className="h-3.5 w-3.5" /> Работы на площадке
                <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1.5">
                  {activeTasks.length}
                </Badge>
              </CardTitle>
              <CardDescription className="text-[10px]">
                По плановым датам — задачи, попадающие на выбранный день
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pb-3 max-h-[260px] overflow-y-auto">
              {activeTasks.length === 0 && (
                <p className="text-[11px] text-muted-foreground italic">Нет активных задач на эту дату.</p>
              )}
              {activeTasks.map((t) => {
                if (!currentDate || !dataDate) return null
                const health = taskHealth(t, currentDate, dataDate)
                const plan = plannedPctAt(t, currentDate)
                const fact = factPctAt(t, currentDate, dataDate)
                const c = HEALTH_COLORS[health]
                return (
                  <div key={t.id} className={`rounded-md border px-2 py-1.5 ${c.border} ${c.bg}`}>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <p className="text-[11px] font-semibold leading-tight">{t.name}</p>
                      <span className={`text-[9px] font-semibold uppercase tracking-wider ${c.text} shrink-0`}>
                        {c.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {t.zone} · до {formatDate(t.plannedFinish)}
                      {t.responsibleName && <> · {t.responsibleName}</>}
                    </p>
                    {/* dual progress bar: plan (light) vs fact */}
                    <div className="relative h-1.5 bg-muted rounded-full mt-1.5 overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-muted-foreground/40" style={{ width: `${plan}%` }} />
                      <div className={`absolute inset-y-0 left-0 ${health === 'green' ? 'bg-emerald-500' : health === 'amber' ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${fact}%` }} />
                    </div>
                    <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                      <span>план {plan.toFixed(0)}%</span>
                      <span>факт {fact.toFixed(0)}%</span>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* 4. Трудозатраты / ресурсы */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs flex items-center gap-2">
                <HardHat className="h-3.5 w-3.5" /> Трудозатраты
                <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1.5">
                  {activeLabor.length}
                </Badge>
              </CardTitle>
              <CardDescription className="text-[10px]">
                Бригады / техника, задействованные на активных работах
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5 pb-3 max-h-[260px] overflow-y-auto">
              {activeLabor.length === 0 && (
                <p className="text-[11px] text-muted-foreground italic">Нет назначений на эту дату.</p>
              )}
              {activeLabor.map((row) => {
                const r = row.resource
                const typeLabel: Record<Resource['type'], string> = {
                  contractor: 'Генподряд',
                  subcontractor: 'Субподряд',
                  inhouse: 'Свой ресурс',
                  equipment: 'Техника',
                  material: 'Материал',
                }
                return (
                  <div key={r.id} className="rounded-md border px-2 py-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[11px] font-semibold leading-tight truncate">{r.name}</p>
                      <span className={`text-[9px] font-semibold uppercase tracking-wider shrink-0 ${r.mobilized ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {r.mobilized ? '● моб.' : '○ не моб.'}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {typeLabel[r.type]} · задач: {row.tasksCount}
                      {row.lead && <span className="text-foreground font-semibold"> · ведущий</span>}
                    </p>
                    <p className="text-[10px] mt-0.5 font-mono">{row.scopeSummary}</p>
                    {r.capacity && (
                      <p className="text-[9px] text-muted-foreground mt-0.5 italic truncate">{r.capacity}</p>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* 5. Материалы */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs flex items-center gap-2">
                <Package className="h-3.5 w-3.5" /> Материалы и оборудование
              </CardTitle>
              <CardDescription className="text-[10px]">
                Топ позиций сметы · освоение AC / PV
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5 pb-3 max-h-[300px] overflow-y-auto">
              {topMaterials.map(({ item, absorbed, health }) => {
                const c = HEALTH_COLORS[health]
                const pct = Math.min(120, absorbed * 100)
                return (
                  <div key={item.id} className="rounded-md border px-2 py-1.5">
                    <div className="flex justify-between items-start gap-1.5">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold leading-tight truncate">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {item.externalCode} · {item.quantity.toLocaleString('ru-RU')} {item.unit}
                        </p>
                      </div>
                      <span className={`text-[9px] font-semibold ${c.text} shrink-0`}>
                        {absorbed === 0 ? '—' : `${(absorbed * 100).toFixed(0)}%`}
                      </span>
                    </div>
                    <div className="relative h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                      <div className={`absolute inset-y-0 left-0 ${health === 'green' ? 'bg-emerald-500' : health === 'amber' ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${pct}%` }} />
                      {/* 100% notch */}
                      <div className="absolute inset-y-0 w-px bg-foreground/40" style={{ left: `${100 * (100 / 120)}%` }} />
                    </div>
                    <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                      <span>план: {formatTg(item.plannedValue, { compact: true })}</span>
                      <span>факт: {item.actualCost ? formatTg(item.actualCost, { compact: true }) : '—'}</span>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {!selectedEl && (
            <div className="rounded-md border border-dashed p-3 text-muted-foreground text-[10px] leading-relaxed">
              Кликните по любой части здания — фундаменту, этажу, ядру или паркингу — здесь появятся
              атрибуты IFC, связанная задача и сметная стоимость.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ───────────────────── ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ ──────────────────────── */

interface KpiTileProps {
  label: string
  value: string
  hint?: string
  health: Health
}

function KpiTile({ label, value, hint, health }: KpiTileProps) {
  const c = HEALTH_COLORS[health]
  return (
    <div className={`rounded-md border px-2 py-1.5 ${c.border} ${c.bg}`}>
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-base font-bold leading-tight ${c.text}`}>{value}</p>
      {hint && <p className="text-[9px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  )
}

interface MiniCurveProps {
  data: ProgressCurvePoint[]
  currentDate: Date | null
  dataDate: Date | null
}

function MiniCurve({ data, currentDate, dataDate }: MiniCurveProps) {
  if (!data.length || !currentDate) {
    return <div className="h-[100px] flex items-center justify-center text-[10px] text-muted-foreground italic">Загрузка S-кривой…</div>
  }
  const W = 340, H = 100
  const P = { l: 6, r: 6, t: 6, b: 14 }
  const innerW = W - P.l - P.r
  const innerH = H - P.t - P.b
  const last = data[data.length - 1]
  const maxV = last.plannedValue || 1

  const xAt = (i: number) => P.l + (i / Math.max(1, data.length - 1)) * innerW
  const yAt = (v: number) => P.t + innerH - (v / maxV) * innerH

  const planPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(d.plannedValue).toFixed(1)}`)
    .join(' ')

  const factPts: { i: number; v: number }[] = []
  for (let i = 0; i < data.length; i++) {
    const d = data[i]
    if (dataDate && new Date(d.date) > dataDate) break
    factPts.push({ i, v: d.earnedValue })
  }
  const factPath = factPts.length
    ? factPts.map((p, k) => `${k === 0 ? 'M' : 'L'}${xAt(p.i).toFixed(1)},${yAt(p.v).toFixed(1)}`).join(' ')
    : ''

  // current-date marker
  const startMs = new Date(data[0].date).getTime()
  const endMs = new Date(data[data.length - 1].date).getTime()
  const tFrac = Math.max(0, Math.min(1, (currentDate.getTime() - startMs) / Math.max(1, endMs - startMs)))
  const tx = P.l + tFrac * innerW

  // data-date marker (отчётная)
  let dx: number | null = null
  if (dataDate) {
    const dFrac = Math.max(0, Math.min(1, (dataDate.getTime() - startMs) / Math.max(1, endMs - startMs)))
    dx = P.l + dFrac * innerW
  }

  // Fill area between plan and fact up to current date
  const factValueAtCurrent = (() => {
    // approximate at slider date: linear from last fact value
    const lastFact = factPts.length ? factPts[factPts.length - 1].v : 0
    return lastFact
  })()
  const planValueAtCurrent = (() => {
    // approximate plan value at tx
    const idxFloat = tFrac * (data.length - 1)
    const i0 = Math.floor(idxFloat)
    const i1 = Math.min(data.length - 1, i0 + 1)
    const f = idxFloat - i0
    return data[i0].plannedValue * (1 - f) + data[i1].plannedValue * f
  })()
  const deviation = factValueAtCurrent - planValueAtCurrent
  const deviationColor = deviation < -maxV * 0.05 ? '#f43f5e' : deviation < -maxV * 0.015 ? '#f59e0b' : '#10b981'

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 110 }}>
      {/* grid */}
      <line x1={P.l} x2={W - P.r} y1={H - P.b} y2={H - P.b} stroke="currentColor" strokeOpacity="0.15" />
      <line x1={P.l} x2={W - P.r} y1={P.t + innerH * 0.5} y2={P.t + innerH * 0.5} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="2 3" />

      {/* plan */}
      <path d={planPath} fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1" strokeDasharray="3 2" />
      {/* fact */}
      {factPath && <path d={factPath} fill="none" stroke="#10b981" strokeWidth="1.8" />}

      {/* data-date vertical marker */}
      {dx !== null && (
        <g>
          <line x1={dx} x2={dx} y1={P.t} y2={H - P.b} stroke="currentColor" strokeOpacity="0.25" strokeDasharray="1 2" />
          <text x={dx + 3} y={P.t + 8} fontSize="8" fill="currentColor" opacity="0.55">отчётная</text>
        </g>
      )}

      {/* current-date marker */}
      <line x1={tx} x2={tx} y1={P.t} y2={H - P.b} stroke={deviationColor} strokeWidth="1.5" />
      <circle cx={tx} cy={yAt(factValueAtCurrent)} r="3" fill={deviationColor} />
      <text x={tx} y={H - 3} fontSize="9" fill={deviationColor} fontWeight="bold" textAnchor="middle">сейчас</text>
    </svg>
  )
}

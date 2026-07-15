/**
 * ConstructionPlanning — WBS-планирование строительного проекта.
 *
 * Модуль заменяет нефтяную страницу `PlanningPage` для отрасли `construction`.
 * Делится на 4 представления:
 *   ▸ WBS / иерархия работ — дерево «фаза → задача» с прогрессом, бюджетом,
 *     ответственными ИТР и привязанными подрядчиками.
 *   ▸ Диаграмма Ганта — SVG-гантт с цветными барами по фазам, текущей датой,
 *     ромбиками вех и линиями зависимостей FS/SS.
 *   ▸ Вехи — карточки ключевых событий со статусом (reached / at_risk / upcoming).
 *   ▸ Ресурсы и подрядчики — реестр исполнителей (генподряд / субподряд /
 *     свои бригады / техника) с мобилизованностью и охватом задач.
 *
 * Источник данных — mock-слой `src/data/constructionMockData.ts`, доступ через
 * `react-query`, поэтому при появлении бэкенда меняются только URL внутри
 * `fetchXxx`.
 */

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

import {
  CalendarRange, ListTree, Diamond, HardHat, ChevronRight, ChevronDown,
  Search, AlertTriangle, CheckCircle2, Clock, Building2, Truck, Users, Briefcase,
  LayoutGrid, Table as TableIcon, Database, Package,
} from 'lucide-react'

import { useTheme } from '@/hooks/useTheme'
import {
  fetchProject, fetchTasks, fetchPhases, fetchResources,
  fetchMilestones, fetchAssignments, fetchDependencies,
  getCurrentProjectId, formatDate, formatTg,
  type ScheduleTask, type Phase, type Resource, type Milestone,
  type TaskAssignment, type TaskDependency, type ResourceType,
  type MilestoneStatus, type DeliveryStatus, type ResourceErpSource,
} from '@/data/constructionMockData'

const PROJECT_ID = getCurrentProjectId()

/* ───────────────────────── ХЕЛПЕРЫ И КОНСТАНТЫ ────────────────────────── */

const STATUS_META: Record<ScheduleTask['status'], { label: string; tone: string }> = {
  planned:     { label: 'План',       tone: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'В работе',   tone: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  done:        { label: 'Завершено',  tone: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
  late:        { label: 'Отставание', tone: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
}

const MILESTONE_META: Record<MilestoneStatus, { label: string; tone: string; icon: typeof CheckCircle2 }> = {
  reached:  { label: 'Достигнута',     tone: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400', icon: CheckCircle2 },
  at_risk:  { label: 'Под угрозой',    tone: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',      icon: AlertTriangle },
  missed:   { label: 'Пропущена',      tone: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',          icon: AlertTriangle },
  upcoming: { label: 'Предстоит',      tone: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',             icon: Clock },
}

// Категории ресурсов различаются иконкой и подписью, цвет — нейтральный
const RESOURCE_META: Record<ResourceType, { label: string; icon: typeof Building2; tone: string }> = {
  contractor:    { label: 'Генподрядчик',   icon: Building2,  tone: 'bg-muted text-muted-foreground' },
  subcontractor: { label: 'Субподрядчик',   icon: Briefcase,  tone: 'bg-muted text-muted-foreground' },
  inhouse:       { label: 'Свои ресурсы',   icon: Users,      tone: 'bg-muted text-muted-foreground' },
  equipment:     { label: 'Спецтехника',    icon: Truck,      tone: 'bg-muted text-muted-foreground' },
  material:      { label: 'Материалы',      icon: Package,    tone: 'bg-muted text-muted-foreground' },
}

// Источники ERP различаются только подписью — единый нейтральный бейдж
const ERP_META: Record<ResourceErpSource, { label: string; tone: string }> = {
  erp_1c:  { label: '1С:ERP',           tone: 'bg-muted text-muted-foreground border-border' },
  upp_1c:  { label: '1С:УПП',           tone: 'bg-muted text-muted-foreground border-border' },
  buh_1c:  { label: '1С:Бухгалтерия',   tone: 'bg-muted text-muted-foreground border-border' },
  sap_ps:  { label: 'SAP PS',           tone: 'bg-muted text-muted-foreground border-border' },
  manual:  { label: 'ручной ввод',      tone: 'bg-muted text-muted-foreground border-border' },
}

const DELIVERY_META: Record<DeliveryStatus, { label: string; tone: string }> = {
  pending:   { label: 'Ожидание',          tone: 'bg-muted text-muted-foreground' },
  ordered:   { label: 'Заказано',          tone: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
  partial:   { label: 'Частично',          tone: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  delivered: { label: 'Поставлено',        tone: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
}

const DAY_MS = 86_400_000
const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / DAY_MS)

/** Цвет варианса AC vs PV (от факта к плану). */
function costVarianceTone(planned: number, actual: number): { tone: string; label: string } {
  if (actual === 0 && planned > 0) return { tone: 'text-muted-foreground', label: '—' }
  const ratio = planned > 0 ? actual / planned : 1
  if (ratio > 1.05) return { tone: 'text-rose-600 dark:text-rose-400',    label: `+${((ratio - 1) * 100).toFixed(1)}%` }
  if (ratio > 1.00) return { tone: 'text-amber-600 dark:text-amber-400',  label: `+${((ratio - 1) * 100).toFixed(1)}%` }
  if (ratio < 0.95 && actual > 0) return { tone: 'text-emerald-600 dark:text-emerald-400', label: `−${((1 - ratio) * 100).toFixed(1)}%` }
  return { tone: 'text-muted-foreground', label: 'в плане' }
}

/* ───────────────────────── ОСНОВНОЙ КОМПОНЕНТ ─────────────────────────── */

export default function ConstructionPlanning() {
  const project       = useQuery({ queryKey: ['constr', 'project'],      queryFn: () => fetchProject(PROJECT_ID) })
  const phases        = useQuery({ queryKey: ['constr', 'phases'],       queryFn: () => fetchPhases(PROJECT_ID) })
  const tasks         = useQuery({ queryKey: ['constr', 'tasks'],        queryFn: () => fetchTasks(PROJECT_ID) })
  const milestones    = useQuery({ queryKey: ['constr', 'milestones'],   queryFn: () => fetchMilestones(PROJECT_ID) })
  const resources     = useQuery({ queryKey: ['constr', 'resources'],    queryFn: () => fetchResources(PROJECT_ID) })
  const assignments   = useQuery({ queryKey: ['constr', 'assignments'],  queryFn: () => fetchAssignments(PROJECT_ID) })
  const dependencies  = useQuery({ queryKey: ['constr', 'dependencies'], queryFn: () => fetchDependencies(PROJECT_ID) })

  const isLoading =
    project.isLoading || phases.isLoading || tasks.isLoading ||
    milestones.isLoading || resources.isLoading || assignments.isLoading ||
    dependencies.isLoading

  const phaseById = useMemo(() => {
    const map: Record<string, Phase> = {}
    for (const p of phases.data ?? []) map[p.id] = p
    return map
  }, [phases.data])

  const resourceById = useMemo(() => {
    const map: Record<string, Resource> = {}
    for (const r of resources.data ?? []) map[r.id] = r
    return map
  }, [resources.data])

  const taskById = useMemo(() => {
    const map: Record<string, ScheduleTask> = {}
    for (const t of tasks.data ?? []) map[t.id] = t
    return map
  }, [tasks.data])

  /* assignments_by_task: taskId → [TaskAssignment, ...] */
  const assignmentsByTask = useMemo(() => {
    const map: Record<string, TaskAssignment[]> = {}
    for (const a of assignments.data ?? []) {
      ;(map[a.taskId] ||= []).push(a)
    }
    return map
  }, [assignments.data])

  /* assignments_by_resource: resourceId → [taskId, ...] */
  const taskIdsByResource = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const a of assignments.data ?? []) {
      ;(map[a.resourceId] ||= []).push(a.taskId)
    }
    return map
  }, [assignments.data])

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b bg-background shrink-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <CalendarRange className="h-6 w-6 text-primary" />
              Планирование проекта
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {project.data
                ? <>WBS-структура, график, вехи, ресурсы и подрядчики проекта <b>{project.data.name}</b></>
                : 'Загрузка данных проекта…'}
            </p>
          </div>
          {project.data && (
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Stat label="Старт"        value={formatDate(project.data.plannedStart)} />
              <Stat label="Финиш"        value={formatDate(project.data.plannedFinish)} />
              <Stat label="BAC"          value={formatTg(project.data.budgetTotal, { compact: true })} />
              <Stat label="Фаз"          value={String(phases.data?.length      ?? 0)} />
              <Stat label="Задач"        value={String(tasks.data?.length       ?? 0)} />
              <Stat label="Вех"          value={String(milestones.data?.length  ?? 0)} />
              <Stat label="Ресурсов"     value={String(resources.data?.length   ?? 0)} />
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="wbs" className="flex flex-col flex-1 min-h-0">
        <div className="px-6 border-b bg-background shrink-0">
          <TabsList className="h-auto p-0 bg-transparent gap-0 rounded-none">
            <PlanTab value="wbs"        icon={ListTree}      label="WBS / иерархия работ" />
            <PlanTab value="gantt"      icon={CalendarRange} label="Диаграмма Ганта" />
            <PlanTab value="milestones" icon={Diamond}       label="Вехи" />
            <PlanTab value="resources"  icon={HardHat}       label="Ресурсы и подрядчики" />
          </TabsList>
        </div>

        <TabsContent value="wbs" className="flex-1 overflow-auto m-0 p-6">
          {isLoading
            ? <Loader />
            : <WbsTreeView
                phases={phases.data ?? []}
                tasks={tasks.data ?? []}
                assignmentsByTask={assignmentsByTask}
                resourceById={resourceById}
              />}
        </TabsContent>

        <TabsContent value="gantt" className="flex-1 overflow-auto m-0 p-6">
          {isLoading
            ? <Loader />
            : <GanttView
                phases={phases.data ?? []}
                phaseById={phaseById}
                tasks={tasks.data ?? []}
                milestones={milestones.data ?? []}
                dependencies={dependencies.data ?? []}
                dataDate={project.data?.dataDate ?? null}
              />}
        </TabsContent>

        <TabsContent value="milestones" className="flex-1 overflow-auto m-0 p-6">
          {isLoading
            ? <Loader />
            : <MilestonesView
                milestones={milestones.data ?? []}
                phaseById={phaseById}
                taskById={taskById}
                dataDate={project.data?.dataDate ?? null}
              />}
        </TabsContent>

        <TabsContent value="resources" className="flex-1 overflow-auto m-0 p-6">
          {isLoading
            ? <Loader />
            : <ResourcesView
                resources={resources.data ?? []}
                taskIdsByResource={taskIdsByResource}
                taskById={taskById}
                phaseById={phaseById}
              />}
        </TabsContent>
      </Tabs>
    </div>
  )
}

/* ───────────────────────── ОБЩИЕ САБ-КОМПОНЕНТЫ ───────────────────────── */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2.5 py-1.5 rounded-md border border-border bg-muted/40">
      <span className="uppercase tracking-wide text-[10px]">{label}: </span>
      <b className="text-foreground">{value}</b>
    </div>
  )
}

function PlanTab({ value, icon: Icon, label }: { value: string; icon: typeof CalendarRange; label: string }) {
  return (
    <TabsTrigger
      value={value}
      className="flex items-center gap-2 px-4 py-3 text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent hover:text-foreground transition-colors"
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </TabsTrigger>
  )
}

function Loader() {
  return (
    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
      Загрузка…
    </div>
  )
}

/* ─────────────────────────── WBS / TREE ───────────────────────────────── */

interface WbsTreeViewProps {
  phases: Phase[]
  tasks: ScheduleTask[]
  assignmentsByTask: Record<string, TaskAssignment[]>
  resourceById: Record<string, Resource>
}

type WbsViewMode = 'table' | 'kanban'

function WbsTreeView({ phases, tasks, assignmentsByTask, resourceById }: WbsTreeViewProps) {
  const [view, setView] = useState<WbsViewMode>('table')
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(phases.map((p) => [p.id, true])),
  )
  const [search, setSearch] = useState('')
  const [filterPhase, setFilterPhase] = useState<string>('all')

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tasks.filter((t) => {
      if (filterPhase !== 'all' && t.phaseId !== filterPhase) return false
      if (!q) return true
      return (
        t.name.toLowerCase().includes(q) ||
        t.wbs.toLowerCase().includes(q) ||
        (t.responsibleName ?? '').toLowerCase().includes(q) ||
        (t.zone ?? '').toLowerCase().includes(q)
      )
    })
  }, [tasks, search, filterPhase])

  const tasksByPhase = useMemo(() => {
    const map: Record<string, ScheduleTask[]> = {}
    for (const t of filteredTasks) {
      if (!t.phaseId) continue
      ;(map[t.phaseId] ||= []).push(t)
    }
    for (const arr of Object.values(map)) {
      arr.sort((a, b) => a.wbs.localeCompare(b.wbs, undefined, { numeric: true }))
    }
    return map
  }, [filteredTasks])

  /* Сумма PV/EV/AC по проекту с учётом фильтра — для шапки */
  const totals = useMemo(() => {
    const pv = filteredTasks.reduce((s, t) => s + t.plannedValue, 0)
    const ev = filteredTasks.reduce((s, t) => s + t.earnedValue,  0)
    const ac = filteredTasks.reduce((s, t) => s + t.actualCost,   0)
    return { pv, ev, ac }
  }, [filteredTasks])

  return (
    <div className="space-y-4">
      {/* Filters + view toggle */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по WBS, задаче, ответственному, захватке…"
            className="pl-8 w-[360px]"
          />
        </div>
        <Select value={filterPhase} onValueChange={setFilterPhase}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Фаза" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все фазы ({phases.length})</SelectItem>
            {phases.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.code} · {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* PV / EV / AC сводка */}
        <div className="hidden xl:flex items-center gap-2 ml-2 text-[11px]">
          <Stat label="PV" value={formatTg(totals.pv, { compact: true })} />
          <Stat label="EV" value={formatTg(totals.ev, { compact: true })} />
          <Stat label="AC" value={formatTg(totals.ac, { compact: true })} />
        </div>

        {/* View toggle */}
        <div className="ml-auto flex items-center gap-2">
          {view === 'table' && (
            <>
              <Button variant="outline" size="sm" onClick={() => setOpen(Object.fromEntries(phases.map((p) => [p.id, true])))}>
                Развернуть всё
              </Button>
              <Button variant="outline" size="sm" onClick={() => setOpen({})}>
                Свернуть всё
              </Button>
            </>
          )}
          <div className="inline-flex rounded-md border bg-background p-0.5">
            <Button
              variant={view === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => setView('table')}
            >
              <TableIcon className="h-3.5 w-3.5 mr-1.5" /> Таблица
            </Button>
            <Button
              variant={view === 'kanban' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => setView('kanban')}
            >
              <LayoutGrid className="h-3.5 w-3.5 mr-1.5" /> Канбан
            </Button>
          </div>
        </div>
      </div>

      {/* Tree (table) or Kanban */}
      {view === 'table' ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[44%]">WBS / Наименование</TableHead>
                  <TableHead className="w-[90px]">Длит.</TableHead>
                  <TableHead>План старт</TableHead>
                  <TableHead>План финиш</TableHead>
                  <TableHead className="w-[120px]">Прогресс</TableHead>
                  <TableHead className="text-right">Бюджет (PV)</TableHead>
                  <TableHead className="text-right">Факт (AC)</TableHead>
                  <TableHead className="text-right w-[100px]">Δ к плану</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {phases.map((phase) => {
                  const phTasks  = tasksByPhase[phase.id] ?? []
                  const isOpen   = open[phase.id] ?? false
                  const phPv     = phTasks.reduce((s, t) => s + t.plannedValue, 0)
                  const phAc     = phTasks.reduce((s, t) => s + t.actualCost,   0)
                  const phProg   = phTasks.length
                    ? Math.round(
                        phTasks.reduce((s, t) => s + (t.progressPct / 100) * t.plannedValue, 0) /
                        Math.max(1, phPv) * 100,
                      )
                    : 0
                  const phStart = phTasks.reduce<string | null>((min, t) =>
                    !min || t.plannedStart  < min ? t.plannedStart  : min, null)
                  const phFinish = phTasks.reduce<string | null>((max, t) =>
                    !max || t.plannedFinish > max ? t.plannedFinish : max, null)
                  const phVar = costVarianceTone(phPv, phAc)

                  if (phTasks.length === 0 && (search || filterPhase !== 'all')) {
                    return null
                  }

                  return (
                    <RowGroup key={phase.id}>
                      <TableRow
                        className="bg-muted/40 cursor-pointer hover:bg-muted/60"
                        onClick={() => setOpen((s) => ({ ...s, [phase.id]: !isOpen }))}
                      >
                        <TableCell className="font-semibold">
                          <div className="flex items-center gap-2">
                            {isOpen
                              ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                            <span
                              className="inline-block w-3 h-3 rounded-sm"
                              style={{ background: phase.color }}
                            />
                            <span className="text-xs font-mono text-muted-foreground">{phase.code}</span>
                            <span>{phase.name}</span>
                            <Badge variant="outline" className="ml-2 text-[10px]">
                              {phTasks.length} задач
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {phStart && phFinish ? `${daysBetween(phStart, phFinish)} дн.` : '—'}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{phStart  ? formatDate(phStart)  : '—'}</TableCell>
                        <TableCell className="font-mono text-xs">{phFinish ? formatDate(phFinish) : '—'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={phProg} className="h-1.5" />
                            <span className="text-xs text-muted-foreground tabular-nums w-9">{phProg}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {formatTg(phPv, { compact: true })}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {phAc > 0 ? formatTg(phAc, { compact: true }) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className={`text-right font-mono text-xs ${phVar.tone}`}>
                          {phVar.label}
                        </TableCell>
                      </TableRow>

                      {isOpen && phTasks.map((task) => {
                        const meta  = STATUS_META[task.status]
                        const asgns = assignmentsByTask[task.id] ?? []
                        const lead  = asgns.find((a) => a.lead)
                        const leadRes  = lead  ? resourceById[lead.resourceId]  : undefined
                        const otherRes = asgns.filter((a) => !a.lead)
                          .map((a) => resourceById[a.resourceId])
                          .filter(Boolean) as Resource[]
                        const taskVar = costVarianceTone(task.plannedValue, task.actualCost)
                        return (
                          <TableRow key={task.id} className="text-sm">
                            <TableCell>
                              <div className="pl-8 flex flex-col gap-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-xs text-muted-foreground">{task.wbs}</span>
                                  <span className="font-medium">{task.name}</span>
                                  <Badge variant="secondary" className={`text-[10px] ${meta.tone}`}>
                                    {meta.label}
                                  </Badge>
                                </div>
                                <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                                  <span>Захватка: <b className="text-foreground/80">{task.zone}</b></span>
                                  {task.responsibleName && (
                                    <span>
                                      Отв.: <b className="text-foreground/80">{task.responsibleName}</b>
                                      {task.responsibleRole && <span className="text-muted-foreground"> · {task.responsibleRole}</span>}
                                    </span>
                                  )}
                                  {leadRes && (
                                    <span>
                                      Исполнитель: <b className="text-foreground/80">{leadRes.name}</b>
                                      <span className="text-muted-foreground"> · {RESOURCE_META[leadRes.type].label}</span>
                                    </span>
                                  )}
                                  {otherRes.length > 0 && (
                                    <span className="text-muted-foreground">
                                      + {otherRes.length} ресурсов
                                    </span>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {daysBetween(task.plannedStart, task.plannedFinish)} дн.
                            </TableCell>
                            <TableCell className="font-mono text-xs">{formatDate(task.plannedStart)}</TableCell>
                            <TableCell className="font-mono text-xs">{formatDate(task.plannedFinish)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={task.progressPct} className="h-1.5" />
                                <span className="text-xs text-muted-foreground tabular-nums w-9">{task.progressPct}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {formatTg(task.plannedValue, { compact: true })}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {task.actualCost > 0
                                ? formatTg(task.actualCost, { compact: true })
                                : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className={`text-right font-mono text-xs ${taskVar.tone}`}>
                              {taskVar.label}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </RowGroup>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <KanbanBoard
          tasks={filteredTasks}
          phaseById={Object.fromEntries(phases.map((p) => [p.id, p]))}
          assignmentsByTask={assignmentsByTask}
          resourceById={resourceById}
        />
      )}
    </div>
  )
}

function RowGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

/* ─────────────────────────── WBS · KANBAN-доска ───────────────────────── */

const KANBAN_COLUMNS: { id: ScheduleTask['status']; label: string; tone: string; accent: string }[] = [
  { id: 'planned',     label: 'План',       tone: 'bg-muted/40',                 accent: 'border-t-slate-400' },
  { id: 'in_progress', label: 'В работе',   tone: 'bg-emerald-500/5',            accent: 'border-t-emerald-500' },
  { id: 'late',        label: 'Отставание', tone: 'bg-amber-500/5',              accent: 'border-t-amber-500' },
  { id: 'done',        label: 'Завершено',  tone: 'bg-sky-500/5',                accent: 'border-t-sky-500' },
]

function KanbanBoard({
  tasks, phaseById, assignmentsByTask, resourceById,
}: {
  tasks: ScheduleTask[]
  phaseById: Record<string, Phase>
  assignmentsByTask: Record<string, TaskAssignment[]>
  resourceById: Record<string, Resource>
}) {
  const byStatus = useMemo(() => {
    const m: Record<ScheduleTask['status'], ScheduleTask[]> = {
      planned: [], in_progress: [], done: [], late: [],
    }
    for (const t of tasks) m[t.status].push(t)
    for (const arr of Object.values(m)) {
      arr.sort((a, b) => a.plannedStart.localeCompare(b.plannedStart))
    }
    return m
  }, [tasks])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
      {KANBAN_COLUMNS.map((col) => {
        const list = byStatus[col.id]
        const totalPv = list.reduce((s, t) => s + t.plannedValue, 0)
        const totalAc = list.reduce((s, t) => s + t.actualCost,   0)
        return (
          <div
            key={col.id}
            className={`rounded-lg border-t-4 ${col.accent} border bg-card flex flex-col min-h-[300px]`}
          >
            <div className={`px-3 py-2.5 border-b ${col.tone}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{col.label}</span>
                <Badge variant="secondary" className="text-[10px] h-5">{list.length}</Badge>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1 font-mono">
                <span>PV: {formatTg(totalPv, { compact: true })}</span>
                <span>AC: {totalAc > 0 ? formatTg(totalAc, { compact: true }) : '—'}</span>
              </div>
            </div>
            <div className="p-2 space-y-2 flex-1 overflow-auto max-h-[640px]">
              {list.length === 0 && (
                <p className="text-[11px] text-muted-foreground italic px-2 py-4 text-center">
                  Нет задач в этой колонке
                </p>
              )}
              {list.map((task) => {
                const phase = task.phaseId ? phaseById[task.phaseId] : undefined
                const asgns = assignmentsByTask[task.id] ?? []
                const lead  = asgns.find((a) => a.lead)
                const leadRes = lead ? resourceById[lead.resourceId] : undefined
                const tvar = costVarianceTone(task.plannedValue, task.actualCost)
                return (
                  <div
                    key={task.id}
                    className="rounded-md border bg-background p-2.5 hover:shadow-md hover:border-primary/40 transition-shadow"
                  >
                    {phase && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="inline-block w-2 h-2 rounded-sm" style={{ background: phase.color }} />
                        <span className="text-[10px] font-mono uppercase tracking-wide" style={{ color: phase.color }}>
                          {phase.code}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate">{phase.name}</span>
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-1.5">
                      <p className="text-[12px] font-semibold leading-tight">{task.name}</p>
                      <span className="text-[9px] font-mono text-muted-foreground shrink-0">{task.wbs}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 truncate">{task.zone}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Progress value={task.progressPct} className="h-1.5 flex-1" />
                      <span className="text-[10px] text-muted-foreground tabular-nums w-9 text-right">{task.progressPct}%</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 mt-2 text-[10px] font-mono">
                      <div>
                        <p className="text-muted-foreground">PV</p>
                        <p className="font-semibold">{formatTg(task.plannedValue, { compact: true })}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">AC</p>
                        <p className="font-semibold">
                          {task.actualCost > 0 ? formatTg(task.actualCost, { compact: true }) : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Δ</p>
                        <p className={`font-semibold ${tvar.tone}`}>{tvar.label}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-2 pt-2 border-t">
                      <span>{formatDate(task.plannedStart)} → {formatDate(task.plannedFinish)}</span>
                    </div>
                    {(task.responsibleName || leadRes) && (
                      <div className="flex items-center gap-1.5 text-[10px] mt-1.5">
                        {task.responsibleName && (
                          <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            {task.responsibleName.split(' ')[0]}
                          </span>
                        )}
                        {leadRes && (
                          <span className={`px-1.5 py-0.5 rounded ${RESOURCE_META[leadRes.type].tone} truncate max-w-[140px]`}>
                            {leadRes.name.split(' ')[0]}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────────────────── ДИАГРАММА ГАНТА ──────────────────────────── */

interface GanttViewProps {
  phases: Phase[]
  phaseById: Record<string, Phase>
  tasks: ScheduleTask[]
  milestones: Milestone[]
  dependencies: TaskDependency[]
  dataDate: string | null
}

const GANTT_ROW_H        = 30
const GANTT_LABEL_W      = 360
const GANTT_MONTH_W      = 64
const GANTT_HEADER_H     = 56
const GANTT_BAR_PAD_Y    = 7
const GANTT_PHASE_BAND_H = 26
const GANTT_MIL_RADIUS   = 9

function GanttView({
  phases, phaseById, tasks, milestones, dependencies, dataDate,
}: GanttViewProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  /* Найдём общий диапазон по плановым датам */
  const minDate = useMemo(() => {
    const all = [...tasks.map((t) => t.plannedStart), ...milestones.map((m) => m.plannedDate)]
    if (all.length === 0) return new Date()
    const m = new Date(all.reduce((a, b) => (a < b ? a : b)))
    return new Date(m.getFullYear(), m.getMonth(), 1)
  }, [tasks, milestones])
  const maxDate = useMemo(() => {
    const all = [...tasks.map((t) => t.plannedFinish), ...milestones.map((m) => m.plannedDate)]
    if (all.length === 0) return new Date()
    const m = new Date(all.reduce((a, b) => (a > b ? a : b)))
    return new Date(m.getFullYear(), m.getMonth() + 1, 1)
  }, [tasks, milestones])

  const months: { date: Date; label: string }[] = useMemo(() => {
    const arr: { date: Date; label: string }[] = []
    const cursor = new Date(minDate)
    while (cursor <= maxDate) {
      arr.push({
        date:  new Date(cursor),
        label: cursor.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' }),
      })
      cursor.setMonth(cursor.getMonth() + 1)
    }
    return arr
  }, [minDate, maxDate])

  const totalDays = Math.max(1, Math.round((maxDate.getTime() - minDate.getTime()) / DAY_MS))
  const dayToX = (date: Date | string): number => {
    const d = typeof date === 'string' ? new Date(date) : date
    const days = Math.round((d.getTime() - minDate.getTime()) / DAY_MS)
    return GANTT_LABEL_W + (days / totalDays) * (months.length * GANTT_MONTH_W)
  }

  const orderedTasks = useMemo(() => {
    // Группируем по фазе в порядке фаз, внутри — по дате старта
    const phaseOrder = phases.map((p) => p.id)
    return [...tasks].sort((a, b) => {
      const pa = phaseOrder.indexOf(a.phaseId ?? '')
      const pb = phaseOrder.indexOf(b.phaseId ?? '')
      if (pa !== pb) return pa - pb
      return a.plannedStart.localeCompare(b.plannedStart)
    })
  }, [phases, tasks])

  const rowY = (taskIdx: number) => GANTT_HEADER_H + GANTT_PHASE_BAND_H + taskIdx * GANTT_ROW_H
  const taskRowMap = useMemo(() => {
    const m: Record<string, number> = {}
    orderedTasks.forEach((t, i) => { m[t.id] = rowY(i) + GANTT_ROW_H / 2 })
    return m
  }, [orderedTasks])

  const taskXMap = useMemo(() => {
    const m: Record<string, { x1: number; x2: number }> = {}
    for (const t of orderedTasks) {
      m[t.id] = { x1: dayToX(t.plannedStart), x2: dayToX(t.plannedFinish) }
    }
    return m
  }, [orderedTasks, totalDays])

  const totalW = GANTT_LABEL_W + months.length * GANTT_MONTH_W + 24
  const totalH = GANTT_HEADER_H + GANTT_PHASE_BAND_H + orderedTasks.length * GANTT_ROW_H + 20

  /* Phase strip: для каждой фазы — горизонтальная цветная полоса по охвату фазы */
  const phaseBars = useMemo(() => {
    return phases.map((p) => ({
      phase: p,
      x1: dayToX(p.plannedStart),
      x2: dayToX(p.plannedFinish),
    }))
  }, [phases, totalDays])

  const todayX = dataDate ? dayToX(dataDate) : null

  /* Палитра */
  const gridColor   = isDark ? '#1f2937' : '#e5e7eb'
  const labelColor  = isDark ? '#cbd5e1' : '#334155'
  const headerColor = isDark ? '#0f172a' : '#f8fafc'
  const barTrack    = isDark ? '#1e293b' : '#e2e8f0'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4" />
            Диаграмма Ганта: {orderedTasks.length} задач, {milestones.length} вех, {phases.length} фаз
          </span>
          <span className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <LegendDot color="#94a3b8" label="План" />
            <LegendDot color="#10b981" label="Выполнено" />
            <LegendDot color="#f59e0b" label="Отставание" />
            <LegendShape kind="milestone" label="Веха" />
            <LegendShape kind="dataDate"  label="Текущая дата" />
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-auto">
        <svg width={totalW} height={totalH} className="block">
          {/* Header background */}
          <rect x={0} y={0} width={totalW} height={GANTT_HEADER_H} fill={headerColor} />
          <rect x={0} y={GANTT_HEADER_H} width={GANTT_LABEL_W} height={totalH - GANTT_HEADER_H} fill={headerColor} />
          {/* Month columns header */}
          {months.map((m, i) => {
            const x = GANTT_LABEL_W + i * GANTT_MONTH_W
            const isYearStart = m.date.getMonth() === 0
            return (
              <g key={i}>
                <line x1={x} y1={0} x2={x} y2={totalH} stroke={gridColor} />
                {isYearStart && (
                  <text x={x + 4} y={16} fontSize={11} fill={labelColor} fontWeight={600}>
                    {m.date.getFullYear()}
                  </text>
                )}
                <text x={x + GANTT_MONTH_W / 2} y={36} fontSize={10} fill={labelColor} textAnchor="middle">
                  {m.label}
                </text>
              </g>
            )
          })}

          {/* Phase band (под шапкой) */}
          {phaseBars.map(({ phase, x1, x2 }) => (
            <g key={phase.id}>
              <rect
                x={x1}
                y={GANTT_HEADER_H + 4}
                width={Math.max(2, x2 - x1)}
                height={GANTT_PHASE_BAND_H - 8}
                rx={4}
                fill={phase.color}
                fillOpacity={0.18}
                stroke={phase.color}
                strokeOpacity={0.55}
              />
              <text
                x={x1 + 6}
                y={GANTT_HEADER_H + GANTT_PHASE_BAND_H - 9}
                fontSize={10}
                fill={phase.color}
                fontWeight={600}
              >
                {phase.code}
              </text>
            </g>
          ))}

          {/* Today line */}
          {todayX !== null && (
            <g>
              <line x1={todayX} y1={GANTT_HEADER_H} x2={todayX} y2={totalH} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 3" />
              <text x={todayX + 4} y={GANTT_HEADER_H - 4} fontSize={10} fill="#ef4444" fontWeight={600}>
                {dataDate ? formatDate(dataDate) : ''}
              </text>
            </g>
          )}

          {/* Task rows */}
          {orderedTasks.map((task, i) => {
            const y    = rowY(i)
            const bar  = taskXMap[task.id]
            const ph   = task.phaseId ? phaseById[task.phaseId] : undefined
            const color = ph?.color ?? '#475569'
            const progressW = (bar.x2 - bar.x1) * (task.progressPct / 100)
            const isLate    = task.status === 'late'
            return (
              <g key={task.id}>
                {/* Row separator */}
                <line x1={0} y1={y} x2={totalW} y2={y} stroke={gridColor} strokeOpacity={0.6} />
                {/* Label */}
                <text x={10} y={y + GANTT_ROW_H / 2 + 4} fontSize={11} fill={labelColor}>
                  <tspan fontFamily="ui-monospace" fill={labelColor} opacity={0.6}>{task.wbs}</tspan>
                  <tspan dx={6}>{task.name}</tspan>
                </text>
                {task.responsibleName && (
                  <text x={10} y={y + GANTT_ROW_H / 2 + 16} fontSize={9} fill={labelColor} opacity={0.55}>
                    {task.responsibleName}
                  </text>
                )}
                {/* Bar */}
                <rect
                  x={bar.x1}
                  y={y + GANTT_BAR_PAD_Y}
                  width={Math.max(2, bar.x2 - bar.x1)}
                  height={GANTT_ROW_H - GANTT_BAR_PAD_Y * 2}
                  rx={3}
                  fill={barTrack}
                  stroke={isLate ? '#f59e0b' : color}
                  strokeOpacity={isLate ? 1 : 0.7}
                />
                {/* Progress */}
                {progressW > 1 && (
                  <rect
                    x={bar.x1}
                    y={y + GANTT_BAR_PAD_Y}
                    width={progressW}
                    height={GANTT_ROW_H - GANTT_BAR_PAD_Y * 2}
                    rx={3}
                    fill={color}
                    fillOpacity={0.85}
                  />
                )}
                {/* Late marker */}
                {isLate && (
                  <text x={bar.x2 + 4} y={y + GANTT_ROW_H / 2 + 4} fontSize={10} fill="#f59e0b" fontWeight={700}>
                    ⚠
                  </text>
                )}
              </g>
            )
          })}

          {/* Last row separator */}
          <line
            x1={0}
            y1={GANTT_HEADER_H + GANTT_PHASE_BAND_H + orderedTasks.length * GANTT_ROW_H}
            x2={totalW}
            y2={GANTT_HEADER_H + GANTT_PHASE_BAND_H + orderedTasks.length * GANTT_ROW_H}
            stroke={gridColor}
          />

          {/* Dependencies (тонкие линии со стрелкой) */}
          <defs>
            <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <polygon points="0 0, 6 3, 0 6" fill={isDark ? '#94a3b8' : '#64748b'} />
            </marker>
          </defs>
          {dependencies.map((d, i) => {
            const fromBar = taskXMap[d.fromTaskId]
            const toBar   = taskXMap[d.toTaskId]
            const fromY   = taskRowMap[d.fromTaskId]
            const toY     = taskRowMap[d.toTaskId]
            if (!fromBar || !toBar || fromY === undefined || toY === undefined) return null

            // Координаты по типу зависимости
            const fromX = d.kind === 'SS' || d.kind === 'SF' ? fromBar.x1 : fromBar.x2
            const toX   = d.kind === 'SS' || d.kind === 'FS' ? toBar.x1   : toBar.x2

            // L-shape path: вертикальная половинка + горизонтальная половинка
            const midX = toX - 8
            const path = `M ${fromX} ${fromY} L ${Math.max(midX, fromX + 8)} ${fromY} L ${Math.max(midX, fromX + 8)} ${toY} L ${toX} ${toY}`
            return (
              <path
                key={i}
                d={path}
                fill="none"
                stroke={isDark ? '#475569' : '#94a3b8'}
                strokeWidth={1}
                markerEnd="url(#arrowhead)"
                strokeDasharray={d.kind === 'SS' || d.kind === 'FF' ? '4 3' : undefined}
              />
            )
          })}

          {/* Milestones */}
          {milestones.map((ms) => {
            const x = dayToX(ms.plannedDate)
            // Веха рисуется на полосе фазы
            const y = GANTT_HEADER_H + GANTT_PHASE_BAND_H / 2 + 2
            const ph = phaseById[ms.phaseId]
            const fill =
              ms.status === 'reached'  ? '#10b981' :
              ms.status === 'at_risk'  ? '#f59e0b' :
              ms.status === 'missed'   ? '#ef4444' : (ph?.color ?? '#0ea5e9')
            return (
              <g key={ms.id}>
                <polygon
                  points={`${x},${y - GANTT_MIL_RADIUS} ${x + GANTT_MIL_RADIUS},${y} ${x},${y + GANTT_MIL_RADIUS} ${x - GANTT_MIL_RADIUS},${y}`}
                  fill={fill}
                  stroke="#0f172a"
                  strokeOpacity={isDark ? 0 : 0.4}
                />
                <text x={x + GANTT_MIL_RADIUS + 3} y={y + 4} fontSize={9} fill={fill} fontWeight={700}>
                  {ms.code}
                </text>
              </g>
            )
          })}
        </svg>
      </CardContent>
    </Card>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="w-3 h-3 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  )
}

function LegendShape({ kind, label }: { kind: 'milestone' | 'dataDate'; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {kind === 'milestone'
        ? <span className="inline-block w-3 h-3 rotate-45 bg-sky-500" />
        : <span className="inline-block w-3 h-0.5 bg-rose-500" />}
      {label}
    </span>
  )
}

/* ─────────────────────────── ВЕХИ ─────────────────────────────────────── */

function MilestonesView({
  milestones, phaseById, taskById, dataDate,
}: {
  milestones: Milestone[]
  phaseById: Record<string, Phase>
  taskById: Record<string, ScheduleTask>
  dataDate: string | null
}) {
  const sorted = useMemo(
    () => [...milestones].sort((a, b) => a.plannedDate.localeCompare(b.plannedDate)),
    [milestones],
  )
  const dataDateTs = dataDate ? new Date(dataDate).getTime() : null

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Diamond className="h-4 w-4" />
            Хронология вех проекта
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="relative border-l border-border pl-6 space-y-5">
            {sorted.map((ms) => {
              const meta = MILESTONE_META[ms.status]
              const Icon = meta.icon
              const phase = phaseById[ms.phaseId]
              const deltaDays = dataDateTs !== null
                ? Math.round((new Date(ms.plannedDate).getTime() - dataDateTs) / DAY_MS)
                : null
              return (
                <li key={ms.id} className="relative">
                  <span
                    className={`absolute -left-[27px] top-1 w-4 h-4 rotate-45 ${meta.tone.split(' ')[0]} border border-border`}
                    aria-hidden
                  />
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{ms.code}</span>
                      <span className="font-semibold">{ms.name}</span>
                      <Badge className={`text-[10px] ${meta.tone}`}>
                        <Icon className="h-3 w-3 mr-1" />
                        {meta.label}
                      </Badge>
                      {phase && (
                        <Badge variant="outline" className="text-[10px]" style={{ borderColor: phase.color, color: phase.color }}>
                          {phase.code} · {phase.name}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      План: <b className="text-foreground">{formatDate(ms.plannedDate)}</b>
                      {ms.actualDate && (
                        <> · Факт: <b className="text-foreground">{formatDate(ms.actualDate)}</b></>
                      )}
                      {deltaDays !== null && !ms.actualDate && (
                        <span className="ml-2">
                          ({deltaDays > 0 ? `через ${deltaDays} дн.` : deltaDays === 0 ? 'сегодня' : `просрочка ${-deltaDays} дн.`})
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{ms.description}</p>
                  {ms.predecessorTaskIds.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                      <span className="text-muted-foreground">Подтверждается задачами:</span>
                      {ms.predecessorTaskIds.map((tid) => {
                        const t = taskById[tid]
                        if (!t) return null
                        const tmeta = STATUS_META[t.status]
                        return (
                          <Badge key={tid} variant="secondary" className={`text-[10px] ${tmeta.tone}`}>
                            {t.wbs} · {t.name}
                          </Badge>
                        )
                      })}
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}

/* ─────────────────────────── РЕСУРСЫ ──────────────────────────────────── */

/**
 * Группы для вкладок (генподряд + субподряд объединены в «Подрядчики»).
 * Для каждой группы — свой набор типов ресурсов.
 */
const RESOURCE_GROUPS: { id: string; label: string; icon: typeof Building2; types: ResourceType[]; tone: string }[] = [
  { id: 'all',         label: 'Все',          icon: HardHat,    types: ['contractor', 'subcontractor', 'inhouse', 'equipment', 'material'], tone: '' },
  { id: 'contractor',  label: 'Подрядчики',   icon: Building2,  types: ['contractor', 'subcontractor'], tone: RESOURCE_META.contractor.tone },
  { id: 'inhouse',     label: 'Свои ресурсы', icon: Users,      types: ['inhouse'],                     tone: RESOURCE_META.inhouse.tone },
  { id: 'equipment',   label: 'Спецтехника',  icon: Truck,      types: ['equipment'],                   tone: RESOURCE_META.equipment.tone },
  { id: 'material',    label: 'Материалы',    icon: Package,    types: ['material'],                    tone: RESOURCE_META.material.tone },
]

function ResourcesView({
  resources, taskIdsByResource, taskById, phaseById,
}: {
  resources: Resource[]
  taskIdsByResource: Record<string, string[]>
  taskById: Record<string, ScheduleTask>
  phaseById: Record<string, Phase>
}) {
  const grouped = useMemo(() => {
    const map: Record<ResourceType, Resource[]> = {
      contractor: [], subcontractor: [], inhouse: [], equipment: [], material: [],
    }
    for (const r of resources) {
      map[r.type].push(r)
    }
    return map
  }, [resources])

  const totals = useMemo(() => {
    const t: Record<ResourceType, { total: number; mobilized: number }> = {
      contractor:    { total: 0, mobilized: 0 },
      subcontractor: { total: 0, mobilized: 0 },
      inhouse:       { total: 0, mobilized: 0 },
      equipment:     { total: 0, mobilized: 0 },
      material:      { total: 0, mobilized: 0 },
    }
    for (const r of resources) {
      t[r.type].total += 1
      if (r.mobilized) t[r.type].mobilized += 1
    }
    return t
  }, [resources])

  /* Топовая сводка — всегда видна (5 плиток по типам) */
  const topRow = (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {(['contractor', 'subcontractor', 'inhouse', 'equipment', 'material'] as ResourceType[]).map((type) => {
        const meta = RESOURCE_META[type]
        const Icon = meta.icon
        const { total, mobilized } = totals[type]
        return (
          <Card key={type}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-md ${meta.tone}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{meta.label}</div>
                <div className="text-xl font-semibold">{total}</div>
                <div className="text-[11px] text-muted-foreground">{mobilized} мобилизовано</div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )

  return (
    <div className="space-y-5">
      {topRow}

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="h-auto p-1 bg-muted/40 flex flex-wrap gap-1">
          {RESOURCE_GROUPS.map((g) => {
            const Icon = g.icon
            const count = g.types.reduce((s, t) => s + (grouped[t]?.length ?? 0), 0)
            return (
              <TabsTrigger
                key={g.id} value={g.id}
                className="text-xs h-8 px-3 gap-1.5 data-[state=active]:bg-background"
              >
                <Icon className="h-3.5 w-3.5" />
                {g.label}
                <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px] tabular-nums">{count}</Badge>
              </TabsTrigger>
            )
          })}
        </TabsList>

        {RESOURCE_GROUPS.map((g) => (
          <TabsContent key={g.id} value={g.id} className="m-0 mt-4 space-y-4">
            {g.types.map((type) => {
              const list = grouped[type]
              if (list.length === 0) return null
              return (
                <ResourceGroupCard
                  key={type}
                  type={type}
                  resources={list}
                  taskIdsByResource={taskIdsByResource}
                  taskById={taskById}
                  phaseById={phaseById}
                />
              )
            })}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

function ResourceGroupCard({
  type, resources, taskIdsByResource, taskById, phaseById,
}: {
  type: ResourceType
  resources: Resource[]
  taskIdsByResource: Record<string, string[]>
  taskById: Record<string, ScheduleTask>
  phaseById: Record<string, Phase>
}) {
  const meta = RESOURCE_META[type]
  const Icon = meta.icon
  // Для материалов и спецтехники показываем дополнительные ERP-поля
  const isErpRich = type === 'material' || type === 'equipment'

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {meta.label}
          <Badge variant="outline" className="ml-1 text-[10px]">{resources.length}</Badge>
          {isErpRich && (
            <Badge variant="outline" className="ml-auto text-[10px] gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400">
              <Database className="h-3 w-3" /> Источник: 1С:ERP / 1С:УПП
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        {isErpRich
          ? <ErpResourceTable resources={resources} taskIdsByResource={taskIdsByResource} taskById={taskById} phaseById={phaseById} type={type} />
          : <SimpleResourceTable resources={resources} taskIdsByResource={taskIdsByResource} taskById={taskById} phaseById={phaseById} />}
      </CardContent>
    </Card>
  )
}

/* Базовая таблица — для подрядчиков / своих ресурсов */
function SimpleResourceTable({
  resources, taskIdsByResource, taskById, phaseById,
}: {
  resources: Resource[]
  taskIdsByResource: Record<string, string[]>
  taskById: Record<string, ScheduleTask>
  phaseById: Record<string, Phase>
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[26%]">Ресурс</TableHead>
          <TableHead className="w-[20%]">Организация / контакт</TableHead>
          <TableHead>Объём</TableHead>
          <TableHead>Ставка</TableHead>
          <TableHead className="w-[120px]">Мобилизация</TableHead>
          <TableHead className="w-[28%]">Задействован на фазах</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {resources.map((r) => {
          const tids   = taskIdsByResource[r.id] ?? []
          const usedPh = new Set<string>()
          for (const tid of tids) {
            const t = taskById[tid]
            if (t?.phaseId) usedPh.add(t.phaseId)
          }
          const phaseChips = [...usedPh]
            .map((id) => phaseById[id])
            .filter(Boolean) as Phase[]
          return (
            <TableRow key={r.id}>
              <TableCell>
                <div className="font-medium">{r.name}</div>
                {r.specialization && (
                  <div className="text-xs text-muted-foreground mt-0.5">{r.specialization}</div>
                )}
                <div className="text-xs text-muted-foreground mt-0.5">Задач: {tids.length}</div>
              </TableCell>
              <TableCell>
                {r.organization && <div className="text-sm">{r.organization}</div>}
                {r.contactPerson && <div className="text-xs text-muted-foreground">{r.contactPerson}</div>}
              </TableCell>
              <TableCell className="text-sm">{r.capacity ?? '—'}</TableCell>
              <TableCell className="text-sm">{r.costRate ?? '—'}</TableCell>
              <TableCell>
                {r.mobilized
                  ? <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">На объекте</Badge>
                  : <Badge variant="outline" className="text-muted-foreground">Не мобилизован</Badge>}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {phaseChips.length === 0
                    ? <span className="text-xs text-muted-foreground">—</span>
                    : phaseChips.map((p) => (
                        <Badge
                          key={p.id}
                          variant="outline"
                          className="text-[10px]"
                          style={{ borderColor: p.color, color: p.color }}
                        >
                          {p.code}
                        </Badge>
                      ))}
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

/* Расширенная таблица для материалов / спецтехники — с ERP-полями */
function ErpResourceTable({
  resources, taskIdsByResource, taskById, phaseById, type,
}: {
  resources: Resource[]
  taskIdsByResource: Record<string, string[]>
  taskById: Record<string, ScheduleTask>
  phaseById: Record<string, Phase>
  type: ResourceType
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[24%]">Позиция</TableHead>
          <TableHead className="w-[110px]">ERP-код</TableHead>
          <TableHead className="w-[18%]">Поставщик</TableHead>
          <TableHead className="text-right w-[110px]">План</TableHead>
          <TableHead className="text-right w-[110px]">Факт</TableHead>
          <TableHead className="w-[140px]">Покрытие</TableHead>
          <TableHead className="text-right w-[110px]">Сумма (PV)</TableHead>
          <TableHead className="w-[120px]">Поставка</TableHead>
          <TableHead className="w-[20%]">Фазы</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {resources.map((r) => {
          const tids = taskIdsByResource[r.id] ?? []
          const usedPh = new Set<string>()
          for (const tid of tids) {
            const t = taskById[tid]
            if (t?.phaseId) usedPh.add(t.phaseId)
          }
          const phaseChips = [...usedPh]
            .map((id) => phaseById[id])
            .filter(Boolean) as Phase[]
          const planned = r.plannedQty ?? 0
          const actual  = r.actualQty  ?? 0
          const coverage = planned > 0 ? Math.min(100, (actual / planned) * 100) : 0
          const pv = (r.unitPrice ?? 0) * planned
          const ac = (r.unitPrice ?? 0) * actual
          const erp = r.erpSource ? ERP_META[r.erpSource] : null
          const delivery = r.deliveryStatus ? DELIVERY_META[r.deliveryStatus] : null
          const coverageColor =
            coverage >= 95 ? 'bg-emerald-500'
              : coverage >= 50 ? 'bg-amber-500'
              : coverage > 0   ? 'bg-sky-500'
              : 'bg-muted'
          return (
            <TableRow key={r.id}>
              <TableCell>
                <div className="font-medium">{r.name}</div>
                {r.specialization && (
                  <div className="text-xs text-muted-foreground mt-0.5">{r.specialization}</div>
                )}
                {erp && (
                  <Badge variant="outline" className={`mt-1 text-[10px] gap-1 ${erp.tone}`}>
                    <Database className="h-2.5 w-2.5" /> {erp.label}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="font-mono text-xs">{r.erpCode ?? '—'}</TableCell>
              <TableCell className="text-xs">{r.supplier ?? '—'}</TableCell>
              <TableCell className="text-right font-mono text-xs tabular-nums">
                {planned.toLocaleString('ru-RU')} <span className="text-muted-foreground">{r.unit}</span>
              </TableCell>
              <TableCell className="text-right font-mono text-xs tabular-nums">
                {actual.toLocaleString('ru-RU')} <span className="text-muted-foreground">{r.unit}</span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="relative h-1.5 bg-muted rounded-full flex-1 overflow-hidden">
                    <div className={`absolute inset-y-0 left-0 ${coverageColor}`} style={{ width: `${coverage}%` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground tabular-nums w-9 text-right">
                    {coverage.toFixed(0)}%
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right font-mono text-xs">
                {pv > 0 ? formatTg(pv, { compact: true }) : '—'}
                {ac > 0 && (
                  <div className="text-[10px] text-muted-foreground">
                    AC: {formatTg(ac, { compact: true })}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  {delivery && (
                    <Badge variant="secondary" className={`text-[10px] ${delivery.tone}`}>
                      {delivery.label}
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${r.mobilized
                      ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                      : 'text-muted-foreground'}`}
                  >
                    {r.mobilized
                      ? (type === 'equipment' ? 'На объекте' : 'На складе')
                      : 'Не мобилиз.'}
                  </Badge>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {phaseChips.length === 0
                    ? <span className="text-xs text-muted-foreground">—</span>
                    : phaseChips.map((p) => (
                        <Badge
                          key={p.id}
                          variant="outline"
                          className="text-[10px]"
                          style={{ borderColor: p.color, color: p.color }}
                        >
                          {p.code}
                        </Badge>
                      ))}
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

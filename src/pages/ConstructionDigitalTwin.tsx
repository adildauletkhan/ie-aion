/**
 * ConstructionDigitalTwin — агрегирующий обзор стройки.
 *
 * Рендерит все KPI из constructionPack, ссылки на ключевые модули,
 * последние отклонения и прогнозы. Источник — fetchTwinSummary mock-слоя.
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

import {
  Workflow, Box, CalendarRange, FileBarChart2, Gauge, Plug,
  AlertTriangle, ClipboardList, TrendingUp, ShieldCheck, ShieldAlert,
  ArrowRight, CalendarClock,
} from 'lucide-react'

import { useCompanyProfile } from '@/context/CompanyProfileContext'
import {
  fetchTwinSummary, getCurrentProjectId, formatTg, formatDate,
  type Deviation, type DeviationKind, type DeviationSeverity, type Forecast,
} from '@/data/constructionMockData'
import { fetchDeviationsTimeline, type DeviationTimelineItem } from '@/lib/constructionApi'

const PROJECT_ID = getCurrentProjectId()

/* ────────────────────── DEVIATION META ─────────────────────────────────── */

const DEV_KIND_LABEL: Record<DeviationKind, string> = {
  schedule: 'Сроки',
  cost:     'Бюджет',
  quality:  'Качество',
  safety:   'Безопасность',
}

const SEVERITY_STYLE: Record<DeviationSeverity, { dot: string; text: string }> = {
  low:      { dot: '#94a3b8', text: 'text-muted-foreground' },
  medium:   { dot: '#f59e0b', text: 'text-amber-600 dark:text-amber-400' },
  high:     { dot: '#ef4444', text: 'text-red-600 dark:text-red-400' },
  critical: { dot: '#b91c1c', text: 'text-red-700 dark:text-red-300 font-semibold' },
}

// Backend-энумы таймлайна (schedule/resource/dependency/quality/external, attention/risk/critical)
const TL_KIND_LABEL: Record<string, string> = {
  schedule: 'Сроки', resource: 'Ресурсы', dependency: 'Зависимости', quality: 'Качество', external: 'Внешнее',
}
const TL_SEVERITY_COLOR: Record<string, string> = {
  attention: '#94a3b8', risk: '#f59e0b', critical: '#ef4444',
}

const FORECAST_LABEL: Record<Forecast['metric'], string> = {
  finish_date:        'Прогноз завершения',
  cost_at_completion: 'Прогноз итоговой стоимости',
  spi:                'Прогноз SPI',
  cpi:                'Прогноз CPI',
}

/* ────────────────────── QUICK MODULE LINKS ─────────────────────────────── */

const QUICK_LINKS = [
  { label: '4D-модель',                icon: Box,            route: '/construction-4d',           color: '#0d9488' },
  { label: 'График и планирование',    icon: CalendarRange,  route: '/construction-planning',     color: '#0d9488' },
  { label: 'Смета и бюджет',           icon: FileBarChart2,  route: '/construction-budget',       color: '#0d9488' },
  { label: 'Контроль СМР · план/факт', icon: Gauge,          route: '/construction-progress',     color: '#0d9488' },
  { label: 'Суточный журнал',          icon: ClipboardList,  route: '/construction-journal',      color: '#0d9488' },
  { label: 'Интеграции',               icon: Plug,           route: '/integrations',              color: '#0d9488' },
] as const

/* ─────────────────────────── COMPONENT ─────────────────────────────────── */

export default function ConstructionDigitalTwin() {
  const navigate = useNavigate()
  const { getIndustryPack } = useCompanyProfile()
  const pack = getIndustryPack()

  const twin = useQuery({
    queryKey: ['construction', PROJECT_ID, 'twin-summary'],
    queryFn:  () => fetchTwinSummary(PROJECT_ID),
  })

  const timeline = useQuery({
    queryKey: ['construction', PROJECT_ID, 'deviations-timeline'],
    queryFn:  () => fetchDeviationsTimeline(PROJECT_ID, 12),
  })

  // Маппинг KPI пакета (id из IndustryPack) → значение из twin.kpi
  const kpiValues = useMemo<Record<string, { value: string; sub?: string; tone?: 'good' | 'bad' | 'neutral' }>>(() => {
    if (!twin.data) return {}
    const k = twin.data.kpi
    return {
      physical_progress:  { value: `${k.physicalProgress}%`,            sub: 'взвешенно по PV',                tone: 'neutral' },
      earned_value_pct:   { value: `${k.earnedValuePct}%`,              sub: 'освоено от BAC',                 tone: 'neutral' },
      spi:                { value: k.spi.toFixed(2),                    sub: k.spi >= 1 ? 'график выполняется' : 'отставание', tone: k.spi >= 1 ? 'good' : 'bad' },
      cpi:                { value: k.cpi.toFixed(2),                    sub: k.cpi >= 1 ? 'в бюджете'         : 'перерасход',    tone: k.cpi >= 1 ? 'good' : 'bad' },
      schedule_variance:  { value: `${k.scheduleVariance}`,             sub: 'дн. макс. отставание',           tone: k.scheduleVariance > 0 ? 'bad' : 'good' },
      lagging_zones:      { value: `${k.laggingZones}`,                 sub: 'захваток отстаёт от графика',    tone: k.laggingZones > 0 ? 'bad' : 'good' },
      daily_smr_value:    { value: `${k.dailySmrValue}`,                sub: 'млн ₸/сут',                      tone: 'neutral' },
      materials_coverage: { value: `${k.materialsCoverage}%`,           sub: 'обеспеченность',                 tone: k.materialsCoverage >= 90 ? 'good' : 'neutral' },
      quality_deviations: { value: `${k.qualityDeviations}`,            sub: 'открытых замечаний',             tone: k.qualityDeviations > 0 ? 'neutral' : 'good' },
      safety_ltifr:       { value: k.safetyLtifr.toFixed(2),            sub: 'на 1М ч.',                       tone: k.safetyLtifr <= 0.5 ? 'good' : 'bad' },
    }
  }, [twin.data])

  const project = twin.data?.project

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Цифровой двойник стройки · обзор
          </p>
          <h1 className="text-2xl font-bold tracking-tight">
            {project?.name ?? 'Загрузка…'}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {project && (
              <>
                {project.code} · {project.developer} · {project.location} · отчётная дата {formatDate(project.dataDate)}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] font-semibold">
            <Workflow className="h-3 w-3 mr-1" /> backend · Фаза 1
          </Badge>
          <Button size="sm" className="h-8 text-xs" onClick={() => navigate('/construction-4d')}>
            Открыть 4D-модель <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </div>

      {/* KPI grid (по составу constructionPack.kpis) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ключевые показатели отрасли</CardTitle>
          <CardDescription>
            Все 10 KPI из отраслевого пакета «Строительство» — единый dataset с дашбордами модулей.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {pack.kpis.map((k) => {
              const v = kpiValues[k.id]
              const tone =
                v?.tone === 'good' ? 'text-emerald-600 dark:text-emerald-400'
                : v?.tone === 'bad' ? 'text-amber-600 dark:text-amber-400'
                : 'text-foreground'
              return (
                <div
                  key={k.id}
                  className="rounded-lg border p-3 flex flex-col gap-1 hover:bg-accent/30 transition-colors"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground leading-tight">
                    {k.label}
                  </p>
                  <p className={`text-2xl font-bold tracking-tight ${tone}`}>
                    {twin.isLoading ? '…' : (v?.value ?? '—')}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {v?.sub ?? k.unit}
                  </p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Deviations timeline (backend Фаза 1) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Таймлайн отклонений
          </CardTitle>
          <CardDescription>
            Хронология событий из суточных отчётов бригадиров и контроля план/факт (backend, Фаза 1)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {timeline.isLoading && <p className="text-xs text-muted-foreground py-3">Загрузка…</p>}
          {timeline.isError && <p className="text-xs text-muted-foreground py-3">Нет связи с backend</p>}
          {!timeline.isLoading && (timeline.data?.length ?? 0) === 0 && (
            <p className="text-xs text-muted-foreground py-3">Отклонений нет</p>
          )}
          <div className="relative pl-4">
            {(timeline.data ?? []).map((d: DeviationTimelineItem, idx: number) => {
              const dot = TL_SEVERITY_COLOR[d.severity] ?? '#f59e0b'
              const isLast = idx === (timeline.data?.length ?? 0) - 1
              return (
                <div key={d.id} className="relative pb-3">
                  {!isLast && <span className="absolute left-[3px] top-3 bottom-0 w-px bg-border" />}
                  <span
                    className="absolute left-0 top-1.5 h-2 w-2 rounded-full"
                    style={{ background: dot, boxShadow: `0 0 6px ${dot}aa` }}
                  />
                  <div className="pl-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-muted-foreground">{formatDate(d.detectedAt)}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{TL_KIND_LABEL[d.kind] ?? d.kind}</Badge>
                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: dot }}>
                        {d.severity}
                      </span>
                      {d.zone && <span className="text-[10px] text-muted-foreground">· {d.zone}</span>}
                      {d.deltaPct != null && (
                        <span className="text-[10px] text-muted-foreground ml-auto">Δ {d.deltaPct}%</span>
                      )}
                      {d.resolvedAt && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck className="h-2.5 w-2.5 mr-0.5" /> закрыто
                        </Badge>
                      )}
                    </div>
                    {d.description && (
                      <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{d.description}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick module links */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Быстрый переход в модули</CardTitle>
          <CardDescription>Прямые ссылки на разделы пакета «Строительство»</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {QUICK_LINKS.map((q) => {
              const Icon = q.icon
              return (
                <button
                  key={q.route}
                  onClick={() => navigate(q.route)}
                  className="rounded-lg border p-3 flex items-center gap-2 text-left transition-all hover:scale-[1.02] hover:bg-accent/30"
                  style={{ borderColor: `${q.color}33` }}
                >
                  <span
                    className="h-8 w-8 rounded-md flex items-center justify-center shrink-0"
                    style={{ background: `${q.color}1a`, color: q.color }}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-medium leading-tight">{q.label}</span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Deviations + Forecasts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent deviations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Последние отклонения
            </CardTitle>
            <CardDescription>Топ-5 нерешённых / недавних · по дате обнаружения</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {twin.isLoading && (
              <p className="text-xs text-muted-foreground py-3">Загрузка…</p>
            )}
            {(twin.data?.recentDeviations ?? []).map((d: Deviation) => {
              const meta = SEVERITY_STYLE[d.severity]
              const isResolved = !!d.resolvedAt
              return (
                <div key={d.id} className="rounded-md border p-3 space-y-1.5">
                  <div className="flex items-start gap-2">
                    <span
                      className="h-2 w-2 rounded-full mt-1.5 shrink-0"
                      style={{ background: meta.dot, boxShadow: `0 0 6px ${meta.dot}aa` }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {DEV_KIND_LABEL[d.kind]}
                        </Badge>
                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${meta.text}`}>
                          {d.severity}
                        </span>
                        {isResolved ? (
                          <Badge className="text-[10px] px-1.5 py-0 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" variant="outline">
                            <ShieldCheck className="h-2.5 w-2.5 mr-0.5" /> закрыто
                          </Badge>
                        ) : (
                          <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/15 text-amber-600 dark:text-amber-400" variant="outline">
                            <ShieldAlert className="h-2.5 w-2.5 mr-0.5" /> открыто
                          </Badge>
                        )}
                        <span className="ml-auto text-[10px] text-muted-foreground">
                          {formatDate(d.detectedAt)}
                        </span>
                      </div>
                      <p className="text-xs font-semibold mt-1">{d.scope}</p>
                      <p className="text-[11px] text-muted-foreground leading-snug">{d.description}</p>
                      {d.delta !== null && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Δ: {d.kind === 'cost' ? formatTg(d.delta, { compact: true }) : `${d.delta} дн.`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            {!twin.isLoading && (twin.data?.recentDeviations.length ?? 0) === 0 && (
              <p className="text-xs text-muted-foreground py-3">Отклонений нет</p>
            )}

            <Separator className="my-2" />
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs h-8"
              onClick={() => navigate('/construction-progress')}
            >
              Все отклонения в контроле СМР <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardContent>
        </Card>

        {/* Forecasts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Прогнозы (AI · stub)
            </CardTitle>
            <CardDescription>
              Расчёты заглушки до подключения настоящих моделей (Monte-Carlo / ML).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {twin.isLoading && (
              <p className="text-xs text-muted-foreground py-3">Загрузка…</p>
            )}
            {(twin.data?.forecasts ?? []).map((f: Forecast) => {
              const display =
                f.metric === 'finish_date'        ? formatDate(String(f.value)) :
                f.metric === 'cost_at_completion' ? formatTg(Number(f.value), { compact: true }) :
                                                    Number(f.value).toFixed(2)
              return (
                <div key={f.id} className="rounded-md border p-3 flex items-center gap-3">
                  <CalendarClock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">{FORECAST_LABEL[f.metric]}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Модель: {f.model} · доверие: {f.confidence}%
                    </p>
                  </div>
                  <span className="text-sm font-mono font-bold">{display}</span>
                </div>
              )
            })}
            {!twin.isLoading && (twin.data?.forecasts.length ?? 0) === 0 && (
              <p className="text-xs text-muted-foreground py-3">Прогнозов нет</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Asset hierarchy + integrations strip (read-only) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Иерархия активов</CardTitle>
            <CardDescription className="text-xs">
              Из отраслевого пакета — определяет глубину детализации в модулях
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center flex-wrap gap-1.5">
              {pack.assetHierarchy.map((level, idx) => (
                <span key={level} className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="text-[11px] font-normal">{level}</Badge>
                  {idx < pack.assetHierarchy.length - 1 && (
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  )}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Интеграции</CardTitle>
            <CardDescription className="text-xs">
              Целевой ландшафт коннекторов для проекта
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {pack.integrations.map((i) => (
                <Badge key={i} variant="outline" className="text-[11px] font-normal">
                  {i}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

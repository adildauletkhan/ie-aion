/**
 * ConstructionCV — модуль фактического CV-мониторинга стройки на основе
 * дрон-съёмки и Video-Text-to-Text (VLM) моделей с Hugging Face.
 *
 * Состав:
 *   ▸ Каталог дрон-облётов проекта с превью сцены и метаданными;
 *   ▸ Выбор VLM-модели из встроенного каталога (Marlin, LLaVA-Video,
 *     LLaVA-NeXT-Video, CogVLM2, MOSS-VL, InternVideo2, Keye-VL, LongVU);
 *   ▸ Выбор промпт-шаблона (прогресс / безопасность / описание / QA);
 *   ▸ Симуляция запуска инференса с прогресс-баром;
 *   ▸ Структурированный результат: сводка, прогресс по захваткам vs план,
 *     найденные нарушения ТБ, рекомендации, confidence;
 *   ▸ Вкладки: Анализ, Прогресс, Безопасность, Сравнение с BIM, Лог, Каталог.
 *
 * Mock-данные → `src/data/constructionMockData.ts`.  Бэкенд подключается
 * заменой реализации `runCvAnalysisStub` и пары fetch-функций.
 */

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

import {
  ScanEye, Plane, Cpu, PlayCircle, Sparkles, ShieldAlert, Activity,
  Layers, History, ListChecks, CheckCircle2, Clock, Upload, FileVideo,
  Wand2, AlertTriangle, TrendingUp, TrendingDown, Loader2,
} from 'lucide-react'

import { useTheme } from '@/hooks/useTheme'
import {
  fetchProject, fetchTasks, fetchElements, fetchDroneFlights,
  fetchCvModels, fetchCvAnalysisRuns, runCvAnalysisStub,
  getCurrentProjectId, formatDate,
  type DroneFlight, type CvModel, type CvAnalysisRun, type CvPromptTemplate,
  type SafetyIssue, type SafetyIssueKind, type BimElement, type ScheduleTask,
} from '@/data/constructionMockData'

const PROJECT_ID = getCurrentProjectId()

/* ───────────────────────── ПРОМПТ-ШАБЛОНЫ ─────────────────────────────── */

const PROMPT_TEMPLATES: Record<CvPromptTemplate, { label: string; text: string; icon: typeof Activity }> = {
  progress: {
    label: 'Прогресс СМР по захваткам',
    icon: Activity,
    text: 'Проанализируй облёт. Для каждой захватки укажи % готовности по СМР, заметные изменения за неделю и отличия от планового состояния. Ответь структурированно: zone, cv_pct, plan_pct, comment.',
  },
  safety: {
    label: 'Чек-лист по технике безопасности',
    icon: ShieldAlert,
    text: 'Найди нарушения ТБ на видео: отсутствие СИЗ (каска, жилет, страховочная привязь), небезопасные подъёмные операции, открытые проёмы, отсутствие ограждений, опасные состояния лесов. Укажи zone, severity, timestamp.',
  },
  caption: {
    label: 'Подробное описание сцены для отчёта',
    icon: Sparkles,
    text: 'Сгенерируй подробное описание видео для ежедневного отчёта производителя работ — порядка 8-12 предложений, в строительной терминологии.',
  },
  qa: {
    label: 'Ответ на конкретный вопрос',
    icon: Wand2,
    text: 'Ответь на вопрос:\n\nЗапрос: Все ли захватки нулевого цикла обоих корпусов закрыты?',
  },
  custom: {
    label: 'Свой промпт',
    icon: Wand2,
    text: '',
  },
}

/* ───────────────────────── МЕТАДАННЫЕ КАТЕГОРИЙ ───────────────────────── */

const SAFETY_META: Record<SafetyIssueKind, { label: string; tone: string }> = {
  no_helmet:       { label: 'Без каски',                tone: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  no_vest:         { label: 'Без сигнального жилета',   tone: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  unsecured_zone:  { label: 'Открытая опасная зона',    tone: 'bg-rose-500/15 text-rose-600 dark:text-rose-400'   },
  falling_object:  { label: 'Угроза падения предмета',  tone: 'bg-rose-500/15 text-rose-600 dark:text-rose-400'   },
  unsafe_scaffold: { label: 'Небезопасные леса',        tone: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  unsafe_lifting:  { label: 'Небезопасный подъём',      tone: 'bg-rose-500/15 text-rose-600 dark:text-rose-400'   },
}

// Шкала опасности — нейтраль → янтарь → красный (без лишних ярких хью)
const SEVERITY_TONE: Record<SafetyIssue['severity'], string> = {
  low:      'bg-muted text-muted-foreground',
  medium:   'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  high:     'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  critical: 'bg-rose-500/25 text-rose-700 dark:text-rose-300',
}

// Рекомендованное назначение модели — нейтральные бейджи
const RECOMMENDED_TONE: Record<CvModel['recommendedFor'], string> = {
  progress: 'bg-muted text-muted-foreground',
  safety:   'bg-muted text-muted-foreground',
  caption:  'bg-muted text-muted-foreground',
  qa:       'bg-muted text-muted-foreground',
  general:  'bg-muted text-muted-foreground',
}

const RECOMMENDED_LABEL: Record<CvModel['recommendedFor'], string> = {
  progress: 'Прогресс СМР',
  safety:   'Безопасность',
  caption:  'Подписи / отчёты',
  qa:       'QA / диалог',
  general:  'Универсальная',
}

const fmtTimeFromSec = (s: number): string => {
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

/* ───── ФОТО-ПРОГРЕССИЯ ОДНОЙ ПЛОЩАДКИ ВО ВРЕМЕНИ (сгенерированные кадры) ── */

interface ScenePhotoMeta { src: string; alt: string; credit: string }

/**
 * Хронологическая прогрессия строительства ОДНОЙ И ТОЙ ЖЕ площадки с одного
 * фиксированного ракурса дрона — от котлована к надстроенным этажам.
 * Кадры сгенерированы как единая серия (один ракурс, одно окружение,
 * разный прогресс), лежат в /public/cv-progression. Кадр выбирается по дате
 * облёта (порядковому номеру в хронологии). Фолбэк — процедурный SVG.
 */
const PROGRESSION_PHOTOS: ScenePhotoMeta[] = [
  {
    src: '/cv-progression/cv-stage-1.png',
    alt: 'Стадия 1 — котлованы и земляные работы (вид с дрона)',
    credit: 'demo-рендер площадки',
  },
  {
    src: '/cv-progression/cv-stage-2.png',
    alt: 'Стадия 2 — свайные поля и ростверк, смонтирован башенный кран',
    credit: 'demo-рендер площадки',
  },
  {
    src: '/cv-progression/cv-stage-3.png',
    alt: 'Стадия 3 — монолитная плита паркинга и первый этаж',
    credit: 'demo-рендер площадки',
  },
  {
    src: '/cv-progression/cv-stage-4.png',
    alt: 'Стадия 4 — растущий монолитный каркас (5-6 этажей)',
    credit: 'demo-рендер площадки',
  },
  {
    src: '/cv-progression/cv-stage-5.png',
    alt: 'Стадия 5 — высотные корпуса, монтаж витражного фасада',
    credit: 'demo-рендер площадки',
  },
  {
    src: '/cv-progression/cv-stage-6.png',
    alt: 'Стадия 6 — фасад почти смонтирован, демонтаж лесов',
    credit: 'demo-рендер площадки',
  },
  {
    src: '/cv-progression/cv-stage-7.png',
    alt: 'Стадия 7 — фасад завершён, демонтаж крана, подготовка двора',
    credit: 'demo-рендер площадки',
  },
  {
    src: '/cv-progression/cv-stage-8.png',
    alt: 'Стадия 8 — благоустройство: дороги, парковки, первые посадки',
    credit: 'demo-рендер площадки',
  },
  {
    src: '/cv-progression/cv-stage-9.png',
    alt: 'Стадия 9 — озеленение двора, детская площадка, малые формы',
    credit: 'demo-рендер площадки',
  },
  {
    src: '/cv-progression/cv-stage-10.png',
    alt: 'Стадия 10 — сданный и заселённый жилой комплекс',
    credit: 'demo-рендер площадки',
  },
]

/**
 * Стадия облёта = его ранг в хронологии (по возрастанию даты), отмасштаби-
 * рованный на длину прогрессии. Самый ранний облёт → ранняя стадия,
 * самый свежий → максимальная готовность.
 */
function flightPhotoMeta(flight: DroneFlight, allFlights: DroneFlight[]): ScenePhotoMeta {
  const sorted = [...allFlights].sort((a, b) => a.date.localeCompare(b.date))
  const rank = Math.max(0, sorted.findIndex((f) => f.id === flight.id))
  const n = sorted.length
  const p = PROGRESSION_PHOTOS.length
  const stage = n <= 1
    ? p - 1
    : Math.round((rank / (n - 1)) * (p - 1))
  return PROGRESSION_PHOTOS[Math.min(p - 1, Math.max(0, stage))]
}

/**
 * Картинка-сцена с фолбэком: если фото не загрузилось — показывается
 * существующий процедурный SVG.
 */
function ScenePhoto({
  photo, hint, large = false,
}: { photo?: ScenePhotoMeta; hint: DroneFlight['sceneHint']; width?: number; large?: boolean }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => { setFailed(false) }, [photo?.src])
  if (failed || !photo) {
    return <SceneSvg hint={hint} large={large} />
  }
  return (
    <>
      <img
        key={photo.src}
        src={photo.src}
        alt={photo.alt}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover"
        onError={() => setFailed(true)}
      />
      {/* Лёгкая виньетка под HUD */}
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: 'radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.55) 100%)' }} />
    </>
  )
}

/* ───────────────────────── ОСНОВНОЙ КОМПОНЕНТ ─────────────────────────── */

export default function ConstructionCV() {
  const project   = useQuery({ queryKey: ['constr', 'project'],       queryFn: () => fetchProject(PROJECT_ID) })
  const tasks     = useQuery({ queryKey: ['constr', 'tasks'],         queryFn: () => fetchTasks(PROJECT_ID) })
  const elements  = useQuery({ queryKey: ['constr', 'elements'],      queryFn: () => fetchElements(PROJECT_ID) })
  const flights   = useQuery({ queryKey: ['constr', 'cv', 'flights'], queryFn: () => fetchDroneFlights(PROJECT_ID) })
  const models    = useQuery({ queryKey: ['constr', 'cv', 'models'],  queryFn: () => fetchCvModels() })
  const runs      = useQuery({ queryKey: ['constr', 'cv', 'runs'],    queryFn: () => fetchCvAnalysisRuns(PROJECT_ID) })

  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null)
  const [selectedModelId, setSelectedModelId]   = useState<string | null>(null)
  const [promptKind, setPromptKind]             = useState<CvPromptTemplate>('progress')
  const [promptText, setPromptText]             = useState<string>(PROMPT_TEMPLATES.progress.text)

  // Состояние симулированного запуска
  const [runState, setRunState] = useState<{
    status: 'idle' | 'running' | 'done' | 'failed'
    progressPct: number
    result: CvAnalysisRun | null
    elapsedS: number
  }>({ status: 'idle', progressPct: 0, result: null, elapsedS: 0 })

  // При первой загрузке выбрать самый свежий облёт и рекомендованную модель
  useEffect(() => {
    if (!selectedFlightId && (flights.data?.length ?? 0) > 0) {
      const newest = [...(flights.data ?? [])].sort((a, b) => b.date.localeCompare(a.date))[0]
      setSelectedFlightId(newest.id)
    }
  }, [flights.data, selectedFlightId])
  useEffect(() => {
    if (!selectedModelId && (models.data?.length ?? 0) > 0) {
      const rec = models.data!.find((m) => m.recommendedFor === promptKind)
      setSelectedModelId((rec ?? models.data![0]).id)
    }
  }, [models.data, selectedModelId, promptKind])

  const selectedFlight = useMemo(
    () => (flights.data ?? []).find((f) => f.id === selectedFlightId) ?? null,
    [flights.data, selectedFlightId],
  )
  const selectedModel = useMemo(
    () => (models.data ?? []).find((m) => m.id === selectedModelId) ?? null,
    [models.data, selectedModelId],
  )

  const runsByFlight = useMemo(() => {
    const map: Record<string, CvAnalysisRun[]> = {}
    for (const r of runs.data ?? []) {
      ;(map[r.flightId] ||= []).push(r)
    }
    return map
  }, [runs.data])

  // Сбрасываем «локальный» результат при смене триггеров
  useEffect(() => {
    setRunState({ status: 'idle', progressPct: 0, result: null, elapsedS: 0 })
  }, [selectedFlightId, selectedModelId, promptKind])

  // Готовый результат для текущей пары (flight × model × prompt) из mock-истории
  const cachedRun = useMemo(() => {
    if (!selectedFlightId || !selectedModelId) return null
    return (runs.data ?? []).find((r) =>
      r.flightId === selectedFlightId &&
      r.modelId  === selectedModelId  &&
      r.promptTemplate === promptKind,
    ) ?? null
  }, [runs.data, selectedFlightId, selectedModelId, promptKind])

  const displayedRun: CvAnalysisRun | null = runState.result ?? cachedRun

  /* Запуск симуляции инференса */
  const handleRun = () => {
    if (!selectedFlight || !selectedModel) return
    setRunState({ status: 'running', progressPct: 0, result: null, elapsedS: 0 })
    // Демо-таймер: 2.5 сек реального времени = inferenceTimeS модели (имитация)
    const REAL_DURATION_MS = 2_400
    const TICK_MS = 80
    const ticks = Math.ceil(REAL_DURATION_MS / TICK_MS)
    let i = 0
    const handle = window.setInterval(() => {
      i += 1
      const pct = Math.min(100, Math.round((i / ticks) * 100))
      setRunState((s) => ({
        ...s,
        progressPct: pct,
        elapsedS: Math.round((i * TICK_MS) / 1000 * (selectedModel.inferenceTimeS / (REAL_DURATION_MS / 1000))),
      }))
      if (pct >= 100) {
        window.clearInterval(handle)
        runCvAnalysisStub(selectedFlight.id, selectedModel.id, promptKind, promptText).then((res) => {
          setRunState({ status: 'done', progressPct: 100, result: res, elapsedS: res.inferenceTimeS })
        })
      }
    }, TICK_MS)
  }

  const handlePromptKindChange = (k: CvPromptTemplate) => {
    setPromptKind(k)
    if (k !== 'custom') setPromptText(PROMPT_TEMPLATES[k].text)
  }

  /* Общая статистика модуля */
  const headerStats = useMemo(() => {
    const totalFlights = flights.data?.length ?? 0
    const analyzed     = (flights.data ?? []).filter((f) => f.status === 'analyzed').length
    const issues       = (runs.data ?? []).reduce((s, r) => s + (r.output?.safetyIssues.length ?? 0), 0)
    const totalModels  = models.data?.length ?? 0
    return { totalFlights, analyzed, issues, totalModels }
  }, [flights.data, runs.data, models.data])

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b bg-background shrink-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <ScanEye className="h-6 w-6 text-primary" />
              CV-мониторинг по дрон-съёмке
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {project.data
                ? <>Анализ облётов дрона для фактического контроля прогресса СМР с подбором VLM-модели на проекте <b>{project.data.name}</b></>
                : 'Загрузка проекта…'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <StatTile icon={Plane}       label="Облётов"          value={headerStats.totalFlights} />
            <StatTile icon={CheckCircle2} label="Проанализировано" value={headerStats.analyzed} />
            <StatTile icon={ShieldAlert} label="Нарушений ТБ"     value={headerStats.issues} />
            <StatTile icon={Cpu}         label="VLM-моделей"      value={headerStats.totalModels} />
          </div>
        </div>
      </div>

      {/* Two-pane layout */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[320px_1fr]">
        <aside className="border-r overflow-auto p-4 space-y-3">
          <Button variant="default" size="sm" className="w-full justify-start gap-2">
            <Upload className="h-4 w-4" />
            Загрузить новую съёмку
          </Button>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground px-1 pt-2">
            Облёты ({flights.data?.length ?? 0})
          </div>
          {(flights.data ?? []).map((f) => (
            <FlightCard
              key={f.id}
              flight={f}
              photo={flightPhotoMeta(f, flights.data ?? [])}
              selected={f.id === selectedFlightId}
              onSelect={() => setSelectedFlightId(f.id)}
              analysesCount={runsByFlight[f.id]?.length ?? 0}
            />
          ))}
        </aside>

        <div className="overflow-auto p-6 space-y-6">
          {!selectedFlight ? (
            <EmptyHint />
          ) : (
            <>
              <FlightHeader flight={selectedFlight} />
              <VideoPreview flight={selectedFlight} photo={flightPhotoMeta(selectedFlight, flights.data ?? [])} />

              <Tabs defaultValue="analysis" className="space-y-4">
                <TabsList className="h-auto p-1 flex flex-wrap">
                  <CvTab value="analysis" icon={PlayCircle}  label="Запуск анализа" />
                  <CvTab value="progress" icon={Activity}    label="Прогресс по захваткам" />
                  <CvTab value="safety"   icon={ShieldAlert} label="Безопасность" />
                  <CvTab value="bim"      icon={Layers}      label="Сравнение с BIM" />
                  <CvTab value="log"      icon={History}     label="Лог анализов" />
                  <CvTab value="catalog"  icon={Cpu}         label="Каталог моделей" />
                </TabsList>

                <TabsContent value="analysis" className="space-y-4 m-0">
                  <AnalysisPanel
                    flight={selectedFlight}
                    models={models.data ?? []}
                    selectedModel={selectedModel}
                    onSelectModel={(id) => setSelectedModelId(id)}
                    promptKind={promptKind}
                    onPromptKindChange={handlePromptKindChange}
                    promptText={promptText}
                    onPromptTextChange={setPromptText}
                    runState={runState}
                    onRun={handleRun}
                  />
                  {displayedRun && <RunResultCard run={displayedRun} model={selectedModel} flight={selectedFlight} />}
                </TabsContent>

                <TabsContent value="progress" className="m-0">
                  <ZoneProgressView run={displayedRun} />
                </TabsContent>

                <TabsContent value="safety" className="m-0">
                  <SafetyView runs={runsByFlight[selectedFlight.id] ?? []} />
                </TabsContent>

                <TabsContent value="bim" className="m-0">
                  <BimCompareView
                    run={displayedRun}
                    elements={elements.data ?? []}
                    tasks={tasks.data ?? []}
                  />
                </TabsContent>

                <TabsContent value="log" className="m-0">
                  <RunLogView
                    runs={runsByFlight[selectedFlight.id] ?? []}
                    models={models.data ?? []}
                  />
                </TabsContent>

                <TabsContent value="catalog" className="m-0">
                  <ModelCatalogView models={models.data ?? []} selectedId={selectedModelId} onSelect={setSelectedModelId} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────── SUB-COMPONENTS ─────────────────────────────── */

function StatTile({ icon: Icon, label, value }: { icon: typeof Plane; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-border bg-muted/40">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="uppercase tracking-wide text-[10px]">{label}: </span>
      <b className="text-foreground">{value}</b>
    </div>
  )
}

function CvTab({ value, icon: Icon, label }: { value: string; icon: typeof Activity; label: string }) {
  return (
    <TabsTrigger value={value} className="gap-2 px-3">
      <Icon className="h-4 w-4" />
      {label}
    </TabsTrigger>
  )
}

function EmptyHint() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] text-center text-muted-foreground gap-2">
      <FileVideo className="h-8 w-8 opacity-40" />
      <p className="text-sm">Выберите облёт слева, чтобы запустить анализ</p>
    </div>
  )
}

function FlightCard({
  flight, photo, selected, onSelect, analysesCount,
}: { flight: DroneFlight; photo: ScenePhotoMeta; selected: boolean; onSelect: () => void; analysesCount: number }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-lg border transition-colors overflow-hidden ${
        selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
      }`}
    >
      <FlightThumbnail hint={flight.sceneHint} photo={photo} />
      <div className="px-3 py-2.5 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm">{flight.flightNumber}</span>
          <StatusBadge status={flight.status} />
        </div>
        <div className="text-xs text-muted-foreground">
          {formatDate(flight.date)} · {fmtTimeFromSec(flight.durationS)} · {flight.altitudeM} м
        </div>
        <div className="text-[11px] text-muted-foreground line-clamp-1">
          {flight.zonesCovered.join(' · ')}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-0.5">
          <Sparkles className="h-3 w-3" />
          {analysesCount} анализ{analysesCount === 1 ? '' : analysesCount > 1 && analysesCount < 5 ? 'а' : 'ов'}
        </div>
      </div>
    </button>
  )
}

function StatusBadge({ status }: { status: DroneFlight['status'] }) {
  const map: Record<DroneFlight['status'], { label: string; tone: string }> = {
    uploaded:  { label: 'Загружен',    tone: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
    analyzing: { label: 'Анализ…',     tone: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
    analyzed:  { label: 'Готово',      tone: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
    archived:  { label: 'Архив',       tone: 'bg-muted text-muted-foreground' },
  }
  const m = map[status]
  return <Badge className={`text-[10px] ${m.tone}`}>{m.label}</Badge>
}

/* ─────────── Thumbnail / Video preview placeholder (SVG) ─────────────── */

function FlightThumbnail({ hint, photo }: { hint: DroneFlight['sceneHint']; photo: ScenePhotoMeta }) {
  // Реальное фото со стройплощадки (Unsplash), фолбэк — SVG
  return (
    <div className="h-[78px] w-full bg-[#0f1726] relative overflow-hidden">
      <ScenePhoto hint={hint} photo={photo} />
    </div>
  )
}

function VideoPreview({ flight, photo }: { flight: DroneFlight; photo: ScenePhotoMeta }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const credit = photo.credit
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div
          className="relative w-full"
          style={{ aspectRatio: '16/9', background: isDark ? '#0a121e' : '#0f1726' }}
        >
          <ScenePhoto hint={flight.sceneHint} photo={photo} large />
          {/* HUD overlays */}
          <div className="absolute top-3 left-3 text-[11px] text-emerald-300 font-mono space-y-0.5">
            <div>● REC · {flight.flightNumber}</div>
            <div>{flight.droneModel}</div>
            <div>ALT {flight.altitudeM} м · FPS 30</div>
          </div>
          <div className="absolute top-3 right-3 text-[11px] text-emerald-300 font-mono text-right space-y-0.5">
            <div>{formatDate(flight.date)}</div>
            <div>{new Date(flight.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
            <div>{flight.weather.split(',')[0]}</div>
          </div>
          {/* Detection bbox overlays (just decorative) */}
          <DetectionOverlay hint={flight.sceneHint} />
          {/* Bottom HUD: scrubber */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 text-[11px] text-emerald-300 font-mono">
            <span>00:00</span>
            <div className="flex-1 h-1.5 bg-emerald-500/20 rounded-full relative">
              <div className="absolute left-0 top-0 h-1.5 bg-emerald-400 rounded-full" style={{ width: '34%' }} />
            </div>
            <span>{fmtTimeFromSec(flight.durationS)}</span>
          </div>
          {/* Photo credit (Unsplash license) */}
          {credit && (
            <div className="absolute bottom-9 right-3 text-[9px] text-white/60 font-mono">
              demo-кадр · {credit}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/** SVG-сцена с упрощённым "видом с дрона" — для placeholder'а. */
function SceneSvg({ hint, large = false }: { hint: DroneFlight['sceneHint']; large?: boolean }) {
  const W = 800
  const H = 450
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 w-full h-full"
    >
      <defs>
        <linearGradient id="sky-cv" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e3a52" />
          <stop offset="100%" stopColor="#0a121e" />
        </linearGradient>
        <linearGradient id="ground-cv" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3d3327" />
          <stop offset="100%" stopColor="#1e1812" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={W} height={H} fill="url(#sky-cv)" />
      <rect x="0" y={H * 0.55} width={W} height={H} fill="url(#ground-cv)" />

      {/* Сетка как имитация ортофото */}
      {Array.from({ length: 12 }).map((_, i) => (
        <line key={`v${i}`} x1={(W / 12) * i} y1={H * 0.55} x2={(W / 12) * i} y2={H} stroke="#5b4933" strokeOpacity={0.18} />
      ))}
      {Array.from({ length: 6 }).map((_, i) => (
        <line key={`h${i}`} x1={0} y1={H * 0.55 + ((H * 0.45) / 6) * i} x2={W} y2={H * 0.55 + ((H * 0.45) / 6) * i} stroke="#5b4933" strokeOpacity={0.18} />
      ))}

      {hint === 'bs1-mono' && (
        <g>
          {/* Башенный кран слева */}
          <line x1="180" y1="430" x2="180" y2="120" stroke="#facc15" strokeWidth="3" />
          <line x1="180" y1="135" x2="350" y2="135" stroke="#facc15" strokeWidth="3" />
          <line x1="180" y1="135" x2="120" y2="135" stroke="#facc15" strokeWidth="3" />
          {/* Здание БС-1 4 этажа в работе */}
          <rect x="240" y="240" width="220" height="160" fill="#7c7066" stroke="#3f3f46" />
          <rect x="240" y="380" width="220" height="20" fill="#5e544c" />
          <rect x="240" y="320" width="220" height="20" fill="#5e544c" />
          <rect x="240" y="260" width="220" height="20" fill="#5e544c" />
          {/* Окна */}
          {[260, 300, 340, 380, 420].map((x, i) => (
            <g key={i}>
              <rect x={x} y={345} width={20} height={28} fill="#5bb3d6" opacity="0.85" />
              <rect x={x} y={285} width={20} height={28} fill="#5bb3d6" opacity="0.85" />
            </g>
          ))}
          {/* Опалубка верхнего (текущего) этажа */}
          <rect x="240" y="226" width="220" height="14" fill="#b59a64" />
          <line x1="240" y1="226" x2="460" y2="226" stroke="#fef3c7" strokeWidth="1" strokeDasharray="2 2" />
          {/* Соседняя площадка */}
          <rect x="500" y="380" width="160" height="20" fill="#4a4035" />
          <rect x="510" y="370" width="40" height="10" fill="#1e40af" />
        </g>
      )}

      {hint === 'bs1-piles' && (
        <g>
          {/* Поле свай */}
          {Array.from({ length: 5 }).map((_, i) =>
            Array.from({ length: 5 }).map((__, j) => (
              <circle key={`p-${i}-${j}`} cx={250 + i * 80} cy={300 + j * 30} r="6" fill="#3a3a3a" stroke="#fbbf24" strokeWidth="1" />
            )),
          )}
          {/* Буровая */}
          <rect x="180" y="240" width="40" height="120" fill="#facc15" />
          <line x1="200" y1="240" x2="200" y2="160" stroke="#facc15" strokeWidth="4" />
          <rect x="170" y="358" width="60" height="14" fill="#5e544c" />
        </g>
      )}

      {hint === 'bs2-pit' && (
        <g>
          {/* Котлован — затемнённая трапеция */}
          <polygon points="220,330 580,330 540,420 260,420" fill="#1a1410" stroke="#5b4933" />
          <polygon points="220,330 260,420 260,420 220,330" fill="#231a14" />
          <polygon points="580,330 540,420 540,420 580,330" fill="#231a14" />
          {/* Сваи на дне */}
          {Array.from({ length: 6 }).map((_, i) => (
            <circle key={i} cx={280 + i * 50} cy={385} r="5" fill="#3a3a3a" stroke="#fbbf24" strokeWidth="1" />
          ))}
          {/* Бытовка */}
          <rect x="640" y="380" width="80" height="30" fill="#1e40af" />
        </g>
      )}

      {hint === 'parking' && (
        <g>
          {/* Большая плита паркинга */}
          <rect x="120" y="280" width="560" height="140" fill="#5b6470" stroke="#3f3f46" />
          {/* Колонны */}
          {[180, 280, 380, 480, 580].map((x, i) => (
            <rect key={i} x={x - 8} y={260} width={16} height={20} fill="#3f3f46" />
          ))}
          {/* Разметка */}
          {[180, 280, 380, 480, 580].map((x, i) => (
            <rect key={`mk-${i}`} x={x - 2} y={330} width={4} height={70} fill="#fef3c7" />
          ))}
        </g>
      )}

      {hint === 'site' && (
        <g>
          {/* Общий план площадки: 2 здания + паркинг */}
          <rect x="180" y="260" width="180" height="160" fill="#7c7066" />
          <rect x="420" y="260" width="180" height="160" fill="#5b6470" stroke="#3f3f46" />
          <rect x="120" y="380" width="560" height="40" fill="#4a4035" opacity="0.55" />
          {/* Подъездные пути */}
          <path d="M0 420 Q 400 380 800 420" stroke="#5b4933" strokeWidth="22" fill="none" opacity="0.65" />
        </g>
      )}

      {/* Лёгкая виньетка для эффекта камеры */}
      <radialGradient id="vignette" cx="50%" cy="50%" r="80%">
        <stop offset="60%" stopColor="rgba(0,0,0,0)" />
        <stop offset="100%" stopColor="rgba(0,0,0,0.65)" />
      </radialGradient>
      <rect x="0" y="0" width={W} height={H} fill="url(#vignette)" />

      {!large && (
        <text x={W - 12} y={H - 10} fontSize="14" fill="#22d3ee" textAnchor="end" fontFamily="ui-monospace">
          DRONE-CAM
        </text>
      )}
    </svg>
  )
}

function DetectionOverlay({ hint }: { hint: DroneFlight['sceneHint'] }) {
  const boxes: { x: string; y: string; w: string; h: string; label: string; color: string }[] = (() => {
    switch (hint) {
      // Обычные объекты — единый бренд-цвет, угрозы — красный
      case 'bs1-mono': return [
        { x: '28%', y: '38%', w: '34%', h: '40%', label: 'Здание БС-1',         color: '#10b981' },
        { x: '15%', y: '20%', w: '26%', h: '14%', label: 'Кран КР-1',           color: '#10b981' },
        { x: '46%', y: '30%', w: '12%', h: '8%',  label: 'Опалубка · этаж 4',   color: '#10b981' },
        { x: '70%', y: '78%', w: '12%', h: '6%',  label: 'Бытовка',             color: '#10b981' },
      ]
      case 'bs1-piles': return [
        { x: '30%', y: '55%', w: '50%', h: '24%', label: 'Свайное поле',  color: '#10b981' },
        { x: '20%', y: '34%', w: '8%',  h: '36%', label: 'Буровая',       color: '#10b981' },
      ]
      case 'bs2-pit': return [
        { x: '26%', y: '60%', w: '46%', h: '24%', label: 'Котлован БС-2',          color: '#ef4444' },
        { x: '28%', y: '83%', w: '44%', h: '4%',  label: 'Нет ограждения',         color: '#ef4444' },
        { x: '78%', y: '78%', w: '14%', h: '8%',  label: 'Бытовка',                color: '#10b981' },
      ]
      case 'parking': return [
        { x: '14%', y: '60%', w: '72%', h: '24%', label: 'Плита паркинга',         color: '#10b981' },
      ]
      case 'site': return [
        { x: '22%', y: '55%', w: '24%', h: '30%', label: 'БС-1',         color: '#10b981' },
        { x: '52%', y: '55%', w: '24%', h: '30%', label: 'БС-2',         color: '#10b981' },
        { x: '14%', y: '82%', w: '72%', h: '8%',  label: 'Проезд',       color: '#10b981' },
      ]
    }
  })()
  return (
    <div className="absolute inset-0 pointer-events-none">
      {boxes.map((b, i) => (
        <div key={i} className="absolute" style={{ left: b.x, top: b.y, width: b.w, height: b.h }}>
          <div
            className="w-full h-full border-2 rounded-sm"
            style={{ borderColor: b.color, boxShadow: `0 0 0 1px ${b.color}33` }}
          />
          <div
            className="absolute -top-5 left-0 text-[10px] font-mono px-1.5 py-0.5 rounded-sm"
            style={{ background: b.color, color: '#0a0a0a' }}
          >
            {b.label}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─────────── Flight header / metadata strip ───────────────────────────── */

function FlightHeader({ flight }: { flight: DroneFlight }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-md bg-primary/10 text-primary">
          <Plane className="h-5 w-5" />
        </div>
        <div>
          <div className="font-semibold">{flight.flightNumber} · {flight.droneModel}</div>
          <div className="text-xs text-muted-foreground">
            {formatDate(flight.date)} ·{' '}
            {new Date(flight.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} ·{' '}
            {fmtTimeFromSec(flight.durationS)} · {flight.altitudeM} м · {flight.weather}
          </div>
        </div>
      </div>
      <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
        <Badge variant="outline">{flight.framesTotal.toLocaleString('ru-RU')} кадров</Badge>
        <Badge variant="outline">{flight.fileSizeMb} МБ</Badge>
        <Badge variant="outline">{flight.pilot}</Badge>
        {flight.zonesCovered.map((z) => (
          <Badge key={z} variant="secondary" className="text-[10px]">{z}</Badge>
        ))}
      </div>
    </div>
  )
}

/* ─────────── Analysis panel ─────────────────────────────────────────── */

function AnalysisPanel({
  flight, models, selectedModel, onSelectModel,
  promptKind, onPromptKindChange, promptText, onPromptTextChange,
  runState, onRun,
}: {
  flight: DroneFlight
  models: CvModel[]
  selectedModel: CvModel | null
  onSelectModel: (id: string) => void
  promptKind: CvPromptTemplate
  onPromptKindChange: (k: CvPromptTemplate) => void
  promptText: string
  onPromptTextChange: (s: string) => void
  runState: { status: 'idle' | 'running' | 'done' | 'failed'; progressPct: number; elapsedS: number }
  onRun: () => void
}) {
  void flight
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <PlayCircle className="h-4 w-4" />
          Конфигурация анализа
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Model selector */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">VLM-модель</label>
            <Select value={selectedModel?.id ?? ''} onValueChange={onSelectModel}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите модель" />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-xs">{m.org}/</span>
                      <span>{m.modelName}</span>
                      <span className="text-[10px] text-muted-foreground">· {m.paramsBn}B · {m.contextFrames}fr</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedModel && <ModelDetailsBox model={selectedModel} />}
          </div>

          {/* Prompt template + text */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Промпт-шаблон</label>
            <Select value={promptKind} onValueChange={(v) => onPromptKindChange(v as CvPromptTemplate)}>
              <SelectTrigger>
                <SelectValue placeholder="Шаблон" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PROMPT_TEMPLATES) as CvPromptTemplate[]).map((k) => {
                  const meta = PROMPT_TEMPLATES[k]
                  const Icon = meta.icon
                  return (
                    <SelectItem key={k} value={k}>
                      <span className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5" />
                        {meta.label}
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            <textarea
              value={promptText}
              onChange={(e) => onPromptTextChange(e.target.value)}
              rows={6}
              className="w-full text-xs font-mono rounded-md border border-input bg-background p-2"
              placeholder="Текст промпта…"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button
            onClick={onRun}
            disabled={runState.status === 'running' || !selectedModel}
            className="gap-2"
          >
            {runState.status === 'running'
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <PlayCircle className="h-4 w-4" />}
            {runState.status === 'running' ? 'Инференс…' : 'Запустить анализ'}
          </Button>
          {runState.status === 'running' && (
            <div className="flex-1 min-w-[260px] flex items-center gap-2">
              <Progress value={runState.progressPct} className="h-1.5 flex-1" />
              <span className="text-xs text-muted-foreground tabular-nums w-24 text-right">
                {runState.progressPct}% · {runState.elapsedS} с
              </span>
            </div>
          )}
          {selectedModel && runState.status !== 'running' && (
            <span className="text-xs text-muted-foreground">
              Ожидаемое время инференса: <b>~{selectedModel.inferenceTimeS} с</b>
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function ModelDetailsBox({ model }: { model: CvModel }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-sm">{model.name}</span>
        <Badge className={`text-[10px] ${RECOMMENDED_TONE[model.recommendedFor]}`}>
          {RECOMMENDED_LABEL[model.recommendedFor]}
        </Badge>
        <Badge variant="outline" className="text-[10px]">{model.paramsBn}B</Badge>
        <Badge variant="outline" className="text-[10px]">{model.contextFrames} кадров</Badge>
        <Badge variant="outline" className="text-[10px]">{model.vramGb} ГБ VRAM</Badge>
        <Badge variant="outline" className="text-[10px]">{model.license}</Badge>
      </div>
      <p className="text-xs text-muted-foreground">{model.description}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
        <div>
          <div className="font-medium mb-0.5">Сильные стороны</div>
          <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
            {model.strengths.map((s) => <li key={s}>{s}</li>)}
          </ul>
        </div>
        <div>
          <div className="font-medium mb-0.5">Лучшее применение</div>
          <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
            {model.useCases.map((s) => <li key={s}>{s}</li>)}
          </ul>
        </div>
      </div>
    </div>
  )
}

/* ─────────── Run result card ─────────────────────────────────────────── */

function RunResultCard({
  run, model, flight,
}: { run: CvAnalysisRun; model: CvModel | null; flight: DroneFlight }) {
  if (!run.output) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Результат анализа
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            {model?.name} · {run.inferenceTimeS} с · confidence <b className="text-foreground">{run.output.confidence}%</b>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-border bg-muted/30 p-3 text-sm leading-relaxed">
          {run.output.summary}
        </div>
        {run.output.progressByZone.length > 0 && (
          <div>
            <div className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
              <Activity className="h-3.5 w-3.5" /> Прогресс по захваткам (CV ↔ план)
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Захватка</TableHead>
                  <TableHead className="w-[80px] text-right">CV</TableHead>
                  <TableHead className="w-[80px] text-right">План</TableHead>
                  <TableHead className="w-[80px] text-right">Δ</TableHead>
                  <TableHead>Комментарий модели</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {run.output.progressByZone.map((row) => (
                  <TableRow key={row.zone}>
                    <TableCell className="font-medium">{row.zone}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.cvPct}%</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{row.planPct}%</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <DeltaBadge value={row.deltaPct} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row.comment}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {run.output.safetyIssues.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5" /> Нарушения ТБ ({run.output.safetyIssues.length})
            </div>
            <div className="flex flex-col gap-1.5">
              {run.output.safetyIssues.map((iss) => <SafetyRow key={iss.id} issue={iss} />)}
            </div>
          </div>
        )}
        {run.output.recommendations.length > 0 && (
          <div>
            <div className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
              <ListChecks className="h-3.5 w-3.5" /> Рекомендации
            </div>
            <ul className="list-disc pl-5 text-sm space-y-1">
              {run.output.recommendations.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </div>
        )}
        <div className="text-[11px] text-muted-foreground pt-1 border-t pt-2">
          Облёт: <b>{flight.flightNumber}</b> · кадров: {flight.framesTotal.toLocaleString('ru-RU')} ·
          обнаружено элементов: <b>{run.output.detectedElements}</b>
        </div>
      </CardContent>
    </Card>
  )
}

function DeltaBadge({ value }: { value: number }) {
  if (value === 0) return <span className="text-muted-foreground">—</span>
  const Icon = value > 0 ? TrendingUp : TrendingDown
  const tone = value > 0
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-rose-600 dark:text-rose-400'
  return (
    <span className={`inline-flex items-center gap-1 font-medium ${tone}`}>
      <Icon className="h-3 w-3" />
      {value > 0 ? '+' : ''}{value}%
    </span>
  )
}

function SafetyRow({ issue }: { issue: SafetyIssue }) {
  const kind = SAFETY_META[issue.kind]
  return (
    <div className="flex items-start gap-2 rounded-md border border-border p-2.5 text-sm">
      <ShieldAlert className="h-4 w-4 mt-0.5 text-rose-500 shrink-0" />
      <div className="flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={`text-[10px] ${kind.tone}`}>{kind.label}</Badge>
          <Badge className={`text-[10px] ${SEVERITY_TONE[issue.severity]}`}>{issue.severity.toUpperCase()}</Badge>
          <span className="text-[11px] text-muted-foreground font-mono">{issue.detectedAt}</span>
          <span className="text-xs text-muted-foreground">{issue.zoneContext}</span>
        </div>
        <p className="text-sm text-foreground/90">{issue.description}</p>
      </div>
    </div>
  )
}

/* ─────────── Zone progress view (chart) ──────────────────────────────── */

function ZoneProgressView({ run }: { run: CvAnalysisRun | null }) {
  if (!run?.output || run.output.progressByZone.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Нет данных по прогрессу — запустите анализ с шаблоном «Прогресс СМР».
        </CardContent>
      </Card>
    )
  }
  const data = run.output.progressByZone.map((p) => ({
    zone: p.zone, cv: p.cvPct, plan: p.planPct, delta: p.deltaPct,
  }))
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Прогресс по захваткам (CV vs план)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
              <XAxis dataKey="zone" interval={0} tick={{ fontSize: 10 }} angle={-12} textAnchor="end" height={70} />
              <YAxis tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Legend />
              <Bar dataKey="plan" name="План" fill="#94a3b8" />
              <Bar dataKey="cv" name="CV-факт">
                {data.map((d, i) => (
                  <Cell key={i} fill={d.delta >= 0 ? '#10b981' : '#f97316'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

/* ─────────── Safety aggregate view ───────────────────────────────────── */

function SafetyView({ runs }: { runs: CvAnalysisRun[] }) {
  const issues = useMemo(() => runs.flatMap((r) => r.output?.safetyIssues ?? []), [runs])
  if (issues.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          На этом облёте моделями не выявлено нарушений ТБ.
        </CardContent>
      </Card>
    )
  }
  const bySeverity = issues.reduce<Record<string, number>>((acc, i) => {
    acc[i.severity] = (acc[i.severity] ?? 0) + 1
    return acc
  }, {})
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" /> Нарушения ТБ ({issues.length})
          </span>
          <span className="flex gap-2">
            {Object.entries(bySeverity).map(([sev, n]) => (
              <Badge key={sev} className={`text-[10px] ${SEVERITY_TONE[sev as SafetyIssue['severity']] ?? ''}`}>
                {sev.toUpperCase()}: {n}
              </Badge>
            ))}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {issues.map((iss) => <SafetyRow key={iss.id} issue={iss} />)}
      </CardContent>
    </Card>
  )
}

/* ─────────── BIM compare view ────────────────────────────────────────── */

function BimCompareView({
  run, elements, tasks,
}: { run: CvAnalysisRun | null; elements: BimElement[]; tasks: ScheduleTask[] }) {
  if (!run?.output || run.output.progressByZone.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Сначала выполните анализ с прогресс-промптом для сравнения с планом BIM.
        </CardContent>
      </Card>
    )
  }
  const taskById: Record<string, ScheduleTask> = Object.fromEntries(tasks.map((t) => [t.id, t]))
  const zoneCv: Record<string, number> = Object.fromEntries(run.output.progressByZone.map((p) => [p.zone, p.cvPct]))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Layers className="h-4 w-4" /> Сопоставление BIM-элементов с CV-фактом
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Элемент</TableHead>
              <TableHead>Захватка / уровень</TableHead>
              <TableHead>Привязанная задача</TableHead>
              <TableHead className="text-right">План задачи</TableHead>
              <TableHead className="text-right">CV-факт зоны</TableHead>
              <TableHead className="text-right">Δ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {elements.map((el) => {
              const t = taskById[el.taskId]
              const planPct = t?.progressPct ?? 0
              const cvPct   = zoneCv[el.zone] ?? null
              const delta   = cvPct !== null ? cvPct - planPct : null
              return (
                <TableRow key={el.id}>
                  <TableCell>
                    <div className="font-medium text-sm">{el.name}</div>
                    <div className="text-[11px] text-muted-foreground">{el.type} · {el.guid}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{el.zone}</div>
                    <div className="text-[11px] text-muted-foreground">Уровень: {el.level}</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {t ? <>{t.wbs} · {t.name}</> : '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono">{planPct}%</TableCell>
                  <TableCell className="text-right font-mono">{cvPct !== null ? `${cvPct}%` : '—'}</TableCell>
                  <TableCell className="text-right font-mono">
                    {delta === null ? '—' : <DeltaBadge value={delta} />}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

/* ─────────── Run log view ───────────────────────────────────────────── */

function RunLogView({ runs, models }: { runs: CvAnalysisRun[]; models: CvModel[] }) {
  const modelById = useMemo(
    () => Object.fromEntries(models.map((m) => [m.id, m])) as Record<string, CvModel>,
    [models],
  )
  if (runs.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          По этому облёту ещё не было запусков анализа.
        </CardContent>
      </Card>
    )
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4" />
          История анализов ({runs.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Запуск</TableHead>
              <TableHead>Модель</TableHead>
              <TableHead>Шаблон</TableHead>
              <TableHead className="text-right">Inference</TableHead>
              <TableHead className="text-right">Confidence</TableHead>
              <TableHead className="text-right">ТБ-инциденты</TableHead>
              <TableHead>Сводка</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...runs].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).map((r) => {
              const m = modelById[r.modelId]
              return (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">
                    <div className="font-mono">{r.id}</div>
                    <div className="text-muted-foreground">{new Date(r.startedAt).toLocaleString('ru-RU')}</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {m?.name ?? r.modelId}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {PROMPT_TEMPLATES[r.promptTemplate].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">{r.inferenceTimeS} с</TableCell>
                  <TableCell className="text-right font-mono text-xs">{r.output?.confidence ?? 0}%</TableCell>
                  <TableCell className="text-right font-mono text-xs">{r.output?.safetyIssues.length ?? 0}</TableCell>
                  <TableCell className="text-xs text-muted-foreground line-clamp-2 max-w-md">
                    {r.output?.summary}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

/* ─────────── Model catalog view ─────────────────────────────────────── */

function ModelCatalogView({
  models, selectedId, onSelect,
}: { models: CvModel[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const [filter, setFilter] = useState('')
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return models
    return models.filter((m) =>
      m.name.toLowerCase().includes(q) ||
      m.family.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q),
    )
  }, [filter, models])

  return (
    <div className="space-y-4">
      <Input
        placeholder="Поиск по моделям (Marlin, LLaVA-Video, CogVLM2, …)"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="max-w-md"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((m) => (
          <Card
            key={m.id}
            className={`cursor-pointer transition-colors ${
              selectedId === m.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'
            }`}
            onClick={() => onSelect(m.id)}
          >
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-sm flex items-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5 text-primary" />
                    {m.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {m.family} · обновлена {formatDate(m.updated)}
                  </div>
                </div>
                <Badge className={`text-[10px] ${RECOMMENDED_TONE[m.recommendedFor]}`}>
                  {RECOMMENDED_LABEL[m.recommendedFor]}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{m.description}</p>
              <div className="flex flex-wrap gap-1.5 text-[10px]">
                <Badge variant="outline">{m.paramsBn}B</Badge>
                <Badge variant="outline">{m.contextFrames} кадров</Badge>
                <Badge variant="outline">{m.vramGb} ГБ VRAM</Badge>
                <Badge variant="outline">{m.license}</Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> ~{m.inferenceTimeS} с
                </Badge>
                <Badge variant="outline">↓ {m.hfDownloads.toLocaleString('ru-RU')}/мес</Badge>
                <Badge variant="outline">♥ {m.hfLikes}</Badge>
              </div>
              {selectedId === m.id && (
                <div className="pt-2 border-t border-border space-y-1.5">
                  <div>
                    <div className="text-[11px] font-medium">Сильные стороны</div>
                    <ul className="list-disc pl-4 text-[11px] text-muted-foreground">
                      {m.strengths.map((s) => <li key={s}>{s}</li>)}
                    </ul>
                  </div>
                  <div>
                    <div className="text-[11px] font-medium">Лучшее применение</div>
                    <ul className="list-disc pl-4 text-[11px] text-muted-foreground">
                      {m.useCases.map((s) => <li key={s}>{s}</li>)}
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="text-center text-sm text-muted-foreground py-10 flex flex-col items-center gap-2">
          <AlertTriangle className="h-5 w-5 opacity-40" />
          По запросу «{filter}» моделей не найдено
        </div>
      )}
    </div>
  )
}

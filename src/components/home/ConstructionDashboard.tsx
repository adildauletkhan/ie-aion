import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '@/hooks/useTheme'
import { useCompanyProfile } from '@/context/CompanyProfileContext'
import { getAuthHeader } from '@/lib/auth'
import { getCurrentProjectId } from '@/data/constructionMockData'
import { fetchProgressSparkline } from '@/lib/constructionApi'
import { KpiCard } from './KpiCard'
import { BackgroundEffects } from './BackgroundEffects'
import { StatusBar } from './StatusBar'
import { AiAssistant } from './AiAssistant'
import {
  Building2, HardHat, CalendarRange, FileBarChart2,
  ChevronRight, CheckCircle2, AlertTriangle, Clock, TrendingUp,
  Box, Map, Gauge, Workflow,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type VoiceLang = 'ru' | 'en' | 'kk'
interface ChatMessage { role: 'user' | 'assistant'; text: string }
interface Sources {
  masterData: boolean; geology: boolean; scenarios: boolean
  annualPlans: boolean; results: boolean; crisis: boolean; entities: boolean
}

const FALLBACK =
  'Здравствуйте! Я AI-ассистент строительного блока. ' +
  'В работе 27 объектов, освоено 64.2% бюджета портфеля (312 млрд ₸). ' +
  'LTIFR 0.41, в графике 81% объектов. Спрашивайте про графики, бюджеты, ресурсы или ПБ.'

const LANG_PREFIX: Record<VoiceLang, string> = {
  ru: '[Отвечай на русском. Контекст: строительство, девелопмент, ИСУП, ТИМ/BIM, графики, ОТиТБ.]\n',
  en: '[Respond in English. Context: construction, project portfolio, BIM, schedules, EHS.]\n',
  kk: '[Тек қазақ тілінде. Контекст: құрылыс, нысандар, BIM, кесте, ЕХБ.]\n',
}

const SPARK_PROJECT_ID = getCurrentProjectId()

const KK_MARKERS = /[әғқңөұүһі]|салем|сәлем|қалай|рақмет/i
const EN_MARKERS = /^[a-z0-9\s.,!?'"()\-/:;@#$%&*+=]+$/i

function detectLang(text: string): VoiceLang {
  if (KK_MARKERS.test(text.trim())) return 'kk'
  if (EN_MARKERS.test(text.trim())) return 'en'
  return 'ru'
}

/* ── Spark data — 7-day rolling ──────────────────────────────────────────── */
const PROGRESS_SPARK = [62.1, 62.5, 62.9, 63.4, 63.7, 64.0, 64.2]
const BUDGET_SPARK   = [58.0, 59.2, 60.1, 61.4, 62.5, 63.4, 64.2]
const SCHEDULE_SPARK = [78,   79,   80,   80,   81,   81,   81  ]
const SAFETY_SPARK   = [0.52, 0.48, 0.47, 0.45, 0.44, 0.42, 0.41]

/* ── Active sites strip ──────────────────────────────────────────────────── */
const SITES = [
  { label: 'ЖК «Highvill Astana»', value: 'Жилое · 12 БС',        sub: 'Готовность 78%', icon: Building2, status: 'online' },
  { label: 'Промпарк «Алматы-Запад»', value: 'Промышленное',       sub: 'Готовность 52%', icon: HardHat,   status: 'online' },
  { label: 'БАКАД · участок 12',   value: 'Инфраструктура',        sub: '64% · −8 дн.',   icon: Map,       status: 'warn'   },
  { label: 'ЖК «Esentai City»',    value: 'Смешанное · 2 этап',    sub: 'Готовность 41%', icon: Box,       status: 'online' },
]

/* ── Component ────────────────────────────────────────────────────────────── */

export function ConstructionDashboard() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const { profile } = useCompanyProfile()
  const isDark = theme === 'dark'

  // Реальный спарклайн освоения (EV) за 14 дней из backend; fallback — статичный ряд.
  const sparklineQ = useQuery({
    queryKey: ['construction', SPARK_PROJECT_ID, 'progress-sparkline'],
    queryFn: () => fetchProgressSparkline(SPARK_PROJECT_ID, 14),
    retry: false,
  })
  const budgetSpark = useMemo(() => {
    const pts = (sparklineQ.data ?? [])
      .map((p) => p.ev)
      .filter((v): v is number => v != null && v > 0)
    return pts.length > 1 ? pts : BUDGET_SPARK
  }, [sparklineQ.data])

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [question, setQuestion] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [chatError, setChatError] = useState('')
  const [voiceLang, setVoiceLang] = useState<VoiceLang>('ru')
  const [sources, setSources] = useState<Sources>({
    masterData: true, geology: false, scenarios: true,
    annualPlans: true, results: true, crisis: true, entities: true,
  })

  const handleAsk = async () => {
    if (!question.trim()) return
    const q = question.trim()
    const lang = detectLang(q)
    setVoiceLang(lang)
    setMessages((prev) => [...prev, { role: 'user', text: q }])
    setQuestion('')
    setChatError('')
    setIsChatLoading(true)
    try {
      const auth = getAuthHeader()
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: auth } : {}) },
        body: JSON.stringify({ question: LANG_PREFIX[lang] + q, sources, language: lang }),
      })
      if (res.ok) {
        const { answer } = (await res.json()) as { answer: string }
        setMessages((prev) => [...prev, { role: 'assistant', text: answer?.trim() || FALLBACK }])
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', text: FALLBACK }])
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: FALLBACK }])
    }
    setIsChatLoading(false)
  }

  const tAi = (key: string) => {
    const map: Record<string, string> = {
      aiAssistantName: 'AIBuild — AI Ассистент стройки',
      aiAssistantSubtitle: 'Помощник по портфелю объектов · Графики, бюджеты, ПБ',
      chatUser: 'Вы',
      chatPlaceholder: 'Спросите про сроки, бюджет, ресурсы или ПБ…',
      inputHint: 'Введите вопрос и нажмите Enter',
      ragSources: 'Источники данных',
      sourcesMasterData: 'Объекты / НСИ',
      sourcesGeology: 'Изыскания',
      sourcesScenarios: 'Сценарии',
      sourcesAnnualPlans: 'Графики и бюджет',
      sourcesResults: 'Телеметрия со стройплощадок',
      sourcesCrisis: 'Инциденты / ПБ',
      sourcesEntities: 'Подрядчики',
      srcMasterData: 'Объекты',
      srcGeology: 'Изыскания',
      srcScenarios: 'Сценарии',
      srcAnnualPlans: 'Графики',
      srcResults: 'Телеметрия',
      srcCrisis: 'Инциденты',
      srcEntities: 'Подрядчики',
      ragScenarioRun: 'Запуск сценария',
      scenarioNotSelected: 'Сценарий не выбран',
      runScenarioBtn: 'Запустить расчёт',
      scenarioRunSuccess: 'Готово',
      scenarioRunFailed: 'Ошибка',
      scenarioRunSuccessDemo: 'Готово (демо)',
      aiReadAloud: 'Озвучить',
      aiStopSpeech: 'Остановить',
    }
    return map[key] ?? key
  }

  // Единая палитра: один брендовый акцент + семантика статусов
  const accent      = isDark ? '#5CE0D6' : '#0D9488'   // бирюза — основной акцент
  const accentGreen = isDark ? '#4ADE80' : '#16A34A'   // ok
  const accentWarn  = isDark ? '#FBBF24' : '#D97706'   // отставание / внимание

  const quickActions = [
    { label: '4D-модель',                 icon: Box,          route: '/construction-4d' },
    { label: 'График и планирование',     icon: CalendarRange, route: '/construction-planning' },
    { label: 'Контроль СМР · план/факт',  icon: Gauge,        route: '/construction-progress' },
    { label: 'Цифровой двойник стройки',  icon: Workflow,     route: '/construction-digital-twin' },
  ]

  return (
    <div className="relative flex flex-col min-h-full">
      <BackgroundEffects />
      <StatusBar />

      <div className="relative z-10 flex-1 flex gap-0 min-h-0">

        {/* ── Left: main dashboard ── */}
        <div className="flex-1 min-w-0 p-6 space-y-6 overflow-y-auto">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.25em] mb-1"
                style={{ color: accent }}
              >
                Строительный блок · {profile.companyName || 'Холдинг'}
              </p>
              <h1
                className="text-2xl font-bold uppercase tracking-[0.12em] leading-tight"
                style={{ color: isDark ? '#FFFFFF' : accent }}
              >
                IE:AION
              </h1>
              <p className="text-xs text-muted-foreground mt-1" style={{ letterSpacing: '0.04em' }}>
                Управление портфелем строительных проектов · Графики · Бюджеты · ПБ
              </p>
            </div>
            <div className="hidden md:flex flex-col items-end gap-1.5">
              <Badge
                className="text-[9px] font-semibold px-2 py-0.5"
                style={{ background: `${accent}1A`, color: accent, border: `1px solid ${accent}40` }}
              >
                <HardHat className="h-3 w-3 mr-1" />СТРОИТЕЛЬСТВО
              </Badge>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard
              title="Физический прогресс"
              value={64.2}
              subtitle="% портфеля · план 65.0% · −0.8 п.п."
              icon={<TrendingUp className="h-3.5 w-3.5" />}
              color="cyan"
              sparkData={PROGRESS_SPARK}
              decimals={1}
            />
            <KpiCard
              title="Освоение бюджета"
              value={64.2}
              subtitle="% от 312 млрд ₸ · план 62.0% · +2.2 п.п."
              icon={<FileBarChart2 className="h-3.5 w-3.5" />}
              color="cyan"
              sparkData={budgetSpark}
              decimals={1}
              animDelay={120}
            />
            <KpiCard
              title="Объектов в графике"
              value={81}
              subtitle="% (22 из 27) · 5 объектов с отставанием"
              icon={<CalendarRange className="h-3.5 w-3.5" />}
              color="green"
              sparkData={SCHEDULE_SPARK}
              animDelay={240}
            />
            <KpiCard
              title="LTIFR"
              value={0.41}
              subtitle="на 1М ч. · цель < 0.50 · тренд ↓"
              icon={<HardHat className="h-3.5 w-3.5" />}
              color="green"
              sparkData={SAFETY_SPARK}
              decimals={2}
              animDelay={360}
            />
          </div>

          {/* Sites strip */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {SITES.map((s) => {
              const Icon = s.icon
              const dot = s.status === 'online' ? accentGreen : accentWarn
              return (
                <div
                  key={s.label}
                  className="rounded-xl p-3 border bg-card/40 transition-all hover:bg-muted/40"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="rounded-md p-1.5 bg-muted">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider truncate text-foreground/80">
                      {s.label}
                    </p>
                    <span
                      className="ml-auto h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ background: dot }}
                    />
                  </div>
                  <p className="text-sm font-bold leading-tight">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{s.sub}</p>
                </div>
              )
            })}
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            {quickActions.map((a) => {
              const Icon = a.icon
              return (
                <button
                  key={a.route}
                  onClick={() => navigate(a.route)}
                  className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all hover:bg-muted/50"
                  style={{ borderColor: `${accent}30`, color: accent }}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {a.label}
                  <ChevronRight className="h-3 w-3 opacity-60" />
                </button>
              )
            })}
          </div>

          {/* Alert strip */}
          <div className="rounded-xl border p-3 flex items-start gap-3"
            style={{ borderColor: `${accentWarn}30`, background: `${accentWarn}0A` }}>
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: accentWarn }} />
            <div>
              <p className="text-xs font-semibold" style={{ color: accentWarn }}>
                3 объекта с отставанием от графика
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                БАКАД уч. 12 · −8 дн. · Промпарк Алматы-Запад · −5 дн. · ЖК «Esentai City» · −3 дн.
              </p>
            </div>
            <button
              onClick={() => navigate('/construction-progress')}
              className="ml-auto text-[10px] font-semibold whitespace-nowrap"
              style={{ color: accentWarn }}
            >
              Контроль СМР →
            </button>
          </div>

          {/* Recent ops mini-table */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Оперативная сводка · {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
            </p>
            <div className="space-y-1.5">
              {[
                { time: '07:20', loc: 'ЖК «Highvill Astana» · БС-4', msg: 'Залит монолит 18-го этажа (124 м³).',     ok: true  },
                { time: '10:05', loc: 'БАКАД · уч. 12',              msg: 'Простой экскаватора 2 ч. — ремонт.',       ok: false },
                { time: '12:40', loc: 'Промпарк Алматы-Запад',       msg: 'Сдан этап «фундаменты» — акт КС-2.',        ok: true  },
              ].map((e, i) => (
                <div key={i}
                  className="flex items-start gap-3 rounded-lg border bg-card/40 px-3 py-2 text-xs">
                  {e.ok
                    ? <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: accentGreen }} />
                    : <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: accentWarn }} />
                  }
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold mr-2 text-foreground/80">{e.time}</span>
                    <span className="text-muted-foreground">{e.loc}</span>
                    <p className="mt-0.5 text-muted-foreground leading-snug">{e.msg}</p>
                  </div>
                  <Clock className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ── Right: AI assistant column ── */}
        <div className="hidden lg:flex flex-col w-80 xl:w-96 shrink-0 border-l sticky top-0 h-screen p-4">
          <AiAssistant
            messages={messages}
            question={question}
            sources={sources}
            scenarios={[]}
            selectedScenarioId=""
            isChatLoading={isChatLoading}
            isRunning={false}
            runStatus=""
            chatError={chatError}
            voiceLang={voiceLang}
            onVoiceLangChange={setVoiceLang}
            onQuestionChange={setQuestion}
            onSourceChange={(key, val) => setSources((prev) => ({ ...prev, [key]: val }))}
            onScenarioChange={() => {}}
            onAsk={handleAsk}
            onClear={() => { setMessages([]); setChatError('') }}
            onRunScenario={() => {}}
            t={tAi}
            animDelay={500}
            vertical
          />
        </div>

      </div>
    </div>
  )
}

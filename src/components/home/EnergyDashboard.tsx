import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '@/hooks/useTheme'
import { useCompanyProfile } from '@/context/CompanyProfileContext'
import { getAuthHeader } from '@/lib/auth'
import { KpiCard } from './KpiCard'
import { BackgroundEffects } from './BackgroundEffects'
import { StatusBar } from './StatusBar'
import { AiAssistant } from './AiAssistant'
import { Zap, Activity, Leaf, Cpu, FileText, AlertTriangle, ChevronRight, TrendingUp, ArrowLeftRight, Shield, Radio, CheckCircle2, Clock, CalendarClock } from 'lucide-react'

type VoiceLang = 'ru' | 'en' | 'kk'

interface ChatMessage { role: 'user' | 'assistant'; text: string }

interface Sources {
  masterData: boolean; geology: boolean; scenarios: boolean
  annualPlans: boolean; results: boolean; crisis: boolean; entities: boolean
}

const ENERGY_FALLBACKS: Record<VoiceLang, string> = {
  ru: 'Здравствуйте! Я AIgul — ваш AI-оператор по ЕЭС Казахстана. ' +
    'Установленная мощность электростанций РК — 26 807 МВт, располагаемая — 22 844 МВт. ' +
    'В системе 248 электростанций, 231 подстанция НЭС на балансе KEGOC. ' +
    'Потери в НЭС — 9,18%, доля ВИЭ — 13,4%. Спрашивайте о генерации, передаче, балансирующем рынке или прогнозах нагрузки.',
  en: 'Hello! I am AIgul — your AI operator for the Unified Energy System of Kazakhstan. ' +
    'Total installed capacity is 26,807 MW, available — 22,844 MW. ' +
    'The system has 248 power plants and 231 NES substations managed by KEGOC. ' +
    'NES losses are 9.18%, RES share — 13.4%. Ask me about generation, transmission, balancing market or load forecasts.',
  kk: 'Сәлеметсіз бе! Мен AIgul — Қазақстанның Біріңғай энергетикалық жүйесі бойынша AI-операторыңызбын. ' +
    'Электр станцияларының жалпы қуаты — 26 807 МВт, қолжетімді — 22 844 МВт. ' +
    'Жүйеде 248 электр станция, KEGOC балансында 231 қосалқы станция бар. ' +
    'ҰЭЖ шығындары — 9,18%, ЖЭК үлесі — 13,4%. Генерация, беру, теңестіру нарығы немесе жүктеме болжамы туралы сұраңыз.',
}

const KK_MARKERS = /[әғқңөұүһі]|салем|сәлем|қалай|рақмет/i
const EN_MARKERS = /^[a-z0-9\s.,!?'"()\-/:;@#$%&*+=]+$/i

function detectLang(text: string): VoiceLang {
  if (KK_MARKERS.test(text.trim())) return 'kk'
  if (EN_MARKERS.test(text.trim())) return 'en'
  return 'ru'
}

const LANG_PREFIX: Record<VoiceLang, string> = {
  ru: '[Ответь на русском. Контекст: ЕЭС Казахстана, KEGOC, Smart Grid, НЭС.]\n',
  en: '[Respond in English. Context: Kazakhstan Unified Energy System, KEGOC, Smart Grid.]\n',
  kk: '[Тек қазақ тілінде жауап бер. Контекст: ҚР БЭЖ, KEGOC, Smart Grid.]\n',
}

// 7-суточная динамика (данные ЕЭС РК)
const TRANSMISSION_SPARK = [28140, 28380, 27950, 28510, 28670, 28220, 28412]
const LOSSES_SPARK        = [9.8, 9.6, 9.5, 9.4, 9.3, 9.2, 9.18]
const RENEWABLE_SPARK     = [11.2, 11.8, 12.1, 12.4, 12.9, 13.1, 13.4]
const AVAILABILITY_SPARK  = [93.1, 93.6, 94.0, 94.3, 94.5, 94.7, 94.8]

// Секторальный статус
const SECTORS = [
  { label: 'Производство',   value: '248 электростанций',    sub: '26 807 МВт установл. · 22 844 МВт располаг.' },
  { label: 'Передача (НЭС)', value: '231 подстанция',        sub: '28 400 км ЛЭП 220–1150 кВ' },
  { label: 'Снабжение',      value: '21 ЭПО',                sub: 'с лицензией на энергоснабжение с 2025 г.' },
  { label: 'Рынок',          value: 'Оптовый + БРЭ',         sub: 'Единый закупщик: РФЦ ВИЭ · Оператор БРЭ: КОРЭМ' },
]

export function EnergyDashboard() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const { profile } = useCompanyProfile()
  const isDark = theme === 'dark'

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [question, setQuestion] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [chatError, setChatError] = useState('')
  const [voiceLang, setVoiceLang] = useState<VoiceLang>('ru')
  const [sources, setSources] = useState<Sources>({
    masterData: true, geology: true, scenarios: true,
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
        setMessages((prev) => [...prev, { role: 'assistant', text: answer?.trim() || ENERGY_FALLBACKS[lang] }])
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', text: ENERGY_FALLBACKS[lang] }])
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: ENERGY_FALLBACKS[lang] }])
    }
    setIsChatLoading(false)
  }

  const t = (key: string) => {
    const map: Record<string, string> = {
      aiAssistantName: 'AIgul — AI Оператор ЕЭС',
      aiAssistantSubtitle: 'Интеллектуальный помощник KEGOC Smart Grid',
      chatUser: 'Вы',
      chatPlaceholder: 'Спросите AIgul про ЕЭС Казахстана…',
      inputHint: 'Введите вопрос и нажмите Enter',
      ragSources: 'Источники данных',
      sourcesMasterData: 'НЭС / Подстанции',
      sourcesGeology: 'Генерация',
      sourcesScenarios: 'Балансирующий рынок',
      sourcesAnnualPlans: 'Планы KEGOC',
      sourcesResults: 'Телеметрия',
      sourcesCrisis: 'Аварии / Нарушения',
      sourcesEntities: 'Субъекты рынка',
      srcMasterData: 'НЭС / Подстанции',
      srcGeology: 'Генерация',
      srcScenarios: 'Бал. рынок',
      srcAnnualPlans: 'Планы',
      srcResults: 'Телеметрия',
      srcCrisis: 'Аварии',
      srcEntities: 'Субъекты',
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

  const quickActions = [
    {
      label: 'Открыть суточную справку',
      icon: FileText,
      route: '/briefing',
      color: isDark ? '#5CE0D6' : '#0D9488',
    },
    {
      label: 'Проверить аномалии',
      icon: AlertTriangle,
      route: '/predictive',
      color: isDark ? '#FACC15' : '#CA8A04',
    },
    {
      label: 'Статус ВИЭ и ПУЭ',
      icon: Leaf,
      route: '/green-grid',
      color: isDark ? '#4ADE80' : '#16A34A',
    },
  ]

  return (
    <div className="relative flex flex-col min-h-full">
      <BackgroundEffects />
      <StatusBar />

      <div className="relative z-10 flex-1 flex gap-0 min-h-0">

        {/* ── Left: main dashboard content ── */}
        <div className="flex-1 min-w-0 p-6 space-y-6 overflow-y-auto">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.25em] mb-1"
                style={{ color: isDark ? '#5CE0D6' : '#0D9488' }}
              >
                Системный оператор · {profile.companyName || 'KEGOC'}
              </p>
              <h1
                className="text-2xl font-bold uppercase tracking-[0.12em] leading-tight"
                style={{
                  background: isDark
                    ? 'linear-gradient(90deg, #FFFFFF 10%, #5CE0D6 45%, #FACC15 100%)'
                    : 'linear-gradient(90deg, #0D9488 10%, #0D9488 45%, #CA8A04 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                IE:AION
              </h1>
              <p className="text-xs text-muted-foreground mt-1" style={{ letterSpacing: '0.04em' }}>
                Единая энергетическая система Республики Казахстан
              </p>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard
              title="Передача по НЭС"
              value={28412}
              subtitle="ГВт·ч · за 7 суток · план 28 100"
              icon={<Zap className="h-3.5 w-3.5" />}
              color="cyan"
              sparkData={TRANSMISSION_SPARK}
              animDelay={0}
            />
            <KpiCard
              title="Потери в НЭС"
              value={9.18}
              subtitle="% · норматив ≤ 10.5% · в норме"
              icon={<Activity className="h-3.5 w-3.5" />}
              color="amber"
              sparkData={LOSSES_SPARK}
              animDelay={100}
              decimals={2}
            />
            <KpiCard
              title="Доля ВИЭ"
              value={13.4}
              subtitle="% в выработке · цель 15% к 2026"
              icon={<Leaf className="h-3.5 w-3.5" />}
              color="green"
              sparkData={RENEWABLE_SPARK}
              animDelay={200}
              decimals={1}
            />
            <KpiCard
              title="Готовность оборуд."
              value={94.8}
              subtitle="% · 231 подстанция НЭС"
              icon={<Cpu className="h-3.5 w-3.5" />}
              color="blue"
              sparkData={AVAILABILITY_SPARK}
              animDelay={300}
              decimals={1}
            />
          </div>

          {/* Sectors strip */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {SECTORS.map((s) => (
              <div
                key={s.label}
                className="rounded-xl border px-4 py-3"
                style={{
                  borderColor: isDark ? 'rgba(92,224,214,0.12)' : 'rgba(13,148,136,0.15)',
                  background: isDark ? 'rgba(92,224,214,0.04)' : 'rgba(13,148,136,0.03)',
                }}
              >
                <p
                  className="text-[9px] font-semibold uppercase tracking-widest mb-1"
                  style={{ color: isDark ? 'rgba(92,224,214,0.6)' : '#0D9488' }}
                >
                  {s.label}
                </p>
                <p className="text-sm font-bold leading-tight">{s.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div>
            <p
              className="text-[10px] font-semibold uppercase tracking-widest mb-3"
              style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}
            >
              Быстрые действия
            </p>
            <div className="flex flex-wrap gap-3">
              {quickActions.map((action) => (
                <button
                  key={action.route}
                  onClick={() => navigate(action.route)}
                  className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all duration-200 hover:scale-[1.02]"
                  style={{
                    borderColor: `${action.color}40`,
                    background: isDark ? `${action.color}10` : `${action.color}08`,
                    color: action.color,
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLElement).style.borderColor = `${action.color}80`
                    ;(e.currentTarget as HTMLElement).style.background = isDark ? `${action.color}18` : `${action.color}14`
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.borderColor = `${action.color}40`
                    ;(e.currentTarget as HTMLElement).style.background = isDark ? `${action.color}10` : `${action.color}08`
                  }}
                >
                  <action.icon className="h-4 w-4" />
                  <span>{action.label}</span>
                  <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                </button>
              ))}
            </div>
          </div>

          {/* Smart Grid program */}
          <div>
            <p
              className="text-[10px] font-semibold uppercase tracking-widest mb-3"
              style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}
            >
              Программа Smart Grid · KEGOC
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {([
                { label: 'Предиктивная аналитика',      desc: 'Прогноз генерации, потребления и отказов оборудования', status: 'active' as const,   icon: TrendingUp, route: '/predictive' },
                { label: 'Мониторинг потерь',            desc: 'Прогноз технологических потерь при передаче по НЭС',    status: 'active' as const,   icon: Activity,   route: '/briefing'   },
                { label: 'Green Grid / ВИЭ',             desc: 'Интеграция ВИЭ и систем хранения электроэнергии',       status: 'active' as const,   icon: Leaf,        route: '/green-grid' },
                { label: 'Цифровые подстанции',          desc: 'Digital Twin подстанций с элементами ИИ',               status: 'dev' as const,      icon: Cpu,         route: undefined     },
                { label: 'Кибербезопасность',            desc: 'Claroty-интеграция для защиты ОТ/IoT',                  status: 'planned' as const,  icon: Shield,      route: undefined     },
              ]).map((m) => {
                const statusMap = {
                  active:  { label: 'Активно',       color: '#22c55e', Icon: CheckCircle2, pct: 100 },
                  dev:     { label: 'В разработке',  color: '#f59e0b', Icon: Clock,         pct: 45  },
                  planned: { label: 'Планируется',   color: '#6b7280', Icon: CalendarClock,  pct: 0   },
                }
                const s = statusMap[m.status]
                return (
                  <button
                    key={m.label}
                    onClick={() => m.route && navigate(m.route)}
                    disabled={!m.route}
                    className="rounded-xl border p-4 text-left transition-all hover:scale-[1.01] disabled:opacity-70 disabled:cursor-default"
                    style={{
                      borderColor: `${s.color}30`,
                      background: isDark ? `${s.color}08` : `${s.color}05`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <m.icon className="h-4 w-4" style={{ color: s.color }} />
                      <span className="text-xs font-bold leading-tight">{m.label}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight mb-3">{m.desc}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${s.pct}%`, background: s.color }} />
                      </div>
                      <div className="flex items-center gap-1">
                        <s.Icon className="h-3 w-3" style={{ color: s.color }} />
                        <span className="text-[9px] font-semibold" style={{ color: s.color }}>{s.label}</span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Market + infra strip */}
          <div
            className="rounded-xl border px-5 py-3 flex flex-wrap gap-6 text-xs"
            style={{
              borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
              background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
            }}
          >
            {[
              { label: 'Установленная мощность',   value: '26 807 МВт' },
              { label: 'Располагаемая мощность',   value: '22 844 МВт' },
              { label: 'Электростанций в ЕЭС',     value: '248'        },
              { label: 'Отклонение частоты',        value: '±0.04 Гц'  },
              { label: 'Сальдо экспорт/импорт',    value: '+1 240 МВт·ч' },
              { label: 'Интеграции активны',        value: 'EMS, АСКУЭ, КОРЭМ, РФЦ ВИЭ' },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-muted-foreground">{item.label}</p>
                <p className="font-semibold text-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: AIgul assistant column ── */}
        <div
          className="hidden lg:flex flex-col w-80 xl:w-96 shrink-0 border-l sticky top-0 h-screen p-4"
          style={{
            borderColor: isDark ? 'rgba(92,224,214,0.10)' : 'rgba(13,148,136,0.12)',
            background: isDark ? 'rgba(10,22,40,0.55)' : 'rgba(245,252,250,0.65)',
            backdropFilter: 'blur(12px)',
          }}
        >
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
            onClear={() => setMessages([])}
            onRunScenario={() => {}}
            t={t}
            animDelay={500}
            vertical
          />
        </div>

      </div>
    </div>
  )
}

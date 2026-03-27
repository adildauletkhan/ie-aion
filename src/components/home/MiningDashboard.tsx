import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '@/hooks/useTheme'
import { useCompanyProfile } from '@/context/CompanyProfileContext'
import { getAuthHeader } from '@/lib/auth'
import { KpiCard } from './KpiCard'
import { BackgroundEffects } from './BackgroundEffects'
import { StatusBar } from './StatusBar'
import { AiAssistant } from './AiAssistant'
import {
  BarChart3, AlertTriangle, HardHat, FileText,
  ChevronRight, Pickaxe, Truck, Factory, Zap,
  TrendingUp, TrendingDown, Clock, CheckCircle2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type VoiceLang = 'ru' | 'en' | 'kk'
interface ChatMessage { role: 'user' | 'assistant'; text: string }
interface Sources {
  masterData: boolean; geology: boolean; scenarios: boolean
  annualPlans: boolean; results: boolean; crisis: boolean; entities: boolean
}

const MINING_FALLBACK = 'Здравствуйте! Я AI-ассистент горно-металлургического комплекса. ' +
  'КазГМК: добыча руды 15.64 млн т/год, производство Cu катодной 455 тыс. т/год. ' +
  'LTIFR 0.12, LME Cu $9 254/т. Спрашивайте про добычу, обогащение, технику или безопасность.'

const LANG_PREFIX: Record<VoiceLang, string> = {
  ru: '[Отвечай на русском. Контекст: горнодобыча, ГМК Казахстан, медь, ОФ, безопасность.]\n',
  en: '[Respond in English. Context: Kazakhstan mining, copper production, safety.]\n',
  kk: '[Тек қазақ тілінде. Контекст: тау-кен өндірісі, Қазақстан ГМК, мыс.]\n',
}

const KK_MARKERS = /[әғқңөұүһі]|салем|сәлем|қалай|рақмет/i
const EN_MARKERS = /^[a-z0-9\s.,!?'"()\-/:;@#$%&*+=]+$/i

function detectLang(text: string): VoiceLang {
  if (KK_MARKERS.test(text.trim())) return 'kk'
  if (EN_MARKERS.test(text.trim())) return 'en'
  return 'ru'
}

/* ── Spark data — 7-day rolling ───────────────────────────────────────────── */
const ORE_SPARK       = [41200, 42100, 41850, 43200, 42500, 43800, 42850]
const GRADE_SPARK     = [0.80,  0.81,  0.79,  0.83,  0.82,  0.84,  0.82 ]
const CATHODE_SPARK   = [1210,  1235,  1220,  1255,  1240,  1268,  1247 ]
const FLEET_SPARK     = [86.2,  87.1,  85.9,  88.3,  87.6,  88.9,  87.4 ]

/* ── Operation sectors ────────────────────────────────────────────────────── */
const SECTORS = [
  {
    label:  'Жезказганский рудник',
    value:  'Медь · 3 горизонта',
    sub:    '28 450 т/сут руды · 184 ед. техники',
    icon:   Pickaxe,
    color:  '#f59e0b',
    status: 'online',
  },
  {
    label:  'Соколовский ГОК',
    value:  'Железная руда',
    sub:    '56 100 т/сут · 97.2% ОФ',
    icon:   Factory,
    color:  '#6366f1',
    status: 'online',
  },
  {
    label:  'ОФ «Балхашская»',
    value:  'Обогащение · 91.4%',
    sub:    'Концентрат Cu 28.6% · 1 247 т/сут',
    icon:   Zap,
    color:  '#0d9488',
    status: 'warn',
  },
  {
    label:  'КЭЗ «Балхаш»',
    value:  'Катодная медь',
    sub:    '1 247 т/сут · 99.97% чистота',
    icon:   Truck,
    color:  '#10b981',
    status: 'online',
  },
]

/* ── Program cards ────────────────────────────────────────────────────────── */
const PROGRAM_CARDS = [
  {
    title: 'Программа технического перевооружения 2024–2028',
    value: '312 млрд ₸',
    sub:   'Освоено 87.6% за 2024 г.',
    icon:  BarChart3,
    color: '#6366f1',
    route: '/mining-production',
  },
  {
    title: 'Smart Mine: цифровизация карьеров и подземных рудников',
    value: '3 объекта',
    sub:   'Пилот DISPATCH · Leica · OSIsoft PI',
    icon:  Factory,
    color: '#0d9488',
    route: '/digital-twin',
  },
  {
    title: 'ESG / промышленная безопасность',
    value: 'LTIFR 0.12',
    sub:   'Целевой показатель < 0.15 · 312 суток без ЧП',
    icon:  HardHat,
    color: '#10b981',
    route: '/mining-safety',
  },
]

/* ── Footer KPIs ─────────────────────────────────────────────────────────── */
const FOOTER_STATS = [
  { label: 'Активных горизонтов',  value: '12',     icon: Pickaxe, color: '#f59e0b' },
  { label: 'Техника в работе',     value: '184/210', icon: Truck,   color: '#6366f1' },
  { label: 'LTIFR',               value: '0.12',    icon: HardHat, color: '#10b981' },
  { label: 'LME Cu ($/т)',         value: '9 254',   icon: TrendingUp, color: '#0d9488' },
]

/* ── Component ────────────────────────────────────────────────────────────── */

export function MiningDashboard() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const { profile } = useCompanyProfile()
  const isDark = theme === 'dark'

  /* ── AI Assistant state (mirrors EnergyDashboard pattern) ── */
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
        setMessages((prev) => [...prev, { role: 'assistant', text: answer?.trim() || MINING_FALLBACK }])
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', text: MINING_FALLBACK }])
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: MINING_FALLBACK }])
    }
    setIsChatLoading(false)
  }

  const tAi = (key: string) => {
    const map: Record<string, string> = {
      aiAssistantName: 'AIMine — AI Ассистент ГМК',
      aiAssistantSubtitle: 'Интеллектуальный помощник КазГМК · Добыча и переработка',
      chatUser: 'Вы',
      chatPlaceholder: 'Спросите про добычу, технику или безопасность…',
      inputHint: 'Введите вопрос и нажмите Enter',
      ragSources: 'Источники данных',
      sourcesMasterData: 'Рудники / ОФ',
      sourcesGeology: 'Геология',
      sourcesScenarios: 'Сценарии',
      sourcesAnnualPlans: 'Производственная программа',
      sourcesResults: 'Телеметрия / DISPATCH',
      sourcesCrisis: 'Инциденты / ПБ',
      sourcesEntities: 'Контрагенты',
      srcMasterData: 'Рудники',
      srcGeology: 'Геология',
      srcScenarios: 'Сценарии',
      srcAnnualPlans: 'Программа',
      srcResults: 'Телеметрия',
      srcCrisis: 'Инциденты',
      srcEntities: 'Контрагенты',
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

  const accent      = isDark ? '#FACC15' : '#CA8A04'
  const accentGreen = isDark ? '#4ADE80' : '#16A34A'

  const quickActions = [
    {
      label: 'Производственный отчёт',
      icon:  FileText,
      route: '/mining-production',
      color: isDark ? '#5CE0D6' : '#0D9488',
    },
    {
      label: 'Промышленная безопасность',
      icon:  HardHat,
      route: '/mining-safety',
      color: isDark ? '#4ADE80' : '#16A34A',
    },
    {
      label: 'Цифровой двойник рудника',
      icon:  Factory,
      route: '/digital-twin',
      color: isDark ? '#FACC15' : '#CA8A04',
    },
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
                Горно-металлургический комплекс · {profile.companyName || 'КазГМК'}
              </p>
              <h1
                className="text-2xl font-bold uppercase tracking-[0.12em] leading-tight"
                style={{
                  background: isDark
                    ? 'linear-gradient(90deg, #FFFFFF 10%, #FACC15 45%, #F59E0B 100%)'
                    : 'linear-gradient(90deg, #CA8A04 10%, #0D9488 50%, #16A34A 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                IE:AION
              </h1>
              <p className="text-xs text-muted-foreground mt-1" style={{ letterSpacing: '0.04em' }}>
                Производственный мониторинг · Добыча и переработка полезных ископаемых РК
              </p>
            </div>
            <div className="hidden md:flex flex-col items-end gap-1.5">
              <Badge
                className="text-[9px] font-semibold px-2 py-0.5"
                style={{ background: isDark ? '#FACC1520' : '#CA8A0415', color: accent, border: `1px solid ${accent}40` }}
              >
                <Pickaxe className="h-3 w-3 mr-1" />ГОРНОДОБЫЧА
              </Badge>
              <Badge
                className="text-[9px] font-semibold px-2 py-0.5"
                style={{ background: isDark ? '#4ADE8020' : '#16A34A10', color: accentGreen, border: `1px solid ${accentGreen}40` }}
              >
                <HardHat className="h-3 w-3 mr-1" />312 суток без ЧП
              </Badge>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard
              title="Добыча руды"
              value={42850}
              subtitle="т/сут · план 44 000 · −2.6%"
              icon={<Pickaxe className="h-3.5 w-3.5" />}
              color="amber"
              sparkData={ORE_SPARK}
            />
            <KpiCard
              title="Содержание Cu"
              value={0.82}
              subtitle="% в руде · план 0.85% · ↑ тренд"
              icon={<BarChart3 className="h-3.5 w-3.5" />}
              color="purple"
              sparkData={GRADE_SPARK}
              decimals={2}
              animDelay={120}
            />
            <KpiCard
              title="Cu катодная"
              value={1247}
              subtitle="т/сут · план 1 280 · −2.6%"
              icon={<Factory className="h-3.5 w-3.5" />}
              color="cyan"
              sparkData={CATHODE_SPARK}
              animDelay={240}
            />
            <KpiCard
              title="Готовность техники"
              value={87.4}
              subtitle="% · план 90% · 184 / 210 ед."
              icon={<Truck className="h-3.5 w-3.5" />}
              color="green"
              sparkData={FLEET_SPARK}
              decimals={1}
              animDelay={360}
            />
          </div>

          {/* Sector strip */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {SECTORS.map((s) => {
              const Icon = s.icon
              return (
                <div
                  key={s.label}
                  className="rounded-xl p-3 border transition-all hover:scale-[1.01]"
                  style={{
                    borderColor: `${s.color}22`,
                    background: isDark ? `${s.color}08` : `${s.color}05`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="rounded-md p-1.5" style={{ background: `${s.color}18` }}>
                      <Icon className="h-3.5 w-3.5" style={{ color: s.color }} />
                    </div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider truncate"
                      style={{ color: s.color }}>
                      {s.label}
                    </p>
                    <span
                      className="ml-auto h-1.5 w-1.5 rounded-full shrink-0"
                      style={{
                        background: s.status === 'online' ? accentGreen : '#FACC15',
                        boxShadow: s.status === 'online'
                          ? `0 0 5px ${accentGreen}80`
                          : '0 0 5px #FACC1580',
                      }}
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
                  className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all hover:scale-[1.02]"
                  style={{
                    borderColor: `${a.color}30`,
                    background: isDark ? `${a.color}0C` : `${a.color}08`,
                    color: a.color,
                  }}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {a.label}
                  <ChevronRight className="h-3 w-3 opacity-60" />
                </button>
              )
            })}
          </div>

          {/* Program cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {PROGRAM_CARDS.map((c) => {
              const Icon = c.icon
              return (
                <button
                  key={c.title}
                  onClick={() => navigate(c.route)}
                  className="text-left rounded-xl border p-4 transition-all hover:scale-[1.01] group"
                  style={{
                    borderColor: `${c.color}22`,
                    background: isDark ? `${c.color}08` : `${c.color}05`,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg p-2 mt-0.5" style={{ background: `${c.color}18` }}>
                      <Icon className="h-4 w-4" style={{ color: c.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground leading-snug mb-1">{c.title}</p>
                      <p className="text-base font-bold" style={{ color: c.color }}>{c.value}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{c.sub}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              )
            })}
          </div>

          {/* Footer stats */}
          <div
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border p-3"
            style={{
              background: isDark ? 'rgba(12,18,30,0.45)' : 'rgba(255,255,255,0.70)',
              borderColor: isDark ? 'rgba(250,204,21,0.10)' : 'rgba(202,138,4,0.12)',
            }}
          >
            {FOOTER_STATS.map((s) => {
              const Icon = s.icon
              return (
                <div key={s.label} className="flex items-center gap-2">
                  <div className="rounded-md p-1.5" style={{ background: `${s.color}18` }}>
                    <Icon className="h-3 w-3" style={{ color: s.color }} />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                    <p className="text-xs font-bold" style={{ color: s.color }}>{s.value}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Alert strip */}
          <div className="rounded-xl border p-3 flex items-start gap-3"
            style={{
              borderColor: '#FACC1525',
              background: isDark ? '#FACC1508' : '#FACC1504',
            }}>
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: '#FACC15' }} />
            <div>
              <p className="text-xs font-semibold" style={{ color: isDark ? '#FACC15' : '#CA8A04' }}>
                2 активных инцидента / нарушения
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Горизонт Г−340: плановое техобслуживание экскаватора ЭКГ-10 · ОФ: потери на 2-й секции флотации выше нормы
              </p>
            </div>
            <button
              onClick={() => navigate('/crisis-response')}
              className="ml-auto text-[10px] font-semibold whitespace-nowrap"
              style={{ color: isDark ? '#FACC15' : '#CA8A04' }}
            >
              Кризис-центр →
            </button>
          </div>

          {/* Recent incidents mini-table */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Оперативная сводка · {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
            </p>
            <div className="space-y-1.5">
              {[
                { time: '07:14', loc: 'Рудник Жезказган · Гор. Г−340',  msg: 'Плановое ТО ЭКГ-10. Замена ковша. ≈4 ч.',             ok: true  },
                { time: '09:42', loc: 'ОФ «Балхашская» · 2-я секция',   msg: 'Повышенные потери Cu в хвостах. Корректировка реагентов.', ok: false },
                { time: '11:30', loc: 'КЭЗ «Балхаш» · Электролизный цех', msg: 'Плановая замена катодных основ. Выпуск не остановлен.', ok: true  },
              ].map((e, i) => (
                <div key={i}
                  className="flex items-start gap-3 rounded-lg border px-3 py-2 text-xs"
                  style={{
                    borderColor: e.ok ? `${accentGreen}18` : '#FACC1525',
                    background: e.ok
                      ? (isDark ? `${accentGreen}06` : `${accentGreen}04`)
                      : (isDark ? '#FACC1508' : '#FACC1504'),
                  }}>
                  {e.ok
                    ? <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: accentGreen }} />
                    : <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: '#FACC15' }} />
                  }
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold mr-2" style={{ color: e.ok ? accentGreen : (isDark ? '#FACC15' : '#CA8A04') }}>
                      {e.time}
                    </span>
                    <span className="text-muted-foreground">{e.loc}</span>
                    <p className="mt-0.5 text-muted-foreground leading-snug">{e.msg}</p>
                  </div>
                  <Clock className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                </div>
              ))}
            </div>
          </div>

          {/* Safety ribbon */}
          <div
            className="rounded-xl border px-4 py-3 flex items-center gap-4"
            style={{
              borderColor: `${accentGreen}25`,
              background: isDark ? `${accentGreen}07` : `${accentGreen}05`,
            }}
          >
            <HardHat className="h-5 w-5 shrink-0" style={{ color: accentGreen }} />
            <div className="flex-1">
              <p className="text-xs font-semibold" style={{ color: accentGreen }}>
                Промышленная безопасность · LTIFR 0.12 · 312 суток без НС с ВПТ
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Целевой показатель LTIFR &lt; 0.15 · Программа «Нулевой травматизм» — выполняется
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <TrendingDown className="h-4 w-4" style={{ color: accentGreen }} />
              <span className="text-[10px] font-bold" style={{ color: accentGreen }}>−18% vs 2023</span>
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

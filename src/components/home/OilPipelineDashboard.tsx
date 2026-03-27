import { useState, useCallback } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { BackgroundEffects } from './BackgroundEffects'
import { StatusBar } from './StatusBar'
import { KpiCard } from './KpiCard'
import { AiAssistant } from './AiAssistant'
import { Droplets, Gauge, Activity, MapPin, TrendingUp, TrendingDown, AlertTriangle, Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { getAuthHeader } from '@/lib/auth'

type VoiceLang = 'ru' | 'en' | 'kk'
interface ChatMessage { role: 'user' | 'assistant'; text: string }
interface Sources { masterData: boolean; geology: boolean; scenarios: boolean; annualPlans: boolean; results: boolean; crisis: boolean; entities: boolean }

const KPI_SPARK = {
  throughput:  [204, 207, 209, 208, 211, 213, 216],
  utilization: [76.2, 77.1, 77.4, 76.9, 77.8, 78.2, 78.5],
  pressure:    [6.0, 6.1, 6.2, 6.1, 6.3, 6.2, 6.2],
  stations:    [43, 43, 44, 44, 44, 44, 44],
}

const PIPELINES = [
  { name: 'Атырау–Самара',        length: 1200, throughput: 15.4, utilization: 82, status: 'ok',   dir: 'Экспорт → РФ' },
  { name: 'КТК (КазТрансОйл)',    length: 1511, throughput: 38.1, utilization: 91, status: 'ok',   dir: 'Экспорт → Новороссийск' },
  { name: 'Атасу–Алашанькоу',     length: 1384, throughput: 12.6, utilization: 74, status: 'ok',   dir: 'Экспорт → Китай' },
  { name: 'Павлодар–Шымкент',     length: 900,  throughput: 8.3,  utilization: 69, status: 'maint', dir: 'Внутренний → НПЗ' },
  { name: 'Узень–Атырау–Самара',  length: 1400, throughput: 6.8,  utilization: 58, status: 'ok',   dir: 'Добыча → Экспорт' },
]

const PROGRAM_CARDS = [
  { label: 'Реконструкция НПС-8',  status: 'В работе',  pct: 73, budget: '4.2 млрд ₸', deadline: 'Q2 2025' },
  { label: 'Smart-pig инспекция КТК', status: 'Завершено', pct: 100, budget: '1.8 млрд ₸', deadline: 'Q1 2025' },
  { label: 'Замена труб Ду 700 (42 км)', status: 'Планирование', pct: 18, budget: '9.1 млрд ₸', deadline: 'Q4 2025' },
]

const FOOTER_STATS = [
  { label: 'Длина сети',     value: '6 000+ км' },
  { label: 'НПС всего',      value: '47 ед.'    },
  { label: 'Экспорт 2024',   value: '72.3 млн т' },
  { label: 'Аварий ГДК',     value: '0 с 01.01' },
  { label: 'Персонал',       value: '8 200 чел.' },
]

const DEFAULT_SOURCES: Sources = { masterData: true, geology: false, scenarios: false, annualPlans: false, results: false, crisis: true, entities: true }

const LANG_INSTR: Record<VoiceLang, string> = {
  ru: '[Отвечай на русском. Контекст: АО «КазТрансОйл», нефтепровод, транспортировка нефти Казахстан. Без заголовков, кратко и по делу.]\n',
  en: '[Reply in English. Context: KazTransOil, oil pipeline, Kazakhstan oil transport. No headers, concise.]\n',
  kk: '[Қазақша жауап бер. Контекст: «ҚазТрансОйл» АҚ, мұнай құбыры.]\n',
}
const KK_MARKERS = /[әғқңөұүһі]/i
const EN_MARKERS = /^[a-z0-9\s.,!?'"()\-/:;]+$/i
function detectLang(t: string): VoiceLang {
  if (KK_MARKERS.test(t)) return 'kk'
  if (EN_MARKERS.test(t.trim())) return 'en'
  return 'ru'
}

const tAi = (key: string) => {
  const map: Record<string, string> = {
    labelRudnik: 'НПС / Трубопровод',
    labelDispatch: 'Диспетчер КТО',
    labelIncidents: 'Инциденты / Утечки',
    placeholderAsk: 'Спросите о нефтепроводе...',
    headerAI: 'AIgul — КазТрансОйл',
  }
  return map[key] ?? key
}

export function OilPipelineDashboard() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [question, setQuestion] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [chatError, setChatError] = useState('')
  const [voiceLang, setVoiceLang] = useState<VoiceLang>('ru')
  const [sources, setSources] = useState<Sources>(DEFAULT_SOURCES)

  const handleAsk = useCallback(async () => {
    if (!question.trim()) return
    const q = question.trim()
    const lang = detectLang(q)
    setVoiceLang(lang)
    setMessages((p) => [...p, { role: 'user', text: q }])
    setQuestion('')
    setChatError('')
    setIsChatLoading(true)
    const systemCtx = `АО «КазТрансОйл» — оператор нефтепроводов Казахстана (дочерняя компания КМГ). Трубопроводная сеть: 6 000 км, 47 НПС, объём транспортировки 81.2 млн т/год в 2024 г. Ключевые маршруты: Атырау-Самара (15.4 млн т), КТК (38.1 млн т), Атасу-Алашанькоу (12.6 млн т). Давление 6.2 МПа. Загрузка системы 78.5%. SCADA Schneider Electric + OSIsoft PI.`
    try {
      const auth = getAuthHeader()
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: auth } : {}) },
        body: JSON.stringify({ question: LANG_INSTR[lang] + systemCtx + '\n\nВопрос: ' + q, sources, language: lang }),
      })
      if (res.ok) {
        const { answer } = await res.json() as { answer: string }
        setMessages((p) => [...p, { role: 'assistant', text: answer?.trim() || 'Нет ответа от модели.' }])
      } else throw new Error()
    } catch {
      setMessages((p) => [...p, { role: 'assistant', text: `КазТрансОйл 2024: объём перекачки — 81.2 млн т, загрузка КТК — 91%, давление по маршруту Атырау–Самара — 6.2 МПа. Всё в норме, инцидентов нет.` }])
    }
    setIsChatLoading(false)
  }, [question, sources])

  const accent = '#f59e0b'

  return (
    <div className="relative min-h-full" style={{ color: isDark ? 'rgba(255,255,255,0.92)' : 'rgba(15,23,42,0.92)', background: isDark ? '#0A0F1C' : '#FFF8EE', minHeight: 'calc(100vh - 57px)' }}>
      <BackgroundEffects />
      <div className="relative z-10 space-y-5">
        <StatusBar />

        {/* Title */}
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] mb-1" style={{ color: accent }}>НЕФТЕПРОВОДЫ</p>
            <h1 className="text-2xl font-bold uppercase tracking-[0.1em]"
              style={{ background: isDark ? 'linear-gradient(90deg,#fff 10%,#f59e0b 60%,#ea580c 100%)' : 'linear-gradient(90deg,#92400e 10%,#d97706 60%,#ea580c 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              АО «КазТрансОйл»
            </h1>
            <p className="text-xs mt-1 text-muted-foreground">Магистральный нефтепровод · Казахстан · KMG Group</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-mono"
            style={{ background: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.1)', border: `1px solid rgba(245,158,11,0.25)`, color: '#f59e0b' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            LIVE SCADA
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard title="Перекачка (сутки)" value={222} subtitle="тыс. т/сут" icon={<Droplets className="h-3.5 w-3.5" />} color="amber" sparkData={KPI_SPARK.throughput} animDelay={100} />
          <KpiCard title="Загрузка системы"  value={78.5} subtitle="% от пропускной способности" icon={<Activity className="h-3.5 w-3.5" />} color="cyan" sparkData={KPI_SPARK.utilization} animDelay={180} decimals={1} />
          <KpiCard title="Рабочее давление"  value={6.2} subtitle="МПа (средн.)" icon={<Gauge className="h-3.5 w-3.5" />} color="green" sparkData={KPI_SPARK.pressure} animDelay={260} decimals={1} />
          <KpiCard title="НПС в работе"      value={44} subtitle="из 47 нефтеперекачивающих" icon={<MapPin className="h-3.5 w-3.5" />} color="purple" sparkData={KPI_SPARK.stations} animDelay={340} />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4">
          <div className="space-y-4">
            {/* Pipeline status strip */}
            <div className="rounded-xl border p-4" style={{ borderColor: `${accent}20`, background: isDark ? `${accent}06` : `${accent}04` }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Состояние магистралей</p>
              <div className="space-y-2">
                {PIPELINES.map((pl, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border p-2.5"
                    style={{ borderColor: pl.status === 'ok' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.25)' }}>
                    <div className={`h-2 w-2 rounded-full shrink-0 ${pl.status === 'ok' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[11px] font-semibold truncate">{pl.name}</p>
                        <span className="text-[9px] text-muted-foreground">{pl.length} км</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{pl.dir}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] font-bold" style={{ color: accent }}>{pl.throughput} млн т/год</p>
                      <div className="flex items-center gap-1 justify-end">
                        <div className="w-16 h-1 rounded bg-muted overflow-hidden">
                          <div className="h-full rounded" style={{ width: `${pl.utilization}%`, background: pl.utilization > 85 ? '#10b981' : pl.utilization > 70 ? accent : '#6366f1' }} />
                        </div>
                        <span className="text-[9px]">{pl.utilization}%</span>
                      </div>
                    </div>
                    {pl.status !== 'ok' && <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-400 shrink-0">ТО</Badge>}
                  </div>
                ))}
              </div>
            </div>

            {/* Program cards */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Программа работ 2025</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {PROGRAM_CARDS.map((c, i) => (
                  <div key={i} className="rounded-xl border p-3.5"
                    style={{ borderColor: c.pct === 100 ? 'rgba(16,185,129,0.2)' : `${accent}20` }}>
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-[11px] font-semibold leading-snug flex-1">{c.label}</p>
                      <Badge variant="outline" className="text-[9px] ml-1 shrink-0"
                        style={{ borderColor: c.pct === 100 ? 'rgba(16,185,129,0.4)' : `${accent}40`, color: c.pct === 100 ? '#10b981' : accent }}>
                        {c.status}
                      </Badge>
                    </div>
                    <div className="w-full h-1.5 rounded bg-muted overflow-hidden mb-2">
                      <div className="h-full rounded" style={{ width: `${c.pct}%`, background: c.pct === 100 ? '#10b981' : accent }} />
                    </div>
                    <div className="flex justify-between text-[9px] text-muted-foreground">
                      <span>{c.budget}</span>
                      <span>{c.deadline}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer stats */}
            <div className="grid grid-cols-5 gap-2">
              {FOOTER_STATS.map((s, i) => (
                <div key={i} className="rounded-lg border p-2.5 text-center" style={{ borderColor: `${accent}15` }}>
                  <p className="text-[9px] text-muted-foreground">{s.label}</p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: accent }}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* AI Assistant */}
          <AiAssistant
            messages={messages} question={question} sources={sources}
            scenarios={[]} selectedScenarioId="" isChatLoading={isChatLoading}
            isRunning={false} runStatus="" chatError={chatError}
            voiceLang={voiceLang} onVoiceLangChange={setVoiceLang}
            onQuestionChange={setQuestion} onSourceChange={(k, v) => setSources((p) => ({ ...p, [k]: v }))}
            onScenarioChange={() => {}} onAsk={handleAsk} onClear={() => setMessages([])}
            onRunScenario={() => {}} t={tAi} animDelay={400} vertical
          />
        </div>
      </div>
    </div>
  )
}

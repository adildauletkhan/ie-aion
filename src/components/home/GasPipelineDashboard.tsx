import { useState, useCallback } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { BackgroundEffects } from './BackgroundEffects'
import { StatusBar } from './StatusBar'
import { KpiCard } from './KpiCard'
import { AiAssistant } from './AiAssistant'
import { Wind, Gauge, Activity, MapPin, Flame } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { getAuthHeader } from '@/lib/auth'

type VoiceLang = 'ru' | 'en' | 'kk'
interface ChatMessage { role: 'user' | 'assistant'; text: string }
interface Sources { masterData: boolean; geology: boolean; scenarios: boolean; annualPlans: boolean; results: boolean; crisis: boolean; entities: boolean }

const KPI_SPARK = {
  transit:    [43.1, 44.2, 44.8, 45.0, 45.1, 45.2, 45.2],
  pressure:   [5.1, 5.2, 5.3, 5.4, 5.4, 5.4, 5.4],
  cs_online:  [36, 37, 37, 38, 38, 38, 38],
  ch4:        [97.8, 97.9, 98.0, 98.1, 98.1, 98.1, 98.1],
}

const PIPELINES = [
  { name: 'Средняя Азия — Центр (CAC-1/2/3)', km: 3750, transit: 45.2, pct: 88, status: 'ok',    dir: 'Транзит: ТМ/УЗ → РФ' },
  { name: 'Казахстан–Китай (ббш-участок)',     km: 2175, transit: 18.3, pct: 71, status: 'ok',    dir: 'Поставки в Китай / внутр.' },
  { name: 'Бейнеу–Бозой–Шымкент',             km: 1475, transit: 8.1,  pct: 65, status: 'ok',    dir: 'Газификация Западный РК' },
  { name: 'Сарыарка',                          km: 1062, transit: 2.4,  pct: 48, status: 'maint', dir: 'Астана–Темиртау (строит.)' },
  { name: 'Domestic (распределение)',          km: 11500, transit: 12.1, pct: 55, status: 'ok',  dir: 'Коммунально-бытовые потр.' },
]

const CS_ZONES = [
  { zone: 'Западная зона', cs: 10, online: 10, avg_mpa: 5.6, fuel_pct: 3.2 },
  { zone: 'Центральная зона', cs: 14, online: 13, avg_mpa: 5.4, fuel_pct: 3.8 },
  { zone: 'Южная зона', cs: 12, online: 11, avg_mpa: 5.2, fuel_pct: 4.1 },
  { zone: 'Восточная зона', cs: 6,  online: 4,  avg_mpa: 4.8, fuel_pct: 5.2 },
]

const PROGRAM_CARDS = [
  { label: 'Строительство Сарыарка (этап 2)', status: 'В работе',   pct: 62, budget: '142 млрд ₸', deadline: 'Q3 2026' },
  { label: 'Реконструкция КС Кызылорда',      status: 'В работе',   pct: 84, budget: '18.3 млрд ₸', deadline: 'Q2 2025' },
  { label: 'Умный SCADA (ИЦА участок)',        status: 'Завершено',  pct: 100, budget: '7.6 млрд ₸', deadline: 'Q1 2025' },
]

const FOOTER_STATS = [
  { label: 'Сеть газопроводов', value: '19 700 км' },
  { label: 'КС всего',         value: '42 ед.'      },
  { label: 'Транзит 2024',     value: '45.2 млрд м³' },
  { label: 'Аварий МГ',        value: '0 с 01.01'   },
  { label: 'Персонал',         value: '11 400 чел.'  },
]

const DEFAULT_SOURCES: Sources = { masterData: true, geology: false, scenarios: false, annualPlans: false, results: false, crisis: true, entities: true }

const LANG_INSTR: Record<VoiceLang, string> = {
  ru: '[Отвечай на русском. Контекст: QazaqGas и ИЦА — газопроводы Казахстана, транзит, Бейнеу-Бозой-Шымкент, Сарыарка. Без заголовков.]\n',
  en: '[Reply in English. Context: QazaqGas, ИЦА, Kazakhstan gas pipelines. No headers.]\n',
  kk: '[Қазақша жауап бер. Контекст: QazaqGas, газ құбыры.]\n',
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
    labelRudnik:   'КС / Газопровод',
    labelDispatch: 'Диспетчер QazaqGas',
    labelIncidents: 'Инциденты / Аварии',
    placeholderAsk: 'Спросите о газопроводе...',
    headerAI: 'AIgul — QazaqGas',
  }
  return map[key] ?? key
}

export function GasPipelineDashboard() {
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
    const ctx = `QazaqGas + ИЦА (Интергаз Центральная Азия) — операторы газопроводов Казахстана. Сеть: 19 700 км, 42 КС, транзит газа 45.2 млрд м³/год в 2024. Ключевые: CAC (45.2 млрд м³), Казахстан-Китай (18.3 млрд м³), Бейнеу-Бозой-Шымкент (8.1 млрд м³). Давление 5.4 МПа. Строительство Сарыарка (62% готовность).`
    try {
      const auth = getAuthHeader()
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: auth } : {}) },
        body: JSON.stringify({ question: LANG_INSTR[lang] + ctx + '\n\nВопрос: ' + q, sources, language: lang }),
      })
      if (res.ok) {
        const { answer } = await res.json() as { answer: string }
        setMessages((p) => [...p, { role: 'assistant', text: answer?.trim() || 'Нет ответа.' }])
      } else throw new Error()
    } catch {
      setMessages((p) => [...p, { role: 'assistant', text: `QazaqGas 2024: транзит газа — 45.2 млрд м³, среднее давление — 5.4 МПа, КС в работе — 38 из 42. Строительство Сарыарка — 62% готовность.` }])
    }
    setIsChatLoading(false)
  }, [question, sources])

  const accent = '#0d9488'

  return (
    <div className="relative min-h-full" style={{ color: isDark ? 'rgba(255,255,255,0.92)' : 'rgba(15,23,42,0.92)', background: isDark ? '#0A0F1C' : '#EFFDF8', minHeight: 'calc(100vh - 57px)' }}>
      <BackgroundEffects />
      <div className="relative z-10 space-y-5">
        <StatusBar />

        {/* Title */}
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] mb-1" style={{ color: accent }}>ГАЗОПРОВОДЫ</p>
            <h1 className="text-2xl font-bold uppercase tracking-[0.1em]"
              style={{ background: isDark ? 'linear-gradient(90deg,#fff 10%,#5CE0D6 55%,#6366f1 100%)' : 'linear-gradient(90deg,#0f766e 10%,#0d9488 55%,#4338ca 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              QazaqGas · ИЦА
            </h1>
            <p className="text-xs mt-1 text-muted-foreground">Транспорт и транзит газа · Казахстан · Samruk-Kazyna</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-mono"
            style={{ background: isDark ? `${accent}12` : `${accent}10`, border: `1px solid ${accent}30`, color: accent }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: accent }} />
            LIVE SCADA
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard title="Транзит газа"       value={45.2} subtitle="млрд м³/год" icon={<Wind className="h-3.5 w-3.5" />}    color="cyan"   sparkData={KPI_SPARK.transit}   animDelay={100} decimals={1} />
          <KpiCard title="Давление (МГ)"      value={5.4}  subtitle="МПа (средн.)" icon={<Gauge className="h-3.5 w-3.5" />}  color="green"  sparkData={KPI_SPARK.pressure}  animDelay={180} decimals={1} />
          <KpiCard title="КС в работе"        value={38}   subtitle="из 42 компрессорных станций" icon={<MapPin className="h-3.5 w-3.5" />} color="purple" sparkData={KPI_SPARK.cs_online} animDelay={260} />
          <KpiCard title="Качество газа CH₄"  value={98.1} subtitle="% метана (ГОСТ 5542)" icon={<Flame className="h-3.5 w-3.5" />} color="amber" sparkData={KPI_SPARK.ch4} animDelay={340} decimals={1} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4">
          <div className="space-y-4">
            {/* Pipeline status */}
            <div className="rounded-xl border p-4" style={{ borderColor: `${accent}20`, background: isDark ? `${accent}06` : `${accent}03` }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Состояние газопроводов</p>
              <div className="space-y-2">
                {PIPELINES.map((pl, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border p-2.5"
                    style={{ borderColor: pl.status === 'ok' ? `${accent}20` : 'rgba(245,158,11,0.25)' }}>
                    <div className={`h-2 w-2 rounded-full shrink-0 ${pl.status === 'ok' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[11px] font-semibold truncate">{pl.name}</p>
                        <span className="text-[9px] text-muted-foreground">{pl.km.toLocaleString('ru-RU')} км</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{pl.dir}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] font-bold" style={{ color: accent }}>{pl.transit} млрд м³</p>
                      <div className="flex items-center gap-1 justify-end">
                        <div className="w-16 h-1 rounded bg-muted overflow-hidden">
                          <div className="h-full rounded" style={{ width: `${pl.pct}%`, background: pl.pct > 80 ? '#10b981' : accent }} />
                        </div>
                        <span className="text-[9px]">{pl.pct}%</span>
                      </div>
                    </div>
                    {pl.status !== 'ok' && <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-400 shrink-0">ТО</Badge>}
                  </div>
                ))}
              </div>
            </div>

            {/* CS Zones */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Компрессорные зоны</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {CS_ZONES.map((z, i) => {
                  const okColor = z.online === z.cs ? '#10b981' : '#f59e0b'
                  return (
                    <div key={i} className="rounded-lg border p-3" style={{ borderColor: `${okColor}20` }}>
                      <p className="text-[10px] font-semibold mb-2 leading-snug">{z.zone}</p>
                      <div className="space-y-1 text-[10px]">
                        <div className="flex justify-between"><span className="text-muted-foreground">КС онлайн:</span><span className="font-bold" style={{ color: okColor }}>{z.online}/{z.cs}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Давление:</span><span>{z.avg_mpa} МПа</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Топл. газ:</span><span>{z.fuel_pct}%</span></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Program cards */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Инвестпрограмма 2025</p>
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
                      <span>{c.budget}</span><span>{c.deadline}</span>
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

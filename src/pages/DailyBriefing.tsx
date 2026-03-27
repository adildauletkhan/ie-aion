import { useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Zap, Activity, AlertTriangle, BarChart3, FileText, Download,
  Loader2, Bot, ArrowLeftRight, TrendingUp, TrendingDown, CheckCircle2,
  Thermometer, Wind, Radio, Clock, CalendarDays,
  Building2, MapPin, Shield, Maximize2,
} from 'lucide-react'
import { getAuthHeader } from '@/lib/auth'
import { useTheme } from '@/hooks/useTheme'
import { useCompanyProfile } from '@/context/CompanyProfileContext'

function getApiBase() { return '/api' }

function getYesterdayLabel() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

/* ── Mock data ───────────────────────────────────────────────────────────── */

const HOURLY_LOAD = [
  { h: '00', load: 16240, gen: 16480, losses: 240 },
  { h: '01', load: 15820, gen: 16060, losses: 240 },
  { h: '02', load: 15340, gen: 15590, losses: 250 },
  { h: '03', load: 15120, gen: 15370, losses: 250 },
  { h: '04', load: 15060, gen: 15310, losses: 250 },
  { h: '05', load: 15280, gen: 15540, losses: 260 },
  { h: '06', load: 16140, gen: 16410, losses: 270 },
  { h: '07', load: 17560, gen: 17850, losses: 290 },
  { h: '08', load: 19820, gen: 20120, losses: 300 },
  { h: '09', load: 21340, gen: 21660, losses: 320 },
  { h: '10', load: 22180, gen: 22520, losses: 340 },
  { h: '11', load: 22640, gen: 22990, losses: 350 },
  { h: '12', load: 22980, gen: 23340, losses: 360 },
  { h: '13', load: 23120, gen: 23490, losses: 370 },
  { h: '14', load: 23280, gen: 23660, losses: 380 },
  { h: '15', load: 23140, gen: 23520, losses: 380 },
  { h: '16', load: 22860, gen: 23230, losses: 370 },
  { h: '17', load: 22540, gen: 22910, losses: 370 },
  { h: '18', load: 22180, gen: 22540, losses: 360 },
  { h: '19', load: 21640, gen: 21990, losses: 350 },
  { h: '20', load: 20820, gen: 21160, losses: 340 },
  { h: '21', load: 19640, gen: 19970, losses: 330 },
  { h: '22', load: 18360, gen: 18680, losses: 320 },
  { h: '23', load: 17180, gen: 17490, losses: 310 },
]

const GEN_MIX = [
  { name: 'ТЭС (ГРЭС)', value: 247.1, color: '#f59e0b' },
  { name: 'ВИЭ',        value: 41.3,  color: '#22c55e' },
  { name: 'ГЭС',        value: 20.0,  color: '#3b82f6' },
]

const TOP_GENERATORS = [
  { name: 'ГРЭС-1 Экибастуз',      owner: 'ТОО «ЭГРЭС-1»',        mw: 2100, gwh: 37.2,  share: 12.1, status: 'normal'   as const },
  { name: 'ГРЭС-2 Экибастуз',      owner: 'АО «ЭГРЭС-2»',         mw: 1000, gwh: 21.8,  share: 7.1,  status: 'normal'   as const },
  { name: 'Аксуская ГРЭС',          owner: 'АО «ЕЭК» ERG',          mw: 2520, gwh: 19.4,  share: 6.3,  status: 'normal'   as const },
  { name: 'Жамбылская ГРЭС',        owner: 'АО «Жамбылская ГРЭС»',  mw: 1230, gwh: 15.1,  share: 4.9,  status: 'normal'   as const },
  { name: 'ВЭС Ерейментау',         owner: 'ТОО «ЕрейментауВетер»', mw: 45,   gwh: 4.1,   share: 1.3,  status: 'normal'   as const },
  { name: 'СЭС Бурное',             owner: 'ТОО «Бурное Солар»',    mw: 50,   gwh: 3.8,   share: 1.2,  status: 'normal'   as const },
  { name: 'Бухтарминская ГЭС',      owner: 'ТОО «Казцинк»',         mw: 702,  gwh: 9.2,   share: 3.0,  status: 'normal'   as const },
  { name: 'Усть-Камен. ГЭС',        owner: 'ТОО «АЭС УК ГЭС»',     mw: 332,  gwh: 6.1,   share: 2.0,  status: 'normal'   as const },
]

const CROSS_BORDER = [
  { dir: 'Экспорт → РФ (ОДУ Урала)', mwh: 680,  color: '#22c55e' },
  { dir: 'Экспорт → РФ (ОДУ Сибири)', mwh: 310,  color: '#22c55e' },
  { dir: 'Экспорт → Кыргызстан',       mwh: 250,  color: '#22c55e' },
  { dir: 'Импорт ← РФ',               mwh: 0,    color: '#ef4444' },
  { dir: 'Транзит ЦА',                 mwh: 142,  color: '#6366f1' },
]

const INCIDENTS = [
  {
    time: '14:23', ps: 'ПС 500кВ Алма',    region: 'Алматинский узел',
    cause: 'Термическое воздействие на изоляцию AT-1 (t° 92°C / доп. 85°C)',
    duration: 18, resolved: true, severity: 'high' as const,
    action: 'Требуется внеплановая диагностика AT-1. Вывести в ремонт при подтверждении перегрева.',
  },
  {
    time: '09:11', ps: 'ПС 110кВ Жезказган', region: 'Улытауский узел',
    cause: 'Ложное срабатывание РЗА (дифференциальная защита T-2)',
    duration: 27, resolved: true, severity: 'medium' as const,
    action: 'Проверить настройки уставок РЗА. Провести контрольные испытания защиты.',
  },
  {
    time: '21:45', ps: 'Частота ЕЭС',       region: 'Системный уровень',
    cause: 'Отклонение +0.08 Гц (ВЭС Ерейментау, нерегулярная генерация при параллельной работе с ОЭС ЦА)',
    duration: 4,  resolved: true, severity: 'low' as const,
    action: 'Скорректировать суточный план ВЭС с учётом прогноза ветра. Уведомить оператора ВЭС.',
  },
]

const FREQ_DATA = [
  { t: '00', f: 50.00 }, { t: '03', f: 50.01 }, { t: '06', f: 49.99 },
  { t: '09', f: 50.00 }, { t: '11', f: 49.98 }, { t: '12', f: 50.00 },
  { t: '14', f: 49.97 }, { t: '15', f: 50.00 }, { t: '18', f: 50.01 },
  { t: '20', f: 50.00 }, { t: '21', f: 50.08 }, { t: '22', f: 50.00 }, { t: '23', f: 50.00 },
]

const MES_DATA = [
  { name: 'Сев. МЭС',  ps: 8,  vl: 3681, mva: 3758,  load: 88, losses: 6.1 },
  { name: 'Цент. МЭС', ps: 10, vl: 3497, mva: 3742,  load: 81, losses: 7.6 },
  { name: 'Акм. МЭС',  ps: 10, vl: 4230, mva: 8137,  load: 74, losses: 8.4 },
  { name: 'Алм. МЭС',  ps: 12, vl: 4220, mva: 4958,  load: 92, losses: 6.4 },
  { name: 'Вост. МЭС', ps: 7,  vl: 1975, mva: 4123,  load: 78, losses: 6.8 },
  { name: 'Зап. МЭС',  ps: 7,  vl: 2379, mva: 1450,  load: 66, losses: 9.1 },
  { name: 'Сарб. МЭС', ps: 8,  vl: 2438, mva: 6590,  load: 70, losses: 8.8 },
  { name: 'Акт. МЭС',  ps: 7,  vl: 1217, mva: 2426,  load: 73, losses: 7.2 },
]

const AI_PROMPT = `Сформируй оперативную суточную справку диспетчера ЕЭС Казахстана (системного оператора KEGOC) на основе следующих данных:

Сектор производства (248 электростанций, уст. мощность 26 807 МВт, располаг. 22 844 МВт):
- Суточная выработка: 308.4 ГВт·ч (ТЭС: 247.1, ВИЭ: 41.3, ГЭС: 20.0)
- Лидер: Экибастузская ГРЭС-1 (37.2 ГВт·ч), доля ВИЭ: 13.4%

Сектор передачи (НЭС KEGOC — 231 ПС, 28 400 км ЛЭП 220–1150 кВ):
- Объём: 28 412 ГВт·ч (план 28 100, +1.1%), Потери: 9.18% (норм. ≤10.5%)
- Авария: ПС 500кВ Алма 14:23 (18 мин), ПС 110кВ Жезказган 09:11 (27 мин)
- 3 кратковременных отклонения частоты (макс. ±0.08 Гц)

Рынок (КОРЭМ / РФЦ ВИЭ): план выполнен 100.3%, дисбалансы 3 субъекта, сальдо +1 240 МВт·ч

Формат:
1. Краткое резюме режима ЕЭС (2-3 предложения)
2. Ключевые показатели (производство, передача, рынок)
3. Отклонения и нештатные ситуации
4. ТОП-3 события суток
5. Рекомендации на следующие сутки`

const AI_FALLBACK = `**1. Краткое резюме**
Сутки прошли в устойчивом нормальном режиме. ЕЭС работала параллельно с ОЭС Центральной Азии и ОЭС России. Суточный план оптового рынка выполнен на 100.3%, объём передачи по НЭС превысил плановый показатель на 1.1%.

**2. Ключевые показатели суток**

Производство (248 электростанций):
• Суточная выработка: 308.4 ГВт·ч — ТЭС 247.1 (80.1%) · ВИЭ 41.3 (13.4%) · ГЭС 20.0 (6.5%)
• Лидер выработки: ГРЭС-1 Экибастуз — 37.2 ГВт·ч
• Доля ВИЭ 13.4% — рекорд месяца

Передача (НЭС KEGOC):
• Объём: 28 412 ГВт·ч (+1.1% к плану)
• Потери НЭС: 9.18% (норматив ≤ 10.5%) ✓
• Готовность оборудования: 94.8%

Рынок (КОРЭМ / РФЦ ВИЭ):
• Суточный план ОРЭ: выполнен (100.3%)
• Дисбалансы БРЭ: 3 субъекта урегулированы
• Сальдо: +1 240 МВт·ч (нетто-экспорт)

**3. Отклонения и нештатные ситуации**
• Аварийное откл. ПС 500кВ Алма (14:23) — перегрев AT-1. Устранено за 18 мин. Требуется диагностика.
• Аварийное откл. ПС 110кВ Жезказган (09:11) — ложное срабатывание РЗА. Устранено за 27 мин.
• 3 отклонения частоты до ±0.08 Гц — ВЭС при параллельной работе с ОЭС ЦА. В пределах нормы.

**4. ТОП-3 события**
1. 🔴 Авария ПС 500кВ Алма 14:23 — перегрев AT-1. Устранено, требует мониторинга.
2. 🟡 Дисбаланс ТОО «Главная РЭС Топар» на БРЭ (-47 МВт) — урегулирован через КОРЭМ.
3. 🟢 Рекорд ВИЭ: 41.3 ГВт·ч (13.4% в балансе) — максимум с начала года.

**5. Рекомендации на следующие сутки**
• Внеплановая диагностика AT-1 на ПС 500кВ Алма (t° 92°C > 85°C). При подтверждении — вывод в ремонт.
• Скорректировать план ВЭС Ерейментау (снижение −15% в 02:00–08:00 по прогнозу ветра).
• Уведомить ТОО «Главная РЭС Топар» об усилении точности суточного планирования.
• Проверить уставки РЗА ПС 110кВ Жезказган после ложного срабатывания.`

/* ── Sub-components ──────────────────────────────────────────────────────── */

function SectionTitle({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
        {sub && <p className="text-[10px] text-muted-foreground/60">{sub}</p>}
      </div>
    </div>
  )
}

function KpiTile({
  label, value, unit, sub, delta, color, icon: Icon,
}: {
  label: string; value: string | number; unit?: string; sub?: string
  delta?: { v: string; up: boolean } | null; color: string; icon: React.ElementType
}) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: `${color}25`, background: `${color}06` }}>
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold tabular-nums leading-none" style={{ color }}>
        {value}<span className="text-sm font-medium ml-1 opacity-70">{unit}</span>
      </p>
      {sub && <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{sub}</p>}
      {delta && (
        <div className="flex items-center gap-1 mt-1.5">
          {delta.up
            ? <TrendingUp className="h-3 w-3 text-emerald-500" />
            : <TrendingDown className="h-3 w-3 text-red-500" />}
          <span className={`text-[10px] font-semibold ${delta.up ? 'text-emerald-500' : 'text-red-500'}`}>
            {delta.v}
          </span>
        </div>
      )}
    </div>
  )
}

/* ── Main ────────────────────────────────────────────────────────────────── */
export default function DailyBriefing() {
  const { theme } = useTheme()
  const { profile } = useCompanyProfile()
  const isDark = theme === 'dark'

  const [aiText, setAiText] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  const tiffany = isDark ? '#5CE0D6' : '#0D9488'
  const borderMuted = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
  const bgMuted = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'

  async function handleGenerate() {
    setModalOpen(true)
    if (aiText) return          // already generated — just open modal
    setLoading(true)
    try {
      const authHeader = getAuthHeader()
      const res = await fetch(`${getApiBase()}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authHeader ? { Authorization: authHeader } : {}) },
        body: JSON.stringify({
          question: AI_PROMPT,
          sources: { masterData: false, geology: false, scenarios: false, annualPlans: false, results: false, crisis: false, entities: false },
          language: 'ru',
        }),
      })
      setAiText(res.ok ? ((await res.json() as { answer: string }).answer?.trim() || AI_FALLBACK) : AI_FALLBACK)
    } catch { setAiText(AI_FALLBACK) }
    finally { setLoading(false) }
  }

  const SEVERITY_STYLES = {
    high:   { color: '#ef4444', label: 'Высокий',  bg: 'rgba(239,68,68,0.08)' },
    medium: { color: '#f59e0b', label: 'Средний',  bg: 'rgba(245,158,11,0.08)' },
    low:    { color: '#6366f1', label: 'Низкий',   bg: 'rgba(99,102,241,0.08)' },
  }

  return (
    <div className="p-5 space-y-6 max-w-6xl mx-auto" id="briefing-printable">

      {/* Print styles — sidebar/header hidden via AppLayout print:hidden */}
      <style>{`
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          #briefing-printable {
            padding: 0 !important;
            max-width: 100% !important;
            font-size: 10pt;
          }
          #briefing-print-actions { display: none !important; }
          #briefing-print-actions-ai { display: none !important; }
          #briefing-ai-modal-trigger { display: none !important; }
          .recharts-wrapper, .recharts-surface { overflow: visible !important; }
          @page { margin: 10mm 12mm; size: A4 portrait; }
        }
      `}</style>

      {/* AI modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Bot className="h-4 w-4" style={{ color: tiffany }} />
              AI-сводка диспетчера ЕЭС · {getYesterdayLabel()}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            {loading && (
              <div className="space-y-2.5 py-4">
                {[1,2,3,4,5,6,7,8].map((i) => (
                  <Skeleton key={i} className={`h-3.5 ${i % 3 === 0 ? 'w-3/4' : i % 2 === 0 ? 'w-5/6' : 'w-full'}`} />
                ))}
                <p className="text-xs text-muted-foreground text-center pt-2">Генерирую сводку…</p>
              </div>
            )}
            {!loading && aiText && (
              <div
                className="text-sm leading-relaxed whitespace-pre-wrap rounded-xl border p-4"
                style={{
                  borderColor: `${tiffany}20`,
                  background: isDark ? `${tiffany}06` : `${tiffany}04`,
                  color: isDark ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.82)',
                }}
              >
                {aiText}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Header ── */}
      <div
        className="rounded-2xl border p-5"
        style={{ borderColor: `${tiffany}25`, background: isDark ? `${tiffany}06` : `${tiffany}04` }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="rounded-xl p-3" style={{ background: `${tiffany}15` }}>
              <FileText className="h-6 w-6" style={{ color: tiffany }} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: tiffany }}>
                Оперативная суточная справка
              </p>
              <h1 className="text-xl font-bold leading-tight">
                ЕЭС Республики Казахстан
              </h1>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />{getYesterdayLabel()}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />{profile.companyName || 'KEGOC'} · Системный оператор
                </span>
                <Badge variant="outline" className="text-[10px]" style={{ borderColor: '#22c55e40', color: '#22c55e' }}>
                  <CheckCircle2 className="h-3 w-3 mr-1" />Режим нормальный
                </Badge>
              </div>
            </div>
          </div>
          <div id="briefing-print-actions" className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />Печать / PDF
            </Button>
            <Button
              id="briefing-ai-modal-trigger"
              size="sm" onClick={handleGenerate} disabled={loading} className="gap-1.5"
              style={{ background: isDark ? 'linear-gradient(90deg,#0D9488,#5CE0D6)' : 'linear-gradient(90deg,#0D9488,#0f766e)', color: '#fff', border: 'none' }}
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
              {loading ? 'Генерация...' : 'AI-сводка'}
            </Button>
          </div>
        </div>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiTile label="Передача НЭС"    value="28 412" unit="ГВт·ч" sub="план 28 100"        delta={{ v: '+1.1% к плану', up: true  }} color={tiffany}  icon={Zap}          />
        <KpiTile label="Выработка"        value="308.4"  unit="ГВт·ч" sub="ТЭС+ВИЭ+ГЭС"        delta={{ v: '+0.8% к норме', up: true  }} color="#f59e0b"  icon={TrendingUp}   />
        <KpiTile label="Потери НЭС"       value="9.18"   unit="%"     sub="норм. ≤ 10.5%"       delta={{ v: '−0.32% к вчера', up: true }} color="#22c55e"  icon={Activity}     />
        <KpiTile label="Доля ВИЭ"         value="13.4"   unit="%"     sub="цель 15% к 2026"      delta={{ v: '+0.5% к пл.', up: true    }} color="#4ade80"  icon={Wind}         />
        <KpiTile label="Сальдо перетоков" value="+1 240" unit="МВт·ч" sub="нетто-экспорт"        delta={null}                              color="#6366f1"  icon={ArrowLeftRight} />
        <KpiTile label="Авар. отключений" value="2"      unit="шт."   sub="устранены в норм."   delta={{ v: '−1 к вчера', up: true      }} color="#f59e0b"  icon={AlertTriangle} />
      </div>

      {/* ── Row 2: Hourly load chart + Generation mix ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Hourly load */}
        <div className="xl:col-span-2 rounded-xl border p-4" style={{ borderColor: borderMuted, background: bgMuted }}>
          <SectionTitle icon={BarChart3} title="Почасовой график нагрузки и генерации" sub="МВт · 24 часа" />
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={HOURLY_LOAD} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gGen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={tiffany} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={tiffany} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gLoad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.20} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
              <XAxis dataKey="h" tick={{ fontSize: 9, fill: isDark ? '#888' : '#666' }} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: isDark ? '#888' : '#666' }} tickLine={false} axisLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}ГВт`} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ background: isDark ? '#0d1a2e' : '#fff', border: `1px solid ${tiffany}30`, borderRadius: 8, fontSize: 11 }}
                formatter={(v: number, name: string) => [`${v.toLocaleString()} МВт`, name === 'gen' ? 'Генерация' : name === 'load' ? 'Нагрузка' : 'Потери']}
                labelFormatter={(l) => `${l}:00`}
              />
              <Area type="monotone" dataKey="gen"  stroke={tiffany}   strokeWidth={2} fill="url(#gGen)"  name="gen" />
              <Area type="monotone" dataKey="load" stroke="#f59e0b" strokeWidth={2} fill="url(#gLoad)" name="load" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 rounded" style={{ background: tiffany }} />Генерация</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 rounded bg-amber-400" />Нагрузка</span>
            <span className="ml-auto">Пик: 23 490 МВт в 13:00 · Провал: 15 310 МВт в 04:00</span>
          </div>
        </div>

        {/* Generation mix */}
        <div className="rounded-xl border p-4" style={{ borderColor: borderMuted, background: bgMuted }}>
          <SectionTitle icon={Zap} title="Структура выработки" sub="308.4 ГВт·ч за сутки" />
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={GEN_MIX} cx="50%" cy="50%" innerRadius={42} outerRadius={62}
                paddingAngle={3} dataKey="value">
                {GEN_MIX.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: isDark ? '#0d1a2e' : '#fff', border: `1px solid ${tiffany}30`, borderRadius: 8, fontSize: 11 }}
                formatter={(v: number) => [`${v} ГВт·ч`]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-1">
            {GEN_MIX.map((g) => (
              <div key={g.name} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: g.color }} />
                <span className="flex-1">{g.name}</span>
                <span className="font-semibold tabular-nums">{g.gwh ?? g.value} ГВт·ч</span>
                <span className="text-muted-foreground text-[10px]">
                  {((g.value / 308.4) * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 3: Frequency + Cross-border + MES ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Frequency */}
        <div className="rounded-xl border p-4" style={{ borderColor: borderMuted, background: bgMuted }}>
          <SectionTitle icon={Radio} title="Отклонение частоты" sub="Гц · норма 50.00 ± 0.20" />
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={FREQ_DATA} margin={{ top: 4, right: 8, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="gFreq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
              <XAxis dataKey="t" tick={{ fontSize: 9, fill: isDark ? '#888' : '#666' }} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: isDark ? '#888' : '#666' }} tickLine={false} axisLine={false}
                domain={[49.94, 50.12]} tickCount={5} tickFormatter={(v) => v.toFixed(2)} />
              <Tooltip
                contentStyle={{ background: isDark ? '#0d1a2e' : '#fff', border: '1px solid #6366f130', borderRadius: 8, fontSize: 11 }}
                formatter={(v: number) => [`${v.toFixed(3)} Гц`, 'Частота']}
                labelFormatter={(l) => `${l}:00`}
              />
              <Area type="monotone" dataKey="f" stroke="#6366f1" strokeWidth={2} fill="url(#gFreq)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-muted-foreground mt-2">
            3 отклонения · макс. +0.08 Гц · в пределах ПУЭ
          </p>
        </div>

        {/* Cross-border flows */}
        <div className="rounded-xl border p-4" style={{ borderColor: borderMuted, background: bgMuted }}>
          <SectionTitle icon={ArrowLeftRight} title="Межгосударственные перетоки" sub="МВт·ч · сальдо +1 240" />
          <div className="space-y-2 mt-1">
            {CROSS_BORDER.map((c) => (
              <div key={c.dir} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.color }} />
                <span className="text-xs flex-1 leading-tight">{c.dir}</span>
                <span className="text-xs font-semibold tabular-nums" style={{ color: c.color }}>
                  {c.mwh > 0 ? `+${c.mwh}` : c.mwh === 0 ? '—' : c.mwh} МВт·ч
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t" style={{ borderColor: borderMuted }}>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Итого экспорт</span>
              <span className="font-bold text-emerald-500">+1 240 МВт·ч</span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-muted-foreground">Итого импорт</span>
              <span className="font-bold text-muted-foreground">0 МВт·ч</span>
            </div>
          </div>
        </div>

        {/* Market summary */}
        <div className="rounded-xl border p-4" style={{ borderColor: borderMuted, background: bgMuted }}>
          <SectionTitle icon={BarChart3} title="Рынок электроэнергии" sub="Оптовый рынок + БРЭ" />
          <div className="space-y-3">
            {[
              { label: 'Суточный план ОРЭ', value: '100.3%', status: 'ok', sub: 'выполнен' },
              { label: 'Объём ОРЭ', value: '308.4 ГВт·ч', status: 'ok', sub: 'закуп Единым закупщиком' },
              { label: 'Дисбалансы БРЭ', value: '3 субъекта', status: 'warn', sub: 'урегулировано КОРЭМ' },
              { label: 'Штрафные санкции', value: '0', status: 'ok', sub: 'нарушений не выявлено' },
              { label: 'ВИЭ (РФЦ ВИЭ)', value: '41.3 ГВт·ч', status: 'ok', sub: 'рекорд месяца' },
            ].map((r) => (
              <div key={r.label} className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] text-muted-foreground">{r.label}</p>
                  <p className="text-[10px] text-muted-foreground/60">{r.sub}</p>
                </div>
                <span className={`text-xs font-bold tabular-nums ${r.status === 'ok' ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {r.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── MES bar chart ── */}
      <div className="rounded-xl border p-4" style={{ borderColor: borderMuted, background: bgMuted }}>
        <SectionTitle icon={MapPin} title="Загрузка по филиалам МЭС" sub="% от установленной мощности · потери %" />
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={MES_DATA} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: isDark ? '#888' : '#666' }} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fontSize: 9, fill: isDark ? '#888' : '#666' }} tickLine={false} axisLine={false}
              domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: isDark ? '#888' : '#666' }} tickLine={false} axisLine={false}
              domain={[0, 15]} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              contentStyle={{ background: isDark ? '#0d1a2e' : '#fff', border: `1px solid ${tiffany}30`, borderRadius: 8, fontSize: 11 }}
              formatter={(v: number, name: string) => [
                `${v}%`,
                name === 'load' ? 'Загрузка' : 'Потери',
              ]}
            />
            <Bar yAxisId="left"  dataKey="load"   fill={tiffany}   radius={[3, 3, 0, 0]} name="load"   />
            <Bar yAxisId="right" dataKey="losses" fill="#f59e0b" radius={[3, 3, 0, 0]} name="losses" />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-1 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm" style={{ background: tiffany }} />Загрузка (левая ось)</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-amber-400" />Потери (правая ось)</span>
        </div>
      </div>

      {/* ── Top generators ── */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: borderMuted }}>
        <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: borderMuted, background: bgMuted }}>
          <Thermometer className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Топ электростанций по выработке
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: borderMuted }}>
                {['Станция', 'Оператор', 'Уст. МВт', 'Выработка', 'Доля', 'Статус'].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TOP_GENERATORS.map((g, i) => (
                <tr key={g.name} className="border-b last:border-0 hover:bg-muted/30 transition-colors" style={{ borderColor: borderMuted }}>
                  <td className="px-4 py-2.5 font-medium">{g.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{g.owner}</td>
                  <td className="px-4 py-2.5 tabular-nums">{g.mw.toLocaleString()}</td>
                  <td className="px-4 py-2.5 tabular-nums font-semibold">{g.gwh} ГВт·ч</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(g.share / 12.1) * 100}%`, background: i === 0 ? '#ef4444' : tiffany }} />
                      </div>
                      <span className="tabular-nums">{g.share}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant="outline" className="text-[9px]" style={{ borderColor: '#22c55e40', color: '#22c55e' }}>
                      Норма
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Incidents ── */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: borderMuted }}>
        <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: borderMuted, background: bgMuted }}>
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Нештатные ситуации и события
          </p>
          <Badge variant="outline" className="ml-auto text-[10px]" style={{ borderColor: '#22c55e40', color: '#22c55e' }}>
            <CheckCircle2 className="h-3 w-3 mr-1" />Все устранены
          </Badge>
        </div>
        <div className="divide-y" style={{ borderColor: borderMuted }}>
          {INCIDENTS.map((inc) => {
            const sev = SEVERITY_STYLES[inc.severity]
            return (
              <div key={inc.time} className="p-4 flex gap-4 items-start">
                <div className="shrink-0 text-center">
                  <p className="text-sm font-bold tabular-nums" style={{ color: sev.color }}>{inc.time}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">{inc.duration} мин</span>
                  </div>
                </div>
                <div className="w-px self-stretch" style={{ background: `${sev.color}30` }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold">{inc.ps}</span>
                    <span className="text-[10px] text-muted-foreground">{inc.region}</span>
                    <Badge className="text-[9px] ml-auto" style={{ background: sev.bg, color: sev.color, border: `1px solid ${sev.color}30` }}>
                      {sev.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 leading-snug">{inc.cause}</p>
                  <div className="flex items-start gap-1.5">
                    <Shield className="h-3 w-3 mt-0.5 shrink-0" style={{ color: tiffany }} />
                    <p className="text-[11px] leading-snug" style={{ color: tiffany }}>{inc.action}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── AI summary ── */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: `${tiffany}20` }}>
        <div className="flex items-center gap-2 px-4 py-3 border-b"
          style={{ borderColor: `${tiffany}15`, background: isDark ? `${tiffany}06` : `${tiffany}04` }}>
          <Bot className="h-4 w-4" style={{ color: tiffany }} />
          <span className="text-sm font-bold">AI-сводка диспетчера ЕЭС</span>
          <Badge variant="outline" className="text-[10px]" style={{ borderColor: `${tiffany}30`, color: tiffany }}>GPT-4o</Badge>
          <div id="briefing-print-actions-ai" className="ml-auto flex items-center gap-2">
            {aiText && (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => setModalOpen(true)}
                style={{ color: tiffany }}>
                <Maximize2 className="h-3 w-3" />Открыть сводку
              </Button>
            )}
            <Button
              size="sm" onClick={handleGenerate} disabled={loading}
              className="h-7 px-3 text-xs gap-1"
              style={{ background: isDark ? 'linear-gradient(90deg,#0D9488,#5CE0D6)' : 'linear-gradient(90deg,#0D9488,#0f766e)', color: '#fff', border: 'none' }}
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bot className="h-3 w-3" />}
              {loading ? 'Генерация...' : aiText ? 'Обновить' : 'Сгенерировать'}
            </Button>
          </div>
        </div>
        <div className="p-5" style={{ minHeight: aiText ? 'auto' : '12rem' }}>
          {loading && (
            <div className="space-y-2.5">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <Skeleton key={i} className={`h-3.5 ${i % 3 === 0 ? 'w-3/4' : i % 2 === 0 ? 'w-5/6' : 'w-full'}`} />
              ))}
              <p className="text-xs text-muted-foreground text-center pt-2">Генерирую сводку…</p>
            </div>
          )}
          {!loading && !aiText && (
            <div className="flex flex-col items-center justify-center h-40 text-center gap-3">
              <div className="rounded-full p-3" style={{ background: `${tiffany}10` }}>
                <Bot className="h-8 w-8" style={{ color: `${tiffany}60` }} />
              </div>
              <div>
                <p className="text-sm font-medium">AI-сводка не сгенерирована</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Нажмите «Сгенерировать» для аналитического резюме по данным ЭЭС РК за вчерашние сутки
                </p>
              </div>
            </div>
          )}
          {!loading && aiText && (
            <div className="text-sm leading-relaxed whitespace-pre-wrap"
              style={{ color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)' }}>
              {aiText}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

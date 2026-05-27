import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import { detectXR, XRCapabilities } from '../xr/xrCapabilities'
const NpsScene3D = lazy(() =>
  import('../scene/NpsScene').then(m => ({ default: m.NpsScene }))
)
const VRModeComponent = lazy(() =>
  import('../modes/VRMode').then(m => ({ default: m.VRMode }))
)
const ARModeComponent = lazy(() =>
  import('../modes/ARMode').then(m => ({ default: m.ARMode }))
)
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/useTheme'
import { useLanguage } from '@/hooks/useLanguage'
import {
  ZoomIn, ZoomOut, RotateCcw, X, Activity, AlertTriangle,
  CheckCircle2, ExternalLink, TrendingUp, TrendingDown,
  Box, Layers, Camera, Maximize2, Minimize2, Scan, FileText,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'

/* ══════════════════════════════════════════════════════ ISO PROJECTION ══ */

const _IS = 11        // scale px/unit
const _IOX = 720, _IOY = 72

function isoP(wx: number, wy: number, wz: number) {
  return {
    x: Math.round((wx - wz) * _IS * 0.866 + _IOX),
    y: Math.round((wx + wz) * _IS * 0.5 + _IOY - wy * _IS),
  }
}
function pp(...pts: { x: number; y: number }[]): string {
  return pts.map(p => `${p.x},${p.y}`).join(' ')
}

/* ══════════════════════════════════════════════════════ TYPES */

type AlarmLevel = 'normal' | 'warning' | 'alarm'
type EqType = 'pump' | 'tank' | 'meter' | 'filter' | 'valve' | 'block'

interface Param {
  name: string
  value: number | string
  unit: string
  alarm?: AlarmLevel
  hi?: number
  lo?: number
  trend?: 'up' | 'down' | 'flat'
}

interface Equipment {
  id: string
  label: string
  type: EqType
  status: 'running' | 'standby' | 'fault' | 'maintenance'
  location: string
  params: Param[]
  alarms?: string[]
  description?: string
}

/* ═══════════════════════════════════════════════════════ TREND DATA */

const trend24h = (base: number, spread: number, hi?: number) =>
  Array.from({ length: 24 }, (_, i) => ({
    h: `${String(i).padStart(2, '0')}:00`,
    v: +(base + (Math.random() - 0.5) * spread).toFixed(2),
    hi,
  }))

/* ═══════════════════════════════════════════════════════ EQUIPMENT DATA */

const EQUIPMENT: Equipment[] = [
  /* ── Фильтр-сепаратор ── */
  {
    id: 'FS1', label: 'ФС-1', type: 'filter', status: 'running', location: 'Узел приёма',
    description: 'Фильтр-сепаратор нефти. Очистка от механических примесей и свободной воды перед насосами и УКЛН.',
    params: [
      { name: 'Перепад давления', value: 0.08, unit: 'МПа', alarm: 'normal', hi: 0.15 },
      { name: 'Давление вход', value: 0.42, unit: 'МПа', alarm: 'normal' },
      { name: 'Давление выход', value: 0.34, unit: 'МПа', alarm: 'normal' },
      { name: 'Уровень шлама', value: 12, unit: '%', alarm: 'normal', hi: 80 },
      { name: 'Температура нефти', value: 39, unit: '°C', alarm: 'normal' },
    ],
  },
  /* ── УКЛН-1 ── */
  {
    id: 'UKLN1', label: 'УКЛН-1', type: 'meter', status: 'running', location: 'Узел приёма',
    description: 'Узел коммерческого учёта нефти приёма. Расходомеры Coriolis + Ультразвуковой. Данные передаются в ТТК/ГТС.',
    params: [
      { name: 'Массовый расход', value: 962, unit: 'т/ч', alarm: 'normal', trend: 'up' },
      { name: 'Объёмный расход', value: 1124, unit: 'м³/ч', alarm: 'normal' },
      { name: 'Плотность нефти', value: 856.2, unit: 'кг/м³', alarm: 'normal' },
      { name: 'Температура', value: 40, unit: '°C', alarm: 'normal' },
      { name: 'Счётчик (сутки)', value: '21 840', unit: 'м³', alarm: 'normal' },
      { name: 'Счётчик (месяц)', value: '318 200', unit: 'тыс.м³', alarm: 'normal' },
    ],
  },
  /* ── НА-0А (подпорный) ── */
  {
    id: 'NA0A', label: 'НА-0А', type: 'pump', status: 'running', location: 'Подпорная насосная',
    description: 'Подпорный насосный агрегат А. Обеспечивает подпор на всасе основных насосов НА-1–НА-3.',
    params: [
      { name: 'Расход', value: 580, unit: 'м³/ч', alarm: 'normal' },
      { name: 'Давл. всас', value: 0.32, unit: 'МПа', alarm: 'normal', lo: 0.10 },
      { name: 'Давл. напор', value: 1.25, unit: 'МПа', alarm: 'normal' },
      { name: 'T подш. DE', value: 54, unit: '°C', alarm: 'normal', hi: 75 },
      { name: 'T подш. NDE', value: 51, unit: '°C', alarm: 'normal', hi: 75 },
      { name: 'Виброскорость DE', value: 2.1, unit: 'мм/с', alarm: 'normal', hi: 4.5 },
      { name: 'Мощность', value: 420, unit: 'кВт', alarm: 'normal' },
      { name: 'Обороты', value: 1490, unit: 'об/мин', alarm: 'normal' },
    ],
    alarms: [],
  },
  /* ── НА-0Б (подпорный, резерв) ── */
  {
    id: 'NA0B', label: 'НА-0Б', type: 'pump', status: 'standby', location: 'Подпорная насосная',
    description: 'Подпорный насосный агрегат Б (резерв). Автоматический запуск при останове НА-0А.',
    params: [
      { name: 'Расход', value: 0, unit: 'м³/ч', alarm: 'normal' },
      { name: 'Давл. всас', value: 0.30, unit: 'МПа', alarm: 'normal' },
      { name: 'T подш. DE', value: 28, unit: '°C', alarm: 'normal' },
      { name: 'Готовность к пуску', value: 'Готов', unit: '' },
    ],
  },
  /* ── РВС-1 ── */
  {
    id: 'RVS1', label: 'РВС-1', type: 'tank', status: 'running', location: 'Резервуарный парк',
    description: 'Резервуар вертикальный стальной 10 000 м³. Нефть товарная. Подогрев — трубчатый теплообменник по периметру.',
    params: [
      { name: 'Уровень', value: 72, unit: '%', alarm: 'normal', hi: 95, lo: 5 },
      { name: 'Объём', value: 7200, unit: 'м³', alarm: 'normal' },
      { name: 'Температура T1', value: 41.2, unit: '°C', alarm: 'normal', lo: 30 },
      { name: 'Температура T2', value: 40.8, unit: '°C', alarm: 'normal' },
      { name: 'Давл. паров', value: 47, unit: 'мПа', alarm: 'normal' },
      { name: 'Плотность', value: 854, unit: 'кг/м³', alarm: 'normal' },
      { name: 'Обогрев', value: 'Активен', unit: '' },
    ],
  },
  /* ── РВС-2 ── */
  {
    id: 'RVS2', label: 'РВС-2', type: 'tank', status: 'running', location: 'Резервуарный парк',
    description: 'Резервуар 10 000 м³. Нефть товарная.',
    params: [
      { name: 'Уровень', value: 65, unit: '%', alarm: 'normal', hi: 95, lo: 5 },
      { name: 'Объём', value: 6500, unit: 'м³', alarm: 'normal' },
      { name: 'Температура', value: 40.5, unit: '°C', alarm: 'normal' },
      { name: 'Давл. паров', value: 45, unit: 'мПа', alarm: 'normal' },
      { name: 'Плотность', value: 856, unit: 'кг/м³', alarm: 'normal' },
    ],
  },
  /* ── РВС-3 ── */
  {
    id: 'RVS3', label: 'РВС-3', type: 'tank', status: 'running', location: 'Резервуарный парк',
    description: 'Резервуар 10 000 м³. Нефть товарная.',
    params: [
      { name: 'Уровень', value: 81, unit: '%', alarm: 'normal', hi: 95, lo: 5 },
      { name: 'Объём', value: 8100, unit: 'м³', alarm: 'normal' },
      { name: 'Температура', value: 42.1, unit: '°C', alarm: 'normal' },
      { name: 'Давл. паров', value: 51, unit: 'мПа', alarm: 'normal' },
      { name: 'Плотность', value: 852, unit: 'кг/м³', alarm: 'normal' },
    ],
  },
  /* ── РВС-4 ── */
  {
    id: 'RVS4', label: 'РВС-4', type: 'tank', status: 'fault', location: 'Резервуарный парк',
    description: 'Резервуар 10 000 м³. Превышение уровня нефти — ПДК срабатывает.',
    params: [
      { name: 'Уровень', value: 93, unit: '%', alarm: 'warning', hi: 95, lo: 5 },
      { name: 'Объём', value: 9300, unit: 'м³', alarm: 'warning' },
      { name: 'Температура', value: 43.5, unit: '°C', alarm: 'normal' },
      { name: 'Давл. паров', value: 55, unit: 'мПа', alarm: 'warning', hi: 50 },
      { name: 'ПДК клапан', value: 'Открыт', unit: '', alarm: 'warning' },
    ],
    alarms: ['ВЫСОКИЙ УРОВЕНЬ: 93.0% (предел 95%)', 'ДАВЛЕНИЕ ПАРОВ: 55 мПа (предел 50 мПа)', 'ПДК клапан открыт'],
  },
  /* ── РВС-5 ── */
  {
    id: 'RVS5', label: 'РВС-5', type: 'tank', status: 'running', location: 'Резервуарный парк',
    description: 'Резервуар 10 000 м³. Нефть товарная.',
    params: [
      { name: 'Уровень', value: 58, unit: '%', alarm: 'normal', hi: 95, lo: 5 },
      { name: 'Объём', value: 5800, unit: 'м³', alarm: 'normal' },
      { name: 'Температура', value: 40.1, unit: '°C', alarm: 'normal' },
      { name: 'Давл. паров', value: 44, unit: 'мПа', alarm: 'normal' },
      { name: 'Плотность', value: 857, unit: 'кг/м³', alarm: 'normal' },
    ],
  },
  /* ── НА-1 ── */
  {
    id: 'NA1', label: 'НА-1', type: 'pump', status: 'running', location: 'Насосная станция',
    description: 'Основной насосный агрегат №1. Центробежный насос ЦН-500/335 с электродвигателем 2500 кВт.',
    params: [
      { name: 'Расход', value: 498, unit: 'м³/ч', alarm: 'normal', hi: 600, lo: 200 },
      { name: 'Давл. всас', value: 1.12, unit: 'МПа', alarm: 'normal', lo: 0.10 },
      { name: 'Давл. нагнет.', value: 6.85, unit: 'МПа', alarm: 'normal', hi: 7.5 },
      { name: 'Мощность', value: 2240, unit: 'кВт', alarm: 'normal', hi: 2500 },
      { name: 'Ток', value: 195, unit: 'А', alarm: 'normal' },
      { name: 'Обороты', value: 2984, unit: 'об/мин', alarm: 'normal' },
      { name: 'T подш. DE', value: 58, unit: '°C', alarm: 'normal', hi: 75 },
      { name: 'T подш. NDE', value: 55, unit: '°C', alarm: 'normal', hi: 75 },
      { name: 'Вибр. DE', value: 2.4, unit: 'мм/с', alarm: 'normal', hi: 4.5 },
      { name: 'Вибр. NDE', value: 2.1, unit: 'мм/с', alarm: 'normal', hi: 4.5 },
      { name: 'T масла', value: 47, unit: '°C', alarm: 'normal', hi: 70 },
      { name: 'Наработка', value: '4 850', unit: 'ч', alarm: 'normal' },
    ],
    alarms: [],
  },
  /* ── НА-2 ── */
  {
    id: 'NA2', label: 'НА-2', type: 'pump', status: 'running', location: 'Насосная станция',
    description: 'Основной насосный агрегат №2. Центробежный насос ЦН-500/335.',
    params: [
      { name: 'Расход', value: 495, unit: 'м³/ч', alarm: 'normal' },
      { name: 'Давл. всас', value: 1.10, unit: 'МПа', alarm: 'normal' },
      { name: 'Давл. нагнет.', value: 6.82, unit: 'МПа', alarm: 'normal' },
      { name: 'Мощность', value: 2220, unit: 'кВт', alarm: 'normal' },
      { name: 'T подш. DE', value: 56, unit: '°C', alarm: 'normal', hi: 75 },
      { name: 'T подш. NDE', value: 53, unit: '°C', alarm: 'normal', hi: 75 },
      { name: 'Вибр. DE', value: 1.9, unit: 'мм/с', alarm: 'normal', hi: 4.5 },
      { name: 'Наработка', value: '3 210', unit: 'ч', alarm: 'normal' },
    ],
  },
  /* ── НА-3 ── */
  {
    id: 'NA3', label: 'НА-3', type: 'pump', status: 'running', location: 'Насосная станция',
    description: 'Основной насосный агрегат №3. Центробежный насос ЦН-500/335.',
    params: [
      { name: 'Расход', value: 501, unit: 'м³/ч', alarm: 'normal' },
      { name: 'Давл. всас', value: 1.14, unit: 'МПа', alarm: 'normal' },
      { name: 'Давл. нагнет.', value: 6.88, unit: 'МПа', alarm: 'normal' },
      { name: 'Мощность', value: 2255, unit: 'кВт', alarm: 'normal' },
      { name: 'T подш. DE', value: 59, unit: '°C', alarm: 'warning', hi: 75 },
      { name: 'Вибр. DE', value: 3.8, unit: 'мм/с', alarm: 'warning', hi: 4.5 },
      { name: 'Наработка', value: '6 120', unit: 'ч', alarm: 'normal' },
    ],
    alarms: ['T подш. DE = 59°C — увеличенный тренд', 'Вибрация DE = 3.8 мм/с — приближается к порогу 4.5'],
  },
  /* ── НА-4 (резерв) ── */
  {
    id: 'NA4', label: 'НА-4', type: 'pump', status: 'maintenance', location: 'Насосная станция',
    description: 'Основной насосный агрегат №4 (резерв / ТО). Плановая замена торцевых уплотнений.',
    params: [
      { name: 'Статус ТО', value: 'Замена уплотнений', unit: '' },
      { name: 'Срок ТО (ост.)', value: '2 суток', unit: '' },
      { name: 'Наработка', value: '8 445', unit: 'ч', alarm: 'warning' },
    ],
    alarms: ['Агрегат выведен на плановое ТО'],
  },
  /* ── УКЛН-2 ── */
  {
    id: 'UKLN2', label: 'УКЛН-2', type: 'meter', status: 'running', location: 'Узел откачки',
    description: 'Узел коммерческого учёта нефти откачки. Данные на ПКОН и ЦДП КТО.',
    params: [
      { name: 'Массовый расход', value: 1245, unit: 'т/ч', alarm: 'normal', trend: 'up' },
      { name: 'Объёмный расход', value: 1455, unit: 'м³/ч', alarm: 'normal' },
      { name: 'Плотность нефти', value: 855.8, unit: 'кг/м³', alarm: 'normal' },
      { name: 'Температура', value: 41, unit: '°C', alarm: 'normal' },
      { name: 'Давление', value: 6.84, unit: 'МПа', alarm: 'normal' },
      { name: 'Счётчик (сутки)', value: '33 120', unit: 'м³', alarm: 'normal' },
    ],
  },
  /* ── Блок манифольда ── */
  {
    id: 'MB5', label: 'Блок манифольда', type: 'block', status: 'running', location: 'Ц.блок',
    description: 'Манифольдная обвязка резервуарного парка. Задвижки 501–505 с дистанционным управлением.',
    params: [
      { name: 'Задвижка 501 (РВС-1)', value: 'Открыта 100%', unit: '' },
      { name: 'Задвижка 502 (РВС-2)', value: 'Открыта 100%', unit: '' },
      { name: 'Задвижка 503 (РВС-3)', value: 'Открыта 100%', unit: '' },
      { name: 'Задвижка 504 (РВС-4)', value: 'Закрыта 0%', unit: '', alarm: 'warning' },
      { name: 'Задвижка 505 (РВС-5)', value: 'Открыта 100%', unit: '' },
      { name: 'Давление в коллекторе', value: 1.05, unit: 'МПа', alarm: 'normal' },
    ],
  },
  /* ── Дренажный блок ── */
  {
    id: 'DB6', label: 'Дрен. блок 6', type: 'block', status: 'running', location: 'Дренажная обвязка',
    description: 'Подземные дренажные ёмкости 601 и 602. Погружные насосы 621, 622. Выход на резервуарный парк.',
    params: [
      { name: 'Ёмкость 601 (газ)', value: '50 м³ · 18%', unit: '' },
      { name: 'Ёмкость 602 (нефть)', value: '50 м³ · 32%', unit: '' },
      { name: 'Насос 621', value: 'В работе', unit: '' },
      { name: 'Насос 622', value: 'Резерв', unit: '' },
    ],
  },
]

/* ═══════════════════════════════════════════════════════ STATUS COLORS */

const SC = {
  running:     '#10b981',
  standby:     '#6366f1',
  fault:       '#f59e0b',
  maintenance: '#94a3b8',
}
const SC_LABEL_KEY = {
  running:     'techPidStatusRunning',
  standby:     'techPidStatusStandby',
  fault:       'techPidStatusFault',
  maintenance: 'techPidStatusMaintenance',
} as const
const ALARM_COLOR = { normal: '#10b981', warning: '#f59e0b', alarm: '#ef4444' }

/* ═══════════════════════════════════════════════════════ SVG SYMBOLS */

function Pump({ cx, cy, r = 18, status, onClick, label }: {
  cx: number; cy: number; r?: number
  status: keyof typeof SC; onClick?: () => void; label?: string
}) {
  const c = SC[status]
  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      <circle cx={cx} cy={cy} r={r + 4} fill={c} fillOpacity={0.08} />
      <circle cx={cx} cy={cy} r={r} fill={c} fillOpacity={0.15} stroke={c} strokeWidth={2} />
      <polygon points={`${cx},${cy - r * .55} ${cx - r * .48},${cy + r * .38} ${cx + r * .48},${cy + r * .38}`}
        fill={c} opacity={0.85} />
      {status === 'standby' && <circle cx={cx} cy={cy} r={r - 4} fill="none" stroke={c} strokeWidth={1} strokeDasharray="3,2" />}
      {label && <text x={cx} y={cy + r + 13} textAnchor="middle" fontSize={10} fill={c} fontWeight={600}>{label}</text>}
    </g>
  )
}

function Tank({ cx, cy, r = 52, status, pct = 60, onClick, label }: {
  cx: number; cy: number; r?: number; status: keyof typeof SC
  pct?: number; onClick?: () => void; label?: string
}) {
  const c = SC[status]
  const fillH = (pct / 100) * r * 2
  const clipId = `tc-${label}`
  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      <defs><clipPath id={clipId}><circle cx={cx} cy={cy} r={r - 2} /></clipPath></defs>
      <rect x={cx - r} y={cy + r - fillH} width={r * 2} height={fillH}
        fill={c} fillOpacity={0.22} clipPath={`url(#${clipId})`} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={c} strokeWidth={2.5} />
      {/* roof line */}
      <ellipse cx={cx} cy={cy - r} rx={r} ry={r * 0.18} fill={c} fillOpacity={0.12} stroke={c} strokeWidth={1.5} />
      {/* legs */}
      <line x1={cx - 18} y1={cy + r} x2={cx - 18} y2={cy + r + 12} stroke={c} strokeWidth={3} />
      <line x1={cx + 18} y1={cy + r} x2={cx + 18} y2={cy + r + 12} stroke={c} strokeWidth={3} />
      {label && (
        <>
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize={12} fontWeight="700" fill={c}>{label}</text>
          <text x={cx} y={cy + 12} textAnchor="middle" fontSize={10} fill={c}>{pct}%</text>
        </>
      )}
    </g>
  )
}

function Block({ x, y, w, h, color, label, subLabel, onClick }: {
  x: number; y: number; w: number; h: number; color: string
  label: string; subLabel?: string; onClick?: () => void
}) {
  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={color} fillOpacity={0.1} stroke={color} strokeWidth={2} />
      <text x={x + w / 2} y={y + h / 2 - 4} textAnchor="middle" fontSize={11} fill={color} fontWeight={700}>{label}</text>
      {subLabel && <text x={x + w / 2} y={y + h / 2 + 10} textAnchor="middle" fontSize={9} fill={color} opacity={0.7}>{subLabel}</text>}
    </g>
  )
}

/* ═══════════════════════════════════════════════════════ SCADA PANEL */

function SCADAPanel({ eq, onClose, onView3D }: { eq: Equipment; onClose: () => void; onView3D?: () => void }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { t, translateData: tt } = useLanguage()

  const trendData = useRef(
    eq.type === 'pump'
      ? { flow: trend24h(490, 40, 600), pressure: trend24h(6.8, 0.3, 7.5), vibration: trend24h(2.5, 0.8, 4.5) }
      : eq.type === 'tank'
        ? { level: trend24h((eq.params.find(p => p.name === 'Уровень')?.value as number) ?? 60, 5, 95), temp: trend24h(41, 2) }
        : { flow: trend24h(1000, 100), density: trend24h(855, 3) }
  ).current

  const hasAlarms = (eq.alarms?.length ?? 0) > 0
  const statusColor = SC[eq.status]

  return (
    <div className="w-80 shrink-0 flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-200px)]">
      {/* Header */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: statusColor }} />
                <CardTitle className="text-base">{tt(eq.label)}</CardTitle>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{tt(eq.location)}</p>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs" style={{ borderColor: statusColor, color: statusColor }}>
                {t(SC_LABEL_KEY[eq.status])}
              </Badge>
              {onView3D && (
                <Button size="icon" variant="ghost" className="h-6 w-6 text-blue-400" title={t('techPanelView3D')} onClick={onView3D}>
                  <Box className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onClose}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          {eq.description && <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">{tt(eq.description)}</p>}
        </CardHeader>
      </Card>

      {/* Alarms */}
      {hasAlarms && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="px-4 py-3">
            <p className="text-[10px] font-semibold text-amber-500 mb-1.5 uppercase tracking-wide flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> {t('techActiveEvents')}
            </p>
            <div className="space-y-1">
              {eq.alarms!.map((a, i) => (
                <div key={i} className="text-[10px] text-amber-400 flex items-start gap-1">
                  <span className="shrink-0 mt-0.5">▲</span><span>{tt(a)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Parameters */}
      <Card>
        <CardContent className="px-4 py-3">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-2 font-semibold">
            {t('techScadaParams')}
          </p>
          <div className="space-y-1.5">
            {eq.params.map((p, i) => {
              const ac = ALARM_COLOR[p.alarm ?? 'normal']
              const isNum = typeof p.value === 'number'
              return (
                <div key={i} className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-muted-foreground truncate">{tt(p.name)}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {p.trend === 'up' && <TrendingUp className="h-3 w-3 text-emerald-400" />}
                    {p.trend === 'down' && <TrendingDown className="h-3 w-3 text-rose-400" />}
                    <span className="text-[11px] font-bold font-mono" style={{ color: ac }}>
                      {isNum ? String(p.value).replace('.', ',') : tt(String(p.value))}
                    </span>
                    {p.unit && <span className="text-[9px] text-muted-foreground">{tt(p.unit)}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Trend charts */}
      {eq.type === 'pump' && (
        <Card>
          <CardContent className="px-4 py-3">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-2 font-semibold">{t('techTrendFlow24h')}</p>
            <ResponsiveContainer width="100%" height={90}>
              <LineChart data={(trendData as { flow: { h: string; v: number }[] }).flow}>
                <XAxis dataKey="h" tick={{ fontSize: 7 }} interval={5} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 7 }} tickLine={false} axisLine={false} width={32} />
                <Tooltip contentStyle={{ fontSize: 9 }} formatter={(v: number) => [`${v} ${tt('м³/ч')}`, 'Q']} />
                <ReferenceLine y={600} stroke="#ef4444" strokeDasharray="3 2" />
                <Line type="monotone" dataKey="v" stroke={statusColor} strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1 mt-2 font-semibold">{t('techTrendPressure24h')}</p>
            <ResponsiveContainer width="100%" height={80}>
              <LineChart data={(trendData as { pressure: { h: string; v: number }[] }).pressure}>
                <XAxis dataKey="h" tick={{ fontSize: 7 }} interval={5} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 7 }} tickLine={false} axisLine={false} width={28} domain={[6, 7.5]} />
                <Tooltip contentStyle={{ fontSize: 9 }} formatter={(v: number) => [`${v.toFixed(2)} ${tt('МПа')}`, 'P']} />
                <ReferenceLine y={7.5} stroke="#ef4444" strokeDasharray="3 2" />
                <Line type="monotone" dataKey="v" stroke="#6366f1" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {eq.type === 'tank' && (
        <Card>
          <CardContent className="px-4 py-3">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-2 font-semibold">{t('techTrendLevel24h')}</p>
            <ResponsiveContainer width="100%" height={90}>
              <LineChart data={(trendData as { level: { h: string; v: number }[] }).level}>
                <XAxis dataKey="h" tick={{ fontSize: 7 }} interval={5} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 7 }} tickLine={false} axisLine={false} width={28} domain={[0, 100]} />
                <Tooltip contentStyle={{ fontSize: 9 }} formatter={(v: number) => [`${v.toFixed(1)}%`, tt('Уровень')]} />
                <ReferenceLine y={95} stroke="#ef4444" strokeDasharray="3 2" label={{ value: '95%', fontSize: 8, fill: '#ef4444' }} />
                <ReferenceLine y={5} stroke="#f59e0b" strokeDasharray="3 2" />
                <Line type="monotone" dataKey="v" stroke={statusColor} strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {eq.type === 'meter' && (
        <Card>
          <CardContent className="px-4 py-3">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-2 font-semibold">{t('techTrendFlow24h')}</p>
            <ResponsiveContainer width="100%" height={90}>
              <LineChart data={(trendData as { flow: { h: string; v: number }[] }).flow}>
                <XAxis dataKey="h" tick={{ fontSize: 7 }} interval={5} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 7 }} tickLine={false} axisLine={false} width={40} />
                <Tooltip contentStyle={{ fontSize: 9 }} formatter={(v: number) => [`${v} ${tt('т/ч')}`, 'G']} />
                <Line type="monotone" dataKey="v" stroke="#10b981" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ MAIN COMPONENT */

/* ══════════════════════════════════════════════════════ 3D NPS SCENE ═══ */
// Thin adapter — bridges TechSchemeKTO's select/back callbacks to NpsScene

function NPS3DScene({
  onBack,
}: {
  highlighted?: string | null
  isDark?: boolean
  onSelect?: (id: string) => void
  onBack: () => void
}) {
  const { t } = useLanguage()
  return (
    <div
      className="rounded-xl border overflow-hidden relative"
      style={{ flex: '1 1 0', minHeight: 480, height: 'calc(100dvh - 210px)', display: 'flex', flexDirection: 'column' }}
    >
      {/* Back to P&ID button */}
      <div className="absolute top-3 left-40 z-40 flex items-center gap-2">
        <Button size="sm" variant="secondary" className="text-xs h-7" onClick={onBack}>
          <Layers className="h-3 w-3 mr-1" />{t('techPidScheme')}
        </Button>
      </div>
      <Suspense fallback={
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#030c17', minHeight: 480, color: '#475569',
          fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14,
        }}>
          {t('techScene3DLoading')}
        </div>
      }>
        <NpsScene3D />
      </Suspense>
    </div>
  )
}

/* ══════════════════════════════════════════════════════ AR/VR TOUR ══════ */

function ARVRTour({ isDark }: { isDark: boolean }) {
  const [mode, setMode]       = useState<'ar' | 'vr'>('ar')
  const [cameraOn, setCameraOn] = useState(false)
  const [vrRotY, setVrRotY]   = useState(0)
  const [vrRotX, setVrRotX]   = useState(-12)
  const [isFS, setIsFS]       = useState(false)
  const [xrActive, setXrActive] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef     = useRef<HTMLVideoElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const rafRef       = useRef<number>()
  const dragRef      = useRef({ on: false, x: 0, y: 0 })

  // AR camera
  const startCam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } },
      })
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play() }
      setCameraOn(true)
    } catch { setCameraOn(false) }
  }, [])

  const stopCam = useCallback(() => {
    const v = videoRef.current
    if (v?.srcObject) { (v.srcObject as MediaStream).getTracks().forEach(t => t.stop()); v.srcObject = null }
    setCameraOn(false)
  }, [])

  // Fullscreen
  const toggleFS = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen(); setIsFS(true)
    } else { document.exitFullscreen(); setIsFS(false) }
  }, [])

  // WebXR attempt
  const tryWebXR = useCallback(async (type: 'immersive-ar' | 'immersive-vr') => {
    if (!('xr' in navigator)) return false
    try {
      const ok = await (navigator as unknown as {xr:{isSessionSupported:(t:string)=>Promise<boolean>}}).xr.isSessionSupported(type)
      if (!ok) return false
      await (navigator as unknown as {xr:{requestSession:(t:string,o:object)=>Promise<unknown>}}).xr.requestSession(type, {
        requiredFeatures: ['local'], optionalFeatures: ['dom-overlay'],
        domOverlay: { root: containerRef.current },
      })
      setXrActive(true); return true
    } catch { return false }
  }, [])

  // AR canvas animation
  useEffect(() => {
    if (mode !== 'ar') return
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return

    const MARKERS = [
      { label:'РВС-1', sub:'V=10000 м³ · 72%', x:0.26, y:0.38, color:'#3b82f6' },
      { label:'РВС-2', sub:'V=10000 м³ · 65%', x:0.38, y:0.44, color:'#3b82f6' },
      { label:'РВС-3', sub:'V=15000 м³ · 81%', x:0.50, y:0.40, color:'#3b82f6' },
      { label:'РВС-4 ⚠', sub:'V=10000 м³ · 93%', x:0.30, y:0.56, color:'#ef4444' },
      { label:'НА-1…4', sub:'Q=1455 м³/ч · P=6.84 МПа', x:0.72, y:0.42, color:'#6366f1' },
      { label:'Подпорная НС', sub:'НА-0А в работе', x:0.18, y:0.64, color:'#0ea5e9' },
      { label:'МТ Приема', sub:'Q=962 т/ч', x:0.06, y:0.36, color:'#f59e0b' },
      { label:'МТ Откачки', sub:'P=6.84 МПа', x:0.90, y:0.38, color:'#10b981' },
      { label:'УКЛН-1', sub:'Расход 1124 м³/ч', x:0.62, y:0.55, color:'#10b981' },
      { label:'ФС-1', sub:'Перепад 0.08 МПа', x:0.66, y:0.32, color:'#06b6d4' },
    ]
    let scanY = 0, frame = 0
    const draw = () => {
      canvas.width  = canvas.offsetWidth  || 800
      canvas.height = canvas.offsetHeight || 500
      const W = canvas.width, H = canvas.height
      ctx.clearRect(0, 0, W, H)

      if (!cameraOn) {
        ctx.fillStyle = '#030c17'; ctx.fillRect(0, 0, W, H)
        ctx.strokeStyle = 'rgba(59,130,246,0.07)'
        for (let i=0;i<W;i+=60) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,H); ctx.stroke() }
        for (let i=0;i<H;i+=60) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(W,i); ctx.stroke() }
        ctx.fillStyle='rgba(59,130,246,0.04)'
        for(let i=0;i<W;i+=60) for(let j=0;j<H;j+=60) {
          ctx.beginPath(); ctx.arc(i,j,1.5,0,Math.PI*2); ctx.fill()
        }
      }

      // Scan line
      scanY = (scanY + 1.5) % H
      const sg = ctx.createLinearGradient(0, scanY-30, 0, scanY+30)
      sg.addColorStop(0,'rgba(59,130,246,0)'); sg.addColorStop(.5,'rgba(59,130,246,0.12)'); sg.addColorStop(1,'rgba(59,130,246,0)')
      ctx.fillStyle = sg; ctx.fillRect(0, scanY-30, W, 60)
      frame++

      for (const m of MARKERS) {
        const mx = m.x*W, my = m.y*H
        const pulse = 0.7 + Math.sin(frame*0.05+m.x*10)*0.3
        ctx.beginPath(); ctx.arc(mx,my,20*pulse,0,Math.PI*2)
        ctx.strokeStyle = m.color+'80'; ctx.lineWidth = 1.5; ctx.stroke()
        ctx.beginPath(); ctx.arc(mx,my,6,0,Math.PI*2)
        ctx.fillStyle = m.color; ctx.fill()
        // connector + label box
        const lx = Math.min(W-175, mx+30), ly = my - 28
        ctx.beginPath(); ctx.moveTo(mx,my); ctx.lineTo(mx+15,my-12); ctx.lineTo(lx,ly-2)
        ctx.strokeStyle=m.color+'aa'; ctx.lineWidth=0.8; ctx.stroke()
        ctx.fillStyle='rgba(3,12,23,0.88)'; ctx.strokeStyle=m.color+'55'
        ctx.lineWidth=1; ctx.beginPath(); ctx.roundRect(lx,ly-36,165,38,4); ctx.fill(); ctx.stroke()
        ctx.fillStyle=m.color; ctx.font='bold 10px monospace'; ctx.fillText(m.label, lx+7, ly-22)
        ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.font='8px monospace'; ctx.fillText(m.sub, lx+7, ly-9)
      }

      // HUD corners
      const br=28, mg=16; ctx.strokeStyle='rgba(59,130,246,0.45)'; ctx.lineWidth=2
      ;[[mg,mg,1,1],[W-mg,mg,-1,1],[mg,H-mg,1,-1],[W-mg,H-mg,-1,-1]].forEach(([bx,by,sx,sy]) => {
        ctx.beginPath(); ctx.moveTo(bx,by+sy*br); ctx.lineTo(bx,by); ctx.lineTo(bx+sx*br,by); ctx.stroke()
      })
      ctx.fillStyle='rgba(59,130,246,0.7)'; ctx.font='bold 11px monospace'
      ctx.fillText('AR OVERLAY · НПС КазТрансОйл', mg+35, mg+14)
      ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.font='10px monospace'
      ctx.textAlign='right'; ctx.fillText(new Date().toLocaleTimeString('ru-RU'), W-mg-35, mg+14)
      ctx.textAlign='left'
      rafRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [mode, cameraOn])

  // VR drag controls
  const onMouseDown = (e: React.MouseEvent) => { dragRef.current = {on:true, x:e.clientX, y:e.clientY} }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current.on) return
    setVrRotY(v => v + (e.clientX - dragRef.current.x) * 0.3)
    setVrRotX(v => Math.max(-25, Math.min(10, v - (e.clientY - dragRef.current.y) * 0.2)))
    dragRef.current = {on:true, x:e.clientX, y:e.clientY}
  }
  const onMouseUp = () => { dragRef.current.on = false }

  const btnCls = (active: boolean) =>
    `px-4 py-1.5 rounded-full text-xs font-bold transition-all ${active
      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
      : 'bg-white/10 text-white/60 hover:bg-white/20'}`

  return (
    <div ref={containerRef} className="flex-1 rounded-xl border overflow-hidden relative select-none"
      style={{ background:'#030c17', minHeight: 480 }}>
      {/* Controls bar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full"
        style={{ background:'rgba(3,12,23,0.85)', border:'1px solid rgba(59,130,246,0.25)' }}>
        <button className={btnCls(mode==='ar')} onClick={() => { setMode('ar'); tryWebXR('immersive-ar').then(ok => !ok && startCam()) }}>
          <Camera className="h-3 w-3 inline mr-1" />AR
        </button>
        <button className={btnCls(mode==='vr')} onClick={() => { setMode('vr'); stopCam(); tryWebXR('immersive-vr') }}>
          <Scan className="h-3 w-3 inline mr-1" />VR
        </button>
        <div className="w-px h-4 bg-white/20" />
        <button className="px-3 py-1.5 rounded-full text-xs font-bold text-white/60 hover:text-white bg-white/10 hover:bg-white/20 transition-all"
          onClick={toggleFS} title="Полный экран">
          {isFS ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
        </button>
        {xrActive && <span className="text-xs text-green-400 font-bold">WebXR ●</span>}
      </div>

      {/* AR MODE */}
      {mode === 'ar' && (
        <>
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: cameraOn ? 1 : 0 }} playsInline muted />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
          {!cameraOn && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
              <button onClick={startCam}
                className="px-5 py-2 rounded-full text-sm font-bold text-white"
                style={{ background:'linear-gradient(135deg,#1d4ed8,#2563eb)', boxShadow:'0 0 24px #3b82f640' }}>
                <Camera className="h-4 w-4 inline mr-2" />Включить камеру AR
              </button>
            </div>
          )}
        </>
      )}

      {/* VR MODE */}
      {mode === 'vr' && (
        <div className="w-full h-full flex items-center justify-center"
          style={{ perspective: '900px', perspectiveOrigin:'50% 45%' }}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove}
          onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
          <div style={{
            width:'100%', height:'100%', transformStyle:'preserve-3d',
            transform: `rotateX(${vrRotX}deg) rotateY(${vrRotY}deg)`, transition:'transform 0.05s'
          }}>
            {/* Floor - NPS site */}
            <div style={{
              position:'absolute', width:1200, height:1200,
              left:'50%', top:'50%', marginLeft:-600, marginTop:-300,
              transform:'rotateX(90deg) translateZ(-80px)',
              background:'repeating-linear-gradient(0deg,rgba(59,130,246,0.05) 0,rgba(59,130,246,0.05) 1px,transparent 1px,transparent 60px),repeating-linear-gradient(90deg,rgba(59,130,246,0.05) 0,rgba(59,130,246,0.05) 1px,transparent 1px,transparent 60px),#07121e',
              border:'2px solid rgba(59,130,246,0.2)'
            }}>
              {/* Tanks on floor */}
              {[{l:'РВС-1',x:20,y:35},{l:'РВС-2',x:90,y:35},{l:'РВС-3',x:160,y:35},
                {l:'РВС-4',x:20,y:105},{l:'РВС-5',x:90,y:105}].map(({l,x,y}) => (
                <div key={l} style={{position:'absolute',left:x+350,top:y+280,width:60,height:60,
                  borderRadius:'50%',background:'radial-gradient(circle,#2a5a7a,#0a1e2e)',
                  border:'2px solid #3b82f660',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <span style={{color:'#93c5fd',fontSize:8,fontWeight:700}}>{l}</span>
                </div>
              ))}
              <div style={{position:'absolute',left:650,top:360,width:130,height:190,
                background:'linear-gradient(135deg,#1a1560,#0c0b38)',
                border:'2px solid #6366f160',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <span style={{color:'#a5b4fc',fontSize:9,fontWeight:700}}>НА 1–4</span>
              </div>
            </div>
            {/* Sky sphere */}
            <div style={{
              position:'absolute', width:2000, height:2000,
              left:'50%', top:'50%', marginLeft:-1000, marginTop:-1000,
              background:'radial-gradient(ellipse at 50% 30%,#0d2546,#030c17)',
              transform:'translateZ(-200px)', borderRadius:'50%', opacity:0.9
            }} />
            {/* Front wall with NPS silhouette */}
            {['РЕЗЕРВУАРНЫЙ ПАРК','НАСОСНАЯ СТАНЦИЯ','ДИСПЕТЧЕРСКАЯ','МТ'].map((label,i) => (
              <div key={i} style={{
                position:'absolute', left:'50%', top:'50%',
                marginLeft:-450+i*220, marginTop:-120,
                transform:`translateZ(-700px) translateY(${i%2?0:20}px)`,
                color:'rgba(59,130,246,0.35)', fontSize:11, fontWeight:700,
                fontFamily:'monospace', letterSpacing:2, whiteSpace:'nowrap'
              }}>{label}</div>
            ))}
          </div>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/30 font-mono">
            Перетащите мышью для осмотра территории НПС
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════ MAIN EXPORT ═════ */

export default function TechSchemeKTO() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const navigate = useNavigate()
  const { t, language } = useLanguage()
  const [selected, setSelected] = useState<Equipment | null>(null)
  const [zoom, setZoom] = useState(1)
  const [now, setNow] = useState(new Date())
  const [view, setView] = useState<'pid' | '3d' | 'ar' | 'vr'>('pid')
  const [xrCaps, setXrCaps] = useState<XRCapabilities | null>(null)
  useEffect(() => { detectXR().then(setXrCaps) }, [])

  useEffect(() => { const id = setInterval(() => setNow(new Date()), 15_000); return () => clearInterval(id) }, [])

  const sel = (id: string) => () => setSelected(EQUIPMENT.find(e => e.id === id) ?? null)

  // Navigate from 3D click to P&ID
  const selectFromId = (id: string) => {
    const eq = EQUIPMENT.find(e => e.id === id)
    if (eq) { setSelected(eq); setView('pid') }
  }

  const bg   = isDark ? '#0f172a' : '#f0f4f8'
  const grid = isDark ? '#1e293b' : '#dde4ee'
  const fg   = isDark ? '#e2e8f0' : '#1e293b'
  const pipe = '#3b82f6'
  const cb   = isDark ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.97)'

  // Tank data
  const tanks = [
    { id: 'RVS1', x: 360, pct: 72, st: 'running' as const },
    { id: 'RVS2', x: 520, pct: 65, st: 'running' as const },
    { id: 'RVS3', x: 680, pct: 81, st: 'running' as const },
    { id: 'RVS4', x: 840, pct: 93, st: 'fault' as const },
    { id: 'RVS5', x: 1000, pct: 58, st: 'running' as const },
  ]
  const TANK_Y  = 100   // tank center y
  const TANK_R  = 42    // tank radius — smaller to create breathing room
  const PIPE_Y  = 305   // main header pipe
  const MAN_Y   = 242   // manifold — gap from tank legs = MAN_Y-26-(TANK_Y+TANK_R+12)=60px

  const alarmCount = EQUIPMENT.reduce((s, e) => s + (e.alarms?.length ?? 0), 0)

  const tabCls = (active: boolean) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${active
      ? isDark ? 'bg-blue-600/30 text-blue-300 border border-blue-600/50' : 'bg-blue-100 text-blue-700 border border-blue-300'
      : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5' : 'text-slate-500 hover:text-slate-700 hover:bg-black/5'}`

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-bold">{t('techTitle')}</h1>
          <p className="text-xs text-muted-foreground">{t('techSubtitle')}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className="text-emerald-500 border-emerald-500 text-xs">
            <Activity className="h-3 w-3 mr-1" />3 {t('techNAInWork')}
          </Badge>
          {alarmCount > 0 && (
            <Badge variant="outline" className="text-amber-500 border-amber-500 text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />{alarmCount} {t('techEventsBadge')}
            </Badge>
          )}
          <Badge variant="outline" className="text-indigo-400 border-indigo-400 text-xs">{t('techMaintenanceUnit')}</Badge>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => navigate('/daily-briefing/s-atyrau-gnps')}>
            <FileText className="h-3 w-3 mr-1" />{t('techDailyBriefingBtn')}
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => navigate('/oil-pipeline-map')}>
            <ExternalLink className="h-3 w-3 mr-1" />{t('techPipelineMapBtn')}
          </Button>
        </div>
      </div>

      {/* View tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        <div className="flex items-center gap-1 p-1 rounded-lg"
          style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', border: '1px solid rgba(128,128,128,0.12)' }}>
          <button className={tabCls(view==='pid')} onClick={() => setView('pid')}>
            <Layers className="h-3.5 w-3.5" />{t('techPidScheme')}
          </button>
          <button className={tabCls(view==='3d')} onClick={() => setView('3d')}>
            <Box className="h-3.5 w-3.5" />{t('techScene3D')}
          </button>
        </div>

        {/* AR / VR sub-group */}
        <div className="flex items-center gap-0.5 p-1 rounded-lg"
          style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', border: '1px solid rgba(128,128,128,0.12)' }}>
          <span className="text-[10px] px-1.5" style={{ color: isDark ? '#475569' : '#94a3b8' }}>XR</span>
          <button
            className={tabCls(view==='ar')}
            onClick={() => setView('ar')}
            title={xrCaps && !xrCaps.ar && !xrCaps.camera ? t('techNeedCameraOrAr') : undefined}
          >
            <Camera className="h-3.5 w-3.5" />AR
            {xrCaps?.ar && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />}
          </button>
          <button
            className={tabCls(view==='vr')}
            onClick={() => setView('vr')}
            title={xrCaps && !xrCaps.vr ? t('techNeedHeadset') : undefined}
          >
            <Scan className="h-3.5 w-3.5" />VR
            {xrCaps?.vr && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />}
          </button>
        </div>
      </div>

      {/* 3D View */}
      {view === '3d' && (
        <div key="view-3d" className="flex gap-3 flex-1 min-h-0">
          <NPS3DScene highlighted={selected?.id} isDark={isDark}
            onSelect={selectFromId} onBack={() => setView('pid')} />
          {selected && <SCADAPanel eq={selected} onClose={() => setSelected(null)}
            onView3D={() => setView('3d')} />}
        </div>
      )}

      {/* VR View */}
      {view === 'vr' && (
        <div key="view-vr" className="flex-1 min-h-0 rounded-xl overflow-hidden" style={{ minHeight: 520 }}>
          <Suspense fallback={
            <div className="flex items-center justify-center h-full"
              style={{ background: '#0a0f1a', color: '#475569', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14 }}>
              {t('techVRLoading')}
            </div>
          }>
            <VRModeComponent onExit={() => setView('3d')} />
          </Suspense>
        </div>
      )}

      {/* AR View */}
      {view === 'ar' && (
        <div key="view-ar" className="flex-1 min-h-0 rounded-xl overflow-hidden" style={{ minHeight: 520 }}>
          <Suspense fallback={
            <div className="flex items-center justify-center h-full"
              style={{ background: '#020c18', color: '#475569', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14 }}>
              {t('techARLoading')}
            </div>
          }>
            <ARModeComponent onExit={() => setView('pid')} />
          </Suspense>
        </div>
      )}

      {/* P&ID Content */}
      {view === 'pid' && (<div className="flex gap-3 flex-1 min-h-0">
        {/* SVG */}
        <div className="flex-1 rounded-xl border overflow-auto relative" style={{ background: bg }}>
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
            {[
              { Icon: ZoomIn,    fn: () => setZoom(z => Math.min(z + 0.15, 2)) },
              { Icon: ZoomOut,   fn: () => setZoom(z => Math.max(z - 0.15, 0.5)) },
              { Icon: RotateCcw, fn: () => setZoom(1) },
            ].map(({ Icon, fn }, i) => (
              <Button key={i} size="icon" variant="secondary" className="h-7 w-7 shadow" onClick={fn}>
                <Icon className="h-3.5 w-3.5" />
              </Button>
            ))}
          </div>

          {/*
            Layout (y coordinates, TANK_R=42):
            GAS collector : y=18
            Tank top       : y=TANK_Y-TANK_R = 58
            Tank center    : y=TANK_Y        = 100
            Tank bottom    : y=TANK_Y+TANK_R = 142
            Tank legs      : y=142..154
            ─── 60px gap ───────────────────────
            710 valve      : y=MAN_Y-26=216  (valve spans y=208..224)
            Manifold rect  : y=216..268  (height 52)
            Manifold center: y=MAN_Y=242
            ─── 37px gap ───────────────────────
            PIPE_Y         : y=305
            ─── 80px gap ───────────────────────
            Drain collector: y=385
            Equipment area : y=400..560
            Legend         : y=585
          */}
          <svg
            viewBox="0 0 1480 700"
            style={{ width: '100%', height: '100%', minWidth: 900, color: fg, transform: `scale(${zoom})`, transformOrigin: 'top left' }}
          >
            <style>{`
              .fa { animation: fa 2s linear infinite; }
              @keyframes fa { from { stroke-dashoffset: 20; } to { stroke-dashoffset: 0; } }
            `}</style>
            <defs>
              <marker id="arr-b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth={5} markerHeight={5} orient="auto">
                <path d="M0 0 L10 5 L0 10z" fill={pipe} />
              </marker>
              <marker id="arr-w" viewBox="0 0 10 10" refX="9" refY="5" markerWidth={5} markerHeight={5} orient="auto">
                <path d="M0 0 L10 5 L0 10z" fill={isDark ? '#64748b' : '#94a3b8'} />
              </marker>
            </defs>

            {/* Background & grid */}
            <rect width={1480} height={700} fill={bg} />
            {Array.from({ length: 15 }).map((_, i) => (
              <line key={`gv${i}`} x1={(i + 1) * 100} y1={0} x2={(i + 1) * 100} y2={700} stroke={grid} strokeWidth={0.5} />
            ))}
            {Array.from({ length: 7 }).map((_, i) => (
              <line key={`gh${i}`} x1={0} y1={(i + 1) * 100} x2={1480} y2={(i + 1) * 100} stroke={grid} strokeWidth={0.5} />
            ))}

            {/* ════ GAS COLLECTOR 720 ════ */}
            {/* y=18 is 40px above tank top (y=58) */}
            <line x1={300} y1={18} x2={1060} y2={18}
              stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="9,5" />
            <text x={305} y={13} fontSize={9} fill="#f59e0b" fontWeight={600}>{t('techPidLabelGasCollector')}</text>
            {tanks.map(t => (
              <g key={`gas-${t.id}`}>
                <line x1={t.x} y1={TANK_Y - TANK_R} x2={t.x} y2={18}
                  stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5,3" />
                {/* Огнепреградитель */}
                <rect x={t.x - 5} y={14} width={10} height={10}
                  fill="#f59e0b" fillOpacity={0.3} stroke="#f59e0b" strokeWidth={1} />
              </g>
            ))}

            {/* ════ TANKS ════ */}
            {tanks.map(t => (
              <Tank key={t.id} cx={t.x} cy={TANK_Y} r={TANK_R}
                status={t.st} pct={t.pct} onClick={sel(t.id)} label={t.id.replace('RVS', 'РВС-')} />
            ))}

            {/* ════ 710 PIPES ════ */}
            {/*
              Tank legs bottom = 100+42+12 = 154
              Valve center     = MAN_Y-26  = 216  →  gap = 62px ✓
              710 pipe: y=216 (valve) → y=154 (tank leg) — 62px long, clearly visible
            */}
            {tanks.map(t => (
              <g key={`710-${t.id}`}>
                {/* Valve symbol (gate valve bowtie) at manifold inlet */}
                <polygon points={`${t.x - 9},${MAN_Y - 26 - 9} ${t.x},${MAN_Y - 26} ${t.x - 9},${MAN_Y - 26 + 9}`}
                  fill="#8b5cf6" opacity={0.85} />
                <polygon points={`${t.x + 9},${MAN_Y - 26 - 9} ${t.x},${MAN_Y - 26} ${t.x + 9},${MAN_Y - 26 + 9}`}
                  fill="#8b5cf6" opacity={0.85} />
                {/* 710 pipe */}
                <line x1={t.x} y1={MAN_Y - 26 - 9} x2={t.x} y2={TANK_Y + TANK_R + 12}
                  stroke={isDark ? '#475569' : '#94a3b8'} strokeWidth={3} markerEnd="url(#arr-w)" />
                <text x={t.x + 5} y={MAN_Y - 26 - 9 + (TANK_Y + TANK_R + 12 - (MAN_Y - 26 - 9)) / 2}
                  fontSize={9} fill={isDark ? '#64748b' : '#94a3b8'}>710</text>
              </g>
            ))}

            {/* ════ MANIFOLD BLOCK ════ */}
            {/*
              Manifold rect: y=216..268 (top=MAN_Y-26=216, height=52)
              Gap from tank legs (154) to manifold top (216) = 62px — clearly separated ✓
              Gap from manifold bottom (268) to main pipe (305) = 37px ✓
            */}
            <rect x={310} y={MAN_Y - 26} width={754} height={52} rx={8}
              fill={cb} stroke="#8b5cf6" strokeWidth={2} strokeDasharray="8,4"
              onClick={sel('MB5')} style={{ cursor: 'pointer' }} />
            <text x={687} y={MAN_Y - 7} textAnchor="middle" fontSize={10} fill="#8b5cf6" fontWeight={700}>
              {t('techPidLabelManifold')}
            </text>
            <line x1={330} y1={MAN_Y} x2={1044} y2={MAN_Y}
              stroke="#8b5cf6" strokeWidth={3} />

            {/* Stubs: manifold bottom → main pipe */}
            {tanks.map(t => (
              <line key={`pm-${t.id}`} x1={t.x} y1={MAN_Y + 26} x2={t.x} y2={PIPE_Y}
                stroke={pipe} strokeWidth={4} />
            ))}

            {/* ════ ФС-1 — above pipe ════ */}
            {/* Block bottom = PIPE_Y-8=297, pipe passes underneath */}
            <Block x={48} y={PIPE_Y - 64} w={110} h={56} color="#0ea5e9" label="ФС-1" subLabel={t('techBlockFilterSep')}
              onClick={sel('FS1')} />
            {/* Stub connecting block bottom to pipe */}
            <line x1={103} y1={PIPE_Y - 8} x2={103} y2={PIPE_Y} stroke="#0ea5e9" strokeWidth={2} opacity={0.7} />

            {/* ════ УКЛН-1 — above pipe ════ */}
            {/* Block bottom = PIPE_Y-8=297 */}
            <Block x={182} y={PIPE_Y - 76} w={120} h={68} color="#10b981" label="УКЛН-1" subLabel={t('techBlockReceiveMeter')}
              onClick={sel('UKLN1')} />
            {/* Coloured pipe span below УКЛН-1 */}
            <line x1={182} y1={PIPE_Y} x2={302} y2={PIPE_Y} stroke="#10b981" strokeWidth={2} opacity={0.6} />

            {/* ════ УКЛН-2 — above pipe, to the RIGHT of pump station ════ */}
            {/* Main pump station ends at x=1340; УКЛН-2 starts at x=1355 — no overlap ✓ */}
            <Block x={1355} y={PIPE_Y - 76} w={115} h={68} color="#10b981" label="УКЛН-2" subLabel={t('techBlockDispatchMeter')}
              onClick={sel('UKLN2')} />
            <line x1={1355} y1={PIPE_Y} x2={1470} y2={PIPE_Y} stroke="#10b981" strokeWidth={2} opacity={0.6} />

            {/* ════ MAIN HEADER PIPE ════ */}
            <line x1={25} y1={PIPE_Y} x2={1340} y2={PIPE_Y}
              stroke={pipe} strokeWidth={8} markerEnd="url(#arr-b)" />
            <line x1={25} y1={PIPE_Y} x2={1320} y2={PIPE_Y}
              stroke="#fff" strokeWidth={2} strokeDasharray="12,12" opacity={0.2} className="fa" />
            {/* Direction labels BELOW the pipe so they don't clash with blocks above */}
            <text x={28} y={PIPE_Y + 18} fontSize={11} fill={pipe} fontWeight={700}>{t('techPidLabelMTReceive')}</text>
            <text x={1090} y={PIPE_Y + 18} fontSize={11} fill={pipe} fontWeight={700}>{t('techPidLabelMTSend')}</text>

            {/* ════ DRAIN COLLECTOR 760 ════ */}
            {/* y=385: 80px below pipe, 15px above equipment blocks at y=400 */}
            <line x1={310} y1={385} x2={1070} y2={385}
              stroke={isDark ? '#334155' : '#94a3b8'} strokeWidth={1.5} strokeDasharray="7,5" />
            <text x={315} y={400} fontSize={9} fill={isDark ? '#475569' : '#94a3b8'} fontWeight={600}>{t('techPidLabelDrainCollector')}</text>

            {/* ════ BOOSTER PUMP STATION ════ */}
            {/* x=340-530, y=415-565 — 110px below main pipe, clear of all other elements */}
            <rect x={340} y={415} width={190} height={150} rx={9}
              fill={cb} stroke="#0ea5e9" strokeWidth={2}
              onClick={sel('NA0A')} style={{ cursor: 'pointer' }} />
            <text x={435} y={433} textAnchor="middle" fontSize={11} fill="#0ea5e9" fontWeight={700}>{t('techPidLabelBoosterPS')}</text>
            <Pump cx={396} cy={480} r={22} status="running"  onClick={sel('NA0A')} label="НА-0А" />
            <Pump cx={474} cy={480} r={22} status="standby"  onClick={sel('NA0B')} label="НА-0Б" />
            {/* Inlet (suction from pipe) */}
            <line x1={396} y1={PIPE_Y} x2={396} y2={458} stroke={pipe} strokeWidth={3} strokeDasharray="4,3" />
            <line x1={474} y1={PIPE_Y} x2={474} y2={458} stroke={pipe} strokeWidth={3} strokeDasharray="4,3" />
            {/* Outlet (discharge to pipe, shown looping back) */}
            <line x1={396} y1={502} x2={396} y2={PIPE_Y + 26} stroke={pipe} strokeWidth={3} />
            <line x1={474} y1={502} x2={474} y2={PIPE_Y + 26} stroke={pipe} strokeWidth={3} />

            {/* ════ DRAIN BLOCK ════ */}
            {/* x=565-755, y=415-565 — 35px gap from booster station (x=530) */}
            <rect x={565} y={415} width={190} height={150} rx={9}
              fill={cb} stroke="#64748b" strokeWidth={2}
              onClick={sel('DB6')} style={{ cursor: 'pointer' }} />
            <text x={660} y={433} textAnchor="middle" fontSize={10} fill="#64748b" fontWeight={700}>{t('techPidLabelDrainBlock')}</text>
            <circle cx={608} cy={480} r={22} fill="#f59e0b" fillOpacity={0.1} stroke="#f59e0b" strokeWidth={1.5} />
            <text x={608} y={476} textAnchor="middle" fontSize={9}  fill="#f59e0b">601</text>
            <text x={608} y={488} textAnchor="middle" fontSize={8}  fill="#f59e0b">{t('techPidGasOilLabel')}</text>
            <circle cx={675} cy={480} r={22} fill="#64748b" fillOpacity={0.1} stroke="#64748b" strokeWidth={1.5} />
            <text x={675} y={476} textAnchor="middle" fontSize={9}  fill="#64748b">602</text>
            <text x={675} y={488} textAnchor="middle" fontSize={8}  fill="#64748b">{t('techPidOilLabel')}</text>
            <circle cx={735} cy={482} r={13} fill="#64748b" fillOpacity={0.2} stroke="#64748b" strokeWidth={1.2} />
            <text x={735} y={486} textAnchor="middle" fontSize={8}  fill="#64748b">621</text>
            {/* Drain collector → drain block */}
            <line x1={645} y1={385} x2={645} y2={415}
              stroke={isDark ? '#334155' : '#94a3b8'} strokeWidth={2} />
            {/* 610 line → РВС */}
            <line x1={755} y1={470} x2={858} y2={470} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5,3" />
            <line x1={858} y1={470} x2={858} y2={385} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5,3" />
            <text x={800} y={462} textAnchor="middle" fontSize={9} fill="#94a3b8">{t('techPidLabelTo610Tank')}</text>

            {/* ════ MAIN PUMP STATION ════ */}
            {/*
              x=1050-1340, y=348-565
              Starts 43px below main pipe (y=305) ✓
              Pumps at cx=1090,1167,1244,1321 (77px spacing)
              УКЛН-2 at x=1355 has a 15px gap from station right edge (1340) ✓
            */}
            <rect x={1050} y={348} width={290} height={217} rx={9}
              fill={cb} stroke="#6366f1" strokeWidth={2.5}
              onClick={sel('NA1')} style={{ cursor: 'pointer' }} />
            <text x={1195} y={367} textAnchor="middle" fontSize={12} fill="#6366f1" fontWeight={700}>
              {t('techPidLabelMainPS')}
            </text>
            <Pump cx={1090} cy={430} r={24} status="running"      onClick={sel('NA1')} label="НА-1" />
            <Pump cx={1167} cy={430} r={24} status="running"      onClick={sel('NA2')} label="НА-2" />
            <Pump cx={1244} cy={430} r={24} status="running"      onClick={sel('NA3')} label="НА-3" />
            <Pump cx={1321} cy={430} r={24} status="maintenance"  onClick={sel('NA4')} label="НА-4" />
            {/* Suction / discharge connections — all cx values are between 1050 and 1340, no overlap with УКЛН-2 */}
            {[1090, 1167, 1244, 1321].map(cx => (
              <g key={cx}>
                <line x1={cx} y1={PIPE_Y} x2={cx} y2={406} stroke="#6366f1" strokeWidth={2.5} strokeDasharray="5,3" />
                <line x1={cx} y1={454} x2={cx} y2={PIPE_Y + 26} stroke="#6366f1" strokeWidth={2.5} />
              </g>
            ))}
            <line x1={1074} y1={530} x2={1336} y2={530} stroke="#6366f1" strokeWidth={2} strokeDasharray="4,2" />

            {/* ════ LEGEND ════ */}
            <rect x={50} y={590} width={390} height={68} rx={8}
              fill={cb} stroke={grid} strokeWidth={1} />
            <text x={68} y={607} fontSize={10} fill={fg} fontWeight={700}>{t('techPidLegendTitle')}</text>
            {[
              { x: 68,  c: '#10b981', l: t('techPidStatusRunning') },
              { x: 160, c: '#6366f1', l: t('techPidStatusStandby') },
              { x: 232, c: '#f59e0b', l: t('techPidStatusFault') },
              { x: 358, c: '#94a3b8', l: t('techPidStatusMaintenance') },
            ].map(({ x, c, l }) => (
              <g key={l}>
                <circle cx={x} cy={623} r={6} fill={c} />
                <text x={x + 10} y={627} fontSize={9} fill={fg}>{l}</text>
              </g>
            ))}
            <line x1={68} y1={645} x2={108} y2={645} stroke={pipe} strokeWidth={5} />
            <text x={116} y={649} fontSize={9} fill={fg}>{t('techPidPipeMain')}</text>
            <line x1={275} y1={645} x2={315} y2={645} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="8,4" />
            <text x={323} y={649} fontSize={9} fill={fg}>{t('techPidPipeGas')}</text>
          </svg>
        </div>

        {/* SCADA panel */}
          {selected && <SCADAPanel eq={selected} onClose={() => setSelected(null)}
            onView3D={() => setView('3d')} />}
        </div>
        )}

      {/* Status bar — P&ID only */}
      {view === 'pid' && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground border-t pt-2 flex-wrap">
          <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" />{t('techStatusSCADAOk')}</span>
          <span>{t('techStatusPipePressure')}: <span className="font-medium text-foreground">6.84 МПа</span></span>
          <span>{t('techStatusTotalFlow')}: <span className="font-medium text-foreground">1 455 м³/ч</span></span>
          <span>{t('techStatusTankFarm')}: <span className="font-medium text-foreground">37 600 / 50 000 м³ (75.2%)</span></span>
          <span>{t('techStatusPumpsRunningSummary')}</span>
          <span className="ml-auto">{t('techStatusUpdated')}: {now.toLocaleTimeString(language === 'en' ? 'en-GB' : 'ru-RU')}</span>
        </div>
      )}
    </div>
  )
}

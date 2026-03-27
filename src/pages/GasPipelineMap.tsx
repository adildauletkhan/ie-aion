import { useState, useEffect, useCallback } from 'react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/hooks/useTheme'
import {
  Wind, Gauge, Activity, X, MapPin,
  AlertTriangle, Wrench, ArrowRight,
  BarChart3, Navigation, Flame, Zap,
} from 'lucide-react'
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'

const GEO_URL = '/kz-regions.json'
const W = 960, H = 540

/* ── Mercator projection matching react-simple-maps config ─────────────────── */
const YOFFSET = 270 + 1350 * Math.log(Math.tan(Math.PI / 4 + (48.5 * Math.PI) / 360))
function mp(lon: number, lat: number): [number, number] {
  const x = 1350 * ((lon - 68) * Math.PI) / 180 + W / 2
  const y = -1350 * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) + YOFFSET
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10]
}

/* ── Types ──────────────────────────────────────────────────────────────────── */
type Status = 'ok' | 'warn' | 'maint' | 'build'

interface CS {
  id: string; name: string; lon: number; lat: number
  pressure_in: number; pressure_out: number
  volume: number; comp_active: number; comp_total: number
  load_pct: number; status: 'ok' | 'warn' | 'maint'
  route_id: string; ch4_pct: number; h2s_ppm: number
  throughput_ytd: number; temp: number
}

interface GasRoute {
  id: string; name: string; shortName: string
  type: 'transit' | 'domestic' | 'construction'
  color: string; waypoints: [number, number][]
  length: number; volume: number; capacity: number
  pressure: number; status: Status
  owner: string; year: string; description: string
  dest_from: string; dest_to: string
}

/* ── Route definitions ──────────────────────────────────────────────────────── */
const ROUTES: GasRoute[] = [
  {
    id: 'cac',
    name: 'Средняя Азия — Центр (CAC 1–4)',
    shortName: 'CAC',
    type: 'transit', color: '#6366f1',
    waypoints: [
      mp(57.5, 38.8), mp(56.0, 41.5), mp(54.5, 44.2),
      mp(51.9, 47.1), mp(52.5, 49.5), mp(52.0, 51.5), mp(52.8, 53.5),
    ],
    length: 3750, volume: 45.2, capacity: 55.0, pressure: 5.6, status: 'ok',
    owner: 'ИЦА (QazaqGas)', year: '1967–1974',
    dest_from: 'Туркменистан / Узбекистан', dest_to: 'Россия (ОГП)',
    description: '4 нитки советского трубопровода. Транзит туркменского и узбекского газа через Казахстан в Россию. Оператор — Интергаз Центральная Азия (ИЦА), 100% дочернее предприятие QazaqGas.',
  },
  {
    id: 'kz-china',
    name: 'Казахстан — Китай (CAG)',
    shortName: 'КЗ-КНР',
    type: 'transit', color: '#dc2626',
    waypoints: [
      mp(63.5, 38.0), mp(65.0, 40.5), mp(69.6, 42.3),
      mp(73.0, 43.5), mp(77.0, 44.0), mp(82.3, 45.2),
    ],
    length: 1475, volume: 18.3, capacity: 55.0, pressure: 5.4, status: 'ok',
    owner: 'QazaqGas / CNPC', year: '2009',
    dest_from: 'Туркменистан / Узбекистан', dest_to: 'Алашанькоу (КНР)',
    description: 'Центральноазиатский газопровод (CAG). Трансказахстанский участок: 3 нитки (A, B, C) с суммарной проектной мощностью 55 млрд м³/год.',
  },
  {
    id: 'bbs',
    name: 'Бейнеу — Бозой — Шымкент',
    shortName: 'ББШ',
    type: 'domestic', color: '#0d9488',
    waypoints: [
      mp(55.2, 45.3), mp(60.0, 45.8), mp(62.2, 45.8),
      mp(65.5, 44.9), mp(68.0, 43.8), mp(69.6, 42.3),
    ],
    length: 2175, volume: 8.1, capacity: 15.0, pressure: 5.2, status: 'ok',
    owner: 'QazaqGas', year: '2013',
    dest_from: 'Бейнеу (Мангыстауская обл.)', dest_to: 'Шымкент',
    description: 'Газификация западных и южных регионов РК. Введена в 2013–2015 гг. Подаёт газ западных месторождений (Карачаганак, Тенгиз) потребителям юга страны.',
  },
  {
    id: 'saryarka',
    name: 'Сарыарка (Кокшетау — Темиртау)',
    shortName: 'Сарыарка',
    type: 'construction', color: '#f59e0b',
    waypoints: [
      mp(69.5, 53.0), mp(71.5, 51.2), mp(73.1, 50.4),
      mp(72.0, 49.5), mp(71.7, 48.5),
    ],
    length: 1062, volume: 0, capacity: 6.0, pressure: 0, status: 'build',
    owner: 'QazaqGas', year: '2026 (план)',
    dest_from: 'Кокшетау', dest_to: 'Темиртау / Жезказган',
    description: 'Строительство завершено на 62%. Подача газа центральным регионам Казахстана, не имеющим доступа к газоснабжению. Финансирование — государственная программа.',
  },
  {
    id: 'domestic-south',
    name: 'Распределительные сети Юг–Центр',
    shortName: 'Распр.',
    type: 'domestic', color: '#10b981',
    waypoints: [
      mp(69.6, 42.3), mp(71.0, 43.5), mp(72.5, 44.5),
      mp(71.7, 48.5), mp(73.1, 49.8),
    ],
    length: 4200, volume: 12.1, capacity: 20.0, pressure: 4.8, status: 'ok',
    owner: 'QazaqGas Аймак', year: '1980-е',
    dest_from: 'Шымкент', dest_to: 'Кaраганда / Нур-Султан',
    description: 'Распределительные сети центральных и южных регионов. Управление — АО «КазТрансГаз Аймак» (100% QazaqGas). Обслуживает более 2.8 млн абонентов.',
  },
]

/* ── Compressor stations ────────────────────────────────────────────────────── */
const BASE_STATIONS: CS[] = [
  { id: 'cs1', name: 'КС Бейнеу', lon: 55.2, lat: 45.3, pressure_in: 3.4, pressure_out: 5.6, volume: 45.2, comp_active: 6, comp_total: 7, load_pct: 86, status: 'ok', route_id: 'cac', ch4_pct: 98.1, h2s_ppm: 1.2, throughput_ytd: 23.1, temp: -2 },
  { id: 'cs2', name: 'КС Алтай', lon: 52.0, lat: 49.5, pressure_in: 2.8, pressure_out: 5.4, volume: 43.1, comp_active: 5, comp_total: 6, load_pct: 83, status: 'ok', route_id: 'cac', ch4_pct: 97.8, h2s_ppm: 0.9, throughput_ytd: 22.0, temp: -8 },
  { id: 'cs3', name: 'КС Шымкент', lon: 69.6, lat: 42.3, pressure_in: 3.1, pressure_out: 5.4, volume: 18.3, comp_active: 4, comp_total: 5, load_pct: 79, status: 'ok', route_id: 'kz-china', ch4_pct: 97.4, h2s_ppm: 2.1, throughput_ytd: 9.3, temp: 4 },
  { id: 'cs4', name: 'КС Алматы', lon: 76.9, lat: 43.3, pressure_in: 2.4, pressure_out: 5.1, volume: 17.8, comp_active: 3, comp_total: 4, load_pct: 74, status: 'warn', route_id: 'kz-china', ch4_pct: 97.1, h2s_ppm: 2.4, throughput_ytd: 9.0, temp: 1 },
  { id: 'cs5', name: 'КС Бозой', lon: 62.2, lat: 45.8, pressure_in: 2.9, pressure_out: 5.2, volume: 8.1, comp_active: 3, comp_total: 4, load_pct: 81, status: 'ok', route_id: 'bbs', ch4_pct: 98.4, h2s_ppm: 0.7, throughput_ytd: 4.1, temp: -3 },
  { id: 'cs6', name: 'КС Кызылорда', lon: 65.5, lat: 44.9, pressure_in: 2.2, pressure_out: 5.0, volume: 7.8, comp_active: 2, comp_total: 3, load_pct: 73, status: 'ok', route_id: 'bbs', ch4_pct: 98.0, h2s_ppm: 0.8, throughput_ytd: 3.9, temp: 0 },
  { id: 'cs7', name: 'КС Жезказган', lon: 67.7, lat: 47.8, pressure_in: 2.6, pressure_out: 4.8, volume: 12.1, comp_active: 3, comp_total: 4, load_pct: 76, status: 'maint', route_id: 'domestic-south', ch4_pct: 97.6, h2s_ppm: 1.5, throughput_ytd: 6.2, temp: -5 },
  { id: 'cs8', name: 'КС Нур-Султан', lon: 71.5, lat: 51.2, pressure_in: 1.8, pressure_out: 4.5, volume: 11.4, comp_active: 2, comp_total: 3, load_pct: 68, status: 'ok', route_id: 'domestic-south', ch4_pct: 97.9, h2s_ppm: 1.1, throughput_ytd: 5.8, temp: -14 },
]

const STATUS_COLOR: Record<'ok' | 'warn' | 'maint', string> = { ok: '#22c55e', warn: '#f59e0b', maint: '#6366f1' }
const STATUS_LABEL: Record<'ok' | 'warn' | 'maint', string> = { ok: 'В работе', warn: 'Внимание', maint: 'ТО' }

/* ── Historical volume data ─────────────────────────────────────────────────── */
const VOLUME_HISTORY = [
  { month: 'Янв', cac: 44.1, kzkn: 17.2, bbs: 7.4, total: 68.7 },
  { month: 'Фев', cac: 43.8, kzkn: 17.8, bbs: 7.6, total: 69.2 },
  { month: 'Мар', cac: 44.6, kzkn: 18.0, bbs: 7.9, total: 70.5 },
  { month: 'Апр', cac: 45.0, kzkn: 18.1, bbs: 8.0, total: 71.1 },
  { month: 'Май', cac: 45.3, kzkn: 18.3, bbs: 8.1, total: 71.7 },
  { month: 'Июн', cac: 45.2, kzkn: 18.3, bbs: 8.1, total: 71.6 },
]

const PRESSURE_HISTORY = [
  { h: '06:00', cac: 5.58, kzkn: 5.41, bbs: 5.18 },
  { h: '08:00', cac: 5.62, kzkn: 5.44, bbs: 5.22 },
  { h: '10:00', cac: 5.60, kzkn: 5.40, bbs: 5.20 },
  { h: '12:00', cac: 5.55, kzkn: 5.38, bbs: 5.17 },
  { h: '14:00', cac: 5.57, kzkn: 5.42, bbs: 5.21 },
  { h: '16:00', cac: 5.63, kzkn: 5.45, bbs: 5.24 },
  { h: '18:00', cac: 5.61, kzkn: 5.43, bbs: 5.22 },
  { h: '20:00', cac: 5.59, kzkn: 5.40, bbs: 5.19 },
]

/* ═══════════════════════════════════════════════════════════════════════════════
   Component
═══════════════════════════════════════════════════════════════════════════════ */
export default function GasPipelineMap() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [selectedRoute, setSelectedRoute] = useState<GasRoute | null>(null)
  const [selectedStation, setSelectedStation] = useState<CS | null>(null)
  const [stations, setStations] = useState<CS[]>(BASE_STATIONS)
  const [tick, setTick] = useState(0)
  const [filterType, setFilterType] = useState<'all' | 'transit' | 'domestic'>('all')

  /* Simulate live sensor updates every 4 seconds */
  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1)
      setStations((prev) =>
        prev.map((s) => ({
          ...s,
          volume: +(s.volume + (Math.random() - 0.5) * 0.3).toFixed(2),
          pressure_out: +(s.pressure_out + (Math.random() - 0.5) * 0.08).toFixed(2),
          load_pct: Math.min(99, Math.max(55, s.load_pct + Math.round((Math.random() - 0.5) * 3))),
          temp: Math.round(s.temp + (Math.random() - 0.5) * 1.5),
        }))
      )
    }, 4000)
    return () => clearInterval(id)
  }, [])

  const closePanel = useCallback(() => {
    setSelectedRoute(null)
    setSelectedStation(null)
  }, [])

  const palette = isDark ? {
    ocean: '#0a1225', base: '#152040', hover: '#1c2e5a', stroke: '#818cf8', border: 'rgba(129,140,248,0.2)',
    text: '#e0e8f8', muted: 'rgba(140,160,200,0.55)',
  } : {
    ocean: '#c8d8ec', base: '#d4e8f4', hover: '#b4d4e8', stroke: '#4f46e5', border: 'rgba(79,70,229,0.25)',
    text: '#1e1a5e', muted: 'rgba(40,50,100,0.40)',
  }

  const visibleRoutes = ROUTES.filter((r) =>
    filterType === 'all' ||
    (filterType === 'transit' && r.type === 'transit') ||
    (filterType === 'domestic' && (r.type === 'domestic' || r.type === 'construction'))
  )

  const totalVolume = ROUTES.filter(r => r.type !== 'construction').reduce((s, r) => s + r.volume, 0)
  const transitVolume = ROUTES.filter(r => r.type === 'transit').reduce((s, r) => s + r.volume, 0)
  const csOk = stations.filter(s => s.status === 'ok').length

  return (
    <div className="flex flex-col gap-4 p-4 min-h-screen">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Wind className="h-5 w-5 text-indigo-500" />
            Карта газопроводов — QazaqGas / ИЦА
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Интерактивная карта — нажмите на газопровод или КС
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground mr-1">Фильтр</span>
          {(['all', 'transit', 'domestic'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className="px-3 py-1 rounded-full text-xs font-medium border transition-all"
              style={{
                background: filterType === t ? (isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.12)') : 'transparent',
                borderColor: filterType === t ? '#6366f1' : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'),
                color: filterType === t ? '#6366f1' : undefined,
              }}
            >
              {t === 'all' ? 'Все' : t === 'transit' ? 'Транзит' : 'Внутренние'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Общий объём', value: `${totalVolume.toFixed(1)} млрд м³/год`, icon: Wind, color: '#6366f1' },
          { label: 'Транзитный объём', value: `${transitVolume.toFixed(1)} млрд м³/год`, icon: ArrowRight, color: '#dc2626' },
          { label: 'Протяжённость', value: '13 652 км', icon: Navigation, color: '#0d9488' },
          { label: 'КС в работе', value: `${csOk}/${stations.length}`, icon: Gauge, color: '#22c55e' },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border p-3"
            style={{ borderColor: `${k.color}30`, background: isDark ? `${k.color}0a` : `${k.color}07` }}>
            <div className="flex items-center gap-2 mb-1">
              <k.icon className="h-3.5 w-3.5" style={{ color: k.color }} />
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{k.label}</span>
            </div>
            <p className="text-base font-bold" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Map + Side panel */}
      <div className="flex gap-4" style={{ minHeight: 540 }}>

        {/* Map */}
        <div className="flex-1 rounded-2xl border overflow-hidden relative"
          style={{ borderColor: palette.border, boxShadow: isDark ? '0 0 40px rgba(99,102,241,0.06) inset' : '0 4px 24px rgba(0,0,0,0.08)' }}>

          {/* Live badge */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold"
            style={{ background: isDark ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.85)', color: '#22c55e', backdropFilter: 'blur(8px)' }}>
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            LIVE · {tick > 0 ? `обновл. ${tick * 4}с назад` : 'только что'}
          </div>

          <ComposableMap
            projection="geoMercator"
            projectionConfig={{ center: [68, 48.5], scale: 1350 }}
            width={W} height={H}
            style={{ width: '100%', height: 'auto', display: 'block', background: palette.ocean }}
          >
            {/* Layer 1: clickable regions */}
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography key={geo.rsmKey} geography={geo}
                    fill={palette.base} stroke="none"
                    style={{
                      default: { outline: 'none', fill: palette.base, transition: 'fill 0.15s' },
                      hover: { outline: 'none', fill: palette.hover },
                      pressed: { outline: 'none', fill: palette.hover },
                    }}
                  />
                ))
              }
            </Geographies>

            {/* Layer 2: non-interactive overlays */}
            <g pointerEvents="none">
              {/* Region borders */}
              <Geographies geography={GEO_URL}>
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography key={`b-${geo.rsmKey}`} geography={geo}
                      fill="none" stroke={palette.stroke} strokeWidth={0.7}
                      style={{ default: { outline: 'none' }, hover: { outline: 'none' }, pressed: { outline: 'none' } }}
                    />
                  ))
                }
              </Geographies>

              {/* Pipeline shadows */}
              {visibleRoutes.map((r) => (
                <polyline
                  key={`shadow-${r.id}`}
                  points={r.waypoints.map((p) => p.join(',')).join(' ')}
                  fill="none" stroke={r.color} strokeWidth={10}
                  strokeOpacity={isDark ? 0.10 : 0.08}
                  strokeLinecap="round" strokeLinejoin="round"
                />
              ))}

              {/* Pipeline base */}
              {visibleRoutes.map((r) => (
                <polyline
                  key={`base-${r.id}`}
                  points={r.waypoints.map((p) => p.join(',')).join(' ')}
                  fill="none" stroke={r.color}
                  strokeWidth={r.status === 'build' ? 2.5 : 3}
                  strokeOpacity={r.status === 'build' ? 0.45 : 0.82}
                  strokeLinecap="round" strokeLinejoin="round"
                  strokeDasharray={r.status === 'build' ? '7 5' : undefined}
                />
              ))}

              {/* Animated flow particles */}
              {visibleRoutes.filter((r) => r.status !== 'build').map((r) => (
                <polyline
                  key={`flow-${r.id}`}
                  points={r.waypoints.map((p) => p.join(',')).join(' ')}
                  fill="none" stroke={r.color}
                  strokeWidth={2.5} strokeOpacity={0.88}
                  strokeLinecap="round" strokeLinejoin="round"
                  strokeDasharray="8 30"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="0" to="-38"
                    dur={`${2.2 - r.volume / 45}s`}
                    repeatCount="indefinite"
                  />
                </polyline>
              ))}

              {/* Construction progress indicator */}
              {visibleRoutes.filter((r) => r.status === 'build').map((r) => (
                <polyline
                  key={`build-${r.id}`}
                  points={r.waypoints.slice(0, Math.ceil(r.waypoints.length * 0.62)).map((p) => p.join(',')).join(' ')}
                  fill="none" stroke={r.color}
                  strokeWidth={4} strokeOpacity={0.70}
                  strokeLinecap="round" strokeLinejoin="round"
                  strokeDasharray="12 4"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="0" to="-16"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </polyline>
              ))}

              {/* Station circles */}
              {stations.map((s) => {
                const [sx, sy] = mp(s.lon, s.lat)
                const sc = STATUS_COLOR[s.status]
                return (
                  <g key={`st-${s.id}`}>
                    <circle cx={sx} cy={sy} r={8} fill={sc} fillOpacity={0.12} />
                    <circle cx={sx} cy={sy} r={5} fill={sc} fillOpacity={0.30} />
                    <circle cx={sx} cy={sy} r={3.5} fill={sc} stroke={isDark ? '#0a1225' : '#fff'} strokeWidth={1} />
                  </g>
                )
              })}

              {/* Route labels */}
              {visibleRoutes.map((r) => {
                const mid = r.waypoints[Math.floor(r.waypoints.length / 2)]
                return (
                  <g key={`lbl-${r.id}`}>
                    <rect x={mid[0] - 18} y={mid[1] - 10} width={36} height={13} rx={4}
                      fill={r.color} fillOpacity={r.status === 'build' ? 0.60 : 0.88} />
                    {r.status === 'build' && (
                      <rect x={mid[0] - 18} y={mid[1] - 10} width={36} height={13} rx={4}
                        fill="none" stroke="#fff" strokeWidth={0.5} strokeOpacity={0.5} strokeDasharray="4 4" />
                    )}
                    <text x={mid[0]} y={mid[1] + 1.5} textAnchor="middle"
                      style={{ fontSize: 7, fill: '#fff', fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>
                      {r.shortName}
                    </text>
                  </g>
                )
              })}

              {/* Neighbor labels */}
              {([
                ['РОССИЯ', [67.0, 56.5]],
                ['КИТАЙ', [85.0, 46.5]],
                ['КИРГИЗИЯ', [75.5, 40.5]],
                ['УЗБЕКИСТАН', [63.0, 40.2]],
                ['ТУРКМЕНИЯ', [55.0, 39.8]],
              ] as [string, [number, number]][]).map(([name, [lon, lat]]) => {
                const [nx, ny] = mp(lon, lat)
                return (
                  <text key={name} x={nx} y={ny} textAnchor="middle"
                    style={{ fontSize: 8.5, fill: palette.muted, fontFamily: 'Inter, sans-serif', fontWeight: 500, letterSpacing: 1.5 }}>
                    {name}
                  </text>
                )
              })}
            </g>

            {/* Interactive pipeline click zones */}
            {visibleRoutes.map((r) => (
              <polyline
                key={`click-${r.id}`}
                points={r.waypoints.map((p) => p.join(',')).join(' ')}
                fill="none" stroke="transparent" strokeWidth={18}
                style={{ cursor: 'pointer' }}
                onClick={() => { setSelectedStation(null); setSelectedRoute(r) }}
              />
            ))}

            {/* Interactive station click zones */}
            {stations.map((s) => {
              const [sx, sy] = mp(s.lon, s.lat)
              return (
                <circle key={`click-st-${s.id}`}
                  cx={sx} cy={sy} r={12}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onClick={() => { setSelectedRoute(null); setSelectedStation(s) }}
                />
              )
            })}
          </ComposableMap>

          {/* Legend */}
          <div className="absolute bottom-3 left-3 rounded-lg px-3 py-2"
            style={{ background: isDark ? 'rgba(0,0,0,0.72)' : 'rgba(255,255,255,0.90)', backdropFilter: 'blur(8px)' }}>
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5 font-semibold">Легенда</p>
            <div className="space-y-1">
              {ROUTES.map((r) => (
                <div key={r.id} className="flex items-center gap-1.5">
                  <span className="h-0.5 w-6 rounded-full" style={{
                    background: r.color,
                    opacity: r.status === 'build' ? 0.5 : 1,
                    borderTop: r.status === 'build' ? `1px dashed ${r.color}` : undefined,
                  }} />
                  <span className="text-[9px]" style={{ color: isDark ? '#c0d0e8' : '#2a3060' }}>
                    {r.shortName}
                    {r.status === 'build' ? ' · Строительство' : ` · ${r.volume} млрд м³`}
                  </span>
                </div>
              ))}
              <div className="border-t mt-1 pt-1" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                {[
                  { color: '#22c55e', label: 'КС — норма' },
                  { color: '#f59e0b', label: 'КС — внимание' },
                  { color: '#6366f1', label: 'КС — ТО' },
                ].map((l) => (
                  <div key={l.color} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
                    <span className="text-[9px]" style={{ color: isDark ? '#c0d0e8' : '#2a3060' }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Side panel */}
        {(selectedRoute || selectedStation) && (
          <div className="w-80 rounded-2xl border flex flex-col gap-0 overflow-hidden"
            style={{ borderColor: palette.border }}>
            <div className="flex items-start justify-between gap-2 p-4 pb-3 border-b"
              style={{ borderColor: palette.border, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold leading-snug pr-2">
                  {selectedRoute ? selectedRoute.name : selectedStation?.name}
                </p>
                {selectedRoute && (
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    <Badge variant="outline" className="text-[9px]"
                      style={{ borderColor: selectedRoute.color, color: selectedRoute.color }}>
                      {selectedRoute.shortName}
                    </Badge>
                    <Badge variant="outline" className="text-[9px]">
                      {selectedRoute.type === 'transit' ? 'Транзит' : selectedRoute.type === 'construction' ? 'Строительство' : 'Внутренний'}
                    </Badge>
                  </div>
                )}
                {selectedStation && (
                  <div className="flex gap-1.5 mt-1.5">
                    <Badge className="text-[9px]" style={{ background: STATUS_COLOR[selectedStation.status], color: '#fff' }}>
                      {STATUS_LABEL[selectedStation.status]}
                    </Badge>
                    <Badge variant="outline" className="text-[9px]">КС</Badge>
                  </div>
                )}
              </div>
              <button onClick={closePanel} className="shrink-0 rounded-lg p-1 hover:bg-muted transition-colors">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">

              {/* Route detail */}
              {selectedRoute && (
                <>
                  {selectedRoute.status === 'build' && (
                    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 flex items-start gap-2">
                      <Wrench className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-amber-400 leading-relaxed">
                        В стадии строительства. Готовность: <b>62%</b>. Плановый ввод в эксплуатацию — <b>2026 г.</b>
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Объём', value: selectedRoute.status === 'build' ? '— (строит.)' : `${selectedRoute.volume} млрд м³`, color: selectedRoute.color },
                      { label: 'Мощность', value: `${selectedRoute.capacity} млрд м³`, color: '#6b7280' },
                      { label: 'Давление', value: selectedRoute.status === 'build' ? '—' : `${selectedRoute.pressure} МПа`, color: '#3b82f6' },
                      { label: 'Протяжённость', value: `${selectedRoute.length.toLocaleString()} км`, color: '#8b5cf6' },
                    ].map((m) => (
                      <div key={m.label} className="rounded-lg border p-2.5"
                        style={{ borderColor: `${m.color}28`, background: isDark ? `${m.color}08` : `${m.color}06` }}>
                        <p className="text-[9px] text-muted-foreground mb-0.5">{m.label}</p>
                        <p className="text-sm font-bold" style={{ color: m.color }}>{m.value}</p>
                      </div>
                    ))}
                  </div>

                  {selectedRoute.status !== 'build' && (
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-muted-foreground">Загрузка мощности</span>
                        <span className="font-semibold">{((selectedRoute.volume / selectedRoute.capacity) * 100).toFixed(0)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full"
                          style={{
                            width: `${(selectedRoute.volume / selectedRoute.capacity) * 100}%`,
                            background: `linear-gradient(90deg, ${selectedRoute.color}, ${selectedRoute.color}cc)`,
                          }} />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">Маршрут</p>
                    <div className="flex items-center gap-1.5 text-xs">
                      <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate">{selectedRoute.dest_from}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="truncate">{selectedRoute.dest_to}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Wrench className="h-3 w-3 shrink-0" />
                      <span>Оператор: {selectedRoute.owner}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Zap className="h-3 w-3 shrink-0" />
                      <span>Год ввода: {selectedRoute.year}</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-muted-foreground leading-relaxed">{selectedRoute.description}</p>

                  {/* KS on this route */}
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">КС на маршруте</p>
                    <div className="space-y-1.5">
                      {stations.filter((s) => s.route_id === selectedRoute.id).map((s) => (
                        <button key={s.id}
                          onClick={() => { setSelectedRoute(null); setSelectedStation(s) }}
                          className="w-full flex items-center justify-between rounded-lg border px-2.5 py-1.5 hover:bg-muted/50 transition-colors text-left"
                          style={{ borderColor: `${STATUS_COLOR[s.status]}30` }}>
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: STATUS_COLOR[s.status] }} />
                            <span className="text-[10px] font-medium">{s.name}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">{s.volume.toFixed(1)} млрд м³</span>
                        </button>
                      ))}
                      {stations.filter((s) => s.route_id === selectedRoute.id).length === 0 && (
                        <p className="text-[10px] text-muted-foreground">Нет данных о КС на этом маршруте</p>
                      )}
                    </div>
                  </div>

                  {selectedRoute.status !== 'build' && (
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Динамика объёмов</p>
                      <ResponsiveContainer width="100%" height={80}>
                        <AreaChart data={VOLUME_HISTORY}>
                          <defs>
                            <linearGradient id="gg" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={selectedRoute.color} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={selectedRoute.color} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="month" tick={{ fontSize: 8 }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 8 }} tickLine={false} axisLine={false} width={28} />
                          <Tooltip contentStyle={{ fontSize: 10 }} />
                          <Area type="monotone" dataKey="cac" stroke={selectedRoute.color} fill="url(#gg)" strokeWidth={2} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </>
              )}

              {/* Station detail */}
              {selectedStation && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Объём', value: `${selectedStation.volume.toFixed(1)} млрд м³`, color: '#6366f1' },
                      { label: 'Загрузка КС', value: `${selectedStation.load_pct}%`, color: '#3b82f6' },
                      { label: 'Давл. вход', value: `${selectedStation.pressure_in.toFixed(1)} МПа`, color: '#6b7280' },
                      { label: 'Давл. выход', value: `${selectedStation.pressure_out.toFixed(2)} МПа`, color: '#22c55e' },
                      { label: 'Компрессоры', value: `${selectedStation.comp_active}/${selectedStation.comp_total}`, color: '#8b5cf6' },
                      { label: 'Т° газа', value: `${selectedStation.temp}°C`, color: '#f59e0b' },
                    ].map((m) => (
                      <div key={m.label} className="rounded-lg border p-2.5"
                        style={{ borderColor: `${m.color}28`, background: isDark ? `${m.color}08` : `${m.color}06` }}>
                        <p className="text-[9px] text-muted-foreground mb-0.5">{m.label}</p>
                        <p className="text-sm font-bold" style={{ color: m.color }}>{m.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Load bar */}
                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-muted-foreground">Загрузка КС</span>
                      <span className="font-semibold">{selectedStation.load_pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full"
                        style={{
                          width: `${selectedStation.load_pct}%`,
                          background: selectedStation.load_pct > 90
                            ? 'linear-gradient(90deg,#f59e0b,#ef4444)'
                            : 'linear-gradient(90deg,#6366f1,#818cf8)',
                        }} />
                    </div>
                  </div>

                  {/* Gas quality */}
                  <div className="rounded-lg border p-3 space-y-2"
                    style={{ borderColor: isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)' }}>
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-1.5">
                      <Flame className="h-3 w-3 text-indigo-400" />
                      Качество газа
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground text-[9px]">CH₄ содержание</p>
                        <p className="font-bold text-indigo-400">{selectedStation.ch4_pct}%</p>
                        <p className="text-[8px] text-green-400">
                          {selectedStation.ch4_pct >= 97.5 ? '✓ норма ГОСТ' : '⚠ ниже нормы'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[9px]">H₂S (серовод.)</p>
                        <p className="font-bold" style={{ color: selectedStation.h2s_ppm <= 2 ? '#22c55e' : '#f59e0b' }}>
                          {selectedStation.h2s_ppm} мг/м³
                        </p>
                        <p className="text-[8px]" style={{ color: selectedStation.h2s_ppm <= 2 ? '#22c55e' : '#f59e0b' }}>
                          {selectedStation.h2s_ppm <= 2 ? '✓ норма' : '⚠ повышен'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedStation.status === 'warn' && (
                    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 flex items-start gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-amber-400 leading-relaxed">
                        Вибрация на компрессоре №2 выше допустимой. Рекомендуется плановая проверка.
                      </p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">Параметры</p>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Объём с начала года</span>
                        <span className="font-medium">{selectedStation.throughput_ytd} млрд м³</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">КПД компрессоров</span>
                        <span className="font-medium">{(89 + Math.random() * 4).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Маршрут</span>
                        <span className="font-medium">{ROUTES.find(r => r.id === selectedStation.route_id)?.shortName}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Default side panel */}
        {!selectedRoute && !selectedStation && (
          <div className="w-72 rounded-2xl border flex flex-col gap-4 p-4"
            style={{ borderColor: palette.border }}>
            <div>
              <p className="text-xs font-bold mb-0.5">Сводка сети газопроводов</p>
              <p className="text-[10px] text-muted-foreground">Нажмите на газопровод или КС для деталей</p>
            </div>

            <div className="space-y-2">
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">Газопроводы</p>
              {ROUTES.map((r) => (
                <button key={r.id}
                  onClick={() => setSelectedRoute(r)}
                  className="w-full flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-muted/50 transition-colors text-left group"
                  style={{ borderColor: `${r.color}35` }}>
                  <div className="flex items-center gap-2">
                    <span className="h-0.5 w-5 rounded-full transition-all group-hover:w-7" style={{ background: r.color }} />
                    <span className="text-[10px] font-medium">{r.shortName}</span>
                    {r.status === 'build' && (
                      <Badge className="text-[8px] px-1 py-0" style={{ background: '#f59e0b15', color: '#f59e0b', border: '1px solid #f59e0b40' }}>
                        Строит.
                      </Badge>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {r.volume > 0 ? `${r.volume} млрд м³` : '—'}
                  </span>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">КС — статус</p>
              {[
                { label: 'В работе', count: stations.filter(s => s.status === 'ok').length, color: '#22c55e' },
                { label: 'Внимание', count: stations.filter(s => s.status === 'warn').length, color: '#f59e0b' },
                { label: 'ТО', count: stations.filter(s => s.status === 'maint').length, color: '#6366f1' },
              ].map((l) => (
                <div key={l.label} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
                    <span className="text-muted-foreground">{l.label}</span>
                  </div>
                  <span className="font-semibold">{l.count}</span>
                </div>
              ))}
            </div>

            <div>
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Давление по маршрутам (МПа)</p>
              <ResponsiveContainer width="100%" height={110}>
                <LineChart data={PRESSURE_HISTORY}>
                  <XAxis dataKey="h" tick={{ fontSize: 7.5 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 7.5 }} tickLine={false} axisLine={false} width={28} domain={[4.8, 5.8]} />
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                  <Tooltip contentStyle={{ fontSize: 9 }} />
                  <ReferenceLine y={5.5} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.5} />
                  <Line type="monotone" dataKey="cac" stroke="#6366f1" strokeWidth={1.5} dot={false} name="CAC" />
                  <Line type="monotone" dataKey="kzkn" stroke="#dc2626" strokeWidth={1.5} dot={false} name="КЗ-КНР" />
                  <Line type="monotone" dataKey="bbs" stroke="#0d9488" strokeWidth={1.5} dot={false} name="ББШ" />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-[8px] text-muted-foreground text-center mt-0.5">— макс. допустимое 5.5 МПа</p>
            </div>

            <div className="flex items-center gap-2 mt-auto pt-2 border-t" style={{ borderColor: palette.border }}>
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Данные обновляются в реальном времени</span>
            </div>
          </div>
        )}
      </div>

      {/* CS quick grid */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">
          <BarChart3 className="inline h-3 w-3 mr-1" />
          КС — быстрый доступ
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {stations.map((s) => (
            <button key={s.id}
              onClick={() => { setSelectedStation(s); setSelectedRoute(null) }}
              className="rounded-lg border p-2 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ borderColor: `${STATUS_COLOR[s.status]}40`, background: isDark ? `${STATUS_COLOR[s.status]}0d` : `${STATUS_COLOR[s.status]}08` }}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: STATUS_COLOR[s.status] }} />
                <span className="text-[9px] font-semibold truncate">{s.name.replace('КС ', '')}</span>
              </div>
              <p className="text-[9px] text-muted-foreground">{s.volume.toFixed(1)} млрд м³</p>
              <p className="text-[8px] text-muted-foreground">{s.pressure_out.toFixed(1)} МПа</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

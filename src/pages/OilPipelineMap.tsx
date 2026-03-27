import { useState, useEffect, useCallback } from 'react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/hooks/useTheme'
import {
  Droplets, Gauge, Activity, X, MapPin,
  AlertTriangle, CheckCircle2, Wrench, ArrowRight,
  Zap, BarChart3, Navigation,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
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
type Status = 'ok' | 'warn' | 'maint'

interface NPS {
  id: string; name: string; lon: number; lat: number
  pressure_in: number; pressure_out: number
  flow: number; pumps_active: number; pumps_total: number
  load_pct: number; status: Status; route_id: string
  throughput_ytd: number; temp: number
}

interface OilRoute {
  id: string; name: string; shortName: string
  type: 'export' | 'domestic'
  color: string; waypoints: [number, number][]
  length: number; throughput: number; capacity: number
  pressure: number; status: Status; dest: string
  owner: string; year: string; description: string
}

/* ── Route definitions ──────────────────────────────────────────────────────── */
const ROUTES: OilRoute[] = [
  {
    id: 'ktk',
    name: 'КТК — Каспийский трубопроводный консорциум',
    shortName: 'КТК',
    type: 'export', color: '#ef4444',
    waypoints: [
      mp(53.0, 45.5), mp(51.9, 47.1), mp(51.0, 47.6), mp(49.5, 48.0), mp(47.2, 45.0),
    ],
    length: 1511, throughput: 38.1, capacity: 42.0, pressure: 6.4, status: 'ok',
    dest: 'Новороссийск (Россия)', owner: 'КТК', year: '2001',
    description: 'Тенгиз → Новороссийск. Крупнейший казахстанский экспортный нефтепровод. Акционеры: КМГ (19%), Chevron (15%), ЛУКойл (12.5%), Shell (7.5%), ExxonMobil (7.5%).',
  },
  {
    id: 'atyrau-samara',
    name: 'Атырау — Самара',
    shortName: 'А-С',
    type: 'export', color: '#f59e0b',
    waypoints: [
      mp(51.9, 47.1), mp(50.3, 51.2), mp(51.2, 55.0), mp(53.0, 55.0),
    ],
    length: 1200, throughput: 15.4, capacity: 19.0, pressure: 6.1, status: 'ok',
    dest: 'Самарский НПЗ (Россия)', owner: 'КазТрансОйл', year: '1970 (рек.2021)',
    description: 'Основной северный экспортный коридор. Прокачка казахстанской нефти на российские НПЗ. Реконструирован в 2018–2021 гг.',
  },
  {
    id: 'atasu-alashankou',
    name: 'Атасу — Алашанькоу (КККМ)',
    shortName: 'КККМ',
    type: 'export', color: '#dc2626',
    waypoints: [
      mp(71.7, 48.5), mp(75.0, 47.8), mp(78.5, 46.5), mp(82.3, 45.2),
    ],
    length: 1384, throughput: 12.6, capacity: 20.0, pressure: 5.8, status: 'ok',
    dest: 'Алашанькоу (КНР)', owner: 'КККМ (КМГ 50% + CNPC 50%)', year: '2006',
    description: 'Казахстанско-китайский нефтепровод. Поставки до CNPC Dushanzi НПЗ. Введён в 2006 г., расширение в 2009 г.',
  },
  {
    id: 'aka',
    name: 'Атырау — Кенкияк — Атасу',
    shortName: 'АКА',
    type: 'domestic', color: '#f97316',
    waypoints: [
      mp(51.9, 47.1), mp(49.5, 55.6), mp(48.5, 64.0), mp(48.5, 71.7),
    ],
    length: 1840, throughput: 10.2, capacity: 15.0, pressure: 6.0, status: 'ok',
    dest: 'Атасу (КЗ)', owner: 'КазТрансОйл', year: '2009',
    description: 'Внутренний маршрут: западные месторождения → Атасу. Подпитка КККМ казахстанской нефтью. Связывает западные и восточные сети.',
  },
  {
    id: 'pavlodar-shymkent',
    name: 'Павлодар — Шымкент',
    shortName: 'ПШ',
    type: 'domestic', color: '#6366f1',
    waypoints: [
      mp(76.9, 52.3), mp(73.1, 49.8), mp(71.7, 48.5), mp(67.0, 44.9), mp(69.6, 42.3),
    ],
    length: 900, throughput: 8.3, capacity: 12.0, pressure: 5.5, status: 'maint',
    dest: 'Шымкентский НПЗ (КЗ)', owner: 'КазТрансОйл', year: '1975',
    description: 'Обеспечение Шымкентского НПЗ сырьём из Сибири (РФ ↔ Павлодар). Часть трубопровода в плановом техобслуживании. Мощность после ремонта — 12 млн т/год.',
  },
  {
    id: 'uzen-aktau',
    name: 'Узень — Актау',
    shortName: 'УА',
    type: 'domestic', color: '#8b5cf6',
    waypoints: [
      mp(53.8, 43.3), mp(53.5, 43.5), mp(51.2, 43.6),
    ],
    length: 330, throughput: 4.1, capacity: 6.0, pressure: 5.2, status: 'ok',
    dest: 'Актауский мор. терминал', owner: 'КазТрансОйл', year: '1985',
    description: 'Подача нефти месторождения Узень на Каспийский морской терминал Актау для дальнейшей танкерной транспортировки.',
  },
]

/* ── NPS Stations ───────────────────────────────────────────────────────────── */
const BASE_STATIONS: NPS[] = [
  { id: 'nps1', name: 'НПС-1 Тенгиз', lon: 53.0, lat: 45.5, pressure_in: 0.8, pressure_out: 6.4, flow: 38.1, pumps_active: 4, pumps_total: 5, load_pct: 91, status: 'ok', route_id: 'ktk', throughput_ytd: 19.4, temp: 42 },
  { id: 'nps2', name: 'НПС-2 Атырау', lon: 51.9, lat: 47.1, pressure_in: 2.1, pressure_out: 6.0, flow: 36.8, pumps_active: 3, pumps_total: 4, load_pct: 88, status: 'ok', route_id: 'ktk', throughput_ytd: 18.7, temp: 38 },
  { id: 'nps3', name: 'НПС-3 Кульсары', lon: 51.0, lat: 47.6, pressure_in: 1.4, pressure_out: 5.9, flow: 35.2, pumps_active: 3, pumps_total: 4, load_pct: 84, status: 'ok', route_id: 'ktk', throughput_ytd: 17.9, temp: 36 },
  { id: 'nps4', name: 'НПС Кенкияк', lon: 55.6, lat: 49.5, pressure_in: 1.2, pressure_out: 5.8, flow: 15.4, pumps_active: 2, pumps_total: 3, load_pct: 81, status: 'ok', route_id: 'atyrau-samara', throughput_ytd: 7.8, temp: 34 },
  { id: 'nps5', name: 'НПС Актобе', lon: 57.2, lat: 50.3, pressure_in: 1.5, pressure_out: 5.7, flow: 15.1, pumps_active: 2, pumps_total: 3, load_pct: 79, status: 'ok', route_id: 'atyrau-samara', throughput_ytd: 7.6, temp: 32 },
  { id: 'nps6', name: 'НПС Атасу', lon: 71.7, lat: 48.5, pressure_in: 1.8, pressure_out: 5.8, flow: 12.6, pumps_active: 2, pumps_total: 3, load_pct: 84, status: 'ok', route_id: 'atasu-alashankou', throughput_ytd: 6.4, temp: 35 },
  { id: 'nps7', name: 'НПС Достык', lon: 80.5, lat: 46.0, pressure_in: 1.0, pressure_out: 5.4, flow: 12.3, pumps_active: 2, pumps_total: 2, load_pct: 92, status: 'warn', route_id: 'atasu-alashankou', throughput_ytd: 6.2, temp: 39 },
  { id: 'nps8', name: 'НПС Жезказган', lon: 67.7, lat: 47.8, pressure_in: 1.6, pressure_out: 5.9, flow: 10.2, pumps_active: 2, pumps_total: 3, load_pct: 76, status: 'ok', route_id: 'aka', throughput_ytd: 5.2, temp: 31 },
  { id: 'nps9', name: 'НПС Павлодар', lon: 76.9, lat: 52.3, pressure_in: 1.2, pressure_out: 5.5, flow: 8.3, pumps_active: 2, pumps_total: 3, load_pct: 69, status: 'maint', route_id: 'pavlodar-shymkent', throughput_ytd: 4.2, temp: 28 },
  { id: 'nps10', name: 'НПС Кумколь', lon: 65.8, lat: 45.8, pressure_in: 1.4, pressure_out: 5.3, flow: 8.1, pumps_active: 2, pumps_total: 3, load_pct: 68, status: 'ok', route_id: 'pavlodar-shymkent', throughput_ytd: 4.1, temp: 33 },
  { id: 'nps11', name: 'Терминал Актау', lon: 51.2, lat: 43.6, pressure_in: 0.5, pressure_out: 4.8, flow: 4.1, pumps_active: 1, pumps_total: 2, load_pct: 68, status: 'ok', route_id: 'uzen-aktau', throughput_ytd: 2.1, temp: 29 },
  { id: 'nps12', name: 'НПС Узень', lon: 53.8, lat: 43.3, pressure_in: 0.6, pressure_out: 5.2, flow: 4.1, pumps_active: 1, pumps_total: 2, load_pct: 68, status: 'ok', route_id: 'uzen-aktau', throughput_ytd: 2.1, temp: 31 },
]

const STATUS_COLOR: Record<Status, string> = { ok: '#22c55e', warn: '#f59e0b', maint: '#6366f1' }
const STATUS_LABEL: Record<Status, string> = { ok: 'В работе', warn: 'Внимание', maint: 'Техобслуживание' }

/* ── Historical throughput mock data ────────────────────────────────────────── */
const THROUGHPUT_HISTORY = [
  { month: 'Янв', ktk: 36.2, as: 14.8, kkkm: 11.9, aka: 9.4 },
  { month: 'Фев', ktk: 35.8, as: 15.0, kkkm: 12.1, aka: 9.7 },
  { month: 'Мар', ktk: 37.1, as: 15.3, kkkm: 12.4, aka: 10.1 },
  { month: 'Апр', ktk: 37.8, as: 15.2, kkkm: 12.3, aka: 10.0 },
  { month: 'Май', ktk: 38.4, as: 15.5, kkkm: 12.5, aka: 10.3 },
  { month: 'Июн', ktk: 38.1, as: 15.4, kkkm: 12.6, aka: 10.2 },
]

/* ── Route totals ───────────────────────────────────────────────────────────── */
function totalThroughput() { return ROUTES.reduce((s, r) => s + r.throughput, 0) }

/* ═══════════════════════════════════════════════════════════════════════════════
   Component
═══════════════════════════════════════════════════════════════════════════════ */
export default function OilPipelineMap() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [selectedRoute, setSelectedRoute] = useState<OilRoute | null>(null)
  const [selectedStation, setSelectedStation] = useState<NPS | null>(null)
  const [stations, setStations] = useState<NPS[]>(BASE_STATIONS)
  const [tick, setTick] = useState(0)
  const [filterType, setFilterType] = useState<'all' | 'export' | 'domestic'>('all')

  /* Simulate live sensor updates every 4 seconds */
  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1)
      setStations((prev) =>
        prev.map((s) => ({
          ...s,
          flow: +(s.flow + (Math.random() - 0.5) * 0.4).toFixed(1),
          pressure_out: +(s.pressure_out + (Math.random() - 0.5) * 0.1).toFixed(2),
          temp: Math.round(s.temp + (Math.random() - 0.5) * 2),
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
    ocean: '#0a1628', base: '#1a3d4f', hover: '#1f5068', stroke: '#2dd4bf', border: 'rgba(45,212,191,0.22)',
    text: '#e0f0ee', muted: 'rgba(148,180,196,0.55)',
  } : {
    ocean: '#b8d4e3', base: '#cce8dc', hover: '#a0d4c0', stroke: '#0f766e', border: 'rgba(15,118,110,0.3)',
    text: '#0f3d35', muted: 'rgba(30,80,70,0.45)',
  }

  const visibleRoutes = ROUTES.filter((r) => filterType === 'all' || r.type === filterType)
  const totalKmThru = totalThroughput()
  const exportRoutes = ROUTES.filter((r) => r.type === 'export')
  const exportVol = exportRoutes.reduce((s, r) => s + r.throughput, 0)

  return (
    <div className="flex flex-col gap-4 p-4 min-h-screen">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Droplets className="h-5 w-5 text-orange-500" />
            Карта нефтепроводов АО «КазТрансОйл»
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Интерактивная карта — нажмите на трубопровод или НПС
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground mr-1">Фильтр</span>
          {(['all', 'export', 'domestic'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className="px-3 py-1 rounded-full text-xs font-medium border transition-all"
              style={{
                background: filterType === t ? (isDark ? 'rgba(249,115,22,0.2)' : 'rgba(249,115,22,0.12)') : 'transparent',
                borderColor: filterType === t ? '#f97316' : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'),
                color: filterType === t ? '#f97316' : undefined,
              }}
            >
              {t === 'all' ? 'Все' : t === 'export' ? 'Экспорт' : 'Внутренние'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Общая прокачка', value: `${totalKmThru.toFixed(1)} млн т/год`, icon: Droplets, color: '#f97316' },
          { label: 'Экспортный объём', value: `${exportVol.toFixed(1)} млн т/год`, icon: ArrowRight, color: '#ef4444' },
          { label: 'Протяжённость сети', value: '7 165 км', icon: Navigation, color: '#6366f1' },
          { label: 'НПС в работе', value: `${stations.filter(s => s.status === 'ok').length}/${stations.length}`, icon: Gauge, color: '#22c55e' },
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
          style={{ borderColor: palette.border, boxShadow: isDark ? '0 0 40px rgba(13,148,136,0.06) inset' : '0 4px 24px rgba(0,0,0,0.08)' }}>

          {/* Live badge */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold"
            style={{ background: isDark ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.85)', color: '#22c55e', backdropFilter: 'blur(8px)' }}>
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            LIVE · обновл. {tick > 0 ? `${tick * 4}с назад` : 'только что'}
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
                      fill="none" stroke={palette.stroke} strokeWidth={0.8}
                      style={{ default: { outline: 'none' }, hover: { outline: 'none' }, pressed: { outline: 'none' } }}
                    />
                  ))
                }
              </Geographies>

              {/* Pipeline shadow / glow */}
              {visibleRoutes.map((r) => (
                <polyline
                  key={`shadow-${r.id}`}
                  points={r.waypoints.map((p) => p.join(',')).join(' ')}
                  fill="none"
                  stroke={r.color}
                  strokeWidth={8}
                  strokeOpacity={isDark ? 0.12 : 0.10}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}

              {/* Pipeline base */}
              {visibleRoutes.map((r) => (
                <polyline
                  key={`base-${r.id}`}
                  points={r.waypoints.map((p) => p.join(',')).join(' ')}
                  fill="none"
                  stroke={r.color}
                  strokeWidth={r.status === 'maint' ? 2 : 3}
                  strokeOpacity={r.status === 'maint' ? 0.4 : 0.85}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={r.status === 'maint' ? '6 4' : undefined}
                />
              ))}

              {/* Animated flow particles */}
              {visibleRoutes.filter((r) => r.status !== 'maint').map((r) => (
                <polyline
                  key={`flow-${r.id}`}
                  points={r.waypoints.map((p) => p.join(',')).join(' ')}
                  fill="none"
                  stroke={r.color}
                  strokeWidth={3}
                  strokeOpacity={0.9}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="10 28"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="0"
                    to="-38"
                    dur={`${1.8 - r.throughput / 60}s`}
                    repeatCount="indefinite"
                  />
                </polyline>
              ))}

              {/* Station circles */}
              {stations.map((s) => {
                const [sx, sy] = mp(s.lon, s.lat)
                return (
                  <g key={`st-${s.id}`}>
                    <circle cx={sx} cy={sy} r={7} fill={STATUS_COLOR[s.status]} fillOpacity={0.15} />
                    <circle cx={sx} cy={sy} r={4.5} fill={STATUS_COLOR[s.status]} fillOpacity={0.35} />
                    <circle cx={sx} cy={sy} r={3} fill={STATUS_COLOR[s.status]} stroke={isDark ? '#0a1628' : '#fff'} strokeWidth={1} />
                  </g>
                )
              })}

              {/* Route labels */}
              {visibleRoutes.map((r) => {
                const mid = r.waypoints[Math.floor(r.waypoints.length / 2)]
                return (
                  <g key={`lbl-${r.id}`}>
                    <rect
                      x={mid[0] - 16} y={mid[1] - 10}
                      width={32} height={13} rx={4}
                      fill={r.color} fillOpacity={0.88}
                    />
                    <text x={mid[0]} y={mid[1] + 1} textAnchor="middle"
                      style={{ fontSize: 7.5, fill: '#fff', fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>
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
                fill="none"
                stroke="transparent"
                strokeWidth={16}
                style={{ cursor: 'pointer' }}
                onClick={() => { setSelectedStation(null); setSelectedRoute(r) }}
              />
            ))}

            {/* Interactive station click zones */}
            {stations.map((s) => {
              const [sx, sy] = mp(s.lon, s.lat)
              return (
                <circle
                  key={`click-st-${s.id}`}
                  cx={sx} cy={sy} r={10}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onClick={() => { setSelectedRoute(null); setSelectedStation(s) }}
                />
              )
            })}
          </ComposableMap>

          {/* Legend */}
          <div className="absolute bottom-3 left-3 rounded-lg px-3 py-2"
            style={{ background: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.88)', backdropFilter: 'blur(8px)' }}>
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5 font-semibold">Легенда</p>
            <div className="space-y-1">
              {ROUTES.map((r) => (
                <div key={r.id} className="flex items-center gap-1.5">
                  <span className="h-0.5 w-6 rounded-full" style={{ background: r.color }} />
                  <span className="text-[9px]" style={{ color: isDark ? '#c0d0d8' : '#2a4040' }}>
                    {r.shortName} · {r.throughput} млн т/год
                  </span>
                </div>
              ))}
              <div className="border-t mt-1 pt-1" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                {[
                  { color: '#22c55e', label: 'НПС — норма' },
                  { color: '#f59e0b', label: 'НПС — внимание' },
                  { color: '#6366f1', label: 'НПС — ТО' },
                ].map((l) => (
                  <div key={l.color} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
                    <span className="text-[9px]" style={{ color: isDark ? '#c0d0d8' : '#2a4040' }}>{l.label}</span>
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
            {/* Panel header */}
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
                      {selectedRoute.type === 'export' ? 'Экспорт' : 'Внутренний'}
                    </Badge>
                    <Badge variant="outline" className="text-[9px]"
                      style={{ borderColor: STATUS_COLOR[selectedRoute.status] }}>
                      {STATUS_LABEL[selectedRoute.status]}
                    </Badge>
                  </div>
                )}
                {selectedStation && (
                  <div className="flex gap-1.5 mt-1.5">
                    <Badge className="text-[9px]" style={{ background: STATUS_COLOR[selectedStation.status], color: '#fff' }}>
                      {STATUS_LABEL[selectedStation.status]}
                    </Badge>
                    <Badge variant="outline" className="text-[9px]">НПС</Badge>
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
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Прокачка', value: `${selectedRoute.throughput} млн т/год`, color: selectedRoute.color },
                      { label: 'Мощность', value: `${selectedRoute.capacity} млн т/год`, color: '#6b7280' },
                      { label: 'Давление', value: `${selectedRoute.pressure} МПа`, color: '#3b82f6' },
                      { label: 'Протяжённость', value: `${selectedRoute.length.toLocaleString()} км`, color: '#8b5cf6' },
                    ].map((m) => (
                      <div key={m.label} className="rounded-lg border p-2.5"
                        style={{ borderColor: `${m.color}28`, background: isDark ? `${m.color}08` : `${m.color}06` }}>
                        <p className="text-[9px] text-muted-foreground mb-0.5">{m.label}</p>
                        <p className="text-sm font-bold" style={{ color: m.color }}>{m.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Utilization bar */}
                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-muted-foreground">Загрузка мощности</span>
                      <span className="font-semibold">{((selectedRoute.throughput / selectedRoute.capacity) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{
                          width: `${(selectedRoute.throughput / selectedRoute.capacity) * 100}%`,
                          background: `linear-gradient(90deg, ${selectedRoute.color}, ${selectedRoute.color}cc)`,
                        }} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">Маршрут</p>
                    <div className="flex items-center gap-1.5 text-xs">
                      <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="font-medium">{selectedRoute.name.split('—')[0]?.trim()}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span>{selectedRoute.dest}</span>
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

                  {/* NPS on this route */}
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">НПС на маршруте</p>
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
                          <span className="text-[10px] text-muted-foreground">{s.flow.toFixed(1)} млн т</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mini chart */}
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Динамика прокачки</p>
                    <ResponsiveContainer width="100%" height={80}>
                      <AreaChart data={THROUGHPUT_HISTORY}>
                        <defs>
                          <linearGradient id="og" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={selectedRoute.color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={selectedRoute.color} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="month" tick={{ fontSize: 8 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 8 }} tickLine={false} axisLine={false} width={28} />
                        <Tooltip contentStyle={{ fontSize: 10 }} />
                        <Area type="monotone" dataKey="ktk" stroke={selectedRoute.color} fill="url(#og)" strokeWidth={2} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}

              {/* Station detail */}
              {selectedStation && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Расход', value: `${selectedStation.flow.toFixed(1)} млн т/год`, color: '#f97316' },
                      { label: 'Загрузка', value: `${selectedStation.load_pct}%`, color: '#3b82f6' },
                      { label: 'Давл. вход', value: `${selectedStation.pressure_in.toFixed(1)} МПа`, color: '#6b7280' },
                      { label: 'Давл. выход', value: `${selectedStation.pressure_out.toFixed(2)} МПа`, color: '#22c55e' },
                      { label: 'Насосы', value: `${selectedStation.pumps_active}/${selectedStation.pumps_total} акт.`, color: '#8b5cf6' },
                      { label: 'Т° нефти', value: `${selectedStation.temp}°C`, color: '#f59e0b' },
                    ].map((m) => (
                      <div key={m.label} className="rounded-lg border p-2.5"
                        style={{ borderColor: `${m.color}28`, background: isDark ? `${m.color}08` : `${m.color}06` }}>
                        <p className="text-[9px] text-muted-foreground mb-0.5">{m.label}</p>
                        <p className="text-sm font-bold" style={{ color: m.color }}>{m.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Pump load bar */}
                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-muted-foreground">Загрузка НПС</span>
                      <span className="font-semibold">{selectedStation.load_pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full"
                        style={{
                          width: `${selectedStation.load_pct}%`,
                          background: selectedStation.load_pct > 90
                            ? 'linear-gradient(90deg,#f59e0b,#ef4444)'
                            : 'linear-gradient(90deg,#22c55e,#0d9488)',
                        }} />
                    </div>
                  </div>

                  {selectedStation.status === 'warn' && (
                    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 flex items-start gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-amber-400 leading-relaxed">
                        Нагрузка на насосы превышает 90%. Рекомендуется технический осмотр. Отклонение давления ±0.2 МПа.
                      </p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">Параметры</p>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Прокачка с начала года</span>
                        <span className="font-medium">{selectedStation.throughput_ytd} млн т</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">КПД насосов</span>
                        <span className="font-medium">{(87 + Math.random() * 5).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Трубопровод</span>
                        <span className="font-medium">{ROUTES.find(r => r.id === selectedStation.route_id)?.shortName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[10px]">
                    {selectedStation.status === 'ok' ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                    )}
                    <span style={{ color: STATUS_COLOR[selectedStation.status] }}>
                      {STATUS_LABEL[selectedStation.status]}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Default side panel when nothing is selected */}
        {!selectedRoute && !selectedStation && (
          <div className="w-72 rounded-2xl border flex flex-col gap-4 p-4"
            style={{ borderColor: palette.border }}>
            <div>
              <p className="text-xs font-bold mb-0.5">Сводка по сети</p>
              <p className="text-[10px] text-muted-foreground">Нажмите на трубопровод или НПС для деталей</p>
            </div>

            <div className="space-y-2">
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">Трубопроводы</p>
              {ROUTES.map((r) => (
                <button key={r.id}
                  onClick={() => setSelectedRoute(r)}
                  className="w-full flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-muted/50 transition-colors text-left group"
                  style={{ borderColor: `${r.color}35` }}>
                  <div className="flex items-center gap-2">
                    <span className="h-0.5 w-5 rounded-full transition-all group-hover:w-7" style={{ background: r.color }} />
                    <span className="text-[10px] font-medium">{r.shortName}</span>
                    {r.status === 'maint' && <Badge className="text-[8px] px-1 py-0" style={{ background: '#6366f110', color: '#6366f1', border: '1px solid #6366f140' }}>ТО</Badge>}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{r.throughput} M т</span>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">НПС — статус</p>
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
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Прокачка по маршрутам</p>
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={THROUGHPUT_HISTORY}>
                  <XAxis dataKey="month" tick={{ fontSize: 7.5 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 7.5 }} tickLine={false} axisLine={false} width={24} />
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                  <Tooltip contentStyle={{ fontSize: 9 }} />
                  <Area type="monotone" dataKey="ktk" stroke="#ef4444" fill="#ef444420" strokeWidth={1.5} dot={false} name="КТК" />
                  <Area type="monotone" dataKey="as" stroke="#f59e0b" fill="#f59e0b15" strokeWidth={1.5} dot={false} name="А-С" />
                  <Area type="monotone" dataKey="kkkm" stroke="#dc2626" fill="#dc262615" strokeWidth={1.5} dot={false} name="КККМ" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center gap-2 mt-auto pt-2 border-t" style={{ borderColor: palette.border }}>
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Данные обновляются в реальном времени</span>
            </div>
          </div>
        )}
      </div>

      {/* Station quick grid */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">
          <BarChart3 className="inline h-3 w-3 mr-1" />
          НПС — быстрый доступ
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {stations.map((s) => (
            <button key={s.id}
              onClick={() => { setSelectedStation(s); setSelectedRoute(null) }}
              className="rounded-lg border p-2 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ borderColor: `${STATUS_COLOR[s.status]}40`, background: isDark ? `${STATUS_COLOR[s.status]}0d` : `${STATUS_COLOR[s.status]}08` }}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: STATUS_COLOR[s.status] }} />
                <span className="text-[9px] font-semibold truncate">{s.name.replace('НПС ', '').replace('Терминал ', '')}</span>
              </div>
              <p className="text-[9px] text-muted-foreground">{s.flow.toFixed(1)} млн т</p>
              <p className="text-[8px] text-muted-foreground">{s.pressure_out.toFixed(1)} МПа</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

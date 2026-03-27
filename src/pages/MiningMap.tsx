import { useState } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { Badge } from '@/components/ui/badge'
import { Pickaxe, Factory, Gem, MapPin, Users, BarChart3, X, TrendingUp, Zap } from 'lucide-react'

/* ══ Mine data ═══════════════════════════════════════════════════════════════ */

type MineType = 'copper' | 'iron' | 'zinc' | 'coal' | 'gold' | 'smelter'

interface Mine {
  id: string
  name: string
  shortName: string
  type: MineType
  owner: string
  region: string
  lat: number
  lon: number
  product: string
  capacity: string
  staff: number
  depth?: string
  status: 'active' | 'development' | 'exploration'
  facts: string[]
}

const MINES: Mine[] = [
  {
    id: 'zhezkazgan', name: 'Жезказганский рудник', shortName: 'Жезказган',
    type: 'copper', owner: 'АО «КазГМК»', region: 'Карагандинская обл.',
    lat: 47.8, lon: 67.7, product: 'Медь катодная', capacity: '100 тыс. т/год',
    staff: 3060, depth: 'Гор. −340 м',
    status: 'active',
    facts: [
      'Одно из крупнейших месторождений меди в мире',
      'Запасы: A+B+C1 — 930 млн т руды / 7.6 млн т Cu',
      'Содержание Cu в руде: 0.82–0.94%',
      'Подземная и открытая добыча',
    ],
  },
  {
    id: 'bozshakol', name: 'Бозшакольский ГОК', shortName: 'Бозшакол',
    type: 'copper', owner: 'KAZ Minerals', region: 'Павлодарская обл.',
    lat: 52.5, lon: 65.5, product: 'Медный концентрат', capacity: '100 тыс. т/год Cu',
    staff: 2800, depth: 'Карьер −180 м',
    status: 'active',
    facts: [
      'Запущен в 2016 году, карьерная добыча',
      'Запасы: 1.2 млрд т руды, содержание 0.36% Cu',
      'Совместное извлечение Mo, Re',
      'Ёмкость ОФ: 25 млн т руды/год',
    ],
  },
  {
    id: 'aktogay', name: 'Актогайский ГОК', shortName: 'Актогай',
    type: 'copper', owner: 'KAZ Minerals', region: 'Алматинская обл.',
    lat: 46.7, lon: 79.4, product: 'Медный концентрат', capacity: '105 тыс. т/год Cu',
    staff: 2400, depth: 'Карьер −220 м',
    status: 'active',
    facts: [
      'Расширение завершено в 2021 году',
      'Запасы: 1.8 млрд т, содержание 0.33% Cu',
      'Производительность 25+50 млн т руды/год',
    ],
  },
  {
    id: 'sokolov', name: 'Соколовско-Сарбайский ГОК', shortName: 'ССГОК',
    type: 'iron', owner: 'ERG', region: 'Костанайская обл.',
    lat: 52.8, lon: 62.4, product: 'Железорудный концентрат', capacity: '22 млн т/год',
    staff: 6800, depth: 'Карьер −420 м',
    status: 'active',
    facts: [
      'Крупнейший ГОК по добыче железной руды в РК',
      'Запасы: 3.8 млрд т железной руды',
      'Производство окатышей и концентрата',
      'Поставки на ENRC Steel и на экспорт',
    ],
  },
  {
    id: 'balkhash', name: 'Балхашский медеплавильный завод (КЭЗ)', shortName: 'КЭЗ Балхаш',
    type: 'smelter', owner: 'АО «КазГМК»', region: 'Карагандинская обл.',
    lat: 46.8, lon: 74.9, product: 'Медь катодная М00k', capacity: '100 тыс. т/год',
    staff: 2100,
    status: 'active',
    facts: [
      'Электролизный завод, плавка и рафинирование',
      'Чистота катодной меди: 99.97%',
      'Попутное производство: золото, серебро, селен',
      'Интегрирован с Жезказганским рудником',
    ],
  },
  {
    id: 'ust-kamenogorsk', name: 'Усть-Каменогорский металлургический комплекс', shortName: 'УМК',
    type: 'zinc', owner: 'Казцинк / Glencore', region: 'ВКО',
    lat: 49.9, lon: 82.6, product: 'Цинк, свинец, серебро', capacity: '330 тыс. т Zn/год',
    staff: 7400,
    status: 'active',
    facts: [
      'Крупнейший в СНГ производитель цинка',
      'Полный цикл: добыча → обогащение → металлургия',
      'Казцинк: 5 рудников + 3 завода',
      'Производство золота и серебра попутно',
    ],
  },
  {
    id: 'zhairem', name: 'Жайремский ГОК', shortName: 'Жайрем',
    type: 'zinc', owner: 'ERG', region: 'Карагандинская обл.',
    lat: 47.9, lon: 71.3, product: 'Полиметаллический концентрат', capacity: '500 тыс. т руды/год',
    staff: 1200, depth: 'Подземный, −280 м',
    status: 'active',
    facts: [
      'Барит-полиметаллическое месторождение',
      'Попутная добыча барита (баритовый концентрат)',
      'Запасы: 180 млн т комплексной руды',
    ],
  },
  {
    id: 'shakhansk', name: 'Шахтинский уголь', shortName: 'Шахтинск',
    type: 'coal', owner: 'АО «Шубаркӛль Кӛмір»', region: 'Карагандинская обл.',
    lat: 49.7, lon: 72.6, product: 'Уголь коксующийся', capacity: '4.8 млн т/год',
    staff: 3400, depth: 'Шахта −700 м',
    status: 'active',
    facts: [
      'Карагандинский угольный бассейн',
      'Коксующийся уголь марки К и ОС',
      'Поставки на металлургические предприятия',
      'Запасы: 1.2 млрд т угля',
    ],
  },
]

/* ══ helpers ═════════════════════════════════════════════════════════════════ */

const TYPE_META: Record<MineType, { color: string; label: string; icon: typeof Pickaxe }> = {
  copper:  { color: '#f59e0b', label: 'Медь',         icon: Pickaxe },
  iron:    { color: '#6366f1', label: 'Железо',        icon: Factory },
  zinc:    { color: '#8b5cf6', label: 'Цинк/полимет.', icon: Gem },
  coal:    { color: '#6b7280', label: 'Уголь',         icon: BarChart3 },
  gold:    { color: '#eab308', label: 'Золото',        icon: TrendingUp },
  smelter: { color: '#0d9488', label: 'Металлургия',   icon: Factory },
}

const STATUS_META = {
  active:      { label: 'В работе',    color: '#10b981' },
  development: { label: 'Строительство', color: '#f59e0b' },
  exploration: { label: 'Разведка',    color: '#6366f1' },
}

/* Convert lat/lon to SVG coords inside a 900×440 viewport (KZ bounding box) */
const LON_MIN = 50, LON_MAX = 88
const LAT_MIN = 40, LAT_MAX = 56
const W = 900, H = 440

function toSVG(lat: number, lon: number) {
  const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * W
  const y = H - ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * H
  return { x, y }
}

/* Rough Kazakhstan outline (simplified polygon) */
const KZ_PATH = `M 60,35 L 80,20 L 130,18 L 180,12 L 240,8 L 310,15
  L 370,10 L 430,18 L 490,22 L 550,28 L 610,18 L 670,12 L 730,20
  L 790,35 L 840,60 L 870,90 L 865,130 L 850,165 L 840,200
  L 860,240 L 870,280 L 850,320 L 820,360 L 790,390 L 750,410
  L 700,420 L 650,415 L 600,420 L 550,415 L 500,420 L 450,415
  L 400,410 L 350,405 L 300,400 L 250,395 L 200,400 L 150,395
  L 100,385 L 60,370 L 30,340 L 18,300 L 15,260 L 20,220
  L 25,180 L 22,140 L 28,100 L 45,65 Z`

/* ══ Component ═══════════════════════════════════════════════════════════════ */

export default function MiningMap() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [selected, setSelected] = useState<Mine | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<MineType | 'all'>('all')

  const filtered = filterType === 'all' ? MINES : MINES.filter((m) => m.type === filterType)

  const summaryStats = [
    { label: 'Месторождений',    value: MINES.length,                                                     color: '#f59e0b', icon: MapPin },
    { label: 'Добыча меди',      value: '300+ тыс. т/год',                                                color: '#f59e0b', icon: Pickaxe },
    { label: 'Металлургических', value: MINES.filter((m) => m.type === 'smelter' || m.type === 'zinc').length, color: '#0d9488', icon: Factory },
    { label: 'Персонал (всего)', value: MINES.reduce((a, b) => a + b.staff, 0).toLocaleString('ru-RU') + '+', color: '#6366f1', icon: Users },
  ]

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="px-6 pt-4 pb-4 border-b">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Карта месторождений</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Горнодобывающие предприятия и металлургические комплексы Казахстана
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          {summaryStats.map((s) => {
            const Icon = s.icon
            return (
              <div key={s.label} className="rounded-lg border p-2.5 flex items-center gap-2"
                style={{ borderColor: `${s.color}25`, background: isDark ? `${s.color}08` : `${s.color}05` }}>
                <Icon className="h-4 w-4 shrink-0" style={{ color: s.color }} />
                <div>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  <p className="text-sm font-bold" style={{ color: s.color }}>{typeof s.value === 'number' ? s.value : s.value}</p>
                </div>
              </div>
            )
          })}
        </div>
        {/* Type filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-muted-foreground">Фильтр:</span>
          {(['all', ...Object.keys(TYPE_META)] as (MineType | 'all')[]).map((t) => {
            const meta = t !== 'all' ? TYPE_META[t] : null
            return (
              <button key={t} onClick={() => setFilterType(t)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all"
                style={{
                  borderColor: filterType === t ? (meta?.color ?? '#6366f1') : 'var(--border)',
                  background:  filterType === t ? `${meta?.color ?? '#6366f1'}18` : 'transparent',
                  color:       filterType === t ? (meta?.color ?? '#6366f1') : undefined,
                }}>
                {t === 'all' ? 'Все' : meta?.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Map + detail */}
      <div className="flex flex-1 min-h-0">
        {/* SVG Map */}
        <div className="flex-1 relative overflow-hidden p-4">
          <svg viewBox="0 0 900 440" className="w-full h-full max-h-[520px]"
            style={{ background: isDark ? 'rgba(10,15,28,0.5)' : 'rgba(240,249,247,0.6)' }}>
            {/* KZ outline */}
            <path d={KZ_PATH}
              fill={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(13,148,136,0.06)'}
              stroke={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(13,148,136,0.25)'}
              strokeWidth="1.5" />

            {/* Grid lines */}
            {[...Array(8)].map((_, i) => (
              <line key={`v${i}`} x1={i * 113 + 56} y1="0" x2={i * 113 + 56} y2="440"
                stroke={isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)'} strokeWidth="1" />
            ))}
            {[...Array(5)].map((_, i) => (
              <line key={`h${i}`} x1="0" y1={i * 88 + 44} x2="900" y2={i * 88 + 44}
                stroke={isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)'} strokeWidth="1" />
            ))}

            {/* Mine markers */}
            <g pointerEvents="none">
              {filtered.map((mine) => {
                const { x, y } = toSVG(mine.lat, mine.lon)
                const meta = TYPE_META[mine.type]
                const isHovered = hoveredId === mine.id
                const isSelected = selected?.id === mine.id
                const r = isHovered || isSelected ? 14 : 10
                return (
                  <g key={mine.id}
                    style={{ cursor: 'pointer' }}
                    pointerEvents="all"
                    onClick={() => setSelected(mine)}
                    onMouseEnter={() => setHoveredId(mine.id)}
                    onMouseLeave={() => setHoveredId(null)}>
                    {/* Pulse ring */}
                    {mine.status === 'active' && (
                      <circle cx={x} cy={y} r={r + 6} fill="none"
                        stroke={meta.color} strokeWidth="1" opacity={isHovered || isSelected ? 0.5 : 0.2} />
                    )}
                    {/* Main dot */}
                    <circle cx={x} cy={y} r={r} fill={meta.color}
                      opacity={isHovered || isSelected ? 1 : 0.8}
                      stroke={isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.7)'}
                      strokeWidth="1.5" />
                    {/* Label */}
                    <text x={x} y={y - r - 5} textAnchor="middle"
                      fontSize={isHovered || isSelected ? 11 : 9}
                      fontWeight={isHovered || isSelected ? 700 : 500}
                      fill={isDark ? '#fff' : '#1e293b'}
                      style={{ pointerEvents: 'none' }}>
                      {mine.shortName}
                    </text>
                    {/* Staff badge */}
                    {(isHovered || isSelected) && (
                      <text x={x} y={y + r + 14} textAnchor="middle"
                        fontSize={8} fill={meta.color}
                        style={{ pointerEvents: 'none' }}>
                        {mine.staff.toLocaleString('ru-RU')} чел.
                      </text>
                    )}
                  </g>
                )
              })}
            </g>

            {/* Legend */}
            <g transform="translate(12, 320)">
              <rect width="150" height={Object.keys(TYPE_META).length * 18 + 16} rx="6"
                fill={isDark ? 'rgba(10,15,28,0.8)' : 'rgba(255,255,255,0.88)'}
                stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} strokeWidth="1" />
              {Object.entries(TYPE_META).map(([type, meta], i) => (
                <g key={type} transform={`translate(10, ${i * 18 + 12})`}>
                  <circle cx="5" cy="0" r="5" fill={meta.color} />
                  <text x="14" y="4" fontSize="9" fill={isDark ? 'rgba(255,255,255,0.8)' : '#374151'}>
                    {meta.label}
                  </text>
                </g>
              ))}
            </g>
          </svg>
        </div>

        {/* Detail sidebar */}
        {selected ? (
          <div className="w-80 shrink-0 border-l overflow-y-auto p-4 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg p-2" style={{ background: `${TYPE_META[selected.type].color}18` }}>
                  {(() => { const Icon = TYPE_META[selected.type].icon; return <Icon className="h-4 w-4" style={{ color: TYPE_META[selected.type].color }} /> })()}
                </div>
                <div>
                  <Badge variant="outline" className="text-[9px]" style={{ borderColor: `${TYPE_META[selected.type].color}40`, color: TYPE_META[selected.type].color }}>
                    {TYPE_META[selected.type].label}
                  </Badge>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 rounded hover:bg-muted">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <div>
              <h2 className="text-sm font-bold leading-tight">{selected.name}</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">{selected.owner}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: MapPin,    label: 'Регион',    value: selected.region },
                { icon: Users,     label: 'Персонал',  value: `${selected.staff.toLocaleString('ru-RU')} чел.` },
                { icon: Gem,       label: 'Продукция', value: selected.product },
                { icon: BarChart3, label: 'Мощность',  value: selected.capacity },
                ...(selected.depth ? [{ icon: TrendingUp, label: 'Глубина', value: selected.depth }] : []),
              ].map((c, i) => {
                const Icon = c.icon
                return (
                  <div key={i} className="rounded-lg border p-2.5"
                    style={{ borderColor: `${TYPE_META[selected.type].color}15` }}>
                    <div className="flex items-center gap-1 mb-1">
                      <Icon className="h-2.5 w-2.5 text-muted-foreground" />
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{c.label}</span>
                    </div>
                    <p className="text-[11px] font-semibold leading-snug">{c.value}</p>
                  </div>
                )
              })}
              <div className="rounded-lg border p-2.5" style={{ borderColor: `${STATUS_META[selected.status].color}20` }}>
                <div className="flex items-center gap-1 mb-1">
                  <Zap className="h-2.5 w-2.5 text-muted-foreground" />
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Статус</span>
                </div>
                <span className="text-[11px] font-semibold" style={{ color: STATUS_META[selected.status].color }}>
                  {STATUS_META[selected.status].label}
                </span>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Ключевые факты</p>
              <ul className="space-y-1.5">
                {selected.facts.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px]">
                    <span className="h-1.5 w-1.5 rounded-full mt-1.5 shrink-0" style={{ background: TYPE_META[selected.type].color }} />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="w-72 shrink-0 border-l p-4 overflow-y-auto">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Объекты · {filtered.length} из {MINES.length}
            </p>
            <div className="space-y-1.5">
              {filtered.map((mine) => {
                const meta = TYPE_META[mine.type]
                return (
                  <button key={mine.id} onClick={() => setSelected(mine)}
                    className="w-full flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-all hover:scale-[1.01]"
                    style={{ borderColor: `${meta.color}20`, background: isDark ? `${meta.color}06` : `${meta.color}04` }}>
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: meta.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold truncate">{mine.shortName}</p>
                      <p className="text-[10px] text-muted-foreground">{mine.region}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{mine.staff.toLocaleString('ru-RU')}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

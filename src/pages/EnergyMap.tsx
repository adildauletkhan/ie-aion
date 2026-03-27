import { useState } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from 'react-simple-maps'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useTheme } from '@/hooks/useTheme'
import {
  Zap, Activity, Building2, AlertTriangle, CheckCircle2,
  MapPin, PlugZap,
} from 'lucide-react'

const GEO_URL = '/kz-regions.json'

type NodeStatus = 'normal' | 'warning' | 'critical'

interface EnergyNode {
  id: string
  name: string
  oblast: string
  centerCity: string
  coordinates: [number, number]
  voltageLevels: string[]
  substationsCount: number
  installedCapacityMW: number
  availableCapacityMW: number
  currentLoadMW: number
  mainGenerators: string[]
  mainSubstations: string[]
  status: NodeStatus
  transmissionGWh: number
  lossesPct: number
}

/* ── 18 energy nodes matching KEGOC reference map ───────────────────────── */
const NODES: EnergyNode[] = [
  {
    id: 'wko', name: 'Западно-Казахстанский энергоузел',
    oblast: 'Западно-Казахстанская область', centerCity: 'Орал',
    coordinates: [51.4, 51.2],
    voltageLevels: ['220кВ', '110кВ'], substationsCount: 12,
    installedCapacityMW: 640, availableCapacityMW: 520, currentLoadMW: 410,
    mainGenerators: ['ТЭЦ г. Уральск', 'ГТЭС Аксай'],
    mainSubstations: ['ПС 220кВ Уральская', 'ПС 220кВ Аксай', 'ПС 110кВ Чингирлау'],
    status: 'normal', transmissionGWh: 1840, lossesPct: 8.2,
  },
  {
    id: 'atyrau', name: 'Атырауский энергоузел',
    oblast: 'Атырауская область', centerCity: 'Атырау',
    coordinates: [51.9, 47.1],
    voltageLevels: ['220кВ', '110кВ'], substationsCount: 9,
    installedCapacityMW: 1080, availableCapacityMW: 920, currentLoadMW: 740,
    mainGenerators: ['Атырауская ТЭЦ', 'ГТЭС «ТенгизШевройл»', 'ГТЭС Атырау'],
    mainSubstations: ['ПС 220кВ Атырауская', 'ПС 220кВ Тенгиз', 'ПС 110кВ Доссор'],
    status: 'normal', transmissionGWh: 2960, lossesPct: 7.8,
  },
  {
    id: 'mangystau', name: 'Мангыстауский энергоузел',
    oblast: 'Мангыстауская область', centerCity: 'Актау',
    coordinates: [51.2, 43.7],
    voltageLevels: ['220кВ', '110кВ'], substationsCount: 8,
    installedCapacityMW: 1480, availableCapacityMW: 1250, currentLoadMW: 980,
    mainGenerators: ['МАЭК «КазАтомПром»', 'ГТЭС Жанаозен', 'ВЭС Мангыстау'],
    mainSubstations: ['ПС 220кВ Актауская', 'ПС 220кВ Жанаозен', 'ПС 110кВ Дунга'],
    status: 'warning', transmissionGWh: 3200, lossesPct: 9.1,
  },
  {
    id: 'aktobe', name: 'Актюбинский энергоузел',
    oblast: 'Актюбинская область', centerCity: 'Актобе',
    coordinates: [57.2, 50.3],
    voltageLevels: ['500кВ', '220кВ', '110кВ'], substationsCount: 22,
    installedCapacityMW: 1830, availableCapacityMW: 1620, currentLoadMW: 1310,
    mainGenerators: ['АктобеТЭЦ', 'ГТЭС Кенкияк'],
    mainSubstations: ['ПС 500кВ Актюбинская', 'ПС 220кВ ЗКГПП', 'ПС 220кВ Кенкияк'],
    status: 'normal', transmissionGWh: 4510, lossesPct: 7.2,
  },
  {
    id: 'kostanay', name: 'Костанайский энергоузел',
    oblast: 'Костанайская область', centerCity: 'Костанай',
    coordinates: [63.6, 53.2],
    voltageLevels: ['220кВ', '110кВ'], substationsCount: 18,
    installedCapacityMW: 720, availableCapacityMW: 590, currentLoadMW: 470,
    mainGenerators: ['Рудненская ТЭЦ', 'ГТЭС ССГПО'],
    mainSubstations: ['ПС 220кВ Костанайская', 'ПС 220кВ Рудненская', 'ПС 110кВ Лисаковск'],
    status: 'normal', transmissionGWh: 2100, lossesPct: 8.8,
  },
  {
    id: 'sko', name: 'Северо-Казахстанский энергоузел',
    oblast: 'Северо-Казахстанская область', centerCity: 'Петропавловск',
    coordinates: [69.1, 54.9],
    voltageLevels: ['220кВ', '110кВ'], substationsCount: 14,
    installedCapacityMW: 310, availableCapacityMW: 260, currentLoadMW: 195,
    mainGenerators: ['ТЭЦ-2 Петропавловск', 'ТЭЦ-3 Петропавловск'],
    mainSubstations: ['ПС 220кВ Петропавловская', 'ПС 110кВ Сергеевка', 'ПС 110кВ Булаево'],
    status: 'normal', transmissionGWh: 890, lossesPct: 9.5,
  },
  {
    id: 'kokshetau', name: 'Кокшетауский энергоузел',
    oblast: 'Акмолинская область (северная часть)', centerCity: 'Кокшетау',
    coordinates: [69.4, 53.3],
    voltageLevels: ['220кВ', '110кВ'], substationsCount: 16,
    installedCapacityMW: 480, availableCapacityMW: 410, currentLoadMW: 320,
    mainGenerators: ['Кокшетауская ТЭЦ', 'ВЭС Ерейментау'],
    mainSubstations: ['ПС 220кВ Кокшетауская', 'ПС 220кВ Щучинская', 'ПС 110кВ Степняк'],
    status: 'normal', transmissionGWh: 1380, lossesPct: 8.4,
  },
  {
    id: 'akmola', name: 'Акмолинский энергоузел',
    oblast: 'г. Астана + южная Акмолинская обл.', centerCity: 'Астана',
    coordinates: [71.5, 51.2],
    voltageLevels: ['500кВ', '220кВ', '110кВ'], substationsCount: 28,
    installedCapacityMW: 2350, availableCapacityMW: 2080, currentLoadMW: 1760,
    mainGenerators: ['АО «Астана Энергия»', 'ТЭЦ-1 Астана', 'ТЭЦ-2 Астана', 'ВЭС Астана'],
    mainSubstations: ['ПС 500кВ Астана', 'ПС 220кВ Северная', 'ПС 220кВ Южная'],
    status: 'normal', transmissionGWh: 6840, lossesPct: 5.9,
  },
  {
    id: 'pavlodar', name: 'Павлодарский энергоузел',
    oblast: 'Павлодарская область', centerCity: 'Павлодар',
    coordinates: [76.9, 52.3],
    voltageLevels: ['500кВ', '220кВ', '110кВ'], substationsCount: 24,
    installedCapacityMW: 4280, availableCapacityMW: 3850, currentLoadMW: 3120,
    mainGenerators: ['Экибастузская ГРЭС-1 им. Нуржанова', 'Экибастузская ГРЭС-2', 'Аксуская ГРЭС'],
    mainSubstations: ['ПС 500кВ Экибастузская', 'ПС 500кВ Павлодарская', 'ПС 220кВ Аксу'],
    status: 'normal', transmissionGWh: 14200, lossesPct: 6.1,
  },
  {
    id: 'karaganda', name: 'Карагандинский энергоузел',
    oblast: 'Карагандинская область', centerCity: 'Қарағанды',
    coordinates: [73.1, 49.8],
    voltageLevels: ['500кВ', '220кВ', '110кВ'], substationsCount: 32,
    installedCapacityMW: 3120, availableCapacityMW: 2750, currentLoadMW: 2380,
    mainGenerators: ['ТЭЦ-3 Карагандаэнерго', 'ТЭЦ АрселорМиттал', 'КарГРЭС'],
    mainSubstations: ['ПС 500кВ Карагандинская', 'ПС 220кВ Темиртауская', 'ПС 220кВ Шахтинская'],
    status: 'warning', transmissionGWh: 9800, lossesPct: 7.6,
  },
  {
    id: 'ulytau', name: 'Улытауский энергоузел',
    oblast: 'Улытауская область', centerCity: 'Жезқазған',
    coordinates: [67.7, 47.8],
    voltageLevels: ['220кВ', '110кВ'], substationsCount: 11,
    installedCapacityMW: 840, availableCapacityMW: 710, currentLoadMW: 590,
    mainGenerators: ['Жезказганская ТЭЦ «Kazakhmys»', 'Балхашская ТЭЦ «Kazakhmys»'],
    mainSubstations: ['ПС 220кВ Жезказганская', 'ПС 220кВ Балхаш', 'ПС 110кВ Сатпаев'],
    status: 'normal', transmissionGWh: 2850, lossesPct: 8.0,
  },
  {
    id: 'vko', name: 'Восточно-Казахстанский энергоузел',
    oblast: 'Восточно-Казахстанская область', centerCity: 'Өскемен',
    coordinates: [82.6, 49.9],
    voltageLevels: ['500кВ', '220кВ', '110кВ'], substationsCount: 20,
    installedCapacityMW: 2100, availableCapacityMW: 1870, currentLoadMW: 1520,
    mainGenerators: ['Усть-Каменогорская ГЭС', 'Шульбинская ГЭС', 'Бухтарминская ГЭС «Казцинк»'],
    mainSubstations: ['ПС 500кВ Усть-Каменогорская', 'ПС 220кВ Шульбинская', 'ПС 220кВ Зыряновская'],
    status: 'normal', transmissionGWh: 6200, lossesPct: 6.8,
  },
  {
    id: 'abay', name: 'Абайский энергоузел',
    oblast: 'Абайская область', centerCity: 'Семей',
    coordinates: [80.2, 50.4],
    voltageLevels: ['220кВ', '110кВ'], substationsCount: 13,
    installedCapacityMW: 680, availableCapacityMW: 560, currentLoadMW: 430,
    mainGenerators: ['Семипалатинская ТЭЦ', 'ГТЭС Аягоз'],
    mainSubstations: ['ПС 220кВ Семипалатинская', 'ПС 220кВ Аягозская', 'ПС 110кВ Шар'],
    status: 'normal', transmissionGWh: 1960, lossesPct: 8.7,
  },
  {
    id: 'zhetysu', name: 'Жетысуский энергоузел',
    oblast: 'Жетысуская область', centerCity: 'Талдықорған',
    coordinates: [78.4, 45.5],
    voltageLevels: ['220кВ', '110кВ'], substationsCount: 15,
    installedCapacityMW: 550, availableCapacityMW: 460, currentLoadMW: 380,
    mainGenerators: ['Капчагайская ГЭС', 'ГТЭС Балпык-Би'],
    mainSubstations: ['ПС 220кВ Жетысуская', 'ПС 220кВ Текели', 'ПС 110кВ Ушарал'],
    status: 'normal', transmissionGWh: 1540, lossesPct: 8.9,
  },
  {
    id: 'almaty', name: 'Алматинский энергоузел',
    oblast: 'г. Алматы + Алматинская область', centerCity: 'Алматы',
    coordinates: [76.9, 43.3],
    voltageLevels: ['500кВ', '220кВ', '110кВ'], substationsCount: 36,
    installedCapacityMW: 1950, availableCapacityMW: 1680, currentLoadMW: 1520,
    mainGenerators: ['Алматинская ТЭЦ-1', 'Алматинская ТЭЦ-2', 'Алматинская ТЭЦ-3', 'Капчагайская ГЭС'],
    mainSubstations: ['ПС 500кВ Алматинская', 'ПС 220кВ Восточная', 'ПС 220кВ Алатауская'],
    status: 'critical', transmissionGWh: 7400, lossesPct: 6.4,
  },
  {
    id: 'zhambyl', name: 'Жамбылский энергоузел',
    oblast: 'Жамбылская область', centerCity: 'Тараз',
    coordinates: [71.4, 42.9],
    voltageLevels: ['500кВ', '220кВ', '110кВ'], substationsCount: 19,
    installedCapacityMW: 1260, availableCapacityMW: 1080, currentLoadMW: 870,
    mainGenerators: ['Жамбылская ГРЭС им. Батурова', 'Тарасская ГТЭС'],
    mainSubstations: ['ПС 500кВ Жамбылская', 'ПС 220кВ Тараз', 'ПС 220кВ Шу'],
    status: 'normal', transmissionGWh: 3600, lossesPct: 7.9,
  },
  {
    id: 'kyzylorda', name: 'Кызылординский энергоузел',
    oblast: 'Кызылординская область', centerCity: 'Қызылорда',
    coordinates: [65.5, 44.8],
    voltageLevels: ['220кВ', '110кВ'], substationsCount: 10,
    installedCapacityMW: 580, availableCapacityMW: 490, currentLoadMW: 380,
    mainGenerators: ['Кызылординская ТЭЦ', 'ГТЭС Арыстановская'],
    mainSubstations: ['ПС 220кВ Кызылординская', 'ПС 110кВ Арысь', 'ПС 110кВ Байконур'],
    status: 'normal', transmissionGWh: 1620, lossesPct: 9.8,
  },
  {
    id: 'turkestan', name: 'Туркестанский энергоузел',
    oblast: 'Туркестанская обл. + г. Шымкент', centerCity: 'Шымкент',
    coordinates: [69.0, 41.8],
    voltageLevels: ['500кВ', '220кВ', '110кВ'], substationsCount: 25,
    installedCapacityMW: 1420, availableCapacityMW: 1180, currentLoadMW: 1050,
    mainGenerators: ['Шымкентская ТЭЦ-3', 'ТЭЦ «ЮжКазЭнерго»', 'ГТЭС «КазФосфат»'],
    mainSubstations: ['ПС 500кВ Шымкентская', 'ПС 220кВ Туркестан', 'ПС 220кВ Кентау'],
    status: 'warning', transmissionGWh: 4800, lossesPct: 8.3,
  },
]

const NODE_MAP = Object.fromEntries(NODES.map((n) => [n.id, n]))

const STATUS_COLOR: Record<NodeStatus, string> = {
  normal: '#22c55e',
  warning: '#f59e0b',
  critical: '#ef4444',
}

/* ── Node Modal ──────────────────────────────────────────────────────────── */
function NodeModal({ node, open, onClose }: {
  node: EnergyNode | null; open: boolean; onClose: () => void
}) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  if (!node) return null

  const utilization = Math.round((node.currentLoadMW / node.installedCapacityMW) * 100)

  const metrics = [
    { label: 'Уст. мощность',    value: `${node.installedCapacityMW.toLocaleString()} МВт`, color: isDark ? '#5CE0D6' : '#0D9488', icon: Zap },
    { label: 'Распол. мощность', value: `${node.availableCapacityMW.toLocaleString()} МВт`, color: isDark ? '#5CE0D6' : '#0D9488', icon: Activity },
    { label: 'Текущая нагрузка', value: `${node.currentLoadMW.toLocaleString()} МВт`,       color: '#f59e0b', icon: Activity },
    { label: 'Подстанций НЭС',   value: `${node.substationsCount} шт.`,                     color: isDark ? '#a78bfa' : '#7c3aed', icon: Building2 },
    { label: 'Передано (год)',    value: `${node.transmissionGWh.toLocaleString()} ГВт·ч`,   color: isDark ? '#5CE0D6' : '#0D9488', icon: Zap },
    { label: 'Потери в сети',     value: `${node.lossesPct}%`,                               color: '#f59e0b', icon: AlertTriangle },
  ]

  const statusIcon = node.status === 'normal'
    ? <CheckCircle2 className="h-4 w-4" style={{ color: STATUS_COLOR[node.status] }} />
    : <AlertTriangle className="h-4 w-4" style={{ color: STATUS_COLOR[node.status] }} />

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm max-h-[92vh] overflow-y-auto p-5">
        <DialogHeader className="mb-3">
          <DialogTitle className="text-sm leading-tight pr-6">{node.name}</DialogTitle>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <div className="flex items-center gap-1.5">
              {statusIcon}
              <span className="text-xs font-medium" style={{ color: STATUS_COLOR[node.status] }}>
                {node.status === 'normal' ? 'Норма' : node.status === 'warning' ? 'Внимание' : 'Критично'}
              </span>
            </div>
            <Badge variant="outline" className="text-[10px] gap-1">
              <MapPin className="h-2.5 w-2.5" />{node.centerCity}
            </Badge>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">{node.oblast}</p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 mb-3">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-lg border p-3"
              style={{ borderColor: `${m.color}25`, background: isDark ? `${m.color}08` : `${m.color}06` }}>
              <div className="flex items-center gap-1.5 mb-1">
                <m.icon className="h-3 w-3" style={{ color: m.color }} />
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{m.label}</span>
              </div>
              <p className="text-sm font-bold" style={{ color: m.color }}>{m.value}</p>
            </div>
          ))}
        </div>

        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>Загрузка установленной мощности</span>
            <span>{utilization}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{
              width: `${utilization}%`,
              background: utilization > 85
                ? 'linear-gradient(90deg,#f59e0b,#ef4444)'
                : 'linear-gradient(90deg,#0D9488,#14b8a6)',
            }} />
          </div>
        </div>

        <div className="mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Классы напряжения</p>
          <div className="flex flex-wrap gap-1.5">
            {node.voltageLevels.map((v) => (
              <Badge key={v} variant="outline" className="text-[10px]"
                style={{ borderColor: isDark ? 'rgba(92,224,214,0.3)' : 'rgba(13,148,136,0.3)', color: isDark ? '#5CE0D6' : '#0D9488' }}>
                {v}
              </Badge>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Основные генераторы</p>
          <ul className="space-y-1">
            {node.mainGenerators.map((g) => (
              <li key={g} className="flex items-start gap-2 text-xs">
                <PlugZap className="h-3 w-3 mt-0.5 shrink-0 text-amber-400" />
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Ключевые подстанции НЭС</p>
          <ul className="space-y-1">
            {node.mainSubstations.map((s) => (
              <li key={s} className="flex items-start gap-2 text-xs">
                <Zap className="h-3 w-3 mt-0.5 shrink-0" style={{ color: isDark ? '#5CE0D6' : '#0D9488' }} />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ── Main ────────────────────────────────────────────────────────────────── */
export default function EnergyMap() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [selectedNode, setSelectedNode] = useState<EnergyNode | null>(null)

  const statusCounts = {
    normal:   NODES.filter((n) => n.status === 'normal').length,
    warning:  NODES.filter((n) => n.status === 'warning').length,
    critical: NODES.filter((n) => n.status === 'critical').length,
  }

  const palette = isDark ? {
    ocean:       '#0a1628',
    base:        '#1a5c52',
    hover:       '#2d9e8e',
    stroke:      '#5CE0D6',
    border:      'rgba(92,224,214,0.25)',
    txtCity:     '#e0f0ee',
    txtNeighbor: 'rgba(140,180,210,0.6)',
  } : {
    ocean:       '#b8d4e3',
    base:        '#c5e3d8',
    hover:       '#84cdb8',
    stroke:      '#1e7568',
    border:      'rgba(30,117,104,0.35)',
    txtCity:     '#0f3d35',
    txtNeighbor: 'rgba(30,60,90,0.50)',
  }

  return (
    <div className="flex flex-col gap-4 p-4 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Карта ЕЭС Казахстана</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Энергоузлы НЭС KEGOC — нажмите на регион для подробной информации
          </p>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3 text-xs">
            {[
              { color: '#22c55e', label: `Норма (${statusCounts.normal})` },
              { color: '#f59e0b', label: `Внимание (${statusCounts.warning})` },
              { color: '#ef4444', label: `Критично (${statusCounts.critical})` },
            ].map((l) => (
              <div key={l.color} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
                <span className="text-muted-foreground">{l.label}</span>
              </div>
            ))}
          </div>

          <Select onValueChange={(v) => setSelectedNode(NODE_MAP[v] ?? null)}>
            <SelectTrigger className="w-52 h-8 text-xs">
              <SelectValue placeholder="Перейти к узлу…" />
            </SelectTrigger>
            <SelectContent>
              {NODES.map((n) => (
                <SelectItem key={n.id} value={n.id} className="text-xs">
                  <span className="inline-block h-2 w-2 rounded-full mr-1.5"
                    style={{ background: STATUS_COLOR[n.status] }} />
                  {n.centerCity}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Map */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{
          borderColor: palette.border,
          boxShadow: isDark
            ? '0 0 40px rgba(13,148,136,0.06) inset'
            : '0 4px 24px rgba(0,0,0,0.08)',
        }}
      >
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ center: [68, 48.5], scale: 1350 }}
          width={960}
          height={540}
          style={{ width: '100%', height: 'auto', display: 'block', background: palette.ocean }}
        >
          {/* Layer 1: Region fills */}
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={palette.base}
                  stroke="none"
                  style={{
                    default: { outline: 'none', cursor: 'pointer', fill: palette.base, transition: 'fill 0.15s ease' },
                    hover:   { outline: 'none', cursor: 'pointer', fill: palette.hover },
                    pressed: { outline: 'none', fill: palette.hover },
                  }}
                  onClick={() => setSelectedNode(NODE_MAP[geo.properties.id as string] ?? null)}
                />
              ))
            }
          </Geographies>

          {/* Everything below is non-interactive overlay */}
          <g pointerEvents="none">
            {/* Layer 2: Borders */}
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={`b-${geo.rsmKey}`}
                    geography={geo}
                    fill="none"
                    stroke={palette.stroke}
                    strokeWidth={1.2}
                    strokeLinejoin="round"
                    style={{
                      default: { outline: 'none' },
                      hover:   { outline: 'none' },
                      pressed: { outline: 'none' },
                    }}
                  />
                ))
              }
            </Geographies>

            {/* Node labels */}
            {NODES.map((node) => {
              const label = node.name.replace(' энергоузел', '').replace('ий', 'ий').replace('ский', 'ский')
              const parts = label.split(' ')
              return (
                <Marker key={`lbl-${node.id}`} coordinates={node.coordinates}>
                  {parts.map((part, i) => (
                    <text
                      key={i}
                      y={-12 + i * 10}
                      textAnchor="middle"
                      style={{
                        fontSize: 7.5,
                        fontFamily: 'Inter, system-ui, sans-serif',
                        fontWeight: 600,
                        fill: palette.txtCity,
                        letterSpacing: 0.2,
                      }}
                    >
                      {part}
                    </text>
                  ))}
                  <text
                    y={-12 + parts.length * 10}
                    textAnchor="middle"
                    style={{
                      fontSize: 6.5,
                      fontFamily: 'Inter, system-ui, sans-serif',
                      fontWeight: 400,
                      fill: palette.txtCity,
                      opacity: 0.7,
                    }}
                  >
                    энергоузел
                  </text>
                </Marker>
              )
            })}

            {/* Status dots */}
            {NODES.map((node) => (
              <Marker key={`dot-${node.id}`} coordinates={node.coordinates}>
                <circle r={7}  fill={STATUS_COLOR[node.status]} fillOpacity={0.18} />
                <circle r={4.5} fill={STATUS_COLOR[node.status]} fillOpacity={0.40} />
                <circle
                  r={3}
                  fill={STATUS_COLOR[node.status]}
                  stroke="#fff"
                  strokeWidth={0.8}
                />
              </Marker>
            ))}

            {/* Neighbor country labels */}
            {([
              ['РОССИЯ',          [67.0, 56.5]],
              ['КИТАЙ',           [85.0, 46.5]],
              ['КИРГИЗИЯ',        [75.5, 40.5]],
              ['УЗБЕКИСТАН',      [63.0, 40.2]],
              ['ТУРКМЕНИЯ',       [55.0, 39.8]],
            ] as [string, [number, number]][]).map(([name, coords]) => (
              <Marker key={name} coordinates={coords}>
                <text
                  textAnchor="middle"
                  style={{
                    fontSize: 9,
                    fill: palette.txtNeighbor,
                    fontFamily: 'Inter, system-ui, sans-serif',
                    fontWeight: 500,
                    letterSpacing: 2,
                  }}
                >
                  {name}
                </text>
              </Marker>
            ))}
          </g>
        </ComposableMap>
      </div>

      {/* Node quick-access grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-9 gap-2">
        {NODES.map((node) => (
          <button
            key={node.id}
            onClick={() => setSelectedNode(node)}
            className="rounded-lg border p-2 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              borderColor: `${STATUS_COLOR[node.status]}40`,
              background: isDark ? `${STATUS_COLOR[node.status]}10` : `${STATUS_COLOR[node.status]}08`,
            }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: STATUS_COLOR[node.status] }} />
              <span className="text-[10px] font-semibold truncate">{node.centerCity}</span>
            </div>
            <p className="text-[9px] text-muted-foreground">{node.currentLoadMW.toLocaleString()} МВт</p>
          </button>
        ))}
      </div>

      <NodeModal node={selectedNode} open={!!selectedNode} onClose={() => setSelectedNode(null)} />
    </div>
  )
}

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

/* ── Mercator projection ─────────────────────────────────────────────────── */
const YOFFSET = 270 + 1350 * Math.log(Math.tan(Math.PI / 4 + (48.5 * Math.PI) / 360))
function mp(lon: number, lat: number): [number, number] {
  const x = 1350 * ((lon - 68) * Math.PI) / 180 + W / 2
  const y = -1350 * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) + YOFFSET
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10]
}

type Status = 'ok' | 'warn' | 'maint'
type StationType = 'gnps' | 'nps' | 'terminal'

interface NPS {
  id: string; name: string; lon: number; lat: number
  pressure_in: number; pressure_out: number
  flow: number; pumps_active: number; pumps_total: number
  load_pct: number; status: Status; route_id: string
  throughput_ytd: number; temp: number
  stationType: StationType
}

interface OilRoute {
  id: string; name: string; shortName: string
  type: 'export' | 'domestic' | 'import'
  color: string; waypoints: [number, number][]
  length: number; throughput: number; capacity: number
  pressure: number; status: Status; dest: string
  owner: string; year: string; description: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   ROUTES — скорректированы по схеме КазТрансОйл
   ═══════════════════════════════════════════════════════════════════════════ */
const ROUTES: OilRoute[] = [
  {
    id: 'ktk',
    name: 'КТК — Каспийский трубопроводный консорциум',
    shortName: 'КТК',
    type: 'export', color: '#ef4444',
    waypoints: [
      mp(53.0, 45.5), mp(52.5, 46.2), mp(51.9, 47.1),
      mp(51.0, 47.5), mp(49.8, 47.8), mp(48.0, 47.0),
    ],
    length: 1511, throughput: 38.1, capacity: 42.0, pressure: 6.4, status: 'ok',
    dest: 'Новороссийск (Россия)', owner: 'КТК (КМГ 19%)', year: '2001',
    description: 'Тенгиз → Атырау → Новороссийск. Крупнейший казахстанский экспортный нефтепровод. Акционеры: КМГ (19%), Chevron (15%), ЛУКойл (12.5%), Shell (7.5%), ExxonMobil (7.5%).',
  },
  {
    id: 'atyrau-samara',
    name: 'Атырау — Самара',
    shortName: 'А-С',
    type: 'export', color: '#f59e0b',
    waypoints: [
      mp(51.9, 47.1), mp(51.6, 48.5), mp(51.4, 50.0),
      mp(51.2, 51.2), mp(50.8, 52.4),
    ],
    length: 1200, throughput: 15.4, capacity: 19.0, pressure: 6.1, status: 'ok',
    dest: 'Самара (Россия)', owner: 'КазТрансОйл', year: '1970 (рек. 2021)',
    description: 'Основной северный экспортный коридор. Атырау → Уральск → Самарские НПЗ. Реконструирован в 2018–2021 гг.',
  },
  {
    id: 'aka',
    name: 'Атырау — Кенкияк — Атасу (АКА)',
    shortName: 'АКА',
    type: 'domestic', color: '#f97316',
    // ИСПРАВЛЕНО: маршрут идёт на ВОСТОК от Атырау через Кенкияк до Атасу
    waypoints: [
      mp(51.9, 47.1), mp(53.5, 47.5), mp(55.5, 48.2),
      mp(55.7, 49.4), mp(58.5, 48.8), mp(61.5, 47.5),
      mp(63.8, 47.0), mp(65.8, 45.8), mp(68.2, 46.8),
      mp(71.7, 48.5),
    ],
    length: 1840, throughput: 10.2, capacity: 15.0, pressure: 6.0, status: 'ok',
    dest: 'Атасу (КЗ)', owner: 'КазТрансОйл', year: '2003–2009',
    description: 'Внутренний маршрут: западные месторождения → Атасу. Подпитка КККМ казахстанской нефтью. Связывает западную и восточную сети КЗ.',
  },
  {
    id: 'omsk-pavlodar',
    name: 'Омск — Павлодар (импорт)',
    shortName: 'О-П',
    type: 'import', color: '#6b7280',
    waypoints: [
      mp(73.4, 55.0), mp(73.6, 54.3), mp(75.0, 53.3), mp(76.9, 52.3),
    ],
    length: 430, throughput: 7.2, capacity: 9.0, pressure: 5.4, status: 'ok',
    dest: 'ПНХЗ Павлодар', owner: 'КазТрансОйл / Транснефть', year: '1972',
    description: 'Импорт западносибирской нефти из России (ОМСК) для обеспечения сырьём Павлодарского нефтехимического завода.',
  },
  {
    id: 'pavlodar-shymkent',
    name: 'Павлодар — Шымкент',
    shortName: 'П-Ш',
    type: 'domestic', color: '#6366f1',
    waypoints: [
      mp(76.9, 52.3), mp(74.5, 51.2), mp(73.1, 49.8),
      mp(71.0, 48.5), mp(67.7, 47.8), mp(66.5, 46.0),
      mp(65.5, 44.8), mp(67.5, 43.2), mp(69.6, 42.3),
    ],
    length: 1900, throughput: 8.3, capacity: 12.0, pressure: 5.5, status: 'maint',
    dest: 'ПКОП Шымкент', owner: 'КазТрансОйл', year: '1975',
    description: 'Обеспечение Шымкентского НПЗ нефтью из Павлодара. Самый длинный внутренний нефтепровод КЗ. Часть маршрута на плановом ТО.',
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
    description: 'Казахстанско-китайский нефтепровод. Поставки до НПЗ CNPC Дусаньцзы. Введён в 2006 г., расширение в 2009 г.',
  },
  {
    id: 'uzen-aktau',
    name: 'Узень — Жетыбай — Актау',
    shortName: 'У-А',
    type: 'domestic', color: '#8b5cf6',
    waypoints: [
      mp(53.8, 43.3), mp(53.0, 43.5), mp(52.0, 43.6), mp(51.2, 43.6),
    ],
    length: 330, throughput: 4.1, capacity: 6.0, pressure: 5.2, status: 'ok',
    dest: 'Морской терминал Актау', owner: 'КазТрансОйл', year: '1985',
    description: 'Подача нефти Мангистауских месторождений (Узень, Жетыбай) на Каспийский морской терминал Актау для танкерной транспортировки.',
  },
]

/* ═══════════════════════════════════════════════════════════════════════════
   СТАНЦИИ — ГНПС и НПС по схеме КазТрансОйл
   ═══════════════════════════════════════════════════════════════════════════ */
const BASE_STATIONS: NPS[] = [
  // КТК маршрут
  { id: 's-tengiz', name: 'ГОС «Тенгиз»', lon: 53.0, lat: 45.5, pressure_in: 0.5, pressure_out: 6.5, flow: 38.1, pumps_active: 5, pumps_total: 6, load_pct: 92, status: 'ok', route_id: 'ktk', throughput_ytd: 19.4, temp: 42, stationType: 'gnps' },
  { id: 's-ktk-maiak', name: 'НПС «Маяк»', lon: 52.2, lat: 46.3, pressure_in: 2.1, pressure_out: 6.1, flow: 37.5, pumps_active: 3, pumps_total: 4, load_pct: 88, status: 'ok', route_id: 'ktk', throughput_ytd: 18.7, temp: 38, stationType: 'nps' },
  { id: 's-kaspii', name: 'ГОС «Каспий»', lon: 51.5, lat: 47.0, pressure_in: 1.8, pressure_out: 6.0, flow: 36.8, pumps_active: 4, pumps_total: 5, load_pct: 85, status: 'ok', route_id: 'ktk', throughput_ytd: 18.2, temp: 36, stationType: 'gnps' },

  // Атырау-Самара маршрут
  { id: 's-atyrau-gnps', name: 'ГНПС Атырау', lon: 51.9, lat: 47.1, pressure_in: 1.2, pressure_out: 6.2, flow: 15.4, pumps_active: 3, pumps_total: 4, load_pct: 81, status: 'ok', route_id: 'atyrau-samara', throughput_ytd: 7.8, temp: 34, stationType: 'gnps' },
  { id: 's-bolshoy-chagan', name: 'НПС «Большой Чаган»', lon: 51.5, lat: 49.8, pressure_in: 1.5, pressure_out: 5.8, flow: 15.0, pumps_active: 2, pumps_total: 3, load_pct: 79, status: 'ok', route_id: 'atyrau-samara', throughput_ytd: 7.6, temp: 31, stationType: 'nps' },
  { id: 's-barminka', name: 'НПС «Барминка»', lon: 51.4, lat: 50.8, pressure_in: 1.4, pressure_out: 5.7, flow: 14.8, pumps_active: 2, pumps_total: 3, load_pct: 77, status: 'ok', route_id: 'atyrau-samara', throughput_ytd: 7.5, temp: 30, stationType: 'nps' },
  { id: 's-uralsk-gnps', name: 'ГНПС Уральск', lon: 51.2, lat: 51.2, pressure_in: 1.0, pressure_out: 5.5, flow: 14.5, pumps_active: 2, pumps_total: 3, load_pct: 76, status: 'ok', route_id: 'atyrau-samara', throughput_ytd: 7.3, temp: 28, stationType: 'gnps' },

  // АКА маршрут (запад→восток)
  { id: 's-kulsary', name: 'НПС «Кульсары»', lon: 53.5, lat: 47.5, pressure_in: 1.3, pressure_out: 5.9, flow: 10.2, pumps_active: 2, pumps_total: 3, load_pct: 68, status: 'ok', route_id: 'aka', throughput_ytd: 5.1, temp: 35, stationType: 'nps' },
  { id: 's-sagiz', name: 'НПС «Сагиз»', lon: 55.5, lat: 48.2, pressure_in: 1.2, pressure_out: 5.8, flow: 10.0, pumps_active: 2, pumps_total: 2, load_pct: 67, status: 'ok', route_id: 'aka', throughput_ytd: 5.0, temp: 33, stationType: 'nps' },
  { id: 's-kenkiyak', name: 'ГНПС «Кенкияк»', lon: 55.7, lat: 49.4, pressure_in: 1.5, pressure_out: 6.0, flow: 10.2, pumps_active: 2, pumps_total: 3, load_pct: 68, status: 'ok', route_id: 'aka', throughput_ytd: 5.2, temp: 31, stationType: 'gnps' },
  { id: 's-aktakim', name: 'ГНПС «Актаким»', lon: 57.2, lat: 50.3, pressure_in: 1.4, pressure_out: 5.7, flow: 10.1, pumps_active: 2, pumps_total: 3, load_pct: 74, status: 'ok', route_id: 'aka', throughput_ytd: 5.1, temp: 32, stationType: 'gnps' },
  { id: 's-nadir', name: 'НПС «Надир»', lon: 57.8, lat: 50.8, pressure_in: 1.3, pressure_out: 5.6, flow: 9.8, pumps_active: 2, pumps_total: 3, load_pct: 65, status: 'ok', route_id: 'aka', throughput_ytd: 5.0, temp: 30, stationType: 'nps' },
  { id: 's-tutunina', name: 'НПС им. Тутунина', lon: 59.0, lat: 48.8, pressure_in: 1.1, pressure_out: 5.5, flow: 9.6, pumps_active: 2, pumps_total: 3, load_pct: 64, status: 'ok', route_id: 'aka', throughput_ytd: 4.8, temp: 29, stationType: 'nps' },
  { id: 's-pryboi', name: 'НПС «Прибой»', lon: 61.5, lat: 47.5, pressure_in: 1.0, pressure_out: 5.4, flow: 9.4, pumps_active: 2, pumps_total: 2, load_pct: 63, status: 'ok', route_id: 'aka', throughput_ytd: 4.7, temp: 28, stationType: 'nps' },
  { id: 's-kumkol', name: 'ГНПС «Кумколь»', lon: 65.8, lat: 45.8, pressure_in: 1.4, pressure_out: 5.8, flow: 10.0, pumps_active: 2, pumps_total: 3, load_pct: 67, status: 'ok', route_id: 'aka', throughput_ytd: 5.0, temp: 31, stationType: 'gnps' },
  { id: 's-baraktyim', name: 'ГНПС «Баракатым»', lon: 68.2, lat: 46.8, pressure_in: 1.2, pressure_out: 5.6, flow: 9.8, pumps_active: 2, pumps_total: 3, load_pct: 65, status: 'ok', route_id: 'aka', throughput_ytd: 4.9, temp: 30, stationType: 'gnps' },
  { id: 's-atasu', name: 'ГНПС «Атасу»', lon: 71.7, lat: 48.5, pressure_in: 1.8, pressure_out: 5.9, flow: 10.2, pumps_active: 2, pumps_total: 3, load_pct: 68, status: 'ok', route_id: 'atasu-alashankou', throughput_ytd: 5.2, temp: 32, stationType: 'gnps' },

  // Омск-Павлодар
  { id: 's-petrofield', name: 'НПС «Петрофилд»', lon: 73.5, lat: 54.3, pressure_in: 1.2, pressure_out: 5.5, flow: 7.2, pumps_active: 2, pumps_total: 2, load_pct: 72, status: 'ok', route_id: 'omsk-pavlodar', throughput_ytd: 3.6, temp: 26, stationType: 'nps' },

  // Павлодар-Шымкент
  { id: 's-pavlodar-gnps', name: 'ГНПС Павлодар', lon: 76.9, lat: 52.3, pressure_in: 0.8, pressure_out: 5.8, flow: 8.3, pumps_active: 3, pumps_total: 4, load_pct: 69, status: 'maint', route_id: 'pavlodar-shymkent', throughput_ytd: 4.2, temp: 28, stationType: 'gnps' },
  { id: 's-ekibastuz', name: 'НПС Экибастуз', lon: 75.3, lat: 51.7, pressure_in: 1.2, pressure_out: 5.5, flow: 8.1, pumps_active: 2, pumps_total: 3, load_pct: 67, status: 'maint', route_id: 'pavlodar-shymkent', throughput_ytd: 4.1, temp: 27, stationType: 'nps' },
  { id: 's-aster', name: 'ГНПС «Астер»', lon: 73.1, lat: 49.8, pressure_in: 1.5, pressure_out: 5.6, flow: 8.0, pumps_active: 2, pumps_total: 3, load_pct: 67, status: 'ok', route_id: 'pavlodar-shymkent', throughput_ytd: 4.0, temp: 29, stationType: 'gnps' },
  { id: 's-zhezkazgan', name: 'НПС «Жезказган»', lon: 67.7, lat: 47.8, pressure_in: 1.6, pressure_out: 5.4, flow: 7.9, pumps_active: 2, pumps_total: 3, load_pct: 66, status: 'ok', route_id: 'pavlodar-shymkent', throughput_ytd: 4.0, temp: 28, stationType: 'nps' },
  { id: 's-jaksaliev', name: 'НПС им. Б.Джаксалиева', lon: 66.0, lat: 46.0, pressure_in: 1.3, pressure_out: 5.3, flow: 7.8, pumps_active: 2, pumps_total: 3, load_pct: 65, status: 'ok', route_id: 'pavlodar-shymkent', throughput_ytd: 3.9, temp: 31, stationType: 'nps' },
  { id: 's-kyzylorda', name: 'ГНПС «Нурай Курган»', lon: 65.5, lat: 44.8, pressure_in: 1.4, pressure_out: 5.5, flow: 7.7, pumps_active: 2, pumps_total: 3, load_pct: 64, status: 'ok', route_id: 'pavlodar-shymkent', throughput_ytd: 3.9, temp: 32, stationType: 'gnps' },
  { id: 's-zhuran-tobe', name: 'НПС «Журан Тобе»', lon: 67.5, lat: 43.2, pressure_in: 1.2, pressure_out: 5.3, flow: 7.6, pumps_active: 2, pumps_total: 2, load_pct: 63, status: 'ok', route_id: 'pavlodar-shymkent', throughput_ytd: 3.8, temp: 34, stationType: 'nps' },
  { id: 's-shymkent-gnps', name: 'ГНПС «Шымент»', lon: 69.6, lat: 42.3, pressure_in: 0.6, pressure_out: 4.8, flow: 7.5, pumps_active: 2, pumps_total: 3, load_pct: 62, status: 'ok', route_id: 'pavlodar-shymkent', throughput_ytd: 3.8, temp: 36, stationType: 'gnps' },

  // КККМ маршрут (восток → Китай)
  { id: 's-nps8', name: 'НПС-8', lon: 74.5, lat: 47.5, pressure_in: 1.6, pressure_out: 5.7, flow: 12.3, pumps_active: 2, pumps_total: 2, load_pct: 83, status: 'warn', route_id: 'atasu-alashankou', throughput_ytd: 6.2, temp: 37, stationType: 'nps' },
  { id: 's-nps9', name: 'НПС-9', lon: 77.0, lat: 46.5, pressure_in: 1.4, pressure_out: 5.5, flow: 12.1, pumps_active: 2, pumps_total: 2, load_pct: 81, status: 'ok', route_id: 'atasu-alashankou', throughput_ytd: 6.1, temp: 35, stationType: 'nps' },
  { id: 's-nps10', name: 'НПС-10', lon: 79.0, lat: 45.8, pressure_in: 1.2, pressure_out: 5.4, flow: 11.9, pumps_active: 2, pumps_total: 2, load_pct: 80, status: 'ok', route_id: 'atasu-alashankou', throughput_ytd: 6.0, temp: 34, stationType: 'nps' },
  { id: 's-nps15', name: 'НПС-15 (Достык)', lon: 81.8, lat: 45.3, pressure_in: 1.0, pressure_out: 5.2, flow: 11.7, pumps_active: 2, pumps_total: 2, load_pct: 79, status: 'ok', route_id: 'atasu-alashankou', throughput_ytd: 5.9, temp: 33, stationType: 'nps' },

  // Узень-Актау
  { id: 's-uzen', name: 'ГНПС «Узень»', lon: 53.8, lat: 43.3, pressure_in: 0.6, pressure_out: 5.2, flow: 4.1, pumps_active: 1, pumps_total: 2, load_pct: 68, status: 'ok', route_id: 'uzen-aktau', throughput_ytd: 2.1, temp: 38, stationType: 'gnps' },
  { id: 's-zhetybai', name: 'НПС «Жетыбай»', lon: 52.5, lat: 43.4, pressure_in: 0.8, pressure_out: 5.0, flow: 4.0, pumps_active: 1, pumps_total: 2, load_pct: 67, status: 'ok', route_id: 'uzen-aktau', throughput_ytd: 2.0, temp: 36, stationType: 'nps' },
  { id: 's-aktau-terminal', name: 'Терминал Актау', lon: 51.2, lat: 43.6, pressure_in: 0.4, pressure_out: 4.5, flow: 4.0, pumps_active: 1, pumps_total: 2, load_pct: 67, status: 'ok', route_id: 'uzen-aktau', throughput_ytd: 2.0, temp: 34, stationType: 'terminal' },
]

/* ── Города Казахстана для подписей на карте ───────────────────────────── */
const KZ_CITIES = [
  { name: 'УРАЛЬСК', lon: 51.2, lat: 51.2, major: true },
  { name: 'АТЫРАУ', lon: 51.9, lat: 47.1, major: true },
  { name: 'АКТОБЕ', lon: 57.2, lat: 50.3, major: true },
  { name: 'АСТАНА', lon: 71.4, lat: 51.2, major: true },
  { name: 'ПАВЛОДАР', lon: 76.9, lat: 52.3, major: true },
  { name: 'ПЕТРОПАВЛОВСК', lon: 69.2, lat: 54.9, major: false },
  { name: 'КОКШЕТАУ', lon: 69.4, lat: 53.3, major: false },
  { name: 'КОСТАНАЙ', lon: 63.6, lat: 53.2, major: false },
  { name: 'КЫЗЫЛОРДА', lon: 65.5, lat: 44.8, major: false },
  { name: 'ТАРАЗ', lon: 71.4, lat: 42.9, major: false },
  { name: 'АЛМАТЫ', lon: 76.9, lat: 43.3, major: true },
  { name: 'ТАЛДЫКОРГАН', lon: 78.4, lat: 45.0, major: false },
  { name: 'УСТ-КАМЕНОГОРСК', lon: 82.6, lat: 49.9, major: false },
  { name: 'ШЫМКЕНТ', lon: 69.6, lat: 42.3, major: true },
  { name: 'АКТАУ', lon: 51.2, lat: 43.6, major: false },
]

const STATUS_COLOR: Record<Status, string> = { ok: '#22c55e', warn: '#f59e0b', maint: '#6366f1' }
const STATUS_LABEL: Record<Status, string> = { ok: 'В работе', warn: 'Внимание', maint: 'Техобслуживание' }
const TYPE_LABEL: Record<string, string> = { export: 'Экспорт', domestic: 'Внутренний', import: 'Импорт' }

const THROUGHPUT_HISTORY = [
  { month: 'Янв', ktk: 36.2, as: 14.8, kkkm: 11.9, aka: 9.4 },
  { month: 'Фев', ktk: 35.8, as: 15.0, kkkm: 12.1, aka: 9.7 },
  { month: 'Мар', ktk: 37.1, as: 15.3, kkkm: 12.4, aka: 10.1 },
  { month: 'Апр', ktk: 37.8, as: 15.2, kkkm: 12.3, aka: 10.0 },
  { month: 'Май', ktk: 38.4, as: 15.5, kkkm: 12.5, aka: 10.3 },
  { month: 'Июн', ktk: 38.1, as: 15.4, kkkm: 12.6, aka: 10.2 },
]

function totalThroughput() { return ROUTES.filter(r => r.type !== 'import').reduce((s, r) => s + r.throughput, 0) }

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function OilPipelineMap() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [selectedRoute, setSelectedRoute] = useState<OilRoute | null>(null)
  const [selectedStation, setSelectedStation] = useState<NPS | null>(null)
  const [stations, setStations] = useState<NPS[]>(BASE_STATIONS)
  const [tick, setTick] = useState(0)
  const [filterType, setFilterType] = useState<'all' | 'export' | 'domestic' | 'import'>('all')

  useEffect(() => {
    const id = setInterval(() => {
      setTick(t => t + 1)
      setStations(prev => prev.map(s => ({
        ...s,
        flow: +(s.flow + (Math.random() - 0.5) * 0.3).toFixed(1),
        pressure_out: +(s.pressure_out + (Math.random() - 0.5) * 0.08).toFixed(2),
        temp: Math.round(s.temp + (Math.random() - 0.5) * 1.5),
      })))
    }, 4000)
    return () => clearInterval(id)
  }, [])

  const closePanel = useCallback(() => {
    setSelectedRoute(null)
    setSelectedStation(null)
  }, [])

  const palette = isDark ? {
    ocean: '#0a1628', base: '#1a3d4f', hover: '#1f5068',
    stroke: '#2dd4bf', border: 'rgba(45,212,191,0.22)',
    text: '#e0f0ee', muted: 'rgba(148,180,196,0.55)',
    city: 'rgba(200,220,230,0.55)', cityMajor: 'rgba(220,240,250,0.80)',
  } : {
    ocean: '#b8d4e3', base: '#cce8dc', hover: '#a0d4c0',
    stroke: '#0f766e', border: 'rgba(15,118,110,0.3)',
    text: '#0f3d35', muted: 'rgba(30,80,70,0.45)',
    city: 'rgba(30,60,80,0.45)', cityMajor: 'rgba(30,60,80,0.75)',
  }

  const visibleRoutes = ROUTES.filter(r => filterType === 'all' || r.type === filterType)
  const totalVol = totalThroughput()
  const exportVol = ROUTES.filter(r => r.type === 'export').reduce((s, r) => s + r.throughput, 0)

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
            Интерактивная схема — нажмите на трубопровод или ГНПС/НПС
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground mr-1">Тип</span>
          {(['all', 'export', 'domestic', 'import'] as const).map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className="px-3 py-1 rounded-full text-xs font-medium border transition-all"
              style={{
                background: filterType === t ? (isDark ? 'rgba(249,115,22,0.2)' : 'rgba(249,115,22,0.12)') : 'transparent',
                borderColor: filterType === t ? '#f97316' : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'),
                color: filterType === t ? '#f97316' : undefined,
              }}>
              {t === 'all' ? 'Все' : t === 'export' ? 'Экспорт' : t === 'domestic' ? 'Внутренние' : 'Импорт'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Общая прокачка', value: `${totalVol.toFixed(1)} млн т/год`, icon: Droplets, color: '#f97316' },
          { label: 'Экспортный объём', value: `${exportVol.toFixed(1)} млн т/год`, icon: ArrowRight, color: '#ef4444' },
          { label: 'Протяжённость сети', value: '7 165 км', icon: Navigation, color: '#6366f1' },
          { label: 'ГНПС/НПС в работе', value: `${stations.filter(s => s.status === 'ok').length}/${stations.length}`, icon: Gauge, color: '#22c55e' },
        ].map(k => (
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

          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold"
            style={{ background: isDark ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.85)', color: '#22c55e', backdropFilter: 'blur(8px)' }}>
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            LIVE · {tick > 0 ? `обновл. ${tick * 4}с назад` : 'только что'}
          </div>

          <ComposableMap
            projection="geoMercator"
            projectionConfig={{ center: [68, 48.5], scale: 1350 }}
            width={W} height={H}
            style={{ width: '100%', height: 'auto', display: 'block', background: palette.ocean }}>

            {/* Слой 1: кликабельные регионы */}
            <Geographies geography={GEO_URL}>
              {({ geographies }) => geographies.map(geo => (
                <Geography key={geo.rsmKey} geography={geo}
                  fill={palette.base} stroke="none"
                  style={{
                    default: { outline: 'none', fill: palette.base, transition: 'fill 0.15s' },
                    hover: { outline: 'none', fill: palette.hover },
                    pressed: { outline: 'none', fill: palette.hover },
                  }} />
              ))}
            </Geographies>

            {/* Слой 2: не-интерактивные элементы */}
            <g pointerEvents="none">

              {/* Границы регионов */}
              <Geographies geography={GEO_URL}>
                {({ geographies }) => geographies.map(geo => (
                  <Geography key={`b-${geo.rsmKey}`} geography={geo}
                    fill="none" stroke={palette.stroke} strokeWidth={0.6}
                    style={{ default: { outline: 'none' }, hover: { outline: 'none' }, pressed: { outline: 'none' } }} />
                ))}
              </Geographies>

              {/* Подписи городов */}
              {KZ_CITIES.map(city => {
                const [cx, cy] = mp(city.lon, city.lat)
                return (
                  <g key={city.name}>
                    {/* маленький ромб-значок административного центра */}
                    <rect
                      x={cx - 2.5} y={cy - 2.5} width={5} height={5}
                      fill={city.major ? (isDark ? 'rgba(220,240,255,0.7)' : 'rgba(30,60,100,0.6)') : (isDark ? 'rgba(180,210,230,0.45)' : 'rgba(60,90,120,0.4)')}
                      transform={`rotate(45, ${cx}, ${cy})`}
                    />
                    <text
                      x={cx} y={cy - 7}
                      textAnchor="middle"
                      style={{
                        fontSize: city.major ? 7.5 : 6.5,
                        fill: city.major ? palette.cityMajor : palette.city,
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: city.major ? 700 : 500,
                        letterSpacing: 0.8,
                      }}>
                      {city.name}
                    </text>
                  </g>
                )
              })}

              {/* Глубина трубопровода (glow) */}
              {visibleRoutes.map(r => (
                <polyline key={`glow-${r.id}`}
                  points={r.waypoints.map(p => p.join(',')).join(' ')}
                  fill="none" stroke={r.color}
                  strokeWidth={10} strokeOpacity={isDark ? 0.10 : 0.08}
                  strokeLinecap="round" strokeLinejoin="round" />
              ))}

              {/* Базовая линия трубопровода */}
              {visibleRoutes.map(r => (
                <polyline key={`base-${r.id}`}
                  points={r.waypoints.map(p => p.join(',')).join(' ')}
                  fill="none" stroke={r.color}
                  strokeWidth={r.type === 'import' ? 2 : r.status === 'maint' ? 2 : 3}
                  strokeOpacity={r.type === 'import' ? 0.55 : r.status === 'maint' ? 0.45 : 0.88}
                  strokeLinecap="round" strokeLinejoin="round"
                  strokeDasharray={r.type === 'import' ? '4 3' : r.status === 'maint' ? '6 4' : undefined} />
              ))}

              {/* Анимированный поток */}
              {visibleRoutes.filter(r => r.status !== 'maint' && r.type !== 'import').map(r => (
                <polyline key={`flow-${r.id}`}
                  points={r.waypoints.map(p => p.join(',')).join(' ')}
                  fill="none" stroke={r.color}
                  strokeWidth={3} strokeOpacity={0.88}
                  strokeLinecap="round" strokeLinejoin="round"
                  strokeDasharray="8 26">
                  <animate attributeName="stroke-dashoffset" from="0" to="-34"
                    dur={`${1.6 - r.throughput / 65}s`} repeatCount="indefinite" />
                </polyline>
              ))}

              {/* ГНПС — большие маркеры */}
              {stations.filter(s => s.stationType === 'gnps').map(s => {
                const [sx, sy] = mp(s.lon, s.lat)
                const c = STATUS_COLOR[s.status]
                return (
                  <g key={`gnps-${s.id}`}>
                    <circle cx={sx} cy={sy} r={9} fill={c} fillOpacity={0.12} />
                    <circle cx={sx} cy={sy} r={6} fill={c} fillOpacity={0.28} />
                    <circle cx={sx} cy={sy} r={4} fill={c} stroke={isDark ? '#0a1628' : '#fff'} strokeWidth={1.2} />
                    <circle cx={sx} cy={sy} r={2} fill={isDark ? '#0a1628' : '#fff'} />
                  </g>
                )
              })}

              {/* НПС — маленькие маркеры */}
              {stations.filter(s => s.stationType === 'nps').map(s => {
                const [sx, sy] = mp(s.lon, s.lat)
                const c = STATUS_COLOR[s.status]
                return (
                  <g key={`nps-${s.id}`}>
                    <circle cx={sx} cy={sy} r={5.5} fill={c} fillOpacity={0.14} />
                    <circle cx={sx} cy={sy} r={3} fill={c} fillOpacity={0.36} />
                    <circle cx={sx} cy={sy} r={2} fill={c} stroke={isDark ? '#0a1628' : '#fff'} strokeWidth={1} />
                  </g>
                )
              })}

              {/* Терминалы — квадрат */}
              {stations.filter(s => s.stationType === 'terminal').map(s => {
                const [sx, sy] = mp(s.lon, s.lat)
                const c = STATUS_COLOR[s.status]
                return (
                  <g key={`term-${s.id}`}>
                    <rect x={sx - 5} y={sy - 5} width={10} height={10} fill={c} fillOpacity={0.2} rx={2} />
                    <rect x={sx - 3} y={sy - 3} width={6} height={6} fill={c} rx={1} />
                  </g>
                )
              })}

              {/* Метки маршрутов */}
              {visibleRoutes.map(r => {
                const mid = r.waypoints[Math.floor(r.waypoints.length / 2)]
                return (
                  <g key={`lbl-${r.id}`}>
                    <rect x={mid[0] - 16} y={mid[1] - 9} width={32} height={12} rx={3} fill={r.color} fillOpacity={0.9} />
                    <text x={mid[0]} y={mid[1] + 1} textAnchor="middle"
                      style={{ fontSize: 7, fill: '#fff', fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>
                      {r.shortName}
                    </text>
                  </g>
                )
              })}

              {/* Страны и погранпереходы */}
              {([
                ['РОССИЯ', 62.0, 56.5],
                ['ОМСК', 73.4, 55.2],
                ['САМАРА ↑', 50.5, 53.0],
                ['КИТАЙ →', 84.5, 46.5],
                ['АЛАШАНЬКОУ', 83.5, 45.2],
                ['НОВОРОССИЙСК ←', 46.2, 46.2],
                ['УЗБЕКИСТАН', 62.0, 40.2],
                ['ТУРКМЕНИЯ', 55.0, 39.8],
                ['КЫРГЫЗИЯ', 75.5, 40.5],
              ] as [string, number, number][]).map(([name, lon, lat]) => {
                const [nx, ny] = mp(lon, lat)
                const isCity = ['ОМСК', 'САМАРА ↑', 'АЛАШАНЬКОУ', 'НОВОРОССИЙСК ←'].includes(name)
                return (
                  <text key={name} x={nx} y={ny} textAnchor="middle"
                    style={{
                      fontSize: isCity ? 7.5 : 8.5,
                      fill: isCity ? (isDark ? 'rgba(249,115,22,0.75)' : 'rgba(200,80,20,0.75)') : palette.muted,
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: isCity ? 600 : 500,
                      letterSpacing: isCity ? 0.5 : 1.5,
                    }}>
                    {name}
                  </text>
                )
              })}
            </g>

            {/* Интерактивные зоны трубопроводов */}
            {visibleRoutes.map(r => (
              <polyline key={`click-${r.id}`}
                points={r.waypoints.map(p => p.join(',')).join(' ')}
                fill="none" stroke="transparent" strokeWidth={18}
                style={{ cursor: 'pointer' }}
                onClick={() => { setSelectedStation(null); setSelectedRoute(r) }} />
            ))}

            {/* Интерактивные зоны станций */}
            {stations.map(s => {
              const [sx, sy] = mp(s.lon, s.lat)
              const r = s.stationType === 'gnps' ? 12 : 9
              return (
                <circle key={`click-${s.id}`}
                  cx={sx} cy={sy} r={r}
                  fill="transparent" style={{ cursor: 'pointer' }}
                  onClick={() => { setSelectedRoute(null); setSelectedStation(s) }} />
              )
            })}
          </ComposableMap>

          {/* Легенда */}
          <div className="absolute bottom-3 left-3 rounded-lg px-3 py-2"
            style={{ background: isDark ? 'rgba(0,0,0,0.72)' : 'rgba(255,255,255,0.90)', backdropFilter: 'blur(8px)' }}>
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5 font-semibold">Легенда</p>
            <div className="space-y-1">
              {ROUTES.map(r => (
                <div key={r.id} className="flex items-center gap-1.5">
                  <span className="h-0.5 w-5 rounded-full" style={{ background: r.color, opacity: r.type === 'import' ? 0.6 : 1 }} />
                  <span className="text-[9px]" style={{ color: isDark ? '#c0d0d8' : '#2a4040' }}>
                    {r.shortName} · {r.type === 'import' ? `${r.throughput} млн т` : `${r.throughput} млн т/год`}
                  </span>
                </div>
              ))}
              <div className="border-t mt-1 pt-1" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                {[
                  { dot: 'gnps', color: '#22c55e', label: 'ГНПС (головная)' },
                  { dot: 'nps', color: '#22c55e', label: 'НПС (перекачивающая)' },
                  { dot: 'warn', color: '#f59e0b', label: 'Внимание' },
                  { dot: 'maint', color: '#6366f1', label: 'ТО' },
                ].map(l => (
                  <div key={l.dot} className="flex items-center gap-1.5">
                    <span className="rounded-full" style={{
                      background: l.color,
                      width: l.dot === 'gnps' ? 8 : 6,
                      height: l.dot === 'gnps' ? 8 : 6,
                      display: 'inline-block',
                    }} />
                    <span className="text-[9px]" style={{ color: isDark ? '#c0d0d8' : '#2a4040' }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Side panel — детали маршрута */}
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
                      {TYPE_LABEL[selectedRoute.type]}
                    </Badge>
                    <Badge variant="outline" className="text-[9px]"
                      style={{ borderColor: STATUS_COLOR[selectedRoute.status] }}>
                      {STATUS_LABEL[selectedRoute.status]}
                    </Badge>
                  </div>
                )}
                {selectedStation && (
                  <div className="flex gap-1.5 mt-1.5">
                    <Badge className="text-[9px]"
                      style={{ background: STATUS_COLOR[selectedStation.status], color: '#fff' }}>
                      {STATUS_LABEL[selectedStation.status]}
                    </Badge>
                    <Badge variant="outline" className="text-[9px]">
                      {selectedStation.stationType === 'gnps' ? 'ГНПС' : selectedStation.stationType === 'terminal' ? 'Терминал' : 'НПС'}
                    </Badge>
                  </div>
                )}
              </div>
              <button onClick={closePanel}
                className="shrink-0 rounded-lg p-1 hover:bg-muted transition-colors">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedRoute && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Прокачка', value: `${selectedRoute.throughput} млн т/год`, color: selectedRoute.color },
                      { label: 'Мощность', value: `${selectedRoute.capacity} млн т/год`, color: '#6b7280' },
                      { label: 'Давление', value: `${selectedRoute.pressure} МПа`, color: '#3b82f6' },
                      { label: 'Протяжённость', value: `${selectedRoute.length.toLocaleString('ru-RU')} км`, color: '#8b5cf6' },
                    ].map(m => (
                      <div key={m.label} className="rounded-lg border p-2.5"
                        style={{ borderColor: `${m.color}28`, background: isDark ? `${m.color}08` : `${m.color}06` }}>
                        <p className="text-[9px] text-muted-foreground mb-0.5">{m.label}</p>
                        <p className="text-sm font-bold" style={{ color: m.color }}>{m.value}</p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-muted-foreground">Загрузка мощности</span>
                      <span className="font-semibold">{((selectedRoute.throughput / selectedRoute.capacity) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${(selectedRoute.throughput / selectedRoute.capacity) * 100}%`, background: `linear-gradient(90deg, ${selectedRoute.color}, ${selectedRoute.color}cc)` }} />
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

                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">ГНПС/НПС на маршруте</p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {stations.filter(s => s.route_id === selectedRoute.id).map(s => (
                        <button key={s.id}
                          onClick={() => { setSelectedRoute(null); setSelectedStation(s) }}
                          className="w-full flex items-center justify-between rounded-lg border px-2.5 py-1.5 hover:bg-muted/50 transition-colors text-left"
                          style={{ borderColor: `${STATUS_COLOR[s.status]}30` }}>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full shrink-0"
                              style={{ background: STATUS_COLOR[s.status], width: s.stationType === 'gnps' ? 8 : 5, height: s.stationType === 'gnps' ? 8 : 5, display: 'inline-block' }} />
                            <span className="text-[10px] font-medium">{s.name}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">{s.flow.toFixed(1)} млн т</span>
                        </button>
                      ))}
                    </div>
                  </div>

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
                    ].map(m => (
                      <div key={m.label} className="rounded-lg border p-2.5"
                        style={{ borderColor: `${m.color}28`, background: isDark ? `${m.color}08` : `${m.color}06` }}>
                        <p className="text-[9px] text-muted-foreground mb-0.5">{m.label}</p>
                        <p className="text-sm font-bold" style={{ color: m.color }}>{m.value}</p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-muted-foreground">Загрузка станции</span>
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
                        Нагрузка на насосы превышает 90%. Рекомендуется технический осмотр.
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
                        <span className="text-muted-foreground">Тип объекта</span>
                        <span className="font-medium">{selectedStation.stationType === 'gnps' ? 'ГНПС' : selectedStation.stationType === 'terminal' ? 'Терминал' : 'НПС'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Трубопровод</span>
                        <span className="font-medium">{ROUTES.find(r => r.id === selectedStation.route_id)?.shortName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[10px]">
                    {selectedStation.status === 'ok'
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                      : <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}
                    <span style={{ color: STATUS_COLOR[selectedStation.status] }}>
                      {STATUS_LABEL[selectedStation.status]}
                    </span>
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
              <p className="text-xs font-bold mb-0.5">Сводка по сети КТО</p>
              <p className="text-[10px] text-muted-foreground">Нажмите на трубопровод или ГНПС/НПС для деталей</p>
            </div>

            <div className="space-y-2">
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">Трубопроводы</p>
              {ROUTES.map(r => (
                <button key={r.id}
                  onClick={() => setSelectedRoute(r)}
                  className="w-full flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-muted/50 transition-colors text-left group"
                  style={{ borderColor: `${r.color}35` }}>
                  <div className="flex items-center gap-2">
                    <span className="h-0.5 w-5 rounded-full transition-all group-hover:w-7"
                      style={{ background: r.color, opacity: r.type === 'import' ? 0.6 : 1 }} />
                    <span className="text-[10px] font-medium">{r.shortName}</span>
                    {r.status === 'maint' && (
                      <Badge className="text-[8px] px-1 py-0"
                        style={{ background: '#6366f110', color: '#6366f1', border: '1px solid #6366f140' }}>ТО</Badge>
                    )}
                    {r.type === 'import' && (
                      <Badge className="text-[8px] px-1 py-0"
                        style={{ background: '#6b728010', color: '#9ca3af', border: '1px solid #6b728040' }}>Импорт</Badge>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{r.throughput} M т</span>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">Статус станций</p>
              {[
                { label: 'В работе', count: stations.filter(s => s.status === 'ok').length, color: '#22c55e' },
                { label: 'Внимание', count: stations.filter(s => s.status === 'warn').length, color: '#f59e0b' },
                { label: 'ТО', count: stations.filter(s => s.status === 'maint').length, color: '#6366f1' },
              ].map(l => (
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
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Динамика прокачки</p>
              <ResponsiveContainer width="100%" height={110}>
                <AreaChart data={THROUGHPUT_HISTORY}>
                  <XAxis dataKey="month" tick={{ fontSize: 7.5 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 7.5 }} tickLine={false} axisLine={false} width={24} />
                  <CartesianGrid strokeDasharray="3 3"
                    stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                  <Tooltip contentStyle={{ fontSize: 9 }} />
                  <Area type="monotone" dataKey="ktk" stroke="#ef4444" fill="#ef444420" strokeWidth={1.5} dot={false} name="КТК" />
                  <Area type="monotone" dataKey="as" stroke="#f59e0b" fill="#f59e0b15" strokeWidth={1.5} dot={false} name="А-С" />
                  <Area type="monotone" dataKey="kkkm" stroke="#dc2626" fill="#dc262615" strokeWidth={1.5} dot={false} name="КККМ" />
                  <Area type="monotone" dataKey="aka" stroke="#f97316" fill="#f9731615" strokeWidth={1.5} dot={false} name="АКА" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center gap-2 mt-auto pt-2 border-t"
              style={{ borderColor: palette.border }}>
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Данные обновляются в реальном времени</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick station grid */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">
          <BarChart3 className="inline h-3 w-3 mr-1" />
          ГНПС — быстрый доступ
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 gap-2">
          {stations.filter(s => s.stationType === 'gnps').map(s => (
            <button key={s.id}
              onClick={() => { setSelectedStation(s); setSelectedRoute(null) }}
              className="rounded-lg border p-2 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                borderColor: `${STATUS_COLOR[s.status]}40`,
                background: isDark ? `${STATUS_COLOR[s.status]}0d` : `${STATUS_COLOR[s.status]}08`,
              }}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: STATUS_COLOR[s.status] }} />
                <span className="text-[9px] font-semibold truncate">{s.name.replace('ГНПС ', '').replace('ГОС ', '')}</span>
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

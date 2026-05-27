import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/useTheme'
import { useLanguage } from '@/hooks/useLanguage'
import {
  Droplets, Gauge, Activity, X, MapPin,
  AlertTriangle, CheckCircle2, Wrench, ArrowRight,
  Zap, BarChart3, Navigation, ExternalLink, Building2,
  ChevronRight, Globe2, Brain, Calendar,
  DollarSign, Cpu,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  STATION_MAINTENANCE, ALL_REPAIRS, TOTAL_PPR, generateScenarios,
  type AIScenario, type RepairItem,
} from '../data/npsMaintenanceData'

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
   ROUTES — приведены строго по схеме АО «КазТрансОйл»
   ═══════════════════════════════════════════════════════════════════════════ */
const ROUTES: OilRoute[] = [
  {
    id: 'ktk',
    name: 'КТК — Каспийский трубопроводный консорциум',
    shortName: 'КТК',
    type: 'export', color: '#ef4444',
    // Тенгиз → Атырау → на запад вдоль Каспия → пересечение в Россию → Новороссийск
    waypoints: [
      mp(53.0, 45.5), mp(51.9, 47.1),
      mp(50.5, 47.5), mp(49.3, 47.4),
      mp(48.0, 47.0), mp(46.8, 46.7),
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
    // Атырау → строго на север вдоль р.Урал → Уральск → пересечение в Россию → Самара
    waypoints: [
      mp(51.9, 47.1), mp(51.9, 47.8), mp(51.6, 49.0),
      mp(51.3, 50.3), mp(51.2, 51.2), mp(50.9, 52.3),
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
    // Атырау → Кенкияк (через Актобе) → Кумколь → Баракатым → Атасу
    waypoints: [
      mp(51.9, 47.1), mp(53.2, 47.4), mp(54.8, 48.1),
      mp(55.7, 49.4), mp(57.2, 50.3), mp(59.5, 50.0),
      mp(61.5, 47.5), mp(63.8, 47.0), mp(65.8, 45.8),
      mp(68.2, 46.8), mp(71.7, 48.5),
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
    // Омск → Петропавловск → Павлодар (с севера)
    waypoints: [
      mp(73.4, 55.0), mp(72.5, 54.5), mp(72.8, 53.7),
      mp(73.5, 52.8), mp(76.9, 52.3),
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
    // Павлодар → Экибастуз → Астана (обход) → Жезказган → Кызылорда → Шымкент
    waypoints: [
      mp(76.9, 52.3), mp(75.3, 51.7), mp(74.2, 51.0),
      mp(72.5, 51.2), mp(71.0, 51.0), mp(70.5, 49.5),
      mp(68.4, 48.1), mp(67.7, 47.8), mp(66.5, 46.0),
      mp(65.5, 44.8), mp(66.2, 43.8), mp(67.5, 43.2),
      mp(68.5, 42.9), mp(69.6, 42.3),
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
    // Атасу → НПС-8 → НПС-9 → НПС-10 → НПС-15 Достык → граница КНР
    waypoints: [
      mp(71.7, 48.5), mp(74.5, 47.5), mp(77.0, 46.5),
      mp(79.0, 45.8), mp(81.0, 45.4), mp(82.3, 45.2),
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
    // Узень → Жетыбай → Актау (морской терминал) — с востока на запад в Мангистау
    waypoints: [
      mp(53.8, 43.3), mp(52.9, 43.4),
      mp(52.2, 43.5), mp(51.3, 43.6),
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
const STATUS_LABEL_KEY: Record<Status, string> = { ok: 'pmapStatusOk', warn: 'pmapStatusWarn', maint: 'pmapStatusMaint' }
const TYPE_LABEL_KEY: Record<string, string> = { export: 'pmapTypeExport', domestic: 'pmapTypeDomestic', import: 'pmapTypeImport' }

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
   KTO ASSET STRUCTURE
   ═══════════════════════════════════════════════════════════════════════════ */
const KTO_STRUCTURE = {
  parent: { name: 'АО «КазТрансОйл»', country: 'Казахстан', color: '#3b82f6' },
  children: [
    {
      id: 'szhtk', name: 'АО «СЗТК «МунайТас»', country: 'Казахстан',
      share: 51, color: '#0ea5e9',
      desc: 'Северо-западный трубопроводный консорциум. Эксплуатация нефтепроводов в СКО и ЗКО.',
      routes: ['Уральск — Самара', 'Кенкияк — Атырау'],
      kpi: { length: '1 160 км', throughput: '7.2 млн т/год' },
    },
    {
      id: 'kktk', name: 'ТОО «Казахстанско-Китайский Трубопровод»', country: 'Казахстан',
      share: 50, color: '#6366f1',
      desc: 'Оператор казахстанского участка нефтепровода Казахстан–Китай. Совместное предприятие КТО и CNPC.',
      routes: ['Атасу — Алашанькоу (КККМ)'],
      kpi: { length: '1 384 км', throughput: '12.6 млн т/год' },
    },
    {
      id: 'bnt', name: 'ООО «Батумский нефтяной терминал»', country: 'Грузия',
      share: 100, color: '#10b981',
      desc: 'Нефтяной терминал в порту Батуми (Черное море). Перевалка казахстанской нефти на суда.',
      routes: ['Транзит: Баку — Тбилиси — Батуми'],
      kpi: { capacity: '5 млн т/год', tanks: '12 резервуаров' },
      children: [{
        id: 'bmp', name: 'ООО «Батумский морской порт»', country: 'Грузия',
        share: 100, color: '#14b8a6',
        note: 'Эксклюзивные права на управление 100% долей',
        kpi: { berths: '3 причала', depth: '12 м' },
      }],
    },
    {
      id: 'ptl', name: '«Petrotrans Limited»', country: 'БВО',
      share: 100, color: '#8b5cf6',
      desc: 'Холдинговая компания для зарубежных активов КТО. Зарегистрирована на Британских Виргинских островах.',
      routes: ['—'],
      kpi: { type: 'Холдинг', assets: 'Международные' },
    },
  ],
}

function StructureNode({ node, depth = 0, isDark }: {
  node: typeof KTO_STRUCTURE.children[0] & { children?: typeof KTO_STRUCTURE.children }
  depth?: number
  isDark: boolean
}) {
  const { t, translateData: tt } = useLanguage()
  const [open, setOpen] = useState(true)
  const hasChildren = node.children && node.children.length > 0

  return (
    <div className="relative">
      {depth > 0 && (
        <div className="absolute left-0 top-0 bottom-0 border-l-2 border-dashed"
          style={{ borderColor: `${node.color}40`, left: -20 }} />
      )}
      <div className="rounded-xl border p-4 mb-3 transition-all hover:shadow-md"
        style={{
          borderColor: `${node.color}40`,
          background: isDark ? `${node.color}08` : `${node.color}05`,
          marginLeft: depth > 0 ? 24 : 0,
        }}>
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Building2 className="h-4 w-4 shrink-0" style={{ color: node.color }} />
              <span className="font-semibold text-sm">{tt(node.name)}</span>
              <Badge variant="outline" className="text-xs"
                style={{ borderColor: `${node.color}50`, color: node.color }}>
                {node.share}%
              </Badge>
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Globe2 className="h-2.5 w-2.5" />{tt(node.country)}
              </Badge>
            </div>
            {'desc' in node && node.desc && (
              <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">{tt(node.desc)}</p>
            )}
            {'note' in node && (node as { note?: string }).note && (
              <p className="text-[10px] mt-1" style={{ color: node.color }}>
                ★ {tt((node as { note?: string }).note ?? '')}
              </p>
            )}
          </div>
          {hasChildren && (
            <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => setOpen(o => !o)}>
              <ChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-90' : ''}`} />
            </Button>
          )}
        </div>
        {/* KPIs */}
        {'kpi' in node && (
          <div className="flex flex-wrap gap-3 mt-2">
            {Object.entries(node.kpi ?? {}).map(([k, v]) => (
              <div key={k} className="text-xs">
                <span className="text-muted-foreground capitalize">{tt(k)}: </span>
                <span className="font-semibold" style={{ color: node.color }}>{tt(String(v))}</span>
              </div>
            ))}
          </div>
        )}
        {'routes' in node && (node as { routes?: string[] }).routes && (
          <div className="mt-1.5 text-[10px] text-muted-foreground">
            {t('pmapStructureRoutes')}: {(node as { routes: string[] }).routes.map(r => tt(r)).join(' · ')}
          </div>
        )}
      </div>
      {/* Children */}
      {hasChildren && open && (
        <div className="ml-6">
          {node.children!.map(child => (
            <StructureNode key={child.id} node={child as typeof KTO_STRUCTURE.children[0]} depth={depth + 1} isDark={isDark} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   STATION OEE MINI-PANEL (shown inside map side panel)
   ═══════════════════════════════════════════════════════════════════════════ */
function StationOEEPanel({ maintenance, isDark }: {
  maintenance: ReturnType<typeof Object.values<typeof STATION_MAINTENANCE[string]>>
  isDark: boolean
}) {
  const { t, translateData: tt, language } = useLanguage()
  const { oee, ppr2026, repairs } = maintenance as typeof STATION_MAINTENANCE[string]
  const nextRepair  = repairs[0]
  const critCount   = repairs.filter(r => r.priority === 'critical').length
  const oeeColor    = oee.oee >= 80 ? '#22c55e' : oee.oee >= 70 ? '#f59e0b' : '#ef4444'

  return (
    <div className="space-y-3">
      {/* OEE block */}
      <div className="rounded-lg border p-3 space-y-2"
        style={{ borderColor: `${oeeColor}30`, background: isDark ? `${oeeColor}08` : `${oeeColor}06` }}>
        <div className="flex items-center justify-between">
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-1">
            <Cpu className="h-3 w-3" />{t('pmapStationPanelOEEHeader')}
          </span>
          <span className="text-lg font-bold" style={{ color: oeeColor }}>{oee.oee.toFixed(1)}%</span>
        </div>
        {[
          { label: t('pmapStationPanelAvailability'), val: oee.availability },
          { label: t('pmapStationPanelPerformance'),  val: oee.performance },
          { label: t('pmapStationPanelQuality'),      val: oee.quality },
        ].map(m => (
          <div key={m.label}>
            <div className="flex justify-between text-[10px] mb-0.5">
              <span className="text-muted-foreground">{m.label}</span>
              <span className="font-medium">{m.val}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full" style={{
                width: `${m.val}%`,
                background: m.val >= 90 ? '#22c55e' : m.val >= 80 ? '#f59e0b' : '#ef4444',
              }} />
            </div>
          </div>
        ))}
        <div className="flex gap-3 text-[9px] text-muted-foreground pt-1 border-t" style={{ borderColor: `${oeeColor}20` }}>
          <span>MTBF: <b className="text-foreground">{oee.mtbf}ч</b></span>
          <span>MTTR: <b className="text-foreground">{oee.mttr}ч</b></span>
        </div>
      </div>

      {/* PPR budget */}
      <div className="rounded-lg border p-3 space-y-1.5"
        style={{ borderColor: 'rgba(99,102,241,0.25)', background: isDark ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.04)' }}>
        <div className="flex items-center justify-between">
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-1">
            <DollarSign className="h-3 w-3" />{t('pmapStationPanelPpr')}
          </span>
          <span className="text-[10px] font-bold text-indigo-400">{ppr2026.spent.toFixed(0)} / {ppr2026.planned.toFixed(0)} {t('npsCurrencyMln')}</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-indigo-500" style={{ width: `${ppr2026.pct}%` }} />
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground">
          <span>{t('pmapStationPanelMastered')}: {ppr2026.pct}%</span>
          <span>{t('pmapStationPanelRemaining')}: {ppr2026.remaining.toFixed(0)} {t('npsCurrencyMln')}</span>
        </div>
      </div>

      {/* Next repair */}
      {nextRepair && (
        <div className="rounded-lg border p-3"
          style={{
            borderColor: nextRepair.priority === 'critical' ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.3)',
            background: isDark
              ? (nextRepair.priority === 'critical' ? 'rgba(239,68,68,0.07)' : 'rgba(245,158,11,0.06)')
              : (nextRepair.priority === 'critical' ? 'rgba(239,68,68,0.05)' : 'rgba(245,158,11,0.04)'),
          }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            {nextRepair.priority === 'critical'
              ? <AlertTriangle className="h-3 w-3 text-red-400" />
              : <Calendar className="h-3 w-3 text-amber-400" />}
            <span className="text-[9px] uppercase tracking-widest font-semibold"
              style={{ color: nextRepair.priority === 'critical' ? '#f87171' : '#fbbf24' }}>
              {t('pmapStationPanelNextRepair')}
            </span>
          </div>
          <p className="text-[10px] font-medium mb-0.5">{tt(nextRepair.equipment)}</p>
          <p className="text-[10px] text-muted-foreground leading-relaxed mb-1.5">{tt(nextRepair.description)}</p>
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">{new Date(nextRepair.dueDate).toLocaleDateString(language === 'en' ? 'en-GB' : 'ru-RU', { day:'numeric', month:'long' })}</span>
            <span className="font-bold" style={{ color: nextRepair.priority === 'critical' ? '#f87171' : '#fbbf24' }}>
              {nextRepair.budget.toFixed(1)} {t('npsCurrencyMln')}
            </span>
          </div>
        </div>
      )}

      {critCount > 0 && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/08 p-2.5 flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
          <span className="text-[10px] text-red-400">
            {critCount} {critCount === 1 ? t('pmapStationPanelCritWorkSing') : t('pmapStationPanelCritWorkPlur')}
          </span>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   PPR / AI TAB
   ═══════════════════════════════════════════════════════════════════════════ */
const PRIORITY_COLOR = { critical: '#ef4444', high: '#f59e0b', medium: '#6366f1' } as const
const PRIORITY_LABEL_KEY = { critical: 'pmapPriorityCritical', high: 'pmapPriorityHigh', medium: 'pmapPriorityMedium' } as const

function RepairCard({ repair, isDark }: { repair: RepairItem; isDark: boolean }) {
  const { t, translateData: tt, language } = useLanguage()
  const color = PRIORITY_COLOR[repair.priority]
  const due   = new Date(repair.dueDate)
  const daysLeft = Math.ceil((due.getTime() - Date.now()) / 86400000)

  return (
    <div className="rounded-xl border p-3 space-y-2"
      style={{ borderColor: `${color}30`, background: isDark ? `${color}06` : `${color}04` }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <Badge className="text-[8px] px-1.5 py-0"
              style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
              {t(PRIORITY_LABEL_KEY[repair.priority])}
            </Badge>
            <Badge variant="outline" className="text-[8px] px-1.5 py-0">{
              repair.type === 'preventive' ? t('pmapPprRepairTypeMaintenance')
              : repair.type === 'corrective' ? t('pmapPprRepairTypeEmergency')
              : repair.type === 'overhaul' ? t('pmapPprRepairTypeOverhaul')
              : t('pmapPprRepairTypeInspection')
            }</Badge>
          </div>
          <p className="text-[11px] font-semibold">{tt(repair.stationName)}</p>
          <p className="text-[10px] text-muted-foreground">{tt(repair.equipment)}</p>
          <p className="text-[10px] mt-0.5 leading-relaxed">{tt(repair.description)}</p>
        </div>
      </div>
      <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: `${color}20` }}>
        <div className="flex items-center gap-1 text-[9px]" style={{ color: daysLeft < 14 ? '#ef4444' : '#94a3b8' }}>
          <Calendar className="h-2.5 w-2.5" />
          {due.toLocaleDateString(language === 'en' ? 'en-GB' : 'ru-RU', { day: 'numeric', month: 'short' })}
          {daysLeft < 14 && <span className="font-bold"> · {t('pmapPprDaysLeft')} {daysLeft}{t('pmapPprDaysLeftUnit')}</span>}
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold" style={{ color }}>{repair.budget.toFixed(1)} {t('npsCurrencyMln')}</p>
          {repair.oeeImpact > 0 && (
            <p className="text-[8px] text-green-400">+{repair.oeeImpact}% {t('pmapPprOeeImpact')}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function ScenarioCard({ scenario, selected, onSelect, isDark }: {
  scenario: AIScenario; selected: boolean; onSelect: () => void; isDark: boolean
}) {
  const { t, translateData: tt } = useLanguage()
  const color = scenario.id === 'A' ? '#10b981' : scenario.id === 'B' ? '#6366f1' : '#3b82f6'
  const bgSel = isDark ? `${color}18` : `${color}10`

  return (
    <button onClick={onSelect} className="w-full text-left rounded-xl border p-4 transition-all"
      style={{
        borderColor: selected ? color : `${color}30`,
        background: selected ? bgSel : 'transparent',
        boxShadow: selected ? `0 0 0 2px ${color}60` : 'none',
      }}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{scenario.icon}</span>
            <span className="font-bold text-sm" style={{ color }}>{tt(scenario.name)}</span>
            {scenario.id === 'B' && (
              <Badge className="text-[8px] px-1.5 py-0" style={{ background: `${color}25`, color, border: `1px solid ${color}50` }}>
                {t('pmapAiSelectedBadge')}
              </Badge>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">{tt(scenario.tagline)}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold" style={{ color }}>{scenario.totalCost.toFixed(0)}</p>
          <p className="text-[9px] text-muted-foreground">{t('npsCurrencyMln')}</p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {[
          { label: 'CAPEX', val: `${scenario.capexPct}%`, color },
          { label: t('pmapAiKpiSavings'), val: `${scenario.savings.toFixed(0)}₸`, color: '#22c55e' },
          { label: t('pmapAiKpiOee'),     val: `+${scenario.oeeGain}%`, color: '#60a5fa' },
          { label: t('pmapAiKpiRisk'),    val: `${scenario.riskScore}/10`, color: scenario.riskScore > 6 ? '#ef4444' : scenario.riskScore > 3 ? '#f59e0b' : '#22c55e' },
        ].map(k => (
          <div key={k.label} className="rounded-lg p-1.5 text-center"
            style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
            <p className="text-[8px] text-muted-foreground">{k.label}</p>
            <p className="text-[10px] font-bold" style={{ color: k.color }}>{k.val}</p>
          </div>
        ))}
      </div>

      {/* Reasoning */}
      <div className="space-y-0.5">
        {scenario.reasoning.map((r, i) => (
          <p key={i} className="text-[9px] text-muted-foreground flex items-start gap-1">
            <span style={{ color }}>›</span>{tt(r)}
          </p>
        ))}
      </div>

      {/* Items summary */}
      <div className="mt-2 pt-2 border-t flex gap-3 text-[9px]"
        style={{ borderColor: `${color}20` }}>
        <span className="text-green-400">{t('pmapAiSelectedDone').replace('{n}', String(scenario.selected.length))}</span>
        {scenario.deferred.length > 0 && (
          <span className="text-amber-400">{t('pmapAiSelectedDefer').replace('{n}', String(scenario.deferred.length))}</span>
        )}
      </div>
    </button>
  )
}

function PPRTab({ isDark }: { isDark: boolean }) {
  const { t, translateData: tt, language } = useLanguage()
  const [selectedScenario, setSelectedScenario] = useState<string>('B')
  const [filterPriority, setFilterPriority] = useState<'all' | 'critical' | 'high' | 'medium'>('all')
  const [filterStation, setFilterStation] = useState<string>('all')

  const scenarios = useMemo(
    () => generateScenarios(ALL_REPAIRS, TOTAL_PPR.planned),
    []
  )

  const activeScenario = scenarios.find(s => s.id === selectedScenario)!

  const filteredRepairs = ALL_REPAIRS.filter(r => {
    if (filterPriority !== 'all' && r.priority !== filterPriority) return false
    if (filterStation !== 'all' && r.stationId !== filterStation) return false
    return true
  })

  const stations = Array.from(new Set(ALL_REPAIRS.map(r => ({ id: r.stationId, name: r.stationName })))
    .values()).reduce((acc, { id, name }) => {
      if (!acc.find((a: { id: string }) => a.id === id)) acc.push({ id, name })
      return acc
    }, [] as { id: string; name: string }[])

  const critCount = ALL_REPAIRS.filter(r => r.priority === 'critical').length
  const totalBudget = ALL_REPAIRS.reduce((s, r) => s + r.budget, 0)

  return (
    <div className="space-y-4">

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t('pmapPprBudget'), value: `${TOTAL_PPR.planned.toFixed(0)} ${t('npsCurrencyMln')}`, sub: `${t('pmapPprMastered')} ${TOTAL_PPR.pct}%`, icon: DollarSign, color: '#6366f1' },
          { label: t('pmapPprCritWorks'), value: `${critCount}`, sub: t('pmapPprCritWorksSub'), icon: AlertTriangle, color: '#ef4444' },
          { label: t('pmapPprNextRepair'), value: tt(ALL_REPAIRS[0]?.stationName.split(' ').slice(-1)[0] ?? '—'), sub: ALL_REPAIRS[0] ? new Date(ALL_REPAIRS[0].dueDate).toLocaleDateString(language === 'en' ? 'en-GB' : 'ru-RU',{day:'numeric',month:'long'}) : '', icon: Calendar, color: '#f59e0b' },
          { label: t('pmapPprWorksCost'), value: `${totalBudget.toFixed(0)} ${t('npsCurrencyMln')}`, sub: `${ALL_REPAIRS.length} ${t('pmapPprWorksCostSub')}`, icon: Wrench, color: '#22c55e' },
        ].map(k => (
          <div key={k.label} className="rounded-xl border p-3"
            style={{ borderColor: `${k.color}30`, background: isDark ? `${k.color}0a` : `${k.color}07` }}>
            <div className="flex items-center gap-2 mb-1">
              <k.icon className="h-3.5 w-3.5" style={{ color: k.color }} />
              <span className="text-[10px] text-muted-foreground font-medium">{k.label}</span>
            </div>
            <p className="text-base font-bold" style={{ color: k.color }}>{k.value}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

        {/* ── Left: AI Scenarios ─────────────────────────────────────────────── */}
        <div className="xl:col-span-2 space-y-3">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-indigo-400" />
            <h3 className="text-sm font-bold">{t('pmapPprAiTitle')}</h3>
            <Badge className="text-[8px]" style={{ background:'rgba(99,102,241,0.2)', color:'#818cf8' }}>
              {t('pmapPprAiCapexBadge')}
            </Badge>
          </div>

          {/* Scenario cards */}
          <div className="space-y-2">
            {scenarios.map(s => (
              <ScenarioCard key={s.id} scenario={s}
                selected={selectedScenario === s.id}
                onSelect={() => setSelectedScenario(s.id)}
                isDark={isDark} />
            ))}
          </div>

          {/* Selected scenario detail */}
          {activeScenario && (
            <div className="rounded-xl border p-3 space-y-3"
              style={{ borderColor: 'rgba(99,102,241,0.3)', background: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.05)' }}>
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">
                {t('pmapPprAiSelectedHeader')}: {tt(activeScenario.name)}
              </p>
              <div className="space-y-1">
                <p className="text-[9px] text-green-400 font-semibold">✓ {t('pmapPprAiToDo')} ({activeScenario.selected.length}):</p>
                {activeScenario.selected.map(r => (
                  <div key={r.id} className="flex justify-between text-[10px] pl-3">
                    <span className="text-muted-foreground truncate mr-2">{tt(r.stationName)} — {tt(r.equipment.split(' ')[0])}</span>
                    <span className="font-medium shrink-0" style={{ color: PRIORITY_COLOR[r.priority] }}>{r.budget.toFixed(0)} ₸</span>
                  </div>
                ))}
              </div>
              {activeScenario.deferred.length > 0 && (
                <div className="space-y-1 pt-2 border-t" style={{ borderColor: 'rgba(99,102,241,0.2)' }}>
                  <p className="text-[9px] text-amber-400 font-semibold">↷ {t('pmapPprAiToDefer')} ({activeScenario.deferred.length}):</p>
                  {activeScenario.deferred.map(r => (
                    <div key={r.id} className="flex justify-between text-[10px] pl-3">
                      <span className="text-muted-foreground truncate mr-2">{tt(r.stationName)} — {tt(r.equipment.split(' ')[0])}</span>
                      <span className="font-medium shrink-0 text-amber-400">{r.budget.toFixed(0)} ₸</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-2 border-t flex gap-3 text-[10px]"
                style={{ borderColor: 'rgba(99,102,241,0.2)' }}>
                <span>{t('pmapPprAiTotal')}: <b className="text-indigo-400">{activeScenario.totalCost.toFixed(0)} {t('npsCurrencyMln')}</b></span>
                <span>{t('pmapPprAiSavings')}: <b className="text-green-400">{activeScenario.savings.toFixed(0)} {t('npsCurrencyMln')}</b></span>
                <span>{t('pmapPprAiOeeGain')}: <b className="text-blue-400">{activeScenario.oeeGain}%</b></span>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Repair list + OEE table ────────────────────────────────── */}
        <div className="xl:col-span-3 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Wrench className="h-4 w-4 text-amber-400" />
              {t('pmapPprRepairLog')}
            </h3>
            <div className="flex gap-1 flex-wrap">
              {(['all','critical','high','medium'] as const).map(p => (
                <button key={p} onClick={() => setFilterPriority(p)}
                  className="px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all"
                  style={{
                    background: filterPriority === p ? `${PRIORITY_COLOR[p as keyof typeof PRIORITY_COLOR] ?? '#6366f1'}20` : 'transparent',
                    borderColor: filterPriority === p ? (PRIORITY_COLOR[p as keyof typeof PRIORITY_COLOR] ?? '#6366f1') : 'rgba(128,128,128,0.2)',
                    color: filterPriority === p ? (PRIORITY_COLOR[p as keyof typeof PRIORITY_COLOR] ?? '#6366f1') : undefined,
                  }}>
                  {p === 'all' ? t('pmapPriorityAll') : t(PRIORITY_LABEL_KEY[p])}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[520px] overflow-y-auto pr-1">
            {filteredRepairs.map(repair => (
              <RepairCard key={repair.id} repair={repair} isDark={isDark} />
            ))}
          </div>

          {/* OEE Table */}
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2 mb-2">
              <Cpu className="h-4 w-4 text-blue-400" />
              {t('pmapPprOeeTable')}
            </h3>
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-[11px]">
                <thead>
                  <tr style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                    {[t('pmapPprTblObject'), t('pmapPprTblOee'), t('pmapPprTblAvail'), t('pmapPprTblPerf'), t('pmapPprTblMtbf'), t('pmapPprTblPpr')].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.values(STATION_MAINTENANCE).map((m, i) => {
                    const oeeColor = m.oee.oee >= 80 ? '#22c55e' : m.oee.oee >= 70 ? '#f59e0b' : '#ef4444'
                    return (
                      <tr key={m.stationId}
                        style={{ background: i % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)') }}>
                        <td className="px-3 py-2 font-medium">{tt(m.repairs[0]?.stationName ?? m.stationId)}</td>
                        <td className="px-3 py-2">
                          <span className="font-bold" style={{ color: oeeColor }}>{m.oee.oee.toFixed(1)}%</span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{m.oee.availability}%</td>
                        <td className="px-3 py-2 text-muted-foreground">{m.oee.performance}%</td>
                        <td className="px-3 py-2 text-muted-foreground">{m.oee.mtbf}{t('npsUnitHours')}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-indigo-500" style={{ width: `${m.ppr2026.pct}%` }} />
                            </div>
                            <span className="text-[9px] text-indigo-400 font-medium shrink-0">{m.ppr2026.pct}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function OilPipelineMap() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const navigate = useNavigate()
  const { t, translateData: tt, language } = useLanguage()

  const [activeTab, setActiveTab] = useState<'map' | 'structure' | 'ppr'>('map')
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
            {t('pmapTitle')}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('pmapSubtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Tab buttons */}
          <div className="flex rounded-lg border overflow-hidden text-xs font-medium">
            {([['map', t('pmapTabMap')], ['structure', t('pmapTabStructure')], ['ppr', t('pmapTabPpr')]] as const).map(([id, label]) => (
              <button key={id} onClick={() => setActiveTab(id as 'map' | 'structure' | 'ppr')}
                className="px-4 py-1.5 transition-colors"
                style={{
                  background: activeTab === id ? (id === 'ppr' ? '#6366f1' : '#f97316') : 'transparent',
                  color: activeTab === id ? '#fff' : undefined,
                }}>
                {label}
              </button>
            ))}
          </div>
          {activeTab === 'map' && (
            <>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground ml-2 mr-1">{t('pmapFilterLabel')}</span>
              {(['all', 'export', 'domestic', 'import'] as const).map(ft => (
                <button key={ft} onClick={() => setFilterType(ft)}
                  className="px-3 py-1 rounded-full text-xs font-medium border transition-all"
                  style={{
                    background: filterType === ft ? (isDark ? 'rgba(249,115,22,0.2)' : 'rgba(249,115,22,0.12)') : 'transparent',
                    borderColor: filterType === ft ? '#f97316' : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'),
                    color: filterType === ft ? '#f97316' : undefined,
                  }}>
                  {ft === 'all' ? t('pmapFilterAll') : ft === 'export' ? t('pmapFilterExport') : ft === 'domestic' ? t('pmapFilterDomestic') : t('pmapFilterImport')}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ══ STRUCTURE TAB ══ */}
      {activeTab === 'structure' && (
        <div className="space-y-4">
          {/* Parent node */}
          <div className="rounded-2xl border-2 p-5 text-center"
            style={{ borderColor: '#3b82f6', background: isDark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.05)' }}>
            <div className="flex items-center justify-center gap-2 mb-1">
              <Building2 className="h-6 w-6 text-blue-500" />
              <span className="text-xl font-bold text-blue-500">{tt(KTO_STRUCTURE.parent.name)}</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Globe2 className="h-3.5 w-3.5" />
              <span>{tt(KTO_STRUCTURE.parent.country)}</span>
              <span>·</span>
              <span>{t('pmapStructureSubsidiary')}</span>
            </div>
            <div className="mt-3 flex justify-center gap-4 flex-wrap">
              {[
                { label: t('pmapStructureLength'), val: `7 165 ${t('pmapUnitKm')}` },
                { label: t('pmapStructureThroughput2024'), val: `80.7 ${t('pmapUnitMlnT')}` },
                { label: t('pmapStructureNps'), val: language === 'en' ? '33 objects' : '33 объекта' },
                { label: t('pmapStructureEmployees'), val: '≈ 7 500' },
              ].map(({ label, val }) => (
                <div key={label} className="text-center">
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                  <p className="text-sm font-bold text-blue-500">{val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Children */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {KTO_STRUCTURE.children.map(node => (
              <StructureNode key={node.id}
                node={node as Parameters<typeof StructureNode>[0]['node']}
                isDark={isDark} />
            ))}
          </div>

          {/* Note */}
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-[11px] text-muted-foreground">
            {t('pmapStructureNote')}
          </div>
        </div>
      )}

      {/* ══ PPR / AI TAB ══ */}
      {activeTab === 'ppr' && (
        <PPRTab isDark={isDark} />
      )}

      {/* ══ MAP TAB ══ */}
      {activeTab === 'map' && (
      <>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t('pmapKpiTotal'),   value: `${totalVol.toFixed(1)} ${t('pmapUnitMlnYr')}`, icon: Droplets, color: '#f97316' },
          { label: t('pmapKpiExport'),  value: `${exportVol.toFixed(1)} ${t('pmapUnitMlnYr')}`, icon: ArrowRight, color: '#ef4444' },
          { label: t('pmapKpiNetwork'), value: `7 165 ${t('pmapUnitKm')}`, icon: Navigation, color: '#6366f1' },
          { label: t('pmapKpiStations'), value: `${stations.filter(s => s.status === 'ok').length}/${stations.length}`, icon: Gauge, color: '#22c55e' },
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
            {t('pmapLive')} · {tick > 0 ? t('pmapLiveAgoSecs').replace('{n}', String(tick * 4)) : t('pmapLiveJustNow')}
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
                      {tt(city.name)}
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
                    {tt(name)}
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
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5 font-semibold">{t('pmapLegendTitle')}</p>
            <div className="space-y-1">
              {ROUTES.map(r => (
                <div key={r.id} className="flex items-center gap-1.5">
                  <span className="h-0.5 w-5 rounded-full" style={{ background: r.color, opacity: r.type === 'import' ? 0.6 : 1 }} />
                  <span className="text-[9px]" style={{ color: isDark ? '#c0d0d8' : '#2a4040' }}>
                    {r.shortName} · {r.type === 'import' ? `${r.throughput} ${t('pmapUnitMlnT')}` : `${r.throughput} ${t('pmapUnitMlnYr')}`}
                  </span>
                </div>
              ))}
              <div className="border-t mt-1 pt-1" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                {[
                  { dot: 'gnps', color: '#22c55e', label: t('pmapLegendGnps') },
                  { dot: 'nps', color: '#22c55e', label: t('pmapLegendNps') },
                  { dot: 'warn', color: '#f59e0b', label: t('pmapStatusWarn') },
                  { dot: 'maint', color: '#6366f1', label: t('pmapStatusMaintShort') },
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
                  {selectedRoute ? tt(selectedRoute.name) : tt(selectedStation?.name ?? '')}
                </p>
                {selectedRoute && (
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    <Badge variant="outline" className="text-[9px]"
                      style={{ borderColor: selectedRoute.color, color: selectedRoute.color }}>
                      {selectedRoute.shortName}
                    </Badge>
                    <Badge variant="outline" className="text-[9px]">
                      {t(TYPE_LABEL_KEY[selectedRoute.type])}
                    </Badge>
                    <Badge variant="outline" className="text-[9px]"
                      style={{ borderColor: STATUS_COLOR[selectedRoute.status] }}>
                      {t(STATUS_LABEL_KEY[selectedRoute.status])}
                    </Badge>
                  </div>
                )}
                {selectedStation && (
                  <div className="flex gap-1.5 mt-1.5">
                    <Badge className="text-[9px]"
                      style={{ background: STATUS_COLOR[selectedStation.status], color: '#fff' }}>
                      {t(STATUS_LABEL_KEY[selectedStation.status])}
                    </Badge>
                    <Badge variant="outline" className="text-[9px]">
                      {selectedStation.stationType === 'gnps' ? t('pmapStationGnps') : selectedStation.stationType === 'terminal' ? t('pmapStationTerminal') : t('pmapStationNps')}
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
                      { label: t('pmapDetailThroughput'), value: `${selectedRoute.throughput} ${t('pmapUnitMlnYr')}`, color: selectedRoute.color },
                      { label: t('pmapDetailCapacity'),   value: `${selectedRoute.capacity} ${t('pmapUnitMlnYr')}`, color: '#6b7280' },
                      { label: t('pmapDetailPressure'),   value: `${selectedRoute.pressure} ${t('pmapUnitMPa')}`, color: '#3b82f6' },
                      { label: t('pmapDetailLength'),     value: `${selectedRoute.length.toLocaleString(language === 'en' ? 'en-GB' : 'ru-RU')} ${t('pmapUnitKm')}`, color: '#8b5cf6' },
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
                      <span className="text-muted-foreground">{t('pmapDetailLoad')}</span>
                      <span className="font-semibold">{((selectedRoute.throughput / selectedRoute.capacity) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${(selectedRoute.throughput / selectedRoute.capacity) * 100}%`, background: `linear-gradient(90deg, ${selectedRoute.color}, ${selectedRoute.color}cc)` }} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">{t('pmapDetailRoute')}</p>
                    <div className="flex items-center gap-1.5 text-xs">
                      <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="font-medium">{tt(selectedRoute.name.split('—')[0]?.trim() ?? '')}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span>{tt(selectedRoute.dest)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Wrench className="h-3 w-3 shrink-0" />
                      <span>{t('pmapDetailOperator')}: {tt(selectedRoute.owner)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Zap className="h-3 w-3 shrink-0" />
                      <span>{t('pmapDetailYearStart')}: {tt(selectedRoute.year)}</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-muted-foreground leading-relaxed">{tt(selectedRoute.description)}</p>

                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">{t('pmapDetailStationsRoute')}</p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {stations.filter(s => s.route_id === selectedRoute.id).map(s => (
                        <button key={s.id}
                          onClick={() => { setSelectedRoute(null); setSelectedStation(s) }}
                          className="w-full flex items-center justify-between rounded-lg border px-2.5 py-1.5 hover:bg-muted/50 transition-colors text-left"
                          style={{ borderColor: `${STATUS_COLOR[s.status]}30` }}>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full shrink-0"
                              style={{ background: STATUS_COLOR[s.status], width: s.stationType === 'gnps' ? 8 : 5, height: s.stationType === 'gnps' ? 8 : 5, display: 'inline-block' }} />
                            <span className="text-[10px] font-medium">{tt(s.name)}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">{s.flow.toFixed(1)} {t('pmapUnitMlnT')}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">{t('pmapPanelDynamics')}</p>
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
                      { label: t('pmapStationFlow'),     value: `${selectedStation.flow.toFixed(1)} ${t('pmapUnitMlnYr')}`, color: '#f97316' },
                      { label: t('pmapStationLoad'),     value: `${selectedStation.load_pct}%`, color: '#3b82f6' },
                      { label: t('pmapStationPressIn'),  value: `${selectedStation.pressure_in.toFixed(1)} ${t('pmapUnitMPa')}`, color: '#6b7280' },
                      { label: t('pmapStationPressOut'), value: `${selectedStation.pressure_out.toFixed(2)} ${t('pmapUnitMPa')}`, color: '#22c55e' },
                      { label: t('pmapStationPumps'),    value: `${selectedStation.pumps_active}/${selectedStation.pumps_total} ${t('pmapStationPumpsActive')}`, color: '#8b5cf6' },
                      { label: t('pmapStationTemp'),     value: `${selectedStation.temp}°C`, color: '#f59e0b' },
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
                      <span className="text-muted-foreground">{t('pmapStationLoadStation')}</span>
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
                        {t('pmapStationWarn')}
                      </p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">{t('pmapStationParams')}</p>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('pmapStationYTD')}</span>
                        <span className="font-medium">{selectedStation.throughput_ytd} {t('pmapUnitMlnT')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('pmapStationType')}</span>
                        <span className="font-medium">{selectedStation.stationType === 'gnps' ? t('pmapStationGnps') : selectedStation.stationType === 'terminal' ? t('pmapStationTerminal') : t('pmapStationNps')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('pmapStationPipeline')}</span>
                        <span className="font-medium">{ROUTES.find(r => r.id === selectedStation.route_id)?.shortName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[10px]">
                    {selectedStation.status === 'ok'
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                      : <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}
                    <span style={{ color: STATUS_COLOR[selectedStation.status] }}>
                      {t(STATUS_LABEL_KEY[selectedStation.status])}
                    </span>
                  </div>

                  {/* OEE + PPR mini-panel */}
                  {STATION_MAINTENANCE[selectedStation.id] && (
                    <StationOEEPanel maintenance={STATION_MAINTENANCE[selectedStation.id]} isDark={isDark} />
                  )}

                  {/* Link to tech scheme */}
                  {(selectedStation.stationType === 'gnps' || selectedStation.stationType === 'nps') && (
                    <button
                      onClick={() => navigate('/tech-scheme-kto')}
                      className="w-full mt-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-muted/50"
                      style={{ borderColor: '#3b82f680', color: '#3b82f6' }}>
                      <ExternalLink className="h-3.5 w-3.5" />
                      {t('pmapOpenTechScheme')}
                    </button>
                  )}
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
              <p className="text-xs font-bold mb-0.5">{t('pmapPanelDefaultTitle')}</p>
              <p className="text-[10px] text-muted-foreground">{t('pmapPanelDefaultHint')}</p>
            </div>

            <div className="space-y-2">
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">{t('pmapPanelPipelines')}</p>
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
                        style={{ background: '#6366f110', color: '#6366f1', border: '1px solid #6366f140' }}>{t('pmapStatusMaintShort')}</Badge>
                    )}
                    {r.type === 'import' && (
                      <Badge className="text-[8px] px-1 py-0"
                        style={{ background: '#6b728010', color: '#9ca3af', border: '1px solid #6b728040' }}>{t('pmapTypeImport')}</Badge>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{r.throughput} {t('pmapUnitMlnT')}</span>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">{t('pmapPanelStationsStatus')}</p>
              {[
                { label: t('pmapStatusOk'),          count: stations.filter(s => s.status === 'ok').length, color: '#22c55e' },
                { label: t('pmapStatusWarn'),        count: stations.filter(s => s.status === 'warn').length, color: '#f59e0b' },
                { label: t('pmapStatusMaintShort'),  count: stations.filter(s => s.status === 'maint').length, color: '#6366f1' },
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
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">{t('pmapPanelDynamics')}</p>
              <ResponsiveContainer width="100%" height={110}>
                <AreaChart data={THROUGHPUT_HISTORY.map(item => ({ ...item, month: tt(item.month) }))}>
                  <XAxis dataKey="month" tick={{ fontSize: 7.5 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 7.5 }} tickLine={false} axisLine={false} width={24} />
                  <CartesianGrid strokeDasharray="3 3"
                    stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                  <Tooltip contentStyle={{ fontSize: 9 }} />
                  <Area type="monotone" dataKey="ktk" stroke="#ef4444" fill="#ef444420" strokeWidth={1.5} dot={false} name={language === 'en' ? 'CPC' : 'КТК'} />
                  <Area type="monotone" dataKey="as" stroke="#f59e0b" fill="#f59e0b15" strokeWidth={1.5} dot={false} name={language === 'en' ? 'A-S' : 'А-С'} />
                  <Area type="monotone" dataKey="kkkm" stroke="#dc2626" fill="#dc262615" strokeWidth={1.5} dot={false} name={language === 'en' ? 'KCP' : 'КККМ'} />
                  <Area type="monotone" dataKey="aka" stroke="#f97316" fill="#f9731615" strokeWidth={1.5} dot={false} name={language === 'en' ? 'AKA' : 'АКА'} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center gap-2 mt-auto pt-2 border-t"
              style={{ borderColor: palette.border }}>
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">{t('pmapPanelDataLive')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick station grid */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">
          <BarChart3 className="inline h-3 w-3 mr-1" />
          {t('pmapPanelStationsAccess')}
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
                <span className="text-[9px] font-semibold truncate">{tt(s.name).replace(/^(ГНПС |ГОС |HPS |Tengiz HPS|Atyrau HPS|Caspii HPS|Mayak PS|Aktau Terminal)/, m => m.startsWith('ГНПС') || m.startsWith('ГОС') || m.startsWith('HPS') ? '' : m)}</span>
              </div>
              <p className="text-[9px] text-muted-foreground">{s.flow.toFixed(1)} {t('pmapUnitMlnT')}</p>
              <p className="text-[8px] text-muted-foreground">{s.pressure_out.toFixed(1)} {t('pmapUnitMPa')}</p>
            </button>
          ))}
        </div>
      </div>
      </>
      )}
    </div>
  )
}

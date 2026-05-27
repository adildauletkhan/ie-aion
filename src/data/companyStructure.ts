/**
 * Иерархическая структура АО «КазТрансОйл» для суточной сводки.
 *
 *   Компания (АО)
 *     └── Филиалы (территориальные)
 *           └── Станции (ГНПС / НПС / ГОС / Терминал)
 *                 └── Оборудование (НА, РВС, СИКН, манифольд, …)
 *
 * Ежесуточные показатели мокаются детерминированно по id, чтобы
 * между рендерами числа не «прыгали».
 */
import { STATION_MAINTENANCE } from './npsMaintenanceData'
import { EQUIPMENT_DETAILS } from '@/scene/equipmentDetails'

// ─── Types ────────────────────────────────────────────────────────────────────
export type NodeType = 'company' | 'branch' | 'station' | 'equipment'
export type NodeStatus = 'ok' | 'warn' | 'fault' | 'maint'
export type BranchKind = 'npu' | 'jv' | 'admin'   // НПУ / СП / административный

export interface DailyMetrics {
  oee:           number    // %
  availability:  number    // %
  uptime:        number    // hours / 24
  throughput:    { actual: number; plan: number }   // м³/сут
  exports:       { actual: number; plan: number }   // м³/сут
  energy:        { actual: number; plan: number }   // кВт·ч/сут
  energyPerTon:  { actual: number; plan: number }   // кВт·ч/т
  events:        { critical: number; medium: number; low: number }
  costs:         { energy: number; materials: number; repairs: number; personnel: number } // млн ₸
  personnel:     { onShift: number; total: number; supervisorTitle?: string; supervisor?: string }
  ppr:           { planned: number; spent: number; remaining: number; pct: number } // млн ₸
  emissions:     { co2: number; nox: number; voc: number }   // т/сут
  water:         { used: number; recycled: number }          // м³
  envIncidents:  number
}

export interface CompanyNode {
  id:        string
  type:      NodeType
  parentId?: string
  name:      string
  fullName?: string
  region?:   string
  director?: string
  city?:     string
  status:    NodeStatus
  branchKind?: BranchKind        // НПУ / СП / административный (для type='branch')
  ownershipShare?: number        // % владения АО КТО (для СП)
  pipelineLength?: number        // км маг. трубопроводов под управлением
  capacity?:       number        // млн т/год (проектная пропускная способность)
  metrics:   DailyMetrics
  recommendations?: string[]
  events?: { time: string; severity: 'critical' | 'medium' | 'low'; text: string }[]
}

// ─── Deterministic pseudo-random helpers ──────────────────────────────────────
function hash(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0
  return Math.abs(h)
}
function rand(seed: string, lo: number, hi: number, decimals = 1): number {
  const x = (hash(seed) % 10000) / 10000
  const v = lo + x * (hi - lo)
  return +v.toFixed(decimals)
}
function pickStatus(seed: string, distribution: NodeStatus[]): NodeStatus {
  return distribution[hash(seed) % distribution.length]
}

// ─── Производственные филиалы (НПУ) и дочерние общества ─────────────────────
//
// Соответствует структуре АО «КазТрансОйл» по консолидированной отчётности
// 2024 г.: 6 нефтепроводных управлений (НПУ) + СП «ККТ».
// Реальная сеть: 5 338 км маг. нефтепроводов + 2 307 км водоводов.
//
interface BranchSeed {
  id: string
  name: string
  fullName: string
  region: string
  director: string
  kind: BranchKind
  ownershipShare?: number
  pipelineLength: number   // км
  capacity:        number  // млн т/год
  stations: { id: string; name: string; type: 'gnps' | 'nps' | 'gos' | 'terminal'; city?: string; status?: NodeStatus }[]
}

const BRANCHES: BranchSeed[] = [
  {
    id: 'br-atr',
    name: 'Атырауское НПУ',
    fullName: 'Атырауское нефтепроводное управление',
    region: 'Атырауская обл. · Западно-Казахстанская обл.',
    director: 'Бекжанов Е.Р.', kind: 'npu',
    pipelineLength: 1232, capacity: 25.0,
    stations: [
      { id: 's-atyrau-gnps',    name: 'ГНПС Атырау',           type: 'gnps', city: 'Атырау' },
      { id: 's-bolshoy-chagan', name: 'НПС «Большой Чаган»',   type: 'nps',  city: 'Атырауская обл.' },
      { id: 's-barminka',       name: 'НПС «Барминка»',        type: 'nps',  city: 'Атырауская обл.' },
      { id: 's-uralsk-gnps',    name: 'ГНПС Уральск',          type: 'gnps', city: 'Уральск (ЗКО)' },
    ],
  },
  {
    id: 'br-kls',
    name: 'Кульсаринское НПУ',
    fullName: 'Кульсаринское нефтепроводное управление',
    region: 'Атырауская обл. (Жылыойский р-н)',
    director: 'Жумагулов А.Б.', kind: 'npu',
    pipelineLength: 720, capacity: 38.0,
    stations: [
      { id: 's-tengiz',     name: 'ГОС «Тенгиз» (приём)', type: 'gos',  city: 'Жылыой' },
      { id: 's-ktk-maiak',  name: 'НПС «Маяк»',            type: 'nps',  city: 'Атырау' },
      { id: 's-kaspii',     name: 'ГОС «Каспий»',          type: 'gos',  city: 'Атырау' },
      { id: 's-kulsary',    name: 'НПС «Кульсары»',        type: 'nps',  city: 'Кульсары' },
    ],
  },
  {
    id: 'br-akt',
    name: 'Актюбинское НПУ',
    fullName: 'Актюбинское нефтепроводное управление',
    region: 'Актюбинская обл.',
    director: 'Сериков Б.К.', kind: 'npu',
    pipelineLength: 893, capacity: 12.5,
    stations: [
      { id: 's-sagiz',     name: 'НПС «Сагиз»',     type: 'nps',  city: 'Сагиз' },
      { id: 's-kenkiyak',  name: 'ГНПС «Кенкияк»',  type: 'gnps', city: 'Кенкияк', status: 'warn' },
      { id: 's-aktakim',   name: 'ГНПС «Актаким»',  type: 'gnps', city: 'Актобе' },
      { id: 's-nadir',     name: 'НПС «Надир»',     type: 'nps',  city: 'Актобе' },
      { id: 's-tutunina',  name: 'НПС им. Тутунина', type: 'nps', city: 'Актобе' },
      { id: 's-pryboi',    name: 'НПС «Прибой»',    type: 'nps',  city: 'Актобе' },
    ],
  },
  {
    id: 'br-kzl',
    name: 'Кызылординское НПУ',
    fullName: 'Кызылординское нефтепроводное управление',
    region: 'Кызылординская / Туркестанская обл. · г. Шымкент',
    director: 'Назарбаев К.М.', kind: 'npu',
    pipelineLength: 1081, capacity: 11.0,
    stations: [
      { id: 's-kumkol',        name: 'ГНПС «Кумколь»',      type: 'gnps', city: 'Кызылординская обл.' },
      { id: 's-baraktyim',     name: 'ГНПС «Баракатым»',    type: 'gnps', city: 'Кызылординская обл.' },
      { id: 's-jaksaliev',     name: 'НПС им. Б.Джаксалиева', type: 'nps', city: 'Кызылорда' },
      { id: 's-kyzylorda',     name: 'ГНПС «Нурай Курган»',  type: 'gnps', city: 'Кызылорда' },
      { id: 's-zhuran-tobe',   name: 'НПС «Журан Тобе»',     type: 'nps',  city: 'Туркестан' },
      { id: 's-shymkent-gnps', name: 'ГНПС Шымкент',         type: 'gnps', city: 'Шымкент' },
    ],
  },
  {
    id: 'br-pav',
    name: 'Павлодарское НПУ',
    fullName: 'Павлодарское нефтепроводное управление',
    region: 'Павлодарская / Северо-Казахстанская обл.',
    director: 'Аманов Т.С.', kind: 'npu',
    pipelineLength: 587, capacity: 7.0,
    stations: [
      { id: 's-petrofield',     name: 'НПС «Петрофилд»',  type: 'nps',  city: 'Петропавловск' },
      { id: 's-pavlodar-gnps',  name: 'ГНПС Павлодар',    type: 'gnps', city: 'Павлодар', status: 'maint' },
      { id: 's-ekibastuz',      name: 'НПС Экибастуз',    type: 'nps',  city: 'Экибастуз', status: 'maint' },
    ],
  },
  {
    id: 'br-zhz',
    name: 'Жезказганское НПУ',
    fullName: 'Жезказганское нефтепроводное управление',
    region: 'Карагандинская / Улытауская обл.',
    director: 'Молдабеков С.А.', kind: 'npu',
    pipelineLength: 425, capacity: 6.5,
    stations: [
      { id: 's-aster',      name: 'ГНПС «Астер»',     type: 'gnps', city: 'Караганда' },
      { id: 's-zhezkazgan', name: 'НПС «Жезказган»',  type: 'nps',  city: 'Жезказган' },
    ],
  },
  {
    id: 'br-mng',
    name: 'Мангистауское НПУ',
    fullName: 'Мангистауское нефтепроводное управление',
    region: 'Мангистауская обл.',
    director: 'Тулеуов М.К.', kind: 'npu',
    pipelineLength: 400, capacity: 5.5,
    stations: [
      { id: 's-uzen',           name: 'ГНПС «Узень»',     type: 'gnps',     city: 'Жаңаөзен' },
      { id: 's-zhetybai',       name: 'НПС «Жетыбай»',    type: 'nps',      city: 'Жетыбай' },
      { id: 's-aktau-terminal', name: 'Морской терминал Актау', type: 'terminal', city: 'Актау' },
    ],
  },
  {
    id: 'br-kkt',
    name: 'ТОО «ККТ»',
    fullName: 'ТОО «Казахстанско-Китайский Трубопровод» (СП с CNPC)',
    region: 'Карагандинская / Алматинская / Жетысуская обл.',
    director: 'Алимбаев К.Т.', kind: 'jv', ownershipShare: 50,
    pipelineLength: 962, capacity: 20.0,
    stations: [
      { id: 's-atasu',  name: 'ГНПС «Атасу»',     type: 'gnps', city: 'Атасу' },
      { id: 's-nps8',   name: 'НПС-8',             type: 'nps',  city: 'Балхаш', status: 'warn' },
      { id: 's-nps9',   name: 'НПС-9',             type: 'nps',  city: 'Алматинская обл.' },
      { id: 's-nps10',  name: 'НПС-10',            type: 'nps',  city: 'Жаркент' },
      { id: 's-nps15',  name: 'НПС-15 (Достык)',   type: 'nps',  city: 'Достык' },
    ],
  },
]

// ─── Build station daily metrics ──────────────────────────────────────────────
//
// Реалистичные диапазоны для магистрального транспорта нефти КТО:
// - Прокачка: 4–25 тыс. м³/сут на станцию (ГОС-головки до 35–45 тыс.)
// - Уд. расход эл./энергии: 2.4–4.8 кВт·ч/т (норматив АО ~3.4)
// - ОЭЭ магистральных насосных: 87–94 % (доступность 96–98 %)
// - Затраты на сутки: 6–18 млн ₸/станция (50 % э/э, 18 % ремонты, 14 % персонал, 18 % материалы)
// - Персонал: 30–90 на станцию (8–22 в смене)
//
function makeStationMetrics(seed: string, stationType: string): DailyMetrics {
  const m = STATION_MAINTENANCE[seed]
  const baseOEE = m?.oee.oee ?? rand(seed + ':oee', 87, 93.5)
  const avail   = m?.oee.availability ?? rand(seed + ':av', 95.8, 98.4)

  const isTerminal = stationType === 'terminal'
  // Реалистичные пиковые перекачки в тыс. м³/сут на 1 станцию по типу узла
  const flowMin = stationType === 'gos'  ? 28 :
                  stationType === 'gnps' ? 14 :
                  stationType === 'nps'  ?  8 : 4
  const flowMax = stationType === 'gos'  ? 42 :
                  stationType === 'gnps' ? 24 :
                  stationType === 'nps'  ? 16 : 8
  const tpActual = Math.round(rand(seed + ':tp', flowMin * 1000, flowMax * 1000, 0))
  const tpPlan   = Math.round(tpActual / rand(seed + ':tpp', 0.96, 1.04, 3))

  // Удельный расход 2.4–4.8 кВт·ч/т (плотность нефти ≈ 0.85 т/м³ → энергия в кВт·ч/сут)
  const ept      = +rand(seed + ':ept', 2.4, 4.8, 2)
  const enActual = Math.round(tpActual * 0.85 * ept)
  const enPlan   = Math.round(enActual / rand(seed + ':enp', 0.97, 1.04, 3))

  const pprPlanned = m?.ppr2026.planned ?? rand(seed + ':ppr', 80, 320)
  const pprSpent   = m?.ppr2026.spent   ?? rand(seed + ':spent', 30, pprPlanned * 0.55)

  // Структура суточных затрат: ~50 % э/э, ~18 % ТО, ~14 % персонал, ~18 % материалы
  const totalCost  = +rand(seed + ':total', 5.5, 16.5, 2)
  const cEnergy    = +(totalCost * rand(seed + ':share-e', 0.46, 0.55, 3)).toFixed(2)
  const cRepairs   = +(totalCost * rand(seed + ':share-r', 0.14, 0.21, 3)).toFixed(2)
  const cPersonnel = +(totalCost * rand(seed + ':share-p', 0.12, 0.16, 3)).toFixed(2)
  const cMaterials = +(totalCost - cEnergy - cRepairs - cPersonnel).toFixed(2)

  // Персонал: ГОС 60–90, ГНПС 50–80, НПС 30–55, терминал 25–60. На смене ≈ 25 % списка.
  const totalP = stationType === 'gos'      ? 60 + (hash(seed + ':p1') % 30)
               : stationType === 'gnps'     ? 50 + (hash(seed + ':p1') % 30)
               : stationType === 'nps'      ? 30 + (hash(seed + ':p1') % 25)
               :                              25 + (hash(seed + ':p1') % 35)
  const onShift = Math.max(6, Math.round(totalP * 0.25))

  return {
    oee:           +baseOEE.toFixed(1),
    availability:  +avail.toFixed(1),
    uptime:        +rand(seed + ':up', 22.6, 24.0, 2),
    throughput:    { actual: tpActual,  plan: tpPlan },
    exports:       { actual: Math.round(tpActual * 0.92), plan: Math.round(tpPlan * 0.93) },
    energy:        { actual: enActual,  plan: enPlan },
    energyPerTon:  { actual: ept, plan: 3.4 },
    events:        {
      critical: hash(seed + ':crit') % 18 === 0 ? 1 : 0,
      medium:   hash(seed + ':med')  % 5  === 0 ? 1 + (hash(seed + ':med2') % 2) : 0,
      low:      1 + (hash(seed + ':low') % 4),
    },
    costs:         { energy: cEnergy, materials: cMaterials, repairs: cRepairs, personnel: cPersonnel },
    personnel:     {
      onShift, total: totalP,
      supervisorTitle: 'Начальник смены',
      supervisor: ['Жумабеков А.Н.', 'Сериков Б.Т.', 'Алиев Д.К.', 'Танатаров Е.С.', 'Назаров Б.М.', 'Кенжебаев Р.А.', 'Ибраев А.Ш.'][hash(seed + ':sv') % 7],
    },
    ppr:           { planned: pprPlanned, spent: pprSpent, remaining: +(pprPlanned - pprSpent).toFixed(1), pct: Math.round(pprSpent / pprPlanned * 100) },
    emissions:     {
      // Магистральный транспорт нефти — невысокие удельные выбросы (без сжигания нефти)
      co2: +rand(seed + ':co2',  isTerminal ? 35  : 90, isTerminal ? 110 : 240, 0),
      nox: +rand(seed + ':nox',  0.20, 0.85, 2),
      voc: +rand(seed + ':voc',  0.04, 0.20, 2),
    },
    water:         { used: +rand(seed + ':w1', 35, 110, 0), recycled: +rand(seed + ':w2', 22, 80, 0) },
    envIncidents:  hash(seed + ':env') % 22 === 0 ? 1 : 0,
  }
}

// ─── Aggregate metrics by summing children ────────────────────────────────────
function aggregate(children: DailyMetrics[]): DailyMetrics {
  if (children.length === 0) return makeStationMetrics('empty', 'nps')
  const sum = (k: (m: DailyMetrics) => number) => children.reduce((a, c) => a + k(c), 0)
  const avg = (k: (m: DailyMetrics) => number) => sum(k) / children.length

  return {
    oee:           +avg(m => m.oee).toFixed(1),
    availability:  +avg(m => m.availability).toFixed(1),
    uptime:        +avg(m => m.uptime).toFixed(2),
    throughput:    { actual: Math.round(sum(m => m.throughput.actual)),   plan: Math.round(sum(m => m.throughput.plan)) },
    exports:       { actual: Math.round(sum(m => m.exports.actual)),      plan: Math.round(sum(m => m.exports.plan)) },
    energy:        { actual: Math.round(sum(m => m.energy.actual)),       plan: Math.round(sum(m => m.energy.plan)) },
    energyPerTon:  { actual: +avg(m => m.energyPerTon.actual).toFixed(2), plan: 7.5 },
    events:        {
      critical: sum(m => m.events.critical),
      medium:   sum(m => m.events.medium),
      low:      sum(m => m.events.low),
    },
    costs:         {
      energy:    +sum(m => m.costs.energy).toFixed(1),
      materials: +sum(m => m.costs.materials).toFixed(1),
      repairs:   +sum(m => m.costs.repairs).toFixed(1),
      personnel: +sum(m => m.costs.personnel).toFixed(1),
    },
    personnel:     {
      onShift: sum(m => m.personnel.onShift),
      total:   sum(m => m.personnel.total),
    },
    ppr:           {
      planned:  +sum(m => m.ppr.planned).toFixed(1),
      spent:    +sum(m => m.ppr.spent).toFixed(1),
      remaining:+sum(m => m.ppr.remaining).toFixed(1),
      pct:      Math.round(sum(m => m.ppr.spent) / Math.max(1, sum(m => m.ppr.planned)) * 100),
    },
    emissions:     {
      co2: Math.round(sum(m => m.emissions.co2)),
      nox: +sum(m => m.emissions.nox).toFixed(2),
      voc: +sum(m => m.emissions.voc).toFixed(2),
    },
    water:         { used: Math.round(sum(m => m.water.used)), recycled: Math.round(sum(m => m.water.recycled)) },
    envIncidents:  sum(m => m.envIncidents),
  }
}

// ─── Build all nodes ──────────────────────────────────────────────────────────
function buildNodes(): Record<string, CompanyNode> {
  const nodes: Record<string, CompanyNode> = {}

  // 1. Stations + their equipment
  for (const br of BRANCHES) {
    for (const st of br.stations) {
      const sm = makeStationMetrics(st.id, st.type)
      const status: NodeStatus = st.status ??
        (sm.events.critical > 0 ? 'fault' :
         sm.oee < 80 ? 'warn' :
         pickStatus(st.id, ['ok', 'ok', 'ok', 'ok', 'ok', 'warn', 'maint']))

      nodes[st.id] = {
        id: st.id, type: 'station', parentId: br.id,
        name: st.name, fullName: st.name, city: st.city, status,
        metrics: sm,
      }

      // Equipment level — детальное только для одной демо-станции (с данными EQUIPMENT_DETAILS).
      if (st.id === 's-atyrau-gnps') {
        Object.values(EQUIPMENT_DETAILS).forEach(eq => {
          const seed = `${st.id}:${eq.id}`
          const oee  = eq.metrics.oee
          const isFault = eq.id === 'RVS4'
          const isMaint = eq.id === 'NA4'
          const eqStatus: NodeStatus = isFault ? 'fault' : isMaint ? 'maint' : oee < 80 ? 'warn' : 'ok'

          nodes[`${st.id}/${eq.id}`] = {
            id: `${st.id}/${eq.id}`, type: 'equipment', parentId: st.id,
            name: eq.nameRu, fullName: `${eq.nameRu} · ${eq.model}`,
            status: eqStatus,
            metrics: {
              oee:           oee,
              availability:  eq.metrics.availability,
              uptime:        +rand(seed + ':up', 21, 24, 2),
              throughput:    { actual: Math.round(rand(seed + ':tp', 800, 2200, 0)), plan: Math.round(rand(seed + ':tpp', 800, 2200, 0)) },
              exports:       { actual: 0, plan: 0 },
              energy:        { actual: Math.round(rand(seed + ':en', 800, 14000, 0)), plan: 0 },
              energyPerTon:  { actual: +rand(seed + ':ept', 6.5, 9, 2), plan: 7.5 },
              events:        { critical: isFault ? 1 : 0, medium: hash(seed) % 4 === 0 ? 1 : 0, low: hash(seed + ':low') % 3 },
              costs:         { energy: +rand(seed + ':c1', 0.5, 4, 2), materials: +rand(seed + ':c2', 0.1, 0.8, 2), repairs: +rand(seed + ':c3', 0.2, 2, 2), personnel: +rand(seed + ':c4', 0.2, 0.6, 2) },
              personnel:     { onShift: 1 + hash(seed + ':p') % 3, total: 4 + hash(seed + ':pt') % 4 },
              ppr:           { planned: +rand(seed + ':ppr', 5, 60, 1), spent: +rand(seed + ':ppr2', 1, 30, 1), remaining: 0, pct: 0 },
              emissions:     { co2: +rand(seed + ':co', 5, 60, 0), nox: +rand(seed + ':nx', 0.05, 0.4, 2), voc: +rand(seed + ':vc', 0.01, 0.10, 2) },
              water:         { used: +rand(seed + ':w', 5, 25, 0), recycled: +rand(seed + ':wr', 2, 15, 0) },
              envIncidents:  0,
            },
          }
        })
      }
    }
  }

  // 2. Branches — aggregated from station metrics
  for (const br of BRANCHES) {
    const stMetrics = br.stations.map(s => nodes[s.id].metrics)
    const stStatuses = br.stations.map(s => nodes[s.id].status)
    const status: NodeStatus =
      stStatuses.some(s => s === 'fault') ? 'fault' :
      stStatuses.filter(s => s === 'warn' || s === 'maint').length >= Math.ceil(br.stations.length / 2) ? 'warn' :
      'ok'

    nodes[br.id] = {
      id: br.id, type: 'branch', parentId: 'kto',
      name: br.name, fullName: br.fullName, region: br.region, director: br.director,
      branchKind: br.kind, ownershipShare: br.ownershipShare,
      pipelineLength: br.pipelineLength, capacity: br.capacity,
      status,
      metrics: aggregate(stMetrics),
    }
  }

  // 3. Company — aggregated from branch metrics
  const brMetrics = BRANCHES.map(b => nodes[b.id].metrics)
  const allStatuses = BRANCHES.map(b => nodes[b.id].status)
  const totalLength = BRANCHES.reduce((a, b) => a + b.pipelineLength, 0)
  const totalCap    = BRANCHES.reduce((a, b) => a + b.capacity, 0)
  nodes['kto'] = {
    id: 'kto', type: 'company',
    name: 'АО «КазТрансОйл»',
    fullName: 'Акционерное общество «КазТрансОйл» (Группа)',
    region: 'Республика Казахстан · 9 областей + г. Шымкент',
    director: 'Председатель Правления — Турганбаев Д.А. · ГО Астана, пр. Туран, 20',
    pipelineLength: totalLength, capacity: totalCap,
    status:
      allStatuses.some(s => s === 'fault') ? 'fault' :
      allStatuses.filter(s => s === 'warn').length >= 3 ? 'warn' : 'ok',
    metrics: aggregate(brMetrics),
  }

  return nodes
}

export const NODES = buildNodes()
export const COMPANY_ROOT = 'kto'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const childrenIndex: Record<string, string[]> = {}
for (const n of Object.values(NODES)) {
  if (n.parentId) {
    if (!childrenIndex[n.parentId]) childrenIndex[n.parentId] = []
    childrenIndex[n.parentId].push(n.id)
  }
}

export function getChildren(id: string): CompanyNode[] {
  return (childrenIndex[id] ?? []).map(cid => NODES[cid])
}

export function getPath(id: string): CompanyNode[] {
  const path: CompanyNode[] = []
  let cur: CompanyNode | undefined = NODES[id]
  while (cur) {
    path.unshift(cur)
    cur = cur.parentId ? NODES[cur.parentId] : undefined
  }
  return path
}

export function getStatusColor(s: NodeStatus): string {
  return s === 'ok' ? '#22c55e' : s === 'warn' ? '#f59e0b' : s === 'fault' ? '#ef4444' : '#8b5cf6'
}

export function getStatusLabel(s: NodeStatus): string {
  return s === 'ok' ? 'В работе' : s === 'warn' ? 'Внимание' : s === 'fault' ? 'Авария' : 'На ТО'
}

export function getNodeTypeLabel(t: NodeType): string {
  return t === 'company'  ? 'АО'
       : t === 'branch'   ? 'Филиал'
       : t === 'station'  ? 'Станция'
       : 'Оборудование'
}

// ─── Hourly throughput trace (для графиков) ──────────────────────────────────
export function getHourlyTrace(node: CompanyNode): { hour: string; flow: number; pressure: number; energy: number }[] {
  const tpAvg = node.metrics.throughput.actual / 24
  const enAvg = node.metrics.energy.actual / 24
  return Array.from({ length: 24 }, (_, h) => {
    const dipNight = (h >= 22 || h < 4) ? -0.05 : 0
    const peakDay  = (h >= 9 && h < 18) ? 0.04 : 0
    const noise    = Math.sin(h * 0.7 + hash(node.id) % 7) * 0.03
    const factor   = 1 + dipNight + peakDay + noise
    return {
      hour:     `${String(h).padStart(2, '0')}:00`,
      flow:     Math.round(tpAvg * factor),
      pressure: +(6.6 + Math.sin(h * 0.5 + hash(node.id) % 5) * 0.15 + (h > 14 ? 0.05 : 0)).toFixed(2),
      energy:   Math.round(enAvg * factor),
    }
  })
}

// ─── Mock событий / рекомендаций ─────────────────────────────────────────────
export function getEventsForNode(id: string): { time: string; severity: 'critical' | 'medium' | 'low'; text: string }[] {
  const node = NODES[id]
  if (!node) return []
  if (node.type === 'station' && id === 's-atyrau-gnps') {
    return [
      { time: '03:42', severity: 'medium',   text: 'Превышен порог виброскорости НА-1 (5.4 мм/с по ГОСТ ИСО 10816-3) — переход на оперконтроль' },
      { time: '06:18', severity: 'low',      text: 'Плановое переключение на резервный питатель Т-2 после ТО ячейки 6 кВ' },
      { time: '11:32', severity: 'critical', text: 'Утечка по сварному шву пояса № 3 РВС-20000 № 4 — аварийный перевод на РВС-3, оповещение АЦПБ' },
      { time: '14:10', severity: 'medium',   text: 'СИКН-2: рассогласование БИК с лабораторными показаниями >0.15 % — переключение на резервную линию 3' },
      { time: '17:24', severity: 'low',      text: 'НА-4 (НМ 7000-210) — 65 % работ капремонта, плановое окончание 20.06.2026' },
      { time: '20:48', severity: 'medium',   text: 'Снижение приёмки с МТ Каспий-Атырау на 3.2 % — связь с ЦУТН, разбор расчёта' },
    ]
  }
  if (node.type === 'company') {
    return [
      { time: '02:15', severity: 'critical', text: 'Актюбинское НПУ · ГНПС «Кенкияк»: аварийный останов НА-2 (12 мм/с) — компенсация прокачкой по МунайТас' },
      { time: '05:30', severity: 'critical', text: 'Атырауское НПУ · ГНПС Атырау: утечка пояса РВС-20000 № 4, оповещение Минэнерго / АО НК «КМГ»' },
      { time: '08:12', severity: 'medium',   text: 'Павлодарское НПУ · ГНПС Павлодар: снижение сдачи на ПНХЗ на 4.8 % из-за плановой остановки' },
      { time: '09:40', severity: 'medium',   text: 'ЦУТН Астана: согласование с «Транснефть» переключения по МН Атырау-Самара (заявка № АС-2026/05-148)' },
      { time: '11:48', severity: 'medium',   text: 'СП «ККТ» · НПС-8: рост виброскорости НА-1 до 14 мм/с — экспресс-балансировка' },
      { time: '14:32', severity: 'low',      text: 'Кульсаринское НПУ · ГОС «Тенгиз»: плановый запуск НА-5 после ТО, нагрузка 92 %' },
      { time: '16:20', severity: 'low',      text: 'КРЕМ: подтверждение тарифа на внутр. рынок 4 461,76 тг/т·1000 км до 30.11.2026' },
      { time: '18:04', severity: 'medium',   text: 'СП «ККТ»: согласование ТУ с КНПК на переключение Атасу-Алашанькоу с 21:00' },
      { time: '21:18', severity: 'low',      text: 'Сменно-суточное совещание ЦУТН с участием филиалов и СП' },
    ]
  }
  if (node.type === 'branch') {
    const examples: Record<string, { time: string; severity: 'critical' | 'medium' | 'low'; text: string }[]> = {
      'br-atr': [
        { time: '04:22', severity: 'medium', text: 'Атырауское НПУ: повышенная нагрузка на МН Атырау-Самара — контроль режима' },
        { time: '09:15', severity: 'low',    text: 'Согласован график ТО НА-2,4 с диспетчером ЦУТН на 20.06.2026' },
        { time: '13:40', severity: 'medium', text: 'ГНПС Уральск: подтверждение узла учёта с принимающим оператором (Транснефть)' },
        { time: '18:30', severity: 'low',    text: 'Инструктаж по ПБиОТ для бригады смены № 3 пройден (24 чел.)' },
      ],
      'br-akt': [
        { time: '02:15', severity: 'critical', text: 'ГНПС «Кенкияк»: аварийная остановка НА-2 (вибрация 12 мм/с)' },
        { time: '07:48', severity: 'medium',   text: 'Согласование с СП «МунайТас» по компенсации прокачкой' },
        { time: '15:30', severity: 'low',      text: 'Завершено внутритрубное диагностирование участка 287-312 км' },
      ],
      'br-pav': [
        { time: '08:12', severity: 'medium', text: 'ГНПС Павлодар: остановка НА-1, 2 на ППР, режим компенсации НА-3' },
        { time: '14:00', severity: 'low',    text: 'Согласование с ПНХЗ графика приёмки на след. неделю' },
      ],
      'br-kkt': [
        { time: '11:48', severity: 'medium', text: 'НПС-8: вибрация НА-1 до 14 мм/с, переход на НА-2' },
        { time: '18:04', severity: 'medium', text: 'Согласование переключения с КНПК (Атасу-Алашанькоу)' },
        { time: '20:30', severity: 'low',    text: 'Передача данных по транзиту в CNPC (50 % доля)' },
      ],
    }
    return examples[node.id] ?? [
      { time: '04:22', severity: 'medium', text: `${node.name}: повышенная нагрузка на агрегаты — оперативный контроль` },
      { time: '09:15', severity: 'low',    text: `${node.name}: согласован график ТО с ЦУТН на следующую неделю` },
      { time: '15:48', severity: 'low',    text: `${node.name}: персонал смены прошёл инструктаж по ПБиОТ` },
    ]
  }
  return [
    { time: '08:00', severity: 'low', text: 'Сменно-суточное совещание, передача смены по графику' },
    { time: '14:30', severity: 'low', text: 'Контроль показателей режима в норме (ППБ, давления, виброскорость)' },
    { time: '20:00', severity: 'low', text: 'Запись параметров в SCADA и оперативный журнал смены' },
  ]
}

export function getRecommendationsForNode(id: string): { level: 'critical' | 'high' | 'medium'; title: string; text: string }[] {
  const node = NODES[id]
  if (!node) return []
  if (node.type === 'company') {
    return [
      { level: 'critical', title: 'Авария РВС-20000 № 4 (Атырауское НПУ)',
        text: 'Ускорить ВТД и капремонт (плановый — сентябрь, фактически требуется май-июнь). Потери при простое ≈ 12.4 млн ₸/сут, остановка ~30 сут. Уведомить АО НК «КМГ» и Минэнерго РК.' },
      { level: 'critical', title: 'Аварийный ремонт НА-2 (Актюбинское НПУ, ГНПС «Кенкияк»)',
        text: 'Поставка ротора по экспресс-схеме (поставщик — ОАО «Уралгидромаш»). Дополнительный CAPEX +8.4 млн ₸ за срочность; снижение операционного риска на 12 п.п.' },
      { level: 'high', title: 'Перераспределение объёмов между филиалами',
        text: 'Снять 220 м³/сут с Павлодарского НПУ (плановый ППР), направить в МН Атырау-Самара (Атырауское НПУ). Согласование с ЦУТН и АО «Транснефть».' },
      { level: 'high', title: 'Утверждение программы ППР на III кв. 2026',
        text: 'Консолидированный бюджет 1 246 млн ₸ (6 НПУ + СП «ККТ», 14 критических позиций). Подготовить материалы для рассмотрения Советом директоров.' },
      { level: 'medium', title: 'Модернизация узлов СИКН',
        text: 'ТЗ на унификацию узлов учёта по 5 ключевым станциям (МН Атырау-Самара, Узень-Атырау). Ожидаемое снижение OPEX 2.8–3.5 % после внедрения. Срок — Q4 2026.' },
      { level: 'medium', title: 'Коэффициент использования мощности',
        text: `Текущая загрузка сети ${Math.round(node.metrics.throughput.actual / 1000 * 365 / Math.max(1, (node.capacity ?? 100)) * 0.85 * 100)} %. Анализ возможности доп. транзита казахстанской нефти на ТОН-2.` },
    ]
  }
  if (node.type === 'branch') {
    const tariff = node.branchKind === 'jv' ? '4.23 USD/т (Атасу-Алашанькоу)'
                : node.id === 'br-atr'      ? '4 461.76 ₸/т·1000 км (внутр.) / 11 300 ₸/т·1000 км (экспорт)'
                : '4 461.76 ₸/т·1000 км (КРЕМ)'
    return [
      { level: 'high', title: `Контроль режима ${node.name}`,
        text: `За сутки — ${node.metrics.events.critical} критич. и ${node.metrics.events.medium} средних событий. ОЭЭ ${node.metrics.oee} %, доступность ${node.metrics.availability} %. Усилить мониторинг.` },
      { level: 'medium', title: 'Освоение бюджета ППР',
        text: `Освоено ${node.metrics.ppr.pct} % годового бюджета (${node.metrics.ppr.spent.toFixed(0)} из ${node.metrics.ppr.planned.toFixed(0)} млн ₸). Согласовать опережающую закупку ЗИП до конца квартала.` },
      { level: 'medium', title: 'Энергоэффективность',
        text: `Удельный расход эл./энергии — ${node.metrics.energyPerTon.actual} кВт·ч/т при нормативе 3.4. Анализ режимов перекачки и КПД насосных агрегатов.` },
      ...(node.branchKind === 'jv' ? [{
        level: 'medium' as const, title: 'Совместное предприятие',
        text: `Доля АО «КазТрансОйл» ${node.ownershipShare} %. Согласование операционного режима с CNPC (правлением СП). Тариф транзита: ${tariff}.`,
      }] : [{
        level: 'medium' as const, title: 'Тарифная политика',
        text: `Действующий тариф КРЕМ: ${tariff}. Подтвердить корректность учёта по экспортным/внутренним поставкам.`,
      }]),
    ]
  }
  if (node.id === 's-atyrau-gnps') {
    return [
      { level: 'critical', title: 'Внеплановый капремонт РВС-20000 № 4',
        text: 'Ускорить ВТД и запустить капремонт досрочно (планово — сент. 2026, фактически май-июнь). Подрядчик — «Атырауспецстрой», бюджет 192 млн ₸.' },
      { level: 'high', title: 'Снижение приёмки нефти на 3.2 %',
        text: 'Связаться с ЦУТН и инспекцией СИКН — расхождение БИК на узле учёта Линии 2. Возможна досрочная поверка датчиков «Метран».' },
      { level: 'high', title: 'Виброскорость НА-3 (НМ 7000-210) близка к норме',
        text: 'Запланировать досрочную замену подшипниковых опор и балансировку ротора в рамках ППР до 01.09.2026. Бюджет ~14 млн ₸.' },
    ]
  }
  return [
    { level: 'medium', title: 'Контроль показателей режима',
      text: `Текущий ОЭЭ ${node.metrics.oee} %, доступность ${node.metrics.availability} % — соответствует нормативу. Существенных отклонений нет.` },
  ]
}

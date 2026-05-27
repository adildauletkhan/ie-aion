/**
 * Сценарии управления целостностью трубопроводов АО «КазТрансОйл».
 *
 * Модель «что-если»: пользователь меняет план работ, бюджеты, остановки
 * оборудования — движок пересчитывает риск, CAPEX, пропускную способность,
 * индекс целостности и индекс воздействия по дереву источников данных:
 *
 *   Сталь · Труба · ECDA · ВТД · ЭХЗ · SCADA · Документация · SAP PM
 *
 * Для каждого изменения формируется отчет ИИ-советника:
 *  — какие источники из дерева затронуты,
 *  — прямой эффект (числовой),
 *  — косвенный эффект (распространение по дереву),
 *  — рекомендация.
 */

// ─── Источники из дерева (PDF) ───────────────────────────────────────────────
export type SourceKey =
  // Материал
  | 'steel' | 'pipe' | 'specs'
  // ECDA — Прямая оценка
  | 'cp' | 'coating' | 'pressure' | 'temp' | 'flow' | 'maps' | 'gps' | 'geodata' | 'ext-survey'
  // ВТД (ILI)
  | 'ili-metal' | 'ili-cracks' | 'ili-geometry' | 'ili-leak' | 'ili-mapping'
  // Оценка целостности
  | 'mdrd-metal' | 'mdrd-cracks' | 'integrity-eval' | 'dent-eval' | 'smart-tran'
  // Документация
  | 'as-built' | 'design' | 'safety-zone' | 'risk' | 'pipe-log' | 'weld-log'
  | 'repair-doc' | 'cert' | 'pressure-test'
  // SAP интеграция
  | 'sap'

export interface SourceMeta {
  key: SourceKey
  group: 'material' | 'ecda' | 'ili' | 'assessment' | 'docs' | 'sap'
  label: string
}

export const SOURCES: SourceMeta[] = [
  { key: 'steel',      group: 'material',   label: 'Данные о стали' },
  { key: 'pipe',       group: 'material',   label: 'Данные о трубе' },
  { key: 'specs',      group: 'material',   label: 'Спецификации на материал' },

  { key: 'cp',         group: 'ecda',       label: 'Данные ЭХЗ' },
  { key: 'coating',    group: 'ecda',       label: 'Состояние покрытия' },
  { key: 'pressure',   group: 'ecda',       label: 'Давление (SCADA)' },
  { key: 'temp',       group: 'ecda',       label: 'Температура (SCADA)' },
  { key: 'flow',       group: 'ecda',       label: 'Поток / расход (SCADA)' },
  { key: 'maps',       group: 'ecda',       label: 'Карты трассы' },
  { key: 'gps',        group: 'ecda',       label: 'GPS / трасса' },
  { key: 'geodata',    group: 'ecda',       label: 'Геоданные' },
  { key: 'ext-survey', group: 'ecda',       label: 'Наружные обследования' },

  { key: 'ili-metal',    group: 'ili',      label: 'ВТД: потеря металла (MFL)' },
  { key: 'ili-cracks',   group: 'ili',      label: 'ВТД: трещины (UT/EMAT)' },
  { key: 'ili-geometry', group: 'ili',      label: 'ВТД: геометрия (caliper)' },
  { key: 'ili-leak',     group: 'ili',      label: 'ВТД: обнаружение утечек' },
  { key: 'ili-mapping',  group: 'ili',      label: 'ВТД: картирование / смещение' },

  { key: 'mdrd-metal',     group: 'assessment', label: 'МДРД (потеря металла)' },
  { key: 'mdrd-cracks',    group: 'assessment', label: 'МДРД (трещины)' },
  { key: 'integrity-eval', group: 'assessment', label: 'Оценка целостности' },
  { key: 'dent-eval',      group: 'assessment', label: 'Оценка вмятин' },
  { key: 'smart-tran',     group: 'assessment', label: 'SmartTran / интервал ВТД' },

  { key: 'as-built',     group: 'docs',     label: 'Исполнительная документация (as-built)' },
  { key: 'design',       group: 'docs',     label: 'Проектная документация' },
  { key: 'safety-zone',  group: 'docs',     label: 'Охранная зона' },
  { key: 'risk',         group: 'docs',     label: 'Потенциально опасные участки / Риск' },
  { key: 'pipe-log',     group: 'docs',     label: 'Трубный журнал' },
  { key: 'weld-log',     group: 'docs',     label: 'Сварочный журнал' },
  { key: 'repair-doc',   group: 'docs',     label: 'Документация на ремонт' },
  { key: 'cert',         group: 'docs',     label: 'Сертификация' },
  { key: 'pressure-test', group: 'docs',    label: 'Гидро-пневмоиспытания' },

  { key: 'sap', group: 'sap', label: 'SAP PM / EAM' },
]

export const SOURCE_LABEL: Record<SourceKey, string> = SOURCES.reduce((acc, s) => {
  acc[s.key] = s.label
  return acc
}, {} as Record<SourceKey, string>)

export const SOURCE_GROUP_LABEL: Record<SourceMeta['group'], string> = {
  material:   'Материал',
  ecda:       'ECDA / Прямая оценка',
  ili:        'ВТД (ILI)',
  assessment: 'Оценка целостности',
  docs:       'Документация',
  sap:        'SAP PM / EAM',
}

// ─── Сегменты трубопроводов ──────────────────────────────────────────────────
export interface Segment {
  id: string
  name: string
  npu: string                 // филиал-владелец
  lengthKm: number
  flowKtDay: number           // прокачка кт/сут
  age: number                 // лет в эксплуатации
  // текущее состояние
  metalLossPct: number
  cracks: number
  dents: number
  cpCompliancePct: number     // 0-100
  coatingHealth: number       // 0-100
  // скорости естественного износа (в месяц)
  decay: {
    metalLossPctPerMonth: number
    cracksPerMonth: number
    cpPerMonth: number
    coatingPerMonth: number
  }
  // штатная пропускная способность (для расчёта потерь)
  tariffPerKt: number         // млн ₸ выручки на кт
}

export const BASE_SEGMENTS: Segment[] = [
  {
    id: 'S-01', name: 'Атырау-Самара 0–120 км', npu: 'Атырауское НПУ',
    lengthKm: 120, flowKtDay: 42, age: 18,
    metalLossPct: 11.4, cracks: 3, dents: 7, cpCompliancePct: 96, coatingHealth: 78,
    decay: { metalLossPctPerMonth: 0.18, cracksPerMonth: 0.04, cpPerMonth: 0.10, coatingPerMonth: 0.20 },
    tariffPerKt: 4.46,
  },
  {
    id: 'S-02', name: 'Атырау-Самара 120–260 км', npu: 'Атырауское НПУ',
    lengthKm: 140, flowKtDay: 41, age: 14,
    metalLossPct: 8.3, cracks: 1, dents: 4, cpCompliancePct: 98, coatingHealth: 85,
    decay: { metalLossPctPerMonth: 0.12, cracksPerMonth: 0.02, cpPerMonth: 0.08, coatingPerMonth: 0.15 },
    tariffPerKt: 4.46,
  },
  {
    id: 'S-03', name: 'Кенкияк-Кумколь 320–470 км', npu: 'Актюбинское НПУ',
    lengthKm: 150, flowKtDay: 28, age: 22,
    metalLossPct: 14.8, cracks: 5, dents: 9, cpCompliancePct: 92, coatingHealth: 64,
    decay: { metalLossPctPerMonth: 0.28, cracksPerMonth: 0.08, cpPerMonth: 0.18, coatingPerMonth: 0.30 },
    tariffPerKt: 4.85,
  },
  {
    id: 'S-04', name: 'Атасу-Алашанькоу 90–210 км', npu: 'СП «ККТ»',
    lengthKm: 120, flowKtDay: 36, age: 16,
    metalLossPct: 10.9, cracks: 2, dents: 6, cpCompliancePct: 95, coatingHealth: 80,
    decay: { metalLossPctPerMonth: 0.16, cracksPerMonth: 0.05, cpPerMonth: 0.10, coatingPerMonth: 0.22 },
    tariffPerKt: 11.30, // экспорт
  },
  {
    id: 'S-05', name: 'Узень-Атырау 210–320 км', npu: 'Мангистауское НПУ',
    lengthKm: 110, flowKtDay: 9, age: 35,
    metalLossPct: 16.2, cracks: 4, dents: 11, cpCompliancePct: 88, coatingHealth: 52,
    decay: { metalLossPctPerMonth: 0.32, cracksPerMonth: 0.07, cpPerMonth: 0.20, coatingPerMonth: 0.35 },
    tariffPerKt: 4.46,
  },
]

// ─── План работ (базовая программа ремонтов) ────────────────────────────────
export type ActionType =
  | 'metal-loss-repair'   // вырезка / упрочнение
  | 'crack-repair'        // SCC / усталостные трещины
  | 'cp-upgrade'          // модернизация ЭХЗ
  | 'coating'             // ремонт покрытия
  | 'pipe-section-replace'
  | 'ili-inspection'      // внеплановое ВТД
  | 'ecda'                // прямая оценка

export interface RepairAction {
  id: string
  segmentId: string
  type: ActionType
  description: string
  baseMonth: number       // 0 = январь 2026, 1 = февраль … 23 = декабрь 2027
  baseBudgetMln: number   // млн ₸
  baseDurationDays: number
  priority: 'critical' | 'high' | 'medium'
  sourcesUsed: SourceKey[]
  effects: {
    metalLossReductionPct?: number    // напр. 0.85 = −85%
    cracksReductionPct?: number
    cpRestoreTo?: number
    coatingRestoreTo?: number
    decayDamper?: { months: number; factor: number } // напр. покрытие тормозит коррозию на 24 мес × 0.5
    fullReplace?: boolean
  }
}

export const BASE_ACTIONS: RepairAction[] = [
  {
    id: 'A-01', segmentId: 'S-03', type: 'metal-loss-repair',
    description: 'Приоритетный ремонт дефектов потери металла (ECDA + MFL)',
    baseMonth: 8, baseBudgetMln: 214, baseDurationDays: 14, priority: 'high',
    sourcesUsed: ['ili-metal', 'mdrd-metal', 'cp', 'ext-survey', 'pipe-log', 'repair-doc', 'sap'],
    effects: { metalLossReductionPct: 0.75 },
  },
  {
    id: 'A-02', segmentId: 'S-03', type: 'pipe-section-replace',
    description: 'Локальная замена участка 1.4 км (трещины SCC)',
    baseMonth: 10, baseBudgetMln: 486, baseDurationDays: 28, priority: 'critical',
    sourcesUsed: ['ili-cracks', 'mdrd-cracks', 'weld-log', 'as-built', 'cert', 'pressure-test', 'sap'],
    effects: { cracksReductionPct: 0.95, metalLossReductionPct: 0.4, fullReplace: false },
  },
  {
    id: 'A-03', segmentId: 'S-01', type: 'cp-upgrade',
    description: 'Модернизация ЭХЗ и дренажей переменного тока',
    baseMonth: 10, baseBudgetMln: 168, baseDurationDays: 21, priority: 'high',
    sourcesUsed: ['cp', 'pressure', 'geodata', 'ext-survey', 'repair-doc', 'sap'],
    effects: { cpRestoreTo: 99, decayDamper: { months: 24, factor: 0.6 } },
  },
  {
    id: 'A-04', segmentId: 'S-04', type: 'coating',
    description: 'Ремонт покрытия на переходах (HDD/врезки)',
    baseMonth: 14, baseBudgetMln: 129, baseDurationDays: 18, priority: 'medium',
    sourcesUsed: ['coating', 'ext-survey', 'gps', 'safety-zone', 'repair-doc'],
    effects: { coatingRestoreTo: 95, decayDamper: { months: 18, factor: 0.5 } },
  },
  {
    id: 'A-05', segmentId: 'S-05', type: 'pipe-section-replace',
    description: 'Замена коррозионного участка 0.9 км (Узень-Атырау)',
    baseMonth: 11, baseBudgetMln: 392, baseDurationDays: 24, priority: 'critical',
    sourcesUsed: ['ili-metal', 'mdrd-metal', 'pipe-log', 'weld-log', 'cert', 'pressure-test'],
    effects: { metalLossReductionPct: 0.9, cracksReductionPct: 0.8 },
  },
  {
    id: 'A-06', segmentId: 'S-02', type: 'ili-inspection',
    description: 'Внеплановое ВТД (MFL + UT)',
    baseMonth: 6, baseBudgetMln: 82, baseDurationDays: 5, priority: 'medium',
    sourcesUsed: ['ili-metal', 'ili-cracks', 'ili-geometry', 'smart-tran', 'maps'],
    effects: {},
  },
  {
    id: 'A-07', segmentId: 'S-01', type: 'ecda',
    description: 'ECDA полного цикла (4 этапа)',
    baseMonth: 4, baseBudgetMln: 64, baseDurationDays: 30, priority: 'medium',
    sourcesUsed: ['cp', 'coating', 'ext-survey', 'geodata', 'gps', 'mdrd-metal'],
    effects: { cpRestoreTo: 97 },
  },
]

// ─── Остановки оборудования ──────────────────────────────────────────────────
export interface EquipmentNode {
  id: string
  name: string
  segmentId: string         // на каком сегменте стоит
  baseFlowShareKt: number   // вклад в прокачку сегмента, кт/сут
  npu: string
}

export const EQUIPMENT_NODES: EquipmentNode[] = [
  { id: 'NA-1-S03', name: 'НА-1 ГНПС Кенкияк',  segmentId: 'S-03', baseFlowShareKt: 14, npu: 'Актюбинское НПУ' },
  { id: 'NA-2-S03', name: 'НА-2 ГНПС Кенкияк',  segmentId: 'S-03', baseFlowShareKt: 14, npu: 'Актюбинское НПУ' },
  { id: 'NA-1-S01', name: 'НА-1 ГНПС Атырау',   segmentId: 'S-01', baseFlowShareKt: 22, npu: 'Атырауское НПУ' },
  { id: 'NA-2-S01', name: 'НА-2 ГНПС Атырау',   segmentId: 'S-01', baseFlowShareKt: 20, npu: 'Атырауское НПУ' },
  { id: 'NA-1-S04', name: 'НА-1 ГНПС Атасу',    segmentId: 'S-04', baseFlowShareKt: 18, npu: 'СП «ККТ»' },
  { id: 'NA-1-S05', name: 'НА-1 ГНПС Узень',    segmentId: 'S-05', baseFlowShareKt: 9,  npu: 'Мангистауское НПУ' },
]

// ─── Сценарий (набор «рычагов») ──────────────────────────────────────────────
export interface LeverAction {
  actionId: string
  shiftMonths?: number       // +N сдвиг вправо (откладываем), −N экспедируем
  budgetMultiplier?: number  // 0.5 .. 1.5
  skip?: boolean
}

export interface LeverShutdown {
  id: string
  equipmentId: string
  startMonth: number
  durationDays: number
  reason: string
}

export interface Scenario {
  id: string
  name: string
  description: string
  color: string
  budgetCap?: number          // млн ₸ ограничение
  actionLevers: LeverAction[]
  shutdowns: LeverShutdown[]
  locked?: boolean            // нельзя редактировать (базовый)
}

export const PRESET_SCENARIOS: Scenario[] = [
  {
    id: 'base', name: 'Базовый план 2026', description: 'Программа ППР как утверждена',
    color: '#3b82f6', actionLevers: [], shutdowns: [], locked: true,
  },
  {
    id: 'min-capex', name: 'Минимум CAPEX', description: 'Сдвиг неприоритетных работ, риск растёт',
    color: '#f59e0b',
    actionLevers: [
      { actionId: 'A-01', shiftMonths: 4 },
      { actionId: 'A-03', shiftMonths: 6 },
      { actionId: 'A-04', shiftMonths: 6, budgetMultiplier: 0.85 },
      { actionId: 'A-07', skip: true },
    ],
    shutdowns: [],
  },
  {
    id: 'max-reliability', name: 'Максимум надёжности', description: 'Экспедирование всех критичных работ',
    color: '#22c55e',
    actionLevers: [
      { actionId: 'A-02', shiftMonths: -3 },
      { actionId: 'A-05', shiftMonths: -2 },
      { actionId: 'A-01', shiftMonths: -2 },
    ],
    shutdowns: [],
  },
  {
    id: 'balanced', name: 'Сбалансированный', description: 'Лучший trade-off CAPEX / риск',
    color: '#8b5cf6',
    actionLevers: [
      { actionId: 'A-01', shiftMonths: -1 },
      { actionId: 'A-04', shiftMonths: 3 },
      { actionId: 'A-07', shiftMonths: 2 },
    ],
    shutdowns: [],
  },
]

// ─── Engine: расчёт метрик сценария ──────────────────────────────────────────
export interface SegmentSnapshot {
  segmentId: string
  metalLossPct: number
  cracks: number
  dents: number
  cpCompliancePct: number
  coatingHealth: number
  risk: number          // 0..100
}

export interface ScenarioMetrics {
  scenarioId: string
  totalCapexMln: number       // CAPEX по сценарию, млн ₸
  capexByMonth: number[]      // 24 месяца
  integrityIndex: number      // 0..100
  avgRisk: number             // 0..100
  highRiskSegments: number
  throughputLossKt: number    // суммарная потеря прокачки, кт за 24 мес
  revenueLossMln: number      // упущенная выручка, млн ₸
  safetyScore: number         // 0..100
  npvBenefit: number          // +/- млн ₸ относительно базового (положительное = выгода)
  monthlyRisk: { month: number; risk: number }[]   // 24 точки
  monthlyIntegrity: { month: number; integrity: number }[]
  finalSegments: SegmentSnapshot[]
}

// риск считается как линейная комбинация состояний
// калибровка: базовая программа → средний риск ~15 (индекс ~85)
function riskFromSnapshot(s: { metalLossPct: number; cracks: number; dents: number; cpCompliancePct: number; coatingHealth: number }): number {
  const r =
    0.55 * s.metalLossPct +
    0.90 * s.cracks +
    0.15 * s.dents +
    0.28 * (100 - s.cpCompliancePct) +
    0.15 * (100 - s.coatingHealth)
  return Math.max(0, Math.min(100, r))
}

interface EffectiveAction {
  action: RepairAction
  month: number             // эффективный месяц
  budget: number
  duration: number
  skipped: boolean
  effectivenessFactor: number  // 0..1 — насколько ремонт эффективен (бюджет/задержка)
}

function applyLever(action: RepairAction, lever?: LeverAction): EffectiveAction {
  if (!lever) return { action, month: action.baseMonth, budget: action.baseBudgetMln, duration: action.baseDurationDays, skipped: false, effectivenessFactor: 1 }
  if (lever.skip) return { action, month: action.baseMonth, budget: 0, duration: 0, skipped: true, effectivenessFactor: 0 }

  const shift = lever.shiftMonths ?? 0
  const bm = lever.budgetMultiplier ?? 1
  const expediteSurcharge = shift < 0 ? 1 + Math.abs(shift) * 0.05 : 1   // ускорение +5% за месяц
  const budget = action.baseBudgetMln * bm * expediteSurcharge

  // Эффективность падает при сильном урезании бюджета или большом сдвиге
  const budgetEff = Math.min(1, bm)
  const shiftPenalty = shift > 0 ? Math.max(0.7, 1 - shift * 0.025) : 1
  const effectiveness = Math.min(1, budgetEff * shiftPenalty)

  return {
    action,
    month: Math.max(0, Math.min(23, action.baseMonth + shift)),
    budget,
    duration: action.baseDurationDays,
    skipped: false,
    effectivenessFactor: effectiveness,
  }
}

function simulateSegment(seg: Segment, monthsCount: number, actions: EffectiveAction[]): {
  monthly: SegmentSnapshot[]
  final: SegmentSnapshot
} {
  // активные подавители распада (от ремонта покрытия / cp-upgrade)
  let damper: { remainingMonths: number; factor: number } | null = null
  let state = {
    metalLossPct: seg.metalLossPct,
    cracks: seg.cracks,
    dents: seg.dents,
    cpCompliancePct: seg.cpCompliancePct,
    coatingHealth: seg.coatingHealth,
  }
  const monthly: SegmentSnapshot[] = []

  const segActions = actions.filter(a => a.action.segmentId === seg.id && !a.skipped)

  for (let m = 0; m < monthsCount; m++) {
    // распад за месяц
    const factor = damper && damper.remainingMonths > 0 ? damper.factor : 1
    state.metalLossPct  += seg.decay.metalLossPctPerMonth  * factor
    state.cracks        += seg.decay.cracksPerMonth        * factor
    state.cpCompliancePct = Math.max(50, state.cpCompliancePct - seg.decay.cpPerMonth)
    state.coatingHealth   = Math.max(10, state.coatingHealth - seg.decay.coatingPerMonth)
    if (damper) damper.remainingMonths -= 1

    // применить ремонты в этом месяце
    for (const ea of segActions) {
      if (ea.month !== m) continue
      const f = ea.effectivenessFactor
      const eff = ea.action.effects
      if (eff.metalLossReductionPct) {
        state.metalLossPct = Math.max(0, state.metalLossPct * (1 - eff.metalLossReductionPct * f))
      }
      if (eff.cracksReductionPct) {
        state.cracks = Math.max(0, state.cracks * (1 - eff.cracksReductionPct * f))
      }
      if (eff.cpRestoreTo) {
        state.cpCompliancePct = Math.max(state.cpCompliancePct, eff.cpRestoreTo * f + state.cpCompliancePct * (1 - f))
      }
      if (eff.coatingRestoreTo) {
        state.coatingHealth = Math.max(state.coatingHealth, eff.coatingRestoreTo * f + state.coatingHealth * (1 - f))
      }
      if (eff.decayDamper) {
        damper = { remainingMonths: Math.round(eff.decayDamper.months * f), factor: eff.decayDamper.factor }
      }
      if (eff.fullReplace) {
        state = { metalLossPct: 1, cracks: 0, dents: 0, cpCompliancePct: 99, coatingHealth: 98 }
      }
    }

    monthly.push({
      segmentId: seg.id,
      ...state,
      risk: riskFromSnapshot(state),
    })
  }
  return { monthly, final: monthly[monthly.length - 1] }
}

export function computeScenario(scenario: Scenario, horizonMonths = 24): ScenarioMetrics {
  // эффективные действия
  const effective = BASE_ACTIONS.map(a =>
    applyLever(a, scenario.actionLevers.find(l => l.actionId === a.id)),
  )

  // 1) распределение CAPEX по месяцам
  const capexByMonth = new Array(horizonMonths).fill(0)
  let totalCapex = 0
  for (const ea of effective) {
    if (ea.skipped) continue
    if (ea.month < horizonMonths) {
      capexByMonth[ea.month] += ea.budget
      totalCapex += ea.budget
    }
  }

  // 2) симулируем сегменты по месяцам
  const allMonthly: SegmentSnapshot[][] = BASE_SEGMENTS.map(seg => {
    const sim = simulateSegment(seg, horizonMonths, effective)
    return sim.monthly
  })
  const finalSegments = allMonthly.map(arr => arr[arr.length - 1])

  // 3) усреднённый риск/индекс по месяцам
  const monthlyRisk: { month: number; risk: number }[] = []
  const monthlyIntegrity: { month: number; integrity: number }[] = []
  for (let m = 0; m < horizonMonths; m++) {
    const avg = allMonthly.reduce((s, arr) => s + arr[m].risk, 0) / allMonthly.length
    monthlyRisk.push({ month: m, risk: +avg.toFixed(1) })
    monthlyIntegrity.push({ month: m, integrity: +(100 - avg).toFixed(1) })
  }

  const avgRisk = monthlyRisk[monthlyRisk.length - 1].risk
  const integrityIndex = +(100 - avgRisk).toFixed(1)
  const highRiskSegments = finalSegments.filter(s => s.risk > 22).length

  // 4) потери прокачки от ремонтов и остановок
  let lossKt = 0
  for (const ea of effective) {
    if (ea.skipped || ea.duration === 0) continue
    const seg = BASE_SEGMENTS.find(s => s.id === ea.action.segmentId)
    if (!seg) continue
    const downFactor = ea.action.type === 'pipe-section-replace' ? 1.0
                     : ea.action.type === 'metal-loss-repair'    ? 0.35
                     : ea.action.type === 'crack-repair'         ? 0.6
                     : ea.action.type === 'cp-upgrade'           ? 0.05
                     : ea.action.type === 'coating'              ? 0.10
                     : ea.action.type === 'ili-inspection'       ? 0.0
                     : 0.0
    lossKt += seg.flowKtDay * ea.duration * downFactor
  }
  for (const sh of scenario.shutdowns) {
    const eq = EQUIPMENT_NODES.find(e => e.id === sh.equipmentId)
    if (!eq) continue
    lossKt += eq.baseFlowShareKt * sh.durationDays
  }

  // упущенная выручка: прямые потери прокачки + «теневые» риски
  const revenueLoss = BASE_SEGMENTS.reduce((acc, seg, i) => {
    const segLoss = finalSegments[i].risk > 22 ? seg.flowKtDay * 30 * 0.04 : 0
    return acc + segLoss * seg.tariffPerKt
  }, lossKt * 4.5)

  // 5) Safety / NPV
  const safetyScore = Math.max(0, Math.min(100, 100 - 0.7 * avgRisk - 0.05 * lossKt / 100))
  const baseCapex = BASE_ACTIONS.reduce((s, a) => s + a.baseBudgetMln, 0)
  // NPV: экономия CAPEX в т.г. минус ожидаемые потери от риска
  const npv = (baseCapex - totalCapex) - revenueLoss * 0.5

  return {
    scenarioId: scenario.id,
    totalCapexMln: +totalCapex.toFixed(1),
    capexByMonth,
    integrityIndex,
    avgRisk,
    highRiskSegments,
    throughputLossKt: +lossKt.toFixed(0),
    revenueLossMln: +revenueLoss.toFixed(0),
    safetyScore: +safetyScore.toFixed(1),
    npvBenefit: +npv.toFixed(0),
    monthlyRisk,
    monthlyIntegrity,
    finalSegments,
  }
}

// ─── AI-советник: какие источники из дерева затронуты и как ─────────────────
export interface ImpactItem {
  level: 'positive' | 'neutral' | 'negative' | 'critical'
  title: string
  text: string
  sources: SourceKey[]
}

export interface AIImpactAnalysis {
  headline: string
  delta: {
    capex: number          // ΔCAPEX vs base, млн ₸
    integrity: number      // Δ индекса целостности
    risk: number           // Δ среднего риска (отрицательное = риск вырос)
    revenue: number        // Δ упущенной выручки
    safety: number         // Δ safety
  }
  items: ImpactItem[]
  affectedSources: { key: SourceKey; intensity: number }[]  // 0..1
  recommendation: string
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }

export function analyzeScenarioImpact(scenario: Scenario, currentMetrics: ScenarioMetrics, baseMetrics: ScenarioMetrics): AIImpactAnalysis {
  const dCapex     = +(currentMetrics.totalCapexMln - baseMetrics.totalCapexMln).toFixed(1)
  const dIntegrity = +(currentMetrics.integrityIndex - baseMetrics.integrityIndex).toFixed(1)
  const dRisk      = +(currentMetrics.avgRisk - baseMetrics.avgRisk).toFixed(1)
  const dRevenue   = +(currentMetrics.revenueLossMln - baseMetrics.revenueLossMln).toFixed(0)
  const dSafety    = +(currentMetrics.safetyScore - baseMetrics.safetyScore).toFixed(1)

  const items: ImpactItem[] = []
  const sourceUsage: Partial<Record<SourceKey, number>> = {}
  const accSource = (k: SourceKey, w: number) => { sourceUsage[k] = (sourceUsage[k] ?? 0) + w }

  // Анализ каждого рычага
  for (const lev of scenario.actionLevers) {
    const action = BASE_ACTIONS.find(a => a.id === lev.actionId)
    if (!action) continue
    const seg = BASE_SEGMENTS.find(s => s.id === action.segmentId)
    if (!seg) continue
    action.sourcesUsed.forEach(s => accSource(s, 1))

    if (lev.skip) {
      items.push({
        level: 'critical',
        title: `Отмена работы «${action.description}» (${seg.name})`,
        text: `Источники ${action.sourcesUsed.slice(0, 3).map(s => SOURCE_LABEL[s]).join(', ')} останутся без актуализации. ` +
              `За 24 мес ожидаемый рост ${action.type === 'cp-upgrade' ? 'падение ЭХЗ' : action.type === 'coating' ? 'деградации покрытия' : 'дефекта'} ` +
              `→ риск сегмента ${seg.id} увеличится на ~${(seg.decay.metalLossPctPerMonth * 24 * 0.42).toFixed(0)} п.п. ` +
              `Экономия CAPEX ${action.baseBudgetMln} млн ₸, но скрытые потери выручки выше при отказе.`,
        sources: action.sourcesUsed,
      })
    } else if (lev.shiftMonths && lev.shiftMonths !== 0) {
      const sm = lev.shiftMonths
      const level: ImpactItem['level'] = sm > 0 ? (sm >= 6 ? 'negative' : 'neutral') : 'positive'
      items.push({
        level,
        title: `${sm > 0 ? 'Сдвиг вправо' : 'Экспедирование'} «${action.description}» на ${Math.abs(sm)} мес`,
        text: sm > 0
          ? `За ${sm} мес распад на ${seg.id}: +${(seg.decay.metalLossPctPerMonth * sm).toFixed(2)} % потери металла, ` +
            `+${(seg.decay.cracksPerMonth * sm).toFixed(1)} трещин. Активные источники: ${action.sourcesUsed.slice(0, 4).map(s => SOURCE_LABEL[s]).join(', ')}. ` +
            `Эффективность ремонта снизится до ${Math.round((1 - sm * 0.025) * 100)} %.`
          : `Дополнительная нагрузка на источники ${action.sourcesUsed.slice(0, 3).map(s => SOURCE_LABEL[s]).join(', ')}; ` +
            `надбавка за экспедирование +${Math.abs(sm) * 5} %. Профит: риск ${seg.id} стабилизирован раньше.`,
        sources: action.sourcesUsed,
      })
    } else if (lev.budgetMultiplier && lev.budgetMultiplier !== 1) {
      const bm = lev.budgetMultiplier
      items.push({
        level: bm < 0.8 ? 'negative' : 'neutral',
        title: `Бюджет ${bm < 1 ? '−' : '+'}${Math.abs(Math.round((bm - 1) * 100))} % для «${action.description}»`,
        text: `${bm < 1 ? 'Сокращение' : 'Увеличение'} бюджета затрагивает ${action.sourcesUsed.length} источников (${action.sourcesUsed.slice(0, 3).map(s => SOURCE_LABEL[s]).join(', ')}). ` +
              `Эффективность ремонта приближается к ${Math.round(Math.min(1, bm) * 100)} %.`,
        sources: action.sourcesUsed,
      })
    }
  }

  // Анализ остановок
  for (const sh of scenario.shutdowns) {
    const eq = EQUIPMENT_NODES.find(e => e.id === sh.equipmentId)
    if (!eq) continue
    const seg = BASE_SEGMENTS.find(s => s.id === eq.segmentId)
    accSource('flow', 1); accSource('pressure', 1); accSource('sap', 1); accSource('safety-zone', 0.5)
    items.push({
      level: sh.durationDays > 14 ? 'negative' : 'neutral',
      title: `Остановка ${eq.name} (${sh.durationDays} сут, мес ${sh.startMonth + 1})`,
      text: `Потеря прокачки: ${(eq.baseFlowShareKt * sh.durationDays).toFixed(0)} кт; компенсация через соседние НА (+15…25 % расхода э/э). ` +
            `Источники SCADA (расход/давление) и SAP покажут изменение в реальном времени. ` +
            (seg ? `На сегменте ${seg.id} операционные процедуры ECDA сохраняются.` : ''),
      sources: ['flow', 'pressure', 'sap', 'safety-zone'],
    })
  }

  // Заголовок и рекомендация
  let headline = ''
  let recommendation = ''
  if (Math.abs(dCapex) < 1 && Math.abs(dRisk) < 0.5) {
    headline = 'Изменения в пределах базового сценария — материального эффекта нет.'
    recommendation = 'Можно использовать базовый план. При необходимости — внесите рычаги по приоритетным сегментам.'
  } else if (dRisk > 3 && dCapex < 0) {
    headline = `CAPEX −${Math.abs(dCapex)} млн ₸, но риск +${dRisk.toFixed(1)} п.п. — экономия частично «съедается» рисковыми потерями.`
    recommendation = 'Сэкономленный CAPEX направить на усиленный мониторинг ЭХЗ и сокращение интервала ВТД до 24 мес на сегментах высокого риска.'
  } else if (dRisk < -3 && dCapex > 0) {
    headline = `Сценарий снижает риск на ${Math.abs(dRisk).toFixed(1)} п.п. при росте CAPEX +${dCapex} млн ₸.`
    recommendation = 'Согласовать дополнительный бюджет с СД через NPV-обоснование: пред. снижение потерь — ' + Math.abs(dRevenue) + ' млн ₸.'
  } else if (currentMetrics.npvBenefit > baseMetrics.npvBenefit) {
    headline = `NPV-улучшение +${(currentMetrics.npvBenefit - baseMetrics.npvBenefit).toFixed(0)} млн ₸ vs базовый.`
    recommendation = 'Лучший trade-off, рекомендуется как рабочая программа на 12 мес. Закрепить остановки оборудования в SAP PM до согласования с ЦУТН.'
  } else {
    headline = `Сценарий ухудшает NPV на ${Math.abs(currentMetrics.npvBenefit - baseMetrics.npvBenefit).toFixed(0)} млн ₸ vs базовый.`
    recommendation = 'Пересмотреть отложенные работы; перенести экономию CAPEX в направление с быстрым возвратом (ЭХЗ, покрытие).'
  }

  // Нормализуем интенсивность источников
  const maxUse = Math.max(1, ...Object.values(sourceUsage).map(v => v ?? 0))
  const affectedSources = (Object.keys(sourceUsage) as SourceKey[])
    .map(k => ({ key: k, intensity: clamp((sourceUsage[k] ?? 0) / maxUse, 0, 1) }))
    .sort((a, b) => b.intensity - a.intensity)

  return {
    headline,
    delta: { capex: dCapex, integrity: dIntegrity, risk: dRisk, revenue: dRevenue, safety: dSafety },
    items,
    affectedSources,
    recommendation,
  }
}

// ─── Helpers для UI ──────────────────────────────────────────────────────────
export function monthLabel(m: number, lang: 'ru' | 'en' = 'ru'): string {
  const monthsRu = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
  const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const months = lang === 'en' ? monthsEn : monthsRu
  const year = 2026 + Math.floor(m / 12)
  return `${months[m % 12]} ${String(year).slice(2)}`
}

export function riskLabel(r: number): 'low' | 'medium' | 'high' {
  if (r < 12) return 'low'
  if (r < 22) return 'medium'
  return 'high'
}

export const BASE_TOTAL_CAPEX = BASE_ACTIONS.reduce((s, a) => s + a.baseBudgetMln, 0)

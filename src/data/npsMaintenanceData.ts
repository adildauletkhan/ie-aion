/**
 * NPS Maintenance Data — ППР бюджеты, ОЭЭ, ремонты, ИИ-сценарии
 * Все суммы в миллионах KZT (тенге).
 */

export type Priority = 'critical' | 'high' | 'medium'
export type RepairType = 'preventive' | 'corrective' | 'overhaul' | 'inspection'

export interface OEEMetrics {
  availability: number   // %
  performance:  number   // %
  quality:      number   // %
  oee:          number   // A × P × Q
  mtbf:         number   // hours
  mttr:         number   // hours
}

export interface RepairItem {
  id:          string
  stationId:   string
  stationName: string
  equipment:   string
  description: string
  dueDate:     string    // ISO date
  budget:      number    // млн тг
  priority:    Priority
  type:        RepairType
  oeeImpact:   number    // ΔA % gain if done
  deferRisk:   number    // 1-10 if deferred
}

export interface PPRBudget {
  planned:   number    // млн тг
  spent:     number    // млн тг
  remaining: number    // млн тг
  pct:       number    // % освоения
}

export interface StationMaintenance {
  stationId: string
  oee:       OEEMetrics
  ppr2026:   PPRBudget
  repairs:   RepairItem[]
}

// ─── OEE & PPR data keyed by station id ──────────────────────────────────────
export const STATION_MAINTENANCE: Record<string, StationMaintenance> = {
  's-atyrau-gnps': {
    stationId: 's-atyrau-gnps',
    oee: { availability: 94.2, performance: 88.5, quality: 98.1, oee: 81.8, mtbf: 1840, mttr: 6.2 },
    ppr2026: { planned: 245.0, spent: 98.4, remaining: 146.6, pct: 40.2 },
    repairs: [
      { id: 'r-aty-1', stationId: 's-atyrau-gnps', stationName: 'ГНПС Атырау', equipment: 'НА-2 (насос ЦНС-500)', description: 'Замена торцевых уплотнений, ревизия подшипников', dueDate: '2026-06-10', budget: 38.5, priority: 'high', type: 'preventive', oeeImpact: 1.8, deferRisk: 6 },
      { id: 'r-aty-2', stationId: 's-atyrau-gnps', stationName: 'ГНПС Атырау', equipment: 'Двигатель М-3 (АД-2500)', description: 'Капитальный ремонт электродвигателя, перемотка статора', dueDate: '2026-07-20', budget: 72.1, priority: 'high', type: 'overhaul', oeeImpact: 2.4, deferRisk: 7 },
      { id: 'r-aty-3', stationId: 's-atyrau-gnps', stationName: 'ГНПС Атырау', equipment: 'КИПиА / SCADA', description: 'Замена датчиков давления Метран-150, обновление ПО SCADA', dueDate: '2026-08-15', budget: 18.9, priority: 'medium', type: 'preventive', oeeImpact: 0.6, deferRisk: 3 },
      { id: 'r-aty-4', stationId: 's-atyrau-gnps', stationName: 'ГНПС Атырау', equipment: 'Система электроснабжения', description: 'ТО трансформаторов Т-1, Т-2; замена предохранителей ячеек 6кВ', dueDate: '2026-09-05', budget: 28.4, priority: 'critical', type: 'preventive', oeeImpact: 3.2, deferRisk: 9 },
    ],
  },
  's-tengiz': {
    stationId: 's-tengiz',
    oee: { availability: 92.1, performance: 91.3, quality: 98.8, oee: 83.1, mtbf: 2100, mttr: 5.4 },
    ppr2026: { planned: 312.0, spent: 145.8, remaining: 166.2, pct: 46.7 },
    repairs: [
      { id: 'r-ten-1', stationId: 's-tengiz', stationName: 'ГОС «Тенгиз»', equipment: 'НА-1,3,5 (ЦНС-500)', description: 'Плановая ревизия 3 насосных агрегатов, замена уплотнений', dueDate: '2026-06-01', budget: 92.4, priority: 'critical', type: 'preventive', oeeImpact: 2.8, deferRisk: 8 },
      { id: 'r-ten-2', stationId: 's-tengiz', stationName: 'ГОС «Тенгиз»', equipment: 'Резервуарный парк', description: 'Зачистка и антикоррозионная обработка РВС-5000 №4', dueDate: '2026-08-30', budget: 58.6, priority: 'high', type: 'overhaul', oeeImpact: 1.1, deferRisk: 5 },
      { id: 'r-ten-3', stationId: 's-tengiz', stationName: 'ГОС «Тенгиз»', equipment: 'Трубопровод 820мм', description: 'Диагностика коррозии участка км 12-28, ВТД', dueDate: '2026-07-15', budget: 44.2, priority: 'high', type: 'inspection', oeeImpact: 1.6, deferRisk: 7 },
    ],
  },
  's-kenkiyak': {
    stationId: 's-kenkiyak',
    oee: { availability: 89.4, performance: 86.2, quality: 97.5, oee: 75.1, mtbf: 1320, mttr: 9.8 },
    ppr2026: { planned: 162.0, spent: 52.1, remaining: 109.9, pct: 32.2 },
    repairs: [
      { id: 'r-ken-1', stationId: 's-kenkiyak', stationName: 'ГНПС «Кенкияк»', equipment: 'НА-2 (ЦНС-360)', description: 'Аварийный ремонт: вибрация 12 мм/с, замена ротора', dueDate: '2026-05-30', budget: 54.8, priority: 'critical', type: 'corrective', oeeImpact: 4.2, deferRisk: 9 },
      { id: 'r-ken-2', stationId: 's-kenkiyak', stationName: 'ГНПС «Кенкияк»', equipment: 'Система пожаротушения', description: 'Замена насосов пожаротушения, проверка спринклеров', dueDate: '2026-07-01', budget: 22.4, priority: 'high', type: 'preventive', oeeImpact: 0.0, deferRisk: 8 },
      { id: 'r-ken-3', stationId: 's-kenkiyak', stationName: 'ГНПС «Кенкияк»', equipment: 'КИПиА', description: 'Калибровка расходомеров СИКН, поверка манометров', dueDate: '2026-06-20', budget: 12.5, priority: 'medium', type: 'preventive', oeeImpact: 0.8, deferRisk: 4 },
    ],
  },
  's-pavlodar-gnps': {
    stationId: 's-pavlodar-gnps',
    oee: { availability: 86.5, performance: 82.4, quality: 97.1, oee: 69.4, mtbf: 980, mttr: 14.2 },
    ppr2026: { planned: 188.0, spent: 31.2, remaining: 156.8, pct: 16.6 },
    repairs: [
      { id: 'r-pav-1', stationId: 's-pavlodar-gnps', stationName: 'ГНПС Павлодар', equipment: 'НА-1,2 (ЦНС-500)', description: 'ТО насосов после нештатной ситуации 12.04.2026; замена торцевых уплотнений', dueDate: '2026-06-05', budget: 68.3, priority: 'critical', type: 'corrective', oeeImpact: 5.8, deferRisk: 10 },
      { id: 'r-pav-2', stationId: 's-pavlodar-gnps', stationName: 'ГНПС Павлодар', equipment: 'Трубопровод подключения ПНХЗ', description: 'Переиспытание линейной части, ультразвуковая дефектоскопия', dueDate: '2026-07-12', budget: 44.1, priority: 'high', type: 'inspection', oeeImpact: 1.2, deferRisk: 6 },
      { id: 'r-pav-3', stationId: 's-pavlodar-gnps', stationName: 'ГНПС Павлодар', equipment: 'Электроснабжение', description: 'Замена кабельных перемычек 6кВ, ТО ячеек КРУ-6', dueDate: '2026-08-20', budget: 29.8, priority: 'high', type: 'preventive', oeeImpact: 2.1, deferRisk: 7 },
      { id: 'r-pav-4', stationId: 's-pavlodar-gnps', stationName: 'ГНПС Павлодар', equipment: 'Система охлаждения', description: 'Промывка теплообменников НА-1..4, замена уплотнений', dueDate: '2026-09-15', budget: 15.6, priority: 'medium', type: 'preventive', oeeImpact: 0.9, deferRisk: 3 },
    ],
  },
  's-atasu': {
    stationId: 's-atasu',
    oee: { availability: 91.8, performance: 87.6, quality: 98.3, oee: 79.1, mtbf: 1680, mttr: 7.4 },
    ppr2026: { planned: 198.0, spent: 82.6, remaining: 115.4, pct: 41.7 },
    repairs: [
      { id: 'r-ats-1', stationId: 's-atasu', stationName: 'ГНПС «Атасу»', equipment: 'Узел СИКН', description: 'Поверка узла учёта нефти СИКН-100, замена датчиков', dueDate: '2026-06-25', budget: 34.2, priority: 'critical', type: 'inspection', oeeImpact: 0.5, deferRisk: 8 },
      { id: 'r-ats-2', stationId: 's-atasu', stationName: 'ГНПС «Атасу»', equipment: 'НА-3 (ЦНС-500)', description: 'Капитальный ремонт насоса, замена ротора, рабочих колёс', dueDate: '2026-07-30', budget: 78.5, priority: 'high', type: 'overhaul', oeeImpact: 3.1, deferRisk: 6 },
    ],
  },
  's-nps8': {
    stationId: 's-nps8',
    oee: { availability: 87.3, performance: 84.1, quality: 97.8, oee: 71.8, mtbf: 1100, mttr: 11.5 },
    ppr2026: { planned: 134.0, spent: 44.8, remaining: 89.2, pct: 33.4 },
    repairs: [
      { id: 'r-n8-1', stationId: 's-nps8', stationName: 'НПС-8', equipment: 'НА-1 (ЦНС-360)', description: 'Повышенная вибрация (14 мм/с): ремонт подшипниковых опор', dueDate: '2026-06-03', budget: 42.1, priority: 'critical', type: 'corrective', oeeImpact: 4.6, deferRisk: 9 },
      { id: 'r-n8-2', stationId: 's-nps8', stationName: 'НПС-8', equipment: 'Линейная задвижка Ду820', description: 'Замена приводного механизма ЛЗ-820 (км 48)', dueDate: '2026-07-18', budget: 28.4, priority: 'high', type: 'corrective', oeeImpact: 1.4, deferRisk: 6 },
      { id: 'r-n8-3', stationId: 's-nps8', stationName: 'НПС-8', equipment: 'Система КИПиА', description: 'ТО системы ПАЗ (противоаварийная автоматика), тест сигнализаций', dueDate: '2026-08-10', budget: 16.8, priority: 'high', type: 'preventive', oeeImpact: 0.3, deferRisk: 7 },
    ],
  },
  's-kumkol': {
    stationId: 's-kumkol',
    oee: { availability: 93.5, performance: 89.2, quality: 98.5, oee: 82.2, mtbf: 2050, mttr: 5.8 },
    ppr2026: { planned: 145.0, spent: 67.2, remaining: 77.8, pct: 46.3 },
    repairs: [
      { id: 'r-kum-1', stationId: 's-kumkol', stationName: 'ГНПС «Кумколь»', equipment: 'НА-2 (ЦНС-500)', description: 'Плановое ТО: ревизия торцевых уплотнений, балансировка ротора', dueDate: '2026-07-05', budget: 32.5, priority: 'medium', type: 'preventive', oeeImpact: 1.2, deferRisk: 4 },
    ],
  },
  's-uzen': {
    stationId: 's-uzen',
    oee: { availability: 90.2, performance: 85.8, quality: 97.6, oee: 75.6, mtbf: 1450, mttr: 8.4 },
    ppr2026: { planned: 112.0, spent: 38.4, remaining: 73.6, pct: 34.3 },
    repairs: [
      { id: 'r-uzn-1', stationId: 's-uzen', stationName: 'ГНПС «Узень»', equipment: 'Подогреватель нефти', description: 'Ремонт печей подогрева нефти ПТБ-10, замена горелочных устройств', dueDate: '2026-06-28', budget: 45.8, priority: 'high', type: 'preventive', oeeImpact: 2.8, deferRisk: 7 },
      { id: 'r-uzn-2', stationId: 's-uzen', stationName: 'ГНПС «Узень»', equipment: 'НА-1 (ЦНС-360)', description: 'Плановый ремонт насоса', dueDate: '2026-08-22', budget: 28.1, priority: 'medium', type: 'preventive', oeeImpact: 1.5, deferRisk: 4 },
    ],
  },
}

// ─── Aggregated PPR summary ────────────────────────────────────────────────────
export const ALL_REPAIRS: RepairItem[] = Object.values(STATION_MAINTENANCE)
  .flatMap(s => s.repairs)
  .sort((a, b) => a.dueDate.localeCompare(b.dueDate))

export const TOTAL_PPR: PPRBudget = Object.values(STATION_MAINTENANCE).reduce(
  (acc, s) => ({
    planned:   acc.planned   + s.ppr2026.planned,
    spent:     acc.spent     + s.ppr2026.spent,
    remaining: acc.remaining + s.ppr2026.remaining,
    pct:       0,
  }),
  { planned: 0, spent: 0, remaining: 0, pct: 0 },
)
TOTAL_PPR.pct = Math.round((TOTAL_PPR.spent / TOTAL_PPR.planned) * 100)

// ─── AI Scenario Optimizer ────────────────────────────────────────────────────

export interface AIScenario {
  id:        string
  name:      string
  icon:      string
  tagline:   string
  selected:  RepairItem[]
  deferred:  RepairItem[]
  totalCost: number
  savings:   number        // vs full plan
  oeeGain:   number        // % points
  riskScore: number        // 0–10
  capexPct:  number        // % of planned budget used
  reasoning: string[]
}

function scoreRepair(r: RepairItem): number {
  const priorityW = r.priority === 'critical' ? 3 : r.priority === 'high' ? 2 : 1
  return (r.oeeImpact * priorityW) / r.budget
}

export function generateScenarios(repairs: RepairItem[], totalBudget: number): AIScenario[] {
  const critical = repairs.filter(r => r.priority === 'critical')
  const high     = repairs.filter(r => r.priority === 'high')
  const medium   = repairs.filter(r => r.priority === 'medium')

  const critCost = critical.reduce((s, r) => s + r.budget, 0)
  const highCost = high.reduce((s, r) => s + r.budget, 0)

  // ── Сценарий A: Минимальный CAPEX ──────────────────────────────────────────
  const scenA_sel = [...critical]
  const scenA_def = [...high, ...medium]
  const scenA_cost = critCost
  const scenA_oee  = critical.reduce((s, r) => s + r.oeeImpact, 0)
  const scenA_risk = Math.round(
    scenA_def.reduce((s, r) => s + r.deferRisk, 0) / Math.max(scenA_def.length, 1)
  )

  // ── Сценарий B: Сбалансированный (ИИ-оптимизация по OEE/Cost ratio) ────────
  // Greedy knapsack: сортировка по OEE-gain per tenge, добор в рамках 85% бюджета
  const budgetB   = totalBudget * 0.85
  const allSorted = [...repairs].sort((a, b) => scoreRepair(b) - scoreRepair(a))
  const scenB_sel: RepairItem[] = []
  let spent = 0
  for (const r of allSorted) {
    if (spent + r.budget <= budgetB) { scenB_sel.push(r); spent += r.budget }
  }
  const scenB_def  = repairs.filter(r => !scenB_sel.find(s => s.id === r.id))
  const scenB_cost = scenB_sel.reduce((s, r) => s + r.budget, 0)
  const scenB_oee  = scenB_sel.reduce((s, r) => s + r.oeeImpact, 0)
  const scenB_risk = scenB_def.length > 0
    ? Math.round(scenB_def.reduce((s, r) => s + r.deferRisk, 0) / scenB_def.length)
    : 0

  // ── Сценарий C: Максимальная надёжность (все critical + high) ─────────────
  const scenC_sel  = [...critical, ...high]
  const scenC_def  = [...medium]
  const scenC_cost = critCost + highCost
  const scenC_oee  = scenC_sel.reduce((s, r) => s + r.oeeImpact, 0)
  const scenC_risk = Math.round(
    scenC_def.reduce((s, r) => s + r.deferRisk, 0) / Math.max(scenC_def.length, 1)
  )

  return [
    {
      id: 'A', name: 'Мин. CAPEX', icon: '💰', tagline: 'Только критичное — сохранить бюджет',
      selected: scenA_sel, deferred: scenA_def,
      totalCost: scenA_cost, savings: totalBudget - scenA_cost,
      oeeGain: +scenA_oee.toFixed(1), riskScore: scenA_risk,
      capexPct: Math.round((scenA_cost / totalBudget) * 100),
      reasoning: [
        `Выполняются только ${critical.length} критичных работ`,
        `Экономия бюджета: ${(totalBudget - scenA_cost).toFixed(0)} млн тг (${Math.round(((totalBudget - scenA_cost) / totalBudget) * 100)}%)`,
        `Риск: ${scenA_def.length} работ перенесено — возможны отказы оборудования`,
        `ОЭЭ вырастет на ${scenA_oee.toFixed(1)}% при минимальных затратах`,
      ],
    },
    {
      id: 'B', name: 'ИИ-баланс', icon: '🤖', tagline: 'Оптимальный OEE/CAPEX — рекомендован ИИ',
      selected: scenB_sel, deferred: scenB_def,
      totalCost: scenB_cost, savings: totalBudget - scenB_cost,
      oeeGain: +scenB_oee.toFixed(1), riskScore: scenB_risk,
      capexPct: Math.round((scenB_cost / totalBudget) * 100),
      reasoning: [
        `ИИ отобрал ${scenB_sel.length} работ с наибольшим ΔOEEe/₸ (greedy knapsack)`,
        `CAPEX: ${scenB_cost.toFixed(0)} млн тг = ${Math.round((scenB_cost / totalBudget) * 100)}% от ППР`,
        `Прирост ОЭЭ: +${scenB_oee.toFixed(1)}% — наилучший результат на вложенный тенге`,
        `${scenB_def.length === 0 ? 'Все работы включены в бюджет' : `Перенесено ${scenB_def.length} низкоприоритетных работ`}`,
      ],
    },
    {
      id: 'C', name: 'Макс. надёжность', icon: '🛡', tagline: 'Critical + High — полная готовность',
      selected: scenC_sel, deferred: scenC_def,
      totalCost: scenC_cost, savings: totalBudget - scenC_cost,
      oeeGain: +scenC_oee.toFixed(1), riskScore: scenC_risk,
      capexPct: Math.round((scenC_cost / totalBudget) * 100),
      reasoning: [
        `Выполняются все ${scenC_sel.length} критичных и приоритетных работ`,
        `Перенесено только ${medium.length} плановых (среднеприоритетных) работ`,
        `Максимальный прирост ОЭЭ: +${scenC_oee.toFixed(1)}%`,
        `CAPEX: ${scenC_cost.toFixed(0)} млн тг — оптимально для стабилизации перед зимой`,
      ],
    },
  ]
}

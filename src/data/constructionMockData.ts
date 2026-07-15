/**
 * Mock-данные домена «Строительство».
 *
 * Единый источник для всех страниц модуля до появления реального бэкенда.
 * Все fetch-функции возвращают Promise и сделаны под прямой swap на API:
 *   - константа MOCK_LATENCY_MS имитирует сетевую задержку;
 *   - сигнатуры (id проекта → данные) совпадают с будущими GET-эндпойнтами
 *     /api/construction/projects/{id}/...
 *
 * Когда появится бэкенд — достаточно заменить тело функций на fetch(...)
 * без правок UI.
 */

import {
  USE_MOCK,
  apiFetchProject,
  apiFetchTasks,
  apiFetchZonePlanFact,
  apiFetchDeviations,
  apiFetchProgressCurve,
} from '@/lib/constructionApi'

/* ──────────────────────────── ТИПЫ ─────────────────────────────────────── */

export type TaskStatus = 'planned' | 'in_progress' | 'done' | 'late'
export type DeviationKind = 'schedule' | 'cost' | 'quality' | 'safety'
export type DeviationSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface ConstructionProject {
  id: string
  code: string
  name: string
  developer: string
  location: string
  plannedStart: string  // ISO date
  plannedFinish: string // ISO date
  actualStart: string | null
  budgetTotal: number   // BAC, ₸
  currency: 'KZT'
  /** Текущая отчётная дата проекта — относительно неё считаются PV/EV/AC. */
  dataDate: string
}

export interface BimElement {
  id: string
  guid: string
  type: string                 // IfcWall / IfcSlab / IfcColumn / ...
  name: string
  zone: string                 // захватка
  level: string                // этаж/уровень
  /** Простая геометрия для 4D-сцены: ось-выравненный бокс. */
  bbox: { x: number; y: number; z: number; w: number; h: number; d: number }
  color: string
  /** Ссылка на задачу графика (связка element_task_links). */
  taskId: string
  /** Стоимость в смете, ₸ (свёрнутая через element_cost_links). */
  cost: number
}

export interface ScheduleTask {
  id: string
  wbs: string
  name: string
  zone: string
  plannedStart: string
  plannedFinish: string
  actualStart: string | null
  actualFinish: string | null
  /** Доля выполнения 0..100 на dataDate проекта. */
  progressPct: number
  status: TaskStatus
  plannedValue: number   // PV, ₸
  earnedValue: number    // EV, ₸
  actualCost: number     // AC, ₸
  /** Привязка к фазе/этапу строительства (Phase.id). */
  phaseId?: string
  /** Ответственный руководитель (ИТР проекта). */
  responsibleName?: string
  /** Категория ответственности. */
  responsibleRole?: string
}

/* ─── Фазы строительства, ресурсы, вехи, назначения, зависимости ──────── */

export type ResourceType =
  | 'contractor'      // генеральный подрядчик
  | 'subcontractor'   // субподрядчик
  | 'inhouse'         // собственная бригада / отдел
  | 'equipment'       // строительная техника
  | 'material'        // материальный ресурс

export type MilestoneStatus = 'reached' | 'at_risk' | 'missed' | 'upcoming'
export type MilestoneKind   = 'start' | 'gate' | 'permit' | 'finish'

export type DependencyKind = 'FS' | 'SS' | 'FF' | 'SF'

export interface Phase {
  id: string
  code: string           // P1, P2, ...
  name: string
  description: string
  color: string          // hex для бара в Гантте/легенде
  plannedStart: string
  plannedFinish: string
}

/** Источник интеграции, из которого подтягивается карточка ресурса. */
export type ResourceErpSource =
  | 'erp_1c'      // 1С:ERP — для материалов и техники
  | 'upp_1c'      // 1С:УПП — производственные заявки, лизинг техники
  | 'buh_1c'      // 1С:Бухгалтерия — взаиморасчёты с поставщиками
  | 'sap_ps'      // SAP PS — закупочные потребности
  | 'manual'      // ручной ввод (не из ERP)

/** Статус поставки материала / мобилизации техники. */
export type DeliveryStatus = 'pending' | 'ordered' | 'partial' | 'delivered'

export interface Resource {
  id: string
  name: string
  type: ResourceType
  organization?: string  // полное юр. наименование / филиал
  /** Контактное лицо (ФИО) с этой стороны. */
  contactPerson?: string
  /** Объём ресурса (чел., ед. техники, объёмы поставки). */
  capacity?: string
  /** Стоимость использования (для отчётности). */
  costRate?: string
  /** Активен/мобилизован на объекте? */
  mobilized: boolean
  /** Краткое примечание / специализация. */
  specialization?: string

  /* ── ERP-данные (для материалов / спецтехники подтягиваются из 1С / SAP) ── */
  /** Откуда синхронизируется карточка ресурса. */
  erpSource?: ResourceErpSource
  /** Код позиции в внешней системе (номенклатура 1С / matnr SAP / инв. номер). */
  erpCode?: string
  /** Единица измерения (для материалов: м³ / т / м² / шт; для техники: маш-смена). */
  unit?: string
  /** Плановый объём поставки / эксплуатации. */
  plannedQty?: number
  /** Фактически поставлено / отработано (в той же единице). */
  actualQty?: number
  /** Цена за единицу, ₸ (для материалов). */
  unitPrice?: number
  /** Поставщик / лизингодатель. */
  supplier?: string
  /** Статус поставки / мобилизации. */
  deliveryStatus?: DeliveryStatus
}

export interface Milestone {
  id: string
  code: string           // M1, M2, ...
  name: string
  phaseId: string
  plannedDate: string
  actualDate: string | null
  status: MilestoneStatus
  kind: MilestoneKind
  description: string
  /** Связанные задачи, закрытие которых эту веху подтверждает. */
  predecessorTaskIds: string[]
}

export interface TaskAssignment {
  id: string
  taskId: string
  resourceId: string
  /** Запланированный объём вовлечения (например, "120 чел-смен", "2 крана"). */
  plannedScope?: string
  /** Является ли этот ресурс ведущим исполнителем по задаче. */
  lead: boolean
}

export interface TaskDependency {
  fromTaskId: string
  toTaskId:   string
  kind:       DependencyKind
  lagDays?:   number
}

/* ─── CV-мониторинг: VLM-каталог, облёты дрона, анализы, ТБ-инциденты ── */

export type CvModelFamily =
  | 'Marlin'
  | 'LLaVA-Video'
  | 'LLaVA-NeXT-Video'
  | 'CogVLM2'
  | 'MOSS-VL'
  | 'InternVideo2'
  | 'Keye-VL'
  | 'LongVU'

export type CvPromptTemplate = 'progress' | 'safety' | 'caption' | 'qa' | 'custom'
export type CvRecommendedFor = 'progress' | 'safety' | 'caption' | 'qa' | 'general'

export interface CvModel {
  id: string
  /** Полное имя в реестре Hugging Face. */
  name: string
  org: string
  modelName: string
  family: CvModelFamily
  paramsBn: number          // млрд параметров
  /** Сколько кадров модель видит за один проход. */
  contextFrames: number
  updated: string           // ISO date
  hfDownloads: number       // загрузок за месяц
  hfLikes: number
  description: string
  strengths: string[]
  useCases: string[]
  recommendedFor: CvRecommendedFor
  /** Примерное время инференса на 30-сек клипе, сек. */
  inferenceTimeS: number
  /** Минимальный VRAM, ГБ. */
  vramGb: number
  license: string
}

export type DroneFlightStatus = 'uploaded' | 'analyzing' | 'analyzed' | 'archived'

export interface DroneFlight {
  id: string
  flightNumber: string
  date: string
  durationS: number
  droneModel: string
  pilot: string
  zonesCovered: string[]
  altitudeM: number
  weather: string
  fileSizeMb: number
  framesTotal: number
  status: DroneFlightStatus
  analysisCount: number
  /** Подсказка для отрисовки placeholder-кадра (БС-1, БС-2, паркинг, …). */
  sceneHint: 'bs1-mono' | 'bs1-piles' | 'bs2-pit' | 'parking' | 'site'
}

export type SafetyIssueKind =
  | 'no_helmet'
  | 'no_vest'
  | 'unsecured_zone'
  | 'falling_object'
  | 'unsafe_scaffold'
  | 'unsafe_lifting'

export interface SafetyIssue {
  id: string
  kind: SafetyIssueKind
  severity: DeviationSeverity
  /** Метка времени внутри клипа (mm:ss). */
  detectedAt: string
  zoneContext: string
  description: string
}

export interface CvProgressByZone {
  zone: string
  cvPct: number     // прогресс по CV
  planPct: number   // плановый прогресс из графика
  deltaPct: number  // cvPct - planPct
  comment: string
}

export interface CvAnalysisRun {
  id: string
  flightId: string
  modelId: string
  promptTemplate: CvPromptTemplate
  promptText: string
  startedAt: string
  finishedAt: string | null
  status: 'queued' | 'running' | 'done' | 'failed'
  inferenceTimeS: number
  output: {
    summary: string
    progressByZone: CvProgressByZone[]
    detectedElements: number
    safetyIssues: SafetyIssue[]
    recommendations: string[]
    confidence: number   // 0..100
  } | null
}

export interface CostItem {
  id: string
  externalCode: string
  name: string
  unit: string
  quantity: number
  unitPrice: number
  plannedValue: number
  actualCost: number
}

/** Точка S-кривой освоения (день). */
export interface ProgressCurvePoint {
  date: string       // ISO date
  plannedValue: number
  earnedValue: number
  actualCost: number
}

export interface ZonePlanFact {
  zone: string
  plannedPct: number
  factPct: number
  lagDays: number
}

export interface Deviation {
  id: string
  kind: DeviationKind
  severity: DeviationSeverity
  detectedAt: string
  resolvedAt: string | null
  scope: string         // короткое описание зоны/задачи
  description: string
  delta: number | null  // дней или ₸ — в зависимости от kind
}

export interface Forecast {
  id: string
  metric: 'finish_date' | 'cost_at_completion' | 'spi' | 'cpi'
  value: number | string
  /** Дата прогноза или числовое значение. */
  confidence: number    // 0..100
  model: string         // 'stub' пока
}

export interface TwinSummary {
  project: ConstructionProject
  kpi: {
    physicalProgress: number
    earnedValuePct: number
    spi: number
    cpi: number
    scheduleVariance: number
    laggingZones: number
    dailySmrValue: number   // млн ₸/сут
    materialsCoverage: number
    qualityDeviations: number
    safetyLtifr: number
  }
  recentDeviations: Deviation[]
  forecasts: Forecast[]
}

/* ──────────────────────── ФИКСТУРА ПРОЕКТА ─────────────────────────────── */

const PROJECT: ConstructionProject = {
  id: 'proj-highvill-astana',
  code: 'HVA-2026',
  name: 'ЖК «Highvill Astana» · 2-я очередь',
  developer: 'BI Group',
  location: 'Астана, район Есиль',
  plannedStart:  '2026-01-15',
  plannedFinish: '2027-12-31',
  actualStart:   '2026-01-20',
  budgetTotal:   48_000_000_000, // 48 млрд ₸
  currency:      'KZT',
  dataDate:      '2026-06-01',
}

/* ─────────────────────────── ЗАХВАТКИ / ЗОНЫ ───────────────────────────── */

const ZONES = [
  'БС-1 · фундамент',
  'БС-1 · этажи 1-6',
  'БС-1 · этажи 7-12',
  'БС-2 · фундамент',
  'БС-2 · этажи 1-6',
  'БС-2 · этажи 7-12',
  'Паркинг / подземный',
  'Благоустройство',
] as const

/* ─────────────────────────── ЗАДАЧИ ГРАФИКА ────────────────────────────── */

const TASKS: ScheduleTask[] = [
  {
    id: 't-001', wbs: '1.1.1', name: 'Земляные работы БС-1', zone: 'БС-1 · фундамент',
    plannedStart: '2026-01-15', plannedFinish: '2026-02-28',
    actualStart:  '2026-01-20', actualFinish:  '2026-03-05',
    progressPct: 100, status: 'done',
    plannedValue: 480_000_000, earnedValue: 480_000_000, actualCost: 492_000_000,
    phaseId: 'P1', responsibleName: 'Петров В.А.', responsibleRole: 'Начальник участка БС-1',
  },
  {
    id: 't-002', wbs: '1.2.1', name: 'Свайное поле БС-1', zone: 'БС-1 · фундамент',
    plannedStart: '2026-03-01', plannedFinish: '2026-04-15',
    actualStart:  '2026-03-06', actualFinish:  '2026-04-18',
    progressPct: 100, status: 'done',
    plannedValue: 920_000_000, earnedValue: 920_000_000, actualCost: 941_000_000,
    phaseId: 'P2', responsibleName: 'Петров В.А.', responsibleRole: 'Начальник участка БС-1',
  },
  {
    id: 't-003', wbs: '1.2.2', name: 'Ростверк БС-1', zone: 'БС-1 · фундамент',
    plannedStart: '2026-04-10', plannedFinish: '2026-05-15',
    actualStart:  '2026-04-19', actualFinish:  '2026-05-20',
    progressPct: 100, status: 'done',
    plannedValue: 360_000_000, earnedValue: 360_000_000, actualCost: 358_000_000,
    phaseId: 'P2', responsibleName: 'Петров В.А.', responsibleRole: 'Начальник участка БС-1',
  },
  {
    id: 't-004', wbs: '1.3.1', name: 'Монолит этажи 1-6 БС-1', zone: 'БС-1 · этажи 1-6',
    plannedStart: '2026-05-01', plannedFinish: '2026-09-30',
    actualStart:  '2026-05-22', actualFinish:  null,
    progressPct: 72, status: 'in_progress',
    plannedValue: 2_100_000_000, earnedValue: 1_512_000_000, actualCost: 1_584_000_000,
    phaseId: 'P3', responsibleName: 'Петров В.А.', responsibleRole: 'Начальник участка БС-1',
  },
  {
    id: 't-005', wbs: '1.3.2', name: 'Монолит этажи 7-12 БС-1', zone: 'БС-1 · этажи 7-12',
    plannedStart: '2026-08-01', plannedFinish: '2026-12-31',
    actualStart:  null, actualFinish: null,
    progressPct: 0, status: 'planned',
    plannedValue: 2_100_000_000, earnedValue: 0, actualCost: 0,
    phaseId: 'P3', responsibleName: 'Петров В.А.', responsibleRole: 'Начальник участка БС-1',
  },
  {
    id: 't-006', wbs: '2.1.1', name: 'Земляные работы БС-2', zone: 'БС-2 · фундамент',
    plannedStart: '2026-02-15', plannedFinish: '2026-04-15',
    actualStart:  '2026-02-20', actualFinish:  '2026-04-22',
    progressPct: 100, status: 'done',
    plannedValue: 480_000_000, earnedValue: 480_000_000, actualCost: 489_000_000,
    phaseId: 'P1', responsibleName: 'Сидоров К.Н.', responsibleRole: 'Начальник участка БС-2',
  },
  {
    id: 't-007', wbs: '2.2.1', name: 'Свайное поле БС-2', zone: 'БС-2 · фундамент',
    plannedStart: '2026-04-01', plannedFinish: '2026-05-30',
    actualStart:  '2026-04-23', actualFinish:  null,
    progressPct: 64, status: 'late',
    plannedValue: 920_000_000, earnedValue: 588_800_000, actualCost: 612_000_000,
    phaseId: 'P2', responsibleName: 'Сидоров К.Н.', responsibleRole: 'Начальник участка БС-2',
  },
  {
    id: 't-008', wbs: '2.2.2', name: 'Ростверк БС-2', zone: 'БС-2 · фундамент',
    plannedStart: '2026-05-20', plannedFinish: '2026-06-30',
    actualStart:  null, actualFinish: null,
    progressPct: 0, status: 'late',
    plannedValue: 360_000_000, earnedValue: 0, actualCost: 0,
    phaseId: 'P2', responsibleName: 'Сидоров К.Н.', responsibleRole: 'Начальник участка БС-2',
  },
  {
    id: 't-009', wbs: '2.3.1', name: 'Монолит этажи 1-6 БС-2', zone: 'БС-2 · этажи 1-6',
    plannedStart: '2026-06-15', plannedFinish: '2026-11-30',
    actualStart:  null, actualFinish: null,
    progressPct: 0, status: 'planned',
    plannedValue: 2_100_000_000, earnedValue: 0, actualCost: 0,
    phaseId: 'P3', responsibleName: 'Сидоров К.Н.', responsibleRole: 'Начальник участка БС-2',
  },
  {
    id: 't-010', wbs: '3.1.1', name: 'Подземный паркинг · монолит', zone: 'Паркинг / подземный',
    plannedStart: '2026-03-01', plannedFinish: '2026-08-31',
    actualStart:  '2026-03-15', actualFinish:  null,
    progressPct: 58, status: 'in_progress',
    plannedValue: 1_400_000_000, earnedValue: 812_000_000, actualCost: 845_000_000,
    phaseId: 'P2', responsibleName: 'Иванов А.С.', responsibleRole: 'ГИП',
  },
  {
    id: 't-011', wbs: '4.1.1', name: 'Внутренние сети инженерии БС-1', zone: 'БС-1 · этажи 1-6',
    plannedStart: '2026-09-01', plannedFinish: '2026-12-31',
    actualStart:  null, actualFinish: null,
    progressPct: 0, status: 'planned',
    plannedValue: 680_000_000, earnedValue: 0, actualCost: 0,
    phaseId: 'P5', responsibleName: 'Ким Е.В.', responsibleRole: 'Руководитель отделочных работ',
  },
  {
    id: 't-012', wbs: '7.1.1', name: 'Благоустройство и МАФ', zone: 'Благоустройство',
    plannedStart: '2027-04-01', plannedFinish: '2027-09-30',
    actualStart:  null, actualFinish: null,
    progressPct: 0, status: 'planned',
    plannedValue: 520_000_000, earnedValue: 0, actualCost: 0,
    phaseId: 'P7', responsibleName: 'Жанабаева Г.К.', responsibleRole: 'Инженер по благоустройству',
  },

  /* Дополнительные задачи (фасад, кровля, отделка, пусконаладка, верхний стек БС-2) */
  {
    id: 't-013', wbs: '2.3.2', name: 'Монолит этажи 7-12 БС-2', zone: 'БС-2 · этажи 7-12',
    plannedStart: '2026-10-15', plannedFinish: '2027-03-31',
    actualStart:  null, actualFinish: null,
    progressPct: 0, status: 'planned',
    plannedValue: 2_100_000_000, earnedValue: 0, actualCost: 0,
    phaseId: 'P3', responsibleName: 'Сидоров К.Н.', responsibleRole: 'Начальник участка БС-2',
  },
  {
    id: 't-014', wbs: '4.2.1', name: 'Фасад и витражи БС-1', zone: 'БС-1 · этажи 1-6',
    plannedStart: '2026-12-01', plannedFinish: '2027-04-30',
    actualStart:  null, actualFinish: null,
    progressPct: 0, status: 'planned',
    plannedValue: 980_000_000, earnedValue: 0, actualCost: 0,
    phaseId: 'P4', responsibleName: 'Иванов А.С.', responsibleRole: 'ГИП',
  },
  {
    id: 't-015', wbs: '4.2.2', name: 'Фасад и витражи БС-2', zone: 'БС-2 · этажи 1-6',
    plannedStart: '2027-03-15', plannedFinish: '2027-07-31',
    actualStart:  null, actualFinish: null,
    progressPct: 0, status: 'planned',
    plannedValue: 980_000_000, earnedValue: 0, actualCost: 0,
    phaseId: 'P4', responsibleName: 'Иванов А.С.', responsibleRole: 'ГИП',
  },
  {
    id: 't-016', wbs: '4.3.1', name: 'Кровля и парапеты (БС-1, БС-2)', zone: 'БС-1 · этажи 7-12',
    plannedStart: '2027-02-01', plannedFinish: '2027-06-30',
    actualStart:  null, actualFinish: null,
    progressPct: 0, status: 'planned',
    plannedValue: 420_000_000, earnedValue: 0, actualCost: 0,
    phaseId: 'P4', responsibleName: 'Иванов А.С.', responsibleRole: 'ГИП',
  },
  {
    id: 't-017', wbs: '6.1.1', name: 'Чистовая отделка квартир и МОП', zone: 'БС-1 · этажи 1-6',
    plannedStart: '2027-04-01', plannedFinish: '2027-10-31',
    actualStart:  null, actualFinish: null,
    progressPct: 0, status: 'planned',
    plannedValue: 1_840_000_000, earnedValue: 0, actualCost: 0,
    phaseId: 'P6', responsibleName: 'Ким Е.В.', responsibleRole: 'Руководитель отделочных работ',
  },
  {
    id: 't-018', wbs: '8.1.1', name: 'Пусконаладка инженерных систем', zone: 'БС-1 · этажи 7-12',
    plannedStart: '2027-09-01', plannedFinish: '2027-11-30',
    actualStart:  null, actualFinish: null,
    progressPct: 0, status: 'planned',
    plannedValue: 280_000_000, earnedValue: 0, actualCost: 0,
    phaseId: 'P8', responsibleName: 'Ахметов Р.Н.', responsibleRole: 'Главный энергетик',
  },
  {
    id: 't-019', wbs: '8.2.1', name: 'Сдача объекта, акты ГПК и разрешение на ввод', zone: 'Благоустройство',
    plannedStart: '2027-11-15', plannedFinish: '2027-12-15',
    actualStart:  null, actualFinish: null,
    progressPct: 0, status: 'planned',
    plannedValue: 80_000_000, earnedValue: 0, actualCost: 0,
    phaseId: 'P8', responsibleName: 'Иванов А.С.', responsibleRole: 'ГИП',
  },
]

/* ─────────────────────────── ФАЗЫ СТРОИТЕЛЬСТВА ────────────────────────── */

const PHASES: Phase[] = [
  { id: 'P1', code: 'P1', name: 'Подготовка площадки',
    description: 'Расчистка, ограждение, временная инфраструктура, земляные работы.',
    color: '#94a3b8',
    plannedStart: '2026-01-15', plannedFinish: '2026-04-30' },
  { id: 'P2', code: 'P2', name: 'Нулевой цикл (фундаменты, подземка)',
    description: 'Свайное поле, ростверки, плита паркинга, гидроизоляция.',
    color: '#0ea5e9',
    plannedStart: '2026-03-01', plannedFinish: '2026-08-31' },
  { id: 'P3', code: 'P3', name: 'Монолитные работы надземной части',
    description: 'Колонны, перекрытия, ядра ЛЛУ 1-12 этажей корпусов БС-1 / БС-2.',
    color: '#14b8a6',
    plannedStart: '2026-05-01', plannedFinish: '2027-03-31' },
  { id: 'P4', code: 'P4', name: 'Фасад и кровля',
    description: 'Навесные системы, витражи, оконные блоки, кровельный пирог, парапеты.',
    color: '#f59e0b',
    plannedStart: '2026-12-01', plannedFinish: '2027-07-31' },
  { id: 'P5', code: 'P5', name: 'Инженерные сети (ОВиК, ВК, ЭОМ, СС)',
    description: 'Внутренние сети отопления, водоснабжения, электрики, слаботочки.',
    color: '#6366f1',
    plannedStart: '2026-09-01', plannedFinish: '2027-08-31' },
  { id: 'P6', code: 'P6', name: 'Отделочные работы',
    description: 'Черновая и чистовая отделка квартир и мест общего пользования.',
    color: '#a855f7',
    plannedStart: '2027-04-01', plannedFinish: '2027-10-31' },
  { id: 'P7', code: 'P7', name: 'Благоустройство и инфраструктура',
    description: 'Дворовые территории, МАФ, озеленение, парковки и подъезды.',
    color: '#22c55e',
    plannedStart: '2027-04-01', plannedFinish: '2027-09-30' },
  { id: 'P8', code: 'P8', name: 'Пусконаладка и ввод в эксплуатацию',
    description: 'ПНР инженерных систем, приёмо-сдаточные испытания, акты ГПК.',
    color: '#ef4444',
    plannedStart: '2027-09-01', plannedFinish: '2027-12-15' },
]

/* ─────────────────────────── РЕСУРСЫ / ИСПОЛНИТЕЛИ ─────────────────────── */

const RESOURCES: Resource[] = [
  /* Генеральный подрядчик */
  { id: 'r-gc',     type: 'contractor',
    name: 'BI Construction',
    organization: 'ТОО «BI Construction»',
    contactPerson: 'Сулейменов Б.Р., директор по строительству',
    capacity: 'до 380 человек на объекте', costRate: 'EPC-контракт fixed price',
    mobilized: true, specialization: 'Генеральный подряд, координация СМР' },

  /* Субподрядчики */
  { id: 'r-geotech', type: 'subcontractor',
    name: 'АстанаГеотех',
    organization: 'ТОО «АстанаГеотех»',
    contactPerson: 'Турсунов Д.М., прораб',
    capacity: '2 буровые установки + 24 чел.', costRate: '48 000 ₸ / п.м сваи',
    mobilized: true, specialization: 'Земляные работы, буронабивные сваи Ø600' },
  { id: 'r-monolit', type: 'subcontractor',
    name: 'КазСтройМонолит',
    organization: 'ТОО «KazStroyMonolit»',
    contactPerson: 'Орлов В.К., руководитель проекта',
    capacity: '4 бригады × 18 чел.', costRate: '14 200 ₸ / м³ бетона',
    mobilized: true, specialization: 'Монолитный ж/б каркас (опалубка, армирование, бетонирование)' },
  { id: 'r-fasad',   type: 'subcontractor',
    name: 'АстанаФасад',
    organization: 'ТОО «АстанаФасад»',
    contactPerson: 'Сатпаев А.Е., нач. участка',
    capacity: '60 чел., 2 фасадные люльки', costRate: '38 000 ₸ / м² панели',
    mobilized: false, specialization: 'Навесные фасады, витражи, монтаж оконных блоков' },
  { id: 'r-mep',     type: 'subcontractor',
    name: 'КИП-Инжиниринг',
    organization: 'ТОО «КИП-Инжиниринг»',
    contactPerson: 'Беков С.А., главный инженер',
    capacity: '32 чел. (бригады ОВиК + ВК)', costRate: '18.5 млн ₸ / комплект инж. сетей',
    mobilized: false, specialization: 'Отопление, водоснабжение, канализация, вентиляция' },
  { id: 'r-electric', type: 'subcontractor',
    name: 'АлмаЭлектро',
    organization: 'ТОО «АлмаЭлектро»',
    contactPerson: 'Ким А.Г., нач. ЭО',
    capacity: '28 чел., 4 бригады', costRate: '12 500 ₸ / точка ЭОМ',
    mobilized: false, specialization: 'Электромонтажные работы, слаботочные системы' },
  { id: 'r-elevator', type: 'subcontractor',
    name: 'АлматыЛифт',
    organization: 'АО «АлматыЛифт»',
    contactPerson: 'Жаксыбеков Н.Т.',
    capacity: '2 бригады монтажников', costRate: '42 млн ₸ / шахта',
    mobilized: false, specialization: 'Лифтовое оборудование, монтаж и ПНР' },

  /* Свои ресурсы / бригады */
  { id: 'r-inhouse-mono1', type: 'inhouse',
    name: 'Бригада монолитчиков №1 (БС-1)',
    contactPerson: 'Бригадир Бектас Ж.',
    capacity: '18 чел.', costRate: 'ФОТ ~ 9.5 млн ₸/мес',
    mobilized: true, specialization: 'Опалубка, армирование, бетонирование' },
  { id: 'r-inhouse-mono2', type: 'inhouse',
    name: 'Бригада монолитчиков №2 (БС-2)',
    contactPerson: 'Бригадир Жанибек Е.',
    capacity: '18 чел.', costRate: 'ФОТ ~ 9.5 млн ₸/мес',
    mobilized: true, specialization: 'Опалубка, армирование, бетонирование' },
  { id: 'r-inhouse-finish', type: 'inhouse',
    name: 'Бригада отделочников',
    contactPerson: 'Бригадир Алия К.',
    capacity: '24 чел., 4 звена', costRate: 'ФОТ ~ 12 млн ₸/мес',
    mobilized: false, specialization: 'Чистовая отделка квартир и МОП' },
  { id: 'r-inhouse-landscape', type: 'inhouse',
    name: 'Бригада благоустройства',
    contactPerson: 'Бригадир Канат С.',
    capacity: '12 чел.', costRate: 'ФОТ ~ 6 млн ₸/мес',
    mobilized: false, specialization: 'Дороги, тротуары, МАФ, озеленение' },
  { id: 'r-itr',           type: 'inhouse',
    name: 'ИТР проекта',
    contactPerson: 'Иванов А.С., ГИП',
    capacity: '14 чел. (ГИП, начальники участков, ПТО, ССК)', costRate: 'ФОТ ~ 18 млн ₸/мес',
    mobilized: true, specialization: 'Управление СМР, контроль качества и безопасности' },

  /* Техника (карточки синхронизируются из 1С:ERP / 1С:УПП) */
  { id: 'r-crane1', type: 'equipment',
    name: 'Башенный кран Liebherr 132 EC-H № КР-1',
    capacity: 'Q=8 т, вылет 50 м', costRate: '1.8 млн ₸/мес лизинг',
    mobilized: true, specialization: 'Подача бетона и арматуры — БС-1',
    erpSource: 'upp_1c', erpCode: 'ТЕХ-КР-001', unit: 'маш-смена',
    plannedQty: 540, actualQty: 312, unitPrice: 95_000,
    supplier: 'Liebherr Kazakhstan, ТОО', deliveryStatus: 'partial' },
  { id: 'r-crane2', type: 'equipment',
    name: 'Башенный кран Liebherr 132 EC-H № КР-2',
    capacity: 'Q=8 т, вылет 50 м', costRate: '1.8 млн ₸/мес лизинг',
    mobilized: false, specialization: 'Подача бетона и арматуры — БС-2',
    erpSource: 'upp_1c', erpCode: 'ТЕХ-КР-002', unit: 'маш-смена',
    plannedQty: 540, actualQty: 0, unitPrice: 95_000,
    supplier: 'Liebherr Kazakhstan, ТОО', deliveryStatus: 'ordered' },
  { id: 'r-pump', type: 'equipment',
    name: 'Бетононасос Schwing S38 SX',
    capacity: 'Подача 160 м³/ч, стрела 38 м', costRate: '85 000 ₸/маш-смена',
    mobilized: true, specialization: 'Бетонирование плит и колонн',
    erpSource: 'upp_1c', erpCode: 'ТЕХ-БН-001', unit: 'маш-смена',
    plannedQty: 248, actualQty: 142, unitPrice: 85_000,
    supplier: 'Schwing Kazakhstan, ТОО', deliveryStatus: 'partial' },
  { id: 'r-bauer', type: 'equipment',
    name: 'Буровая установка Bauer BG-28',
    capacity: 'Свая Ø600/Ø800 до L=24 м', costRate: '320 000 ₸/маш-смена',
    mobilized: false, specialization: 'Бурение свай (демобилизована после завершения свайного поля БС-1)',
    erpSource: 'upp_1c', erpCode: 'ТЕХ-БУ-001', unit: 'маш-смена',
    plannedQty: 320, actualQty: 318, unitPrice: 320_000,
    supplier: 'Bauer Maschinen GmbH', deliveryStatus: 'delivered' },

  /* Материалы (полностью из 1С:ERP — номенклатура и заказы поставщикам) */
  { id: 'mat-beton', type: 'material',
    name: 'Бетон В30 (М400, морозостойкий)',
    capacity: '14 200 м³ по сводной спецификации',
    costRate: '65 000 ₸/м³',
    mobilized: true, specialization: 'Монолитный конструктивный бетон БС-1/БС-2/паркинг',
    erpSource: 'erp_1c', erpCode: 'СП-01.01', unit: 'м³',
    plannedQty: 14_200, actualQty: 8_240, unitPrice: 65_000,
    supplier: 'KazBeton, ТОО (АБЗ-3 Астана)', deliveryStatus: 'partial' },
  { id: 'mat-rebar', type: 'material',
    name: 'Арматура А500С Ø10-32',
    capacity: '1 820 т по проекту',
    costRate: '420 000 ₸/т',
    mobilized: true, specialization: 'Армирование плит, колонн и ядер ЛЛУ',
    erpSource: 'erp_1c', erpCode: 'СП-01.02', unit: 'т',
    plannedQty: 1_820, actualQty: 1_120, unitPrice: 420_000,
    supplier: 'АрселорМиттал Темиртау', deliveryStatus: 'partial' },
  { id: 'mat-pile', type: 'material',
    name: 'Сваи буронабивные Ø600 (бетон + каркас)',
    capacity: '18 400 п.м готовых свай',
    costRate: '48 000 ₸/п.м',
    mobilized: true, specialization: 'Свайное поле БС-1 (закрыто) и БС-2 (в работе)',
    erpSource: 'erp_1c', erpCode: 'СП-02.01', unit: 'п.м',
    plannedQty: 18_400, actualQty: 13_900, unitPrice: 48_000,
    supplier: 'СвайСтрой, ТОО', deliveryStatus: 'partial' },
  { id: 'mat-opalubka', type: 'material',
    name: 'Опалубка крупнощитовая PERI MAXIMO',
    capacity: '28 500 м² по графику оборачиваемости',
    costRate: 'лизинг · 14 000 ₸/м²',
    mobilized: true, specialization: 'Перекрытия и стены 1-12 этажей',
    erpSource: 'erp_1c', erpCode: 'СП-03.01', unit: 'м²',
    plannedQty: 28_500, actualQty: 28_500, unitPrice: 14_000,
    supplier: 'PERI Kazakhstan, ТОО', deliveryStatus: 'delivered' },
  { id: 'mat-panel', type: 'material',
    name: 'Стеновая панель навесная (алюкобонд)',
    capacity: '12 400 м² фасада на 2 корпуса',
    costRate: '38 000 ₸/м²',
    mobilized: false, specialization: 'Фасадные системы БС-1 / БС-2',
    erpSource: 'erp_1c', erpCode: 'СП-04.01', unit: 'м²',
    plannedQty: 12_400, actualQty: 0, unitPrice: 38_000,
    supplier: 'AlucoBond Kazakhstan', deliveryStatus: 'ordered' },
  { id: 'mat-okna', type: 'material',
    name: 'Окна ПВХ 2-камерные (REHAU Brillant-Design)',
    capacity: '5 600 м² оконных проёмов',
    costRate: '52 000 ₸/м²',
    mobilized: false, specialization: 'Витражи и окна квартир',
    erpSource: 'erp_1c', erpCode: 'СП-05.01', unit: 'м²',
    plannedQty: 5_600, actualQty: 0, unitPrice: 52_000,
    supplier: 'REHAU Kazakhstan', deliveryStatus: 'pending' },
  { id: 'mat-lift', type: 'material',
    name: 'Лифтовое оборудование (грузопасс. 1000/8 чел)',
    capacity: '8 шахт по двум корпусам',
    costRate: '42 млн ₸/шт.',
    mobilized: false, specialization: 'Поставка → монтаж → ПНР лифтов',
    erpSource: 'erp_1c', erpCode: 'СП-07.01', unit: 'шт.',
    plannedQty: 8, actualQty: 0, unitPrice: 42_000_000,
    supplier: 'АО «АлматыЛифт»', deliveryStatus: 'pending' },
  { id: 'mat-mep', type: 'material',
    name: 'Инженерные сети · ОВиК + ВК (комплект на квартиру)',
    capacity: '24 комплекта (по числу секций)',
    costRate: '18.5 млн ₸/компл.',
    mobilized: false, specialization: 'Отопление, водоснабжение, канализация',
    erpSource: 'erp_1c', erpCode: 'СП-06.01', unit: 'компл.',
    plannedQty: 24, actualQty: 0, unitPrice: 18_500_000,
    supplier: 'КИП-Инжиниринг, ТОО', deliveryStatus: 'pending' },
]

/* ─────────────────────────── ВЕХИ ──────────────────────────────────────── */

const MILESTONES: Milestone[] = [
  { id: 'm-001', code: 'M1', name: 'Старт проекта',           phaseId: 'P1',
    plannedDate: '2026-01-15', actualDate: '2026-01-20',
    status: 'reached', kind: 'start',
    description: 'Открытие стройплощадки, мобилизация ИТР и генподряда.',
    predecessorTaskIds: [] },
  { id: 'm-002', code: 'M2', name: 'Завершение земляных работ', phaseId: 'P1',
    plannedDate: '2026-04-30', actualDate: '2026-04-22',
    status: 'reached', kind: 'gate',
    description: 'Котлованы обоих корпусов готовы под устройство свайных полей.',
    predecessorTaskIds: ['t-001', 't-006'] },
  { id: 'm-003', code: 'M3', name: 'Закрытие нулевого цикла (БС-1 + БС-2)', phaseId: 'P2',
    plannedDate: '2026-06-30', actualDate: null,
    status: 'at_risk', kind: 'gate',
    description: 'Готовность фундаментов под начало монолитных работ; критическая веха графика.',
    predecessorTaskIds: ['t-003', 't-008'] },
  { id: 'm-004', code: 'M4', name: 'Завершение монолита БС-1', phaseId: 'P3',
    plannedDate: '2026-12-31', actualDate: null,
    status: 'upcoming', kind: 'gate',
    description: 'Каркас БС-1 в высотном объёме готов для фасадных работ.',
    predecessorTaskIds: ['t-005'] },
  { id: 'm-005', code: 'M5', name: 'Завершение монолита БС-2', phaseId: 'P3',
    plannedDate: '2027-04-30', actualDate: null,
    status: 'upcoming', kind: 'gate',
    description: 'Каркас БС-2 готов для фасадных работ.',
    predecessorTaskIds: ['t-013'] },
  { id: 'm-006', code: 'M6', name: 'Закрытие тепляка (фасад + кровля)', phaseId: 'P4',
    plannedDate: '2027-08-31', actualDate: null,
    status: 'upcoming', kind: 'gate',
    description: 'Зданиях закрыт тепловой контур, можно вести отделку в зимнем режиме.',
    predecessorTaskIds: ['t-014', 't-015', 't-016'] },
  { id: 'm-007', code: 'M7', name: 'Завершение чистовой отделки', phaseId: 'P6',
    plannedDate: '2027-10-31', actualDate: null,
    status: 'upcoming', kind: 'gate',
    description: 'Готовность квартир и МОП к ПНР и заселению.',
    predecessorTaskIds: ['t-017'] },
  { id: 'm-008', code: 'M8', name: 'Разрешение на ввод в эксплуатацию', phaseId: 'P8',
    plannedDate: '2027-12-15', actualDate: null,
    status: 'upcoming', kind: 'permit',
    description: 'Получение акта ГПК и разрешения на ввод объекта в эксплуатацию.',
    predecessorTaskIds: ['t-018', 't-019'] },
]

/* ─────────────────────────── НАЗНАЧЕНИЯ ────────────────────────────────── */

const ASSIGNMENTS: TaskAssignment[] = [
  /* t-001: Земляные работы БС-1 */
  { id: 'a-001', taskId: 't-001', resourceId: 'r-geotech', plannedScope: '450 маш-смен', lead: true },
  { id: 'a-002', taskId: 't-001', resourceId: 'r-bauer',   plannedScope: 'мобилизация', lead: false },
  /* t-002: Свайное поле БС-1 */
  { id: 'a-003', taskId: 't-002', resourceId: 'r-geotech', plannedScope: '9 200 п.м свай', lead: true },
  { id: 'a-004', taskId: 't-002', resourceId: 'r-bauer',   plannedScope: '320 маш-смен', lead: false },
  /* t-003: Ростверк БС-1 */
  { id: 'a-005', taskId: 't-003', resourceId: 'r-monolit',        plannedScope: '600 чел-смен', lead: true },
  { id: 'a-006', taskId: 't-003', resourceId: 'r-inhouse-mono1',  plannedScope: '320 чел-смен', lead: false },
  { id: 'a-007', taskId: 't-003', resourceId: 'r-pump',            plannedScope: '24 маш-смены', lead: false },
  /* t-004: Монолит 1-6 БС-1 */
  { id: 'a-008', taskId: 't-004', resourceId: 'r-monolit',        plannedScope: '3 800 чел-смен', lead: true },
  { id: 'a-009', taskId: 't-004', resourceId: 'r-inhouse-mono1',  plannedScope: '2 700 чел-смен', lead: false },
  { id: 'a-010', taskId: 't-004', resourceId: 'r-crane1',          plannedScope: '150 маш-смен', lead: false },
  { id: 'a-011', taskId: 't-004', resourceId: 'r-pump',            plannedScope: '110 маш-смен', lead: false },
  /* t-005: Монолит 7-12 БС-1 */
  { id: 'a-012', taskId: 't-005', resourceId: 'r-monolit',        plannedScope: '3 800 чел-смен', lead: true },
  { id: 'a-013', taskId: 't-005', resourceId: 'r-inhouse-mono1',  plannedScope: '2 700 чел-смен', lead: false },
  { id: 'a-014', taskId: 't-005', resourceId: 'r-crane1',          plannedScope: '150 маш-смен', lead: false },
  /* t-006: Земляные работы БС-2 */
  { id: 'a-015', taskId: 't-006', resourceId: 'r-geotech', plannedScope: '450 маш-смен', lead: true },
  /* t-007: Свайное поле БС-2 */
  { id: 'a-016', taskId: 't-007', resourceId: 'r-geotech', plannedScope: '9 200 п.м свай', lead: true },
  /* t-008: Ростверк БС-2 */
  { id: 'a-017', taskId: 't-008', resourceId: 'r-monolit',        plannedScope: '600 чел-смен', lead: true },
  { id: 'a-018', taskId: 't-008', resourceId: 'r-inhouse-mono2',  plannedScope: '320 чел-смен', lead: false },
  { id: 'a-019', taskId: 't-008', resourceId: 'r-pump',            plannedScope: '24 маш-смены', lead: false },
  /* t-009: Монолит 1-6 БС-2 */
  { id: 'a-020', taskId: 't-009', resourceId: 'r-monolit',        plannedScope: '3 800 чел-смен', lead: true },
  { id: 'a-021', taskId: 't-009', resourceId: 'r-inhouse-mono2',  plannedScope: '2 700 чел-смен', lead: false },
  { id: 'a-022', taskId: 't-009', resourceId: 'r-crane2',          plannedScope: '150 маш-смен', lead: false },
  /* t-013: Монолит 7-12 БС-2 */
  { id: 'a-023', taskId: 't-013', resourceId: 'r-monolit',        plannedScope: '3 800 чел-смен', lead: true },
  { id: 'a-024', taskId: 't-013', resourceId: 'r-inhouse-mono2',  plannedScope: '2 700 чел-смен', lead: false },
  { id: 'a-025', taskId: 't-013', resourceId: 'r-crane2',          plannedScope: '150 маш-смен', lead: false },
  /* t-010: Подземный паркинг */
  { id: 'a-026', taskId: 't-010', resourceId: 'r-monolit',        plannedScope: '2 400 чел-смен', lead: true },
  { id: 'a-027', taskId: 't-010', resourceId: 'r-pump',            plannedScope: '90 маш-смен', lead: false },
  /* t-011: Внутренние сети БС-1 */
  { id: 'a-028', taskId: 't-011', resourceId: 'r-mep',            plannedScope: '24 комплекта', lead: true },
  { id: 'a-029', taskId: 't-011', resourceId: 'r-electric',       plannedScope: '4 800 точек ЭОМ', lead: false },
  /* t-014: Фасад БС-1 */
  { id: 'a-030', taskId: 't-014', resourceId: 'r-fasad',          plannedScope: '12 400 м² панелей', lead: true },
  /* t-015: Фасад БС-2 */
  { id: 'a-031', taskId: 't-015', resourceId: 'r-fasad',          plannedScope: '12 400 м² панелей', lead: true },
  /* t-016: Кровля */
  { id: 'a-032', taskId: 't-016', resourceId: 'r-fasad',          plannedScope: '4 200 м² кровли', lead: true },
  /* t-017: Отделка */
  { id: 'a-033', taskId: 't-017', resourceId: 'r-inhouse-finish', plannedScope: '6 800 чел-смен', lead: true },
  { id: 'a-034', taskId: 't-017', resourceId: 'r-electric',       plannedScope: '2 100 точек ЭОМ', lead: false },
  /* t-018: ПНР */
  { id: 'a-035', taskId: 't-018', resourceId: 'r-mep',            plannedScope: 'ПНР ОВиК + ВК', lead: true },
  { id: 'a-036', taskId: 't-018', resourceId: 'r-electric',       plannedScope: 'ПНР ЭОМ + СС', lead: false },
  { id: 'a-037', taskId: 't-018', resourceId: 'r-elevator',       plannedScope: 'ПНР 8 лифтов', lead: false },
  /* t-019: Сдача */
  { id: 'a-038', taskId: 't-019', resourceId: 'r-gc',             plannedScope: 'Координация ГПК', lead: true },
  { id: 'a-039', taskId: 't-019', resourceId: 'r-itr',            plannedScope: 'Подготовка ИД', lead: false },
  /* t-012: Благоустройство */
  { id: 'a-040', taskId: 't-012', resourceId: 'r-inhouse-landscape', plannedScope: '2 400 чел-смен', lead: true },
]

/* ─────────────────────────── ЗАВИСИМОСТИ ───────────────────────────────── */

const DEPENDENCIES: TaskDependency[] = [
  { fromTaskId: 't-001', toTaskId: 't-002', kind: 'FS' },
  { fromTaskId: 't-002', toTaskId: 't-003', kind: 'FS' },
  { fromTaskId: 't-003', toTaskId: 't-004', kind: 'FS' },
  { fromTaskId: 't-004', toTaskId: 't-005', kind: 'SS', lagDays: 90 },
  { fromTaskId: 't-006', toTaskId: 't-007', kind: 'FS' },
  { fromTaskId: 't-007', toTaskId: 't-008', kind: 'FS' },
  { fromTaskId: 't-008', toTaskId: 't-009', kind: 'FS' },
  { fromTaskId: 't-009', toTaskId: 't-013', kind: 'SS', lagDays: 120 },
  { fromTaskId: 't-005', toTaskId: 't-014', kind: 'FS', lagDays: -30 },
  { fromTaskId: 't-013', toTaskId: 't-015', kind: 'FS', lagDays: -15 },
  { fromTaskId: 't-005', toTaskId: 't-016', kind: 'FS', lagDays: 30 },
  { fromTaskId: 't-004', toTaskId: 't-011', kind: 'SS', lagDays: 120 },
  { fromTaskId: 't-014', toTaskId: 't-017', kind: 'SS', lagDays: 120 },
  { fromTaskId: 't-017', toTaskId: 't-012', kind: 'SS', lagDays: 0 },
  { fromTaskId: 't-011', toTaskId: 't-018', kind: 'FS' },
  { fromTaskId: 't-017', toTaskId: 't-019', kind: 'FS' },
  { fromTaskId: 't-018', toTaskId: 't-019', kind: 'FS' },
]

/* ─────────────────────────── VLM-КАТАЛОГ (CV) ──────────────────────────── */

const CV_MODELS: CvModel[] = [
  {
    id:   'nemo-marlin-2b',
    name: 'NemoStation/Marlin-2B',
    org:  'NemoStation', modelName: 'Marlin-2B', family: 'Marlin',
    paramsBn: 2, contextFrames: 32,
    updated: '2026-05-30', hfDownloads: 18_300, hfLikes: 510,
    description: 'Лёгкая Video-Text-to-Text модель, оптимизирована под потоковую обработку коротких клипов. Хорошо ловит динамику и движение.',
    strengths: ['Скорость (≈ 4× быстрее 7B-моделей)', 'Низкие требования к VRAM', 'Высокое FPS-покрытие при длинных облётах'],
    useCases: ['Быстрое сканирование 5-15-минутных облётов', 'Real-time-подобный мониторинг', 'Первичная сортировка кадров перед глубоким анализом'],
    recommendedFor: 'progress',
    inferenceTimeS: 9, vramGb: 8, license: 'Apache-2.0',
  },
  {
    id:   'lmms-llava-video-7b-qwen2',
    name: 'lmms-lab/LLaVA-Video-7B-Qwen2',
    org:  'lmms-lab', modelName: 'LLaVA-Video-7B-Qwen2', family: 'LLaVA-Video',
    paramsBn: 7, contextFrames: 64,
    updated: '2025-10-25', hfDownloads: 20_200, hfLikes: 128,
    description: 'LLaVA-Video поверх Qwen2-7B-Instruct: сильное следование промптам и качественная сцена-аналитика на 60+ кадрах.',
    strengths: ['Глубокое понимание сцены', 'Чёткое следование инструкциям (Russian/English)', 'Хорошая работа с длинной хронологией'],
    useCases: ['Подробный отчёт по облёту', 'Сравнение текущего состояния с эталоном', 'Структурированный JSON-ответ'],
    recommendedFor: 'general',
    inferenceTimeS: 22, vramGb: 16, license: 'LLaVA / Qwen2 (research)',
  },
  {
    id:   'llava-hf-next-video-7b',
    name: 'llava-hf/LLaVA-NeXT-Video-7B-hf',
    org:  'llava-hf', modelName: 'LLaVA-NeXT-Video-7B-hf', family: 'LLaVA-NeXT-Video',
    paramsBn: 7, contextFrames: 32,
    updated: '2025-11-11', hfDownloads: 161_000, hfLikes: 124,
    description: 'NeXT-поколение LLaVA-Video на 7B с улучшенной OCR-точностью — полезно для считывания маркировок на технике и табло.',
    strengths: ['OCR на номерах техники и табло', 'Стабильность на разных условиях освещения', 'Самая популярная в HF-сообществе модель класса'],
    useCases: ['Идентификация техники и спецтехтрансп.', 'Чтение журналов работ из видеокадра', 'Гибридный анализ прогресс + безопасность'],
    recommendedFor: 'caption',
    inferenceTimeS: 24, vramGb: 16, license: 'LLaVA (research)',
  },
  {
    id:   'zai-cogvlm2-llama3-caption',
    name: 'zai-org/cogvlm2-llama3-caption',
    org:  'zai-org', modelName: 'cogvlm2-llama3-caption', family: 'CogVLM2',
    paramsBn: 13, contextFrames: 24,
    updated: '2025-05-14', hfDownloads: 296, hfLikes: 118,
    description: 'CogVLM2 поверх Llama-3, дообученная под детальное описание видео. Богатые подписи, хорошо подходят для отчётов.',
    strengths: ['Подробные подписи на русском', 'Описание мелких деталей сцены', 'Понимает фазы строительства'],
    useCases: ['Автогенерация подписей под облёт', 'Краткий отчёт «что сделано на сегодня»', 'Подготовка комментариев для совещаний'],
    recommendedFor: 'caption',
    inferenceTimeS: 32, vramGb: 24, license: 'Llama-3 CC-BY-NC',
  },
  {
    id:   'openmoss-vl-instruct-0408',
    name: 'OpenMOSS-Team/MOSS-VL-Instruct-0408',
    org:  'OpenMOSS-Team', modelName: 'MOSS-VL-Instruct-0408', family: 'MOSS-VL',
    paramsBn: 11, contextFrames: 48,
    updated: '2026-04-22', hfDownloads: 1_190, hfLikes: 96,
    description: 'Инструктивная VLM MOSS, заточенная под выполнение пользовательских заданий. Высокая управляемость через промпт.',
    strengths: ['Тонкое следование чек-листам ТБ', 'Стабильные структурированные ответы', 'Поддержка ru/en промптов'],
    useCases: ['Чек-лист по безопасности на объекте', 'QA по конкретному вопросу к видео', 'Поддержка регламентов'],
    recommendedFor: 'safety',
    inferenceTimeS: 26, vramGb: 22, license: 'Apache-2.0',
  },
  {
    id:   'opengvlab-internvideo2-5-chat-8b',
    name: 'OpenGVLab/InternVideo2_5_Chat_8B',
    org:  'OpenGVLab', modelName: 'InternVideo2_5_Chat_8B', family: 'InternVideo2',
    paramsBn: 8, contextFrames: 96,
    updated: '2026-08-04', hfDownloads: 7_050, hfLikes: 90,
    description: 'InternVideo2 поколение 2.5 — флагман по пониманию длинных видео и времени. Лучшая темпоральная связность.',
    strengths: ['96-кадровое окно (≈ 10 мин видео)', 'Точная хронология событий', 'Сравнение состояний между облётами'],
    useCases: ['Сравнение «вчера → сегодня» по облёту', 'Темпоральные KPI: скорость монтажа, ритм работ', 'Длинные траектории дрона'],
    recommendedFor: 'progress',
    inferenceTimeS: 34, vramGb: 20, license: 'Apache-2.0',
  },
  {
    id:   'kwai-keye-vl-8b-preview',
    name: 'Kwai-Keye/Keye-VL-8B-Preview',
    org:  'Kwai-Keye', modelName: 'Keye-VL-8B-Preview', family: 'Keye-VL',
    paramsBn: 8, contextFrames: 32,
    updated: '2026-02-10', hfDownloads: 211_000, hfLikes: 86,
    description: 'Высокопроизводительная VLM от Kwai с упором на мобильное/edge развёртывание. Хорошо квантуется (INT8).',
    strengths: ['Поддержка edge-инференса (квантизация)', 'Низкие требования к памяти', 'Точные bbox-предсказания'],
    useCases: ['Запуск на полевой станции рядом с дроном', 'Маркировка нарушений ТБ bounding-box-ом', 'Pre-screen перед облачным анализом'],
    recommendedFor: 'safety',
    inferenceTimeS: 14, vramGb: 12, license: 'Apache-2.0',
  },
  {
    id:   'vision-cair-longvu-qwen2-7b',
    name: 'Vision-CAIR/LongVU_Qwen2_7B',
    org:  'Vision-CAIR', modelName: 'LongVU_Qwen2_7B', family: 'LongVU',
    paramsBn: 7, contextFrames: 128,
    updated: '2026-02-28', hfDownloads: 231, hfLikes: 76,
    description: 'LongVU специально заточена под длинные видео (до 1 часа) с компрессией контекста. Полезно для облётов всего объекта.',
    strengths: ['Контекстное окно 128 кадров', 'Стабильность на длинных облётах', 'Хорошие сводки по большим траекториям'],
    useCases: ['Облёты длительностью 30+ мин', 'Свод по всему объекту за один проход', 'Поиск редких событий в длинной записи'],
    recommendedFor: 'general',
    inferenceTimeS: 42, vramGb: 18, license: 'Qwen2 (research)',
  },
]

/* ─────────────────────────── ОБЛЁТЫ ДРОНА ──────────────────────────────── */

const DRONE_FLIGHTS: DroneFlight[] = [
  {
    id: 'f-2026-053', flightNumber: 'F-2026-053',
    date: '2026-05-31T09:15:00', durationS: 12 * 60 + 40,
    droneModel: 'DJI Mavic 3 Enterprise', pilot: 'Бекенов А.Т., пилот категории А',
    zonesCovered: ['БС-1 · этажи 1-6', 'БС-2 · фундамент', 'Паркинг / подземный', 'Благоустройство'],
    altitudeM: 60, weather: 'Облачно, +18°C, ветер 3 м/с', fileSizeMb: 1_840, framesTotal: 18_960,
    status: 'analyzed', analysisCount: 2, sceneHint: 'bs1-mono',
  },
  {
    id: 'f-2026-052', flightNumber: 'F-2026-052',
    date: '2026-05-25T08:50:00', durationS: 9 * 60 + 22,
    droneModel: 'DJI Matrice 350 RTK + L2', pilot: 'Бекенов А.Т., пилот категории А',
    zonesCovered: ['БС-1 · этажи 1-6', 'БС-1 · этажи 7-12', 'Паркинг / подземный'],
    altitudeM: 80, weather: 'Ясно, +21°C, ветер 2 м/с', fileSizeMb: 2_240, framesTotal: 14_040,
    status: 'analyzed', analysisCount: 1, sceneHint: 'bs1-mono',
  },
  {
    id: 'f-2026-051', flightNumber: 'F-2026-051',
    date: '2026-05-18T14:10:00', durationS: 11 * 60 + 5,
    droneModel: 'Autel EVO Max 4T', pilot: 'Жунусов Р.Е., оператор',
    zonesCovered: ['БС-2 · фундамент', 'Паркинг / подземный'],
    altitudeM: 50, weather: 'Пыльно, +25°C, ветер 5 м/с', fileSizeMb: 1_560, framesTotal: 16_620,
    status: 'analyzed', analysisCount: 2, sceneHint: 'bs2-pit',
  },
  {
    id: 'f-2026-050', flightNumber: 'F-2026-050',
    date: '2026-05-05T07:30:00', durationS: 14 * 60 + 18,
    droneModel: 'DJI Mavic 3 Enterprise', pilot: 'Бекенов А.Т., пилот категории А',
    zonesCovered: ['Вся площадка', 'Подъездные пути'],
    altitudeM: 110, weather: 'Туман, +12°C, ветер 1 м/с', fileSizeMb: 2_980, framesTotal: 21_440,
    status: 'analyzed', analysisCount: 1, sceneHint: 'site',
  },
  {
    id: 'f-2026-049', flightNumber: 'F-2026-049',
    date: '2026-04-20T11:00:00', durationS: 8 * 60 + 12,
    droneModel: 'DJI Mavic 3 Enterprise', pilot: 'Жунусов Р.Е., оператор',
    zonesCovered: ['БС-1 · фундамент', 'БС-2 · фундамент'],
    altitudeM: 45, weather: 'Ясно, +19°C, ветер 4 м/с', fileSizeMb: 1_190, framesTotal: 12_310,
    status: 'archived', analysisCount: 1, sceneHint: 'bs1-piles',
  },
]

/* ─────────────────────────── АНАЛИЗЫ CV ────────────────────────────────── */

const ANALYSIS_RUNS: CvAnalysisRun[] = [
  /* F-053 + InternVideo2 — основной прогресс-анализ от 31.05 */
  {
    id: 'cv-008', flightId: 'f-2026-053', modelId: 'opengvlab-internvideo2-5-chat-8b',
    promptTemplate: 'progress',
    promptText: 'Проанализируй облёт. Для каждой захватки укажи % готовности по СМР, заметные изменения за неделю, отличия от планового состояния.',
    startedAt: '2026-05-31T10:02:11', finishedAt: '2026-05-31T10:08:47',
    status: 'done', inferenceTimeS: 396,
    output: {
      summary: 'БС-1: монолит 1-6 этажей идёт по графику, видны опалубочные работы на 4-м этаже, кран КР-1 активно работает. БС-2: ростверк по-прежнему не залит, видно ожидание бригады монолитчиков; свайное поле БС-2 закрыто на 64% — без изменений с прошлого облёта. Паркинг: перекрытие на 58%, бетонирование в ритме. Благоустройство временное (бытовка, забор) — без отклонений.',
      progressByZone: [
        { zone: 'БС-1 · фундамент',     cvPct: 100, planPct: 100, deltaPct:   0, comment: 'Готов, видна гидроизоляция и обратная засыпка.' },
        { zone: 'БС-1 · этажи 1-6',     cvPct:  74, planPct:  72, deltaPct:  +2, comment: 'Опалубка 4-го этажа, заметна арматурная сетка.' },
        { zone: 'БС-1 · этажи 7-12',    cvPct:   0, planPct:   0, deltaPct:   0, comment: 'Не начат, без отклонений.' },
        { zone: 'БС-2 · фундамент',     cvPct:  62, planPct:  72, deltaPct: -10, comment: 'Без активности на ростверке: критическое отставание.' },
        { zone: 'БС-2 · этажи 1-6',     cvPct:   0, planPct:   0, deltaPct:   0, comment: 'Не начат, ожидает закрытия ростверка.' },
        { zone: 'Паркинг / подземный',  cvPct:  60, planPct:  58, deltaPct:  +2, comment: 'Бетонирование плиты в ритме.' },
        { zone: 'Благоустройство',      cvPct:   2, planPct:   0, deltaPct:  +2, comment: 'Временные сооружения площадки.' },
      ],
      detectedElements: 124,
      safetyIssues: [
        {
          id: 'cv-iss-001', kind: 'no_helmet', severity: 'medium',
          detectedAt: '04:18', zoneContext: 'БС-1 · этажи 1-6 (плита 4-го этажа)',
          description: 'Рабочий без каски на восточном краю плиты, рядом с краном.',
        },
        {
          id: 'cv-iss-002', kind: 'unsecured_zone', severity: 'high',
          detectedAt: '07:42', zoneContext: 'БС-2 · фундамент (котлован)',
          description: 'Отсутствует сигнальная лента по периметру северо-восточного откоса котлована.',
        },
        {
          id: 'cv-iss-003', kind: 'unsafe_scaffold', severity: 'low',
          detectedAt: '09:55', zoneContext: 'БС-1 · этажи 1-6 (южный фасад)',
          description: 'Один пролёт строительных лесов без диагональной связи.',
        },
      ],
      recommendations: [
        'Срочно мобилизовать бригаду монолитчиков №2 на ростверк БС-2 — иначе каскад на t-009.',
        'Провести внеплановый инструктаж по СИЗ на восточном краю плиты БС-1.',
        'Установить сигнальную ленту вдоль северо-восточного откоса котлована БС-2.',
      ],
      confidence: 84,
    },
  },
  /* F-053 + Keye-VL — параллельный safety-анализ */
  {
    id: 'cv-009', flightId: 'f-2026-053', modelId: 'kwai-keye-vl-8b-preview',
    promptTemplate: 'safety',
    promptText: 'Найди нарушения ТБ: отсутствие СИЗ (каска, жилет), небезопасные подъёмные операции, открытые проёмы, отсутствие ограждений.',
    startedAt: '2026-05-31T10:09:00', finishedAt: '2026-05-31T10:12:38',
    status: 'done', inferenceTimeS: 218,
    output: {
      summary: 'Найдено 4 нарушения ТБ среднего и высокого уровня. Основной фокус — отсутствие СИЗ на работающих, незакрытые проёмы и отсутствие ограждения у котлована БС-2.',
      progressByZone: [],
      detectedElements: 0,
      safetyIssues: [
        { id: 'cv-iss-010', kind: 'no_helmet',      severity: 'medium', detectedAt: '04:18', zoneContext: 'БС-1 · этажи 1-6 (плита 4-го этажа)',  description: 'Рабочий без каски на восточном краю.' },
        { id: 'cv-iss-011', kind: 'no_vest',        severity: 'low',    detectedAt: '05:02', zoneContext: 'БС-1 · этажи 1-6 (южная сторона)',     description: 'Рабочий без сигнального жилета.' },
        { id: 'cv-iss-012', kind: 'unsecured_zone', severity: 'high',   detectedAt: '07:42', zoneContext: 'БС-2 · фундамент (котлован)',          description: 'Отсутствует сигнальная лента по периметру.' },
        { id: 'cv-iss-013', kind: 'unsafe_lifting', severity: 'medium', detectedAt: '08:36', zoneContext: 'БС-1 · кран КР-1',                      description: 'Груз без направляющей оттяжки при манипуляции.' },
      ],
      recommendations: [
        'Внеплановый ТБ-инструктаж бригады монолитчиков №1.',
        'Установить периметральные ограждения котлована БС-2.',
        'Закрепить оттяжки для груза при работе крана КР-1.',
      ],
      confidence: 88,
    },
  },
  /* F-052 + LLaVA-Video — детальный отчёт по облёту 25.05 */
  {
    id: 'cv-007', flightId: 'f-2026-052', modelId: 'lmms-llava-video-7b-qwen2',
    promptTemplate: 'progress',
    promptText: 'Опиши состояние БС-1 и паркинга. Сравни с прошлым облётом 18.05. Дай численную оценку прогресса по каждой захватке.',
    startedAt: '2026-05-25T10:14:00', finishedAt: '2026-05-25T10:18:22',
    status: 'done', inferenceTimeS: 262,
    output: {
      summary: 'За неделю на БС-1 выполнен полный объём армирования 3-го этажа и начато бетонирование. Паркинг прирастает равномерно — +6 п.п. с прошлой недели.',
      progressByZone: [
        { zone: 'БС-1 · этажи 1-6',     cvPct: 65, planPct: 64, deltaPct: +1, comment: '3-й этаж — арматура готова, начато бетонирование плиты.' },
        { zone: 'БС-1 · этажи 7-12',    cvPct:  0, planPct:  0, deltaPct:  0, comment: 'Не начат.' },
        { zone: 'Паркинг / подземный',  cvPct: 52, planPct: 50, deltaPct: +2, comment: 'Бетонирование плиты в восточной части.' },
      ],
      detectedElements: 78,
      safetyIssues: [
        { id: 'cv-iss-020', kind: 'no_helmet', severity: 'low', detectedAt: '03:42', zoneContext: 'БС-1 · 3-й этаж', description: 'Эпизодически — один рабочий без каски при чистке опалубки.' },
      ],
      recommendations: ['Сохранить текущий темп монолитных работ — БС-1 опережает план на 1 п.п.'],
      confidence: 81,
    },
  },
  /* F-051 + InternVideo2 — глубокий анализ БС-2 */
  {
    id: 'cv-006', flightId: 'f-2026-051', modelId: 'opengvlab-internvideo2-5-chat-8b',
    promptTemplate: 'progress',
    promptText: 'Сконцентрируйся на котловане БС-2 и паркинге. Что мешает закрытию нулевого цикла БС-2?',
    startedAt: '2026-05-18T15:30:00', finishedAt: '2026-05-18T15:36:48',
    status: 'done', inferenceTimeS: 408,
    output: {
      summary: 'Свайное поле БС-2 на ~60% — буровая установка простаивает (видно в кадре). Ростверк не начат: армокаркасы не подвезены. Паркинг идёт штатно.',
      progressByZone: [
        { zone: 'БС-2 · фундамент',     cvPct: 58, planPct: 70, deltaPct: -12, comment: 'Буровая установка не работает, два часа простоя в кадре.' },
        { zone: 'Паркинг / подземный',  cvPct: 46, planPct: 45, deltaPct:  +1, comment: 'Бетонирование штатно.' },
      ],
      detectedElements: 54,
      safetyIssues: [
        { id: 'cv-iss-030', kind: 'unsecured_zone', severity: 'high', detectedAt: '02:15', zoneContext: 'БС-2 · котлован', description: 'Отсутствует ограждение по периметру котлована — повторяется второй облёт подряд.' },
      ],
      recommendations: [
        'Проверить наряд-заказ на буровые работы и поставку армокаркасов.',
        'Установить периметральное ограждение котлована БС-2 в течение 24 ч.',
      ],
      confidence: 79,
    },
  },
  /* F-051 + MOSS-VL — safety-аудит */
  {
    id: 'cv-005', flightId: 'f-2026-051', modelId: 'openmoss-vl-instruct-0408',
    promptTemplate: 'safety',
    promptText: 'Чек-лист по ТБ: каски, жилеты, страховочные привязи, ограждения котлована, состояние лесов, маркировка опасных зон.',
    startedAt: '2026-05-18T15:38:10', finishedAt: '2026-05-18T15:42:25',
    status: 'done', inferenceTimeS: 255,
    output: {
      summary: 'Главное замечание — отсутствие ограждения по периметру котлована БС-2. Остальные пункты чек-листа в норме.',
      progressByZone: [],
      detectedElements: 0,
      safetyIssues: [
        { id: 'cv-iss-040', kind: 'unsecured_zone',  severity: 'high',   detectedAt: '02:15', zoneContext: 'БС-2 · котлован',           description: 'Отсутствие ограждения по периметру.' },
        { id: 'cv-iss-041', kind: 'unsafe_scaffold', severity: 'medium', detectedAt: '06:50', zoneContext: 'Паркинг · северная сторона', description: 'Леса без поручня на верхнем настиле.' },
      ],
      recommendations: [
        'Закрыть открытый котлован сигнальной лентой и стационарными отбойниками.',
        'Установить верхний поручень на леса в паркинге.',
      ],
      confidence: 90,
    },
  },
  /* F-050 + LongVU — общий обзор */
  {
    id: 'cv-004', flightId: 'f-2026-050', modelId: 'vision-cair-longvu-qwen2-7b',
    promptTemplate: 'caption',
    promptText: 'Сделай подробный отчёт по облёту всей площадки с подписями ко всем основным сценам.',
    startedAt: '2026-05-05T08:10:00', finishedAt: '2026-05-05T08:21:34',
    status: 'done', inferenceTimeS: 694,
    output: {
      summary: 'Длинный облёт 14:18. Подробный отчёт по 11 сценам: подъездные пути, бытовой городок, контрольно-пропускной пункт, котлованы, склады материалов. Обнаружено 6 эпизодов накопления грязи на выезде, что может привести к замечаниям ГТИ.',
      progressByZone: [
        { zone: 'Вся площадка', cvPct: 35, planPct: 38, deltaPct: -3, comment: 'Общий прогресс в пределах плановой полосы.' },
        { zone: 'Подъездные пути', cvPct: 80, planPct: 85, deltaPct: -5, comment: 'Загрязнение покрытия после ливневых дождей.' },
      ],
      detectedElements: 156,
      safetyIssues: [],
      recommendations: [
        'Организовать мойку колёс при выезде с площадки.',
        'Проверить состояние временных дорог после осадков.',
      ],
      confidence: 76,
    },
  },
  /* F-049 + Marlin — быстрый снэпшот фундаментов */
  {
    id: 'cv-003', flightId: 'f-2026-049', modelId: 'nemo-marlin-2b',
    promptTemplate: 'progress',
    promptText: 'Quick scan: foundation zones, percentage complete.',
    startedAt: '2026-04-20T12:00:00', finishedAt: '2026-04-20T12:01:50',
    status: 'done', inferenceTimeS: 110,
    output: {
      summary: 'Свайное поле БС-1: завершено на ~96%. Свайное поле БС-2: ~22%. Земляные работы обоих корпусов закончены.',
      progressByZone: [
        { zone: 'БС-1 · фундамент', cvPct: 96, planPct: 92, deltaPct: +4, comment: 'Бурение завершено в восточной части.' },
        { zone: 'БС-2 · фундамент', cvPct: 22, planPct: 28, deltaPct: -6, comment: 'Буровая только мобилизована.' },
      ],
      detectedElements: 32,
      safetyIssues: [],
      recommendations: ['Перебросить вторую буровую с БС-1 на БС-2 для ускорения свайного поля БС-2.'],
      confidence: 71,
    },
  },
]

/* ─────────────────────────── BIM-ЭЛЕМЕНТЫ ──────────────────────────────── */

const BIM_ELEMENTS: BimElement[] = [
  // Фундамент БС-1
  { id: 'el-001', guid: '1A2B-001', type: 'IfcSlab',   name: 'Ростверк БС-1',          zone: 'БС-1 · фундамент', level: '−1',
    bbox: { x: -8, y: 0,  z: -4, w: 7,  h: 0.6, d: 8 }, color: '#64748b', taskId: 't-003', cost: 360_000_000 },
  { id: 'el-002', guid: '1A2B-002', type: 'IfcFooting',name: 'Сваи БС-1 (куст)',       zone: 'БС-1 · фундамент', level: '−2',
    bbox: { x: -8, y: -1.5, z: -4, w: 7, h: 1.4, d: 8 }, color: '#475569', taskId: 't-002', cost: 920_000_000 },
  // Этажи БС-1
  { id: 'el-003', guid: '1A2B-003', type: 'IfcSlab',   name: 'Перекрытия 1-6 БС-1',    zone: 'БС-1 · этажи 1-6', level: '1-6',
    bbox: { x: -8, y: 1, z: -4, w: 7, h: 6, d: 8 }, color: '#0d9488', taskId: 't-004', cost: 1_800_000_000 },
  { id: 'el-004', guid: '1A2B-004', type: 'IfcWall',   name: 'Стены ядра БС-1',        zone: 'БС-1 · этажи 1-6', level: '1-6',
    bbox: { x: -5.5, y: 1, z: -1.5, w: 2, h: 6, d: 3 }, color: '#0d9488', taskId: 't-004', cost: 300_000_000 },
  { id: 'el-005', guid: '1A2B-005', type: 'IfcSlab',   name: 'Перекрытия 7-12 БС-1',   zone: 'БС-1 · этажи 7-12', level: '7-12',
    bbox: { x: -8, y: 7, z: -4, w: 7, h: 6, d: 8 }, color: '#cbd5e1', taskId: 't-005', cost: 2_100_000_000 },
  // Фундамент БС-2
  { id: 'el-006', guid: '3C4D-001', type: 'IfcSlab',   name: 'Ростверк БС-2',          zone: 'БС-2 · фундамент', level: '−1',
    bbox: { x: 1, y: 0, z: -4, w: 7, h: 0.6, d: 8 }, color: '#cbd5e1', taskId: 't-008', cost: 360_000_000 },
  { id: 'el-007', guid: '3C4D-002', type: 'IfcFooting',name: 'Сваи БС-2 (куст)',       zone: 'БС-2 · фундамент', level: '−2',
    bbox: { x: 1, y: -1.5, z: -4, w: 7, h: 1.4, d: 8 }, color: '#f59e0b', taskId: 't-007', cost: 920_000_000 },
  // Этажи БС-2
  { id: 'el-008', guid: '3C4D-003', type: 'IfcSlab',   name: 'Перекрытия 1-6 БС-2',    zone: 'БС-2 · этажи 1-6', level: '1-6',
    bbox: { x: 1, y: 1, z: -4, w: 7, h: 6, d: 8 }, color: '#cbd5e1', taskId: 't-009', cost: 1_800_000_000 },
  { id: 'el-009', guid: '3C4D-004', type: 'IfcSlab',   name: 'Перекрытия 7-12 БС-2',   zone: 'БС-2 · этажи 7-12', level: '7-12',
    bbox: { x: 1, y: 7, z: -4, w: 7, h: 6, d: 8 }, color: '#cbd5e1', taskId: 't-009', cost: 2_100_000_000 },
  // Паркинг
  { id: 'el-010', guid: '5E6F-001', type: 'IfcSlab',   name: 'Плита паркинга',         zone: 'Паркинг / подземный', level: '−3',
    bbox: { x: -8, y: -3.2, z: -4, w: 16, h: 0.4, d: 8 }, color: '#0d9488', taskId: 't-010', cost: 1_400_000_000 },
]

/* ─────────────────────────── СМЕТА / COST ITEMS ────────────────────────── */

const COST_ITEMS: CostItem[] = [
  { id: 'c-001', externalCode: 'СП-01.01', name: 'Бетон В30 (монолит)',          unit: 'м³', quantity: 14_200, unitPrice: 65_000,  plannedValue: 923_000_000, actualCost: 942_000_000 },
  { id: 'c-002', externalCode: 'СП-01.02', name: 'Арматура А500С',                unit: 'т',  quantity: 1_820,  unitPrice: 420_000, plannedValue: 764_400_000, actualCost: 781_000_000 },
  { id: 'c-003', externalCode: 'СП-02.01', name: 'Сваи буронабивные Ø600',        unit: 'п.м',quantity: 18_400, unitPrice: 48_000,  plannedValue: 883_200_000, actualCost: 901_000_000 },
  { id: 'c-004', externalCode: 'СП-03.01', name: 'Опалубка крупнощитовая',        unit: 'м²', quantity: 28_500, unitPrice: 14_000,  plannedValue: 399_000_000, actualCost: 410_000_000 },
  { id: 'c-005', externalCode: 'СП-04.01', name: 'Стеновая панель навесная',      unit: 'м²', quantity: 12_400, unitPrice: 38_000,  plannedValue: 471_200_000, actualCost: 0           },
  { id: 'c-006', externalCode: 'СП-05.01', name: 'Окна ПВХ 2-камерные',           unit: 'м²', quantity: 5_600,  unitPrice: 52_000,  plannedValue: 291_200_000, actualCost: 0           },
  { id: 'c-007', externalCode: 'СП-06.01', name: 'Инж. сети · отопление',         unit: 'компл.', quantity: 24, unitPrice: 18_500_000, plannedValue: 444_000_000, actualCost: 0       },
  { id: 'c-008', externalCode: 'СП-07.01', name: 'Лифтовое оборудование',          unit: 'шт.', quantity: 8,   unitPrice: 42_000_000, plannedValue: 336_000_000, actualCost: 0       },
  { id: 'c-009', externalCode: 'СП-08.01', name: 'Благоустройство · МАФ',          unit: 'компл.', quantity: 1, unitPrice: 520_000_000, plannedValue: 520_000_000, actualCost: 0     },
]

/* ─────────────────────────── ОТКЛОНЕНИЯ И ПРОГНОЗЫ ─────────────────────── */

const DEVIATIONS: Deviation[] = [
  { id: 'd-001', kind: 'schedule', severity: 'high',     detectedAt: '2026-05-25', resolvedAt: null,
    scope: 'БС-2 · фундамент / Свайное поле', description: 'Простой буровой установки 6 дн. из-за отказа гидросистемы и ожидания запчасти.', delta: 7 },
  { id: 'd-002', kind: 'cost',     severity: 'medium',   detectedAt: '2026-05-12', resolvedAt: null,
    scope: 'Бетон В30',                       description: 'Рост закупочной цены поставщика на 4.2%, превышение AC над PV на 19 млн ₸.',  delta: 19_000_000 },
  { id: 'd-003', kind: 'quality',  severity: 'low',      detectedAt: '2026-05-19', resolvedAt: '2026-05-22',
    scope: 'БС-1 · ростверк',                 description: 'Замечание ССК по защитному слою — устранено заменой фиксаторов.',             delta: null },
  { id: 'd-004', kind: 'safety',   severity: 'medium',   detectedAt: '2026-05-30', resolvedAt: '2026-05-30',
    scope: 'Паркинг · котлован',              description: 'Микротравма стропальщика, без потери трудоспособности. Проведён внеплановый инструктаж.', delta: null },
  { id: 'd-005', kind: 'schedule', severity: 'critical', detectedAt: '2026-05-28', resolvedAt: null,
    scope: 'БС-2 · ростверк',                 description: 'Не начата критическая задача t-008 — каскадирует на t-009 (этажи 1-6 БС-2).', delta: 12 },
]

const FORECASTS: Forecast[] = [
  { id: 'f-001', metric: 'finish_date',         value: '2028-02-18',     confidence: 72, model: 'stub' },
  { id: 'f-002', metric: 'cost_at_completion',  value: 50_640_000_000,    confidence: 68, model: 'stub' },
  { id: 'f-003', metric: 'spi',                  value: 0.95,              confidence: 80, model: 'stub' },
  { id: 'f-004', metric: 'cpi',                  value: 0.97,              confidence: 80, model: 'stub' },
]

/* ─────────────────────────── ВЫЧИСЛЯЕМЫЕ ВЕЛИЧИНЫ ──────────────────────── */

const sum = (vals: number[]) => vals.reduce((a, b) => a + b, 0)

/** Агрегированные PV/EV/AC по проекту на dataDate. */
function aggregateEv(): { pv: number; ev: number; ac: number; bac: number } {
  const pv  = sum(TASKS.map((t) => t.plannedValue))
  const ev  = sum(TASKS.map((t) => t.earnedValue))
  const ac  = sum(TASKS.map((t) => t.actualCost))
  const bac = PROJECT.budgetTotal
  return { pv, ev, ac, bac }
}

/** S-кривая помесячно от plannedStart до plannedFinish. */
function buildCurve(): ProgressCurvePoint[] {
  const start  = new Date(PROJECT.plannedStart)
  const finish = new Date(PROJECT.plannedFinish)
  const data   = new Date(PROJECT.dataDate)
  const months: { date: string; raw: Date }[] = []
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  while (cursor <= finish) {
    months.push({ date: cursor.toISOString().slice(0, 10), raw: new Date(cursor) })
    cursor.setMonth(cursor.getMonth() + 1)
  }

  const totalPv = sum(TASKS.map((t) => t.plannedValue))
  const totalEv = sum(TASKS.map((t) => t.earnedValue))
  const totalAc = sum(TASKS.map((t) => t.actualCost))

  // Реалистичная S-кривая для PV (cumulative) — на основе долей задач,
  // приходящихся на каждый месяц по их плановым датам.
  const taskShareInMonth = (task: ScheduleTask, monthStart: Date): number => {
    const ts = new Date(task.plannedStart).getTime()
    const tf = new Date(task.plannedFinish).getTime()
    if (tf <= ts) return 0
    const ms = monthStart.getTime()
    const me = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1).getTime()
    const overlap = Math.max(0, Math.min(tf, me) - Math.max(ts, ms))
    return overlap / (tf - ts)
  }

  let cumPv = 0
  let cumEv = 0
  let cumAc = 0
  return months.map(({ date, raw }) => {
    const pvDelta = sum(TASKS.map((t) => t.plannedValue * taskShareInMonth(t, raw)))
    cumPv += pvDelta

    // EV/AC накапливаем только до dataDate, после — оставляем последнее значение
    if (raw <= data) {
      // ev/ac за месяц распределяем пропорционально pvDelta-долям, но в пределах фактического totalEv/totalAc
      const monthEvBase = sum(TASKS.map((t) => t.earnedValue * taskShareInMonth(t, raw)))
      const monthAcBase = sum(TASKS.map((t) => t.actualCost  * taskShareInMonth(t, raw)))
      cumEv = Math.min(totalEv, cumEv + monthEvBase)
      cumAc = Math.min(totalAc, cumAc + monthAcBase)
    }
    const beforeData = raw <= data
    return {
      date,
      plannedValue: Math.round(cumPv),
      earnedValue:  beforeData ? Math.round(cumEv) : Math.round(cumEv), // фиксируется на dataDate
      actualCost:   beforeData ? Math.round(cumAc) : Math.round(cumAc),
    }
  })
}

function buildZonePlanFact(): ZonePlanFact[] {
  return ZONES.map((zone) => {
    const ts = TASKS.filter((t) => t.zone === zone)
    if (ts.length === 0) {
      return { zone, plannedPct: 0, factPct: 0, lagDays: 0 }
    }
    const totalPv = sum(ts.map((t) => t.plannedValue))
    const totalEv = sum(ts.map((t) => t.earnedValue))
    // План на dataDate: интегрируем долю PV для каждой задачи
    const data = new Date(PROJECT.dataDate)
    const planned = sum(ts.map((t) => {
      const ts0 = new Date(t.plannedStart).getTime()
      const tf  = new Date(t.plannedFinish).getTime()
      if (data.getTime() <= ts0) return 0
      if (data.getTime() >= tf)  return t.plannedValue
      return t.plannedValue * ((data.getTime() - ts0) / (tf - ts0))
    }))
    const plannedPct = totalPv > 0 ? (planned / totalPv) * 100 : 0
    const factPct    = totalPv > 0 ? (totalEv / totalPv) * 100 : 0
    // Оцениваем отставание в днях ~ через SV/среднюю дневную освоенность плана
    const lagDays = plannedPct > factPct
      ? Math.round(((plannedPct - factPct) / 100) * 60) // эмпирически до 60 дн.
      : 0
    return {
      zone,
      plannedPct: +plannedPct.toFixed(1),
      factPct:    +factPct.toFixed(1),
      lagDays,
    }
  })
}

function buildTwin(): TwinSummary {
  const { pv, ev, ac, bac } = aggregateEv()
  const spi = pv > 0 ? +(ev / pv).toFixed(2) : 1
  const cpi = ac > 0 ? +(ev / ac).toFixed(2) : 1

  const earnedValuePct = bac > 0 ? +((ev / bac) * 100).toFixed(1) : 0
  // Физический прогресс — взвешенный по PV факт прогресса задач
  const totalPv = sum(TASKS.map((t) => t.plannedValue))
  const physicalProgress = totalPv > 0
    ? +(
        sum(TASKS.map((t) => (t.progressPct / 100) * t.plannedValue)) / totalPv * 100
      ).toFixed(1)
    : 0
  const scheduleVariance = Math.max(...DEVIATIONS
    .filter((d) => d.kind === 'schedule')
    .map((d) => d.delta ?? 0))
  const laggingZones = buildZonePlanFact().filter((z) => z.lagDays > 0).length
  // ср. суточный СМР: EV / прошедшие сутки от actualStart
  const dataDate = new Date(PROJECT.dataDate)
  const actualStart = new Date(PROJECT.actualStart ?? PROJECT.plannedStart)
  const days = Math.max(1, Math.round((dataDate.getTime() - actualStart.getTime()) / 86_400_000))
  const dailySmrValue = +((ev / days) / 1_000_000).toFixed(1) // млн ₸/сут

  return {
    project: PROJECT,
    kpi: {
      physicalProgress,
      earnedValuePct,
      spi,
      cpi,
      scheduleVariance,
      laggingZones,
      dailySmrValue,
      materialsCoverage: 87.5,
      qualityDeviations: DEVIATIONS.filter((d) => d.kind === 'quality').length,
      safetyLtifr: 0.34,
    },
    recentDeviations: DEVIATIONS.slice().sort((a, b) =>
      b.detectedAt.localeCompare(a.detectedAt)
    ).slice(0, 5),
    forecasts: FORECASTS,
  }
}

/* ─────────────────────────── ПУБЛИЧНЫЙ API ─────────────────────────────── */

const MOCK_LATENCY_MS = 120

const delay = <T>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), MOCK_LATENCY_MS))

/**
 * Свап mock→API: при VITE_USE_MOCK_DATA !== 'true' пробуем реальный backend,
 * при любой ошибке — graceful-fallback на mock (constructionMockData остаётся
 * seed/fallback для локальной разработки, см. промпт B, задача 1).
 */
async function realOrMock<T>(real: () => Promise<T>, mock: () => T | Promise<T>): Promise<T> {
  if (USE_MOCK) return mock()
  try {
    return await real()
  } catch (err) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn('[constructionApi] fallback to mock:', err)
    }
    return mock()
  }
}

/** Компоновка TwinSummary из реальных данных backend (project+tasks+deviations+zone). */
async function composeTwinFromApi(projectId: string): Promise<TwinSummary> {
  const [project, tasks, zpf, devs] = await Promise.all([
    apiFetchProject(projectId),
    apiFetchTasks(projectId),
    apiFetchZonePlanFact(projectId),
    apiFetchDeviations(projectId),
  ])

  const pv = sum(tasks.map((t) => t.plannedValue))
  const ev = sum(tasks.map((t) => t.earnedValue))
  const ac = sum(tasks.map((t) => t.actualCost))
  const bac = project.budgetTotal || pv
  const spi = pv > 0 ? +(ev / pv).toFixed(2) : 1
  const cpi = ac > 0 ? +(ev / ac).toFixed(2) : 1
  const earnedValuePct = bac > 0 ? +((ev / bac) * 100).toFixed(1) : 0
  const physicalProgress = pv > 0
    ? +(sum(tasks.map((t) => (t.progressPct / 100) * t.plannedValue)) / pv * 100).toFixed(1)
    : 0
  const lags = zpf.map((z) => z.lagDays)
  const scheduleVariance = lags.length ? Math.max(...lags, 0) : 0
  const laggingZones = zpf.filter((z) => z.lagDays > 0).length
  const dataDate = new Date(project.dataDate || Date.now())
  const actualStart = new Date(project.actualStart || project.plannedStart || Date.now())
  const days = Math.max(1, Math.round((dataDate.getTime() - actualStart.getTime()) / 86_400_000))
  const dailySmrValue = +((ev / days) / 1_000_000).toFixed(1)

  return {
    project,
    kpi: {
      physicalProgress,
      earnedValuePct,
      spi,
      cpi,
      scheduleVariance,
      laggingZones,
      dailySmrValue,
      // Нет источника в Фазе 1 backend — см. TODO (интеграция с ERP/учётом ТБ).
      materialsCoverage: 87.5,
      qualityDeviations: devs.filter((d) => d.kind === 'quality' && !d.resolvedAt).length,
      safetyLtifr: 0.34,
    },
    recentDeviations: devs
      .slice()
      .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt))
      .slice(0, 5),
    // Прогнозы не заведены в Фазе 1 backend — используем mock-заглушку (fetchForecasts).
    forecasts: FORECASTS,
  }
}

export function getCurrentProjectId(): string {
  return PROJECT.id
}

export async function fetchProject(projectId: string): Promise<ConstructionProject> {
  return realOrMock(() => apiFetchProject(projectId), () => delay(PROJECT))
}

export async function fetchElements(_projectId: string): Promise<BimElement[]> {
  return delay(BIM_ELEMENTS)
}

export async function fetchTasks(projectId: string): Promise<ScheduleTask[]> {
  return realOrMock(() => apiFetchTasks(projectId), () => delay(TASKS))
}

export async function fetchCostItems(_projectId: string): Promise<CostItem[]> {
  return delay(COST_ITEMS)
}

export async function fetchProgressCurve(projectId: string): Promise<ProgressCurvePoint[]> {
  return realOrMock(async () => {
    const points = await apiFetchProgressCurve(projectId)
    return points.length ? points : buildCurve()
  }, () => delay(buildCurve()))
}

export async function fetchZonePlanFact(projectId: string): Promise<ZonePlanFact[]> {
  return realOrMock(async () => {
    const rows = await apiFetchZonePlanFact(projectId)
    return rows.length ? rows : buildZonePlanFact()
  }, () => delay(buildZonePlanFact()))
}

export async function fetchDeviations(projectId: string): Promise<Deviation[]> {
  return realOrMock(() => apiFetchDeviations(projectId), () => delay(DEVIATIONS))
}

export async function fetchForecasts(_projectId: string): Promise<Forecast[]> {
  return delay(FORECASTS)
}

export async function fetchTwinSummary(projectId: string): Promise<TwinSummary> {
  return realOrMock(() => composeTwinFromApi(projectId), () => delay(buildTwin()))
}

export async function fetchPhases(_projectId: string): Promise<Phase[]> {
  return delay(PHASES)
}

export async function fetchResources(_projectId: string): Promise<Resource[]> {
  return delay(RESOURCES)
}

export async function fetchMilestones(_projectId: string): Promise<Milestone[]> {
  return delay(MILESTONES)
}

export async function fetchAssignments(_projectId: string): Promise<TaskAssignment[]> {
  return delay(ASSIGNMENTS)
}

export async function fetchDependencies(_projectId: string): Promise<TaskDependency[]> {
  return delay(DEPENDENCIES)
}

export async function fetchCvModels(): Promise<CvModel[]> {
  return delay(CV_MODELS)
}

export async function fetchDroneFlights(_projectId: string): Promise<DroneFlight[]> {
  return delay(DRONE_FLIGHTS)
}

export async function fetchCvAnalysisRuns(_projectId: string): Promise<CvAnalysisRun[]> {
  return delay(ANALYSIS_RUNS)
}

/**
 * Симуляция запуска инференса VLM на облёте.  Возвращает существующий run
 * для пары (flight × model), если он уже был выполнен; иначе формирует
 * stub-ответ на основе плановых KPI облёта.
 *
 * При появлении бэкенда метод заменится на POST /api/cv/analyze.
 */
export async function runCvAnalysisStub(
  flightId: string,
  modelId: string,
  promptTemplate: CvPromptTemplate,
  promptText: string,
): Promise<CvAnalysisRun> {
  const existing = ANALYSIS_RUNS.find((r) =>
    r.flightId === flightId && r.modelId === modelId && r.promptTemplate === promptTemplate)
  if (existing) return delay(existing)

  const model  = CV_MODELS.find((m) => m.id === modelId)
  const flight = DRONE_FLIGHTS.find((f) => f.id === flightId)
  const inferTime = model?.inferenceTimeS ?? 20
  return delay({
    id: `cv-stub-${Date.now()}`,
    flightId, modelId, promptTemplate, promptText,
    startedAt:  new Date().toISOString(),
    finishedAt: new Date(Date.now() + inferTime * 1000).toISOString(),
    status: 'done',
    inferenceTimeS: inferTime,
    output: {
      summary: `${model?.modelName ?? 'VLM'} обработала ${flight?.framesTotal ?? 0} кадров облёта ${flight?.flightNumber ?? flightId}. Найдены характерные сцены строительства.`,
      progressByZone: (flight?.zonesCovered ?? []).map((zone) => ({
        zone, cvPct: 0, planPct: 0, deltaPct: 0,
        comment: 'Модель не обучена под кадры этой захватки — рекомендуется альтернативная модель.',
      })),
      detectedElements: 0,
      safetyIssues: [],
      recommendations: ['Подберите другую модель из каталога или адаптируйте промпт.'],
      confidence: 35,
    },
  })
}

/* ─────────────────────────── ХЕЛПЕРЫ-ФОРМАТТЕРЫ ────────────────────────── */

export const formatTg = (value: number, opts?: { compact?: boolean }): string => {
  if (opts?.compact) {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)} млрд ₸`
    if (value >= 1_000_000)     return `${(value / 1_000_000).toFixed(1)} млн ₸`
    if (value >= 1_000)         return `${(value / 1_000).toFixed(0)} тыс. ₸`
  }
  return `${value.toLocaleString('ru-RU')} ₸`
}

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: '2-digit' })

export const ZONE_LIST = ZONES

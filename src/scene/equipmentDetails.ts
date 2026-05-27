/**
 * Equipment details — расширенная карточка для каждого объекта 3D-сцены.
 * Русские названия, технические характеристики, история ремонтов,
 * предстоящие работы, производственные показатели.
 */

export interface RepairRecord {
  date:        string         // ISO
  type:        'plan' | 'unplan' | 'overhaul' | 'inspection'
  description: string
  cost:        number         // млн ₸
  duration:    number         // часов простоя
  team:        string
}

export interface UpcomingWork {
  date:        string         // ISO
  type:        'preventive' | 'corrective' | 'overhaul' | 'inspection'
  description: string
  budget:      number
  priority:    'critical' | 'high' | 'medium' | 'low'
}

export interface ProductionMetrics {
  oee:         number         // %
  availability:number         // %
  uptime:      number         // %  (за 30 дней)
  mtbf:        number         // часов
  mttr:        number         // часов
  workHours:   number         // наработка с момента ввода
  efficiency:  number         // %  vs paspasport
}

export interface EquipmentDetails {
  id:          string
  nameRu:      string
  type:        string         // тип оборудования
  model:       string         // модель/маркировка
  manufacturer:string
  installed:   string         // год ввода
  lastOverhaul:string         // последний капремонт
  nextOverhaul:string         // плановый капремонт
  specs:       { label: string; value: string }[]
  metrics:     ProductionMetrics
  history:     RepairRecord[]
  upcoming:    UpcomingWork[]
  notes?:      string
}

// ─── Database keyed by store ID ───────────────────────────────────────────────
export const EQUIPMENT_DETAILS: Record<string, EquipmentDetails> = {
  RVS1: {
    id: 'RVS1', nameRu: 'Резервуар РВС-1',
    type: 'Резервуар вертикальный стальной',
    model: 'РВС-20000', manufacturer: 'ОАО «Уралсельмаш»',
    installed: '2008', lastOverhaul: '2022-04', nextOverhaul: '2027-04',
    specs: [
      { label: 'Объём номинальный',    value: '20 000 м³' },
      { label: 'Диаметр',              value: '45.6 м' },
      { label: 'Высота',               value: '17.9 м' },
      { label: 'Толщина стенки',       value: '12 мм (низ) / 8 мм (верх)' },
      { label: 'Тип крыши',            value: 'Стационарная с понтоном' },
      { label: 'Рабочее давление',     value: '0.002 МПа' },
      { label: 'Антикоррозийное покрытие', value: 'Эпоксидное, 2018 г.' },
    ],
    metrics: { oee: 96.4, availability: 98.2, uptime: 99.1, mtbf: 8760, mttr: 4.5, workHours: 142560, efficiency: 97.8 },
    history: [
      { date: '2026-03-12', type: 'inspection', description: 'Техническое диагностирование днища (ВТД)', cost: 4.2, duration: 18, team: 'ООО «Технадзор-Каспий»' },
      { date: '2025-09-08', type: 'plan',       description: 'Очистка от донных отложений, замена дыхательных клапанов', cost: 12.5, duration: 72, team: 'СТО НПС' },
      { date: '2024-11-22', type: 'plan',       description: 'Покраска внешней поверхности, ремонт лестницы', cost: 8.4, duration: 48, team: 'Подрядчик «Ремстрой»' },
      { date: '2022-04-15', type: 'overhaul',   description: 'Капитальный ремонт: замена 24% стенок 1-го пояса, антикоррозийная обработка', cost: 184.0, duration: 720, team: '«Атырауспецстрой»' },
    ],
    upcoming: [
      { date: '2026-08-20', type: 'preventive', description: 'Поверка стационарных уровнемеров «Сапфир»', budget: 2.8, priority: 'medium' },
      { date: '2027-04-10', type: 'overhaul',   description: 'Плановый капитальный ремонт, ВТД корпуса', budget: 195.0, priority: 'high' },
    ],
    notes: 'Используется как буферный для приёма с МТ. Уровень регулируется автоматически по давлению ПНС.',
  },
  RVS2: {
    id: 'RVS2', nameRu: 'Резервуар РВС-2',
    type: 'Резервуар вертикальный стальной',
    model: 'РВС-20000', manufacturer: 'ОАО «Уралсельмаш»',
    installed: '2008', lastOverhaul: '2021-08', nextOverhaul: '2026-08',
    specs: [
      { label: 'Объём номинальный',    value: '20 000 м³' },
      { label: 'Диаметр',              value: '45.6 м' },
      { label: 'Высота',               value: '17.9 м' },
      { label: 'Тип крыши',            value: 'Стационарная с понтоном' },
      { label: 'Антикоррозийное покрытие', value: 'Эпоксидное, 2017 г.' },
    ],
    metrics: { oee: 95.8, availability: 97.6, uptime: 98.7, mtbf: 8520, mttr: 5.1, workHours: 142200, efficiency: 96.9 },
    history: [
      { date: '2026-01-18', type: 'plan',       description: 'Зачистка резервуара, ревизия запорной арматуры', cost: 11.8, duration: 96, team: 'СТО НПС' },
      { date: '2024-07-05', type: 'unplan',     description: 'Замена пяти лепестков понтона (деформация)', cost: 18.6, duration: 120, team: '«Атырауспецстрой»' },
      { date: '2021-08-22', type: 'overhaul',   description: 'Капремонт: замена днища (15%), монтаж нового понтона', cost: 178.0, duration: 768, team: '«Атырауспецстрой»' },
    ],
    upcoming: [
      { date: '2026-06-05', type: 'preventive', description: 'Очистка от донных отложений', budget: 14.2, priority: 'high' },
      { date: '2026-08-15', type: 'overhaul',   description: 'Плановый капитальный ремонт', budget: 192.0, priority: 'high' },
    ],
  },
  RVS3: {
    id: 'RVS3', nameRu: 'Резервуар РВС-3',
    type: 'Резервуар вертикальный стальной',
    model: 'РВС-20000', manufacturer: 'ОАО «Уралсельмаш»',
    installed: '2010', lastOverhaul: '2023-05', nextOverhaul: '2028-05',
    specs: [
      { label: 'Объём номинальный',    value: '20 000 м³' },
      { label: 'Диаметр',              value: '45.6 м' },
      { label: 'Высота',               value: '17.9 м' },
      { label: 'Тип крыши',            value: 'Стационарная с понтоном' },
    ],
    metrics: { oee: 97.2, availability: 98.8, uptime: 99.4, mtbf: 9120, mttr: 3.8, workHours: 124320, efficiency: 98.2 },
    history: [
      { date: '2025-11-10', type: 'plan',       description: 'Замена дыхательных клапанов КДС-1500', cost: 6.4, duration: 24, team: 'СТО НПС' },
      { date: '2023-05-30', type: 'overhaul',   description: 'Капитальный ремонт, замена антикоррозионного покрытия', cost: 168.0, duration: 696, team: '«Атырауспецстрой»' },
    ],
    upcoming: [
      { date: '2026-10-12', type: 'inspection', description: 'ВТД (внутритрубная диагностика) корпуса', budget: 8.5, priority: 'medium' },
    ],
    notes: 'Резервуар работает в стабильном режиме, показатели соответствуют паспортным.',
  },
  RVS4: {
    id: 'RVS4', nameRu: 'Резервуар РВС-4',
    type: 'Резервуар вертикальный стальной',
    model: 'РВС-20000', manufacturer: 'ОАО «Уралсельмаш»',
    installed: '2010', lastOverhaul: '2020-09', nextOverhaul: '2025-09',
    specs: [
      { label: 'Объём номинальный',    value: '20 000 м³' },
      { label: 'Диаметр',              value: '45.6 м' },
      { label: 'Высота',               value: '17.9 м' },
      { label: 'Тип крыши',            value: 'Стационарная с понтоном' },
    ],
    metrics: { oee: 78.3, availability: 84.5, uptime: 88.2, mtbf: 4200, mttr: 18.6, workHours: 124000, efficiency: 92.4 },
    history: [
      { date: '2026-04-22', type: 'unplan',     description: 'Аварийная остановка: течь по сварному шву 2-го пояса. Замена участка 4×6 м', cost: 28.5, duration: 240, team: 'Аварийная бригада СТО' },
      { date: '2025-12-03', type: 'plan',       description: 'Очистка, антикоррозийная обработка днища', cost: 14.2, duration: 96, team: 'СТО НПС' },
      { date: '2020-09-18', type: 'overhaul',   description: 'Капитальный ремонт', cost: 172.0, duration: 720, team: '«Атырауспецстрой»' },
    ],
    upcoming: [
      { date: '2026-05-25', type: 'corrective', description: 'УЗ-контроль сварных швов 2-3-го поясов после аварии', budget: 6.4, priority: 'critical' },
      { date: '2026-09-15', type: 'overhaul',   description: 'Внеплановый капремонт (досрочно)', budget: 215.0, priority: 'critical' },
    ],
    notes: '⚠ Зафиксирована утечка 22.04.2026, проведён аварийный ремонт. Требуется внеплановое ВТД и досрочный капремонт.',
  },
  PODPOR: {
    id: 'PODPOR', nameRu: 'Подпорная насосная (ПНС)',
    type: 'Подпорная насосная станция',
    model: 'ПНС-2× НМ-1250-260', manufacturer: 'АО «ГМС Ливгидромаш»',
    installed: '2008', lastOverhaul: '2024-03', nextOverhaul: '2029-03',
    specs: [
      { label: 'Подача номинальная',  value: '1 250 м³/ч (1 насос)' },
      { label: 'Давление нагнетания', value: '0.5 МПа' },
      { label: 'Мощность ЭД',         value: '500 кВт' },
      { label: 'КПД насоса',          value: '78 %' },
      { label: 'Кол-во НА',           value: '2 (1 рабочий + 1 резервный)' },
      { label: 'Тип уплотнения',      value: 'Торцевое одинарное' },
      { label: 'Среда',               value: 'Нефть товарная' },
    ],
    metrics: { oee: 89.5, availability: 94.2, uptime: 96.8, mtbf: 2880, mttr: 6.4, workHours: 142560, efficiency: 91.2 },
    history: [
      { date: '2026-02-18', type: 'plan',       description: 'Замена торцевых уплотнений НА-1', cost: 4.8, duration: 16, team: 'СТО НПС' },
      { date: '2025-08-04', type: 'plan',       description: 'Балансировка ротора НА-2, замена подшипников', cost: 8.2, duration: 32, team: 'СТО НПС' },
      { date: '2024-03-14', type: 'overhaul',   description: 'Капитальный ремонт обоих НА, замена рабочих колёс', cost: 62.5, duration: 480, team: 'ОАО «ГМС Сервис»' },
    ],
    upcoming: [
      { date: '2026-06-25', type: 'preventive', description: 'Регламентное ТО НА-1 — 6 000 моточасов', budget: 3.5, priority: 'medium' },
      { date: '2026-09-10', type: 'inspection', description: 'Виброконтроль обоих НА', budget: 1.8, priority: 'low' },
    ],
  },
  FS1: {
    id: 'FS1', nameRu: 'Фильтр-грязеуловитель ФС-1',
    type: 'Фильтр-сетчатый',
    model: 'ФГУ-150', manufacturer: 'АО «Тяжмаш»',
    installed: '2008', lastOverhaul: '2023-11', nextOverhaul: '2028-11',
    specs: [
      { label: 'Условный проход',     value: 'Ду 500 мм' },
      { label: 'Рабочее давление',    value: '6.4 МПа' },
      { label: 'Тонкость очистки',    value: '60 мкм' },
      { label: 'Производительность',  value: '1 600 м³/ч' },
      { label: 'Степень загрязнения', value: '38 % (нормальная)' },
    ],
    metrics: { oee: 93.4, availability: 96.8, uptime: 98.5, mtbf: 4380, mttr: 4.2, workHours: 142560, efficiency: 95.5 },
    history: [
      { date: '2025-12-12', type: 'plan',       description: 'Замена сетчатой кассеты, чистка корпуса', cost: 3.2, duration: 8, team: 'СТО НПС' },
      { date: '2023-11-08', type: 'overhaul',   description: 'Капремонт, замена внутренних элементов', cost: 18.5, duration: 96, team: 'СТО НПС' },
    ],
    upcoming: [
      { date: '2026-07-15', type: 'preventive', description: 'Промывка и проверка перепада давления', budget: 1.4, priority: 'medium' },
    ],
  },
  FS2: {
    id: 'FS2', nameRu: 'Фильтр-грязеуловитель ФС-2',
    type: 'Фильтр-сетчатый',
    model: 'ФГУ-150', manufacturer: 'АО «Тяжмаш»',
    installed: '2008', lastOverhaul: '2024-06', nextOverhaul: '2029-06',
    specs: [
      { label: 'Условный проход',     value: 'Ду 500 мм' },
      { label: 'Рабочее давление',    value: '6.4 МПа' },
      { label: 'Тонкость очистки',    value: '60 мкм' },
      { label: 'Производительность',  value: '1 600 м³/ч' },
      { label: 'Степень загрязнения', value: '24 % (нормальная)' },
    ],
    metrics: { oee: 94.8, availability: 97.5, uptime: 98.9, mtbf: 4520, mttr: 3.8, workHours: 142560, efficiency: 96.1 },
    history: [
      { date: '2024-06-21', type: 'overhaul',   description: 'Капремонт, замена кассеты', cost: 19.2, duration: 96, team: 'СТО НПС' },
    ],
    upcoming: [
      { date: '2026-08-10', type: 'preventive', description: 'Промывка', budget: 1.2, priority: 'low' },
    ],
  },
  MANIFOLD: {
    id: 'MANIFOLD', nameRu: 'Манифольд (узел переключений)',
    type: 'Узел технологических задвижек',
    model: '5×Ду500 16ЛС1Ф/CL900', manufacturer: 'АО «Пензтяжпромарматура»',
    installed: '2008', lastOverhaul: '2022-10', nextOverhaul: '2027-10',
    specs: [
      { label: 'Кол-во задвижек',     value: '5 шт.' },
      { label: 'Условный проход',     value: 'Ду 500 мм' },
      { label: 'Рабочее давление',    value: '6.4 МПа (ANSI 900)' },
      { label: 'Тип привода',         value: 'Электромеханический ЭПВ-200' },
      { label: 'Время хода 0→100 %',  value: '120 с' },
      { label: 'Среда',               value: 'Нефть товарная (ГОСТ 9965-76)' },
      { label: 'Класс герметичности', value: 'А' },
    ],
    metrics: { oee: 97.8, availability: 99.2, uptime: 99.6, mtbf: 14600, mttr: 2.4, workHours: 142560, efficiency: 98.5 },
    history: [
      { date: '2025-10-14', type: 'plan',       description: 'Замена сальниковой набивки задвижек ЗД-2, ЗД-4', cost: 2.6, duration: 12, team: 'СТО НПС' },
      { date: '2024-04-02', type: 'plan',       description: 'Профилактика приводов, смазка штоков', cost: 1.8, duration: 8, team: 'СТО НПС' },
      { date: '2022-10-18', type: 'overhaul',   description: 'Капитальный ремонт всех 5 задвижек, замена сёдел', cost: 38.6, duration: 240, team: 'ППА-Сервис' },
    ],
    upcoming: [
      { date: '2026-07-20', type: 'preventive', description: 'Поверка приводов ЭПВ-200, тест по ПАЗ', budget: 4.2, priority: 'medium' },
      { date: '2027-10-15', type: 'overhaul',   description: 'Плановый капитальный ремонт', budget: 42.0, priority: 'high' },
    ],
    notes: 'Узел работает стабильно. Текущая схема: ЗД-1, ЗД-3, ЗД-5 — открыты; ЗД-2, ЗД-4 — закрыты (резерв).',
  },
  NA1: {
    id: 'NA1', nameRu: 'Магистральный насос НА-1',
    type: 'Центробежный одноступенчатый',
    model: 'НМ-2500-230', manufacturer: 'АО «ГМС Ливгидромаш»',
    installed: '2008', lastOverhaul: '2023-07', nextOverhaul: '2028-07',
    specs: [
      { label: 'Подача номинальная',  value: '2 500 м³/ч' },
      { label: 'Напор номинальный',   value: '230 м' },
      { label: 'Давление макс.',      value: '6.85 МПа' },
      { label: 'Мощность ЭД',         value: '2 000 кВт (СТД-2000-2У4)' },
      { label: 'Частота вращения',    value: '3 000 об/мин' },
      { label: 'КПД насоса',          value: '85 %' },
      { label: 'Тип уплотнения',      value: 'Торцевое двойное «Burgmann»' },
      { label: 'Виброскорость',       value: '4.2 мм/с (норма ≤ 7.1)' },
    ],
    metrics: { oee: 91.2, availability: 95.8, uptime: 97.4, mtbf: 4800, mttr: 8.2, workHours: 142560, efficiency: 92.8 },
    history: [
      { date: '2026-03-08', type: 'plan',       description: 'Замена торцевых уплотнений, балансировка', cost: 18.4, duration: 48, team: 'ОАО «ГМС Сервис»' },
      { date: '2024-09-22', type: 'plan',       description: 'Замена подшипников опор, центровка', cost: 14.6, duration: 36, team: 'СТО НПС' },
      { date: '2023-07-12', type: 'overhaul',   description: 'Капремонт: замена ротора, рабочего колеса', cost: 78.5, duration: 360, team: 'ОАО «ГМС Сервис»' },
    ],
    upcoming: [
      { date: '2026-06-10', type: 'preventive', description: 'Замена торцевых уплотнений, ревизия подшипников', budget: 38.5, priority: 'high' },
      { date: '2027-08-15', type: 'preventive', description: 'Регламентное ТО — 12 000 моточасов', budget: 22.0, priority: 'medium' },
    ],
  },
  NA2: {
    id: 'NA2', nameRu: 'Магистральный насос НА-2',
    type: 'Центробежный одноступенчатый',
    model: 'НМ-2500-230', manufacturer: 'АО «ГМС Ливгидромаш»',
    installed: '2008', lastOverhaul: '2024-02', nextOverhaul: '2029-02',
    specs: [
      { label: 'Подача номинальная',  value: '2 500 м³/ч' },
      { label: 'Напор номинальный',   value: '230 м' },
      { label: 'Давление макс.',      value: '6.85 МПа' },
      { label: 'Мощность ЭД',         value: '2 000 кВт' },
      { label: 'КПД насоса',          value: '86 %' },
      { label: 'Виброскорость',       value: '3.8 мм/с (норма ≤ 7.1)' },
    ],
    metrics: { oee: 92.8, availability: 96.4, uptime: 98.1, mtbf: 5200, mttr: 7.6, workHours: 142560, efficiency: 93.5 },
    history: [
      { date: '2025-05-15', type: 'plan',       description: 'Замена подшипников, центровка муфты', cost: 12.8, duration: 32, team: 'СТО НПС' },
      { date: '2024-02-10', type: 'overhaul',   description: 'Капремонт: замена ротора, перемотка статора ЭД', cost: 86.2, duration: 384, team: 'ОАО «ГМС Сервис»' },
    ],
    upcoming: [
      { date: '2026-07-05', type: 'preventive', description: 'ТО 6 000 моточасов', budget: 18.0, priority: 'medium' },
    ],
  },
  NA3: {
    id: 'NA3', nameRu: 'Магистральный насос НА-3',
    type: 'Центробежный одноступенчатый',
    model: 'НМ-2500-230', manufacturer: 'АО «ГМС Ливгидромаш»',
    installed: '2008', lastOverhaul: '2022-12', nextOverhaul: '2027-12',
    specs: [
      { label: 'Подача номинальная',  value: '2 500 м³/ч' },
      { label: 'Напор номинальный',   value: '230 м' },
      { label: 'Давление макс.',      value: '6.85 МПа' },
      { label: 'Мощность ЭД',         value: '2 000 кВт' },
      { label: 'КПД насоса',          value: '84 %' },
      { label: 'Виброскорость',       value: '5.4 мм/с (норма ≤ 7.1)' },
    ],
    metrics: { oee: 87.5, availability: 92.4, uptime: 95.8, mtbf: 3960, mttr: 11.2, workHours: 142560, efficiency: 90.4 },
    history: [
      { date: '2026-01-22', type: 'unplan',     description: 'Повышение виброскорости — замена опорных подшипников', cost: 16.4, duration: 56, team: 'СТО НПС' },
      { date: '2024-08-19', type: 'plan',       description: 'Замена торцевых уплотнений', cost: 14.2, duration: 36, team: 'СТО НПС' },
      { date: '2022-12-04', type: 'overhaul',   description: 'Капитальный ремонт', cost: 82.0, duration: 360, team: 'ОАО «ГМС Сервис»' },
    ],
    upcoming: [
      { date: '2026-09-01', type: 'preventive', description: 'Виброконтроль с дефектацией подшипников', budget: 4.2, priority: 'high' },
    ],
    notes: 'Виброскорость близка к предельной. Рекомендована досрочная замена подшипниковых опор.',
  },
  NA4: {
    id: 'NA4', nameRu: 'Магистральный насос НА-4',
    type: 'Центробежный одноступенчатый',
    model: 'НМ-2500-230', manufacturer: 'АО «ГМС Ливгидромаш»',
    installed: '2008', lastOverhaul: '2021-05', nextOverhaul: '2026-05',
    specs: [
      { label: 'Подача номинальная',  value: '2 500 м³/ч' },
      { label: 'Напор номинальный',   value: '230 м' },
      { label: 'Состояние',           value: 'Текущий капитальный ремонт' },
      { label: 'Мощность ЭД',         value: '2 000 кВт' },
    ],
    metrics: { oee: 0, availability: 0, uptime: 0, mtbf: 4080, mttr: 0, workHours: 138400, efficiency: 0 },
    history: [
      { date: '2026-04-10', type: 'overhaul',   description: 'Капремонт начат: разборка, дефектация. Замена ротора, рабочего колеса, торцевых уплотнений', cost: 92.0, duration: 720, team: 'ОАО «ГМС Сервис»' },
      { date: '2024-12-08', type: 'unplan',     description: 'Замена ротора после повышенной вибрации', cost: 28.4, duration: 168, team: 'ОАО «ГМС Сервис»' },
      { date: '2021-05-25', type: 'overhaul',   description: 'Капремонт', cost: 76.0, duration: 360, team: 'ОАО «ГМС Сервис»' },
    ],
    upcoming: [
      { date: '2026-06-20', type: 'overhaul',   description: 'Завершение капремонта, обкатка, ввод в работу', budget: 14.5, priority: 'critical' },
    ],
    notes: '⚠ Насос на капитальном ремонте с 10.04.2026. Плановое окончание — 20.06.2026.',
  },
  SIKN: {
    id: 'SIKN', nameRu: 'СИКН (Система измерений количества и качества нефти)',
    type: 'Узел учёта нефти',
    model: 'СИКН-100, 3 линии × Ду 250',
    manufacturer: 'НПО «Нефтегазавтоматика»',
    installed: '2010', lastOverhaul: '2023-09', nextOverhaul: '2028-09',
    specs: [
      { label: 'Производительность',  value: '3 × 600 м³/ч (1 800 м³/ч)' },
      { label: 'Тип расходомеров',    value: 'Турбинные ТОР-1-50 (ОАО «Камышинский ОЭМЗ»)' },
      { label: 'Кол-во измерительных линий', value: '3 (2 рабочих + 1 контрольная)' },
      { label: 'Поверочная установка',value: 'ТПУ «Vortex 100»' },
      { label: 'Класс точности',      value: '0.15 % (ГОСТ 8.595-2004)' },
      { label: 'Влагомер',            value: 'WM-100, 2 шт.' },
      { label: 'Поточный плотномер',  value: 'Solartron 7835-B, 2 шт.' },
    ],
    metrics: { oee: 95.6, availability: 98.4, uptime: 99.2, mtbf: 7200, mttr: 4.8, workHours: 124320, efficiency: 97.2 },
    history: [
      { date: '2026-02-08', type: 'plan',       description: 'Поверка по ГСИ. Калибровка ТПУ', cost: 8.4, duration: 48, team: 'РЦСМ Атырау' },
      { date: '2025-04-14', type: 'plan',       description: 'Замена 3 датчиков давления Метран-150 на измерительных линиях', cost: 4.2, duration: 16, team: 'СТО НПС' },
      { date: '2023-09-26', type: 'overhaul',   description: 'Капремонт ТОР-1-50, замена подшипниковых узлов', cost: 32.5, duration: 192, team: 'НПО «Нефтегазавтоматика»' },
    ],
    upcoming: [
      { date: '2026-06-25', type: 'inspection', description: 'Поверка по ГСИ всех 3 линий, калибровка ТПУ', budget: 12.4, priority: 'critical' },
      { date: '2026-12-10', type: 'preventive', description: 'Замена прокладок, ТО запорной арматуры', budget: 3.8, priority: 'medium' },
    ],
  },
  DRAIN: {
    id: 'DRAIN', nameRu: 'Дренажная ёмкость',
    type: 'Подземная горизонтальная ёмкость',
    model: 'РГС-25', manufacturer: 'ЗАО «Курганхиммаш»',
    installed: '2008', lastOverhaul: '2021-11', nextOverhaul: '2031-11',
    specs: [
      { label: 'Объём',               value: '25 м³' },
      { label: 'Давление расчётное',  value: '0.07 МПа' },
      { label: 'Тип',                 value: 'Подземная, утеплённая' },
      { label: 'Уровень текущий',     value: '18 % (4.5 м³)' },
      { label: 'Откачка',             value: 'НШО-1500 на ПНС' },
    ],
    metrics: { oee: 99.1, availability: 99.6, uptime: 99.8, mtbf: 17520, mttr: 1.2, workHours: 142560, efficiency: 99.4 },
    history: [
      { date: '2024-10-05', type: 'plan',       description: 'Очистка, опрессовка, поверка предохранительного клапана', cost: 2.4, duration: 8, team: 'СТО НПС' },
      { date: '2021-11-12', type: 'overhaul',   description: 'Внутренняя антикоррозийная обработка', cost: 8.6, duration: 48, team: 'СТО НПС' },
    ],
    upcoming: [
      { date: '2026-11-20', type: 'preventive', description: 'Чистка, поверка КИПиА', budget: 2.8, priority: 'low' },
    ],
  },
  CTRL: {
    id: 'CTRL', nameRu: 'Операторная (диспетчерская)',
    type: 'Здание управления',
    model: 'АСУ ТП на базе Schneider Electric Modicon M580',
    manufacturer: '«КазТрансОйл-Автоматизация»',
    installed: '2008', lastOverhaul: '2023-04', nextOverhaul: '2028-04',
    specs: [
      { label: 'Площадь',             value: '120 м² (диспетчерская + серверная)' },
      { label: 'АРМ операторов',      value: '3 шт. (2 рабочих + 1 резервный)' },
      { label: 'Контроллеры ПЛК',     value: '4 × Schneider M580 (горячий резерв)' },
      { label: 'SCADA',               value: 'OSIsoft PI System + Wonderware InTouch' },
      { label: 'Серверы',             value: '2 × Dell PowerEdge R750 (HA-кластер)' },
      { label: 'ИБП',                 value: 'APC Symmetra 60 кВА, 30 мин' },
      { label: 'ДГУ',                 value: 'Cummins C440D5 — 350 кВт' },
      { label: 'Видеонаблюдение',     value: '32 камеры Hikvision + DVR' },
    ],
    metrics: { oee: 99.4, availability: 99.8, uptime: 99.95, mtbf: 26280, mttr: 0.8, workHours: 142560, efficiency: 100 },
    history: [
      { date: '2025-08-22', type: 'plan',       description: 'Обновление ПО SCADA до v2024.R2, прошивок ПЛК', cost: 6.8, duration: 12, team: 'КТО-Автоматизация' },
      { date: '2023-04-18', type: 'overhaul',   description: 'Модернизация АСУ ТП, замена 2 ПЛК на M580', cost: 124.5, duration: 480, team: 'КТО-Автоматизация' },
    ],
    upcoming: [
      { date: '2026-08-15', type: 'preventive', description: 'Обновление ПО SCADA, нагрузочное тестирование', budget: 6.2, priority: 'medium' },
      { date: '2027-03-10', type: 'inspection', description: 'Аудит кибербезопасности АСУ ТП', budget: 14.0, priority: 'high' },
    ],
  },
}

export function getEquipmentDetails(id: string | null): EquipmentDetails | undefined {
  if (!id) return undefined
  return EQUIPMENT_DETAILS[id]
}

import { useState } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { Badge } from '@/components/ui/badge'
import {
  Building2, Users, MapPin, Phone, Globe, ChevronRight, ChevronDown,
  Zap, Radio, Cpu, Network, BarChart3, Server, Shield,
  ArrowRight, Info, Layers, Mail,
} from 'lucide-react'

/* ── Types ────────────────────────────────────────────────────────────────── */

interface OrgUnit {
  id: string
  name: string
  shortName?: string
  type: 'holding' | 'subsidiary' | 'branch' | 'division' | 'service'
  director?: string
  chairSd?: string          // Председатель СД
  staff?: number
  city?: string
  address?: string
  phone?: string
  fax?: string
  email?: string
  website?: string
  description: string
  facts?: string[]          // key facts / details
  tasks?: string[]          // задачи
  children?: OrgUnit[]
}

/* ── Palette ──────────────────────────────────────────────────────────────── */

const TYPE_META: Record<OrgUnit['type'], { label: string; color: string; Icon: typeof Building2 }> = {
  holding:    { label: 'Головная компания', color: '#ef4444', Icon: Building2 },
  subsidiary: { label: 'ДЗО',              color: '#f59e0b', Icon: Globe },
  branch:     { label: 'Филиал',            color: '#0d9488', Icon: Zap },
  division:   { label: 'РДЦ',              color: '#6366f1', Icon: Radio },
  service:    { label: 'Служба',            color: '#8b5cf6', Icon: Cpu },
}

/* ── Data ─────────────────────────────────────────────────────────────────── */

const MES_LIST: OrgUnit[] = [
  {
    id: 'mes-akm', name: 'Акмолинские МЭС', shortName: 'Акмолинские МЭС',
    type: 'branch', director: 'Абужанов Мэлс Абужанович', staff: 559, city: 'Астана',
    address: 'г. Астана, р/н Байқоңыр, ж/м Өндіріс, ул. Үшқоңыр, 3/2',
    phone: '+7 (7172) 69-33-59',
    description: 'Образован в сентябре 1997 г. Покрывает Акмолинскую и Северо-Казахстанскую области. Связан межгосударственными ЛЭП с ОДУ Урала и ОДУ Сибири (РФ).',
    facts: [
      'ВЛ 10–1150 кВ — 4 230 км (по цепям)',
      '10 подстанций 220–1150 кВ, суммарно 8 136,6 МВА',
      'Транзит в Сарбайские, Северные и Центральные МЭС',
      'ВЭС: Ерейментауская, Астана EXPO-2017, Golden Energy, Борей, Красный яр…',
    ],
  },
  {
    id: 'mes-akt', name: 'Актюбинские МЭС', shortName: 'Актюбинские МЭС',
    type: 'branch', director: 'Ташубаев Серик Куаншбаевич', staff: 257, city: 'Актобе',
    address: 'г. Актобе, пр. 312-й Стрелковой дивизии, 44',
    phone: '+7 (7132) 70-03-59', fax: '+7 (7132) 77-39-74',
    description: 'Образован в октябре 1997 г. Актюбинская и ЗКО. Связь с ЕЭС через ВЛ 500 кВ «Житикара-Ульке».',
    facts: [
      'ВЛ 10–500 кВ — 1 217 км, 7 ПС 220–500 кВ, 2 425,5 МВА',
      'Изолированный Уральский энергоузел (связан с Западными МЭС)',
    ],
  },
  {
    id: 'mes-alm', name: 'Алматинские МЭС', shortName: 'Алматинские МЭС',
    type: 'branch', director: 'Нургудыр Бақытжан Момышұлы', staff: 468, city: 'Алматы',
    address: 'г. Алматы, ул. Шевченко, 162/7',
    phone: '+7 (727) 332-42-59', email: 'officeAlm@kegoc.kz',
    description: 'Образован в сентябре 1997 г. Алматинская, Жамбылская обл. и Жетісу. Межгосударственная связь с Кыргызстаном.',
    facts: [
      'ВЛ 0,4–500 кВ — 4 220 км, 12 ПС 35–500 кВ, 4 958,2 МВА',
      'Каскад Алматинских ГЭС, Антоновская, Каратальская, Успенская ГЭС',
    ],
  },
  {
    id: 'mes-vos', name: 'Восточные МЭС', shortName: 'Восточные МЭС',
    type: 'branch', director: 'Запольский Алексей Александрович', staff: 294, city: 'Усть-Каменогорск',
    address: 'г. Усть-Каменогорск, ул. Бажова, 67',
    phone: '+7 (7232) 406-359', email: 'priemnayaVMES@kegoc.kz',
    description: 'Образован в декабре 1997 г. ВКО и Абайская обл. Межгосударственная ЛЭП с РФ.',
    facts: [
      'ВЛ 0,4–500 кВ — 1 975 км, 7 ПС 220–500 кВ, 4 122,5 МВА',
      'Бухтарминская, Усть-Каменогорская, Шульбинская ГЭС (нац. значение)',
      'ВЭС Абай 1 и 2, СЭС Жангиз-Solar',
    ],
  },
  {
    id: 'mes-zap', name: 'Западные МЭС', shortName: 'Западные МЭС',
    type: 'branch', director: 'Чернохаев Константин Петрович', staff: 263, city: 'Атырау',
    address: 'г. Атырау, ул. Махамбета Өтемісұлы, 110а',
    phone: '+7 (7122) 552-359', email: 'Priem_zmes@kegoc.kz',
    description: 'Образован в июле 1998 г. Атырауская и Мангыстауская обл. Изолированная зона — не связана с ЕЭС Казахстана.',
    facts: [
      'ВЛ 6–330 кВ — 2 379 км, 7 ПС 220 кВ, 1 450 МВА',
      'МАЭК (Актауские ТЭЦ-1,2, ТЭС-3), ТШО (ГТЭС), NCOC «Кашаган»',
    ],
  },
  {
    id: 'mes-sar', name: 'Сарбайские МЭС', shortName: 'Сарбайские МЭС',
    type: 'branch', director: 'Амренов Азамат Маратович', staff: 425, city: 'Рудный',
    address: 'г. Рудный, Костанайская обл., ул. Топоркова, 31',
    phone: '+7 (7143) 159-270',
    description: 'Образован в августе 1997 г. Костанайская обл. Межгосударственные ЛЭП с РФ.',
    facts: [
      'ВЛ 6–1150 кВ — 2 438 км, 8 ПС 220–1150 кВ, 6 589,9 МВА',
      'Рудненская, Костанайская, Аркалыкская ТЭЦ',
    ],
  },
  {
    id: 'mes-sev', name: 'Северные МЭС', shortName: 'Северные МЭС',
    type: 'branch', director: 'Адамов Берик Багдатович', staff: 372, city: 'Экибастуз',
    address: 'г. Экибастуз, ул. Мухтара Ауэзова, 126',
    phone: '+7 (7187) 34-86-59',
    description: 'Образован в сентябре 1997 г. Павлодарская обл. Связан с Восточными, Акмолинскими и Центральными МЭС, межгосударственные ЛЭП с РФ.',
    facts: [
      'ВЛ 0,4–1150 кВ — 3 681 км, 8 ПС 220–1150 кВ, 3 758 МВА',
      'ЭГРЭС-1 (им. Б.Нуржанова), ЭГРЭС-2, Аксуская ГРЭС — нац. значение',
      'Павлодарские ТЭЦ-1, -2, -3',
    ],
  },
  {
    id: 'mes-cen', name: 'Центральные МЭС', shortName: 'Центральные МЭС',
    type: 'branch', director: 'Саухимов Алмаз Абжалиевич', staff: 420, city: 'Караганда',
    address: 'г. Караганда, ул. Камская, 4',
    phone: '+7 (7212) 421-365', fax: '+7 (7212) 421-370',
    description: 'Образован в 1997 г. Карагандинская обл. Связан с Акмолинскими, Северными, Алматинскими и Южными МЭС.',
    facts: [
      'ВЛ 10–500 кВ — 3 497 км, 10 ПС 220–500 кВ, 3 741,6 МВА',
      'КарГРЭС-2 (нац.), КарГРЭС-1, Жезказганская, Балхашская ТЭЦ',
      'СЭС: Сарань, Гульшат, Агадырь-1 и -2, Кенгир',
    ],
  },
]

const NDC_SERVICES: OrgUnit[] = [
  {
    id: 'ndc-disp', name: 'Диспетчерская служба', type: 'service',
    description: 'Круглосуточное ОДУ ЕЭС Казахстана.',
    tasks: [
      'Круглосуточное оперативно-диспетчерское управление ЕЭС',
      'Реализация суточных графиков субъектов ОРЭ',
      'Физическое урегулирование дисбалансов',
      'Предотвращение и ликвидация технологических нарушений',
      'Оперативное управление резервами мощности',
    ],
  },
  {
    id: 'ndc-bal', name: 'Служба балансов и краткосрочного планирования', type: 'service',
    description: 'Планирование режимов поставки-потребления на рынках РК.',
    tasks: [
      'Формирование суточных графиков производства и потребления',
      'Оперативный учёт выработанной и потреблённой электроэнергии',
      'Формирование фактических балансов ОРЭ/БРЭ',
      'Отчётность по межгосударственным перетокам',
    ],
  },
  {
    id: 'ndc-rza', name: 'Служба РЗА', type: 'service',
    description: 'Релейная защита и электроавтоматика ЕЭС.',
    tasks: [
      'Оперативно-техническое руководство устройствами РЗА и ПА',
      'Расчёт токов КЗ, уставок РЗА, обеспечение селективности',
      'Разработка структурных и принципиальных схем',
      'Участие в расследовании аварий, обобщение опыта',
    ],
  },
  {
    id: 'ndc-elr', name: 'Служба электрических режимов', type: 'service',
    description: 'Режимы и устойчивость сети 220–500–1150 кВ.',
    tasks: [
      'Расчёт статической и динамической устойчивости ЕЭС',
      'Выбор допустимых перетоков мощности',
      'Разработка графика напряжения по ЕЭС',
      'Оптимизация по реактивной мощности, снижение потерь',
      'Участие в расследовании межсистемных аварий',
    ],
  },
  {
    id: 'ndc-enr', name: 'Служба энергетических режимов', type: 'service',
    description: 'Балансы мощности, мониторинг генерации и гидрорежимов.',
    tasks: [
      'Прогнозирование годовых и месячных балансов мощности',
      'Мониторинг генерирующего оборудования Казахстана',
      'Учёт технико-экономических показателей ГЭС',
      'Контроль режимов водохранилищ и паводков',
    ],
  },
  {
    id: 'ndc-asdu', name: 'Служба АСДУ', type: 'service',
    description: 'ОИК/SCADA реального времени, телеметрия.',
    tasks: [
      'Эксплуатация ОИК/SCADA ЕЭС Казахстана',
      'Непрерывный контроль и актуализация базы данных',
      'Мониторинг телеметрической информации',
      'Ретрансляция телеметрии в смежные энергосистемы',
    ],
  },
  {
    id: 'ndc-aas', name: 'Служба активно-адаптивных систем', type: 'service',
    description: 'ЦСПА, WAMS, АРЧМ — интеллектуальное управление ЕЭС.',
    tasks: [
      'Разработка ЦСПА (централизованная противоаварийная автоматика)',
      'Система мониторинга векторных измерений WAMS',
      'АРЧМ — автоматическое регулирование частоты и мощности',
      'Расчёт объёмов регулирования на электростанциях',
    ],
  },
  {
    id: 'ndc-askue', name: 'Служба развития АСКУЭ', type: 'service',
    description: 'Интеллектуальные приборы учёта и предиктивная аналитика.',
    tasks: [
      'Оснащение субъектов рынка АСКУЭ',
      'Разработка и адаптация технологий автосбора данных',
      'Контроль качества и достоверности данных',
      'Интеграция с платформами системного оператора',
      'Алгоритмы предиктивного анализа потребления',
    ],
  },
]

const ITS_SERVICES: OrgUnit[] = [
  {
    id: 'its-it', name: 'Служба информационных технологий', type: 'service',
    description: 'SD-WAN, DWDM, VPN, IT-инфраструктура, техподдержка пользователей.',
    tasks: [
      'Эксплуатация IT-оборудования и корпоративных систем',
      'Управление SD-WAN, автоматическая балансировка трафика',
      'Техническая поддержка пользователей и обработка заявок',
      'Аварийно-восстановительные и планово-профилактические работы',
    ],
  },
  {
    id: 'its-tech', name: 'Служба сопровождения технологических систем', type: 'service',
    description: 'АСКУЭ, СБРЭ, Биллинг, ОИК/SCADA, телемеханика.',
    tasks: [
      'Группа АСЭР: учёт эл.энергии, биллинг, платформы энергорынка',
      'Группа АСДУ: ОИК/SCADA, телемеханика, техкомплексы ПС',
    ],
  },
  {
    id: 'its-proj', name: 'Служба экспертизы проектов и капстроительства', type: 'service',
    description: 'Программы развития ТК, экспертиза ПСД, управление спектром ВЧ.',
    tasks: [
      'Разработка программ развития телекоммуникаций KEGOC',
      'Экспертиза ПСД, ТЭО, ТЗ по объектам ИТК',
      'Управление спектром частот ВЧ каналов, согласование со смежными государствами',
      'Контроль СМР, приёмка объектов ИТК в эксплуатацию',
    ],
  },
  {
    id: 'its-corp', name: 'Служба сопровождения корпоративных систем (ССКС)', type: 'service',
    description: 'SAP ERP, СЭД Lotus, ORACLE, портал, архивные системы.',
    tasks: [
      'Администрирование SAP Basis, СЭД Lotus, веб-сайты',
      'Мониторинг ORACLE (АСКУЭ, СБРЭ, Биллинг, GIS)',
      'Реализация Z-разработок и изменений в АИУСП',
      'Обучение и консультации пользователей',
    ],
  },
  {
    id: 'its-sbre', name: 'Служба развития СБРЭ', type: 'service',
    description: 'Балансирующий рынок: заявки, суточные графики, расчёт дисбалансов.',
    tasks: [
      'Приём заявок субъектов ОРЭ на покупку/продажу эл.энергии',
      'Формирование суточного графика и расчёт торгов',
      'Расчёт почасовых дисбалансов и цен на ОРЭ/БРЭ',
      'Модернизация и интеграция СБРЭ с ИС KEGOC',
    ],
  },
  {
    id: 'its-pts', name: 'Производственно-техническая служба', type: 'service',
    description: 'Ремонты ИТК, ИСМ, договоры аренды каналов связи.',
    tasks: [
      'Координация ремонта и эксплуатации ИТК',
      'Разработка планов ремонтных работ, контроль исполнения',
      'Формирование бюджета Филиала, отчётность',
      'Подготовка договоров на аренду каналов связи',
    ],
  },
  {
    id: 'its-tk', name: 'Служба сопровождения телекоммуникаций', type: 'service',
    description: 'ВОЛС, ЗССС, РРЛ, ВЧ-связь, DWDM, РЗ и ПА, круглосуточный мониторинг.',
    tasks: [
      'Надёжная работа ТК НДЦ СО и офиса KEGOC',
      'Круглосуточный мониторинг и аварийно-восстановительные работы',
      'Эксплуатация АТС, ВОЛС, РРЛ, ВЧ-связь, DWDM',
      'Координация 9 региональных центров Филиала ИТС',
    ],
  },
]

const NDC_RDC: OrgUnit[] = [
  { id: 'rdc-akm', name: 'Акмолинский РДЦ', type: 'division', city: 'Астана', description: 'Региональный диспетчерский центр' },
  { id: 'rdc-akt', name: 'Актюбинский РДЦ', type: 'division', city: 'Актобе', description: 'Региональный диспетчерский центр' },
  { id: 'rdc-alm', name: 'Алматинский РДЦ', type: 'division', city: 'Алматы', description: 'Региональный диспетчерский центр' },
  { id: 'rdc-vos', name: 'Восточный РДЦ', type: 'division', city: 'Усть-Каменогорск', description: 'Региональный диспетчерский центр' },
  { id: 'rdc-zap', name: 'Западный РДЦ', type: 'division', city: 'Атырау', description: 'Региональный диспетчерский центр' },
  { id: 'rdc-kos', name: 'Костанайский РДЦ', type: 'division', city: 'Костанай', description: 'Региональный диспетчерский центр' },
  { id: 'rdc-sev', name: 'Северный РДЦ', type: 'division', city: 'Экибастуз', description: 'Региональный диспетчерский центр' },
  { id: 'rdc-cen', name: 'Центральный РДЦ', type: 'division', city: 'Караганда', description: 'Региональный диспетчерский центр' },
  { id: 'rdc-yuz', name: 'Южный РДЦ', type: 'division', city: 'Шымкент', description: 'Региональный диспетчерский центр' },
]

/* Flat list of all selectable items with section context */
type NavItem = OrgUnit & { section: string }

const KEGOC_ROOT: NavItem = {
  id: 'kegoc', name: 'АО «KEGOC»', shortName: 'KEGOC', type: 'holding', section: 'holding',
  city: 'Астана', address: 'пр. Тәуелсіздік, 59, Астана', website: 'https://www.kegoc.kz',
  description: 'Казахстанская компания по управлению электрическими сетями. Системный оператор Единой энергосистемы Республики Казахстан.',
  facts: [
    'Акционерный капитал: 148 922 757 тыс. тенге',
    'Акции: 275 294 118 простых (привилегированных нет)',
    'АО «Самрук-Қазына» — 234 000 001 акция (85%)',
    'Голосующих ценных бумаг — 41 292 727 акций',
    'БИН: 970 740 000 838',
    'Гос. регистрация: 6801-1901-АО от 21.10.2004 г.',
  ],
}

const ENERGOINFORM: NavItem = {
  id: 'energoinform', name: 'АО «Энергоинформ»', shortName: 'Энергоинформ', type: 'subsidiary', section: 'dzo',
  director: 'Уали Махаббат Жұмабекұлы',
  city: 'Астана', address: 'пр. Тәуелсіздік, 59, Астана',
  phone: '690-610', website: 'http://www.energoinform.kz',
  description: '100% дочерняя компания АО «KEGOC», созданная путём преобразования Учреждения «Энергоинформ». Дата регистрации — 29 ноября 2010 г. Обеспечивает надёжное функционирование и развитие ИТК участников национальной энергосистемы РК.',
  tasks: [
    'Обеспечение ИТК АО «KEGOC» и субъектов ЕЭС РК',
    'Внедрение интеллектуальных решений в управление энергорынком',
    'Развитие инфраструктурных комплексов субъектов энергорынка',
    'Диверсификация источников роста стоимости компании',
  ],
}

const BATYS: NavItem = {
  id: 'batys', name: 'АО «Батыс транзит»', shortName: 'Батыс транзит', type: 'subsidiary', section: 'dzo',
  director: 'Маутканов Дархан Ахметович',
  chairSd: 'Нугыманов Бауыржан Табылдиевич',
  city: 'Алматы', address: 'г. Алматы, ул. Шевченко, 162-7',
  description: 'Первый пример ГЧП в проектах нац. значения. Создано в ноябре 2005 г. по Постановлению Правительства РК №1008 для строительства МЛ ВЛ 500 кВ «Северный Казахстан — Актюбинская область» (~500 км). Проект — один из «30 корпоративных лидеров Казахстана».',
  facts: [
    'KEGOC — 20%, ТОО «Мехэнергострой» — 80%',
    'Концессионное соглашение от 28.12.2005 г.',
    'ПС-500 «Ульке» включена 14.12.2008 г.',
    'ВЛ ~500 км принята в эксплуатацию 22.02.2009 г.',
  ],
  tasks: [
    'Передача и распределение электрической энергии',
    'Эксплуатация электрических сетей и подстанций',
    'Строительно-монтажные работы',
  ],
}

const NDC: NavItem = {
  id: 'ndc', name: 'Национальный диспетчерский центр СО', shortName: 'НДЦ СО', type: 'branch', section: 'ndc',
  director: 'Шинасилов Ералы Турсубекович', staff: 108, city: 'Астана',
  description: 'Создан на базе ОДУ Казахстана (1969). С 28.12.2004 — НДЦ СО. Переведён из Алматы в Астану в 2005–2006 гг. В прямом оперативном подчинении — 9 региональных диспетчерских центров.',
  tasks: [
    'Обеспечение надёжного функционирования ЕЭС Казахстана',
    'Параллельная работа ЕЭС с энергосистемами сопредельных государств',
    'Обеспечение качества электрической энергии',
    'Централизованное оперативно-диспетчерское управление режимами',
    'Управление режимами межгосударственных перетоков',
    'Предотвращение и ликвидация технологических нарушений',
  ],
}

const ITS: NavItem = {
  id: 'its', name: 'Филиал «ИТС»', shortName: 'ИТС', type: 'branch', section: 'its',
  director: 'Копенов Едил Кудайбергенович', staff: 408, city: 'Астана',
  description: 'Филиал «Информационные телекоммуникационные системы» зарегистрирован 1 августа 2025 г. (протокол СД №8). Операционная деятельность — с 1 января 2026 г. В структуре — 9 региональных центров (Астана, Актобе, Алматы, Усть-Каменогорск, Атырау, Костанай, Экибастуз, Караганда, Шымкент).',
  tasks: [
    'Надёжная, безопасная и бесперебойная работа ТК и ИС Компании',
    'Поддержка ИТ-инфраструктуры ЕЭС Казахстана',
    'Развитие и сопровождение корпоративных ИС и цифровых решений',
    'Повышение эффективности бизнес-процессов через цифровизацию',
  ],
}

/* ── Nav tree data ───────────────────────────────────────────────────────── */

interface TreeSection {
  id: string
  label: string
  icon: typeof Building2
  color: string
  items: NavItem[]
  subSections?: { label: string; items: NavItem[] }[]
}

const NAV_TREE: TreeSection[] = [
  {
    id: 'holding',
    label: 'АО «KEGOC»',
    icon: Building2,
    color: '#ef4444',
    items: [KEGOC_ROOT],
  },
  {
    id: 'dzo',
    label: 'Дочерние организации',
    icon: Globe,
    color: '#f59e0b',
    items: [ENERGOINFORM, BATYS],
  },
  {
    id: 'ndc',
    label: 'НДЦ СО',
    icon: Radio,
    color: '#6366f1',
    items: [NDC],
    subSections: [
      { label: 'Службы НДЦ СО', items: NDC_SERVICES.map((s) => ({ ...s, section: 'ndc' })) },
      { label: 'Региональные ДЦ', items: NDC_RDC.map((s) => ({ ...s, section: 'ndc' })) },
    ],
  },
  {
    id: 'its',
    label: 'Филиал «ИТС»',
    icon: Server,
    color: '#0d9488',
    items: [ITS],
    subSections: [
      { label: 'Службы ИТС', items: ITS_SERVICES.map((s) => ({ ...s, section: 'its' })) },
    ],
  },
  {
    id: 'mes',
    label: 'Филиалы МЭС',
    icon: Zap,
    color: '#0d9488',
    items: MES_LIST.map((m) => ({ ...m, section: 'mes' })),
  },
]

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function statsRow(isDark: boolean) {
  const total = MES_LIST.reduce((a, b) => a + (b.staff ?? 0), 0) + (NDC.staff ?? 0) + (ITS.staff ?? 0)
  return [
    { label: 'МЭС филиалов', value: '8', icon: Zap, color: '#0d9488' },
    { label: 'Персонал (всего)', value: total.toLocaleString(), icon: Users, color: '#6366f1' },
    { label: 'Подстанций НЭС', value: '69', icon: Network, color: '#f59e0b' },
    { label: 'РДЦ', value: '9', icon: BarChart3, color: '#8b5cf6' },
    { label: 'ДЗО', value: '2', icon: Layers, color: '#ef4444' },
    { label: 'Стран (транзит)', value: '4', icon: ArrowRight, color: '#10b981' },
  ].map((s) => (
    <div key={s.label}
      className="rounded-xl border p-3 flex flex-col gap-1"
      style={{ borderColor: `${s.color}25`, background: isDark ? `${s.color}08` : `${s.color}05` }}>
      <div className="flex items-center gap-1.5">
        <s.icon className="h-3.5 w-3.5" style={{ color: s.color }} />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</span>
      </div>
      <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
    </div>
  ))
}

/* ── Nav Tree Item ────────────────────────────────────────────────────────── */

function NavLeaf({ item, active, onClick, color, indent = 0 }: {
  item: NavItem; active: boolean; onClick: () => void; color: string; indent?: number
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] transition-all"
      style={{
        paddingLeft: `${8 + indent * 12}px`,
        background: active ? `${color}18` : 'transparent',
        color: active ? color : undefined,
        fontWeight: active ? 600 : 400,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: active ? color : 'currentColor', opacity: active ? 1 : 0.3 }} />
      <span className="truncate leading-snug">{item.shortName ?? item.name}</span>
    </button>
  )
}

function NavSection({ sec, activeId, onSelect }: {
  sec: TreeSection; activeId: string; onSelect: (item: NavItem) => void
}) {
  const [open, setOpen] = useState(
    sec.items.some((i) => i.id === activeId) ||
    sec.subSections?.some((ss) => ss.items.some((i) => i.id === activeId)) ||
    sec.id === 'holding'
  )
  const { color } = sec

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50 transition-colors"
      >
        <sec.icon className="h-3.5 w-3.5 shrink-0" style={{ color }} />
        <span className="text-[11px] font-semibold flex-1 text-left">{sec.label}</span>
        {open
          ? <ChevronDown className="h-3 w-3 text-muted-foreground" />
          : <ChevronRight className="h-3 w-3 text-muted-foreground" />
        }
      </button>

      {open && (
        <div className="mt-0.5 space-y-0.5">
          {sec.items.map((item) => (
            <NavLeaf key={item.id} item={item} active={activeId === item.id} onClick={() => onSelect(item)} color={color} />
          ))}

          {sec.subSections?.map((ss) => (
            <div key={ss.label}>
              <p className="px-3 pt-1.5 pb-0.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                {ss.label}
              </p>
              {ss.items.map((item) => (
                <NavLeaf key={item.id} item={item} active={activeId === item.id} onClick={() => onSelect(item)} color={color} indent={1} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Detail Panel ─────────────────────────────────────────────────────────── */

function DetailPanel({ item, isDark }: { item: NavItem; isDark: boolean }) {
  const meta = TYPE_META[item.type]
  const { color, Icon } = meta
  const [tab, setTab] = useState<'info' | 'tasks'>('info')

  const hasTasks = item.tasks && item.tasks.length > 0
  const hasFacts = item.facts && item.facts.length > 0

  return (
    <div className="flex flex-col gap-5">
      {/* Title */}
      <div className="rounded-xl border p-5" style={{ borderColor: `${color}25`, background: isDark ? `${color}07` : `${color}04` }}>
        <div className="flex items-start gap-4">
          <div className="rounded-xl p-3 shrink-0" style={{ background: `${color}18` }}>
            <Icon className="h-6 w-6" style={{ color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant="outline" className="text-[9px]" style={{ borderColor: `${color}40`, color }}>
                {meta.label}
              </Badge>
            </div>
            <h2 className="text-lg font-bold leading-tight">{item.name}</h2>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{item.description}</p>
          </div>
        </div>
      </div>

      {/* Contacts row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          item.director && { icon: Users, label: 'Руководитель', value: item.director },
          item.chairSd && { icon: Shield, label: 'Председатель СД', value: item.chairSd },
          item.staff && { icon: Users, label: 'Персонал', value: `${item.staff.toLocaleString()} чел.` },
          item.city && { icon: MapPin, label: 'Город', value: item.address || item.city },
          item.phone && { icon: Phone, label: 'Телефон', value: item.phone },
          item.fax && { icon: Phone, label: 'Факс', value: item.fax },
          item.email && { icon: Mail, label: 'Email', value: item.email },
          item.website && { icon: Globe, label: 'Сайт', value: item.website, href: item.website },
        ].filter(Boolean).map((c, i) => {
          const CI = (c as { icon: typeof Building2 }).icon
          const href = (c as { href?: string }).href
          const value = (c as { value: string }).value
          const label = (c as { label: string }).label
          return (
            <div key={i} className="rounded-lg border p-3" style={{ borderColor: `${color}15` }}>
              <div className="flex items-center gap-1.5 mb-1">
                <CI className="h-3 w-3 text-muted-foreground" />
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</span>
              </div>
              {href
                ? <a href={href} target="_blank" rel="noopener noreferrer"
                    className="text-xs font-medium underline truncate block" style={{ color }}>{value}</a>
                : <p className="text-xs font-medium leading-snug">{value}</p>
              }
            </div>
          )
        })}
      </div>

      {/* Tabs */}
      {(hasFacts || hasTasks) && (
        <div>
          <div className="flex gap-1 border-b mb-4">
            {hasFacts && (
              <button onClick={() => setTab('info')}
                className="px-3 pb-2 text-xs font-medium transition-colors flex items-center gap-1.5"
                style={{ borderBottom: tab === 'info' ? `2px solid ${color}` : '2px solid transparent', color: tab === 'info' ? color : undefined }}>
                <Info className="h-3.5 w-3.5" />Данные
              </button>
            )}
            {hasTasks && (
              <button onClick={() => setTab('tasks')}
                className="px-3 pb-2 text-xs font-medium transition-colors flex items-center gap-1.5"
                style={{ borderBottom: tab === 'tasks' ? `2px solid ${color}` : '2px solid transparent', color: tab === 'tasks' ? color : undefined }}>
                <Layers className="h-3.5 w-3.5" />Задачи
              </button>
            )}
          </div>

          {tab === 'info' && hasFacts && (
            <ul className="space-y-2">
              {item.facts!.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ background: color }} />
                  <span className="text-muted-foreground leading-snug">{f}</span>
                </li>
              ))}
            </ul>
          )}

          {tab === 'tasks' && hasTasks && (
            <ul className="space-y-2">
              {item.tasks!.map((t, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ background: color }} />
                  <span className="text-muted-foreground leading-snug">{t}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Main ─────────────────────────────────────────────────────────────────── */

// Build a flat map for quick lookups
const ALL_ITEMS: Record<string, NavItem> = {}
NAV_TREE.forEach((sec) => {
  sec.items.forEach((i) => { ALL_ITEMS[i.id] = i })
  sec.subSections?.forEach((ss) => ss.items.forEach((i) => { ALL_ITEMS[i.id] = i }))
})

export default function CompanyStructure() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [activeId, setActiveId] = useState('kegoc')
  const active = ALL_ITEMS[activeId] ?? KEGOC_ROOT

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)]">

      {/* Top header + stats */}
      <div className="px-6 pt-4 pb-4 border-b">
        <div className="mb-3">
          <h1 className="text-xl font-bold tracking-tight">Структура компании</h1>
          <p className="text-xs text-muted-foreground mt-0.5">АО «KEGOC» · Национальная электрическая сеть Республики Казахстан</p>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {statsRow(isDark)}
        </div>
      </div>

      {/* Two-column body */}
      <div className="flex flex-1 min-h-0">

        {/* Left nav */}
        <aside className="w-56 shrink-0 border-r overflow-y-auto p-3 space-y-1"
          style={{ background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)' }}>
          {NAV_TREE.map((sec) => (
            <NavSection key={sec.id} sec={sec} activeId={activeId} onSelect={(item) => setActiveId(item.id)} />
          ))}
        </aside>

        {/* Right detail */}
        <main className="flex-1 overflow-y-auto p-6">
          <DetailPanel key={activeId} item={active} isDark={isDark} />
        </main>

      </div>
    </div>
  )
}

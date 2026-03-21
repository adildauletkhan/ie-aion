import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Activity, BarChart3, Brain, Globe, Layers, LineChart,
  Map, Monitor, Shield, Zap, ArrowRight, Lightbulb, TrendingUp,
  Lock, Eye, FileText, Link2, Droplets, ChevronDown, ChevronLeft, ChevronRight, Phone,
  Clock, DollarSign, AlertTriangle, CheckCircle,
} from "lucide-react";

type Lang = "ru" | "en";

const T: Record<Lang, Record<string, string>> = {
  ru: {
    heroOverline: "ЦИФРОВАЯ ПЛАТФОРМА ДЛЯ НЕФТЕГАЗОВОЙ ОТРАСЛИ",
    heroTitle1: "Интегрированная",
    heroTitle2: "производственная программа",
    heroSub: "Управление нефтегазовыми активами на базе цифрового двойника — от пласта до точки реализации. Производственное планирование, сценарный анализ, 3D-визуализация и AI-интеллект в единой платформе.",
    navAbout: "О платформе",
    navModules: "Модули",
    navContacts: "Контакты",
    heroCta: "Войти в систему",
    heroDemo: "Запросить демо",

    aboutOverline: "О ПЛАТФОРМЕ",
    aboutTitle: "Во что обходится текущий подход",
    aboutSub: "Каждый из этих разрывов — прямые потери для предприятия",

    cost1Value: "6–8 нед.",
    cost1Title: "на формирование производственной программы",
    cost1Desc: "Ручной сбор данных из 5+ систем, многократные согласования, потеря версий",

    cost2Value: "15–30%",
    cost2Title: "отклонение план/факт по добыче",
    cost2Desc: "План не учитывает реальное состояние скважин, инфраструктуры и пластов",

    cost3Value: "₸ млрд",
    cost3Title: "упущенная оптимизация капвложений",
    cost3Desc: "Без сценарного анализа невозможно оценить альтернативы и выбрать оптимальный путь",

    cost4Value: "дни → недели",
    cost4Title: "реакция на кризисные ситуации",
    cost4Desc: "Нет моделей влияния — решения принимаются интуитивно, без просчёта последствий",

    solutionOverline: "НАШЕ РЕШЕНИЕ",
    solutionTitle: "Единая платформа, объединяющая все данные и процессы",
    solutionSub: "Три направления, которые покрывают полный цикл управления активами",

    pillar1: "Цифровой двойник",
    pillar1Desc: "3D-модель месторождения, технологические схемы, real-time телеметрия",
    pillar2: "Планирование и аналитика",
    pillar2Desc: "Производственная программа, сценарный анализ, план-факт мониторинг",
    pillar3: "AI-интеллект",
    pillar3Desc: "Валидация планов, кризисный анализ, RAG-чат по данным",

    metric1Value: "70%",
    metric1Label: "экономия времени для подготовки плана",
    metric2Value: "5 лет",
    metric2Label: "горизонт планирования",
    metric3Value: "4+",
    metric3Label: "внешних системы интеграции",
    metric4Value: "AI",
    metric4Label: "GPT-4o для анализа и рекомендаций",

    journeyOverline: "ПУТЬ ПОЛЬЗОВАТЕЛЯ",
    journeyTitle: "Полный цикл — от цифрового двойника до решений",
    journeySub: "7 шагов от оцифровки активов до принятия управленческих решений",

    step1: "Оцифровка",
    step1Role: "Инженер",
    step1Bullets: "3D-модель месторождения|Тех. схема обустройства|Оборудование, паспорта",
    step2: "Интеграция",
    step2Role: "Администратор",
    step2Bullets: "Привязка к ERP / SAP|Связь с SCADA / MES|PDMS-данные|Live цифровой двойник",
    step3: "Обзор",
    step3Role: "Руководитель",
    step3Bullets: "Дашборд KPI|Статус цепочки стоимости|Real-time мониторинг|AI-ассистент (RAG-чат)",
    step4: "Планирование",
    step4Role: "Плановик",
    step4Bullets: "Производственная программа|12 разделов × 5 лет|На основе реальных мощностей|Согласование (workflow)",
    step5: "AI-валидация",
    step5Role: "AI + Плановик",
    step5Bullets: "Проверка по 6 направлениям|Мощности, запасы, бюджет|Кадры, регулятор|AI-рекомендации",
    step6: "Сценарии",
    step6Role: "Аналитик",
    step6Bullets: "What-if анализ|Влияние рисков и кризисов|Сравнение сценариев|Оптимизация решений",
    step7: "Решение",
    step7Role: "Руководство",
    step7Bullets: "Утверждение плана|План-факт контроль|Экспорт отчётов|Корректировка → цикл",

    quoteText: "Вопрос не в том, нужна ли цифровая трансформация — а в том, сколько ещё можно позволить себе без неё",

    modulesOverline: "МОДУЛИ ПЛАТФОРМЫ",
    modulesTitle: "Всё для управления нефтегазовыми активами",
    modulesSub: "Каждый модуль решает конкретную задачу — вместе они образуют единую экосистему",

    mod1: "AI Ассистент и Дашборд",
    mod1Desc: "Главный экран платформы с пятью ключевыми KPI: добыча, закачка воды, фонд скважин, обводнённость, средний дебит. AI-помощник AIgul отвечает на вопросы голосом на казахском, русском и английском языках, анализируя данные из всех модулей системы.",
    mod1Bullets: "KPI добычи в реальном времени|AI-ассистент AIgul с голосовым интерфейсом|Быстрый доступ ко всем модулям|Запуск сценариев прямо из чата",

    mod2: "3D Модели скважин",
    mod2Desc: "Интерактивная 3D-схема конструкции скважины: обсадные колонны, НКТ, насосное оборудование (ШГН, ЭЦН, ЭВН), перфорация. Справа — динамограмма с диагностикой, индикаторы состояния и история ремонтов. Вращение, зум и навигация по стволу.",
    mod2Bullets: "Три типа насосов: ШГН, ЭЦН, ЭВН|Динамограмма с AI-диагностикой|Геологический разрез вдоль ствола|Телеметрия и история ремонтов",

    mod3: "3D Геология месторождений",
    mod3Desc: "Трёхмерная модель месторождения с пластами, скважинами и изолиниями. Выбор скважины показывает траекторию ствола, пластовое давление, зенитный угол. Анимация по времени для отслеживания динамики разработки.",
    mod3Bullets: "3D-модель с пластами и рельефом|Траектория ствола скважины|Карта пласта и зоны дренирования|Временная анимация разработки",

    mod4: "Digital Twin — баланс цепочки",
    mod4Desc: "Визуальная цепочка: Добыча → Транспорт → Переработка → Экспорт. Каждое звено показывает мощность, загрузку и резерв. Система автоматически определяет узкое место и даёт рекомендации по оптимизации.",
    mod4Bullets: "Визуальный поток по 4 звеньям|Автоопределение узкого места|Цветовая индикация загрузки|Рекомендации по оптимизации",

    mod5: "Планирование и План-факт",
    mod5Desc: "Производственный план с 12 разделами: от геологоразведки до капитального строительства. План-факт анализ сравнивает плановые и фактические показатели по источникам данных (SAP, SCADA, ручной ввод) с визуализацией отклонений.",
    mod5Bullets: "12 разделов производственной программы|Маршрут согласования и статусы|План-факт с источниками данных|Помесячная динамика исполнения",

    mod6: "Технологическая карта и оборудование",
    mod6Desc: "Схема месторождения с объектами: скважины, трубопроводы, ДНС, АГЗУ, УППН, БКНС. Отдельные схемы оборудования — от подготовки нефти до факельных систем. Редактор для создания и кастомизации схем.",
    mod6Bullets: "Интерактивная карта месторождения|Схемы оборудования (УППН, ДНС, АГЗУ)|Редактор технологических карт|Drag & drop размещение объектов",

    mod7: "Сценарии",
    mod7Desc: "Создание и сравнение сценариев: падение цены на нефть, ограничения ОПЕК, отказ оборудования. Каждый сценарий запускается через Digital Twin для расчёта GAP, утилизации и определения bottleneck. Результаты в сводной таблице.",
    mod7Bullets: "Библиотека готовых сценариев|Запуск через Digital Twin|Сравнение GAP и утилизации|Статусы и версионирование",

    mod8: "Обратное распределение",
    mod8Desc: "8 методов распределения объёмов по скважинам: пропорциональный, равномерный, весовой, по данным исследований, сетевой, Monte Carlo, ML-рекомендации, многопластовый. Аналитика: рейтинг скважин, коэффициент Джини, распределение по пластам.",
    mod8Bullets: "8 методов включая ML и Monte Carlo|Рейтинг скважин по объёму|Коэффициент концентрации (Джини)|Экспорт результатов в CSV",

    mod9: "Кризисное реагирование",
    mod9Desc: "Регистрация событий: геополитика, авария, стихия. Паспорт события с описанием, воздействием на мощности и автогенерацией сценариев реагирования. План исполнения с фазами, исполнителями, сроками и мониторингом прогресса.",
    mod9Bullets: "Паспорт события с AI-генерацией|Сценарии реагирования (A/B/C)|План исполнения по фазам|Мониторинг прогресса в реальном времени",

    mod10: "Каротажи и ML-дообогащение",
    mod10Desc: "Загрузка LAS/LIS файлов, визуализация кривых каротажа. ML-модель автоматически заполняет пропуски в данных и генерирует синтетические кривые. Сравнение оригинала и дообогащённых данных.",
    mod10Bullets: "Импорт LAS/LIS файлов|ML-заполнение пропусков|Синтетические кривые каротажа|Визуальное сравнение до/после",

    mod11: "Интеграции",
    mod11Desc: "Подключение внешних систем: SAP S/4HANA, SCADA/MES, Bloomberg, Excel. Настройка маппинга полей, расписания синхронизации, мониторинг статусов. Модульная архитектура SAP: PP, SD, FI, MM, PM, PS, FM.",
    mod11Bullets: "SAP S/4HANA (7 модулей)|SCADA/MES интеграция|Bloomberg Market Data|Мониторинг статусов подключений",

    mod12: "Интегрированная модель",
    mod12Desc: "Сквозная визуализация потоков: пласт → скважины → ДНС → РВС → экспорт. KPI по каждому пласту: дебит нефти, закачка, обводнённость. Детализация до уровня отдельной скважины с показателями.",
    mod12Bullets: "Потоки от пласта до экспорта|KPI по каждому пласту|Детализация по скважинам|Суммарные показатели добычи",

    featuresTitle: "Почему Integrated Enterprise?",
    featuresSub: "Технологическое превосходство для цифровой трансформации",
    feat1: "AI-аналитика",  feat1Desc: "AI-ассистент с голосовым интерфейсом на 3 языках.",
    feat2: "Реальное время",  feat2Desc: "Мониторинг KPI и телеметрии с автообновлением.",
    feat3: "3D-визуализация",  feat3Desc: "3D-модели скважин, месторождений, оборудования.",
    feat4: "Сценарное моделирование",  feat4Desc: "Множественные сценарии с расчётом балансов.",
    feat5: "Безопасность",  feat5Desc: "Ролевая модель, аудит, шифрование данных.",
    feat6: "Масштабируемость",  feat6Desc: "Облачная архитектура, тысячи пользователей.",

    techTitle: "Технологический стек",
    techSub: "Построено на современных технологиях",
    ctaTitle: "Запросите демонстрацию",
    ctaSub: "Оставьте контакты — мы свяжемся с вами и покажем платформу в действии",
    demoName: "Имя",
    demoEmail: "Email",
    demoCompany: "Компания",
    demoPhone: "Телефон",
    demoMessage: "Комментарий (необязательно)",
    demoSubmit: "Отправить заявку",
    demoSending: "Отправка...",
    demoSuccess: "Заявка отправлена! Мы свяжемся с вами в ближайшее время.",
    demoError: "Ошибка отправки. Попробуйте ещё раз или напишите нам напрямую.",
    footer: "Integrated Enterprise",
    footerDesc: "Цифровая платформа управления нефтегазовыми активами",
    footerCountry: "Казахстан, Астана",
    footerRights: "Все права защищены.",
  },
  en: {
    heroOverline: "DIGITAL PLATFORM FOR OIL & GAS INDUSTRY",
    heroTitle1: "Integrated",
    heroTitle2: "Production Program",
    heroSub: "Oil & gas asset management powered by a digital twin — from reservoir to point of sale. Production planning, scenario analysis, 3D visualization and AI intelligence in a single platform.",
    navAbout: "About",
    navModules: "Modules",
    navContacts: "Contacts",
    heroCta: "Sign In",
    heroDemo: "Request Demo",

    aboutOverline: "ABOUT THE PLATFORM",
    aboutTitle: "The Cost of the Current Approach",
    aboutSub: "Each of these gaps means direct losses for the enterprise",

    cost1Value: "6–8 wks",
    cost1Title: "to build a production program",
    cost1Desc: "Manual data collection from 5+ systems, multiple approvals, version loss",

    cost2Value: "15–30%",
    cost2Title: "plan vs fact deviation in production",
    cost2Desc: "Plan doesn't account for real well, infrastructure & reservoir conditions",

    cost3Value: "$M+",
    cost3Title: "missed capex optimization",
    cost3Desc: "Without scenario analysis it's impossible to evaluate alternatives and pick the optimal path",

    cost4Value: "days → weeks",
    cost4Title: "crisis response time",
    cost4Desc: "No impact models — decisions are made intuitively, without calculating consequences",

    solutionOverline: "OUR SOLUTION",
    solutionTitle: "One platform uniting all data and processes",
    solutionSub: "Three pillars covering the full asset management cycle",

    pillar1: "Digital Twin",
    pillar1Desc: "3D field model, technology schemes, real-time telemetry",
    pillar2: "Planning & Analytics",
    pillar2Desc: "Production program, scenario analysis, plan-fact monitoring",
    pillar3: "AI Intelligence",
    pillar3Desc: "Plan validation, crisis analysis, RAG-chat over data",

    metric1Value: "70%",
    metric1Label: "time savings in plan preparation",
    metric2Value: "5 yrs",
    metric2Label: "planning horizon",
    metric3Value: "4+",
    metric3Label: "external system integrations",
    metric4Value: "AI",
    metric4Label: "GPT-4o for analysis & recommendations",

    journeyOverline: "USER JOURNEY",
    journeyTitle: "Full cycle — from digital twin to decisions",
    journeySub: "7 steps from asset digitization to management decisions",

    step1: "Digitization",
    step1Role: "Engineer",
    step1Bullets: "3D field model|Facility tech scheme|Equipment & passports",
    step2: "Integration",
    step2Role: "Administrator",
    step2Bullets: "Connect to ERP / SAP|Link SCADA / MES|PDMS data|Live digital twin",
    step3: "Overview",
    step3Role: "Executive",
    step3Bullets: "KPI dashboard|Value chain status|Real-time monitoring|AI assistant (RAG-chat)",
    step4: "Planning",
    step4Role: "Planner",
    step4Bullets: "Production program|12 sections × 5 years|Based on real capacities|Approval workflow",
    step5: "AI Validation",
    step5Role: "AI + Planner",
    step5Bullets: "Check across 6 dimensions|Capacities, reserves, budget|Staff, regulator|AI recommendations",
    step6: "Scenarios",
    step6Role: "Analyst",
    step6Bullets: "What-if analysis|Risk & crisis impact|Scenario comparison|Decision optimization",
    step7: "Decision",
    step7Role: "Management",
    step7Bullets: "Plan approval|Plan-fact control|Report export|Adjustment → cycle",

    quoteText: "The question isn't whether digital transformation is needed — it's how long you can afford to go without it",

    modulesOverline: "PLATFORM MODULES",
    modulesTitle: "Everything for oil & gas asset management",
    modulesSub: "Each module solves a specific task — together they form a unified ecosystem",

    mod1: "AI Assistant & Dashboard",
    mod1Desc: "Main platform screen with five key KPIs: extraction, water injection, well stock, water cut, average rate. AIgul AI assistant answers questions by voice in Kazakh, Russian and English, analyzing data from all system modules.",
    mod1Bullets: "Real-time production KPIs|AIgul voice AI assistant|Quick access to all modules|Run scenarios from chat",

    mod2: "3D Well Models",
    mod2Desc: "Interactive 3D well construction schematic: casing strings, tubing, pump equipment (SRP, ESP, PCP), perforation. Dynogram with diagnostics, condition indicators and repair history on the right panel.",
    mod2Bullets: "Three pump types: SRP, ESP, PCP|Dynogram with AI diagnostics|Geological cross-section along wellbore|Telemetry and repair history",

    mod3: "3D Field Geology",
    mod3Desc: "Three-dimensional field model with formations, wells and isolines. Well selection shows wellbore trajectory, reservoir pressure, zenith angle. Time animation for tracking development dynamics.",
    mod3Bullets: "3D model with formations & terrain|Wellbore trajectory visualization|Reservoir map & drainage zones|Time-based development animation",

    mod4: "Digital Twin — Chain Balance",
    mod4Desc: "Visual chain: Extraction → Transport → Processing → Export. Each link shows capacity, utilization and surplus. The system automatically identifies bottlenecks and provides optimization recommendations.",
    mod4Bullets: "Visual flow across 4 stages|Auto bottleneck detection|Color-coded utilization bars|Optimization recommendations",

    mod5: "Planning & Plan-Fact",
    mod5Desc: "Production plan with 12 sections: from geological exploration to capital construction. Plan-fact analysis compares planned and actual indicators by data sources (SAP, SCADA, manual) with deviation visualization.",
    mod5Bullets: "12 production program sections|Approval routing & statuses|Plan-fact with data sources|Monthly execution dynamics",

    mod6: "Technology Scheme & Equipment",
    mod6Desc: "Field scheme with facilities: wells, pipelines, booster stations, metering units, processing plants. Separate equipment diagrams — from oil processing to flare systems. Editor for creating custom schemes.",
    mod6Bullets: "Interactive field map|Equipment schemes (PPOU, BPS, GMS)|Technology scheme editor|Drag & drop object placement",

    mod7: "Scenarios",
    mod7Desc: "Create and compare scenarios: oil price drop, OPEC restrictions, equipment failure. Each scenario runs through Digital Twin to calculate GAP, utilization and bottleneck. Results in summary table.",
    mod7Bullets: "Ready-made scenario library|Run through Digital Twin|Compare GAP & utilization|Status & versioning",

    mod8: "Back Allocation",
    mod8Desc: "8 methods for well volume allocation: proportional, equal, weighted, well-test, network, Monte Carlo, ML recommendations, multi-layer. Analytics: well ranking, Gini coefficient, formation distribution.",
    mod8Bullets: "8 methods incl. ML & Monte Carlo|Well ranking by volume|Concentration coefficient (Gini)|Export results to CSV",

    mod9: "Crisis Response",
    mod9Desc: "Event registration: geopolitics, accidents, natural disasters. Event passport with description, capacity impact and auto-generated response scenarios. Execution plan with phases, assignees, deadlines and progress monitoring.",
    mod9Bullets: "Event passport with AI generation|Response scenarios (A/B/C)|Phase-based execution plan|Real-time progress monitoring",

    mod10: "Well Logs & ML Enrichment",
    mod10Desc: "Upload LAS/LIS files, visualize log curves. ML model automatically fills data gaps and generates synthetic curves. Original vs enriched data comparison.",
    mod10Bullets: "LAS/LIS file import|ML gap filling|Synthetic log curves|Visual before/after comparison",

    mod11: "Integrations",
    mod11Desc: "External system connections: SAP S/4HANA, SCADA/MES, Bloomberg, Excel. Field mapping configuration, sync scheduling, status monitoring. Modular SAP architecture: PP, SD, FI, MM, PM, PS, FM.",
    mod11Bullets: "SAP S/4HANA (7 modules)|SCADA/MES integration|Bloomberg Market Data|Connection status monitoring",

    mod12: "Integrated Model",
    mod12Desc: "End-to-end flow visualization: reservoir → wells → gathering → tanks → export. KPIs per formation: oil rate, injection, water cut. Drill-down to individual well with detailed metrics.",
    mod12Bullets: "Flows from reservoir to export|KPIs per formation|Well-level drill-down|Total production summary",

    featuresTitle: "Why Integrated Enterprise?",
    featuresSub: "Technological excellence for digital transformation",
    feat1: "AI Analytics",  feat1Desc: "AI assistant with voice interface in 3 languages.",
    feat2: "Real-Time",  feat2Desc: "KPI and telemetry monitoring with auto-refresh.",
    feat3: "3D Visualization",  feat3Desc: "3D models of wells, fields, equipment.",
    feat4: "Scenario Modeling",  feat4Desc: "Multiple scenarios with balance calculation.",
    feat5: "Security",  feat5Desc: "Role-based access, audit, data encryption.",
    feat6: "Scalability",  feat6Desc: "Cloud architecture, thousands of users.",

    techTitle: "Technology Stack",
    techSub: "Built on modern technologies",
    ctaTitle: "Request a Demo",
    ctaSub: "Leave your contacts — we'll reach out and show the platform in action",
    demoName: "Name",
    demoEmail: "Email",
    demoCompany: "Company",
    demoPhone: "Phone",
    demoMessage: "Comment (optional)",
    demoSubmit: "Submit Request",
    demoSending: "Sending...",
    demoSuccess: "Request sent! We'll get back to you shortly.",
    demoError: "Failed to send. Please try again or contact us directly.",
    footer: "Integrated Enterprise",
    footerDesc: "Digital platform for oil & gas asset management",
    footerCountry: "Kazakhstan, Astana",
    footerRights: "All rights reserved.",
  },
};

const MODULE_SECTIONS: { tKey: string; icon: React.ElementType; color: string; screens: string[] }[] = [
  { tKey: "mod1",  icon: Brain,     color: "#5CE0D6", screens: ["/screenshots/dashboard.png"] },
  { tKey: "mod2",  icon: Monitor,   color: "#A78BFA", screens: ["/screenshots/well-3d.png", "/screenshots/well-3d-vr.png", "/screenshots/dynogram-detail.png"] },
  { tKey: "mod3",  icon: Map,       color: "#4ADE80", screens: ["/screenshots/geology-3d.png"] },
  { tKey: "mod4",  icon: Activity,  color: "#60A5FA", screens: ["/screenshots/digital-twin.png"] },
  { tKey: "mod5",  icon: LineChart, color: "#FACC15", screens: ["/screenshots/planning.png", "/screenshots/plan-fact.png"] },
  { tKey: "mod6",  icon: Layers,    color: "#FB923C", screens: ["/screenshots/field-scheme.png", "/screenshots/equipment.png"] },
  { tKey: "mod7",  icon: Zap,       color: "#4ADE80", screens: ["/screenshots/scenarios.png"] },
  { tKey: "mod8",  icon: BarChart3, color: "#F472B6", screens: ["/screenshots/back-allocation.png", "/screenshots/back-allocation-results.png"] },
  { tKey: "mod9",  icon: Shield,    color: "#FB7185", screens: ["/screenshots/crisis-events.png", "/screenshots/crisis-scenarios.png", "/screenshots/crisis-plan.png"] },
  { tKey: "mod10", icon: FileText,  color: "#818CF8", screens: ["/screenshots/well-logs-ml.png"] },
  { tKey: "mod11", icon: Link2,     color: "#5CE0D6", screens: ["/screenshots/integrations.png"] },
  { tKey: "mod12", icon: Droplets,  color: "#60A5FA", screens: ["/screenshots/integrated-model.png"] },
];

const FEATURES = [
  { key: "feat1", icon: Brain, color: "#5CE0D6" },
  { key: "feat2", icon: Activity, color: "#60A5FA" },
  { key: "feat3", icon: Eye, color: "#A78BFA" },
  { key: "feat4", icon: Lightbulb, color: "#FACC15" },
  { key: "feat5", icon: Shield, color: "#4ADE80" },
  { key: "feat6", icon: TrendingUp, color: "#FB923C" },
];

const TECH = [
  { name: "React 18", desc: "Frontend", icon: "⚛️" },
  { name: "Three.js", desc: "3D Engine", icon: "🎮" },
  { name: "FastAPI", desc: "Backend", icon: "🐍" },
  { name: "PostgreSQL", desc: "Database", icon: "🐘" },
  { name: "OpenAI", desc: "AI / TTS", icon: "🤖" },
  { name: "Docker", desc: "Deploy", icon: "🐳" },
];


function ScreenCarousel({ screens, color }: { screens: string[]; color: string }) {
  const [idx, setIdx] = useState(0);
  const prev = useCallback(() => setIdx((i) => (i - 1 + screens.length) % screens.length), [screens.length]);
  const next = useCallback(() => setIdx((i) => (i + 1) % screens.length), [screens.length]);

  if (screens.length === 1) {
    return (
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)", boxShadow: `0 4px 24px ${color}08` }}>
        <img src={screens[0]} alt="" className="w-full block" loading="lazy" />
      </div>
    );
  }

  return (
    <div className="relative group/carousel">
      <div className="rounded-xl overflow-hidden relative" style={{ border: "1px solid rgba(255,255,255,0.06)", boxShadow: `0 4px 24px ${color}08` }}>
        {screens.map((src, i) => (
          <img key={i} src={src} alt=""
            className="w-full block transition-opacity duration-500"
            loading="lazy"
            style={{
              opacity: i === idx ? 1 : 0,
              position: i === 0 ? "relative" : "absolute",
              top: 0, left: 0,
            }} />
        ))}

        <button onClick={prev}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", color: "#fff" }}>
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button onClick={next}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", color: "#fff" }}>
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="flex justify-center gap-2 mt-3">
        {screens.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)}
            className="w-2 h-2 rounded-full transition-all duration-300"
            style={{ background: i === idx ? color : "rgba(255,255,255,0.15)", transform: i === idx ? "scale(1.3)" : "scale(1)" }} />
        ))}
      </div>
    </div>
  );
}

export default function Landing() {
  const [lang, setLang] = useState<Lang>("ru");
  const t = (key: string) => T[lang][key] ?? key;
  const [demoStatus, setDemoStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  const handleDemo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDemoStatus("sending");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("https://formsubmit.co/ajax/adildauletkhan@gmail.com", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          email: fd.get("email"),
          company: fd.get("company"),
          phone: fd.get("phone"),
          message: fd.get("message"),
          _subject: "Новая заявка на демо — Integrated Enterprise",
        }),
      });
      setDemoStatus(res.ok ? "success" : "error");
    } catch {
      setDemoStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-[#050a14] text-white overflow-x-hidden">

      {/* ═══ NAV ═══ */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 lg:px-12 py-4"
        style={{ background: "rgba(5,10,20,0.80)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-3 cursor-pointer">
          <img src="/logo.svg" alt="" className="h-8 w-8" />
          <span className="text-lg font-bold tracking-tight hidden sm:block">Integrated Enterprise</span>
        </button>

        <div className="hidden md:flex items-center gap-6">
          {/* About */}
          <button onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="text-sm font-medium text-white/70 hover:text-white transition-colors">
            {t("navAbout")}
          </button>

          {/* Modules dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-1 text-sm font-medium text-white/70 hover:text-white transition-colors">
              {t("navModules")} <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" />
            </button>
            <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200
              absolute top-full left-1/2 -translate-x-1/2 pt-3 w-72">
              <div className="rounded-xl py-2 max-h-[70vh] overflow-y-auto"
                style={{ background: "rgba(10,18,36,0.95)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 16px 48px rgba(0,0,0,0.5)" }}>
                {MODULE_SECTIONS.map((mod, idx) => {
                  const MIcon = mod.icon;
                  return (
                    <a key={mod.tKey} href={`#${mod.tKey}`}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={(e) => { e.preventDefault(); document.getElementById(mod.tKey)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `${mod.color}15`, color: mod.color }}>
                        <MIcon className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs text-white/70 hover:text-white">
                        <span className="text-white/30 mr-1.5">{String(idx + 1).padStart(2, "0")}</span>
                        {t(mod.tKey)}
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Contacts */}
          <button onClick={() => document.getElementById("contacts")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="text-sm font-medium text-white/70 hover:text-white transition-colors">
            {t("navContacts")}
          </button>

          {/* Request Demo */}
          <button onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="text-sm font-medium text-white/70 hover:text-white transition-colors">
            {t("heroDemo")}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setLang(lang === "ru" ? "en" : "ru")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ border: "1px solid rgba(92,224,214,0.25)", color: "#5CE0D6", background: "rgba(92,224,214,0.06)" }}>
            <Globe className="h-3.5 w-3.5" />{lang === "ru" ? "EN" : "RU"}
          </button>
          <Link to="/login" className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}>
            <Lock className="h-3.5 w-3.5" />{t("heroCta")}
          </Link>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative pt-32 pb-20 lg:pt-44 lg:pb-28 px-6 lg:px-12">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-[600px] h-[600px] -top-40 -right-40 rounded-full" style={{ background: "radial-gradient(circle,rgba(92,224,214,0.08) 0%,transparent 60%)" }} />
          <div className="absolute w-[400px] h-[400px] top-1/2 -left-40 rounded-full" style={{ background: "radial-gradient(circle,rgba(59,130,246,0.06) 0%,transparent 60%)" }} />
          <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(rgba(92,224,214,0.05) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />
        </div>
        <div className="relative max-w-6xl mx-auto">
          <div className="max-w-3xl">
            <p className="text-xs font-bold tracking-[0.3em] mb-6" style={{ color: "#5CE0D6" }}>{t("heroOverline")}</p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] mb-6">
              {t("heroTitle1")}<br />
              <span style={{ background: "linear-gradient(90deg,#5CE0D6,#3B82F6,#A78BFA)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {t("heroTitle2")}
              </span>
            </h1>
            <p className="text-lg text-white/60 max-w-2xl mb-10 leading-relaxed">{t("heroSub")}</p>
            <button onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-bold transition-all"
              style={{ background: "linear-gradient(135deg,#5CE0D6,#3B82F6)", boxShadow: "0 4px 24px rgba(92,224,214,0.3)" }}>
              {t("heroDemo")} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          {/* Hero screenshot */}
          <div className="mt-16 relative">
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 20px 80px rgba(0,0,0,0.5),0 0 40px rgba(92,224,214,0.08)" }}>
              <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(5,10,20,0.9)" }}>
                <span className="w-3 h-3 rounded-full bg-red-500/60" /><span className="w-3 h-3 rounded-full bg-yellow-500/60" /><span className="w-3 h-3 rounded-full bg-green-500/60" />
                <span className="text-[11px] text-white/25 font-mono ml-4">app.integrated-enterprise.kz</span>
              </div>
              <img src="/screenshots/dashboard.png" alt="Dashboard" className="w-full block" loading="eager" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#050a14] to-transparent" />
          </div>
        </div>
      </section>

      {/* ═══ ABOUT — COST OF CURRENT APPROACH ═══ */}
      <section id="about" className="py-24 px-6 lg:px-12 relative scroll-mt-20">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute w-[500px] h-[500px] top-20 -right-60 rounded-full" style={{ background: "radial-gradient(circle,rgba(92,224,214,0.05) 0%,transparent 60%)" }} />
        </div>
        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold tracking-[0.3em] mb-3" style={{ color: "#FB7185" }}>{t("aboutOverline")}</p>
            <h2 className="text-3xl lg:text-4xl font-extrabold mb-4">{t("aboutTitle")}</h2>
            <p className="text-white/40 max-w-xl mx-auto">{t("aboutSub")}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
            {([
              { key: "cost1", icon: Clock,          color: "#FB923C" },
              { key: "cost2", icon: AlertTriangle,  color: "#FB7185" },
              { key: "cost3", icon: DollarSign,     color: "#FACC15" },
              { key: "cost4", icon: Zap,            color: "#A78BFA" },
            ] as const).map((c) => {
              const CIcon = c.icon;
              return (
                <div key={c.key} className="rounded-2xl p-6 group hover:-translate-y-1 transition-all duration-300"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${c.color}12`, color: c.color }}>
                      <CIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-2xl lg:text-3xl font-extrabold mb-0.5" style={{ color: c.color }}>{t(`${c.key}Value`)}</div>
                      <h3 className="text-sm font-bold mb-2">{t(`${c.key}Title`)}</h3>
                      <p className="text-xs text-white/35 leading-relaxed">{t(`${c.key}Desc`)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center py-8">
            <p className="text-sm italic max-w-2xl mx-auto" style={{ color: "#5CE0D6" }}>
              &ldquo;{t("quoteText")}&rdquo;
            </p>
          </div>
        </div>
      </section>

      {/* ═══ OUR SOLUTION — 3 PILLARS ═══ */}
      <section className="py-24 px-6 lg:px-12" style={{ background: "rgba(255,255,255,0.01)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold tracking-[0.3em] mb-3" style={{ color: "#5CE0D6" }}>{t("solutionOverline")}</p>
            <h2 className="text-3xl lg:text-4xl font-extrabold mb-4">{t("solutionTitle")}</h2>
            <p className="text-white/40 max-w-xl mx-auto">{t("solutionSub")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
            {([
              { key: "pillar1", icon: Activity,  color: "#60A5FA", gradient: "linear-gradient(135deg,rgba(96,165,250,0.12),rgba(96,165,250,0.03))" },
              { key: "pillar2", icon: LineChart,  color: "#A78BFA", gradient: "linear-gradient(135deg,rgba(167,139,250,0.12),rgba(167,139,250,0.03))" },
              { key: "pillar3", icon: Brain,      color: "#5CE0D6", gradient: "linear-gradient(135deg,rgba(92,224,214,0.12),rgba(92,224,214,0.03))" },
            ] as const).map((pl) => {
              const PLIcon = pl.icon;
              return (
                <div key={pl.key} className="rounded-2xl p-8 text-center group hover:-translate-y-1 transition-all duration-300"
                  style={{ background: pl.gradient, border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                    style={{ background: `${pl.color}18`, color: pl.color }}>
                    <PLIcon className="h-7 w-7" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{t(pl.key)}</h3>
                  <p className="text-sm text-white/45 leading-relaxed">{t(`${pl.key}Desc`)}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {([
              { key: "metric1", color: "#5CE0D6" },
              { key: "metric2", color: "#A78BFA" },
              { key: "metric3", color: "#4ADE80" },
              { key: "metric4", color: "#FACC15" },
            ] as const).map((m) => (
              <div key={m.key} className="rounded-xl p-5 text-center"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="text-2xl lg:text-3xl font-extrabold mb-1" style={{ color: m.color }}>{t(`${m.key}Value`)}</div>
                <div className="text-xs text-white/40">{t(`${m.key}Label`)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ USER JOURNEY — 7 STEPS ═══ */}
      <section className="py-24 px-6 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold tracking-[0.3em] mb-3" style={{ color: "#A78BFA" }}>{t("journeyOverline")}</p>
            <h2 className="text-3xl lg:text-4xl font-extrabold mb-4">{t("journeyTitle")}</h2>
            <p className="text-white/40 max-w-xl mx-auto">{t("journeySub")}</p>
          </div>

          <div className="relative">

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              {([
                { key: "step1", num: 1, color: "#4ADE80" },
                { key: "step2", num: 2, color: "#60A5FA" },
                { key: "step3", num: 3, color: "#5CE0D6" },
                { key: "step4", num: 4, color: "#A78BFA" },
              ] as const).map((s) => {
                const bullets = (t(`${s.key}Bullets`) ?? "").split("|").filter(Boolean);
                return (
                  <div key={s.key} className="rounded-2xl p-5 relative"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-extrabold"
                        style={{ background: `${s.color}18`, color: s.color }}>{s.num}</div>
                      <div>
                        <h4 className="text-sm font-bold">{t(s.key)}</h4>
                        <span className="text-[10px] italic" style={{ color: s.color }}>{t(`${s.key}Role`)}</span>
                      </div>
                    </div>
                    <ul className="space-y-1.5">
                      {bullets.map((b, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs">
                          <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: s.color }} />
                          <span className="text-white/50">{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-center mb-8 lg:hidden">
              <ArrowRight className="h-5 w-5 text-white/20" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:max-w-[75%] lg:mx-auto">
              {([
                { key: "step5", num: 5, color: "#FB923C" },
                { key: "step6", num: 6, color: "#FB7185" },
                { key: "step7", num: 7, color: "#FACC15" },
              ] as const).map((s) => {
                const bullets = (t(`${s.key}Bullets`) ?? "").split("|").filter(Boolean);
                return (
                  <div key={s.key} className="rounded-2xl p-5 relative"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-extrabold"
                        style={{ background: `${s.color}18`, color: s.color }}>{s.num}</div>
                      <div>
                        <h4 className="text-sm font-bold">{t(s.key)}</h4>
                        <span className="text-[10px] italic" style={{ color: s.color }}>{t(`${s.key}Role`)}</span>
                      </div>
                    </div>
                    <ul className="space-y-1.5">
                      {bullets.map((b, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs">
                          <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: s.color }} />
                          <span className="text-white/50">{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ MODULE SECTIONS ═══ */}
      <section className="py-24 px-6 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-xs font-bold tracking-[0.3em] mb-3" style={{ color: "#5CE0D6" }}>{t("modulesOverline")}</p>
            <h2 className="text-3xl lg:text-4xl font-extrabold mb-4">{t("modulesTitle")}</h2>
            <p className="text-white/40 max-w-xl mx-auto">{t("modulesSub")}</p>
          </div>

          <div className="space-y-28">
            {MODULE_SECTIONS.map((mod, idx) => {
              const Icon = mod.icon;
              const bullets = (t(`${mod.tKey}Bullets`) ?? "").split("|").filter(Boolean);
              const reverse = idx % 2 === 1;

              return (
                <div id={mod.tKey} key={mod.tKey} className={`flex flex-col ${reverse ? "lg:flex-row-reverse" : "lg:flex-row"} gap-10 lg:gap-16 items-center scroll-mt-24`}>
                  {/* Text side */}
                  <div className="lg:w-[42%] shrink-0">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: `${mod.color}15`, color: mod.color }}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: mod.color }}>
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold mb-3">{t(mod.tKey)}</h3>
                    <p className="text-sm text-white/50 leading-relaxed mb-5">{t(`${mod.tKey}Desc`)}</p>
                    <ul className="space-y-2">
                      {bullets.map((b, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: mod.color }} />
                          <span className="text-white/65">{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Screenshots side */}
                  <div className="lg:w-[58%]">
                    <ScreenCarousel screens={mod.screens} color={mod.color} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section className="py-24 px-6 lg:px-12" style={{ background: "rgba(255,255,255,0.01)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold tracking-[0.3em] mb-3" style={{ color: "#FACC15" }}>ADVANTAGES</p>
            <h2 className="text-3xl lg:text-4xl font-extrabold mb-4">{t("featuresTitle")}</h2>
            <p className="text-white/40 max-w-lg mx-auto">{t("featuresSub")}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {FEATURES.map((f) => {
              const FIcon = f.icon;
              return (
                <div key={f.key} className="rounded-2xl p-5 text-center"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3"
                    style={{ background: `${f.color}12`, color: f.color }}>
                    <FIcon className="h-4 w-4" />
                  </div>
                  <h3 className="text-xs font-bold mb-1">{t(f.key)}</h3>
                  <p className="text-[10px] text-white/35 leading-relaxed">{t(`${f.key}Desc`)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ TECH ═══ */}
      <section className="py-20 px-6 lg:px-12 border-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-2">{t("techTitle")}</h2>
            <p className="text-sm text-white/35">{t("techSub")}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {TECH.map((tech, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="text-xl">{tech.icon}</span>
                <div><div className="text-sm font-bold">{tech.name}</div><div className="text-[10px] text-white/30">{tech.desc}</div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ DEMO FORM ═══ */}
      <section id="demo" className="py-24 px-6 lg:px-12 scroll-mt-20">
        <div className="max-w-2xl mx-auto rounded-3xl p-10 lg:p-14 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg,rgba(92,224,214,0.08),rgba(59,130,246,0.08))", border: "1px solid rgba(92,224,214,0.15)" }}>
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(92,224,214,0.04) 1px,transparent 1px)", backgroundSize: "32px 32px" }} />
          <div className="relative">
            <div className="text-center mb-10">
              <h2 className="text-3xl lg:text-4xl font-extrabold mb-4">{t("ctaTitle")}</h2>
              <p className="text-white/50 max-w-lg mx-auto">{t("ctaSub")}</p>
            </div>

            {demoStatus === "success" ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(74,222,128,0.12)" }}>
                  <CheckCircle className="h-8 w-8" style={{ color: "#4ADE80" }} />
                </div>
                <p className="text-lg font-semibold" style={{ color: "#4ADE80" }}>{t("demoSuccess")}</p>
              </div>
            ) : (
              <form onSubmit={handleDemo} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/50 mb-1.5">{t("demoName")} *</label>
                    <input name="name" required
                      className="w-full px-4 py-3 rounded-xl text-sm bg-white/5 text-white placeholder-white/25 outline-none focus:ring-2 transition-all"
                      style={{ border: "1px solid rgba(255,255,255,0.08)", focusRing: "rgba(92,224,214,0.4)" }}
                      onFocus={(e) => e.currentTarget.style.borderColor = "rgba(92,224,214,0.4)"}
                      onBlur={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/50 mb-1.5">{t("demoEmail")} *</label>
                    <input name="email" type="email" required
                      className="w-full px-4 py-3 rounded-xl text-sm bg-white/5 text-white placeholder-white/25 outline-none transition-all"
                      style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                      onFocus={(e) => e.currentTarget.style.borderColor = "rgba(92,224,214,0.4)"}
                      onBlur={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/50 mb-1.5">{t("demoCompany")} *</label>
                    <input name="company" required
                      className="w-full px-4 py-3 rounded-xl text-sm bg-white/5 text-white placeholder-white/25 outline-none transition-all"
                      style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                      onFocus={(e) => e.currentTarget.style.borderColor = "rgba(92,224,214,0.4)"}
                      onBlur={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/50 mb-1.5">{t("demoPhone")}</label>
                    <input name="phone" type="tel"
                      className="w-full px-4 py-3 rounded-xl text-sm bg-white/5 text-white placeholder-white/25 outline-none transition-all"
                      style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                      onFocus={(e) => e.currentTarget.style.borderColor = "rgba(92,224,214,0.4)"}
                      onBlur={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/50 mb-1.5">{t("demoMessage")}</label>
                  <textarea name="message" rows={3}
                    className="w-full px-4 py-3 rounded-xl text-sm bg-white/5 text-white placeholder-white/25 outline-none resize-none transition-all"
                    style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                    onFocus={(e) => e.currentTarget.style.borderColor = "rgba(92,224,214,0.4)"}
                    onBlur={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"} />
                </div>

                {demoStatus === "error" && (
                  <p className="text-sm text-center" style={{ color: "#FB7185" }}>{t("demoError")}</p>
                )}

                <div className="text-center pt-2">
                  <button type="submit" disabled={demoStatus === "sending"}
                    className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-base font-bold transition-all disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg,#5CE0D6,#3B82F6)", boxShadow: "0 4px 30px rgba(92,224,214,0.3)" }}>
                    {demoStatus === "sending" ? t("demoSending") : t("demoSubmit")} <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer id="contacts" className="py-12 px-6 lg:px-12 border-t scroll-mt-20" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-8">
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="" className="h-7 w-7" />
              <div>
                <div className="text-sm font-bold">{t("footer")}</div>
                <div className="text-[10px] text-white/25">{t("footerDesc")}</div>
              </div>
            </div>
            <div className="space-y-2 text-sm text-white/45">
              <div className="font-semibold text-white/70 mb-1">{t("navContacts")}</div>
              <div>{t("footerCountry")}</div>
              <a href="tel:+77779994366" className="flex items-center gap-1.5 hover:text-white/70 transition-colors">
                <Phone className="h-3 w-3" /> +7 777 999 43 66
              </a>
              <a href="mailto:adildauletkhan@gmail.com" className="hover:text-white/70 transition-colors">
                adildauletkhan@gmail.com
              </a>
            </div>
          </div>
          <div className="pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-xs text-white/25">© {new Date().getFullYear()} {t("footer")}. {t("footerRights")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

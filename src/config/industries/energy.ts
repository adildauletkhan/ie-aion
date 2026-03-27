import type { IndustryPack } from './index'

export const energyPack: IndustryPack = {
  id: 'energy',
  label: 'Электроэнергетика',
  description: 'Системный оператор ЕЭС Республики Казахстан — передача, диспетчеризация, балансирующий рынок',
  assetHierarchy: ['ЕЭС РК', 'Зональная энергосистема', 'Подстанция НЭС', 'Объект/Присоединение'],
  kpis: [
    { id: 'installed_capacity',    label: 'Установленная мощность',   unit: 'МВт'    },
    { id: 'available_capacity',    label: 'Располагаемая мощность',   unit: 'МВт'    },
    { id: 'transmission_volume',   label: 'Объём передачи по НЭС',    unit: 'ГВт·ч'  },
    { id: 'losses',                label: 'Потери в НЭС',             unit: '%'      },
    { id: 'frequency_deviation',   label: 'Отклонение частоты',       unit: 'Гц'     },
    { id: 'equipment_availability',label: 'Готовность оборудования',  unit: '%'      },
    { id: 'renewable_share',       label: 'Доля ВИЭ в выработке',     unit: '%'      },
    { id: 'balancing_market_vol',  label: 'Объём БРЭ',                unit: 'МВт·ч'  },
    { id: 'import_export_balance', label: 'Сальдо перетоков',         unit: 'МВт·ч'  },
  ],
  modules: [
    { id: 'dashboard',      label: 'Главная',                  icon: 'LayoutDashboard', route: '/'             },
    { id: 'predictive',     label: 'Предиктивная аналитика',   icon: 'BrainCircuit',    route: '/predictive'   },
    { id: 'daily_briefing', label: 'Суточная справка',         icon: 'FileText',        route: '/briefing'     },
    { id: 'green_grid',     label: 'Green Grid / ПУЭ',         icon: 'Leaf',            route: '/green-grid'   },
    { id: 'energy_map',     label: 'Карта ЕЭС',               icon: 'Map',             route: '/energy-map'   },
    { id: 'company',            label: 'Структура компании',       icon: 'Building2',  route: '/company-structure'  },
    { id: 'production_program', label: 'Производственная программа', icon: 'BarChart3', route: '/production-program' },
    { id: 'digital_twin',   label: 'Цифровой двойник НЭС',     icon: 'Box',             route: '/digital-twin' },
    { id: 'crisis',         label: 'Кризис-центр',             icon: 'AlertTriangle',   route: '/crisis-response' },
    { id: 'planning',       label: 'Планирование',             icon: 'Calendar',        route: '/planning'     },
    { id: 'integrations',   label: 'Интеграции',               icon: 'Plug',            route: '/integrations' },
  ],
  integrations: ['EMS / SCADA KEGOC', 'АО КОРЭМ (БРЭ)', 'РФЦ ВИЭ (Единый закупщик)', 'АСКУЭ', 'SAP PM', 'СОТИАССО'],
}

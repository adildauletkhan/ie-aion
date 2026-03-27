import type { IndustryPack } from './index'

export const miningPack: IndustryPack = {
  id: 'mining',
  label: 'Горнодобыча',
  description: 'Добыча и переработка твёрдых полезных ископаемых — медь, железо, цинк, золото',
  assetHierarchy: ['ГМК / Концерн', 'Регион / Рудник', 'Участок / Горизонт', 'Забой / Блок'],
  kpis: [
    { id: 'ore_extraction',     label: 'Добыча руды',              unit: 'т/сут'    },
    { id: 'ore_grade',          label: 'Содержание Cu в руде',     unit: '%'        },
    { id: 'cathode_production', label: 'Производство Cu катодной', unit: 'т/сут'    },
    { id: 'strip_ratio',        label: 'Коэффициент вскрыши',      unit: 'м³/т'     },
    { id: 'fleet_availability', label: 'Готовность горн. техники', unit: '%'        },
    { id: 'ltifr',              label: 'LTIFR',                    unit: 'на 1M ч.' },
    { id: 'lme_copper',         label: 'Цена Cu (LME)',            unit: '$/т'      },
    { id: 'energy_per_ton',     label: 'Расход электроэнергии',    unit: 'кВт·ч/т'  },
    { id: 'recovery_rate',      label: 'Извлечение Cu на ОФ',      unit: '%'        },
  ],
  modules: [
    { id: 'dashboard',        label: 'Главная',                     icon: 'LayoutDashboard', route: '/'                   },
    { id: 'production',       label: 'Производственные показатели', icon: 'BarChart3',       route: '/mining-production'  },
    { id: 'geology',          label: 'Геологическая база',          icon: 'Mountain',        route: '/mining-geology'     },
    { id: 'mining_map',       label: 'Карта месторождений',         icon: 'Map',             route: '/mining-map'         },
    { id: 'planning',         label: 'Горное планирование',         icon: 'Calendar',        route: '/planning'           },
    { id: 'safety',           label: 'Промбезопасность',           icon: 'HardHat',         route: '/mining-safety'      },
    { id: 'digital_twin',     label: 'Цифровой двойник',            icon: 'Box',             route: '/mining-digital-twin' },
    { id: 'crisis',           label: 'Кризис-центр',                icon: 'AlertTriangle',   route: '/mining-crisis'      },
    { id: 'integrations',     label: 'Интеграции',                  icon: 'Plug',            route: '/integrations'       },
  ],
  integrations: [
    'DISPATCH (Modular Mining)', 'Leica Geosystems', '1С:ERP ГМК',
    'SAP PM / EAM', 'OSIsoft PI', 'MINEPLAN / Datamine',
  ],
}

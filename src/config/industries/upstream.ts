import type { IndustryPack } from './index'

export const upstreamPack: IndustryPack = {
  id: 'upstream',
  label: 'Нефтегазодобыча',
  description: 'Управление добычей нефти и газа (upstream)',
  assetHierarchy: ['Компания', 'НГДУ', 'Месторождение', 'Скважина'],
  kpis: [
    { id: 'extraction_capacity', label: 'Мощность добычи',  unit: 'т/сут' },
    { id: 'water_injection',     label: 'Закачка воды',      unit: 'м³/сут' },
    { id: 'well_stock',          label: 'Фонд скважин',      unit: 'шт'    },
    { id: 'water_cut',           label: 'Обводнённость',     unit: '%'     },
    { id: 'avg_well_rate',       label: 'Средний дебит',     unit: 'т/сут' },
  ],
  modules: [
    { id: 'dashboard',       label: 'Главная',              icon: 'Home',         route: '/'              },
    { id: 'models',          label: 'Модели',               icon: 'Cuboid',       route: '/models'        },
    { id: 'back_allocation', label: 'Бэк-аллокация',        icon: 'TrendingDown', route: '/back-allocation'},
    { id: 'well_logs',       label: 'Каротаж скважин',      icon: 'FileBarChart2',route: '/well-logs'     },
    { id: 'planning',        label: 'Планирование',         icon: 'Calendar',     route: '/planning'      },
    { id: 'digital_twin',    label: 'Управление событиями', icon: 'Zap',          route: '/digital-twin'  },
    { id: 'crisis_response', label: 'Кризис-центр',         icon: 'AlertTriangle',route: '/crisis-response'},
    { id: 'master_data',     label: 'НСИ',                  icon: 'Database',     route: '/master-data'   },
    { id: 'geology',         label: 'Геология',             icon: 'BarChart3',    route: '/geology'       },
    { id: 'integrations',    label: 'Интеграции',           icon: 'Plug',         route: '/integrations'  },
  ],
  integrations: ['1С УПП', 'SAP PM', 'АСУТП', 'Landmark', 'Petrel'],
}

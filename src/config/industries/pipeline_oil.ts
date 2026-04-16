import type { IndustryPack } from './index'

export const pipelineOilPack: IndustryPack = {
  id: 'pipeline_oil',
  label: 'Нефтепроводы',
  description: 'Магистральный транспорт нефти — АО «КазТрансОйл», КМГ',
  assetHierarchy: ['КТО / Система', 'Магистраль', 'Участок / НПС', 'Объект / Узел'],
  kpis: [
    { id: 'throughput_mt',    label: 'Объём транспортировки', unit: 'млн т/год' },
    { id: 'pipeline_km',      label: 'Протяжённость НС',       unit: 'км'       },
    { id: 'pump_stations',    label: 'НПС в работе',           unit: 'ед.'      },
    { id: 'utilization_pct',  label: 'Загрузка трубы',         unit: '%'        },
    { id: 'pressure_mpa',     label: 'Рабочее давление',       unit: 'МПа'      },
    { id: 'leak_incidents',   label: 'Инцидентов',             unit: 'с начала года' },
    { id: 'export_volume',    label: 'Экспорт нефти',          unit: 'млн т/год' },
    { id: 'energy_per_ton',   label: 'Уд. расход э/э',         unit: 'кВт·ч/т'  },
  ],
  modules: [
    { id: 'dashboard',        label: 'Главная',                icon: 'LayoutDashboard', route: '/'                        },
    { id: 'pipeline_map',     label: 'Схема нефтепроводов',    icon: 'Route',           route: '/oil-pipeline-map'        },
    { id: 'monitoring',       label: 'Мониторинг потоков',      icon: 'Gauge',           route: '/oil-pipeline-monitoring' },
    { id: 'dispatching',      label: 'Диспетчерский центр',    icon: 'Activity',        route: '/oil-pipeline-dispatch'   },
    { id: 'production_plan',  label: 'Производственный план',  icon: 'FileBarChart2',   route: '/production-plan'         },
    { id: 'maintenance',      label: 'ТО и ремонты',           icon: 'Wrench',          route: '/maintenance'             },
    { id: 'safety',           label: 'Промбезопасность',       icon: 'HardHat',         route: '/oil-pipeline-incidents'  },
    { id: 'integrations',     label: 'Интеграции',             icon: 'Plug',            route: '/integrations'            },
  ],
  integrations: [
    'SCADA Schneider Electric', 'OSIsoft PI', 'SAP PM / EAM',
    'GIS Esri ArcGIS', 'АСУ ТП НПС', '1С:ERP КМГ',
  ],
}

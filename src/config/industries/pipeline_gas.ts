import type { IndustryPack } from './index'

export const pipelineGasPack: IndustryPack = {
  id: 'pipeline_gas',
  label: 'Газопроводы',
  description: 'Транспортировка и транзит газа — QazaqGas, ИЦА, ББШ',
  assetHierarchy: ['QazaqGas / Система', 'Магистраль', 'Участок / КС', 'Объект / Узел'],
  kpis: [
    { id: 'transit_bcm',      label: 'Транзит газа',           unit: 'млрд м³/год' },
    { id: 'domestic_bcm',     label: 'Подача внутри РК',       unit: 'млрд м³/год' },
    { id: 'cs_operational',   label: 'КС в работе',            unit: 'ед.'         },
    { id: 'pressure_mpa',     label: 'Давление в сети',        unit: 'МПа'         },
    { id: 'gas_quality_ch4',  label: 'Качество газа (CH₄)',    unit: '%'           },
    { id: 'pipeline_km',      label: 'Протяжённость',          unit: 'тыс. км'     },
    { id: 'incidents',        label: 'Инцидентов',             unit: 'с нач. года' },
    { id: 'fuel_gas_pct',     label: 'Топливный газ на КС',    unit: '%'           },
  ],
  modules: [
    { id: 'dashboard',     label: 'Главная',               icon: 'LayoutDashboard', route: '/'                        },
    { id: 'pipeline_map',  label: 'Схема газопроводов',    icon: 'Route',           route: '/gas-pipeline-map'        },
    { id: 'monitoring',    label: 'Мониторинг давления',   icon: 'Gauge',           route: '/gas-pipeline-monitoring' },
    { id: 'compressor',    label: 'Компрессорные станции', icon: 'Zap',             route: '/gas-pipeline-compressors'},
    { id: 'balance',       label: 'Газовый баланс',        icon: 'BarChart3',       route: '/gas-pipeline-balance'    },
    { id: 'safety',        label: 'Промбезопасность',      icon: 'HardHat',         route: '/gas-pipeline-incidents'  },
    { id: 'integrations',  label: 'Интеграции',            icon: 'Plug',            route: '/integrations'            },
  ],
  integrations: [
    'SCADA Emerson DeltaV', 'OSIsoft PI', 'SAP IS-U Gas',
    'GIS Esri ArcGIS', 'АСУ ТП КС', 'Газодинамическая модель (SIMONE)',
  ],
}

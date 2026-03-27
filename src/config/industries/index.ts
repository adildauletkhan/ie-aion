export type IndustryId = 'upstream' | 'refinery' | 'mining' | 'energy' | 'pipeline' | 'pipeline_oil' | 'pipeline_gas'

export interface KpiDef {
  id: string
  label: string
  unit: string
}

export interface ModuleDef {
  id: string
  label: string
  icon: string
  route: string
}

export interface IndustryPack {
  id: IndustryId
  label: string
  description: string
  assetHierarchy: string[]
  kpis: KpiDef[]
  modules: ModuleDef[]
  integrations: string[]
}

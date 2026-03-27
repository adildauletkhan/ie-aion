import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { IndustryId, IndustryPack } from '@/config/industries'
import { energyPack } from '@/config/industries/energy'
import { upstreamPack } from '@/config/industries/upstream'
import { miningPack } from '@/config/industries/mining'
import { pipelineOilPack } from '@/config/industries/pipeline_oil'
import { pipelineGasPack } from '@/config/industries/pipeline_gas'

export interface CompanyProfile {
  companyName: string
  industry: IndustryId
  region: string
  isConfigured: boolean
}

const STORAGE_KEY = 'aion_company_profile'

const INDUSTRY_PACKS: Record<IndustryId, IndustryPack> = {
  energy:   energyPack,
  upstream: upstreamPack,
  refinery: {
    id: 'refinery', label: 'Нефтепереработка', description: 'НПЗ и переработка',
    assetHierarchy: [], kpis: [], modules: [], integrations: [],
  },
  mining: miningPack,
  pipeline: {
    id: 'pipeline', label: 'Трубопроводный транспорт', description: 'Магистральные трубопроводы',
    assetHierarchy: [], kpis: [], modules: [], integrations: [],
  },
  pipeline_oil: pipelineOilPack,
  pipeline_gas: pipelineGasPack,
}

const DEFAULT_PROFILE: CompanyProfile = {
  companyName: '',
  industry: 'upstream',
  region: '',
  isConfigured: false,
}

function loadProfile(): CompanyProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT_PROFILE, ...JSON.parse(raw) }
  } catch {
    // ignore
  }
  return DEFAULT_PROFILE
}

interface CompanyProfileContextValue {
  profile: CompanyProfile
  setProfile: (profile: CompanyProfile) => void
  getIndustryPack: () => IndustryPack
  resetProfile: () => void
}

const CompanyProfileContext = createContext<CompanyProfileContextValue | null>(null)

export function CompanyProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<CompanyProfile>(loadProfile)

  const setProfile = useCallback((p: CompanyProfile) => {
    setProfileState(p)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
    } catch {
      // ignore
    }
  }, [])

  const getIndustryPack = useCallback((): IndustryPack => {
    return INDUSTRY_PACKS[profile.industry] ?? upstreamPack
  }, [profile.industry])

  const resetProfile = useCallback(() => {
    const p = DEFAULT_PROFILE
    setProfileState(p)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }, [])

  return (
    <CompanyProfileContext.Provider value={{ profile, setProfile, getIndustryPack, resetProfile }}>
      {children}
    </CompanyProfileContext.Provider>
  )
}

export function useCompanyProfile(): CompanyProfileContextValue {
  const ctx = useContext(CompanyProfileContext)
  if (!ctx) throw new Error('useCompanyProfile must be used inside CompanyProfileProvider')
  return ctx
}

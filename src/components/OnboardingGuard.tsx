import { Navigate } from 'react-router-dom'
import { useCompanyProfile } from '@/context/CompanyProfileContext'
import type { ReactNode } from 'react'

export function OnboardingGuard({ children }: { children: ReactNode }) {
  const { profile } = useCompanyProfile()
  if (!profile.isConfigured) {
    return <Navigate to="/onboarding" replace />
  }
  return <>{children}</>
}

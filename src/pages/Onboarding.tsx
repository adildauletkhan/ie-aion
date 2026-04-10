import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCompanyProfile } from '@/context/CompanyProfileContext'
import type { IndustryId } from '@/config/industries'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Zap, Flame, Pickaxe, Factory, GitCommit, CheckCircle2, Droplets, Wind
} from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

interface IndustryOption {
  id: IndustryId
  label: string
  description: string
  icon: React.ReactNode
  modulesCount: number
  badge?: string
}

const INDUSTRIES: IndustryOption[] = [
  {
    id: 'energy',
    label: 'Энергетика',
    description: 'Передача и диспетчеризация электроэнергии, KEGOC / ЕЭС',
    icon: <Zap className="h-7 w-7" />,
    modulesCount: 8,
    badge: 'Включает KEGOC-модули',
  },
  {
    id: 'upstream',
    label: 'Нефтегазодобыча',
    description: 'Управление добычей нефти и газа, НГДУ, скважины, КРС',
    icon: <Flame className="h-7 w-7" />,
    modulesCount: 10,
  },
  {
    id: 'refinery',
    label: 'Нефтепереработка',
    description: 'НПЗ, установки переработки, балансы нефтепродуктов',
    icon: <Factory className="h-7 w-7" />,
    modulesCount: 7,
  },
  {
    id: 'mining',
    label: 'Горнодобыча',
    description: 'Добыча и переработка твёрдых полезных ископаемых — медь, железо, цинк, ГМК',
    icon: <Pickaxe className="h-7 w-7" />,
    modulesCount: 9,
  },
  {
    id: 'pipeline_oil',
    label: 'Нефтепроводы',
    description: 'Магистральный транспорт нефти — АО «КазТрансОйл», НПС, SCADA',
    icon: <Droplets className="h-7 w-7" />,
    modulesCount: 7,
    badge: 'КазТрансОйл',
  },
  {
    id: 'pipeline_gas',
    label: 'Газопроводы',
    description: 'Транспорт и транзит газа — QazaqGas, ИЦА, КС, ББШ',
    icon: <Wind className="h-7 w-7" />,
    modulesCount: 7,
    badge: 'QazaqGas · ИЦА',
  },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const { setProfile } = useCompanyProfile()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [companyName, setCompanyName] = useState('')
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryId | null>(null)
  const [region, setRegion] = useState('')

  const canProceed = companyName.trim().length > 0 && selectedIndustry !== null

  function handleSubmit() {
    if (!canProceed || !selectedIndustry) return
    setProfile({
      companyName: companyName.trim(),
      industry: selectedIndustry,
      region: region.trim(),
      isConfigured: true,
    })
    navigate('/', { replace: true })
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{
        background: isDark
          ? 'radial-gradient(ellipse at 20% 20%, #0a1628 0%, #050d18 100%)'
          : 'radial-gradient(ellipse at 20% 20%, #f0f9ff 0%, #e2e8f0 100%)',
      }}
    >
      {/* Logo + title */}
      <div className="flex items-center gap-3 mb-10">
        <img src="/logo.svg" alt="IE:AION" className="h-10 w-10" />
        <div>
          <h1
            className="text-2xl font-bold uppercase tracking-[0.15em]"
            style={{
              background: isDark
                ? 'linear-gradient(90deg, #FFFFFF 10%, #5CE0D6 50%, #FACC15 100%)'
                : 'linear-gradient(90deg, #0D9488 10%, #0D9488 50%, #CA8A04 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            IE:AION
          </h1>
          <p className="text-xs text-muted-foreground tracking-widest uppercase">
            AI Industrial Operations Network
          </p>
        </div>
      </div>

      <div
        className="w-full max-w-2xl rounded-2xl border p-8 space-y-8"
        style={{
          background: isDark ? 'rgba(12,18,30,0.80)' : 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(16px)',
          borderColor: isDark ? 'rgba(92,224,214,0.15)' : 'rgba(13,148,136,0.2)',
        }}
      >
        <div>
          <h2 className="text-lg font-semibold mb-1">Настройка платформы</h2>
          <p className="text-sm text-muted-foreground">
            Укажите название вашей компании и выберите отраслевой пакет
          </p>
        </div>

        {/* Company name */}
        <div className="space-y-2">
          <Label htmlFor="company-name">Название компании</Label>
          <Input
            id="company-name"
            placeholder="Например: KEGOC, КМГ, Казцинк..."
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="h-11"
          />
        </div>

        {/* Region */}
        <div className="space-y-2">
          <Label htmlFor="region">Регион / страна <span className="text-muted-foreground">(необязательно)</span></Label>
          <Input
            id="region"
            placeholder="Например: Казахстан, Алматы..."
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="h-11"
          />
        </div>

        {/* Industry selection */}
        <div className="space-y-3">
          <Label>Отраслевой пакет</Label>
          <div className="grid grid-cols-1 gap-3">
            {INDUSTRIES.map((ind) => {
              const isSelected = selectedIndustry === ind.id
              return (
                <button
                  key={ind.id}
                  onClick={() => setSelectedIndustry(ind.id)}
                  className="w-full text-left rounded-xl border p-4 transition-all duration-200 relative"
                  style={{
                    borderColor: isSelected
                      ? (isDark ? '#5CE0D6' : '#0D9488')
                      : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'),
                    background: isSelected
                      ? (isDark ? 'rgba(92,224,214,0.08)' : 'rgba(13,148,136,0.06)')
                      : 'transparent',
                    boxShadow: isSelected
                      ? (isDark ? '0 0 20px rgba(92,224,214,0.15)' : '0 2px 12px rgba(13,148,136,0.1)')
                      : 'none',
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="shrink-0 mt-0.5 w-11 h-11 rounded-lg flex items-center justify-center"
                      style={{
                        background: isSelected
                          ? (isDark ? 'rgba(92,224,214,0.15)' : 'rgba(13,148,136,0.12)')
                          : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                        color: isSelected
                          ? (isDark ? '#5CE0D6' : '#0D9488')
                          : (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'),
                      }}
                    >
                      {ind.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{ind.label}</span>
                        {ind.badge && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0"
                            style={{
                              borderColor: isDark ? '#FACC15' : '#CA8A04',
                              color: isDark ? '#FACC15' : '#CA8A04',
                            }}
                          >
                            {ind.badge}
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {ind.modulesCount} модулей
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {ind.description}
                      </p>
                    </div>
                    {isSelected && (
                      <CheckCircle2
                        className="h-5 w-5 shrink-0 mt-0.5"
                        style={{ color: isDark ? '#5CE0D6' : '#0D9488' }}
                      />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <Button
          className="w-full h-12 text-sm font-semibold tracking-wide"
          onClick={handleSubmit}
          disabled={!canProceed}
          style={canProceed ? {
            background: isDark
              ? 'linear-gradient(90deg, #0D9488, #5CE0D6)'
              : 'linear-gradient(90deg, #0D9488, #0f766e)',
            color: '#fff',
            border: 'none',
          } : {}}
        >
          Войти в платформу
        </Button>
      </div>

      <p className="mt-6 text-[11px] text-muted-foreground/50">
        IE:AION · AI Industrial Operations Network
      </p>
    </div>
  )
}

/**
 * Суточная сводка АО «КазТрансОйл» с многоуровневой навигацией:
 *
 *   АО → Филиал → Станция → Оборудование
 *
 * - Хлебные крошки + drill-down по карточкам дочерних узлов
 * - Аггрегированные KPI на любом уровне (компания / филиал / станция)
 * - Печатная версия и быстрый возврат
 */
import { useEffect, useMemo, useState } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { useLanguage } from '@/hooks/useLanguage'
import { Button } from '@/components/ui/button'
import {
  AlertTriangle, AlertCircle, CheckCircle2, Droplets, Gauge,
  Printer, Wrench, Users, Zap, Cpu, Download, Mail,
  ChevronLeft, ChevronRight, Clock, TrendingUp, Shield,
  Building2, Briefcase, MapPin, ListTree, Factory, Search,
  FileText, X,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { useNavigate, useParams } from 'react-router-dom'
import {
  NODES, COMPANY_ROOT, getChildren, getPath, getStatusColor, getStatusLabel,
  getNodeTypeLabel, getHourlyTrace, getEventsForNode, getRecommendationsForNode,
  type CompanyNode,
} from '@/data/companyStructure'
import { ALL_REPAIRS } from '@/data/npsMaintenanceData'

const TODAY = new Date()
TODAY.setHours(8, 0, 0, 0)

const dateLocale = (lang: string) => (lang === 'en' ? 'en-GB' : 'ru-RU')

function formatDate(d: Date, lang: string) {
  return d.toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'long', year: 'numeric' })
}

// ─────────────────────────────────────────────────────────────────────────────
export default function CompanyDailyBriefing() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { t, translateData, language } = useLanguage()
  const tt = translateData
  const navigate = useNavigate()
  const params = useParams<{ nodeId?: string }>()

  const activeId = (params.nodeId && NODES[params.nodeId]) ? params.nodeId : COMPANY_ROOT
  const node = NODES[activeId]

  const [search, setSearch] = useState('')
  const [digestMode, setDigestMode] = useState(false)
  const [autoPrint, setAutoPrint] = useState(false)

  useEffect(() => {
    if (!digestMode || !autoPrint) return
    const t = setTimeout(() => {
      try { window.print() } catch (_) { /* noop */ }
    }, 120)
    const onAfter = () => {
      setAutoPrint(false)
      setDigestMode(false)
    }
    window.addEventListener('afterprint', onAfter)
    return () => {
      clearTimeout(t)
      window.removeEventListener('afterprint', onAfter)
    }
  }, [digestMode, autoPrint])

  const openDigestPdf = () => {
    setDigestMode(true)
    setAutoPrint(true)
  }

  const path = useMemo(() => getPath(activeId), [activeId])
  const children = useMemo(() => getChildren(activeId), [activeId])
  const trace = useMemo(() => getHourlyTrace(node), [node])
  const events = useMemo(() => getEventsForNode(activeId), [activeId])
  const recommendations = useMemo(() => getRecommendationsForNode(activeId), [activeId])

  const filteredChildren = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return children
    return children.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.fullName ?? '').toLowerCase().includes(q) ||
      (c.region ?? '').toLowerCase().includes(q) ||
      (c.city ?? '').toLowerCase().includes(q),
    )
  }, [children, search])

  const palette = {
    bg:      isDark ? '#0a1628' : '#f8fafc',
    card:    isDark ? '#0f1d35' : '#ffffff',
    border:  isDark ? 'rgba(59,130,246,0.18)' : 'rgba(15,118,110,0.18)',
    text:    isDark ? '#e2e8f0' : '#0f3d35',
    muted:   isDark ? '#94a3b8' : '#64748b',
    accent:  isDark ? '#60a5fa' : '#0f766e',
  }

  const goNode = (id: string) => navigate(`/daily-briefing/${id}`)

  const kpiList = [
    { icon: Droplets,   label: t('briefingKpiThroughput'),  actual: node.metrics.throughput.actual,  plan: node.metrics.throughput.plan,  unit: t('briefingUnitMcubeDay'), color: '#3b82f6', invertOk: false },
    { icon: TrendingUp, label: t('briefingKpiExports'),     actual: node.metrics.exports.actual,     plan: node.metrics.exports.plan,     unit: t('briefingUnitMcubeDay'), color: '#22c55e', invertOk: false },
    { icon: Zap,        label: t('briefingKpiEnergy'),      actual: node.metrics.energy.actual,      plan: node.metrics.energy.plan,      unit: t('briefingPowerKwh'),     color: '#f59e0b', invertOk: true  },
    { icon: Gauge,      label: t('briefingKpiSpecific'),    actual: node.metrics.energyPerTon.actual,plan: node.metrics.energyPerTon.plan,unit: t('briefingPowerKwhT'),    color: '#8b5cf6', invertOk: true  },
    { icon: Cpu,        label: t('briefingKpiOEE'),         actual: node.metrics.oee,                plan: 90,                            unit: '%',                       color: '#10b981', invertOk: false },
    { icon: Clock,      label: t('briefingKpiUptime'),      actual: node.metrics.uptime,             plan: 24,                            unit: t('briefingUnitHDay'),     color: '#06b6d4', invertOk: false },
  ] as const

  const totalCosts = +(node.metrics.costs.energy + node.metrics.costs.materials + node.metrics.costs.repairs + node.metrics.costs.personnel).toFixed(1)
  const eventsCount = events.length
  const eventCounts = {
    critical: events.filter(e => e.severity === 'critical').length,
    medium:   events.filter(e => e.severity === 'medium').length,
    low:      events.filter(e => e.severity === 'low').length,
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: palette.bg,
      color: palette.text,
      fontFamily: 'Inter, system-ui, sans-serif',
    }} className="print-root">

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-root { background: white !important; color: black !important; }
          .print-card { background: white !important; border: 1px solid #ccc !important; box-shadow: none !important; }
        }
      `}</style>

      {/* Top bar */}
      <div className="no-print"
        style={{
          position: 'sticky', top: 0, zIndex: 20,
          background: isDark ? 'rgba(10,22,40,0.92)' : 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(8px)',
          borderBottom: `1px solid ${palette.border}`,
          padding: '10px 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button size="sm" variant="ghost" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />{t('briefingBack')}
          </Button>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{t('briefingTitle')}</h1>
            <p style={{ fontSize: 11, color: palette.muted, margin: 0 }}>
              {t('briefingForExec')} · {formatDate(TODAY, language)} · {t('briefingHorizon24h')}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Button size="sm" variant="outline" onClick={() => goNode(COMPANY_ROOT)}>
            <Building2 className="h-3.5 w-3.5 mr-1" />{t('briefingToCompany')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5 mr-1" />{t('briefingPrint')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDigestMode(true)}>
            <FileText className="h-3.5 w-3.5 mr-1" />{t('briefingDigest')}
          </Button>
          <Button size="sm" variant="outline" onClick={openDigestPdf}>
            <Download className="h-3.5 w-3.5 mr-1" />{t('briefingPdf')}
          </Button>
          <Button size="sm" variant="outline">
            <Mail className="h-3.5 w-3.5 mr-1" />{t('briefingSend')}
          </Button>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '16px 24px 40px' }}>

        {/* Breadcrumb path */}
        <BreadcrumbPath path={path} onClick={goNode} palette={palette} t={t} tt={tt} />

        {/* Document header */}
        <div style={{
          padding: '18px 22px', borderRadius: 12,
          background: palette.card, border: `1px solid ${palette.border}`,
          marginBottom: 16,
        }} className="print-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ flex: '1 1 380px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                {nodeTypeIcon(node.type, palette.accent)}
                <span style={{ fontWeight: 700, fontSize: 12, color: palette.accent, textTransform: 'uppercase', letterSpacing: 1 }}>
                  {nodeBadge(node, t)} · {tt(node.region ?? node.city ?? '—')}
                </span>
                {node.branchKind === 'jv' && node.ownershipShare != null && (
                  <span style={{
                    padding: '1px 6px', borderRadius: 8, fontSize: 9, fontWeight: 700,
                    background: '#a78bfa22', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: 0.4,
                  }}>{t('briefingChildShareKto')} {node.ownershipShare} %</span>
                )}
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
                {tt(node.fullName ?? node.name)}
              </h2>
              {node.director && (
                <p style={{ fontSize: 12, color: palette.muted, marginTop: 4 }}>
                  {tt(node.director)}
                </p>
              )}
              <p style={{ fontSize: 11, color: palette.muted, marginTop: 6 }}>
                {t('briefingPeriod')}: {new Date(TODAY.getTime() - 86400000).toLocaleDateString(dateLocale(language))} {t('briefingPeriodSuffix').replace('{to}', formatDate(TODAY, language))}
              </p>
            </div>
            <div style={{
              padding: '8px 14px', borderRadius: 8,
              background: `${getStatusColor(node.status)}1a`,
              border: `1px solid ${getStatusColor(node.status)}55`,
              flex: '0 0 auto',
            }}>
              <div style={{ fontSize: 10, color: palette.muted, marginBottom: 2 }}>{t('briefingStatus')}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: getStatusColor(node.status) }}>
                {eventCounts.critical > 0 ? `⚠ ${eventCounts.critical} ${t('briefingCriticalShort')}` : tt(getStatusLabel(node.status))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 22, marginTop: 14, flexWrap: 'wrap', fontSize: 11 }}>
            {(node.pipelineLength != null) && (
              <div>
                <div style={{ color: palette.muted }}>{t('briefingPipelineLength')}</div>
                <div style={{ fontWeight: 600 }}>{node.pipelineLength.toLocaleString(dateLocale(language))} {t('briefingKmUnit')}</div>
              </div>
            )}
            {(node.capacity != null) && (
              <div>
                <div style={{ color: palette.muted }}>{t('briefingCapacity')}</div>
                <div style={{ fontWeight: 600 }}>{node.capacity.toFixed(1)} {t('briefingMtPerYear')}</div>
              </div>
            )}
            <div>
              <div style={{ color: palette.muted }}>{t('briefingComposition')}</div>
              <div style={{ fontWeight: 600 }}>
                {node.type === 'company' ? `${getChildren(node.id).filter(c => c.branchKind !== 'jv').length} ${t('nodeTypeBranchAbbr')} + ${getChildren(node.id).filter(c => c.branchKind === 'jv').length} ${t('nodeTypeJvAbbr')} · ${countDescendants(node.id, 'station')} ${t('nodeTypeStationLabel')}`
               : node.type === 'branch'  ? `${getChildren(node.id).length} ${t('nodeTypeStationLabel')}`
               : node.type === 'station' ? `${getChildren(node.id).length} ${t('nodeTypeEquipmentLabel')}`
               : '—'}
              </div>
            </div>
            <div>
              <div style={{ color: palette.muted }}>{t('briefingDataSources')}</div>
              <div style={{ fontWeight: 600 }}>{t('briefingDataSourcesValue')}</div>
            </div>
            <div>
              <div style={{ color: palette.muted }}>{t('briefingPreparedBy')}</div>
              <div style={{ fontWeight: 600 }}>{t('briefingPreparedByValue')}</div>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <SectionTitle text={t('briefingSection1')} palette={palette} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 18 }}>
          {kpiList.map(item => {
            const delta = item.plan === 0 ? 0 : ((item.actual - item.plan) / item.plan) * 100
            const ok = item.invertOk ? delta <= 0 : delta >= 0
            return (
              <KpiCard key={item.label}
                icon={item.icon} label={item.label}
                actual={item.actual} plan={item.plan} unit={item.unit}
                delta={delta} color={item.color} ok={ok} palette={palette} language={language} />
            )
          })}
        </div>

        {/* Children drill-down */}
        {children.length > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              <SectionTitle text={
                node.type === 'company'  ? `${t('briefingSection2Branches')} (${children.length})`
              : node.type === 'branch'   ? `${t('briefingSection2Stations')} (${children.length})`
              : `${t('briefingSection2Equipment')} (${children.length})`
              } palette={palette} />
              <div style={{ position: 'relative', flex: '0 1 240px' }} className="no-print">
                <Search className="h-3.5 w-3.5" style={{ position: 'absolute', left: 8, top: 8, color: palette.muted }} />
                <input
                  type="text" placeholder={t('briefingSearchPlaceholder')} value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '5px 8px 5px 28px', fontSize: 12, borderRadius: 6,
                    background: palette.bg, color: palette.text,
                    border: `1px solid ${palette.border}`,
                  }}
                />
              </div>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: node.type === 'company' ? 'repeat(auto-fit, minmax(280px, 1fr))' : 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 10, marginBottom: 18,
            }}>
              {filteredChildren.map(c => (
                <ChildCard key={c.id} node={c} onClick={() => goNode(c.id)} palette={palette} isDark={isDark} t={t} tt={tt} language={language} />
              ))}
            </div>
          </>
        )}

        {/* Throughput chart */}
        <SectionTitle text={t('briefingSection3')} palette={palette} />
        <div style={{ padding: 14, borderRadius: 12, marginBottom: 18, background: palette.card, border: `1px solid ${palette.border}` }} className="print-card">
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={trace}>
              <defs>
                <linearGradient id="flow-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: palette.muted }} />
              <YAxis yAxisId="left"  tick={{ fontSize: 10, fill: palette.muted }} />
              <YAxis yAxisId="right" orientation="right" domain={[6.4, 7.0]} tick={{ fontSize: 10, fill: palette.muted }} />
              <Tooltip contentStyle={{ fontSize: 11, background: palette.card, border: `1px solid ${palette.border}`, borderRadius: 8 }} />
              <ReferenceLine yAxisId="left" y={Math.round(node.metrics.throughput.plan / 24)} stroke="#22c55e" strokeDasharray="4 4" label={{ value: t('briefingChartPlan'), fill: '#22c55e', fontSize: 9 }} />
              <Area yAxisId="left"  type="monotone" dataKey="flow"     stroke="#3b82f6" strokeWidth={2} fill="url(#flow-grad)" name={t('briefingChartFlow')} />
              <Area yAxisId="right" type="monotone" dataKey="pressure" stroke="#f59e0b" strokeWidth={2} fill="none"             name={t('briefingChartPressure')} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Events + Costs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)', gap: 12, marginBottom: 18 }}>
          <div>
            <SectionTitle text={`${t('briefingSection4')} (${eventsCount})`} palette={palette} />
            <div style={{ padding: 14, borderRadius: 12, background: palette.card, border: `1px solid ${palette.border}` }} className="print-card">
              <div style={{ display: 'flex', gap: 6, marginBottom: 10, fontSize: 10 }}>
                <span style={{ padding: '3px 8px', borderRadius: 12, background: 'rgba(239,68,68,0.15)',  color: '#ef4444', fontWeight: 700 }}>{t('briefingSevCrit')} {eventCounts.critical}</span>
                <span style={{ padding: '3px 8px', borderRadius: 12, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontWeight: 700 }}>{t('briefingSevMed')} {eventCounts.medium}</span>
                <span style={{ padding: '3px 8px', borderRadius: 12, background: 'rgba(59,130,246,0.15)', color: '#3b82f6', fontWeight: 700 }}>{t('briefingSevLow')} {eventCounts.low}</span>
              </div>
              <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                {eventsCount === 0 ? (
                  <div style={{ fontSize: 11, color: palette.muted, padding: 12, textAlign: 'center' }}>
                    {t('briefingNoEvents')}
                  </div>
                ) : events.map((e, i) => {
                  const c = e.severity === 'critical' ? '#ef4444' : e.severity === 'medium' ? '#f59e0b' : '#3b82f6'
                  const Icon = e.severity === 'critical' ? AlertTriangle : e.severity === 'medium' ? AlertCircle : CheckCircle2
                  return (
                    <div key={i} style={{
                      display: 'flex', gap: 8, padding: '7px 0',
                      borderBottom: i < events.length - 1 ? `1px solid ${palette.border}` : 'none',
                    }}>
                      <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <Icon className="h-3.5 w-3.5" style={{ color: c, marginTop: 2 }} />
                        <span style={{ fontSize: 9, fontWeight: 700, color: c }}>{e.time}</span>
                      </div>
                      <div style={{ fontSize: 11, lineHeight: 1.45, flex: 1 }}>{tt(e.text)}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div>
            <SectionTitle text={t('briefingSection5')} palette={palette} />
            <div style={{ padding: 14, borderRadius: 12, background: palette.card, border: `1px solid ${palette.border}` }} className="print-card">
              {[
                { label: t('briefingCostEnergy'),    val: node.metrics.costs.energy,    color: '#f59e0b' },
                { label: t('briefingCostMaterials'), val: node.metrics.costs.materials, color: '#3b82f6' },
                { label: t('briefingCostRepairs'),   val: node.metrics.costs.repairs,   color: '#8b5cf6' },
                { label: t('briefingCostPersonnel'), val: node.metrics.costs.personnel, color: '#10b981' },
              ].map(r => {
                const pct = totalCosts > 0 ? (r.val / totalCosts) * 100 : 0
                return (
                  <div key={r.label} style={{ marginBottom: 9 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                      <span>{r.label}</span>
                      <span style={{ fontWeight: 700 }}>{r.val.toFixed(1)} {t('briefingMlnTenge')}</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: r.color }} />
                    </div>
                  </div>
                )
              })}
              <div style={{
                marginTop: 10, paddingTop: 10, borderTop: `1px solid ${palette.border}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: 12, color: palette.muted }}>{t('briefingTotalDaily')}</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: palette.accent }}>
                  {totalCosts.toFixed(1)} {t('briefingMlnTenge')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Energy chart */}
        <SectionTitle text={t('briefingSection6')} palette={palette} />
        <div style={{ padding: 14, borderRadius: 12, marginBottom: 18, background: palette.card, border: `1px solid ${palette.border}` }} className="print-card">
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={trace}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: palette.muted }} />
              <YAxis tick={{ fontSize: 10, fill: palette.muted }} />
              <Tooltip contentStyle={{ fontSize: 11, background: palette.card, border: `1px solid ${palette.border}`, borderRadius: 8 }} />
              <Bar dataKey="energy" fill="#f59e0b" name={t('briefingPowerKwh')} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 24, fontSize: 11, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${palette.border}`, flexWrap: 'wrap' }}>
            <div><span style={{ color: palette.muted }}>{t('briefingDailyShort')} </span><b>{node.metrics.energy.actual.toLocaleString(dateLocale(language))} {t('briefingPowerKwh')}</b></div>
            <div><span style={{ color: palette.muted }}>{t('briefingPlanShort')} </span><b>{node.metrics.energy.plan.toLocaleString(dateLocale(language))} {t('briefingPowerKwh')}</b></div>
            <div><span style={{ color: palette.muted }}>{t('briefingSpecificShort')} </span><b>{node.metrics.energyPerTon.actual} {t('briefingPowerKwhT')}</b> <span style={{ color: palette.muted }}>({t('briefingNorm')} {node.metrics.energyPerTon.plan})</span></div>
          </div>
        </div>

        {/* Personnel + Environment */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 12, marginBottom: 18 }}>
          <div>
            <SectionTitle text={t('briefingSection7')} palette={palette} />
            <div style={{ padding: 14, borderRadius: 12, background: palette.card, border: `1px solid ${palette.border}` }} className="print-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Users className="h-4 w-4" style={{ color: palette.accent }} />
                <span style={{ fontWeight: 700, fontSize: 13 }}>{t('briefingOnShift')}: {node.metrics.personnel.onShift} {t('briefingPeopleUnit')}</span>
              </div>
              {[
                { label: t('briefingTotalRoster'),     v: `${node.metrics.personnel.total} ${t('briefingPeopleUnit')}` },
                { label: t('briefingAttendance'),      v: `${node.metrics.personnel.onShift} / ${node.metrics.personnel.onShift} (100%)` },
                { label: t('briefingCertPpe'),         v: t('briefingPpeUpToDate') },
                ...(node.metrics.personnel.supervisor ? [{ label: tt(node.metrics.personnel.supervisorTitle ?? 'Начальник смены'), v: tt(node.metrics.personnel.supervisor) }] : []),
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '5px 0' }}>
                  <span style={{ color: palette.muted }}>{r.label}</span>
                  <span style={{ fontWeight: 600 }}>{r.v}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <SectionTitle text={t('briefingSection8')} palette={palette} />
            <div style={{ padding: 14, borderRadius: 12, background: palette.card, border: `1px solid ${palette.border}` }} className="print-card">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11 }}>
                <div>
                  <div style={{ color: palette.muted, fontSize: 10 }}>CO₂</div>
                  <div style={{ fontWeight: 700 }}>{node.metrics.emissions.co2.toLocaleString(dateLocale(language))} {t('briefingTPerDay')}</div>
                </div>
                <div>
                  <div style={{ color: palette.muted, fontSize: 10 }}>NOₓ</div>
                  <div style={{ fontWeight: 700 }}>{node.metrics.emissions.nox} {t('briefingTPerDay')}</div>
                </div>
                <div>
                  <div style={{ color: palette.muted, fontSize: 10 }}>VOC</div>
                  <div style={{ fontWeight: 700 }}>{node.metrics.emissions.voc} {t('briefingTPerDay')}</div>
                </div>
                <div>
                  <div style={{ color: palette.muted, fontSize: 10 }}>{t('briefingWaterUsedRecycled')}</div>
                  <div style={{ fontWeight: 700 }}>
                    {node.metrics.water.used} / {Math.round(node.metrics.water.recycled / Math.max(1, node.metrics.water.used) * 100)}%
                  </div>
                </div>
              </div>
              <div style={{
                marginTop: 12, padding: 8, borderRadius: 6, fontSize: 11,
                background: node.metrics.envIncidents === 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${node.metrics.envIncidents === 0 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                color: node.metrics.envIncidents === 0 ? '#22c55e' : '#ef4444',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Shield className="h-3.5 w-3.5" />
                {node.metrics.envIncidents === 0 ? t('briefingEnvOK') : `${node.metrics.envIncidents} ${t('briefingEnvIncidents')}`}
              </div>
            </div>
          </div>
        </div>

        {/* PPR + Repair plan */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.2fr)', gap: 12, marginBottom: 18 }}>
          <div>
            <SectionTitle text={t('briefingSection9')} palette={palette} />
            <div style={{ padding: 14, borderRadius: 12, background: palette.card, border: `1px solid ${palette.border}` }} className="print-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
                <span style={{ color: palette.muted }}>{t('briefingPprPlan')}</span>
                <span style={{ fontWeight: 700 }}>{node.metrics.ppr.planned.toFixed(0)} {t('briefingMlnTenge')}</span>
              </div>
              <div style={{ height: 14, borderRadius: 7, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: 8 }}>
                <div style={{
                  width: `${Math.min(100, node.metrics.ppr.pct)}%`, height: '100%',
                  background: 'linear-gradient(90deg, #22c55e, #3b82f6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6,
                  fontSize: 9, fontWeight: 700, color: 'white',
                }}>
                  {node.metrics.ppr.pct}%
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: palette.muted }}>
                <span>{t('briefingPprSpent')}: <b style={{ color: palette.text }}>{node.metrics.ppr.spent.toFixed(0)} {t('briefingMlnTenge')}</b></span>
                <span>{t('briefingPprRemaining')}: <b style={{ color: palette.text }}>{node.metrics.ppr.remaining.toFixed(0)} {t('briefingMlnTenge')}</b></span>
              </div>
              {node.type === 'company' && (
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${palette.border}`, fontSize: 10, color: palette.muted }}>
                  {t('briefingPprBranchSplit')} <b>{Object.values(NODES).filter(n => n.type === 'branch' && n.branchKind !== 'jv').length} {t('nodeTypeBranchAbbr')} + {Object.values(NODES).filter(n => n.branchKind === 'jv').length} {t('nodeTypeJvAbbr')}</b>; {t('briefingPprPool')} <b>{Math.round(node.metrics.ppr.planned).toLocaleString(dateLocale(language))} {t('briefingMlnTenge')}</b>
                </div>
              )}
            </div>
          </div>

          <div>
            <SectionTitle text={t('briefingSection10')} palette={palette} />
            <div style={{ padding: 12, borderRadius: 12, background: palette.card, border: `1px solid ${palette.border}` }} className="print-card">
              {(() => {
                const stationIds = collectStationIds(activeId)
                const upcoming = ALL_REPAIRS.filter(r => {
                  if (stationIds.length && !stationIds.includes(r.stationId)) return false
                  const d = (new Date(r.dueDate).getTime() - Date.now()) / 86400000
                  return d >= 0 && d <= 14
                }).slice(0, 5)
                if (upcoming.length === 0) {
                  return <div style={{ fontSize: 11, color: palette.muted, padding: 12, textAlign: 'center' }}>{t('briefingNoUpcoming')}</div>
                }
                return upcoming.map(r => {
                  const due = new Date(r.dueDate)
                  const days = Math.ceil((due.getTime() - Date.now()) / 86400000)
                  const c = r.priority === 'critical' ? '#ef4444' : r.priority === 'high' ? '#f59e0b' : '#3b82f6'
                  return (
                    <div key={r.id} style={{
                      padding: '8px 10px', marginBottom: 6, borderRadius: 6,
                      background: `${c}10`, border: `1px solid ${c}30`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: c }}>
                          {r.priority === 'critical' ? t('briefingPriorityCritical') : r.priority === 'high' ? t('briefingPriorityHigh') : t('briefingPriorityMedium')} · {tt(r.stationName)}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700 }}>{r.budget.toFixed(1)} {t('briefingMlnTenge')}</span>
                      </div>
                      <div style={{ fontSize: 11, marginBottom: 3 }}>{tt(r.equipment)} — {tt(r.description)}</div>
                      <div style={{ fontSize: 10, color: palette.muted }}>
                        {due.toLocaleDateString(dateLocale(language), { day: 'numeric', month: 'long' })}
                        {days > 0 && days <= 14 && ` · ${t('briefingDaysSuffix').replace('{n}', String(days))}`}
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </div>
        </div>

        {/* AI Recommendations */}
        <SectionTitle text={t('briefingSection11')} palette={palette} />
        <div style={{ padding: 14, borderRadius: 12, marginBottom: 18, background: palette.card, border: `1px solid ${palette.border}` }} className="print-card">
          {recommendations.map((rec, i) => {
            const c = rec.level === 'critical' ? '#ef4444' : rec.level === 'high' ? '#f59e0b' : '#3b82f6'
            return (
              <div key={i} style={{
                padding: 12, marginBottom: 8, borderRadius: 8,
                borderLeft: `3px solid ${c}`,
                background: isDark ? `${c}10` : `${c}08`,
              }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <AlertTriangle className="h-4 w-4" style={{ color: c, marginTop: 2, flex: '0 0 auto' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4, color: c }}>
                      {rec.level === 'critical' ? t('briefingPriorityCritical') : rec.level === 'high' ? t('briefingPriorityHigh') : t('briefingPriorityMedium')} · {tt(rec.title)}
                    </div>
                    <div style={{ fontSize: 11, lineHeight: 1.5 }}>{tt(rec.text)}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Signatures */}
        <div style={{ padding: 18, borderRadius: 12, background: palette.card, border: `1px solid ${palette.border}` }} className="print-card">
          <div style={{ fontSize: 10, color: palette.muted, marginBottom: 14, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: 700 }}>
            {t('briefingSignatures')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
            {getSignatures(node, t, tt).map(s => (
              <div key={s.role}>
                <div style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`, height: 24 }} />
                <div style={{ fontSize: 10, color: palette.muted, marginTop: 4 }}>{s.role}</div>
                <div style={{ fontSize: 11, fontWeight: 600 }}>{s.name}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: 10, color: palette.muted, marginTop: 18 }}>
          {t('briefingFooterPrefix')} · {formatDate(TODAY, language)} 08:00 (UTC+5)
        </div>
      </div>

      {digestMode && (
        <BriefingDigest
          node={node}
          events={events}
          recommendations={recommendations}
          totalCosts={totalCosts}
          isDark={isDark}
          onClose={() => { setDigestMode(false); setAutoPrint(false) }}
          onPrint={openDigestPdf}
        />
      )}
    </div>
  )
}

// ─── BriefingDigest: одностраничная выжимка для PDF ───────────────────────────
function BriefingDigest({
  node, events, recommendations, totalCosts, isDark, onClose, onPrint,
}: {
  node: CompanyNode
  events: ReturnType<typeof getEventsForNode>
  recommendations: ReturnType<typeof getRecommendationsForNode>
  totalCosts: number
  isDark: boolean
  onClose: () => void
  onPrint: () => void
}) {
  const { t, translateData, language } = useLanguage()
  const tt = translateData
  const today = new Date()
  today.setHours(8, 0, 0, 0)
  const yesterday = new Date(today.getTime() - 86400000)

  const eventCounts = {
    critical: events.filter(e => e.severity === 'critical').length,
    medium:   events.filter(e => e.severity === 'medium').length,
    low:      events.filter(e => e.severity === 'low').length,
  }
  const topEvents = [...events]
    .sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity))
    .slice(0, 3)
  const topRecs = [...recommendations]
    .sort((a, b) => severityWeight(b.level) - severityWeight(a.level))
    .slice(0, 3)
  const status = tt(getStatusLabel(node.status))
  const statusColor = getStatusColor(node.status)
  const headerSubtitle = node.type === 'company' ? t('nodeTypeCompanyGroup')
                      : node.type === 'branch'   ? (node.branchKind === 'jv' ? t('nodeTypeJvFull') : t('nodeTypeBranchFull'))
                      : node.type === 'station'  ? t('nodeTypeStationFull')
                      : t('nodeTypeEquipmentFull')

  const fmt = (v: number) => v >= 1000 ? v.toLocaleString(dateLocale(language)) : v.toFixed(v < 100 ? 2 : 0)
  const dThroughput = node.metrics.throughput.plan > 0
    ? ((node.metrics.throughput.actual - node.metrics.throughput.plan) / node.metrics.throughput.plan) * 100 : 0
  const dEnergy = node.metrics.energy.plan > 0
    ? ((node.metrics.energy.actual - node.metrics.energy.plan) / node.metrics.energy.plan) * 100 : 0

  // одностраничный layout, A4 портрет ≈ 794×1123 px при 96 DPI
  return (
    <div
      className="digest-overlay"
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: isDark ? 'rgba(0,0,0,0.72)' : 'rgba(15,23,42,0.5)',
        overflow: 'auto',
        padding: 24,
      }}
    >
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .digest-page, .digest-page * { visibility: visible !important; }
          .digest-overlay { position: static !important; background: white !important; padding: 0 !important; }
          .digest-toolbar { display: none !important; }
          .digest-page {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            page-break-after: avoid;
          }
          @page { size: A4 portrait; margin: 12mm; }
        }
      `}</style>

      <div className="digest-toolbar" style={{
        position: 'sticky', top: 0, zIndex: 1,
        display: 'flex', justifyContent: 'center', gap: 8,
        marginBottom: 16,
      }}>
        <Button size="sm" variant="outline" onClick={onPrint}
          style={{ background: 'white', color: '#0f172a' }}>
          <Download className="h-3.5 w-3.5 mr-1" />{t('briefingDigestSavePdf')}
        </Button>
        <Button size="sm" variant="outline" onClick={onClose}
          style={{ background: 'white', color: '#0f172a' }}>
          <X className="h-3.5 w-3.5 mr-1" />{t('briefingDigestClose')}
        </Button>
      </div>

      <div
        className="digest-page"
        style={{
          maxWidth: 794, margin: '0 auto',
          background: 'white', color: '#0f172a',
          borderRadius: 8, padding: '24px 28px',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 11, lineHeight: 1.4,
          boxShadow: '0 25px 60px -20px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f766e', paddingBottom: 10, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', color: '#0f766e', fontWeight: 700 }}>
              {t('briefingDigestHeader')}
            </div>
            <h1 style={{ fontSize: 18, fontWeight: 800, margin: '4px 0 2px', color: '#0f172a' }}>
              {tt('АО «КазТрансОйл»')}
            </h1>
            <div style={{ fontSize: 11, color: '#475569' }}>
              {headerSubtitle} · {tt(node.fullName ?? node.name)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 }}>{t('briefingPeriod')}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#0f172a' }}>
              {yesterday.toLocaleDateString(dateLocale(language))} 08:00 — {today.toLocaleDateString(dateLocale(language))} 08:00
            </div>
            <div style={{
              display: 'inline-block', marginTop: 6, padding: '3px 10px', borderRadius: 12,
              background: `${statusColor}22`, color: statusColor, fontSize: 10, fontWeight: 700,
            }}>
              {eventCounts.critical > 0 ? `⚠ ${eventCounts.critical} ${t('briefingCriticalShort')}` : status}
            </div>
          </div>
        </div>

        {/* KPIs row */}
        <SectionHead text={t('briefingDigestSection1')} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
          <DigestKpi label={t('briefingKpiThroughput')}   value={fmt(node.metrics.throughput.actual)} unit={t('briefingUnitMcubeDay')} delta={dThroughput} invertOk={false} />
          <DigestKpi label={t('briefingKpiExports')}      value={fmt(node.metrics.exports.actual)}    unit={t('briefingUnitMcubeDay')} delta={0} />
          <DigestKpi label={t('briefingChildOEE')}        value={`${node.metrics.oee}`}                unit="%" delta={0} />
          <DigestKpi label={t('briefingChildSpecific')}   value={`${node.metrics.energyPerTon.actual}`} unit={t('briefingPowerKwhT')} delta={0} />
          <DigestKpi label={t('briefingKpiEnergy')}       value={fmt(node.metrics.energy.actual)}      unit={t('briefingPowerKwh')} delta={dEnergy} invertOk />
          <DigestKpi label={t('briefingTotalDaily')}      value={totalCosts.toFixed(1)}                unit={t('briefingMlnTenge')} delta={0} />
          <DigestKpi label={t('briefingKpiUptimeShort')}  value={`${node.metrics.uptime}`}             unit={t('briefingUnitHDay')} delta={0} />
          <DigestKpi label={t('briefingPprShort')}        value={`${node.metrics.ppr.pct}`}            unit="%" delta={0} />
        </div>

        {/* Events + PPR (two columns) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <SectionHead text={`${t('briefingDigestSection2')} (${events.length})`} />
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <Pill label={t('briefingSevCrit')} value={eventCounts.critical} color="#ef4444" />
              <Pill label={t('briefingSevMed')}  value={eventCounts.medium}   color="#f59e0b" />
              <Pill label={t('briefingSevLow')}  value={eventCounts.low}      color="#3b82f6" />
            </div>
            {topEvents.length === 0 ? (
              <div style={{ fontSize: 11, color: '#64748b' }}>{t('briefingDigestNoCritical')}</div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                {topEvents.map((e, i) => {
                  const c = e.severity === 'critical' ? '#ef4444' : e.severity === 'medium' ? '#f59e0b' : '#3b82f6'
                  return (
                    <li key={i} style={{
                      padding: '5px 8px', borderLeft: `3px solid ${c}`,
                      background: `${c}10`, marginBottom: 4, borderRadius: 4,
                    }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: c, marginRight: 6 }}>{e.time}</span>
                      <span style={{ fontSize: 11 }}>{tt(e.text)}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          <div>
            <SectionHead text={t('briefingDigestSection3')} />
            <div style={{ padding: 10, border: '1px solid #e2e8f0', borderRadius: 6, background: '#f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginBottom: 4 }}>
                <span>{t('briefingDigestPlanYear')}</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{node.metrics.ppr.planned.toFixed(0)} {t('briefingMlnTenge')}</span>
              </div>
              <div style={{ height: 12, borderRadius: 6, background: '#e2e8f0', overflow: 'hidden', marginBottom: 6 }}>
                <div style={{
                  width: `${Math.min(100, node.metrics.ppr.pct)}%`, height: '100%',
                  background: 'linear-gradient(90deg, #22c55e, #3b82f6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6,
                  fontSize: 8, fontWeight: 700, color: 'white',
                }}>{node.metrics.ppr.pct}%</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#64748b' }}>
                <span>{t('briefingPprSpent')}: <b style={{ color: '#0f172a' }}>{node.metrics.ppr.spent.toFixed(0)} {t('briefingMlnTenge')}</b></span>
                <span>{t('briefingPprRemaining')}: <b style={{ color: '#0f172a' }}>{node.metrics.ppr.remaining.toFixed(0)} {t('briefingMlnTenge')}</b></span>
              </div>

              <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 10 }}>
                <div>
                  <div style={{ color: '#64748b' }}>{t('briefingDigestPersonOnShift')}</div>
                  <div style={{ fontWeight: 700 }}>{node.metrics.personnel.onShift} {t('briefingPeopleUnit')}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b' }}>{t('briefingDigestEnvIncidents')}</div>
                  <div style={{ fontWeight: 700, color: node.metrics.envIncidents > 0 ? '#ef4444' : '#22c55e' }}>
                    {node.metrics.envIncidents === 0 ? t('briefingDigestNone') : node.metrics.envIncidents}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <SectionHead text={t('briefingDigestSection4')} />
        {topRecs.length === 0 ? (
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 14 }}>{t('briefingDigestNoRecs')}</div>
        ) : (
          <ol style={{ margin: 0, paddingLeft: 0, listStyle: 'none', marginBottom: 14 }}>
            {topRecs.map((r, i) => {
              const c = r.level === 'critical' ? '#ef4444' : r.level === 'high' ? '#f59e0b' : '#3b82f6'
              return (
                <li key={i} style={{
                  display: 'flex', gap: 8, padding: '6px 10px', marginBottom: 5,
                  borderLeft: `3px solid ${c}`, background: `${c}08`, borderRadius: 4,
                }}>
                  <div style={{ flex: '0 0 auto', fontWeight: 800, fontSize: 13, color: c, minWidth: 16 }}>{i + 1}</div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 2 }}>{tt(r.title)}</div>
                    <div style={{ fontSize: 10, color: '#475569', lineHeight: 1.4 }}>{tt(r.text)}</div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}

        {/* Footer / Signature */}
        <div style={{
          borderTop: '1px solid #e2e8f0', paddingTop: 10, marginTop: 8,
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, fontSize: 10,
        }}>
          {getDigestSignatures(node, t, tt).slice(0, 3).map(s => (
            <div key={s.role}>
              <div style={{ borderBottom: '1px solid #94a3b8', height: 22 }} />
              <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>{s.role}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#0f172a' }}>{s.name}</div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', fontSize: 9, color: '#94a3b8', marginTop: 12 }}>
          {t('briefingDigestFooter')} · {today.toLocaleDateString(dateLocale(language))} 08:00 (UTC+5)
        </div>
      </div>
    </div>
  )
}

function SectionHead({ text }: { text: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      fontSize: 11, fontWeight: 700, color: '#0f172a',
      marginBottom: 6,
    }}>
      <span style={{ width: 3, height: 12, background: '#0f766e', borderRadius: 2 }} />
      {text}
    </div>
  )
}

function DigestKpi({ label, value, unit, delta, invertOk }: {
  label: string; value: string; unit: string; delta: number; invertOk?: boolean
}) {
  const showDelta = Math.abs(delta) > 0.05
  const ok = invertOk ? delta <= 0 : delta >= 0
  return (
    <div style={{ padding: 8, borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
      <div style={{ fontSize: 8, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{value}</span>
        <span style={{ fontSize: 8, color: '#64748b' }}>{unit}</span>
      </div>
      {showDelta && (
        <div style={{ fontSize: 9, fontWeight: 700, color: ok ? '#16a34a' : '#dc2626' }}>
          {delta > 0 ? '+' : ''}{delta.toFixed(1)} %
        </div>
      )}
    </div>
  )
}

function Pill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span style={{
      padding: '2px 7px', borderRadius: 10, fontSize: 9, fontWeight: 700,
      background: `${color}22`, color,
    }}>
      {label} {value}
    </span>
  )
}

function severityWeight(s: 'critical' | 'high' | 'medium' | 'low'): number {
  return s === 'critical' ? 4 : s === 'high' ? 3 : s === 'medium' ? 2 : 1
}

function getDigestSignatures(node: CompanyNode, t: (k: string) => string, tt: (v: string) => string): { role: string; name: string }[] {
  if (node.type === 'company') {
    return [
      { role: t('sigCompanyManagingDir'),  name: t('sigName1') },
      { role: t('sigCompanyChiefEng'),     name: t('sigName2') },
      { role: t('sigCompanyChairman'),     name: t('sigName3') },
    ]
  }
  if (node.type === 'branch') {
    return [
      { role: t('sigBranchDispatcher'),    name: t('sigName4') },
      { role: t('sigStationChiefEng'),     name: t('sigName5') },
      { role: t('sigBranchDirector'),      name: tt(node.director ?? '—') },
    ]
  }
  return [
    { role: t('sigStationShiftSup'),  name: t('sigName4') },
    { role: t('sigStationChiefEng'),  name: t('sigName2') },
    { role: t('sigStationDirector'),  name: t('sigName6') },
  ]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function nodeTypeIcon(type: string, color: string) {
  const cls = 'h-4 w-4'
  if (type === 'company') return <Building2 className={cls} style={{ color }} />
  if (type === 'branch')  return <Briefcase className={cls} style={{ color }} />
  if (type === 'station') return <Factory   className={cls} style={{ color }} />
  return <Wrench className={cls} style={{ color }} />
}

function nodeBadge(n: CompanyNode, t: (k: string) => string): string {
  if (n.type === 'company') return t('nodeTypeCompanyGroup')
  if (n.type === 'branch')  return n.branchKind === 'jv' ? t('nodeTypeJvFull') : t('nodeTypeBranchFull')
  if (n.type === 'station') return t('nodeTypeStationFull')
  return t('nodeTypeEquipmentFull')
}

function countDescendants(id: string, type: string): number {
  let n = 0
  for (const node of Object.values(NODES)) {
    if (node.type === type && isDescendant(node.id, id)) n++
  }
  return n
}
function isDescendant(id: string, ancestorId: string): boolean {
  let cur = NODES[id]
  while (cur?.parentId) {
    if (cur.parentId === ancestorId) return true
    cur = NODES[cur.parentId]
  }
  return false
}
function collectStationIds(rootId: string): string[] {
  const r = NODES[rootId]
  if (!r) return []
  if (r.type === 'station') return [r.id]
  if (r.type === 'equipment') return r.parentId ? [r.parentId] : []
  return Object.values(NODES).filter(n => n.type === 'station' && isDescendant(n.id, rootId)).map(n => n.id)
}
function getSignatures(node: CompanyNode, t: (k: string) => string, tt: (v: string) => string): { role: string; name: string }[] {
  if (node.type === 'company') {
    return [
      { role: t('sigCompanyDirectorOps'),  name: t('sigName1') },
      { role: t('sigCompanyChiefEng'),     name: t('sigName2') },
      { role: t('sigCompanyChairman'),     name: t('sigName3') },
      { role: t('sigCompanyExecutor'),     name: t('sigCompanyExecutorValue') },
    ]
  }
  if (node.type === 'branch') {
    return [
      { role: t('sigBranchDispatcher'),    name: t('sigName4') },
      { role: t('sigBranchChiefEng'),      name: t('sigName5') },
      { role: t('sigBranchDirector'),      name: tt(node.director ?? '—') },
    ]
  }
  return [
    { role: t('sigStationShiftSup'),  name: t('sigName4') },
    { role: t('sigStationDeputy'),    name: t('sigName1') },
    { role: t('sigStationChiefEng'),  name: t('sigName2') },
    { role: t('sigStationDirector'),  name: t('sigName6') },
  ]
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function BreadcrumbPath({ path, onClick, palette, t, tt }: {
  path: CompanyNode[]; onClick: (id: string) => void;
  palette: { muted: string; accent: string; text: string; border: string; bg: string; card: string };
  t: (k: string) => string;
  tt: (v: string) => string;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap',
      padding: '8px 12px', borderRadius: 8, marginBottom: 14,
      background: palette.card, border: `1px solid ${palette.border}`,
      fontSize: 12,
    }} className="print-card">
      <ListTree className="h-3.5 w-3.5" style={{ color: palette.muted }} />
      {path.map((n, i) => {
        const isLast = i === path.length - 1
        return (
          <span key={n.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={() => onClick(n.id)}
              disabled={isLast}
              style={{
                padding: '2px 8px', borderRadius: 4,
                background: isLast ? `${palette.accent}1f` : 'transparent',
                color: isLast ? palette.accent : palette.text,
                fontWeight: isLast ? 700 : 500,
                cursor: isLast ? 'default' : 'pointer',
                border: 'none',
                fontSize: 12,
              }}
            >
              <span style={{ fontSize: 9, color: palette.muted, marginRight: 4 }}>
                {(n.type === 'branch' && n.branchKind === 'jv'
                  ? t('nodeTypeJvAbbr')
                  : n.type === 'branch'
                  ? t('nodeTypeBranchAbbr')
                  : tt(getNodeTypeLabel(n.type))
                ).toUpperCase()}
              </span>
              {tt(n.name)}
            </button>
            {!isLast && <ChevronRight className="h-3 w-3" style={{ color: palette.muted }} />}
          </span>
        )
      })}
    </div>
  )
}

function SectionTitle({ text, palette }: {
  text: string; palette: { accent: string; text: string }
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      fontSize: 13, fontWeight: 700, color: palette.text,
      marginTop: 6, marginBottom: 8,
    }}>
      <span style={{ width: 3, height: 16, background: palette.accent, borderRadius: 2 }} />
      {text}
    </div>
  )
}

function KpiCard({ icon: Icon, label, actual, plan, unit, delta, color, ok, palette, language }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  label: string; actual: number; plan: number; unit: string; delta: number; color: string; ok: boolean
  palette: { muted: string; accent: string; text: string; border: string; bg: string; card: string }
  language: string
}) {
  const fmt = (v: number) => v >= 1000 ? v.toLocaleString(dateLocale(language)) : v.toFixed(v < 100 ? 2 : 0)
  return (
    <div style={{ padding: 12, borderRadius: 10, background: palette.card, border: `1px solid ${palette.border}` }} className="print-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Icon className="h-3.5 w-3.5" style={{ color }} />
        <span style={{ fontSize: 10, color: palette.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 18, fontWeight: 800, color }}>{fmt(actual)}</span>
        <span style={{ fontSize: 10, color: palette.muted }}>{unit}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
        <span style={{ color: palette.muted }}>{plan > 0 ? `${language === 'en' ? 'Plan' : 'План'}: ${fmt(plan)}` : '—'}</span>
        {plan > 0 && (
          <span style={{ fontWeight: 700, color: ok ? '#22c55e' : '#ef4444' }}>
            {delta > 0 ? '+' : ''}{delta.toFixed(1)} %
          </span>
        )}
      </div>
    </div>
  )
}

function ChildCard({ node, onClick, palette, isDark, t, tt, language }: {
  node: CompanyNode; onClick: () => void
  palette: { muted: string; accent: string; text: string; border: string; bg: string; card: string }
  isDark: boolean
  t: (k: string) => string
  tt: (v: string) => string
  language: string
}) {
  const c = getStatusColor(node.status)
  return (
    <button onClick={onClick}
      style={{
        textAlign: 'left',
        padding: 12, borderRadius: 10, cursor: 'pointer',
        background: palette.card,
        border: `1px solid ${palette.border}`,
        borderLeft: `3px solid ${c}`,
        transition: 'all 0.18s ease',
        color: 'inherit',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 16px -8px ${c}55` }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)';     e.currentTarget.style.boxShadow = 'none' }}
      className="print-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          {nodeTypeIcon(node.type, c)}
          <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {tt(node.name)}
          </span>
        </div>
        <span style={{
          padding: '1px 6px', borderRadius: 8, fontSize: 9, fontWeight: 600,
          background: `${c}22`, color: c, flex: '0 0 auto', whiteSpace: 'nowrap',
        }}>
          {tt(getStatusLabel(node.status))}
        </span>
      </div>

      {(node.region || node.city) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: palette.muted, marginBottom: 8 }}>
          <MapPin className="h-3 w-3" />
          {tt(node.region ?? node.city ?? '')}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11, marginBottom: 8 }}>
        <div>
          <div style={{ color: palette.muted, fontSize: 9 }}>{t('briefingChildOEE')}</div>
          <div style={{ fontWeight: 700, color: node.metrics.oee >= 85 ? '#22c55e' : node.metrics.oee >= 75 ? '#f59e0b' : '#ef4444' }}>
            {node.metrics.oee} %
          </div>
        </div>
        <div>
          <div style={{ color: palette.muted, fontSize: 9 }}>{t('briefingChildThroughputDay')}</div>
          <div style={{ fontWeight: 700 }}>{node.metrics.throughput.actual.toLocaleString(dateLocale(language))} {t('briefingUnitMcube')}</div>
        </div>
        <div>
          <div style={{ color: palette.muted, fontSize: 9 }}>{t('briefingChildSpecific')}</div>
          <div style={{ fontWeight: 700 }}>{node.metrics.energyPerTon.actual} {t('briefingPowerKwhT')}</div>
        </div>
        <div>
          <div style={{ color: palette.muted, fontSize: 9 }}>{t('briefingChildEvents')}</div>
          <div style={{ display: 'flex', gap: 4, fontWeight: 700 }}>
            {node.metrics.events.critical > 0 && <span style={{ color: '#ef4444' }}>{node.metrics.events.critical}</span>}
            {node.metrics.events.medium   > 0 && <span style={{ color: '#f59e0b' }}>{node.metrics.events.medium}</span>}
            {node.metrics.events.low      > 0 && <span style={{ color: '#3b82f6' }}>{node.metrics.events.low}</span>}
            {node.metrics.events.critical + node.metrics.events.medium + node.metrics.events.low === 0 && <span style={{ color: palette.muted }}>—</span>}
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 6, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
        fontSize: 10,
      }}>
        <span style={{ color: palette.muted }}>{t('briefingChildOpenDetails')}</span>
        <ChevronRight className="h-3.5 w-3.5" style={{ color: palette.accent }} />
      </div>
    </button>
  )
}

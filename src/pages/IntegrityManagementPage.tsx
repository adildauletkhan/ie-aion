/**
 * Управление целостностью трубопроводов АО «КазТрансОйл»
 *
 * Полностью интерактивный модуль:
 *   • дерево источников данных (PDF) — отображение и подсветка
 *   • редактируемые рычаги по ремонтам и остановкам оборудования
 *   • расчёт CAPEX / риска / индекса целостности / пропускной способности
 *   • ИИ-советник: какие источники затронуты и как меняются метрики
 *   • визуальное сравнение сценариев
 */
import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLanguage } from "@/hooks/useLanguage"
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart,
  PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts"
import {
  AlertTriangle, Brain, CalendarClock, ChevronDown, ChevronRight,
  Database, FastForward, Gauge, Lightbulb, Layers, MinusCircle, Pause, PlusCircle,
  RotateCcw, ShieldAlert, ShieldCheck, Sparkles, Target,
  Workflow, Wrench, XCircle, Zap,
} from "lucide-react"
import {
  BASE_ACTIONS, BASE_SEGMENTS, BASE_TOTAL_CAPEX, EQUIPMENT_NODES,
  PRESET_SCENARIOS, SOURCES, SOURCE_GROUP_LABEL, SOURCE_LABEL,
  analyzeScenarioImpact, computeScenario, monthLabel, riskLabel,
  type LeverAction, type LeverShutdown, type Scenario, type SourceKey,
} from "@/data/integrityScenarios"

// ───────────────────────────────────────────────────────────────────────────
function clone<T>(v: T): T { return JSON.parse(JSON.stringify(v)) }

export default function IntegrityManagementPage() {
  const { t, translateData } = useLanguage()
  const tt = translateData
  // ─── State ─────────────────────────────────────────────────────────────
  const [scenarios, setScenarios] = useState<Scenario[]>(() => clone(PRESET_SCENARIOS))
  const [activeId, setActiveId] = useState<string>("base")
  const [highlightedSources, setHighlightedSources] = useState<SourceKey[]>([])

  const baseScenario = scenarios.find(s => s.id === "base")!
  const active = scenarios.find(s => s.id === activeId)!

  const baseMetrics = useMemo(() => computeScenario(baseScenario), [baseScenario])
  const activeMetrics = useMemo(() => computeScenario(active), [active])
  const allMetrics = useMemo(() => scenarios.map(s => ({ s, m: computeScenario(s) })), [scenarios])
  const impact = useMemo(() => analyzeScenarioImpact(active, activeMetrics, baseMetrics), [active, activeMetrics, baseMetrics])

  // ─── Editing helpers ───────────────────────────────────────────────────
  const updateActive = (mut: (sc: Scenario) => void) => {
    setScenarios(prev => prev.map(s => {
      if (s.id !== activeId) return s
      const next = clone(s)
      mut(next)
      return next
    }))
  }

  const upsertLever = (lever: LeverAction) => updateActive(sc => {
    const idx = sc.actionLevers.findIndex(l => l.actionId === lever.actionId)
    if (idx === -1) sc.actionLevers.push(lever)
    else {
      sc.actionLevers[idx] = { ...sc.actionLevers[idx], ...lever }
      if (!sc.actionLevers[idx].skip
          && (sc.actionLevers[idx].shiftMonths ?? 0) === 0
          && (sc.actionLevers[idx].budgetMultiplier ?? 1) === 1) {
        sc.actionLevers.splice(idx, 1)
      }
    }
  })

  const setShutdown = (id: string, mut: (sh: LeverShutdown) => void) => updateActive(sc => {
    const idx = sc.shutdowns.findIndex(s => s.id === id)
    if (idx === -1) return
    mut(sc.shutdowns[idx])
  })

  const addShutdown = () => updateActive(sc => {
    sc.shutdowns.push({
      id: `sh-${Date.now()}`,
      equipmentId: EQUIPMENT_NODES[0].id,
      startMonth: 4,
      durationDays: 7,
      reason: t('integrityShutdownDefault'),
    })
  })
  const removeShutdown = (id: string) => updateActive(sc => {
    sc.shutdowns = sc.shutdowns.filter(s => s.id !== id)
  })

  const createCustomScenario = () => {
    const newId = `custom-${Date.now()}`
    const num = scenarios.length + 1
    setScenarios(prev => [...prev, {
      id: newId, name: `${t('integrityScenarioCustomBtn')} ${num}`,
      description: t('integrityScenarioCustomBtn'),
      color: "#06b6d4",
      actionLevers: [], shutdowns: [],
    }])
    setActiveId(newId)
  }

  const resetActive = () => {
    const preset = PRESET_SCENARIOS.find(p => p.id === activeId)
    if (preset) {
      setScenarios(prev => prev.map(s => s.id === activeId ? clone(preset) : s))
    } else {
      updateActive(sc => { sc.actionLevers = []; sc.shutdowns = [] })
    }
  }

  // ─── Sources grouped ───────────────────────────────────────────────────
  const sourcesByGroup = useMemo(() => {
    const map: Record<string, typeof SOURCES> = {}
    for (const s of SOURCES) (map[s.group] ??= []).push(s)
    return map
  }, [])

  const sourceIntensity = useMemo(() => {
    const map = new Map<SourceKey, number>()
    impact.affectedSources.forEach(a => map.set(a.key, a.intensity))
    return map
  }, [impact])

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-bold">{t('integrityTitle')}</h1>
          <p className="text-xs text-muted-foreground">{t('integritySubtitle')}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`text-xs ${activeMetrics.integrityIndex > 80 ? "text-emerald-500 border-emerald-500/40" : activeMetrics.integrityIndex > 65 ? "text-amber-500 border-amber-500/40" : "text-red-500 border-red-500/40"}`}>
            <ShieldCheck className="h-3 w-3 mr-1" />{t('integrityIndexShort')} {activeMetrics.integrityIndex.toFixed(1)} %
          </Badge>
          <Badge variant="outline" className="text-xs">
            <CalendarClock className="h-3.5 w-3.5 mr-1" />{t('integrityHorizon')}
          </Badge>
        </div>
      </div>

      {/* Scenario picker */}
      <ScenarioPicker
        scenarios={scenarios}
        activeId={activeId}
        onSelect={setActiveId}
        onCreate={createCustomScenario}
        onReset={resetActive}
        baseMetrics={baseMetrics}
        getMetrics={(id) => allMetrics.find(x => x.s.id === id)!.m}
      />

      {/* KPI bar */}
      <KpiBar metrics={activeMetrics} delta={impact.delta} />

      {/* Main tabs */}
      <Tabs defaultValue="scenarios" className="flex-1 min-h-0">
        <TabsList>
          <TabsTrigger value="scenarios">{t('integrityTabScenarios')}</TabsTrigger>
          <TabsTrigger value="advisor">{t('integrityTabAdvisor')}</TabsTrigger>
          <TabsTrigger value="compare">{t('integrityTabCompare')}</TabsTrigger>
          <TabsTrigger value="sources">{t('integrityTabSources')}</TabsTrigger>
          <TabsTrigger value="segments">{t('integrityTabSegments')}</TabsTrigger>
        </TabsList>

        {/* ─── Сценарии ─────────────────────────────────────────────────────── */}
        <TabsContent value="scenarios" className="space-y-3">
          <ScenariosBrief
            active={active}
            metrics={activeMetrics}
            baseMetrics={baseMetrics}
            impact={impact}
          />
          <div className="grid lg:grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Wrench className="h-4 w-4" /> {t('integrityActionPlanTitle')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {BASE_ACTIONS.map(action => {
                  const lever = active.actionLevers.find(l => l.actionId === action.id)
                  const isLocked = active.locked
                  return (
                    <ActionLeverRow
                      key={action.id}
                      action={action}
                      lever={lever}
                      locked={isLocked}
                      onChange={(l) => upsertLever({ actionId: action.id, ...l })}
                      onHoverSources={setHighlightedSources}
                    />
                  )
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 flex flex-row justify-between items-center">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Pause className="h-4 w-4" /> {t('integrityShutdownsTitle')}
                </CardTitle>
                {!active.locked && (
                  <Button size="sm" variant="outline" onClick={addShutdown}>
                    <PlusCircle className="h-3.5 w-3.5 mr-1" />{t('integrityAddShutdown')}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {active.shutdowns.length === 0 && (
                  <p className="text-xs text-muted-foreground">{t('integrityNoShutdowns')}</p>
                )}
                {active.shutdowns.map(sh => {
                  const eq = EQUIPMENT_NODES.find(e => e.id === sh.equipmentId)!
                  return (
                    <div key={sh.id} className="rounded border p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <select
                          className="bg-transparent border rounded px-2 py-1 text-xs flex-1"
                          value={sh.equipmentId}
                          disabled={active.locked}
                          onChange={e => setShutdown(sh.id, s => { s.equipmentId = e.target.value })}
                        >
                          {EQUIPMENT_NODES.map(e => (
                            <option key={e.id} value={e.id}>{tt(e.name)} · {tt(e.npu)}</option>
                          ))}
                        </select>
                        {!active.locked && (
                          <Button size="icon" variant="ghost" onClick={() => removeShutdown(sh.id)}>
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <label className="space-y-1">
                          <div className="text-muted-foreground">{t('integrityShutdownStartMonth')}</div>
                          <Slider
                            min={0} max={23} step={1}
                            value={[sh.startMonth]}
                            disabled={active.locked}
                            onValueChange={v => setShutdown(sh.id, s => { s.startMonth = v[0] })}
                          />
                          <div>{monthLabel(sh.startMonth)}</div>
                        </label>
                        <label className="space-y-1">
                          <div className="text-muted-foreground">{t('integrityShutdownDurationDays')}</div>
                          <Slider
                            min={1} max={45} step={1}
                            value={[sh.durationDays]}
                            disabled={active.locked}
                            onValueChange={v => setShutdown(sh.id, s => { s.durationDays = v[0] })}
                          />
                          <div>{sh.durationDays}</div>
                        </label>
                      </div>
                      <input
                        className="w-full bg-transparent border rounded px-2 py-1 text-xs"
                        value={tt(sh.reason)}
                        disabled={active.locked}
                        placeholder={t('integrityShutdownReasonPlaceholder')}
                        onChange={e => setShutdown(sh.id, s => { s.reason = e.target.value })}
                      />
                      <div className="text-[11px] text-muted-foreground">
                        {t('integrityShutdownEffectPrefix')} <b>{(eq.baseFlowShareKt * sh.durationDays).toFixed(0)} kt</b>{t('integrityShutdownEnergyHint')}
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── ИИ-советник ──────────────────────────────────────────────────── */}
        <TabsContent value="advisor" className="space-y-3">
          <AdvisorBrief impact={impact} />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Brain className="h-4 w-4 text-violet-500" /> {t('integrityAdvisorTitle')}
                <Badge variant="outline" className="text-[10px]">{t('integrityAdvisorBadge')}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                {impact.items.length === 0 ? (
                  <div className="text-xs text-muted-foreground">{t('integrityNoChanges')}</div>
                ) : impact.items.map((it, i) => (
                  <div key={i} className={`rounded border p-2.5 text-xs ${
                    it.level === "critical" ? "border-red-500/40 bg-red-500/5"
                    : it.level === "negative" ? "border-amber-500/40 bg-amber-500/5"
                    : it.level === "positive" ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-border bg-muted/30"
                  }`}>
                    <div className="font-medium mb-1 flex items-center gap-1.5">
                      {it.level === "critical" && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                      {it.level === "negative" && <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />}
                      {it.level === "positive" && <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />}
                      {tt(it.title)}
                    </div>
                    <div className="text-muted-foreground">{tt(it.text)}</div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {it.sources.slice(0, 6).map(s => (
                        <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-background border">
                          {tt(SOURCE_LABEL[s])}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Layers className="h-4 w-4" /> {t('integritySourcesTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SourceImpactHeatmap intensities={impact.affectedSources} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Сравнение сценариев ──────────────────────────────────────────── */}
        <TabsContent value="compare" className="space-y-3">
          <CompareBrief allMetrics={allMetrics} />
          <div className="grid lg:grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('integrityCompareKpiTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={allMetrics.map(({ s, m }) => ({
                    name: tt(s.name), capex: m.totalCapexMln, risk: m.avgRisk, integrity: m.integrityIndex, loss: m.revenueLossMln,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-12} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="capex" name={t('integrityCompareCapexLabel')} fill="#0ea5e9" />
                    <Bar dataKey="integrity" name={t('integrityCompareIndexLabel')} fill="#22c55e" />
                    <Bar dataKey="risk" name={t('integrityCompareRiskLabel')} fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('integrityCompareRadarTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData(allMetrics, t)}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis tick={{ fontSize: 9 }} angle={30} domain={[0, 100]} />
                    {allMetrics.map(({ s }) => (
                      <Radar key={s.id} name={tt(s.name)} dataKey={s.id} stroke={s.color} fill={s.color} fillOpacity={0.18} />
                    ))}
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('integrityRiskTimelineTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={riskTimelineData(allMetrics)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="m" tick={{ fontSize: 10 }} tickFormatter={monthLabel} interval={2} />
                  <YAxis tick={{ fontSize: 10 }} domain={[0, 70]} />
                  <Tooltip labelFormatter={(v) => monthLabel(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {allMetrics.map(({ s }) => (
                    <Line key={s.id} type="monotone" dataKey={s.id} stroke={s.color} strokeWidth={2} dot={false} name={tt(s.name)} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('integrityCapexTimelineTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={capexTimeline(activeMetrics, baseMetrics)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="m" tick={{ fontSize: 10 }} tickFormatter={monthLabel} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip labelFormatter={(v) => monthLabel(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="base" name={t('integrityCapexTimelineBase')} fill="#94a3b8" />
                  <Bar dataKey="active" name={tt(active.name)} fill={active.color} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Дерево источников ────────────────────────────────────────────── */}
        <TabsContent value="sources" className="space-y-3">
          <SourcesBrief affected={impact.affectedSources} />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="h-4 w-4" /> {t('integritySourceTreeTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(sourcesByGroup).map(([g, arr]) => (
                  <div key={g} className="rounded border p-2.5">
                    <div className="text-xs font-medium mb-1.5 flex items-center gap-1.5">
                      <Workflow className="h-3.5 w-3.5 text-muted-foreground" />
                      {tt(SOURCE_GROUP_LABEL[g as keyof typeof SOURCE_GROUP_LABEL])}
                    </div>
                    <div className="space-y-1">
                      {arr.map(src => {
                        const intensity = sourceIntensity.get(src.key) ?? 0
                        const highlighted = highlightedSources.includes(src.key)
                        return (
                          <div
                            key={src.key}
                            className={`text-[11px] rounded px-2 py-1 flex items-center justify-between gap-2 transition-colors ${
                              highlighted ? "ring-1 ring-violet-500" : ""
                            }`}
                            style={{
                              backgroundColor: intensity > 0
                                ? `rgba(139, 92, 246, ${0.08 + intensity * 0.25})`
                                : "transparent",
                            }}
                          >
                            <span>{tt(src.label)}</span>
                            {intensity > 0 && (
                              <span className="text-[10px] text-violet-500 font-medium">
                                {Math.round(intensity * 100)}%
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Сегменты ─────────────────────────────────────────────────────── */}
        <TabsContent value="segments" className="space-y-3">
          <SegmentsBrief activeMetrics={activeMetrics} baseMetrics={baseMetrics} />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('integritySegmentsTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left border-b text-muted-foreground">
                    <th className="py-2">{t('integrityScenSegment')}</th>
                    <th>{t('integrityScenBranch')}</th>
                    <th>{t('integrityScenLength')}</th>
                    <th>{t('integrityScenMetalLoss')}</th>
                    <th>{t('integrityScenCracks')}</th>
                    <th>{t('integrityScenCp')}</th>
                    <th>{t('integrityScenCoating')}</th>
                    <th>{t('integrityScenRisk')}</th>
                    <th>{t('integrityScenDeltaRisk')}</th>
                  </tr>
                </thead>
                <tbody>
                  {BASE_SEGMENTS.map((seg, i) => {
                    const fin = activeMetrics.finalSegments[i]
                    const baseFin = baseMetrics.finalSegments[i]
                    const dRisk = fin.risk - baseFin.risk
                    const rl = riskLabel(fin.risk)
                    return (
                      <tr key={seg.id} className="border-b">
                        <td className="py-2 font-medium">{tt(seg.name)}</td>
                        <td className="text-muted-foreground">{tt(seg.npu)}</td>
                        <td>{seg.lengthKm} km</td>
                        <td>{fin.metalLossPct.toFixed(1)}%</td>
                        <td>{fin.cracks.toFixed(1)}</td>
                        <td>{fin.cpCompliancePct.toFixed(0)}%</td>
                        <td>{fin.coatingHealth.toFixed(0)}%</td>
                        <td>
                          <Badge variant="outline" className={
                            rl === "high" ? "text-red-500 border-red-500/40"
                            : rl === "medium" ? "text-amber-500 border-amber-500/40"
                            : "text-emerald-500 border-emerald-500/40"
                          }>
                            {fin.risk.toFixed(1)}
                          </Badge>
                        </td>
                        <td className={`font-medium ${dRisk > 1 ? "text-red-500" : dRisk < -1 ? "text-emerald-500" : "text-muted-foreground"}`}>
                          {dRisk > 0 ? "+" : ""}{dRisk.toFixed(1)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Subcomponents ──────────────────────────────────────────────────────────
function ScenarioPicker({
  scenarios, activeId, onSelect, onCreate, onReset, baseMetrics, getMetrics,
}: {
  scenarios: Scenario[]
  activeId: string
  onSelect: (id: string) => void
  onCreate: () => void
  onReset: () => void
  baseMetrics: ReturnType<typeof computeScenario>
  getMetrics: (id: string) => ReturnType<typeof computeScenario>
}) {
  const { t, translateData } = useLanguage()
  const tt = translateData
  return (
    <div className="flex items-stretch gap-2 flex-wrap">
      {scenarios.map(s => {
        const m = getMetrics(s.id)
        const dCapex = m.totalCapexMln - baseMetrics.totalCapexMln
        const dRisk = m.avgRisk - baseMetrics.avgRisk
        const isActive = s.id === activeId
        return (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`text-left rounded-md border p-2.5 transition-all flex-1 min-w-[180px] max-w-[260px] ${
              isActive ? "ring-2 ring-offset-1" : "hover:bg-muted/40"
            }`}
            style={isActive ? { borderColor: s.color, boxShadow: `0 0 0 1px ${s.color}` } : {}}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              <span className="text-xs font-medium">{tt(s.name)}</span>
              {s.locked && <Badge variant="outline" className="text-[9px] py-0">{t('integrityScenarioBaseTag')}</Badge>}
            </div>
            <div className="text-[10px] text-muted-foreground mb-1.5">{tt(s.description)}</div>
            <div className="flex items-center gap-2 text-[10px]">
              <span>CAPEX <b>{m.totalCapexMln.toFixed(0)}</b></span>
              {s.id !== "base" && (
                <span className={dCapex > 0 ? "text-amber-500" : "text-emerald-500"}>
                  {dCapex > 0 ? "+" : ""}{dCapex.toFixed(0)}
                </span>
              )}
              <span>· {t('integrityCompareRiskLabel')} <b>{m.avgRisk.toFixed(1)}</b></span>
              {s.id !== "base" && (
                <span className={dRisk > 0 ? "text-red-500" : "text-emerald-500"}>
                  {dRisk > 0 ? "+" : ""}{dRisk.toFixed(1)}
                </span>
              )}
            </div>
          </button>
        )
      })}
      <div className="flex flex-col gap-1.5">
        <Button size="sm" variant="outline" onClick={onCreate}>
          <PlusCircle className="h-3.5 w-3.5 mr-1" />{t('integrityScenarioCustomBtn')}
        </Button>
        <Button size="sm" variant="ghost" onClick={onReset}>
          <RotateCcw className="h-3.5 w-3.5 mr-1" />{t('integrityScenarioResetBtn')}
        </Button>
      </div>
    </div>
  )
}

function KpiBar({ metrics, delta }: { metrics: ReturnType<typeof computeScenario>; delta: { capex: number; integrity: number; risk: number; revenue: number; safety: number } }) {
  const { t } = useLanguage()
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
      <KpiCell title={t('integrityKpiCapex')} value={metrics.totalCapexMln.toFixed(0)} delta={delta.capex} invert icon={<Wrench className="h-3.5 w-3.5 text-blue-500" />} progress={Math.min(100, metrics.totalCapexMln / BASE_TOTAL_CAPEX * 100)} />
      <KpiCell title={t('integrityKpiIndex')} value={`${metrics.integrityIndex.toFixed(1)} %`} delta={delta.integrity} icon={<ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />} progress={metrics.integrityIndex} />
      <KpiCell title={t('integrityKpiAvgRisk')} value={metrics.avgRisk.toFixed(1)} delta={delta.risk} invert icon={<ShieldAlert className="h-3.5 w-3.5 text-red-500" />} progress={metrics.avgRisk} />
      <KpiCell title={t('integrityKpiHrSegments')} value={String(metrics.highRiskSegments)} delta={0} icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-500" />} progress={(metrics.highRiskSegments / BASE_SEGMENTS.length) * 100} />
      <KpiCell title={t('integrityKpiThroughputLoss')} value={metrics.throughputLossKt.toFixed(0)} delta={0} invert icon={<Zap className="h-3.5 w-3.5 text-amber-500" />} progress={Math.min(100, metrics.throughputLossKt / 50)} />
      <KpiCell title={t('integrityKpiNpv')} value={`${metrics.npvBenefit > 0 ? "+" : ""}${metrics.npvBenefit.toFixed(0)}`} delta={0} icon={<Gauge className="h-3.5 w-3.5 text-violet-500" />} progress={50 + clamp(metrics.npvBenefit / 20, -50, 50)} />
    </div>
  )
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }

function KpiCell({ title, value, delta, icon, progress, invert }: { title: string; value: string; delta: number; icon: React.ReactNode; progress: number; invert?: boolean }) {
  const { t } = useLanguage()
  const goodPos = invert ? delta < 0 : delta > 0
  const goodNeg = invert ? delta > 0 : delta < 0
  return (
    <Card>
      <CardContent className="p-2.5 space-y-1">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{title}</span>
          {icon}
        </div>
        <div className="text-base font-semibold leading-tight">{value}</div>
        {Math.abs(delta) > 0.1 && (
          <div className={`text-[10px] ${goodPos ? "text-emerald-500" : goodNeg ? "text-red-500" : "text-muted-foreground"}`}>
            {delta > 0 ? "+" : ""}{delta.toFixed(1)} {t('integrityVsBase')}
          </div>
        )}
        <Progress value={progress} className="h-1" />
      </CardContent>
    </Card>
  )
}

function ActionLeverRow({ action, lever, locked, onChange, onHoverSources }: {
  action: typeof BASE_ACTIONS[number]
  lever: LeverAction | undefined
  locked?: boolean
  onChange: (l: Omit<LeverAction, "actionId">) => void
  onHoverSources: (s: SourceKey[]) => void
}) {
  const { t, translateData } = useLanguage()
  const tt = translateData
  const [open, setOpen] = useState(false)
  const shift = lever?.shiftMonths ?? 0
  const bm = lever?.budgetMultiplier ?? 1
  const skip = lever?.skip ?? false
  const isModified = (shift !== 0) || (bm !== 1) || skip

  const priorityColor = action.priority === "critical" ? "text-red-500 border-red-500/40"
                      : action.priority === "high"     ? "text-amber-500 border-amber-500/40"
                      :                                  "text-blue-500 border-blue-500/40"

  return (
    <div
      className={`rounded border p-2.5 ${isModified ? "border-violet-500/40 bg-violet-500/5" : ""}`}
      onMouseEnter={() => onHoverSources(action.sourcesUsed)}
      onMouseLeave={() => onHoverSources([])}
    >
      <button onClick={() => setOpen(o => !o)} className="w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Badge variant="outline" className={`text-[9px] py-0 ${priorityColor}`}>
                {action.priority === "critical" ? t('integrityPriorityCritical') : action.priority === "high" ? t('integrityPriorityHigh') : t('integrityPriorityMedium')}
              </Badge>
              <span className="text-[10px] text-muted-foreground">{action.segmentId} · {monthLabel(action.baseMonth)} · {action.baseBudgetMln} {t('briefingMlnTenge')}</span>
            </div>
            <div className="text-xs font-medium">{tt(action.description)}</div>
          </div>
          {open ? <ChevronDown className="h-3.5 w-3.5 mt-1" /> : <ChevronRight className="h-3.5 w-3.5 mt-1" />}
        </div>
      </button>
      {open && (
        <div className="mt-3 pt-3 border-t space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                <FastForward className="h-3 w-3" />{t('integrityShiftLabel')}: {shift > 0 ? "+" : ""}{shift}
              </div>
              <Slider
                min={-6} max={12} step={1}
                value={[shift]}
                disabled={locked || skip}
                onValueChange={v => onChange({ shiftMonths: v[0], budgetMultiplier: bm, skip })}
              />
              <div className="text-[10px] text-muted-foreground">
                {t('integrityShiftEffect')}: {monthLabel(Math.max(0, action.baseMonth + shift))}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Gauge className="h-3 w-3" />{t('integrityBudgetLabel')}: ×{bm.toFixed(2)}
              </div>
              <Slider
                min={0.5} max={1.5} step={0.05}
                value={[bm]}
                disabled={locked || skip}
                onValueChange={v => onChange({ shiftMonths: shift, budgetMultiplier: v[0], skip })}
              />
              <div className="text-[10px] text-muted-foreground">
                ≈ {(action.baseBudgetMln * bm).toFixed(0)} {t('briefingMlnTenge')}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-[11px]">
              <input
                type="checkbox"
                checked={skip}
                disabled={locked}
                onChange={e => onChange({ shiftMonths: shift, budgetMultiplier: bm, skip: e.target.checked })}
              />
              <span>{t('integritySkipLabel')}</span>
            </label>
            {isModified && !locked && (
              <Button size="sm" variant="ghost" onClick={() => onChange({ shiftMonths: 0, budgetMultiplier: 1, skip: false })}>
                <MinusCircle className="h-3 w-3 mr-1" />{t('integrityResetLever')}
              </Button>
            )}
          </div>

          <div className="text-[10px]">
            <div className="text-muted-foreground mb-1">{t('integrityAffectedSources')}:</div>
            <div className="flex flex-wrap gap-1">
              {action.sourcesUsed.map(s => (
                <span key={s} className="px-1.5 py-0.5 rounded bg-background border">{tt(SOURCE_LABEL[s])}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DeltaGrid({ delta }: { delta: { capex: number; integrity: number; risk: number; revenue: number; safety: number } }) {
  const { t } = useLanguage()
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
      <DeltaTile label={t('integrityDeltaCapex')}     value={delta.capex}     positiveIsGood={false} />
      <DeltaTile label={t('integrityDeltaIntegrity')} value={delta.integrity} positiveIsGood />
      <DeltaTile label={t('integrityDeltaRisk')}      value={delta.risk}      positiveIsGood={false} />
      <DeltaTile label={t('integrityDeltaRevenue')}   value={delta.revenue}   positiveIsGood={false} />
      <DeltaTile label={t('integrityDeltaSafety')}    value={delta.safety}    positiveIsGood />
    </div>
  )
}

function DeltaTile({ label, value, positiveIsGood }: { label: string; value: number; positiveIsGood: boolean }) {
  const isPositive = value > 0
  const isGood = positiveIsGood ? value > 0 : value < 0
  const color = Math.abs(value) < 0.5 ? "text-muted-foreground"
              : isGood ? "text-emerald-500" : isPositive ? "text-amber-500" : "text-red-500"
  return (
    <div className="rounded border p-2 bg-muted/30">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`text-base font-semibold ${color}`}>
        {value > 0 ? "+" : ""}{Math.abs(value) >= 1 ? value.toFixed(0) : value.toFixed(1)}
      </div>
    </div>
  )
}

function SourceImpactHeatmap({ intensities }: { intensities: { key: SourceKey; intensity: number }[] }) {
  const { t, translateData } = useLanguage()
  if (intensities.length === 0) {
    return <div className="text-xs text-muted-foreground">{t('integrityNoSourcesUsed')}</div>
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
      {intensities.map(({ key, intensity }) => (
        <div key={key} className="rounded border p-2 text-xs" style={{
          background: `linear-gradient(90deg, rgba(139,92,246,${0.08 + intensity * 0.3}), transparent)`,
        }}>
          <div className="flex items-center justify-between gap-2">
            <span>{translateData(SOURCE_LABEL[key])}</span>
            <span className="text-[10px] text-violet-500 font-medium">
              {Math.round(intensity * 100)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Tab briefs (executive summaries) ───────────────────────────────────────
type Tone = "ok" | "warn" | "danger" | "info"

function TabBrief({
  tone, icon, title, headline, highlights, actions,
}: {
  tone: Tone
  icon: React.ReactNode
  title: string
  headline: React.ReactNode
  highlights: { label: string; value: React.ReactNode; tone?: Tone }[]
  actions?: React.ReactNode[]
}) {
  const toneClass =
    tone === "ok"     ? "border-emerald-500/30 bg-emerald-500/5"
  : tone === "warn"   ? "border-amber-500/30 bg-amber-500/5"
  : tone === "danger" ? "border-red-500/30 bg-red-500/5"
  :                     "border-violet-500/30 bg-violet-500/5"
  const dotColor =
    tone === "ok"     ? "text-emerald-500"
  : tone === "warn"   ? "text-amber-500"
  : tone === "danger" ? "text-red-500"
  :                     "text-violet-500"
  return (
    <div className={`rounded-md border ${toneClass} p-3`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={dotColor}>{icon}</span>
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{title}</span>
      </div>
      <div className="text-sm font-medium leading-snug mb-2.5">{headline}</div>
      {highlights.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
          {highlights.map((h, i) => {
            const valTone = h.tone
            const valClass =
              valTone === "ok"     ? "text-emerald-500"
            : valTone === "warn"   ? "text-amber-500"
            : valTone === "danger" ? "text-red-500"
            :                        ""
            return (
              <div key={i} className="rounded border bg-background/60 p-2">
                <div className="text-[10px] text-muted-foreground">{h.label}</div>
                <div className={`text-sm font-semibold ${valClass}`}>{h.value}</div>
              </div>
            )
          })}
        </div>
      )}
      {actions && actions.length > 0 && (
        <ul className="space-y-0.5">
          {actions.map((a, i) => (
            <li key={i} className="text-xs flex items-start gap-1.5">
              <span className={`mt-0.5 ${dotColor}`}>→</span>
              <span>{a}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ScenariosBrief({
  active, metrics, baseMetrics, impact,
}: {
  active: Scenario
  metrics: ReturnType<typeof computeScenario>
  baseMetrics: ReturnType<typeof computeScenario>
  impact: ReturnType<typeof analyzeScenarioImpact>
}) {
  const { t, translateData } = useLanguage()
  const tt = translateData
  const modified = active.actionLevers.length
  const skipped = active.actionLevers.filter(l => l.skip).length
  const shutdowns = active.shutdowns.length
  const dCapex = metrics.totalCapexMln - baseMetrics.totalCapexMln
  const dRisk = metrics.avgRisk - baseMetrics.avgRisk

  const tone: Tone =
    active.id === "base"  ? "info"
    : dRisk > 3           ? "danger"
    : dRisk > 1           ? "warn"
    : dRisk < -1          ? "ok"
    :                       "info"

  const headline = active.id === "base"
    ? t('integrityScenarioBriefHeadlineBase')
    : tt(impact.headline)

  // 2 самых значимых изменения
  const topItems = impact.items
    .slice()
    .sort((a, b) => weight(b.level) - weight(a.level))
    .slice(0, 2)

  return (
    <TabBrief
      tone={tone}
      icon={<Target className="h-4 w-4" />}
      title={t('integrityScenarioBriefTitle')}
      headline={<><b>{tt(active.name)}.</b> {headline}</>}
      highlights={[
        { label: t('integrityScenarioBriefLeversChanged'), value: modified || "—" },
        { label: t('integrityScenarioBriefSkipped'),       value: skipped || "—", tone: skipped > 0 ? "warn" : undefined },
        { label: t('integrityScenarioBriefShutdowns'),     value: shutdowns || "—" },
        {
          label: t('integrityScenarioBriefDeltaCapexRisk'),
          value: `${dCapex > 0 ? "+" : ""}${dCapex.toFixed(0)} ${t('briefingMlnTenge')} · ${dRisk > 0 ? "+" : ""}${dRisk.toFixed(1)}`,
          tone: dCapex < 0 && dRisk < 1 ? "ok" : dRisk > 3 ? "danger" : dRisk > 1 ? "warn" : undefined,
        },
      ]}
      actions={topItems.length > 0 ? topItems.map(item => tt(item.title)) : undefined}
    />
  )
}

function weight(l: "critical" | "negative" | "neutral" | "positive") {
  return l === "critical" ? 3 : l === "negative" ? 2 : l === "positive" ? 1 : 0
}

function AdvisorBrief({ impact }: { impact: ReturnType<typeof analyzeScenarioImpact> }) {
  const { t, translateData } = useLanguage()
  const tt = translateData
  const critical = impact.items.filter(i => i.level === "critical").length
  const negative = impact.items.filter(i => i.level === "negative").length
  const positive = impact.items.filter(i => i.level === "positive").length
  const tone: Tone =
    critical > 0 ? "danger" : negative > positive ? "warn" : positive > 0 ? "ok" : "info"

  const dCapex = impact.delta.capex
  const dRisk = impact.delta.risk
  const dNpv = impact.delta.capex !== 0 || impact.delta.risk !== 0
    ? -(impact.delta.capex) - impact.delta.revenue * 0.5
    : 0

  return (
    <TabBrief
      tone={tone}
      icon={<Sparkles className="h-4 w-4" />}
      title={t('integrityAdvisorBriefTitle')}
      headline={tt(impact.headline)}
      highlights={[
        { label: t('integrityAdvisorBriefDeltaCapex'), value: fmtSigned(dCapex),
          tone: Math.abs(dCapex) < 1 ? undefined : dCapex < 0 ? "ok" : "warn" },
        { label: t('integrityAdvisorBriefDeltaRisk'), value: fmtSigned(dRisk, 1),
          tone: Math.abs(dRisk) < 0.5 ? undefined : dRisk < 0 ? "ok" : dRisk > 3 ? "danger" : "warn" },
        { label: t('integrityAdvisorBriefDeltaNpv'), value: fmtSigned(dNpv),
          tone: dNpv > 50 ? "ok" : dNpv < -50 ? "danger" : undefined },
        { label: t('integrityAdvisorBriefBalance'),
          value: `${critical} / ${negative} / ${positive}`,
          tone: critical > 0 ? "danger" : undefined },
      ]}
      actions={[
        <span><b>{t('integrityAdvisorBriefRecommend')}:</b> {tt(impact.recommendation)}</span>,
        ...(critical > 0
          ? [<span><b>{t('integrityAdvisorBriefAttention')}:</b> {tt(impact.items.find(i => i.level === "critical")!.title)}</span>]
          : []),
      ]}
    />
  )
}

function CompareBrief({ allMetrics }: { allMetrics: { s: Scenario; m: ReturnType<typeof computeScenario> }[] }) {
  const { t, translateData, language } = useLanguage()
  const tt = translateData
  const minCapex = allMetrics.reduce((a, b) => a.m.totalCapexMln < b.m.totalCapexMln ? a : b)
  const maxIntegrity = allMetrics.reduce((a, b) => a.m.integrityIndex > b.m.integrityIndex ? a : b)
  const bestNpv = allMetrics.reduce((a, b) => a.m.npvBenefit > b.m.npvBenefit ? a : b)
  const worstRisk = allMetrics.reduce((a, b) => a.m.avgRisk > b.m.avgRisk ? a : b)

  const headlineEn = <>Best NPV — <b style={{ color: bestNpv.s.color }}>{tt(bestNpv.s.name)}</b>
        {" "}({bestNpv.m.npvBenefit > 0 ? "+" : ""}{bestNpv.m.npvBenefit.toFixed(0)} {t('briefingMlnTenge')}).
        {" "}Highest risk in <b style={{ color: worstRisk.s.color }}>{tt(worstRisk.s.name)}</b>.</>
  const headlineRu = <>Лучший по NPV — <b style={{ color: bestNpv.s.color }}>{tt(bestNpv.s.name)}</b>
        {" "}({bestNpv.m.npvBenefit > 0 ? "+" : ""}{bestNpv.m.npvBenefit.toFixed(0)} {t('briefingMlnTenge')}).
        {" "}Высший риск даёт <b style={{ color: worstRisk.s.color }}>{tt(worstRisk.s.name)}</b>.</>

  return (
    <TabBrief
      tone="info"
      icon={<Lightbulb className="h-4 w-4" />}
      title={t('integrityCompareBriefTitle')}
      headline={language === 'en' ? headlineEn : headlineRu}
      highlights={[
        { label: t('integrityCompareBriefMinCapex'),     value: <><b>{tt(minCapex.s.name)}</b> · {minCapex.m.totalCapexMln.toFixed(0)} {t('briefingMlnTenge')}</> },
        { label: t('integrityCompareBriefMaxIntegrity'), value: <><b>{tt(maxIntegrity.s.name)}</b> · {maxIntegrity.m.integrityIndex.toFixed(1)} %</>, tone: "ok" },
        { label: t('integrityCompareBriefBestNpv'),      value: <><b>{tt(bestNpv.s.name)}</b></>, tone: "ok" },
        { label: t('integrityCompareBriefWorstRisk'),    value: <><b>{tt(worstRisk.s.name)}</b> · {worstRisk.m.avgRisk.toFixed(1)}</>, tone: "danger" },
      ]}
      actions={[
        t('integrityCompareBriefBalanced'),
        t('integrityCompareBriefMinCapexNote'),
      ]}
    />
  )
}

function SourcesBrief({ affected }: { affected: { key: SourceKey; intensity: number }[] }) {
  const { t, translateData, language } = useLanguage()
  const tt = translateData
  const total = SOURCES.length
  const touched = affected.length
  const topSources = affected.slice(0, 3)
  const groups = new Set(affected.map(a => SOURCES.find(s => s.key === a.key)?.group).filter(Boolean))
  const tone: Tone = touched === 0 ? "info" : touched > 15 ? "warn" : "ok"

  const headlineRu = <>В сценарии задействовано <b>{touched} из {total}</b> источников из <b>{groups.size} из 6</b> групп.</>
  const headlineEn = <>The scenario involves <b>{touched} of {total}</b> sources across <b>{groups.size} of 6</b> groups.</>

  return (
    <TabBrief
      tone={tone}
      icon={<Layers className="h-4 w-4" />}
      title={t('integritySourcesBriefTitle')}
      headline={
        touched === 0
          ? t('integritySourcesBriefNone')
          : (language === 'en' ? headlineEn : headlineRu)
      }
      highlights={topSources.length > 0
        ? topSources.map((s, i) => ({
            label: [t('integritySourcesBriefRank1'), t('integritySourcesBriefRank2'), t('integritySourcesBriefRank3')][i],
            value: <>{tt(SOURCE_LABEL[s.key])} · {Math.round(s.intensity * 100)}%</>,
          }))
        : [{ label: t('integritySourcesBriefTouched'), value: "0" }]
      }
      actions={touched > 0 ? [
        t('integritySourcesBriefAction1'),
        t('integritySourcesBriefAction2'),
      ] : undefined}
    />
  )
}

function SegmentsBrief({
  activeMetrics, baseMetrics,
}: {
  activeMetrics: ReturnType<typeof computeScenario>
  baseMetrics: ReturnType<typeof computeScenario>
}) {
  const { t, translateData, language } = useLanguage()
  const tt = translateData
  const fin = activeMetrics.finalSegments
  const segByRisk = fin.map((f, i) => ({ seg: BASE_SEGMENTS[i], f })).sort((a, b) => b.f.risk - a.f.risk)
  const worst = segByRisk[0]
  const best = segByRisk[segByRisk.length - 1]
  const deltas = fin.map((f, i) => ({ seg: BASE_SEGMENTS[i], d: f.risk - baseMetrics.finalSegments[i].risk }))
  const worstDelta = deltas.reduce((a, b) => b.d > a.d ? b : a)
  const bestDelta = deltas.reduce((a, b) => b.d < a.d ? b : a)
  const hr = activeMetrics.highRiskSegments
  const tone: Tone = hr === 0 ? "ok" : hr <= 1 ? "info" : hr <= 2 ? "warn" : "danger"

  const headlineRu = <>На конец горизонта <b>{hr} из {BASE_SEGMENTS.length}</b> сегментов в зоне высокого риска.
        {" "}Наихудший — <b>{tt(worst.seg.name)}</b> (риск {worst.f.risk.toFixed(1)}).</>
  const headlineEn = <>By end of horizon <b>{hr} of {BASE_SEGMENTS.length}</b> segments are in the high-risk zone.
        {" "}Worst is <b>{tt(worst.seg.name)}</b> (risk {worst.f.risk.toFixed(1)}).</>

  const actionRu1 = `${tt(worst.seg.npu)} — ускорить плановые работы на участке ${worst.seg.id}.`
  const actionRu2 = "Сегментам с Δриск > +2 — пересмотреть рычаги (сдвиг/бюджет)."
  const actionEn1 = `${tt(worst.seg.npu)} — fast-track planned works on segment ${worst.seg.id}.`
  const actionEn2 = "For segments with Δrisk > +2 — review levers (shift/budget)."

  return (
    <TabBrief
      tone={tone}
      icon={<Workflow className="h-4 w-4" />}
      title={t('integritySegmentsBriefTitle')}
      headline={language === 'en' ? headlineEn : headlineRu}
      highlights={[
        { label: t('integritySegmentsBriefHrLow'), value: <><b>{tt(worst.seg.name)}</b> · {worst.f.risk.toFixed(1)}</>,
          tone: riskLabel(worst.f.risk) === "high" ? "danger" : "warn" },
        { label: t('integritySegmentsBriefRiskLow'), value: <><b>{tt(best.seg.name)}</b> · {best.f.risk.toFixed(1)}</>, tone: "ok" },
        { label: t('integritySegmentsBriefDeltaWorst'), value: <><b>{worstDelta.seg.id}</b> · {fmtSigned(worstDelta.d, 1)}</>,
          tone: worstDelta.d > 1 ? "danger" : undefined },
        { label: t('integritySegmentsBriefDeltaBest'), value: <><b>{bestDelta.seg.id}</b> · {fmtSigned(bestDelta.d, 1)}</>,
          tone: bestDelta.d < -1 ? "ok" : undefined },
      ]}
      actions={language === 'en' ? [actionEn1, actionEn2] : [actionRu1, actionRu2]}
    />
  )
}

function fmtSigned(v: number, digits = 0) {
  const sign = v > 0 ? "+" : ""
  return `${sign}${v.toFixed(digits)}`
}

// ─── Chart data helpers ─────────────────────────────────────────────────────
function radarData(all: { s: Scenario; m: ReturnType<typeof computeScenario> }[], t: (k: string) => string) {
  // нормализуем — чем больше, тем лучше (риск и потери инвертированы)
  const maxCapex = Math.max(...all.map(x => x.m.totalCapexMln), 1)
  const maxLoss  = Math.max(...all.map(x => x.m.revenueLossMln), 1)
  const labels = {
    integrity: t('integrityRadarIntegrity'),
    safety: t('integrityRadarSafety'),
    capex: t('integrityRadarSavedCapex'),
    throughput: t('integrityRadarThroughput'),
    lowRisk: t('integrityRadarLowRisk'),
  }
  const order = [labels.integrity, labels.safety, labels.capex, labels.throughput, labels.lowRisk] as const
  return order.map((metric) => {
    const row: Record<string, string | number> = { metric }
    for (const { s, m } of all) {
      row[s.id] =
        metric === labels.integrity  ? m.integrityIndex
      : metric === labels.safety     ? m.safetyScore
      : metric === labels.capex      ? clamp(100 - (m.totalCapexMln / maxCapex) * 100, 0, 100)
      : metric === labels.throughput ? clamp(100 - (m.revenueLossMln / maxLoss) * 100, 0, 100)
      :                                clamp(100 - m.avgRisk, 0, 100)
    }
    return row
  })
}

function riskTimelineData(all: { s: Scenario; m: ReturnType<typeof computeScenario> }[]) {
  const horizon = all[0].m.monthlyRisk.length
  return Array.from({ length: horizon }, (_, i) => {
    const row: Record<string, number> = { m: i }
    for (const { s, m } of all) row[s.id] = m.monthlyRisk[i].risk
    return row
  })
}

function capexTimeline(active: ReturnType<typeof computeScenario>, base: ReturnType<typeof computeScenario>) {
  return active.capexByMonth.map((v, i) => ({ m: i, active: +v.toFixed(1), base: +base.capexByMonth[i].toFixed(1) }))
}

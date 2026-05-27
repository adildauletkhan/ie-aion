/**
 * NpsScene — Desktop orthographic Canvas for NPS КазТрансОйл.
 * Stack: @react-three/fiber v8, @react-three/drei v9, three r182
 */
import { Suspense, useRef, useEffect, useState, Component, type ReactNode, type ErrorInfo } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

import { Ground             } from './objects/Ground'
import { TankFarm           } from './objects/TankFarm'
import { PodporPumpStation  } from './objects/PodporPumpStation'
import { FilterUnit         } from './objects/FilterUnit'
import { MainPumpStation    } from './objects/MainPumpStation'
import { Manifold           } from './objects/Manifold'
import { UkUkn              } from './objects/UkUkn'
import { DrainageBlock      } from './objects/DrainageBlock'
import { ControlRoom        } from './objects/ControlRoom'
import { PipelineNetwork    } from './objects/PipelineNetwork'
import { Labels             } from './objects/Labels'

import { useNpsStore, EquipParams } from './store'
import {
  CAM_POSITION, CAM_FOV, CAM_NEAR, CAM_FAR, CAM_TARGET,
  PIPE_COLOR,
} from './constants'
import { useScenePalette } from './palette'
import { useTheme } from '@/hooks/useTheme'
import { useLanguage } from '@/hooks/useLanguage'
import { getEquipmentDetails, type RepairRecord, type UpcomingWork } from './equipmentDetails'

// ─── Scene setup (imperative fog + bg avoids JSX primitive failures) ─────────
function SceneSetup({ onContextLost }: { onContextLost: () => void }) {
  const { scene, gl } = useThree()
  const palette       = useScenePalette()

  useEffect(() => {
    scene.background = new THREE.Color(palette.background)
    scene.fog        = new THREE.FogExp2(palette.fog, palette.fogDensity)
  }, [scene, palette.background, palette.fog, palette.fogDensity])

  useEffect(() => {
    gl.shadowMap.enabled = true
    gl.shadowMap.type    = THREE.PCFSoftShadowMap

    // Recover gracefully if the WebGL context is lost (e.g. after VR/AR crash)
    const canvas = gl.domElement
    const onLost = (e: Event) => {
      e.preventDefault()
      console.warn('[NpsScene] WebGL context lost — scheduling remount')
      onContextLost()
    }
    canvas.addEventListener('webglcontextlost', onLost, false)

    return () => {
      canvas.removeEventListener('webglcontextlost', onLost)
      scene.background = null
      scene.fog        = null
    }
  }, [scene, gl, onContextLost])
  return null
}

// ─── Theme-aware lights ───────────────────────────────────────────────────────
function SceneLights() {
  const palette = useScenePalette()
  return (
    <>
      <ambientLight color={palette.ambientLight} intensity={palette.ambientIntensity} />
      <directionalLight
        position={[20, 30, 15]}
        intensity={palette.sunIntensity}
        color={palette.sunColor}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.1}
        shadow-camera-far={200}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      <pointLight position={[-15, 8, 0]} intensity={palette.fillIntensity} color={palette.fillColor} />
    </>
  )
}

// ─── Info panel ───────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  running: '#22c55e', standby: '#f59e0b', fault: '#ef4444', maintenance: '#8b5cf6',
}
const STATUS_LABEL_KEY: Record<string, string> = {
  running: 'npsStatusRunning', standby: 'npsStatusStandby',
  fault: 'npsStatusFault', maintenance: 'npsStatusMaintenance',
}
const PRIORITY_COLOR: Record<string, string> = {
  critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#64748b',
}
const PRIORITY_LABEL_KEY: Record<string, string> = {
  critical: 'npsPriorityCritical', high: 'npsPriorityHigh',
  medium: 'npsPriorityMedium', low: 'npsPriorityLow',
}
const REPAIR_TYPE_LABEL_KEY: Record<string, string> = {
  plan: 'npsRepairPlan', unplan: 'npsRepairUnplan', overhaul: 'npsRepairOverhaul',
  inspection: 'npsRepairInspection', preventive: 'npsRepairPreventive', corrective: 'npsRepairCorrective',
}

function MetricBar({ label, value, max = 100, isDark, format = 'pct' }: {
  label: string; value: number; max?: number; isDark: boolean; format?: 'pct' | 'num'
}) {
  const { language } = useLanguage()
  const pct  = Math.max(0, Math.min(100, (value / max) * 100))
  const c    = pct >= 90 ? '#22c55e' : pct >= 75 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}>
        <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>{label}</span>
        <span style={{ fontWeight: 600 }}>{format === 'pct' ? `${value.toFixed(1)}%` : value.toLocaleString(language === 'en' ? 'en-GB' : 'ru-RU')}</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: c, transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}

function SectionTitle({ text, isDark }: { text: string; isDark: boolean }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase',
      color: isDark ? '#64748b' : '#94a3b8', marginTop: 14, marginBottom: 8,
      borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
      paddingTop: 12,
    }}>{text}</div>
  )
}

function HistoryItem({ rec, isDark }: { rec: RepairRecord; isDark: boolean }) {
  const { t, translateData: tt, language } = useLanguage()
  const c = rec.type === 'overhaul' ? '#8b5cf6'
          : rec.type === 'unplan'   ? '#ef4444'
          : rec.type === 'inspection' ? '#3b82f6'
          : '#22c55e'
  return (
    <div style={{
      borderLeft: `2px solid ${c}`, paddingLeft: 8, marginBottom: 8,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: c }}>
          {t(REPAIR_TYPE_LABEL_KEY[rec.type])} · {new Date(rec.date).toLocaleDateString(language === 'en' ? 'en-GB' : 'ru-RU', { month: 'short', year: 'numeric' })}
        </span>
        <span style={{ fontSize: 10, fontWeight: 700 }}>{rec.cost.toFixed(1)} {t('npsCurrencyMln')}</span>
      </div>
      <div style={{ fontSize: 10, color: isDark ? '#cbd5e1' : '#334155', marginBottom: 2, lineHeight: 1.35 }}>
        {tt(rec.description)}
      </div>
      <div style={{ fontSize: 9, color: isDark ? '#64748b' : '#94a3b8' }}>
        {t('npsRepairDowntime')}: {rec.duration}{t('npsUnitHours')} · {tt(rec.team)}
      </div>
    </div>
  )
}

function UpcomingItem({ work, isDark }: { work: UpcomingWork; isDark: boolean }) {
  const { t, translateData: tt, language } = useLanguage()
  const c = PRIORITY_COLOR[work.priority]
  const days = Math.ceil((new Date(work.date).getTime() - Date.now()) / 86400000)
  return (
    <div style={{
      borderRadius: 6, padding: '8px 10px', marginBottom: 6,
      background: isDark ? `${c}12` : `${c}0d`,
      border: `1px solid ${c}40`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: c }}>{t(PRIORITY_LABEL_KEY[work.priority])}</span>
        <span style={{ fontSize: 10, fontWeight: 700 }}>{work.budget.toFixed(1)} {t('npsCurrencyMln')}</span>
      </div>
      <div style={{ fontSize: 10, color: isDark ? '#cbd5e1' : '#334155', lineHeight: 1.35, marginBottom: 3 }}>
        {tt(work.description)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: isDark ? '#64748b' : '#94a3b8' }}>
        <span>{t(REPAIR_TYPE_LABEL_KEY[work.type])}</span>
        <span>
          {new Date(work.date).toLocaleDateString(language === 'en' ? 'en-GB' : 'ru-RU', { day: 'numeric', month: 'long' })}
          {days > 0 && days < 60 && ` · ${t('npsThroughDays')} ${days}${t('npsDaysSuffix')}`}
        </span>
      </div>
    </div>
  )
}

type TabId = 'overview' | 'metrics' | 'specs' | 'repairs'

function TabButton({ active, label, count, color, onClick, isDark }: {
  active: boolean; label: string; count?: number | string; color: string; onClick: () => void; isDark: boolean
}) {
  return (
    <button onClick={onClick} style={{
      flex: 1, background: 'none', border: 'none', cursor: 'pointer',
      padding: '8px 4px', fontSize: 11, fontWeight: active ? 700 : 500,
      color: active ? color : (isDark ? '#94a3b8' : '#64748b'),
      borderBottom: `2px solid ${active ? color : 'transparent'}`,
      fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
      transition: 'color 0.15s, border-color 0.15s',
    }}>
      {label}
      {count !== undefined && count !== 0 && (
        <span style={{
          fontSize: 9, padding: '1px 5px', borderRadius: 8,
          background: active ? `${color}25` : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
          color: active ? color : (isDark ? '#94a3b8' : '#64748b'),
          fontWeight: 700,
        }}>{count}</span>
      )}
    </button>
  )
}

function InfoPanel({ onClose, isDark }: { onClose: () => void; isDark: boolean }) {
  const { t, translateData: tt, language } = useLanguage()
  const selectedId = useNpsStore(s => s.selectedId)
  const getParams  = useNpsStore(s => s.getParams)
  const [tab, setTab] = useState<TabId>('overview')
  if (!selectedId) return null
  const params:  EquipParams | undefined = getParams(selectedId)
  const details = getEquipmentDetails(selectedId)
  if (!params) return null

  const liveRows = [
    params.pressure    && { k: t('npsLivePressure'),    v: tt(params.pressure)    },
    params.temperature && { k: t('npsLiveTemperature'), v: tt(params.temperature) },
    params.flowRate    && { k: t('npsLiveFlow'),        v: tt(params.flowRate)    },
    params.level       && { k: t('npsLiveLevel'),       v: tt(params.level)       },
  ].filter(Boolean) as { k: string; v: string }[]

  const totalRepairCost = details ? details.history.reduce((s, r) => s + r.cost, 0) : 0
  const upcomingBudget  = details ? details.upcoming.reduce((s, w) => s + w.budget, 0) : 0
  const repairsCount    = details ? details.history.length + details.upcoming.length : 0

  const accent = isDark ? '#60a5fa' : '#0f766e'

  return (
    <div style={{
      position: 'absolute', top: 12, right: 12, width: 360, maxHeight: 'calc(100% - 24px)',
      zIndex: 30, display: 'flex', flexDirection: 'column',
      background: isDark ? 'rgba(7,20,34,0.7)' : 'rgba(255,255,255,0.7)',
      border: isDark ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(15,118,110,0.25)',
      borderRadius: 12, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.12)',
      color: isDark ? '#e2e8f0' : '#0f3d35',
      fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12,
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px 10px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.25, marginBottom: 4 }}>
              {tt(details?.nameRu ?? selectedId)}
            </div>
            {details && (
              <div style={{ fontSize: 10, color: isDark ? '#94a3b8' : '#64748b', lineHeight: 1.35 }}>
                {tt(details.type)} · {tt(details.model)}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: isDark ? '#64748b' : '#475569',
            cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0, marginTop: -2,
          }}>×</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700,
            background: `${STATUS_COLOR[params.status]}22`,
            color: STATUS_COLOR[params.status],
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLOR[params.status] }} />
            {t(STATUS_LABEL_KEY[params.status])}
          </span>
          {details && (
            <span style={{ fontSize: 10, color: isDark ? '#94a3b8' : '#64748b' }}>
              {t('npsSectionInstalledShort')} {details.installed} {t('npsYearAbbr')}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
      }}>
        <TabButton active={tab === 'overview'} label={t('npsTabOverview')} color={accent} isDark={isDark} onClick={() => setTab('overview')} />
        <TabButton active={tab === 'metrics'}  label={t('npsTabMetrics')}  color={accent} isDark={isDark} onClick={() => setTab('metrics')} />
        <TabButton active={tab === 'specs'}    label={t('npsTabSpecs')}    color={accent} isDark={isDark} onClick={() => setTab('specs')}
          count={details?.specs.length} />
        <TabButton active={tab === 'repairs'}  label={t('npsTabRepairs')}  color={accent} isDark={isDark} onClick={() => setTab('repairs')}
          count={repairsCount} />
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px 16px' }}>

        {/* ─── Tab: Обзор ─────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <>
            {liveRows.length > 0 && (
              <>
                <div style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase',
                  color: isDark ? '#64748b' : '#94a3b8', marginBottom: 8,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e',
                    animation: 'pulse 1.4s infinite' }} />
                  SCADA · LIVE
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 4 }}>
                  {liveRows.map(({ k, v }) => (
                    <div key={k} style={{
                      borderRadius: 6, padding: '6px 8px',
                      background: isDark ? 'rgba(59,130,246,0.08)' : 'rgba(15,118,110,0.06)',
                    }}>
                      <div style={{ fontSize: 9, color: isDark ? '#94a3b8' : '#64748b' }}>{k}</div>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {details && (
              <>
                {/* Quick stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 12 }}>
                  <div style={{
                    borderRadius: 6, padding: '8px 10px',
                    background: isDark ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.06)',
                    border: '1px solid rgba(34,197,94,0.2)',
                  }}>
                    <div style={{ fontSize: 9, color: isDark ? '#94a3b8' : '#64748b' }}>{t('npsMetricOee')}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#22c55e' }}>
                      {details.metrics.oee.toFixed(1)}%
                    </div>
                  </div>
                  <div style={{
                    borderRadius: 6, padding: '8px 10px',
                    background: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.06)',
                    border: '1px solid rgba(99,102,241,0.2)',
                  }}>
                    <div style={{ fontSize: 9, color: isDark ? '#94a3b8' : '#64748b' }}>{t('npsSectionEfficiency')}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#818cf8' }}>
                      {details.metrics.efficiency.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Overhauls timeline */}
                <SectionTitle text={t('npsSectionMajorRepairs')} isDark={isDark} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <div>
                    <div style={{ fontSize: 9, color: isDark ? '#64748b' : '#94a3b8' }}>{t('npsSectionLast')}</div>
                    <div style={{ fontWeight: 700 }}>{new Date(details.lastOverhaul + '-01').toLocaleDateString(language === 'en' ? 'en-GB' : 'ru-RU', { month: 'long', year: 'numeric' })}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 9, color: isDark ? '#64748b' : '#94a3b8' }}>{t('npsSectionNext')}</div>
                    <div style={{ fontWeight: 700 }}>{new Date(details.nextOverhaul + '-01').toLocaleDateString(language === 'en' ? 'en-GB' : 'ru-RU', { month: 'long', year: 'numeric' })}</div>
                  </div>
                </div>

                {/* Manufacturer */}
                <SectionTitle text={t('npsSectionAboutEquip')} isDark={isDark} />
                <div style={{ fontSize: 11, lineHeight: 1.5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>{t('npsSectionManufacturer')}</span>
                    <span style={{ fontWeight: 600, textAlign: 'right' }}>{tt(details.manufacturer)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>{t('npsSectionYearInstalled')}</span>
                    <span style={{ fontWeight: 600 }}>{details.installed}</span>
                  </div>
                </div>

                {details.notes && (
                  <div style={{
                    marginTop: 12, padding: '8px 10px', borderRadius: 6,
                    fontSize: 10, lineHeight: 1.4,
                    background: isDark ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.08)',
                    border: '1px solid rgba(245,158,11,0.3)',
                    color: isDark ? '#fbbf24' : '#b45309',
                  }}>
                    {tt(details.notes)}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ─── Tab: Показатели ─────────────────────────────────────────── */}
        {tab === 'metrics' && details && (
          <>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase',
              color: isDark ? '#64748b' : '#94a3b8', marginBottom: 10,
            }}>{t('npsSectionEfficiency')}</div>
            <MetricBar label={t('npsMetricOee')}          value={details.metrics.oee}          isDark={isDark} />
            <MetricBar label={t('npsMetricAvailability')} value={details.metrics.availability} isDark={isDark} />
            <MetricBar label={t('npsMetricEfficiency')}   value={details.metrics.efficiency}   isDark={isDark} />
            <MetricBar label={t('npsMetricUptime')}       value={details.metrics.uptime}       isDark={isDark} />

            <SectionTitle text={t('npsSectionReliability')} isDark={isDark} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { label: 'MTBF',                      v: `${details.metrics.mtbf.toLocaleString(language === 'en' ? 'en-GB' : 'ru-RU')} ${t('npsUnitHours')}`,      hint: t('npsHintMtbf')    },
                { label: 'MTTR',                      v: `${details.metrics.mttr.toFixed(1)} ${t('npsUnitHours')}`,                                                hint: t('npsHintMttr')    },
                { label: t('npsMetricUptime'),        v: `${(details.metrics.workHours / 1000).toFixed(1)} ${t('npsUnitThousandHours')}`,                          hint: t('npsHintRuntime') },
              ].map(m => (
                <div key={m.label} style={{
                  borderRadius: 6, padding: '8px 10px',
                  background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                }}>
                  <div style={{ fontSize: 9, color: isDark ? '#94a3b8' : '#64748b' }}>{m.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2 }}>{m.v}</div>
                  <div style={{ fontSize: 8, color: isDark ? '#64748b' : '#94a3b8', marginTop: 2 }}>{m.hint}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ─── Tab: ТТХ ─────────────────────────────────────────────────── */}
        {tab === 'specs' && details && (
          <>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase',
              color: isDark ? '#64748b' : '#94a3b8', marginBottom: 10,
            }}>{t('npsSpecsTitle')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {details.specs.map(s => (
                <div key={s.label} style={{
                  display: 'flex', justifyContent: 'space-between', fontSize: 11, gap: 12,
                  paddingBottom: 8, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                }}>
                  <span style={{ color: isDark ? '#94a3b8' : '#64748b', flex: '1 1 auto' }}>{tt(s.label)}</span>
                  <span style={{ fontWeight: 600, textAlign: 'right', flex: '0 1 auto' }}>{tt(s.value)}</span>
                </div>
              ))}
            </div>
            <div style={{
              marginTop: 12, padding: '8px 10px', borderRadius: 6, fontSize: 11,
              background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>{t('npsSectionManufacturer')}</span>
                <span style={{ fontWeight: 600 }}>{tt(details.manufacturer)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>{t('npsSpecsModel')}</span>
                <span style={{ fontWeight: 600 }}>{tt(details.model)}</span>
              </div>
            </div>
          </>
        )}

        {/* ─── Tab: Ремонты ─────────────────────────────────────────────── */}
        {tab === 'repairs' && details && (
          <>
            {details.upcoming.length > 0 && (
              <>
                <div style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase',
                  color: isDark ? '#64748b' : '#94a3b8', marginBottom: 10,
                  display: 'flex', justifyContent: 'space-between',
                }}>
                  <span>{t('npsRepairsUpcoming')}</span>
                  <span>{upcomingBudget.toFixed(1)} {t('npsCurrencyMln')}</span>
                </div>
                {details.upcoming.map((w, i) => <UpcomingItem key={i} work={w} isDark={isDark} />)}
              </>
            )}

            {details.history.length > 0 && (
              <>
                <SectionTitle text={`${t('npsRepairsHistoryTotal')} ${totalRepairCost.toFixed(1)} ${t('npsCurrencyMln')}`} isDark={isDark} />
                {details.history.map((r, i) => <HistoryItem key={i} rec={r} isDark={isDark} />)}
              </>
            )}

            {details.upcoming.length === 0 && details.history.length === 0 && (
              <div style={{
                textAlign: 'center', padding: '24px 12px',
                fontSize: 11, color: isDark ? '#64748b' : '#94a3b8',
              }}>
                {t('npsRepairsEmpty')}
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}

// ─── Pipe legend ──────────────────────────────────────────────────────────────
function PipeLegend({ isDark }: { isDark: boolean }) {
  const { t } = useLanguage()
  const items = [
    { color: PIPE_COLOR.inlet,     label: t('npsLegendInlet')     },
    { color: PIPE_COLOR.feed,      label: t('npsLegendFeed')      },
    { color: PIPE_COLOR.filter,    label: t('npsLegendFilter')    },
    { color: PIPE_COLOR.suction,   label: t('npsLegendSuction')   },
    { color: PIPE_COLOR.discharge, label: t('npsLegendDischarge') },
    { color: PIPE_COLOR.drain,     label: t('npsLegendDrain')     },
  ]
  return (
    <div style={{
      position: 'absolute', top: 12, left: 12, zIndex: 30,
      background: isDark ? 'rgba(7,20,34,0.88)' : 'rgba(255,255,255,0.92)',
      border: isDark ? '1px solid rgba(59,130,246,0.2)' : '1px solid rgba(15,118,110,0.2)',
      borderRadius: 8, padding: '10px 12px', backdropFilter: 'blur(8px)',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {items.map(({ color, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5, fontSize: 11 }}>
          <div style={{ width: 24, height: 4, borderRadius: 2, background: color }} />
          <span style={{ color: isDark ? '#94a3b8' : '#475569' }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Error boundary for 3D scene ──────────────────────────────────────────────
class SceneErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null }
  static getDerivedStateFromError(e: Error) { return { error: e } }
  componentDidCatch(e: Error, info: ErrorInfo) { console.error('[NpsScene]', e, info) }
  render() {
    if (this.state.error) {
      return <SceneErrorView error={this.state.error} onRetry={() => this.setState({ error: null })} />
    }
    return this.props.children
  }
}

function SceneErrorView({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const { t } = useLanguage()
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#030c17', color: '#64748b',
      fontFamily: 'Inter, system-ui, sans-serif', fontSize: 13,
    }}>
      <div style={{ marginBottom: 8 }}>{t('npsErrorRender')}</div>
      <code style={{ fontSize: 11, color: '#ef4444', maxWidth: 400, textAlign: 'center' }}>
        {error.message}
      </code>
      <button
        onClick={onRetry}
        style={{ marginTop: 12, padding: '6px 16px', background: 'rgba(59,130,246,0.2)',
          border: '1px solid rgba(59,130,246,0.4)', borderRadius: 6, color: '#60a5fa',
          cursor: 'pointer', fontSize: 12 }}
      >{t('npsErrorRetry')}</button>
    </div>
  )
}

// ─── Main scene component ─────────────────────────────────────────────────────
export function NpsScene({ onBack: _onBack }: { onBack?: () => void } = {}) {
  const select      = useNpsStore(s => s.select)
  const controlsRef = useRef<any>(null)
  const { theme }   = useTheme()
  const isDark      = theme === 'dark'
  const { t }       = useLanguage()

  // Force-remount the Canvas when the WebGL context is lost
  const [canvasKey, setCanvasKey] = useState(0)
  const handleContextLost = () => {
    setTimeout(() => setCanvasKey(k => k + 1), 50)
  }

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      minHeight: '480px',
      flex: '1 1 auto',
    }}>
      <SceneErrorBoundary>
        <Canvas
          key={canvasKey}
          camera={{
            position: CAM_POSITION,
            fov:  CAM_FOV,
            near: CAM_NEAR,
            far:  CAM_FAR,
          }}
          shadows
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          style={{ width: '100%', height: '100%' }}
          onPointerMissed={() => select(null)}
        >
          <SceneSetup onContextLost={handleContextLost} />
          <SceneLights />

          <Suspense fallback={null}>
            <Ground />
            <TankFarm />
            <PodporPumpStation />
            <FilterUnit />
            <Manifold />
            <MainPumpStation />
            <UkUkn />
            <DrainageBlock />
            <ControlRoom />
            <PipelineNetwork />
            <Labels />
          </Suspense>

          <OrbitControls
            ref={controlsRef}
            target={CAM_TARGET}
            minDistance={15}
            maxDistance={120}
            maxPolarAngle={Math.PI / 2.1}
            minPolarAngle={0.25}
            enableDamping
            dampingFactor={0.08}
          />
        </Canvas>
      </SceneErrorBoundary>

      <PipeLegend isDark={isDark} />
      <InfoPanel onClose={() => select(null)} isDark={isDark} />
      <button
        onClick={() => controlsRef.current?.reset?.()}
        style={{
          position: 'absolute', bottom: 16, right: 16, zIndex: 30,
          background: isDark ? 'rgba(7,20,34,0.88)' : 'rgba(255,255,255,0.92)',
          border: isDark ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(15,118,110,0.3)',
          color: isDark ? '#60a5fa' : '#0f766e',
          borderRadius: 6, padding: '5px 12px',
          fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, cursor: 'pointer',
        }}
      >{t('npsResetView')}</button>
    </div>
  )
}

/**
 * FloatingPanel — Billboard SCADA card for VR/AR scenes.
 * Faces the player on Y-axis only, occludes behind geometry,
 * shows real-time metrics from zustand SCADA store.
 */
import { useState, useMemo } from 'react'
import { Html, Billboard } from '@react-three/drei'
import { useScadaStore } from '../data/useScada'
import { useLanguage } from '@/hooks/useLanguage'

interface MetricDef {
  label:    string
  metricId: string
  max?:     number
}

interface FloatingPanelProps {
  position:  [number, number, number]
  title:     string
  metrics:   MetricDef[]
}

const PANEL_CSS: React.CSSProperties = {
  width: 220,
  background: 'rgba(7,20,40,0.92)',
  borderRadius: 8,
  padding: '10px 14px',
  color: '#e2e8f0',
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 12,
  backdropFilter: 'blur(8px)',
  cursor: 'pointer',
  userSelect: 'none',
  whiteSpace: 'nowrap',
  pointerEvents: 'auto',
}

function BarMeter({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, (value / max) * 100)
  const color = pct > 90 ? '#ef4444' : pct > 75 ? '#f59e0b' : '#22c55e'
  return (
    <div style={{ height: 3, background: '#1e3a5f', borderRadius: 2, marginTop: 2 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2,
        transition: 'width 0.3s ease' }} />
    </div>
  )
}

export function FloatingPanel({ position, title, metrics }: FloatingPanelProps) {
  const { translateData: tt } = useLanguage()
  const [collapsed, setCollapsed] = useState(false)
  const scada = useScadaStore(s => s.metrics)

  const hasAlarm = useMemo(
    () => metrics.some(m => scada[m.metricId]?.alarm),
    [metrics, scada]
  )

  const borderColor = hasAlarm ? '#ef4444' : 'rgba(59,130,246,0.5)'
  const glow        = hasAlarm ? 'rgba(239,68,68,0.25)' : 'rgba(59,130,246,0.15)'

  return (
    <Billboard position={position} follow lockX={false} lockZ={false}>
      <Html
        transform
        occlude="blending"
        distanceFactor={8}
        center
        style={{ pointerEvents: 'none' }}
      >
        <div
          onClick={() => setCollapsed(c => !c)}
          style={{ ...PANEL_CSS, border: `2px solid ${borderColor}`,
            boxShadow: `0 0 24px ${glow}, 0 4px 16px rgba(0,0,0,0.5)` }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: collapsed ? 0 : 8 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: hasAlarm ? '#fca5a5' : '#60a5fa' }}>
              {hasAlarm && <span style={{ marginRight: 4 }}>⚠</span>}
              {tt(title)}
            </span>
            <span style={{ color: '#475569', fontSize: 10 }}>{collapsed ? '▼' : '▲'}</span>
          </div>

          {/* Metrics */}
          {!collapsed && metrics.map(m => {
            const metric = scada[m.metricId]
            const fmt = metric
              ? `${metric.value.toFixed(metric.unit === 'МПа' ? 2 : 0)} ${tt(metric.unit)}`
              : '—'
            return (
              <div key={m.metricId}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ color: '#94a3b8' }}>{tt(m.label)}</span>
                  <span style={{ color: metric?.alarm ? '#ef4444' : '#f1f5f9',
                    fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {fmt}
                  </span>
                </div>
                {m.max !== undefined && metric &&
                  <BarMeter value={metric.value} max={m.max} />
                }
              </div>
            )
          })}
        </div>
      </Html>
    </Billboard>
  )
}

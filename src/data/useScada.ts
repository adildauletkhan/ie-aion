/**
 * useScada — real-time SCADA data via WebSocket with mock fallback.
 * Shared across Desktop3D, VR and AR modes.
 */
import { useEffect, useRef } from 'react'
import { create } from 'zustand'

export interface ScadaMetric {
  value:     number
  unit:      string
  timestamp: number
  alarm:     boolean
}

interface ScadaState {
  metrics:      Record<string, ScadaMetric>
  connected:    boolean
  setMetric:    (id: string, m: ScadaMetric) => void
  setConnected: (v: boolean) => void
}

export const useScadaStore = create<ScadaState>((set) => ({
  metrics:      {},
  connected:    false,
  setMetric:    (id, m) => set(s => ({ metrics: { ...s.metrics, [id]: m } })),
  setConnected: (v) => set({ connected: v }),
}))

// Equipment metric definitions used by VR panels and AR labels
export const EQUIP_METRICS: Record<string, { label: string; metricId: string; max?: number }[]> = {
  RVS1: [
    { label: 'Уровень',    metricId: 'rvs1.level', max: 17.9 },
    { label: 'Заполнение', metricId: 'rvs1.fill',  max: 100  },
    { label: 'Температура',metricId: 'rvs1.temp'              },
  ],
  RVS2: [
    { label: 'Уровень',    metricId: 'rvs2.level', max: 17.9 },
    { label: 'Заполнение', metricId: 'rvs2.fill',  max: 100  },
    { label: 'Температура',metricId: 'rvs2.temp'              },
  ],
  RVS3: [
    { label: 'Уровень',    metricId: 'rvs3.level', max: 17.9 },
    { label: 'Заполнение', metricId: 'rvs3.fill',  max: 100  },
    { label: 'Температура',metricId: 'rvs3.temp'              },
  ],
  RVS4: [
    { label: 'Уровень',    metricId: 'rvs4.level', max: 17.9 },
    { label: 'Заполнение', metricId: 'rvs4.fill',  max: 100  },
    { label: 'Температура',metricId: 'rvs4.temp'              },
  ],
  PODPOR: [
    { label: 'Расход',   metricId: 'podpor.flow'  },
    { label: 'Давление', metricId: 'podpor.press' },
  ],
  NA1: [
    { label: 'Расход',   metricId: 'na1.flow'  },
    { label: 'Давление', metricId: 'na1.press' },
  ],
  NA2: [
    { label: 'Расход',   metricId: 'na2.flow'  },
    { label: 'Давление', metricId: 'na2.press' },
  ],
  NA3: [
    { label: 'Расход',   metricId: 'na3.flow'  },
    { label: 'Давление', metricId: 'na3.press' },
  ],
  SIKN: [
    { label: 'Расход суммарный', metricId: 'sikn.flow'  },
    { label: 'Давление',         metricId: 'sikn.press' },
  ],
}

const SEED: Record<string, Omit<ScadaMetric, 'timestamp'>> = {
  'rvs1.level':   { value: 12.8, unit: 'м',    alarm: false },
  'rvs1.fill':    { value: 72,   unit: '%',     alarm: false },
  'rvs1.temp':    { value: 42,   unit: '°C',    alarm: false },
  'rvs2.level':   { value: 11.6, unit: 'м',     alarm: false },
  'rvs2.fill':    { value: 65,   unit: '%',     alarm: false },
  'rvs2.temp':    { value: 41,   unit: '°C',    alarm: false },
  'rvs3.level':   { value: 14.5, unit: 'м',     alarm: false },
  'rvs3.fill':    { value: 81,   unit: '%',     alarm: false },
  'rvs3.temp':    { value: 40,   unit: '°C',    alarm: false },
  'rvs4.level':   { value: 16.7, unit: 'м',     alarm: true  },
  'rvs4.fill':    { value: 93,   unit: '%',     alarm: true  },
  'rvs4.temp':    { value: 39,   unit: '°C',    alarm: false },
  'podpor.flow':  { value: 490,  unit: 'м³/ч',  alarm: false },
  'podpor.press': { value: 0.48, unit: 'МПа',   alarm: false },
  'fs1.press':    { value: 0.42, unit: 'МПа',   alarm: false },
  'fs2.press':    { value: 0.41, unit: 'МПа',   alarm: false },
  'na1.flow':     { value: 363,  unit: 'м³/ч',  alarm: false },
  'na1.press':    { value: 6.84, unit: 'МПа',   alarm: false },
  'na2.flow':     { value: 365,  unit: 'м³/ч',  alarm: false },
  'na2.press':    { value: 6.82, unit: 'МПа',   alarm: false },
  'na3.flow':     { value: 362,  unit: 'м³/ч',  alarm: false },
  'na3.press':    { value: 6.83, unit: 'МПа',   alarm: false },
  'sikn.flow':    { value: 1455, unit: 'м³/ч',  alarm: false },
  'sikn.press':   { value: 6.81, unit: 'МПа',   alarm: false },
  'drain.level':  { value: 18,   unit: '%',     alarm: false },
}

// Seed immediately on module load
;(() => {
  const st = useScadaStore.getState()
  Object.entries(SEED).forEach(([id, d]) =>
    st.setMetric(id, { ...d, timestamp: Date.now() })
  )
  st.setConnected(true)
})()

export function useScada(wsUrl?: string) {
  const { setMetric, setConnected } = useScadaStore()
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!wsUrl) return
    let alive = true
    const connect = () => {
      if (!alive) return
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws
      ws.onopen  = () => setConnected(true)
      ws.onclose = () => { setConnected(false); setTimeout(connect, 3000) }
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data) as Record<string, ScadaMetric>
          Object.entries(data).forEach(([id, m]) => setMetric(id, m))
        } catch { /* skip malformed frames */ }
      }
    }
    connect()
    return () => { alive = false; wsRef.current?.close() }
  }, [wsUrl, setMetric, setConnected])

  // Simulate live fluctuation when no real WS is configured
  useEffect(() => {
    if (wsUrl) return
    const t = setInterval(() => {
      const keys = Object.keys(SEED)
      const id   = keys[Math.floor(Math.random() * keys.length)]
      const base = SEED[id]
      setMetric(id, {
        value:     +(base.value * (0.97 + Math.random() * 0.06)).toFixed(2),
        unit:      base.unit,
        alarm:     base.alarm,
        timestamp: Date.now(),
      })
    }, 500)
    return () => clearInterval(t)
  }, [wsUrl, setMetric])

  return useScadaStore(s => s.metrics)
}

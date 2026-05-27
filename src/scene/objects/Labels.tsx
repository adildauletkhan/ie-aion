import { Html } from '@react-three/drei'
import { useNpsStore } from '../store'
import { useLanguage } from '@/hooks/useLanguage'
import {
  TANK_POSITIONS, TANK_LABELS, TANK_IDS,
  PODPOR_POS, FILTER_POS, MANIFOLD_POS, MAIN_NS_POS, SIKN_POS,
  DRAIN_POS, CTRL_POS,
  TANK_H, PIPE_COLOR,
} from '../constants'

interface LabelDef {
  id:    string
  label: string
  pos:   [number, number, number]
  color: string
}

const STATIC_LABELS: LabelDef[] = [
  { id: 'PODPOR',   label: 'Подпорная НС',     pos: PODPOR_POS,  color: '#60a5fa' },
  { id: 'FS1',      label: 'ФС-1/2',           pos: FILTER_POS,  color: '#06b6d4' },
  { id: 'MANIFOLD', label: 'Манифольд',         pos: MANIFOLD_POS,color: '#a78bfa' },
  { id: 'NA1',      label: 'НА-1…4 (МНС)',      pos: MAIN_NS_POS, color: '#818cf8' },
  { id: 'SIKN',     label: 'СИКН / УКЛН',       pos: SIKN_POS,    color: '#34d399' },
  { id: 'DRAIN',    label: 'Дрен. блок ЕП',     pos: DRAIN_POS,   color: '#9ca3af' },
  { id: 'CTRL',     label: 'Диспетчерская',      pos: CTRL_POS,    color: '#38bdf8' },
]

function Label({ id, label, pos, color, yOffset = 0 }: LabelDef & { yOffset?: number }) {
  const { translateData: tt } = useLanguage()
  const selectedId = useNpsStore(s => s.selectedId)
  const isSelected = selectedId === id

  return (
    <Html
      position={[pos[0], pos[1] + yOffset, pos[2]]}
      center
      distanceFactor={18}
      occlude
      zIndexRange={isSelected ? [100, 200] : [0, 100]}
    >
      <div style={{
        background: isSelected ? 'rgba(251,191,36,0.18)' : 'rgba(15,23,42,0.78)',
        border: `1px solid ${isSelected ? '#fbbf24' : color + '60'}`,
        borderRadius: 4,
        padding: '3px 8px',
        color: isSelected ? '#fbbf24' : color,
        fontSize: 11,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontWeight: isSelected ? 700 : 500,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        textShadow: isSelected ? '0 0 8px #fbbf2488' : 'none',
        transition: 'all 0.2s',
        userSelect: 'none',
      }}>
        {tt(label)}
      </div>
    </Html>
  )
}

export function Labels() {
  const { translateData: tt } = useLanguage()
  return (
    <group>
      {/* Tank labels — above top of tank */}
      {TANK_POSITIONS.map((pos, i) => (
        <Label key={TANK_IDS[i]}
          id={TANK_IDS[i]} label={TANK_LABELS[i]}
          pos={pos} yOffset={TANK_H / 2 + 0.35}
          color="#3b82f6"
        />
      ))}

      {/* Static facility labels */}
      {STATIC_LABELS.map(l => (
        <Label key={l.id} {...l} yOffset={1.8} />
      ))}

      {/* Pipeline direction arrows — МТ Приёмки / Откачки */}
      <Html position={[-24, 0.6, 0]} center distanceFactor={18}>
        <div style={{
          color: PIPE_COLOR.inlet, fontSize: 10, fontWeight: 700,
          background: 'rgba(15,23,42,0.75)', border: `1px solid ${PIPE_COLOR.inlet}40`,
          borderRadius: 3, padding: '2px 6px', whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>
          {`← ${tt('МТ Приёмки')}`}
        </div>
      </Html>
      <Html position={[24, 0.6, 0]} center distanceFactor={18}>
        <div style={{
          color: PIPE_COLOR.discharge, fontSize: 10, fontWeight: 700,
          background: 'rgba(15,23,42,0.75)', border: `1px solid ${PIPE_COLOR.discharge}40`,
          borderRadius: 3, padding: '2px 6px', whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>
          {`${tt('МТ Откачки')} →`}
        </div>
      </Html>
    </group>
  )
}

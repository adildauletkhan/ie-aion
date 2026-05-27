import { useState } from 'react'
import { useNpsStore } from '../store'
import { useScenePalette } from '../palette'
import {
  MAIN_NS_POS, MAIN_NS_SIZE, PUMP_R, PUMP_H,
  COLOR_SELECTED, COLOR_HOVER, EMISSIVE_SELECTED, EMISSIVE_HOVER,
} from '../constants'

const PUMP_IDS   = ['NA1', 'NA2', 'NA3', 'NA4']
const NA_Z_OFFSETS = [-2.4, -0.8, 0.8, 2.4]

function NaUnit({
  id, zOffset, status,
}: {
  id: string; zOffset: number; status: 'running' | 'maintenance'
}) {
  const [hovered, setHovered] = useState(false)
  const selectedId = useNpsStore(s => s.selectedId)
  const select     = useNpsStore(s => s.select)
  const palette    = useScenePalette()
  const isSelected = selectedId === id

  const emC = isSelected ? COLOR_SELECTED : hovered ? COLOR_HOVER : '#000'
  const emI = isSelected ? EMISSIVE_SELECTED : hovered ? EMISSIVE_HOVER : 0
  const color = status === 'running'
    ? palette.buildingTint
    : (palette.isDark ? '#c97a4a' : '#a85d3d')

  const [px, , pz] = MAIN_NS_POS
  const [, , d] = MAIN_NS_SIZE

  return (
    <group position={[px - 1.5, PUMP_H / 2 + PUMP_R, pz + zOffset]}>
      {/* Motor / pump capsule */}
      <mesh castShadow receiveShadow
        onClick={e => { e.stopPropagation(); select(id) }}
        onPointerOver={e => { e.stopPropagation(); setHovered(true) }}
        onPointerOut={() => setHovered(false)}>
        <cylinderGeometry args={[PUMP_R, PUMP_R, PUMP_H, 16]} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.7}
          emissive={emC} emissiveIntensity={emI} />
      </mesh>
      <mesh position={[0, PUMP_H / 2 + PUMP_R * 0.9, 0]} castShadow>
        <sphereGeometry args={[PUMP_R, 12, 8]} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.7}
          emissive={emC} emissiveIntensity={emI} />
      </mesh>
      <mesh position={[0, -(PUMP_H / 2 + PUMP_R * 0.9), 0]} castShadow>
        <sphereGeometry args={[PUMP_R, 12, 8]} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.7}
          emissive={emC} emissiveIntensity={emI} />
      </mesh>
      {/* Coupling / intermediate shaft */}
      <mesh position={[0.4, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 0.8, 8]} />
        <meshStandardMaterial color="#334155" roughness={0.5} metalness={0.8} />
      </mesh>
      {/* Status indicator light */}
      <mesh position={[0, PUMP_H / 2 + PUMP_R * 2 + 0.05, 0]}>
        <sphereGeometry args={[0.06, 8, 6]} />
        <meshBasicMaterial color={status === 'running' ? '#22c55e' : '#ef4444'} />
      </mesh>
    </group>
  )
}

export function MainPumpStation() {
  const [px, , pz] = MAIN_NS_POS
  const [w, h, d]  = MAIN_NS_SIZE
  const palette    = useScenePalette()
  const wallColor  = palette.isDark ? '#8da4c0' : '#6b7c92'
  const roofColor  = palette.isDark ? '#5a7090' : '#3b556f'

  return (
    <group>
      {/* Main building */}
      <mesh position={[px, h / 2, pz]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={wallColor} roughness={0.7} metalness={0.15} />
      </mesh>
      {/* Gable roof */}
      {[-1, 1].map(side => (
        <mesh key={side} position={[px, h + 0.2, pz]} rotation={[0, 0, side * Math.PI / 5.5]} castShadow>
          <boxGeometry args={[w / 2 + 0.1, h * 0.4, d + 0.15]} />
          <meshStandardMaterial color={roofColor} roughness={0.8} />
        </mesh>
      ))}
      {/* Ventilation / exhaust ducts on roof */}
      {[-2, 0, 2].map((dz, i) => (
        <mesh key={i} position={[px, h + 0.5, pz + dz]} castShadow>
          <boxGeometry args={[0.3, 0.4, 0.3]} />
          <meshStandardMaterial color={wallColor} roughness={0.7} />
        </mesh>
      ))}
      {/* 4 pump aggregates НА-1…НА-4 */}
      {PUMP_IDS.map((id, i) => (
        <NaUnit
          key={id}
          id={id}
          zOffset={NA_Z_OFFSETS[i]}
          status={id === 'NA4' ? 'maintenance' : 'running'}
        />
      ))}
    </group>
  )
}

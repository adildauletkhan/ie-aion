import { useState } from 'react'
import { useNpsStore } from '../store'
import { useScenePalette } from '../palette'
import { FILTER_POS, COLOR_SELECTED, COLOR_HOVER, EMISSIVE_SELECTED, EMISSIVE_HOVER } from '../constants'

const FILTER_VESSEL_R = 0.18
const FILTER_VESSEL_H = 0.55
const FILTER_CONE_H   = 0.18

function FilterVessel({ position, id }: { position: [number, number, number]; id: string }) {
  const [hovered, setHovered] = useState(false)
  const selectedId = useNpsStore(s => s.selectedId)
  const select     = useNpsStore(s => s.select)
  const palette    = useScenePalette()
  const isSelected = selectedId === id

  const emC = isSelected ? COLOR_SELECTED : hovered ? COLOR_HOVER : '#000'
  const emI = isSelected ? EMISSIVE_SELECTED : hovered ? EMISSIVE_HOVER : 0

  const bodyColor = palette.isDark ? '#5e92a8' : '#5e8294'
  const coneColor = palette.isDark ? '#456e80' : '#3f6072'

  return (
    <group position={position}>
      {/* Cylindrical body */}
      <mesh castShadow receiveShadow
        onClick={e => { e.stopPropagation(); select(id) }}
        onPointerOver={e => { e.stopPropagation(); setHovered(true) }}
        onPointerOut={() => setHovered(false)}>
        <cylinderGeometry args={[FILTER_VESSEL_R, FILTER_VESSEL_R, FILTER_VESSEL_H, 16]} />
        <meshStandardMaterial color={bodyColor} roughness={0.6} metalness={0.7}
          emissive={emC} emissiveIntensity={emI} />
      </mesh>
      {/* Conical top */}
      <mesh position={[0, FILTER_VESSEL_H / 2 + FILTER_CONE_H / 2, 0]} castShadow>
        <coneGeometry args={[FILTER_VESSEL_R, FILTER_CONE_H, 16]} />
        <meshStandardMaterial color={coneColor} roughness={0.6} metalness={0.7} />
      </mesh>
      {/* Conical bottom */}
      <mesh position={[0, -(FILTER_VESSEL_H / 2 + FILTER_CONE_H / 2), 0]}
        rotation={[Math.PI, 0, 0]} castShadow>
        <coneGeometry args={[FILTER_VESSEL_R, FILTER_CONE_H, 16]} />
        <meshStandardMaterial color={coneColor} roughness={0.6} metalness={0.7} />
      </mesh>
      {/* Support legs */}
      {[-0.12, 0.12].map((ox, i) => (
        <mesh key={i} position={[ox, -(FILTER_VESSEL_H / 2 + FILTER_CONE_H + 0.06), 0]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.12, 6]} />
          <meshStandardMaterial color="#475569" roughness={0.7} metalness={0.5} />
        </mesh>
      ))}
      {/* Instrument nozzle */}
      <mesh position={[FILTER_VESSEL_R + 0.06, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.03, 0.03, 0.12, 8]} />
        <meshStandardMaterial color="#64748b" roughness={0.5} metalness={0.8} />
      </mesh>
      {/* Selection ring */}
      {isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[FILTER_VESSEL_R + 0.06, FILTER_VESSEL_R + 0.15, 24]} />
          <meshBasicMaterial color={COLOR_SELECTED} transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  )
}

export function FilterUnit() {
  const [fx, , fz] = FILTER_POS
  const baseY = FILTER_VESSEL_H / 2 + FILTER_CONE_H + 0.12

  return (
    <group>
      {/* ФС-1 */}
      <FilterVessel id="FS1" position={[fx, baseY, fz - 1.1]} />
      {/* ФС-2 */}
      <FilterVessel id="FS2" position={[fx, baseY, fz + 1.1]} />
      {/* Connecting header pipe */}
      <mesh position={[fx, baseY, fz]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 2.2, 8]} />
        <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.7} />
      </mesh>
    </group>
  )
}

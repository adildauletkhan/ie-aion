import { useState } from 'react'
import { useNpsStore } from '../store'
import { useScenePalette } from '../palette'
import {
  PODPOR_POS, PODPOR_SIZE, PUMP_R, PUMP_H,
  COLOR_SELECTED, COLOR_HOVER, EMISSIVE_SELECTED, EMISSIVE_HOVER,
} from '../constants'

function PumpUnit({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[PUMP_R, PUMP_R, PUMP_H, 16]} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.7} />
      </mesh>
      <mesh position={[0, PUMP_H / 2 + PUMP_R, 0]} castShadow>
        <sphereGeometry args={[PUMP_R, 12, 8]} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.7} />
      </mesh>
      <mesh position={[0, -(PUMP_H / 2 + PUMP_R), 0]} castShadow>
        <sphereGeometry args={[PUMP_R, 12, 8]} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.7} />
      </mesh>
    </group>
  )
}

function GableRoof({
  w, h, d, py, color,
}: { w: number; h: number; d: number; py: number; color: string }) {
  return (
    <group position={[0, py, 0]} rotation={[0, 0, 0]}>
      {[-1, 1].map(side => (
        <mesh key={side} castShadow
          position={[0, h * 0.25, 0]}
          rotation={[0, 0, side * Math.PI / 6]}>
          <boxGeometry args={[w / 2 + 0.05, h * 0.5 + 0.05, d + 0.1]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

export function PodporPumpStation() {
  const [hovered, setHovered] = useState(false)
  const selectedId = useNpsStore(s => s.selectedId)
  const select     = useNpsStore(s => s.select)
  const palette    = useScenePalette()
  const isSelected = selectedId === 'PODPOR'

  const [w, h, d] = PODPOR_SIZE
  const emC = isSelected ? COLOR_SELECTED : hovered ? COLOR_HOVER : '#000'
  const emI = isSelected ? EMISSIVE_SELECTED : hovered ? EMISSIVE_HOVER : 0

  return (
    <group position={PODPOR_POS}>
      {/* Building body */}
      <mesh
        position={[0, h / 2, 0]}
        castShadow receiveShadow
        onClick={e => { e.stopPropagation(); select('PODPOR') }}
        onPointerOver={e => { e.stopPropagation(); setHovered(true) }}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={palette.buildingTint} roughness={0.7} metalness={0.2}
          emissive={emC} emissiveIntensity={emI} />
      </mesh>

      {/* Gable roof */}
      <GableRoof w={w} h={h * 0.45} d={d} py={h + 0.02} color={palette.buildingRoof} />

      {/* 2 pump units beside building */}
      <PumpUnit position={[-0.7, PUMP_H / 2 + PUMP_R, d / 2 + 0.5]} color={palette.buildingTint} />
      <PumpUnit position={[ 0.7, PUMP_H / 2 + PUMP_R, d / 2 + 0.5]} color={palette.buildingTint} />

      {/* Pipe support stand */}
      <mesh position={[0, 0.15, d / 2 + 0.5]} castShadow>
        <boxGeometry args={[2, 0.3, 0.5]} />
        <meshStandardMaterial color={palette.isDark ? '#334155' : '#94a3b8'} roughness={0.7} />
      </mesh>

      {/* Selection ring on ground */}
      {isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.max(w, d) / 2 + 0.1, Math.max(w, d) / 2 + 0.3, 32]} />
          <meshBasicMaterial color={COLOR_SELECTED} transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  )
}

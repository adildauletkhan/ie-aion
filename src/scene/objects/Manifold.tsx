import { useState } from 'react'
import { useNpsStore } from '../store'
import { useScenePalette } from '../palette'
import {
  MANIFOLD_POS, MANIFOLD_SIZE,
  COLOR_SELECTED, COLOR_HOVER, EMISSIVE_SELECTED, EMISSIVE_HOVER,
} from '../constants'

function Valve({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      {/* Valve body */}
      <mesh castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.18, 12]} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.8} />
      </mesh>
      {/* Handwheel (torus) */}
      <mesh position={[0, 0.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.15, 0.025, 8, 16]} />
        <meshStandardMaterial color="#334155" roughness={0.5} metalness={0.9} />
      </mesh>
      {/* Stem */}
      <mesh position={[0, 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.24, 6]} />
        <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.9} />
      </mesh>
    </group>
  )
}

export function Manifold() {
  const [hovered, setHovered] = useState(false)
  const selectedId = useNpsStore(s => s.selectedId)
  const select     = useNpsStore(s => s.select)
  const palette    = useScenePalette()
  const isSelected = selectedId === 'MANIFOLD'

  const emC = isSelected ? COLOR_SELECTED : hovered ? COLOR_HOVER : '#000'
  const emI = isSelected ? EMISSIVE_SELECTED : hovered ? EMISSIVE_HOVER : 0

  const [mx, , mz] = MANIFOLD_POS
  const [w, h, d]  = MANIFOLD_SIZE
  const valveZs = [-1.8, -0.9, 0, 0.9, 1.8]
  const rackColor   = palette.isDark ? '#7a92ad' : '#7a90a8'
  const headerColor = palette.isDark ? '#94a3b8' : '#94a3b8'

  return (
    <group>
      {/* Pipe rack / support structure */}
      <mesh position={[mx, h / 2, mz]} castShadow receiveShadow
        onClick={e => { e.stopPropagation(); select('MANIFOLD') }}
        onPointerOver={e => { e.stopPropagation(); setHovered(true) }}
        onPointerOut={() => setHovered(false)}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={rackColor} roughness={0.75} metalness={0.3}
          emissive={emC} emissiveIntensity={emI} />
      </mesh>

      {/* Two horizontal header pipes on rack */}
      {[0.1, -0.1].map((zOff, i) => (
        <mesh key={i} position={[mx, h + 0.08, mz + zOff]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, w, 8]} rotation={[0, 0, Math.PI / 2]} />
          <meshStandardMaterial color={headerColor} roughness={0.5} metalness={0.8} />
        </mesh>
      ))}

      {/* Valves */}
      {valveZs.map((zv, i) => (
        <Valve key={i} position={[mx, h + 0.08, mz + zv - 2.5]} color={palette.buildingTint} />
      ))}

      {/* Selection ring */}
      {isSelected && (
        <mesh position={[mx, 0.01, mz]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.max(w, d) / 2 + 0.15, Math.max(w, d) / 2 + 0.35, 32]} />
          <meshBasicMaterial color={COLOR_SELECTED} transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  )
}

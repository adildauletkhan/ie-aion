import { useState } from 'react'
import { useNpsStore } from '../store'
import { useScenePalette } from '../palette'
import {
  CTRL_POS, CTRL_SIZE,
  COLOR_SELECTED, COLOR_HOVER, EMISSIVE_SELECTED, EMISSIVE_HOVER,
} from '../constants'

export function ControlRoom() {
  const [hovered, setHovered] = useState(false)
  const selectedId = useNpsStore(s => s.selectedId)
  const select     = useNpsStore(s => s.select)
  const palette    = useScenePalette()
  const isSelected = selectedId === 'CTRL'

  const emC = isSelected ? COLOR_SELECTED : hovered ? COLOR_HOVER : '#000'
  const emI = isSelected ? EMISSIVE_SELECTED : hovered ? EMISSIVE_HOVER : 0

  const [cx, , cz] = CTRL_POS
  const [w, h, d]  = CTRL_SIZE

  const wallColor = palette.isDark ? '#8da4c0' : '#7a90a8'
  const roofColor = palette.isDark ? '#5a7090' : '#4d6781'
  const doorColor = palette.isDark ? '#3b556f' : '#5c7390'
  const winColor  = palette.isDark ? '#93c5fd' : '#a8c8e8'
  const winEmiInt = palette.isDark ? 0.45 : 0.05

  return (
    <group>
      {/* Building body */}
      <mesh position={[cx, h / 2, cz]} castShadow receiveShadow
        onClick={e => { e.stopPropagation(); select('CTRL') }}
        onPointerOver={e => { e.stopPropagation(); setHovered(true) }}
        onPointerOut={() => setHovered(false)}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={wallColor} roughness={0.7} metalness={0.15}
          emissive={emC} emissiveIntensity={emI} />
      </mesh>

      {/* Flat roof with parapet */}
      <mesh position={[cx, h + 0.06, cz]} castShadow>
        <boxGeometry args={[w + 0.1, 0.12, d + 0.1]} />
        <meshStandardMaterial color={roofColor} roughness={0.8} />
      </mesh>

      {/* Windows — 3 on front face */}
      {[-1, 0, 1].map((wx, i) => (
        <mesh key={i} position={[cx + wx * (w / 3.5), h * 0.55, cz - d / 2 - 0.01]}>
          <planeGeometry args={[0.55, 0.45]} />
          <meshStandardMaterial
            color={winColor}
            emissive={winColor}
            emissiveIntensity={winEmiInt}
            transparent opacity={0.65}
          />
        </mesh>
      ))}

      {/* Door */}
      <mesh position={[cx, h * 0.28, cz - d / 2 - 0.01]}>
        <planeGeometry args={[0.4, 0.7]} />
        <meshStandardMaterial color={doorColor} roughness={0.6} />
      </mesh>

      {/* CCTV mast */}
      <mesh position={[cx + w / 2 + 0.12, h * 1.4, cz]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, h * 0.8, 6]} />
        <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.8} />
      </mesh>

      {/* Status beacon on mast */}
      <mesh position={[cx + w / 2 + 0.12, h * 1.85, cz]}>
        <sphereGeometry args={[0.07, 8, 6]} />
        <meshBasicMaterial color="#22c55e" />
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh position={[cx, 0.01, cz]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.max(w, d) / 2 + 0.12, Math.max(w, d) / 2 + 0.3, 32]} />
          <meshBasicMaterial color={COLOR_SELECTED} transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  )
}

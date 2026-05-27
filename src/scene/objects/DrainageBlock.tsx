import { useState } from 'react'
import { useNpsStore } from '../store'
import { useScenePalette } from '../palette'
import {
  DRAIN_POS, DRAIN_SIZE,
  COLOR_SELECTED, COLOR_HOVER, EMISSIVE_SELECTED, EMISSIVE_HOVER,
} from '../constants'

export function DrainageBlock() {
  const [hovered, setHovered] = useState(false)
  const selectedId = useNpsStore(s => s.selectedId)
  const select     = useNpsStore(s => s.select)
  const palette    = useScenePalette()
  const isSelected = selectedId === 'DRAIN'

  const emC = isSelected ? COLOR_SELECTED : hovered ? COLOR_HOVER : '#000'
  const emI = isSelected ? EMISSIVE_SELECTED : hovered ? EMISSIVE_HOVER : 0

  const [dx, , dz] = DRAIN_POS
  const [w, h, d]  = DRAIN_SIZE
  const vesselR = 0.45, vesselL = 2.2

  const slabColor   = palette.isDark ? '#94a3b8' : '#94a3b8'
  const vesselColor = palette.isDark ? '#7e94aa' : '#5e7390'
  const capColor    = palette.isDark ? '#5e7390' : '#475569'
  const saddleColor = palette.isDark ? '#7a92ad' : '#7a90a8'

  return (
    <group>
      {/* Foundation slab */}
      <mesh position={[dx, 0.04, dz]} castShadow>
        <boxGeometry args={[w + 0.4, 0.08, d + 0.4]} />
        <meshStandardMaterial color={slabColor} roughness={0.9} />
      </mesh>

      {/* Horizontal vessel (ЕП — emergency pit / drain tank) */}
      <mesh
        position={[dx, vesselR + 0.08, dz]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow receiveShadow
        onClick={e => { e.stopPropagation(); select('DRAIN') }}
        onPointerOver={e => { e.stopPropagation(); setHovered(true) }}
        onPointerOut={() => setHovered(false)}
      >
        <cylinderGeometry args={[vesselR, vesselR, vesselL, 20]} />
        <meshStandardMaterial color={vesselColor} roughness={0.7} metalness={0.6}
          emissive={emC} emissiveIntensity={emI} />
      </mesh>

      {/* End caps */}
      {[-vesselL / 2, vesselL / 2].map((xOff, i) => (
        <mesh key={i} position={[dx + xOff, vesselR + 0.08, dz]} castShadow>
          <sphereGeometry args={[vesselR, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={capColor} roughness={0.7} metalness={0.6}
            emissive={emC} emissiveIntensity={emI} />
        </mesh>
      ))}

      {/* Support saddles */}
      {[-0.55, 0.55].map((xOff, i) => (
        <mesh key={i} position={[dx + xOff, 0.08, dz]} castShadow>
          <boxGeometry args={[0.25, vesselR * 1.6, d * 0.6]} />
          <meshStandardMaterial color={saddleColor} roughness={0.8} />
        </mesh>
      ))}

      {/* Venting pipe */}
      <mesh position={[dx, vesselR * 2 + 0.08 + 0.35, dz - 0.2]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.7, 8]} />
        <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.8} />
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh position={[dx, 0.01, dz]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.2, 1.45, 32]} />
          <meshBasicMaterial color={COLOR_SELECTED} transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  )
}

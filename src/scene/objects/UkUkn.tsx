import { useState } from 'react'
import { useNpsStore } from '../store'
import { useScenePalette } from '../palette'
import {
  SIKN_POS, SIKN_SIZE,
  COLOR_SELECTED, COLOR_HOVER, EMISSIVE_SELECTED, EMISSIVE_HOVER,
} from '../constants'

// One metering line (horizontal pipe segment with flow meter)
function MeteringLine({ yOffset, palette }: {
  yOffset: number; palette: ReturnType<typeof useScenePalette>
}) {
  const pipeColor   = palette.isDark ? '#94a3b8' : '#64748b'
  const meterColor  = palette.isDark ? '#5e92a8' : '#3a6680'
  const housingColor= palette.isDark ? '#7e94aa' : '#5e7390'
  return (
    <group position={[0, yOffset, 0]}>
      {/* Carrier pipe section */}
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 2.4, 8]} />
        <meshStandardMaterial color={pipeColor} roughness={0.5} metalness={0.8} />
      </mesh>
      {/* Flow meter body (thick short section) */}
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.11, 0.11, 0.35, 10]} />
        <meshStandardMaterial color={meterColor} roughness={0.5} metalness={0.75} />
      </mesh>
      {/* Instrument housing on top */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[0.12, 0.18, 0.12]} />
        <meshStandardMaterial color={housingColor} roughness={0.6} metalness={0.5} />
      </mesh>
      {/* Display lens */}
      <mesh position={[0, 0.32, 0.07]}>
        <circleGeometry args={[0.04, 8]} />
        <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.8} />
      </mesh>
    </group>
  )
}

export function UkUkn() {
  const [hovered, setHovered] = useState(false)
  const selectedId = useNpsStore(s => s.selectedId)
  const select     = useNpsStore(s => s.select)
  const palette    = useScenePalette()
  const isSelected = selectedId === 'SIKN'

  const emC = isSelected ? COLOR_SELECTED : hovered ? COLOR_HOVER : '#000'
  const emI = isSelected ? EMISSIVE_SELECTED : hovered ? EMISSIVE_HOVER : 0

  const [sx, , sz] = SIKN_POS
  const [w, h, d]  = SIKN_SIZE

  // Three metering lines stacked (or in Z direction)
  const lineZs = [-1.2, 0, 1.2]

  return (
    <group>
      {/* Frame / support structure */}
      <mesh position={[sx, h / 2, sz]} castShadow receiveShadow
        onClick={e => { e.stopPropagation(); select('SIKN') }}
        onPointerOver={e => { e.stopPropagation(); setHovered(true) }}
        onPointerOut={() => setHovered(false)}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={palette.isDark ? '#7a92ad' : '#5e7390'}
          roughness={0.7} metalness={0.3}
          emissive={emC} emissiveIntensity={emI} wireframe={false} />
      </mesh>

      {/* Metering lines */}
      {lineZs.map((zOff, i) => (
        <group key={i} position={[sx, h * 0.55, sz + zOff]}>
          <MeteringLine yOffset={0} palette={palette} />
        </group>
      ))}

      {/* УКЛН label plate */}
      <mesh position={[sx - w / 2 - 0.02, h * 0.6, sz]}>
        <planeGeometry args={[0.04, 0.6]} />
        <meshStandardMaterial color={palette.buildingTint} />
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh position={[sx, 0.01, sz]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.max(w, d) / 2 + 0.15, Math.max(w, d) / 2 + 0.35, 32]} />
          <meshBasicMaterial color={COLOR_SELECTED} transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  )
}

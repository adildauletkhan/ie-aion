import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { FLOW_VERT, FLOW_FRAG } from '../hooks/useFlow'
import { useNpsStore } from '../store'
import { useScenePalette } from '../palette'
import {
  PIPE_H, PIPE_R_MAIN, PIPE_R_PROC, PIPE_R_DRAIN, PIPE_COLOR,
  TANK_POSITIONS, DRAIN_POS,
} from '../constants'

// ─── Animated flow pipe ───────────────────────────────────────────────────────
function FlowPipe({
  points, color, radius, speedMult = 1,
}: {
  points: [number, number, number][]
  color: string
  radius: number
  speedMult?: number
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const flowRate = useNpsStore(s => s.flowRate)

  useFrame(({ clock }) => {
    if (!matRef.current) return
    const u = matRef.current.uniforms
    u.uTime.value  = clock.getElapsedTime()
    u.uSpeed.value = (flowRate / 1455) * speedMult
  })

  const curve = useMemo(() =>
    new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [points.map(p => p.join(',')).join('|')]
  )

  const segments = Math.max(64, points.length * 12)

  return (
    <mesh>
      <tubeGeometry args={[curve, segments, radius, 8, false]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={FLOW_VERT}
        fragmentShader={FLOW_FRAG}
        uniforms={{
          uTime:  { value: 0 },
          uColor: { value: new THREE.Color(color) },
          uSpeed: { value: 1 },
        }}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// ─── Pipe support ─────────────────────────────────────────────────────────────
function Support({ x, z }: { x: number; z: number }) {
  const palette = useScenePalette()
  return (
    <mesh position={[x, PIPE_H / 2 - 0.01, z]} castShadow>
      <boxGeometry args={[0.08, PIPE_H, 0.08]} />
      <meshStandardMaterial color={palette.buildingTint} roughness={0.7} metalness={0.5} />
    </mesh>
  )
}

// ─── Main pipeline layout ─────────────────────────────────────────────────────
export function PipelineNetwork() {
  const H = PIPE_H

  // 1. МТ Inlet (blue, Ø820) — west end to tank farm inlet
  const inlet: [number,number,number][] = [[-25, H, 0], [-19.5, H, 0], [-18, H, 0.2]]

  // 2. Tank farm collection ring — connects all 4 tanks at header level
  const tfHeader: [number,number,number][] = [
    [-18, H, 0], [-18, H, -3.8], [-15.8, H, -3.8],
    [-8.2, H, -3.8], [-8.2, H, 3.8], [-15.8, H, 3.8],
    [-18, H, 3.8], [-18, H, 0],
  ]

  // 3. Branch from tank farm to each tank (radial nozzles, not animated separately)
  // handled as small pipe stubs per tank

  // 4. РВС → Подпорная НС feed (sky-blue)
  const feed: [number,number,number][] = [[-5.6, H, 0], [-4.6, H, 0], [-3, H, 1.9]]

  // 5. ПНС → Фильтры (green)
  const pns2fs: [number,number,number][] = [[-1.5, H, 1.9], [0.0, H, 1.0], [1.5, H, 1.0]]

  // 6. Фильтры → Манифольд (amber)
  const fs2man: [number,number,number][] = [[1.85, H, 0], [3.0, H, 0], [5.5, H, 2.0]]

  // 7. Манифольд → МНС (amber)
  const man2mns: [number,number,number][] = [[7.5, H, 0], [9, H, 0], [9.5, H, -2.4]]

  // 8. МНС Discharge → СИКН → МТ Outlet (red, Ø820)
  const discharge: [number,number,number][] = [
    [14.5, H, 0], [16, H, 0], [18.5, H, 0], [21, H, 0], [25, H, 0],
  ]

  // 9. Drain lines (gray, thin) — each tank → drain block
  const drainTarget = DRAIN_POS
  const drainLines = TANK_POSITIONS.map(tp => [
    [tp[0], 0.18, tp[2]] as [number,number,number],
    [tp[0], 0.18, drainTarget[2] - 0.5] as [number,number,number],
    [drainTarget[0], 0.18, drainTarget[2]] as [number,number,number],
  ])

  // Pipe support positions along main axis
  const mainSupports = [-22, -18, -14, -10, -6, -2, 2, 6, 10, 14, 18, 22]

  return (
    <group>
      {/* Main pipeline support posts */}
      {mainSupports.map(x => <Support key={x} x={x} z={0} />)}

      {/* 1 · МТ приёмки (blue) */}
      <FlowPipe points={inlet} color={PIPE_COLOR.inlet} radius={PIPE_R_MAIN} />
      {/* Tank farm header ring (blue) */}
      <FlowPipe points={tfHeader} color={PIPE_COLOR.inlet} radius={PIPE_R_PROC} speedMult={0.5} />

      {/* Tank stub nozzles */}
      {TANK_POSITIONS.map((tp, i) => (
        <FlowPipe key={i}
          points={[[tp[0], H, tp[2] < 0 ? -2 : 2], [tp[0], H + 0.05, tp[2]]]}
          color={PIPE_COLOR.inlet} radius={PIPE_R_PROC * 0.7} speedMult={0.4} />
      ))}

      {/* 4 · ПНС feed (sky-blue) */}
      <FlowPipe points={feed} color={PIPE_COLOR.feed} radius={PIPE_R_PROC} />

      {/* 5 · ПНС → ФС (green) */}
      <FlowPipe points={pns2fs} color={PIPE_COLOR.filter} radius={PIPE_R_PROC} />

      {/* 6 · ФС → Манифольд (amber) */}
      <FlowPipe points={fs2man} color={PIPE_COLOR.suction} radius={PIPE_R_PROC} />

      {/* 7 · Манифольд → МНС (amber) */}
      <FlowPipe points={man2mns} color={PIPE_COLOR.suction} radius={PIPE_R_PROC} />

      {/* 8 · МНС Discharge → МТ Откачки (red) */}
      <FlowPipe points={discharge} color={PIPE_COLOR.discharge} radius={PIPE_R_MAIN} />

      {/* 9 · Drain lines (gray, thin) */}
      {drainLines.map((pts, i) => (
        <FlowPipe key={i} points={pts} color={PIPE_COLOR.drain}
          radius={PIPE_R_DRAIN} speedMult={0.15} />
      ))}
    </group>
  )
}

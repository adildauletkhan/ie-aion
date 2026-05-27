import { useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { useScenePalette } from '../palette'

export function Ground() {
  const palette = useScenePalette()

  const grid = useMemo(() => {
    const g = new THREE.GridHelper(60, 30, palette.grid, palette.grid)
    const m = g.material as THREE.LineBasicMaterial
    m.transparent = true
    m.opacity     = palette.gridOpacity
    g.position.y  = 0.001
    return g
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Recolor grid when theme changes without re-creating the helper
  useEffect(() => {
    const m = grid.material as THREE.LineBasicMaterial
    m.color.set(palette.grid)
    m.opacity = palette.gridOpacity
    m.needsUpdate = true
  }, [grid, palette.grid, palette.gridOpacity])

  const groundGeo = useMemo(() => new THREE.PlaneGeometry(60, 28), [])

  return (
    <group>
      {/* Main ground plane */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        receiveShadow
        geometry={groundGeo}
      >
        <meshStandardMaterial color={palette.ground} roughness={1} metalness={0} />
      </mesh>

      {/* Grid lines — primitive mount to avoid R3F gridHelper material clash */}
      <primitive object={grid} />

      {/* Internal access road east-west */}
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[52, 0.8]} />
        <meshStandardMaterial color={palette.road} roughness={0.95} />
      </mesh>

      {/* Perimeter fence — thin raised edge */}
      {[
        { pos: [0, 0.15, -14] as [number,number,number], rot: [0,0,0] as [number,number,number], w: 60 },
        { pos: [0, 0.15,  14] as [number,number,number], rot: [0,0,0] as [number,number,number], w: 60 },
        { pos: [-30, 0.15, 0] as [number,number,number], rot: [0, Math.PI/2, 0] as [number,number,number], w: 28 },
        { pos: [ 30, 0.15, 0] as [number,number,number], rot: [0, Math.PI/2, 0] as [number,number,number], w: 28 },
      ].map(({ pos, rot, w }, i) => (
        <mesh key={i} position={pos} rotation={rot} castShadow>
          <boxGeometry args={[w, 0.3, 0.1]} />
          <meshStandardMaterial color={palette.fence} roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

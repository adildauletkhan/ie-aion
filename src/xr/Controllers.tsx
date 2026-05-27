/**
 * Controllers — XR controller ray-caster and snap-turn handler.
 *
 * - Left thumbstick: snap turn (±30°) + optional smooth locomotion
 * - Right controller: ray for panel interaction + teleport arc (see Teleport.tsx)
 * - Visual ray line rendered from each controller
 */
import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface ControllersProps {
  /** Called when snap turn fires, delta = ±30° in radians */
  onSnapTurn?: (deltaY: number) => void
  /** Called when right controller ray hits a named mesh */
  onRayHit?: (objectName: string | null) => void
}

const RAY_MAT  = new THREE.LineBasicMaterial({ color: '#60a5fa', transparent: true, opacity: 0.6 })
const RAY_GEOM = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, 0, -3),
])

const SNAP_THRESHOLD   = 0.7   // thumbstick axis threshold
const SNAP_COOLDOWN_MS = 300

export function Controllers({ onSnapTurn, onRayHit }: ControllersProps) {
  const { gl, scene } = useThree()
  const ray0Ref   = useRef<THREE.Line>(null)   // left controller ray
  const ray1Ref   = useRef<THREE.Line>(null)   // right controller ray
  const snapTimer = useRef(0)
  const raycaster = useRef(new THREE.Raycaster())

  // Attach visual ray lines to controllers
  useEffect(() => {
    const c0 = gl.xr.getController(0)
    const c1 = gl.xr.getController(1)

    const line0 = new THREE.Line(RAY_GEOM, RAY_MAT.clone())
    const line1 = new THREE.Line(RAY_GEOM, RAY_MAT.clone())
    c0.add(line0)
    c1.add(line1)
    return () => { c0.remove(line0); c1.remove(line1) }
  }, [gl])

  useFrame((_, delta) => {
    const session = (gl.xr as any).getSession?.() as XRSession | null
    if (!session) return

    const frame    = (gl.xr as any)._frame as XRFrame | undefined
    const inputSrc = session.inputSources
    if (!frame || !inputSrc) return

    // ── Snap turn from left thumbstick ──────────────────────────────────────
    snapTimer.current -= delta * 1000
    for (const src of Array.from(inputSrc)) {
      if (!src.gamepad || src.handedness !== 'left') continue
      const axes = src.gamepad.axes
      if (axes.length < 4) continue
      const axisX = axes[2]  // thumbstick X
      if (Math.abs(axisX) > SNAP_THRESHOLD && snapTimer.current <= 0) {
        snapTimer.current = SNAP_COOLDOWN_MS
        onSnapTurn?.(axisX > 0 ? Math.PI / 6 : -Math.PI / 6)
      }
    }

    // ── Right controller ray-hit ─────────────────────────────────────────────
    const c1 = gl.xr.getController(1)
    const origin = new THREE.Vector3()
    const dir    = new THREE.Vector3()
    c1.getWorldPosition(origin)
    c1.getWorldDirection(dir).negate()

    raycaster.current.set(origin, dir)
    raycaster.current.far = 10
    const hits = raycaster.current.intersectObjects(scene.children, true)
    const hit  = hits.find(h => h.object.name)
    onRayHit?.(hit?.object.name ?? null)
  })

  return null
}

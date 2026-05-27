/**
 * Teleport — parabolic arc teleportation for WebXR VR.
 *
 * Architecture:
 *   - Listens to XR controller 0 (right hand) select events
 *   - On selectstart: show arc + target ring
 *   - On selectend:   teleport player (callback)
 *   - Arc is computed frame-by-frame from controller direction
 *   - Forbidden zones prevent teleporting inside objects
 */
import { useRef, useEffect, useMemo } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const ARC_STEPS  = 32
const ARC_VEL    = 7       // m/s initial velocity
const ARC_GRAV   = 9.8    // m/s²
const FLOOR_Y    = 0

interface TeleportProps {
  onTeleport: (pos: THREE.Vector3) => void
  /** AABB zones the player is not allowed to land inside */
  forbidden?: THREE.Box3[]
}

function computeArc(origin: THREE.Vector3, dir: THREE.Vector3): THREE.Vector3[] {
  const points: THREE.Vector3[] = []
  const v = dir.clone().normalize().multiplyScalar(ARC_VEL)
  const dt = 0.07

  for (let i = 0; i < ARC_STEPS; i++) {
    const t = i * dt
    points.push(new THREE.Vector3(
      origin.x + v.x * t,
      origin.y + v.y * t - 0.5 * ARC_GRAV * t * t,
      origin.z + v.z * t,
    ))
    if (points[i].y <= FLOOR_Y) break
  }
  return points
}

export function Teleport({ onTeleport, forbidden = [] }: TeleportProps) {
  const { gl } = useThree()
  const arcRef    = useRef<THREE.Line>(null)
  const ringRef   = useRef<THREE.Mesh>(null)
  const activeRef = useRef(false)
  const targetRef = useRef<THREE.Vector3 | null>(null)

  const arcGeom = useMemo(() => new THREE.BufferGeometry(), [])
  const okColor = useMemo(() => new THREE.Color('#22c55e'), [])
  const badColor= useMemo(() => new THREE.Color('#ef4444'), [])

  useEffect(() => {
    const ctrl = gl.xr.getController(0)
    const onStart = () => { activeRef.current = true }
    const onEnd   = () => {
      activeRef.current = false
      if (targetRef.current) onTeleport(targetRef.current.clone())
      targetRef.current = null
      if (arcRef.current)  arcRef.current.visible  = false
      if (ringRef.current) ringRef.current.visible = false
    }
    ctrl.addEventListener('selectstart', onStart)
    ctrl.addEventListener('selectend',   onEnd)
    return () => {
      ctrl.removeEventListener('selectstart', onStart)
      ctrl.removeEventListener('selectend',   onEnd)
    }
  }, [gl, onTeleport])

  useFrame(() => {
    if (!arcRef.current || !ringRef.current) return
    if (!activeRef.current) { arcRef.current.visible = ringRef.current.visible = false; return }

    const ctrl = gl.xr.getController(0)
    const origin = new THREE.Vector3()
    const dir    = new THREE.Vector3()
    ctrl.getWorldPosition(origin)
    ctrl.getWorldDirection(dir).negate()

    const points = computeArc(origin, dir)
    const last   = points[points.length - 1]
    last.y = FLOOR_Y

    // Check forbidden zones
    const blocked = forbidden.some(b => b.containsPoint(last))
    const color   = blocked ? badColor : okColor

    const posArr = new Float32Array(points.length * 3)
    points.forEach((p, i) => { posArr[i*3]=p.x; posArr[i*3+1]=p.y; posArr[i*3+2]=p.z })
    arcGeom.setAttribute('position', new THREE.BufferAttribute(posArr, 3))
    arcGeom.setDrawRange(0, points.length)
    arcGeom.computeBoundingSphere()

    ;(arcRef.current.material as THREE.LineBasicMaterial).color = color
    arcRef.current.visible = true

    if (!blocked) {
      ringRef.current.position.copy(last).setY(FLOOR_Y + 0.01)
      ringRef.current.visible = true
      ;(ringRef.current.material as THREE.MeshBasicMaterial).color = color
      targetRef.current = last
    } else {
      ringRef.current.visible = false
      targetRef.current = null
    }
  })

  return (
    <group>
      <line ref={arcRef} visible={false}>
        <primitive object={arcGeom} attach="geometry" />
        <lineBasicMaterial color={okColor} linewidth={2} />
      </line>
      <mesh ref={ringRef} visible={false} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.38, 32]} />
        <meshBasicMaterial color={okColor} transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

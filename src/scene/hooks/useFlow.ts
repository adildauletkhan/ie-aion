import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useNpsStore } from '../store'

/** Returns a ref that should be attached to a ShaderMaterial with uTime/uSpeed uniforms. */
export function useFlow(speedMultiplier = 1.0) {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const flowRate = useNpsStore(s => s.flowRate)

  useFrame(({ clock }) => {
    if (!matRef.current) return
    const u = matRef.current.uniforms
    if (u.uTime)  u.uTime.value  = clock.getElapsedTime()
    if (u.uSpeed) u.uSpeed.value = (flowRate / 1455) * speedMultiplier
  })

  return matRef
}

// ─── Shared shader source ─────────────────────────────────────────────────────

export const FLOW_VERT = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv        = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const FLOW_FRAG = /* glsl */`
  uniform float uTime;
  uniform float uSpeed;
  uniform vec3  uColor;
  varying vec2  vUv;
  void main() {
    float t       = vUv.x * 10.0 - uTime * uSpeed * 2.0;
    float stripe  = smoothstep(0.35, 0.65, fract(t));
    float bright  = 0.7 + stripe * 0.5;
    gl_FragColor  = vec4(uColor * bright, 0.85);
  }
`

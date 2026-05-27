/**
 * WebXR feature detection and session management helpers.
 */
import type * as THREE from 'three'

export interface XRCapabilities {
  vr:      boolean   // immersive-vr session supported
  ar:      boolean   // immersive-ar session supported
  camera:  boolean   // getUserMedia camera available
  barcode: boolean   // BarcodeDetector API available (for marker AR)
  checked: boolean
}

export async function detectXR(): Promise<XRCapabilities> {
  const caps: XRCapabilities = { vr: false, ar: false, camera: false, barcode: false, checked: false }

  if (typeof navigator === 'undefined') return { ...caps, checked: true }

  if (navigator.xr) {
    try { caps.vr = await navigator.xr.isSessionSupported('immersive-vr') } catch { /* not supported */ }
    try { caps.ar = await navigator.xr.isSessionSupported('immersive-ar') } catch { /* not supported */ }
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    caps.camera = devices.some(d => d.kind === 'videoinput')
  } catch { /* no media access */ }

  caps.barcode = typeof (window as any).BarcodeDetector !== 'undefined'

  return { ...caps, checked: true }
}

export type XREnterResult =
  | { kind: 'ok'; session: XRSession }
  | { kind: 'no-webxr' }
  | { kind: 'insecure-context' }
  | { kind: 'not-supported' }
  | { kind: 'error'; message: string }

/** Enters WebXR VR session and binds it to the R3F renderer.
 *  Все фичи делаем optional, чтобы устройство-«минималист» (Quest 2 без layers,
 *  WebXR-эмулятор и т.п.) могло открыть сессию. */
export async function enterVR(gl: THREE.WebGLRenderer): Promise<XREnterResult> {
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return { kind: 'insecure-context' }
  }
  if (!navigator.xr) return { kind: 'no-webxr' }
  try {
    const supported = await navigator.xr.isSessionSupported('immersive-vr')
    if (!supported) return { kind: 'not-supported' }
  } catch (e) {
    return { kind: 'error', message: (e as Error).message ?? 'isSessionSupported error' }
  }
  try {
    const session = await navigator.xr.requestSession('immersive-vr', {
      optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers'],
    })
    await (gl.xr as any).setSession(session)
    try { (gl.xr as any).setFoveation(1) } catch { /* not all devices support it */ }
    return { kind: 'ok', session }
  } catch (e) {
    console.error('[XR] VR session failed:', e)
    return { kind: 'error', message: (e as Error).message ?? 'requestSession error' }
  }
}

/** Enters WebXR AR session and binds it to the R3F renderer. */
export async function enterAR(gl: THREE.WebGLRenderer): Promise<XRSession | null> {
  if (!navigator.xr) return null
  try {
    const session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['anchors', 'plane-detection', 'depth-sensing', 'light-estimation', 'dom-overlay'],
    })
    await (gl.xr as any).setSession(session)
    return session
  } catch (e) {
    console.error('[XR] AR session failed:', e)
    return null
  }
}

/** Exits the current XR session (works for both VR and AR). */
export async function exitXR(gl: THREE.WebGLRenderer) {
  const session = (gl.xr as any).getSession?.() as XRSession | null
  if (session) {
    try { await session.end() } catch { /* already ended */ }
  }
}

/** QR-code marker IDs mapped to equipment IDs */
export const MARKER_TO_EQUIP: Record<string, string> = {
  'NPS-RVS1': 'RVS1',
  'NPS-RVS2': 'RVS2',
  'NPS-RVS3': 'RVS3',
  'NPS-RVS4': 'RVS4',
  'NPS-PODPOR': 'PODPOR',
  'NPS-NA1': 'NA1',
  'NPS-NA2': 'NA2',
  'NPS-NA3': 'NA3',
  'NPS-SIKN': 'SIKN',
}

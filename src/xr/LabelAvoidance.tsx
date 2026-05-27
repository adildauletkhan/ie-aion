/**
 * LabelAvoidance — force-directed label layout in screen-space.
 *
 * Runs on every animation frame:
 *   1. Converts 3D world positions → 2D screen positions
 *   2. Runs 2 iterations of repulsion between label rects
 *   3. Optionally checks face bounding boxes from BarcodeDetector / external source
 *   4. Returns corrected screen offsets for each label
 *
 * Usage: call `resolveLabels()` each frame in ARMode's useFrame hook.
 */
import * as THREE from 'three'

export interface LabelState {
  id:       string
  worldPos: THREE.Vector3
  width:    number    // screen pixels
  height:   number
  offsetX:  number   // current screen offset (mutable)
  offsetY:  number
  opacity:  number
}

interface Rect { x: number; y: number; w: number; h: number }

function overlap(a: Rect, b: Rect): boolean {
  return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y)
}

function worldToScreen(
  pos: THREE.Vector3,
  camera: THREE.Camera,
  w: number,
  h: number,
): { x: number; y: number; behind: boolean } {
  const ndc = pos.clone().project(camera)
  return {
    x: (ndc.x * 0.5 + 0.5) * w,
    y: (1 - (ndc.y * 0.5 + 0.5)) * h,
    behind: ndc.z > 1,
  }
}

/**
 * Run force-directed avoidance. Mutates offsetX/offsetY/opacity on each LabelState.
 * @param labels    mutable array of label states
 * @param camera    Three.js camera for projection
 * @param w/h       viewport dimensions
 * @param faceRects screen-space bounding boxes of detected faces
 */
export function resolveLabels(
  labels:    LabelState[],
  camera:    THREE.Camera,
  w:         number,
  h:         number,
  faceRects: Rect[] = [],
  dt:        number  = 0.016,
) {
  const REPULSION  = 400
  const ELASTICITY = 0.15

  // Project each label to screen
  const screens = labels.map(l => worldToScreen(l.worldPos, camera, w, h))

  for (let i = 0; i < labels.length; i++) {
    const l  = labels[i]
    const sc = screens[i]

    if (sc.behind) { l.opacity = 0; continue }

    const cx = sc.x + l.offsetX
    const cy = sc.y + l.offsetY
    const r: Rect = { x: cx - l.width / 2, y: cy - l.height / 2, w: l.width, h: l.height }

    let fx = 0, fy = 0

    // Repulsion from other labels
    for (let j = 0; j < labels.length; j++) {
      if (i === j) continue
      const o  = labels[j]
      const sc2= screens[j]
      const cx2 = sc2.x + o.offsetX
      const cy2 = sc2.y + o.offsetY
      const ro: Rect = { x: cx2 - o.width / 2, y: cy2 - o.height / 2, w: o.width, h: o.height }
      if (overlap(r, ro)) {
        const dx = cx - cx2 || 0.001
        const dy = cy - cy2 || 0.001
        const d  = Math.sqrt(dx * dx + dy * dy)
        fx += (dx / d) * REPULSION / d
        fy += (dy / d) * REPULSION / d
      }
    }

    // Repulsion from face rects (push label away from face centres)
    for (const face of faceRects) {
      const fcx = face.x + face.w / 2
      const fcy = face.y + face.h / 2
      const expanded: Rect = { x: face.x - l.width, y: face.y - l.height,
        w: face.w + l.width, h: face.h + l.height }
      if (overlap(r, expanded)) {
        const dx = cx - fcx || 0.001
        const dy = cy - fcy || 0.001
        const d  = Math.sqrt(dx * dx + dy * dy)
        fx += (dx / d) * REPULSION * 2 / d
        fy += (dy / d) * REPULSION * 2 / d
      }
    }

    // Spring pull back toward anchor (screen centre)
    fx -= l.offsetX * ELASTICITY
    fy -= l.offsetY * ELASTICITY

    l.offsetX += fx * dt
    l.offsetY += fy * dt

    // Clamp to viewport
    l.offsetX = Math.max(-200, Math.min(200, l.offsetX))
    l.offsetY = Math.max(-200, Math.min(200, l.offsetY))

    // Opacity: full when near anchor, dim when far
    const dist = Math.sqrt(l.offsetX ** 2 + l.offsetY ** 2)
    const targetOpacity = dist > 150 ? 0.5 : 1
    l.opacity += (targetOpacity - l.opacity) * 0.1
  }
}

/**
 * Detect faces using the browser's built-in MediaDevices / ML APIs.
 * Returns empty array if not supported — graceful fallback.
 */
export async function detectFacesFromVideo(
  videoEl: HTMLVideoElement,
  detector: any,     // BarcodeDetector | TFLite model | null
): Promise<Rect[]> {
  if (!detector) return []
  try {
    // TF face-detection model (if loaded externally)
    if (typeof detector.estimateFaces === 'function') {
      const faces = await detector.estimateFaces(videoEl) as any[]
      return faces.map((f: any) => ({
        x: f.box.xMin, y: f.box.yMin, w: f.box.width, h: f.box.height,
      }))
    }
  } catch { /* silently ignore */ }
  return []
}

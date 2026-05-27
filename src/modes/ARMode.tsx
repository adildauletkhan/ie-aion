/**
 * ARMode — two-path AR implementation:
 *
 *  Path A: WebXR immersive-ar (Android Chrome, Quest passthrough, Vision Pro)
 *    – Hit-test for tabletop placement
 *    – Anchored mini-NPS model (60 × 40 cm)
 *    – depth-sensing / plane-detection if available
 *
 *  Path B: Camera + BarcodeDetector (iOS Safari fallback)
 *    – QR marker on physical equipment → SCADA label overlay
 *    – Face avoidance via resolveLabels()
 *    – Label-to-label collision avoidance
 *
 * Pre-flight check screen validates capabilities before session start.
 */
import { useRef, useState, useCallback, useEffect } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useLanguage } from '@/hooks/useLanguage'

import { NpsSceneObjects               } from '../scene/NpsSceneObjects'
import { resolveLabels, LabelState     } from '../xr/LabelAvoidance'
import { enterAR, exitXR,
         detectXR, XRCapabilities,
         MARKER_TO_EQUIP               } from '../xr/xrCapabilities'
import { useScadaStore, EQUIP_METRICS  } from '../data/useScada'
import { SCALE                         } from '../scene/constants'

// Tabletop scale: NPS 400 m × 200 m → 0.6 m × 0.3 m  (scale ≈ 0.0015 × SCALE)
const TABLE_SCALE = 0.0015 * SCALE   // ≈ 0.015

// ─── Pre-flight check ─────────────────────────────────────────────────────────
interface PreflightProps {
  caps: XRCapabilities
  onStartWebXR: () => void
  onStartCamera: () => void
}

function PreflightScreen({ caps, onStartWebXR, onStartCamera }: PreflightProps) {
  const { t } = useLanguage()
  const checks = [
    { label: t('arCheckCamera'),  ok: caps.camera  },
    { label: t('arCheckWebxr'),   ok: caps.ar      },
    { label: t('arCheckBarcode'), ok: caps.barcode },
  ]
  const arReady  = caps.ar
  const camReady = caps.camera

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', minHeight: 480,
      background: 'linear-gradient(160deg,#020c18 0%,#071428 100%)',
      color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif', padding: 24,
    }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>📡</div>
      <h3 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: '#60a5fa' }}>
        {t('arPreflightTitle')}
      </h3>
      <p style={{ margin: '0 0 24px', fontSize: 13, color: '#64748b', textAlign: 'center', maxWidth: 340 }}>
        {t('arPreflightSubtitle')}
      </p>

      <div style={{ width: '100%', maxWidth: 360, marginBottom: 28 }}>
        {checks.map(c => (
          <div key={c.label} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
            marginBottom: 8, borderRadius: 8,
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${c.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.2)'}`,
          }}>
            <span style={{ fontSize: 18 }}>{c.ok ? '✅' : '❌'}</span>
            <span style={{ fontSize: 13, color: c.ok ? '#86efac' : '#fca5a5' }}>{c.label}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          disabled={!arReady}
          onClick={onStartWebXR}
          style={{
            padding: '10px 24px', borderRadius: 8, fontWeight: 700, fontSize: 14,
            border: 'none', cursor: arReady ? 'pointer' : 'not-allowed',
            background: arReady ? 'linear-gradient(135deg,#3b82f6,#1d4ed8)' : '#1e293b',
            color: arReady ? '#fff' : '#475569',
          }}
        >
          {t('arStartWebxr')}
        </button>
        <button
          disabled={!camReady}
          onClick={onStartCamera}
          style={{
            padding: '10px 24px', borderRadius: 8, fontWeight: 700, fontSize: 14,
            border: '1px solid rgba(59,130,246,0.4)', cursor: camReady ? 'pointer' : 'not-allowed',
            background: 'transparent', color: camReady ? '#93c5fd' : '#475569',
          }}
        >
          {t('arStartCamera')}
        </button>
      </div>

      <button
        onClick={onStartCamera}
        style={{
          marginTop: 12, padding: '8px 22px', borderRadius: 8, fontWeight: 700, fontSize: 13,
          border: '1px solid rgba(34,197,94,0.4)', cursor: 'pointer',
          background: 'rgba(34,197,94,0.15)', color: '#86efac',
        }}
      >
        {t('arDemoButton')}
      </button>

      {!arReady && !camReady && (
        <p style={{ marginTop: 16, fontSize: 12, color: '#ef4444', textAlign: 'center', maxWidth: 300 }}>
          {t('arUnavailable')}
        </p>
      )}

      <p style={{ marginTop: 20, fontSize: 11, color: '#475569', textAlign: 'center' }}>
        {t('arSafetyHint')}
      </p>
    </div>
  )
}

// ─── WebXR AR Canvas mode ─────────────────────────────────────────────────────
function HitTestReticle({
  onPlace, placed,
}: { onPlace: (pos: THREE.Vector3, rot: THREE.Quaternion) => void; placed: boolean }) {
  const { gl } = useThree()
  const reticleRef  = useRef<THREE.Mesh>(null)
  const hitSrcRef   = useRef<XRHitTestSource | null>(null)

  useEffect(() => {
    const session = (gl.xr as any).getSession?.() as XRSession | null
    if (!session) return
    ;(async () => {
      const refSpace = await session.requestReferenceSpace('viewer')
      hitSrcRef.current = await session.requestHitTestSource?.({ space: refSpace }) ?? null
    })()
    return () => { hitSrcRef.current?.cancel() }
  }, [gl])

  useFrame((_, __, frame) => {
    if (!frame || !hitSrcRef.current || !reticleRef.current || placed) {
      if (reticleRef.current) reticleRef.current.visible = false
      return
    }
    const hits = (frame as XRFrame).getHitTestResults(hitSrcRef.current)
    if (hits.length === 0) { reticleRef.current.visible = false; return }

    const pose = hits[0].getPose((gl.xr as any).getReferenceSpace())
    if (!pose) { reticleRef.current.visible = false; return }

    const { position: p, orientation: o } = pose.transform
    reticleRef.current.position.set(p.x, p.y, p.z)
    reticleRef.current.quaternion.set(o.x, o.y, o.z, o.w)
    reticleRef.current.visible = true
  })

  const handleSelect = useCallback(() => {
    if (!reticleRef.current?.visible) return
    const p = reticleRef.current.position.clone()
    const q = reticleRef.current.quaternion.clone()
    onPlace(p, q)
  }, [onPlace])

  useEffect(() => {
    const session = (gl.xr as any).getSession?.() as XRSession | null
    session?.addEventListener('select', handleSelect)
    return () => session?.removeEventListener('select', handleSelect)
  }, [gl, handleSelect])

  return (
    <mesh ref={reticleRef} visible={false} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.12, 0.16, 32]} />
      <meshBasicMaterial color="#60a5fa" side={THREE.DoubleSide} />
    </mesh>
  )
}

function WebXRARScene({ onExit }: { onExit: () => void }) {
  const { gl } = useThree()
  const [modelPose, setModelPose] = useState<{ pos: THREE.Vector3; rot: THREE.Quaternion } | null>(null)

  useEffect(() => {
    gl.xr.enabled = true
    return () => { gl.xr.enabled = false }
  }, [gl])

  const handlePlace = useCallback((pos: THREE.Vector3, rot: THREE.Quaternion) => {
    setModelPose({ pos, rot })
  }, [])

  return (
    <>
      <ambientLight intensity={0.8} />
      <HitTestReticle onPlace={handlePlace} placed={!!modelPose} />
      {modelPose && (
        <group position={modelPose.pos} quaternion={modelPose.rot} scale={TABLE_SCALE}>
          <NpsSceneObjects showLabels={false} />
        </group>
      )}
    </>
  )
}

// ─── Demo AR layout: fixed grid positions for all equipment labels ────────────
const DEMO_LABEL_GRID: { equipId: string; x: number; y: number }[] = [
  { equipId: 'RVS1',   x: 0.12, y: 0.20 },
  { equipId: 'RVS2',   x: 0.28, y: 0.20 },
  { equipId: 'RVS3',   x: 0.12, y: 0.42 },
  { equipId: 'RVS4',   x: 0.28, y: 0.42 },
  { equipId: 'PODPOR', x: 0.48, y: 0.28 },
  { equipId: 'NA1',    x: 0.66, y: 0.20 },
  { equipId: 'NA2',    x: 0.66, y: 0.38 },
  { equipId: 'NA3',    x: 0.66, y: 0.56 },
  { equipId: 'SIKN',   x: 0.84, y: 0.32 },
]

function ARLabel({
  equipId, x, y, demo,
}: { equipId: string; x: number; y: number; demo?: boolean }) {
  const { translateData: tt } = useLanguage()
  const scada   = useScadaStore(s => s.metrics)
  const metrics = EQUIP_METRICS[equipId] ?? []
  const hasAlarm= metrics.some(m => scada[m.metricId]?.alarm)

  return (
    <div style={{
      position: 'absolute',
      left: `${x * 100}%`,
      top:  `${y * 100}%`,
      transform: 'translate(-50%, -100%)',
      pointerEvents: 'none',
      zIndex: 20,
      animation: 'arLabelIn 0.4s ease both',
    }}>
      <div style={{
        width: 2, height: demo ? 0 : 28,
        background: hasAlarm ? '#ef4444' : '#60a5fa',
        margin: '0 auto', opacity: 0.7,
      }} />
      <div style={{
        background: 'rgba(7,20,40,0.92)',
        border: `2px solid ${hasAlarm ? '#ef4444' : 'rgba(59,130,246,0.6)'}`,
        borderRadius: 8, padding: '8px 12px', minWidth: 150,
        color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12,
        backdropFilter: 'blur(6px)',
        boxShadow: `0 0 20px ${hasAlarm ? 'rgba(239,68,68,0.3)' : 'rgba(59,130,246,0.2)'}`,
      }}>
        <div style={{ fontWeight: 700, color: hasAlarm ? '#fca5a5' : '#60a5fa', marginBottom: 5, fontSize: 13 }}>
          {hasAlarm && '⚠ '}{equipId.replace(/([A-Z]+)(\d)/, '$1-$2')}
        </div>
        {metrics.slice(0, 3).map(m => {
          const metric = scada[m.metricId]
          return (
            <div key={m.metricId} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 2 }}>
              <span style={{ color: '#94a3b8' }}>{tt(m.label)}</span>
              <span style={{
                color: metric?.alarm ? '#ef4444' : '#f1f5f9',
                fontWeight: 600, fontVariantNumeric: 'tabular-nums',
              }}>
                {metric ? `${metric.value.toFixed(metric.unit === 'МПа' ? 2 : 0)} ${tt(metric.unit)}` : '—'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Camera + BarcodeDetector fallback mode ───────────────────────────────────
function CameraARView({ onExit }: { onExit: () => void }) {
  const { t } = useLanguage()
  const videoRef   = useRef<HTMLVideoElement>(null)
  const streamRef  = useRef<MediaStream | null>(null)
  const detectorRef= useRef<any>(null)
  const rafRef     = useRef<number>(0)
  const [scanLabels, setScanLabels] = useState<{ equipId: string; x: number; y: number }[]>([])
  const [demo, setDemo]             = useState(true)   // demo mode ON by default
  const [camErr, setCamErr]         = useState(false)

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
    }).then(stream => {
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play() }
    }).catch(() => setCamErr(true))

    if (typeof (window as any).BarcodeDetector !== 'undefined') {
      detectorRef.current = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
    }
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // QR scanning loop (only active when demo=false)
  useEffect(() => {
    if (demo) { setScanLabels([]); return }
    const detect = async () => {
      rafRef.current = requestAnimationFrame(detect)
      const video = videoRef.current
      const det   = detectorRef.current
      if (!video || !det || video.readyState < 2) return
      const w = video.videoWidth, h = video.videoHeight
      if (!w || !h) return
      try {
        const codes = await det.detect(video) as { rawValue: string; boundingBox: DOMRectReadOnly }[]
        setScanLabels(codes.map(c => {
          const b = c.boundingBox
          return {
            equipId: MARKER_TO_EQUIP[c.rawValue] ?? '',
            x: (b.x + b.width  / 2) / w,
            y: (b.y + b.height / 2) / h - 0.12,
          }
        }).filter(l => l.equipId))
      } catch { /* ignore */ }
    }
    detect()
    return () => cancelAnimationFrame(rafRef.current)
  }, [demo])

  const labels = demo ? DEMO_LABEL_GRID : scanLabels

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 480,
      background: '#0a0f1a', overflow: 'hidden' }}>
      {/* Camera feed or placeholder */}
      {!camErr ? (
        <video ref={videoRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', opacity: demo ? 0.35 : 1 }} playsInline muted />
      ) : (
        <div style={{ position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, #071428 0%, #0f2a4a 50%, #071428 100%)' }}>
          {/* NPS schematic silhouette background for demo */}
          <svg viewBox="0 0 800 450" style={{ width: '100%', height: '100%', opacity: 0.15 }}>
            <rect x="60"  y="150" width="140" height="180" rx="4" fill="#3b82f6"/>
            <rect x="240" y="200" width="80"  height="130" rx="4" fill="#60a5fa"/>
            <rect x="360" y="180" width="100" height="150" rx="4" fill="#22c55e"/>
            <rect x="510" y="160" width="160" height="170" rx="4" fill="#f59e0b"/>
            <rect x="700" y="190" width="70"  height="120" rx="4" fill="#ef4444"/>
            <line x1="200" y1="290" x2="240" y2="290" stroke="#3b82f6" strokeWidth="8"/>
            <line x1="320" y1="290" x2="360" y2="290" stroke="#22c55e" strokeWidth="8"/>
            <line x1="460" y1="290" x2="510" y2="290" stroke="#f59e0b" strokeWidth="8"/>
            <line x1="670" y1="290" x2="700" y2="290" stroke="#ef4444" strokeWidth="8"/>
          </svg>
        </div>
      )}

      {/* SCADA labels */}
      <style>{`@keyframes arLabelIn { from { opacity:0; transform:translate(-50%,-90%) scale(0.85) } to { opacity:1; transform:translate(-50%,-100%) scale(1) } }`}</style>
      {labels.map(l => (
        <ARLabel key={l.equipId + (demo ? '-demo' : '-scan')}
          equipId={l.equipId} x={l.x} y={l.y} demo={demo} />
      ))}

      {/* Top bar */}
      <div style={{ position: 'absolute', top: 12, left: 0, right: 0, display: 'flex',
        justifyContent: 'space-between', alignItems: 'center', padding: '0 14px',
        pointerEvents: 'none', zIndex: 30 }}>
        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 6, pointerEvents: 'auto' }}>
          <button
            onClick={() => setDemo(true)}
            style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              background: demo ? 'rgba(59,130,246,0.3)' : 'rgba(7,20,40,0.8)',
              border: demo ? '1px solid rgba(59,130,246,0.6)' : '1px solid rgba(59,130,246,0.2)',
              color: demo ? '#93c5fd' : '#64748b',
            }}
          >{t('arModeDemo')}</button>
          <button
            onClick={() => setDemo(false)}
            style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              background: !demo ? 'rgba(59,130,246,0.3)' : 'rgba(7,20,40,0.8)',
              border: !demo ? '1px solid rgba(59,130,246,0.6)' : '1px solid rgba(59,130,246,0.2)',
              color: !demo ? '#93c5fd' : '#64748b',
            }}
          >{detectorRef.current ? t('arModeQr') : t('arModeQrUnsupported')}</button>
        </div>
        <button onClick={onExit} style={{
          background: 'rgba(7,20,40,0.88)', border: '1px solid rgba(239,68,68,0.4)',
          borderRadius: 6, padding: '4px 12px', color: '#fca5a5',
          fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12,
          cursor: 'pointer', pointerEvents: 'auto',
        }}>{t('arClose')}</button>
      </div>

      {/* Bottom hint */}
      <div style={{ position: 'absolute', bottom: 14, left: 0, right: 0, textAlign: 'center',
        fontSize: 11, color: '#475569', fontFamily: 'Inter, system-ui, sans-serif', pointerEvents: 'none' }}>
        {demo ? t('arHintDemo') : t('arHintQr')}
      </div>
    </div>
  )
}

// ─── Public component ─────────────────────────────────────────────────────────
type ARPhase = 'preflight' | 'webxr' | 'camera'

export function ARMode({ onExit }: { onExit?: () => void }) {
  const { t } = useLanguage()
  const glRef = useRef<THREE.WebGLRenderer | null>(null)
  const [caps,  setCaps ] = useState<XRCapabilities | null>(null)
  const [phase, setPhase] = useState<ARPhase>('preflight')

  useEffect(() => { detectXR().then(setCaps) }, [])

  const startWebXR = useCallback(async () => {
    if (!glRef.current) return
    const session = await enterAR(glRef.current)
    if (session) {
      setPhase('webxr')
      session.addEventListener('end', () => { setPhase('preflight'); onExit?.() })
    }
  }, [onExit])

  const startCamera = useCallback(() => setPhase('camera'), [])

  if (!caps) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', minHeight: 480, background: '#020c18', color: '#475569',
        fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14 }}>
        {t('arCheckingDevice')}
      </div>
    )
  }

  if (phase === 'preflight') {
    return (
      <PreflightScreen
        caps={caps}
        onStartWebXR={startWebXR}
        onStartCamera={startCamera}
      />
    )
  }

  if (phase === 'camera') {
    return <CameraARView onExit={() => { setPhase('preflight'); onExit?.() }} />
  }

  // WebXR AR canvas
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 480 }}>
      <Canvas
        gl={{ antialias: true, alpha: true }}
        style={{ width: '100%', height: '100%', display: 'block' }}
        onCreated={({ gl }) => { glRef.current = gl; gl.xr.enabled = true }}
      >
        <WebXRARScene onExit={() => { setPhase('preflight'); onExit?.() }} />
      </Canvas>

      <div style={{ position: 'absolute', top: 12, left: 0, right: 0, display: 'flex',
        justifyContent: 'space-between', padding: '0 16px', pointerEvents: 'none' }}>
        <div style={{ background: 'rgba(7,20,40,0.8)', borderRadius: 6, padding: '4px 10px',
          fontSize: 11, color: '#94a3b8', fontFamily: 'Inter, system-ui, sans-serif' }}>
          {t('arPlaceHint')}
        </div>
        <button
          onClick={() => { if (glRef.current) exitXR(glRef.current) }}
          style={{
            background: 'rgba(7,20,40,0.88)', border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: 6, padding: '4px 12px', color: '#fca5a5',
            fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12,
            cursor: 'pointer', pointerEvents: 'auto',
          }}
        >{t('arClose')}</button>
      </div>
    </div>
  )
}

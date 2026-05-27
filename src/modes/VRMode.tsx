/**
 * VRMode — WebXR immersive-vr + настольный preview-режим для демо без шлема.
 *
 * Поведение:
 *   1. На mount определяет возможности WebXR (`navigator.xr`, `isSessionSupported`).
 *   2. Если шлем есть — кнопка «Войти в VR» запускает реальную WebXR-сессию
 *      (телепортация, snap-turn, плавающие SCADA-панели).
 *   3. Если шлема/WebXR нет — пользователь видит причину и может запустить
 *      «Настольный preview» (OrbitControls + сцена в реальном масштабе) — это
 *      позволяет показать VR-вид без физического устройства.
 */
import { useRef, useState, useCallback, useEffect } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { useLanguage } from '@/hooks/useLanguage'

import { NpsSceneObjects } from '../scene/NpsSceneObjects'
import { FloatingPanel   } from '../xr/FloatingPanel'
import { Teleport        } from '../xr/Teleport'
import { Controllers     } from '../xr/Controllers'
import { detectXR, enterVR, exitXR, type XRCapabilities } from '../xr/xrCapabilities'
import { EQUIP_METRICS   } from '../data/useScada'
import {
  SCALE, TANK_POSITIONS, TANK_IDS, TANK_LABELS,
  PODPOR_POS, MAIN_NS_POS, SIKN_POS,
} from '../scene/constants'

const PLAYER_START = new THREE.Vector3(3, 0, 6)

const FORBIDDEN = [
  new THREE.Box3(new THREE.Vector3(-18, -1, -8),  new THREE.Vector3(-5.5, 5, 8)),
  new THREE.Box3(new THREE.Vector3(-5,  -1, -2.5),new THREE.Vector3(-1,   5, 2.5)),
  new THREE.Box3(new THREE.Vector3(9,   -1, -4),  new THREE.Vector3(15,   5, 4)),
]

const PANELS = [
  ...TANK_IDS.map((id, i) => ({
    id,
    title: TANK_LABELS[i],
    pos:   [TANK_POSITIONS[i][0], TANK_POSITIONS[i][1] + 2.5, TANK_POSITIONS[i][2]] as [number,number,number],
    metrics: EQUIP_METRICS[id] ?? [],
  })),
  { id: 'PODPOR', title: 'ПНС',  pos: [PODPOR_POS[0], 3, PODPOR_POS[2]] as [number,number,number], metrics: EQUIP_METRICS['PODPOR'] ?? [] },
  { id: 'NA1',    title: 'НА-1', pos: [MAIN_NS_POS[0]-1.5, 4, MAIN_NS_POS[2]-2] as [number,number,number], metrics: EQUIP_METRICS['NA1'] ?? [] },
  { id: 'NA2',    title: 'НА-2', pos: [MAIN_NS_POS[0]+0.5, 4, MAIN_NS_POS[2]-2] as [number,number,number], metrics: EQUIP_METRICS['NA2'] ?? [] },
  { id: 'NA3',    title: 'НА-3', pos: [MAIN_NS_POS[0]+2.5, 4, MAIN_NS_POS[2]-2] as [number,number,number], metrics: EQUIP_METRICS['NA3'] ?? [] },
  { id: 'SIKN',   title: 'СИКН', pos: [SIKN_POS[0], 3, SIKN_POS[2]] as [number,number,number], metrics: EQUIP_METRICS['SIKN'] ?? [] },
]

// ─── Клавиатурное перемещение ────────────────────────────────────────────────
// Стрелки / WASD — движение в горизонтальной плоскости относительно взгляда,
// Q/PageDown — вниз, E/PageUp — вверх, Shift — ускорение.
//
// В VR-сессии прибавка применяется к XR-камере (player rig), в desktop preview —
// к Three-камере вместе с целью OrbitControls (чтобы не «отвернуть» взгляд).
function KeyboardMove({
  controlsRef, inVR, playerPosRef,
}: {
  controlsRef: React.RefObject<OrbitControlsImpl | null>
  inVR: boolean
  playerPosRef: React.MutableRefObject<THREE.Vector3>
}) {
  const { camera, gl } = useThree()
  const keys = useRef<Record<string, boolean>>({})

  useEffect(() => {
    const isTyping = (t: EventTarget | null) => {
      const el = t as HTMLElement | null
      if (!el) return false
      const tag = el.tagName
      return tag === 'INPUT' || tag === 'TEXTAREA' || (el as HTMLElement).isContentEditable
    }
    const down = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return
      // Блокируем прокрутку страницы стрелками/пробелом
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','PageUp','PageDown'].includes(e.code)) {
        e.preventDefault()
      }
      keys.current[e.code] = true
    }
    const up = (e: KeyboardEvent) => { keys.current[e.code] = false }
    const blur = () => { keys.current = {} }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [])

  useFrame((_, delta) => {
    const k = keys.current
    const fwdPressed   = k['ArrowUp']    || k['KeyW']
    const backPressed  = k['ArrowDown']  || k['KeyS']
    const leftPressed  = k['ArrowLeft']  || k['KeyA']
    const rightPressed = k['ArrowRight'] || k['KeyD']
    const upPressed    = k['KeyE'] || k['PageUp']   || k['Space']
    const downPressed  = k['KeyQ'] || k['PageDown']
    if (!(fwdPressed || backPressed || leftPressed || rightPressed || upPressed || downPressed)) return

    const fast  = k['ShiftLeft'] || k['ShiftRight']
    // Скорость ×5: обычная ~15 м/с, ускоренная ~50 м/с.
    const speed = (fast ? 50 : 15) * delta

    // Направление движения — вперёд камеры, спроецированное на горизонталь
    const forward = new THREE.Vector3()
    if (inVR) {
      // В VR используем XR-камеру (даёт реальное направление взгляда из шлема)
      const xrCam = (gl.xr as any).getCamera?.() as THREE.Camera | undefined
      ;(xrCam ?? camera).getWorldDirection(forward)
    } else {
      camera.getWorldDirection(forward)
    }
    forward.y = 0
    if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1)
    forward.normalize()
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()

    const move = new THREE.Vector3()
    if (fwdPressed)   move.add(forward)
    if (backPressed)  move.sub(forward)
    if (rightPressed) move.add(right)
    if (leftPressed)  move.sub(right)
    if (upPressed)    move.y += 1
    if (downPressed)  move.y -= 1

    if (move.lengthSq() === 0) return
    move.normalize().multiplyScalar(speed)

    if (inVR) {
      // В VR двигаем «player rig»: scene-группа смещается на -playerPos*SCALE,
      // поэтому шаг игрока в метрах конвертируется в сцен-юниты делением на SCALE.
      playerPosRef.current.x += move.x / SCALE
      playerPosRef.current.z += move.z / SCALE
      // Вертикальное смещение в VR обычно не имеет смысла (нет «прыжков»);
      // оставляем игнор Y, чтобы Q/E работали только в desktop preview.
    } else {
      // В desktop preview двигаем камеру и цель OrbitControls согласованно
      camera.position.add(move)
      const ctl = controlsRef.current
      if (ctl) {
        ctl.target.add(move)
        ctl.update()
      }
    }
  })

  return null
}

// ─── XR-setup ────────────────────────────────────────────────────────────────
function XRSetup({ glRef }: { glRef: React.MutableRefObject<THREE.WebGLRenderer | null> }) {
  const { gl } = useThree()
  useEffect(() => {
    gl.xr.enabled = true
    try { (gl.xr as any).setFoveation?.(1) } catch { /* not all devices */ }
    glRef.current = gl
  }, [gl, glRef])
  return null
}

// ─── Сцена ───────────────────────────────────────────────────────────────────
function SceneContent({
  playerPosRef, onTeleport, snapRot, inVR,
}: {
  playerPosRef: React.MutableRefObject<THREE.Vector3>
  onTeleport: (p: THREE.Vector3) => void
  snapRot: React.MutableRefObject<number>
  inVR: boolean
}) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame(() => {
    if (!groupRef.current || !inVR) return
    const p = playerPosRef.current
    groupRef.current.position.set(-p.x * SCALE, 0, -p.z * SCALE)
    groupRef.current.rotation.y = snapRot.current
  })

  return (
    <>
      <group ref={groupRef}>
        <group scale={SCALE}>
          <ambientLight intensity={0.5} color="#e8d8b0" />
          <directionalLight
            position={[30, 60, 20]}
            intensity={1.4}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <pointLight position={[-15, 5, 0]} intensity={0.3} color="#a0c4ff" />
          <fog attach="fog" args={['#c8d8e8', 80, 400]} />

          <NpsSceneObjects showLabels={false} />

          {PANELS.map(p => (
            <FloatingPanel
              key={p.id}
              position={p.pos}
              title={p.title}
              metrics={p.metrics}
            />
          ))}
        </group>

        {inVR && (
          <Teleport
            onTeleport={(worldPt) => {
              const sceneTarget = worldPt.clone().divideScalar(SCALE)
              playerPosRef.current.copy(sceneTarget)
              onTeleport(sceneTarget)
            }}
            forbidden={FORBIDDEN.map(b => new THREE.Box3(
              b.min.clone().multiplyScalar(SCALE),
              b.max.clone().multiplyScalar(SCALE),
            ))}
          />
        )}
      </group>

      {inVR && (
        <Controllers
          onSnapTurn={(delta) => { snapRot.current += delta }}
        />
      )}
    </>
  )
}

// ─── Состояние входа в VR ────────────────────────────────────────────────────
type Stage = 'idle' | 'desktop-preview' | 'entering' | 'in-vr'
type Failure = null | 'no-webxr' | 'insecure-context' | 'not-supported' | string

export function VRMode({ onExit }: { onExit?: () => void }) {
  const { t } = useLanguage()
  const glRef       = useRef<THREE.WebGLRenderer | null>(null)
  const snapRot     = useRef(0)
  const playerPos   = useRef(PLAYER_START.clone())
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const [stage,     setStage]     = useState<Stage>('idle')
  const [failure,   setFailure]   = useState<Failure>(null)
  const [caps,      setCaps]      = useState<XRCapabilities | null>(null)

  useEffect(() => {
    detectXR().then(setCaps)
  }, [])

  const handleEnter = useCallback(async () => {
    if (!glRef.current) {
      setFailure(t('vrErrorRendererNotReady'))
      return
    }
    setStage('entering')
    setFailure(null)
    const result = await enterVR(glRef.current)
    if (result.kind === 'ok') {
      setStage('in-vr')
      result.session.addEventListener('end', () => {
        setStage('idle')
        onExit?.()
      })
    } else {
      setStage('idle')
      setFailure(result.kind === 'error' ? result.message : result.kind)
    }
  }, [onExit, t])

  const handleExit = useCallback(() => {
    if (glRef.current) exitXR(glRef.current)
    setStage('idle')
  }, [])

  const inVR = stage === 'in-vr'
  const showOverlay = stage === 'idle' || stage === 'entering'

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      minHeight: 520, background: '#0a0f1a',
    }}>
      <Canvas
        shadows
        camera={{ position: [12, 8, 12], fov: 60, near: 0.1, far: 500 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <XRSetup glRef={glRef} />
        <SceneContent
          playerPosRef={playerPos}
          onTeleport={(p) => { playerPos.current.copy(p) }}
          snapRot={snapRot}
          inVR={inVR}
        />
        {/* Настольный preview: OrbitControls активны вне VR */}
        {!inVR && (
          <OrbitControls
            ref={controlsRef}
            enablePan
            enableZoom
            enableRotate
            target={[0, 1, 0]}
            minDistance={3}
            maxDistance={60}
            maxPolarAngle={Math.PI / 2.1}
          />
        )}
        {/* Клавиатурное перемещение — работает и в VR, и в preview */}
        <KeyboardMove
          controlsRef={controlsRef}
          inVR={inVR}
          playerPosRef={playerPos}
        />
      </Canvas>

      {/* Заглушка/диагностика поверх Canvas */}
      {showOverlay && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
          background: stage === 'desktop-preview' ? 'transparent'
                    : 'radial-gradient(circle at center, rgba(10,15,26,0.5), rgba(10,15,26,0.85))',
        }}>
          <VRGate
            caps={caps}
            failure={failure}
            isEntering={stage === 'entering'}
            onEnterVR={handleEnter}
            onDesktopPreview={() => setStage('desktop-preview')}
          />
        </div>
      )}

      {/* Подсказка в desktop-preview */}
      {stage === 'desktop-preview' && (
        <div style={{
          position: 'absolute', top: 12, left: 12,
          background: 'rgba(7,20,40,0.88)', color: '#cbd5e1',
          padding: '8px 12px', borderRadius: 8, fontSize: 12,
          fontFamily: 'Inter, system-ui, sans-serif',
          border: '1px solid rgba(59,130,246,0.3)',
          maxWidth: 320, lineHeight: 1.5,
        }}>
          <div style={{ fontWeight: 700, color: '#60a5fa', marginBottom: 4 }}>
            {t('vrPreviewHelpTitle')}
          </div>
          <div>{t('vrPreviewHelpMouse')}</div>
          <div style={{ marginTop: 4 }}>
            <b style={{ color: '#cbd5e1' }}>{t('vrPreviewHelpKeys')}</b> {t('vrPreviewHelpKeysVerbs')}
            <b style={{ color: '#cbd5e1' }}> {t('vrPreviewHelpUpDown')}</b> {t('vrPreviewHelpUpDownVerbs')}
            <b style={{ color: '#cbd5e1' }}> {t('vrPreviewHelpShift')}</b> {t('vrPreviewHelpShiftVerbs')}
          </div>
        </div>
      )}

      {stage === 'desktop-preview' && (
        <button
          onClick={() => setStage('idle')}
          style={{
            position: 'absolute', top: 12, right: 12,
            background: 'rgba(7,20,40,0.88)', border: '1px solid rgba(148,163,184,0.3)',
            color: '#cbd5e1', borderRadius: 8, padding: '6px 14px', fontSize: 12,
            cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {t('vrClosePreview')}
        </button>
      )}

      {inVR && (
        <button
          onClick={handleExit}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'rgba(7,20,40,0.88)', border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: 8, padding: '8px 18px', color: '#fca5a5',
            fontFamily: 'Inter, system-ui, sans-serif', fontSize: 13, cursor: 'pointer',
          }}
        >
          {t('vrExit')}
        </button>
      )}
    </div>
  )
}

// ─── Диагностическая «дверь» в VR ────────────────────────────────────────────
function VRGate({
  caps, failure, isEntering, onEnterVR, onDesktopPreview,
}: {
  caps: XRCapabilities | null
  failure: Failure
  isEntering: boolean
  onEnterVR: () => void
  onDesktopPreview: () => void
}) {
  const { t } = useLanguage()
  const insecure = typeof window !== 'undefined' && !window.isSecureContext

  // Состояния
  const checking = caps == null
  const noXR     = caps?.vr === false && !!caps && !insecure
  const ready    = caps?.vr === true && !insecure
  const showError = !!failure

  return (
    <div style={{
      pointerEvents: 'auto',
      background: 'rgba(7,20,40,0.94)',
      border: '1px solid rgba(59,130,246,0.4)',
      borderRadius: 14, padding: '24px 28px',
      width: 'min(440px, 92vw)', textAlign: 'center',
      color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif',
      boxShadow: '0 30px 60px -20px rgba(0,0,0,0.6)',
    }}>
      <div style={{ fontSize: 32, marginBottom: 6 }}>🥽</div>
      <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: '#60a5fa' }}>
        {t('vrTitle')}
      </h3>

      {/* Статусная плашка */}
      <StatusBadge
        checking={checking}
        insecure={insecure}
        ready={ready}
        noXR={noXR}
      />

      {/* Описание */}
      <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5, marginTop: 10, textAlign: 'left' }}>
        {checking && t('vrCheckingMessage')}

        {insecure && (
          <>
            <b style={{ color: '#fca5a5' }}>{t('vrInsecurePrefix')}</b>{' '}
            {t('vrInsecureMessage')}
          </>
        )}

        {!insecure && noXR && (
          <>
            {t('vrNoHeadsetMessage')}
            <ul style={{ margin: '8px 0 0', paddingLeft: 18, lineHeight: 1.7 }}>
              <li>{t('vrPaths1')}</li>
              <li>{t('vrPaths2')}</li>
              <li>{t('vrPaths3')}</li>
              <li>{t('vrPaths4')}</li>
            </ul>
            {t('vrPathsFallback')} <b style={{ color: '#cbd5e1' }}>{t('vrPathsFallbackBold')}</b>.
          </>
        )}

        {!insecure && ready && !showError && (
          <>
            {t('vrReadyTitle')}
            <ul style={{ margin: '8px 0 0', paddingLeft: 18, lineHeight: 1.7 }}>
              <li>{t('vrControlTeleport')}</li>
              <li>{t('vrControlSnap')}</li>
              <li>{t('vrControlPanel')}</li>
              <li>{t('vrControlKeyboard')}</li>
              <li>{t('vrControlExit')}</li>
            </ul>
          </>
        )}
      </div>

      {/* Ошибка */}
      {showError && (
        <div style={{
          marginTop: 12, padding: '8px 10px',
          background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.32)',
          borderRadius: 8, fontSize: 11, color: '#fca5a5',
        }}>
          <b>{t('vrErrorPrefix')}</b> {failureLabel(failure, t)}
        </div>
      )}

      {/* Кнопки */}
      <div style={{ display: 'flex', gap: 8, marginTop: 18, justifyContent: 'center', flexWrap: 'wrap' }}>
        {ready && (
          <button
            onClick={onEnterVR}
            disabled={isEntering}
            style={{
              background: isEntering ? '#1e3a8a' : 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
              border: 'none', borderRadius: 8, padding: '10px 24px',
              color: '#fff', fontWeight: 700, fontSize: 13,
              cursor: isEntering ? 'wait' : 'pointer',
            }}
          >
            {isEntering ? t('vrEntering') : t('vrEnter')}
          </button>
        )}
        <button
          onClick={onDesktopPreview}
          style={{
            background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.4)',
            borderRadius: 8, padding: '10px 18px', color: '#93c5fd', fontSize: 13,
            cursor: 'pointer', fontWeight: 600,
          }}
        >
          {t('vrDesktopPreview')}
        </button>
      </div>
    </div>
  )
}

function StatusBadge({
  checking, insecure, ready, noXR,
}: {
  checking: boolean; insecure: boolean; ready: boolean; noXR: boolean
}) {
  const { t } = useLanguage()
  let bg = 'rgba(148,163,184,0.15)'
  let color = '#cbd5e1'
  let text  = t('vrStatusChecking')
  if (insecure) { bg = 'rgba(239,68,68,0.15)';  color = '#fca5a5'; text = t('vrStatusInsecure') }
  else if (ready)    { bg = 'rgba(34,197,94,0.15)';  color = '#86efac'; text = t('vrStatusReady') }
  else if (noXR)     { bg = 'rgba(245,158,11,0.15)'; color = '#fcd34d'; text = t('vrStatusNoHeadset') }
  else if (checking) { bg = 'rgba(148,163,184,0.15)'; color = '#cbd5e1'; text = t('vrStatusChecking') }
  return (
    <div style={{
      display: 'inline-block', marginTop: 4, padding: '2px 10px', borderRadius: 12,
      background: bg, color, fontSize: 11, fontWeight: 700,
    }}>{text}</div>
  )
}

function failureLabel(f: Failure, t: (k: string) => string): string {
  if (f === 'no-webxr')          return t('vrErrorNoWebxr')
  if (f === 'insecure-context')  return t('vrErrorInsecure')
  if (f === 'not-supported')     return t('vrErrorNoHeadset')
  return f || t('vrErrorUnknown')
}

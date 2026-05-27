import { useState, useMemo } from 'react'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'
import { useNpsStore } from '../store'
import { useScenePalette } from '../palette'
import {
  TANK_POSITIONS, TANK_IDS, TANK_R, TANK_H,
  OBVALOVKA_CENTER, OBVALOVKA_W, OBVALOVKA_D, OBVALOVKA_WALL_H,
  MAT_TANK, COLOR_SELECTED, COLOR_HOVER, EMISSIVE_SELECTED, EMISSIVE_HOVER,
} from '../constants'

// Логотип «KazTransOil» как изогнутый шильд на стенке РВС.
// Аспект исходного PNG ≈ 4.28:1 (831×194). Логотип повторяет кривизну резервуара.
const LOGO_ASPECT = 831 / 194
const LOGO_HEIGHT = 0.55             // ~30 % высоты резервуара
const LOGO_ARC    = (LOGO_HEIGHT * LOGO_ASPECT) / TANK_R  // длина дуги в радианах

function TankLogo({
  texture, rotationY, glow,
}: {
  texture: THREE.Texture
  rotationY: number
  glow: boolean
}) {
  // Партиальный цилиндр чуть снаружи стенки бака; UV-развёртка drei/three
  // по умолчанию переводит дугу в U∈[0,1], высоту — в V∈[0,1], что даёт
  // правильно вытянутый по дуге логотип без искажений.
  return (
    <mesh rotation={[0, rotationY, 0]}>
      <cylinderGeometry
        args={[
          TANK_R + 0.012,
          TANK_R + 0.012,
          LOGO_HEIGHT,
          48,
          1,
          true,
          -LOGO_ARC / 2,
          LOGO_ARC,
        ]}
      />
      <meshStandardMaterial
        map={texture}
        // В тёмной теме используем тот же логотип как emissiveMap —
        // он «светится» собственной яркостью независимо от падающего света.
        emissiveMap={glow ? texture : null}
        emissive={glow ? '#ffffff' : '#000000'}
        emissiveIntensity={glow ? 0.85 : 0}
        transparent
        alphaTest={0.25}
        roughness={0.55}
        metalness={0.05}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  )
}

function Tank({
  position, id, label, logoTexture, logoGlow,
}: {
  position: [number, number, number]
  id: string
  label: string
  logoTexture?: THREE.Texture
  logoGlow?: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const selectedId = useNpsStore(s => s.selectedId)
  const select     = useNpsStore(s => s.select)
  const isSelected = selectedId === id

  const emissiveColor = isSelected ? COLOR_SELECTED : hovered ? COLOR_HOVER : '#000000'
  const emissiveInt   = isSelected ? EMISSIVE_SELECTED : hovered ? EMISSIVE_HOVER : 0

  // Spiral staircase geometry
  const spiralPts = useMemo(() => {
    const pts: THREE.Vector3[] = []
    const turns = 2, steps = 40
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const angle = t * turns * Math.PI * 2
      pts.push(new THREE.Vector3(
        Math.cos(angle) * (TANK_R + 0.08),
        t * TANK_H,
        Math.sin(angle) * (TANK_R + 0.08),
      ))
    }
    return pts
  }, [])

  const spiralCurve = useMemo(() =>
    new THREE.CatmullRomCurve3(spiralPts), [spiralPts])

  return (
    <group position={position}>
      {/* Tank body */}
      <mesh
        castShadow receiveShadow
        onClick={e => { e.stopPropagation(); select(id) }}
        onPointerOver={e => { e.stopPropagation(); setHovered(true) }}
        onPointerOut={() => setHovered(false)}
      >
        <cylinderGeometry args={[TANK_R, TANK_R, TANK_H, 32]} />
        <meshStandardMaterial
          {...MAT_TANK}
          emissive={emissiveColor}
          emissiveIntensity={emissiveInt}
        />
      </mesh>

      {/* Flat roof */}
      <mesh position={[0, TANK_H / 2 + 0.02, 0]} castShadow>
        <cylinderGeometry args={[TANK_R, TANK_R, 0.04, 32]} />
        <meshStandardMaterial color="#334155" roughness={0.7} metalness={0.5} />
      </mesh>

      {/* Walkway torus */}
      <mesh position={[0, TANK_H / 2 + 0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[TANK_R + 0.04, 0.04, 8, 32]} />
        <meshStandardMaterial color="#475569" roughness={0.6} metalness={0.6} />
      </mesh>

      {/* Spiral staircase */}
      <mesh>
        <tubeGeometry args={[spiralCurve, 80, 0.025, 6, false]} />
        <meshStandardMaterial color="#64748b" roughness={0.5} metalness={0.8} />
      </mesh>

      {/* Логотип КазТрансОйл на стенке (с двух сторон) */}
      {logoTexture && (
        <>
          <TankLogo texture={logoTexture} rotationY={0}        glow={!!logoGlow} />
          <TankLogo texture={logoTexture} rotationY={Math.PI}  glow={!!logoGlow} />
        </>
      )}

      {/* Selection ring */}
      {isSelected && (
        <mesh position={[0, -TANK_H / 2 + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[TANK_R + 0.1, TANK_R + 0.25, 32]} />
          <meshBasicMaterial color={COLOR_SELECTED} transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  )
}

// Obvalovka (containment berm) walls
function Obvalovka() {
  const [cx, , cz] = OBVALOVKA_CENTER
  const w = OBVALOVKA_W, d = OBVALOVKA_D, h = OBVALOVKA_WALL_H
  const palette = useScenePalette()

  const walls: { pos: [number,number,number]; ww: number; wd: number }[] = [
    { pos: [cx,      h/2, cz - d - 0.25], ww: w*2+1, wd: 0.5 },
    { pos: [cx,      h/2, cz + d + 0.25], ww: w*2+1, wd: 0.5 },
    { pos: [cx - w - 0.25, h/2, cz], ww: 0.5, wd: d*2 },
    { pos: [cx + w + 0.25, h/2, cz], ww: 0.5, wd: d*2 },
  ]

  return (
    <group>
      {walls.map((wall, i) => (
        <mesh key={i} position={wall.pos} castShadow>
          <boxGeometry args={[wall.ww, h, wall.wd]} />
          <meshStandardMaterial color={palette.concrete} roughness={0.85} />
        </mesh>
      ))}
    </group>
  )
}

export function TankFarm() {
  // Загружаем текстуру один раз; drei/useTexture кэширует её.
  const logo = useTexture('/kto-logo.png') as THREE.Texture
  const palette = useScenePalette()

  // В тёмном режиме перекрашиваем логотип в светлый цвет, чтобы он
  // был заметен на тёмной стенке. В светлом режиме сохраняем оригинал.
  const tintedLogo = useMemo(() => {
    if (!palette.isDark) {
      logo.colorSpace = THREE.SRGBColorSpace
      logo.anisotropy = 8
      logo.needsUpdate = true
      return logo
    }
    const img = logo.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap | undefined
    if (!img) return logo

    const canvas = document.createElement('canvas')
    canvas.width  = (img as HTMLImageElement).naturalWidth  ?? img.width
    canvas.height = (img as HTMLImageElement).naturalHeight ?? img.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return logo

    ctx.drawImage(img as CanvasImageSource, 0, 0, canvas.width, canvas.height)
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
    // Светло-голубоватый off-white (slate-100), хорошо читается на тёмном металле
    const TR = 0xf1, TG = 0xf5, TB = 0xf9
    for (let i = 0; i < data.data.length; i += 4) {
      if (data.data[i + 3] > 0) {
        data.data[i]     = TR
        data.data[i + 1] = TG
        data.data[i + 2] = TB
      }
    }
    ctx.putImageData(data, 0, 0)

    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    tex.needsUpdate = true
    return tex
  }, [logo, palette.isDark])

  return (
    <group>
      <Obvalovka />
      {TANK_POSITIONS.map((pos, i) => (
        <Tank
          key={TANK_IDS[i]}
          position={pos}
          id={TANK_IDS[i]}
          label={`РВС-${i + 1}`}
          logoTexture={tintedLogo}
          logoGlow={palette.isDark}
        />
      ))}
    </group>
  )
}

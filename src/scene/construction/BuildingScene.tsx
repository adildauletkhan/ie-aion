/**
 * BuildingScene — реалистичная 4D-сцена стройплощадки на @react-three/fiber.
 *
 * Состав визуала:
 *   ▸ небо `<Sky>` (drei) + асфальтовая площадка с тротуарами и дорогой
 *   ▸ временный строительный забор по периметру плот а
 *   ▸ котлован (для незапущенных зданий) с откосами
 *   ▸ свайное поле, ростверк, цокольный этаж с витражами
 *   ▸ типовые этажи: плита + ж/б колонны + навесные фасады с окнами и
 *     мулионами, балконы-лоджии на длинных фасадах
 *   ▸ ядро лестнично-лифтового узла (slipform — на 1-2 этажа выше плит)
 *   ▸ кровля с парапетом, HVAC-блоками и антенной
 *   ▸ башенный кран рядом с активным зданием
 *   ▸ временная бытовка-офис стройплощадки
 *   ▸ подземный паркинг с колоннами и разметкой
 *
 * Состояние каждого BIM-элемента считается по плановому прогрессу его
 * задачи на выбранную timeline-дату.  Hover/click выделяет элемент.
 */

import { useMemo, type ReactNode } from 'react'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { Edges, Sky } from '@react-three/drei'

import type {
  BimElement, ScheduleTask,
} from '@/data/constructionMockData'

const DAY_MS = 86_400_000

/* ─────────────────────── ГЕОМЕТРИЧЕСКИЕ КОНСТАНТЫ ──────────────────────── */

const FLOOR_HEIGHT = 3.0      // м — высота типового этажа
const PLINTH_HEIGHT = 4.2     // м — высота цокольного этажа (1-й, торговый)
const SLAB_T = 0.18           // м — толщина плиты перекрытия
const COLUMN_W = 0.42         // м — сторона ж/б колонны
const WALL_T = 0.14           // м — толщина наружной стены

const LOW_FLOORS  = 6         // перекрытия 1-6
const HIGH_FLOORS = 6         // перекрытия 7-12
const TOTAL_FLOORS = LOW_FLOORS + HIGH_FLOORS

/* Y-координата уровня земли в сцене (фундамент уходит ниже неё). */
const Y_GROUND = 0

/* ─────────────────────── ПАЛИТРА ───────────────────────────────────────── */

export type ElementState = 'not_started' | 'in_progress' | 'completed'

interface ScenePalette {
  concrete:     string
  concreteWarm: string
  concreteDeep: string
  rebar:        string
  pile:         string
  glass:        string
  glassDeep:    string
  glassEmiss:   string
  mullion:      string
  parapet:      string
  asphalt:      string
  sidewalk:     string
  dirt:         string
  fence:        string
  fenceMesh:    string
  crane:        string
  trailer:      string
  trailerRoof:  string
  hvac:         string
  highlight:    string
  ghostLine:    string
}

function makePalette(isDark: boolean): ScenePalette {
  return isDark
    ? {
        concrete:      '#9097a0',
        concreteWarm:  '#8a8474',
        concreteDeep:  '#46505b',
        rebar:         '#b59a64',
        pile:          '#525c66',
        glass:         '#5bb3d6',
        glassDeep:     '#2563a1',
        glassEmiss:    '#0c4a6e',
        mullion:       '#1f2937',
        parapet:       '#5b6470',
        asphalt:       '#1c2330',
        sidewalk:      '#475569',
        dirt:          '#3b322a',
        fence:         '#d97706',
        fenceMesh:     '#a3a3a3',
        crane:         '#facc15',
        trailer:       '#1e40af',
        trailerRoof:   '#1e293b',
        hvac:          '#71717a',
        highlight:     '#facc15',
        ghostLine:     '#94a3b8',
      }
    : {
        concrete:      '#cfcdc4',
        concreteWarm:  '#bcb4a0',
        concreteDeep:  '#7e828a',
        rebar:         '#a08c5a',
        pile:          '#71747a',
        glass:         '#9ed1e6',
        glassDeep:     '#3b8cb7',
        glassEmiss:    '#1e3a52',
        mullion:       '#3f3f46',
        parapet:       '#9ca3af',
        asphalt:       '#828589',
        sidewalk:      '#cbd5e1',
        dirt:          '#7c6651',
        fence:         '#e8862c',
        fenceMesh:     '#a3a3a3',
        crane:         '#f59e0b',
        trailer:       '#2563eb',
        trailerRoof:   '#334155',
        hvac:          '#9ca3af',
        highlight:     '#ca8a04',
        ghostLine:     '#64748b',
      }
}

/* ─────────────────────── ПРОГРЕСС ЗАДАЧИ НА ДАТУ ───────────────────────── */

export function planProgress(task: ScheduleTask | undefined, date: Date): number {
  if (!task) return 0
  const ts = new Date(task.plannedStart).getTime()
  const tf = new Date(task.plannedFinish).getTime()
  const t  = date.getTime()
  if (tf <= ts) return 0
  if (t <= ts)  return 0
  if (t >= tf)  return 1
  return (t - ts) / (tf - ts)
}

export function stateFromProgress(p: number): ElementState {
  if (p <= 0) return 'not_started'
  if (p >= 1) return 'completed'
  return 'in_progress'
}

/* ─────────────────────── ОБЩИЕ ПРИМИТИВЫ ───────────────────────────────── */

interface PickableProps {
  elementId: string
  onClick:   (id: string) => void
  onHover:   (id: string | null) => void
  children:  ReactNode
}

function Pickable({ elementId, onClick, onHover, children }: PickableProps) {
  return (
    <group
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation()
        onClick(elementId)
      }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        onHover(elementId)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        onHover(null)
        document.body.style.cursor = 'default'
      }}
    >
      {children}
    </group>
  )
}

interface BoxProps {
  position: [number, number, number]
  size:     [number, number, number]
  color:    string
  opacity?: number
  edge?:    string
  emissive?:string
  metalness?:number
  roughness?:number
}

function Box({
  position, size, color,
  opacity = 1, edge, emissive,
  metalness = 0.05, roughness = 0.78,
}: BoxProps) {
  const isTransparent = opacity < 1
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        transparent={isTransparent}
        opacity={opacity}
        emissive={emissive ?? '#000000'}
        emissiveIntensity={emissive ? 0.55 : 0}
        metalness={metalness}
        roughness={roughness}
        depthWrite={!isTransparent}
      />
      {edge && (
        <Edges color={edge} scale={1.0} threshold={15} renderOrder={2}>
          <lineBasicMaterial color={edge} depthTest={false} transparent opacity={0.95} />
        </Edges>
      )}
    </mesh>
  )
}

/* ─────────────────────── ФУТПРИНТ-МАРКЕР ───────────────────────────────── */

/** Геодезическая разметка будущего объекта — 4 угловых кола + штриховой
 *  контур по периметру. Используется для незапущенных зданий вместо
 *  гигантских wireframe-боксов. */
function FootprintMarker({
  x0, z0, w, d, pal,
}: { x0: number; z0: number; w: number; d: number; pal: ScenePalette }) {
  const corners: [number, number][] = [
    [x0, z0], [x0 + w, z0], [x0, z0 + d], [x0 + w, z0 + d],
  ]
  // Контур-линия по периметру (тонкая полоса на земле)
  const lineY = Y_GROUND + 0.02
  return (
    <group>
      {/* 4 геодезических колышка с красным флажком */}
      {corners.map(([cx, cz], i) => (
        <group key={`stake-${i}`} position={[cx, lineY, cz]}>
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 1.2, 6]} />
            <meshStandardMaterial color="#fde68a" roughness={0.6} />
          </mesh>
          <mesh position={[0.15, 1.05, 0]}>
            <planeGeometry args={[0.3, 0.18]} />
            <meshStandardMaterial color="#dc2626" side={THREE.DoubleSide} roughness={0.8} />
          </mesh>
        </group>
      ))}
      {/* Дорожная разметка по периметру */}
      <Box position={[x0 + w / 2, lineY, z0 + 0.05]}        size={[w, 0.01, 0.1]} color={pal.ghostLine} opacity={0.6} />
      <Box position={[x0 + w / 2, lineY, z0 + d - 0.05]}    size={[w, 0.01, 0.1]} color={pal.ghostLine} opacity={0.6} />
      <Box position={[x0 + 0.05, lineY, z0 + d / 2]}        size={[0.1, 0.01, d]} color={pal.ghostLine} opacity={0.6} />
      <Box position={[x0 + w - 0.05, lineY, z0 + d / 2]}    size={[0.1, 0.01, d]} color={pal.ghostLine} opacity={0.6} />
    </group>
  )
}

/* ─────────────────────── КОТЛОВАН ──────────────────────────────────────── */

function FoundationPit({
  x0, z0, w, d, depth, pal,
}: { x0: number; z0: number; w: number; d: number; depth: number; pal: ScenePalette }) {
  const cx = x0 + w / 2
  const cz = z0 + d / 2
  return (
    <group>
      {/* Дно котлована */}
      <mesh position={[cx, -depth, cz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w - 0.6, d - 0.6]} />
        <meshStandardMaterial color={pal.dirt} roughness={1} />
      </mesh>
      {/* Откосы (4 трапециевидные стенки) — упрощённо плоскостями */}
      {[
        { pos: [cx, -depth / 2, z0 + 0.3] as [number, number, number], size: [w - 0.6, depth, 0.6] as [number, number, number] },
        { pos: [cx, -depth / 2, z0 + d - 0.3] as [number, number, number], size: [w - 0.6, depth, 0.6] as [number, number, number] },
        { pos: [x0 + 0.3, -depth / 2, cz] as [number, number, number], size: [0.6, depth, d - 0.6] as [number, number, number] },
        { pos: [x0 + w - 0.3, -depth / 2, cz] as [number, number, number], size: [0.6, depth, d - 0.6] as [number, number, number] },
      ].map((s, i) => (
        <mesh key={`slope-${i}`} position={s.pos}>
          <boxGeometry args={s.size} />
          <meshStandardMaterial color={pal.dirt} roughness={1} />
        </mesh>
      ))}
    </group>
  )
}

/* ─────────────────────── СВАЙНОЕ ПОЛЕ ──────────────────────────────────── */

interface PilesProps {
  x0: number; z0: number; w: number; d: number
  progress: number
  pal: ScenePalette
  selected: boolean
  hovered: boolean
}

function Piles({ x0, z0, w, d, progress, pal, selected, hovered }: PilesProps) {
  const positions = useMemo(() => {
    const arr: [number, number][] = []
    const cols = 5
    const rows = 5
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = x0 + (w / (cols - 1)) * i
        const z = z0 + (d / (rows - 1)) * j
        arr.push([x, z])
      }
    }
    return arr
  }, [x0, z0, w, d])

  const visible   = Math.max(0, Math.min(positions.length, Math.ceil(progress * positions.length)))
  const edgeColor = selected ? pal.highlight : hovered ? '#a3e635' : undefined

  return (
    <>
      {positions.slice(0, visible).map(([x, z], i) => (
        <group key={`p-${i}`} position={[x, 0, z]}>
          {/* Свая (бетонная колонна, уходит под землю) */}
          <mesh position={[0, -1.4, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.18, 0.18, 2.8, 12]} />
            <meshStandardMaterial color={pal.pile} roughness={0.85} />
            {edgeColor && <Edges color={edgeColor} scale={1.001} threshold={30} />}
          </mesh>
          {/* Арматурный выпуск над сваей */}
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.5, 6]} />
            <meshStandardMaterial color={pal.rebar} roughness={0.4} metalness={0.6} />
          </mesh>
        </group>
      ))}
    </>
  )
}

/* ─────────────────────── РОСТВЕРК ──────────────────────────────────────── */

function FootingSlab({
  x0, z0, w, d, progress, pal, selected, hovered,
}: {
  x0: number; z0: number; w: number; d: number
  progress: number
  pal: ScenePalette
  selected: boolean
  hovered: boolean
}) {
  const cx = x0 + w / 2
  const cz = z0 + d / 2
  const edgeColor = selected ? pal.highlight : hovered ? '#a3e635' : undefined
  const state = stateFromProgress(progress)
  if (state === 'not_started') return null

  return (
    <>
      <Box
        position={[cx, -0.05, cz]}
        size={[w, 0.6, d]}
        color={pal.concreteDeep}
        edge={edgeColor}
        roughness={0.85}
      />
      {state === 'in_progress' && (
        <group position={[cx, 0.27, cz]}>
          {[-0.32, -0.16, 0, 0.16, 0.32].map((zRel, i) => (
            <Box
              key={i}
              position={[0, 0, zRel * d]}
              size={[w * 0.92, 0.04, 0.04]}
              color={pal.rebar}
              roughness={0.4}
              metalness={0.6}
            />
          ))}
          {[-0.32, -0.16, 0, 0.16, 0.32].map((xRel, i) => (
            <Box
              key={`x-${i}`}
              position={[xRel * w, 0, 0]}
              size={[0.04, 0.04, d * 0.92]}
              color={pal.rebar}
              roughness={0.4}
              metalness={0.6}
            />
          ))}
        </group>
      )}
    </>
  )
}

/* ─────────────────────── ОКОННАЯ ЯЧЕЙКА ────────────────────────────────── */

interface WindowCellProps {
  position: [number, number, number]
  width: number
  height: number
  depth: number
  pal: ScenePalette
  withTransom?: boolean
}

function WindowCell({ position, width, height, depth, pal, withTransom = true }: WindowCellProps) {
  /* ─ Геометрия окна без co-planar:
   *   • стекло чуть утоплено в проём и тоньше глубины проёма,
   *   • рамы/мулионы — тонкие планки, поднятые НАД переднюю плоскость стекла,
   *     поэтому их грани не лежат в одной плоскости со стеклом и не «дёргаются». */
  const glassW = width  - 0.02
  const glassH = height - 0.02
  const glassD = Math.max(0.02, depth * 0.35)
  const frameT = Math.max(0.025, depth * 0.5)   // толщина планки рамы вдоль Z
  const frameW = 0.05                            // ширина обвязки на фасаде
  const frameZ = depth * 0.5 - frameT / 2 + 0.005 // фронт рамы — перед стеклом
  return (
    <group position={position}>
      {/* Стекло — чуть утоплено внутрь проёма */}
      <mesh position={[0, 0, -depth * 0.15]}>
        <boxGeometry args={[glassW, glassH, glassD]} />
        <meshStandardMaterial
          color={pal.glass}
          emissive={pal.glassEmiss}
          emissiveIntensity={0.4}
          metalness={0.6}
          roughness={0.18}
          transparent
          opacity={0.82}
          depthWrite={false}
        />
      </mesh>
      {/* Внешняя обвязка рамы — тонкие планки на фасадной плоскости */}
      <Box position={[-width / 2 + frameW / 2, 0, frameZ]} size={[frameW, height, frameT]} color={pal.mullion} metalness={0.3} roughness={0.45} />
      <Box position={[ width / 2 - frameW / 2, 0, frameZ]} size={[frameW, height, frameT]} color={pal.mullion} metalness={0.3} roughness={0.45} />
      <Box position={[0, -height / 2 + frameW / 2, frameZ]} size={[width, frameW, frameT]} color={pal.mullion} metalness={0.3} roughness={0.45} />
      <Box position={[0,  height / 2 - frameW / 2, frameZ]} size={[width, frameW, frameT]} color={pal.mullion} metalness={0.3} roughness={0.45} />
      {/* Горизонтальный трансом и вертикальный мулион — тонкие, в плоскости рамы */}
      {withTransom && (
        <Box position={[0, height * 0.18, frameZ]} size={[width, 0.04, frameT]} color={pal.mullion} metalness={0.3} roughness={0.45} />
      )}
      <Box position={[0, 0, frameZ]} size={[0.04, height, frameT]} color={pal.mullion} metalness={0.3} roughness={0.45} />
    </group>
  )
}

/* ─────────────────────── ФАСАДНАЯ СТЕНА ────────────────────────────────── */

interface FacadeWallProps {
  axis: 'x' | 'z'
  center: [number, number, number]   // центр стены
  length: number                     // длина стены вдоль axis
  height: number                     // высота этажа
  pal: ScenePalette
  windowCount: number
  withBalcony?: boolean
  /** Пропустить центральный проём (для главного входа на цоколе). */
  skipCenter?: boolean
}

function FacadeWall({
  axis, center, length, height, pal, windowCount,
  withBalcony = false, skipCenter = false,
}: FacadeWallProps) {
  const [cx, cy, cz] = center
  const sillBottom = 0.85
  const sillTop    = 0.55
  /* Стена опирается на плиту нижнего этажа (низ — на оригинальном `oy`)
   * и заканчивается ровно под плитой текущего этажа (минус SLAB_T сверху),
   * чтобы её верхняя грань не лежала в одной плоскости с плитой. */
  const wallHeight  = height - SLAB_T
  const wallCenterY = cy - SLAB_T / 2          // центр сместился вниз на SLAB_T/2
  const winH        = wallHeight - sillBottom - sillTop
  const winY        = wallCenterY - wallHeight / 2 + sillBottom + winH / 2

  // Раскладка окон вдоль facade-axis
  const mullionW   = 0.06
  const totalGaps  = mullionW * (windowCount - 1)
  const slotW      = (length - totalGaps) / windowCount

  // Стенные сэндвичи (под окнами и над ними)
  const bottomY = wallCenterY - wallHeight / 2 + sillBottom / 2
  const topY    = wallCenterY + wallHeight / 2 - sillTop / 2
  const wallSizeBot = axis === 'x'
    ? [length, sillBottom, WALL_T] as [number, number, number]
    : [WALL_T, sillBottom, length] as [number, number, number]
  const wallSizeTop = axis === 'x'
    ? [length, sillTop, WALL_T] as [number, number, number]
    : [WALL_T, sillTop, length] as [number, number, number]

  return (
    <group>
      {/* Нижний сэндвич */}
      <Box position={[cx, bottomY, cz]} size={wallSizeBot} color={pal.concrete} />
      {/* Верхний сэндвич */}
      <Box position={[cx, topY, cz]}    size={wallSizeTop} color={pal.concrete} />

      {/* Окна */}
      {Array.from({ length: windowCount }).map((_, i) => {
        const isCenter = skipCenter && i === Math.floor(windowCount / 2)
        const offsetStart = -length / 2
        const slotCenterOffset = offsetStart + slotW / 2 + i * (slotW + mullionW)

        const winPos: [number, number, number] = axis === 'x'
          ? [cx + slotCenterOffset, winY, cz]
          : [cx, winY, cz + slotCenterOffset]
        const winSize = { w: slotW * 0.96, h: winH, d: WALL_T * 0.55 }

        if (isCenter) {
          // Главный вход — двойные двери + козырёк
          const doorBottom = wallCenterY - wallHeight / 2
          return (
            <group key={`door-${i}`}>
              <Box
                position={[
                  winPos[0],
                  doorBottom + 1.2,
                  winPos[2],
                ]}
                size={axis === 'x'
                  ? [slotW * 0.85, 2.4, WALL_T * 0.7]
                  : [WALL_T * 0.7, 2.4, slotW * 0.85]}
                color={pal.glassDeep}
                emissive={pal.glassEmiss}
                metalness={0.55}
                roughness={0.18}
                opacity={0.85}
              />
              {/* Козырёк над входом */}
              <Box
                position={[
                  winPos[0] + (axis === 'z' ? WALL_T * 0.5 : 0),
                  doorBottom + 2.55,
                  winPos[2] + (axis === 'x' ? WALL_T * 0.5 : 0),
                ]}
                size={axis === 'x'
                  ? [slotW * 1.05, 0.12, 1.2]
                  : [1.2, 0.12, slotW * 1.05]}
                color={pal.mullion}
                metalness={0.4}
                roughness={0.3}
              />
            </group>
          )
        }

        return (
          <group key={`win-${i}`}>
            <WindowCell
              position={winPos}
              width={axis === 'x' ? winSize.w : winSize.d}
              height={winSize.h}
              depth={axis === 'x' ? winSize.d : winSize.w}
              pal={pal}
            />
            {/* Балкон/лоджия — каждый 2-й проём на длинных фасадах */}
            {withBalcony && i % 2 === 1 && (
              <BalconySlab
                origin={[
                  winPos[0] + (axis === 'z' ? WALL_T * 0.5 : 0),
                  wallCenterY - wallHeight / 2 + 0.05,
                  winPos[2] + (axis === 'x' ? WALL_T * 0.5 : 0),
                ]}
                axis={axis}
                slotW={slotW}
                pal={pal}
              />
            )}
          </group>
        )
      })}

      {/* Вертикальные мулионы между окнами */}
      {Array.from({ length: windowCount - 1 }).map((_, i) => {
        const offsetStart = -length / 2
        const mullionCenter = offsetStart + slotW + i * (slotW + mullionW) + mullionW / 2
        const mullionPos: [number, number, number] = axis === 'x'
          ? [cx + mullionCenter, winY, cz]
          : [cx, winY, cz + mullionCenter]
        const mullionSize: [number, number, number] = axis === 'x'
          ? [mullionW, winH, WALL_T * 0.95]
          : [WALL_T * 0.95, winH, mullionW]
        return (
          <Box
            key={`mul-${i}`}
            position={mullionPos}
            size={mullionSize}
            color={pal.mullion}
            metalness={0.3}
            roughness={0.45}
          />
        )
      })}
    </group>
  )
}

/* ─────────────────────── БАЛКОН-ЛОДЖИЯ ─────────────────────────────────── */

function BalconySlab({
  origin, axis, slotW, pal,
}: { origin: [number, number, number]; axis: 'x' | 'z'; slotW: number; pal: ScenePalette }) {
  // Плита-консоль 0.12м + ограждение 1.0м (стекло в раме)
  const depth = 1.2
  const railH = 1.05
  const offset = depth / 2 - WALL_T * 0.4
  const slabPos: [number, number, number] = axis === 'x'
    ? [origin[0], origin[1] + 0.06, origin[2] + offset]
    : [origin[0] + offset, origin[1] + 0.06, origin[2]]
  const slabSize: [number, number, number] = axis === 'x'
    ? [slotW * 1.05, 0.12, depth]
    : [depth, 0.12, slotW * 1.05]
  const railPos: [number, number, number] = axis === 'x'
    ? [origin[0], origin[1] + 0.12 + railH / 2, origin[2] + offset + depth / 2 - 0.05]
    : [origin[0] + offset + depth / 2 - 0.05, origin[1] + 0.12 + railH / 2, origin[2]]
  const railSize: [number, number, number] = axis === 'x'
    ? [slotW * 1.05, railH, 0.05]
    : [0.05, railH, slotW * 1.05]
  return (
    <group>
      {/* Плита-консоль */}
      <Box position={slabPos} size={slabSize} color={pal.concreteWarm} roughness={0.7} />
      {/* Парапет-ограждение со стеклом */}
      <mesh position={railPos}>
        <boxGeometry args={railSize} />
        <meshStandardMaterial
          color={pal.glassDeep}
          emissive={pal.glassEmiss}
          emissiveIntensity={0.25}
          metalness={0.5}
          roughness={0.25}
          transparent
          opacity={0.55}
          depthWrite={false}
        />
      </mesh>
      {/* Поручень — тонкая металлическая полоса */}
      <Box position={[railPos[0], railPos[1] + railH / 2 + 0.025, railPos[2]]}
           size={axis === 'x' ? [slotW * 1.05, 0.05, 0.08] : [0.08, 0.05, slotW * 1.05]}
           color={pal.mullion} metalness={0.6} roughness={0.3} />
    </group>
  )
}

/* ─────────────────────── ЦОКОЛЬНЫЙ ЭТАЖ ────────────────────────────────── */

function Plinth({
  origin, width, depth, pal, edge,
}: { origin: [number, number, number]; width: number; depth: number; pal: ScenePalette; edge?: string }) {
  const [ox, oy, oz] = origin
  const h = PLINTH_HEIGHT
  // Перекрытие сверху
  return (
    <group>
      {/* Каменный пьедестал (тёмная нижняя часть 0.6м) */}
      <Box
        position={[ox + width / 2, oy + 0.3, oz + depth / 2]}
        size={[width, 0.6, depth]}
        color={pal.concreteDeep}
        edge={edge}
        roughness={0.95}
      />
      {/* Перекрытие над цоколем */}
      <Box
        position={[ox + width / 2, oy + h - SLAB_T / 2, oz + depth / 2]}
        size={[width, SLAB_T, depth]}
        color={pal.concrete}
      />
      {/* Угловые колонны цоколя (более массивные) */}
      {[
        [ox + COLUMN_W / 2,            oz + COLUMN_W / 2],
        [ox + width - COLUMN_W / 2,    oz + COLUMN_W / 2],
        [ox + COLUMN_W / 2,            oz + depth - COLUMN_W / 2],
        [ox + width - COLUMN_W / 2,    oz + depth - COLUMN_W / 2],
        [ox + width / 2,               oz + COLUMN_W / 2],
        [ox + width / 2,               oz + depth - COLUMN_W / 2],
      ].map(([cx, cz], i) => (
        <Box
          key={`pcol-${i}`}
          position={[cx, oy + h / 2, cz]}
          size={[COLUMN_W * 1.15, h, COLUMN_W * 1.15]}
          color={pal.concrete}
          roughness={0.7}
        />
      ))}

      {/* Витражи цоколя — длинные стеклянные секции на всех 4 фасадах */}
      <PlinthFacade origin={[ox, oy + 0.6, oz]} width={width} depth={depth} height={h - 0.6 - SLAB_T} pal={pal} />
    </group>
  )
}

function PlinthFacade({
  origin, width, depth, height, pal,
}: { origin: [number, number, number]; width: number; depth: number; height: number; pal: ScenePalette }) {
  const [ox, oy, oz] = origin
  const cyMid    = oy + height / 2
  const eps      = 0.01
  const wallLenX = width - COLUMN_W * 2 - 0.04
  const wallLenZ = depth - COLUMN_W * 2 - 0.04
  return (
    <>
      <FacadeWall
        axis="x"
        center={[ox + width / 2, cyMid, oz + depth - WALL_T / 2 - eps]}
        length={wallLenX}
        height={height}
        pal={pal}
        windowCount={5}
        skipCenter
      />
      <FacadeWall
        axis="x"
        center={[ox + width / 2, cyMid, oz + WALL_T / 2 + eps]}
        length={wallLenX}
        height={height}
        pal={pal}
        windowCount={5}
      />
      <FacadeWall
        axis="z"
        center={[ox + WALL_T / 2 + eps, cyMid, oz + depth / 2]}
        length={wallLenZ}
        height={height}
        pal={pal}
        windowCount={6}
      />
      <FacadeWall
        axis="z"
        center={[ox + width - WALL_T / 2 - eps, cyMid, oz + depth / 2]}
        length={wallLenZ}
        height={height}
        pal={pal}
        windowCount={6}
      />
    </>
  )
}

/* ─────────────────────── ТИПОВОЙ ЭТАЖ ──────────────────────────────────── */

interface StoreyProps {
  origin: [number, number, number]
  width: number
  depth: number
  height: number
  pal: ScenePalette
  edge?: string
  underConstruction?: boolean
  withBalconies?: boolean
}

function Storey({
  origin, width, depth, height, pal, edge,
  underConstruction = false, withBalconies = false,
}: StoreyProps) {
  const [ox, oy, oz] = origin
  const slabY = oy + height - SLAB_T / 2

  // 4 углов + 2 средних колонн на длинных фасадах
  const cornerPositions: [number, number][] = [
    [ox + COLUMN_W / 2,            oz + COLUMN_W / 2],
    [ox + width - COLUMN_W / 2,    oz + COLUMN_W / 2],
    [ox + COLUMN_W / 2,            oz + depth - COLUMN_W / 2],
    [ox + width - COLUMN_W / 2,    oz + depth - COLUMN_W / 2],
    [ox + width / 2,               oz + COLUMN_W / 2],
    [ox + width / 2,               oz + depth - COLUMN_W / 2],
  ]

  // Колонна заканчивается ровно под плитой, чтобы её верхняя грань
  // не лежала в одной плоскости с гранями плиты.
  const colH = height - SLAB_T
  const colY = oy + colH / 2

  return (
    <group>
      {/* Перекрытие */}
      <Box
        position={[ox + width / 2, slabY, oz + depth / 2]}
        size={[width, SLAB_T, depth]}
        color={pal.concrete}
        edge={edge}
      />

      {/* Колонны */}
      {cornerPositions.map(([cx, cz], i) => (
        <Box
          key={`col-${i}`}
          position={[cx, colY, cz]}
          size={[COLUMN_W, colH, COLUMN_W]}
          color={pal.concrete}
          roughness={0.7}
        />
      ))}

      {/* Фасады — только когда этаж не «в стройке».
       *  Стены ставим МЕЖДУ колоннами (length = grid - 2*COLUMN_W - clearance)
       *  и чуть внутрь от внешней грани плиты (epsilon), чтобы их грани не
       *  совпадали с гранями плит/колонн и не было z-fighting. */}
      {!underConstruction && (() => {
        const eps      = 0.01
        const wallLenX = width - COLUMN_W * 2 - 0.04
        const wallLenZ = depth - COLUMN_W * 2 - 0.04
        return (
          <>
            <FacadeWall
              axis="x"
              center={[ox + width / 2, oy + height / 2, oz + depth - WALL_T / 2 - eps]}
              length={wallLenX}
              height={height}
              pal={pal}
              windowCount={5}
              withBalcony={withBalconies}
            />
            <FacadeWall
              axis="x"
              center={[ox + width / 2, oy + height / 2, oz + WALL_T / 2 + eps]}
              length={wallLenX}
              height={height}
              pal={pal}
              windowCount={5}
              withBalcony={withBalconies}
            />
            <FacadeWall
              axis="z"
              center={[ox + WALL_T / 2 + eps, oy + height / 2, oz + depth / 2]}
              length={wallLenZ}
              height={height}
              pal={pal}
              windowCount={6}
            />
            <FacadeWall
              axis="z"
              center={[ox + width - WALL_T / 2 - eps, oy + height / 2, oz + depth / 2]}
              length={wallLenZ}
              height={height}
              pal={pal}
              windowCount={6}
            />
          </>
        )
      })()}
    </group>
  )
}

/* ─────────────────────── КРОВЛЯ С ПАРАПЕТОМ И HVAC ─────────────────────── */

function RoofCrown({
  origin, width, depth, pal,
}: { origin: [number, number, number]; width: number; depth: number; pal: ScenePalette }) {
  const [ox, oy, oz] = origin
  const parapetH = 1.1
  const t = 0.18
  return (
    <group>
      {/* Парапет */}
      <Box position={[ox + width / 2, oy + parapetH / 2, oz + t / 2]}        size={[width, parapetH, t]} color={pal.parapet} />
      <Box position={[ox + width / 2, oy + parapetH / 2, oz + depth - t / 2]} size={[width, parapetH, t]} color={pal.parapet} />
      <Box position={[ox + t / 2, oy + parapetH / 2, oz + depth / 2]}        size={[t, parapetH, depth]} color={pal.parapet} />
      <Box position={[ox + width - t / 2, oy + parapetH / 2, oz + depth / 2]} size={[t, parapetH, depth]} color={pal.parapet} />
      {/* HVAC-блоки (2 шт.) */}
      <Box position={[ox + width / 2 - 1.6, oy + 0.55, oz + depth / 2 - 1.4]} size={[1.8, 1.1, 1.4]} color={pal.hvac} roughness={0.7} metalness={0.3} />
      <Box position={[ox + width / 2 + 1.4, oy + 0.45, oz + depth / 2 + 0.8]} size={[1.5, 0.9, 1.2]} color={pal.hvac} roughness={0.7} metalness={0.3} />
      {/* Антенна-стойка */}
      <mesh position={[ox + width * 0.75, oy + 1.6, oz + depth * 0.3]} castShadow>
        <cylinderGeometry args={[0.04, 0.06, 3.2, 8]} />
        <meshStandardMaterial color={pal.mullion} metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Световой сигнал — маленький эмиссивный куб на верху антенны */}
      <mesh position={[ox + width * 0.75, oy + 3.3, oz + depth * 0.3]}>
        <boxGeometry args={[0.12, 0.12, 0.12]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={1.2} />
      </mesh>
      {/* Лестничный выход на кровлю */}
      <Box position={[ox + width * 0.25, oy + 1.2, oz + depth * 0.7]} size={[1.6, 2.4, 1.6]} color={pal.concreteDeep} />
    </group>
  )
}

/* ─────────────────────── ЯДРО ЛЕСТНИЧНО-ЛИФТОВОГО УЗЛА ─────────────────── */

interface CoreShaftProps {
  /** Footprint ядра в плане. */
  x0: number; z0: number; w: number; d: number
  yBase: number
  yTop:  number    // ограничение сверху (макс. высота здания)
  pal:   ScenePalette
  selected: boolean
  hovered:  boolean
  /** Текущий «верх плит» — реальная высота построенных этажей. */
  floorsTopY: number
}

function CoreShaft({
  x0, z0, w, d, yBase, yTop, pal, selected, hovered, floorsTopY,
}: CoreShaftProps) {
  // Slipform-логика: ядро всегда не более чем на 1.5 этажа выше плит
  const slipformLead = FLOOR_HEIGHT * 1.5
  const effTop = Math.max(yBase + 0.3, Math.min(yTop, floorsTopY + slipformLead))
  if (effTop - yBase < 0.4) return null

  const cx = x0 + w / 2
  const cz = z0 + d / 2
  const edgeColor = selected ? pal.highlight : hovered ? '#a3e635' : undefined

  return (
    <group>
      <Box
        position={[cx, (yBase + effTop) / 2, cz]}
        size={[w, effTop - yBase, d]}
        color={pal.concreteDeep}
        edge={edgeColor}
        roughness={0.85}
      />
      {/* Вертикальная лестничная щель — узкое окно */}
      <mesh position={[cx + w / 2 + 0.005, (yBase + effTop) / 2, cz]}>
        <boxGeometry args={[0.04, Math.max(0.1, effTop - yBase - 1.0), Math.min(d * 0.4, 1.2)]} />
        <meshStandardMaterial
          color={pal.glass}
          emissive={pal.glassEmiss}
          emissiveIntensity={0.55}
          metalness={0.5}
          roughness={0.2}
          transparent
          opacity={0.85}
          depthWrite={false}
        />
      </mesh>
      {/* Логотип/маркировка лифтового блока */}
      {effTop > yBase + 4 && (
        <Box
          position={[cx + w / 2 - 0.08, yBase + 2.0, cz - 0.4]}
          size={[0.04, 0.5, 0.8]}
          color={pal.crane}
          metalness={0.2}
          roughness={0.5}
        />
      )}
    </group>
  )
}

/* ─────────────────────── ПАРКИНГ-ПЛИТА ─────────────────────────────────── */

function ParkingSlab({
  x0, z0, w, d, y, pal, selected, hovered, progress,
}: {
  x0: number; z0: number; w: number; d: number; y: number
  pal: ScenePalette
  selected: boolean
  hovered: boolean
  progress: number
}) {
  if (stateFromProgress(progress) === 'not_started') return null
  const cx = x0 + w / 2
  const cz = z0 + d / 2
  const edgeColor = selected ? pal.highlight : hovered ? '#a3e635' : undefined
  return (
    <group>
      <Box
        position={[cx, y, cz]}
        size={[w, 0.4, d]}
        color={pal.concreteDeep}
        edge={edgeColor}
        roughness={0.95}
      />
      {Array.from({ length: 4 }).map((_, i) =>
        Array.from({ length: 2 }).map((__, j) => {
          const x = x0 + (w / 3) * i
          const z = z0 + (d / 1) * j
          return (
            <Box
              key={`pp-${i}-${j}`}
              position={[x, y + 1.4, z]}
              size={[0.35, 2.6, 0.35]}
              color={pal.concreteDeep}
              roughness={0.8}
            />
          )
        }),
      )}
      {Array.from({ length: 6 }).map((_, i) => (
        <Box
          key={`line-${i}`}
          position={[x0 + 1.5 + i * (w - 3) / 5, y + 0.21, z0 + d / 2]}
          size={[0.05, 0.005, d * 0.7]}
          color="#fef3c7"
          roughness={0.6}
        />
      ))}
    </group>
  )
}

/* ─────────────────────── СТРОИТЕЛЬНЫЙ ЗАБОР ────────────────────────────── */

function SiteFence({
  x0, z0, w, d, pal,
}: { x0: number; z0: number; w: number; d: number; pal: ScenePalette }) {
  // Поставим забор чуть с отступом от объекта
  const inset = -0.6
  const X0 = x0 - 0.6
  const Z0 = z0 - 0.6
  const W  = w + 1.2
  const D  = d + 1.2
  const postH = 1.9
  const postW = 0.08
  const pitch = 2.4   // шаг между столбами

  const horizontal = (axis: 'x' | 'z', start: number, end: number, fixed: number) => {
    const count = Math.max(2, Math.floor((end - start) / pitch) + 1)
    return Array.from({ length: count }).map((_, i) => {
      const t = start + (end - start) * (i / (count - 1))
      const pos: [number, number, number] = axis === 'x' ? [t, postH / 2, fixed] : [fixed, postH / 2, t]
      return (
        <Box
          key={`post-${axis}-${start}-${i}`}
          position={pos}
          size={[postW, postH, postW]}
          color={pal.fence}
          roughness={0.6}
        />
      )
    })
  }
  const meshPanel = (axis: 'x' | 'z', start: number, end: number, fixed: number) => {
    const len = end - start
    const center: [number, number, number] = axis === 'x'
      ? [(start + end) / 2, postH * 0.55, fixed]
      : [fixed, postH * 0.55, (start + end) / 2]
    const size: [number, number, number] = axis === 'x'
      ? [len, postH * 0.85, 0.02]
      : [0.02, postH * 0.85, len]
    return (
      <mesh position={center}>
        <boxGeometry args={size} />
        <meshStandardMaterial
          color={pal.fenceMesh}
          transparent
          opacity={0.25}
          roughness={0.7}
          metalness={0.1}
          depthWrite={false}
        />
      </mesh>
    )
  }
  // Suppress unused-var warning while keeping helper available
  void inset

  return (
    <group>
      {/* Передняя/задняя стороны */}
      {horizontal('x', X0, X0 + W, Z0)}
      {horizontal('x', X0, X0 + W, Z0 + D)}
      {/* Левая/правая стороны */}
      {horizontal('z', Z0, Z0 + D, X0)}
      {horizontal('z', Z0, Z0 + D, X0 + W)}
      {/* Сетчатые панели между столбами (полупрозрачные) */}
      {meshPanel('x', X0, X0 + W, Z0)}
      {meshPanel('x', X0, X0 + W, Z0 + D)}
      {meshPanel('z', Z0, Z0 + D, X0)}
      {meshPanel('z', Z0, Z0 + D, X0 + W)}
    </group>
  )
}

/* ─────────────────────── БАШЕННЫЙ КРАН ─────────────────────────────────── */

function ConstructionCrane({
  x, z, height, pal, jibTowardPos = true,
}: { x: number; z: number; height: number; pal: ScenePalette; jibTowardPos?: boolean }) {
  const baseW = 1.4
  const towerW = 1.0
  const segH = 4
  const segments = Math.max(2, Math.ceil(height / segH))
  return (
    <group position={[x, 0, z]}>
      {/* Бетонная база */}
      <Box position={[0, 0.5, 0]} size={[baseW * 1.6, 1, baseW * 1.6]} color={pal.concreteDeep} />

      {/* 4 вертикальных стойки решётчатой башни */}
      {[
        [-towerW / 2, -towerW / 2],
        [ towerW / 2, -towerW / 2],
        [-towerW / 2,  towerW / 2],
        [ towerW / 2,  towerW / 2],
      ].map(([px, pz], i) => (
        <Box
          key={`leg-${i}`}
          position={[px, height / 2 + 1, pz]}
          size={[0.12, height, 0.12]}
          color={pal.crane}
          metalness={0.4}
          roughness={0.5}
        />
      ))}

      {/* Поперечные кольца + X-связи */}
      {Array.from({ length: segments + 1 }).map((_, s) => {
        const y = 1 + (s * height) / segments
        return (
          <group key={`ring-${s}`}>
            <Box position={[0, y, -towerW / 2]} size={[towerW + 0.12, 0.1, 0.08]} color={pal.crane} metalness={0.4} roughness={0.5} />
            <Box position={[0, y,  towerW / 2]} size={[towerW + 0.12, 0.1, 0.08]} color={pal.crane} metalness={0.4} roughness={0.5} />
            <Box position={[-towerW / 2, y, 0]} size={[0.08, 0.1, towerW]} color={pal.crane} metalness={0.4} roughness={0.5} />
            <Box position={[ towerW / 2, y, 0]} size={[0.08, 0.1, towerW]} color={pal.crane} metalness={0.4} roughness={0.5} />
          </group>
        )
      })}

      {/* Кабина оператора */}
      <Box position={[0, height + 1.4, 0]} size={[1.2, 1.0, 1.4]} color={pal.crane} metalness={0.4} roughness={0.4} />
      <mesh position={[0, height + 1.4, 0.73]}>
        <boxGeometry args={[1.1, 0.7, 0.05]} />
        <meshStandardMaterial
          color={pal.glassDeep}
          emissive={pal.glassEmiss}
          emissiveIntensity={0.5}
          metalness={0.55}
          roughness={0.2}
          transparent
          opacity={0.8}
          depthWrite={false}
        />
      </mesh>

      {/* Стрела (jib) — длинная горизонтальная балка */}
      <group position={[0, height + 2.4, 0]}>
        <Box
          position={[(jibTowardPos ? 1 : -1) * 9, 0, 0]}
          size={[18, 0.18, 0.4]}
          color={pal.crane}
          metalness={0.4}
          roughness={0.5}
        />
        {/* Решётка нижнего пояса стрелы */}
        {Array.from({ length: 9 }).map((_, i) => {
          const x = (jibTowardPos ? 1 : -1) * (1 + i * 2)
          return (
            <Box key={`jib-${i}`} position={[x, -0.5, 0]} size={[0.06, 0.6, 0.4]} color={pal.crane} metalness={0.4} roughness={0.5} />
          )
        })}
        {/* Контр-стрела с противовесом */}
        <Box position={[(jibTowardPos ? -1 : 1) * 3.5, 0, 0]} size={[6, 0.18, 0.4]} color={pal.crane} metalness={0.4} roughness={0.5} />
        <Box position={[(jibTowardPos ? -1 : 1) * 6.5, -0.4, 0]} size={[1.4, 0.9, 1.0]} color={pal.concreteDeep} />

        {/* Трос + крюк */}
        <mesh position={[(jibTowardPos ? 1 : -1) * 11, -2.5, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 5, 6]} />
          <meshStandardMaterial color={pal.mullion} />
        </mesh>
        <Box position={[(jibTowardPos ? 1 : -1) * 11, -5.2, 0]} size={[0.3, 0.3, 0.3]} color={pal.mullion} metalness={0.5} roughness={0.4} />
      </group>
    </group>
  )
}

/* ─────────────────────── БЫТОВКА-ОФИС ──────────────────────────────────── */

function SiteTrailer({
  x, z, pal,
}: { x: number; z: number; pal: ScenePalette }) {
  return (
    <group position={[x, 0, z]}>
      {/* Корпус контейнера */}
      <Box position={[0, 1.3, 0]} size={[6, 2.6, 2.5]} color={pal.trailer} roughness={0.6} />
      {/* Крыша */}
      <Box position={[0, 2.7, 0]} size={[6.1, 0.1, 2.6]} color={pal.trailerRoof} roughness={0.5} />
      {/* Дверь */}
      <Box position={[1.2, 1.0, 1.26]} size={[0.9, 2.0, 0.05]} color={pal.mullion} />
      <Box position={[1.55, 1.0, 1.29]} size={[0.06, 0.06, 0.08]} color="#fef3c7" />
      {/* Окна */}
      {[-1.8, -0.4, 1.0, 2.0].map((wx, i) => (
        <mesh key={`tw-${i}`} position={[wx, 1.8, 1.28]}>
          <boxGeometry args={[0.6, 0.6, 0.04]} />
          <meshStandardMaterial
            color={pal.glass}
            emissive={pal.glassEmiss}
            emissiveIntensity={0.4}
            metalness={0.5}
            roughness={0.2}
            transparent
            opacity={0.8}
            depthWrite={false}
          />
        </mesh>
      ))}
      {/* Опоры (контейнер слегка поднят) */}
      {[[-2.7, -1.1], [2.7, -1.1], [-2.7, 1.1], [2.7, 1.1]].map(([cx, cz], i) => (
        <Box key={`leg-${i}`} position={[cx, 0.15, cz]} size={[0.25, 0.3, 0.25]} color={pal.concreteDeep} />
      ))}
    </group>
  )
}

/* ─────────────────────── ЗЕМЛЯ / ТРОТУАРЫ / ДОРОГА ─────────────────────── */

function GroundPad({ isDark, pal }: { isDark: boolean; pal: ScenePalette }) {
  return (
    <group>
      {/* Газонная подложка */}
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 60]} />
        <meshStandardMaterial color={isDark ? '#0c1722' : '#a7b9a3'} roughness={1} metalness={0} />
      </mesh>
      {/* Внутренняя асфальтовая площадка */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[28, 18]} />
        <meshStandardMaterial color={pal.asphalt} roughness={0.95} />
      </mesh>
      {/* Тротуар по передней стороне */}
      <mesh position={[0, 0.025, 7.6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[28, 2.4]} />
        <meshStandardMaterial color={pal.sidewalk} roughness={0.9} />
      </mesh>
      {/* Пешеходная дорожка между БС-1 и БС-2 */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.4, 12]} />
        <meshStandardMaterial color={pal.sidewalk} roughness={0.9} />
      </mesh>
      {/* Жёлтая разметка вдоль дороги */}
      {[-9, -3, 3, 9].map((zPos, i) => (
        <mesh key={`mark-${i}`} position={[0, 0.04, zPos]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.2, 2]} />
          <meshStandardMaterial color="#fbbf24" roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

/* ─────────────────────── ОСВЕЩЕНИЕ ─────────────────────────────────────── */

export function SceneLights({ isDark }: { isDark: boolean }) {
  return (
    <>
      <ambientLight intensity={isDark ? 0.55 : 1.0} />
      <directionalLight
        position={[28, 42, 22]}
        intensity={isDark ? 1.1 : 1.45}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-35}
        shadow-camera-right={35}
        shadow-camera-top={45}
        shadow-camera-bottom={-15}
        shadow-camera-far={120}
      />
      <directionalLight position={[-18, 14, -10]} intensity={isDark ? 0.32 : 0.45} />
      <hemisphereLight args={[isDark ? 0x2a3a52 : 0xddebf7, isDark ? 0x0a1018 : 0x6b7280, 0.5]} />
    </>
  )
}

/* ─────────────────────── ГРУППА «ЗДАНИЕ» ───────────────────────────────── */

interface BuildingGroupProps {
  ids: {
    piles:      string
    footing:    string
    floorsLow:  string
    floorsHigh: string
    core?:      string
  }
  footprint: { x0: number; z0: number; w: number; d: number }
  pal: ScenePalette
  selectedId: string | null
  hoverId:    string | null
  onClick: (id: string) => void
  onHover: (id: string | null) => void
  progressByElement: Record<string, number>
}

function BuildingGroup({
  ids, footprint, pal, selectedId, hoverId, onClick, onHover, progressByElement,
}: BuildingGroupProps) {
  const { x0, z0, w, d } = footprint

  const pilesP = progressByElement[ids.piles]      ?? 0
  const footP  = progressByElement[ids.footing]    ?? 0
  const lowP   = progressByElement[ids.floorsLow]  ?? 0
  const highP  = progressByElement[ids.floorsHigh] ?? 0
  const coreP  = ids.core ? (progressByElement[ids.core] ?? 0) : 0
  void coreP

  // Считаем сколько этажей построено
  const lowBuiltRaw  = Math.max(0, Math.min(LOW_FLOORS,  Math.ceil(lowP  * LOW_FLOORS)))
  const highBuiltRaw = Math.max(0, Math.min(HIGH_FLOORS, Math.ceil(highP * HIGH_FLOORS)))
  const lowLastRaw   = lowP  > 0 && lowP  < 1
  const highLastRaw  = highP > 0 && highP < 1

  // ВАЖНО: верхний стек физически не может стоять без нижнего.
  // Если нижние этажи ещё не достроены до конца — не показываем «парящие»
  // верхние этажи; они появятся после фактического завершения низа.
  const lowFullyDone = lowBuiltRaw >= LOW_FLOORS && !lowLastRaw
  const lowBuilt  = lowBuiltRaw
  const lowLast   = lowLastRaw
  const highBuilt = lowFullyDone ? highBuiltRaw : 0
  const highLast  = lowFullyDone ? highLastRaw  : false

  // Y координаты этажей
  const plinthY0  = Y_GROUND + 0.6                       // верх ростверка
  const lowY0     = plinthY0 + PLINTH_HEIGHT             // первый типовой этаж начинается после цоколя
  const highY0    = lowY0 + LOW_FLOORS * FLOOR_HEIGHT
  const buildingTop = highY0 + HIGH_FLOORS * FLOOR_HEIGHT

  // Текущая «реальная» высота построенных плит (для slipform-логики ядра)
  const floorsTopY = (() => {
    if (highBuilt > 0) {
      return highY0 + (highLast ? (highBuilt - 1) : highBuilt) * FLOOR_HEIGHT
    }
    if (lowBuilt > 0) {
      // Цоколь считаем построенным когда хотя бы 1 этаж нижнего стека есть
      return lowY0 + (lowLast ? (lowBuilt - 1) : lowBuilt) * FLOOR_HEIGHT
    }
    if (footP > 0) return plinthY0
    return Y_GROUND
  })()

  // ── Если ничего не начато → стройплощадка-заглушка ───────────────────────
  const buildingNotStarted = pilesP <= 0 && footP <= 0 && lowP <= 0 && highP <= 0
  if (buildingNotStarted) {
    return (
      <group>
        <SiteFence x0={x0} z0={z0} w={w} d={d} pal={pal} />
        <FootprintMarker x0={x0} z0={z0} w={w} d={d} pal={pal} />
      </group>
    )
  }

  return (
    <group>
      {/* Забор стройплощадки (всегда вокруг активной стройки) */}
      <SiteFence x0={x0} z0={z0} w={w} d={d} pal={pal} />

      {/* Котлован — если ростверк ещё не залит */}
      {footP <= 0 && pilesP > 0 && (
        <FoundationPit x0={x0 + 0.2} z0={z0 + 0.2} w={w - 0.4} d={d - 0.4} depth={2.0} pal={pal} />
      )}

      {/* Сваи */}
      <Pickable elementId={ids.piles} onClick={onClick} onHover={onHover}>
        <Piles
          x0={x0 + 0.7} z0={z0 + 0.7} w={w - 1.4} d={d - 1.4}
          progress={pilesP} pal={pal}
          selected={selectedId === ids.piles}
          hovered={hoverId === ids.piles}
        />
      </Pickable>

      {/* Ростверк */}
      <Pickable elementId={ids.footing} onClick={onClick} onHover={onHover}>
        <FootingSlab
          x0={x0} z0={z0} w={w} d={d}
          progress={footP} pal={pal}
          selected={selectedId === ids.footing}
          hovered={hoverId === ids.footing}
        />
      </Pickable>

      {/* Цоколь — появляется когда хотя бы 1 этаж нижнего стека начат */}
      {lowP > 0 && (
        <Pickable elementId={ids.floorsLow} onClick={onClick} onHover={onHover}>
          <Plinth
            origin={[x0, plinthY0, z0]}
            width={w}
            depth={d}
            pal={pal}
            edge={selectedId === ids.floorsLow ? pal.highlight : hoverId === ids.floorsLow ? '#a3e635' : undefined}
          />
        </Pickable>
      )}

      {/* Перекрытия 1-6 (типовые этажи поверх цоколя) */}
      <Pickable elementId={ids.floorsLow} onClick={onClick} onHover={onHover}>
        {Array.from({ length: lowBuilt }).map((_, i) => {
          const last = i === lowBuilt - 1 && lowLast
          return (
            <Storey
              key={`low-${i}`}
              origin={[x0, lowY0 + i * FLOOR_HEIGHT, z0]}
              width={w} depth={d} height={FLOOR_HEIGHT}
              pal={pal}
              edge={selectedId === ids.floorsLow ? pal.highlight : hoverId === ids.floorsLow ? '#a3e635' : undefined}
              underConstruction={last}
              withBalconies
            />
          )
        })}
      </Pickable>

      {/* Перекрытия 7-12 */}
      <Pickable elementId={ids.floorsHigh} onClick={onClick} onHover={onHover}>
        {Array.from({ length: highBuilt }).map((_, i) => {
          const last = i === highBuilt - 1 && highLast
          return (
            <Storey
              key={`high-${i}`}
              origin={[x0, highY0 + i * FLOOR_HEIGHT, z0]}
              width={w} depth={d} height={FLOOR_HEIGHT}
              pal={pal}
              edge={selectedId === ids.floorsHigh ? pal.highlight : hoverId === ids.floorsHigh ? '#a3e635' : undefined}
              underConstruction={last}
              withBalconies
            />
          )
        })}
      </Pickable>

      {/* Кровля — когда верхний стек полностью построен */}
      {highP >= 1 && (
        <RoofCrown
          origin={[x0, buildingTop, z0]}
          width={w}
          depth={d}
          pal={pal}
        />
      )}

      {/* Ядро */}
      {ids.core && lowP > 0 && (
        <Pickable elementId={ids.core} onClick={onClick} onHover={onHover}>
          <CoreShaft
            x0={x0 + w / 2 - 1.0}
            z0={z0 + d / 2 - 1.4}
            w={2.0}
            d={2.8}
            yBase={plinthY0}
            yTop={buildingTop}
            pal={pal}
            selected={selectedId === ids.core}
            hovered={hoverId === ids.core}
            floorsTopY={floorsTopY}
          />
        </Pickable>
      )}
    </group>
  )
}

/* ─────────────────────── ТОП-УРОВЕНЬ СЦЕНЫ ─────────────────────────────── */

export interface ConstructionSceneProps {
  isDark: boolean
  elements: BimElement[]
  taskById: Record<string, ScheduleTask>
  currentDate: Date | null
  hoverId:     string | null
  selectedId:  string | null
  onClick:     (id: string) => void
  onHover:     (id: string | null) => void
}

export function ConstructionScene({
  isDark, elements, taskById, currentDate,
  hoverId, selectedId, onClick, onHover,
}: ConstructionSceneProps) {
  const pal = useMemo(() => makePalette(isDark), [isDark])

  const progressByElement = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    if (!currentDate) return map
    for (const el of elements) {
      map[el.id] = planProgress(taskById[el.taskId], currentDate)
    }
    return map
  }, [elements, taskById, currentDate])

  // Сопоставление id ↔ строение (по mock-данным)
  const bs1 = {
    ids: {
      piles:      'el-002',
      footing:    'el-001',
      floorsLow:  'el-003',
      floorsHigh: 'el-005',
      core:       'el-004',
    },
    footprint: { x0: -8, z0: -4, w: 7, d: 8 },
  }
  const bs2 = {
    ids: {
      piles:      'el-007',
      footing:    'el-006',
      floorsLow:  'el-008',
      floorsHigh: 'el-009',
    },
    footprint: { x0: 1, z0: -4, w: 7, d: 8 },
  }
  const parkingId = 'el-010'

  // Решаем, активно ли БС-1 / БС-2 (для крана/бытовки)
  const bs1Active = (progressByElement[bs1.ids.floorsLow] ?? 0) > 0 && (progressByElement[bs1.ids.floorsHigh] ?? 0) < 1
  const bs2Active = (progressByElement[bs2.ids.piles] ?? 0) > 0
                  && (progressByElement[bs2.ids.floorsHigh] ?? 0) < 1
  const anyActive = bs1Active || bs2Active

  return (
    <group>
      {/* Небо */}
      <Sky distance={450000} sunPosition={[40, 25, 20]} inclination={0.49} azimuth={0.25} mieCoefficient={0.005} mieDirectionalG={0.8} rayleigh={isDark ? 0.5 : 1.2} turbidity={isDark ? 6 : 8} />

      <SceneLights isDark={isDark} />
      <GroundPad isDark={isDark} pal={pal} />

      {/* Подземный паркинг */}
      <Pickable elementId={parkingId} onClick={onClick} onHover={onHover}>
        <ParkingSlab
          x0={-8} z0={-4} w={16} d={8} y={-3.2}
          pal={pal}
          selected={selectedId === parkingId}
          hovered={hoverId === parkingId}
          progress={progressByElement[parkingId] ?? 0}
        />
      </Pickable>

      {/* Здания */}
      <BuildingGroup
        ids={bs1.ids}
        footprint={bs1.footprint}
        pal={pal}
        selectedId={selectedId}
        hoverId={hoverId}
        onClick={onClick}
        onHover={onHover}
        progressByElement={progressByElement}
      />
      <BuildingGroup
        ids={bs2.ids}
        footprint={bs2.footprint}
        pal={pal}
        selectedId={selectedId}
        hoverId={hoverId}
        onClick={onClick}
        onHover={onHover}
        progressByElement={progressByElement}
      />

      {/* Башенный кран рядом с активным зданием */}
      {bs1Active && (
        <ConstructionCrane x={-10.5} z={4.5} height={28} pal={pal} jibTowardPos />
      )}
      {bs2Active && !bs1Active && (
        <ConstructionCrane x={10.5} z={4.5} height={28} pal={pal} jibTowardPos={false} />
      )}

      {/* Бытовка-офис */}
      {anyActive && (
        <SiteTrailer x={-3} z={7.5} pal={pal} />
      )}
    </group>
  )
}

/* ─────────────────────── ЭКСПОРТЫ ──────────────────────────────────────── */

export function computeElementsState(
  elements: BimElement[],
  taskById: Record<string, ScheduleTask>,
  currentDate: Date | null,
): Record<string, ElementState> {
  const map: Record<string, ElementState> = {}
  if (!currentDate) return map
  for (const el of elements) {
    const p = planProgress(taskById[el.taskId], currentDate)
    map[el.id] = stateFromProgress(p)
  }
  return map
}

export { DAY_MS }

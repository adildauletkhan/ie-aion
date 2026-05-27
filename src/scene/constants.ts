// ─── NPS Scene Constants (1 THREE unit = 10 m) ─────────────────────────────

export const SCALE = 10          // meters per unit
export const GRID  = 0.2         // grid cell = 2 m / SCALE

// ─── Tank dimensions (РВС-20000) ────────────────────────────────────────────
export const TANK_R  = 2.28      // radius  22.8 m
export const TANK_H  = 1.79      // height  17.9 m
export const TANK_BASE_Y = 0     // bottom on ground

// ─── Tank positions (center-to-center 7.6 u = 76 m, gap 30.4 m > 30 m min) ─
export const TANK_POSITIONS: [number, number, number][] = [
  [-15.8, TANK_H / 2, -3.8],    // РВС-1  NW
  [-8.2,  TANK_H / 2, -3.8],    // РВС-2  NE
  [-15.8, TANK_H / 2,  3.8],    // РВС-3  SW
  [-8.2,  TANK_H / 2,  3.8],    // РВС-4  SE
]
export const TANK_LABELS = ['РВС-1', 'РВС-2', 'РВС-3', 'РВС-4']
export const TANK_IDS    = ['RVS1', 'RVS2', 'RVS3', 'RVS4']

// Obvalovka (containment berm) around entire tank farm
export const OBVALOVKA_CENTER: [number, number, number] = [-12, 0, 0]
export const OBVALOVKA_W = 14    // inner half-width X
export const OBVALOVKA_D = 7     // inner half-depth Z
export const OBVALOVKA_WALL_W = 0.5
export const OBVALOVKA_WALL_H = 0.4

// ─── Building positions ──────────────────────────────────────────────────────
export const PODPOR_POS: [number, number, number]  = [-3,  0, 0]
export const FILTER_POS: [number, number, number]   = [ 1.5, 0, 0]
export const MANIFOLD_POS: [number, number, number] = [ 5.5, 0, 0]
export const MAIN_NS_POS: [number, number, number]  = [12,   0, 0]
export const SIKN_POS: [number, number, number]     = [18.5, 0, 0]
export const DRAIN_POS: [number, number, number]    = [-12,  0, 7.5]
export const CTRL_POS: [number, number, number]     = [ 6,   0,-7]

// ─── Building dimensions [W, H, D] ──────────────────────────────────────────
export const PODPOR_SIZE:  [number, number, number] = [2.5,  1.5, 3.5]
export const FILTER_SIZE:  [number, number, number] = [0.14, 0.45, 0.14]
export const MANIFOLD_SIZE:[number, number, number] = [4,    0.9,  5]
export const MAIN_NS_SIZE: [number, number, number] = [5,    2,    7]
export const SIKN_SIZE:    [number, number, number] = [2.5,  0.8,  4]
export const DRAIN_SIZE:   [number, number, number] = [3,    1,    2.5]
export const CTRL_SIZE:    [number, number, number] = [4,    1.5,  3]

// ─── Pump aggreage (capsule shape) ──────────────────────────────────────────
export const PUMP_R = 0.22
export const PUMP_H = 1.0

// ─── Pipeline ────────────────────────────────────────────────────────────────
export const PIPE_H       = 0.35    // centerline Y above ground
export const PIPE_H2      = 0.55    // secondary level
export const PIPE_R_MAIN  = 0.082   // Ø820 mm
export const PIPE_R_PROC  = 0.05    // Ø500 mm process line
export const PIPE_R_DRAIN = 0.018   // Ø180 mm drain

// ─── Pipeline colours by medium ──────────────────────────────────────────────
export const PIPE_COLOR = {
  inlet:    '#3B82F6',   // МТ приёмки  (blue)
  feed:     '#60A5FA',   // РВС → ПНС   (sky-blue)
  filter:   '#10B981',   // ПНС → ФС    (green)
  suction:  '#F59E0B',   // ФС → МНС    (yellow/amber)
  discharge:'#EF4444',   // МНС → МТ    (red)
  drain:    '#6B7280',   // дренаж       (gray)
} as const

// ─── Materials (roughness / metalness) ──────────────────────────────────────
export const MAT_TANK   = { color: '#64748b', roughness: 0.8, metalness: 0.6 }
export const MAT_STEEL  = { color: '#475569', roughness: 0.6, metalness: 0.7 }
export const MAT_CONCRETE={ color:'#94a3b8', roughness: 0.9, metalness: 0.0 }
export const MAT_BUILDING={ color:'#1e3a5f', roughness: 0.7, metalness: 0.2 }

// ─── Selection / hover ───────────────────────────────────────────────────────
export const COLOR_SELECTED = '#FBBF24'
export const COLOR_HOVER    = '#93C5FD'
export const EMISSIVE_SELECTED = 0.35
export const EMISSIVE_HOVER    = 0.15

// ─── Camera (perspective: tuned to frame the entire NPS by default) ────────
export const CAM_POSITION: [number, number, number] = [28, 22, 32]
export const CAM_FOV       = 45
export const CAM_NEAR      = 0.1
export const CAM_FAR       = 500
export const CAM_TARGET: [number, number, number] = [2, 0, 0]
// Ortho fallback values (kept for reference / VR tools)
export const CAM_ZOOM_DEFAULT = 18
export const CAM_ZOOM_MIN     = 8
export const CAM_ZOOM_MAX     = 60

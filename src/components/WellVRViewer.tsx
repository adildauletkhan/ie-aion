/**
 * WellVRViewer — realistic 3D well scheme with post-processing,
 * shadows, depth ruler, click-to-inspect, dynagram overlay,
 * SPO animation, depth slider, live telemetry, split-screen compare.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import {
  X, Gauge, Thermometer, Droplets, Activity, Zap,
  RotateCcw, ZoomIn, ZoomOut, ChevronDown, ChevronUp, Layers,
  MousePointer, Ruler, Play, Pause, SplitSquareHorizontal, BarChart3,
} from "lucide-react";
import type { WellPumpType } from "./WellEquipment3DViewer";

// ─────────────────────────── Config ──────────────────────────────────────────
interface Props { wellName: string; pumpType: WellPumpType; onClose: () => void; }

const PUMP_LABEL: Record<WellPumpType, string> = { sgn: "ШГН", ecn: "ЭЦН", evn: "ЭВН" };

const PC = {
  sgn: { body: 0x22c55e, emissive: 0x15803d, glow: 0x86efac },
  ecn: { body: 0x3b82f6, emissive: 0x1d4ed8, glow: 0x93c5fd },
  evn: { body: 0xa855f7, emissive: 0x7c3aed, glow: 0xd8b4fe },
};

const M = (m: number) => m / 28;
const R = (mm: number) => mm / 500;

type LithoType = "loam" | "sandstone" | "clay" | "argillite" | "limestone" | "oil" | "reservoir" | "base";

const FORMATIONS: {
  y0: number; y1: number; hex: number; name: string; depth: string; litho: LithoType;
}[] = [
  { y0: M(0),   y1: M(80),   hex: 0xd4a76a, name: "Суглинок",    depth: "0–80 м",      litho: "loam" },
  { y0: M(80),  y1: M(220),  hex: 0xca8a04, name: "Песчаник",     depth: "80–220 м",    litho: "sandstone" },
  { y0: M(220), y1: M(400),  hex: 0xa16207, name: "Глины",        depth: "220–400 м",   litho: "clay" },
  { y0: M(400), y1: M(590),  hex: 0x92400e, name: "Аргиллиты",    depth: "400–590 м",   litho: "argillite" },
  { y0: M(590), y1: M(730),  hex: 0x6b7280, name: "Известняки",   depth: "590–730 м",   litho: "limestone" },
  { y0: M(730), y1: M(830),  hex: 0x7c2d12, name: "Нефт. пласт",  depth: "730–830 м",   litho: "oil" },
  { y0: M(830), y1: M(910),  hex: 0xb45309, name: "Пласт Т1-А",   depth: "830–910 м",   litho: "reservoir" },
  { y0: M(910), y1: M(1400), hex: 0x374151, name: "Подошва",      depth: "910–1400 м",  litho: "base" },
];

function makeLithologyTexture(litho: LithoType, bgHex: number, sz = 128): THREE.CanvasTexture {
  const cv = document.createElement("canvas");
  cv.width = sz; cv.height = sz;
  const ctx = cv.getContext("2d")!;
  const bg = "#" + bgHex.toString(16).padStart(6, "0");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, sz, sz);

  ctx.lineWidth = 1.2;
  const dk = "rgba(0,0,0,0.30)";
  const lt = "rgba(255,255,255,0.18)";

  switch (litho) {
    case "loam": {
      ctx.fillStyle = dk;
      for (let i = 0; i < 80; i++) {
        const x = Math.random() * sz, y = Math.random() * sz;
        ctx.beginPath(); ctx.arc(x, y, 1.2 + Math.random(), 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = dk;
      for (let i = 0; i < 12; i++) {
        const x = Math.random() * sz, y = Math.random() * sz;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 6 + Math.random() * 6, y); ctx.stroke();
      }
      break;
    }
    case "sandstone": {
      ctx.fillStyle = dk;
      const sp = 10;
      for (let row = 0; row < sz / sp; row++) {
        const off = (row % 2) * (sp / 2);
        for (let col = 0; col < sz / sp; col++) {
          ctx.beginPath(); ctx.arc(off + col * sp, row * sp, 1.5, 0, Math.PI * 2); ctx.fill();
        }
      }
      break;
    }
    case "clay": {
      ctx.strokeStyle = dk;
      for (let row = 0; row < sz / 10; row++) {
        const y = row * 10 + 5;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(sz, y); ctx.stroke();
        const off = (row % 2) * 10;
        for (let col = 0; col < sz / 20; col++) {
          ctx.beginPath();
          ctx.moveTo(off + col * 20, y);
          ctx.lineTo(off + col * 20 + 5, y - 5);
          ctx.stroke();
        }
      }
      break;
    }
    case "argillite": {
      ctx.strokeStyle = dk;
      for (let row = 0; row < sz / 8; row++) {
        const y = row * 8 + 4;
        const off = (row % 2) * 12;
        for (let col = -1; col < sz / 24 + 1; col++) {
          const x0 = off + col * 24;
          ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + 14, y); ctx.stroke();
        }
      }
      ctx.fillStyle = dk;
      for (let i = 0; i < 18; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * sz, Math.random() * sz, 1.0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "limestone": {
      ctx.strokeStyle = dk;
      for (let row = 0; row < sz / 14; row++) {
        const y = row * 14 + 7;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(sz, y); ctx.stroke();
        const off = (row % 2) * 14;
        for (let col = 0; col < sz / 28 + 1; col++) {
          const x = off + col * 28;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 7, y - 7); ctx.lineTo(x + 14, y); ctx.stroke();
        }
      }
      break;
    }
    case "oil": {
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      for (let i = 0; i < 30; i++) {
        const x = Math.random() * sz, y = Math.random() * sz;
        const rx = 3 + Math.random() * 5, ry = 1.5 + Math.random() * 2;
        ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = "rgba(255,200,0,0.20)";
      for (let i = 0; i < 10; i++) {
        const x = Math.random() * sz, y = Math.random() * sz;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 10, y); ctx.stroke();
      }
      break;
    }
    case "reservoir": {
      ctx.fillStyle = dk;
      const sp2 = 8;
      for (let row = 0; row < sz / sp2; row++) {
        const off = (row % 2) * (sp2 / 2);
        for (let col = 0; col < sz / sp2; col++) {
          ctx.beginPath(); ctx.arc(off + col * sp2, row * sp2, 1.2, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.strokeStyle = "rgba(255,140,0,0.25)";
      ctx.setLineDash([4, 6]);
      for (let row = 0; row < sz / 14; row++) {
        const y = row * 14 + 7;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(sz, y); ctx.stroke();
      }
      ctx.setLineDash([]);
      break;
    }
    case "base": {
      ctx.strokeStyle = lt;
      ctx.lineWidth = 0.8;
      for (let i = -sz; i < sz * 2; i += 8) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + sz, sz); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(i + sz, 0); ctx.lineTo(i, sz); ctx.stroke();
      }
      break;
    }
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

const TELEMETRY: Record<WellPumpType,
  { label: string; value: string; unit: string; icon: React.ElementType; color: string }[]> = {
  sgn: [
    { label: "Дебит жидкости", value: "42.3", unit: "м³/сут", icon: Droplets,    color: "#22d3ee" },
    { label: "Обводнённость",  value: "74",   unit: "%",       icon: Activity,    color: "#f59e0b" },
    { label: "Нагрузка макс",  value: "68.4", unit: "кН",      icon: Gauge,       color: "#a78bfa" },
    { label: "Число качаний",  value: "5.2",  unit: "кач/мин", icon: Zap,         color: "#34d399" },
    { label: "УДЖ",            value: "312",  unit: "м",       icon: ChevronDown, color: "#60a5fa" },
    { label: "Наработка",      value: "187",  unit: "сут",     icon: Activity,    color: "#f87171" },
  ],
  ecn: [
    { label: "Дебит жидкости", value: "78.5", unit: "м³/сут", icon: Droplets,    color: "#22d3ee" },
    { label: "Ток ПЭД",        value: "32.4", unit: "А",       icon: Zap,         color: "#a78bfa" },
    { label: "Темп. двиг.",    value: "84",   unit: "°C",      icon: Thermometer, color: "#f87171" },
    { label: "Давл. приёма",   value: "6.4",  unit: "МПа",     icon: Gauge,       color: "#34d399" },
    { label: "Напряжение",     value: "1124", unit: "В",       icon: Activity,    color: "#f59e0b" },
    { label: "Наработка",      value: "94",   unit: "сут",     icon: Activity,    color: "#60a5fa" },
  ],
  evn: [
    { label: "Дебит жидкости", value: "55.0", unit: "м³/сут", icon: Droplets,    color: "#22d3ee" },
    { label: "Ток ПЭД",        value: "28.6", unit: "А",       icon: Zap,         color: "#a78bfa" },
    { label: "Темп. двиг.",    value: "79",   unit: "°C",      icon: Thermometer, color: "#f87171" },
    { label: "Частота врщ.",   value: "2950", unit: "об/мин",  icon: Activity,    color: "#34d399" },
    { label: "Обводнённость",  value: "61",   unit: "%",       icon: Gauge,       color: "#f59e0b" },
    { label: "Наработка",      value: "112",  unit: "сут",     icon: Activity,    color: "#60a5fa" },
  ],
};

// ─────────────────────────── Clickable element metadata ──────────────────────
interface ClickInfo {
  label: string;
  data: { key: string; val: string }[];
  color: string;
}

const CLICK_DATA: Record<string, ClickInfo> = {
  conductor: {
    label: "Кондуктор Ø530",
    color: "#78909c",
    data: [
      { key: "Диаметр", val: "530 мм" },
      { key: "Глубина", val: "0–30 м" },
      { key: "Материал", val: "Сталь 09Г2С" },
      { key: "Цементаж", val: "полный" },
    ],
  },
  surfaceCasing: {
    label: "Техн. колонна Ø324",
    color: "#29b6f6",
    data: [
      { key: "Диаметр", val: "324 мм" },
      { key: "Глубина", val: "0–180 м" },
      { key: "Материал", val: "Сталь Д" },
      { key: "Цементаж", val: "полный" },
    ],
  },
  intermediateCasing: {
    label: "Пром. колонна Ø245",
    color: "#5c6bc0",
    data: [
      { key: "Диаметр", val: "245 мм" },
      { key: "Глубина", val: "0–520 м" },
      { key: "Материал", val: "Сталь Д" },
      { key: "Цементаж", val: "полный" },
    ],
  },
  productionCasing: {
    label: "Экспл. колонна Ø168",
    color: "#546e7a",
    data: [
      { key: "Диаметр", val: "168 мм" },
      { key: "Глубина", val: "0–975 м" },
      { key: "Материал", val: "Сталь Е" },
      { key: "Толщина стенки", val: "8.9 мм" },
    ],
  },
  tubing: {
    label: "НКТ Ø73",
    color: "#0097a7",
    data: [
      { key: "Диаметр", val: "73 мм" },
      { key: "Материал", val: "Сталь К" },
      { key: "Соединение", val: "ОТТМ" },
    ],
  },
  pumpSgn: {
    label: "Насос ШГН НВ1-44",
    color: "#22c55e",
    data: [
      { key: "Тип", val: "ШГН НВ1-44-18" },
      { key: "Глубина", val: "730–760 м" },
      { key: "Подача", val: "18 м³/сут" },
      { key: "Ход плунжера", val: "3.5 м" },
      { key: "Дата установки", val: "12.09.2025" },
    ],
  },
  pumpEcn: {
    label: "Насос ЭЦН 5-80",
    color: "#3b82f6",
    data: [
      { key: "Тип", val: "ЭЦНМ5-80-1500" },
      { key: "Глубина", val: "820–875 м" },
      { key: "Подача номин.", val: "80 м³/сут" },
      { key: "Напор", val: "1500 м" },
      { key: "Мощность ПЭД", val: "32 кВт" },
    ],
  },
  pumpEvn: {
    label: "Насос ЭВН",
    color: "#a855f7",
    data: [
      { key: "Тип", val: "ЭВН5-60" },
      { key: "Глубина", val: "800–852 м" },
      { key: "Подача", val: "60 м³/сут" },
      { key: "Мощность", val: "22 кВт" },
    ],
  },
  perforation: {
    label: "Перфорация (зона притока)",
    color: "#f59e0b",
    data: [
      { key: "Интервал", val: "830–905 м" },
      { key: "Тип", val: "Кумулятивная ПКО-89" },
      { key: "Плотность", val: "20 отв/м" },
      { key: "Диаметр отв.", val: "12 мм" },
    ],
  },
  fluidLevel: {
    label: "УДЖ (динамич. уровень)",
    color: "#38bdf8",
    data: [
      { key: "Глубина", val: "270 м" },
      { key: "Статический", val: "185 м" },
      { key: "Метод замера", val: "Эхометрия" },
    ],
  },
  wellhead: {
    label: "Фонтанная арматура АФК",
    color: "#4dd0e1",
    data: [
      { key: "Тип", val: "АФК 65-21" },
      { key: "Рабочее давл.", val: "21 МПа" },
      { key: "Проходной Ø", val: "65 мм" },
    ],
  },
  cement: {
    label: "Цементное кольцо",
    color: "#4a6741",
    data: [
      { key: "Глубина", val: "0–975 м" },
      { key: "Тип цемента", val: "ПЦТ-I-50" },
      { key: "Интервал", val: "полный ствол" },
    ],
  },
};

// Dynagram mock data for overlay
const DYN_UP = [
  [0,16],[0.22,16.1],[0.38,16.9],[0.48,26.5],[0.56,44],[0.64,58],
  [0.72,63.5],[0.92,64.8],[1.4,65.5],[2.0,66],[2.6,66.5],[3.1,67.2],[3.42,67.8],[3.6,68],
];
const DYN_DN = [
  [3.6,68],[3.55,66.8],[3.49,56],[3.43,34.5],[3.37,20.5],[3.28,17.8],
  [3.1,16.5],[2.8,16.2],[2.4,16],[1.8,16],[1.0,15.9],[0.4,15.8],[0,16],
];

// ─────────────────────────── Material helpers ────────────────────────────────
function mkMat(
  color: number, metalness = 0.7, roughness = 0.3,
  emissive?: number, emissiveInt = 0.25, cp?: THREE.Plane[],
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color, metalness, roughness, side: THREE.DoubleSide,
    ...(emissive !== undefined ? { emissive, emissiveIntensity: emissiveInt } : {}),
    ...(cp ? { clippingPlanes: cp } : {}),
  });
}

// ─────────────────────────── Geometry helpers ────────────────────────────────
function addTube(
  parent: THREE.Object3D,
  outerR: number, innerR: number, topY: number, botY: number,
  color: number, metalness = 0.8, roughness = 0.2, cp?: THREE.Plane[],
  tag?: string,
) {
  const h = Math.abs(topY - botY);
  const midY = (topY + botY) / 2;

  const outerMat = mkMat(color, metalness, roughness, undefined, 0, cp);
  const outerM = new THREE.Mesh(new THREE.CylinderGeometry(outerR, outerR, h, 40, 1, true), outerMat);
  outerM.position.y = midY;
  outerM.castShadow = true;
  outerM.receiveShadow = true;
  if (tag) outerM.userData.clickId = tag;
  parent.add(outerM);

  const innerMat = mkMat(color, metalness, roughness + 0.1, undefined, 0, cp);
  innerMat.transparent = true;
  innerMat.opacity = 0.18;
  innerMat.depthWrite = false;
  const innerM = new THREE.Mesh(new THREE.CylinderGeometry(innerR, innerR, h, 40, 1, true), innerMat);
  innerM.position.y = midY;
  innerM.renderOrder = 0;
  if (tag) innerM.userData.clickId = tag;
  parent.add(innerM);

  for (const [yPos, rx] of [[topY, -Math.PI / 2], [botY, Math.PI / 2]] as const) {
    const cap = new THREE.Mesh(new THREE.RingGeometry(innerR, outerR, 40), mkMat(color, metalness, roughness + 0.1, undefined, 0, cp));
    cap.rotation.x = rx;
    cap.position.y = yPos;
    parent.add(cap);
  }
}

function addCyl(
  parent: THREE.Object3D,
  r: number, topY: number, botY: number,
  color: number, metalness = 0.85, roughness = 0.15,
  emissive?: number, emissiveInt = 0.3, cp?: THREE.Plane[],
  tag?: string,
): THREE.Mesh {
  const h = Math.abs(topY - botY);
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, h, 32, 1),
    mkMat(color, metalness, roughness, emissive, emissiveInt, cp),
  );
  m.position.y = (topY + botY) / 2;
  m.castShadow = true;
  m.receiveShadow = true;
  if (tag) m.userData.clickId = tag;
  parent.add(m);
  return m;
}

function addBox(
  parent: THREE.Object3D,
  x: number, y: number, z: number,
  w: number, h: number, d: number,
  color: number, metalness = 0.7, roughness = 0.3,
  emissive?: number, emissiveInt = 0.2,
  tag?: string,
): THREE.Mesh {
  const mat = new THREE.MeshStandardMaterial({
    color, metalness, roughness, side: THREE.FrontSide,
    ...(emissive !== undefined ? { emissive, emissiveIntensity: emissiveInt } : {}),
  });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  if (tag) m.userData.clickId = tag;
  parent.add(m);
  return m;
}

// ─────────────────────────── Depth ruler sprite helper ───────────────────────
function makeDepthSprite(text: string, y: number, parent: THREE.Object3D) {
  const cv = document.createElement("canvas");
  cv.width = 128; cv.height = 32;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "rgba(0,240,255,0.55)";
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 120, 16);
  // Horizontal tick line
  ctx.strokeStyle = "rgba(0,240,255,0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(122, 16); ctx.lineTo(128, 16); ctx.stroke();

  const tex = new THREE.CanvasTexture(cv);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sp = new THREE.Sprite(mat);
  sp.position.set(R(350), y, 0);
  sp.scale.set(2.0, 0.5, 1);
  parent.add(sp);
}

// ─────────────────────────── Component ───────────────────────────────────────
export function WellVRViewer({ wellName, pumpType, onClose }: Props) {
  const mountRef   = useRef<HTMLDivElement>(null);
  const rafRef     = useRef<number>(0);
  const beamGrpRef = useRef<THREE.Group | null>(null);
  const glowRef    = useRef<THREE.Mesh | null>(null);
  const spinRef    = useRef<THREE.Mesh | null>(null);
  const pumpLtRef  = useRef<THREE.PointLight | null>(null);
  const ppRef      = useRef<Float32Array | null>(null);
  const pvRef      = useRef<Float32Array | null>(null);
  const ptRef      = useRef<THREE.Points | null>(null);
  const ipRef      = useRef<Float32Array | null>(null);
  const ivRef      = useRef<Float32Array | null>(null);
  const itRef      = useRef<THREE.Points | null>(null);
  const cpRef      = useRef<THREE.Plane | null>(null);
  const cutRef     = useRef(false);
  const rodRef     = useRef<THREE.Mesh | null>(null);
  const surfPRef   = useRef<Float32Array | null>(null);
  const surfPtRef  = useRef<THREE.Points | null>(null);
  const SURF_PARTS = 60;
  const fluidLvlRef = useRef<THREE.Mesh | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const sceneRef    = useRef<THREE.Scene | null>(null);
  const cameraRef   = useRef<THREE.PerspectiveCamera | null>(null);
  const raycaster   = useRef(new THREE.Raycaster());
  const spoTubingRef  = useRef<THREE.Object3D[]>([]);
  const spoProgressRef = useRef(0);

  const thetaR  = useRef(0.0);
  const phiR    = useRef(1.25);
  const radiusR = useRef(35);
  const targYR  = useRef(-18);
  const isDrag  = useRef(false);
  const lastXY  = useRef({ x: 0, y: 0 });

  const [showHud, setShowHud] = useState(true);
  const [cutOn,   setCutOn]   = useState(false);
  const [depthSlider, setDepthSlider] = useState(0);
  const [infoPopup, setInfoPopup] = useState<(ClickInfo & { x: number; y: number }) | null>(null);
  const [showDynagram, setShowDynagram] = useState(false);
  const [spoPlaying, setSpoPlaying] = useState(false);
  const spoPlayRef = useRef(false);
  const [compareMode, setCompareMode] = useState(false);
  const [comparePump, setComparePump] = useState<WellPumpType>(pumpType === "sgn" ? "ecn" : "sgn");
  const [liveTelemetry, setLiveTelemetry] = useState<typeof TELEMETRY[WellPumpType] | null>(null);

  const isSgn = pumpType === "sgn";
  const isEvn = pumpType === "evn";
  const pc    = PC[pumpType];
  const PARTS = 200;
  const IPARTS = 120;

  // ── Fetch live telemetry ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/master-data/wells/${encodeURIComponent(wellName)}/telemetry`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error("no telemetry");
        const data = await res.json();
        if (!cancelled && data?.rows) setLiveTelemetry(data.rows);
      } catch {
        // Fall back to static telemetry
      }
    })();
    return () => { cancelled = true; };
  }, [wellName]);

  // Sync SPO play ref
  useEffect(() => { spoPlayRef.current = spoPlaying; }, [spoPlaying]);

  // Depth slider → camera Y
  useEffect(() => {
    if (depthSlider !== 0) {
      targYR.current = -(depthSlider / 28);
    }
  }, [depthSlider]);

  // ── Build scene ─────────────────────────────────────────────────────────
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const W = el.clientWidth  || window.innerWidth;
    const H = el.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x0a0f1e);
    renderer.localClippingEnabled = true;
    renderer.sortObjects = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.domElement.style.pointerEvents = "none";
    // Shadows
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(54, W / H, 0.02, 400);
    cameraRef.current = camera;

    const cutPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 99);
    cpRef.current = cutPlane;
    const CP = [cutPlane];

    // ── Lighting with shadows ──────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xddeeff, 2.2));

    const sun = new THREE.DirectionalLight(0xfff8e8, 2.5);
    sun.position.set(12, 20, 18);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 80;
    sun.shadow.camera.left = -20;
    sun.shadow.camera.right = 20;
    sun.shadow.camera.top = 20;
    sun.shadow.camera.bottom = -20;
    sun.shadow.bias = -0.001;
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0x88aaff, 1.4);
    fill.position.set(-10, 5, 15);
    scene.add(fill);
    const back = new THREE.DirectionalLight(0x4488aa, 1.0);
    back.position.set(0, -8, -10);
    scene.add(back);
    const underground = new THREE.DirectionalLight(0x6699bb, 1.2);
    underground.position.set(2, -20, 8);
    scene.add(underground);
    const pumpLt = new THREE.PointLight(pc.glow, 14, 10);
    pumpLtRef.current = pumpLt;
    scene.add(pumpLt);

    // ── Environment map for PBR reflections ──────────────────────────
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x0a1a2e);
    const envLight1 = new THREE.DirectionalLight(0xffffff, 1);
    envLight1.position.set(1, 1, 1);
    envScene.add(envLight1);
    envScene.add(new THREE.AmbientLight(0x8899aa, 0.5));
    const envMap = pmremGenerator.fromScene(envScene).texture;
    scene.environment = envMap;
    pmremGenerator.dispose();

    // ════════════════════════════════════════════════════════════════════
    // GROUND & SURFACE PAD
    // ════════════════════════════════════════════════════════════════════
    {
      const gndMat = new THREE.MeshStandardMaterial({
        color: 0x1a2a1a, roughness: 0.95, metalness: 0.05,
        side: THREE.FrontSide, clippingPlanes: CP,
      });
      const gnd = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), gndMat);
      gnd.rotation.x = -Math.PI / 2;
      gnd.position.y = -0.01;
      gnd.receiveShadow = true;
      scene.add(gnd);

      const padMat = new THREE.MeshStandardMaterial({
        color: 0x3d5166, roughness: 0.85, metalness: 0.1,
        clippingPlanes: CP,
      });
      const pad = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.12, 7.0), padMat);
      pad.position.y = 0.06;
      pad.receiveShadow = true;
      pad.castShadow = true;
      scene.add(pad);
    }

    // ════════════════════════════════════════════════════════════════════
    // GEOLOGICAL FORMATIONS
    // ════════════════════════════════════════════════════════════════════
    const panelW   = 3.0;
    const gapHalf  = R(300);
    FORMATIONS.forEach(({ y0, y1, hex, litho }) => {
      const h   = y1 - y0;
      const mid = -(y0 + h / 2);
      const tex = makeLithologyTexture(litho, hex, 128);
      tex.repeat.set(Math.max(1, Math.round(panelW)), Math.max(1, Math.round(h / 0.8)));

      for (const side of [-1, 1]) {
        const mat = new THREE.MeshStandardMaterial({
          map: tex, color: 0xffffff, metalness: 0.0, roughness: 0.92,
          side: THREE.DoubleSide, clippingPlanes: CP,
        });
        const geo  = new THREE.PlaneGeometry(panelW, h);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(side * (gapHalf + panelW / 2), mid, -0.12);
        scene.add(mesh);
      }

      if (y0 > 0) {
        const lineMat = new THREE.MeshBasicMaterial({
          color: 0x000000, transparent: true, opacity: 0.30,
          side: THREE.DoubleSide, clippingPlanes: CP,
        });
        const lineGeo = new THREE.PlaneGeometry(panelW * 2 + gapHalf * 2, 0.012);
        const lineMesh = new THREE.Mesh(lineGeo, lineMat);
        lineMesh.position.set(0, -y0, -0.11);
        scene.add(lineMesh);
      }
    });

    // ════════════════════════════════════════════════════════════════════
    // DEPTH RULER — vertical scale alongside the well
    // ════════════════════════════════════════════════════════════════════
    {
      const rulerX = R(340);
      // Vertical line
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(rulerX, 0, 0),
        new THREE.Vector3(rulerX, -M(1400), 0),
      ]);
      const lineMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.2 });
      scene.add(new THREE.Line(lineGeo, lineMat));

      // Tick marks and labels
      for (let d = 0; d <= 1400; d += 100) {
        const y = -M(d);
        // Horizontal tick
        const tickGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(rulerX - 0.1, y, 0),
          new THREE.Vector3(rulerX + 0.1, y, 0),
        ]);
        scene.add(new THREE.Line(tickGeo, lineMat));
        makeDepthSprite(`${d} м`, y, scene);
      }
      // Minor ticks every 50m
      for (let d = 50; d <= 1400; d += 100) {
        const y = -M(d);
        const tickGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(rulerX - 0.05, y, 0),
          new THREE.Vector3(rulerX + 0.05, y, 0),
        ]);
        const minorMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.1 });
        scene.add(new THREE.Line(tickGeo, minorMat));
      }
    }

    // ════════════════════════════════════════════════════════════════════
    // UNDERGROUND WELL STRUCTURE
    // ════════════════════════════════════════════════════════════════════

    // Cement/grout annulus
    addTube(scene, R(295), R(268), 0.05, -M(975), 0x4a6741, 0.10, 0.90, CP, "cement");

    // Conductor Ø530 mm, 0–30 m
    addTube(scene, R(265), R(164), 0.04, -M(30), 0x78909c, 0.75, 0.25, CP, "conductor");
    addCyl(scene, R(278), -M(28), -M(33), 0x4dd0e1, 0.90, 0.10, 0x4dd0e1, 0.3, CP);

    // Surface casing Ø324 mm, 0–180 m
    addTube(scene, R(162), R(124), 0.03, -M(180), 0x29b6f6, 0.80, 0.20, CP, "surfaceCasing");
    addCyl(scene, R(170), -M(178), -M(183), 0x80deea, 0.90, 0.10, 0x80deea, 0.3, CP);

    // Intermediate casing Ø245 mm, 0–520 m
    addTube(scene, R(122), R(86),  0.02, -M(520), 0x5c6bc0, 0.82, 0.18, CP, "intermediateCasing");
    addCyl(scene, R(93),  -M(518), -M(523), 0x9fa8da, 0.90, 0.10, 0x9fa8da, 0.3, CP);

    // Production casing Ø168 mm, 0–975 m
    addTube(scene, R(84),  R(38),  0.01, -M(975), 0x546e7a, 0.85, 0.15, CP, "productionCasing");
    addCyl(scene, R(91),  -M(973), -M(978), 0xb0bec5, 0.90, 0.10, 0xb0bec5, 0.6, CP);

    // Centralizer bands
    for (let i = 0; i < 16; i++) {
      const yR = -M(50 + i * 55);
      addCyl(scene, R(88), yR - M(1.5), yR + M(1.5), 0xb0bec5, 0.30, 0.60, 0xcfd8dc, 0.3, CP);
    }

    // Dynamic fluid level indicator (270 m)
    {
      const fl = new THREE.Mesh(
        new THREE.CylinderGeometry(R(83), R(83), M(4), 40, 1, false),
        mkMat(0x4fc3f7, 0.4, 0.5, 0x29b6f6, 0.3, CP),
      );
      (fl.material as THREE.MeshStandardMaterial).transparent = true;
      (fl.material as THREE.MeshStandardMaterial).opacity = 0.55;
      fl.position.y = -M(270);
      fl.userData.clickId = "fluidLevel";
      scene.add(fl);
      fluidLvlRef.current = fl;
    }

    // Tubing / НКТ Ø73 mm
    const tubingBot = isSgn ? M(760) : isEvn ? M(850) : M(880);
    addTube(scene, R(36.5), R(28.5), -0.06, -tubingBot, 0x0097a7, 0.85, 0.15, CP, "tubing");

    // НКТ coupling collars
    for (let i = 1; i * M(9) < tubingBot; i++) {
      const y = -i * M(9);
      addCyl(scene, R(42), y - M(0.8), y + M(0.8), 0x26c6da, 0.92, 0.08, 0x4dd0e1, 0.4, CP);
    }

    // Fluid column inside tubing
    {
      const fluidBot = -tubingBot;
      const flMat = mkMat(0x006064, 0.2, 0.8, 0x00bcd4, 0.6, CP);
      (flMat as THREE.MeshStandardMaterial).transparent = true;
      (flMat as THREE.MeshStandardMaterial).opacity = 0.50;
      (flMat as THREE.MeshStandardMaterial).depthWrite = false;
      const fl = new THREE.Mesh(
        new THREE.CylinderGeometry(R(27), R(27), Math.abs(fluidBot), 24, 1, true),
        flMat,
      );
      fl.position.y = fluidBot / 2;
      fl.renderOrder = 1;
      scene.add(fl);
    }

    // ════════════════════════════════════════════════════════════════════
    // PUMP-SPECIFIC DOWNHOLE ASSEMBLY
    // ════════════════════════════════════════════════════════════════════

    const pumpTag = isSgn ? "pumpSgn" : isEvn ? "pumpEvn" : "pumpEcn";

    if (isSgn) {
      addTube(scene, R(11), R(8.5), -0.06, -M(730), 0xb0bec5, 0.88, 0.12, CP);
      for (let i = 1; i * M(8) < M(730); i++) {
        const y = -i * M(8);
        addCyl(scene, R(15), y - M(0.6), y + M(0.6), 0x90a4ae, 0.88, 0.18, 0xcfd8dc, 0.2, CP);
      }
      addCyl(scene, R(48), -M(716), -M(728), 0x607d8b, 0.88, 0.18, 0x90a4ae, 0.4, CP);
      addCyl(scene, R(55), -M(730), -M(760), pc.body, 0.85, 0.15, pc.glow, 0.6, CP, pumpTag);
      pumpLt.position.y = -M(745);
      for (const d of [730, 740, 750, 758, 760] as const) {
        addCyl(scene, R(60), -M(d) - M(1), -M(d) + M(1), pc.glow, 0.80, 0.10, pc.glow, 1.0, CP, pumpTag);
      }
      addCyl(scene, R(42), -M(760), -M(764), 0x607d8b, 0.88, 0.18, 0x90a4ae, 0.4, CP);
    }

    if (!isSgn && !isEvn) {
      addCyl(scene, R(13), 0, -M(960), 0xf59e0b, 0.35, 0.65, 0xfcd34d, 0.30, CP);
      addCyl(scene, R(43), -M(784), -M(793), 0x26c6da, 0.85, 0.15, 0x4dd0e1, 0.7, CP);
      addCyl(scene, R(53), -M(800), -M(820), 0x00bcd4, 0.85, 0.15, 0x4dd0e1, 0.7, CP);
      addCyl(scene, R(61), -M(820), -M(875), pc.body, 0.80, 0.15, pc.glow, 0.7, CP, pumpTag);
      pumpLt.position.y = -M(847);
      for (let s = 0; s < 6; s++) {
        const yy = -M(825 + s * 8);
        addCyl(scene, R(66), yy - M(1), yy + M(1), pc.glow, 0.80, 0.10, pc.glow, 1.0, CP, pumpTag);
      }
      addCyl(scene, R(56), -M(875), -M(900), 0xce93d8, 0.85, 0.15, 0xe040fb, 0.6, CP);
      addCyl(scene, R(66), -M(900), -M(960), 0x5c6bc0, 0.88, 0.12, 0x7986cb, 0.6, CP);
      addCyl(scene, R(50), -M(960), -M(965), 0x37474f, 0.88, 0.18, undefined, 0, CP);
      const spinG = new THREE.CylinderGeometry(R(58), R(58), M(2), 16, 1, false);
      const spinM = new THREE.Mesh(spinG, mkMat(pc.glow, 0.80, 0.05, pc.glow, 1.2, CP));
      (spinM.material as THREE.MeshStandardMaterial).transparent = true;
      (spinM.material as THREE.MeshStandardMaterial).opacity = 0.55;
      spinM.position.y = -M(840);
      scene.add(spinM);
      spinRef.current = spinM;
    }

    if (isEvn) {
      addCyl(scene, R(13), 0, -M(920), 0xce93d8, 0.35, 0.65, 0xe040fb, 0.30, CP);
      addCyl(scene, R(59), -M(800), -M(852), pc.body, 0.80, 0.15, pc.glow, 0.7, CP, pumpTag);
      pumpLt.position.y = -M(825);
      for (let s = 0; s < 8; s++) {
        const yy = -M(805 + s * 6);
        addCyl(scene, R(62), yy - M(1), yy + M(1), pc.glow, 0.80, 0.10, pc.glow, 1.0, CP, pumpTag);
      }
      addCyl(scene, R(54), -M(852), -M(863), 0x7c4dff, 0.85, 0.15, 0xb39ddb, 0.7, CP);
      addCyl(scene, R(63), -M(863), -M(920), 0x7e57c2, 0.85, 0.15, 0xb39ddb, 0.6, CP);
      const spinG = new THREE.CylinderGeometry(R(56), R(56), M(3), 16, 1, false);
      const spinM = new THREE.Mesh(spinG, mkMat(pc.glow, 0.80, 0.05, pc.glow, 1.2, CP));
      (spinM.material as THREE.MeshStandardMaterial).transparent = true;
      (spinM.material as THREE.MeshStandardMaterial).opacity = 0.55;
      spinM.position.y = -M(826);
      scene.add(spinM);
      spinRef.current = spinM;
    }

    // Pump glow band
    {
      const gr = R(isSgn ? 70 : isEvn ? 66 : 72);
      const glowM = mkMat(pc.glow, 1.0, 0.0, pc.glow, 1.0, CP);
      glowM.transparent = true;
      glowM.opacity = 0.6;
      const gm = new THREE.Mesh(
        new THREE.CylinderGeometry(gr, gr, M(4), 32, 1, true),
        glowM,
      );
      gm.position.y = pumpLt.position.y;
      scene.add(gm);
      glowRef.current = gm;
    }

    // ════════════════════════════════════════════════════════════════════
    // PERFORATION ZONE (830–905 m)
    // ════════════════════════════════════════════════════════════════════
    {
      const perfBandMat = mkMat(0xff8f00, 0.2, 0.5, 0xffca28, 1.4, CP);
      (perfBandMat as THREE.MeshStandardMaterial).transparent = true;
      (perfBandMat as THREE.MeshStandardMaterial).opacity = 0.80;
      const perfBand = new THREE.Mesh(
        new THREE.CylinderGeometry(R(86), R(86), M(75), 32, 1, true),
        perfBandMat,
      );
      perfBand.position.y = -M(867);
      perfBand.userData.clickId = "perforation";
      scene.add(perfBand);

      const perfInnerMat = mkMat(0xffcc02, 0.1, 0.4, 0xffe57f, 1.6, CP);
      (perfInnerMat as THREE.MeshStandardMaterial).transparent = true;
      (perfInnerMat as THREE.MeshStandardMaterial).opacity = 0.55;
      const perfInner = new THREE.Mesh(
        new THREE.CylinderGeometry(R(40), R(40), M(75), 24, 1, true),
        perfInnerMat,
      );
      perfInner.position.y = -M(867);
      scene.add(perfInner);

      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        const yP = -M(832) - (i / 15) * M(70);
        const pg = new THREE.CylinderGeometry(R(4), R(1.5), R(120), 5);
        const pm = new THREE.Mesh(pg, mkMat(0xfbbf24, 0.4, 0.3, 0xf59e0b, 1.0, CP));
        pm.position.set(Math.cos(angle) * R(88), yP, Math.sin(angle) * R(88));
        pm.rotation.z = Math.PI / 2;
        pm.rotation.y = angle;
        scene.add(pm);
        const dotG = new THREE.SphereGeometry(R(8), 8, 8);
        const dotM = new THREE.Mesh(dotG, mkMat(0xfef08a, 0.5, 0.2, 0xfef08a, 1.5, CP));
        dotM.position.set(Math.cos(angle) * R(86), yP, Math.sin(angle) * R(86));
        scene.add(dotM);
      }

      const perfLt = new THREE.PointLight(0xf59e0b, 5, 6);
      perfLt.position.y = -M(867);
      scene.add(perfLt);
    }

    // Bottom plug
    addCyl(scene, R(84), -M(1394), -M(1400), 0x374151, 0.30, 0.90, undefined, 0, CP);

    // ════════════════════════════════════════════════════════════════════
    // WELLHEAD
    // ════════════════════════════════════════════════════════════════════
    {
      const wh = new THREE.Group();
      scene.add(wh);
      addCyl(wh, 0.32, -0.03, 0.06, 0x546e7a, 0.88, 0.12, 0x90a4ae, 0.3, undefined, "wellhead");
      addCyl(wh, 0.24, 0.06, 0.28, 0x455a64, 0.85, 0.15, 0x78909c, 0.3, undefined, "wellhead");
      addCyl(wh, 0.30, 0.28, 0.34, 0x546e7a, 0.88, 0.12, 0x90a4ae, 0.3);
      addCyl(wh, 0.20, 0.34, 0.52, 0x37474f, 0.85, 0.18, 0x546e7a, 0.3);
      addCyl(wh, 0.26, 0.52, 0.57, 0x546e7a, 0.88, 0.12, 0x90a4ae, 0.3);
      addBox(wh, 0, 0.68, 0, 0.22, 0.22, 0.22, 0x455a64, 0.85, 0.15, 0x78909c, 0.2);
      addCyl(wh, 0.08, 0.79, 0.96, 0x37474f, 0.85, 0.18);
      for (const sx of [-1, 1]) {
        addBox(wh, sx * 0.28, 0.68, 0, 0.34, 0.10, 0.10, 0x0288d1, 0.90, 0.10, 0x29b6f6, 0.5);
        addCyl(wh, 0.04, 0.57, 0.80, 0x546e7a, 0.85, 0.18).position.x = sx * 0.48;
        addCyl(wh, 0.065, 0.70, 0.72, 0xb71c1c, 0.40, 0.60, 0xef5350, 0.5).position.x = sx * 0.48;
      }
      addBox(wh, 1.20, 0.68, 0, 1.60, 0.065, 0.065, 0x00838f, 0.85, 0.15, 0x4dd0e1, 0.4);
      addCyl(wh, 0.045, 0.96, 1.00, 0xfafafa, 0.30, 0.70, 0x4dd0e1, 0.3);
      addCyl(wh, 0.06, 1.00, 1.02, 0x263238, 0.50, 0.50);
      for (let a = 0; a < 8; a++) {
        const angle = (a / 8) * Math.PI * 2;
        const bolt = addCyl(wh, 0.015, -0.03, 0.06, 0x90a4ae, 0.90, 0.10);
        bolt.position.x = Math.cos(angle) * 0.28;
        bolt.position.z = Math.sin(angle) * 0.28;
      }
    }

    // ════════════════════════════════════════════════════════════════════
    // SGN: BEAM PUMP (СК-6)
    // ════════════════════════════════════════════════════════════════════
    if (isSgn) {
      const beamGrp = new THREE.Group();
      scene.add(beamGrp);
      const PX = -3.0;

      addBox(beamGrp, PX - 1.0, 0.04, 0, 6.0, 0.08, 2.2, 0x616161, 0.10, 0.95);

      addBox(beamGrp, PX - 1.0, 0.36, 0, 1.4, 0.56, 1.0, 0x37474f, 0.82, 0.20);
      addBox(beamGrp, PX - 1.0, 0.67, 0, 1.2, 0.06, 0.9, 0x455a64, 0.80, 0.22);
      for (const sz of [-0.45, 0.45]) {
        addCyl(beamGrp, 0.30, -0.04, 0.04, 0x546e7a, 0.85, 0.15).position.set(PX - 1.0, 0.90, sz);
        addBox(beamGrp, PX - 1.0, 1.18, sz, 0.12, 0.60, 0.07, 0x607d8b, 0.82, 0.18);
      }
      for (const sz of [-0.38, 0.38]) {
        addBox(beamGrp, PX - 0.5, 2.10, sz, 0.07, 2.00, 0.06, 0x607d8b, 0.80, 0.22);
      }

      addBox(beamGrp, PX - 3.0, 0.36, 0, 0.95, 0.55, 0.68, 0x1565c0, 0.80, 0.18, 0x42a5f5, 0.15);
      addBox(beamGrp, PX - 3.0, 0.08, 0, 1.15, 0.06, 0.78, 0x455a64, 0.75, 0.30);
      addBox(beamGrp, PX - 2.0, 0.52, 0, 0.70, 0.60, 0.55, 0xf9a825, 0.20, 0.80, 0xfdd835, 0.12);

      for (const sz of [-0.50, 0.50]) {
        addBox(beamGrp, PX, 1.70, sz * 0.70, 0.14, 3.20, 0.14, 0x546e7a, 0.82, 0.20);
      }
      for (const h of [0.60, 1.40, 2.20]) {
        addBox(beamGrp, PX, h, 0, 0.10, 0.10, 0.80, 0x607d8b, 0.78, 0.25);
      }
      addBox(beamGrp, PX, 3.30, 0, 0.32, 0.14, 0.72, 0x78909c, 0.85, 0.18);
      for (let ly = 0.3; ly < 3.0; ly += 0.38) {
        addBox(beamGrp, PX, ly, -0.48, 0.04, 0.04, 0.22, 0x607d8b, 0.75, 0.30);
      }
      addBox(beamGrp, PX, 1.65, -0.62, 0.04, 3.10, 0.04, 0x607d8b, 0.75, 0.30);
      addBox(beamGrp, PX, 1.65, -0.38, 0.04, 3.10, 0.04, 0x607d8b, 0.75, 0.30);

      const walkGroup = new THREE.Group();
      walkGroup.position.set(PX, 3.35, 0);
      beamGrp.add(walkGroup);
      beamGrpRef.current = walkGroup;

      addBox(walkGroup, 0.5, 0.07, 0, 6.0, 0.055, 0.26, 0x546e7a, 0.82, 0.18);
      addBox(walkGroup, 0.5,-0.07, 0, 6.0, 0.055, 0.26, 0x546e7a, 0.82, 0.18);
      addBox(walkGroup, 0.5, 0.00, 0, 6.0, 0.16, 0.055, 0x607d8b, 0.80, 0.22);

      addBox(walkGroup, 3.20, 0.0, 0, 0.65, 0.22, 0.28, 0x263238, 0.82, 0.18);
      addBox(walkGroup, 3.50, -0.22, 0, 0.30, 0.48, 0.24, 0x263238, 0.82, 0.18);
      addBox(walkGroup, 3.40, -0.55, 0, 0.45, 0.22, 0.28, 0x263238, 0.82, 0.18);

      for (const sz of [-0.10, 0.10]) {
        addBox(walkGroup, 3.35, -0.95, sz, 0.018, 0.55, 0.018, 0xbdbdbd, 0.92, 0.08);
      }
      addBox(walkGroup, 3.35, -1.25, 0, 0.06, 0.06, 0.35, 0x90a4ae, 0.90, 0.10);
      addCyl(walkGroup, 0.04, -1.25, -1.20, 0xe0e0e0, 0.92, 0.08).position.x = 3.35;

      addBox(walkGroup, -1.50, -0.10, 0, 1.50, 0.50, 0.55, 0x455a64, 0.80, 0.22);
      addBox(walkGroup, -2.20, -0.10, 0, 0.70, 0.65, 0.42, 0x546e7a, 0.78, 0.25);

      const rod = addCyl(beamGrp, 0.022, 0.96, 2.30, 0xeeeeee, 0.96, 0.03, 0xffffff, 0.15);
      rod.position.x = 0;
      rodRef.current = rod;

      addCyl(beamGrp, 0.08, 0.92, 1.08, 0x37474f, 0.85, 0.18, 0x546e7a, 0.3);
      addCyl(beamGrp, 0.10, 0.96, 1.02, 0x455a64, 0.85, 0.15);

      addBox(beamGrp, PX - 3.0, 0.64, 0.38, 0.04, 0.04, 0.04, 0x263238, 0.50, 0.50);
    }

    // ════════════════════════════════════════════════════════════════════
    // ECN / EVN: Control station + transformer
    // ════════════════════════════════════════════════════════════════════
    if (!isSgn) {
      const stGrp = new THREE.Group();
      scene.add(stGrp);

      addBox(stGrp, 2.0, 0.90, 0, 1.6, 1.80, 0.80, pc.body, 0.65, 0.35, pc.glow, 0.08);
      addBox(stGrp, 1.20, 0.92, 0, 0.03, 1.50, 0.65, 0x0a0f18, 0.15, 0.95);
      for (let k = 0; k < 5; k++) {
        addBox(stGrp, 1.19, 1.30 + k * 0.22, 0, 0.015, 0.06, 0.06, pc.glow, 0.20, 0.55, pc.glow, 1.3);
      }
      addBox(stGrp, 1.19, 0.60, 0, 0.01, 0.30, 0.40, 0x1a237e, 0.10, 0.90, 0x42a5f5, 0.3);
      for (const [xx, zz] of [[1.35, -0.32], [1.35, 0.32], [2.65, -0.32], [2.65, 0.32]]) {
        addBox(stGrp, xx, 0.04, zz, 0.06, 0.08, 0.06, 0x455a64, 0.80, 0.22);
      }

      addBox(stGrp, 4.0, 0.85, 0, 1.20, 1.70, 0.90, 0x546e7a, 0.72, 0.30);
      for (let f = -0.35; f <= 0.35; f += 0.10) {
        addBox(stGrp, 3.38, 0.85, f, 0.02, 1.40, 0.06, 0x607d8b, 0.75, 0.25);
      }
      for (let i = -1; i <= 1; i++) {
        const ins = addCyl(stGrp, 0.05, 1.70, 2.00, 0xfafafa, 0.05, 0.88);
        ins.position.x = 4.0;
        ins.position.z = i * 0.28;
        addCyl(stGrp, 0.065, 1.76, 1.80, 0xe8eaf6, 0.10, 0.85).position.set(4.0, 0, i * 0.28);
        addCyl(stGrp, 0.065, 1.86, 1.90, 0xe8eaf6, 0.10, 0.85).position.set(4.0, 0, i * 0.28);
      }
      addBox(stGrp, 3.38, 0.30, 0, 0.08, 0.12, 0.06, 0xb71c1c, 0.50, 0.50, 0xef5350, 0.4);
      addBox(stGrp, 3.0, 0.04, 0, 3.2, 0.03, 0.03, 0x4caf50, 0.40, 0.60, 0x66bb6a, 0.5);
      addBox(stGrp, 3.0, 1.82, 0, 2.2, 0.04, 0.12, 0x78909c, 0.75, 0.28);
      addBox(stGrp, 3.0, 1.84, -0.03, 2.0, 0.025, 0.025, 0x263238, 0.30, 0.70);
      addBox(stGrp, 3.0, 1.84, 0.03, 2.0, 0.025, 0.025, 0xd32f2f, 0.30, 0.70);
      addBox(stGrp, 0.60, 0.50, 0, 1.20, 0.04, 0.04, 0x263238, 0.30, 0.70);
    }

    // ════════════════════════════════════════════════════════════════════
    // SHARED SURFACE DETAILS
    // ════════════════════════════════════════════════════════════════════
    {
      addBox(scene, 4.5, 0.22, 0, 5.0, 0.07, 0.07, 0x00695c, 0.82, 0.18, 0x26a69a, 0.2);
      for (const xx of [2.5, 4.5, 6.5]) {
        addBox(scene, xx, 0.12, 0, 0.06, 0.24, 0.06, 0x455a64, 0.75, 0.28);
      }
      addBox(scene, 3.5, 0.28, 0, 0.18, 0.14, 0.14, 0x0288d1, 0.85, 0.15, 0x29b6f6, 0.4);
      addCyl(scene, 0.05, 0.28, 0.46, 0xb71c1c, 0.40, 0.60, 0xef5350, 0.4).position.x = 3.5;
      addBox(scene, 2.1, 0.40, 0.08, 0.10, 0.10, 0.10, 0xfafafa, 0.50, 0.50, 0x4dd0e1, 0.6);
      addBox(scene, 2.1, 0.50, 0.08, 0.025, 0.15, 0.025, 0x90a4ae, 0.85, 0.15);
      addBox(scene, -5.0, 0.75, 2.5, 2.0, 1.50, 1.5, 0x455a64, 0.60, 0.42);
      addBox(scene, -5.0, 1.55, 2.5, 2.2, 0.08, 1.7, 0x37474f, 0.70, 0.30);
      addBox(scene, -4.01, 0.65, 2.5, 0.02, 1.00, 0.60, 0x1a237e, 0.10, 0.90);
      addBox(scene, -5.0, 1.20, 1.74, 0.40, 0.30, 0.02, 0xfdd835, 0.20, 0.80, 0xfdd835, 0.4);
      for (const [fx, fz] of [[-6.5, -3], [-6.5, 3], [7.5, -3], [7.5, 3]] as const) {
        addBox(scene, fx, 0.55, fz, 0.06, 1.10, 0.06, 0x8d6e63, 0.15, 0.85);
      }
      for (const fy of [0.35, 0.70, 1.05]) {
        addBox(scene, 0.5, fy, -3.0, 14.0, 0.015, 0.015, 0x9e9e9e, 0.80, 0.20);
        addBox(scene, 0.5, fy,  3.0, 14.0, 0.015, 0.015, 0x9e9e9e, 0.80, 0.20);
      }
    }

    // ════════════════════════════════════════════════════════════════════
    // SURFACE FLUID PARTICLES
    // ════════════════════════════════════════════════════════════════════
    {
      const sp = new Float32Array(SURF_PARTS * 3);
      const sc = new Float32Array(SURF_PARTS * 3);
      for (let i = 0; i < SURF_PARTS; i++) {
        sp[i * 3]     = 2.0 + Math.random() * 5.0;
        sp[i * 3 + 1] = 0.22 + (Math.random() - 0.5) * 0.04;
        sp[i * 3 + 2] = (Math.random() - 0.5) * 0.04;
        const shade = 0.25 + Math.random() * 0.35;
        sc[i * 3]     = shade * 0.4;
        sc[i * 3 + 1] = shade * 0.6;
        sc[i * 3 + 2] = shade * 0.2;
      }
      const sg = new THREE.BufferGeometry();
      sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
      sg.setAttribute("color",    new THREE.BufferAttribute(sc, 3));
      const sPts = new THREE.Points(sg, new THREE.PointsMaterial({
        size: 0.06, vertexColors: true, transparent: true, opacity: 0.85,
        sizeAttenuation: true, depthWrite: false,
      }));
      scene.add(sPts);
      surfPRef.current  = sp;
      surfPtRef.current = sPts;
    }

    // ════════════════════════════════════════════════════════════════════
    // RISING FLUID PARTICLES
    // ════════════════════════════════════════════════════════════════════
    {
      const pos = new Float32Array(PARTS * 3);
      const col = new Float32Array(PARTS * 3);
      const vel = new Float32Array(PARTS);
      const tubeR = R(27);
      for (let i = 0; i < PARTS; i++) {
        const ang = Math.random() * Math.PI * 2;
        const r   = Math.random() * tubeR * 0.85;
        pos[i*3]   = Math.cos(ang) * r;
        pos[i*3+1] = -(Math.random() * M(1400));
        pos[i*3+2] = Math.sin(ang) * r;
        vel[i]     = 0.020 + Math.random() * 0.015;
        const oil = Math.random() > 0.4;
        col[i*3]   = oil ? 0.85 : 0.05;
        col[i*3+1] = oil ? 0.45 : 0.55;
        col[i*3+2] = oil ? 0.02 : 0.95;
      }
      const pg = new THREE.BufferGeometry();
      pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      pg.setAttribute("color",    new THREE.BufferAttribute(col, 3));
      const pts = new THREE.Points(pg, new THREE.PointsMaterial({
        size: 0.10, vertexColors: true, transparent: true, opacity: 0.95,
        sizeAttenuation: true, clippingPlanes: CP, depthWrite: false,
      }));
      scene.add(pts);
      ppRef.current = pos; pvRef.current = vel; ptRef.current = pts;
    }

    // ════════════════════════════════════════════════════════════════════
    // INFLOW PARTICLES at perforation zone
    // ════════════════════════════════════════════════════════════════════
    {
      const pos = new Float32Array(IPARTS * 3);
      const vel = new Float32Array(IPARTS * 3);
      const perfTop = -M(830);
      const perfBot = -M(905);
      for (let i = 0; i < IPARTS; i++) {
        const angle = Math.random() * Math.PI * 2;
        const startR = R(82) + Math.random() * R(30);
        pos[i*3]   = Math.cos(angle) * startR;
        pos[i*3+1] = perfTop + Math.random() * (perfBot - perfTop);
        pos[i*3+2] = Math.sin(angle) * startR;
        const speed = 0.008 + Math.random() * 0.006;
        vel[i*3]   = -Math.cos(angle) * speed;
        vel[i*3+1] = 0.003 + Math.random() * 0.004;
        vel[i*3+2] = -Math.sin(angle) * speed;
      }
      const pts = new THREE.Points(
        (() => {
          const g = new THREE.BufferGeometry();
          g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
          return g;
        })(),
        new THREE.PointsMaterial({
          size: 0.08, color: 0xffd54f, transparent: true, opacity: 0.92,
          sizeAttenuation: true, clippingPlanes: CP, depthWrite: false,
        }),
      );
      scene.add(pts);
      ipRef.current = pos; ivRef.current = vel; itRef.current = pts;
    }

    // ════════════════════════════════════════════════════════════════════
    // POST-PROCESSING: Bloom + Output
    // ════════════════════════════════════════════════════════════════════
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(W, H),
      0.12,  // strength — subtle glow only
      0.4,   // radius
      1.4,   // threshold — only very bright emissives bloom
    );
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    composerRef.current = composer;

    // ── Animation loop ────────────────────────────────────────────────
    const animate = (now: number) => {
      rafRef.current = requestAnimationFrame(animate);
      const t = now / 1000;

      if (cpRef.current) {
        cpRef.current.constant = cutRef.current ? 0 : 99;
      }

      // SGN walking beam + polished rod
      if (beamGrpRef.current) {
        const beamAngle = Math.sin(t * 1.1) * 0.15;
        beamGrpRef.current.rotation.z = beamAngle;
        if (rodRef.current) {
          rodRef.current.position.y = beamAngle * 3.5 * 0.25;
        }
      }

      // ECN/EVN spin
      if (spinRef.current) {
        spinRef.current.rotation.y += 0.08;
      }

      // Rising fluid
      const rpos = ppRef.current!;
      const rvel = pvRef.current!;
      for (let i = 0; i < PARTS; i++) {
        rpos[i*3+1] += rvel[i];
        if (rpos[i*3+1] > 0.1) {
          const ang = Math.random() * Math.PI * 2;
          const r   = Math.random() * R(27) * 0.85;
          rpos[i*3]   = Math.cos(ang) * r;
          rpos[i*3+1] = -M(1390) - Math.random() * M(8);
          rpos[i*3+2] = Math.sin(ang) * r;
        }
      }
      (ptRef.current!.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;

      // Inflow particles
      const ipos = ipRef.current!;
      const ivel = ivRef.current!;
      const perfTop = -M(830);
      const perfBot = -M(905);
      for (let i = 0; i < IPARTS; i++) {
        ipos[i*3]   += ivel[i*3];
        ipos[i*3+1] += ivel[i*3+1];
        ipos[i*3+2] += ivel[i*3+2];
        const dist = Math.sqrt(ipos[i*3]**2 + ipos[i*3+2]**2);
        if (dist < R(10)) {
          const angle = Math.random() * Math.PI * 2;
          const startR = R(82) + Math.random() * R(30);
          ipos[i*3]   = Math.cos(angle) * startR;
          ipos[i*3+1] = perfTop + Math.random() * (perfBot - perfTop);
          ipos[i*3+2] = Math.sin(angle) * startR;
          const speed = 0.008 + Math.random() * 0.006;
          ivel[i*3]   = -Math.cos(angle) * speed;
          ivel[i*3+1] = 0.003 + Math.random() * 0.004;
          ivel[i*3+2] = -Math.sin(angle) * speed;
        }
      }
      (itRef.current!.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;

      // Surface fluid
      if (surfPRef.current && surfPtRef.current) {
        const spos = surfPRef.current;
        for (let i = 0; i < SURF_PARTS; i++) {
          spos[i * 3] += 0.012 + Math.random() * 0.005;
          spos[i * 3 + 1] = 0.22 + Math.sin(t * 3 + i) * 0.01;
          if (spos[i * 3] > 7.2) {
            spos[i * 3]     = 2.0 + Math.random() * 0.3;
            spos[i * 3 + 2] = (Math.random() - 0.5) * 0.04;
          }
        }
        (surfPtRef.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      }

      // Pump glow
      if (glowRef.current) {
        (glowRef.current.material as THREE.MeshStandardMaterial).opacity = 0.40 + Math.sin(t * 2.8) * 0.24;
      }
      if (pumpLtRef.current) {
        pumpLtRef.current.intensity = 8 + Math.sin(t * 2.2) * 4;
      }

      // Dynamic fluid level oscillation
      if (fluidLvlRef.current) {
        fluidLvlRef.current.position.y = -M(270) + Math.sin(t * 0.4) * M(3);
      }

      // SPO animation (tubing pull-out)
      if (spoPlayRef.current) {
        spoProgressRef.current = Math.min(spoProgressRef.current + 0.001, 1.0);
        spoTubingRef.current.forEach((obj) => {
          obj.position.y += 0.015;
        });
        if (spoProgressRef.current >= 1.0) {
          spoPlayRef.current = false;
        }
      }

      // Camera
      const r  = radiusR.current;
      const ph = phiR.current;
      const th = thetaR.current;
      camera.position.set(
        r * Math.sin(ph) * Math.sin(th),
        targYR.current + r * Math.cos(ph),
        r * Math.sin(ph) * Math.cos(th),
      );
      camera.lookAt(0, targYR.current, 0);

      composer.render();
    };
    rafRef.current = requestAnimationFrame(animate);

    // ── Resize ───────────────────────────────────────────────────────
    const onResize = () => {
      if (!el) return;
      const w = el.clientWidth || window.innerWidth;
      const h = el.clientHeight || window.innerHeight;
      renderer.setSize(w, h);
      composer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
      composer.dispose();
      renderer.dispose();
      envMap.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pumpType]);

  useEffect(() => { cutRef.current = cutOn; }, [cutOn]);

  // ── Mouse / keyboard controls ────────────────────────────────────────
  const dragBtnRef = useRef(0);
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDrag.current = true;
    dragBtnRef.current = e.button;
    lastXY.current = { x: e.clientX, y: e.clientY };
  }, []);
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrag.current) return;
    const dx = e.clientX - lastXY.current.x;
    const dy = e.clientY - lastXY.current.y;
    thetaR.current += dx * 0.006;
    targYR.current += dy * 0.06;
    lastXY.current = { x: e.clientX, y: e.clientY };
  }, []);
  const onMouseUp   = useCallback(() => { isDrag.current = false; }, []);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      if (e.shiftKey) {
        targYR.current -= e.deltaY * 0.04;
      } else {
        radiusR.current = Math.max(1.0, Math.min(120, radiusR.current + e.deltaY * 0.02));
      }
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const step = 1.2;
      if (e.key === "ArrowDown" || e.key === "s") targYR.current -= step;
      if (e.key === "ArrowUp"   || e.key === "w") targYR.current += step;
      if (e.key === "ArrowLeft" || e.key === "a") thetaR.current -= 0.07;
      if (e.key === "ArrowRight"|| e.key === "d") thetaR.current += 0.07;
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ── Raycaster click → info popup ──────────────────────────────────
  const handleSceneClick = useCallback((e: React.MouseEvent) => {
    if (isDrag.current) return;
    const el = mountRef.current;
    const cam = cameraRef.current;
    const sc = sceneRef.current;
    if (!el || !cam || !sc) return;
    const rect = el.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.current.setFromCamera(mouse, cam);
    const hits = raycaster.current.intersectObjects(sc.children, true);
    for (const hit of hits) {
      let obj: THREE.Object3D | null = hit.object;
      while (obj) {
        if (obj.userData.clickId && CLICK_DATA[obj.userData.clickId]) {
          const info = CLICK_DATA[obj.userData.clickId];
          setInfoPopup({ ...info, x: e.clientX - rect.left, y: e.clientY - rect.top });
          return;
        }
        obj = obj.parent;
      }
    }
    setInfoPopup(null);
  }, []);

  const tel = liveTelemetry || TELEMETRY[pumpType];

  // ── Dynagram SVG ──────────────────────────────────────────────────
  const dynSvg = useCallback(() => {
    const w = 320, h = 200, pL = 40, pR = 16, pT = 16, pB = 30;
    const iW = w - pL - pR, iH = h - pT - pB;
    const px = (v: number) => pL + (v / 3.6) * iW;
    const py = (v: number) => pT + iH - (v / 80) * iH;
    const upPath = DYN_UP.map(([x, y], i) => `${i === 0 ? "M" : "L"}${px(x).toFixed(1)},${py(y).toFixed(1)}`).join(" ");
    const dnPath = DYN_DN.map(([x, y], i) => `${i === 0 ? "M" : "L"}${px(x).toFixed(1)},${py(y).toFixed(1)}`).join(" ");
    const fillPath = upPath + " " + dnPath.replace("M", "L") + " Z";
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block", width: "100%", height: "auto" }}>
        <rect x={pL} y={pT} width={iW} height={iH} fill="transparent" />
        {[0, 20, 40, 60, 80].map(v => (
          <g key={v}>
            <line x1={pL} y1={py(v)} x2={pL + iW} y2={py(v)} stroke="rgba(148,163,184,0.25)" strokeWidth="0.5" />
            <text x={pL - 4} y={py(v) + 3} fontSize="8" fill="rgba(255,255,255,0.4)" textAnchor="end">{v}</text>
          </g>
        ))}
        {[0, 0.9, 1.8, 2.7, 3.6].map(v => (
          <g key={v}>
            <line x1={px(v)} y1={pT} x2={px(v)} y2={pT + iH} stroke="rgba(148,163,184,0.25)" strokeWidth="0.5" />
            <text x={px(v)} y={pT + iH + 12} fontSize="8" fill="rgba(255,255,255,0.4)" textAnchor="middle">{v.toFixed(1)}</text>
          </g>
        ))}
        <line x1={pL} y1={pT} x2={pL} y2={pT + iH} stroke="rgba(148,163,184,0.5)" strokeWidth="1" />
        <line x1={pL} y1={pT + iH} x2={pL + iW} y2={pT + iH} stroke="rgba(148,163,184,0.5)" strokeWidth="1" />
        <path d={fillPath} fill="rgba(34,211,238,0.12)" />
        <path d={upPath} fill="none" stroke="#22d3ee" strokeWidth="1.5" strokeLinejoin="round" />
        <path d={dnPath} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round" />
        <text x={pL + iW / 2} y={h - 4} fontSize="9" fill="rgba(255,255,255,0.4)" textAnchor="middle">Ход, м</text>
        <text x={pL - 24} y={pT + iH / 2} fontSize="9" fill="rgba(255,255,255,0.4)" textAnchor="middle" transform={`rotate(-90,${pL - 24},${pT + iH / 2})`}>Нагрузка, кН</text>
      </svg>
    );
  }, []);

  // ── JSX ──────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "#060a14", fontFamily: "ui-monospace, monospace" }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b shrink-0"
        style={{ borderColor: "rgba(0,200,255,0.12)", background: "rgba(6,10,20,0.97)" }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: "#22d3ee", boxShadow: "0 0 8px #22d3ee" }} />
          <span className="text-xs font-bold tracking-[0.18em] uppercase" style={{ color: "#22d3ee" }}>
            3D · Схема скважины
          </span>
          <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.85)" }}>
            {wellName}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold"
            style={{
              background: "rgba(255,255,255,0.08)",
              color: pumpType === "sgn" ? "#86efac" : pumpType === "ecn" ? "#93c5fd" : "#c4b5fd",
            }}>
            {PUMP_LABEL[pumpType]}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => { thetaR.current = 0.0; phiR.current = 1.25; radiusR.current = 35; targYR.current = -18; }}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg"
            style={{ border: "1px solid rgba(0,240,255,0.18)", color: "rgba(0,240,255,0.75)" }}>
            <RotateCcw className="h-3 w-3" /> Сброс
          </button>
          <button
            onClick={() => setCutOn(v => !v)}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg"
            style={{
              border: "1px solid rgba(0,240,255,0.18)",
              color: cutOn ? "#22d3ee" : "rgba(255,255,255,0.45)",
              background: cutOn ? "rgba(0,240,255,0.07)" : "transparent",
            }}>
            <Layers className="h-3 w-3" /> Разрез
          </button>

          {isSgn && (
            <button
              onClick={() => setShowDynagram(v => !v)}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg"
              style={{
                border: "1px solid rgba(245,158,11,0.25)",
                color: showDynagram ? "#f59e0b" : "rgba(255,255,255,0.45)",
                background: showDynagram ? "rgba(245,158,11,0.07)" : "transparent",
              }}>
              <BarChart3 className="h-3 w-3" /> Динамограмма
            </button>
          )}

          <button
            onClick={() => {
              if (spoPlaying) {
                setSpoPlaying(false);
                spoProgressRef.current = 0;
              } else {
                spoProgressRef.current = 0;
                setSpoPlaying(true);
              }
            }}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg"
            style={{
              border: "1px solid rgba(251,146,60,0.25)",
              color: spoPlaying ? "#fb923c" : "rgba(255,255,255,0.45)",
              background: spoPlaying ? "rgba(251,146,60,0.07)" : "transparent",
            }}>
            {spoPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            СПО
          </button>

          <button
            onClick={() => setCompareMode(v => !v)}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg"
            style={{
              border: "1px solid rgba(167,139,250,0.25)",
              color: compareMode ? "#a78bfa" : "rgba(255,255,255,0.45)",
              background: compareMode ? "rgba(167,139,250,0.07)" : "transparent",
            }}>
            <SplitSquareHorizontal className="h-3 w-3" /> Сравнение
          </button>

          <button
            onClick={() => { targYR.current += 3; }}
            className="w-8 h-8 flex items-center justify-center rounded-lg"
            title="Вверх"
            style={{ border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.5)" }}>
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => { targYR.current -= 3; }}
            className="w-8 h-8 flex items-center justify-center rounded-lg"
            title="Вниз"
            style={{ border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.5)" }}>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => { radiusR.current = Math.max(1.0, radiusR.current - 5); }}
            className="w-8 h-8 flex items-center justify-center rounded-lg"
            title="Приблизить"
            style={{ border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.5)" }}>
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => { radiusR.current = Math.min(120, radiusR.current + 5); }}
            className="w-8 h-8 flex items-center justify-center rounded-lg"
            title="Отдалить"
            style={{ border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.5)" }}>
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setShowHud(v => !v)}
            className="text-xs px-2.5 py-1.5 rounded-lg"
            style={{ border: "1px solid rgba(255,255,255,0.10)", color: showHud ? "#22d3ee" : "rgba(255,255,255,0.4)" }}>
            HUD
          </button>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full"
            style={{ border: "1px solid rgba(255,80,80,0.3)", color: "rgba(255,100,100,0.7)" }}>
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 relative min-h-0 flex">
        {/* Main 3D viewport */}
        <div className={`relative ${compareMode ? "w-[60%]" : "w-full"}`} style={{ minHeight: 0 }}>
          <div ref={mountRef} className="absolute inset-0 cursor-grab active:cursor-grabbing"
            onMouseDown={onMouseDown} onMouseMove={onMouseMove}
            onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
            onClick={handleSceneClick}
            onContextMenu={(e) => e.preventDefault()}
            style={{ userSelect: "none" }} />

          {/* ── Depth slider (left side) ── */}
          <div className="absolute left-1 top-16 bottom-16 flex flex-col items-center z-10" style={{ width: 36 }}>
            <Ruler className="h-3 w-3 mb-1" style={{ color: "rgba(0,240,255,0.4)" }} />
            <input
              type="range"
              min={0} max={1400} step={10}
              value={depthSlider}
              onChange={(e) => setDepthSlider(Number(e.target.value))}
              className="flex-1"
              style={{
                writingMode: "vertical-lr",
                direction: "rtl",
                appearance: "none",
                width: 4,
                background: "rgba(0,240,255,0.15)",
                borderRadius: 2,
                cursor: "pointer",
                accentColor: "#22d3ee",
              }}
            />
            <span className="text-[9px] mt-1 tabular-nums" style={{ color: "rgba(0,240,255,0.5)" }}>
              {depthSlider} м
            </span>
          </div>

          {/* ── Info popup on click ── */}
          {infoPopup && (
            <div
              className="absolute z-20 rounded-xl overflow-hidden pointer-events-auto"
              style={{
                left: Math.min(infoPopup.x + 12, (mountRef.current?.clientWidth || 600) - 260),
                top: Math.min(infoPopup.y - 10, (mountRef.current?.clientHeight || 400) - 200),
                background: "rgba(6,10,20,0.95)",
                border: `1px solid ${infoPopup.color}40`,
                backdropFilter: "blur(12px)",
                minWidth: 220,
                boxShadow: `0 0 24px ${infoPopup.color}20`,
              }}>
              <div className="flex items-center justify-between px-3 py-2 border-b"
                style={{ borderColor: `${infoPopup.color}20` }}>
                <div className="flex items-center gap-2">
                  <MousePointer className="h-3 w-3" style={{ color: infoPopup.color }} />
                  <span className="text-[11px] font-bold" style={{ color: infoPopup.color }}>{infoPopup.label}</span>
                </div>
                <button onClick={() => setInfoPopup(null)} className="text-white/30 hover:text-white/60">
                  <X className="h-3 w-3" />
                </button>
              </div>
              <div className="px-3 py-2 space-y-1">
                {infoPopup.data.map((d) => (
                  <div key={d.key} className="flex justify-between text-[10px]">
                    <span style={{ color: "rgba(255,255,255,0.45)" }}>{d.key}</span>
                    <span className="font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>{d.val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Dynagram overlay (SGN only) ── */}
          {showDynagram && isSgn && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 rounded-xl overflow-hidden"
              style={{
                background: "rgba(6,10,20,0.93)",
                border: "1px solid rgba(0,240,255,0.12)",
                backdropFilter: "blur(12px)",
                width: 340,
              }}>
              <div className="flex items-center justify-between px-3 py-1.5 border-b"
                style={{ borderColor: "rgba(0,240,255,0.10)" }}>
                <span className="text-[10px] uppercase tracking-[0.18em] font-bold"
                  style={{ color: "rgba(0,240,255,0.60)" }}>Динамограмма · ШГН</span>
                <button onClick={() => setShowDynagram(false)}
                  className="text-white/30 hover:text-white/60">
                  <X className="h-3 w-3" />
                </button>
              </div>
              <div className="p-2">
                {dynSvg()}
              </div>
              <div className="px-3 pb-2 flex gap-4 text-[9px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-0.5 rounded" style={{ background: "#22d3ee" }} />
                  <span style={{ color: "rgba(255,255,255,0.45)" }}>Ход вверх</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-0.5 rounded" style={{ background: "#f59e0b" }} />
                  <span style={{ color: "rgba(255,255,255,0.45)" }}>Ход вниз</span>
                </div>
              </div>
            </div>
          )}

          {/* ── SPO progress indicator ── */}
          {spoPlaying && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-xl"
              style={{
                background: "rgba(251,146,60,0.12)",
                border: "1px solid rgba(251,146,60,0.25)",
              }}>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#fb923c" }} />
                <span className="text-xs font-bold" style={{ color: "#fb923c" }}>
                  СПО: Подъём НКТ
                </span>
                <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${spoProgressRef.current * 100}%`,
                      background: "linear-gradient(90deg, #fb923c, #fbbf24)",
                    }}
                  />
                </div>
                <span className="text-[10px] tabular-nums" style={{ color: "rgba(251,146,60,0.7)" }}>
                  {Math.round(spoProgressRef.current * 100)}%
                </span>
              </div>
            </div>
          )}

          {showHud && (
            <>
              {/* Well construction legend */}
              <div className="absolute top-3 left-10 rounded-xl overflow-hidden"
                style={{
                  background: "rgba(6,10,20,0.92)", border: "1px solid rgba(0,240,255,0.12)",
                  backdropFilter: "blur(10px)", minWidth: 200, maxHeight: "calc(100vh - 120px)", overflowY: "auto",
                }}>
                <div className="px-3 py-2 border-b sticky top-0"
                  style={{ borderColor: "rgba(0,240,255,0.10)", background: "rgba(6,10,20,0.97)" }}>
                  <span className="text-[10px] uppercase tracking-[0.2em] font-bold"
                    style={{ color: "rgba(0,240,255,0.60)" }}>Конструкция скважины</span>
                </div>
                <div className="px-3 py-2.5 space-y-1.5 text-[10px]">
                  {(pumpType === "sgn"
                    ? [{ hex: "#1d4ed8", label: "Станок-качалка (СК-6)", depth: "наземн." },
                       { hex: "#94a3b8", label: "Штанговая колонна",     depth: "0–730 м" }]
                    : pumpType === "ecn"
                    ? [{ hex: `#${pc.body.toString(16).padStart(6,"0")}`, label: "Станция упр. ЭЦН", depth: "наземн." },
                       { hex: "#ca8a04", label: "Бронекабель КПБП",     depth: "0–960 м" }]
                    : [{ hex: `#${pc.body.toString(16).padStart(6,"0")}`, label: "Станция упр. ЭВН", depth: "наземн." },
                       { hex: "#a78bfa", label: "Бронекабель КПБП",     depth: "0–920 м" }]
                  ).concat([
                    { hex: "#0369a1", label: "Фонтанная арматура АФК", depth: "устье" },
                    { hex: "#1a2e3a", label: "Цементное кольцо",        depth: "0–975 м" },
                    { hex: "#455a6e", label: "Кондуктор Ø530",          depth: "0–30 м" },
                    { hex: "#1e6091", label: "Техн. колонна Ø324",      depth: "0–180 м" },
                    { hex: "#1d4ed8", label: "Пром. колонна Ø245",      depth: "0–520 м" },
                    { hex: "#1e3a8a", label: "Экспл. колонна Ø168",     depth: "0–975 м" },
                    { hex: "#0a4a7a", label: "НКТ Ø73",                  depth: `0–${pumpType==="sgn"?"760":pumpType==="ecn"?"880":"850"} м` },
                    ...( pumpType === "sgn"
                      ? [{ hex: `#${PC.sgn.body.toString(16).padStart(6,"0")}`, label: "Насос ШГН НВ1-44", depth: "730–760 м" }]
                      : pumpType === "ecn"
                      ? [{ hex: "#0e7490", label: "Газосепаратор",        depth: "800–820 м" },
                         { hex: `#${PC.ecn.body.toString(16).padStart(6,"0")}`, label: "Насос ЭЦН 5-80", depth: "820–875 м" },
                         { hex: "#7e22ce", label: "Протектор",            depth: "875–900 м" },
                         { hex: "#1d4ed8", label: "ПЭД",                  depth: "900–960 м" }]
                      : [{ hex: `#${PC.evn.body.toString(16).padStart(6,"0")}`, label: "Насос ЭВН",        depth: "800–852 м" },
                         { hex: "#4c1d95", label: "Протектор ЭВН",        depth: "852–863 м" },
                         { hex: "#6d28d9", label: "ПЭД ЭВН",             depth: "863–920 м" }]
                    ),
                    { hex: "#f59e0b", label: "Перфорация (зона притока)", depth: "830–905 м" },
                    { hex: "#38bdf8", label: "УДЖ (ур. дин. жидкости)",  depth: "270 м" },
                  ]).map((r) => (
                    <div key={r.label} className="flex items-start gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm mt-0.5 shrink-0"
                        style={{ background: r.hex }} />
                      <div>
                        <div style={{ color: "rgba(255,255,255,0.75)" }}>{r.label}</div>
                        <div style={{ color: "rgba(255,255,255,0.28)" }}>{r.depth}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Telemetry panel */}
              <div className="absolute top-3 right-3 w-52 rounded-xl overflow-hidden"
                style={{
                  background: "rgba(6,10,20,0.92)", border: "1px solid rgba(0,240,255,0.12)",
                  backdropFilter: "blur(10px)",
                }}>
                <div className="px-3 py-2 border-b" style={{ borderColor: "rgba(0,240,255,0.10)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold"
                      style={{ color: "rgba(0,240,255,0.60)" }}>
                      Телеметрия · {PUMP_LABEL[pumpType]}
                    </span>
                    {liveTelemetry && (
                      <span className="text-[8px] px-1.5 py-0.5 rounded-full animate-pulse"
                        style={{ background: "rgba(34,211,238,0.15)", color: "#22d3ee" }}>LIVE</span>
                    )}
                  </div>
                </div>
                {tel.map((row) => {
                  const Icon = row.icon;
                  return (
                    <div key={row.label} className="flex items-center justify-between px-3 py-1.5 border-b"
                      style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-3 w-3 shrink-0" style={{ color: row.color }} />
                        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.48)" }}>
                          {row.label}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold tabular-nums" style={{ color: row.color }}>
                        {row.value}
                        <span className="ml-0.5 text-[9px] font-normal"
                          style={{ color: "rgba(255,255,255,0.26)" }}>{row.unit}</span>
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Geological legend */}
              <div className="absolute bottom-3 left-10 rounded-xl overflow-hidden"
                style={{
                  background: "rgba(6,10,20,0.88)", border: "1px solid rgba(255,255,255,0.07)",
                  backdropFilter: "blur(8px)",
                }}>
                <div className="px-3 py-1.5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <span className="text-[9px] uppercase tracking-[0.18em]"
                    style={{ color: "rgba(255,255,255,0.32)" }}>Геологический разрез</span>
                </div>
                <div className="px-3 py-2 space-y-1">
                  {FORMATIONS.map(({ name, hex, depth }) => (
                    <div key={name} className="flex items-center gap-2 text-[10px]">
                      <div className="w-7 h-2 rounded-sm shrink-0"
                        style={{ background: `#${hex.toString(16).padStart(6,"0")}`, opacity: 0.85 }} />
                      <span style={{ color: "rgba(255,255,255,0.58)" }}>{name}</span>
                      <span className="ml-auto pl-2 tabular-nums text-[9px]"
                        style={{ color: "rgba(255,255,255,0.26)" }}>{depth}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Controls hint */}
              <div className="absolute bottom-3 right-3 rounded-xl px-3 py-2.5 text-[9px] space-y-0.5"
                style={{
                  background: "rgba(6,10,20,0.82)", border: "1px solid rgba(255,255,255,0.06)",
                  backdropFilter: "blur(8px)", color: "rgba(255,255,255,0.28)",
                }}>
                <div>🖱 Горизонтально — вращение</div>
                <div>🖱 Вертикально — вверх / вниз</div>
                <div>Колесо — масштаб</div>
                <div>W/S — вверх/вниз · A/D — поворот</div>
                <div>Клик — информация об элементе</div>
                <div className="mt-1 pt-1 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <span style={{ color: "#22d3ee", fontWeight: 600 }}>Разрез</span>
                  {" "}— движение жидкости внутри НКТ
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Compare panel (split-screen) ── */}
        {compareMode && (
          <div className="w-[40%] border-l overflow-y-auto"
            style={{ borderColor: "rgba(167,139,250,0.15)", background: "rgba(6,10,20,0.97)" }}>
            <div className="p-4">
              {/* Pump type selector */}
              <div className="mb-4">
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold block mb-2"
                  style={{ color: "rgba(167,139,250,0.60)" }}>Сравнение скважин</span>
                <div className="flex gap-2">
                  {(["sgn", "ecn", "evn"] as WellPumpType[]).filter(p => p !== pumpType).map(p => (
                    <button key={p}
                      onClick={() => setComparePump(p)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold"
                      style={{
                        border: `1px solid ${comparePump === p ? PC[p].glow.toString(16) : "rgba(255,255,255,0.1)"}`,
                        color: comparePump === p
                          ? `#${PC[p].glow.toString(16).padStart(6, "0")}`
                          : "rgba(255,255,255,0.4)",
                        background: comparePump === p ? `rgba(${(PC[p].glow >> 16)},${(PC[p].glow >> 8) & 0xff},${PC[p].glow & 0xff},0.08)` : "transparent",
                      }}>
                      {PUMP_LABEL[p]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Side-by-side comparison table */}
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="grid grid-cols-3 text-[10px] font-bold uppercase tracking-wider px-3 py-2"
                  style={{ background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.35)" }}>
                  <span>Параметр</span>
                  <span className="text-center" style={{ color: `#${pc.glow.toString(16).padStart(6, "0")}` }}>
                    {PUMP_LABEL[pumpType]}
                  </span>
                  <span className="text-center" style={{ color: `#${PC[comparePump].glow.toString(16).padStart(6, "0")}` }}>
                    {PUMP_LABEL[comparePump]}
                  </span>
                </div>
                {TELEMETRY[pumpType].map((row, i) => {
                  const cRow = TELEMETRY[comparePump][i];
                  return (
                    <div key={row.label} className="grid grid-cols-3 text-[10px] px-3 py-1.5 border-t"
                      style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                      <span style={{ color: "rgba(255,255,255,0.5)" }}>{row.label}</span>
                      <span className="text-center font-bold tabular-nums" style={{ color: row.color }}>
                        {row.value} <span className="text-[8px] font-normal" style={{ color: "rgba(255,255,255,0.25)" }}>{row.unit}</span>
                      </span>
                      <span className="text-center font-bold tabular-nums" style={{ color: cRow?.color || "#888" }}>
                        {cRow?.value || "—"} <span className="text-[8px] font-normal" style={{ color: "rgba(255,255,255,0.25)" }}>{cRow?.unit || ""}</span>
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Equipment comparison */}
              <div className="mt-4 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="px-3 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <span className="text-[10px] uppercase tracking-[0.18em] font-bold"
                    style={{ color: "rgba(255,255,255,0.35)" }}>Оборудование</span>
                </div>
                {[
                  { key: "Тип насоса", vals: { sgn: "ШГН НВ1-44-18", ecn: "ЭЦНМ5-80-1500", evn: "ЭВН5-60" } },
                  { key: "Глубина спуска", vals: { sgn: "730–760 м", ecn: "820–875 м", evn: "800–852 м" } },
                  { key: "Подача", vals: { sgn: "18 м³/сут", ecn: "80 м³/сут", evn: "60 м³/сут" } },
                  { key: "Привод", vals: { sgn: "СК-6 (балансир)", ecn: "ПЭД 32 кВт", evn: "ПЭД 22 кВт" } },
                  { key: "Наземное", vals: { sgn: "Станок-качалка", ecn: "СУ + ТМПН", evn: "СУ + ТМПН" } },
                  { key: "Кабель", vals: { sgn: "Штанги", ecn: "КПБП 0–960 м", evn: "КПБП 0–920 м" } },
                ].map(row => (
                  <div key={row.key} className="grid grid-cols-3 text-[10px] px-3 py-1.5 border-t"
                    style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                    <span style={{ color: "rgba(255,255,255,0.5)" }}>{row.key}</span>
                    <span className="text-center" style={{ color: "rgba(255,255,255,0.75)" }}>
                      {row.vals[pumpType]}
                    </span>
                    <span className="text-center" style={{ color: "rgba(255,255,255,0.75)" }}>
                      {row.vals[comparePump]}
                    </span>
                  </div>
                ))}
              </div>

              {/* Pros/Cons */}
              <div className="mt-4 space-y-3">
                {[pumpType, comparePump].map(pt => {
                  const pros: Record<WellPumpType, string[]> = {
                    sgn: ["Простота конструкции", "Низкая стоимость", "Работа с газом"],
                    ecn: ["Высокий дебит", "Большой межремонт. период", "Глубокий спуск"],
                    evn: ["Работа с вязкой нефтью", "Устойчивость к мех. примесям", "Компактность"],
                  };
                  return (
                    <div key={pt} className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <span className="text-[10px] font-bold mb-1.5 block"
                        style={{ color: `#${PC[pt].glow.toString(16).padStart(6, "0")}` }}>
                        {PUMP_LABEL[pt]} — Преимущества
                      </span>
                      {pros[pt].map(p => (
                        <div key={p} className="text-[10px] flex items-center gap-1.5"
                          style={{ color: "rgba(255,255,255,0.6)" }}>
                          <span style={{ color: `#${PC[pt].glow.toString(16).padStart(6, "0")}` }}>✓</span> {p}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

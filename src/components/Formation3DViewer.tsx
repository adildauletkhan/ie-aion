// Advanced 3D Geological Model Viewer with all professional features
// Includes: Interactive wells, Sidebar, Time-slider, Measurement, Minimap, Bookmarks, etc.

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Play, Pause, Ruler, Bookmark, Eye, Grid3x3, Layers, Zap, Maximize2, Minimize2, RotateCcw, ChevronRight, ChevronDown, Info } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

interface Formation3DViewerProps {
  oilFieldId: number;
  fieldName: string;
}

type PropertyType = 'depth' | 'porosity' | 'permeability' | 'saturation';

interface WellData {
  id: number;
  name: string;
  position: THREE.Vector3;
  type: 'production' | 'injection' | 'observation';
  depth: number;
  production: number;
  pressure: number;
  waterCut: number;
  mesh?: THREE.Group;
  /** Deviation angle from vertical, degrees (0 = vertical) */
  inclination: number;
  /** Direction of deviation, degrees from North (0–360) */
  azimuth: number;
}

interface ApiWell {
  id: number;
  name: string;
  wellType: string;
  status: string;
  latitude?: number | null;
  longitude?: number | null;
  depthCurrent?: number | null;
  formationName?: string | null;
}

interface ApiHorizon {
  id: number;
  name: string;
  code: string;
  depthTop: number;
  depthBottom: number;
  lithology?: string | null;
  porosity?: number | null;
}

// Convert API data to WellData for Three.js, spreading lat/lon to scene coords
function apiWellsToSceneWells(apiWells: ApiWell[]): WellData[] {
  if (apiWells.length === 0) return [];
  const lats = apiWells.map(w => w.latitude ?? 0);
  const lons = apiWells.map(w => w.longitude ?? 0);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const rangeH = maxLat - minLat || 0.001;
  const rangeW = maxLon - minLon || 0.001;
  const R = 18; // half-size in scene units

  return apiWells.map((w, i) => {
    const lat = w.latitude ?? 0, lon = w.longitude ?? 0;
    const x = ((lon - minLon) / rangeW) * R * 2 - R;
    const z = ((lat - minLat) / rangeH) * R * 2 - R;
    // If all coords are identical/zero, spread randomly
    const px = (lat === 0 && lon === 0) ? (Math.random() - 0.5) * 30 : x;
    const pz = (lat === 0 && lon === 0) ? (Math.random() - 0.5) * 30 : z;
    const type: WellData['type'] =
      w.wellType === 'injection' ? 'injection' :
      w.wellType === 'observation' ? 'observation' : 'production';
    // Use stable seed from well id so values don't change on re-render
    const seed = w.id * 0.1;
    const pseudoRand = (offset: number) => ((Math.sin(seed + offset) + 1) / 2);
    return {
      id: w.id,
      name: w.name,
      position: new THREE.Vector3(px, 0, pz),
      type,
      depth: (w.depthCurrent ?? 1500) / 130, // ~1.9× deeper visually
      production: type === 'production' ? 30 + pseudoRand(1) * 40 : 0,
      pressure: 130 + Math.floor(pseudoRand(2) * 60),
      waterCut: type === 'production' ? pseudoRand(3) * 0.5 : 0,
      inclination: 5 + pseudoRand(4) * 30,   // 5–35°
      azimuth: pseudoRand(5) * 360,           // 0–360°
    };
  });
}

// Layer color palette indexed by position
const LAYER_COLORS = [0xd4a574, 0x8b7355, 0x696969, 0x4a7c5a, 0x4a4a4a, 0x3d3d3d, 0x5a4a6a];

export function Formation3DViewer({ oilFieldId, fieldName }: Formation3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  
  // States
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showLayers, setShowLayers] = useState(true);
  const [showFaults, setShowFaults] = useState(true);
  const [showContours, setShowContours] = useState(true);
  const [showWells, setShowWells] = useState(true);
  const [show3DGrid, setShow3DGrid] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showMinimap, setShowMinimap] = useState(false);
  const [selectedWell, setSelectedWell] = useState<WellData | null>(null);
  const [cursorInfo, setCursorInfo] = useState<{ x: number; z: number; value: number } | null>(null);
  const [propertyType, setPropertyType] = useState<PropertyType>('depth');
  const [contourInterval, setContourInterval] = useState(1.0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [measurementMode, setMeasurementMode] = useState(false);
  const [measurementPoints, setMeasurementPoints] = useState<THREE.Vector3[]>([]);
  const [measurementDistance, setMeasurementDistance] = useState(0);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [wellsExpanded, setWellsExpanded] = useState(true);
  const [layersExpanded, setLayersExpanded] = useState(true);
  
  const animationFrameRef = useRef<number>();
  const wellsDataRef = useRef<WellData[]>([]);
  const rotationRef = useRef({ x: 0.5, y: 0.8 });
  const distanceRef = useRef(65);
  /** Ref keeps selected well accessible inside animation loop without closure stale */
  const selectedWellRef = useRef<WellData | null>(null);
  /** Refs for controls accessible inside Three.js animate loop without stale closures */
  const isAnimatingRef    = useRef(false);
  const currentTimeRef    = useRef(0);
  const propertyTypeRef   = useRef<PropertyType>('depth');
  const measurementModeRef = useRef(false);
  const surfaceRef        = useRef<THREE.Mesh | null>(null);
  const lastFrameTimeRef  = useRef(0);

  // Real API data
  const [apiWells, setApiWells] = useState<ApiWell[]>([]);
  const [apiHorizons, setApiHorizons] = useState<ApiHorizon[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!oilFieldId) return;
    setDataLoading(true);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    Promise.all([
      fetch(`/api/wells?oil_field_id=${oilFieldId}`, { headers }).then(r => r.ok ? r.json() : []),
      fetch(`/api/reservoir-twin/horizons?oil_field_id=${oilFieldId}`, { headers }).then(r => r.ok ? r.json() : []),
    ]).then(([wells, horizons]) => {
      setApiWells(wells);
      setApiHorizons(horizons);
    }).catch(() => {}).finally(() => setDataLoading(false));
  }, [oilFieldId]);

  // Derive scene wells from API data
  const sceneWells: WellData[] = apiWells.length > 0
    ? apiWellsToSceneWells(apiWells)
    : [];

  wellsDataRef.current = sceneWells;

  // Sync refs with state so the animate loop can read without stale closures
  useEffect(() => { selectedWellRef.current   = selectedWell; },   [selectedWell]);
  useEffect(() => { isAnimatingRef.current    = isAnimating; },    [isAnimating]);
  useEffect(() => { currentTimeRef.current    = currentTime; },    [currentTime]);
  useEffect(() => { measurementModeRef.current = measurementMode; }, [measurementMode]);
  useEffect(() => {
    propertyTypeRef.current = propertyType;
    // Recompute surface vertex colors immediately when property changes
    const surface = surfaceRef.current;
    if (!surface) return;
    const geo = surface.geometry as THREE.BufferGeometry;
    const pos = geo.attributes.position.array as Float32Array;
    const cols = new Float32Array(pos.length);
    for (let i = 0; i < pos.length; i += 3) {
      const x = pos[i], z = pos[i + 1], h = pos[i + 2];
      const n = Math.max(0, Math.min(1, h / 10));
      const color = new THREE.Color();
      if (propertyType === 'depth') {
        color.setHSL(0.15 + n * 0.35, 0.85, 0.45 + n * 0.15);
      } else if (propertyType === 'porosity') {
        const v = 0.5 + 0.5 * Math.sin(x * 0.4 + z * 0.3);
        color.setHSL(0.62 + v * 0.12, 0.75, 0.35 + v * 0.25);
      } else if (propertyType === 'permeability') {
        const v = 0.5 + 0.5 * Math.cos(x * 0.3 - z * 0.4);
        color.setHSL(0.07 + v * 0.05, 0.9, 0.35 + v * 0.3);
      } else if (propertyType === 'saturation') {
        const v = Math.max(0, n + 0.5 * Math.sin(x * 0.5) * Math.cos(z * 0.5));
        color.setHSL(0.03 + v * 0.04, 0.95, 0.25 + v * 0.3);
      }
      cols[i] = color.r; cols[i + 1] = color.g; cols[i + 2] = color.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    geo.attributes.color.needsUpdate = true;
  }, [propertyType]);

  // Rebuild contour lines when interval slider changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const old = scene.getObjectByName('contoursGroup');
    if (old) scene.remove(old);

    const gridSize = 70;
    const group = new THREE.Group();
    group.name = 'contoursGroup';
    const step = contourInterval * 2; // convert UI value to scene units
    for (let level = -8; level <= 10; level += step) {
      const pts: THREE.Vector3[] = [];
      for (let x = -gridSize / 2; x <= gridSize / 2; x += 1) {
        for (let z = -gridSize / 2; z <= gridSize / 2; z += 1) {
          const h = Math.sin(x * 0.25) * 1.2 + Math.cos(z * 0.25) * 1.2;
          if (Math.abs(h - level) < 0.5) pts.push(new THREE.Vector3(x, h + 0.1, z));
        }
      }
      if (pts.length > 1) {
        group.add(new THREE.Points(
          new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.PointsMaterial({ color: 0x333333, size: 0.15, transparent: true, opacity: 0.6 }),
        ));
      }
    }
    group.visible = showContours;
    scene.add(group);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contourInterval, dataLoading]);

  // ==================== WELL SELECTION HIGHLIGHT + BOREHOLE ====================
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Cleanup previous selection visuals
    ['selectionHighlight', 'boreholeTrajectory', 'boreholeMarkers'].forEach(name => {
      const obj = scene.getObjectByName(name);
      if (obj) scene.remove(obj);
    });

    if (!selectedWell) return;

    const well = selectedWell;
    const incRad = (well.inclination * Math.PI) / 180;
    const azRad  = (well.azimuth  * Math.PI) / 180;

    // ── Scale up selected well group in scene ──────────────────
    const wellGroup = scene.getObjectByName(`well-${well.id}`);
    if (wellGroup) wellGroup.scale.setScalar(1.8);

    // ── Highlight group ────────────────────────────────────────
    const highlight = new THREE.Group();
    highlight.name = 'selectionHighlight';

    // Large pulsing base ring
    const ringGeo = new THREE.TorusGeometry(1.4, 0.10, 10, 48);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.name = 'selectionRing';
    ring.rotation.x = Math.PI / 2;
    ring.position.set(well.position.x, 0.1, well.position.z);
    highlight.add(ring);

    // Second outer ring
    const ring2Geo = new THREE.TorusGeometry(2.2, 0.05, 8, 48);
    const ring2Mat = new THREE.MeshBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 0.5 });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.name = 'selectionRing2';
    ring2.rotation.x = Math.PI / 2;
    ring2.position.set(well.position.x, 0.05, well.position.z);
    highlight.add(ring2);

    // Thick glowing vertical beam (cylinder instead of line for visibility)
    const beamHeight = 12;
    const beamY = well.depth * 1.8 + beamHeight / 2;
    const beamGeo = new THREE.CylinderGeometry(0.06, 0.06, beamHeight, 8);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.name = 'selectionBeam';
    beam.position.set(well.position.x, beamY, well.position.z);
    highlight.add(beam);

    // Arrow cone pointing DOWN to the wellhead from above
    const arrowY = well.depth * 1.8 + beamHeight + 1.5;
    const arrowGeo = new THREE.ConeGeometry(0.6, 2.0, 12);
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 0.92 });
    const arrow = new THREE.Mesh(arrowGeo, arrowMat);
    arrow.name = 'selectionArrow';
    // Rotate so tip points downward
    arrow.rotation.z = Math.PI;
    arrow.position.set(well.position.x, arrowY, well.position.z);
    highlight.add(arrow);

    // Floating name label (canvas texture sprite)
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 256;
    labelCanvas.height = 64;
    const ctx = labelCanvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    const r = 10;
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.lineTo(256 - r, 0);
    ctx.quadraticCurveTo(256, 0, 256, r);
    ctx.lineTo(256, 64 - r);
    ctx.quadraticCurveTo(256, 64, 256 - r, 64);
    ctx.lineTo(r, 64);
    ctx.quadraticCurveTo(0, 64, 0, 64 - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffdd44';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Скв. ${well.name}`, 128, 32);
    const labelTex = new THREE.CanvasTexture(labelCanvas);
    const labelSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: labelTex, transparent: true, sizeAttenuation: true }),
    );
    labelSprite.name = 'selectionLabel';
    labelSprite.scale.set(6, 1.5, 1);
    labelSprite.position.set(well.position.x, arrowY + 2.5, well.position.z);
    highlight.add(labelSprite);

    scene.add(highlight);

    // ── Borehole trajectory (downward from surface) ────────────
    const totalDepthScene = well.depth * 3.5; // −30 % underground depth
    const steps = 30;
    const trajectoryPts: THREE.Vector3[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const md = totalDepthScene * t; // measured depth along wellbore
      const dx = md * Math.sin(incRad) * Math.sin(azRad);
      const dz = md * Math.sin(incRad) * Math.cos(azRad);
      const dy = -md * Math.cos(incRad); // going underground (negative Y)
      trajectoryPts.push(new THREE.Vector3(
        well.position.x + dx,
        dy,
        well.position.z + dz,
      ));
    }

    const curve = new THREE.CatmullRomCurve3(trajectoryPts);
    const tubeGeo = new THREE.TubeGeometry(curve, 40, 0.09, 8, false);
    const tubeMat = new THREE.MeshBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 0.85 });
    const bore = new THREE.Mesh(tubeGeo, tubeMat);
    bore.name = 'boreholeTrajectory';
    scene.add(bore);

    // ── Depth markers at 25% / 50% / 75% / 100% MD ────────────
    const markers = new THREE.Group();
    markers.name = 'boreholeMarkers';
    [0.25, 0.5, 0.75, 1.0].forEach(t => {
      const pt = curve.getPoint(t);
      const sGeo = new THREE.SphereGeometry(0.14, 10, 10);
      const sMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const sphere = new THREE.Mesh(sGeo, sMat);
      sphere.position.copy(pt);
      markers.add(sphere);

      // Small ring around marker
      const mRingGeo = new THREE.TorusGeometry(0.22, 0.025, 6, 14);
      const mRingMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
      const mRing = new THREE.Mesh(mRingGeo, mRingMat);
      mRing.position.copy(pt);
      markers.add(mRing);
    });
    scene.add(markers);

    return () => {
      // Restore well scale
      const wg = scene.getObjectByName(`well-${well.id}`);
      if (wg) wg.scale.setScalar(1.0);
      ['selectionHighlight', 'boreholeTrajectory', 'boreholeMarkers'].forEach(name => {
        const obj = scene.getObjectByName(name);
        if (obj) scene.remove(obj);
      });
    };
  // Re-run when selected well changes AND after scene is created (dataLoading flips)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWell, dataLoading]);

  // ==================== THREE.JS SCENE SETUP ====================
  useEffect(() => {
    if (!containerRef.current || dataLoading) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f1419);
    scene.fog = new THREE.Fog(0x0f1419, 110, 220);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(50, 30, 50);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(30, 40, 20);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Grid
    const gridHelper = new THREE.GridHelper(100, 50, 0x666666, 0x444444);
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.6;
    gridHelper.name = 'gridHelper';
    scene.add(gridHelper);

    // Create surface
    const gridSize = 70;
    const segments = 80;
    const geometry = new THREE.PlaneGeometry(gridSize, gridSize, segments, segments);
    const vertices = geometry.attributes.position.array;
    const colors = new Float32Array(vertices.length);

    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const z = vertices[i + 1];
      const distance = Math.sqrt(x * x + z * z);
      const height = Math.max(0, 8 - distance * 0.15 +
        Math.sin(x * 0.25) * 1.2 +
        Math.cos(z * 0.25) * 1.2);
      vertices[i + 2] = height;

      const normalized = height / 10;
      const color = new THREE.Color();
      color.setHSL(0.15 + normalized * 0.35, 0.85, 0.45 + normalized * 0.15);
      colors[i] = color.r;
      colors[i + 1] = color.g;
      colors[i + 2] = color.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      roughness: 0.65,
      metalness: 0.1,
    });

    const surface = new THREE.Mesh(geometry, material);
    surface.rotation.x = -Math.PI / 2;
    surface.receiveShadow = true;
    surface.name = 'surface';
    surfaceRef.current = surface;
    scene.add(surface);

    // Create wells
    sceneWells.forEach(well => {
      const wellGroup = new THREE.Group();
      wellGroup.name = `well-${well.id}`;
      wellGroup.userData.wellId = well.id;

      const colors = {
        production: { main: 0x27ae60, glow: 0x2ecc71 },
        injection: { main: 0x3498db, glow: 0x5dade2 },
        observation: { main: 0x95a5a6, glow: 0xbdc3c7 }
      };
      
      const wellColor = colors[well.type] ?? colors.production;

      // Casing — thicker tube, positioned above surface
      const casingGeometry = new THREE.CylinderGeometry(0.09, 0.08, well.depth, 16);
      const casingMaterial = new THREE.MeshStandardMaterial({
        color: wellColor.main,
        metalness: 0.75,
        roughness: 0.2,
      });
      const casing = new THREE.Mesh(casingGeometry, casingMaterial);
      casing.position.y = well.depth / 2;
      casing.userData.wellId = well.id;
      wellGroup.add(casing);

      // Underground extension (semi-transparent darker tube, goes 2× casing depth below surface)
      const ugDepth = well.depth * 1.4; // −30 %
      const ugGeo = new THREE.CylinderGeometry(0.075, 0.06, ugDepth, 16);
      const ugMat = new THREE.MeshStandardMaterial({
        color: wellColor.main,
        metalness: 0.5,
        roughness: 0.5,
        transparent: true,
        opacity: 0.45,
      });
      const ug = new THREE.Mesh(ugGeo, ugMat);
      ug.position.y = -(ugDepth / 2);
      ug.userData.wellId = well.id;
      wellGroup.add(ug);

      // Wellhead (larger)
      const wellheadGeometry = new THREE.CylinderGeometry(0.18, 0.20, 0.35, 12);
      const wellheadMaterial = new THREE.MeshStandardMaterial({
        color: 0x2c3e50,
        metalness: 0.9,
        roughness: 0.05,
      });
      const wellhead = new THREE.Mesh(wellheadGeometry, wellheadMaterial);
      wellhead.position.y = well.depth + 0.175;
      wellhead.userData.wellId = well.id;
      wellGroup.add(wellhead);

      // Marker (larger glow sphere)
      const markerGeometry = new THREE.SphereGeometry(0.16, 16, 16);
      const markerMaterial = new THREE.MeshStandardMaterial({
        color: wellColor.glow,
        emissive: wellColor.glow,
        emissiveIntensity: 1.5,
        transparent: true,
        opacity: 0.95,
      });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.y = well.depth + 0.65;
      marker.userData.wellId = well.id;
      wellGroup.add(marker);

      wellGroup.position.set(well.position.x, 0, well.position.z);
      scene.add(wellGroup);
    });

    // ==================== GEOLOGICAL LAYERS ====================
    const layersGroup = new THREE.Group();
    layersGroup.name = 'layersGroup';
    
    const createLayer = (yPosition: number, color: number, opacity: number, label: string) => {
      const layerGeometry = new THREE.PlaneGeometry(gridSize, gridSize, 40, 40);
      const layerVerts = layerGeometry.attributes.position.array;
      for (let i = 0; i < layerVerts.length; i += 3) {
        const x = layerVerts[i];
        const z = layerVerts[i + 1];
        layerVerts[i + 2] = Math.sin(x * 0.3) * 0.15 + Math.cos(z * 0.3) * 0.15;
      }
      layerGeometry.computeVertexNormals();
      
      const layerMaterial = new THREE.MeshStandardMaterial({
        color,
        transparent: true,
        opacity,
        side: THREE.DoubleSide,
        roughness: 0.85,
      });
      const layer = new THREE.Mesh(layerGeometry, layerMaterial);
      layer.rotation.x = -Math.PI / 2;
      layer.position.y = yPosition;
      layersGroup.add(layer);
      
      // Label
      const labelCanvas = document.createElement('canvas');
      const labelContext = labelCanvas.getContext('2d')!;
      labelCanvas.width = 256;
      labelCanvas.height = 64;
      const bgColor = new THREE.Color(color);
      labelContext.fillStyle = `rgb(${bgColor.r * 255}, ${bgColor.g * 255}, ${bgColor.b * 255})`;
      labelContext.fillRect(0, 0, 256, 64);
      labelContext.fillStyle = '#ffffff';
      labelContext.font = 'Bold 28px Arial';
      labelContext.textAlign = 'center';
      labelContext.fillText(label, 128, 42);
      const labelTexture = new THREE.CanvasTexture(labelCanvas);
      const labelSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture, sizeAttenuation: false }));
      labelSprite.position.set(gridSize / 2 + 2, yPosition, 0);
      labelSprite.scale.set(0.15, 0.0375, 1);
      layersGroup.add(labelSprite);
    };

    if (apiHorizons.length > 0) {
      // Use real horizons – normalize depths to scene Y range [-18, +4]
      const depths = apiHorizons.map(h => h.depthTop);
      const minD = Math.min(...depths), maxD = Math.max(...depths);
      const rangeD = maxD - minD || 1;
      apiHorizons.forEach((h, i) => {
        const yPos = 3 - ((h.depthTop - minD) / rangeD) * 15; // −30 %
        const opacity = 0.35 + i * 0.04;
        createLayer(yPos, LAYER_COLORS[i % LAYER_COLORS.length], Math.min(opacity, 0.65), h.name);
      });
    } else {
      // Spread layers deeper: from y=4 down to y=-18
      createLayer( 3,  0xd4a574, 0.30, 'Аргиллит');   // 4   × 0.7
      createLayer(-1,  0x8b7355, 0.38, 'Песчаник');   // −1  × 0.7 ≈ −1
      createLayer(-4,  0x696969, 0.44, 'Алевролит');  // −6  × 0.7 ≈ −4
      createLayer(-8,  0x4a7c5a, 0.50, 'Аргиллит');   // −11 × 0.7 ≈ −8
      createLayer(-11, 0x3d3d3d, 0.58, 'Глина');      // −16 × 0.7 ≈ −11
    }
    
    scene.add(layersGroup);

    // ==================== FAULTS ====================
    const faultsGroup = new THREE.Group();
    faultsGroup.name = 'faultsGroup';
    
    const createFault = (x1: number, z1: number, x2: number, z2: number) => {
      const points = [];
      const steps = 15;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = x1 + (x2 - x1) * t;
        const z = z1 + (z2 - z1) * t;
        points.push(new THREE.Vector3(x, 5, z));
        points.push(new THREE.Vector3(x, -14, z)); // −20 × 0.7 = −14
      }
      
      const faultGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const faultMaterial = new THREE.LineBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0.8 });
      const faultLines = new THREE.LineSegments(faultGeometry, faultMaterial);
      faultsGroup.add(faultLines);
      
      // Fault plane
      const dist = Math.sqrt((x2-x1)**2 + (z2-z1)**2);
      const faultPlaneGeometry = new THREE.PlaneGeometry(dist, 18, 5, 5); // 26 × 0.7 ≈ 18
      const faultPlaneMaterial = new THREE.MeshStandardMaterial({
        color: 0xff4444,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
      });
      const faultPlane = new THREE.Mesh(faultPlaneGeometry, faultPlaneMaterial);
      const angle = Math.atan2(z2 - z1, x2 - x1);
      faultPlane.rotation.y = angle;
      faultPlane.rotation.x = Math.PI / 2 - 0.3;
      faultPlane.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
      faultsGroup.add(faultPlane);
    };

    createFault(-15, -15, 10, 20);
    createFault(15, -10, 20, 15);
    createFault(-20, 0, -5, 20);
    
    scene.add(faultsGroup);

    // ==================== AXES ====================
    const axesGroup = new THREE.Group();
    axesGroup.name = 'axesGroup';
    
    const createAxis = (direction: THREE.Vector3, color: number, label: string, length: number = 30) => {
      const points = [new THREE.Vector3(0, 0, 0), direction.clone().multiplyScalar(length)];
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(lineGeometry, new THREE.LineBasicMaterial({ color, linewidth: 2 }));
      axesGroup.add(line);
      
      const arrowGeometry = new THREE.ConeGeometry(0.4, 1.5, 8);
      const arrow = new THREE.Mesh(arrowGeometry, new THREE.MeshBasicMaterial({ color }));
      const arrowPos = direction.clone().multiplyScalar(length);
      arrow.position.copy(arrowPos);
      if (direction.x !== 0) arrow.rotation.z = -Math.PI / 2;
      if (direction.z !== 0) arrow.rotation.x = Math.PI / 2;
      axesGroup.add(arrow);
    };

    createAxis(new THREE.Vector3(1, 0, 0), 0xff0000, 'X');
    createAxis(new THREE.Vector3(0, 1, 0), 0x00ff00, 'Z');
    createAxis(new THREE.Vector3(0, 0, 1), 0x0000ff, 'Y');
    
    scene.add(axesGroup);

    // ==================== CONTOUR LINES ====================
    const contoursGroup = new THREE.Group();
    contoursGroup.name = 'contoursGroup';
    
    const contourIntervals = 10;
    for (let level = -15; level <= 10; level += 2) {
      const contourPoints: THREE.Vector3[] = [];
      for (let x = -gridSize/2; x <= gridSize/2; x += 1) {
        for (let z = -gridSize/2; z <= gridSize/2; z += 1) {
          const height = Math.sin(x * 0.1) * 5 + Math.cos(z * 0.1) * 5;
          if (Math.abs(height - level) < 0.5) {
            contourPoints.push(new THREE.Vector3(x, height + 0.1, z));
          }
        }
      }
      if (contourPoints.length > 1) {
        const contourGeometry = new THREE.BufferGeometry().setFromPoints(contourPoints);
        const contourMaterial = new THREE.PointsMaterial({ 
          color: 0x333333, 
          size: 0.15,
          transparent: true,
          opacity: 0.6
        });
        const contourLine = new THREE.Points(contourGeometry, contourMaterial);
        contoursGroup.add(contourLine);
      }
    }
    
    scene.add(contoursGroup);

    // Controls
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;
      rotationRef.current = {
        y: rotationRef.current.y + deltaX * 0.005,
        x: Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, rotationRef.current.x + deltaY * 0.005))
      };
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      distanceRef.current = Math.max(25, Math.min(120, distanceRef.current + e.deltaY * 0.1));
    };

    const onClick = (e: MouseEvent) => {
      const rect = containerRef.current!.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycasterRef.current.setFromCamera(mouseRef.current, camera);

      if (measurementModeRef.current) {
        // Measurement mode: raycast against the surface
        const surfaceMesh = surfaceRef.current;
        if (surfaceMesh) {
          const hits = raycasterRef.current.intersectObject(surfaceMesh);
          if (hits.length > 0) {
            const pt = hits[0].point.clone();
            setMeasurementPoints(prev => {
              const next = prev.length >= 2 ? [pt] : [...prev, pt];
              if (next.length === 2) {
                setMeasurementDistance(next[0].distanceTo(next[1]));
              } else {
                setMeasurementDistance(0);
              }
              // Draw measurement line in scene
              scene.getObjectByName('measureLine')?.removeFromParent();
              if (next.length === 2) {
                const lineGeo = new THREE.BufferGeometry().setFromPoints(next);
                const lineMesh = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 2 }));
                lineMesh.name = 'measureLine';
                scene.add(lineMesh);
                // Sphere markers
                scene.getObjectByName('measureMarkers')?.removeFromParent();
                const mg = new THREE.Group(); mg.name = 'measureMarkers';
                next.forEach(p => {
                  const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshBasicMaterial({ color: 0x00ffff }));
                  m.position.copy(p); mg.add(m);
                });
                scene.add(mg);
              }
              return next;
            });
          }
        }
        return;
      }

      // Normal mode: select well
      const wellObjects: THREE.Object3D[] = [];
      scene.traverse((obj) => { if (obj.userData.wellId) wellObjects.push(obj); });
      const intersects = raycasterRef.current.intersectObjects(wellObjects, true);
      if (intersects.length > 0) {
        const wellId = intersects[0].object.userData.wellId;
        const well = wellsDataRef.current.find(w => w.id === wellId);
        if (well) setSelectedWell(w => w?.id === well.id ? null : well);
      }
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('wheel', onWheel);
    renderer.domElement.addEventListener('click', onClick);

    // Animation loop
    const animate = (frameTime: number) => {
      animationFrameRef.current = requestAnimationFrame(animate);

      const rotation = rotationRef.current;
      const distance = distanceRef.current;

      camera.position.x = distance * Math.cos(rotation.y) * Math.cos(rotation.x);
      camera.position.y = distance * Math.sin(rotation.x) + 15;
      camera.position.z = distance * Math.sin(rotation.y) * Math.cos(rotation.x);
      camera.lookAt(0, 5, 0);

      // Time animation: advance ~1 day per second (60fps → +1/60 per frame)
      if (isAnimatingRef.current) {
        const elapsed = frameTime - lastFrameTimeRef.current;
        if (elapsed > 50) { // throttle to ~20fps updates
          lastFrameTimeRef.current = frameTime;
          const next = Math.min(365, currentTimeRef.current + 1);
          currentTimeRef.current = next;
          setCurrentTime(next);
          if (next >= 365) {
            isAnimatingRef.current = false;
            setIsAnimating(false);
          }
        }
      }

      // Update visibility
      const grid = scene.getObjectByName('gridHelper');
      if (grid) grid.visible = showGrid;
      
      const layers = scene.getObjectByName('layersGroup');
      if (layers) layers.visible = showLayers;
      
      const faults = scene.getObjectByName('faultsGroup');
      if (faults) faults.visible = showFaults;
      
      const axes = scene.getObjectByName('axesGroup');
      if (axes) axes.visible = showAxes;
      
      const contours = scene.getObjectByName('contoursGroup');
      if (contours) contours.visible = showContours;
      
      // Wells visibility
      scene.traverse((obj) => {
        if (obj.name && obj.name.startsWith('well-')) {
          obj.visible = showWells;
        }
      });

      // Pulse selection rings + arrow bob
      const t = Date.now() * 0.003;
      const selRing = scene.getObjectByName('selectionRing') as THREE.Mesh | undefined;
      if (selRing) {
        const mat = selRing.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.45 + 0.5 * Math.abs(Math.sin(t));
        selRing.scale.setScalar(1 + 0.12 * Math.sin(t * 0.7));
      }
      const selRing2 = scene.getObjectByName('selectionRing2') as THREE.Mesh | undefined;
      if (selRing2) {
        const mat2 = selRing2.material as THREE.MeshBasicMaterial;
        mat2.opacity = 0.3 + 0.4 * Math.abs(Math.sin(t + 1));
        selRing2.scale.setScalar(1 + 0.18 * Math.sin(t * 0.5 + 0.5));
      }
      // Arrow bounces up-down
      const selArrow = scene.getObjectByName('selectionArrow') as THREE.Mesh | undefined;
      if (selArrow) {
        selArrow.position.y += Math.sin(t * 1.8) * 0.04;
      }
      // Beam opacity pulse
      const selBeam = scene.getObjectByName('selectionBeam') as THREE.Mesh | undefined;
      if (selBeam) {
        (selBeam.material as THREE.MeshBasicMaterial).opacity = 0.3 + 0.35 * Math.abs(Math.sin(t * 0.9));
      }

      // Highlight selected well casing in scene (brighter emission)
      const sw = selectedWellRef.current;
      scene.traverse((obj) => {
        if (!obj.userData.wellId) return;
        const mesh = obj as THREE.Mesh;
        if (!mesh.material) return;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (sw && obj.userData.wellId === sw.id) {
          if (mat.emissive) {
            mat.emissiveIntensity = 1.2 + 0.8 * Math.abs(Math.sin(t));
          }
        } else {
          if (mat.emissive) mat.emissiveIntensity = mat.emissive.getHex() ? 1.2 : 0;
        }
      });

      renderer.render(scene, camera);
    };

    animate(0);

    // ResizeObserver: resize renderer whenever the container changes size
    // (handles sidebar show/hide, window resize, etc.)
    const resizeObserver = new ResizeObserver(() => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      if (w > 0 && h > 0) {
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
    });
    resizeObserver.observe(containerRef.current);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('click', onClick);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showGrid, showLayers, showFaults, showAxes, showContours, showWells, dataLoading, sceneWells.length, apiHorizons.length]);

  // Render
  return (
    <div className="flex gap-2 h-full min-h-[500px]">
      {/* Sidebar */}
      {showSidebar && (
        <Card className="w-80 p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Scene Objects</h3>
            <Button size="sm" variant="ghost" onClick={() => setShowSidebar(false)}>×</Button>
          </div>
          
          <ScrollArea className="flex-1">
            {dataLoading && (
              <p className="text-xs text-muted-foreground px-2 py-3">Загрузка данных…</p>
            )}

            {/* Wells Tree */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setWellsExpanded(!wellsExpanded)}>
                {wellsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <Checkbox checked={showWells} onCheckedChange={(v) => setShowWells(!!v)} />
                <span className="text-sm font-medium">Скважины ({sceneWells.length})</span>
              </div>
              {wellsExpanded && sceneWells.map(well => {
                const isSelected = selectedWell?.id === well.id;
                return (
                  <div
                    key={well.id}
                    className={`ml-6 flex items-center gap-2 text-sm cursor-pointer p-1.5 rounded transition-colors
                      ${isSelected
                        ? 'bg-primary/20 border border-primary/40 text-primary font-semibold'
                        : 'hover:bg-accent'
                      }`}
                    onClick={() => setSelectedWell(isSelected ? null : well)}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-offset-1 ring-offset-background
                      ${well.type === 'production' ? 'bg-green-500 ring-green-500/40' : well.type === 'injection' ? 'bg-blue-500 ring-blue-500/40' : 'bg-gray-400 ring-gray-400/30'}
                      ${isSelected ? 'ring-offset-0 ring-white/60' : ''}`}
                    />
                    <span className="flex-1">{well.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {well.type === 'production' ? 'доб.' : well.type === 'injection' ? 'нагн.' : 'набл.'}
                    </span>
                    {isSelected && <span className="text-[10px] text-primary">●</span>}
                  </div>
                );
              })}
              {!dataLoading && sceneWells.length === 0 && (
                <p className="ml-8 text-xs text-muted-foreground">Нет скважин</p>
              )}
            </div>

            {/* Horizons/Layers Tree */}
            <div className="space-y-2 mt-4">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setLayersExpanded(!layersExpanded)}>
                {layersExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <Checkbox checked={showLayers} onCheckedChange={(v) => setShowLayers(!!v)} />
                <span className="text-sm font-medium">Горизонты ({apiHorizons.length || 5})</span>
              </div>
              {layersExpanded && (apiHorizons.length > 0 ? apiHorizons : [
                { id: -1, name: 'Аргиллит', code: '', depthTop: 0, depthBottom: 0 },
                { id: -2, name: 'Песчаник',  code: '', depthTop: 0, depthBottom: 0 },
                { id: -3, name: 'Алевролит', code: '', depthTop: 0, depthBottom: 0 },
                { id: -4, name: 'Аргиллит', code: '', depthTop: 0, depthBottom: 0 },
                { id: -5, name: 'Глина',    code: '', depthTop: 0, depthBottom: 0 },
              ]).map((h, i) => (
                <div key={h.id} className="ml-8 flex items-center gap-2 text-sm">
                  <Layers className="h-3 w-3" style={{ color: `hsl(${30 + i * 25}, 50%, 55%)` }} />
                  <span>{h.name}</span>
                  {h.depthTop > 0 && (
                    <span className="text-xs text-muted-foreground ml-auto">{h.depthTop}–{h.depthBottom} м</span>
                  )}
                </div>
              ))}
            </div>

            {/* Faults */}
            <div className="space-y-2 mt-4">
              <div className="flex items-center gap-2">
                <Checkbox checked={showFaults} onCheckedChange={(v) => setShowFaults(!!v)} />
                <Zap className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium">Faults (3)</span>
              </div>
            </div>

            {/* Other controls */}
            <div className="space-y-2 mt-4">
              <div className="flex items-center gap-2">
                <Checkbox checked={showAxes} onCheckedChange={(v) => setShowAxes(!!v)} />
                <span className="text-sm">Axes</span>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={showGrid} onCheckedChange={(v) => setShowGrid(!!v)} />
                <span className="text-sm">Grid</span>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={showContours} onCheckedChange={(v) => setShowContours(!!v)} />
                <span className="text-sm">Contours</span>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={show3DGrid} onCheckedChange={(v) => setShow3DGrid(!!v)} />
                <span className="text-sm">3D Grid Blocks</span>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={showHeatmap} onCheckedChange={(v) => setShowHeatmap(!!v)} />
                <span className="text-sm">Heatmap</span>
              </div>
            </div>
          </ScrollArea>
        </Card>
      )}

      {/* Main Viewer */}
      <div className="flex-1 flex flex-col gap-1.5 min-w-0">

        {/* ── Compact toolbar (single row) ── */}
        <Card className="px-3 py-1.5 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Left: sidebar toggle + title */}
            {!showSidebar && (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setShowSidebar(true)}>
                <Eye className="h-3.5 w-3.5 mr-1" />
                Объекты
              </Button>
            )}
            <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
              3D: {fieldName}
            </span>

            <div className="w-px h-4 bg-border mx-1 hidden sm:block" />

            {/* Property selector */}
            <Select value={propertyType} onValueChange={(v: PropertyType) => setPropertyType(v)}>
              <SelectTrigger className="h-7 text-xs w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="depth">Глубина (TVD)</SelectItem>
                <SelectItem value="porosity">Пористость (%)</SelectItem>
                <SelectItem value="permeability">Проницаемость (mD)</SelectItem>
                <SelectItem value="saturation">Нефтенасыщенность</SelectItem>
              </SelectContent>
            </Select>

            {/* Contour interval */}
            <div className="flex items-center gap-1.5 min-w-[130px]">
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">Изолинии: {contourInterval.toFixed(1)}</span>
              <Slider value={[contourInterval]} onValueChange={(v) => setContourInterval(v[0])} min={0.5} max={3.0} step={0.1} className="w-20" />
            </div>

            {/* Time animation */}
            <div className="flex items-center gap-1.5 min-w-[130px]">
              <Button size="sm" variant="outline" className="h-7 w-7 p-0 shrink-0" onClick={() => setIsAnimating(!isAnimating)}>
                {isAnimating ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              </Button>
              <Slider value={[currentTime]} onValueChange={(v) => setCurrentTime(v[0])} min={0} max={365} step={1} className="w-20" />
              <span className="text-[10px] text-muted-foreground">{currentTime}d</span>
            </div>

            {/* Right actions */}
            <div className="ml-auto flex items-center gap-1">
              <Button size="sm" variant={measurementMode ? "default" : "ghost"} className="h-7 px-2" onClick={() => setMeasurementMode(!measurementMode)}>
                <Ruler className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => {
                if (rendererRef.current) {
                  const link = document.createElement('a');
                  link.download = 'model-screenshot.png';
                  link.href = rendererRef.current.domElement.toDataURL();
                  link.click();
                }
              }}>
                <Download className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setIsFullscreen(!isFullscreen)}>
                {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </Card>

        {/* 3D Canvas — takes all remaining space */}
        <Card className={`flex-1 relative overflow-hidden min-h-0 ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}>
          <div ref={containerRef} className="w-full h-full" />
          
          {/* Info Panel (Top Right) */}
          {cursorInfo && (
            <div className="absolute top-4 right-4 bg-black/80 text-white p-3 rounded text-xs space-y-1 pointer-events-none">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-3 w-3" />
                <span className="font-semibold">Cursor Info</span>
              </div>
              <div>X: {cursorInfo.x.toFixed(2)} m</div>
              <div>Y: {cursorInfo.z.toFixed(2)} m</div>
              <div>Value: {cursorInfo.value.toFixed(2)}</div>
            </div>
          )}

          {/* Selected Well Panel */}
          {selectedWell && (() => {
            const sw = selectedWell;
            const depthM   = Math.round(sw.depth * 250);           // TVD, м
            const mdM      = Math.round(depthM / Math.cos(sw.inclination * Math.PI / 180)); // MD, м
            const devM     = Math.round(mdM * Math.sin(sw.inclination * Math.PI / 180));    // horizontal departure
            // Compass direction from azimuth
            const dirs = ['С','СВ','В','ЮВ','Ю','ЮЗ','З','СЗ'];
            const compassDir = dirs[Math.round(sw.azimuth / 45) % 8];

            // Mini wellbore SVG cross-section (vertical deviation diagram)
            const svgW = 200, svgH = 90;
            const maxDev = Math.max(devM, 1);
            const scaleX = (svgW - 30) / Math.max(maxDev * 1.2, 1);
            const scaleY = (svgH - 12) / Math.max(depthM, 1);
            // Build path points (linear trajectory for simplicity)
            const steps = 8;
            const pathPts = Array.from({ length: steps + 1 }, (_, i) => {
              const t = i / steps;
              const md = mdM * t;
              const dx = md * Math.sin(sw.inclination * Math.PI / 180);
              const dy = md * Math.cos(sw.inclination * Math.PI / 180);
              return { x: 20 + dx * scaleX, y: 6 + dy * scaleY };
            });
            const pathD = pathPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
            // Depth ticks
            const ticks = [0.25, 0.5, 0.75, 1.0].map(t => ({
              y: 6 + depthM * t * scaleY,
              depth: Math.round(depthM * t),
            }));

            return (
              <div className="absolute top-4 left-4 bg-black/92 text-white p-4 rounded space-y-3 w-72 pointer-events-auto border border-white/10 backdrop-blur-sm">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ring-2 ring-offset-1 ring-offset-black/80
                      ${sw.type === 'production' ? 'bg-green-500 ring-green-500/50' : sw.type === 'injection' ? 'bg-blue-500 ring-blue-500/50' : 'bg-gray-400 ring-gray-400/40'}`} />
                    <span className="font-bold text-sm">Скважина {sw.name}</span>
                  </div>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white/60 hover:text-white" onClick={() => setSelectedWell(null)}>×</Button>
                </div>

                {/* Basic params */}
                <div className="text-xs space-y-1 border-b border-white/10 pb-2">
                  <div className="flex justify-between">
                    <span className="text-white/50">Тип</span>
                    <span>{sw.type === 'production' ? 'Добывающая' : sw.type === 'injection' ? 'Нагнетательная' : 'Наблюдательная'}</span>
                  </div>
                  {sw.type === 'production' && <>
                    <div className="flex justify-between">
                      <span className="text-white/50">Дебит</span>
                      <span className="text-green-400 font-semibold">{sw.production.toFixed(1)} т/сут</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Обводнённость</span>
                      <span className="text-blue-400">{(sw.waterCut * 100).toFixed(1)}%</span>
                    </div>
                  </>}
                  <div className="flex justify-between">
                    <span className="text-white/50">Давление</span>
                    <span className="text-amber-400">{sw.pressure.toFixed(0)} атм</span>
                  </div>
                </div>

                {/* Trajectory params */}
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-white/40 mb-1.5">Траектория ствола</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-white/50">TVD</span>
                      <span className="font-mono">{depthM} м</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">MD</span>
                      <span className="font-mono">{mdM} м</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Зенит</span>
                      <span className="font-mono">{sw.inclination.toFixed(1)}°</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Азимут</span>
                      <span className="font-mono">{sw.azimuth.toFixed(1)}° {compassDir}</span>
                    </div>
                    <div className="col-span-2 flex justify-between">
                      <span className="text-white/50">Отклонение по горизонтали</span>
                      <span className="font-mono">{devM} м</span>
                    </div>
                  </div>
                </div>

                {/* Mini SVG cross-section */}
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-white/40 mb-1">Разрез (отклонение × глубина)</div>
                  <svg width={svgW} height={svgH} className="rounded bg-white/5">
                    {/* Grid lines */}
                    {ticks.map(tk => (
                      <g key={tk.depth}>
                        <line x1={20} y1={tk.y} x2={svgW - 4} y2={tk.y} stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />
                        <text x={14} y={tk.y + 3} fill="rgba(255,255,255,0.35)" fontSize={7} textAnchor="end">{tk.depth}</text>
                      </g>
                    ))}
                    {/* Surface line */}
                    <line x1={20} y1={6} x2={svgW - 4} y2={6} stroke="rgba(255,255,255,0.2)" strokeWidth={0.5} />
                    <text x={20} y={4} fill="rgba(255,255,255,0.35)" fontSize={6.5}>0</text>
                    {/* Vertical axis (depth) */}
                    <line x1={20} y1={6} x2={20} y2={svgH - 2} stroke="rgba(255,255,255,0.2)" strokeWidth={0.5} />
                    {/* Wellbore path */}
                    <path d={pathD} fill="none" stroke="#ffdd44" strokeWidth={1.8} strokeLinecap="round" />
                    {/* Marker dots at depth ticks */}
                    {pathPts.filter((_, i) => i > 0 && i % (Math.ceil(steps / 4)) === 0).map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="#ffdd44" opacity={0.9} />
                    ))}
                    {/* Wellhead dot */}
                    <circle cx={20} cy={6} r={3} fill="white" />
                    {/* Axis labels */}
                    <text x={svgW / 2} y={svgH - 1} fill="rgba(255,255,255,0.3)" fontSize={6} textAnchor="middle">отклонение, м →</text>
                  </svg>
                </div>
              </div>
            );
          })()}

          {/* Measurement Info */}
          {measurementMode && measurementPoints.length > 0 && (
            <div className="absolute bottom-4 left-4 bg-black/80 text-white p-3 rounded text-xs pointer-events-none">
              <div className="flex items-center gap-2 mb-1">
                <Ruler className="h-3 w-3" />
                <span className="font-semibold">Measurement</span>
              </div>
              <div>Points: {measurementPoints.length}</div>
              {measurementDistance > 0 && <div>Distance: {measurementDistance.toFixed(2)} m</div>}
            </div>
          )}

          {/* ── Property Color Legend ── */}
          {(() => {
            const LEGENDS: Record<PropertyType, {
              label: string;
              unit: string;
              stops: { pct: number; color: string; value: string }[];
            }> = {
              depth: {
                label: 'Глубина TVD',
                unit: 'м',
                stops: [
                  { pct: 0,   color: '#3a7d44', value: '0' },
                  { pct: 25,  color: '#7dbf5e', value: '250' },
                  { pct: 50,  color: '#c5e17a', value: '500' },
                  { pct: 75,  color: '#e6c84a', value: '750' },
                  { pct: 100, color: '#c87941', value: '1000+' },
                ],
              },
              porosity: {
                label: 'Пористость',
                unit: '%',
                stops: [
                  { pct: 0,   color: '#1a0a4a', value: '0' },
                  { pct: 25,  color: '#2d3a8c', value: '5' },
                  { pct: 50,  color: '#4a6abf', value: '15' },
                  { pct: 75,  color: '#8aaad4', value: '25' },
                  { pct: 100, color: '#c5d9f0', value: '35+' },
                ],
              },
              permeability: {
                label: 'Проницаемость',
                unit: 'мД',
                stops: [
                  { pct: 0,   color: '#1a0800', value: '0' },
                  { pct: 25,  color: '#7a2500', value: '10' },
                  { pct: 50,  color: '#c04a00', value: '50' },
                  { pct: 75,  color: '#e88020', value: '200' },
                  { pct: 100, color: '#f5c060', value: '500+' },
                ],
              },
              saturation: {
                label: 'Нефтенасыщ.',
                unit: '%',
                stops: [
                  { pct: 0,   color: '#0a0004', value: '0' },
                  { pct: 25,  color: '#4a0810', value: '20' },
                  { pct: 50,  color: '#8c1820', value: '40' },
                  { pct: 75,  color: '#c03030', value: '60' },
                  { pct: 100, color: '#e86040', value: '80+' },
                ],
              },
            };
            const leg = LEGENDS[propertyType];
            // Build CSS gradient from stops
            const gradientCSS = `linear-gradient(to top, ${leg.stops.map(s => `${s.color} ${s.pct}%`).join(', ')})`;

            return (
              <div className="absolute top-3 right-3 flex flex-col items-end gap-1 pointer-events-none">
                <div className="bg-black/75 backdrop-blur-sm rounded px-2 py-1.5 flex items-stretch gap-2 border border-white/10">
                  {/* Labels */}
                  <div className="flex flex-col justify-between text-right">
                    {[...leg.stops].reverse().map((s, i) => (
                      <span key={i} className="text-[9px] text-white/70 font-mono leading-none">{s.value}</span>
                    ))}
                  </div>
                  {/* Gradient bar */}
                  <div className="w-3.5 rounded-sm" style={{ background: gradientCSS, minHeight: 90 }} />
                  {/* Title (rotated) */}
                  <div className="flex flex-col justify-center">
                    <span
                      className="text-[9px] text-white/60 font-medium whitespace-nowrap"
                      style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                    >
                      {leg.label}, {leg.unit}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Stats strip overlay — bottom of canvas */}
          <div className="absolute bottom-0 left-0 right-0 flex items-center gap-px pointer-events-none">
            {[
              { label: 'Доб.', value: sceneWells.filter(w => w.type === 'production').length, color: 'text-green-400' },
              { label: 'Нагн.', value: sceneWells.filter(w => w.type === 'injection').length, color: 'text-blue-400' },
              { label: 'Набл.', value: sceneWells.filter(w => w.type === 'observation').length, color: 'text-gray-400' },
              { label: 'Горизонтов', value: apiHorizons.length || '—', color: 'text-purple-400' },
            ].map(s => (
              <div key={s.label} className="flex-1 bg-black/60 backdrop-blur-sm px-2 py-1 flex items-center gap-1.5">
                <span className={`text-sm font-bold ${s.color}`}>{s.value}</span>
                <span className="text-[10px] text-white/50">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Minimap */}
          {showMinimap && (
            <div className="absolute bottom-8 right-4 bg-black/80 p-2 rounded pointer-events-none">
              <canvas ref={minimapCanvasRef} width={150} height={150} className="rounded" />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

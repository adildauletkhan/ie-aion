import { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Maximize2, X } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

/* ═══════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════ */
export type WellPumpType = "sgn" | "ecn";

interface Props {
  wellName: string;
  pumpType: WellPumpType;
}

interface Pt { x: number; y: number }

interface DynCard {
  id: string;
  label: string;
  date: string;
  strokeColor: string;
  fillColor: string;
  strokeDash?: string;
  up: Pt[];   // upstroke   x=position(m), y=load(kN)
  dn: Pt[];   // downstroke
}

interface QHCard {
  id: string;
  label: string;
  date: string;
  strokeColor: string;
  strokeDash?: string;
  pts: Pt[];  // x=Q (м³/сут), y=H (м)
}

/* ═══════════════════════════════════════════════════════
   MOCK DATA — SGN dynogram cards (load kN vs stroke m)
═══════════════════════════════════════════════════════ */
const REF_UP: Pt[] = [
  {x:0.00,y:16.0},{x:0.22,y:16.1},{x:0.38,y:16.9},
  {x:0.48,y:26.5},{x:0.56,y:44.0},{x:0.64,y:58.0},
  {x:0.72,y:63.5},{x:0.92,y:64.8},{x:1.40,y:65.5},
  {x:2.00,y:66.0},{x:2.60,y:66.5},{x:3.10,y:67.2},
  {x:3.42,y:67.8},{x:3.60,y:68.0},
];
const REF_DN: Pt[] = [
  {x:3.60,y:68.0},{x:3.55,y:66.8},{x:3.49,y:56.0},
  {x:3.43,y:34.5},{x:3.37,y:20.5},{x:3.28,y:17.8},
  {x:3.10,y:17.2},{x:2.60,y:17.0},{x:2.00,y:16.8},
  {x:1.40,y:16.5},{x:0.90,y:16.3},{x:0.40,y:16.1},
  {x:0.00,y:16.0},
];

// Gas-interference card — delayed load pickup
const GAS_UP: Pt[] = [
  {x:0.00,y:16.0},{x:0.25,y:16.1},{x:0.55,y:16.5},
  {x:0.85,y:17.5},{x:1.10,y:19.5},{x:1.28,y:24.5},
  {x:1.44,y:34.0},{x:1.55,y:45.5},{x:1.65,y:54.0},
  {x:1.76,y:58.8},{x:1.92,y:60.6},{x:2.20,y:61.6},
  {x:2.72,y:62.6},{x:3.12,y:63.2},{x:3.42,y:63.8},
  {x:3.60,y:64.0},
];
const GAS_DN: Pt[] = [
  {x:3.60,y:64.0},{x:3.55,y:62.5},{x:3.47,y:46.0},
  {x:3.41,y:26.5},{x:3.35,y:19.5},{x:3.27,y:17.5},
  {x:3.10,y:16.9},{x:2.60,y:16.5},{x:2.00,y:16.2},
  {x:1.40,y:16.1},{x:0.80,y:16.0},{x:0.30,y:16.0},
  {x:0.00,y:16.0},
];

const SGN_CARDS: DynCard[] = [
  {
    id: "ref", label: "Эталонная", date: "01.09.2024",
    strokeColor: "#3b82f6", fillColor: "rgba(59,130,246,0.07)",
    strokeDash: "6,3",
    up: REF_UP, dn: REF_DN,
  },
  {
    id: "cur", label: "Текущая", date: "14.02.2026",
    strokeColor: "#f59e0b", fillColor: "rgba(245,158,11,0.10)",
    up: GAS_UP, dn: GAS_DN,
  },
];

/* ═══════════════════════════════════════════════════════
   MOCK DATA — ECN Q-H curves (Q м³/сут  vs  H м)
═══════════════════════════════════════════════════════ */
const ECN_NOMINAL: QHCard = {
  id: "nom", label: "Паспортная", date: "—",
  strokeColor: "#3b82f6", strokeDash: "6,3",
  pts: [
    {x:0,y:920},{x:20,y:896},{x:40,y:862},{x:60,y:816},
    {x:80,y:752},{x:100,y:670},{x:120,y:564},{x:130,y:497},
  ],
};
const ECN_ACTUAL: QHCard = {
  id: "act", label: "Рабочая", date: "14.02.2026",
  strokeColor: "#22c55e",
  pts: [
    {x:0,y:874},{x:20,y:852},{x:40,y:818},{x:60,y:772},
    {x:80,y:708},{x:100,y:626},{x:115,y:534},
  ],
};
const ECN_OP: Pt = {x: 78.5, y: 724}; // operating point

/* ═══════════════════════════════════════════════════════
   TELEMETRY / REPAIRS DATA
═══════════════════════════════════════════════════════ */
const TELEMETRY: Record<string, {label:string; value:string; unit:string; status?:"ok"|"warn"|"alert"}[]> = {
  sgn: [
    {label:"Нагрузка макс",   value:"68.4", unit:"кН",       status:"ok"},
    {label:"Нагрузка мин",    value:"24.1", unit:"кН",       status:"ok"},
    {label:"Число качаний",   value:"5.2",  unit:"кач/мин",  status:"ok"},
    {label:"Ток двигателя",   value:"18.6", unit:"А",        status:"warn"},
    {label:"Дебит жидкости",  value:"42.3", unit:"м³/сут",   status:"ok"},
    {label:"Обводнённость",   value:"74",   unit:"%",        status:"warn"},
    {label:"УДЖ",             value:"312",  unit:"м",        status:"ok"},
    {label:"Наработка",       value:"187",  unit:"сут",      status:"ok"},
  ],
  ecn: [
    {label:"Ток ПЭД",         value:"32.4", unit:"А",        status:"ok"},
    {label:"Напряжение",      value:"1124", unit:"В",        status:"ok"},
    {label:"Частота",         value:"50.0", unit:"Гц",       status:"ok"},
    {label:"Дебит жидкости",  value:"78.5", unit:"м³/сут",   status:"ok"},
    {label:"Обводнённость",   value:"61",   unit:"%",        status:"warn"},
    {label:"Приём. давление", value:"6.4",  unit:"МПа",      status:"ok"},
    {label:"Темп. двигателя", value:"84",   unit:"°C",       status:"alert"},
    {label:"Наработка",       value:"94",   unit:"сут",      status:"ok"},
  ],
};

const REPAIRS = [
  {date:"2024-11-08", type:"КРС", desc:"Замена насоса ШГН НВ 1-44-18. Подняты штанги и НКТ, спущен новый насос.", exec:"бригада №3"},
  {date:"2024-06-14", type:"ПРС", desc:"Смазка устьевого оборудования, замена сальника, регулировка цепной передачи.", exec:"бригада №7"},
  {date:"2023-12-01", type:"КРС", desc:"Ликвидация обрыва штанговой колонны на глубине 680 м. Подъём и спуск полного комплекта.", exec:"бригада №2"},
  {date:"2023-05-17", type:"ПРС", desc:"Промывка скважины, чистка НКТ от АСПО.", exec:"бригада №5"},
  {date:"2022-09-23", type:"КРС", desc:"Смена обсадных труб на участке 440–520 м. Ремонт цементного кольца.", exec:"бригада №1"},
];

/* ═══════════════════════════════════════════════════════
   MATH HELPERS
═══════════════════════════════════════════════════════ */
function catmull(pts: Pt[], px:(v:number)=>number, py:(v:number)=>number, alpha=0.4): string {
  if (pts.length < 2) return "";
  let d = `M ${px(pts[0].x).toFixed(1)} ${py(pts[0].y).toFixed(1)}`;
  const n = pts.length;
  for (let i = 0; i < n - 1; i++) {
    const p0=pts[Math.max(0,i-1)], p1=pts[i], p2=pts[i+1], p3=pts[Math.min(n-1,i+2)];
    d += ` C ${px(p1.x+(p2.x-p0.x)*alpha/3).toFixed(1)} ${py(p1.y+(p2.y-p0.y)*alpha/3).toFixed(1)} `
       + `${px(p2.x-(p3.x-p1.x)*alpha/3).toFixed(1)} ${py(p2.y-(p3.y-p1.y)*alpha/3).toFixed(1)} `
       + `${px(p2.x).toFixed(1)} ${py(p2.y).toFixed(1)}`;
  }
  return d;
}

function closedFill(up:Pt[], dn:Pt[], px:(v:number)=>number, py:(v:number)=>number): string {
  const upPath = catmull(up, px, py);
  const rest = dn.slice(1).map(p=>`L ${px(p.x).toFixed(1)} ${py(p.y).toFixed(1)}`).join(" ");
  return upPath + " " + rest + " Z";
}

function interpY(pts: Pt[], x: number): number | null {
  for (let i = 0; i < pts.length - 1; i++) {
    const a=pts[i], b=pts[i+1];
    const lo=Math.min(a.x,b.x), hi=Math.max(a.x,b.x);
    if (x >= lo && x <= hi) {
      const t = hi===lo ? 0 : (x-a.x)/(b.x-a.x);
      return a.y + t*(b.y-a.y);
    }
  }
  return null;
}

/* ═══════════════════════════════════════════════════════
   CHART SIZE DESCRIPTOR
═══════════════════════════════════════════════════════ */
interface ChartSize { w:number; h:number; pL:number; pR:number; pT:number; pB:number }

const COMPACT:  ChartSize = {w:290, h:178, pL:34, pR:12, pT:12, pB:26};
const EXPANDED: ChartSize = {w:580, h:350, pL:52, pR:24, pT:22, pB:40};

/* ═══════════════════════════════════════════════════════
   SGN DYNOGRAM CHART
═══════════════════════════════════════════════════════ */
function SgnChart({cards, size, crosshair=false}:{cards:DynCard[]; size:ChartSize; crosshair?:boolean}) {
  const { t } = useLanguage();
  const {w,h,pL,pR,pT,pB}=size;
  const iW=w-pL-pR, iH=h-pT-pB;
  const xMin=0, xMax=3.6, yMin=0, yMax=80;
  const px = (v:number)=>pL+(v-xMin)/(xMax-xMin)*iW;
  const py = (v:number)=>pT+iH-(v-yMin)/(yMax-yMin)*iH;
  const ipx= (s:number)=>xMin+(s-pL)/iW*(xMax-xMin);
  const ipy= (s:number)=>yMin+(pT+iH-s)/iH*(yMax-yMin);

  const [ch, setCh] = useState<{sx:number;sy:number;fx:number;fy:number}|null>(null);

  const onMove = useCallback((e:React.MouseEvent<SVGSVGElement>)=>{
    if (!crosshair) return;
    const r = e.currentTarget.getBoundingClientRect();
    const sx=(e.clientX-r.left)*(w/r.width);
    const sy=(e.clientY-r.top)*(h/r.height);
    const fx=ipx(sx), fy=ipy(sy);
    if (fx>=xMin&&fx<=xMax&&fy>=yMin&&fy<=yMax) setCh({sx,sy,fx,fy});
    else setCh(null);
  },[crosshair, ipx, ipy, w, h, xMin, xMax, yMin, yMax]);

  const yTicks = h>200 ? [0,20,40,60,80] : [0,40,80];
  const xTicks = h>200 ? [0,0.9,1.8,2.7,3.6] : [0,1.8,3.6];
  const fontSize = h>200 ? 10 : 8.5;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}
      style={{display:"block", width:"100%", height:"auto"}}
      onMouseMove={onMove} onMouseLeave={()=>setCh(null)}
    >
      {/* plot bg */}
      <rect x={pL} y={pT} width={iW} height={iH} fill="transparent" rx="2"/>

      {/* grid */}
      {yTicks.map(v=>{
        const y=py(v);
        return <g key={`yg${v}`}>
          <line x1={pL} y1={y} x2={pL+iW} y2={y} stroke="rgba(148,163,184,0.3)" strokeWidth="0.75"/>
          <text x={pL-4} y={y+3.5} fontSize={fontSize} fill="currentColor" fillOpacity="0.45" textAnchor="end">{v}</text>
        </g>;
      })}
      {xTicks.map(v=>{
        const x=px(v);
        return <g key={`xg${v}`}>
          <line x1={x} y1={pT} x2={x} y2={pT+iH} stroke="rgba(148,163,184,0.3)" strokeWidth="0.75"/>
          <text x={x} y={pT+iH+(h>200?14:11)} fontSize={fontSize} fill="currentColor" fillOpacity="0.45" textAnchor="middle">{v.toFixed(1)}</text>
        </g>;
      })}

      {/* axes */}
      <line x1={pL} y1={pT} x2={pL} y2={pT+iH} stroke="rgba(148,163,184,0.6)" strokeWidth="1"/>
      <line x1={pL} y1={pT+iH} x2={pL+iW} y2={pT+iH} stroke="rgba(148,163,184,0.6)" strokeWidth="1"/>

      {/* axis labels (expanded only) */}
      {h>200&&<>
        <text x={pL-36} y={pT+iH/2} fontSize="10" fill="currentColor" fillOpacity="0.5" textAnchor="middle"
          transform={`rotate(-90,${pL-36},${pT+iH/2})`}>{t("wellPanel_loadAxis")}</text>
        <text x={pL+iW/2} y={h-4} fontSize="10" fill="currentColor" fillOpacity="0.5" textAnchor="middle">{t("wellPanel_strokeAxis")}</text>
      </>}

      {/* fills */}
      {cards.map(c=>(
        <path key={`f${c.id}`} d={closedFill(c.up,c.dn,px,py)} fill={c.fillColor} stroke="none"/>
      ))}

      {/* strokes */}
      {cards.map(c=>{
        const sw = h>200?2:1.6;
        return <g key={`s${c.id}`}>
          <path d={catmull(c.up,px,py)} fill="none" stroke={c.strokeColor}
            strokeWidth={sw} strokeDasharray={c.strokeDash} strokeLinejoin="round"/>
          <path d={catmull(c.dn,px,py)} fill="none" stroke={c.strokeColor}
            strokeWidth={sw} strokeDasharray={c.strokeDash} strokeLinejoin="round"/>
        </g>;
      })}

      {/* crosshair */}
      {crosshair && ch && (()=>{
        const tipW=148, tipH= 4+12+cards.length*2*11+4;
        const tipX = ch.sx+10+tipW > pL+iW ? ch.sx-10-tipW : ch.sx+10;
        const tipY = ch.sy-8-tipH < pT ? ch.sy+8 : ch.sy-8-tipH;
        const upLoads = cards.map(c=>({c, v:interpY(c.up, ch.fx)}));
        const dnLoads = cards.map(c=>({c, v:interpY(c.dn, ch.fx)}));
        let row=0;
        return <>
          <line x1={ch.sx} y1={pT} x2={ch.sx} y2={pT+iH} stroke="#475569" strokeWidth="0.7" strokeDasharray="4,3"/>
          <line x1={pL} y1={ch.sy} x2={pL+iW} y2={ch.sy} stroke="#475569" strokeWidth="0.7" strokeDasharray="4,3"/>
          <circle cx={ch.sx} cy={ch.sy} r="3" fill="#475569" opacity="0.45"/>
          <rect x={tipX} y={tipY} width={tipW} height={tipH} rx="5" fill="rgba(15,23,42,0.88)"/>
          <text x={tipX+8} y={tipY+14} fontSize="9.5" fill="#94a3b8">
            x = {ch.fx.toFixed(2)} м
          </text>
          {upLoads.map(({c,v})=>{
            if (v==null) return null;
            const y = tipY+14+12+(row++)*11;
            return <text key={`tu${c.id}`} x={tipX+8} y={y} fontSize="9" fill={c.strokeColor}>
              ↑ {c.label}: {v.toFixed(1)} кН
            </text>;
          })}
          {dnLoads.map(({c,v})=>{
            if (v==null) return null;
            const y = tipY+14+12+(row++)*11;
            return <text key={`td${c.id}`} x={tipX+8} y={y} fontSize="9" fill={c.strokeColor}>
              ↓ {c.label}: {v.toFixed(1)} кН
            </text>;
          })}
        </>;
      })()}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════
   ECN Q-H CHART
═══════════════════════════════════════════════════════ */
function QHChart({nominal, actual, opPt, size, crosshair=false}:{
  nominal:QHCard; actual:QHCard; opPt:Pt; size:ChartSize; crosshair?:boolean
}) {
  const { t, translateData } = useLanguage();
  const {w,h,pL,pR,pT,pB}=size;
  const iW=w-pL-pR, iH=h-pT-pB;
  const xMin=0, xMax=140, yMin=400, yMax=960;
  const px=(v:number)=>pL+(v-xMin)/(xMax-xMin)*iW;
  const py=(v:number)=>pT+iH-(v-yMin)/(yMax-yMin)*iH;
  const ipx=(s:number)=>xMin+(s-pL)/iW*(xMax-xMin);
  const ipy=(s:number)=>yMin+(pT+iH-s)/iH*(yMax-yMin);

  const [ch,setCh]=useState<{sx:number;sy:number;fx:number;fy:number}|null>(null);
  const onMove=useCallback((e:React.MouseEvent<SVGSVGElement>)=>{
    if (!crosshair) return;
    const r=e.currentTarget.getBoundingClientRect();
    const sx=(e.clientX-r.left)*(w/r.width);
    const sy=(e.clientY-r.top)*(h/r.height);
    const fx=ipx(sx), fy=ipy(sy);
    if (fx>=xMin&&fx<=xMax&&fy>=yMin&&fy<=yMax) setCh({sx,sy,fx,fy});
    else setCh(null);
  },[crosshair, ipx, ipy, w, h, xMin, xMax, yMin, yMax]);

  const yTicks = h>200 ? [400,560,720,880] : [400,660,920];
  const xTicks = h>200 ? [0,35,70,105,140] : [0,70,140];
  const fontSize=h>200?10:8.5;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}
      style={{display:"block", width:"100%", height:"auto"}}
      onMouseMove={onMove} onMouseLeave={()=>setCh(null)}
    >
      <rect x={pL} y={pT} width={iW} height={iH} fill="transparent" rx="2"/>
      {yTicks.map(v=>{
        const y=py(v);
        return <g key={`yg${v}`}>
          <line x1={pL} y1={y} x2={pL+iW} y2={y} stroke="rgba(148,163,184,0.3)" strokeWidth="0.75"/>
          <text x={pL-4} y={y+3.5} fontSize={fontSize} fill="currentColor" fillOpacity="0.45" textAnchor="end">{v}</text>
        </g>;
      })}
      {xTicks.map(v=>{
        const x=px(v);
        return <g key={`xg${v}`}>
          <line x1={x} y1={pT} x2={x} y2={pT+iH} stroke="rgba(148,163,184,0.3)" strokeWidth="0.75"/>
          <text x={x} y={pT+iH+(h>200?14:11)} fontSize={fontSize} fill="currentColor" fillOpacity="0.45" textAnchor="middle">{v}</text>
        </g>;
      })}
      <line x1={pL} y1={pT} x2={pL} y2={pT+iH} stroke="rgba(148,163,184,0.6)" strokeWidth="1"/>
      <line x1={pL} y1={pT+iH} x2={pL+iW} y2={pT+iH} stroke="rgba(148,163,184,0.6)" strokeWidth="1"/>
      {h>200&&<>
        <text x={pL-38} y={pT+iH/2} fontSize="10" fill="currentColor" fillOpacity="0.5" textAnchor="middle"
          transform={`rotate(-90,${pL-38},${pT+iH/2})`}>{t("wellPanel_headAxis")}</text>
        <text x={pL+iW/2} y={h-4} fontSize="10" fill="currentColor" fillOpacity="0.5" textAnchor="middle">{t("wellPanel_flowAxis")}</text>
      </>}

      {/* curves */}
      {[nominal, actual].map(c=>(
        <path key={c.id} d={catmull(c.pts,px,py)} fill="none"
          stroke={c.strokeColor} strokeWidth={h>200?2:1.6}
          strokeDasharray={c.strokeDash} strokeLinejoin="round"/>
      ))}

      {/* operating point */}
      <circle cx={px(opPt.x)} cy={py(opPt.y)} r={h>200?7:5}
        fill="none" stroke="#ef4444" strokeWidth="1.8"/>
      <circle cx={px(opPt.x)} cy={py(opPt.y)} r={h>200?3:2}
        fill="#ef4444"/>
      {h>200&&<>
        <line x1={px(opPt.x)} y1={py(opPt.y)} x2={px(opPt.x)} y2={pT+iH}
          stroke="#ef4444" strokeWidth="0.8" strokeDasharray="4,3"/>
        <line x1={pL} y1={py(opPt.y)} x2={px(opPt.x)} y2={py(opPt.y)}
          stroke="#ef4444" strokeWidth="0.8" strokeDasharray="4,3"/>
        <text x={px(opPt.x)+8} y={py(opPt.y)-6} fontSize="9.5" fill="#ef4444">
          Q={opPt.x} м³/сут
        </text>
        <text x={px(opPt.x)+8} y={py(opPt.y)+6} fontSize="9.5" fill="#ef4444">
          H={opPt.y} м
        </text>
      </>}

      {/* crosshair */}
      {crosshair && ch && (() => {
        const nomH = interpY(nominal.pts, ch.fx);
        const actH = interpY(actual.pts, ch.fx);
        const tipW=130, tipH=54;
        const tipX=ch.sx+10+tipW>pL+iW ? ch.sx-10-tipW : ch.sx+10;
        const tipY=ch.sy-8-tipH<pT ? ch.sy+8 : ch.sy-8-tipH;
        return <>
          <line x1={ch.sx} y1={pT} x2={ch.sx} y2={pT+iH} stroke="#475569" strokeWidth="0.7" strokeDasharray="4,3"/>
          <line x1={pL} y1={ch.sy} x2={pL+iW} y2={ch.sy} stroke="#475569" strokeWidth="0.7" strokeDasharray="4,3"/>
          <circle cx={ch.sx} cy={ch.sy} r="3" fill="#475569" opacity="0.45"/>
          <rect x={tipX} y={tipY} width={tipW} height={tipH} rx="5" fill="rgba(15,23,42,0.88)"/>
          <text x={tipX+8} y={tipY+14} fontSize="9.5" fill="#94a3b8">Q = {ch.fx.toFixed(0)} м³/сут</text>
          {nomH!=null&&<text x={tipX+8} y={tipY+27} fontSize="9" fill={nominal.strokeColor}>{translateData("Паспорт")}: {nomH.toFixed(0)} м</text>}
          {actH!=null&&<text x={tipX+8} y={tipY+40} fontSize="9" fill={actual.strokeColor}>{translateData("Рабочая")}: {actH.toFixed(0)} м</text>}
        </>;
      })()}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════
   DYNOGRAM MODAL
═══════════════════════════════════════════════════════ */
function DynogramModal({wellName, pumpType, onClose}:{
  wellName:string; pumpType:WellPumpType; onClose:()=>void
}) {
  const { t, translateData } = useLanguage();
  const isSgn = pumpType === "sgn";
  const isEvn = pumpType === "evn";

  const diagnosis = isSgn
    ? {
        severity: "warn" as const,
        title:  "Диагноз: влияние газа",
        detail: "Текущая карта показывает характерное «проседание» на восходящем ходе — признак захвата газа насосом. Площадь карты на ~18% меньше эталонной, что свидетельствует о снижении коэффициента наполнения.",
        rec:    "Снизить число качаний до 4 кач/мин. Проверить работу газового якоря. Рассмотреть промывку НКТ и замену клапанных пар.",
      }
    : {
        severity: "ok" as const,
        title:  "Характеристика: норма",
        detail: "Рабочая точка насоса находится в оптимальной зоне характеристики (Q=78.5 м³/сут, H=724 м). КПД ≈ 62%. Отклонение от паспортной кривой в пределах допустимого.",
        rec:    "Поддерживать текущий режим. Следующее контрольное снятие характеристики — 01.04.2026.",
      };

  const sgnStats = [
    {label:"Нагрузка макс",   ref:"68.0 кН",   cur:"63.8 кН", delta:"-6.2%",  bad:true },
    {label:"Нагрузка мин",    ref:"16.0 кН",   cur:"16.0 кН", delta:"0%",     bad:false},
    {label:"Площадь карты",   ref:"100%",       cur:"82%",     delta:"−18%",   bad:true },
    {label:"Ход штока",       ref:"3.6 м",      cur:"3.6 м",   delta:"0%",     bad:false},
  ];
  const ecnStats = [
    {label:"Дебит рабочий",   ref:"80 м³/сут",  cur:"78.5 м³/сут", delta:"−1.9%", bad:false},
    {label:"Напор рабочий",   ref:"752 м",       cur:"724 м",       delta:"−3.7%", bad:false},
    {label:"КПД насоса",      ref:"64%",         cur:"62%",         delta:"−2%",   bad:false},
  ];
  const evnStats = [
    {label:"Дебит рабочий",   ref:"50 м³/сут",  cur:"48.2 м³/сут", delta:"−3.6%", bad:false},
    {label:"Напор рабочий",   ref:"700 м",       cur:"670 м",       delta:"−4.3%", bad:false},
    {label:"КПД насоса",      ref:"52%",         cur:"50%",         delta:"−2%",   bad:false},
    {label:"Мощность ПЭД",    ref:"25 кВт",      cur:"26.1 кВт",    delta:"+4.4%", bad:true },
  ];
  const stats = isSgn ? sgnStats : isEvn ? evnStats : ecnStats;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-auto flex flex-col">

        {/* ── header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h2 className="text-lg font-semibold">
              {isSgn ? t("wellPanel_dynogram") : t("wellPanel_qhChart")} — {wellName}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isSgn ? t("wellPanel_sgnSubtitle") : isEvn ? "Электровинтовой насос · Q-H характеристика" : t("wellPanel_ecnSubtitle")}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted transition-colors" aria-label="Закрыть">
            <X className="w-5 h-5"/>
          </button>
        </div>

        {/* ── body ── */}
        <div className="flex flex-col lg:flex-row gap-6 p-6 flex-1">

          {/* left: chart + legend + stats */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* chart */}
            <div className="rounded-xl border bg-muted/20 p-4">
              {isSgn
                ? <SgnChart cards={SGN_CARDS} size={EXPANDED} crosshair/>
                : <QHChart nominal={ECN_NOMINAL} actual={ECN_ACTUAL} opPt={ECN_OP} size={EXPANDED} crosshair/>
              }
            </div>

            {/* legend */}
            <div className="flex flex-wrap gap-6 px-1">
              {(isSgn ? SGN_CARDS : [ECN_NOMINAL, ECN_ACTUAL]).map((c)=>(
                <div key={c.id} className="flex items-center gap-2 text-sm">
                  <svg width="28" height="10">
                    <line x1="0" y1="5" x2="28" y2="5"
                      stroke={c.strokeColor} strokeWidth="2"
                      strokeDasharray={(c as DynCard).strokeDash ?? (c as QHCard).strokeDash ?? "none"}/>
                  </svg>
                  <span className="font-medium">{c.label}</span>
                  <span className="text-xs text-muted-foreground">{c.date}</span>
                </div>
              ))}
              {!isSgn && (
                <div className="flex items-center gap-2 text-sm">
                  <svg width="14" height="14">
                    <circle cx="7" cy="7" r="6" fill="none" stroke="#ef4444" strokeWidth="1.8"/>
                    <circle cx="7" cy="7" r="2.5" fill="#ef4444"/>
                  </svg>
                  <span className="font-medium text-red-600">{t("wellPanel_workingPoint")}</span>
                </div>
              )}
            </div>

            {/* stats table */}
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">{t("wellPanel_paramName")}</th>
                    <th className="text-right px-4 py-2.5 font-medium text-xs text-blue-600">{t("wellPanel_paramRef")}</th>
                    <th className="text-right px-4 py-2.5 font-medium text-xs text-amber-600">{t("wellPanel_paramCurrent")}</th>
                    <th className="text-right px-4 py-2.5 font-medium text-xs text-muted-foreground">{t("wellPanel_paramDelta")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stats.map(r=>(
                    <tr key={r.label} className="hover:bg-muted/20">
                      <td className="px-4 py-2 text-muted-foreground">{translateData(r.label)}</td>
                      <td className="px-4 py-2 text-right font-medium tabular-nums text-blue-700">{r.ref}</td>
                      <td className="px-4 py-2 text-right font-semibold tabular-nums">{r.cur}</td>
                      <td className={`px-4 py-2 text-right font-semibold tabular-nums ${r.bad?"text-red-500":"text-green-500"}`}>
                        {r.delta}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* right: diagnosis + instrument info */}
          <div className="lg:w-72 shrink-0 space-y-4">

            {/* diagnosis */}
            <div className={`rounded-xl border p-4 space-y-3 ${
              diagnosis.severity==="warn"
                ? "bg-yellow-500/10 border-yellow-500/30"
                : "bg-green-500/10 border-green-500/30"
            }`}>
              <p className={`font-semibold text-sm ${diagnosis.severity==="warn"?"text-yellow-600 dark:text-yellow-400":"text-green-600 dark:text-green-400"}`}>
                {diagnosis.title}
              </p>
              <p className={`text-xs leading-relaxed ${diagnosis.severity==="warn"?"text-yellow-700 dark:text-yellow-300":"text-green-700 dark:text-green-300"}`}>
                {diagnosis.detail}
              </p>
              <div className={`border-t pt-3 ${diagnosis.severity==="warn"?"border-yellow-500/30":"border-green-500/30"}`}>
                <p className={`text-xs font-semibold mb-1 ${diagnosis.severity==="warn"?"text-yellow-600 dark:text-yellow-400":"text-green-600 dark:text-green-400"}`}>
                  {t("wellPanel_recommendation")}
                </p>
                <p className={`text-xs leading-relaxed ${diagnosis.severity==="warn"?"text-yellow-700 dark:text-yellow-300":"text-green-700 dark:text-green-300"}`}>
                  {diagnosis.rec}
                </p>
              </div>
            </div>

            {/* instrument */}
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <p className="font-medium text-sm">{t("wellPanel_instrument")}</p>
              <dl className="space-y-1.5 text-xs">
                {(isSgn
                  ? [
                      ["Прибор",        "СКАД-02М №4417"],
                      ["Метод",         "Телединамометрия"],
                      ["Дата замера",   "14.02.2026, 08:44"],
                      ["Насос",         "НВ 1-44-18"],
                      ["Глубина спуска","745 м"],
                      ["Ход штока",     "3.6 м"],
                      ["Число качаний", "5.2 кач/мин"],
                    ]
                  : [
                      ["Частотомер",    "ИВК-03 №1192"],
                      ["Метод",         "Замер ГДИ"],
                      ["Дата замера",   "14.02.2026, 09:15"],
                      ["Насос",         "ЭЦН5-80-1200"],
                      ["Глубина спуска","1 148 м"],
                      ["Частота",       "50 Гц"],
                      ["КПД насоса",    "≈ 62%"],
                    ]
                ).map(([k,v])=>(
                  <div key={k} className="flex justify-between">
                    <dt className="text-muted-foreground">{translateData(k)}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* trend history */}
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <p className="font-medium text-sm">{t("wellPanel_measureHistory")}</p>
              <div className="space-y-1.5 text-xs">
                {[
                  {date:"14.02.2026", verdict:"warn",  label:"Влияние газа"},
                  {date:"01.11.2025", verdict:"ok",    label:"Норма"},
                  {date:"15.07.2025", verdict:"ok",    label:"Норма"},
                  {date:"03.03.2025", verdict:"alert", label:"Обрыв колонны"},
                ].map((h,i)=>(
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{h.date}</span>
                    <span className={`px-2 py-0.5 rounded-full font-medium text-xs ${
                      h.verdict==="ok"    ? "bg-green-500/15 text-green-600 dark:text-green-400"
                      : h.verdict==="warn"? "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400"
                      : "bg-red-500/15 text-red-600 dark:text-red-400"
                    }`}>{translateData(h.label)}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   STATUS DOT
═══════════════════════════════════════════════════════ */
function StatusDot({status}:{status?:"ok"|"warn"|"alert"}) {
  const c = status==="alert"?"bg-red-500":status==="warn"?"bg-yellow-400":"bg-green-500";
  return <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${c}`}/>;
}

/* ═══════════════════════════════════════════════════════
   MAIN PANEL
═══════════════════════════════════════════════════════ */
export function WellRightPanel({wellName, pumpType}: Props) {
  const { t, translateData } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);
  const isSgn = pumpType === "sgn";
  const effectiveTelemetryType: WellPumpType = pumpType === "evn" ? "ecn" : pumpType;
  const telemetry = TELEMETRY[effectiveTelemetryType];
  const alertCount = telemetry.filter(t=>t.status==="alert").length;
  const warnCount  = telemetry.filter(t=>t.status==="warn").length;

  return (
    <>
      <div className="flex flex-col w-80 shrink-0 border-l bg-muted/10 overflow-hidden">

        {/* header */}
        <div className="px-3 py-2 border-b bg-background shrink-0">
          <p className="text-sm font-semibold truncate">{wellName}</p>
          <p className="text-xs text-muted-foreground">
            {pumpType === "sgn" ? "ШГН" : pumpType === "evn" ? "ЭВН" : "ЭЦН"}&nbsp;·&nbsp;
            {alertCount>0&&<span className="text-red-500 font-medium">{alertCount} {t("wellPanel_alerts")}&nbsp;</span>}
            {warnCount>0 &&<span className="text-yellow-600 font-medium">{warnCount} {t("wellPanel_warnings")}</span>}
            {alertCount===0&&warnCount===0&&<span className="text-green-600">{t("wellPanel_normal")}</span>}
          </p>
        </div>

        <Tabs defaultValue="dynogram" className="flex flex-col flex-1 min-h-0">
          <TabsList className="rounded-none justify-start h-auto px-2 pt-2 bg-background border-b shrink-0 gap-0.5">
            {["dynogram","telemetry","repairs"].map(v=>(
              <TabsTrigger key={v} value={v}
                className="text-xs px-2.5 py-1.5 rounded-t data-[state=active]:border-b-2 data-[state=active]:border-blue-600">
                {v==="dynogram"?t("wellPanel_dynogram"):v==="telemetry"?t("wellPanel_telemetry"):t("wellPanel_repairs")}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── DYNOGRAM TAB ── */}
          <TabsContent value="dynogram" className="flex-1 overflow-auto p-3 mt-0 space-y-3">
            <div className="rounded-xl border bg-muted/20 p-2 overflow-hidden">
              <div className="flex items-center justify-between mb-1 px-1">
                <p className="text-xs text-muted-foreground">
                  {isSgn ? t("wellPanel_loadKnStroke") : t("wellPanel_headFlow")}
                </p>
                <button
                  onClick={()=>setModalOpen(true)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 px-2 py-0.5 rounded hover:bg-blue-50 transition-colors"
                >
                  <Maximize2 className="w-3 h-3"/>
                  {t("wellPanel_expand")}
                </button>
              </div>

              {isSgn
                ? <SgnChart cards={SGN_CARDS} size={COMPACT}/>
                : <QHChart nominal={ECN_NOMINAL} actual={ECN_ACTUAL} opPt={ECN_OP} size={COMPACT}/>
              }

              <div className="flex gap-4 mt-2 justify-center">
                {(isSgn ? SGN_CARDS : [ECN_NOMINAL, ECN_ACTUAL]).map(c=>(
                  <div key={c.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <svg width="20" height="8">
                      <line x1="0" y1="4" x2="20" y2="4"
                        stroke={c.strokeColor} strokeWidth="1.8"
                        strokeDasharray={(c as DynCard).strokeDash ?? (c as QHCard).strokeDash ?? "none"}/>
                    </svg>
                    {c.label}
                  </div>
                ))}
              </div>
            </div>

            {isSgn
              ? <div className="rounded-lg border bg-yellow-500/10 border-yellow-500/30 p-3">
                  <p className="font-medium mb-1 text-xs text-yellow-600 dark:text-yellow-400">{translateData("Диагноз: влияние газа")}</p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300">
                    Площадь карты на 18% меньше эталонной.
                    Рекомендуется снизить число качаний до 4 кач/мин.
                  </p>
                </div>
              : <div className="rounded-lg border bg-green-500/10 border-green-500/30 p-3">
                  <p className="font-medium mb-1 text-xs text-green-600 dark:text-green-400">{translateData("Характеристика: норма")}</p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    Рабочая точка в оптимальной зоне. Q=78.5 м³/сут, H=724 м, КПД ≈ 62%.
                  </p>
                </div>
            }

            <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground text-sm">{t("wellPanel_lastMeasure")}</p>
              <p>{translateData("Дата замера")}: 14.02.2026, 08:44</p>
              <p>{translateData("Метод")}: {translateData(isSgn?"телединамометрия":"ГДИ")}</p>
              <p>{translateData("Прибор")}: {isSgn?"СКАД-02М №4417":"ИВК-03 №1192"}</p>
            </div>
          </TabsContent>

          {/* ── TELEMETRY TAB ── */}
          <TabsContent value="telemetry" className="flex-1 overflow-auto p-3 mt-0 space-y-3">
            <div className="rounded-xl border bg-card divide-y text-sm overflow-hidden">
              {telemetry.map(row=>(
                <div key={row.label} className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2">
                    <StatusDot status={row.status}/>
                    <span className="text-muted-foreground">{translateData(row.label)}</span>
                  </div>
                  <span className="font-semibold tabular-nums">
                    {row.value}&nbsp;<span className="text-xs font-normal text-muted-foreground">{row.unit}</span>
                  </span>
                </div>
              ))}
            </div>
            <div className="rounded-lg border bg-muted/20 p-3 space-y-2 text-sm">
              <p className="font-medium">{t("wellPanel_merTitle")}</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <span className="text-muted-foreground">{t("wellPanel_oilProd")}</span>   <span className="font-medium">318 т</span>
                <span className="text-muted-foreground">{t("wellPanel_fluidProd")}</span><span className="font-medium">1 230 м³</span>
                <span className="text-muted-foreground">{t("wellPanel_waterCut")}</span>  <span className="font-medium">74%</span>
                <span className="text-muted-foreground">{t("wellPanel_mtbf")}</span>      <span className="font-medium">187 сут</span>
                <span className="text-muted-foreground">{t("wellPanel_liftMode")}</span>  <span className="font-medium">{t("wellPanel_mechLift")}</span>
              </div>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
              {t("wellPanel_telemetryUpdated")}&nbsp;
              <span className="text-foreground font-medium">14.02.2026 09:00</span>
            </div>
          </TabsContent>

          {/* ── REPAIRS TAB ── */}
          <TabsContent value="repairs" className="flex-1 overflow-auto p-3 mt-0 space-y-2">
            {REPAIRS.map((r,i)=>(
              <div key={i} className="rounded-xl border bg-card p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    r.type==="КРС"
                      ? "bg-red-500/15 text-red-600 dark:text-red-400"
                      : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                  }`}>{r.type}</span>
                  <span className="text-xs text-muted-foreground">{r.date}</span>
                </div>
                <p className="text-sm">{r.desc}</p>
                <p className="text-xs text-muted-foreground">{t("wellPanel_executor")} {r.exec}</p>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {modalOpen && (
        <DynogramModal
          wellName={wellName}
          pumpType={pumpType}
          onClose={()=>setModalOpen(false)}
        />
      )}
    </>
  );
}

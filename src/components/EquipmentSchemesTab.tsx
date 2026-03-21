import { useLanguage } from "@/hooks/useLanguage";
import { useState } from "react";

/* ─── Visual tokens ─── */
const BG     = "#020817";
const BOX    = "#0a1628";
const ACCENT = "#0f2240";
const STROKE = "#1d4ed8";
const CYAN   = "#22d3ee";
const BLUE   = "#60a5fa";
const AMBER  = "#f59e0b";
const GREEN  = "#4ade80";
const RED    = "#f87171";
const PURPLE = "#c084fc";
const MUTED  = "#94a3b8";
const LIGHT  = "#e2e8f0";

type SchemeId =
  | "sgn" | "ecn" | "evn" | "gazlift"
  | "agzu" | "dns" | "sikn"
  | "uppn"
  | "bkns" | "vrp"
  | "ukpg" | "flare";

/* ─── Reusable SVG primitives ─── */

function Grid({ w, h }: { w: number; h: number }) {
  return (
    <g>
      {Array.from({ length: Math.ceil(w / 40) }, (_, i) => (i + 1) * 40).map(x => (
        <line key={`gx${x}`} x1={x} y1={0} x2={x} y2={h} stroke={BLUE} strokeWidth={0.4} opacity={0.12} />
      ))}
      {Array.from({ length: Math.ceil(h / 40) }, (_, i) => (i + 1) * 40).map(y => (
        <line key={`gy${y}`} x1={0} y1={y} x2={w} y2={y} stroke={BLUE} strokeWidth={0.4} opacity={0.12} />
      ))}
    </g>
  );
}

function Title({ w, label, sub }: { w: number; label: string; sub: string }) {
  return (
    <>
      <rect width={w} height={46} fill="#020817" opacity={0.9} />
      <rect y={44} width={w} height={2} fill={STROKE} opacity={0.6} />
      <text x={w / 2} y={18} fontSize={12} fontWeight="bold" fill={LIGHT} textAnchor="middle" fontFamily="monospace">{label}</text>
      <text x={w / 2} y={36} fontSize={8.5} fill={BLUE} textAnchor="middle" fontFamily="monospace">{sub}</text>
    </>
  );
}

function Arr({ x1, y1, x2, y2, color = CYAN, dashed = false, thick = 1.5 }:
  { x1:number; y1:number; x2:number; y2:number; color?:string; dashed?:boolean; thick?:number }) {
  const dx = x2-x1, dy = y2-y1, len = Math.sqrt(dx*dx+dy*dy)||1;
  const ux = dx/len, uy = dy/len, tip = 9;
  const ax = x2-ux*tip, ay = y2-uy*tip, px = -uy*4, py = ux*4;
  return (
    <g>
      <line x1={x1} y1={y1} x2={ax} y2={ay} stroke={color} strokeWidth={thick} strokeDasharray={dashed?"6,3":undefined}/>
      <path d={`M${x2},${y2} L${ax+px},${ay+py} L${ax-px},${ay-py}Z`} fill={color}/>
    </g>
  );
}

function Blk({ x, y, w=120, h=44, label, sub, stroke=STROKE, fill=BOX }:
  { x:number; y:number; w?:number; h?:number; label:string; sub?:string; stroke?:string; fill?:string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={fill} stroke={stroke} strokeWidth={1} rx={3}/>
      <text x={x+w/2} y={y+(sub?h/2-2:h/2+4)} fontSize={9} fontFamily="monospace" fill={LIGHT} textAnchor="middle" fontWeight="bold">{label}</text>
      {sub&&<text x={x+w/2} y={y+h/2+11} fontSize={7} fontFamily="monospace" fill={MUTED} textAnchor="middle">{sub}</text>}
    </g>
  );
}

function Vessel({ x, y, w=48, h=110, label, stroke=CYAN }:
  { x:number; y:number; w?:number; h?:number; label:string; stroke?:string }) {
  return (
    <g>
      <rect x={x} y={y+8} width={w} height={h-16} fill={BOX} stroke={stroke} strokeWidth={1}/>
      <ellipse cx={x+w/2} cy={y+8} rx={w/2} ry={6} fill={ACCENT} stroke={stroke} strokeWidth={1}/>
      <ellipse cx={x+w/2} cy={y+h-8} rx={w/2} ry={6} fill={ACCENT} stroke={stroke} strokeWidth={1}/>
      <text x={x+w/2} y={y+h/2+4} fontSize={8} fontFamily="monospace" fill={LIGHT} textAnchor="middle" fontWeight="bold">{label}</text>
    </g>
  );
}

function Pump({ cx, cy, r=22, color=GREEN, label="Н" }:
  { cx:number; cy:number; r?:number; color?:string; label?:string }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={BOX} stroke={color} strokeWidth={2}/>
      <text x={cx} y={cy+4} fontSize={10} fontFamily="monospace" fill={color} textAnchor="middle" fontWeight="bold">{label}</text>
    </g>
  );
}

function Specs({ x, y, w=150, title, rows }:
  { x:number; y:number; w?:number; title:string; rows:[string,string][] }) {
  const ROW_H = 28;
  const HEAD_H = 22;
  const totalH = HEAD_H + rows.length * ROW_H + 4;
  return (
    <g>
      {/* outer border */}
      <rect x={x} y={y} width={w} height={totalH} fill={ACCENT} stroke={STROKE} strokeWidth={1} rx={4}/>
      {/* header band */}
      <rect x={x} y={y} width={w} height={HEAD_H} fill="#0c1e3c" rx={3}/>
      <line x1={x} y1={y+HEAD_H} x2={x+w} y2={y+HEAD_H} stroke={STROKE} strokeWidth={0.8} opacity={0.6}/>
      <text x={x+w/2} y={y+15} fontSize={8.5} fontFamily="monospace" fill={LIGHT} textAnchor="middle" fontWeight="bold">{title}</text>
      {rows.map(([k,v],i)=>{
        const ry = y + HEAD_H + i * ROW_H;
        return (
          <g key={k}>
            {/* alternating row bg */}
            {i % 2 === 1 && <rect x={x+1} y={ry} width={w-2} height={ROW_H} fill="#ffffff" opacity={0.03} rx={1}/>}
            {/* separator */}
            {i > 0 && <line x1={x+6} y1={ry} x2={x+w-6} y2={ry} stroke={STROKE} strokeWidth={0.4} opacity={0.35}/>}
            {/* key */}
            <text x={x+8} y={ry+12} fontSize={7} fontFamily="monospace" fill={MUTED}>{k}</text>
            {/* value */}
            <text x={x+8} y={ry+24} fontSize={8} fontFamily="monospace" fill={CYAN} fontWeight="bold">{v}</text>
          </g>
        );
      })}
    </g>
  );
}

/* ════════════════════════════════════════════════════════
   ГРУППА 1: МЕХАНИЗИРОВАННАЯ ДОБЫЧА
════════════════════════════════════════════════════════ */

/* ── ШГН ── */
function SgnScheme() {
  const W=860,H=500,GY=185,CX=200,CW=60,NW=34;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",display:"block"}}>
      <rect width={W} height={GY} fill="#030f28"/><rect y={GY} width={W} height={H-GY} fill="#0a0e18"/>
      <Grid w={W} h={H}/>
      <Title w={W} label="ШТАНГОВЫЙ ГЛУБИННЫЙ НАСОС (ШГН)" sub="ПРИНЦИПИАЛЬНАЯ СХЕМА УСТАНОВКИ"/>
      <line x1={0} y1={GY} x2={W*0.55} y2={GY} stroke={AMBER} strokeWidth={1.5} strokeDasharray="12,4" opacity={0.75}/>
      <text x={12} y={GY-4} fontSize={8} fill={AMBER} fontWeight="bold" fontFamily="monospace">▶ ПОВЕРХНОСТЬ ЗЕМЛИ</text>
      {/* Станок-качалка */}
      <rect x={CX-60} y={GY-10} width={120} height={10} fill={ACCENT} stroke={CYAN} strokeWidth={1}/>
      <rect x={CX-6} y={GY-90} width={12} height={80} fill={ACCENT} stroke={CYAN} strokeWidth={1}/>
      <rect x={CX-80} y={GY-98} width={160} height={12} fill={ACCENT} stroke={CYAN} strokeWidth={1.5} rx={3}/>
      <path d={`M${CX-80},${GY-96} L${CX-100},${GY-88} L${CX-95},${GY-75} L${CX-65},${GY-75}Z`} fill={ACCENT} stroke={CYAN} strokeWidth={1}/>
      <circle cx={CX+55} cy={GY-60} r={30} fill={ACCENT} stroke={CYAN} strokeWidth={1}/>
      <circle cx={CX+55} cy={GY-60} r={8} fill={BOX} stroke={MUTED} strokeWidth={1}/>
      <line x1={CX+35} y1={GY-92} x2={CX+55} y2={GY-60} stroke={MUTED} strokeWidth={1.5}/>
      <rect x={CX+70} y={GY-88} width={50} height={35} fill={BOX} stroke={BLUE} strokeWidth={1} rx={2}/>
      <text x={CX+95} y={GY-67} fontSize={7} fill={MUTED} textAnchor="middle" fontFamily="monospace">РЕДУК.</text>
      <rect x={CX+125} y={GY-90} width={55} height={40} fill={BOX} stroke={AMBER} strokeWidth={1.2} rx={3}/>
      <text x={CX+152} y={GY-75} fontSize={8} fill={AMBER} textAnchor="middle" fontFamily="monospace" fontWeight="bold">ЭД</text>
      <text x={CX+152} y={GY-63} fontSize={7} fill={MUTED} textAnchor="middle" fontFamily="monospace">15–90 кВт</text>
      <rect x={CX-3} y={GY-74} width={6} height={74} fill={CYAN} opacity={0.8}/>
      <text x={CX+10} y={GY-40} fontSize={7} fill={MUTED} fontFamily="monospace">ШТОК</text>
      {/* Underground */}
      <rect x={CX-CW/2} y={GY} width={CW} height={H-GY-10} fill="none" stroke="#0e7490" strokeWidth={2}/>
      <rect x={CX-CW/2-8} y={GY} width={8} height={H-GY-10} fill="#1e3a5f" stroke="#0e7490" strokeWidth={0.5}/>
      <rect x={CX+CW/2} y={GY} width={8} height={H-GY-10} fill="#1e3a5f" stroke="#0e7490" strokeWidth={0.5}/>
      <rect x={CX-NW/2} y={GY} width={NW} height={H-GY-65} fill="none" stroke="#38bdf8" strokeWidth={1.5}/>
      <line x1={CX} y1={GY} x2={CX} y2={H-95} stroke={MUTED} strokeWidth={2.5} strokeDasharray="6,3"/>
      <rect x={CX-22} y={GY-2} width={44} height={18} fill={ACCENT} stroke={CYAN} strokeWidth={1.5}/>
      <text x={CX} y={GY+12} fontSize={7} fill={LIGHT} textAnchor="middle" fontFamily="monospace">ФА</text>
      <rect x={CX-16} y={H-100} width={32} height={32} fill={ACCENT} stroke={GREEN} strokeWidth={1.5} rx={2}/>
      <text x={CX} y={H-85} fontSize={7.5} fill={GREEN} textAnchor="middle" fontFamily="monospace" fontWeight="bold">НАСОС</text>
      <text x={CX} y={H-75} fontSize={6.5} fill={MUTED} textAnchor="middle" fontFamily="monospace">ШГН</text>
      <rect x={CX-12} y={H-66} width={24} height={16} fill={BOX} stroke={MUTED} strokeWidth={1}/>
      <text x={CX} y={H-55} fontSize={6.5} fill={MUTED} textAnchor="middle" fontFamily="monospace">ЯКОРЬ</text>
      {[0,1,2,3].map(i=><line key={i} x1={CX-CW/2-6} y1={H-46+i*9} x2={CX+CW/2+6} y2={H-46+i*9} stroke={RED} strokeWidth={1.8}/>)}
      <rect x={0} y={H-20} width={W*0.55} height={20} fill="#110a06"/>
      <text x={W*0.27} y={H-7} fontSize={8} fill={AMBER} textAnchor="middle" fontFamily="monospace" fontWeight="bold">═══ ПРОДУКТИВНЫЙ ПЛАСТ ═══</text>
      <Arr x1={CX-2} y1={H-110} x2={CX-2} y2={GY+30} color={CYAN} thick={2}/>
      {/* Right side flow */}
      <Arr x1={CX+22} y1={GY+8} x2={340} y2={GY+8} color={CYAN} thick={2}/>
      <Blk x={340} y={GY-16} w={90} h={36} label="ТРУБОПРОВОД" sub="Ду 73–150мм" stroke={BLUE}/>
      <Arr x1={430} y1={GY+8} x2={485} y2={GY+8} color={CYAN} thick={2}/>
      <Blk x={485} y={GY-16} w={75} h={36} label="АГЗУ" sub="Замер" stroke={CYAN}/>
      <Arr x1={560} y1={GY+8} x2={615} y2={GY+8} color={CYAN} thick={2}/>
      <Blk x={615} y={GY-16} w={75} h={36} label="ДНС / ЦПС" sub="Сепарация" stroke={BLUE}/>
      <Specs x={702} y={58} w={145} title="ПАРАМЕТРЫ" rows={[["Ход штока","0.9–6.0 м"],["Качания","1–15 к/мин"],["Мощность","11–200 кВт"],["Глубина","до 3500 м"],["Дебит","до 250 м³/сут"],["КПД насоса","55–80%"]]}/>
    </svg>
  );
}

/* ── ЭЦН ── */
function EcnScheme() {
  const W=860,H=500,GY=185,CX=200,CW=60,NW=34;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",display:"block"}}>
      <rect width={W} height={GY} fill="#030f28"/><rect y={GY} width={W} height={H-GY} fill="#0a0e18"/>
      <Grid w={W} h={H}/>
      <Title w={W} label="ЭЛЕКТРОЦЕНТРОБЕЖНЫЙ НАСОС (ЭЦН)" sub="ПРИНЦИПИАЛЬНАЯ СХЕМА УСТАНОВКИ УЭЦН"/>
      <line x1={0} y1={GY} x2={W*0.55} y2={GY} stroke={AMBER} strokeWidth={1.5} strokeDasharray="12,4" opacity={0.75}/>
      <text x={12} y={GY-4} fontSize={8} fill={AMBER} fontWeight="bold" fontFamily="monospace">▶ ПОВЕРХНОСТЬ ЗЕМЛИ</text>
      {/* Surface */}
      <rect x={CX+80} y={GY-130} width={60} height={55} fill={BOX} stroke={AMBER} strokeWidth={1.5} rx={3}/>
      <text x={CX+110} y={GY-110} fontSize={8} fill={AMBER} textAnchor="middle" fontFamily="monospace" fontWeight="bold">ТП</text>
      <text x={CX+110} y={GY-96} fontSize={7} fill={MUTED} textAnchor="middle" fontFamily="monospace">100 кВА</text>
      <rect x={CX-100} y={GY-140} width={75} height={65} fill={BOX} stroke={BLUE} strokeWidth={1.5} rx={3}/>
      <rect x={CX-95} y={GY-135} width={18} height={10} fill={ACCENT} stroke={GREEN} strokeWidth={1} rx={1}/>
      <text x={CX-62} y={GY-120} fontSize={8} fill={BLUE} textAnchor="middle" fontFamily="monospace" fontWeight="bold">СУ ЭЦН</text>
      <text x={CX-62} y={GY-106} fontSize={7} fill={MUTED} textAnchor="middle" fontFamily="monospace">УЭЦН-60-1200</text>
      <Arr x1={CX+80} y1={GY-112} x2={CX-25} y2={GY-112} color={AMBER}/>
      <line x1={CX-62} y1={GY-75} x2={CX-62} y2={GY} stroke={AMBER} strokeWidth={2} strokeDasharray="8,3"/>
      <line x1={CX-62} y1={GY} x2={CX+NW/2-4} y2={GY+20} stroke={AMBER} strokeWidth={1.5}/>
      <line x1={CX+NW/2-4} y1={GY+20} x2={CX+NW/2-4} y2={H-55} stroke={AMBER} strokeWidth={1.8} strokeDasharray="6,3"/>
      {/* Underground */}
      <rect x={CX-CW/2} y={GY} width={CW} height={H-GY-10} fill="none" stroke="#0e7490" strokeWidth={2}/>
      <rect x={CX-CW/2-8} y={GY} width={8} height={H-GY-10} fill="#1e3a5f" stroke="#0e7490" strokeWidth={0.5}/>
      <rect x={CX+CW/2} y={GY} width={8} height={H-GY-10} fill="#1e3a5f" stroke="#0e7490" strokeWidth={0.5}/>
      <rect x={CX-NW/2} y={GY} width={NW} height={H-GY-65} fill="none" stroke="#38bdf8" strokeWidth={1.5}/>
      <rect x={CX-22} y={GY-2} width={44} height={18} fill={ACCENT} stroke={CYAN} strokeWidth={1.5}/>
      <text x={CX} y={GY+12} fontSize={7} fill={LIGHT} textAnchor="middle" fontFamily="monospace">ФА</text>
      <rect x={CX-14} y={H-195} width={28} height={44} fill={ACCENT} stroke={BLUE} strokeWidth={1.5} rx={2}/>
      <text x={CX} y={H-177} fontSize={7.5} fill={BLUE} textAnchor="middle" fontFamily="monospace" fontWeight="bold">ПЭД</text>
      <text x={CX} y={H-167} fontSize={6} fill={MUTED} textAnchor="middle" fontFamily="monospace">30–500 кВт</text>
      <rect x={CX-14} y={H-148} width={28} height={26} fill={ACCENT} stroke={PURPLE} strokeWidth={1} rx={2}/>
      <text x={CX} y={H-132} fontSize={7} fill={PURPLE} textAnchor="middle" fontFamily="monospace">ПРОТЕКТ.</text>
      <rect x={CX-14} y={H-120} width={28} height={26} fill={ACCENT} stroke="#0e7490" strokeWidth={1} rx={2}/>
      <text x={CX} y={H-104} fontSize={7} fill={CYAN} textAnchor="middle" fontFamily="monospace">ГАЗ.СЕП.</text>
      <rect x={CX-14} y={H-92} width={28} height={26} fill={ACCENT} stroke={GREEN} strokeWidth={1.5} rx={2}/>
      <text x={CX} y={H-76} fontSize={7.5} fill={GREEN} textAnchor="middle" fontFamily="monospace" fontWeight="bold">НАСОС</text>
      {[0,1,2,3].map(i=><line key={i} x1={CX-CW/2-6} y1={H-63+i*9} x2={CX+CW/2+6} y2={H-63+i*9} stroke={RED} strokeWidth={1.8}/>)}
      <rect x={0} y={H-20} width={W*0.55} height={20} fill="#110a06"/>
      <text x={W*0.27} y={H-7} fontSize={8} fill={AMBER} textAnchor="middle" fontFamily="monospace" fontWeight="bold">═══ ПРОДУКТИВНЫЙ ПЛАСТ ═══</text>
      <Arr x1={CX+2} y1={H-205} x2={CX+2} y2={GY+30} color={CYAN} thick={2}/>
      <Arr x1={CX+22} y1={GY+8} x2={340} y2={GY+8} color={CYAN} thick={2}/>
      <Blk x={340} y={GY-16} w={90} h={36} label="ТРУБОПРОВОД" sub="НКТ 73–114мм" stroke={BLUE}/>
      <Arr x1={430} y1={GY+8} x2={485} y2={GY+8} color={CYAN} thick={2}/>
      <Blk x={485} y={GY-16} w={75} h={36} label="АГЗУ" sub="Замер" stroke={CYAN}/>
      <Arr x1={560} y1={GY+8} x2={615} y2={GY+8} color={CYAN} thick={2}/>
      <Blk x={615} y={GY-16} w={75} h={36} label="ДНС / ЦПС" sub="Сепарация" stroke={BLUE}/>
      <Specs x={702} y={58} w={145} title="ПАРАМЕТРЫ" rows={[["Подача","20–1000 м³/сут"],["Напор","200–2500 м"],["Мощность ПЭД","11–500 кВт"],["Глубина","до 5000 м"],["Частота","50 Гц / ЧРП"],["КПД","40–70%"]]}/>
    </svg>
  );
}

/* ── ЭВН ── */
function EvnScheme() {
  const W=860,H=500,GY=185,CX=200,CW=60,NW=34;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",display:"block"}}>
      <rect width={W} height={GY} fill="#0a0318"/><rect y={GY} width={W} height={H-GY} fill="#0a0e18"/>
      <Grid w={W} h={H}/>
      <Title w={W} label="ЭЛЕКТРОВИНТОВОЙ НАСОС (ЭВН)" sub="ПРИНЦИПИАЛЬНАЯ СХЕМА УСТАНОВКИ УЭВН"/>
      <line x1={0} y1={GY} x2={W*0.55} y2={GY} stroke={AMBER} strokeWidth={1.5} strokeDasharray="12,4" opacity={0.75}/>
      <text x={12} y={GY-4} fontSize={8} fill={AMBER} fontWeight="bold" fontFamily="monospace">▶ ПОВЕРХНОСТЬ ЗЕМЛИ</text>
      {/* Transformer */}
      <rect x={CX+80} y={GY-130} width={60} height={55} fill={BOX} stroke={PURPLE} strokeWidth={1.5} rx={3}/>
      <text x={CX+110} y={GY-110} fontSize={8} fill={PURPLE} textAnchor="middle" fontFamily="monospace" fontWeight="bold">ТП</text>
      <text x={CX+110} y={GY-96} fontSize={7} fill={MUTED} textAnchor="middle" fontFamily="monospace">63 кВА</text>
      {/* Control station */}
      <rect x={CX-100} y={GY-140} width={75} height={65} fill={BOX} stroke={PURPLE} strokeWidth={1.5} rx={3}/>
      <rect x={CX-95} y={GY-135} width={18} height={10} fill={ACCENT} stroke={PURPLE} strokeWidth={1} rx={1}/>
      <text x={CX-62} y={GY-120} fontSize={8} fill={PURPLE} textAnchor="middle" fontFamily="monospace" fontWeight="bold">СУ ЭВН</text>
      <text x={CX-62} y={GY-106} fontSize={7} fill={MUTED} textAnchor="middle" fontFamily="monospace">УЭВН-22-900</text>
      <Arr x1={CX+80} y1={GY-112} x2={CX-25} y2={GY-112} color={PURPLE}/>
      {/* Cable (purple) */}
      <line x1={CX-62} y1={GY-75} x2={CX-62} y2={GY} stroke={PURPLE} strokeWidth={2} strokeDasharray="8,3"/>
      <line x1={CX-62} y1={GY} x2={CX+NW/2-4} y2={GY+20} stroke={PURPLE} strokeWidth={1.5}/>
      <line x1={CX+NW/2-4} y1={GY+20} x2={CX+NW/2-4} y2={H-55} stroke={PURPLE} strokeWidth={1.8} strokeDasharray="6,3"/>
      {/* Casing & tubing */}
      <rect x={CX-CW/2} y={GY} width={CW} height={H-GY-10} fill="none" stroke="#0e7490" strokeWidth={2}/>
      <rect x={CX-CW/2-8} y={GY} width={8} height={H-GY-10} fill="#1e3a5f" stroke="#0e7490" strokeWidth={0.5}/>
      <rect x={CX+CW/2} y={GY} width={8} height={H-GY-10} fill="#1e3a5f" stroke="#0e7490" strokeWidth={0.5}/>
      <rect x={CX-NW/2} y={GY} width={NW} height={H-GY-65} fill="none" stroke="#38bdf8" strokeWidth={1.5}/>
      {/* Wellhead */}
      <rect x={CX-22} y={GY-2} width={44} height={18} fill={ACCENT} stroke={CYAN} strokeWidth={1.5}/>
      <text x={CX} y={GY+12} fontSize={7} fill={LIGHT} textAnchor="middle" fontFamily="monospace">ФА</text>
      {/* Underground: motor → protector → screw pump (top-to-bottom) */}
      <rect x={CX-14} y={H-200} width={28} height={46} fill={ACCENT} stroke={BLUE} strokeWidth={1.5} rx={2}/>
      <text x={CX} y={H-182} fontSize={7.5} fill={BLUE} textAnchor="middle" fontFamily="monospace" fontWeight="bold">ПЭД</text>
      <text x={CX} y={H-172} fontSize={6} fill={MUTED} textAnchor="middle" fontFamily="monospace">5–100 кВт</text>
      <rect x={CX-14} y={H-152} width={28} height={22} fill={ACCENT} stroke={PURPLE} strokeWidth={1} rx={2}/>
      <text x={CX} y={H-137} fontSize={7} fill={PURPLE} textAnchor="middle" fontFamily="monospace">ПРОТЕКТ.</text>
      {/* Screw pump — distinctive chevron detail */}
      <rect x={CX-14} y={H-128} width={28} height={38} fill={ACCENT} stroke={GREEN} strokeWidth={1.5} rx={2}/>
      {[0,1,2].map(i=><polyline key={i} points={`${CX-8},${H-115+i*10} ${CX},${H-120+i*10} ${CX+8},${H-115+i*10}`} fill="none" stroke={GREEN} strokeWidth={1.5} opacity={0.9}/>)}
      <text x={CX} y={H-92} fontSize={7.5} fill={GREEN} textAnchor="middle" fontFamily="monospace" fontWeight="bold">ЭВН</text>
      {/* Perforations */}
      {[0,1,2,3].map(i=><line key={i} x1={CX-CW/2-6} y1={H-63+i*9} x2={CX+CW/2+6} y2={H-63+i*9} stroke={RED} strokeWidth={1.8}/>)}
      <rect x={0} y={H-20} width={W*0.55} height={20} fill="#110a06"/>
      <text x={W*0.27} y={H-7} fontSize={8} fill={AMBER} textAnchor="middle" fontFamily="monospace" fontWeight="bold">═══ ПРОДУКТИВНЫЙ ПЛАСТ ═══</text>
      {/* Flow */}
      <Arr x1={CX+2} y1={H-208} x2={CX+2} y2={GY+30} color={CYAN} thick={2}/>
      <Arr x1={CX+22} y1={GY+8} x2={340} y2={GY+8} color={CYAN} thick={2}/>
      <Blk x={340} y={GY-16} w={90} h={36} label="ТРУБОПРОВОД" sub="НКТ 73–89мм" stroke={BLUE}/>
      <Arr x1={430} y1={GY+8} x2={485} y2={GY+8} color={CYAN} thick={2}/>
      <Blk x={485} y={GY-16} w={75} h={36} label="АГЗУ" sub="Замер" stroke={CYAN}/>
      <Arr x1={560} y1={GY+8} x2={615} y2={GY+8} color={CYAN} thick={2}/>
      <Blk x={615} y={GY-16} w={75} h={36} label="ДНС / ЦПС" sub="Сепарация" stroke={BLUE}/>
      <Specs x={702} y={58} w={145} title="ПАРАМЕТРЫ" rows={[["Подача","5–200 м³/сут"],["Напор","100–900 м"],["Мощность ПЭД","5–100 кВт"],["Глубина","до 3500 м"],["Вязкость","до 300 мПа·с"],["КПД","30–60%"]]}/>
    </svg>
  );
}

/* ── ГАЗЛИФТ ── */
function GazliftScheme() {
  const W=860,H=500,GY=185,CX=195,CW=70,NW=36;
  const AX = CX - NW/2 - 10; // annulus arrow x (left of tubing)
  const GLV = [GY+80, GY+170, GY+265]; // gas lift valve depths

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",display:"block"}}>
      <rect width={W} height={GY} fill="#030f28"/><rect y={GY} width={W} height={H-GY} fill="#0a0e18"/>
      <Grid w={W} h={H}/>
      <Title w={W} label="ГАЗЛИФТНЫЙ СПОСОБ ДОБЫЧИ" sub="ПРИНЦИПИАЛЬНАЯ СХЕМА ГАЗЛИФТНОЙ СКВАЖИНЫ"/>
      <line x1={0} y1={GY} x2={W*0.55} y2={GY} stroke={AMBER} strokeWidth={1.5} strokeDasharray="12,4" opacity={0.75}/>
      <text x={12} y={GY-4} fontSize={8} fill={AMBER} fontWeight="bold" fontFamily="monospace">▶ ПОВЕРХНОСТЬ ЗЕМЛИ</text>
      {/* Wellhead with 2 outputs */}
      <rect x={CX-26} y={GY-4} width={52} height={22} fill={ACCENT} stroke={CYAN} strokeWidth={1.5}/>
      <text x={CX} y={GY+12} fontSize={7} fill={LIGHT} textAnchor="middle" fontFamily="monospace">ФА</text>
      {/* Tubing valve (oil out) */}
      <Arr x1={CX+26} y1={GY+8} x2={310} y2={GY+8} color={CYAN} thick={2}/>
      <text x={290} y={GY-3} fontSize={7} fill={CYAN} fontFamily="monospace">НЕФТЬ↑</text>
      {/* Annulus valve (gas in) */}
      <line x1={CX-CW/2} y1={GY+8} x2={100} y2={GY+8} stroke={AMBER} strokeWidth={1.8}/>
      <line x1={100} y1={GY+8} x2={100} y2={GY-60} stroke={AMBER} strokeWidth={1.8}/>
      <Arr x1={250} y1={GY-60} x2={100} y2={GY-60} color={AMBER} thick={2}/>
      <text x={170} y={GY-66} fontSize={7} fill={AMBER} fontFamily="monospace">ГАЗ↓</text>
      {/* Compressor surface */}
      <rect x={CX+80} y={GY-145} width={70} height={60} fill={BOX} stroke={AMBER} strokeWidth={2} rx={4}/>
      <text x={CX+115} y={GY-120} fontSize={9} fill={AMBER} textAnchor="middle" fontFamily="monospace" fontWeight="bold">КС</text>
      <text x={CX+115} y={GY-106} fontSize={7} fill={MUTED} textAnchor="middle" fontFamily="monospace">Компрессор</text>
      <text x={CX+115} y={GY-95} fontSize={7} fill={MUTED} textAnchor="middle" fontFamily="monospace">200–400 атм</text>
      {/* HP gas line: compressor → wellhead annulus */}
      <line x1={CX+80} y1={GY-115} x2={CX+50} y2={GY-115} stroke={AMBER} strokeWidth={2}/>
      <line x1={CX+50} y1={GY-115} x2={250} y2={GY-115} stroke={AMBER} strokeWidth={2}/>
      <line x1={250} y1={GY-115} x2={250} y2={GY-60} stroke={AMBER} strokeWidth={2}/>
      {/* Underground */}
      <rect x={CX-CW/2} y={GY} width={CW} height={H-GY-10} fill="none" stroke="#0e7490" strokeWidth={2}/>
      <rect x={CX-CW/2-8} y={GY} width={8} height={H-GY-10} fill="#1e3a5f" stroke="#0e7490" strokeWidth={0.5}/>
      <rect x={CX+CW/2} y={GY} width={8} height={H-GY-10} fill="#1e3a5f" stroke="#0e7490" strokeWidth={0.5}/>
      {/* Annulus fill (between casing and tubing) */}
      <rect x={CX-CW/2} y={GY} width={(CW-NW)/2} height={H-GY-10} fill="rgba(245,158,11,0.04)"/>
      <rect x={CX+NW/2} y={GY} width={(CW-NW)/2} height={H-GY-10} fill="rgba(245,158,11,0.04)"/>
      {/* NKT */}
      <rect x={CX-NW/2} y={GY} width={NW} height={H-GY-50} fill="rgba(56,189,248,0.06)" stroke="#38bdf8" strokeWidth={1.5}/>
      {/* Gas arrows in annulus (going down) */}
      {[GY+50, GY+130, GY+210].map((y,i)=>(
        <Arr key={i} x1={AX} y1={y-25} x2={AX} y2={y} color={AMBER} thick={1.5}/>
      ))}
      <text x={AX-2} y={GY+30} fontSize={7} fill={AMBER} textAnchor="middle" fontFamily="monospace">ГАЗ↓</text>
      {/* Gas lift valves */}
      {GLV.map((y,i)=>(
        <g key={i}>
          <rect x={CX-NW/2-8} y={y-6} width={10} height={12} fill={ACCENT} stroke={AMBER} strokeWidth={1.2} rx={1}/>
          <line x1={CX-NW/2-8} y1={y} x2={CX-NW/2} y2={y} stroke={AMBER} strokeWidth={1.5}/>
          <text x={CX-NW/2-22} y={y+4} fontSize={7} fill={AMBER} textAnchor="end" fontFamily="monospace">КГЛ-{i+1}</text>
        </g>
      ))}
      {/* Oil+gas arrows in tubing (going up) */}
      {[GY+110, GY+200, GY+280].map((y,i)=>(
        <Arr key={i} x1={CX} y1={y} x2={CX} y2={y-30} color={CYAN} thick={1.5}/>
      ))}
      <text x={CX+4} y={H-55} fontSize={7} fill={CYAN} fontFamily="monospace">НЕФТЬ+ГАЗ↑</text>
      {/* Perforations */}
      {[0,1,2].map(i=><line key={i} x1={CX-CW/2-6} y1={H-42+i*10} x2={CX+CW/2+6} y2={H-42+i*10} stroke={RED} strokeWidth={1.8}/>)}
      <rect x={0} y={H-18} width={W*0.55} height={18} fill="#110a06"/>
      <text x={W*0.27} y={H-6} fontSize={8} fill={AMBER} textAnchor="middle" fontFamily="monospace" fontWeight="bold">═══ ПРОДУКТИВНЫЙ ПЛАСТ ═══</text>
      {/* Right: flow diagram */}
      <Blk x={310} y={GY-16} w={80} h={36} label="АГЗУ" sub="Замер" stroke={CYAN}/>
      <Arr x1={390} y1={GY+8} x2={440} y2={GY+8} color={CYAN} thick={2}/>
      <Blk x={440} y={GY-16} w={80} h={36} label="ДНС / ЦПС" sub="Подготовка" stroke={BLUE}/>
      <Specs x={692} y={58} w={155} title="ПАРАМЕТРЫ" rows={[["Дебит","50–1000 м³/сут"],["Давление КС","100–400 атм"],["Р закачки газа","80–300 атм"],["Глубина КГЛ","400–2500 м"],["Расход газа","500–5000 м³/сут"],["КПД","30–60%"]]}/>
      {/* Legend */}
      <rect x={540} y={330} width={300} height={80} fill={ACCENT} stroke={STROKE} strokeWidth={1} rx={4}/>
      <text x={550} y={347} fontSize={8} fontFamily="monospace" fill={LIGHT} fontWeight="bold">ОБОЗНАЧЕНИЯ</text>
      <Arr x1={550} y1={362} x2={580} y2={362} color={AMBER}/>
      <text x={586} y={366} fontSize={7.5} fontFamily="monospace" fill={MUTED}>Газ закачки (высокое давление)</text>
      <Arr x1={550} y1={380} x2={580} y2={380} color={CYAN}/>
      <text x={586} y={384} fontSize={7.5} fontFamily="monospace" fill={MUTED}>Нефть + газ (продукция)</text>
      <rect x={550} y={393} width={14} height={8} fill={ACCENT} stroke={AMBER} strokeWidth={1}/>
      <text x={570} y={401} fontSize={7.5} fontFamily="monospace" fill={MUTED}>Клапан газлифтный (КГЛ)</text>
    </svg>
  );
}

/* ════════════════════════════════════════════════════════
   ГРУППА 2: СБОР И ЗАМЕР
════════════════════════════════════════════════════════ */

/* ── АГЗУ ── */
function AgzuScheme() {
  const W=860,H=440,MX=180,FY=230,WELL_ROWS=[120,175,230,285,340];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",display:"block"}}>
      <rect width={W} height={H} fill={BG}/>
      <Grid w={W} h={H}/>
      <Title w={W} label="АГЗУ — АВТОМАТИЗИРОВАННАЯ ГРУППОВАЯ ЗАМЕРНАЯ УСТАНОВКА" sub="ТЕХНОЛОГИЧЕСКАЯ СХЕМА"/>
      {WELL_ROWS.map((y,i)=>(
        <g key={i}>
          <Blk x={20} y={y-18} w={80} h={36} label={`Скв. ${i+1}`} sub="нефть+газ+вода" stroke={CYAN}/>
          <Arr x1={100} y1={y} x2={MX} y2={y} color={CYAN} thick={1.5}/>
          <rect x={MX-26} y={y-7} width={14} height={14} fill={ACCENT} stroke={BLUE} strokeWidth={1} rx={1} transform={`rotate(45,${MX-19},${y})`}/>
        </g>
      ))}
      <rect x={MX} y={100} width={14} height={260} fill={ACCENT} stroke={CYAN} strokeWidth={1.5}/>
      <text x={MX+7} y={96} fontSize={7} fill={MUTED} textAnchor="middle" fontFamily="monospace">КОЛЛЕКТОР</text>
      <line x1={MX+14} y1={105} x2={680} y2={105} stroke={MUTED} strokeWidth={1.5} strokeDasharray="10,4"/>
      <text x={430} y={98} fontSize={7.5} fill={MUTED} textAnchor="middle" fontFamily="monospace">ОБВОДНАЯ ЛИНИЯ (БЕЗ ЗАМЕРА)</text>
      <Arr x1={MX+14} y1={FY} x2={250} y2={FY} color={CYAN}/>
      <polygon points={`${250},${FY-14} ${278},${FY} ${250},${FY+14}`} fill={ACCENT} stroke={CYAN} strokeWidth={1.5}/>
      <text x={264} y={FY+4} fontSize={7} fill={CYAN} textAnchor="middle" fontFamily="monospace">КРАН</text>
      <Arr x1={278} y1={FY} x2={310} y2={FY} color={CYAN}/>
      <Vessel x={310} y={160} w={55} h={140} label="СЕП." stroke={CYAN}/>
      <text x={337} y={310} fontSize={7.5} fill={MUTED} textAnchor="middle" fontFamily="monospace">СЕПАРАТОР</text>
      <Arr x1={337} y1={160} x2={337} y2={115} color={AMBER}/>
      <Blk x={300} y={80} w={75} h={30} label="СЧ. ГАЗА" stroke={AMBER}/>
      <Arr x1={375} y1={95} x2={460} y2={95} color={AMBER}/>
      <text x={470} y={99} fontSize={7.5} fill={AMBER} fontFamily="monospace">→ ГАЗ</text>
      <Arr x1={365} y1={FY} x2={415} y2={FY} color={CYAN}/>
      <Blk x={415} y={FY-22} w={80} h={44} label="РАСХОДОМЕР" sub="ЖИДКОСТИ" stroke={GREEN}/>
      <Arr x1={495} y1={FY} x2={545} y2={FY} color={CYAN}/>
      <Blk x={415} y={FY+55} w={80} h={36} label="ВЛАГОМЕР" sub="% воды" stroke={BLUE}/>
      <line x1={455} y1={FY+22} x2={455} y2={FY+55} stroke={BLUE} strokeWidth={1.2} strokeDasharray="5,2"/>
      <rect x={545} y={100} width={14} height={260} fill={ACCENT} stroke={CYAN} strokeWidth={1.5}/>
      <Arr x1={559} y1={FY} x2={640} y2={FY} color={CYAN} thick={2}/>
      <Blk x={640} y={FY-22} w={100} h={44} label="ДНС / ГЗУ" sub="→ ЦПС" stroke={CYAN}/>
      <Arr x1={740} y1={FY} x2={820} y2={FY} color={CYAN} thick={2}/>
      <Blk x={590} y={340} w={130} h={50} label="БЛОК УПРАВЛЕНИЯ" sub="SCADA / телеметрия" stroke={AMBER}/>
    </svg>
  );
}

/* ── ДНС ── */
function DnsScheme() {
  const W=860,H=420,FY=210;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",display:"block"}}>
      <rect width={W} height={H} fill={BG}/>
      <Grid w={W} h={H}/>
      <Title w={W} label="ДНС — ДОЖИМНАЯ НАСОСНАЯ СТАНЦИЯ" sub="ТЕХНОЛОГИЧЕСКАЯ СХЕМА"/>
      {/* Inlet */}
      <text x={20} y={FY-8} fontSize={8} fill={MUTED} fontFamily="monospace">← ОТ АГЗУ</text>
      <Arr x1={20} y1={FY+8} x2={65} y2={FY+8} color={CYAN} thick={2}/>
      {/* Inlet scrubber */}
      <Vessel x={65} y={FY-75} w={55} h={150} label="ВЕС." stroke={CYAN}/>
      <text x={92} y={FY+90} fontSize={7.5} fill={MUTED} textAnchor="middle" fontFamily="monospace">Сепаратор</text>
      <text x={92} y={FY+100} fontSize={7.5} fill={MUTED} textAnchor="middle" fontFamily="monospace">входной</text>
      {/* Gas off top */}
      <Arr x1={92} y1={FY-75} x2={92} y2={FY-120} color={AMBER}/>
      <Blk x={50} y={FY-155} w={85} h={34} label="СЧ. ГАЗА" sub="→ ГПС" stroke={AMBER}/>
      {/* Water off bottom */}
      <Arr x1={92} y1={FY+75} x2={92} y2={FY+120} color={BLUE}/>
      <Blk x={55} y={FY+120} w={75} h={34} label="ДРЕН. ЁМКОСТЬ" sub="→ КНС" stroke={BLUE}/>
      {/* Liquid flow right */}
      <Arr x1={120} y1={FY+8} x2={170} y2={FY+8} color={CYAN} thick={2}/>
      {/* Pumps in parallel */}
      <rect x={170} y={FY-55} width={14} height={126} fill={ACCENT} stroke={MUTED} strokeWidth={1}/>
      {[FY-35, FY+5, FY+45].map((py,i)=>(
        <g key={i}>
          <Arr x1={184} y1={py+10} x2={218} y2={py+10} color={CYAN} thick={1.3}/>
          <Pump cx={240} cy={py+10} r={20} color={GREEN}/>
          {/* Motor above pump */}
          <rect x={224} y={py-20} width={32} height={18} fill={BOX} stroke={AMBER} strokeWidth={1} rx={2}/>
          <text x={240} y={py-8} fontSize={7} fill={AMBER} textAnchor="middle" fontFamily="monospace">ЭД</text>
          <Arr x1={260} y1={py+10} x2={290} y2={py+10} color={CYAN} thick={1.3}/>
        </g>
      ))}
      <rect x={290} y={FY-55} width={14} height={126} fill={ACCENT} stroke={MUTED} strokeWidth={1}/>
      <Arr x1={304} y1={FY+8} x2={360} y2={FY+8} color={CYAN} thick={2}/>
      {/* Check valve */}
      <polygon points={`${360},${FY-10} ${385},${FY+8} ${360},${FY+26}`} fill={ACCENT} stroke={GREEN} strokeWidth={1.5}/>
      <line x1={360} y1={FY-10} x2={360} y2={FY+26} stroke={GREEN} strokeWidth={2}/>
      <Arr x1={385} y1={FY+8} x2={435} y2={FY+8} color={CYAN} thick={2}/>
      {/* Pressure/flow measurement */}
      <Blk x={435} y={FY-22} w={90} h={44} label="УЗЕЛ УЧЁТА" sub="Р + Q + Т" stroke={GREEN}/>
      <Arr x1={525} y1={FY+8} x2={575} y2={FY+8} color={CYAN} thick={2}/>
      {/* Output */}
      <Blk x={575} y={FY-22} w={95} h={44} label="ЦПС / УППН" sub="→ подготовка" stroke={BLUE}/>
      <Arr x1={670} y1={FY+8} x2={720} y2={FY+8} color={CYAN} thick={2.5}/>
      <text x={728} y={FY+12} fontSize={9} fill={CYAN} fontFamily="monospace" fontWeight="bold">→</text>
      <Specs x={705} y={58} w={145} title="ПАРАМЕТРЫ" rows={[["Давление вх.","2–8 атм"],["Давление вых.","10–40 атм"],["Насосы","2–4 шт ЦНС"],["Мощность","75–1000 кВт"],["Произв.","200–5000 м³/сут"]]}/>
    </svg>
  );
}

/* ── СИКН ── */
function SiknScheme() {
  const W=860,H=460,FY=200;
  const lines=[{y:FY-60,label:"Рабочая №1"},{y:FY,label:"Рабочая №2"},{y:FY+60,label:"Резервная"}];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",display:"block"}}>
      <rect width={W} height={H} fill={BG}/>
      <Grid w={W} h={H}/>
      <Title w={W} label="СИКН — СИСТЕМА ИЗМЕРЕНИЙ КОЛИЧЕСТВА И ПОКАЗАТЕЛЕЙ КАЧЕСТВА НЕФТИ" sub="ПРИНЦИПИАЛЬНАЯ СХЕМА · ГОСТ Р 8.595"/>
      {/* Inlet */}
      <text x={18} y={FY-6} fontSize={8} fill={MUTED} fontFamily="monospace">← ВХОД</text>
      <Arr x1={18} y1={FY+8} x2={55} y2={FY+8} color={CYAN} thick={2}/>
      {/* Filter dual */}
      <Blk x={55} y={FY-16} w={60} h={48} label="ФИЛЬТР" sub="2×Ду100" stroke={MUTED}/>
      <Arr x1={115} y1={FY+8} x2={155} y2={FY+8} color={CYAN} thick={2}/>
      {/* Distribution header */}
      <rect x={155} y={FY-80} width={12} height={180} fill={ACCENT} stroke={CYAN} strokeWidth={1.5}/>
      {/* Measurement lines */}
      {lines.map(({y,label},i)=>(
        <g key={i}>
          <line x1={167} y1={y} x2={200} y2={y} stroke={i===2?MUTED:CYAN} strokeWidth={i===2?1.2:1.8} strokeDasharray={i===2?"6,3":undefined}/>
          {/* Turbine flowmeter */}
          <circle cx={230} cy={y} r={22} fill={BOX} stroke={i===2?MUTED:GREEN} strokeWidth={1.5}/>
          <text x={230} y={y-4} fontSize={7.5} fontFamily="monospace" fill={i===2?MUTED:GREEN} textAnchor="middle" fontWeight="bold">ТПР</text>
          <text x={230} y={y+8} fontSize={6} fontFamily="monospace" fill={MUTED} textAnchor="middle">Турбина</text>
          {/* Temp+pressure */}
          <rect x={270} y={y-12} width={40} height={24} fill={BOX} stroke={BLUE} strokeWidth={1} rx={2}/>
          <text x={290} y={y+4} fontSize={7} fontFamily="monospace" fill={BLUE} textAnchor="middle">Р+Т</text>
          {/* Sampler */}
          <circle cx={340} cy={y} r={16} fill={BOX} stroke={PURPLE} strokeWidth={1.5}/>
          <text x={340} y={y+4} fontSize={7} fontFamily="monospace" fill={PURPLE} textAnchor="middle">ПРО</text>
          {/* Counter / totalizer */}
          <Blk x={375} y={y-14} w={55} h={28} label="СЧЁТЧИК" stroke={i===2?MUTED:GREEN}/>
          <line x1={430} y1={y} x2={460} y2={y} stroke={i===2?MUTED:CYAN} strokeWidth={i===2?1.2:1.8} strokeDasharray={i===2?"6,3":undefined}/>
          <text x={100} y={y+4} fontSize={7} fill={i===2?MUTED:CYAN} fontFamily="monospace">{label}</text>
        </g>
      ))}
      {/* Collection header */}
      <rect x={460} y={FY-80} width={12} height={180} fill={ACCENT} stroke={CYAN} strokeWidth={1.5}/>
      <Arr x1={472} y1={FY+8} x2={520} y2={FY+8} color={CYAN} thick={2}/>
      {/* Calibration */}
      <Blk x={520} y={FY-60} w={95} h={44} label="КАЛИБРОВКА" sub="поточный калибратор" stroke={AMBER}/>
      <line x1={567} y1={FY-60} x2={567} y2={FY-16} stroke={AMBER} strokeWidth={1.2} strokeDasharray="5,3"/>
      {/* Quality */}
      <Blk x={520} y={FY+40} w={95} h={44} label="АНАЛИЗАТОР" sub="плотность + обводн." stroke={PURPLE}/>
      <line x1={567} y1={FY+22} x2={567} y2={FY+40} stroke={PURPLE} strokeWidth={1.2} strokeDasharray="5,3"/>
      <Blk x={520} y={FY-16} w={95} h={28} label="ВЫЧИСЛИТЕЛЬ" stroke={BLUE}/>
      <Arr x1={615} y1={FY+8} x2={665} y2={FY+8} color={CYAN} thick={2}/>
      {/* Output */}
      <Blk x={665} y={FY-16} w={80} h={44} label="ВЫВОД" sub="→ Магистраль" stroke={CYAN}/>
      <Arr x1={745} y1={FY+8} x2={800} y2={FY+8} color={CYAN} thick={2.5}/>
      {/* SCADA */}
      <Blk x={630} y={360} w={110} h={44} label="АСУ ТП" sub="автоматика, архив" stroke={AMBER}/>
      <Specs x={705} y={58} w={145} title="ПАРАМЕТРЫ" rows={[["Ду труб","100–500 мм"],["Р рабочее","до 64 атм"],["Т измерения","-20…+80°C"],["Погрешн. Q","±0.25%"],["Класс точности","0.5 / 1.0"]]}/>
    </svg>
  );
}

/* ════════════════════════════════════════════════════════
   ГРУППА 3: ПОДГОТОВКА НЕФТИ
════════════════════════════════════════════════════════ */

/* ── УППН ── */
function UppnScheme() {
  const W=860,H=460,FY=220;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",display:"block"}}>
      <rect width={W} height={H} fill={BG}/>
      <Grid w={W} h={H}/>
      <Title w={W} label="УППН — УСТАНОВКА ПРЕДВАРИТЕЛЬНОЙ ПОДГОТОВКИ НЕФТИ" sub="ТЕХНОЛОГИЧЕСКАЯ СХЕМА (ПРЕДВАРИТЕЛЬНЫЙ СБРОС ВОДЫ)"/>
      <text x={20} y={FY-6} fontSize={8} fill={MUTED} fontFamily="monospace">← ВХОД</text>
      <Arr x1={55} y1={FY+8} x2={90} y2={FY+8} color={CYAN} thick={2}/>
      {/* Heater */}
      <circle cx={120} cy={FY+8} r={28} fill={BOX} stroke={RED} strokeWidth={2}/>
      <text x={120} y={FY+4} fontSize={8} fill={RED} textAnchor="middle" fontFamily="monospace" fontWeight="bold">ПТБ</text>
      <text x={120} y={FY+16} fontSize={7} fill={MUTED} textAnchor="middle" fontFamily="monospace">Подогрев</text>
      <Arr x1={148} y1={FY+8} x2={188} y2={FY+8} color={CYAN} thick={2}/>
      {/* Sep1 */}
      <Vessel x={188} y={FY-75} w={55} h={160} label="СЕП.1" stroke={CYAN}/>
      <text x={215} y={FY+95} fontSize={7.5} fill={MUTED} textAnchor="middle" fontFamily="monospace">1-я ступень</text>
      <Arr x1={215} y1={FY-75} x2={215} y2={FY-120} color={AMBER}/>
      <text x={215} y={FY-124} fontSize={7.5} fill={AMBER} textAnchor="middle" fontFamily="monospace">ГАЗ</text>
      <Arr x1={215} y1={FY+85} x2={215} y2={FY+120} color={BLUE}/>
      <Blk x={178} y={FY+120} w={75} h={34} label="ДРЕН.Б." sub="→ КНС" stroke={BLUE}/>
      <Arr x1={243} y1={FY+8} x2={290} y2={FY+8} color={CYAN} thick={2}/>
      {/* Dehydrator */}
      <rect x={290} y={FY-55} width={100} height={110} fill={BOX} stroke={PURPLE} strokeWidth={2} rx={8}/>
      <text x={340} y={FY-10} fontSize={8.5} fill={PURPLE} textAnchor="middle" fontFamily="monospace" fontWeight="bold">ОТС</text>
      <text x={340} y={FY+4} fontSize={7.5} fill={MUTED} textAnchor="middle" fontFamily="monospace">Отстойник /</text>
      <text x={340} y={FY+16} fontSize={7} fill={MUTED} textAnchor="middle" fontFamily="monospace">деэмульгатор</text>
      <Arr x1={340} y1={FY+55} x2={340} y2={FY+120} color={BLUE}/>
      <Blk x={303} y={FY+120} w={75} h={34} label="ДРЕН.Б." sub="→ КНС" stroke={BLUE}/>
      <Arr x1={390} y1={FY+8} x2={430} y2={FY+8} color={CYAN} thick={2}/>
      {/* Sep2 */}
      <Vessel x={430} y={FY-75} w={55} h={160} label="СЕП.2" stroke={CYAN}/>
      <text x={457} y={FY+95} fontSize={7.5} fill={MUTED} textAnchor="middle" fontFamily="monospace">2-я ступень</text>
      <Arr x1={457} y1={FY-75} x2={457} y2={FY-120} color={AMBER}/>
      <text x={457} y={FY-124} fontSize={7.5} fill={AMBER} textAnchor="middle" fontFamily="monospace">ГАЗ</text>
      <line x1={215} y1={FY-120} x2={457} y2={FY-120} stroke={AMBER} strokeWidth={1.5}/>
      <Arr x1={335} y1={FY-120} x2={335} y2={FY-148} color={AMBER}/>
      <Blk x={285} y={FY-182} w={100} h={34} label="КОМПРЕССОР" sub="→ ГПЗ / факел" stroke={AMBER}/>
      <Arr x1={485} y1={FY+8} x2={530} y2={FY+8} color={CYAN} thick={2}/>
      {/* Pump */}
      <Pump cx={553} cy={FY+8}/>
      <Arr x1={575} y1={FY+8} x2={615} y2={FY+8} color={CYAN} thick={2}/>
      {/* Tanks */}
      {[0,1].map(i=>(
        <g key={i}>
          <rect x={615+i*70} y={FY-42} width={60} height={88} fill={BOX} stroke={CYAN} strokeWidth={1.5} rx={4}/>
          <ellipse cx={645+i*70} cy={FY-42} rx={30} ry={7} fill={ACCENT} stroke={CYAN} strokeWidth={1}/>
          <ellipse cx={645+i*70} cy={FY+46} rx={30} ry={7} fill={ACCENT} stroke={CYAN} strokeWidth={1}/>
          <text x={645+i*70} y={FY+8} fontSize={8} fill={LIGHT} textAnchor="middle" fontFamily="monospace" fontWeight="bold">РВС</text>
          <text x={645+i*70} y={FY+20} fontSize={7} fill={MUTED} textAnchor="middle" fontFamily="monospace">{i===0?"1000 м³":"500 м³"}</text>
        </g>
      ))}
      <Arr x1={755} y1={FY+8} x2={800} y2={FY+8} color={CYAN} thick={2}/>
      <Pump cx={820} cy={FY+8} r={18}/>
      <Arr x1={838} y1={FY+8} x2={855} y2={FY+8} color={CYAN} thick={2}/>
      <Specs x={18} y={310} w={155} title="ПАРАМЕТРЫ" rows={[["Обводнённость вх.","до 90%"],["Остат. обводн. вых.","0.5–5%"],["Произв. жидкости","200–5000 м³/сут"],["Т нагрева","40–80°C"],["Деэмульгатор","ХПАН, Реапон"]]}/>
    </svg>
  );
}

/* ════════════════════════════════════════════════════════
   ГРУППА 4: ПОДДЕРЖАНИЕ ПЛАСТОВОГО ДАВЛЕНИЯ
════════════════════════════════════════════════════════ */

/* ── БКНС ── */
function BknsScheme() {
  const W=860,H=440,FY=210;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",display:"block"}}>
      <rect width={W} height={H} fill={BG}/>
      <Grid w={W} h={H}/>
      <Title w={W} label="БКНС — БЛОЧНАЯ КУСТОВАЯ НАСОСНАЯ СТАНЦИЯ" sub="ТЕХНОЛОГИЧЕСКАЯ СХЕМА ЗАКАЧКИ ВОДЫ В ПЛАСТ"/>
      {/* Water source */}
      <text x={18} y={FY-8} fontSize={8} fill={BLUE} fontFamily="monospace">← ВОДА</text>
      <text x={18} y={FY+10} fontSize={7} fill={MUTED} fontFamily="monospace">(от ВОС/ПВ)</text>
      <Arr x1={18} y1={FY+18} x2={55} y2={FY+18} color={BLUE} thick={2}/>
      {/* Inlet filter */}
      <Blk x={55} y={FY} w={65} h={36} label="ФИЛЬТР" sub="сетчатый" stroke={MUTED}/>
      <Arr x1={120} y1={FY+18} x2={155} y2={FY+18} color={BLUE} thick={2}/>
      {/* Pressure gauge */}
      <circle cx={165} cy={FY+18} r={10} fill={BOX} stroke={MUTED} strokeWidth={1}/>
      <text x={165} y={FY+22} fontSize={6} fill={MUTED} textAnchor="middle" fontFamily="monospace">Рвх</text>
      <Arr x1={175} y1={FY+18} x2={200} y2={FY+18} color={BLUE} thick={2}/>
      {/* Inlet manifold */}
      <rect x={200} y={FY-60} width={12} height={156} fill={ACCENT} stroke={BLUE} strokeWidth={1.5}/>
      {/* 3 pump groups */}
      {[FY-40,FY+18,FY+76].map((py,i)=>(
        <g key={i}>
          <line x1={212} y1={py} x2={248} y2={py} stroke={BLUE} strokeWidth={1.8}/>
          {/* Inlet valve */}
          <rect x={248} y={py-8} width={14} height={16} fill={ACCENT} stroke={MUTED} strokeWidth={1} rx={1} transform={`rotate(45,${255},${py})`}/>
          <line x1={262} y1={py} x2={290} y2={py} stroke={BLUE} strokeWidth={1.8}/>
          {/* Pump */}
          <Pump cx={312} cy={py} r={22} color={GREEN}/>
          {/* Motor */}
          <rect x={296} y={py-40} width={32} height={26} fill={BOX} stroke={AMBER} strokeWidth={1.2} rx={2}/>
          <text x={312} y={py-32} fontSize={8} fill={AMBER} textAnchor="middle" fontFamily="monospace" fontWeight="bold">ЭД</text>
          <text x={312} y={py-22} fontSize={6.5} fill={MUTED} textAnchor="middle" fontFamily="monospace">75–315кВт</text>
          {/* Outlet valve + check */}
          <line x1={334} y1={py} x2={360} y2={py} stroke={BLUE} strokeWidth={1.8}/>
          <polygon points={`${360},${py-10} ${382},${py} ${360},${py+10}`} fill={ACCENT} stroke={BLUE} strokeWidth={1.5}/>
          <line x1={382} y1={py} x2={405} y2={py} stroke={BLUE} strokeWidth={1.8}/>
          <text x={270} y={py-3} fontSize={7} fill={MUTED} fontFamily="monospace">П-{i+1}</text>
        </g>
      ))}
      {/* Outlet manifold */}
      <rect x={405} y={FY-60} width={12} height={156} fill={ACCENT} stroke={BLUE} strokeWidth={1.5}/>
      <Arr x1={417} y1={FY+18} x2={460} y2={FY+18} color={BLUE} thick={2}/>
      {/* HP measurement */}
      <Blk x={460} y={FY} w={85} h={36} label="УЗЕЛ УЧЁТА" sub="Q + Р высокое" stroke={GREEN}/>
      <Arr x1={545} y1={FY+18} x2={590} y2={FY+18} color={BLUE} thick={2}/>
      {/* Distribution */}
      <rect x={590} y={FY-80} width={12} height={200} fill={ACCENT} stroke={BLUE} strokeWidth={1.5}/>
      {[FY-60,FY-20,FY+20,FY+60,FY+100].map((y,i)=>(
        <g key={i}>
          <Arr x1={602} y1={y} x2={660} y2={y} color={BLUE} thick={1.3}/>
          <Blk x={660} y={y-14} w={80} h={28} label={`НС-${i+1}`} sub="нагн. скв." stroke={BLUE}/>
        </g>
      ))}
      <Specs x={702} y={58} w={148} title="ПАРАМЕТРЫ" rows={[["Давление нагн.","80–250 атм"],["Тип насосов","ЦНС 38–500"],["Расход суммарный","200–1000 м³/сут"],["Мощность ЭД","75–1000 кВт"]]}/>
    </svg>
  );
}

/* ── ВРП ── */
function VrpScheme() {
  const W=860,H=380,FY=190;
  const WELLS=["НС-1","НС-2","НС-3","НС-4","НС-5","НС-6"];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",display:"block"}}>
      <rect width={W} height={H} fill={BG}/>
      <Grid w={W} h={H}/>
      <Title w={W} label="ВРП — ВОДОРАСПРЕДЕЛИТЕЛЬНЫЙ ПУНКТ" sub="СХЕМА РАСПРЕДЕЛЕНИЯ ЗАКАЧИВАЕМОЙ ВОДЫ ПО СКВАЖИНАМ"/>
      {/* Inlet from BKNS */}
      <text x={18} y={FY-8} fontSize={8} fill={BLUE} fontFamily="monospace">← ОТ БКНС</text>
      <Arr x1={18} y1={FY+8} x2={55} y2={FY+8} color={BLUE} thick={2.5}/>
      {/* Pressure gauge + meter */}
      <circle cx={75} cy={FY+8} r={14} fill={BOX} stroke={MUTED} strokeWidth={1.5}/>
      <text x={75} y={FY+12} fontSize={7} fill={MUTED} textAnchor="middle" fontFamily="monospace">МН</text>
      <Arr x1={89} y1={FY+8} x2={120} y2={FY+8} color={BLUE} thick={2.5}/>
      <Blk x={120} y={FY-14} w={65} h={36} label="РАСХОДОМЕР" stroke={GREEN}/>
      <Arr x1={185} y1={FY+8} x2={225} y2={FY+8} color={BLUE} thick={2.5}/>
      {/* Distribution manifold */}
      <rect x={225} y={FY-150} width={14} height={320} fill={ACCENT} stroke={BLUE} strokeWidth={2}/>
      <text x={232} y={FY-154} fontSize={7} fill={MUTED} textAnchor="middle" fontFamily="monospace">КОЛЛЕКТОР</text>
      <text x={232} y={FY+174} fontSize={7} fill={MUTED} textAnchor="middle" fontFamily="monospace">РАЗДАЮЩИЙ</text>
      {/* 6 output lines */}
      {WELLS.map((name,i)=>{
        const y = FY-130+i*52;
        return (
          <g key={i}>
            <line x1={239} y1={y} x2={280} y2={y} stroke={BLUE} strokeWidth={1.8}/>
            {/* Gate valve */}
            <rect x={280} y={y-8} width={14} height={16} fill={ACCENT} stroke={MUTED} strokeWidth={1} rx={1} transform={`rotate(45,${287},${y})`}/>
            <line x1={294} y1={y} x2={330} y2={y} stroke={BLUE} strokeWidth={1.8}/>
            {/* Individual flowmeter */}
            <Blk x={330} y={y-14} w={70} h={28} label="РАСХ." stroke={GREEN}/>
            <line x1={400} y1={y} x2={440} y2={y} stroke={BLUE} strokeWidth={1.8}/>
            {/* Throttle */}
            <circle cx={453} cy={y} r={10} fill={BOX} stroke={MUTED} strokeWidth={1.5}/>
            <text x={453} y={y+3} fontSize={6.5} fill={MUTED} textAnchor="middle" fontFamily="monospace">РД</text>
            <Arr x1={463} y1={y} x2={530} y2={y} color={BLUE} thick={1.5}/>
            <Blk x={530} y={y-14} w={80} h={28} label={name} sub="нагн. скв." stroke={BLUE}/>
          </g>
        );
      })}
      {/* Telecontrol */}
      <Blk x={640} y={300} w={110} h={44} label="ТЕЛЕМЕХАНИКА" sub="контроль Q, P" stroke={AMBER}/>
      <Specs x={702} y={58} w={148} title="ПАРАМЕТРЫ" rows={[["Рабочее давление","50–250 атм"],["Кол-во скважин","4–10 шт"],["Расход индивид.","30–200 м³/сут"],["Телемеханика","есть"]]}/>
    </svg>
  );
}

/* ════════════════════════════════════════════════════════
   ГРУППА 5: ГАЗОВАЯ ИНФРАСТРУКТУРА
════════════════════════════════════════════════════════ */

/* ── УКПГ ── */
function UkpgScheme() {
  const W=860,H=480,FY=220;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",display:"block"}}>
      <rect width={W} height={H} fill={BG}/>
      <Grid w={W} h={H}/>
      <Title w={W} label="УКПГ — УСТАНОВКА КОМПЛЕКСНОЙ ПОДГОТОВКИ ГАЗА" sub="ПРИНЦИПИАЛЬНАЯ ТЕХНОЛОГИЧЕСКАЯ СХЕМА"/>
      {/* Inlet */}
      <text x={16} y={FY-8} fontSize={8} fill={AMBER} fontFamily="monospace">← ГАЗ С ПРОМЫСЛА</text>
      <Arr x1={16} y1={FY+8} x2={58} y2={FY+8} color={AMBER} thick={2}/>
      {/* Inlet separator */}
      <Vessel x={58} y={FY-80} w={55} h={165} label="СЕП. вх." stroke={CYAN}/>
      <text x={85} y={FY+96} fontSize={7.5} fill={MUTED} textAnchor="middle" fontFamily="monospace">Входной</text>
      {/* Condensate off bottom */}
      <Arr x1={85} y1={FY+85} x2={85} y2={FY+130} color="#c084fc"/>
      <Blk x={50} y={FY+130} w={70} h={34} label="КОНД. ЁМК." sub="→ стабил." stroke={PURPLE}/>
      {/* Water off bottom */}
      <Arr x1={113} y1={FY+85} x2={145} y2={FY+85} color={BLUE}/>
      <text x={155} y={FY+89} fontSize={7.5} fill={BLUE} fontFamily="monospace">→ ОСТ.</text>
      {/* Gas up to drying */}
      <Arr x1={113} y1={FY+8} x2={175} y2={FY+8} color={AMBER} thick={2}/>
      {/* Glycol absorber */}
      <Vessel x={175} y={FY-115} w={50} h={250} label="АБСОР." stroke={GREEN}/>
      <text x={200} y={FY+145} fontSize={7.5} fill={MUTED} textAnchor="middle" fontFamily="monospace">Осушка</text>
      <text x={200} y={FY+155} fontSize={7.5} fill={MUTED} textAnchor="middle" fontFamily="monospace">(ДЭГ/ТЭГ)</text>
      {/* Rich glycol off absorber bottom */}
      <Arr x1={225} y1={FY+135} x2={225} y2={FY+165} color={GREEN}/>
      <Blk x={185} y={FY+165} w={80} h={34} label="РЕГЕНЕРАТ." sub="ТЭГ-регенер." stroke={GREEN}/>
      {/* Dry gas from absorber top */}
      <Arr x1={225} y1={FY-115} x2={225} y2={FY-155} color={AMBER}/>
      <line x1={225} y1={FY-155} x2={300} y2={FY-155} stroke={AMBER} strokeWidth={1.8}/>
      <Arr x1={300} y1={FY-155} x2={300} y2={FY-16} color={AMBER}/>
      {/* Compressor */}
      <circle cx={300} cy={FY+8} r={28} fill={BOX} stroke={AMBER} strokeWidth={2}/>
      <text x={300} y={FY+3} fontSize={9} fill={AMBER} textAnchor="middle" fontFamily="monospace" fontWeight="bold">К</text>
      <text x={300} y={FY+16} fontSize={7} fill={MUTED} textAnchor="middle" fontFamily="monospace">компр.</text>
      <Arr x1={328} y1={FY+8} x2={375} y2={FY+8} color={AMBER} thick={2}/>
      {/* Aftercooler */}
      <Blk x={375} y={FY-14} w={70} h={36} label="ХВ" sub="воздушное охл." stroke={BLUE}/>
      <Arr x1={445} y1={FY+8} x2={490} y2={FY+8} color={AMBER} thick={2}/>
      {/* SIKN gas */}
      <Blk x={490} y={FY-22} w={80} h={44} label="СИКН ГАЗА" sub="коммерч. учёт" stroke={GREEN}/>
      <Arr x1={570} y1={FY+8} x2={620} y2={FY+8} color={AMBER} thick={2}/>
      {/* Export */}
      <Blk x={620} y={FY-22} w={90} h={44} label="МАГИСТРАЛЬ" sub="→ ГПЗ / потребитель" stroke={AMBER}/>
      <Arr x1={710} y1={FY+8} x2={760} y2={FY+8} color={AMBER} thick={2.5}/>
      {/* NGL line */}
      <Blk x={560} y={FY+100} w={100} h={44} label="ШФЛУ / КГС" sub="→ стабилизация" stroke={PURPLE}/>
      <Arr x1={490} y1={FY+60} x2={560} y2={FY+122} color={PURPLE}/>
      <Specs x={702} y={58} w={148} title="ПАРАМЕТРЫ" rows={[["Объём газа","1–10 млн м³/сут"],["Давление вх.","3–7 МПа"],["Давление вых.","5–12 МПа"],["Точка росы","до -20°C"],["Насыщ. ДЭГ/ТЭГ","99.5%"]]}/>
    </svg>
  );
}

/* ── ФАКЕЛЬНАЯ СИСТЕМА ── */
function FlareScheme() {
  const W=860,H=440,FY=280;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",display:"block"}}>
      <rect width={W} height={H} fill={BG}/>
      <Grid w={W} h={H}/>
      <Title w={W} label="ФАКЕЛЬНАЯ СИСТЕМА" sub="ПРИНЦИПИАЛЬНАЯ СХЕМА УТИЛИЗАЦИИ ГАЗА"/>
      {/* Gas sources on left */}
      {[
        ["Сепаратор 1",100],["Сепаратор 2",145],["Сепаратор 3",190],
        ["ГЗУ аварийный",235],["Предохр. клапаны",280],
      ].map(([label,y],i)=>(
        <g key={i}>
          <Blk x={18} y={Number(y)-14} w={95} h={28} label={String(label)} stroke={AMBER}/>
          <Arr x1={113} y1={Number(y)} x2={160} y2={Number(y)} color={AMBER} thick={1.5}/>
        </g>
      ))}
      {/* Collection header (vertical pipe) */}
      <rect x={160} y={88} width={12} height={204} fill={ACCENT} stroke={AMBER} strokeWidth={2}/>
      <text x={166} y={82} fontSize={7} fill={AMBER} textAnchor="middle" fontFamily="monospace">КОЛЛЕКТОР</text>
      <Arr x1={172} y1={190} x2={220} y2={190} color={AMBER} thick={2}/>
      {/* Knockout drum */}
      <Vessel x={220} y={130} w={60} h={160} label="К.О." stroke={CYAN}/>
      <text x={250} y={298} fontSize={7.5} fill={MUTED} textAnchor="middle" fontFamily="monospace">Отбойник</text>
      <text x={250} y={308} fontSize={7.5} fill={MUTED} textAnchor="middle" fontFamily="monospace">жидкости</text>
      {/* Liquid drain from KO drum */}
      <Arr x1={250} y1={290} x2={250} y2={340} color={CYAN}/>
      <Blk x={210} y={340} w={80} h={36} label="ЁМКОСТЬ" sub="→ откачка" stroke={CYAN}/>
      {/* Gas from KO drum */}
      <Arr x1={280} y1={190} x2={330} y2={190} color={AMBER} thick={2}/>
      {/* Liquid seal / molecular seal */}
      <rect x={330} y={160} width={60} height={70} fill={BOX} stroke={BLUE} strokeWidth={1.5} rx={4}/>
      <text x={360} y={192} fontSize={8} fill={BLUE} textAnchor="middle" fontFamily="monospace" fontWeight="bold">ГД</text>
      <text x={360} y={206} fontSize={7} fill={MUTED} textAnchor="middle" fontFamily="monospace">гидрозатвор</text>
      <Arr x1={390} y1={190} x2={430} y2={190} color={AMBER} thick={2}/>
      {/* Flare stack (vertical, going UP) */}
      <rect x={440} y={50} width={20} height={240} fill={ACCENT} stroke={AMBER} strokeWidth={2}/>
      <text x={450} y={46} fontSize={8} fill={AMBER} textAnchor="middle" fontFamily="monospace">СТВОЛ</text>
      {/* Flame at top */}
      <path d={`M440,50 Q445,20 450,10 Q455,20 452,35 Q458,15 460,8 Q465,22 458,50Z`}
        fill={AMBER} opacity={0.85}/>
      <path d={`M443,50 Q447,30 450,22 Q453,30 455,50Z`}
        fill={RED} opacity={0.7}/>
      <text x={450} y={6} fontSize={7.5} fill={RED} textAnchor="middle" fontFamily="monospace">ФАКЕЛ</text>
      {/* Pilot burner */}
      <circle cx={450} cy={60} r={8} fill={RED} opacity={0.7}/>
      <text x={476} y={64} fontSize={7} fill={RED} fontFamily="monospace">Дежурная горелка</text>
      {/* Ignition */}
      <line x1={440} y1={290} x2={390} y2={290} stroke={AMBER} strokeWidth={1.2} strokeDasharray="5,3"/>
      <Blk x={280} y={276} w={110} h={28} label="СИСТЕМА РОЗЖИГА" stroke={AMBER}/>
      {/* Radiation zone */}
      {[80,120,160].map((r,i)=>(
        <circle key={i} cx={450} cy={290} r={r} fill="none"
          stroke={RED} strokeWidth={0.6} opacity={0.15-i*0.04} strokeDasharray="8,4"/>
      ))}
      <text x={560} y={210} fontSize={7.5} fill={RED} fontFamily="monospace" opacity={0.6}>зона</text>
      <text x={556} y={220} fontSize={7.5} fill={RED} fontFamily="monospace" opacity={0.6}>теплов.</text>
      <text x={554} y={230} fontSize={7.5} fill={RED} fontFamily="monospace" opacity={0.6}>излучения</text>
      {/* Steam curtain */}
      <Blk x={540} y={80} w={95} h={36} label="ПАРОВАЯ ЗАВЕСА" sub="снижение дыма" stroke={MUTED}/>
      <line x1={540} y1={98} x2={460} y2={120} stroke={MUTED} strokeWidth={1} strokeDasharray="5,3" opacity={0.5}/>
      {/* H2S warning */}
      <rect x={640} y={160} width={110} height={55} fill="#1a0505" stroke={RED} strokeWidth={1.5} rx={4}/>
      <text x={695} y={180} fontSize={8} fill={RED} textAnchor="middle" fontFamily="monospace" fontWeight="bold">⚠ ЗОНА</text>
      <text x={695} y={194} fontSize={7.5} fill={RED} textAnchor="middle" fontFamily="monospace">ОТЧУЖДЕНИЯ</text>
      <text x={695} y={206} fontSize={7} fill={MUTED} textAnchor="middle" fontFamily="monospace">R = 300–500 м</text>
      <Specs x={630} y={235} w={220} title="ПАРАМЕТРЫ" rows={[["Высота факельного ствола","30–120 м"],["Давление в коллекторе","0.05–0.5 атм"],["Т пламени (макс)","1000–1400°C"],["Пропускная способность","до 500 т/ч"],["Зона отчуждения R","300–500 м"]]}/>
    </svg>
  );
}

/* ════════════════════════════════════════════════════════
   DATA MODEL
════════════════════════════════════════════════════════ */

interface SchemeInfo {
  id: SchemeId;
  labelRu: string;
  labelEn: string;
  descRu: string;
  descEn: string;
}

interface Group {
  id: string;
  labelRu: string;
  labelEn: string;
  schemes: SchemeInfo[];
}

const GROUPS: Group[] = [
  {
    id: "lift",
    labelRu: "Механизированная добыча",
    labelEn: "Artificial Lift",
    schemes: [
      { id:"sgn",     labelRu:"ШГН",     labelEn:"SRP",     descRu:"Штанговый глубинный насос",           descEn:"Sucker Rod Pump" },
      { id:"ecn",     labelRu:"ЭЦН",     labelEn:"ESP",     descRu:"Электроцентробежный насос",           descEn:"Electric Submersible Pump" },
      { id:"evn",     labelRu:"ЭВН",     labelEn:"EVP",     descRu:"Электровинтовой насос",               descEn:"Electric Vortex/Screw Pump" },
      { id:"gazlift", labelRu:"Газлифт", labelEn:"Gas Lift",descRu:"Газлифтный способ добычи",            descEn:"Gas Lift System" },
    ],
  },
  {
    id: "gather",
    labelRu: "Сбор и замер",
    labelEn: "Gathering & Metering",
    schemes: [
      { id:"agzu", labelRu:"АГЗУ", labelEn:"AGZU", descRu:"Автоматизированная групповая замерная установка", descEn:"Automated Group Metering Unit" },
      { id:"dns",  labelRu:"ДНС",  labelEn:"BPS",  descRu:"Дожимная насосная станция",                       descEn:"Booster Pump Station" },
      { id:"sikn", labelRu:"СИКН", labelEn:"SIKN", descRu:"Система измерений количества и качества нефти",   descEn:"Oil Metering System" },
    ],
  },
  {
    id: "process",
    labelRu: "Подготовка нефти",
    labelEn: "Oil Processing",
    schemes: [
      { id:"uppn", labelRu:"УППН", labelEn:"PPOU", descRu:"Установка предварительной подготовки нефти", descEn:"Preliminary Oil Processing Unit" },
    ],
  },
  {
    id: "ppd",
    labelRu: "Поддержание пластового давления",
    labelEn: "Pressure Maintenance",
    schemes: [
      { id:"bkns", labelRu:"БКНС", labelEn:"BCPS", descRu:"Блочная кустовая насосная станция",   descEn:"Block Cluster Pump Station" },
      { id:"vrp",  labelRu:"ВРП",  labelEn:"WDP",  descRu:"Водораспределительный пункт",          descEn:"Water Distribution Point" },
    ],
  },
  {
    id: "gas",
    labelRu: "Газовая инфраструктура",
    labelEn: "Gas Infrastructure",
    schemes: [
      { id:"ukpg",  labelRu:"УКПГ",            labelEn:"GTU",   descRu:"Установка комплексной подготовки газа", descEn:"Gas Treatment Unit" },
      { id:"flare", labelRu:"Факельная система",labelEn:"Flare", descRu:"Система утилизации попутного газа",    descEn:"Gas Flare System" },
    ],
  },
];

const DIAGRAM: Record<SchemeId, React.ReactElement> = {
  sgn:     <SgnScheme/>,
  ecn:     <EcnScheme/>,
  evn:     <EvnScheme/>,
  gazlift: <GazliftScheme/>,
  agzu:    <AgzuScheme/>,
  dns:     <DnsScheme/>,
  sikn:    <SiknScheme/>,
  uppn:    <UppnScheme/>,
  bkns:    <BknsScheme/>,
  vrp:     <VrpScheme/>,
  ukpg:    <UkpgScheme/>,
  flare:   <FlareScheme/>,
};

/* ════════════════════════════════════════════════════════
   MAIN EXPORT
════════════════════════════════════════════════════════ */
export function EquipmentSchemesTab() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [active, setActive] = useState<SchemeId>("sgn");

  // Which group contains the active scheme
  const activeGroup = GROUPS.find(g => g.schemes.some(s => s.id === active))!;
  const [openGroup, setOpenGroup] = useState<string>(activeGroup.id);

  const current = GROUPS.flatMap(g => g.schemes).find(s => s.id === active)!;
  const visibleGroup = GROUPS.find(g => g.id === openGroup)!;

  function handleGroupClick(groupId: string) {
    if (openGroup === groupId) return; // already open
    setOpenGroup(groupId);
    // auto-select first scheme in new group
    const first = GROUPS.find(g => g.id === groupId)!.schemes[0];
    setActive(first.id);
  }

  return (
    <div className="space-y-3">
      {/* ── Level-1: horizontal group tabs ── */}
      <div className="flex gap-px rounded-xl overflow-hidden border border-border bg-muted/10">
        {GROUPS.map((group, idx) => {
          const isOpen = openGroup === group.id;
          return (
            <button
              key={group.id}
              onClick={() => handleGroupClick(group.id)}
              className={`flex-1 px-3 py-2.5 text-center transition-colors relative
                ${idx === 0 ? "" : "border-l border-border"}
                ${isOpen
                  ? "bg-blue-900/60 text-blue-200"
                  : "bg-transparent text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                }`}
            >
              <span className="block text-[11px] font-bold font-mono tracking-wide leading-tight">
                {isEn ? group.labelEn : group.labelRu}
              </span>
              {/* active indicator stripe */}
              {isOpen && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Level-2: scheme pills for the open group ── */}
      <div className="flex flex-wrap gap-2 px-1">
        {visibleGroup.schemes.map(s => {
          const isActive = active === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-colors
                ${isActive
                  ? "bg-blue-700 border-blue-500 text-white"
                  : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
            >
              <span className="font-bold font-mono text-xs">{isEn ? s.labelEn : s.labelRu}</span>
              <span className={`text-[10px] hidden sm:inline ${isActive ? "text-blue-200" : "text-muted-foreground"}`}>
                {isEn ? s.descEn : s.descRu}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Active scheme title bar ── */}
      <div className="flex items-center gap-3 rounded-lg border border-[#1d4ed8]/40 bg-[#020817] px-4 py-2">
        <span className="text-xs font-mono font-bold text-blue-400">
          {isEn ? current.labelEn : current.labelRu}
        </span>
        <span className="text-muted-foreground text-xs">—</span>
        <span className="text-xs text-slate-300 font-mono">
          {isEn ? current.descEn : current.descRu}
        </span>
      </div>

      {/* ── Diagram ── */}
      <div className="rounded-xl border border-[#1d4ed8]/40 overflow-hidden bg-[#020817]">
        {DIAGRAM[active]}
      </div>
    </div>
  );
}

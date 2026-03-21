import { useRef, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileImage, FileCode } from "lucide-react";

export type WellPumpType = "sgn" | "ecn" | "evn";

export interface PlacedWellComponent {
  typeId: string;
  depth: number;
}

interface WellEquipment3DViewerProps {
  wellName: string;
  fieldName?: string;
  defaultPumpType?: WellPumpType;
  /** При наличии — используются глубины из редактора вместо шаблона */
  placedComponents?: PlacedWellComponent[];
  /** В режиме предпросмотра — не переключать тип насоса, использовать defaultPumpType */
  previewMode?: boolean;
}

/* ────────────────── Component details for popup ────────────────── */
type ComponentDetail = {
  name: string;
  description: string;
  specs: { label: string; value: string }[];
};

const COMPONENT_DETAILS: Record<string, ComponentDetail> = {
  conductor: {
    name: "Кондуктор",
    description: "Направляющая колонна для изоляции неустойчивых пород и защиты пресноводных горизонтов.",
    specs: [
      { label: "Диаметр", value: "530 мм" },
      { label: "Глубина спуска", value: "30 м" },
      { label: "Материал", value: "Сталь 20" },
    ],
  },
  surfaceCasing: {
    name: "Техническая колонна",
    description: "Промежуточная обсадная колонна для крепления верхних интервалов разреза.",
    specs: [
      { label: "Диаметр", value: "324 мм" },
      { label: "Глубина спуска", value: "180 м" },
      { label: "Материал", value: "Сталь Д" },
    ],
  },
  interCasing: {
    name: "Промежуточная колонна",
    description: "Обсадная колонна для изоляции пластов и обеспечения устойчивости ствола.",
    specs: [
      { label: "Диаметр", value: "245 мм" },
      { label: "Глубина спуска", value: "520 м" },
      { label: "Материал", value: "Сталь Д" },
    ],
  },
  prodCasing: {
    name: "Эксплуатационная колонна",
    description: "Основная колонна для изоляции продуктивного пласта и крепления ствола скважины.",
    specs: [
      { label: "Диаметр", value: "168 мм" },
      { label: "Глубина спуска", value: "975 м" },
      { label: "Материал", value: "Сталь Д" },
    ],
  },
  cement: {
    name: "Цементное кольцо",
    description: "Цементный раствор для изоляции затрубного пространства и крепления обсадных колонн.",
    specs: [
      { label: "Тип", value: "Портландцемент" },
      { label: "Плотность", value: "1,85 г/см³" },
    ],
  },
  tubing: {
    name: "НКТ (насосно-компрессорные трубы)",
    description: "Трубы для подъёма продукции и спуска насосного оборудования.",
    specs: [
      { label: "Диаметр", value: "73 мм" },
      { label: "Материал", value: "Сталь 20" },
      { label: "Резьба", value: "ЕУ" },
    ],
  },
  perforation: {
    name: "Перфорация",
    description: "Отверстия в эксплуатационной колонне для притока продукции из пласта.",
    specs: [
      { label: "Интервал", value: "830–905 м" },
      { label: "Тип", value: "Кумулятивная" },
      { label: "Плотность", value: "12 отв/м" },
    ],
  },
  fluidLevel: {
    name: "Уровень динамической жидкости",
    description: "Уровень жидкости в затрубном пространстве при установившемся режиме работы скважины.",
    specs: [
      { label: "Глубина", value: "270 м" },
      { label: "Тип", value: "УДЖ" },
    ],
  },
  wellhead: {
    name: "Фонтанная арматура",
    description: "Устьевое оборудование для контроля и отвода продукции из скважины.",
    specs: [
      { label: "Тип", value: "АФК-65" },
      { label: "Рабочее давление", value: "25 МПа" },
    ],
  },
  sgnPump: {
    name: "Насос ШГН",
    description: "Штанговый глубинный насос для механизированной добычи нефти.",
    specs: [
      { label: "Марка", value: "НВ 1-44-18" },
      { label: "Диаметр плунжера", value: "44 мм" },
      { label: "Ход плунжера", value: "1,8 м" },
      { label: "Глубина спуска", value: "730–760 м" },
    ],
  },
  rodString: {
    name: "Штанги (СКВ)",
    description: "Колонна штанг для передачи возвратно-поступательного движения от станка-качалки к насосу.",
    specs: [
      { label: "Диаметр", value: "19 мм" },
      { label: "Материал", value: "Сталь 40" },
      { label: "Длина колонны", value: "~730 м" },
    ],
  },
  tubingAnchor: {
    name: "Якорь НКТ",
    description: "Устройство для фиксации НКТ и предотвращения продольных перемещений.",
    specs: [
      { label: "Тип", value: "Механический" },
      { label: "Глубина", value: "720 м" },
    ],
  },
  beamPump: {
    name: "Станок-качалка",
    description: "Механизм для приведения в движение колонны штанг и глубинного насоса.",
    specs: [
      { label: "Марка", value: "СК-6-2.5-2500" },
      { label: "Номинальная нагрузка", value: "100 кН" },
      { label: "Ход устьевого штока", value: "2,5 м" },
    ],
  },
  beamPumpMotor: {
    name: "Приводной электродвигатель",
    description: "Асинхронный электродвигатель для привода станка-качалки.",
    specs: [
      { label: "Мощность", value: "18,5 кВт" },
      { label: "Напряжение", value: "380 В" },
    ],
  },
  stuffingBox: {
    name: "Сальниковый узел",
    description: "Уплотнение полированного штока в месте выхода из устья скважины.",
    specs: [
      { label: "Тип", value: "Сальниковая головка" },
      { label: "Давление", value: "до 25 МПа" },
    ],
  },
  ecnPump: {
    name: "Насос ЭЦН",
    description: "Многоступенчатый центробежный насос для подъёма жидкости из скважины.",
    specs: [
      { label: "Тип", value: "ЭЦН 5-80" },
      { label: "Подача", value: "до 80 м³/сут" },
      { label: "Напор", value: "до 1200 м" },
      { label: "Глубина спуска", value: "820–880 м" },
    ],
  },
  gasSeparator: {
    name: "Газосепаратор",
    description: "Устройство для отделения свободного газа от жидкости перед насосом.",
    specs: [
      { label: "Тип", value: "Винтовой" },
      { label: "Интервал", value: "800–820 м" },
    ],
  },
  protector: {
    name: "Протектор (гидрозащита)",
    description: "Устройство для защиты электродвигателя от попадания пластовой жидкости.",
    specs: [
      { label: "Тип", value: "Мембранный" },
      { label: "Интервал", value: "880–900 м" },
    ],
  },
  ped: {
    name: "ПЭД (погружной электродвигатель)",
    description: "Многосекционный асинхронный электродвигатель для привода насоса ЭЦН.",
    specs: [
      { label: "Мощность", value: "45 кВт" },
      { label: "Напряжение", value: "1140 В" },
      { label: "Интервал", value: "900–960 м" },
    ],
  },
  ecnCable: {
    name: "Кабель КПБП",
    description: "Кабель погружной для питания погружного электродвигателя.",
    specs: [
      { label: "Сечение", value: "16 мм²" },
      { label: "Напряжение", value: "до 3 кВ" },
    ],
  },
  checkValve: {
    name: "Обратный клапан",
    description: "Клапан для предотвращения обратного потока жидкости при остановке насоса.",
    specs: [
      { label: "Тип", value: "Шариковый" },
      { label: "Глубина", value: "790 м" },
    ],
  },
  evnPump: {
    name: "Насос ЭВН",
    description: "Электровинтовой насос — погружной насос с винтовым рабочим органом для перекачки высоковязких и газированных жидкостей.",
    specs: [
      { label: "Тип", value: "ЭВН 5-50" },
      { label: "Подача", value: "до 50 м³/сут" },
      { label: "Напор", value: "до 900 м" },
      { label: "Глубина спуска", value: "800–850 м" },
    ],
  },
  evnMotor: {
    name: "ПЭД (погружной электродвигатель ЭВН)",
    description: "Маслозаполненный погружной двигатель для привода электровинтового насоса.",
    specs: [
      { label: "Мощность", value: "22 кВт" },
      { label: "Напряжение", value: "660 В" },
      { label: "Интервал", value: "860–920 м" },
    ],
  },
  evnProtector: {
    name: "Протектор ЭВН",
    description: "Гидрозащита двигателя от проникновения пластовой жидкости.",
    specs: [
      { label: "Тип", value: "Торцевой" },
      { label: "Интервал", value: "850–860 м" },
    ],
  },
  evnCable: {
    name: "Кабель ЭВН",
    description: "Бронированный кабель для питания погружного двигателя ЭВН.",
    specs: [
      { label: "Сечение", value: "10 мм²" },
      { label: "Напряжение", value: "до 1,5 кВ" },
    ],
  },
  controlStation: {
    name: "Станция управления ЭЦН",
    description: "Комплекс оборудования для управления и защиты погружной установки.",
    specs: [
      { label: "Марка", value: "УЭЦН-60-1200" },
      { label: "Мощность", value: "60 кВт" },
      { label: "Напряжение", value: "1140 В" },
    ],
  },
  transformer: {
    name: "Трансформатор",
    description: "Трансформатор для питания станции управления ЭЦН.",
    specs: [
      { label: "Мощность", value: "100 кВА" },
      { label: "Напряжение", value: "6/0,4 кВ" },
    ],
  },
};

/* ────────────────── SVG constants ────────────────── */
const W = 820;
const ABOVE = 330;   // px above ground
const BELOW = 760;   // px below ground (represents 1000m)
const H = ABOVE + BELOW;
const CX = 400;      // well centre X
const SCALE = BELOW / 1000; // px per metre
const toY = (m: number) => ABOVE + m * SCALE;

/* half-widths (px) of each string */
const HW = {
  conductor: 56,
  surface: 43,
  inter: 31,
  prod: 21,
  tubing: 11,
  tubingWall: 2,
  rod: 3,
  cable: 3,
};

/* depths (m) — defaults */
const D_DEFAULT = {
  conductorShoe: 30,
  surfaceShoe: 180,
  interShoe: 520,
  prodShoe: 975,
  tubingBot_sgn: 740,
  tubingBot_ecn: 810,
  tubingBot_evn: 800,
  fluidLevel: 270,
  sgnPumpTop: 730,
  sgnPumpBot: 760,
  sgnAnchor: 720,
  motorBot: 960,
  motorTop: 900,
  sealBot: 900,
  sealTop: 880,
  pumpBot: 880,
  pumpTop: 820,
  gasSepBot: 820,
  gasSepTop: 800,
  checkValve: 790,
  perfTop: 830,
  perfBot: 905,
  // ЭВН depths
  evnPumpTop: 800,
  evnPumpBot: 850,
  evnProtectorTop: 850,
  evnProtectorBot: 860,
  evnMotorTop: 860,
  evnMotorBot: 920,
};

function buildDepthsFromPlaced(
  placed: PlacedWellComponent[],
  _isSgn: boolean
): typeof D_DEFAULT {
  const byType = Object.fromEntries(placed.map((c) => [c.typeId, c.depth]));

  const conductorShoe = byType["conductor"] ?? D_DEFAULT.conductorShoe;
  const surfaceShoe = byType["surfaceCasing"] ?? D_DEFAULT.surfaceShoe;
  const interShoe = byType["interCasing"] ?? D_DEFAULT.interShoe;
  const prodShoe = byType["prodCasing"] ?? D_DEFAULT.prodShoe;

  const perfCenter = byType["perforation"] ?? 867;
  const perfTop = perfCenter - 37;
  const perfBot = perfCenter + 38;

  const sgnPumpCenter = byType["sgnPump"] ?? 745;
  const sgnPumpTop = sgnPumpCenter - 15;
  const sgnPumpBot = sgnPumpCenter + 15;
  const sgnAnchor = byType["tubingAnchor"] ?? sgnPumpTop - 20;
  const tubingDepth = byType["tubing"];
  const tubingHeight = 700;
  const tubingBot_sgn = tubingDepth != null ? Math.min(tubingDepth + tubingHeight, 1000) : sgnPumpBot;

  const pumpCenter = byType["ecnPump"] ?? 850;
  const pumpTop = pumpCenter - 30;
  const pumpBot = pumpCenter + 30;
  const pedCenter = byType["ped"] ?? 930;
  const motorTop = pedCenter - 30;
  const motorBot = pedCenter + 30;
  const sealTop = byType["protector"] ?? motorTop;
  const sealBot = sealTop + 20;
  const gasSepTop = byType["gasSeparator"] ?? pumpTop - 10;
  const gasSepBot = gasSepTop + 20;
  const checkValve = byType["checkValve"] ?? 790;
  const tubingBot_ecn = tubingDepth != null ? Math.min(tubingDepth + tubingHeight, 1000) : pumpBot;

  // ЭВН
  const evnPumpCenter = byType["evnPump"] ?? 825;
  const evnPumpTop = evnPumpCenter - 25;
  const evnPumpBot = evnPumpCenter + 25;
  const evnProtectorTop = evnPumpBot;
  const evnProtectorBot = evnProtectorTop + 10;
  const evnMotorTop = evnProtectorBot;
  const evnMotorBot = evnMotorTop + 60;
  const tubingBot_evn = tubingDepth != null ? Math.min(tubingDepth + tubingHeight, 1000) : evnPumpBot;

  return {
    ...D_DEFAULT,
    conductorShoe,
    surfaceShoe,
    interShoe,
    prodShoe,
    perfTop,
    perfBot,
    tubingBot_sgn,
    tubingBot_ecn,
    tubingBot_evn,
    sgnPumpTop,
    sgnPumpBot,
    sgnAnchor,
    motorBot,
    motorTop,
    sealBot,
    sealTop,
    pumpBot,
    pumpTop,
    gasSepBot,
    evnPumpTop,
    evnPumpBot,
    evnProtectorTop,
    evnProtectorBot,
    evnMotorTop,
    evnMotorBot,
    gasSepTop,
    checkValve,
  };
}

/* ── clickable SVG group ── */
function ClickableRect({
  x,
  y,
  width,
  height,
  componentId,
  onSelect,
  children,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  componentId: string;
  onSelect: (id: string) => void;
  children: React.ReactNode;
}) {
  const name = COMPONENT_DETAILS[componentId]?.name ?? componentId;
  return (
    <g
      onClick={() => onSelect(componentId)}
      style={{ cursor: "pointer" }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect(componentId)}
      aria-label={name}
    >
      <title>{name} — нажмите для деталей</title>
      <rect x={x} y={y} width={width} height={height} fill="transparent" />
      {children}
    </g>
  );
}

/* ────────────────── Component ────────────────── */
export function WellEquipment3DViewer({
  wellName,
  fieldName,
  defaultPumpType = "sgn",
  placedComponents,
  previewMode = false,
}: WellEquipment3DViewerProps) {
  const { t } = useLanguage();
  const [pump, setPump] = useState<WellPumpType>(defaultPumpType);
  const effectivePump = previewMode ? defaultPumpType : pump;
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const isSgn = effectivePump === "sgn";
  const isEvn = effectivePump === "evn";
  const D = placedComponents?.length
    ? buildDepthsFromPlaced(placedComponents, isSgn)
    : D_DEFAULT;

  const tubingBot = isSgn ? D.tubingBot_sgn : isEvn ? D.tubingBot_evn : D.tubingBot_ecn;
  const detail = selectedComponentId ? COMPONENT_DETAILS[selectedComponentId] : null;

  const safeFileName = (s: string) => s.replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s+/g, "_").slice(0, 50) || "scheme";
  const baseName = `${safeFileName(wellName)}_${isSgn ? "ШГН" : isEvn ? "ЭВН" : "ЭЦН"}`;

  const downloadSvg = () => {
    const svg = svgRef.current;
    if (!svg) return;
    setExporting(true);
    try {
      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      const svgStr = new XMLSerializer().serializeToString(clone);
      const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${baseName}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const downloadPng = () => {
    const svg = svgRef.current;
    if (!svg) return;
    setExporting(true);
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const svgStr = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, W, H);
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `${baseName}.png`;
        a.click();
      } finally {
        URL.revokeObjectURL(url);
        setExporting(false);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setExporting(false);
    };
    img.src = url;
  };

  /* ── formation layers (short labels to avoid overlap) ── */
  const formations = [
    { from: 0,   to: 80,  color: "#d4a76a", label: "Суглинок" },
    { from: 80,  to: 220, color: "#ca8a04", label: "Песчаник Н" },
    { from: 220, to: 400, color: "#a16207", label: "Глины" },
    { from: 400, to: 590, color: "#92400e", label: "Аргиллиты" },
    { from: 590, to: 730, color: "#6b7280", label: "Известняки" },
    { from: 730, to: 830, color: "#7c2d12", label: "Нефт. пласт" },
    { from: 830, to: 910, color: "#b45309", label: "Пласт Т1-А" },
    { from: 910, to: 1000,color: "#4b5563", label: "Подошва" },
  ];

  return (
    <div className="space-y-3">
      {/* header + toggle + export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{wellName}</p>
          {fieldName && <p className="text-xs text-muted-foreground">{t("oilField")}: {fieldName}</p>}
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={exporting}>
                <Download className="h-4 w-4 mr-2" />
                {t("wellExport")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={downloadPng}>
                <FileImage className="h-4 w-4 mr-2" />
                {t("wellExportPng")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadSvg}>
                <FileCode className="h-4 w-4 mr-2" />
                {t("wellExportSvg")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {!previewMode && (
            <div className="flex rounded-md overflow-hidden border border-[#1d4ed8]/50 text-sm font-medium">
              <button
                onClick={() => setPump("sgn")}
                className={`px-4 py-1.5 transition-colors font-mono text-xs ${isSgn ? "bg-blue-700 text-white" : "bg-[#0a1628] text-slate-400 hover:bg-[#0f2240] hover:text-slate-200"}`}
              >
                ШГН
              </button>
              <button
                onClick={() => setPump("ecn")}
                className={`px-4 py-1.5 border-l border-[#1d4ed8]/40 transition-colors font-mono text-xs ${effectivePump === "ecn" ? "bg-blue-700 text-white" : "bg-[#0a1628] text-slate-400 hover:bg-[#0f2240] hover:text-slate-200"}`}
              >
                ЭЦН
              </button>
              <button
                onClick={() => setPump("evn")}
                className={`px-4 py-1.5 border-l border-[#1d4ed8]/40 transition-colors font-mono text-xs ${isEvn ? "bg-blue-700 text-white" : "bg-[#0a1628] text-slate-400 hover:bg-[#0f2240] hover:text-slate-200"}`}
              >
                ЭВН
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-auto rounded-xl border border-[#1d4ed8]/40 shadow bg-[#020817] pl-3">
        <svg
          ref={svgRef}
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          style={{ display: "block", minWidth: W }}
          fontFamily="system-ui, sans-serif"
        >
          <defs>
            {/* ── Glow filters ── */}
            <filter id="wv-glow-cyan" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="wv-glow-green" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="wv-glow-blue" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="wv-glow-soft" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>

            {/* ── Backgrounds ── */}
            <linearGradient id="wv-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#020817" />
              <stop offset="60%" stopColor="#0a1628" />
              <stop offset="100%" stopColor="#0d1f38" />
            </linearGradient>
            <linearGradient id="wv-underground" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0a0e18" />
              <stop offset="50%" stopColor="#0d1117" />
              <stop offset="100%" stopColor="#110a06" />
            </linearGradient>
            <linearGradient id="wv-earth" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#7c2d12" stopOpacity="0.12" />
              <stop offset="50%" stopColor="#92400e" stopOpacity="0.07" />
              <stop offset="100%" stopColor="#7c2d12" stopOpacity="0.12" />
            </linearGradient>

            {/* ── Component gradients ── */}
            <linearGradient id="wv-motor" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0c1a4d" />
              <stop offset="35%" stopColor="#1d4ed8" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="65%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#0c1a4d" />
            </linearGradient>
            <linearGradient id="wv-pump" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#052e16" />
              <stop offset="35%" stopColor="#15803d" />
              <stop offset="50%" stopColor="#22c55e" />
              <stop offset="65%" stopColor="#15803d" />
              <stop offset="100%" stopColor="#052e16" />
            </linearGradient>
            <linearGradient id="wv-seal" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#2e1065" />
              <stop offset="40%" stopColor="#7e22ce" />
              <stop offset="60%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#2e1065" />
            </linearGradient>
            <linearGradient id="wv-steel" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="wv-casing" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0e2a3a" />
              <stop offset="50%" stopColor="#0e7490" />
              <stop offset="100%" stopColor="#0e2a3a" />
            </linearGradient>
            <linearGradient id="wv-tubing" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#082f49" />
              <stop offset="50%" stopColor="#0369a1" />
              <stop offset="100%" stopColor="#082f49" />
            </linearGradient>
            <linearGradient id="wv-ground" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#92400e" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="wv-fluid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0.28" />
            </linearGradient>

            {/* ── Patterns ── */}
            <pattern id="wv-cement" x="0" y="0" width="10" height="7" patternUnits="userSpaceOnUse">
              <rect width="10" height="7" fill="#1e3a4a" opacity="0.5" />
              <line x1="0" y1="3.5" x2="10" y2="3.5" stroke="#0e7490" strokeWidth="0.6" opacity="0.4" />
            </pattern>
            <pattern id="wv-hatch" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
              <line x1="0" y1="6" x2="6" y2="0" stroke="#92400e" strokeWidth="0.8" opacity="0.4" />
            </pattern>
            {/* ── Tech grid pattern ── */}
            <pattern id="wv-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0ea5e9" strokeWidth="0.25" opacity="0.15" />
            </pattern>
            {/* ── Scan lines ── */}
            <pattern id="wv-scan" x="0" y="0" width="1" height="4" patternUnits="userSpaceOnUse">
              <rect width="1" height="1" fill="#000" opacity="0.12" />
            </pattern>
          </defs>

          {/* ── background sky (dark) ── */}
          <rect x="0" y="0" width={W} height={ABOVE} fill="url(#wv-sky)" />
          {/* grid overlay above ground */}
          <rect x="0" y="0" width={W} height={ABOVE} fill="url(#wv-grid)" />

          {/* ── underground background ── */}
          <rect x="0" y={ABOVE} width={W} height={BELOW} fill="url(#wv-underground)" />
          <rect x="0" y={ABOVE} width={W} height={BELOW} fill="url(#wv-earth)" />
          {/* tech grid underground */}
          <rect x="0" y={ABOVE} width={W} height={BELOW} fill="url(#wv-grid)" opacity="0.6" />

          {/* ── formation layers ── */}
          {formations.map((f, i) => (
            <rect
              key={i}
              x={0}
              y={toY(f.from)}
              width={W}
              height={toY(f.to) - toY(f.from)}
              fill={f.color}
              opacity={i === 7 ? 0.10 : i >= 5 ? 0.14 : 0.08}
            />
          ))}

          {/* ── depth scale (right edge) ── */}
          <line x1={W - 65} y1={ABOVE} x2={W - 65} y2={H - 10} stroke="#0e7490" strokeWidth="1" opacity="0.7" />
          {[0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000].map((m) => (
            <g key={m}>
              <line x1={W - 72} y1={toY(m)} x2={W - 65} y2={toY(m)} stroke="#22d3ee" strokeWidth="1" opacity="0.7" />
              <text x={W - 60} y={toY(m) + 3} fontSize="9" fill="#22d3ee" opacity="0.8" fontFamily="monospace">{m}м</text>
            </g>
          ))}

          {/* ── formation labels (left edge) ── */}
          {formations.map((f, i) => (
            <text
              key={i}
              x={12 + (i % 2) * 85}
              y={toY((f.from + f.to) / 2) + 4}
              fontSize="8"
              fill="#f59e0b"
              opacity="0.55"
              fontFamily="monospace"
            >
              {f.label}
            </text>
          ))}

          {/* ────── CEMENT fills ────── */}
          <ClickableRect
            x={CX - HW.conductor}
            y={ABOVE - 14}
            width={HW.conductor * 2}
            height={toY(D.interShoe) - ABOVE + 14}
            componentId="cement"
            onSelect={setSelectedComponentId}
          >
            <rect x={CX - HW.conductor} y={ABOVE - 14} width={HW.conductor - HW.surface} height={toY(D.conductorShoe) - ABOVE + 14} fill="url(#wv-cement)" />
            <rect x={CX + HW.surface} y={ABOVE - 14} width={HW.conductor - HW.surface} height={toY(D.conductorShoe) - ABOVE + 14} fill="url(#wv-cement)" />
            <rect x={CX - HW.surface} y={ABOVE - 10} width={HW.surface - HW.inter} height={toY(D.surfaceShoe) - ABOVE + 10} fill="url(#wv-cement)" />
            <rect x={CX + HW.inter} y={ABOVE - 10} width={HW.surface - HW.inter} height={toY(D.surfaceShoe) - ABOVE + 10} fill="url(#wv-cement)" />
            <rect x={CX - HW.inter} y={ABOVE - 6} width={HW.inter - HW.prod} height={toY(D.interShoe) - ABOVE + 6} fill="url(#wv-cement)" />
            <rect x={CX + HW.prod} y={ABOVE - 6} width={HW.inter - HW.prod} height={toY(D.interShoe) - ABOVE + 6} fill="url(#wv-cement)" />
          </ClickableRect>

          {/* ── fluid in annulus (prod casing ↔ tubing) ── */}
          <ClickableRect
            x={CX - HW.prod}
            y={toY(D.fluidLevel)}
            width={HW.prod * 2}
            height={toY(D.perfTop) - toY(D.fluidLevel)}
            componentId="fluidLevel"
            onSelect={setSelectedComponentId}
          >
            <rect
              x={CX - HW.prod + 3}
              y={toY(D.fluidLevel)}
              width={(HW.prod - 3 - HW.tubing) * 2}
              height={toY(D.perfTop) - toY(D.fluidLevel)}
              fill="url(#wv-fluid)"
              opacity="0.9"
            />
          </ClickableRect>

          {/* ────── CASING STRINGS ────── */}
          {[
            { id: "conductor", hw: HW.conductor, shoe: D.conductorShoe, w: 4.5, color: "#0e7490", glow: "#22d3ee", top: -14 },
            { id: "surfaceCasing", hw: HW.surface, shoe: D.surfaceShoe, w: 3.5, color: "#0369a1", glow: "#38bdf8", top: -10 },
            { id: "interCasing", hw: HW.inter, shoe: D.interShoe, w: 3, color: "#1d4ed8", glow: "#60a5fa", top: -6 },
            { id: "prodCasing", hw: HW.prod, shoe: D.prodShoe, w: 2.5, color: "#1e40af", glow: "#818cf8", top: -3 },
          ].map(({ id, hw, shoe, w, color, glow, top }) => (
            <ClickableRect
              key={id}
              x={CX - hw}
              y={ABOVE + top}
              width={hw * 2}
              height={toY(shoe) - ABOVE - top + 5}
              componentId={id}
              onSelect={setSelectedComponentId}
            >
              <rect x={CX - hw} y={ABOVE + top} width={w} height={toY(shoe) - ABOVE - top} fill={color} stroke={glow} strokeWidth="0.5" opacity="0.9" />
              <rect x={CX + hw - w} y={ABOVE + top} width={w} height={toY(shoe) - ABOVE - top} fill={color} stroke={glow} strokeWidth="0.5" opacity="0.9" />
              <rect x={CX - hw} y={toY(shoe) - 4} width={hw * 2} height={5} fill={glow} rx="1" opacity="0.7" />
              {/* highlight strip */}
              <rect x={CX - hw} y={ABOVE + top} width={1} height={toY(shoe) - ABOVE - top} fill={glow} opacity="0.4" />
              <rect x={CX + hw - 1} y={ABOVE + top} width={1} height={toY(shoe) - ABOVE - top} fill={glow} opacity="0.4" />
            </ClickableRect>
          ))}

          {/* ── perforations ── */}
          <ClickableRect
            x={CX - HW.prod - 15}
            y={toY(D.perfTop)}
            width={HW.prod * 2 + 50}
            height={toY(D.perfBot) - toY(D.perfTop)}
            componentId="perforation"
            onSelect={setSelectedComponentId}
          >
            {Array.from({ length: 22 }).map((_, i) => {
              const y = toY(D.perfTop + ((D.perfBot - D.perfTop) * i) / 21);
              return (
                <g key={i}>
                  <line x1={CX - HW.prod - 10} y1={y} x2={CX - HW.prod + 1} y2={y} stroke="#f87171" strokeWidth="1.8" />
                  <circle cx={CX - HW.prod - 10} cy={y} r="1.5" fill="#ef4444" />
                  <line x1={CX + HW.prod - 1} y1={y} x2={CX + HW.prod + 10} y2={y} stroke="#f87171" strokeWidth="1.8" />
                  <circle cx={CX + HW.prod + 10} cy={y} r="1.5" fill="#ef4444" />
                </g>
              );
            })}
            <text x={CX + HW.prod + 14} y={toY((D.perfTop + D.perfBot) / 2) + 3} fontSize="9" fill="#f87171" fontWeight="bold" fontFamily="monospace">ПЕРФ.</text>
          </ClickableRect>

          {/* ────── TUBING (НКТ) ────── */}
          <ClickableRect
            x={CX - HW.tubing - 2}
            y={ABOVE - 2}
            width={(HW.tubing + 2) * 2}
            height={toY(tubingBot) - ABOVE + 2}
            componentId="tubing"
            onSelect={setSelectedComponentId}
          >
            <rect x={CX - HW.tubing} y={ABOVE - 2} width={HW.tubingWall} height={toY(tubingBot) - ABOVE + 2} fill="url(#wv-tubing)" />
            <rect x={CX + HW.tubing - HW.tubingWall} y={ABOVE - 2} width={HW.tubingWall} height={toY(tubingBot) - ABOVE + 2} fill="url(#wv-tubing)" />
            {/* highlight */}
            <rect x={CX - HW.tubing} y={ABOVE - 2} width={1} height={toY(tubingBot) - ABOVE + 2} fill="#38bdf8" opacity="0.6" />
            {Array.from({ length: Math.floor(tubingBot / 9) }).map((_, i) => (
              <rect key={i} x={CX - HW.tubing - 1} y={toY(9 * (i + 1)) - 1.5} width={HW.tubing * 2 + 2} height={3} fill="#0ea5e9" opacity="0.5" rx="1" />
            ))}
            <text x={CX + HW.tubing + 3} y={toY(55) + 4} fontSize="8" fill="#38bdf8" fontWeight="bold" fontFamily="monospace">НКТ-73</text>
          </ClickableRect>

          {/* ────── SGN: rod string + pump ────── */}
          {isSgn && (
            <>
              <ClickableRect x={CX - 25} y={ABOVE - 190} width={50} height={toY(D.sgnPumpTop) - ABOVE + 190} componentId="rodString" onSelect={setSelectedComponentId}>
                <line x1={CX} y1={ABOVE - 190} x2={CX} y2={toY(D.sgnPumpTop)} stroke="#94a3b8" strokeWidth="2" strokeDasharray="7,3" />
                {Array.from({ length: Math.floor(D.sgnPumpTop / 9) }).map((_, i) => (
                  <rect key={i} x={CX - 3} y={toY(9 * (i + 1)) - 2} width={6} height={4} fill="#475569" rx="1" />
                ))}
              </ClickableRect>
              <ClickableRect x={CX - HW.tubing - 3} y={toY(D.sgnAnchor)} width={(HW.tubing + 3) * 2} height={8} componentId="tubingAnchor" onSelect={setSelectedComponentId}>
                <rect x={CX - HW.tubing - 3} y={toY(D.sgnAnchor)} width={(HW.tubing + 3) * 2} height={8} fill="#334155" rx="2" stroke="#64748b" strokeWidth="0.5" />
              </ClickableRect>
              <ClickableRect
                x={CX - HW.tubing - 5}
                y={toY(D.sgnPumpTop)}
                width={(HW.tubing + 5) * 2}
                height={toY(D.sgnPumpBot) - toY(D.sgnPumpTop)}
                componentId="sgnPump"
                onSelect={setSelectedComponentId}
              >
                <rect
                  x={CX - HW.tubing - 5}
                  y={toY(D.sgnPumpTop)}
                  width={(HW.tubing + 5) * 2}
                  height={toY(D.sgnPumpBot) - toY(D.sgnPumpTop)}
                  fill="url(#wv-pump)"
                  rx="3"
                  stroke="#4ade80"
                  strokeWidth="1"
                />
                {/* green glow strip */}
                <rect x={CX - HW.tubing - 5} y={toY(D.sgnPumpTop)} width={2} height={toY(D.sgnPumpBot) - toY(D.sgnPumpTop)} fill="#4ade80" opacity="0.5" rx="1" />
                <text x={CX} y={toY((D.sgnPumpTop + D.sgnPumpBot) / 2) + 4} fontSize="10" fill="#86efac" textAnchor="middle" fontWeight="bold" fontFamily="monospace">ШГН</text>
              </ClickableRect>
              {/* fluid level glowing line */}
              <line x1={CX - HW.prod + 3} y1={toY(D.fluidLevel)} x2={CX + HW.prod - 3} y2={toY(D.fluidLevel)} stroke="#38bdf8" strokeWidth="2" strokeDasharray="6,3" opacity="0.9" />
              <text x={CX - HW.prod - 4} y={toY(D.fluidLevel) - 5} fontSize="9" fill="#38bdf8" textAnchor="end" fontFamily="monospace">УДЖ {D.fluidLevel}м</text>
            </>
          )}

          {/* ────── ECN: cable + assembly ────── */}
          {!isSgn && !isEvn && (
            <>
              <ClickableRect x={CX + HW.tubing} y={ABOVE - 2} width={HW.cable * 2 + 4} height={toY(D.motorBot) - ABOVE + 2} componentId="ecnCable" onSelect={setSelectedComponentId}>
                <rect x={CX + HW.tubing + 1} y={ABOVE - 2} width={HW.cable * 2} height={toY(D.motorBot) - ABOVE + 2} fill="#f59e0b" opacity="0.85" />
                <rect x={CX + HW.tubing + 1} y={ABOVE - 2} width={1} height={toY(D.motorBot) - ABOVE + 2} fill="#fde68a" opacity="0.7" />
                {Array.from({ length: Math.floor(D.motorBot / 30) }).map((_, i) => (
                  <rect key={i} x={CX + HW.tubing} y={toY(30 * i + 15) - 3} width={HW.cable * 2 + 2} height={5} fill="#d97706" rx="1" opacity="0.7" />
                ))}
              </ClickableRect>
              <ClickableRect x={CX - HW.tubing - 2} y={toY(D.checkValve) - 4} width={(HW.tubing + 2) * 2} height={8} componentId="checkValve" onSelect={setSelectedComponentId}>
                <rect x={CX - HW.tubing - 2} y={toY(D.checkValve) - 4} width={(HW.tubing + 2) * 2} height={8} fill="#0d9488" rx="2" stroke="#2dd4bf" strokeWidth="0.5" />
              </ClickableRect>
              <ClickableRect
                x={CX - HW.tubing - 4}
                y={toY(D.gasSepTop)}
                width={(HW.tubing + 4) * 2}
                height={toY(D.gasSepBot) - toY(D.gasSepTop)}
                componentId="gasSeparator"
                onSelect={setSelectedComponentId}
              >
                <rect x={CX - HW.tubing - 4} y={toY(D.gasSepTop)} width={(HW.tubing + 4) * 2} height={toY(D.gasSepBot) - toY(D.gasSepTop)} fill="#0e7490" rx="3" stroke="#22d3ee" strokeWidth="0.8" />
                <rect x={CX - HW.tubing - 4} y={toY(D.gasSepTop)} width={2} height={toY(D.gasSepBot) - toY(D.gasSepTop)} fill="#22d3ee" opacity="0.5" rx="1" />
                <text x={CX} y={toY((D.gasSepTop + D.gasSepBot) / 2) + 4} fontSize="9" fill="#67e8f9" textAnchor="middle" fontWeight="bold" fontFamily="monospace">ГАЗ.СЕП.</text>
              </ClickableRect>
              <ClickableRect
                x={CX - HW.tubing - 6}
                y={toY(D.pumpTop)}
                width={(HW.tubing + 6) * 2}
                height={toY(D.pumpBot) - toY(D.pumpTop)}
                componentId="ecnPump"
                onSelect={setSelectedComponentId}
              >
                <rect x={CX - HW.tubing - 6} y={toY(D.pumpTop)} width={(HW.tubing + 6) * 2} height={toY(D.pumpBot) - toY(D.pumpTop)} fill="url(#wv-pump)" rx="3" stroke="#4ade80" strokeWidth="0.8" />
                <rect x={CX - HW.tubing - 6} y={toY(D.pumpTop)} width={2} height={toY(D.pumpBot) - toY(D.pumpTop)} fill="#4ade80" opacity="0.5" rx="1" />
                <text x={CX} y={toY((D.pumpTop + D.pumpBot) / 2) + 4} fontSize="9" fill="#86efac" textAnchor="middle" fontWeight="bold" fontFamily="monospace">ЭЦН</text>
              </ClickableRect>
              <ClickableRect
                x={CX - HW.tubing - 5}
                y={toY(D.sealTop)}
                width={(HW.tubing + 5) * 2}
                height={toY(D.sealBot) - toY(D.sealTop)}
                componentId="protector"
                onSelect={setSelectedComponentId}
              >
                <rect x={CX - HW.tubing - 5} y={toY(D.sealTop)} width={(HW.tubing + 5) * 2} height={toY(D.sealBot) - toY(D.sealTop)} fill="url(#wv-seal)" rx="3" stroke="#c084fc" strokeWidth="0.8" />
                <rect x={CX - HW.tubing - 5} y={toY(D.sealTop)} width={2} height={toY(D.sealBot) - toY(D.sealTop)} fill="#c084fc" opacity="0.5" rx="1" />
                <text x={CX} y={toY((D.sealTop + D.sealBot) / 2) + 4} fontSize="9" fill="#d8b4fe" textAnchor="middle" fontWeight="bold" fontFamily="monospace">ПРОТЕКТ.</text>
              </ClickableRect>
              <ClickableRect
                x={CX - HW.tubing - 7}
                y={toY(D.motorTop)}
                width={(HW.tubing + 7) * 2}
                height={toY(D.motorBot) - toY(D.motorTop)}
                componentId="ped"
                onSelect={setSelectedComponentId}
              >
                <rect x={CX - HW.tubing - 7} y={toY(D.motorTop)} width={(HW.tubing + 7) * 2} height={toY(D.motorBot) - toY(D.motorTop)} fill="url(#wv-motor)" rx="4" stroke="#60a5fa" strokeWidth="1" />
                <rect x={CX - HW.tubing - 7} y={toY(D.motorTop)} width={2} height={toY(D.motorBot) - toY(D.motorTop)} fill="#60a5fa" opacity="0.6" rx="1" />
                <text x={CX} y={toY((D.motorTop + D.motorBot) / 2) + 4} fontSize="10" fill="#93c5fd" textAnchor="middle" fontWeight="bold" fontFamily="monospace">ПЭД</text>
              </ClickableRect>
              <text x={CX - HW.tubing - 8} y={toY((D.gasSepTop + D.gasSepBot) / 2) + 4} fontSize="8" fill="#22d3ee" textAnchor="end" fontFamily="monospace">Газосеп.</text>
              <text x={CX - HW.tubing - 18} y={toY((D.pumpTop + D.pumpBot) / 2) + 4} fontSize="8" fill="#4ade80" textAnchor="end" fontFamily="monospace">Насос ЭЦН</text>
              <text x={CX - HW.tubing - 8} y={toY((D.sealTop + D.sealBot) / 2) + 4} fontSize="8" fill="#c084fc" textAnchor="end" fontFamily="monospace">Протектор</text>
              <text x={CX - HW.tubing - 18} y={toY((D.motorTop + D.motorBot) / 2) + 4} fontSize="8" fill="#60a5fa" textAnchor="end" fontFamily="monospace">ПЭД</text>
              <text x={CX + HW.tubing + 12} y={toY(150)} fontSize="8" fill="#fcd34d" fontFamily="monospace">Кабель КПБП</text>
            </>
          )}

          {/* ────── ЭВН: cable + screw pump assembly ────── */}
          {isEvn && (
            <>
              {/* cable */}
              <ClickableRect x={CX + HW.tubing} y={ABOVE - 2} width={HW.cable * 2 + 4} height={toY(D.evnMotorBot) - ABOVE + 2} componentId="evnCable" onSelect={setSelectedComponentId}>
                <rect x={CX + HW.tubing + 1} y={ABOVE - 2} width={HW.cable * 2} height={toY(D.evnMotorBot) - ABOVE + 2} fill="#a78bfa" opacity="0.8" />
                <rect x={CX + HW.tubing + 1} y={ABOVE - 2} width={1} height={toY(D.evnMotorBot) - ABOVE + 2} fill="#ddd6fe" opacity="0.6" />
                {Array.from({ length: Math.floor(D.evnMotorBot / 30) }).map((_, i) => (
                  <rect key={i} x={CX + HW.tubing} y={toY(30 * i + 15) - 3} width={HW.cable * 2 + 2} height={5} fill="#7c3aed" rx="1" opacity="0.7" />
                ))}
              </ClickableRect>
              {/* screw pump — distinctive chevron lines */}
              <ClickableRect
                x={CX - HW.tubing - 6}
                y={toY(D.evnPumpTop)}
                width={(HW.tubing + 6) * 2}
                height={toY(D.evnPumpBot) - toY(D.evnPumpTop)}
                componentId="evnPump"
                onSelect={setSelectedComponentId}
              >
                <rect x={CX - HW.tubing - 6} y={toY(D.evnPumpTop)} width={(HW.tubing + 6) * 2} height={toY(D.evnPumpBot) - toY(D.evnPumpTop)} fill="url(#wv-pump)" rx="3" stroke="#34d399" strokeWidth="1" />
                <rect x={CX - HW.tubing - 6} y={toY(D.evnPumpTop)} width={2} height={toY(D.evnPumpBot) - toY(D.evnPumpTop)} fill="#34d399" opacity="0.5" rx="1" />
                {/* screw symbol — diagonal chevrons */}
                {Array.from({ length: 4 }).map((_, i) => {
                  const y0 = toY(D.evnPumpTop) + 6 + i * ((toY(D.evnPumpBot) - toY(D.evnPumpTop) - 12) / 4);
                  return (
                    <polyline key={i}
                      points={`${CX - 8},${y0 + 5} ${CX},${y0} ${CX + 8},${y0 + 5}`}
                      fill="none" stroke="#86efac" strokeWidth="1.5" opacity="0.8"
                    />
                  );
                })}
                <text x={CX} y={toY((D.evnPumpTop + D.evnPumpBot) / 2) + 4} fontSize="9" fill="#6ee7b7" textAnchor="middle" fontWeight="bold" fontFamily="monospace">ЭВН</text>
              </ClickableRect>
              {/* protector */}
              <ClickableRect
                x={CX - HW.tubing - 5}
                y={toY(D.evnProtectorTop)}
                width={(HW.tubing + 5) * 2}
                height={toY(D.evnProtectorBot) - toY(D.evnProtectorTop)}
                componentId="evnProtector"
                onSelect={setSelectedComponentId}
              >
                <rect x={CX - HW.tubing - 5} y={toY(D.evnProtectorTop)} width={(HW.tubing + 5) * 2} height={toY(D.evnProtectorBot) - toY(D.evnProtectorTop)} fill="#4c1d95" rx="2" stroke="#a78bfa" strokeWidth="0.8" />
                <rect x={CX - HW.tubing - 5} y={toY(D.evnProtectorTop)} width={2} height={toY(D.evnProtectorBot) - toY(D.evnProtectorTop)} fill="#a78bfa" opacity="0.5" rx="1" />
                <text x={CX} y={toY((D.evnProtectorTop + D.evnProtectorBot) / 2) + 4} fontSize="8" fill="#c4b5fd" textAnchor="middle" fontWeight="bold" fontFamily="monospace">ПРОТ.</text>
              </ClickableRect>
              {/* motor */}
              <ClickableRect
                x={CX - HW.tubing - 7}
                y={toY(D.evnMotorTop)}
                width={(HW.tubing + 7) * 2}
                height={toY(D.evnMotorBot) - toY(D.evnMotorTop)}
                componentId="evnMotor"
                onSelect={setSelectedComponentId}
              >
                <rect x={CX - HW.tubing - 7} y={toY(D.evnMotorTop)} width={(HW.tubing + 7) * 2} height={toY(D.evnMotorBot) - toY(D.evnMotorTop)} fill="url(#wv-motor)" rx="4" stroke="#818cf8" strokeWidth="1" />
                <rect x={CX - HW.tubing - 7} y={toY(D.evnMotorTop)} width={2} height={toY(D.evnMotorBot) - toY(D.evnMotorTop)} fill="#818cf8" opacity="0.6" rx="1" />
                <text x={CX} y={toY((D.evnMotorTop + D.evnMotorBot) / 2) + 4} fontSize="10" fill="#a5b4fc" textAnchor="middle" fontWeight="bold" fontFamily="monospace">ПЭД</text>
              </ClickableRect>
              {/* fluid level */}
              <line x1={CX - HW.prod + 3} y1={toY(D.fluidLevel)} x2={CX + HW.prod - 3} y2={toY(D.fluidLevel)} stroke="#a78bfa" strokeWidth="2" strokeDasharray="6,3" opacity="0.9" />
              <text x={CX - HW.prod - 4} y={toY(D.fluidLevel) - 5} fontSize="9" fill="#a78bfa" textAnchor="end" fontFamily="monospace">УДЖ {D.fluidLevel}м</text>
              {/* labels */}
              <text x={CX - HW.tubing - 18} y={toY((D.evnPumpTop + D.evnPumpBot) / 2) + 4} fontSize="8" fill="#34d399" textAnchor="end" fontFamily="monospace">Насос ЭВН</text>
              <text x={CX - HW.tubing - 8} y={toY((D.evnProtectorTop + D.evnProtectorBot) / 2) + 4} fontSize="8" fill="#a78bfa" textAnchor="end" fontFamily="monospace">Протектор</text>
              <text x={CX - HW.tubing - 18} y={toY((D.evnMotorTop + D.evnMotorBot) / 2) + 4} fontSize="8" fill="#818cf8" textAnchor="end" fontFamily="monospace">ПЭД</text>
              <text x={CX + HW.tubing + 12} y={toY(150)} fontSize="8" fill="#c4b5fd" fontFamily="monospace">Кабель ЭВН</text>
            </>
          )}

          {/* ── casing labels ── */}
          {[
            { depth: 15,  label: "∅530 конд.", x: CX + HW.conductor + 4, col: "#22d3ee" },
            { depth: 100, label: "∅324 техн.", x: CX + HW.surface + 4,   col: "#38bdf8" },
            { depth: 350, label: "∅245 пром.", x: CX + HW.inter + 4,     col: "#60a5fa" },
            { depth: 650, label: "∅168 экспл.", x: CX + HW.prod + 4,     col: "#818cf8" },
          ].map((l, i) => (
            <text key={i} x={l.x} y={toY(l.depth) + 4} fontSize="8" fill="#334155">{l.label}</text>
          ))}

          {/* ════════ ABOVE-GROUND SECTION ════════ */}

          {/* ── WELLHEAD (common) ── */}
          <ClickableRect x={CX - 50} y={ABOVE - 110} width={185} height={95} componentId="wellhead" onSelect={setSelectedComponentId}>
            <rect x={CX - 28} y={ABOVE - 26} width={56} height={10} fill="#1e3a5f" rx="2" stroke="#38bdf8" strokeWidth="0.5" />
            <rect x={CX - 22} y={ABOVE - 40} width={44} height={12} fill="#0f2240" rx="2" stroke="#60a5fa" strokeWidth="0.5" />
            <rect x={CX - 15} y={ABOVE - 90} width={30} height={50} fill="#0a1628" rx="2" stroke="#38bdf8" strokeWidth="0.5" />
            <rect x={CX - 46} y={ABOVE - 82} width={29} height={10} fill="#0f2240" rx="1" stroke="#60a5fa" strokeWidth="0.4" />
            <circle cx={CX - 49} cy={ABOVE - 77} r={5.5} fill="#1e3a5f" stroke="#22d3ee" strokeWidth="1" />
            <circle cx={CX - 49} cy={ABOVE - 77} r={2} fill="#22d3ee" opacity="0.7" />
            <rect x={CX + 17} y={ABOVE - 82} width={29} height={10} fill="#0f2240" rx="1" stroke="#60a5fa" strokeWidth="0.4" />
            <circle cx={CX + 49} cy={ABOVE - 77} r={5.5} fill="#1e3a5f" stroke="#22d3ee" strokeWidth="1" />
            <circle cx={CX + 49} cy={ABOVE - 77} r={2} fill="#22d3ee" opacity="0.7" />
            <rect x={CX - 9} y={ABOVE - 105} width={18} height={16} fill="#0f2240" rx="1" stroke="#60a5fa" strokeWidth="0.4" />
            <circle cx={CX} cy={ABOVE - 107} r={5} fill="#1e3a5f" stroke="#22d3ee" strokeWidth="1" />
            {/* production line glowing */}
            <line x1={CX + 46} y1={ABOVE - 77} x2={CX + 130} y2={ABOVE - 77} stroke="#0ea5e9" strokeWidth="5" opacity="0.8" />
            <line x1={CX + 46} y1={ABOVE - 77} x2={CX + 130} y2={ABOVE - 77} stroke="#38bdf8" strokeWidth="1.5" />
            <text x={CX + 138} y={ABOVE - 74} fontSize="8" fill="#38bdf8" fontFamily="monospace">→ ПРОДУКЦИЯ</text>
            <text x={CX + 52} y={ABOVE - 92} fontSize="8" fill="#93c5fd" fontWeight="bold" fontFamily="monospace">ФА</text>
          </ClickableRect>

          {/* ══════ SGN: BEAM PUMP (станок-качалка) ══════ */}
          {isSgn && (
            <g>
              <rect x={CX - 105} y={ABOVE - 18} width={105} height={12} fill="#1e3a5f" rx="2" stroke="#38bdf8" strokeWidth="0.5" />
              <ClickableRect x={CX - 98} y={ABOVE - 46} width={40} height={28} componentId="beamPump" onSelect={setSelectedComponentId}>
                <rect x={CX - 98} y={ABOVE - 46} width={40} height={28} fill="url(#wv-steel)" rx="3" stroke="#475569" strokeWidth="0.5" />
                <text x={CX - 78} y={ABOVE - 28} fontSize="8" fill="#94a3b8" textAnchor="middle" fontFamily="monospace">РЕД.</text>
              </ClickableRect>
              <ClickableRect x={CX - 155} y={ABOVE - 70} width={52} height={36} componentId="beamPumpMotor" onSelect={setSelectedComponentId}>
                <rect x={CX - 155} y={ABOVE - 70} width={52} height={36} fill="url(#wv-motor)" rx="4" stroke="#60a5fa" strokeWidth="1" />
                <text x={CX - 129} y={ABOVE - 48} fontSize="9" fill="#93c5fd" textAnchor="middle" fontWeight="bold" fontFamily="monospace">МОТОР</text>
              </ClickableRect>
              <line x1={CX - 103} y1={ABOVE - 35} x2={CX - 78} y2={ABOVE - 35} stroke="#334155" strokeWidth="3" />
              <line x1={CX - 103} y1={ABOVE - 52} x2={CX - 78} y2={ABOVE - 40} stroke="#334155" strokeWidth="3" />
              <ClickableRect x={CX - 215} y={ABOVE - 230} width={230} height={215} componentId="beamPump" onSelect={setSelectedComponentId}>
                {/* tower */}
                <rect x={CX - 78} y={ABOVE - 200} width={14} height={154} fill="#1e3a5f" rx="2" stroke="#38bdf8" strokeWidth="0.4" />
                <rect x={CX - 75} y={ABOVE - 200} width={3} height={154} fill="#38bdf8" opacity="0.3" rx="1" />
                <ellipse cx={CX - 71} cy={ABOVE - 202} rx={11} ry={6} fill="#0f2240" stroke="#38bdf8" strokeWidth="0.5" />
                <g transform={`rotate(-8, ${CX - 71}, ${ABOVE - 200})`}>
                  {/* beam */}
                  <rect x={CX - 195} y={ABOVE - 207} width={210} height={9} fill="#1e3a5f" rx="3" stroke="#60a5fa" strokeWidth="0.5" />
                  <rect x={CX - 195} y={ABOVE - 207} width={210} height={2} fill="#60a5fa" opacity="0.3" rx="2" />
                  {/* horse head */}
                  <rect x={CX + 15} y={ABOVE - 220} width={22} height={28} fill="#0f2240" rx="8" stroke="#38bdf8" strokeWidth="0.8" />
                </g>
                {/* counterweight */}
                <rect x={CX - 210} y={ABOVE - 225} width={42} height={28} fill="#1e3a5f" rx="4" stroke="#60a5fa" strokeWidth="0.5" />
                <text x={CX - 189} y={ABOVE - 206} fontSize="8" fill="#60a5fa" textAnchor="middle" fontFamily="monospace">КВ</text>
                {/* samson post */}
                <rect x={CX - 88} y={ABOVE - 55} width={9} height={42} fill="#1e3a5f" rx="2" stroke="#38bdf8" strokeWidth="0.4" />
                <ellipse cx={CX - 84} cy={ABOVE - 55} rx={9} ry={6} fill="#0f2240" stroke="#38bdf8" strokeWidth="0.5" />
                {/* polished rod */}
                <rect x={CX - 3} y={ABOVE - 175} width={6} height={85} fill="#94a3b8" />
                <rect x={CX - 1} y={ABOVE - 175} width={2} height={85} fill="#e2e8f0" opacity="0.5" />
              </ClickableRect>
              <ClickableRect x={CX - 8} y={ABOVE - 93} width={16} height={8} componentId="stuffingBox" onSelect={setSelectedComponentId}>
                <rect x={CX - 8} y={ABOVE - 93} width={16} height={8} fill="#0f2240" rx="2" stroke="#22d3ee" strokeWidth="0.5" />
              </ClickableRect>
              <text x={CX - 165} y={ABOVE - 102} fontSize="10" fill="#e2e8f0" fontWeight="bold" fontFamily="monospace">Станок-качалка</text>
              <text x={CX - 165} y={ABOVE - 89} fontSize="8.5" fill="#60a5fa" fontFamily="monospace">СК-6-2.5-2500</text>
              <text x={CX - 165} y={ABOVE - 77} fontSize="8" fill="#64748b" fontFamily="monospace">Полир. шток</text>
              <text x={CX + HW.tubing + 4} y={toY(D.sgnAnchor) - 8} fontSize="8" fill="#64748b" fontFamily="monospace">Якорь</text>
              <text x={CX + HW.tubing + 4} y={toY((D.sgnPumpTop + D.sgnPumpBot) / 2) + 4} fontSize="9" fill="#4ade80" fontWeight="bold" fontFamily="monospace">ШГН НВ 1-44-18</text>
            </g>
          )}

          {/* ══════ ECN: CONTROL STATION ══════ */}
          {!isSgn && !isEvn && (
            <g>
              <ClickableRect x={CX - 250} y={ABOVE - 170} width={58} height={80} componentId="transformer" onSelect={setSelectedComponentId}>
                <rect x={CX - 250} y={ABOVE - 170} width={58} height={80} fill="#0f1f3d" rx="4" stroke="#3b82f6" strokeWidth="0.8" />
                <rect x={CX - 244} y={ABOVE - 164} width={18} height={68} fill="#1d4ed8" rx="2" opacity="0.9" stroke="#60a5fa" strokeWidth="0.5" />
                <rect x={CX - 222} y={ABOVE - 164} width={18} height={68} fill="#1d4ed8" rx="2" opacity="0.9" stroke="#60a5fa" strokeWidth="0.5" />
                <rect x={CX - 244} y={ABOVE - 164} width={2} height={68} fill="#93c5fd" opacity="0.4" />
                <rect x={CX - 222} y={ABOVE - 164} width={2} height={68} fill="#93c5fd" opacity="0.4" />
                <text x={CX - 221} y={ABOVE - 83} fontSize="8" fill="#93c5fd" textAnchor="middle" fontFamily="monospace">ТП 100кВА</text>
              </ClickableRect>
              <ClickableRect x={CX - 185} y={ABOVE - 200} width={75} height={185} componentId="controlStation" onSelect={setSelectedComponentId}>
                <rect x={CX - 185} y={ABOVE - 200} width={75} height={120} fill="#0a1628" rx="5" stroke="#1d4ed8" strokeWidth="1" />
                <rect x={CX - 178} y={ABOVE - 194} width={62} height={80} fill="#0f2240" rx="3" />
                {/* display */}
                <rect x={CX - 172} y={ABOVE - 188} width={26} height={16} fill="#0ea5e9" rx="2" opacity="0.5" />
                <rect x={CX - 171} y={ABOVE - 187} width={24} height={14} fill="#082f49" rx="1" />
                <text x={CX - 159} y={ABOVE - 178} fontSize="7" fill="#38bdf8" textAnchor="middle" fontFamily="monospace">ДИСПЛЕЙ</text>
                {/* status LEDs */}
                <circle cx={CX - 136} cy={ABOVE - 180} r={4.5} fill="#15803d" />
                <circle cx={CX - 136} cy={ABOVE - 180} r={3} fill="#4ade80" opacity="0.9" />
                <circle cx={CX - 122} cy={ABOVE - 180} r={4.5} fill="#991b1b" />
                <circle cx={CX - 122} cy={ABOVE - 180} r={3} fill="#f87171" opacity="0.5" />
                {/* data rows */}
                <rect x={CX - 172} y={ABOVE - 165} width={50} height={4} fill="#38bdf8" rx="1" opacity="0.5" />
                <rect x={CX - 172} y={ABOVE - 156} width={35} height={4} fill="#60a5fa" rx="1" opacity="0.4" />
                <rect x={CX - 172} y={ABOVE - 147} width={42} height={4} fill="#38bdf8" rx="1" opacity="0.45" />
                <text x={CX - 148} y={ABOVE - 119} fontSize="9" fill="#e2e8f0" textAnchor="middle" fontWeight="bold" fontFamily="monospace">СУ ЭЦН</text>
                <text x={CX - 148} y={ABOVE - 107} fontSize="7.5" fill="#60a5fa" textAnchor="middle" fontFamily="monospace">УЭЦН-60-1200</text>
                {/* legs */}
                <rect x={CX - 182} y={ABOVE - 82} width={7} height={82} fill="#1e3a5f" stroke="#334155" strokeWidth="0.4" />
                <rect x={CX - 120} y={ABOVE - 82} width={7} height={82} fill="#1e3a5f" stroke="#334155" strokeWidth="0.4" />
                {/* base */}
                <rect x={CX - 190} y={ABOVE - 18} width={86} height={10} fill="#1e3a5f" rx="2" stroke="#38bdf8" strokeWidth="0.4" />
              </ClickableRect>
              {/* cable run */}
              <line x1={CX - 110} y1={ABOVE - 155} x2={CX - 15} y2={ABOVE - 90} stroke="#d97706" strokeWidth="3" opacity="0.7" />
              <line x1={CX - 110} y1={ABOVE - 155} x2={CX - 15} y2={ABOVE - 90} stroke="#fcd34d" strokeWidth="1" />
              <text x={CX - 75} y={ABOVE - 135} fontSize="8" fill="#fcd34d" transform={`rotate(-22, ${CX - 75}, ${ABOVE - 135})`} fontFamily="monospace">КПБП кабель</text>
              <text x={CX - 195} y={ABOVE - 215} fontSize="9" fill="#e2e8f0" fontWeight="bold" fontFamily="monospace">СУ ЭЦН</text>
              <text x={CX - 250} y={ABOVE - 148} fontSize="8" fill="#64748b" fontFamily="monospace">Трансф.</text>
            </g>
          )}

          {/* ══════ ЭВН: CONTROL STATION ══════ */}
          {isEvn && (
            <g>
              {/* transformer */}
              <ClickableRect x={CX - 250} y={ABOVE - 170} width={58} height={80} componentId="transformer" onSelect={setSelectedComponentId}>
                <rect x={CX - 250} y={ABOVE - 170} width={58} height={80} fill="#1a0a2e" rx="4" stroke="#7c3aed" strokeWidth="0.8" />
                <rect x={CX - 244} y={ABOVE - 164} width={18} height={68} fill="#4c1d95" rx="2" opacity="0.9" stroke="#a78bfa" strokeWidth="0.5" />
                <rect x={CX - 222} y={ABOVE - 164} width={18} height={68} fill="#4c1d95" rx="2" opacity="0.9" stroke="#a78bfa" strokeWidth="0.5" />
                <rect x={CX - 244} y={ABOVE - 164} width={2} height={68} fill="#c4b5fd" opacity="0.4" />
                <rect x={CX - 222} y={ABOVE - 164} width={2} height={68} fill="#c4b5fd" opacity="0.4" />
                <text x={CX - 221} y={ABOVE - 83} fontSize="8" fill="#c4b5fd" textAnchor="middle" fontFamily="monospace">ТП 63кВА</text>
              </ClickableRect>
              {/* control cabinet */}
              <ClickableRect x={CX - 185} y={ABOVE - 200} width={75} height={185} componentId="controlStation" onSelect={setSelectedComponentId}>
                <rect x={CX - 185} y={ABOVE - 200} width={75} height={120} fill="#0f0a1e" rx="5" stroke="#7c3aed" strokeWidth="1" />
                <rect x={CX - 178} y={ABOVE - 194} width={62} height={80} fill="#150d2e" rx="3" />
                {/* display */}
                <rect x={CX - 172} y={ABOVE - 188} width={26} height={16} fill="#6d28d9" rx="2" opacity="0.5" />
                <rect x={CX - 171} y={ABOVE - 187} width={24} height={14} fill="#0f0a1e" rx="1" />
                <text x={CX - 159} y={ABOVE - 178} fontSize="7" fill="#a78bfa" textAnchor="middle" fontFamily="monospace">ДИСПЛЕЙ</text>
                {/* status LEDs */}
                <circle cx={CX - 136} cy={ABOVE - 180} r={4.5} fill="#14532d" />
                <circle cx={CX - 136} cy={ABOVE - 180} r={3} fill="#4ade80" opacity="0.9" />
                <circle cx={CX - 122} cy={ABOVE - 180} r={4.5} fill="#7f1d1d" />
                <circle cx={CX - 122} cy={ABOVE - 180} r={3} fill="#f87171" opacity="0.5" />
                {/* data rows */}
                <rect x={CX - 172} y={ABOVE - 165} width={50} height={4} fill="#a78bfa" rx="1" opacity="0.5" />
                <rect x={CX - 172} y={ABOVE - 156} width={35} height={4} fill="#818cf8" rx="1" opacity="0.4" />
                <rect x={CX - 172} y={ABOVE - 147} width={42} height={4} fill="#a78bfa" rx="1" opacity="0.45" />
                <text x={CX - 148} y={ABOVE - 119} fontSize="9" fill="#e2e8f0" textAnchor="middle" fontWeight="bold" fontFamily="monospace">СУ ЭВН</text>
                <text x={CX - 148} y={ABOVE - 107} fontSize="7.5" fill="#a78bfa" textAnchor="middle" fontFamily="monospace">УЭВН-22-900</text>
                {/* legs */}
                <rect x={CX - 182} y={ABOVE - 82} width={7} height={82} fill="#2d1b69" stroke="#4c1d95" strokeWidth="0.4" />
                <rect x={CX - 120} y={ABOVE - 82} width={7} height={82} fill="#2d1b69" stroke="#4c1d95" strokeWidth="0.4" />
                {/* base */}
                <rect x={CX - 190} y={ABOVE - 18} width={86} height={10} fill="#1a0a2e" rx="2" stroke="#7c3aed" strokeWidth="0.4" />
              </ClickableRect>
              {/* cable run */}
              <line x1={CX - 110} y1={ABOVE - 155} x2={CX - 15} y2={ABOVE - 90} stroke="#7c3aed" strokeWidth="3" opacity="0.7" />
              <line x1={CX - 110} y1={ABOVE - 155} x2={CX - 15} y2={ABOVE - 90} stroke="#c4b5fd" strokeWidth="1" />
              <text x={CX - 75} y={ABOVE - 135} fontSize="8" fill="#c4b5fd" transform={`rotate(-22, ${CX - 75}, ${ABOVE - 135})`} fontFamily="monospace">Кабель ЭВН</text>
              <text x={CX - 195} y={ABOVE - 215} fontSize="9" fill="#e2e8f0" fontWeight="bold" fontFamily="monospace">СУ ЭВН</text>
              <text x={CX - 250} y={ABOVE - 148} fontSize="8" fill="#64748b" fontFamily="monospace">Трансф.</text>
            </g>
          )}

          {/* ══════ LEGEND ══════ */}
          <g transform={`translate(${W - 215}, 58)`}>
            <rect x="0" y="0" width="205" height={isSgn ? 150 : isEvn ? 185 : 180} fill="#0a1628" fillOpacity="0.92" rx="6" stroke="#1d4ed8" strokeWidth="1" />
            <rect x="0" y="0" width="205" height="22" fill="#0f2240" rx="6" />
            <rect x="0" y="16" width="205" height="6" fill="#0a1628" />
            <text x="10" y="15" fontSize="10" fontWeight="bold" fill="#e2e8f0" fontFamily="monospace">{t("wellLegend_title")}</text>

            <rect x="10" y="28" width="14" height="9" fill="#0e7490" stroke="#22d3ee" strokeWidth="0.5" />
            <text x="30" y="37" fontSize="9" fill="#94a3b8" fontFamily="monospace">{t("wellLegend_casing")}</text>

            <rect x="10" y="44" width="14" height="9" fill="url(#wv-cement)" stroke="#0e7490" strokeWidth="0.4" />
            <text x="30" y="53" fontSize="9" fill="#94a3b8" fontFamily="monospace">{t("wellLegend_cement")}</text>

            <rect x="10" y="60" width="14" height="9" fill="url(#wv-tubing)" stroke="#38bdf8" strokeWidth="0.5" />
            <text x="30" y="69" fontSize="9" fill="#94a3b8" fontFamily="monospace">{t("wellLegend_nkt")}</text>

            {isSgn ? (
              <>
                <line x1="10" y1="83" x2="24" y2="83" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5,2" />
                <text x="30" y="87" fontSize="9" fill="#94a3b8" fontFamily="monospace">{t("wellLegend_rods")}</text>
                <rect x="10" y="95" width="14" height="9" fill="url(#wv-pump)" stroke="#4ade80" strokeWidth="0.5" />
                <text x="30" y="104" fontSize="9" fill="#94a3b8" fontFamily="monospace">{t("wellLegend_sgnPump")}</text>
                <line x1="10" y1="118" x2="24" y2="118" stroke="#38bdf8" strokeWidth="2" strokeDasharray="5,3" />
                <text x="30" y="122" fontSize="9" fill="#94a3b8" fontFamily="monospace">{t("wellLegend_fluidLevel")}</text>
                <line x1="10" y1="133" x2="24" y2="133" stroke="#f87171" strokeWidth="2" />
                <text x="30" y="137" fontSize="9" fill="#94a3b8" fontFamily="monospace">{t("wellLegend_perforation")}</text>
              </>
            ) : isEvn ? (
              <>
                <rect x="10" y="76" width="14" height="9" fill="#a78bfa" />
                <text x="30" y="85" fontSize="9" fill="#94a3b8" fontFamily="monospace">Кабель ЭВН</text>
                <rect x="10" y="92" width="14" height="9" fill="url(#wv-pump)" stroke="#34d399" strokeWidth="0.5" />
                <text x="30" y="101" fontSize="9" fill="#94a3b8" fontFamily="monospace">Насос ЭВН</text>
                <rect x="10" y="108" width="14" height="9" fill="#4c1d95" stroke="#a78bfa" strokeWidth="0.5" />
                <text x="30" y="117" fontSize="9" fill="#94a3b8" fontFamily="monospace">{t("wellLegend_protector")}</text>
                <rect x="10" y="124" width="14" height="9" fill="url(#wv-motor)" stroke="#818cf8" strokeWidth="0.5" />
                <text x="30" y="133" fontSize="9" fill="#94a3b8" fontFamily="monospace">{t("wellLegend_motor")}</text>
                <line x1="10" y1="147" x2="24" y2="147" stroke="#a78bfa" strokeWidth="2" strokeDasharray="5,3" />
                <text x="30" y="151" fontSize="9" fill="#94a3b8" fontFamily="monospace">{t("wellLegend_fluidLevel")}</text>
                <line x1="10" y1="163" x2="24" y2="163" stroke="#f87171" strokeWidth="2" />
                <text x="30" y="167" fontSize="9" fill="#94a3b8" fontFamily="monospace">{t("wellLegend_perforation")}</text>
              </>
            ) : (
              <>
                <rect x="10" y="76" width="14" height="9" fill="#f59e0b" />
                <text x="30" y="85" fontSize="9" fill="#94a3b8" fontFamily="monospace">{t("wellLegend_cable")}</text>
                <rect x="10" y="92" width="14" height="9" fill="#0e7490" stroke="#22d3ee" strokeWidth="0.5" />
                <text x="30" y="101" fontSize="9" fill="#94a3b8" fontFamily="monospace">{t("wellLegend_gasSep")}</text>
                <rect x="10" y="108" width="14" height="9" fill="url(#wv-pump)" stroke="#4ade80" strokeWidth="0.5" />
                <text x="30" y="117" fontSize="9" fill="#94a3b8" fontFamily="monospace">{t("wellLegend_ecnPump")}</text>
                <rect x="10" y="124" width="14" height="9" fill="url(#wv-seal)" stroke="#c084fc" strokeWidth="0.5" />
                <text x="30" y="133" fontSize="9" fill="#94a3b8" fontFamily="monospace">{t("wellLegend_protector")}</text>
                <rect x="10" y="140" width="14" height="9" fill="url(#wv-motor)" stroke="#60a5fa" strokeWidth="0.5" />
                <text x="30" y="149" fontSize="9" fill="#94a3b8" fontFamily="monospace">{t("wellLegend_motor")}</text>
                <line x1="10" y1="163" x2="24" y2="163" stroke="#f87171" strokeWidth="2" />
                <text x="30" y="167" fontSize="9" fill="#94a3b8" fontFamily="monospace">{t("wellLegend_perforation")}</text>
              </>
            )}
          </g>

          {/* ══════ TITLE ══════ */}
          {/* title background bar */}
          <rect x="0" y="0" width={W} height={50} fill="#020817" opacity="0.85" />
          <rect x="0" y="48" width={W} height="2" fill="#1d4ed8" opacity="0.6" />
          <text x={W / 2} y={20} fontSize="14" fontWeight="bold" fill="#e2e8f0" textAnchor="middle" fontFamily="monospace">
            {wellName} — {isSgn ? "ШГН" : isEvn ? "ЭВН" : "ЭЦН"}
          </text>
          <text x={W / 2} y={38} fontSize="9" fill="#60a5fa" textAnchor="middle" fontFamily="monospace">
            {isSgn ? t("wellLegend_sgnFull") : isEvn ? "Электровинтовой насос" : t("wellLegend_ecnFull")} · {t("wellLegend_td")} {D.prodShoe}м · {t("wellLegend_perf")} {D.perfTop}–{D.perfBot}м
          </text>

          {/* ── ground line (glowing) ── */}
          <rect x="0" y={ABOVE - 16} width={W} height={16} fill="url(#wv-ground)" opacity="0.5" />
          <line x1="0" y1={ABOVE - 1} x2={W} y2={ABOVE - 1} stroke="#f59e0b" strokeWidth="1.5" opacity="0.7" strokeDasharray="12,4" />
          <text x={12} y={ABOVE - 4} fontSize="8" fill="#f59e0b" fontWeight="bold" fontFamily="monospace" opacity="0.8">{t("wellLegend_groundSurface")}</text>

          {/* scan lines overlay for tech feel */}
          <rect x="0" y="0" width={W} height={H} fill="url(#wv-scan)" opacity="0.4" />
        </svg>
      </div>

      <Dialog open={!!selectedComponentId} onOpenChange={(open) => !open && setSelectedComponentId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{detail?.name}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{detail.description}</p>
              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t("wellLegend_params")}</p>
                <dl className="space-y-1.5 text-sm">
                  {detail.specs.map(({ label, value }) => (
                    <div key={label} className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

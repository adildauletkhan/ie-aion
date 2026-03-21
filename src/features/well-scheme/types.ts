export type WellPumpType = "sgn" | "ecn";

export type WellComponentCategory =
  | "casing"
  | "tubing"
  | "cement"
  | "perforation"
  | "wellhead"
  | "sgn"
  | "ecn";

export interface WellComponentType {
  id: string;
  name: string;
  shortName: string;
  category: WellComponentCategory;
  pumpTypes: WellPumpType[]; // "both" = ["sgn", "ecn"]
  defaultDepth: number; // meters
  height: number; // meters (vertical extent)
  color: string;
}

export interface PlacedComponent {
  id: string;
  typeId: string;
  depth: number;
}

export const WELL_COMPONENT_TYPES: WellComponentType[] = [
  // Общие
  { id: "conductor", name: "Кондуктор", shortName: "∅530", category: "casing", pumpTypes: ["sgn", "ecn"], defaultDepth: 30, height: 30, color: "#475569" },
  { id: "surfaceCasing", name: "Техн. колонна", shortName: "∅324", category: "casing", pumpTypes: ["sgn", "ecn"], defaultDepth: 180, height: 150, color: "#334155" },
  { id: "interCasing", name: "Пром. колонна", shortName: "∅245", category: "casing", pumpTypes: ["sgn", "ecn"], defaultDepth: 520, height: 340, color: "#1e293b" },
  { id: "prodCasing", name: "Экспл. колонна", shortName: "∅168", category: "casing", pumpTypes: ["sgn", "ecn"], defaultDepth: 975, height: 455, color: "#0f172a" },
  { id: "cement", name: "Цементное кольцо", shortName: "Цемент", category: "cement", pumpTypes: ["sgn", "ecn"], defaultDepth: 300, height: 500, color: "#94a3b8" },
  { id: "tubing", name: "НКТ", shortName: "НКТ 73", category: "tubing", pumpTypes: ["sgn", "ecn"], defaultDepth: 400, height: 700, color: "#0284c7" },
  { id: "perforation", name: "Перфорация", shortName: "Перф.", category: "perforation", pumpTypes: ["sgn", "ecn"], defaultDepth: 867, height: 75, color: "#ef4444" },
  { id: "wellhead", name: "Фонтанная арматура", shortName: "Арматура", category: "wellhead", pumpTypes: ["sgn", "ecn"], defaultDepth: 0, height: 0, color: "#1e293b" },
  // ШГН
  { id: "rodString", name: "Штанги", shortName: "Штанги", category: "sgn", pumpTypes: ["sgn"], defaultDepth: 365, height: 365, color: "#374151" },
  { id: "tubingAnchor", name: "Якорь НКТ", shortName: "Якорь", category: "sgn", pumpTypes: ["sgn"], defaultDepth: 720, height: 5, color: "#374151" },
  { id: "sgnPump", name: "Насос ШГН", shortName: "ШГН", category: "sgn", pumpTypes: ["sgn"], defaultDepth: 745, height: 30, color: "#16a34a" },
  { id: "beamPump", name: "Станок-качалка", shortName: "СК", category: "sgn", pumpTypes: ["sgn"], defaultDepth: 0, height: 0, color: "#475569" },
  { id: "stuffingBox", name: "Сальниковый узел", shortName: "Сальник", category: "sgn", pumpTypes: ["sgn"], defaultDepth: 0, height: 0, color: "#0f172a" },
  // ЭЦН
  { id: "ecnCable", name: "Кабель КПБП", shortName: "Кабель", category: "ecn", pumpTypes: ["ecn"], defaultDepth: 500, height: 960, color: "#fbbf24" },
  { id: "checkValve", name: "Обратный клапан", shortName: "Клапан", category: "ecn", pumpTypes: ["ecn"], defaultDepth: 790, height: 5, color: "#0f766e" },
  { id: "gasSeparator", name: "Газосепаратор", shortName: "Газосеп.", category: "ecn", pumpTypes: ["ecn"], defaultDepth: 810, height: 20, color: "#0891b2" },
  { id: "ecnPump", name: "Насос ЭЦН", shortName: "ЭЦН", category: "ecn", pumpTypes: ["ecn"], defaultDepth: 850, height: 60, color: "#16a34a" },
  { id: "protector", name: "Протектор", shortName: "Протектор", category: "ecn", pumpTypes: ["ecn"], defaultDepth: 890, height: 20, color: "#9333ea" },
  { id: "ped", name: "ПЭД", shortName: "ПЭД", category: "ecn", pumpTypes: ["ecn"], defaultDepth: 930, height: 60, color: "#2563eb" },
  { id: "controlStation", name: "СУ ЭЦН", shortName: "СУ", category: "ecn", pumpTypes: ["ecn"], defaultDepth: 0, height: 0, color: "#1e40af" },
  { id: "transformer", name: "Трансформатор", shortName: "Трансф.", category: "ecn", pumpTypes: ["ecn"], defaultDepth: 0, height: 0, color: "#1e293b" },
];

export const CATEGORY_LABELS: Record<WellComponentCategory, string> = {
  casing: "Обсадные колонны",
  tubing: "НКТ",
  cement: "Цемент",
  perforation: "Перфорация",
  wellhead: "Устьевое оборудование",
  sgn: "Оборудование ШГН",
  ecn: "Оборудование ЭЦН",
};

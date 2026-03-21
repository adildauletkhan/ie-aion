import { useMemo, useState } from "react";
import {
  WELL_COMPONENT_TYPES,
  CATEGORY_LABELS,
  type WellComponentType,
  type WellPumpType,
  type WellComponentCategory,
} from "../types";
import { ChevronDown, ChevronRight, GripVertical } from "lucide-react";

const DRAG_TYPE = "application/well-component";

interface Props {
  pumpType: WellPumpType;
}

const CATEGORY_ORDER: WellComponentCategory[] = [
  "casing",
  "tubing",
  "cement",
  "perforation",
  "wellhead",
  "sgn",
  "ecn",
];

export function WellComponentPalette({ pumpType }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const grouped = useMemo(() => {
    const map = new Map<WellComponentCategory, WellComponentType[]>();
    for (const t of WELL_COMPONENT_TYPES) {
      if (!t.pumpTypes.includes(pumpType)) continue;
      const list = map.get(t.category) ?? [];
      list.push(t);
      map.set(t.category, list);
    }
    return map;
  }, [pumpType]);

  const orderedCategories = useMemo(
    () => CATEGORY_ORDER.filter((c) => grouped.has(c)),
    [grouped]
  );

  const handleDragStart = (e: React.DragEvent, type: WellComponentType) => {
    e.dataTransfer.setData(DRAG_TYPE, type.id);
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("text/plain", JSON.stringify({ typeId: type.id, defaultDepth: type.defaultDepth }));
  };

  return (
    <div className="w-56 shrink-0 border-r bg-muted/30 flex flex-col overflow-hidden">
      <div className="p-3 border-b bg-background">
        <p className="text-sm font-semibold">Компоненты скважины</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {pumpType === "sgn" ? "ШГН" : "ЭЦН"} — перетащите на схему
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {orderedCategories.map((cat) => {
          const items = grouped.get(cat) ?? [];
          if (items.length === 0) return null;
          const isCollapsed = collapsed[cat] ?? false;
          return (
            <div key={cat} className="rounded-md border overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center gap-1.5 px-2 py-1.5 text-left text-sm font-medium bg-muted/50 hover:bg-muted"
                onClick={() => setCollapsed((p) => ({ ...p, [cat]: !p[cat] }))}
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4 shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0" />
                )}
                {CATEGORY_LABELS[cat]}
              </button>
              {!isCollapsed &&
                items.map((type) => (
                  <div
                    key={type.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, type)}
                    className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-grab active:cursor-grabbing hover:bg-muted/50 border-t"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div
                      className="w-3 h-3 rounded shrink-0"
                      style={{ backgroundColor: type.color }}
                    />
                    <span className="truncate">{type.shortName}</span>
                  </div>
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { DRAG_TYPE };

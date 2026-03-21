import { useCallback, useRef, useState } from "react";
import {
  WELL_COMPONENT_TYPES,
  type PlacedComponent,
  type WellComponentType,
  type WellPumpType,
} from "../types";
import { DRAG_TYPE } from "./WellComponentPalette";
import { Trash2 } from "lucide-react";

const CANVAS_WIDTH = 280;
const DEPTH_MAX = 1000;
const SCALE = 600 / DEPTH_MAX; // 600px for 1000m
const toY = (depth: number) => depth * SCALE;

interface Props {
  pumpType: WellPumpType;
  components: PlacedComponent[];
  onChange: (components: PlacedComponent[]) => void;
}

export function WellSchemeCanvas({ pumpType, components, onChange }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragPlacement, setDragPlacement] = useState<{ typeId: string; depth: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const getType = (id: string) => WELL_COMPONENT_TYPES.find((t) => t.id === id);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOver(false);
      setDragPlacement(null);
    }
  }, []);

  const getDepthFromEvent = useCallback((e: React.DragEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const y = e.clientY - rect.top;
    return Math.round(Math.min(DEPTH_MAX, Math.max(0, y / SCALE)));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      setDragPlacement(null);

      const placedId = e.dataTransfer.getData("application/well-placed");
      if (placedId) {
        const comp = components.find((c) => c.id === placedId);
        if (comp) {
          const depth = getDepthFromEvent(e);
          const updated = { ...comp, depth };
          const others = components.filter((c) => c.id !== placedId);
          const next = [...others, updated].sort((a, b) => a.depth - b.depth);
          onChange(next);
        }
        return;
      }

      const typeId = e.dataTransfer.getData(DRAG_TYPE);
      if (!typeId) return;
      const type = getType(typeId);
      if (!type || !type.pumpTypes.includes(pumpType)) return;

      const depth = getDepthFromEvent(e);
      const id = `comp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const newComp: PlacedComponent = { id, typeId, depth };
      const next = [...components, newComp].sort((a, b) => a.depth - b.depth);
      onChange(next);
    },
    [components, onChange, pumpType, getType, getDepthFromEvent]
  );

  const handleDragOverCanvas = useCallback(
    (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
      const typeId = e.dataTransfer.getData(DRAG_TYPE);
      if (!typeId) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const y = e.clientY - rect.top;
      const depth = Math.round(Math.min(DEPTH_MAX, Math.max(0, y / SCALE)));
      setDragPlacement({ typeId, depth });
    },
    []
  );

  const handleRemove = useCallback(
    (id: string) => {
      onChange(components.filter((c) => c.id !== id));
      if (selectedId === id) setSelectedId(null);
    },
    [components, onChange, selectedId]
  );

  const handleComponentDragStart = useCallback((e: React.DragEvent, comp: PlacedComponent) => {
    e.dataTransfer.setData("application/well-placed", comp.id);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background">
      <div className="p-2 border-b text-sm text-muted-foreground">
        Перетащите компоненты на схему. Глубина (м) — по вертикали.
      </div>
      <div
        ref={canvasRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragOverCapture={handleDragOverCanvas}
        className={`flex-1 overflow-auto p-4 transition-colors ${
          dragOver ? "bg-blue-50 dark:bg-blue-950/20" : ""
        }`}
      >
        <div
          className="relative mx-auto rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/10"
          style={{ width: CANVAS_WIDTH, minHeight: toY(DEPTH_MAX) + 40 }}
        >
          {/* Depth scale */}
          <div className="absolute left-0 top-0 w-11 border-r text-[10px] text-muted-foreground text-right pr-1">
            {[0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000].map((m) => (
              <div key={m} className="absolute" style={{ top: toY(m) - 5 }}>
                {m}м
              </div>
            ))}
          </div>

          {/* Wellbore center line */}
          <div
            className="absolute left-1/2 top-0 bottom-0 w-px bg-muted-foreground/40 -translate-x-1/2"
            style={{ height: toY(DEPTH_MAX) }}
          />

          {/* Placed components */}
          {components.map((comp) => {
            const type = getType(comp.typeId);
            if (!type) return null;
            const h = Math.max(12, type.height * (SCALE / 100));
            const top = toY(comp.depth);
            const isSelected = selectedId === comp.id;
            return (
              <div
                key={comp.id}
                draggable
                onDragStart={(e) => handleComponentDragStart(e, comp)}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const placedId = e.dataTransfer.getData("application/well-placed");
                  if (!placedId) return;
                  const dragged = components.find((c) => c.id === placedId);
                  if (!dragged) return;
                  const newDepth = comp.depth;
                  const updated = { ...dragged, depth: newDepth };
                  const others = components.filter((c) => c.id !== placedId);
                  const next = [...others, updated].sort((a, b) => a.depth - b.depth);
                  onChange(next);
                }}
                onClick={() => setSelectedId(comp.id)}
                className={`absolute left-12 right-12 rounded cursor-move flex items-center justify-between px-2 py-1 border transition-all ${
                  isSelected
                    ? "ring-2 ring-blue-500 border-blue-500 z-10"
                    : "border-border hover:border-muted-foreground/50"
                }`}
                style={{
                  top,
                  minHeight: h,
                  backgroundColor: type.color,
                  color: type.color === "#0f172a" || type.color === "#1e293b" ? "#e2e8f0" : "#0f172a",
                }}
              >
                <span className="text-xs font-medium truncate">{type.shortName}</span>
                <span className="text-[10px] opacity-80">{comp.depth}м</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(comp.id);
                  }}
                  className="p-0.5 rounded hover:bg-black/20"
                  title="Удалить"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          })}

          {/* Drag placement preview */}
          {dragPlacement && (
            <div
              className="absolute left-12 right-12 rounded border-2 border-dashed border-blue-500 bg-blue-500/20 pointer-events-none z-20 flex items-center justify-center"
              style={{
                top: toY(dragPlacement.depth),
                minHeight: 24,
              }}
            >
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                {getType(dragPlacement.typeId)?.shortName} → {dragPlacement.depth}м
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

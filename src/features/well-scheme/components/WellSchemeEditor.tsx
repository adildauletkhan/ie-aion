import { useState } from "react";
import { Button } from "@/components/ui/button";
import { WellComponentPalette } from "./WellComponentPalette";
import { WellSchemeCanvas } from "./WellSchemeCanvas";
import { WellEquipment3DViewer } from "@/components/WellEquipment3DViewer";
import { type PlacedComponent, type WellPumpType } from "../types";
import { Eye, RotateCcw } from "lucide-react";

interface Props {
  wellName: string;
  fieldName?: string;
  initialPumpType?: "sgn" | "ecn";
}

const DEFAULT_SGN: PlacedComponent[] = [
  { id: "c1", typeId: "wellhead", depth: 0 },
  { id: "c2", typeId: "conductor", depth: 30 },
  { id: "c3", typeId: "surfaceCasing", depth: 180 },
  { id: "c4", typeId: "interCasing", depth: 520 },
  { id: "c5", typeId: "prodCasing", depth: 975 },
  { id: "c6", typeId: "tubing", depth: 400 },
  { id: "c7", typeId: "tubingAnchor", depth: 720 },
  { id: "c8", typeId: "sgnPump", depth: 745 },
  { id: "c9", typeId: "perforation", depth: 867 },
  { id: "c10", typeId: "rodString", depth: 365 },
  { id: "c11", typeId: "beamPump", depth: 0 },
  { id: "c12", typeId: "stuffingBox", depth: 0 },
];

const DEFAULT_ECN: PlacedComponent[] = [
  { id: "e1", typeId: "wellhead", depth: 0 },
  { id: "e2", typeId: "conductor", depth: 30 },
  { id: "e3", typeId: "surfaceCasing", depth: 180 },
  { id: "e4", typeId: "interCasing", depth: 520 },
  { id: "e5", typeId: "prodCasing", depth: 975 },
  { id: "e6", typeId: "tubing", depth: 400 },
  { id: "e7", typeId: "ecnCable", depth: 500 },
  { id: "e8", typeId: "checkValve", depth: 790 },
  { id: "e9", typeId: "gasSeparator", depth: 810 },
  { id: "e10", typeId: "ecnPump", depth: 850 },
  { id: "e11", typeId: "protector", depth: 890 },
  { id: "e12", typeId: "ped", depth: 930 },
  { id: "e13", typeId: "perforation", depth: 867 },
  { id: "e14", typeId: "controlStation", depth: 0 },
  { id: "e15", typeId: "transformer", depth: 0 },
];

function initComponents(pumpType: WellPumpType): PlacedComponent[] {
  return pumpType === "sgn"
    ? DEFAULT_SGN.map((c, i) => ({ ...c, id: `init-sgn-${i}` }))
    : DEFAULT_ECN.map((c, i) => ({ ...c, id: `init-ecn-${i}` }));
}

export function WellSchemeEditor({ wellName, fieldName, initialPumpType = "sgn" }: Props) {
  const [pumpType, setPumpType] = useState<WellPumpType>(initialPumpType);
  const [components, setComponents] = useState<PlacedComponent[]>(() => initComponents(initialPumpType));
  const [previewOpen, setPreviewOpen] = useState(false);

  const handlePumpTypeChange = (next: WellPumpType) => {
    setPumpType(next);
    setComponents(initComponents(next));
  };

  const handleReset = () => {
    setComponents(initComponents(pumpType));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[500px] rounded-xl border bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 p-3 border-b shrink-0">
        <div>
          <h3 className="font-semibold">{wellName}</h3>
          {fieldName && <p className="text-xs text-muted-foreground">м/р {fieldName}</p>}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md overflow-hidden border text-sm font-medium">
            <button
              onClick={() => handlePumpTypeChange("sgn")}
              className={`px-3 py-1.5 transition-colors ${
                pumpType === "sgn" ? "bg-blue-600 text-white" : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              ШГН
            </button>
            <button
              onClick={() => handlePumpTypeChange("ecn")}
              className={`px-3 py-1.5 border-l transition-colors ${
                pumpType === "ecn" ? "bg-blue-600 text-white" : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              ЭЦН
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Сброс
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
            <Eye className="h-4 w-4 mr-1" />
            Просмотр
          </Button>
        </div>
      </div>

      {/* Main: palette + canvas */}
      <div className="flex flex-1 min-h-0">
        <WellComponentPalette pumpType={pumpType} />
        <WellSchemeCanvas
          pumpType={pumpType}
          components={components}
          onChange={setComponents}
        />
      </div>

      {/* Preview modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">Просмотр схемы</h3>
              <Button variant="outline" size="sm" onClick={() => setPreviewOpen(false)}>
                Закрыть
              </Button>
            </div>
            <div className="p-4">
              <WellEquipment3DViewer
                key={`preview-${pumpType}-${components.map((c) => `${c.typeId}:${c.depth}`).join("|")}`}
                wellName={wellName}
                fieldName={fieldName}
                defaultPumpType={pumpType}
                placedComponents={components.map((c) => ({ typeId: c.typeId, depth: c.depth }))}
                previewMode
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

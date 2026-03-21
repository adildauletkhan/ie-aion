import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Droplets, Truck, Factory, Ship } from "lucide-react";
import type { StageInput } from "@/lib/digitalTwinApi";

const stageIcons = { UP: Droplets, MID: Truck, DOWN: Factory, EXPORT: Ship };

export type CapacityMode = "manual" | "calculated";

interface StageInputCardProps {
  input: StageInput;
  index: number;
  onUpdate: (index: number, field: keyof StageInput, value: string) => void;
  // UP-specific props
  capacityMode?: CapacityMode;
  onCapacityModeChange?: (mode: CapacityMode) => void;
  calculatedCapacity?: number;
}

export function StageInputCard({
  input,
  index,
  onUpdate,
  capacityMode,
  onCapacityModeChange,
  calculatedCapacity,
}: StageInputCardProps) {
  const Icon = stageIcons[input.stage];
  const isUp = input.stage === "UP";
  const isCalculated = isUp && capacityMode === "calculated";

  return (
    <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/20">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">{input.label}</span>
        <Badge variant="secondary" className="text-[10px] font-mono ml-auto">
          {input.stage}
        </Badge>
      </div>

      {/* Mode toggle — only for UP */}
      {isUp && onCapacityModeChange && (
        <RadioGroup
          value={capacityMode}
          onValueChange={(v) => onCapacityModeChange(v as CapacityMode)}
          className="flex items-center gap-4"
        >
          <div className="flex items-center gap-1.5">
            <RadioGroupItem value="manual" id="mode-manual" className="h-3 w-3" />
            <Label htmlFor="mode-manual" className="text-[10px] text-muted-foreground cursor-pointer">
              Ручной ввод
            </Label>
          </div>
          <div className="flex items-center gap-1.5">
            <RadioGroupItem value="calculated" id="mode-calc" className="h-3 w-3" />
            <Label htmlFor="mode-calc" className="text-[10px] text-muted-foreground cursor-pointer">
              Расчёт из ГЕО и БУРЕНИЯ
            </Label>
          </div>
        </RadioGroup>
      )}

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
            Мощность <span className="normal-case tracking-normal font-normal">(тыс.т)</span>
          </label>
          <Input
            type="number"
            value={isCalculated ? (calculatedCapacity ?? 0) : input.capacity}
            onChange={(e) => onUpdate(index, "capacity", e.target.value)}
            readOnly={isCalculated}
            className={`h-8 text-sm font-mono ${
              isCalculated ? "bg-muted/40 text-muted-foreground cursor-not-allowed" : ""
            }`}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
            ГОС план <span className="normal-case tracking-normal font-normal">(тыс.т)</span>
          </label>
          <Input
            type="number"
            value={input.planGov}
            onChange={(e) => onUpdate(index, "planGov", e.target.value)}
            className="h-8 text-sm font-mono"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
            КОРП план <span className="normal-case tracking-normal font-normal">(тыс.т)</span>
          </label>
          <Input
            type="number"
            value={input.planCorp}
            onChange={(e) => onUpdate(index, "planCorp", e.target.value)}
            className="h-8 text-sm font-mono"
          />
        </div>
      </div>
    </div>
  );
}
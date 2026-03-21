import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Mountain, Drill } from "lucide-react";
import type { GeoDrillInputs } from "@/lib/geoDrillCalc";

interface GeoDrillPanelProps {
  inputs: GeoDrillInputs;
  rpYears: number;
  calculatedCapacity: number;
  onUpdate: (field: keyof GeoDrillInputs, value: string) => void;
}

const editableFields: {
  section: string;
  icon: typeof Mountain;
  fields: { key: keyof GeoDrillInputs; label: string; uom?: string; readOnly?: boolean }[];
}[] = [
  {
    section: "Геология и запасы",
    icon: Mountain,
    fields: [
      { key: "reserves2P", label: "Запасы (2P)", uom: "тыс.т" },
      { key: "rpYears", label: "R/P", uom: "лет", readOnly: true },
    ],
  },
  {
    section: "Бурение и добыча",
    icon: Drill,
    fields: [
      { key: "baseProduction", label: "Базовая добыча", uom: "тыс.т" },
      { key: "declineRate", label: "Темп падения", uom: "%" },
      { key: "plannedNewWells", label: "План. новых скважин", uom: "шт." },
      { key: "avgInitialProd", label: "Ср. дебит на скважину", uom: "т/сут" },
    ],
  },
];

export function GeoDrillPanel({
  inputs,
  rpYears,
  calculatedCapacity,
  onUpdate,
}: GeoDrillPanelProps) {
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-4 animate-in slide-in-from-top-2 duration-300 w-fit">
      <div className="flex items-center gap-2">
        <Mountain className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">
          ГЕО и БУРЕНИЕ
        </span>
        <Badge variant="outline" className="text-[10px] ml-auto font-mono border-primary/30 text-primary">
          Расчёт: {calculatedCapacity.toLocaleString()} тыс.т
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        {editableFields.map((section) => {
          const SectionIcon = section.icon;
          return (
            <div key={section.section} className="space-y-2.5">
              <div className="flex items-center gap-1.5">
                <SectionIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.section}
                </span>
              </div>
              <div className="space-y-2">
                {section.fields.map((field) => (
                  <div key={field.key} className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                    <label className="text-xs text-muted-foreground truncate">
                      {field.label}
                    </label>
                    <Input
                      type="number"
                      value={field.key === "rpYears" ? rpYears : inputs[field.key]}
                      onChange={(e) => onUpdate(field.key, e.target.value)}
                      readOnly={field.readOnly}
                      className={`h-7 text-xs font-mono w-28 ${
                        field.readOnly
                          ? "bg-muted/40 text-muted-foreground cursor-not-allowed"
                          : ""
                      }`}
                    />
                    {field.uom && (
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap min-w-[2.5rem]">
                        {field.uom}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground italic">
        Мощность UP автоматически рассчитывается на основе запасов и параметров бурения.
      </p>
    </div>
  );
}

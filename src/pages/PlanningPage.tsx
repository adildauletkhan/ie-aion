import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarRange, BarChart2, FileSpreadsheet, Layers, BarChart3 } from "lucide-react";
import AnnualPlanning from "./AnnualPlanning";
import Scenarios from "./Scenarios";
import { ProductionProgram } from "@/components/ProductionProgram";
import { PlanFactDashboard } from "@/components/PlanFactDashboard";

type PlanTab = "scenario" | "production" | "analytics" | "budget" | "scenarios";

const TABS: { id: PlanTab; icon: React.ElementType; labelRu: string; labelEn: string }[] = [
  { id: "production",  icon: BarChart2,        labelRu: "Производственный план",  labelEn: "Production Plan" },
  { id: "analytics",   icon: BarChart3,        labelRu: "План-факт анализ",       labelEn: "Plan-Fact Analysis" },
  { id: "budget",      icon: FileSpreadsheet,  labelRu: "Бюджетное планирование", labelEn: "Budget Planning" },
  { id: "scenarios",   icon: Layers,           labelRu: "Сценарии",               labelEn: "Scenarios" },
  { id: "scenario",    icon: CalendarRange,   labelRu: "Сценарный анализ",       labelEn: "Scenario Analysis" },
];

export default function PlanningPage() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [activeTab, setActiveTab] = useState<PlanTab>("production");

  return (
    <div className="flex flex-col h-full min-h-0 space-y-0">
      {/* Module header */}
      <div className="px-6 pt-5 pb-4 border-b bg-background shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">
          {isEn ? "Planning" : "Планирование"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isEn
            ? "Annual planning, scenario analysis and budget management"
            : "Годовое планирование, сценарный анализ и управление бюджетом"}
        </p>
      </div>

      {/* Tab navigation */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as PlanTab)}
        className="flex flex-col flex-1 min-h-0"
      >
        <div className="px-6 border-b bg-background shrink-0">
          <TabsList className="h-auto p-0 bg-transparent gap-0 rounded-none">
            {TABS.map(({ id, icon: Icon, labelRu, labelEn }) => (
              <TabsTrigger
                key={id}
                value={id}
                className="flex items-center gap-2 px-4 py-3 text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent hover:text-foreground transition-colors"
              >
                <Icon className="h-4 w-4 shrink-0" />
                {isEn ? labelEn : labelRu}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Сценарный анализ — embeds the existing AnnualPlanning content */}
        <TabsContent value="scenario" className="flex-1 overflow-auto m-0 p-0">
          <div className="p-6">
            <AnnualPlanning />
          </div>
        </TabsContent>

        {/* Производственный план — 12 разделов */}
        <TabsContent value="production" className="flex-1 min-h-0 m-0 p-0">
          <ProductionProgram />
        </TabsContent>

        {/* План-факт анализ */}
        <TabsContent value="analytics" className="flex-1 overflow-auto m-0 p-6">
          <PlanFactDashboard />
        </TabsContent>

        {/* Бюджетное планирование — placeholder */}
        <TabsContent value="budget" className="flex-1 overflow-auto m-0 p-6">
          <PlaceholderContent
            icon={FileSpreadsheet}
            titleRu="Бюджетное планирование"
            titleEn="Budget Planning"
            descRu="CAPEX/OPEX бюджет, план закупок и финансовый прогноз. Раздел в разработке."
            descEn="CAPEX/OPEX budget, procurement plan and financial forecast. Section under development."
          />
        </TabsContent>

        {/* Сценарии */}
        <TabsContent value="scenarios" className="flex-1 overflow-auto m-0 p-0">
          <div className="p-6">
            <Scenarios />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Placeholder ─── */
function PlaceholderContent({
  icon: Icon,
  titleRu,
  titleEn,
  descRu,
  descEn,
}: {
  icon: React.ElementType;
  titleRu: string;
  titleEn: string;
  descRu: string;
  descEn: string;
}) {
  const { language } = useLanguage();
  const isEn = language === "en";
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center gap-4 text-muted-foreground">
      <div className="rounded-full bg-muted p-5">
        <Icon className="h-8 w-8 opacity-40" />
      </div>
      <div className="space-y-1.5 max-w-sm">
        <p className="text-base font-semibold text-foreground">{isEn ? titleEn : titleRu}</p>
        <p className="text-sm">{isEn ? descEn : descRu}</p>
      </div>
      <span className="text-xs bg-muted px-3 py-1 rounded-full">
        {isEn ? "Coming soon" : "В разработке"}
      </span>
    </div>
  );
}

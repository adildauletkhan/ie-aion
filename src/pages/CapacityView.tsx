import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { AlertTriangle, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

interface CapacityRow {
  entity: string;
  capacity: number;
  govPlan: number;
  corpPlan: number;
}

const initialData: CapacityRow[] = [
  { entity: "Завод А", capacity: 1200, govPlan: 500, corpPlan: 400 },
  { entity: "Завод Б", capacity: 800, govPlan: 350, corpPlan: 500 },
  { entity: "Завод В", capacity: 1500, govPlan: 700, corpPlan: 600 },
  { entity: "Завод Г", capacity: 600, govPlan: 300, corpPlan: 350 },
  { entity: "Завод Д", capacity: 950, govPlan: 400, corpPlan: 300 },
];

function getGap(row: CapacityRow) {
  return row.capacity - row.govPlan - row.corpPlan;
}

function getUtilization(row: CapacityRow) {
  return ((row.govPlan + row.corpPlan) / row.capacity) * 100;
}

export default function CapacityView() {
  const { t, translateData } = useLanguage();
  const [data, setData] = useState<CapacityRow[]>(initialData);

  const updateField = (index: number, field: keyof CapacityRow, value: string) => {
    const updated = [...data];
    updated[index] = { ...updated[index], [field]: field === "entity" ? value : Number(value) || 0 };
    setData(updated);
  };

  const totalCapacity = data.reduce((s, r) => s + r.capacity, 0);
  const totalDemand = data.reduce((s, r) => s + r.govPlan + r.corpPlan, 0);
  const totalGap = totalCapacity - totalDemand;
  const bottleneck = data.reduce((worst, r) => (getGap(r) < getGap(worst) ? r : worst), data[0]);

  const chartData = data.map((r) => ({
    name: translateData(r.entity),
    GOV: r.govPlan,
    CORP: r.corpPlan,
    [t("free")]: Math.max(0, getGap(r)),
    [t("deficit")]: Math.min(0, getGap(r)),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("capacityTitle")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("capacitySubtitle")}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard title={t("totalCapacity")} value={totalCapacity.toLocaleString()} icon={<TrendingUp className="h-4 w-4" />} variant="default" />
        <KpiCard title={t("totalDemand")} value={totalDemand.toLocaleString()} icon={<Minus className="h-4 w-4" />} variant="default" />
        <KpiCard
          title={t("gapReserve")}
          value={totalGap.toLocaleString()}
          icon={totalGap >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          variant={totalGap >= 0 ? "success" : "destructive"}
        />
        <KpiCard
          title={t("bottleneck")}
          value={translateData(bottleneck.entity)}
          subtitle={`GAP: ${getGap(bottleneck).toLocaleString()}`}
          icon={<AlertTriangle className="h-4 w-4" />}
          variant="warning"
        />
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("capacityLoad")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 20%)" />
                <XAxis dataKey="name" tick={{ fill: "hsl(220 10% 55%)", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(220 10% 55%)", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(220 25% 12%)",
                    border: "1px solid hsl(220 20% 20%)",
                    borderRadius: 8,
                    color: "hsl(220 15% 90%)",
                  }}
                />
                <Legend />
                <Bar dataKey="GOV" stackId="a" fill="hsl(187 70% 50%)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="CORP" stackId="a" fill="hsl(38 92% 50%)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Свободно" stackId="a" fill="hsl(152 60% 45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Editable Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("dataInput")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-3 px-2 font-medium">{t("entity")}</th>
                  <th className="text-right py-3 px-2 font-medium">{t("capacity")}</th>
                  <th className="text-right py-3 px-2 font-medium">{t("govPlan")}</th>
                  <th className="text-right py-3 px-2 font-medium">{t("corpPlan")}</th>
                  <th className="text-right py-3 px-2 font-medium">{t("utilization")}</th>
                  <th className="text-right py-3 px-2 font-medium">GAP</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => {
                  const gap = getGap(row);
                  const util = getUtilization(row);
                  return (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-2">
                        <Input
                          value={row.entity}
                          onChange={(e) => updateField(i, "entity", e.target.value)}
                          className="h-8 bg-transparent border-none px-1"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <Input
                          type="number"
                          value={row.capacity}
                          onChange={(e) => updateField(i, "capacity", e.target.value)}
                          className="h-8 bg-transparent border-none px-1 text-right"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <Input
                          type="number"
                          value={row.govPlan}
                          onChange={(e) => updateField(i, "govPlan", e.target.value)}
                          className="h-8 bg-transparent border-none px-1 text-right"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <Input
                          type="number"
                          value={row.corpPlan}
                          onChange={(e) => updateField(i, "corpPlan", e.target.value)}
                          className="h-8 bg-transparent border-none px-1 text-right"
                        />
                      </td>
                      <td className="py-2 px-2 text-right">
                        <Badge variant={util > 90 ? "destructive" : util > 70 ? "outline" : "secondary"}>
                          {util.toFixed(0)}%
                        </Badge>
                      </td>
                      <td className={`py-2 px-2 text-right font-mono font-medium ${gap < 0 ? "text-destructive" : "text-success"}`}>
                        {gap > 0 ? "+" : ""}{gap.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  variant,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  variant: "default" | "success" | "destructive" | "warning";
}) {
  const colorMap = {
    default: "text-primary",
    success: "text-success",
    destructive: "text-destructive",
    warning: "text-accent",
  };

  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</span>
          <span className={colorMap[variant]}>{icon}</span>
        </div>
        <div className={`text-2xl font-bold ${colorMap[variant]}`}>{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

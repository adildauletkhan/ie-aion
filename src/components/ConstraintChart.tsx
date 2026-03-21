import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  Cell,
} from "recharts";
import type { StageResultRow } from "@/lib/digitalTwinApi";

interface ConstraintChartProps {
  rows: StageResultRow[];
  feasibleVolume: number;
}

export function ConstraintChart({ rows, feasibleVolume }: ConstraintChartProps) {
  const chartData = rows.map((r) => ({
    name: r.label,
    stage: r.stage,
    "Мощность": r.capacity,
    "План ГОС": r.planGov,
    "План КОРП": r.planCorp,
    isBottleneck: r.isBottleneck,
  }));

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} barGap={8} barCategoryGap="25%">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 20%)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: "hsl(220 10% 55%)", fontSize: 12, fontWeight: 500 }}
            axisLine={{ stroke: "hsl(220 20% 20%)" }}
          />
          <YAxis
            tick={{ fill: "hsl(220 10% 55%)", fontSize: 11 }}
            axisLine={{ stroke: "hsl(220 20% 20%)" }}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)} тыс.т`}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(220 25% 12%)",
              border: "1px solid hsl(220 20% 20%)",
              borderRadius: 8,
              color: "hsl(220 15% 90%)",
              fontSize: 12,
            }}
            formatter={(value: number) => `${value.toLocaleString()} тыс.т`}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "hsl(220 10% 55%)" }}
          />
          <ReferenceLine
            y={feasibleVolume}
            stroke="hsl(187 70% 50%)"
            strokeDasharray="6 4"
            strokeWidth={2}
            label={{
              value: `Допустимый: ${feasibleVolume.toLocaleString()} тыс.т`,
              fill: "hsl(187 70% 50%)",
              fontSize: 11,
              fontWeight: 600,
              position: "insideTopRight",
            }}
          />
          <Bar dataKey="Мощность" radius={[4, 4, 0, 0]} barSize={40}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cap-${index}`}
                fill={entry.isBottleneck ? "hsl(0 72% 51%)" : "hsl(220 20% 30%)"}
                opacity={0.6}
              />
            ))}
          </Bar>
          <Bar dataKey="План ГОС" stackId="plan" fill="hsl(187 70% 50%)" radius={[0, 0, 0, 0]} barSize={40} />
          <Bar dataKey="План КОРП" stackId="plan" fill="hsl(38 92% 50%)" radius={[4, 4, 0, 0]} barSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

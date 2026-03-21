import { Badge } from "@/components/ui/badge";
import type { StageResultRow } from "@/lib/digitalTwinApi";

interface ImbalanceTableProps {
  rows: StageResultRow[];
}

const statusConfig = {
  green: { label: "Норма", className: "bg-success/20 text-success" },
  yellow: { label: "Напряжение", className: "bg-warning/20 text-warning" },
  red: { label: "Ограничение", className: "bg-destructive/20 text-destructive" },
};

export function ImbalanceTable({ rows }: ImbalanceTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="text-left py-3 px-3 font-medium text-xs uppercase tracking-wider">Этап</th>
             <th className="text-right py-3 px-3 font-medium text-xs uppercase tracking-wider">Мощность <span className="normal-case tracking-normal font-normal">(тыс.т)</span></th>
             <th className="text-right py-3 px-3 font-medium text-xs uppercase tracking-wider">ГОС <span className="normal-case tracking-normal font-normal">(тыс.т)</span></th>
             <th className="text-right py-3 px-3 font-medium text-xs uppercase tracking-wider">КОРП <span className="normal-case tracking-normal font-normal">(тыс.т)</span></th>
             <th className="text-right py-3 px-3 font-medium text-xs uppercase tracking-wider">Всего <span className="normal-case tracking-normal font-normal">(тыс.т)</span></th>
             <th className="text-right py-3 px-3 font-medium text-xs uppercase tracking-wider">Утилизация</th>
             <th className="text-center py-3 px-3 font-medium text-xs uppercase tracking-wider">Статус</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const cfg = statusConfig[row.status];
            return (
              <tr
                key={row.stage}
                className={`border-b border-border/50 transition-colors ${
                  row.isBottleneck
                    ? "bg-destructive/5 hover:bg-destructive/10"
                    : "hover:bg-muted/30"
                }`}
              >
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{row.label}</span>
                    <span className="text-xs text-muted-foreground font-mono">({row.stage})</span>
                    {row.isBottleneck && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        УЗКОЕ МЕСТО
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="py-3 px-3 text-right font-mono font-medium">
                  {row.capacity.toLocaleString()}
                </td>
                <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                  {row.planGov.toLocaleString()}
                </td>
                <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                  {row.planCorp.toLocaleString()}
                </td>
                <td className="py-3 px-3 text-right font-mono font-medium">
                  {row.totalPlan.toLocaleString()}
                </td>
                <td className="py-3 px-3 text-right">
                  <span
                    className={`font-mono font-bold ${
                      row.status === "red"
                        ? "text-destructive"
                        : row.status === "yellow"
                        ? "text-warning"
                        : "text-success"
                    }`}
                  >
                    {row.utilization.toFixed(1)}%
                  </span>
                </td>
                <td className="py-3 px-3 text-center">
                  <Badge className={cfg.className} variant="secondary">
                    {cfg.label}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

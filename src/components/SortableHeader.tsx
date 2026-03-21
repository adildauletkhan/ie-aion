import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { SortState } from "@/hooks/useSortFilter";

interface Props {
  col: string;
  label: string;
  sort: SortState | null;
  onToggle: (col: string) => void;
  className?: string;
  align?: "left" | "right" | "center";
}

export function SortableHeader({ col, label, sort, onToggle, className = "", align = "left" }: Props) {
  const isActive = sort?.col === col;
  const dir = sort?.dir;

  const alignClass =
    align === "right" ? "text-right justify-end" : align === "center" ? "text-center justify-center" : "text-left justify-start";

  return (
    <th
      className={`py-3 px-2 font-medium cursor-pointer select-none group whitespace-nowrap ${alignClass} ${className}`}
      onClick={() => onToggle(col)}
    >
      <span className={`inline-flex items-center gap-1 ${align === "right" ? "flex-row-reverse" : ""}`}>
        {label}
        {isActive ? (
          dir === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 text-primary shrink-0" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 text-primary shrink-0" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-40 transition-opacity" />
        )}
      </span>
    </th>
  );
}

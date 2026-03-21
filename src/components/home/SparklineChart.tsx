interface SparklineChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export function SparklineChart({
  data,
  width = 100,
  height = 32,
  color = "#5CE0D6",
}: SparklineChartProps) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padX = 2;
  const padY = 3;

  const toX = (i: number) =>
    padX + (i / (data.length - 1)) * (width - padX * 2);
  const toY = (v: number) =>
    padY + (1 - (v - min) / range) * (height - padY * 2);

  const points = data.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
  const areaPoints = [
    `${toX(0)},${height}`,
    ...data.map((v, i) => `${toX(i)},${toY(v)}`),
    `${toX(data.length - 1)},${height}`,
  ].join(" ");

  const gradientId = `spark-grad-${Math.random().toString(36).slice(2, 7)}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.30" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradientId})`} />
      <polyline
        points={points}
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        style={{ filter: `drop-shadow(0 0 4px ${color}60)` }}
      />
      <circle
        cx={toX(data.length - 1)}
        cy={toY(data[data.length - 1])}
        r="2.5"
        fill={color}
        style={{ filter: `drop-shadow(0 0 5px ${color}80)` }}
      />
    </svg>
  );
}

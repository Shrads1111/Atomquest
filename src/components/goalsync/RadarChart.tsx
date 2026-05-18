export function RadarChart({
  series,
  size = 320,
}: {
  series: { axis: string; value: number }[];
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 50;
  const n = series.length;
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const point = (i: number, v: number) => {
    const a = angle(i);
    return [cx + Math.cos(a) * r * v, cy + Math.sin(a) * r * v] as const;
  };
  const ringLevels = [0.25, 0.5, 0.75, 1];
  const dataPts = series.map((s, i) => point(i, s.value));
  const dataPath = dataPts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ") + " Z";

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto">
      <defs>
        <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.05" />
        </radialGradient>
      </defs>

      {ringLevels.map((lv, idx) => (
        <polygon
          key={idx}
          points={series
            .map((_, i) => {
              const [x, y] = point(i, lv);
              return `${x},${y}`;
            })
            .join(" ")}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
        />
      ))}

      {series.map((_, i) => {
        const [x, y] = point(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.05)" />;
      })}

      <polygon
        points={dataPts.map(([x, y]) => `${x},${y}`).join(" ")}
        fill="url(#radarFill)"
        stroke="#818CF8"
        strokeWidth="2"
        style={{ filter: "drop-shadow(0 0 10px rgba(79,70,229,0.6))" }}
      />

      {dataPts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.5" fill="#A5B4FC" />
      ))}

      {series.map((s, i) => {
        const [x, y] = point(i, 1.18);
        return (
          <text
            key={i}
            x={x}
            y={y}
            fontSize="10"
            fill="rgba(255,255,255,0.7)"
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="JetBrains Mono"
          >
            {s.axis}
          </text>
        );
      })}
    </svg>
  );
}

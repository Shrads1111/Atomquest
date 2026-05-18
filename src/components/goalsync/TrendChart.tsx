export function TrendChart({
  data,
  predicted = 94.2,
}: {
  data: { week: string; value: number }[];
  predicted?: number;
}) {
  const W = 600;
  const H = 260;
  const padL = 44;
  const padB = 36;
  const padT = 12;
  const padR = 60;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const xs = data.map((_, i) => padL + (i / (data.length - 1)) * (chartW * 0.6));
  const ys = data.map((d) => padT + chartH - (d.value / 100) * chartH);
  const last = [xs[xs.length - 1], ys[ys.length - 1]] as const;
  const predX = padL + chartW;
  const predY = padT + chartH - (predicted / 100) * chartH;

  const path = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[i]}`).join(" ");
  const area = `${path} L${last[0]},${padT + chartH} L${xs[0]},${padT + chartH} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      <defs>
        <linearGradient id="trendArea" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0, 25, 50, 75, 100].map((g) => {
        const y = padT + chartH - (g / 100) * chartH;
        return (
          <g key={g}>
            <line
              x1={padL}
              x2={W - padR + 20}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.05)"
              strokeDasharray="3 4"
            />
            <text x={12} y={y + 3} fontSize="10" fill="rgba(255,255,255,0.5)" fontFamily="JetBrains Mono">
              {g}%
            </text>
          </g>
        );
      })}

      <path d={area} fill="url(#trendArea)" />
      <path
        d={path}
        fill="none"
        stroke="#34D399"
        strokeWidth="2.5"
        strokeLinecap="round"
        style={{ filter: "drop-shadow(0 0 8px #10B981)" }}
      />

      {/* Predictive dashed segment */}
      <line
        x1={last[0]}
        y1={last[1]}
        x2={predX}
        y2={predY}
        stroke="#A5B4FC"
        strokeWidth="2"
        strokeDasharray="5 5"
        style={{ filter: "drop-shadow(0 0 6px rgba(79,70,229,0.6))" }}
      />
      <circle cx={predX} cy={predY} r="5" fill="#4F46E5" stroke="#A5B4FC" strokeWidth="1.5" />
      <text x={predX + 8} y={predY - 8} fontSize="10" fill="#A5B4FC" fontFamily="JetBrains Mono">
        {predicted}%
      </text>

      {xs.map((x, i) => (
        <g key={i}>
          <circle cx={x} cy={ys[i]} r="3.5" fill="#10B981" />
          <text x={x} y={H - 12} fontSize="10" fill="rgba(255,255,255,0.55)" textAnchor="middle" fontFamily="JetBrains Mono">
            {data[i].week}
          </text>
        </g>
      ))}
    </svg>
  );
}

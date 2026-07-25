"use client";

import { useT } from "@/components/IntlProviderClient";

const data = [44, 46, 51, 55, 59, 57, 62, 70, 68, 74, 80, 86];
const months = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

function buildPath(values: number[]) {
  const svgWidth = 760;
  const svgHeight = 260;
  const chartTop = 40; // top padding inside svg
  const chartHeight = svgHeight - chartTop - 30; // bottom padding

  const max = Math.max(...values);
  const min = Math.min(...values);
  const stepX = svgWidth / (values.length - 1);

  const points = values.map((value, index) => {
    const x = index * stepX;
    const normalized = (value - min) / (max - min || 1);
    const y = chartTop + (1 - normalized) * chartHeight;
    return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) };
  });

  const strokePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const last = points[points.length - 1];
  const first = points[0];
  const areaPath = `${strokePath} L ${last.x} ${svgHeight - 20} L ${first.x} ${svgHeight - 20} Z`;

  return { strokePath, areaPath, svgWidth, svgHeight };
}

export function AnalyticsChart() {
  const t = useT();
  const { strokePath: path, areaPath, svgWidth, svgHeight } = buildPath(data);

  return (
    <section className="panel rounded-xl p-5 shadow-panel">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold">{t("dashboard.chart.title")}</h3>
          <p className="text-sm text-slate-300">{t("dashboard.chart.subtitle")}</p>
        </div>
        <span className="rounded-full bg-cyanAccent/15 px-3 py-1 text-xs font-semibold text-cyanAccent">{t("dashboard.chart.delta")}</span>
      </div>

      <div className="grid-pattern rounded-lg border border-slate-500/20 bg-slate-900/20 p-4">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="h-72 w-full">
          <defs>
            <linearGradient id="stroke-grad" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#00d4c8" />
              <stop offset="100%" stopColor="#2b86f4" />
            </linearGradient>
            <pattern id="img-fill" patternUnits="userSpaceOnUse" width={svgWidth} height={svgHeight}>
              <image href="/logo-ametis.png" x="0" y="0" width={svgWidth} height={svgHeight} preserveAspectRatio="xMidYMid slice" />
            </pattern>
          </defs>

          <path d={areaPath} fill="url(#img-fill)" opacity="0.12" />
          <path d={path} fill="none" stroke="url(#stroke-grad)" strokeWidth="4.5" strokeLinecap="round" />
        </svg>
      </div>

      <div className="mt-3 grid grid-cols-12 text-center text-xs text-slate-300">
        {months.map((month, index) => (
          <span key={`${month}-${index}`}>{t(`dashboard.chart.month.${month}`)}</span>
        ))}
      </div>
    </section>
  );
}

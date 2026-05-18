import { createFileRoute } from "@tanstack/react-router";
import { GlassCard, StatusChip } from "../../components/goalsync/Primitives";
import { RadarChart } from "../../components/goalsync/RadarChart";
import { TrendChart } from "../../components/goalsync/TrendChart";
import { Download, FileSpreadsheet, Sparkles, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { getGlobalAnalytics } from "@/services/admin";
import { downloadGoalsReport } from "@/services/reports";

export const Route = createFileRoute("/_app/intelligence")({
  head: () => ({
    meta: [
      { title: "Executive Intelligence — GoalSync" },
      {
        name: "description",
        content:
          "Executive analytics suite with radar telemetry and predictive performance horizons.",
      },
    ],
  }),
  component: IntelligencePage,
});

function IntelligencePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dynamic analytics state
  const [analytics, setAnalytics] = useState<any>(null);

  // Downloading state
  const [downloading, setDownloading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getGlobalAnalytics();
      setAnalytics(data);
    } catch (e: any) {
      setError(e.message || "Failed to load dynamic executive intelligence.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDownload = async (format: "csv" | "excel") => {
    try {
      setDownloading(true);
      const blob = await downloadGoalsReport(format);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `GoalSync_Strategic_Performance_Report.${format === "csv" ? "csv" : "xlsx"}`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e: any) {
      setError(`Report generation failed: ${e.message}`);
    } finally {
      setDownloading(false);
    }
  };

  if (loading && !analytics) {
    return <IntelligenceSkeleton />;
  }

  // Dynamic Radar mapping
  const totalGoals = analytics?.totalGoalsCount || 1;
  const radarSeries = analytics?.thrustDistribution?.map((d: any) => ({
    axis: d.area.substring(0, 18),
    value: totalGoals > 0 ? d.count / totalGoals : 0.8,
  })) || [
    { axis: "System Reliability", value: 0.92 },
    { axis: "Operational Efficiency", value: 0.84 },
    { axis: "Compliance & Risk", value: 0.96 },
    { axis: "Innovation", value: 0.88 },
  ];

  // Dynamic Trend mapping
  const trendSeries = analytics?.qoqTrends?.map((t: any) => ({
    week: t.quarter,
    value: t.completionRate,
  })) || [
    { week: "Q1 2026", value: 70.0 },
    { week: "Q2 2026", value: 82.0 },
    { week: "Q3 2026", value: 88.5 },
  ];

  const currentPredictiveHorizon =
    trendSeries.length > 0 ? trendSeries[trendSeries.length - 1].value : 94.2;

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-indigo-300 font-mono-metric">
            Executive Telemetrics Center
          </div>
          <h1 className="text-2xl font-bold mt-1">Organizational Performance Intelligence</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={downloading}
            onClick={() => handleDownload("csv")}
            className="btn-ghost text-xs flex items-center gap-1.5"
          >
            {downloading ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Export .CSV
          </button>
          <button
            disabled={downloading}
            onClick={() => handleDownload("excel")}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            {downloading ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-3.5 w-3.5" />
            )}
            Compile .XLSX
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-300 rounded-lg text-xs font-semibold font-mono-metric">
          ⚠ {error}
        </div>
      )}

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <FilterSelect label="Division" value="GoalSync Corp Global" />
          <FilterSelect label="Business Unit" value="Technology & Infrastructure" />
          <FilterSelect label="Fiscal Window" value="Q3 2026 Cycle" />
          <FilterSelect label="Objective Type" value="All Strategic Metrics" />
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar sync profile */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-[0.22em] text-indigo-300 font-mono-metric">
              Structural Radar Sync Profile
            </div>
            <StatusChip tone="indigo">{radarSeries.length} axes</StatusChip>
          </div>
          <div className="mt-2">
            <RadarChart series={radarSeries} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
            {radarSeries.map((s: any) => (
              <div key={s.axis} className="glass-elevated p-2 text-center">
                <div className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground font-mono-metric truncate">
                  {s.axis}
                </div>
                <div className="text-sm font-bold font-mono-metric text-indigo-200 mt-0.5">
                  {(s.value * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Predictive Trend trace */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-300 font-mono-metric">
              Progressive Trend Trace
            </div>
            <StatusChip tone="emerald">+18.2% Cycle average</StatusChip>
          </div>
          <div className="mt-3">
            <TrendChart data={trendSeries} predicted={currentPredictiveHorizon} />
          </div>

          <div className="mt-4 rounded-lg p-4 border border-indigo-500/30 bg-indigo-500/5">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-indigo-500/20 grid place-items-center text-indigo-200 shrink-0">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-indigo-300 font-mono-metric">
                  GoalSync Intelligence · Predictive Horizon
                </div>
                <p className="text-sm mt-1 leading-relaxed">
                  Predictive vectors forecast this unit is tracking toward a{" "}
                  <span className="text-emerald-300 font-semibold">
                    {currentPredictiveHorizon.toFixed(1)}% achievement
                  </span>{" "}
                  by cycle closure, outperforming segment baseline by{" "}
                  <span className="text-emerald-300 font-semibold">+4.1%</span>.
                </p>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function FilterSelect({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono-metric mb-1.5">
        {label}
      </div>
      <button className="w-full input-cinematic text-left flex items-center justify-between cursor-pointer">
        <span className="text-sm truncate">{value}</span>
        <span className="text-muted-foreground">▾</span>
      </button>
    </div>
  );
}

function IntelligenceSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div className="space-y-2">
          <div className="h-3 w-32 bg-slate-800 rounded-md"></div>
          <div className="h-7 w-64 bg-slate-800 rounded-md"></div>
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 bg-slate-800 rounded-md"></div>
          <div className="h-9 w-32 bg-slate-800 rounded-md"></div>
        </div>
      </div>

      {/* Filters Skeleton */}
      <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-20 bg-slate-800 rounded-md"></div>
              <div className="h-9 w-full bg-slate-800 rounded-md"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="p-6 bg-slate-900/40 border border-white/5 rounded-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div className="h-3 w-40 bg-slate-800 rounded-md"></div>
              <div className="h-5 w-24 bg-slate-800 rounded-md"></div>
            </div>
            <div className="h-[280px] bg-slate-800/50 rounded-xl flex items-center justify-center">
              <div className="h-12 w-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="h-10 bg-slate-800 rounded-lg"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

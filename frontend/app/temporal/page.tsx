"use client";

import { Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFilters, filtersToAPIBody } from "../../hooks/useFilters";
import { apiUrl } from "../../lib/config";
import dynamic from "next/dynamic";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface HeatmapData {
  hours: number[];
  dow: string[];
  matrix: number[][];
  max: number;
}

interface SeriesPoint {
  month: string;
  value: number;
}

type Metric = "trip_count" | "avg_fare" | "avg_tip_pct";

const METRIC_OPTIONS: { value: Metric; label: string }[] = [
  { value: "trip_count", label: "Trip Count" },
  { value: "avg_fare", label: "Average Fare" },
  { value: "avg_tip_pct", label: "Average Tip %" },
];

// Dark theme for Plotly
const plotlyLayout = {
  paper_bgcolor: "transparent",
  plot_bgcolor: "transparent",
  font: {
    family: "Outfit, sans-serif",
    color: "#A0A0A8",
  },
  xaxis: {
    gridcolor: "rgba(255,255,255,0.05)",
    linecolor: "rgba(255,255,255,0.1)",
  },
  yaxis: {
    gridcolor: "rgba(255,255,255,0.05)",
    linecolor: "rgba(255,255,255,0.1)",
  },
};

function TemporalContent() {
  const { debouncedFilters } = useFilters();
  const [selectedMetric, setSelectedMetric] = useState<Metric>("trip_count");

  const { data: heatmapData, isLoading: heatmapLoading, error: heatmapError } = useQuery({
    queryKey: ["temporal/heatmap", debouncedFilters],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/v1/temporal/heatmap"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filtersToAPIBody(debouncedFilters)),
      });
      if (!response.ok) throw new Error("Failed to fetch heatmap data");
      return response.json() as Promise<HeatmapData>;
    },
  });

  const { data: seriesData, isLoading: seriesLoading } = useQuery({
    queryKey: ["temporal/series", selectedMetric, debouncedFilters],
    queryFn: async () => {
      const response = await fetch(
        apiUrl(`/api/v1/temporal/series?metric=${selectedMetric}`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(filtersToAPIBody(debouncedFilters)),
        }
      );
      if (!response.ok) throw new Error("Failed to fetch series data");
      return response.json() as Promise<SeriesPoint[]>;
    },
  });

  const getMetricLabel = (metric: Metric): string => {
    switch (metric) {
      case "trip_count": return "Trip Count";
      case "avg_fare": return "Average Fare ($)";
      case "avg_tip_pct": return "Average Tip (%)";
    }
  };

  return (
    <div className="animate-fade-in">
      <header style={styles.header}>
        <h1 style={styles.title}>Temporal Analysis</h1>
        <p style={styles.subtitle}>Discover time-based patterns in taxi demand and pricing</p>
      </header>

      {heatmapError && (
        <div style={styles.errorBox}>
          {heatmapError instanceof Error ? heatmapError.message : "Unknown error"}
        </div>
      )}

      {(heatmapLoading || seriesLoading) ? (
        <LoadingSkeleton />
      ) : (
        <>
          {/* Heatmap Section */}
          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Hourly Demand Heatmap</h2>
                <p style={styles.sectionSubtitle}>Trip counts by day of week and hour of day</p>
              </div>
            </div>
            <div style={styles.chartContainer}>
              {heatmapData && (
                <Plot
                  data={[
                    {
                      z: heatmapData.matrix,
                      x: heatmapData.hours,
                      y: heatmapData.dow,
                      type: "heatmap",
                      colorscale: [
                        [0, "#1a1a1e"],
                        [0.25, "#3d2f1f"],
                        [0.5, "#7a5a2a"],
                        [0.75, "#c99a35"],
                        [1, "#F7C52D"],
                      ],
                      hoverongaps: false,
                      colorbar: {
                        tickfont: { color: "#A0A0A8" },
                        title: { text: "Trips", font: { color: "#A0A0A8" } },
                      },
                    },
                  ]}
                  layout={{
                    ...plotlyLayout,
                    xaxis: { ...plotlyLayout.xaxis, title: { text: "Hour of Day", font: { color: "#A0A0A8" } } },
                    yaxis: { ...plotlyLayout.yaxis, title: { text: "Day of Week", font: { color: "#A0A0A8" } } },
                    height: 400,
                    margin: { l: 100, r: 80, t: 30, b: 60 },
                  }}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: "100%" }}
                />
              )}
            </div>
          </section>

          {/* Time Series Section */}
          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Monthly Trends</h2>
                <p style={styles.sectionSubtitle}>Track metrics over time</p>
              </div>
              <div style={styles.metricSelector}>
                {METRIC_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedMetric(option.value)}
                    style={{
                      ...styles.metricButton,
                      ...(selectedMetric === option.value ? styles.metricButtonActive : {}),
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.chartContainer}>
              {seriesData && seriesData.length > 0 && (
                <Plot
                  data={[
                    {
                      x: seriesData.map((d) => d.month),
                      y: seriesData.map((d) => d.value),
                      type: "scatter",
                      mode: "lines+markers",
                      marker: { color: "#F7C52D", size: 8 },
                      line: { width: 3, color: "#F7C52D" },
                      fill: "tozeroy",
                      fillcolor: "rgba(247, 197, 45, 0.1)",
                    },
                  ]}
                  layout={{
                    ...plotlyLayout,
                    xaxis: { ...plotlyLayout.xaxis, title: { text: "Month", font: { color: "#A0A0A8" } } },
                    yaxis: { ...plotlyLayout.yaxis, title: { text: getMetricLabel(selectedMetric), font: { color: "#A0A0A8" } } },
                    height: 400,
                    margin: { l: 80, r: 40, t: 30, b: 60 },
                  }}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: "100%" }}
                />
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div>
      <div className="skeleton" style={{ width: "100%", height: 400, borderRadius: 14, marginBottom: 24 }} />
      <div className="skeleton" style={{ width: "100%", height: 400, borderRadius: 14 }} />
    </div>
  );
}

export default function Temporal() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <TemporalContent />
    </Suspense>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 700,
    color: "var(--color-text-primary)",
    marginBottom: 8,
    letterSpacing: "-0.5px",
  },
  subtitle: {
    fontSize: 15,
    color: "var(--color-text-muted)",
  },
  errorBox: {
    padding: "16px 20px",
    backgroundColor: "var(--color-error-bg)",
    border: "1px solid rgba(248, 113, 113, 0.3)",
    borderRadius: 12,
    marginBottom: 24,
    color: "var(--color-error)",
    fontSize: 14,
  },
  section: {
    marginBottom: 32,
    backgroundColor: "var(--color-bg-secondary)",
    border: "1px solid var(--color-border)",
    borderRadius: 16,
    padding: 24,
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    flexWrap: "wrap",
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: "var(--color-text-primary)",
    margin: 0,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "var(--color-text-muted)",
    margin: 0,
  },
  metricSelector: {
    display: "flex",
    gap: 8,
    backgroundColor: "var(--color-bg-tertiary)",
    padding: 4,
    borderRadius: 10,
  },
  metricButton: {
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 500,
    border: "none",
    borderRadius: 8,
    backgroundColor: "transparent",
    color: "var(--color-text-secondary)",
    cursor: "pointer",
    transition: "all 150ms ease",
  },
  metricButtonActive: {
    backgroundColor: "rgba(247, 197, 45, 0.15)",
    color: "#F7C52D",
  },
  chartContainer: {
    borderRadius: 12,
    overflow: "hidden",
  },
};

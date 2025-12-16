"use client";

import { Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFilters, filtersToAPIBody } from "../../hooks/useFilters";
import { apiUrl } from "../../lib/config";
import dynamic from "next/dynamic";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface BoxplotSeries {
  name: string;
  q05: number;
  q25: number;
  q50: number;
  q75: number;
  q95: number;
}

interface BoxplotData {
  by: string;
  series: BoxplotSeries[];
}

interface HistogramData {
  bin_edges: number[];
  counts: number[];
}

interface ScatterPoint {
  distance: number;
  fare: number;
  tod: string;
  tip_pct: number;
}

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

const timeOfDayColors: Record<string, string> = {
  morning: "#F7C52D",
  afternoon: "#34D399",
  evening: "#F87171",
  night: "#60A5FA",
};

function FaresContent() {
  const { debouncedFilters } = useFilters();
  const [timeFilter, setTimeFilter] = useState<string>("all");

  const { data: boxplotData } = useQuery({
    queryKey: ["fares/boxplot", debouncedFilters],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/v1/fares/boxplot"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filtersToAPIBody(debouncedFilters)),
      });
      if (!response.ok) throw new Error("Failed to fetch boxplot");
      return response.json() as Promise<BoxplotData>;
    },
  });

  const { data: histogramData } = useQuery({
    queryKey: ["fares/tips-histogram", debouncedFilters],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/v1/fares/tips-histogram"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filtersToAPIBody(debouncedFilters)),
      });
      if (!response.ok) throw new Error("Failed to fetch histogram");
      return response.json() as Promise<HistogramData>;
    },
  });

  const { data: scatterData, isLoading: scatterLoading } = useQuery({
    queryKey: ["fares/scatter", debouncedFilters],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/v1/fares/scatter"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filtersToAPIBody(debouncedFilters)),
      });
      if (!response.ok) throw new Error("Failed to fetch scatter");
      return response.json() as Promise<ScatterPoint[]>;
    },
  });

  const boxplotTraces = boxplotData?.series.map((s) => ({
    type: "box" as const,
    name: s.name,
    y: [s.q05, s.q25, s.q50, s.q75, s.q95],
    boxpoints: false,
    marker: { color: "#F7C52D" },
    line: { color: "#F7C52D" },
    fillcolor: "rgba(247, 197, 45, 0.2)",
  })) || [];

  const histogramTrace = histogramData
    ? {
        type: "bar" as const,
        x: histogramData.bin_edges.slice(0, -1).map((edge, i) => (edge + histogramData.bin_edges[i + 1]) / 2),
        y: histogramData.counts,
        marker: {
          color: histogramData.counts.map((_, i) =>
            `rgba(247, 197, 45, ${0.3 + (i / histogramData.counts.length) * 0.7})`
          ),
        },
      }
    : null;

  const filteredScatter =
    timeFilter === "all" ? scatterData || [] : (scatterData || []).filter((point) => point.tod === timeFilter);

  const scatterTraces = ["morning", "afternoon", "evening", "night"].map((tod) => {
    const points = filteredScatter.filter((p) => p.tod === tod);
    return {
      type: "scatter" as const,
      mode: "markers" as const,
      name: tod.charAt(0).toUpperCase() + tod.slice(1),
      x: points.map((p) => p.distance),
      y: points.map((p) => p.fare),
      text: points.map((p) => `Tip: ${(p.tip_pct * 100).toFixed(1)}%`),
      marker: {
        color: timeOfDayColors[tod],
        size: 6,
        opacity: 0.7,
      },
    };
  });

  return (
    <div className="animate-fade-in">
      <header style={styles.header}>
        <h1 style={styles.title}>Fare & Tip Analysis</h1>
        <p style={styles.subtitle}>Explore pricing patterns and tipping behavior</p>
      </header>

      {/* Boxplot Section */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Fare per Mile by Borough</h2>
            <p style={styles.sectionSubtitle}>Distribution of fare rates across boroughs</p>
          </div>
        </div>
        <div style={styles.chartContainer}>
          {boxplotData ? (
            <Plot
              data={boxplotTraces}
              layout={{
                ...plotlyLayout,
                height: 400,
                yaxis: { ...plotlyLayout.yaxis, title: { text: "Fare per Mile ($)", font: { color: "#A0A0A8" } } },
                xaxis: { ...plotlyLayout.xaxis, title: { text: "Borough", font: { color: "#A0A0A8" } } },
                showlegend: false,
                margin: { l: 80, r: 40, t: 30, b: 60 },
              }}
              config={{ responsive: true, displayModeBar: false }}
              style={{ width: "100%" }}
            />
          ) : (
            <div className="skeleton" style={{ width: "100%", height: 400, borderRadius: 12 }} />
          )}
        </div>
      </section>

      {/* Histogram Section */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Tip Percentage Distribution</h2>
            <p style={styles.sectionSubtitle}>How much do riders typically tip?</p>
          </div>
        </div>
        <div style={styles.chartContainer}>
          {histogramData && histogramTrace ? (
            <Plot
              data={[histogramTrace]}
              layout={{
                ...plotlyLayout,
                height: 400,
                xaxis: { ...plotlyLayout.xaxis, title: { text: "Tip Percentage", font: { color: "#A0A0A8" } }, tickformat: ".0%" },
                yaxis: { ...plotlyLayout.yaxis, title: { text: "Count", font: { color: "#A0A0A8" } } },
                bargap: 0.05,
                margin: { l: 80, r: 40, t: 30, b: 60 },
              }}
              config={{ responsive: true, displayModeBar: false }}
              style={{ width: "100%" }}
            />
          ) : (
            <div className="skeleton" style={{ width: "100%", height: 400, borderRadius: 12 }} />
          )}
        </div>
      </section>

      {/* Scatter Plot Section */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Distance vs Fare</h2>
            <p style={styles.sectionSubtitle}>Relationship between trip distance and fare amount</p>
          </div>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Time of Day</label>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              style={styles.select}
            >
              <option value="all">All Times</option>
              <option value="morning">Morning (6am-12pm)</option>
              <option value="afternoon">Afternoon (12pm-6pm)</option>
              <option value="evening">Evening (6pm-10pm)</option>
              <option value="night">Night (10pm-6am)</option>
            </select>
          </div>
        </div>
        <div style={styles.chartContainer}>
          {scatterLoading ? (
            <div className="skeleton" style={{ width: "100%", height: 500, borderRadius: 12 }} />
          ) : (
            <Plot
              data={scatterTraces}
              layout={{
                ...plotlyLayout,
                height: 500,
                xaxis: { ...plotlyLayout.xaxis, title: { text: "Distance (miles)", font: { color: "#A0A0A8" } } },
                yaxis: { ...plotlyLayout.yaxis, title: { text: "Fare ($)", font: { color: "#A0A0A8" } } },
                hovermode: "closest",
                legend: {
                  x: 1,
                  y: 1,
                  bgcolor: "rgba(26, 26, 30, 0.8)",
                  bordercolor: "rgba(255,255,255,0.1)",
                  borderwidth: 1,
                  font: { color: "#A0A0A8" },
                },
                margin: { l: 80, r: 40, t: 30, b: 60 },
              }}
              config={{ responsive: true, displayModeBar: false }}
              style={{ width: "100%" }}
            />
          )}
        </div>
        <div style={styles.legendBar}>
          {Object.entries(timeOfDayColors).map(([tod, color]) => (
            <div key={tod} style={styles.legendItem}>
              <div style={{ ...styles.legendDot, backgroundColor: color }} />
              <span>{tod.charAt(0).toUpperCase() + tod.slice(1)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div>
      <div className="skeleton" style={{ width: 250, height: 36, marginBottom: 8, borderRadius: 8 }} />
      <div className="skeleton" style={{ width: 350, height: 20, marginBottom: 32, borderRadius: 6 }} />
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton" style={{ width: "100%", height: 400, marginBottom: 24, borderRadius: 16 }} />
      ))}
    </div>
  );
}

export default function Fares() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <FaresContent />
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
  chartContainer: {
    borderRadius: 12,
    overflow: "hidden",
  },
  filterGroup: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: 500,
    color: "var(--color-text-muted)",
  },
  select: {
    padding: "8px 12px",
    fontSize: 13,
    backgroundColor: "var(--color-bg-tertiary)",
    border: "1px solid var(--color-border)",
    borderRadius: 8,
    color: "var(--color-text-primary)",
    cursor: "pointer",
  },
  legendBar: {
    display: "flex",
    gap: 20,
    marginTop: 16,
    paddingTop: 16,
    borderTop: "1px solid var(--color-border)",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "var(--color-text-secondary)",
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
  },
};

"use client";

import { Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFilters, filtersToAPIBody } from "../../hooks/useFilters";
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

function FaresContent() {
  const { debouncedFilters } = useFilters();
  const [timeFilter, setTimeFilter] = useState<string>("all");

  const { data: boxplotData } = useQuery({
    queryKey: ["fares/boxplot", debouncedFilters],
    queryFn: async () => {
      const response = await fetch("http://localhost:8000/api/v1/fares/boxplot", {
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
      const response = await fetch("http://localhost:8000/api/v1/fares/tips-histogram", {
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
      const response = await fetch("http://localhost:8000/api/v1/fares/scatter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filtersToAPIBody(debouncedFilters)),
      });
      if (!response.ok) throw new Error("Failed to fetch scatter");
      return response.json() as Promise<ScatterPoint[]>;
    },
  });

  // Prepare boxplot traces
  const boxplotTraces = boxplotData?.series.map((s) => ({
    type: "box" as const,
    name: s.name,
    y: [s.q05, s.q25, s.q50, s.q75, s.q95],
    boxpoints: false,
    marker: { color: "#1f77b4" },
  })) || [];

  // Prepare histogram trace
  const histogramTrace = histogramData
    ? {
        type: "bar" as const,
        x: histogramData.bin_edges.slice(0, -1).map((edge, i) => (edge + histogramData.bin_edges[i + 1]) / 2),
        y: histogramData.counts,
        marker: { color: "#2ca02c" },
      }
    : null;

  // Filter scatter data by time of day
  const filteredScatter =
    timeFilter === "all" ? scatterData || [] : (scatterData || []).filter((point) => point.tod === timeFilter);

  // Prepare scatter traces grouped by time of day
  const timeOfDayColors: Record<string, string> = {
    morning: "#ff7f0e",
    afternoon: "#2ca02c",
    evening: "#d62728",
    night: "#9467bd",
  };

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
        size: 5,
        opacity: 0.6,
      },
    };
  });

  return (
    <div>
      <h1>Fare & Tip Analysis</h1>

      {/* Boxplot Section */}
      <section style={{ marginBottom: "40px" }}>
        <h2>Fare per Mile by Borough</h2>
        {boxplotData ? (
          <Plot
            data={boxplotTraces}
            layout={{
              width: 900,
              height: 400,
              title: "Fare per Mile Distribution by Borough",
              yaxis: { title: "Fare per Mile ($)" },
              xaxis: { title: "Borough" },
              showlegend: false,
            }}
            config={{ responsive: true }}
          />
        ) : (
          <p>Loading boxplot...</p>
        )}
      </section>

      {/* Histogram Section */}
      <section style={{ marginBottom: "40px" }}>
        <h2>Tip Percentage Distribution</h2>
        {histogramData && histogramTrace ? (
          <Plot
            data={[histogramTrace]}
            layout={{
              width: 900,
              height: 400,
              title: "Distribution of Tip Percentages",
              xaxis: { title: "Tip Percentage", tickformat: ".0%" },
              yaxis: { title: "Count" },
              bargap: 0.05,
            }}
            config={{ responsive: true }}
          />
        ) : (
          <p>Loading histogram...</p>
        )}
      </section>

      {/* Scatter Plot Section */}
      <section>
        <h2>Distance vs Fare</h2>
        <div style={{ marginBottom: "10px" }}>
          <label htmlFor="timeFilter" style={{ marginRight: "10px" }}>
            Filter by Time of Day:
          </label>
          <select
            id="timeFilter"
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            style={{
              padding: "5px 10px",
              borderRadius: "4px",
              border: "1px solid #ccc",
            }}
          >
            <option value="all">All</option>
            <option value="morning">Morning (6am-12pm)</option>
            <option value="afternoon">Afternoon (12pm-6pm)</option>
            <option value="evening">Evening (6pm-10pm)</option>
            <option value="night">Night (10pm-6am)</option>
          </select>
        </div>
        {scatterLoading ? (
          <p>Loading scatter plot...</p>
        ) : (
          <Plot
            data={scatterTraces}
            layout={{
              width: 900,
              height: 500,
              title: "Trip Distance vs Fare Amount",
              xaxis: { title: "Distance (miles)" },
              yaxis: { title: "Fare ($)" },
              hovermode: "closest",
            }}
            config={{ responsive: true }}
          />
        )}
      </section>
    </div>
  );
}

export default function Fares() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FaresContent />
    </Suspense>
  );
}

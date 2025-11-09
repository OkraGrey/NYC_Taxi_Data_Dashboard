"use client";

import { Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFilters, filtersToAPIBody } from "../../hooks/useFilters";
import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues with Plotly
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

function TemporalContent() {
  const { debouncedFilters } = useFilters();
  const [selectedMetric, setSelectedMetric] = useState<Metric>("trip_count");

  const { data: heatmapData, isLoading: heatmapLoading, error: heatmapError } = useQuery({
    queryKey: ["temporal/heatmap", debouncedFilters],
    queryFn: async () => {
      const response = await fetch("http://localhost:8000/api/v1/temporal/heatmap", {
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
        `http://localhost:8000/api/v1/temporal/series?metric=${selectedMetric}`,
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
      case "trip_count":
        return "Trip Count";
      case "avg_fare":
        return "Average Fare ($)";
      case "avg_tip_pct":
        return "Average Tip (%)";
    }
  };

  return (
    <div>
      <h1>Temporal Analysis</h1>

      {heatmapError && (
        <div
          style={{
            padding: "10px",
            marginBottom: "20px",
            backgroundColor: "#fee",
            color: "#c00",
            borderRadius: "4px",
          }}
        >
          Error: {heatmapError instanceof Error ? heatmapError.message : "Unknown error"}
        </div>
      )}

      {(heatmapLoading || seriesLoading) ? (
        <p>Loading...</p>
      ) : (
        <>
          {/* Heatmap Section */}
          <section style={{ marginBottom: "40px" }}>
            <h2>Hourly Demand Heatmap</h2>
            <p style={{ color: "#666", marginBottom: "20px" }}>
              Trip counts by day of week and hour of day
            </p>
            {heatmapData && (
              <Plot
                data={[
                  {
                    z: heatmapData.matrix,
                    x: heatmapData.hours,
                    y: heatmapData.dow,
                    type: "heatmap",
                    colorscale: "YlOrRd",
                    hoverongaps: false,
                  },
                ]}
                layout={{
                  title: "",
                  xaxis: { title: "Hour of Day" },
                  yaxis: { title: "Day of Week" },
                  width: 900,
                  height: 400,
                  margin: { l: 80, r: 50, t: 50, b: 80 },
                }}
                config={{ responsive: true }}
              />
            )}
          </section>

          {/* Time Series Section */}
          <section>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h2>Monthly Trends</h2>
              <div>
                <label htmlFor="metric-select" style={{ marginRight: "10px" }}>
                  Metric:
                </label>
                <select
                  id="metric-select"
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value as Metric)}
                  style={{
                    padding: "8px 12px",
                    fontSize: "14px",
                    borderRadius: "4px",
                    border: "1px solid #ccc",
                  }}
                >
                  <option value="trip_count">Trip Count</option>
                  <option value="avg_fare">Average Fare</option>
                  <option value="avg_tip_pct">Average Tip %</option>
                </select>
              </div>
            </div>

            {seriesData && seriesData.length > 0 && (
              <Plot
                data={[
                  {
                    x: seriesData.map((d) => d.month),
                    y: seriesData.map((d) => d.value),
                    type: "scatter",
                    mode: "lines+markers",
                    marker: { color: "#1f77b4" },
                    line: { width: 2 },
                  },
                ]}
                layout={{
                  title: "",
                  xaxis: { title: "Month" },
                  yaxis: { title: getMetricLabel(selectedMetric) },
                  width: 900,
                  height: 400,
                  margin: { l: 80, r: 50, t: 50, b: 80 },
                }}
                config={{ responsive: true }}
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default function Temporal() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TemporalContent />
    </Suspense>
  );
}

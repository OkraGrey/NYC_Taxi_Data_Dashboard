"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFilters, filtersToAPIBody } from "../hooks/useFilters";
import KpiCard from "../components/KpiCard";
import SummaryBar from "../components/SummaryBar";

interface KpiData {
  avg_trip_duration_min: number;
  avg_fare_per_mile: number;
  total_trips: number;
  peak_demand_hour: number;
  busiest_borough: string;
}

interface SummaryData {
  text: string;
}

function OverviewContent() {
  const { debouncedFilters } = useFilters();

  const { data: kpis, isLoading: kpisLoading, error: kpisError } = useQuery({
    queryKey: ["kpis", debouncedFilters],
    queryFn: async () => {
      const response = await fetch("http://localhost:8000/api/v1/kpis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filtersToAPIBody(debouncedFilters)),
      });
      if (!response.ok) throw new Error("Failed to fetch KPIs");
      return response.json() as Promise<KpiData>;
    },
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["summary", debouncedFilters],
    queryFn: async () => {
      const response = await fetch("http://localhost:8000/api/v1/summary/short-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filtersToAPIBody(debouncedFilters)),
      });
      if (!response.ok) throw new Error("Failed to fetch summary");
      return response.json() as Promise<SummaryData>;
    },
  });

  const loading = kpisLoading || summaryLoading;

  return (
    <div>
      <h1 style={{ fontSize: "32px", marginBottom: "30px", color: "#333" }}>
        Overview
      </h1>

      {kpisError && (
        <div
          style={{
            padding: "16px",
            backgroundColor: "#ffebee",
            color: "#c62828",
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          Error: {kpisError instanceof Error ? kpisError.message : "Failed to load data"}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "20px",
          marginBottom: "20px",
        }}
      >
        <KpiCard
          label="Total Trips"
          value={kpis?.total_trips.toLocaleString() ?? "..."}
          loading={loading}
        />
        <KpiCard
          label="Avg Trip Duration"
          value={kpis ? `${kpis.avg_trip_duration_min} min` : "..."}
          loading={loading}
        />
        <KpiCard
          label="Avg Fare per Mile"
          value={kpis ? `$${kpis.avg_fare_per_mile}` : "..."}
          loading={loading}
        />
        <KpiCard
          label="Peak Demand Hour"
          value={
            kpis
              ? `${kpis.peak_demand_hour % 12 || 12} ${
                  kpis.peak_demand_hour < 12 ? "AM" : "PM"
                }`
              : "..."
          }
          loading={loading}
        />
        <KpiCard
          label="Busiest Borough"
          value={kpis?.busiest_borough ?? "..."}
          loading={loading}
        />
      </div>

      <SummaryBar text={summary?.text ?? ""} loading={loading} />
    </div>
  );
}

export default function Overview() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OverviewContent />
    </Suspense>
  );
}


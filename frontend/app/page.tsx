"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFilters, filtersToAPIBody } from "../hooks/useFilters";
import KpiCard from "../components/KpiCard";
import SummaryBar from "../components/SummaryBar";
import { apiUrl } from "../lib/config";

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

const kpiIcons = {
  trips: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 3h5v5M8 3H3v5M3 16v5h5M16 21h5v-5M21 3l-7 7M3 21l7-7"/>
    </svg>
  ),
  duration: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12,6 12,12 16,14"/>
    </svg>
  ),
  fare: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  peak: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
    </svg>
  ),
  borough: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
};

function OverviewContent() {
  const { debouncedFilters } = useFilters();

  const { data: kpis, isLoading: kpisLoading, error: kpisError } = useQuery({
    queryKey: ["kpis", debouncedFilters],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/v1/kpis"), {
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
      const response = await fetch(apiUrl("/api/v1/summary/short-text"), {
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
    <div className="animate-fade-in">
      <header style={styles.header}>
        <h1 style={styles.title}>Overview</h1>
        <p style={styles.subtitle}>Key metrics and insights from NYC Yellow Taxi trips</p>
      </header>

      {kpisError && (
        <div style={styles.errorBox}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <span>{kpisError instanceof Error ? kpisError.message : "Failed to load data"}</span>
        </div>
      )}

      <div style={styles.kpiGrid}>
        <KpiCard
          label="Total Trips"
          value={kpis?.total_trips.toLocaleString() ?? "..."}
          loading={loading}
          icon={kpiIcons.trips}
        />
        <KpiCard
          label="Avg Trip Duration"
          value={kpis ? `${kpis.avg_trip_duration_min} min` : "..."}
          loading={loading}
          icon={kpiIcons.duration}
        />
        <KpiCard
          label="Avg Fare/Mile"
          value={kpis ? `$${kpis.avg_fare_per_mile}` : "..."}
          loading={loading}
          icon={kpiIcons.fare}
        />
        <KpiCard
          label="Peak Hour"
          value={
            kpis
              ? `${kpis.peak_demand_hour % 12 || 12} ${kpis.peak_demand_hour < 12 ? "AM" : "PM"}`
              : "..."
          }
          loading={loading}
          icon={kpiIcons.peak}
        />
        <KpiCard
          label="Busiest Borough"
          value={kpis?.busiest_borough ?? "..."}
          loading={loading}
          icon={kpiIcons.borough}
        />
      </div>

      <SummaryBar text={summary?.text ?? ""} loading={loading} />
    </div>
  );
}

export default function Overview() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <OverviewContent />
    </Suspense>
  );
}

function LoadingSkeleton() {
  return (
    <div>
      <div className="skeleton" style={{ width: 200, height: 36, marginBottom: 8, borderRadius: 8 }} />
      <div className="skeleton" style={{ width: 350, height: 20, marginBottom: 32, borderRadius: 6 }} />
      <div style={styles.kpiGrid}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton" style={{ height: 130, borderRadius: 14 }} />
        ))}
      </div>
    </div>
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
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "16px 20px",
    backgroundColor: "var(--color-error-bg)",
    border: "1px solid rgba(248, 113, 113, 0.3)",
    borderRadius: 12,
    marginBottom: 24,
    color: "var(--color-error)",
    fontSize: 14,
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 20,
  },
};

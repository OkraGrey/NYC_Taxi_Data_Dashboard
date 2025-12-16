"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFilters, filtersToAPIBody } from "../../hooks/useFilters";
import { apiUrl } from "../../lib/config";

interface QualityReport {
  rows_total: number;
  rows_after_filters: number;
  pct_zero_distance: number;
  pct_negative_fare: number;
  pct_invalid_speed: number;
}

function QualityContent() {
  const { debouncedFilters } = useFilters();

  const { data: report, isLoading, error } = useQuery({
    queryKey: ["quality/report", debouncedFilters],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/v1/quality/report"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filtersToAPIBody(debouncedFilters)),
      });
      if (!response.ok) throw new Error("Failed to fetch quality report");
      return response.json() as Promise<QualityReport>;
    },
  });

  if (error) {
    return (
      <div className="animate-fade-in">
        <header style={styles.header}>
          <h1 style={styles.title}>Data Quality Report</h1>
        </header>
        <div style={styles.errorBox}>
          {error instanceof Error ? error.message : "Unknown error"}
        </div>
      </div>
    );
  }

  if (isLoading || !report) {
    return <LoadingSkeleton />;
  }

  const pctRowsRemoved =
    report.rows_total > 0
      ? (((report.rows_total - report.rows_after_filters) / report.rows_total) * 100).toFixed(2)
      : "0.00";

  const qualityIssues = [
    {
      label: "Zero Distance",
      value: report.pct_zero_distance,
      threshold: 1,
      description: "Trips with distance ≤ 0 miles",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
        </svg>
      ),
    },
    {
      label: "Negative Fare",
      value: report.pct_negative_fare,
      threshold: 0.5,
      description: "Trips with fare amount < $0",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23"/>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      ),
    },
    {
      label: "Invalid Speed",
      value: report.pct_invalid_speed,
      threshold: 2,
      description: "Trips with speed > 80 mph or < 1 mph",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <polyline points="2,17 12,22 22,17"/>
          <polyline points="2,12 12,17 22,12"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <header style={styles.header}>
        <h1 style={styles.title}>Data Quality Report</h1>
        <p style={styles.subtitle}>
          Data quality checks to ensure analytics accuracy
        </p>
      </header>

      {/* Dataset Statistics */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Dataset Statistics</h2>
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
              </svg>
            </div>
            <div style={styles.statContent}>
              <span style={styles.statLabel}>Total Rows (Raw)</span>
              <span style={styles.statValue}>{report.rows_total.toLocaleString()}</span>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, backgroundColor: "rgba(52, 211, 153, 0.1)", color: "#34D399" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22,4 12,14.01 9,11.01"/>
              </svg>
            </div>
            <div style={styles.statContent}>
              <span style={styles.statLabel}>Rows After Cleaning</span>
              <span style={{ ...styles.statValue, color: "#34D399" }}>{report.rows_after_filters.toLocaleString()}</span>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, backgroundColor: "rgba(248, 113, 113, 0.1)", color: "#F87171" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3,6 5,6 21,6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </div>
            <div style={styles.statContent}>
              <span style={styles.statLabel}>Rows Removed</span>
              <span style={{ ...styles.statValue, color: "#F87171" }}>
                {(report.rows_total - report.rows_after_filters).toLocaleString()}
                <span style={styles.statPct}> ({pctRowsRemoved}%)</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Quality Issues */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Quality Issues Detected</h2>
        <div style={styles.issuesGrid}>
          {qualityIssues.map((issue) => {
            const isHigh = issue.value > issue.threshold;
            return (
              <div key={issue.label} style={styles.issueCard}>
                <div style={styles.issueHeader}>
                  <div style={{
                    ...styles.issueIcon,
                    backgroundColor: isHigh ? "rgba(248, 113, 113, 0.1)" : "rgba(52, 211, 153, 0.1)",
                    color: isHigh ? "#F87171" : "#34D399",
                  }}>
                    {issue.icon}
                  </div>
                  <div>
                    <h3 style={styles.issueLabel}>{issue.label}</h3>
                    <p style={styles.issueDescription}>{issue.description}</p>
                  </div>
                </div>
                <div style={styles.issueValue}>
                  <span style={{
                    ...styles.issuePct,
                    color: isHigh ? "#F87171" : "#34D399",
                  }}>
                    {issue.value.toFixed(2)}%
                  </span>
                  <span style={{
                    ...styles.issueStatus,
                    backgroundColor: isHigh ? "rgba(248, 113, 113, 0.1)" : "rgba(52, 211, 153, 0.1)",
                    color: isHigh ? "#F87171" : "#34D399",
                  }}>
                    {isHigh ? "High" : "Normal"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Note */}
      <div style={styles.noteBox}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        <span>
          Quality issues are shown as percentages of the raw dataset. Cleaning filters remove
          these problematic records before analysis.
        </span>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-fade-in">
      <div className="skeleton" style={{ width: 250, height: 36, marginBottom: 8, borderRadius: 8 }} />
      <div className="skeleton" style={{ width: 350, height: 20, marginBottom: 32, borderRadius: 6 }} />
      <div className="skeleton" style={{ width: "100%", height: 200, marginBottom: 24, borderRadius: 16 }} />
      <div className="skeleton" style={{ width: "100%", height: 300, borderRadius: 16 }} />
    </div>
  );
}

export default function Quality() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <QualityContent />
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
    color: "var(--color-error)",
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
    backgroundColor: "var(--color-bg-secondary)",
    border: "1px solid var(--color-border)",
    borderRadius: 16,
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: "var(--color-text-primary)",
    margin: 0,
    marginBottom: 20,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: 16,
  },
  statCard: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: 20,
    backgroundColor: "var(--color-bg-tertiary)",
    borderRadius: 12,
    border: "1px solid var(--color-border)",
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(247, 197, 45, 0.1)",
    color: "#F7C52D",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  statContent: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  statLabel: {
    fontSize: 13,
    color: "var(--color-text-muted)",
  },
  statValue: {
    fontFamily: "var(--font-mono)",
    fontSize: 24,
    fontWeight: 600,
    color: "var(--color-text-primary)",
  },
  statPct: {
    fontSize: 14,
    fontWeight: 400,
    color: "var(--color-text-muted)",
  },
  issuesGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  issueCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "var(--color-bg-tertiary)",
    borderRadius: 12,
    border: "1px solid var(--color-border)",
  },
  issueHeader: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  issueIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  issueLabel: {
    fontSize: 15,
    fontWeight: 600,
    color: "var(--color-text-primary)",
    margin: 0,
    marginBottom: 4,
  },
  issueDescription: {
    fontSize: 13,
    color: "var(--color-text-muted)",
    margin: 0,
  },
  issueValue: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  issuePct: {
    fontFamily: "var(--font-mono)",
    fontSize: 24,
    fontWeight: 600,
  },
  issueStatus: {
    fontSize: 12,
    fontWeight: 600,
    padding: "4px 10px",
    borderRadius: 20,
  },
  noteBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: "16px 20px",
    backgroundColor: "rgba(96, 165, 250, 0.1)",
    border: "1px solid rgba(96, 165, 250, 0.2)",
    borderRadius: 12,
    color: "#60A5FA",
    fontSize: 14,
    lineHeight: 1.5,
  },
};

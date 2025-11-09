"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFilters, filtersToAPIBody } from "../../hooks/useFilters";

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
      const response = await fetch("http://localhost:8000/api/v1/quality/report", {
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
      <div>
        <h1>Data Quality Report</h1>
        <div style={{ color: "red", padding: "10px", border: "1px solid red", borderRadius: "4px" }}>
          Error: {error instanceof Error ? error.message : "Unknown error"}
        </div>
      </div>
    );
  }

  if (isLoading || !report) {
    return (
      <div>
        <h1>Data Quality Report</h1>
        <p>Loading quality report...</p>
      </div>
    );
  }

  // Calculate percentage of rows removed
  const pctRowsRemoved =
    report.rows_total > 0
      ? (((report.rows_total - report.rows_after_filters) / report.rows_total) * 100).toFixed(2)
      : "0.00";

  return (
    <div>
      <h1>Data Quality Report</h1>

      <p style={{ marginBottom: "20px", color: "#666" }}>
        This report shows data quality checks to help you trust the analytics. Quality issues are identified before
        cleaning filters are applied.
      </p>

      <section style={{ marginBottom: "40px" }}>
        <h2>Dataset Statistics</h2>
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            maxWidth: "700px",
            border: "1px solid #ddd",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#f5f5f5" }}>
              <th style={{ padding: "12px", textAlign: "left", border: "1px solid #ddd" }}>Metric</th>
              <th style={{ padding: "12px", textAlign: "right", border: "1px solid #ddd" }}>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "12px", border: "1px solid #ddd" }}>Total Rows (Raw)</td>
              <td style={{ padding: "12px", textAlign: "right", border: "1px solid #ddd", fontWeight: "bold" }}>
                {report.rows_total.toLocaleString()}
              </td>
            </tr>
            <tr style={{ backgroundColor: "#f9f9f9" }}>
              <td style={{ padding: "12px", border: "1px solid #ddd" }}>Rows After Cleaning</td>
              <td style={{ padding: "12px", textAlign: "right", border: "1px solid #ddd", fontWeight: "bold" }}>
                {report.rows_after_filters.toLocaleString()}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "12px", border: "1px solid #ddd" }}>Rows Removed</td>
              <td style={{ padding: "12px", textAlign: "right", border: "1px solid #ddd", fontWeight: "bold" }}>
                {(report.rows_total - report.rows_after_filters).toLocaleString()} ({pctRowsRemoved}%)
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>Quality Issues Detected</h2>
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            maxWidth: "700px",
            border: "1px solid #ddd",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#f5f5f5" }}>
              <th style={{ padding: "12px", textAlign: "left", border: "1px solid #ddd" }}>Issue Type</th>
              <th style={{ padding: "12px", textAlign: "right", border: "1px solid #ddd" }}>Percentage</th>
              <th style={{ padding: "12px", textAlign: "left", border: "1px solid #ddd" }}>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "12px", border: "1px solid #ddd" }}>Zero Distance</td>
              <td
                style={{
                  padding: "12px",
                  textAlign: "right",
                  border: "1px solid #ddd",
                  fontWeight: "bold",
                  color: report.pct_zero_distance > 1 ? "#d62728" : "#2ca02c",
                }}
              >
                {report.pct_zero_distance.toFixed(2)}%
              </td>
              <td style={{ padding: "12px", border: "1px solid #ddd", fontSize: "14px", color: "#666" }}>
                Trips with distance ≤ 0 miles
              </td>
            </tr>
            <tr style={{ backgroundColor: "#f9f9f9" }}>
              <td style={{ padding: "12px", border: "1px solid #ddd" }}>Negative Fare</td>
              <td
                style={{
                  padding: "12px",
                  textAlign: "right",
                  border: "1px solid #ddd",
                  fontWeight: "bold",
                  color: report.pct_negative_fare > 0.5 ? "#d62728" : "#2ca02c",
                }}
              >
                {report.pct_negative_fare.toFixed(2)}%
              </td>
              <td style={{ padding: "12px", border: "1px solid #ddd", fontSize: "14px", color: "#666" }}>
                Trips with fare amount &lt; $0
              </td>
            </tr>
            <tr>
              <td style={{ padding: "12px", border: "1px solid #ddd" }}>Invalid Speed</td>
              <td
                style={{
                  padding: "12px",
                  textAlign: "right",
                  border: "1px solid #ddd",
                  fontWeight: "bold",
                  color: report.pct_invalid_speed > 2 ? "#d62728" : "#2ca02c",
                }}
              >
                {report.pct_invalid_speed.toFixed(2)}%
              </td>
              <td style={{ padding: "12px", border: "1px solid #ddd", fontSize: "14px", color: "#666" }}>
                Trips with speed &gt; 80 mph or &lt; 1 mph
              </td>
            </tr>
          </tbody>
        </table>

        <div
          style={{
            marginTop: "20px",
            padding: "12px",
            backgroundColor: "#e8f4f8",
            border: "1px solid #b3d9e6",
            borderRadius: "4px",
            maxWidth: "700px",
          }}
        >
          <strong>Note:</strong> Quality issues are shown as percentages of the raw dataset. Cleaning filters remove
          these problematic records before analysis.
        </div>
      </section>
    </div>
  );
}

export default function Quality() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <QualityContent />
    </Suspense>
  );
}

"use client";

interface KpiCardProps {
  label: string;
  value: string | number;
  loading?: boolean;
}

export default function KpiCard({ label, value, loading = false }: KpiCardProps) {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "8px",
        padding: "20px",
        textAlign: "center",
        backgroundColor: "#f9f9f9",
        minWidth: "150px",
      }}
    >
      <div
        style={{
          fontSize: "14px",
          color: "#666",
          marginBottom: "8px",
          fontWeight: "500",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "28px",
          fontWeight: "bold",
          color: loading ? "#ccc" : "#333",
        }}
      >
        {loading ? "..." : value}
      </div>
    </div>
  );
}

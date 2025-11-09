"use client";

interface SummaryBarProps {
  text: string;
  loading?: boolean;
}

export default function SummaryBar({ text, loading = false }: SummaryBarProps) {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "8px",
        padding: "16px 24px",
        backgroundColor: "#e3f2fd",
        marginTop: "20px",
        fontSize: "16px",
        color: "#1565c0",
        fontWeight: "500",
      }}
    >
      {loading ? "Loading summary..." : text}
    </div>
  );
}

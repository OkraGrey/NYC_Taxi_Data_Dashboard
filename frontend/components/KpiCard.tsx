"use client";

interface KpiCardProps {
  label: string;
  value: string | number;
  loading?: boolean;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export default function KpiCard({ label, value, loading = false, icon, trend }: KpiCardProps) {
  return (
    <div style={styles.card}>
      <div style={styles.header}>
        {icon && <div style={styles.iconContainer}>{icon}</div>}
        <span style={styles.label}>{label}</span>
      </div>

      <div style={styles.valueContainer}>
        {loading ? (
          <div className="skeleton" style={{ width: '70%', height: 36, borderRadius: 6 }} />
        ) : (
          <span style={styles.value}>{value}</span>
        )}
      </div>

      {trend && !loading && (
        <div style={{
          ...styles.trend,
          color: trend.isPositive ? 'var(--color-success)' : 'var(--color-error)',
        }}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            style={{
              transform: trend.isPositive ? 'rotate(0deg)' : 'rotate(180deg)',
            }}
          >
            <polyline points="18,15 12,9 6,15"/>
          </svg>
          <span>{Math.abs(trend.value)}%</span>
        </div>
      )}

      {/* Subtle glow effect */}
      <div style={styles.glow} />
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  card: {
    position: "relative",
    backgroundColor: "var(--color-bg-secondary)",
    border: "1px solid var(--color-border)",
    borderRadius: 14,
    padding: "20px 22px",
    minWidth: 180,
    overflow: "hidden",
    transition: "all 250ms ease",
  },
  glow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    background: "linear-gradient(90deg, transparent, rgba(247, 197, 45, 0.3), transparent)",
    opacity: 0.5,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(247, 197, 45, 0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#F7C52D",
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: "var(--color-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  valueContainer: {
    minHeight: 40,
  },
  value: {
    fontFamily: "var(--font-mono)",
    fontSize: 32,
    fontWeight: 600,
    color: "var(--color-text-primary)",
    letterSpacing: "-1px",
    lineHeight: 1,
  },
  trend: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    marginTop: 12,
    fontSize: 13,
    fontWeight: 600,
  },
};

"use client";

interface SummaryBarProps {
  text: string;
  loading?: boolean;
}

export default function SummaryBar({ text, loading = false }: SummaryBarProps) {
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.iconContainer}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ width: '80%', height: 16, marginBottom: 8, borderRadius: 4 }} />
          <div className="skeleton" style={{ width: '50%', height: 16, borderRadius: 4 }} />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.iconContainer}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
      <div style={styles.content}>
        <span style={styles.label}>Summary Insight</span>
        <p style={styles.text}>{text}</p>
      </div>
      <div style={styles.accent} />
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: "relative",
    display: "flex",
    alignItems: "flex-start",
    gap: 16,
    backgroundColor: "rgba(247, 197, 45, 0.05)",
    border: "1px solid rgba(247, 197, 45, 0.15)",
    borderRadius: 12,
    padding: "18px 22px",
    marginTop: 24,
    overflow: "hidden",
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(247, 197, 45, 0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#F7C52D",
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    color: "#F7C52D",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: 6,
  },
  text: {
    fontSize: 14,
    lineHeight: 1.6,
    color: "var(--color-text-secondary)",
    margin: 0,
  },
  accent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: "#F7C52D",
    borderRadius: "3px 0 0 3px",
  },
};

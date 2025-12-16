"use client";

import { Suspense } from "react";
import FilterSidebar from "./FilterSidebar";
import Navigation from "./Navigation";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div style={styles.container}>
      {/* Ambient background gradient */}
      <div style={styles.ambientGlow} />

      <Suspense fallback={<SidebarSkeleton />}>
        <aside style={styles.sidebar}>
          <div style={styles.logoContainer}>
            <div style={styles.logoIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="8" width="20" height="10" rx="2" fill="#F7C52D"/>
                <rect x="4" y="10" width="4" height="3" rx="1" fill="#0a0a0b"/>
                <rect x="16" y="10" width="4" height="3" rx="1" fill="#0a0a0b"/>
                <circle cx="6" cy="18" r="2" fill="#F7C52D"/>
                <circle cx="18" cy="18" r="2" fill="#F7C52D"/>
                <rect x="9" y="6" width="6" height="4" rx="1" fill="#F7C52D" opacity="0.8"/>
              </svg>
            </div>
            <div>
              <h1 style={styles.logo}>NYC Taxi</h1>
              <span style={styles.logoSubtitle}>Analytics Dashboard</span>
            </div>
          </div>
          <Navigation />
          <FilterSidebar />
        </aside>
      </Suspense>

      <main style={styles.main}>
        <div style={styles.mainInner}>
          {children}
        </div>
      </main>
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <aside style={styles.sidebar}>
      <div style={styles.logoContainer}>
        <div className="skeleton" style={{ width: 28, height: 28, borderRadius: 6 }} />
        <div>
          <div className="skeleton" style={{ width: 100, height: 24, marginBottom: 4 }} />
          <div className="skeleton" style={{ width: 120, height: 14 }} />
        </div>
      </div>
      <div style={{ marginTop: 32 }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="skeleton" style={{ width: '100%', height: 44, marginBottom: 8, borderRadius: 10 }} />
        ))}
      </div>
    </aside>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: "flex",
    minHeight: "100vh",
    position: "relative",
  },
  ambientGlow: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: `
      radial-gradient(ellipse 80% 50% at 20% -10%, rgba(247, 197, 45, 0.08) 0%, transparent 50%),
      radial-gradient(ellipse 60% 40% at 80% 110%, rgba(247, 197, 45, 0.05) 0%, transparent 50%)
    `,
    pointerEvents: "none",
    zIndex: 0,
  },
  sidebar: {
    width: 300,
    backgroundColor: "rgba(18, 18, 20, 0.95)",
    backdropFilter: "blur(20px)",
    borderRight: "1px solid var(--color-border)",
    position: "fixed",
    left: 0,
    top: 0,
    height: "100vh",
    overflowY: "auto",
    padding: "24px 20px",
    zIndex: 100,
    display: "flex",
    flexDirection: "column",
  },
  logoContainer: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    paddingBottom: 20,
    borderBottom: "1px solid var(--color-border)",
    marginBottom: 8,
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "rgba(247, 197, 45, 0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  logo: {
    fontSize: 22,
    fontWeight: 700,
    color: "#F7C52D",
    letterSpacing: "-0.5px",
    margin: 0,
    lineHeight: 1.2,
  },
  logoSubtitle: {
    fontSize: 12,
    color: "var(--color-text-muted)",
    fontWeight: 500,
    letterSpacing: "0.5px",
    textTransform: "uppercase",
  },
  main: {
    marginLeft: 300,
    flex: 1,
    minHeight: "100vh",
    backgroundColor: "var(--color-bg-primary)",
    position: "relative",
    zIndex: 1,
  },
  mainInner: {
    padding: "40px 48px",
    maxWidth: 1600,
  },
};

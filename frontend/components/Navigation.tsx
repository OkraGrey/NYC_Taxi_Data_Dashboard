"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/",
    label: "Overview",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
      </svg>
    )
  },
  {
    href: "/temporal",
    label: "Temporal",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12,6 12,12 16,14"/>
      </svg>
    )
  },
  {
    href: "/geo",
    label: "Geographic",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    )
  },
  {
    href: "/fares",
    label: "Fares",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    )
  },
  {
    href: "/quality",
    label: "Data Quality",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22,4 12,14.01 9,11.01"/>
      </svg>
    )
  },
  {
    href: "/predict",
    label: "Fare Predictor",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
    )
  },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav style={styles.nav}>
      <div style={styles.navHeader}>
        <span style={styles.navLabel}>Navigation</span>
      </div>
      <div style={styles.navList}>
        {NAV_ITEMS.map((item, index) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                ...styles.link,
                ...(isActive ? styles.linkActive : {}),
                animationDelay: `${index * 50}ms`,
              }}
            >
              <span style={{
                ...styles.icon,
                ...(isActive ? styles.iconActive : {}),
              }}>
                {item.icon}
              </span>
              <span style={styles.linkText}>{item.label}</span>
              {isActive && <span style={styles.activeIndicator} />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  nav: {
    marginTop: 24,
    marginBottom: 24,
  },
  navHeader: {
    padding: "0 12px",
    marginBottom: 12,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--color-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  navList: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  link: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 14px",
    fontSize: 14,
    fontWeight: 500,
    color: "var(--color-text-secondary)",
    textDecoration: "none",
    borderRadius: 10,
    transition: "all 200ms ease",
    position: "relative",
    overflow: "hidden",
  },
  linkActive: {
    backgroundColor: "rgba(247, 197, 45, 0.1)",
    color: "#F7C52D",
  },
  icon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "var(--color-bg-tertiary)",
    color: "var(--color-text-muted)",
    transition: "all 200ms ease",
    flexShrink: 0,
  },
  iconActive: {
    backgroundColor: "rgba(247, 197, 45, 0.15)",
    color: "#F7C52D",
  },
  linkText: {
    flex: 1,
  },
  activeIndicator: {
    position: "absolute",
    right: 14,
    width: 6,
    height: 6,
    borderRadius: "50%",
    backgroundColor: "#F7C52D",
    boxShadow: "0 0 8px rgba(247, 197, 45, 0.5)",
  },
};

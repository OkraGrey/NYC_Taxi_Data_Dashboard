"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Overview" },
  { href: "/temporal", label: "Temporal" },
  { href: "/geo", label: "Geo" },
  { href: "/fares", label: "Fares" },
  { href: "/quality", label: "Quality" },
  { href: "/predict", label: "Fare Predictor" },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav style={styles.nav}>
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              ...styles.link,
              ...(isActive ? styles.linkActive : {}),
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

const styles = {
  nav: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px",
    marginTop: "24px",
    paddingTop: "20px",
    borderTop: "1px solid #ddd",
  },
  link: {
    padding: "10px 12px",
    fontSize: "14px",
    color: "#555",
    textDecoration: "none",
    borderRadius: "4px",
    transition: "all 0.2s",
    display: "block",
  },
  linkActive: {
    backgroundColor: "#1976d2",
    color: "#fff",
    fontWeight: "600" as const,
  },
};

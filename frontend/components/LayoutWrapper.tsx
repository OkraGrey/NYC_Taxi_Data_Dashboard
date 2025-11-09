"use client";

import { Suspense } from "react";
import FilterSidebar from "./FilterSidebar";
import Navigation from "./Navigation";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div style={styles.container}>
      <Suspense fallback={<div style={styles.sidebarLoading}>Loading filters...</div>}>
        <div style={styles.sidebar}>
          <h1 style={styles.logo}>NYC Taxi</h1>
          <Navigation />
          <FilterSidebar />
        </div>
      </Suspense>
      <main style={styles.main}>{children}</main>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",
  },
  sidebar: {
    width: "280px",
    backgroundColor: "#f5f5f5",
    borderRight: "1px solid #ddd",
    position: "fixed" as const,
    left: 0,
    top: 0,
    height: "100vh",
    overflowY: "auto" as const,
    padding: "20px",
  },
  sidebarLoading: {
    width: "280px",
    backgroundColor: "#f5f5f5",
    padding: "20px",
    color: "#666",
  },
  logo: {
    fontSize: "24px",
    fontWeight: "bold" as const,
    marginBottom: "8px",
    color: "#1976d2",
  },
  main: {
    marginLeft: "280px",
    flex: 1,
    padding: "40px",
    minHeight: "100vh",
    backgroundColor: "#fff",
  },
};

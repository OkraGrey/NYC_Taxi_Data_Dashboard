"use client";

import { useEffect, useState } from "react";
import { useFilters } from "../hooks/useFilters";
import { apiUrl } from "../lib/config";

interface FilterOptions {
  boroughs: string[];
  payment_types: number[];
  min_date: string;
  max_date: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Mon" },
  { value: 1, label: "Tue" },
  { value: 2, label: "Wed" },
  { value: 3, label: "Thu" },
  { value: 4, label: "Fri" },
  { value: 5, label: "Sat" },
  { value: 6, label: "Sun" },
];

export default function FilterSidebar() {
  const { filters, updateFilter, resetFilters } = useFilters();
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["dates", "boroughs", "hours", "days"])
  );

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  useEffect(() => {
    fetch(apiUrl("/api/v1/meta/filters"))
      .then((res) => res.json())
      .then((data) => {
        setOptions(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading filter options:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>Filters</h2>
        </div>
        <div style={styles.loadingContainer}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ width: '100%', height: 48, marginBottom: 12, borderRadius: 10 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Filters</h2>
          <span style={styles.subtitle}>Refine your analysis</span>
        </div>
        <button onClick={resetFilters} style={styles.resetButton}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
          Reset
        </button>
      </div>

      {/* Date Range */}
      <FilterSection
        title="Date Range"
        isExpanded={expandedSections.has("dates")}
        onToggle={() => toggleSection("dates")}
      >
        <div style={styles.dateInputs}>
          <div style={styles.dateField}>
            <label style={styles.inputLabel}>From</label>
            <input
              type="date"
              value={filters.date_from || ""}
              min={options?.min_date}
              max={options?.max_date}
              onChange={(e) => updateFilter("date_from", e.target.value || null)}
              style={styles.input}
            />
          </div>
          <div style={styles.dateField}>
            <label style={styles.inputLabel}>To</label>
            <input
              type="date"
              value={filters.date_to || ""}
              min={options?.min_date}
              max={options?.max_date}
              onChange={(e) => updateFilter("date_to", e.target.value || null)}
              style={styles.input}
            />
          </div>
        </div>
      </FilterSection>

      {/* Boroughs */}
      <FilterSection
        title="Boroughs"
        isExpanded={expandedSections.has("boroughs")}
        onToggle={() => toggleSection("boroughs")}
        count={filters.boroughs?.length}
      >
        <div style={styles.checkboxGrid}>
          {options?.boroughs.map((borough) => {
            const isChecked = filters.boroughs?.includes(borough) || false;
            return (
              <label key={borough} style={styles.checkboxItem}>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => {
                    const current = filters.boroughs || [];
                    const updated = e.target.checked
                      ? [...current, borough]
                      : current.filter((b) => b !== borough);
                    updateFilter("boroughs", updated.length > 0 ? updated : null);
                  }}
                  style={styles.checkbox}
                />
                <span style={{
                  ...styles.checkboxLabel,
                  ...(isChecked ? styles.checkboxLabelActive : {}),
                }}>
                  {borough}
                </span>
              </label>
            );
          })}
        </div>
      </FilterSection>

      {/* Hours */}
      <FilterSection
        title="Hours"
        isExpanded={expandedSections.has("hours")}
        onToggle={() => toggleSection("hours")}
      >
        <div style={styles.rangeStack}>
          <div style={styles.rangeField}>
            <label style={styles.inputLabel}>From</label>
            <input
              type="number"
              placeholder="0"
              value={filters.hours?.[0] ?? ""}
              min="0"
              max="23"
              onChange={(e) => {
                const min = e.target.value ? parseInt(e.target.value) : null;
                const max = filters.hours?.[1] ?? null;
                updateFilter("hours", min !== null || max !== null ? [min ?? 0, max ?? 23] : null);
              }}
              style={styles.input}
            />
          </div>
          <div style={styles.rangeField}>
            <label style={styles.inputLabel}>To</label>
            <input
              type="number"
              placeholder="23"
              value={filters.hours?.[1] ?? ""}
              min="0"
              max="23"
              onChange={(e) => {
                const min = filters.hours?.[0] ?? null;
                const max = e.target.value ? parseInt(e.target.value) : null;
                updateFilter("hours", min !== null || max !== null ? [min ?? 0, max ?? 23] : null);
              }}
              style={styles.input}
            />
          </div>
        </div>
      </FilterSection>

      {/* Days of Week */}
      <FilterSection
        title="Days of Week"
        isExpanded={expandedSections.has("days")}
        onToggle={() => toggleSection("days")}
        count={filters.days_of_week?.length}
      >
        <div style={styles.chipGroup}>
          {DAYS_OF_WEEK.map((day) => {
            const isSelected = filters.days_of_week?.includes(day.value) || false;
            return (
              <button
                key={day.value}
                onClick={() => {
                  const current = filters.days_of_week || [];
                  const updated = isSelected
                    ? current.filter((d) => d !== day.value)
                    : [...current, day.value];
                  updateFilter("days_of_week", updated.length > 0 ? updated : null);
                }}
                style={{
                  ...styles.chip,
                  ...(isSelected ? styles.chipSelected : {}),
                }}
              >
                {day.label}
              </button>
            );
          })}
        </div>
      </FilterSection>

      {/* Fare Range */}
      <FilterSection
        title="Fare Range ($)"
        isExpanded={expandedSections.has("fare")}
        onToggle={() => toggleSection("fare")}
      >
        <div style={styles.rangeStack}>
          <div style={styles.rangeField}>
            <label style={styles.inputLabel}>Min</label>
            <input
              type="number"
              placeholder="0"
              value={filters.fare_range?.[0] ?? ""}
              min="0"
              step="0.5"
              onChange={(e) => {
                const min = e.target.value ? parseFloat(e.target.value) : null;
                const max = filters.fare_range?.[1] ?? null;
                updateFilter("fare_range", min !== null || max !== null ? [min ?? 0, max ?? 999] : null);
              }}
              style={styles.input}
            />
          </div>
          <div style={styles.rangeField}>
            <label style={styles.inputLabel}>Max</label>
            <input
              type="number"
              placeholder="999"
              value={filters.fare_range?.[1] ?? ""}
              min="0"
              step="0.5"
              onChange={(e) => {
                const min = filters.fare_range?.[0] ?? null;
                const max = e.target.value ? parseFloat(e.target.value) : null;
                updateFilter("fare_range", min !== null || max !== null ? [min ?? 0, max ?? 999] : null);
              }}
              style={styles.input}
            />
          </div>
        </div>
      </FilterSection>

      {/* Distance Range */}
      <FilterSection
        title="Distance (miles)"
        isExpanded={expandedSections.has("distance")}
        onToggle={() => toggleSection("distance")}
      >
        <div style={styles.rangeStack}>
          <div style={styles.rangeField}>
            <label style={styles.inputLabel}>Min</label>
            <input
              type="number"
              placeholder="0"
              value={filters.distance_range?.[0] ?? ""}
              min="0"
              step="0.5"
              onChange={(e) => {
                const min = e.target.value ? parseFloat(e.target.value) : null;
                const max = filters.distance_range?.[1] ?? null;
                updateFilter("distance_range", min !== null || max !== null ? [min ?? 0, max ?? 999] : null);
              }}
              style={styles.input}
            />
          </div>
          <div style={styles.rangeField}>
            <label style={styles.inputLabel}>Max</label>
            <input
              type="number"
              placeholder="999"
              value={filters.distance_range?.[1] ?? ""}
              min="0"
              step="0.5"
              onChange={(e) => {
                const min = filters.distance_range?.[0] ?? null;
                const max = e.target.value ? parseFloat(e.target.value) : null;
                updateFilter("distance_range", min !== null || max !== null ? [min ?? 0, max ?? 999] : null);
              }}
              style={styles.input}
            />
          </div>
        </div>
      </FilterSection>
    </div>
  );
}

function FilterSection({
  title,
  children,
  isExpanded,
  onToggle,
  count
}: {
  title: string;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  count?: number;
}) {
  return (
    <div style={styles.section}>
      <button onClick={onToggle} style={styles.sectionHeader}>
        <span style={styles.sectionTitle}>{title}</span>
        <div style={styles.sectionRight}>
          {count !== undefined && count > 0 && (
            <span style={styles.badge}>{count}</span>
          )}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 200ms ease',
            }}
          >
            <polyline points="6,9 12,15 18,9"/>
          </svg>
        </div>
      </button>
      {isExpanded && (
        <div style={styles.sectionContent}>
          {children}
        </div>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    borderTop: "1px solid var(--color-border)",
    paddingTop: 20,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
    color: "var(--color-text-primary)",
    margin: 0,
  },
  subtitle: {
    fontSize: 12,
    color: "var(--color-text-muted)",
    marginTop: 2,
  },
  resetButton: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    fontWeight: 500,
    padding: "6px 10px",
    backgroundColor: "var(--color-bg-tertiary)",
    color: "var(--color-text-secondary)",
    border: "1px solid var(--color-border)",
    borderRadius: 6,
    cursor: "pointer",
    transition: "all 150ms ease",
  },
  loadingContainer: {
    padding: "8px 0",
  },
  section: {
    borderBottom: "1px solid var(--color-border)",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    padding: "14px 0",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--color-text-secondary)",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--color-text-primary)",
    letterSpacing: "0.2px",
  },
  sectionRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    fontSize: 11,
    fontWeight: 600,
    padding: "2px 7px",
    backgroundColor: "rgba(247, 197, 45, 0.15)",
    color: "#F7C52D",
    borderRadius: 10,
  },
  sectionContent: {
    paddingBottom: 16,
  },
  dateInputs: {
    display: "flex",
    gap: 10,
  },
  dateField: {
    flex: 1,
  },
  inputLabel: {
    display: "block",
    fontSize: 11,
    fontWeight: 500,
    color: "var(--color-text-muted)",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    fontSize: 13,
    backgroundColor: "var(--color-bg-tertiary)",
    border: "1px solid var(--color-border)",
    borderRadius: 8,
    color: "var(--color-text-primary)",
  },
  checkboxGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
  },
  checkboxList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  checkboxItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
  },
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
  },
  checkbox: {
    width: 16,
    height: 16,
    cursor: "pointer",
  },
  checkboxLabel: {
    fontSize: 13,
    color: "var(--color-text-secondary)",
    transition: "color 150ms ease",
  },
  checkboxLabelActive: {
    color: "#F7C52D",
  },
  rangeStack: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  rangeField: {
    display: "flex",
    flexDirection: "column",
  },
  chipGroup: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 500,
    backgroundColor: "var(--color-bg-tertiary)",
    border: "1px solid var(--color-border)",
    borderRadius: 20,
    color: "var(--color-text-secondary)",
    cursor: "pointer",
    transition: "all 150ms ease",
  },
  chipSelected: {
    backgroundColor: "rgba(247, 197, 45, 0.15)",
    borderColor: "rgba(247, 197, 45, 0.3)",
    color: "#F7C52D",
  },
};

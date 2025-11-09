"use client";

import { useEffect, useState } from "react";
import { useFilters } from "../hooks/useFilters";

interface FilterOptions {
  boroughs: string[];
  payment_types: number[];
  min_date: string;
  max_date: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Monday" },
  { value: 1, label: "Tuesday" },
  { value: 2, label: "Wednesday" },
  { value: 3, label: "Thursday" },
  { value: 4, label: "Friday" },
  { value: 5, label: "Saturday" },
  { value: 6, label: "Sunday" },
];

const PAYMENT_TYPE_LABELS: { [key: number]: string } = {
  1: "Credit Card",
  2: "Cash",
  3: "No Charge",
  4: "Dispute",
  5: "Unknown",
  6: "Voided",
};

export default function FilterSidebar() {
  const { filters, updateFilter, resetFilters } = useFilters();
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch available filter options from API
    fetch("http://localhost:8000/api/v1/meta/filters")
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
        <h2 style={styles.title}>Filters</h2>
        <p style={styles.loading}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Filters</h2>
        <button onClick={resetFilters} style={styles.resetButton}>
          Reset All
        </button>
      </div>

      <div style={styles.filterGroup}>
        <label style={styles.label}>Date From</label>
        <input
          type="date"
          value={filters.date_from || ""}
          min={options?.min_date}
          max={options?.max_date}
          onChange={(e) => updateFilter("date_from", e.target.value || null)}
          style={styles.input}
        />
      </div>

      <div style={styles.filterGroup}>
        <label style={styles.label}>Date To</label>
        <input
          type="date"
          value={filters.date_to || ""}
          min={options?.min_date}
          max={options?.max_date}
          onChange={(e) => updateFilter("date_to", e.target.value || null)}
          style={styles.input}
        />
      </div>

      <div style={styles.filterGroup}>
        <label style={styles.label}>Boroughs</label>
        <div style={styles.checkboxGroup}>
          {options?.boroughs.map((borough) => (
            <label key={borough} style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={filters.boroughs?.includes(borough) || false}
                onChange={(e) => {
                  const current = filters.boroughs || [];
                  const updated = e.target.checked
                    ? [...current, borough]
                    : current.filter((b) => b !== borough);
                  updateFilter("boroughs", updated.length > 0 ? updated : null);
                }}
                style={styles.checkbox}
              />
              {borough}
            </label>
          ))}
        </div>
      </div>

      <div style={styles.filterGroup}>
        <label style={styles.label}>Hours (0-23)</label>
        <div style={styles.rangeInputs}>
          <input
            type="number"
            placeholder="Min"
            value={filters.hours?.[0] ?? ""}
            min="0"
            max="23"
            onChange={(e) => {
              const min = e.target.value ? parseInt(e.target.value) : null;
              const max = filters.hours?.[1] ?? null;
              updateFilter("hours", min !== null || max !== null ? [min ?? 0, max ?? 23] : null);
            }}
            style={{ ...styles.input, width: "48%" }}
          />
          <span>-</span>
          <input
            type="number"
            placeholder="Max"
            value={filters.hours?.[1] ?? ""}
            min="0"
            max="23"
            onChange={(e) => {
              const min = filters.hours?.[0] ?? null;
              const max = e.target.value ? parseInt(e.target.value) : null;
              updateFilter("hours", min !== null || max !== null ? [min ?? 0, max ?? 23] : null);
            }}
            style={{ ...styles.input, width: "48%" }}
          />
        </div>
      </div>

      <div style={styles.filterGroup}>
        <label style={styles.label}>Days of Week</label>
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
                {day.label.slice(0, 3)}
              </button>
            );
          })}
        </div>
      </div>

      <div style={styles.filterGroup}>
        <label style={styles.label}>Payment Types</label>
        <div style={styles.checkboxGroup}>
          {options?.payment_types.map((type) => (
            <label key={type} style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={filters.payment_types?.includes(type) || false}
                onChange={(e) => {
                  const current = filters.payment_types || [];
                  const updated = e.target.checked
                    ? [...current, type]
                    : current.filter((t) => t !== type);
                  updateFilter("payment_types", updated.length > 0 ? updated : null);
                }}
                style={styles.checkbox}
              />
              {PAYMENT_TYPE_LABELS[type] || `Type ${type}`}
            </label>
          ))}
        </div>
      </div>

      <div style={styles.filterGroup}>
        <label style={styles.label}>Fare Range ($)</label>
        <div style={styles.rangeInputs}>
          <input
            type="number"
            placeholder="Min"
            value={filters.fare_range?.[0] ?? ""}
            min="0"
            step="0.5"
            onChange={(e) => {
              const min = e.target.value ? parseFloat(e.target.value) : null;
              const max = filters.fare_range?.[1] ?? null;
              updateFilter("fare_range", min !== null || max !== null ? [min ?? 0, max ?? 999] : null);
            }}
            style={{ ...styles.input, width: "48%" }}
          />
          <span>-</span>
          <input
            type="number"
            placeholder="Max"
            value={filters.fare_range?.[1] ?? ""}
            min="0"
            step="0.5"
            onChange={(e) => {
              const min = filters.fare_range?.[0] ?? null;
              const max = e.target.value ? parseFloat(e.target.value) : null;
              updateFilter("fare_range", min !== null || max !== null ? [min ?? 0, max ?? 999] : null);
            }}
            style={{ ...styles.input, width: "48%" }}
          />
        </div>
      </div>

      <div style={styles.filterGroup}>
        <label style={styles.label}>Distance Range (miles)</label>
        <div style={styles.rangeInputs}>
          <input
            type="number"
            placeholder="Min"
            value={filters.distance_range?.[0] ?? ""}
            min="0"
            step="0.5"
            onChange={(e) => {
              const min = e.target.value ? parseFloat(e.target.value) : null;
              const max = filters.distance_range?.[1] ?? null;
              updateFilter("distance_range", min !== null || max !== null ? [min ?? 0, max ?? 999] : null);
            }}
            style={{ ...styles.input, width: "48%" }}
          />
          <span>-</span>
          <input
            type="number"
            placeholder="Max"
            value={filters.distance_range?.[1] ?? ""}
            min="0"
            step="0.5"
            onChange={(e) => {
              const min = filters.distance_range?.[0] ?? null;
              const max = e.target.value ? parseFloat(e.target.value) : null;
              updateFilter("distance_range", min !== null || max !== null ? [min ?? 0, max ?? 999] : null);
            }}
            style={{ ...styles.input, width: "48%" }}
          />
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    marginTop: "20px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  title: {
    fontSize: "20px",
    fontWeight: "bold" as const,
    margin: 0,
  },
  resetButton: {
    fontSize: "12px",
    padding: "4px 8px",
    backgroundColor: "#e0e0e0",
    border: "1px solid #ccc",
    borderRadius: "4px",
    cursor: "pointer",
  },
  loading: {
    color: "#666",
    fontSize: "14px",
  },
  filterGroup: {
    marginBottom: "20px",
  },
  label: {
    display: "block",
    fontSize: "14px",
    fontWeight: "600" as const,
    marginBottom: "8px",
    color: "#333",
  },
  input: {
    width: "100%",
    padding: "8px",
    fontSize: "14px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    boxSizing: "border-box" as const,
  },
  rangeInputs: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
  },
  checkboxGroup: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    fontSize: "14px",
    color: "#555",
    cursor: "pointer",
  },
  checkbox: {
    marginRight: "8px",
  },
  chipGroup: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "6px",
  },
  chip: {
    padding: "6px 12px",
    fontSize: "12px",
    border: "1px solid #ccc",
    borderRadius: "16px",
    backgroundColor: "#fff",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  chipSelected: {
    backgroundColor: "#1976d2",
    color: "#fff",
    borderColor: "#1976d2",
  },
};

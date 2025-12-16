"use client"

import { Suspense, useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useFilters, filtersToAPIBody } from "../../hooks/useFilters"
import { apiUrl } from "../../lib/config"
import dynamic from "next/dynamic"

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false })

interface ZoneStat {
  LocationID: number
  trips: number
  avg_fare: number
  avg_tip_pct: number
}

interface ZonesStatsResponse {
  side: string
  stats: ZoneStat[]
}

interface Centroid {
  lon: number
  lat: number
  trips: number
}

interface ClustersResponse {
  k: number
  centroids: Centroid[]
}

function GeoContent() {
  const { debouncedFilters } = useFilters()
  const [geojson, setGeojson] = useState<any>(null)
  const [side, setSide] = useState<"pickup" | "dropoff">("pickup")
  const [showClusters, setShowClusters] = useState(false)
  const [k, setK] = useState(5)

  useEffect(() => {
    fetch("/geo/taxi_zones.geojson")
      .then((res) => res.json())
      .then((data) => setGeojson(data))
      .catch((err) => console.error("Error loading GeoJSON:", err))
  }, [])

  const { data: zonesStats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ["geo/zones-stats", side, debouncedFilters],
    queryFn: async () => {
      const response = await fetch(apiUrl(`/api/v1/geo/zones-stats?side=${side}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filtersToAPIBody(debouncedFilters)),
      })
      if (!response.ok) throw new Error("Failed to load zone statistics")
      return response.json() as Promise<ZonesStatsResponse>
    },
  })

  const { data: clusters } = useQuery({
    queryKey: ["geo/clusters", side, k, debouncedFilters],
    queryFn: async () => {
      const response = await fetch(apiUrl(`/api/v1/geo/clusters?side=${side}&k=${k}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filtersToAPIBody(debouncedFilters)),
      })
      if (!response.ok) throw new Error("Failed to load clusters")
      return response.json() as Promise<ClustersResponse>
    },
    enabled: showClusters,
  })

  if (statsError) {
    return (
      <div className="animate-fade-in">
        <header style={styles.header}>
          <h1 style={styles.title}>Geographic Analysis</h1>
        </header>
        <div style={styles.errorBox}>
          {statsError instanceof Error ? statsError.message : "Failed to load data"}
        </div>
      </div>
    )
  }

  if (statsLoading || !geojson || !zonesStats) {
    return <LoadingSkeleton />
  }

  const statsMap = new Map<number, ZoneStat>()
  zonesStats.stats.forEach((stat) => statsMap.set(stat.LocationID, stat))

  const locationIds = geojson.features.map((f: any) => f.properties.LocationID)
  const tripCounts = locationIds.map((id: number) => statsMap.get(id)?.trips || 0)

  const hoverText = locationIds.map((id: number) => {
    const feature = geojson.features.find((f: any) => f.properties.LocationID === id)
    const stat = statsMap.get(id)
    if (!stat || !feature) return `Zone ${id}: No data`
    const zone = feature.properties.zone || "Unknown"
    const borough = feature.properties.borough || "Unknown"
    return `<b>${zone}</b><br>Borough: ${borough}<br>Trips: ${stat.trips.toLocaleString()}<br>Avg Fare: $${stat.avg_fare.toFixed(2)}<br>Avg Tip: ${(stat.avg_tip_pct * 100).toFixed(1)}%`
  })

  const choroplethTrace: any = {
    type: "choroplethmapbox",
    geojson: geojson,
    locations: locationIds,
    z: tripCounts,
    featureidkey: "properties.LocationID",
    colorscale: [
      [0, "#1a1a1e"],
      [0.2, "#2d2520"],
      [0.4, "#5c4a2a"],
      [0.6, "#8a6d34"],
      [0.8, "#c99a35"],
      [1, "#F7C52D"],
    ],
    colorbar: {
      title: { text: "Trips", font: { color: "#A0A0A8" } },
      tickfont: { color: "#A0A0A8" },
      bgcolor: "rgba(10,10,11,0.8)",
    },
    text: hoverText,
    hovertemplate: "%{text}<extra></extra>",
    marker: { opacity: 0.8, line: { color: "#2a2a30", width: 0.5 } },
  }

  const traces: any[] = [choroplethTrace]

  if (showClusters && clusters && clusters.centroids.length > 0) {
    const clusterTrace: any = {
      type: "scattermapbox",
      mode: "markers",
      lon: clusters.centroids.map((c) => c.lon),
      lat: clusters.centroids.map((c) => c.lat),
      marker: {
        size: clusters.centroids.map((c) => Math.sqrt(c.trips) / 50 + 16),
        color: "#00E5FF",
        opacity: 1,
        line: {
          color: "#FFFFFF",
          width: 2,
        },
      },
      text: clusters.centroids.map((c, i) => `Cluster ${i + 1}<br>Trips: ${c.trips.toLocaleString()}`),
      hovertemplate: "%{text}<extra></extra>",
      name: "Clusters",
    }
    traces.push(clusterTrace)
  }

  const layout: any = {
    mapbox: {
      style: "carto-darkmatter",
      center: { lon: -73.95, lat: 40.75 },
      zoom: 9.5,
    },
    height: 650,
    margin: { t: 0, b: 0, l: 0, r: 0 },
    paper_bgcolor: "transparent",
  }

  return (
    <div className="animate-fade-in">
      <header style={styles.header}>
        <h1 style={styles.title}>Geographic Analysis</h1>
        <p style={styles.subtitle}>Explore taxi hotspots and demand patterns across NYC</p>
      </header>

      <div style={styles.controls}>
        <div style={styles.controlGroup}>
          <label style={styles.controlLabel}>View</label>
          <div style={styles.toggleGroup}>
            <button
              onClick={() => setSide("pickup")}
              style={{ ...styles.toggleButton, ...(side === "pickup" ? styles.toggleButtonActive : {}) }}
            >
              Pickup
            </button>
            <button
              onClick={() => setSide("dropoff")}
              style={{ ...styles.toggleButton, ...(side === "dropoff" ? styles.toggleButtonActive : {}) }}
            >
              Dropoff
            </button>
          </div>
        </div>

        <div style={styles.controlGroup}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={showClusters}
              onChange={(e) => setShowClusters(e.target.checked)}
              style={styles.checkbox}
            />
            <span>Show Clusters</span>
          </label>
        </div>

        {showClusters && (
          <div style={styles.controlGroup}>
            <label style={styles.controlLabel}>Clusters (K)</label>
            <input
              type="number"
              value={k}
              onChange={(e) => setK(parseInt(e.target.value) || 5)}
              min="2"
              max="20"
              style={styles.numberInput}
            />
          </div>
        )}
      </div>

      <div style={styles.mapContainer}>
        <Plot data={traces} layout={layout} config={{ responsive: true, displayModeBar: false }} style={{ width: "100%" }} />
      </div>

      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendDot, backgroundColor: "#F7C52D" }} />
          <span>High trip density</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendDot, backgroundColor: "#5c4a2a" }} />
          <span>Low trip density</span>
        </div>
        {showClusters && (
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendDot, backgroundColor: "#00E5FF", border: "2px solid #FFFFFF" }} />
            <span>K-Means cluster centroid</span>
          </div>
        )}
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="animate-fade-in">
      <div className="skeleton" style={{ width: 250, height: 36, marginBottom: 8, borderRadius: 8 }} />
      <div className="skeleton" style={{ width: 400, height: 20, marginBottom: 32, borderRadius: 6 }} />
      <div className="skeleton" style={{ width: "100%", height: 650, borderRadius: 16 }} />
    </div>
  )
}

export default function Geo() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <GeoContent />
    </Suspense>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 700,
    color: "var(--color-text-primary)",
    marginBottom: 8,
    letterSpacing: "-0.5px",
  },
  subtitle: {
    fontSize: 15,
    color: "var(--color-text-muted)",
  },
  errorBox: {
    padding: "16px 20px",
    backgroundColor: "var(--color-error-bg)",
    border: "1px solid rgba(248, 113, 113, 0.3)",
    borderRadius: 12,
    color: "var(--color-error)",
    fontSize: 14,
  },
  controls: {
    display: "flex",
    alignItems: "center",
    gap: 24,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  controlGroup: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  controlLabel: {
    fontSize: 13,
    fontWeight: 500,
    color: "var(--color-text-muted)",
  },
  toggleGroup: {
    display: "flex",
    backgroundColor: "var(--color-bg-tertiary)",
    borderRadius: 8,
    padding: 3,
  },
  toggleButton: {
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 500,
    border: "none",
    borderRadius: 6,
    backgroundColor: "transparent",
    color: "var(--color-text-secondary)",
    cursor: "pointer",
    transition: "all 150ms ease",
  },
  toggleButtonActive: {
    backgroundColor: "rgba(247, 197, 45, 0.15)",
    color: "#F7C52D",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "var(--color-text-secondary)",
    cursor: "pointer",
  },
  checkbox: {
    width: 16,
    height: 16,
  },
  numberInput: {
    width: 60,
    padding: "8px 10px",
    fontSize: 13,
    backgroundColor: "var(--color-bg-tertiary)",
    border: "1px solid var(--color-border)",
    borderRadius: 6,
    color: "var(--color-text-primary)",
    textAlign: "center",
  },
  mapContainer: {
    borderRadius: 16,
    overflow: "hidden",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-bg-secondary)",
  },
  legend: {
    display: "flex",
    gap: 24,
    marginTop: 16,
    padding: "12px 16px",
    backgroundColor: "var(--color-bg-secondary)",
    borderRadius: 10,
    border: "1px solid var(--color-border)",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "var(--color-text-secondary)",
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: "50%",
  },
}

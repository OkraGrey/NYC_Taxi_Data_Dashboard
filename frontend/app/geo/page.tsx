"use client"

import { Suspense, useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useFilters, filtersToAPIBody } from "../../hooks/useFilters"
import dynamic from "next/dynamic"

// Dynamic import to avoid SSR issues with Plotly
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

  // Load GeoJSON on mount
  useEffect(() => {
    fetch("/geo/taxi_zones.geojson")
      .then((res) => res.json())
      .then((data) => setGeojson(data))
      .catch((err) => console.error("Error loading GeoJSON:", err))
  }, [])

  // Fetch zones stats
  const { data: zonesStats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ["geo/zones-stats", side, debouncedFilters],
    queryFn: async () => {
      const response = await fetch(`http://localhost:8000/api/v1/geo/zones-stats?side=${side}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filtersToAPIBody(debouncedFilters)),
      })
      if (!response.ok) throw new Error("Failed to load zone statistics")
      return response.json() as Promise<ZonesStatsResponse>
    },
  })

  // Fetch clusters
  const { data: clusters } = useQuery({
    queryKey: ["geo/clusters", side, k, debouncedFilters],
    queryFn: async () => {
      const response = await fetch(`http://localhost:8000/api/v1/geo/clusters?side=${side}&k=${k}`, {
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
      <div>
        <h1>Geographic Analysis</h1>
        <div style={{ color: "red", padding: "10px", background: "#fee" }}>
          {statsError instanceof Error ? statsError.message : "Failed to load data"}
        </div>
      </div>
    )
  }

  if (statsLoading || !geojson || !zonesStats) {
    return (
      <div>
        <h1>Geographic Analysis</h1>
        <p>Loading...</p>
      </div>
    )
  }

  // Create a map of LocationID to trips/avg_fare/avg_tip_pct
  const statsMap = new Map<number, ZoneStat>()
  zonesStats.stats.forEach((stat) => {
    statsMap.set(stat.LocationID, stat)
  })

  // Extract location IDs and corresponding trip counts
  const locationIds = geojson.features.map((f: any) => f.properties.LocationID)
  const tripCounts = locationIds.map((id: number) => {
    const stat = statsMap.get(id)
    return stat ? stat.trips : 0
  })
  const avgFares = locationIds.map((id: number) => {
    const stat = statsMap.get(id)
    return stat ? stat.avg_fare : 0
  })
  const avgTipPcts = locationIds.map((id: number) => {
    const stat = statsMap.get(id)
    return stat ? stat.avg_tip_pct : 0
  })

  // Create hover text
  const hoverText = locationIds.map((id: number) => {
    const feature = geojson.features.find((f: any) => f.properties.LocationID === id)
    const stat = statsMap.get(id)
    if (!stat || !feature) return `Zone ${id}: No data`

    const zone = feature.properties.zone || "Unknown"
    const borough = feature.properties.borough || "Unknown"

    return `<b>${zone}</b><br>Borough: ${borough}<br>Trips: ${stat.trips.toLocaleString()}<br>Avg Fare: $${stat.avg_fare.toFixed(2)}<br>Avg Tip %: ${(stat.avg_tip_pct * 100).toFixed(1)}%`
  })

  // Prepare choropleth trace
  const choroplethTrace: any = {
    type: "choroplethmapbox",
    geojson: geojson,
    locations: locationIds,
    z: tripCounts,
    featureidkey: "properties.LocationID",
    colorscale: "Viridis",
    colorbar: {
      title: "Trips",
      x: 1.02,
    },
    text: hoverText,
    hovertemplate: "%{text}<extra></extra>",
    marker: {
      opacity: 0.7,
      line: {
        color: "white",
        width: 0.5,
      },
    },
  }

  const traces: any[] = [choroplethTrace]

  // Add cluster markers if enabled
  if (showClusters && clusters && clusters.centroids.length > 0) {
    const clusterTrace: any = {
      type: "scattermapbox",
      mode: "markers",
      lon: clusters.centroids.map((c) => c.lon),
      lat: clusters.centroids.map((c) => c.lat),
      marker: {
        size: clusters.centroids.map((c) => Math.sqrt(c.trips) / 50 + 10),
        color: "red",
        opacity: 0.8,
        symbol: "circle",
      },
      text: clusters.centroids.map(
        (c, i) => `Cluster ${i + 1}<br>Trips: ${c.trips.toLocaleString()}`
      ),
      hovertemplate: "%{text}<extra></extra>",
      name: "Clusters",
    }
    traces.push(clusterTrace)
  }

  const layout: any = {
    mapbox: {
      style: "open-street-map",
      center: { lon: -73.95, lat: 40.75 },
      zoom: 9.5,
    },
    height: 700,
    margin: { t: 0, b: 0, l: 0, r: 0 },
  }

  return (
    <div>
      <h1>Geographic Analysis — Geo Hotspots</h1>

      <div style={{ marginBottom: "20px" }}>
        <label style={{ marginRight: "10px" }}>
          <strong>Side:</strong>
        </label>
        <select
          value={side}
          onChange={(e) => setSide(e.target.value as "pickup" | "dropoff")}
          style={{ marginRight: "20px", padding: "5px" }}
        >
          <option value="pickup">Pickup</option>
          <option value="dropoff">Dropoff</option>
        </select>

        <label style={{ marginRight: "10px" }}>
          <input
            type="checkbox"
            checked={showClusters}
            onChange={(e) => setShowClusters(e.target.checked)}
            style={{ marginRight: "5px" }}
          />
          Show Clusters
        </label>

        {showClusters && (
          <>
            <label style={{ marginRight: "10px" }}>
              <strong>K:</strong>
            </label>
            <input
              type="number"
              value={k}
              onChange={(e) => setK(parseInt(e.target.value) || 5)}
              min="2"
              max="20"
              style={{ width: "60px", padding: "5px" }}
            />
          </>
        )}
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: "8px", overflow: "hidden" }}>
        <Plot data={traces} layout={layout} config={{ responsive: true }} style={{ width: "100%" }} />
      </div>

      <div style={{ marginTop: "20px", fontSize: "14px", color: "#666" }}>
        <p>
          <strong>Map shows:</strong> Trip density by taxi zone (darker = more trips).
          Hover over zones to see details.
        </p>
        {showClusters && (
          <p>
            <strong>Red markers:</strong> K-Means cluster centroids weighted by trip volume.
            Marker size represents cluster trip count.
          </p>
        )}
      </div>
    </div>
  )
}

export default function Geo() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GeoContent />
    </Suspense>
  )
}


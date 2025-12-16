"use client";

import { Suspense, useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";

interface ZoneInfo {
  id: number;
  name: string;
  longitude: number;
  latitude: number;
}

interface Surcharges {
  mta_surcharge: number;
  improvement_surcharge: number;
  night_surcharge: number;
  rush_hour_surcharge: number;
  congestion_surcharge: number;
  total_surcharges: number;
  note: string | null;
}

interface PredictionResult {
  fare_estimate: number;
  fare_low: number;
  fare_high: number;
  distance_miles: number;
  pickup_zone: string;
  dropoff_zone: string;
  is_airport_trip: boolean;
  is_flat_fare: boolean;
  surcharges: Surcharges;
}

interface ModelInfo {
  training_date: string;
  metrics: {
    rmse: number;
    mae: number;
    r2: number;
  };
  feature_count: number;
  training_samples: number;
}

function PredictContent() {
  // Form state
  const [pickupBorough, setPickupBorough] = useState<string>("Manhattan");
  const [pickupZoneId, setPickupZoneId] = useState<number | null>(null);
  const [dropoffBorough, setDropoffBorough] = useState<string>("Queens");
  const [dropoffZoneId, setDropoffZoneId] = useState<number | null>(null);
  const [pickupDate, setPickupDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [pickupTime, setPickupTime] = useState<string>("17:00");
  const [passengers, setPassengers] = useState<number>(1);

  // Fetch zones
  const { data: zones, isLoading: zonesLoading } = useQuery({
    queryKey: ["prediction-zones"],
    queryFn: async () => {
      const res = await fetch("http://localhost:8000/api/v1/predict/zones");
      if (!res.ok) throw new Error("Failed to fetch zones");
      return res.json() as Promise<Record<string, ZoneInfo[]>>;
    },
  });

  // Fetch model info
  const { data: modelInfo } = useQuery({
    queryKey: ["model-info"],
    queryFn: async () => {
      const res = await fetch("http://localhost:8000/api/v1/predict/model-info");
      if (!res.ok) throw new Error("Failed to fetch model info");
      return res.json() as Promise<ModelInfo>;
    },
  });

  // Prediction mutation
  const predictMutation = useMutation({
    mutationFn: async (data: {
      pickup_zone_id: number;
      dropoff_zone_id: number;
      pickup_datetime: string;
      passenger_count: number;
    }) => {
      const res = await fetch("http://localhost:8000/api/v1/predict/fare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Prediction failed");
      }
      return res.json() as Promise<PredictionResult>;
    },
  });

  // Get zones for selected boroughs
  const pickupZones = useMemo(() => zones?.[pickupBorough] || [], [zones, pickupBorough]);
  const dropoffZones = useMemo(() => zones?.[dropoffBorough] || [], [zones, dropoffBorough]);
  const boroughs = useMemo(() => (zones ? Object.keys(zones).sort() : []), [zones]);

  // Handle prediction
  const handlePredict = () => {
    if (!pickupZoneId || !dropoffZoneId) {
      alert("Please select both pickup and dropoff locations");
      return;
    }

    const datetime = `${pickupDate}T${pickupTime}:00`;
    predictMutation.mutate({
      pickup_zone_id: pickupZoneId,
      dropoff_zone_id: dropoffZoneId,
      pickup_datetime: datetime,
      passenger_count: passengers,
    });
  };

  // Get selected zone info for display
  const selectedPickupZone = pickupZones.find((z) => z.id === pickupZoneId);
  const selectedDropoffZone = dropoffZones.find((z) => z.id === dropoffZoneId);

  const prediction = predictMutation.data;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Fare Predictor</h1>
        <p style={styles.subtitle}>
          Get an instant fare estimate for your NYC taxi trip
        </p>
      </div>

      <div style={styles.content}>
        {/* Left Panel - Input Form */}
        <div style={styles.inputPanel}>
          {/* Pickup Location */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Pickup Location</h3>
            <label style={styles.label}>Borough</label>
            <select
              value={pickupBorough}
              onChange={(e) => {
                setPickupBorough(e.target.value);
                setPickupZoneId(null);
              }}
              style={styles.select}
              disabled={zonesLoading}
            >
              {boroughs.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <label style={styles.label}>Zone</label>
            <select
              value={pickupZoneId || ""}
              onChange={(e) => setPickupZoneId(Number(e.target.value))}
              style={styles.select}
              disabled={zonesLoading}
            >
              <option value="">Select zone...</option>
              {pickupZones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dropoff Location */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Dropoff Location</h3>
            <label style={styles.label}>Borough</label>
            <select
              value={dropoffBorough}
              onChange={(e) => {
                setDropoffBorough(e.target.value);
                setDropoffZoneId(null);
              }}
              style={styles.select}
              disabled={zonesLoading}
            >
              {boroughs.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <label style={styles.label}>Zone</label>
            <select
              value={dropoffZoneId || ""}
              onChange={(e) => setDropoffZoneId(Number(e.target.value))}
              style={styles.select}
              disabled={zonesLoading}
            >
              <option value="">Select zone...</option>
              {dropoffZones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date/Time Selection */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>When</h3>
            <label style={styles.label}>Date</label>
            <input
              type="date"
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
              style={styles.input}
            />
            <label style={styles.label}>Time</label>
            <input
              type="time"
              value={pickupTime}
              onChange={(e) => setPickupTime(e.target.value)}
              style={styles.input}
            />
          </div>

          {/* Passengers */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Passengers</h3>
            <select
              value={passengers}
              onChange={(e) => setPassengers(Number(e.target.value))}
              style={styles.select}
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "passenger" : "passengers"}
                </option>
              ))}
            </select>
          </div>

          {/* Predict Button */}
          <button
            onClick={handlePredict}
            disabled={predictMutation.isPending || !pickupZoneId || !dropoffZoneId}
            style={{
              ...styles.predictButton,
              ...(predictMutation.isPending || !pickupZoneId || !dropoffZoneId
                ? styles.predictButtonDisabled
                : {}),
            }}
          >
            {predictMutation.isPending ? "Calculating..." : "Predict Fare"}
          </button>

          {predictMutation.isError && (
            <div style={styles.errorMessage}>
              {predictMutation.error?.message || "Prediction failed"}
            </div>
          )}
        </div>

        {/* Right Panel - Results */}
        <div style={styles.resultPanel}>
          {prediction ? (
            <>
              {/* Main Estimate Card */}
              <div style={styles.estimateCard}>
                <div style={styles.estimateLabel}>Estimated Fare</div>
                <div style={styles.estimateValue}>
                  ${prediction.fare_estimate.toFixed(2)}
                </div>
                <div style={styles.estimateRange}>
                  ${prediction.fare_low.toFixed(2)} - ${prediction.fare_high.toFixed(2)}
                </div>
                {prediction.is_flat_fare && (
                  <div style={styles.flatFareBadge}>Flat Rate</div>
                )}
              </div>

              {/* Trip Details */}
              <div style={styles.detailsCard}>
                <h4 style={styles.cardTitle}>Trip Details</h4>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>From:</span>
                  <span style={styles.detailValue}>{prediction.pickup_zone}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>To:</span>
                  <span style={styles.detailValue}>{prediction.dropoff_zone}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Distance:</span>
                  <span style={styles.detailValue}>~{prediction.distance_miles.toFixed(1)} miles</span>
                </div>
                {prediction.is_airport_trip && (
                  <div style={styles.airportBadge}>Airport Trip</div>
                )}
              </div>

              {/* Surcharges Breakdown */}
              <div style={styles.surchargesCard}>
                <h4 style={styles.cardTitle}>Surcharges</h4>
                {prediction.surcharges.night_surcharge > 0 && (
                  <div style={styles.surchargeRow}>
                    <span>Night (8pm-6am)</span>
                    <span>+${prediction.surcharges.night_surcharge.toFixed(2)}</span>
                  </div>
                )}
                {prediction.surcharges.rush_hour_surcharge > 0 && (
                  <div style={styles.surchargeRow}>
                    <span>Rush Hour (4-8pm weekday)</span>
                    <span>+${prediction.surcharges.rush_hour_surcharge.toFixed(2)}</span>
                  </div>
                )}
                {prediction.surcharges.congestion_surcharge > 0 && (
                  <div style={styles.surchargeRow}>
                    <span>Congestion (Manhattan)</span>
                    <span>+${prediction.surcharges.congestion_surcharge.toFixed(2)}</span>
                  </div>
                )}
                <div style={styles.surchargeRow}>
                  <span>MTA + Improvement</span>
                  <span>+$1.50</span>
                </div>
                <div style={{ ...styles.surchargeRow, ...styles.totalRow }}>
                  <span>Total Surcharges</span>
                  <span>${prediction.surcharges.total_surcharges.toFixed(2)}</span>
                </div>
                {prediction.surcharges.note && (
                  <div style={styles.noteBox}>{prediction.surcharges.note}</div>
                )}
              </div>

              <div style={styles.disclaimer}>
                * Estimate excludes tips and tolls. Actual fare may vary based on traffic and route taken.
              </div>
            </>
          ) : (
            <div style={styles.placeholder}>
              <div style={styles.placeholderIcon}>$</div>
              <div style={styles.placeholderText}>
                Select pickup and dropoff locations, then click &quot;Predict Fare&quot; to get an estimate
              </div>
            </div>
          )}

          {/* Model Info */}
          {modelInfo && (
            <div style={styles.modelInfoCard}>
              <h4 style={styles.modelInfoTitle}>Model Performance</h4>
              <div style={styles.modelMetrics}>
                <div style={styles.metric}>
                  <span style={styles.metricValue}>${modelInfo.metrics.mae.toFixed(2)}</span>
                  <span style={styles.metricLabel}>Avg Error</span>
                </div>
                <div style={styles.metric}>
                  <span style={styles.metricValue}>{(modelInfo.metrics.r2 * 100).toFixed(1)}%</span>
                  <span style={styles.metricLabel}>Accuracy</span>
                </div>
                <div style={styles.metric}>
                  <span style={styles.metricValue}>{(modelInfo.training_samples / 1000000).toFixed(1)}M</span>
                  <span style={styles.metricLabel}>Training Trips</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Presets */}
      <div style={styles.presetsSection}>
        <h3 style={styles.presetsTitle}>Quick Presets</h3>
        <div style={styles.presetButtons}>
          <button
            style={styles.presetButton}
            onClick={() => {
              setPickupBorough("Manhattan");
              setDropoffBorough("Queens");
              setTimeout(() => {
                setPickupZoneId(161); // Midtown Center
                setDropoffZoneId(132); // JFK
              }, 100);
            }}
          >
            Midtown to JFK
          </button>
          <button
            style={styles.presetButton}
            onClick={() => {
              setPickupBorough("Manhattan");
              setDropoffBorough("Queens");
              setTimeout(() => {
                setPickupZoneId(230); // Times Square
                setDropoffZoneId(138); // LaGuardia
              }, 100);
            }}
          >
            Times Square to LaGuardia
          </button>
          <button
            style={styles.presetButton}
            onClick={() => {
              setPickupBorough("Manhattan");
              setDropoffBorough("Brooklyn");
              setTimeout(() => {
                setPickupZoneId(79); // East Village
                setDropoffZoneId(37); // Bushwick
              }, 100);
            }}
          >
            East Village to Bushwick
          </button>
          <button
            style={styles.presetButton}
            onClick={() => {
              setPickupBorough("Manhattan");
              setDropoffBorough("Manhattan");
              setTimeout(() => {
                setPickupZoneId(186); // Penn Station
                setDropoffZoneId(236); // Upper East Side North
              }, 100);
            }}
          >
            Penn Station to Upper East Side
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PredictPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PredictContent />
    </Suspense>
  );
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: "1100px",
  },
  header: {
    marginBottom: "24px",
  },
  title: {
    fontSize: "28px",
    fontWeight: "bold",
    marginBottom: "8px",
    color: "#1a1a1a",
  },
  subtitle: {
    fontSize: "16px",
    color: "#666",
  },
  content: {
    display: "flex",
    gap: "32px",
    marginBottom: "32px",
  },
  inputPanel: {
    flex: "0 0 320px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  resultPanel: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  section: {
    padding: "16px",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
    border: "1px solid #e9ecef",
  },
  sectionTitle: {
    fontSize: "14px",
    fontWeight: "600",
    marginBottom: "12px",
    color: "#333",
    margin: "0 0 12px 0",
  },
  label: {
    display: "block",
    fontSize: "12px",
    color: "#666",
    marginBottom: "4px",
    marginTop: "10px",
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "6px",
    border: "1px solid #ddd",
    fontSize: "14px",
    backgroundColor: "#fff",
    cursor: "pointer",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "6px",
    border: "1px solid #ddd",
    fontSize: "14px",
    boxSizing: "border-box",
  },
  predictButton: {
    padding: "16px 24px",
    backgroundColor: "#1976d2",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "8px",
    transition: "background-color 0.2s",
  },
  predictButtonDisabled: {
    backgroundColor: "#ccc",
    cursor: "not-allowed",
  },
  errorMessage: {
    padding: "12px",
    backgroundColor: "#ffebee",
    color: "#c62828",
    borderRadius: "6px",
    fontSize: "14px",
  },
  estimateCard: {
    padding: "32px",
    backgroundColor: "#1976d2",
    borderRadius: "12px",
    color: "white",
    textAlign: "center",
  },
  estimateLabel: {
    fontSize: "14px",
    opacity: 0.9,
    marginBottom: "8px",
  },
  estimateValue: {
    fontSize: "48px",
    fontWeight: "bold",
  },
  estimateRange: {
    fontSize: "16px",
    opacity: 0.8,
    marginTop: "8px",
  },
  flatFareBadge: {
    marginTop: "12px",
    padding: "6px 12px",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
    display: "inline-block",
  },
  detailsCard: {
    padding: "20px",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
    border: "1px solid #e9ecef",
  },
  cardTitle: {
    fontSize: "14px",
    fontWeight: "600",
    marginBottom: "12px",
    margin: "0 0 12px 0",
    color: "#333",
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
    borderBottom: "1px solid #e9ecef",
  },
  detailLabel: {
    color: "#666",
  },
  detailValue: {
    fontWeight: "500",
    color: "#333",
  },
  airportBadge: {
    marginTop: "12px",
    padding: "8px 12px",
    backgroundColor: "#fff3e0",
    borderRadius: "6px",
    textAlign: "center",
    color: "#e65100",
    fontWeight: "500",
    fontSize: "14px",
  },
  surchargesCard: {
    padding: "20px",
    backgroundColor: "#fff",
    borderRadius: "8px",
    border: "1px solid #e9ecef",
  },
  surchargeRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "6px 0",
    fontSize: "14px",
    color: "#666",
  },
  totalRow: {
    borderTop: "1px solid #e9ecef",
    marginTop: "8px",
    paddingTop: "12px",
    fontWeight: "600",
    color: "#333",
  },
  noteBox: {
    marginTop: "12px",
    padding: "10px",
    backgroundColor: "#e3f2fd",
    borderRadius: "6px",
    fontSize: "13px",
    color: "#1565c0",
  },
  disclaimer: {
    fontSize: "12px",
    color: "#888",
    fontStyle: "italic",
  },
  placeholder: {
    padding: "60px 40px",
    textAlign: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: "12px",
    border: "2px dashed #ddd",
  },
  placeholderIcon: {
    fontSize: "48px",
    color: "#ccc",
    marginBottom: "16px",
  },
  placeholderText: {
    color: "#888",
    fontSize: "15px",
    lineHeight: "1.5",
  },
  modelInfoCard: {
    padding: "16px 20px",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
    border: "1px solid #e9ecef",
  },
  modelInfoTitle: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#666",
    marginBottom: "12px",
    margin: "0 0 12px 0",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  modelMetrics: {
    display: "flex",
    justifyContent: "space-around",
  },
  metric: {
    textAlign: "center",
  },
  metricValue: {
    display: "block",
    fontSize: "20px",
    fontWeight: "bold",
    color: "#1976d2",
  },
  metricLabel: {
    fontSize: "11px",
    color: "#888",
    textTransform: "uppercase",
  },
  presetsSection: {
    padding: "20px",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
    border: "1px solid #e9ecef",
  },
  presetsTitle: {
    fontSize: "14px",
    fontWeight: "600",
    marginBottom: "12px",
    margin: "0 0 12px 0",
    color: "#333",
  },
  presetButtons: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  presetButton: {
    padding: "8px 16px",
    backgroundColor: "#fff",
    border: "1px solid #ddd",
    borderRadius: "20px",
    fontSize: "13px",
    cursor: "pointer",
    transition: "all 0.2s",
    color: "#555",
  },
};

"use client";

import { Suspense, useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiUrl } from "../../lib/config";

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
  const [pickupBorough, setPickupBorough] = useState<string>("Manhattan");
  const [pickupZoneId, setPickupZoneId] = useState<number | null>(null);
  const [dropoffBorough, setDropoffBorough] = useState<string>("Queens");
  const [dropoffZoneId, setDropoffZoneId] = useState<number | null>(null);
  const [pickupDate, setPickupDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [pickupTime, setPickupTime] = useState<string>("17:00");
  const [passengers, setPassengers] = useState<number>(1);

  const { data: zones, isLoading: zonesLoading } = useQuery({
    queryKey: ["prediction-zones"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/v1/predict/zones"));
      if (!res.ok) throw new Error("Failed to fetch zones");
      return res.json() as Promise<Record<string, ZoneInfo[]>>;
    },
  });

  const { data: modelInfo } = useQuery({
    queryKey: ["model-info"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/v1/predict/model-info"));
      if (!res.ok) throw new Error("Failed to fetch model info");
      return res.json() as Promise<ModelInfo>;
    },
  });

  const predictMutation = useMutation({
    mutationFn: async (data: {
      pickup_zone_id: number;
      dropoff_zone_id: number;
      pickup_datetime: string;
      passenger_count: number;
    }) => {
      const res = await fetch(apiUrl("/api/v1/predict/fare"), {
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

  const pickupZones = useMemo(() => zones?.[pickupBorough] || [], [zones, pickupBorough]);
  const dropoffZones = useMemo(() => zones?.[dropoffBorough] || [], [zones, dropoffBorough]);
  const boroughs = useMemo(() => (zones ? Object.keys(zones).sort() : []), [zones]);

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

  const prediction = predictMutation.data;

  return (
    <div className="animate-fade-in">
      <header style={styles.header}>
        <h1 style={styles.title}>Fare Predictor</h1>
        <p style={styles.subtitle}>Get an instant fare estimate for your NYC taxi trip</p>
      </header>

      <div style={styles.content}>
        {/* Left Panel - Input Form */}
        <div style={styles.inputPanel}>
          {/* Pickup Location */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={styles.cardIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="10" r="3"/>
                  <path d="M12 2a8 8 0 0 0-8 8c0 5.4 7 12 7.4 12.3a1 1 0 0 0 1.2 0C13 22 20 15.4 20 10a8 8 0 0 0-8-8z"/>
                </svg>
              </div>
              <h3 style={styles.cardTitle}>Pickup Location</h3>
            </div>
            <div style={styles.fieldGroup}>
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
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Zone</label>
              <select
                value={pickupZoneId || ""}
                onChange={(e) => setPickupZoneId(Number(e.target.value))}
                style={styles.select}
                disabled={zonesLoading}
              >
                <option value="">Select zone...</option>
                {pickupZones.map((z) => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dropoff Location */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={{ ...styles.cardIcon, backgroundColor: "rgba(248, 113, 113, 0.1)", color: "#F87171" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <h3 style={styles.cardTitle}>Dropoff Location</h3>
            </div>
            <div style={styles.fieldGroup}>
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
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Zone</label>
              <select
                value={dropoffZoneId || ""}
                onChange={(e) => setDropoffZoneId(Number(e.target.value))}
                style={styles.select}
                disabled={zonesLoading}
              >
                <option value="">Select zone...</option>
                {dropoffZones.map((z) => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date/Time & Passengers */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={{ ...styles.cardIcon, backgroundColor: "rgba(96, 165, 250, 0.1)", color: "#60A5FA" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <h3 style={styles.cardTitle}>Trip Details</h3>
            </div>
            <div style={styles.rowFields}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Date</label>
                <input
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  style={styles.input}
                />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Time</label>
                <input
                  type="time"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  style={styles.input}
                />
              </div>
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Passengers</label>
              <select
                value={passengers}
                onChange={(e) => setPassengers(Number(e.target.value))}
                style={styles.select}
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>{n} {n === 1 ? "passenger" : "passengers"}</option>
                ))}
              </select>
            </div>
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
            {predictMutation.isPending ? (
              <>
                <svg className="animate-pulse" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                </svg>
                Calculating...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
                Predict Fare
              </>
            )}
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
              {/* Main Estimate */}
              <div style={styles.estimateCard}>
                <div style={styles.estimateGlow} />
                <div style={styles.estimateLabel}>Estimated Fare</div>
                <div style={styles.estimateValue}>
                  ${prediction.fare_estimate.toFixed(2)}
                </div>
                <div style={styles.estimateRange}>
                  ${prediction.fare_low.toFixed(2)} - ${prediction.fare_high.toFixed(2)}
                </div>
                {prediction.is_flat_fare && (
                  <span style={styles.flatFareBadge}>Flat Rate</span>
                )}
              </div>

              {/* Trip Details */}
              <div style={styles.detailsCard}>
                <h4 style={styles.detailsTitle}>Trip Details</h4>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>From</span>
                  <span style={styles.detailValue}>{prediction.pickup_zone}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>To</span>
                  <span style={styles.detailValue}>{prediction.dropoff_zone}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Distance</span>
                  <span style={styles.detailValue}>~{prediction.distance_miles.toFixed(1)} miles</span>
                </div>
                {prediction.is_airport_trip && (
                  <div style={styles.airportBadge}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-1 .1-1.2.5l-.4.7c-.2.5 0 1 .4 1.2l5.6 2.8L7 14 4.5 14c-.5 0-.9.3-1.1.7l-.2.6c-.1.4.1.8.5.9l3.5 1.3 1.3 3.5c.1.4.5.6.9.5l.6-.2c.4-.2.7-.6.7-1.1L11 17l2.6-2.2 2.8 5.6c.2.4.8.6 1.2.4l.7-.4c.4-.2.6-.7.5-1.2z"/>
                    </svg>
                    Airport Trip
                  </div>
                )}
              </div>

              {/* Surcharges */}
              <div style={styles.surchargesCard}>
                <h4 style={styles.detailsTitle}>Surcharges Breakdown</h4>
                {prediction.surcharges.night_surcharge > 0 && (
                  <div style={styles.surchargeRow}>
                    <span>Night (8pm-6am)</span>
                    <span style={styles.surchargeValue}>+${prediction.surcharges.night_surcharge.toFixed(2)}</span>
                  </div>
                )}
                {prediction.surcharges.rush_hour_surcharge > 0 && (
                  <div style={styles.surchargeRow}>
                    <span>Rush Hour (4-8pm weekday)</span>
                    <span style={styles.surchargeValue}>+${prediction.surcharges.rush_hour_surcharge.toFixed(2)}</span>
                  </div>
                )}
                {prediction.surcharges.congestion_surcharge > 0 && (
                  <div style={styles.surchargeRow}>
                    <span>Congestion (Manhattan)</span>
                    <span style={styles.surchargeValue}>+${prediction.surcharges.congestion_surcharge.toFixed(2)}</span>
                  </div>
                )}
                <div style={styles.surchargeRow}>
                  <span>MTA + Improvement</span>
                  <span style={styles.surchargeValue}>+$1.50</span>
                </div>
                <div style={{ ...styles.surchargeRow, ...styles.totalRow }}>
                  <span>Total Surcharges</span>
                  <span style={{ ...styles.surchargeValue, color: "#F7C52D" }}>
                    ${prediction.surcharges.total_surcharges.toFixed(2)}
                  </span>
                </div>
              </div>

              <p style={styles.disclaimer}>
                * Estimate excludes tips and tolls. Actual fare may vary.
              </p>
            </>
          ) : (
            <div style={styles.placeholder}>
              <div style={styles.placeholderIcon}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="12" y1="1" x2="12" y2="23"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <p style={styles.placeholderText}>
                Select pickup and dropoff locations, then click &quot;Predict Fare&quot; to get an estimate
              </p>
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
          {[
            { label: "Midtown → JFK", pickup: { b: "Manhattan", z: 161 }, dropoff: { b: "Queens", z: 132 } },
            { label: "Times Square → LaGuardia", pickup: { b: "Manhattan", z: 230 }, dropoff: { b: "Queens", z: 138 } },
            { label: "East Village → Bushwick", pickup: { b: "Manhattan", z: 79 }, dropoff: { b: "Brooklyn", z: 37 } },
            { label: "Penn Station → UES", pickup: { b: "Manhattan", z: 186 }, dropoff: { b: "Manhattan", z: 236 } },
          ].map((preset) => (
            <button
              key={preset.label}
              style={styles.presetButton}
              onClick={() => {
                setPickupBorough(preset.pickup.b);
                setDropoffBorough(preset.dropoff.b);
                setTimeout(() => {
                  setPickupZoneId(preset.pickup.z);
                  setDropoffZoneId(preset.dropoff.z);
                }, 100);
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PredictPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <PredictContent />
    </Suspense>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-fade-in">
      <div className="skeleton" style={{ width: 200, height: 36, marginBottom: 8, borderRadius: 8 }} />
      <div className="skeleton" style={{ width: 350, height: 20, marginBottom: 32, borderRadius: 6 }} />
      <div style={{ display: "flex", gap: 32 }}>
        <div style={{ flex: "0 0 360px" }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 200, marginBottom: 16, borderRadius: 16 }} />
          ))}
        </div>
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ height: 200, marginBottom: 16, borderRadius: 16 }} />
          <div className="skeleton" style={{ height: 150, borderRadius: 16 }} />
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  header: {
    marginBottom: 32,
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
  content: {
    display: "flex",
    gap: 32,
    marginBottom: 32,
  },
  inputPanel: {
    flex: "0 0 360px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  resultPanel: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  card: {
    backgroundColor: "var(--color-bg-secondary)",
    border: "1px solid var(--color-border)",
    borderRadius: 16,
    padding: 20,
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(247, 197, 45, 0.1)",
    color: "#F7C52D",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: "var(--color-text-primary)",
    margin: 0,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  rowFields: {
    display: "flex",
    gap: 12,
    marginBottom: 12,
  },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 500,
    color: "var(--color-text-muted)",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  select: {
    width: "100%",
    padding: "12px 14px",
    fontSize: 14,
    backgroundColor: "var(--color-bg-tertiary)",
    border: "1px solid var(--color-border)",
    borderRadius: 10,
    color: "var(--color-text-primary)",
    cursor: "pointer",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    fontSize: 14,
    backgroundColor: "var(--color-bg-tertiary)",
    border: "1px solid var(--color-border)",
    borderRadius: 10,
    color: "var(--color-text-primary)",
  },
  predictButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: "16px 24px",
    backgroundColor: "#F7C52D",
    color: "#0a0a0b",
    border: "none",
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 200ms ease",
  },
  predictButtonDisabled: {
    backgroundColor: "var(--color-bg-tertiary)",
    color: "var(--color-text-muted)",
    cursor: "not-allowed",
  },
  errorMessage: {
    padding: "14px 16px",
    backgroundColor: "var(--color-error-bg)",
    border: "1px solid rgba(248, 113, 113, 0.3)",
    borderRadius: 10,
    color: "var(--color-error)",
    fontSize: 14,
  },
  estimateCard: {
    position: "relative",
    padding: 32,
    backgroundColor: "var(--color-bg-secondary)",
    border: "1px solid rgba(247, 197, 45, 0.3)",
    borderRadius: 20,
    textAlign: "center",
    overflow: "hidden",
  },
  estimateGlow: {
    position: "absolute",
    top: 0,
    left: "50%",
    transform: "translateX(-50%)",
    width: 200,
    height: 100,
    background: "radial-gradient(ellipse, rgba(247, 197, 45, 0.2) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  estimateLabel: {
    fontSize: 13,
    fontWeight: 500,
    color: "var(--color-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "1px",
    marginBottom: 8,
  },
  estimateValue: {
    fontFamily: "var(--font-mono)",
    fontSize: 56,
    fontWeight: 700,
    color: "#F7C52D",
    letterSpacing: "-2px",
  },
  estimateRange: {
    fontSize: 16,
    color: "var(--color-text-secondary)",
    marginTop: 8,
  },
  flatFareBadge: {
    display: "inline-block",
    marginTop: 16,
    padding: "6px 14px",
    backgroundColor: "rgba(247, 197, 45, 0.15)",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    color: "#F7C52D",
  },
  detailsCard: {
    padding: 20,
    backgroundColor: "var(--color-bg-secondary)",
    border: "1px solid var(--color-border)",
    borderRadius: 14,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "var(--color-text-primary)",
    margin: "0 0 16px 0",
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 0",
    borderBottom: "1px solid var(--color-border)",
  },
  detailLabel: {
    fontSize: 14,
    color: "var(--color-text-muted)",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 500,
    color: "var(--color-text-primary)",
  },
  airportBadge: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    padding: "10px",
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    borderRadius: 10,
    color: "#FBBF24",
    fontWeight: 500,
    fontSize: 14,
  },
  surchargesCard: {
    padding: 20,
    backgroundColor: "var(--color-bg-secondary)",
    border: "1px solid var(--color-border)",
    borderRadius: 14,
  },
  surchargeRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
    fontSize: 14,
    color: "var(--color-text-secondary)",
  },
  surchargeValue: {
    fontFamily: "var(--font-mono)",
    fontWeight: 500,
  },
  totalRow: {
    borderTop: "1px solid var(--color-border)",
    marginTop: 8,
    paddingTop: 12,
    fontWeight: 600,
    color: "var(--color-text-primary)",
  },
  disclaimer: {
    fontSize: 12,
    color: "var(--color-text-muted)",
    fontStyle: "italic",
    textAlign: "center",
  },
  placeholder: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 40px",
    backgroundColor: "var(--color-bg-secondary)",
    border: "2px dashed var(--color-border)",
    borderRadius: 20,
    textAlign: "center",
  },
  placeholderIcon: {
    color: "var(--color-text-muted)",
    marginBottom: 16,
    opacity: 0.5,
  },
  placeholderText: {
    fontSize: 15,
    color: "var(--color-text-muted)",
    lineHeight: 1.6,
    maxWidth: 280,
  },
  modelInfoCard: {
    padding: 20,
    backgroundColor: "var(--color-bg-secondary)",
    border: "1px solid var(--color-border)",
    borderRadius: 14,
  },
  modelInfoTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--color-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    margin: "0 0 16px 0",
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
    fontFamily: "var(--font-mono)",
    fontSize: 22,
    fontWeight: 600,
    color: "#F7C52D",
  },
  metricLabel: {
    fontSize: 11,
    color: "var(--color-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  presetsSection: {
    padding: 20,
    backgroundColor: "var(--color-bg-secondary)",
    border: "1px solid var(--color-border)",
    borderRadius: 14,
  },
  presetsTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "var(--color-text-primary)",
    margin: "0 0 16px 0",
  },
  presetButtons: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },
  presetButton: {
    padding: "10px 18px",
    backgroundColor: "var(--color-bg-tertiary)",
    border: "1px solid var(--color-border)",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 500,
    color: "var(--color-text-secondary)",
    cursor: "pointer",
    transition: "all 150ms ease",
  },
};

import { useState, useEffect, useCallback } from "react";
import {
  Wind,
  Leaf,
  Thermometer,
  Droplets,
  Cloud,
  MapPin,
  Activity,
  RefreshCw,
  AlertTriangle,
  Lightbulb,
  Building2,
  Clock,
  Info,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  CITIES,
  DEFAULT_CITY_ID,
  getCityById,
} from "./config/cities";
import {
  fetchAirQualityData,
  formatValue,
  getAqiCategory,
  POLLUTANT_CONFIG,
  CHART_LABELS,
  HOURLY_VARIABLES,
} from "./services/airQualityService";
import CitySelector from "./components/CitySelector";
import "./App.css";

function App() {
  const [selectedCity, setSelectedCity] = useState(() => getCityById(DEFAULT_CITY_ID));
  const [airData, setAirData] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [activeTab, setActiveTab] = useState("us_aqi");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);

  // Manual refresh handler with spin animation
  const handleRefresh = useCallback(() => {
    setIsSpinning(true);
    setRefreshIndex((prev) => prev + 1);
    setTimeout(() => {
      setIsSpinning(false);
    }, 850);
  }, []);

  // Fetch data effect with AbortController to prevent race conditions
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");

    async function loadData() {
      try {
        const result = await fetchAirQualityData({
          latitude: selectedCity.latitude,
          longitude: selectedCity.longitude,
          timezone: "Asia/Kolkata",
          signal: controller.signal,
        });

        setAirData(result.air);
        setWeatherData(result.weather);
        setLastUpdated(result.timestampText);
        setError("");
      } catch (err) {
        if (err.name === "AbortError") {
          // Request aborted due to quick location switch or component re-render
          return;
        }
        setError(err.message || "Unable to fetch data from Open-Meteo API.");
      } finally {
        setLoading(false);
      }
    }

    loadData();

    // Auto-refresh interval (every 15 minutes)
    const interval = setInterval(loadData, 15 * 60 * 1000);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [selectedCity, refreshIndex]);

  // Derived metrics
  const current = airData?.current || {};
  const currentUnits = airData?.current_units || {};
  const hourly = airData?.hourly || {};
  const currentWeather = weatherData?.current || {};

  // AQI calculation based on official US AQI standard from Open-Meteo
  const aqi = current.us_aqi ?? current.european_aqi ?? null;
  const aqiMeta = getAqiCategory(aqi);

  // Hourly chart data (next 24 hours in IST)
  const chartData = (hourly.time || [])
    .map((timeStr, i) => {
      // timeStr is formatted as "YYYY-MM-DDTHH:MM" in Asia/Kolkata
      const hourPart = timeStr.slice(11, 16);
      const datePart = timeStr.slice(0, 10);
      const val = hourly[activeTab]?.[i];
      return {
        time: hourPart,
        date: datePart,
        value: val != null && Number.isFinite(Number(val)) ? Number(val) : null,
      };
    })
    .filter((item) => item.value != null)
    .slice(0, 24);

  const activeChartMeta = CHART_LABELS[activeTab] || {
    label: activeTab,
    unit: "",
    color: "#398b70",
  };

  return (
    <div className="dashboard">
      {/* Top Navbar */}
      <header className="topbar">
        <div className="topbar-container">
          <a className="brand" href="#home" title="AirSense Dashboard">
            <span className="brand-icon">
              <Wind size={22} />
            </span>
            <span className="brand-text">
              <strong>AirSense</strong>
              <small>Air Quality Intelligence</small>
            </span>
          </a>

          <div className="topbar-right">
            <div className="status-indicator">
              <span className={`live-dot ${error ? "offline-dot" : loading ? "loading-dot" : ""}`} />
              <span className="status-text">
                {loading
                  ? "Fetching Open-Meteo data..."
                  : error
                  ? "Connection Alert"
                  : "Live Open-Meteo API"}
              </span>
            </div>

            <div className="current-location-pill">
              <MapPin size={14} className="location-pin-icon" />
              <span>{selectedCity.name}</span>
              <small className="state-badge">{selectedCity.state}</small>
            </div>

            <button
              type="button"
              className="refresh-btn"
              onClick={handleRefresh}
              title="Refresh data from Open-Meteo"
              disabled={loading || isSpinning}
              aria-label="Refresh data"
            >
              <RefreshCw
                size={14}
                className={`refresh-icon ${isSpinning || loading ? "is-spinning" : ""}`}
              />
              <span className="refresh-btn-text">
                {isSpinning || loading ? "Refreshing..." : "Refresh"}
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main" id="home">
        {/* Welcome & City Selection Hero Section */}
        <section className="welcome-section">
          <div className="welcome-intro">
            <p className="eyebrow">REAL-TIME AIR QUALITY INTELLIGENCE</p>
            <h1>
              Breathe better.<br />
              <span>Live healthier.</span>
            </h1>
            <p className="welcome-text">
              Real-time atmospheric estimates and pollutant forecast trends across Indian cities and areas.
            </p>
            <div className="data-meta-badges">
              <span className="meta-badge">
                <Clock size={12} /> {lastUpdated ? `Updated: ${lastUpdated} IST` : "Updating..."}
              </span>
              <span className="meta-badge source-badge">
                <Info size={12} /> Source: Open-Meteo (CAMS & GFS/SILAM)
              </span>
            </div>
          </div>

          <div className="welcome-selector-box">
            <CitySelector
              selectedCity={selectedCity}
              onSelectCity={(city) => {
                if (city.id !== selectedCity.id) {
                  setSelectedCity(city);
                }
              }}
              disabled={loading}
            />
          </div>
        </section>

        {/* Error Notification Banner with Retry Option */}
        {error && (
          <div className="notice notice-red" role="alert">
            <AlertTriangle size={20} className="notice-icon" />
            <div className="notice-content">
              <strong>Unable to retrieve data for {selectedCity.name}</strong>
              <span>{error}</span>
            </div>
            <button
              type="button"
              className="retry-button"
              onClick={handleRefresh}
              disabled={loading || isSpinning}
            >
              <RefreshCw
                size={13}
                className={`refresh-icon ${isSpinning || loading ? "is-spinning" : ""}`}
              />{" "}
              {isSpinning || loading ? "Retrying..." : "Retry"}
            </button>
          </div>
        )}

        {/* 4 Key Metric Overview Cards */}
        <section className="stats-grid">
          {/* Card 1: US AQI */}
          <article className="stat-card">
            <div>
              <p>US Air Quality Index</p>
              <h2>{loading && !airData ? "…" : aqi ?? "—"}</h2>
              <span className="stat-status-text" style={{ color: aqiMeta.color }}>
                {aqiMeta.label}
              </span>
            </div>
            <span
              className="stat-icon"
              style={{ background: aqiMeta.bg, color: aqiMeta.color }}
            >
              <Leaf size={21} />
            </span>
          </article>

          {/* Card 2: Temperature */}
          <article className="stat-card">
            <div>
              <p>Ambient Temperature</p>
              <h2>
                {formatValue(currentWeather.temperature_2m)}
                {currentWeather.temperature_2m != null ? "°C" : ""}
              </h2>
              <span className="blue-text">Open-Meteo Weather</span>
            </div>
            <span className="stat-icon blue">
              <Thermometer size={21} />
            </span>
          </article>

          {/* Card 3: Relative Humidity */}
          <article className="stat-card">
            <div>
              <p>Relative Humidity</p>
              <h2>
                {formatValue(currentWeather.relative_humidity_2m, 0)}
                {currentWeather.relative_humidity_2m != null ? "%" : ""}
              </h2>
              <span className="orange-text">Atmospheric moisture</span>
            </div>
            <span className="stat-icon orange">
              <Droplets size={21} />
            </span>
          </article>

          {/* Card 4: PM2.5 Concentration */}
          <article className="stat-card">
            <div>
              <p>Fine Particulate (PM2.5)</p>
              <h2>
                {formatValue(current.pm2_5)}
                <small className="stat-unit"> {currentUnits.pm2_5 || "µg/m³"}</small>
              </h2>
              <span className="stat-status-text" style={{ color: current.pm2_5 > 60 ? "#e85b61" : "#259f72" }}>
                {current.pm2_5 > 60 ? "Elevated level" : "Standard range"}
              </span>
            </div>
            <span className="stat-icon yellow">
              <Cloud size={21} />
            </span>
          </article>
        </section>

        {/* Primary Grid: AQI Gauge & Hourly Trend Chart */}
        <section className="primary-grid">
          {/* Gauge Card */}
          <article className="card gauge-card">
            <div className="card-heading">
              <div>
                <h3>Air Quality Index</h3>
                <p>US EPA standard model estimate</p>
              </div>
              <Activity size={20} className="heading-icon" />
            </div>

            <div className="gauge-wrap">
              <svg viewBox="0 0 220 150" className="gauge" role="img" aria-label={`AQI Gauge: ${aqi ?? 'N/A'}`}>
                {/* Background arc */}
                <path
                  d="M 35 120 A 75 75 0 0 1 185 120"
                  fill="none"
                  stroke="#edf0f2"
                  strokeWidth="14"
                  strokeLinecap="round"
                />
                {/* Active value arc */}
                {aqi != null && (
                  <path
                    d="M 35 120 A 75 75 0 0 1 185 120"
                    fill="none"
                    stroke={aqiMeta.color}
                    strokeWidth="14"
                    strokeLinecap="round"
                    pathLength="100"
                    strokeDasharray={`${Math.min(Math.max(aqi / 3, 4), 100)} 100`}
                  />
                )}
                <text x="110" y="88" textAnchor="middle" className="gauge-number">
                  {aqi ?? "—"}
                </text>
                <text x="110" y="108" textAnchor="middle" className="gauge-label">
                  US AQI (0–500)
                </text>
              </svg>
            </div>

            <span
              className="category-pill"
              style={{ color: aqiMeta.color, background: aqiMeta.bg }}
            >
              <span style={{ background: aqiMeta.color }} />
              {aqiMeta.label}
            </span>

            <p className="gauge-caption">
              {loading
                ? "Fetching latest estimates…"
                : `${selectedCity.name}, ${selectedCity.state} (${selectedCity.latitude.toFixed(3)}°N, ${selectedCity.longitude.toFixed(3)}°E)`}
            </p>

            {/* Standard AQI Scale Reference */}
            <div className="scale">
              <span>
                <i className="scale-good" />
                Good
                <br />
                <small>0–50</small>
              </span>
              <span>
                <i className="scale-satisfactory" />
                Moderate
                <br />
                <small>51–100</small>
              </span>
              <span>
                <i className="scale-moderate" />
                Sensitive
                <br />
                <small>101–150</small>
              </span>
              <span>
                <i className="scale-poor" />
                Unhealthy+
                <br />
                <small>151+</small>
              </span>
            </div>

            <button
              type="button"
              className="demo-button"
              onClick={handleRefresh}
              disabled={loading || isSpinning}
            >
              <RefreshCw
                size={13}
                className={`refresh-icon ${isSpinning || loading ? "is-spinning" : ""}`}
              />
              {isSpinning || loading ? "Refreshing..." : "Refresh data"}
            </button>
          </article>

          {/* Chart Card */}
          <article className="card chart-card">
            <div className="card-heading chart-heading">
              <div>
                <h3>Hourly Air Quality Trends</h3>
                <p>24-hour model forecast in Indian Standard Time (IST)</p>
              </div>
              <div className="chart-controls">
                <label htmlFor="chart-variable-select" className="sr-only">
                  Select pollutant to plot
                </label>
                <select
                  id="chart-variable-select"
                  className="chart-select"
                  value={activeTab}
                  onChange={(e) => setActiveTab(e.target.value)}
                  aria-label="Choose chart measurement"
                >
                  {HOURLY_VARIABLES.map((key) => {
                    const meta = CHART_LABELS[key];
                    return (
                      <option key={key} value={key}>
                        {meta ? `${meta.label} (${meta.unit})` : key}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="chart-area">
              {chartData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 15, right: 15, left: -10, bottom: 6 }}
                  >
                    <CartesianGrid stroke="#edf0f3" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 11, fill: "#84909b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#84909b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#fff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        fontSize: "12px",
                      }}
                      labelFormatter={(label, items) => {
                        const date = items?.[0]?.payload?.date;
                        return date ? `${date} at ${label} IST` : `${label} IST`;
                      }}
                      formatter={(val) => [
                        `${val} ${activeChartMeta.unit}`,
                        activeChartMeta.label,
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name={activeChartMeta.label}
                      stroke={activeChartMeta.color}
                      strokeWidth={2.8}
                      dot={false}
                      activeDot={{ r: 5, fill: activeChartMeta.color }}
                      connectNulls={true}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-chart">
                  {loading ? "Loading hourly forecast data…" : "Hourly data unavailable for this parameter."}
                </div>
              )}
            </div>
            <p className="demo-note">
              Model-derived forecast data provided by Open-Meteo. Times shown in Indian Standard Time (IST).
            </p>
          </article>
        </section>

        {/* Secondary Grid: Pollutant Levels & Monitored Locations */}
        <section className="secondary-grid">
          {/* Pollutant Concentrations Card */}
          <article className="card pollutant-card">
            <div className="card-heading">
              <div>
                <h3>Pollutant Concentrations</h3>
                <p>Latest available model-derived atmospheric estimates</p>
              </div>
              <Cloud size={19} className="heading-icon" />
            </div>

            <div className="pollutant-list">
              {POLLUTANT_CONFIG.map((p) => {
                const value = current[p.key];
                const unit = currentUnits[p.key] || p.unit;
                const percentage =
                  value != null && Number.isFinite(Number(value))
                    ? Math.min(Math.round((value / p.benchmark) * 100), 100)
                    : 0;

                return (
                  <div className="pollutant-row" key={p.key}>
                    <div className="pollutant-name">
                      <i style={{ background: p.color }} />
                      <div>
                        <strong>{p.name}</strong>
                        <small className="pollutant-fullname">{p.fullName}</small>
                      </div>
                    </div>

                    <div className="bar-track" title={`${percentage}% of standard benchmark`}>
                      <div
                        className="bar-fill"
                        style={{
                          width: `${percentage}%`,
                          background: p.color,
                        }}
                      />
                    </div>

                    <div className="pollutant-val-col">
                      <strong>
                        {formatValue(value)} <small>{unit}</small>
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="demo-note">
              Estimates derived from Open-Meteo numerical atmospheric models. Sensor values from local ground stations may vary.
            </p>
          </article>

          {/* Monitored Locations Selector Card */}
          <article className="card location-card">
            <div className="card-heading">
              <div>
                <h3>Monitored Indian Cities & Areas</h3>
                <p>Select any location to view real-time estimates</p>
              </div>
              <Building2 size={19} className="heading-icon" />
            </div>

            <div className="location-list">
              {CITIES.slice(0, 10).map((c) => {
                const isSelected = selectedCity.id === c.id;
                return (
                  <button
                    type="button"
                    className={`location-row ${isSelected ? "selected-location" : ""}`}
                    key={c.id}
                    onClick={() => setSelectedCity(c)}
                    disabled={loading}
                    title={`View air quality for ${c.name}, ${c.state}`}
                  >
                    <span className="location-icon">
                      <Building2 size={16} />
                    </span>
                    <div className="location-info">
                      <strong>{c.name}</strong>
                      <span>
                        {c.state} · {c.area || c.region}
                      </span>
                    </div>
                    <div className="location-aqi">
                      <strong>{isSelected ? (aqi ?? "—") : "Select"}</strong>
                      <span>{isSelected ? aqiMeta.label : "Switch"}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </article>
        </section>

        {/* Bottom Grid: Alerts & Recommendations */}
        <section className="bottom-grid">
          {/* Air Quality Alerts Card */}
          <article className="card alerts-card">
            <div className="card-heading">
              <div>
                <h3>Air Quality Alerts</h3>
                <p>Health advisories based on latest Open-Meteo estimate</p>
              </div>
              <ShieldAlert size={19} className="heading-icon" />
            </div>

            <div
              className={`notice ${
                aqi == null
                  ? "notice-yellow"
                  : aqi <= 50
                  ? "notice-green"
                  : aqi <= 100
                  ? "notice-yellow"
                  : "notice-red"
              }`}
            >
              {aqi != null && aqi > 100 ? (
                <AlertTriangle size={18} />
              ) : (
                <CheckCircle2 size={18} />
              )}
              <div>
                <strong>
                  {aqi == null
                    ? "Model data initializing"
                    : `${aqiMeta.label} Air Quality in ${selectedCity.name}`}
                </strong>
                <span>{aqiMeta.healthAdvice}</span>
              </div>
            </div>

            <div className="notice notice-blue">
              <Info size={18} />
              <div>
                <strong>Model-Based Open-Meteo Estimates</strong>
                <span>
                  Data combines ECMWF Copernicus Atmosphere Monitoring Service (CAMS) and GFS/SILAM atmospheric models. Local physical monitors may reflect micro-climate variations.
                </span>
              </div>
            </div>
          </article>

          {/* Recommendations Card */}
          <article className="card recommendations-card">
            <div className="card-heading">
              <div>
                <h3>Protective Recommendations</h3>
                <p>Actions to minimize health risk</p>
              </div>
              <Lightbulb size={19} className="heading-icon" />
            </div>

            <div className="notice notice-blue">
              <Lightbulb size={18} />
              <div>
                <strong>Plan outdoor exercise accordingly</strong>
                <span>
                  {aqi != null && aqi > 150
                    ? "Avoid intense outdoor workouts, particularly during morning and evening rush hours."
                    : "Air conditions are suitable for normal outdoor routines. Stay hydrated."}
                </span>
              </div>
            </div>

            <div className="notice notice-green">
              <Leaf size={18} />
              <div>
                <strong>Indoor Air Management</strong>
                <span>
                  {aqi != null && aqi > 100
                    ? "Keep windows closed during high pollution hours and run air filtration if available."
                    : "Keep living spaces well-ventilated during cleaner afternoon periods."}
                </span>
              </div>
            </div>
          </article>
        </section>

        {/* Footer */}
        <footer className="footer">
          <div className="footer-content">
            <div className="footer-brand">
              <Wind size={15} />
              <span>AirSense — Open-Meteo Air Quality Predictor</span>
            </div>
            <div className="footer-meta">
              <span>{lastUpdated ? `Fetched: ${lastUpdated} IST` : "Connecting"}</span>
              <span>·</span>
              <span>Open-Meteo Air Quality API</span>
              <span>·</span>
              <span>Copernicus CAMS & GFS/SILAM Models</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default App;
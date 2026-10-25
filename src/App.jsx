import { useState, useEffect } from "react";
import {
  Wind, Leaf, Thermometer, Droplets, Cloud,
  MapPin, Activity, RefreshCw, AlertTriangle,
  Lightbulb, Building2
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip
} from "recharts";
import "./App.css";

const CITIES = {
  Mumbai: { latitude: 19.076, longitude: 72.8777 },
  Delhi: { latitude: 28.6139, longitude: 77.209 },
  Pune: { latitude: 18.5204, longitude: 73.8567 },
  Bengaluru: { latitude: 12.9716, longitude: 77.5946 },
  Chennai: { latitude: 13.0827, longitude: 80.2707 },
  Hyderabad: { latitude: 17.385, longitude: 78.4867 },
  Kolkata: { latitude: 22.5726, longitude: 88.3639 },
};

const VARIABLES = [
  "us_aqi",
  "european_aqi",
  "pm2_5",
  "pm10",
  "carbon_monoxide",
  "nitrogen_dioxide",
  "sulphur_dioxide",
  "ozone",
  "carbon_dioxide",
];

function categoryFor(aqi) {
  if (aqi == null) return "Unavailable";
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive Groups";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}

function formatValue(value, digits = 1) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return Number(value).toFixed(digits);
}

function App() {
  const [city, setCity] = useState("Mumbai");
  const [data, setData] = useState(null);
  const [weather, setWeather] = useState(null);
  const [activeTab, setActiveTab] = useState("us_aqi");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError("");

      try {
        const { latitude, longitude } = CITIES[city];
        const params = new URLSearchParams({
          latitude: String(latitude),
          longitude: String(longitude),
          hourly: VARIABLES.join(","),
          current: VARIABLES.join(","),
          timezone: "auto",
          forecast_days: "2",
        });

        const airResponse = await fetch(
          `https://air-quality-api.open-meteo.com/v1/air-quality?${params}`
        );

        if (!airResponse.ok) {
          throw new Error("Could not fetch air-quality data. Please try again.");
        }

        const air = await airResponse.json();

        let weatherData = null;
        try {
          const weatherParams = new URLSearchParams({
            latitude: String(latitude),
            longitude: String(longitude),
            current: "temperature_2m,relative_humidity_2m",
            timezone: "auto",
          });

          const weatherResponse = await fetch(
            `https://api.open-meteo.com/v1/forecast?${weatherParams}`
          );

          if (weatherResponse.ok) {
            weatherData = await weatherResponse.json();
          }
        } catch {
          // Air-quality data can still be displayed if weather is unavailable.
        }

        if (cancelled) return;

        setData(air);
        setWeather(weatherData);
        setLastUpdated(new Date().toLocaleTimeString());
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load data.");
          setData(null);
          setWeather(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 15 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [city]);

  const current = data?.current || {};
  const hourly = data?.hourly || {};
  const currentWeather = weather?.current || {};

  const aqi = current.us_aqi ?? current.european_aqi ?? null;
  const category = categoryFor(aqi);

  const pollutants = [
    { key: "pm2_5", name: "PM2.5", unit: "µg/m³", color: "#e85b61", max: 75 },
    { key: "pm10", name: "PM10", unit: "µg/m³", color: "#ee923c", max: 150 },
    { key: "nitrogen_dioxide", name: "NO₂", unit: "µg/m³", color: "#d9ad36", max: 100 },
    { key: "ozone", name: "O₃", unit: "µg/m³", color: "#36b77a", max: 120 },
    { key: "carbon_monoxide", name: "CO", unit: "µg/m³", color: "#5688d7", max: 10000 },
    { key: "sulphur_dioxide", name: "SO₂", unit: "µg/m³", color: "#9772cb", max: 100 },
    { key: "carbon_dioxide", name: "CO₂", unit: "µg/m³", color: "#299eae", max: 1000 },
  ];

  const chartLabels = {
    us_aqi: "US AQI",
    european_aqi: "European AQI",
    pm2_5: "PM2.5 (µg/m³)",
    pm10: "PM10 (µg/m³)",
    carbon_monoxide: "CO (µg/m³)",
    nitrogen_dioxide: "NO₂ (µg/m³)",
    sulphur_dioxide: "SO₂ (µg/m³)",
    ozone: "O₃ (µg/m³)",
    carbon_dioxide: "CO₂ (µg/m³)",
  };

  const chartData = (hourly.time || [])
    .map((time, i) => ({
      time: time.slice(11, 16),
      date: time.slice(0, 10),
      value: hourly[activeTab]?.[i] ?? null,
    }))
    .filter((item) => item.value != null)
    .slice(0, 24);

  const gaugeColor =
    aqi == null ? "#aab4ae" :
    aqi <= 50 ? "#20ad83" :
    aqi <= 100 ? "#e9b641" :
    aqi <= 150 ? "#ed8b43" : "#e85b61";

  return (
    <div className="dashboard">
      <header className="topbar">
        <a className="brand" href="#home">
          <span className="brand-icon"><Wind size={25} /></span>
          AirSense
        </a>
        <div className="topbar-right">
          <span className={`live-dot ${error ? "offline-dot" : ""}`} />
          {loading ? "Fetching latest data..." : error ? "Connection issue" : "Open-Meteo Data"}
          <span className="city-label"><MapPin size={15} /> {city}</span>
        </div>
      </header>

      <main className="dashboard-main" id="home">
        <section className="welcome">
          <div>
            <p className="eyebrow">AIR QUALITY INTELLIGENCE</p>
            <h1>Breathe better.<br /><span>Live healthier.</span></h1>
            <p className="welcome-text">
              Explore air quality estimates and pollutant trends for your selected city.
            </p>
          </div>
          <div className="city-control">
            <label htmlFor="city">Choose your city</label>
            <select
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              {Object.keys(CITIES).map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <span className="data-source">Source: Open-Meteo API</span>
          </div>
        </section>

        {error && (
          <div className="notice notice-red">
            <AlertTriangle size={18} />
            <div><strong>Unable to fetch current data</strong><span>{error}</span></div>
          </div>
        )}

        <section className="stats-grid">
          <article className="stat-card">
            <div><p>US Air Quality Index</p><h2>{loading && !data ? "…" : aqi ?? "—"}</h2><span className="good-text">{category}</span></div>
            <span className="stat-icon green"><Leaf size={21} /></span>
          </article>
          <article className="stat-card">
            <div><p>Temperature</p><h2>{formatValue(currentWeather.temperature_2m)}{currentWeather.temperature_2m == null ? "" : "°C"}</h2><span className="blue-text">Current weather</span></div>
            <span className="stat-icon blue"><Thermometer size={21} /></span>
          </article>
          <article className="stat-card">
            <div><p>Humidity</p><h2>{formatValue(currentWeather.relative_humidity_2m, 0)}{currentWeather.relative_humidity_2m == null ? "" : "%"}</h2><span className="orange-text">Relative humidity</span></div>
            <span className="stat-icon orange"><Droplets size={21} /></span>
          </article>
          <article className="stat-card">
            <div><p>Carbon Monoxide</p><h2>{formatValue(current.carbon_monoxide, 0)}</h2><span className="yellow-text">µg/m³</span></div>
            <span className="stat-icon yellow"><Cloud size={21} /></span>
          </article>
        </section>

        <section className="primary-grid">
          <article className="card gauge-card">
            <div className="card-heading">
              <div><h3>Air Quality Index</h3><p>Latest available model estimate</p></div>
              <Activity size={21} className="heading-icon" />
            </div>
            <div className="gauge-wrap">
              <svg viewBox="0 0 220 150" className="gauge">
                <path d="M 35 120 A 75 75 0 0 1 185 120" fill="none" stroke="#edf0f2" strokeWidth="14" strokeLinecap="round" />
                {aqi != null && (
                  <path
                    d="M 35 120 A 75 75 0 0 1 185 120"
                    fill="none"
                    stroke={gaugeColor}
                    strokeWidth="14"
                    strokeLinecap="round"
                    pathLength="100"
                    strokeDasharray={`${Math.min(aqi / 5, 100)} 100`}
                  />
                )}
                <text x="110" y="88" textAnchor="middle" className="gauge-number">{aqi ?? "—"}</text>
                <text x="110" y="108" textAnchor="middle" className="gauge-label">US AQI</text>
              </svg>
            </div>
            <span className={`category-pill ${aqi == null ? "" : aqi <= 50 ? "pill-good" : aqi <= 100 ? "pill-moderate" : "pill-poor"}`}>
              <span /> {category}
            </span>
            <p className="gauge-caption">{loading ? "Loading data…" : `Selected location: ${city}`}</p>
            <div className="scale">
              <span><i className="scale-good" />Good<br /><small>0–50</small></span>
              <span><i className="scale-satisfactory" />Moderate<br /><small>51–100</small></span>
              <span><i className="scale-moderate" />Sensitive<br /><small>101–150</small></span>
              <span><i className="scale-poor" />Unhealthy+<br /><small>151+</small></span>
            </div>
            <button className="demo-button" onClick={() => window.location.reload()}>
              <RefreshCw size={13} /> Refresh data
            </button>
          </article>

          <article className="card chart-card">
            <div className="card-heading chart-heading">
              <div><h3>Hourly Air Quality Trends</h3><p>Latest available hourly forecast data</p></div>
              <select
                className="chart-select"
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                aria-label="Choose chart measurement"
              >
                {VARIABLES.map((key) => (
                  <option key={key} value={key}>{chartLabels[key]}</option>
                ))}
              </select>
            </div>
            <div className="chart-area">
              {chartData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 15, right: 12, left: -15, bottom: 4 }}>
                    <CartesianGrid stroke="#edf0f3" strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#84909b" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#84909b" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      labelFormatter={(label, items) => items?.[0]?.payload?.date ? `${items[0].payload.date} ${label}` : label}
                      formatter={(value) => [value, chartLabels[activeTab]]}
                    />
                    <Line type="monotone" dataKey="value" name={chartLabels[activeTab]} stroke="#398b70" strokeWidth={3} dot={false} activeDot={{ r: 5 }} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-chart">{loading ? "Loading hourly data…" : "Hourly data unavailable."}</div>
              )}
            </div>
            <p className="demo-note">Times shown in the selected location's local timezone.</p>
          </article>
        </section>

        <section className="secondary-grid">
          <article className="card pollutant-card">
            <div className="card-heading"><div><h3>Pollutant Levels</h3><p>Latest available concentrations</p></div></div>
            <div className="pollutant-list">
              {pollutants.map((p) => {
                const value = current[p.key];
                return (
                  <div className="pollutant-row" key={p.key}>
                    <span className="pollutant-name"><i style={{ background: p.color }} />{p.name}</span>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: value == null ? "0%" : `${Math.min((value / p.max) * 100, 100)}%`, background: p.color }} />
                    </div>
                    <strong>{formatValue(value)} <small>{p.unit}</small></strong>
                  </div>
                );
              })}
            </div>
            <p className="demo-note">A dash means the API did not return that variable.</p>
          </article>

          <article className="card location-card">
            <div className="card-heading"><div><h3>Monitored Locations</h3><p>Choose a city to view its data</p></div></div>
            <div className="location-list">
              {Object.entries(CITIES).map(([name]) => (
                <button
                  type="button"
                  className={`location-row ${city === name ? "selected-location" : ""}`}
                  key={name}
                  onClick={() => setCity(name)}
                >
                  <span className="location-icon"><Building2 size={18} /></span>
                  <div className="location-info"><strong>{name}</strong><span>{city === name ? "Currently selected" : "View city data"}</span></div>
                  <div className="location-aqi"><strong>{city === name ? (aqi ?? "—") : "View"}</strong><span>{city === name ? category : "Select"}</span></div>
                </button>
              ))}
            </div>
          </article>
        </section>

        <section className="bottom-grid">
          <article className="card alerts-card">
            <div className="card-heading"><div><h3>Air Quality Alerts</h3><p>Based on the latest AQI estimate</p></div></div>
            <div className={`notice ${aqi == null || aqi > 100 ? "notice-red" : "notice-green"}`}>
              {aqi == null || aqi > 100 ? <AlertTriangle size={18} /> : <Activity size={18} />}
              <div><strong>{aqi == null ? "AQI unavailable" : aqi > 100 ? "Elevated AQI" : "AQI within the lower ranges"}</strong>
                <span>{aqi == null ? "Check the connection or try refreshing." : aqi > 100 ? "Consider reducing prolonged outdoor exertion, especially for sensitive groups." : "Continue checking local conditions as they change."}</span>
              </div>
            </div>
            <div className="notice notice-yellow">
              <Cloud size={18} />
              <div><strong>Model-based data</strong><span>Local station measurements may differ from these estimates.</span></div>
            </div>
          </article>
          <article className="card recommendations-card">
            <div className="card-heading"><div><h3>Recommendations</h3><p>General air-quality guidance</p></div></div>
            <div className="notice notice-blue">
              <Lightbulb size={18} />
              <div><strong>Check conditions before going out</strong><span>Review the AQI and your local official advisories.</span></div>
            </div>
            <div className="notice notice-green">
              <Leaf size={18} />
              <div><strong>Reduce indoor pollution</strong><span>Avoid unnecessary smoke and other indoor pollutant sources.</span></div>
            </div>
          </article>
        </section>

        <footer className="footer">
          <span><Wind size={16} /> AirSense</span>
          <span>{lastUpdated ? `Fetched: ${lastUpdated}` : "Waiting for data"} · Open-Meteo · Model-based estimates</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
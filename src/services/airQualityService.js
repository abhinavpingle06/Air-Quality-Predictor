/**
 * Open-Meteo Air Quality & Weather API Service
 * Centralized service to fetch real-time atmospheric measurements and forecast data.
 */

const AIR_QUALITY_BASE_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";
const WEATHER_BASE_URL = "https://api.open-meteo.com/v1/forecast";

export const CURRENT_VARIABLES = [
  "pm10",
  "pm2_5",
  "carbon_monoxide",
  "carbon_dioxide",
  "nitrogen_dioxide",
  "ozone",
  "sulphur_dioxide",
  "nitrogen_monoxide",
  "us_aqi",
  "european_aqi",
];

export const HOURLY_VARIABLES = [
  "nitrogen_monoxide",
  "pm10",
  "pm2_5",
  "carbon_monoxide",
  "carbon_dioxide",
  "nitrogen_dioxide",
  "ozone",
  "sulphur_dioxide",
  "us_aqi",
  "european_aqi",
];

export const POLLUTANT_CONFIG = [
  {
    key: "pm2_5",
    name: "PM2.5",
    fullName: "Fine Particulate Matter",
    unit: "µg/m³",
    color: "#e85b61",
    benchmark: 60,
    description: "Inhalable particles ≤2.5 micrometers",
  },
  {
    key: "pm10",
    name: "PM10",
    fullName: "Coarse Particulate Matter",
    unit: "µg/m³",
    color: "#ee923c",
    benchmark: 100,
    description: "Inhalable particles ≤10 micrometers",
  },
  {
    key: "nitrogen_dioxide",
    name: "NO₂",
    fullName: "Nitrogen Dioxide",
    unit: "µg/m³",
    color: "#d9ad36",
    benchmark: 80,
    description: "Combustion by-product, vehicle emissions",
  },
  {
    key: "nitrogen_monoxide",
    name: "NO",
    fullName: "Nitrogen Monoxide",
    unit: "µg/m³",
    color: "#4a90e2",
    benchmark: 50,
    description: "Precursor in smog and ozone formation",
  },
  {
    key: "ozone",
    name: "O₃",
    fullName: "Ground-Level Ozone",
    unit: "µg/m³",
    color: "#36b77a",
    benchmark: 100,
    description: "Secondary pollutant from sunlight reactions",
  },
  {
    key: "carbon_monoxide",
    name: "CO",
    fullName: "Carbon Monoxide",
    unit: "µg/m³",
    color: "#5688d7",
    benchmark: 4000,
    description: "Incomplete combustion product",
  },
  {
    key: "sulphur_dioxide",
    name: "SO₂",
    fullName: "Sulphur Dioxide",
    unit: "µg/m³",
    color: "#9772cb",
    benchmark: 80,
    description: "Thermal plants and industrial fossil fuels",
  },
  {
    key: "carbon_dioxide",
    name: "CO₂",
    fullName: "Carbon Dioxide",
    unit: "ppm",
    color: "#299eae",
    benchmark: 600,
    description: "Primary greenhouse gas, ambient baseline ~420 ppm",
  },
];

export const CHART_LABELS = {
  us_aqi: { label: "US Air Quality Index", unit: "AQI", color: "#398b70" },
  pm2_5: { label: "PM2.5 (Fine Particulates)", unit: "µg/m³", color: "#e85b61" },
  pm10: { label: "PM10 (Coarse Particulates)", unit: "µg/m³", color: "#ee923c" },
  nitrogen_monoxide: { label: "Nitrogen Monoxide (NO)", unit: "µg/m³", color: "#4a90e2" },
  nitrogen_dioxide: { label: "Nitrogen Dioxide (NO₂)", unit: "µg/m³", color: "#d9ad36" },
  ozone: { label: "Ground Ozone (O₃)", unit: "µg/m³", color: "#36b77a" },
  carbon_monoxide: { label: "Carbon Monoxide (CO)", unit: "µg/m³", color: "#5688d7" },
  sulphur_dioxide: { label: "Sulphur Dioxide (SO₂)", unit: "µg/m³", color: "#9772cb" },
  carbon_dioxide: { label: "Carbon Dioxide (CO₂)", unit: "ppm", color: "#299eae" },
  european_aqi: { label: "European AQI", unit: "EAQI", color: "#16a085" },
};

/**
 * Determine standard US EPA AQI category and metadata
 */
export function getAqiCategory(aqi) {
  if (aqi == null || !Number.isFinite(Number(aqi))) {
    return {
      label: "Unavailable",
      color: "#aab4ae",
      bg: "#f0f4f2",
      description: "Air quality calculation unavailable.",
      healthAdvice: "Waiting for model estimates.",
    };
  }

  const value = Math.round(Number(aqi));

  if (value <= 50) {
    return {
      label: "Good",
      color: "#20ad83",
      bg: "#e5f7ec",
      description: "Air quality is considered satisfactory, with little or no risk.",
      healthAdvice: "Ideal conditions for outdoor physical activities and ventilation.",
    };
  }
  if (value <= 100) {
    return {
      label: "Moderate",
      color: "#e9b641",
      bg: "#fff8dc",
      description: "Air quality is acceptable for most; sensitive individuals may notice mild effects.",
      healthAdvice: "Unusually sensitive people should consider limiting prolonged outdoor exertion.",
    };
  }
  if (value <= 150) {
    return {
      label: "Unhealthy for Sensitive Groups",
      color: "#ed8b43",
      bg: "#fff0e2",
      description: "Members of sensitive groups (children, elderly, respiratory conditions) may experience health effects.",
      healthAdvice: "Sensitive groups should reduce heavy outdoor exertion and wear masks if needed.",
    };
  }
  if (value <= 200) {
    return {
      label: "Unhealthy",
      color: "#e85b61",
      bg: "#ffebee",
      description: "Some members of the general public may experience health effects; sensitive groups more serious.",
      healthAdvice: "Everyone should reduce outdoor exercise; keep windows closed during peak hours.",
    };
  }
  if (value <= 300) {
    return {
      label: "Very Unhealthy",
      color: "#8e44ad",
      bg: "#f3e5f5",
      description: "Health alert: The risk of health effects is increased for everyone.",
      healthAdvice: "Avoid prolonged outdoor exposure. Use indoor air purifiers where possible.",
    };
  }
  return {
    label: "Hazardous",
    color: "#78281f",
    bg: "#fbe9e7",
    description: "Health warning of emergency conditions: The entire population is likely to be affected.",
    healthAdvice: "Remain indoors with clean air measures; avoid all strenuous physical activities outside.",
  };
}

/**
 * Format numerical metric
 */
export function formatValue(value, digits = 1) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return Number(value).toFixed(digits);
}

/**
 * Fetch air quality and companion weather data from Open-Meteo
 * @param {Object} options
 * @param {number} options.latitude
 * @param {number} options.longitude
 * @param {string} [options.timezone='Asia/Kolkata']
 * @param {AbortSignal} [options.signal]
 */
export async function fetchAirQualityData({
  latitude,
  longitude,
  timezone = "Asia/Kolkata",
  signal,
}) {
  if (latitude == null || longitude == null) {
    throw new Error("Latitude and longitude are required to fetch air-quality data.");
  }

  // Construct query parameters safely via URLSearchParams
  const airParams = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: CURRENT_VARIABLES.join(","),
    hourly: HOURLY_VARIABLES.join(","),
    timezone: timezone,
    forecast_days: "2",
  });

  const weatherParams = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,relative_humidity_2m",
    timezone: timezone,
  });

  const airUrl = `${AIR_QUALITY_BASE_URL}?${airParams.toString()}`;
  const weatherUrl = `${WEATHER_BASE_URL}?${weatherParams.toString()}`;

  // Execute requests in parallel with AbortController signal
  const [airResult, weatherResult] = await Promise.allSettled([
    fetch(airUrl, { signal }).then(async (res) => {
      if (!res.ok) {
        let errMessage = `Air Quality API error (status ${res.status})`;
        try {
          const errData = await res.json();
          if (errData.reason) errMessage = errData.reason;
        } catch {
          // ignore json parse error
        }
        throw new Error(errMessage);
      }
      return res.json();
    }),
    fetch(weatherUrl, { signal }).then(async (res) => {
      if (!res.ok) return null;
      return res.json();
    }),
  ]);

  if (airResult.status === "rejected") {
    // If request was aborted by user/component, re-throw to allow component cancellation logic
    if (airResult.reason?.name === "AbortError") {
      throw airResult.reason;
    }
    throw new Error(
      airResult.reason?.message || "Failed to retrieve air quality data. Please check your network connection."
    );
  }

  const airData = airResult.value;
  const weatherData = weatherResult.status === "fulfilled" ? weatherResult.value : null;

  return {
    air: airData,
    weather: weatherData,
    fetchedAt: new Date(),
    timestampText: new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    }),
  };
}

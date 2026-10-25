/**
 * Prediction Service for FastAPI Backend Integration
 * Communicates with the trained Linear Regression & KNN AQI models via REST endpoints.
 */

const BACKEND_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");

/**
 * Check if FastAPI backend is healthy and models are loaded
 */
export async function checkBackendHealth() {
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/health`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      return { online: false, message: `Backend responded with HTTP ${res.status}` };
    }
    const data = await res.json();
    return {
      online: true,
      status: data.status,
      modelsLoaded: data.models_loaded,
      regressorType: data.regressor_type,
      classifierType: data.classifier_type,
      featureCount: data.feature_count,
      message: data.message,
    };
  } catch (err) {
    return {
      online: false,
      message:
        "FastAPI backend is offline. Start it in backend/ with: uvicorn main:app --reload --port 8000",
    };
  }
}

/**
 * Fetch model metadata from FastAPI
 */
export async function fetchModelInfo() {
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/model/info`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Send pollutant measurements and date to POST /predict
 * @param {Object} inputs
 * @param {AbortSignal} [signal]
 */
export async function predictAqi(inputs, signal) {
  const {
    pm2_5, pm10, no, no2, so2,
    o3, co, nox, nh3, benzene, toluene, xylene,
    year, month, day,
  } = inputs;

  // Validate required core pollutants
  const missing = [];
  if (pm2_5 === "" || pm2_5 == null || isNaN(Number(pm2_5))) missing.push("PM2.5");
  if (pm10 === "" || pm10 == null || isNaN(Number(pm10))) missing.push("PM10");
  if (no === "" || no == null || isNaN(Number(no))) missing.push("NO");
  if (no2 === "" || no2 == null || isNaN(Number(no2))) missing.push("NO2");
  if (so2 === "" || so2 == null || isNaN(Number(so2))) missing.push("SO2");

  if (missing.length > 0) {
    throw new Error(`Please provide valid numeric values for required pollutants: ${missing.join(", ")}`);
  }

  // Construct payload matching Pydantic alias fields
  const payload = {
    "PM2.5": Number(pm2_5),
    "PM10": Number(pm10),
    "NO": Number(no),
    "NO2": Number(no2),
    "SO2": Number(so2),
  };

  // Optional pollutants (send if provided)
  const parseOptional = (val) => (val !== "" && val != null && !isNaN(Number(val)) ? Number(val) : null);

  if (o3 !== "" && o3 != null) payload["O3"] = parseOptional(o3);
  if (co !== "" && co != null) payload["CO"] = parseOptional(co);
  if (nox !== "" && nox != null) payload["NOx"] = parseOptional(nox);
  if (nh3 !== "" && nh3 != null) payload["NH3"] = parseOptional(nh3);
  if (benzene !== "" && benzene != null) payload["Benzene"] = parseOptional(benzene);
  if (toluene !== "" && toluene != null) payload["Toluene"] = parseOptional(toluene);
  if (xylene !== "" && xylene != null) payload["Xylene"] = parseOptional(xylene);

  // Date features
  const now = new Date();
  payload["Year"] = year ? parseInt(year, 10) : now.getFullYear();
  payload["Month"] = month ? parseInt(month, 10) : now.getMonth() + 1;
  payload["Day"] = day ? parseInt(day, 10) : now.getDate();

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!response.ok) {
      let errorMsg = `Server error (HTTP ${response.status})`;
      try {
        const errorData = await response.json();
        if (Array.isArray(errorData.detail)) {
          errorMsg = errorData.detail.map((d) => d.msg || d).join("; ");
        } else if (errorData.detail) {
          errorMsg = errorData.detail;
        }
      } catch {
        // use default errorMsg
      }
      throw new Error(errorMsg);
    }

    const data = await response.json();
    return {
      predictedAqi: data.predicted_aqi,
      predictedBucket: data.predicted_aqi_bucket,
      modelVersion: data.model_version,
      algorithms: data.algorithms || {
        regression: "Linear Regression",
        classification: "K-Nearest Neighbors (KNN)",
      },
      inputsUsed: data.inputs_used,
    };
  } catch (err) {
    if (err.name === "AbortError") throw err;
    if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
      throw new Error(
        `Unable to connect to FastAPI backend at ${BACKEND_BASE_URL}. Ensure uvicorn is running.`
      );
    }
    throw err;
  }
}

/**
 * Return color and style metadata for the trained classification model's actual buckets:
 * ['Good', 'Satisfactory', 'Moderate', 'Poor', 'Very Poor', 'Severe']
 */
export function getBucketStyle(bucketName) {
  const norm = String(bucketName || "").trim().toLowerCase();
  switch (norm) {
    case "good":
      return { color: "#20ad83", bg: "#e5f7ec", border: "#b4ebd4", label: "Good" };
    case "satisfactory":
      return { color: "#27ae60", bg: "#eafaf1", border: "#a9dfbf", label: "Satisfactory" };
    case "moderate":
      return { color: "#d4a017", bg: "#fef9e7", border: "#f9e79f", label: "Moderate" };
    case "poor":
      return { color: "#e67e22", bg: "#fdf2e9", border: "#f5cba7", label: "Poor" };
    case "very poor":
      return { color: "#e85b61", bg: "#fdeeed", border: "#f5b7b1", label: "Very Poor" };
    case "severe":
      return { color: "#78281f", bg: "#fadbd8", border: "#d98880", label: "Severe" };
    default:
      return { color: "#7f8c8d", bg: "#f2f4f4", border: "#d5dbdb", label: bucketName || "Unknown" };
  }
}

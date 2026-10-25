import { useState, useEffect, useId } from "react";
import {
  Brain,
  Sparkles,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Layers,
  ArrowRight,
  Server,
  HelpCircle,
} from "lucide-react";
import {
  predictAqi,
  checkBackendHealth,
  getBucketStyle,
} from "../services/predictionService";

export default function AqiPredictorForm({ livePollutants, selectedCityName }) {
  const [formData, setFormData] = useState({
    pm2_5: "",
    pm10: "",
    no: "",
    no2: "",
    so2: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [backendHealth, setBackendHealth] = useState({ online: null, message: "" });
  const [autofillSuccess, setAutofillSuccess] = useState(false);

  const formId = useId();

  // Check backend health on mount and periodically
  useEffect(() => {
    let mounted = true;
    async function checkHealth() {
      const res = await checkBackendHealth();
      if (mounted) setBackendHealth(res);
    }
    checkHealth();
    const timer = setInterval(checkHealth, 30000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  // Check if live data has all 5 required pollutants
  const hasLiveInputs =
    livePollutants != null &&
    livePollutants.pm2_5 != null &&
    livePollutants.pm10 != null &&
    livePollutants.nitrogen_monoxide != null &&
    livePollutants.nitrogen_dioxide != null &&
    livePollutants.sulphur_dioxide != null;

  // Auto-fill from live Open-Meteo data for the currently selected city
  const handleAutofill = () => {
    if (!hasLiveInputs) return;
    setFormData({
      pm2_5: String(livePollutants.pm2_5),
      pm10: String(livePollutants.pm10),
      no: String(livePollutants.nitrogen_monoxide),
      no2: String(livePollutants.nitrogen_dioxide),
      so2: String(livePollutants.sulphur_dioxide),
    });
    setError("");
    setAutofillSuccess(true);
    setTimeout(() => setAutofillSuccess(false), 2500);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleReset = () => {
    setFormData({ pm2_5: "", pm10: "", no: "", no2: "", so2: "" });
    setResult(null);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const prediction = await predictAqi(formData);
      setResult(prediction);
    } catch (err) {
      setError(err.message || "Failed to generate prediction. Check backend logs.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const bucketStyle = result ? getBucketStyle(result.predictedBucket) : null;

  return (
    <section className="card ml-predictor-card" id="ml-predictor">
      <div className="card-heading">
        <div className="predictor-heading-text">
          <div className="predictor-title-row">
            <span className="ai-chip">
              <Cpu size={14} /> Machine Learning Model
            </span>
            <h3>Custom AQI Model Predictor</h3>
          </div>
          <p>
            Estimate numerical AQI and category bucket using your trained 5-feature Random Forest models.
          </p>
        </div>

        {/* Backend Connectivity Indicator */}
        <div
          className={`backend-status-pill ${
            backendHealth.online === true
              ? "backend-online"
              : backendHealth.online === false
              ? "backend-offline"
              : "backend-checking"
          }`}
          title={backendHealth.message || "Checking FastAPI backend status"}
        >
          <Server size={12} />
          <span>
            {backendHealth.online === true
              ? "FastAPI: Connected"
              : backendHealth.online === false
              ? "FastAPI: Offline"
              : "Connecting..."}
          </span>
        </div>
      </div>

      <div className="predictor-body-grid">
        {/* Left Column: Form Controls */}
        <form className="predictor-form" onSubmit={handleSubmit}>
          {/* Action Row: Auto-fill & Reset */}
          <div className="form-action-bar">
            <button
              type="button"
              className="autofill-btn"
              onClick={handleAutofill}
              disabled={!hasLiveInputs || loading}
              title={
                hasLiveInputs
                  ? `Populate input values using live estimates for ${selectedCityName}`
                  : `Live Open-Meteo data for ${selectedCityName} is missing one or more required features.`
              }
            >
              <Sparkles size={13} />
              {autofillSuccess ? (
                <span>Loaded {selectedCityName} data!</span>
              ) : (
                <span>Auto-fill from {selectedCityName || "Current"} Live Data</span>
              )}
            </button>

            <button
              type="button"
              className="reset-form-btn"
              onClick={handleReset}
              disabled={loading}
              title="Clear all input fields"
            >
              <RotateCcw size={12} /> Clear
            </button>
          </div>

          {!hasLiveInputs && (
            <p className="autofill-note">
              <HelpCircle size={12} /> Auto-fill is currently waiting for complete 5-pollutant live data. You can enter values manually.
            </p>
          )}

          {/* 5 Pollutant Inputs */}
          <div className="form-inputs-grid">
            {/* 1. PM2.5 */}
            <div className="input-group">
              <label htmlFor={`${formId}-pm25`}>
                <strong>PM2.5</strong>
                <span className="unit-badge">µg/m³</span>
              </label>
              <input
                id={`${formId}-pm25`}
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 50.0"
                value={formData.pm2_5}
                onChange={(e) => handleInputChange("pm2_5", e.target.value)}
                required
                disabled={loading}
              />
              <span className="input-hint">Fine Inhalable Particulate</span>
            </div>

            {/* 2. PM10 */}
            <div className="input-group">
              <label htmlFor={`${formId}-pm10`}>
                <strong>PM10</strong>
                <span className="unit-badge">µg/m³</span>
              </label>
              <input
                id={`${formId}-pm10`}
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 80.0"
                value={formData.pm10}
                onChange={(e) => handleInputChange("pm10", e.target.value)}
                required
                disabled={loading}
              />
              <span className="input-hint">Coarse Inhalable Dust</span>
            </div>

            {/* 3. NO */}
            <div className="input-group">
              <label htmlFor={`${formId}-no`}>
                <strong>NO</strong>
                <span className="unit-badge">µg/m³</span>
              </label>
              <input
                id={`${formId}-no`}
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 10.0"
                value={formData.no}
                onChange={(e) => handleInputChange("no", e.target.value)}
                required
                disabled={loading}
              />
              <span className="input-hint">Nitrogen Monoxide</span>
            </div>

            {/* 4. NO2 */}
            <div className="input-group">
              <label htmlFor={`${formId}-no2`}>
                <strong>NO₂</strong>
                <span className="unit-badge">µg/m³</span>
              </label>
              <input
                id={`${formId}-no2`}
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 20.0"
                value={formData.no2}
                onChange={(e) => handleInputChange("no2", e.target.value)}
                required
                disabled={loading}
              />
              <span className="input-hint">Nitrogen Dioxide</span>
            </div>

            {/* 5. SO2 */}
            <div className="input-group">
              <label htmlFor={`${formId}-so2`}>
                <strong>SO₂</strong>
                <span className="unit-badge">µg/m³</span>
              </label>
              <input
                id={`${formId}-so2`}
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 5.0"
                value={formData.so2}
                onChange={(e) => handleInputChange("so2", e.target.value)}
                required
                disabled={loading}
              />
              <span className="input-hint">Sulphur Dioxide</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="predictor-error" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="predict-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="btn-spinner" /> Running Inference...
              </>
            ) : (
              <>
                <Brain size={16} /> Predict AQI via Trained Model
              </>
            )}
          </button>
        </form>

        {/* Right Column: Prediction Results Card */}
        <div className="prediction-result-panel">
          {result ? (
            <div className="result-card-inner">
              <div className="result-header">
                <span className="result-tag">
                  <CheckCircle2 size={13} /> Model Output
                </span>
                <span className="version-tag">{result.modelVersion}</span>
              </div>

              <div className="result-main-metrics">
                <div className="metric-box aqi-metric-box">
                  <span className="metric-label">Predicted AQI</span>
                  <h2 className="metric-val">{result.predictedAqi}</h2>
                  <span className="metric-sub">Numerical Regression</span>
                </div>

                <div
                  className="metric-box bucket-metric-box"
                  style={{
                    backgroundColor: bucketStyle.bg,
                    borderColor: bucketStyle.border,
                  }}
                >
                  <span className="metric-label">AQI Category Bucket</span>
                  <h2 className="metric-val" style={{ color: bucketStyle.color }}>
                    {result.predictedBucket}
                  </h2>
                  <span className="metric-sub" style={{ color: bucketStyle.color }}>
                    Classifier Classification
                  </span>
                </div>
              </div>

              {/* Inputs summary */}
              <div className="result-inputs-summary">
                <span className="summary-title">Features Evaluated:</span>
                <div className="summary-tags">
                  <span>PM2.5: <strong>{result.inputsUsed["PM2.5"]}</strong></span>
                  <span>PM10: <strong>{result.inputsUsed["PM10"]}</strong></span>
                  <span>NO: <strong>{result.inputsUsed["NO"]}</strong></span>
                  <span>NO₂: <strong>{result.inputsUsed["NO2"]}</strong></span>
                  <span>SO₂: <strong>{result.inputsUsed["SO2"]}</strong></span>
                </div>
              </div>

              <p className="prediction-disclaimer">
                Outputs produced by your trained Random Forest models loaded in FastAPI. These are static predictions derived from the 5 supplied input values, distinct from Open-Meteo numerical atmospheric estimates.
              </p>
            </div>
          ) : (
            <div className="result-empty-state">
              <div className="empty-icon-wrap">
                <Layers size={28} />
              </div>
              <h4>Ready for Model Inference</h4>
              <p>
                Enter the five pollutant concentrations or click <strong>Auto-fill</strong> from current live data, then press <strong>Predict AQI</strong> to run inference.
              </p>
              <div className="feature-checklist">
                <span>✓ Trained Random Forest Regressor</span>
                <span>✓ Trained Random Forest Bucket Classifier</span>
                <span>✓ Median Imputation Pipeline</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

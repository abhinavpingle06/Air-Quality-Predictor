import { useState, useEffect, useId } from "react";
import {
  Brain,
  Sparkles,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Layers,
  Server,
  HelpCircle,
  Sliders,
  Calendar,
  Activity,
  GitBranch,
} from "lucide-react";
import {
  predictAqi,
  checkBackendHealth,
  getBucketStyle,
} from "../services/predictionService";

export default function AqiPredictorForm({ livePollutants, selectedCityName }) {
  const now = new Date();

  const [formData, setFormData] = useState({
    pm2_5: "",
    pm10: "",
    no: "",
    no2: "",
    so2: "",
    o3: "",
    co: "",
    nox: "",
    nh3: "",
    benzene: "",
    toluene: "",
    xylene: "",
    year: String(now.getFullYear()),
    month: String(now.getMonth() + 1),
    day: String(now.getDate()),
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
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

  // Check if live data has the core pollutants
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

    // Open-Meteo CO is in µg/m³; model was trained on CPCB dataset where CO is in mg/m³
    const coInMg =
      livePollutants.carbon_monoxide != null
        ? (Number(livePollutants.carbon_monoxide) / 1000.0).toFixed(2)
        : "";

    const currentDate = new Date();

    setFormData((prev) => ({
      ...prev,
      pm2_5: String(livePollutants.pm2_5),
      pm10: String(livePollutants.pm10),
      no: String(livePollutants.nitrogen_monoxide),
      no2: String(livePollutants.nitrogen_dioxide),
      so2: String(livePollutants.sulphur_dioxide),
      o3: livePollutants.ozone != null ? String(livePollutants.ozone) : "",
      co: coInMg,
      year: String(currentDate.getFullYear()),
      month: String(currentDate.getMonth() + 1),
      day: String(currentDate.getDate()),
    }));

    setError("");
    setAutofillSuccess(true);
    setTimeout(() => setAutofillSuccess(false), 2500);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleReset = () => {
    setFormData({
      pm2_5: "",
      pm10: "",
      no: "",
      no2: "",
      so2: "",
      o3: "",
      co: "",
      nox: "",
      nh3: "",
      benzene: "",
      toluene: "",
      xylene: "",
      year: String(now.getFullYear()),
      month: String(now.getMonth() + 1),
      day: String(now.getDate()),
    });
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
              <Cpu size={14} /> Dual-Algorithm ML Pipeline
            </span>
            <div className="algo-tags">
              <span className="algo-badge lr-badge">
                <Activity size={12} /> Linear Regression (AQI)
              </span>
              <span className="algo-badge knn-badge">
                <GitBranch size={12} /> KNN Classifier (Category)
              </span>
            </div>
            <h3>Custom AQI Model Predictor</h3>
          </div>
          <p>
            Estimate numerical AQI using <strong>Linear Regression</strong> and category bucket using <strong>K-Nearest Neighbors (KNN)</strong>.
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
              ? "FastAPI (LR + KNN): Online"
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
                  ? `Populate inputs using live estimates for ${selectedCityName}`
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

            <div className="form-action-right">
              <button
                type="button"
                className="toggle-advanced-btn"
                onClick={() => setShowAdvanced((prev) => !prev)}
                title="Toggle optional secondary pollutants and date fields"
              >
                <Sliders size={12} />
                {showAdvanced ? "Hide Advanced" : "Advanced & Date (15 Features)"}
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
          </div>

          {/* Primary Pollutants Grid */}
          <div className="form-inputs-grid">
            {/* PM2.5 */}
            <div className="input-group">
              <label htmlFor={`${formId}-pm25`}>
                <strong>PM2.5 *</strong>
                <span className="unit-badge">µg/m³</span>
              </label>
              <input
                id={`${formId}-pm25`}
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 35.0"
                value={formData.pm2_5}
                onChange={(e) => handleInputChange("pm2_5", e.target.value)}
                required
                disabled={loading}
              />
              <span className="input-hint">Fine Inhalable Particulate</span>
            </div>

            {/* PM10 */}
            <div className="input-group">
              <label htmlFor={`${formId}-pm10`}>
                <strong>PM10 *</strong>
                <span className="unit-badge">µg/m³</span>
              </label>
              <input
                id={`${formId}-pm10`}
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 70.0"
                value={formData.pm10}
                onChange={(e) => handleInputChange("pm10", e.target.value)}
                required
                disabled={loading}
              />
              <span className="input-hint">Coarse Dust Particles</span>
            </div>

            {/* NO */}
            <div className="input-group">
              <label htmlFor={`${formId}-no`}>
                <strong>NO *</strong>
                <span className="unit-badge">µg/m³</span>
              </label>
              <input
                id={`${formId}-no`}
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 5.0"
                value={formData.no}
                onChange={(e) => handleInputChange("no", e.target.value)}
                required
                disabled={loading}
              />
              <span className="input-hint">Nitrogen Monoxide</span>
            </div>

            {/* NO2 */}
            <div className="input-group">
              <label htmlFor={`${formId}-no2`}>
                <strong>NO₂ *</strong>
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

            {/* SO2 */}
            <div className="input-group">
              <label htmlFor={`${formId}-so2`}>
                <strong>SO₂ *</strong>
                <span className="unit-badge">µg/m³</span>
              </label>
              <input
                id={`${formId}-so2`}
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 8.0"
                value={formData.so2}
                onChange={(e) => handleInputChange("so2", e.target.value)}
                required
                disabled={loading}
              />
              <span className="input-hint">Sulphur Dioxide</span>
            </div>

            {/* O3 (Ozone) */}
            <div className="input-group">
              <label htmlFor={`${formId}-o3`}>
                <strong>O₃ (Ozone)</strong>
                <span className="unit-badge">µg/m³</span>
              </label>
              <input
                id={`${formId}-o3`}
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 30.0 (imputed if empty)"
                value={formData.o3}
                onChange={(e) => handleInputChange("o3", e.target.value)}
                disabled={loading}
              />
              <span className="input-hint">Ground-Level Ozone</span>
            </div>

            {/* CO (Carbon Monoxide) */}
            <div className="input-group">
              <label htmlFor={`${formId}-co`}>
                <strong>CO</strong>
                <span className="unit-badge">mg/m³</span>
              </label>
              <input
                id={`${formId}-co`}
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 0.8 (imputed if empty)"
                value={formData.co}
                onChange={(e) => handleInputChange("co", e.target.value)}
                disabled={loading}
              />
              <span className="input-hint">Carbon Monoxide</span>
            </div>
          </div>

          {/* Advanced / Secondary Pollutants & Date Section (Expandable) */}
          {showAdvanced && (
            <div className="advanced-inputs-box">
              <div className="advanced-header">
                <span>
                  <Sliders size={13} /> Secondary Pollutants & Observation Date
                </span>
                <small>Optional: Leave blank to use pipeline median imputation</small>
              </div>

              <div className="form-inputs-grid advanced-grid">
                {/* NOx */}
                <div className="input-group">
                  <label htmlFor={`${formId}-nox`}>
                    <strong>NOx</strong>
                    <span className="unit-badge">ppb</span>
                  </label>
                  <input
                    id={`${formId}-nox`}
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 25.0"
                    value={formData.nox}
                    onChange={(e) => handleInputChange("nox", e.target.value)}
                    disabled={loading}
                  />
                  <span className="input-hint">Nitrogen Oxides</span>
                </div>

                {/* NH3 */}
                <div className="input-group">
                  <label htmlFor={`${formId}-nh3`}>
                    <strong>NH₃</strong>
                    <span className="unit-badge">µg/m³</span>
                  </label>
                  <input
                    id={`${formId}-nh3`}
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 10.0"
                    value={formData.nh3}
                    onChange={(e) => handleInputChange("nh3", e.target.value)}
                    disabled={loading}
                  />
                  <span className="input-hint">Ammonia</span>
                </div>

                {/* Benzene */}
                <div className="input-group">
                  <label htmlFor={`${formId}-benzene`}>
                    <strong>Benzene</strong>
                    <span className="unit-badge">µg/m³</span>
                  </label>
                  <input
                    id={`${formId}-benzene`}
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 1.0"
                    value={formData.benzene}
                    onChange={(e) => handleInputChange("benzene", e.target.value)}
                    disabled={loading}
                  />
                  <span className="input-hint">Hydrocarbon (VOC)</span>
                </div>

                {/* Toluene */}
                <div className="input-group">
                  <label htmlFor={`${formId}-toluene`}>
                    <strong>Toluene</strong>
                    <span className="unit-badge">µg/m³</span>
                  </label>
                  <input
                    id={`${formId}-toluene`}
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 5.0"
                    value={formData.toluene}
                    onChange={(e) => handleInputChange("toluene", e.target.value)}
                    disabled={loading}
                  />
                  <span className="input-hint">Aromatic VOC</span>
                </div>

                {/* Xylene */}
                <div className="input-group">
                  <label htmlFor={`${formId}-xylene`}>
                    <strong>Xylene</strong>
                    <span className="unit-badge">µg/m³</span>
                  </label>
                  <input
                    id={`${formId}-xylene`}
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 0.5"
                    value={formData.xylene}
                    onChange={(e) => handleInputChange("xylene", e.target.value)}
                    disabled={loading}
                  />
                  <span className="input-hint">Aromatic Solvent</span>
                </div>

                {/* Date Selection */}
                <div className="input-group date-input-group">
                  <label>
                    <strong>Observation Date</strong>
                    <span className="unit-badge"><Calendar size={10} /> YYYY-MM-DD</span>
                  </label>
                  <div className="date-fields-row">
                    <input
                      type="number"
                      placeholder="Year"
                      value={formData.year}
                      onChange={(e) => handleInputChange("year", e.target.value)}
                      title="Year"
                      disabled={loading}
                    />
                    <input
                      type="number"
                      min="1"
                      max="12"
                      placeholder="Mo"
                      value={formData.month}
                      onChange={(e) => handleInputChange("month", e.target.value)}
                      title="Month (1-12)"
                      disabled={loading}
                    />
                    <input
                      type="number"
                      min="1"
                      max="31"
                      placeholder="Day"
                      value={formData.day}
                      onChange={(e) => handleInputChange("day", e.target.value)}
                      title="Day (1-31)"
                      disabled={loading}
                    />
                  </div>
                  <span className="input-hint">Features Year, Month & Day</span>
                </div>
              </div>
            </div>
          )}

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
                <span className="btn-spinner" /> Running Linear Regression & KNN Inference...
              </>
            ) : (
              <>
                <Brain size={16} /> Predict AQI (Linear Regression + KNN)
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
                  <CheckCircle2 size={13} /> Model Prediction Complete
                </span>
                <span className="version-tag">{result.modelVersion}</span>
              </div>

              <div className="result-main-metrics">
                {/* Numeric AQI via Linear Regression */}
                <div className="metric-box aqi-metric-box">
                  <span className="metric-label">Predicted Numerical AQI</span>
                  <h2 className="metric-val">{result.predictedAqi}</h2>
                  <span className="metric-sub lr-sub">
                    <Activity size={11} /> Linear Regression Model
                  </span>
                </div>

                {/* AQI Bucket via KNN */}
                <div
                  className="metric-box bucket-metric-box"
                  style={{
                    backgroundColor: bucketStyle.bg,
                    borderColor: bucketStyle.border,
                  }}
                >
                  <span className="metric-label">Predicted AQI Category</span>
                  <h2 className="metric-val" style={{ color: bucketStyle.color }}>
                    {result.predictedBucket}
                  </h2>
                  <span className="metric-sub knn-sub" style={{ color: bucketStyle.color }}>
                    <GitBranch size={11} /> K-Nearest Neighbors (KNN)
                  </span>
                </div>
              </div>

              {/* Inputs summary */}
              <div className="result-inputs-summary">
                <span className="summary-title">Features Evaluated (15 Total):</span>
                <div className="summary-tags">
                  <span>PM2.5: <strong>{result.inputsUsed["PM2.5"]}</strong></span>
                  <span>PM10: <strong>{result.inputsUsed["PM10"]}</strong></span>
                  <span>NO: <strong>{result.inputsUsed["NO"]}</strong></span>
                  <span>NO₂: <strong>{result.inputsUsed["NO2"]}</strong></span>
                  <span>SO₂: <strong>{result.inputsUsed["SO2"]}</strong></span>
                  <span>O₃: <strong>{result.inputsUsed["O3"]}</strong></span>
                  <span>CO: <strong>{result.inputsUsed["CO"]}</strong></span>
                  <span>Date: <strong>{result.inputsUsed["Year"]}-{result.inputsUsed["Month"]}-{result.inputsUsed["Day"]}</strong></span>
                </div>
              </div>

              <p className="prediction-disclaimer">
                Inference powered by your <strong>Linear Regression</strong> pipeline (for continuous AQI index) and <strong>KNN Classifier</strong> (for category buckets). Unspecified secondary pollutants are auto-imputed using learned training medians.
              </p>
            </div>
          ) : (
            <div className="result-empty-state">
              <div className="empty-icon-wrap">
                <Layers size={28} />
              </div>
              <h4>Dual-Algorithm Model Inference</h4>
              <p>
                Enter the core pollutants or click <strong>Auto-fill</strong> from current live data, then press <strong>Predict AQI</strong> to evaluate both models.
              </p>
              <div className="feature-checklist">
                <span>✓ <strong>Linear Regression</strong> for numerical AQI prediction</span>
                <span>✓ <strong>KNN Classifier</strong> for AQI category classification</span>
                <span>✓ <strong>SimpleImputer & StandardScaler</strong> preprocessing pipelines</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

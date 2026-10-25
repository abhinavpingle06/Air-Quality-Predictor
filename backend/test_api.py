"""
Automated Integration and Unit Tests for AirSense FastAPI Backend
Tests Linear Regression (numeric AQI) and KNN Classifier (AQI Category).
"""

import sys
from pathlib import Path
from starlette.testclient import TestClient

# Ensure backend root is on Python path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from main import app


def test_api_root():
    with TestClient(app) as client:
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "AirSense AQI Prediction API"
        assert "Linear Regression" in data["algorithms"]["regression"]
        assert "K-Nearest Neighbors" in data["algorithms"]["classification"]
        print("[PASS] Test 1: GET / passed (Linear Regression & KNN documented)")


def test_health_check():
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["models_loaded"] is True
        assert "Linear Regression" in data["regressor_type"]
        assert "K-Nearest Neighbors" in data["classifier_type"]
        assert data["feature_count"] == 15
        print(f"[PASS] Test 2: GET /health passed (Both models loaded, {data['feature_count']} features supported)")


def test_model_info():
    with TestClient(app) as client:
        response = client.get("/model/info")
        assert response.status_code == 200
        data = response.json()
        assert data["feature_count"] == 15
        assert "PM2.5" in data["expected_features"]
        assert "O3" in data["expected_features"]
        assert "CO" in data["expected_features"]
        assert "Year" in data["expected_features"]
        assert "Satisfactory" in data["supported_buckets"]
        assert len(data["supported_buckets"]) == 6
        print("[PASS] Test 3: GET /model/info passed (15 features & 6 buckets verified)")


def test_predict_full():
    with TestClient(app) as client:
        payload = {
            "PM2.5": 35.0,
            "PM10": 70.0,
            "NO": 5.0,
            "NO2": 20.0,
            "NOx": 25.0,
            "NH3": 10.0,
            "CO": 0.8,
            "SO2": 8.0,
            "O3": 30.0,
            "Benzene": 1.0,
            "Toluene": 5.0,
            "Xylene": 0.5,
            "Year": 2026,
            "Month": 10,
            "Day": 25,
        }
        response = client.post("/predict", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "predicted_aqi" in data
        assert isinstance(data["predicted_aqi"], (int, float))
        assert "predicted_aqi_bucket" in data
        assert data["predicted_aqi_bucket"] in [
            "Good",
            "Satisfactory",
            "Moderate",
            "Poor",
            "Very Poor",
            "Severe",
        ]
        print(f"[PASS] Test 4: POST /predict (Full features) -> AQI={data['predicted_aqi']}, Bucket={data['predicted_aqi_bucket']}")


def test_predict_core_and_auto_impute():
    with TestClient(app) as client:
        # Core 5 pollutants + O3 + CO; secondary trace gases and Date omitted
        payload = {
            "PM2.5": 45.0,
            "PM10": 90.0,
            "NO": 12.0,
            "NO2": 24.0,
            "SO2": 9.0,
            "O3": 28.0,
            "CO": 0.95,
        }
        response = client.post("/predict", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "predicted_aqi" in data
        assert "predicted_aqi_bucket" in data
        print(f"[PASS] Test 5: POST /predict (Core + Auto-imputed) -> AQI={data['predicted_aqi']}, Bucket={data['predicted_aqi_bucket']}")


def test_predict_validation_errors():
    with TestClient(app) as client:
        # Negative value
        neg_res = client.post(
            "/predict",
            json={"PM2.5": -5.0, "PM10": 50.0, "NO": 10.0, "NO2": 10.0, "SO2": 10.0},
        )
        assert neg_res.status_code == 422
        print("[PASS] Test 6: Negative value rejected (HTTP 422)")

        # Missing required core field
        miss_res = client.post(
            "/predict",
            json={"PM2.5": 50.0, "PM10": 50.0},
        )
        assert miss_res.status_code == 422
        print("[PASS] Test 7: Missing required core field rejected (HTTP 422)")

        # String instead of number
        str_res = client.post(
            "/predict",
            json={"PM2.5": "invalid", "PM10": 50.0, "NO": 10.0, "NO2": 10.0, "SO2": 10.0},
        )
        assert str_res.status_code == 422
        print("[PASS] Test 8: Non-numeric value rejected (HTTP 422)")


def test_cors_headers():
    with TestClient(app) as client:
        response = client.options(
            "/predict",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "POST",
            },
        )
        assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"
        print("[PASS] Test 9: CORS configuration verified")


if __name__ == "__main__":
    print("\n--- Running AirSense Backend Tests (Linear Regression + KNN) ---")
    test_api_root()
    test_health_check()
    test_model_info()
    test_predict_full()
    test_predict_core_and_auto_impute()
    test_predict_validation_errors()
    test_cors_headers()
    print("--- All 9 Backend Tests Passed Successfully! ---\n")

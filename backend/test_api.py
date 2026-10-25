"""
Automated Integration and Unit Tests for AirSense FastAPI Backend
Tests model loading, endpoints, input validation, and inference accuracy.
"""

import sys
from pathlib import Path
from starlette.testclient import TestClient

# Ensure backend root is on Python path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from main import app
from model_service import model_service


def test_api_root():
    with TestClient(app) as client:
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "AirSense AQI Prediction API"
        assert "predict" in data["endpoints"]
        print("[PASS] Test 1: GET / passed")


def test_health_check():
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["models_loaded"] is True
        assert data["regressor_available"] is True
        assert data["classifier_available"] is True
        print("[PASS] Test 2: GET /health passed (Models loaded)")


def test_model_info():
    with TestClient(app) as client:
        response = client.get("/model/info")
        assert response.status_code == 200
        data = response.json()
        assert data["expected_features"] == ["PM2.5", "PM10", "NO", "NO2", "SO2"]
        assert "Satisfactory" in data["supported_buckets"]
        assert len(data["supported_buckets"]) == 6
        print("[PASS] Test 3: GET /model/info passed (Features & classes verified)")


def test_predict_valid():
    with TestClient(app) as client:
        payload = {
            "PM2.5": 50.0,
            "PM10": 80.0,
            "NO": 10.0,
            "NO2": 20.0,
            "SO2": 5.0,
        }
        response = client.post("/predict", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "predicted_aqi" in data
        assert isinstance(data["predicted_aqi"], (int, float))
        assert data["predicted_aqi"] > 0
        assert "predicted_aqi_bucket" in data
        assert data["predicted_aqi_bucket"] in [
            "Good",
            "Satisfactory",
            "Moderate",
            "Poor",
            "Very Poor",
            "Severe",
        ]
        assert data["inputs_used"]["PM2.5"] == 50.0
        print(f"[PASS] Test 4: POST /predict valid passed (AQI={data['predicted_aqi']}, Bucket={data['predicted_aqi_bucket']})")


def test_predict_validation_errors():
    with TestClient(app) as client:
        # Negative value
        neg_res = client.post(
            "/predict",
            json={"PM2.5": -5.0, "PM10": 50.0, "NO": 10.0, "NO2": 10.0, "SO2": 10.0},
        )
        assert neg_res.status_code == 422
        print("[PASS] Test 5: Rejection of negative value passed (HTTP 422)")

        # Missing required field
        miss_res = client.post(
            "/predict",
            json={"PM2.5": 50.0, "PM10": 50.0, "NO": 10.0},
        )
        assert miss_res.status_code == 422
        print("[PASS] Test 6: Rejection of missing field passed (HTTP 422)")

        # String instead of number
        str_res = client.post(
            "/predict",
            json={"PM2.5": "invalid", "PM10": 50.0, "NO": 10.0, "NO2": 10.0, "SO2": 10.0},
        )
        assert str_res.status_code == 422
        print("[PASS] Test 7: Rejection of non-numeric value passed (HTTP 422)")


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
        print("[PASS] Test 8: CORS configuration for localhost:5173 verified")


if __name__ == "__main__":
    print("\n--- Running AirSense Backend Tests ---")
    test_api_root()
    test_health_check()
    test_model_info()
    test_predict_valid()
    test_predict_validation_errors()
    test_cors_headers()
    print("--- All 8 Backend Tests Passed Successfully! ---\n")

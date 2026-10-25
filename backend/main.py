"""
FastAPI Main Application for Air Quality Predictor
Exposes REST endpoints for model health, metadata, and real-time AQI prediction.
"""

from contextlib import asynccontextmanager
import logging
import os
from typing import Dict, Any

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from schemas import (
    PredictRequest,
    PredictResponse,
    HealthResponse,
    ModelInfoResponse,
)
from model_service import model_service

# Configure application logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("airsense.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager ensuring models are loaded once at startup.
    """
    logger.info("Starting up Air Quality Predictor API...")
    model_service.load_models()
    yield
    logger.info("Shutting down Air Quality Predictor API...")


app = FastAPI(
    title="AirSense AQI Prediction API",
    version="1.0.0",
    description="FastAPI service serving trained Random Forest regression and classification models for Air Quality Index (AQI) prediction.",
    lifespan=lifespan,
)

# Configure CORS for frontend access
cors_env = os.getenv("CORS_ORIGINS", "")
if cors_env.strip():
    allowed_origins = [origin.strip() for origin in cors_env.split(",") if origin.strip()]
else:
    allowed_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", summary="API Welcome and Overview")
async def root() -> Dict[str, Any]:
    """
    Root endpoint presenting API details and link to interactive documentation.
    """
    return {
        "service": "AirSense AQI Prediction API",
        "version": "1.0.0",
        "status": "online",
        "docs_url": "/docs",
        "endpoints": {
            "health": "/health",
            "model_info": "/model/info",
            "predict": "/predict (POST)",
        },
        "description": "Send 5 pollutant concentrations (PM2.5, PM10, NO, NO2, SO2) to /predict to obtain numerical AQI and category bucket predictions.",
    }


@app.get("/health", response_model=HealthResponse, summary="API and Model Health Check")
async def health_check():
    """
    Inspect the service operational status and verify trained models are loaded.
    """
    is_loaded = model_service.is_loaded
    return HealthResponse(
        status="healthy" if is_loaded else "degraded",
        models_loaded=is_loaded,
        regressor_available=model_service.regressor is not None,
        classifier_available=model_service.classifier is not None,
        message=(
            "Trained regression and classification models are ready for inference."
            if is_loaded
            else f"Models unavailable: {model_service.load_error or 'Startup failure'}"
        ),
    )


@app.get("/model/info", response_model=ModelInfoResponse, summary="Model Metadata")
async def get_model_info():
    """
    Return safe model metadata including input feature names, target outputs, and bucket categories.
    """
    if not model_service.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Model metadata unavailable. Load error: {model_service.load_error}",
        )
    info = model_service.get_info()
    return ModelInfoResponse(**info)


@app.post("/predict", response_model=PredictResponse, summary="Predict AQI & Bucket")
async def predict_aqi(payload: PredictRequest):
    """
    Predict numeric AQI (via Random Forest Regressor) and AQI Category Bucket
    (via Random Forest Classifier) from 5 pollutant measurements.
    """
    if not model_service.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Prediction service is unavailable: {model_service.load_error or 'Models not loaded'}",
        )

    try:
        result = model_service.predict(
            pm2_5=payload.pm2_5,
            pm10=payload.pm10,
            no=payload.no,
            no2=payload.no2,
            so2=payload.so2,
        )
        return PredictResponse(**result)
    except Exception as exc:
        logger.error("Error processing /predict request: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(exc)}",
        )

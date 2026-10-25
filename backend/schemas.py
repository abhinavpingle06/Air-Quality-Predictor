"""
Pydantic Schemas for Air Quality Predictor FastAPI Backend
Supports Linear Regression (Numeric AQI) and KNN Classifier (AQI Category).
Features: PM2.5, PM10, NO, NO2, NOx, NH3, CO, SO2, O3, Benzene, Toluene, Xylene, Year, Month, Day.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
import math
from pydantic import BaseModel, Field, field_validator, ConfigDict


class PredictRequest(BaseModel):
    """
    Request payload containing pollutant concentrations and optional date features.
    Core pollutants (PM2.5, PM10, NO, NO2, SO2) are required.
    O3, CO, NOx, NH3, Benzene, Toluene, Xylene, and Date default gracefully
    or are imputed by the trained model pipeline's SimpleImputer.
    """
    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "PM2.5": 35.0,
                "PM10": 70.0,
                "NO": 5.0,
                "NO2": 20.0,
                "SO2": 8.0,
                "O3": 30.0,
                "CO": 0.8,
                "NOx": 25.0,
                "NH3": 10.0,
                "Benzene": 1.0,
                "Toluene": 5.0,
                "Xylene": 0.5,
                "Year": 2026,
                "Month": 10,
                "Day": 25,
            }
        },
    )

    # Core required pollutants
    pm2_5: float = Field(
        ...,
        alias="PM2.5",
        ge=0.0,
        description="Fine Particulate Matter (PM2.5) in µg/m³ (>= 0)",
    )
    pm10: float = Field(
        ...,
        alias="PM10",
        ge=0.0,
        description="Coarse Particulate Matter (PM10) in µg/m³ (>= 0)",
    )
    no: float = Field(
        ...,
        alias="NO",
        ge=0.0,
        description="Nitrogen Monoxide (NO) in µg/m³ (>= 0)",
    )
    no2: float = Field(
        ...,
        alias="NO2",
        ge=0.0,
        description="Nitrogen Dioxide (NO2) in µg/m³ (>= 0)",
    )
    so2: float = Field(
        ...,
        alias="SO2",
        ge=0.0,
        description="Sulphur Dioxide (SO2) in µg/m³ (>= 0)",
    )

    # Pollutants now supported by Linear Regression & KNN models
    o3: Optional[float] = Field(
        None,
        alias="O3",
        ge=0.0,
        description="Ground-level Ozone (O3) in µg/m³ (imputed if omitted)",
    )
    co: Optional[float] = Field(
        None,
        alias="CO",
        ge=0.0,
        description="Carbon Monoxide (CO) in mg/m³ (imputed if omitted)",
    )

    # Additional secondary pollutants
    nox: Optional[float] = Field(
        None,
        alias="NOx",
        ge=0.0,
        description="Nitrogen Oxides (NOx) in ppb (imputed if omitted)",
    )
    nh3: Optional[float] = Field(
        None,
        alias="NH3",
        ge=0.0,
        description="Ammonia (NH3) in µg/m³ (imputed if omitted)",
    )
    benzene: Optional[float] = Field(
        None,
        alias="Benzene",
        ge=0.0,
        description="Benzene in µg/m³ (imputed if omitted)",
    )
    toluene: Optional[float] = Field(
        None,
        alias="Toluene",
        ge=0.0,
        description="Toluene in µg/m³ (imputed if omitted)",
    )
    xylene: Optional[float] = Field(
        None,
        alias="Xylene",
        ge=0.0,
        description="Xylene in µg/m³ (imputed if omitted)",
    )

    # Date features
    year: Optional[int] = Field(
        None,
        alias="Year",
        ge=2000,
        le=2100,
        description="Observation Year (defaults to current year)",
    )
    month: Optional[int] = Field(
        None,
        alias="Month",
        ge=1,
        le=12,
        description="Observation Month 1-12 (defaults to current month)",
    )
    day: Optional[int] = Field(
        None,
        alias="Day",
        ge=1,
        le=31,
        description="Observation Day 1-31 (defaults to current day)",
    )

    @field_validator("pm2_5", "pm10", "no", "no2", "so2", "o3", "co", "nox", "nh3", "benzene", "toluene", "xylene", mode="after")
    @classmethod
    def validate_finite(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and not math.isfinite(v):
            raise ValueError("Pollutant value must be a finite number (not NaN or Inf).")
        return v


class PredictResponse(BaseModel):
    """
    Response model returning predictions from Linear Regression and KNN Classifier.
    """
    predicted_aqi: float = Field(
        ...,
        description="Predicted numerical Air Quality Index (AQI) from Linear Regression",
    )
    predicted_aqi_bucket: str = Field(
        ...,
        description="Predicted AQI Category Bucket from K-Nearest Neighbors Classifier",
    )
    model_version: str = Field(
        default="lr-knn-v2",
        description="Identifier of the active models",
    )
    algorithms: Dict[str, str] = Field(
        default_factory=lambda: {
            "regression": "Linear Regression (imputer + linear_model)",
            "classification": "K-Nearest Neighbors Classifier (imputer + scaler + knn)",
        },
        description="Algorithms used for regression and classification",
    )
    inputs_used: Dict[str, Any] = Field(
        ...,
        description="Features evaluated by the models",
    )


class HealthResponse(BaseModel):
    """
    Health check payload verifying application and model loading status.
    """
    status: str
    models_loaded: bool
    regressor_type: str
    classifier_type: str
    feature_count: int
    message: str


class ModelInfoResponse(BaseModel):
    """
    Metadata describing the active models and supported features.
    """
    model_version: str
    feature_count: int
    expected_features: List[str]
    target_outputs: List[str]
    supported_buckets: List[str]
    regressor_algorithm: str
    classifier_algorithm: str

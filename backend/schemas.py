"""
Pydantic Schemas for Air Quality Predictor FastAPI Backend
Defines strict validation rules, aliases, and documentation for request and response payloads.
"""

from typing import Dict, List, Optional
import math
from pydantic import BaseModel, Field, field_validator, ConfigDict


class PredictRequest(BaseModel):
    """
    Request payload containing the five required pollutant concentrations.
    All values must be finite, non-negative numerical floats.
    """
    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "PM2.5": 50.0,
                "PM10": 80.0,
                "NO": 10.0,
                "NO2": 20.0,
                "SO2": 5.0,
            }
        },
    )

    pm2_5: float = Field(
        ...,
        alias="PM2.5",
        ge=0.0,
        description="Fine Particulate Matter (PM2.5) concentration in µg/m³ (must be >= 0)",
    )
    pm10: float = Field(
        ...,
        alias="PM10",
        ge=0.0,
        description="Coarse Particulate Matter (PM10) concentration in µg/m³ (must be >= 0)",
    )
    no: float = Field(
        ...,
        alias="NO",
        ge=0.0,
        description="Nitrogen Monoxide (NO) concentration in µg/m³ (must be >= 0)",
    )
    no2: float = Field(
        ...,
        alias="NO2",
        ge=0.0,
        description="Nitrogen Dioxide (NO2) concentration in µg/m³ (must be >= 0)",
    )
    so2: float = Field(
        ...,
        alias="SO2",
        ge=0.0,
        description="Sulphur Dioxide (SO2) concentration in µg/m³ (must be >= 0)",
    )

    @field_validator("pm2_5", "pm10", "no", "no2", "so2", mode="after")
    @classmethod
    def validate_finite(cls, v: float) -> float:
        if not math.isfinite(v):
            raise ValueError("Value must be a finite number (not NaN or Inf).")
        return v


class PredictResponse(BaseModel):
    """
    Response model returning both regression AQI estimate and classification category bucket.
    """
    predicted_aqi: float = Field(
        ...,
        description="Predicted numerical Air Quality Index (AQI) value from regression model",
    )
    predicted_aqi_bucket: str = Field(
        ...,
        description="Predicted AQI Category Bucket (e.g. Good, Satisfactory, Moderate, Poor, Very Poor, Severe)",
    )
    model_version: str = Field(
        default="rf-5-features-v1",
        description="Identifier of the loaded model pipeline",
    )
    inputs_used: Dict[str, float] = Field(
        ...,
        description="Validated input features passed to the models",
    )


class HealthResponse(BaseModel):
    """
    Health check payload verifying application and model loading status.
    """
    status: str
    models_loaded: bool
    regressor_available: bool
    classifier_available: bool
    message: str


class ModelInfoResponse(BaseModel):
    """
    Metadata describing the trained model pipeline and supported features.
    """
    model_version: str
    feature_count: int
    expected_features: List[str]
    target_outputs: List[str]
    supported_buckets: List[str]
    regressor_type: str
    classifier_type: str

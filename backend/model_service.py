"""
Air Quality Model Service
Encapsulates model loading, feature alignment, and inference logic for regression and classification.
"""

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
import joblib
import pandas as pd

logger = logging.getLogger("airsense.model_service")

# Default expected features in exact training order
DEFAULT_FEATURE_COLUMNS = ["PM2.5", "PM10", "NO", "NO2", "SO2"]
MODEL_VERSION = "rf-5-features-v1"


class ModelService:
    """
    Singleton service managing the lifecycle and inference of trained AQI models.
    """

    def __init__(self, base_dir: Optional[Path] = None):
        self.base_dir = base_dir or Path(__file__).resolve().parent
        self.feature_columns: List[str] = DEFAULT_FEATURE_COLUMNS
        self.regressor: Any = None
        self.classifier: Any = None
        self.is_loaded: bool = False
        self.load_error: Optional[str] = None
        self.model_version: str = MODEL_VERSION

    def _resolve_file(self, filename: str) -> Optional[Path]:
        """
        Locate a model file by checking models/ subdirectory first, then base directory.
        """
        candidate_paths = [
            self.base_dir / "models" / filename,
            self.base_dir / filename,
        ]
        for path in candidate_paths:
            if path.exists() and path.is_file():
                return path
        return None

    def load_models(self) -> None:
        """
        Load trained regression and classification models once at startup.
        """
        try:
            logger.info("Initializing model service from base directory: %s", self.base_dir)

            # 1. Load feature columns if available
            cols_path = self._resolve_file("aqi_feature_columns.pkl")
            if cols_path:
                loaded_cols = joblib.load(cols_path)
                if isinstance(loaded_cols, list) and len(loaded_cols) == 5:
                    self.feature_columns = loaded_cols
                    logger.info("Loaded feature columns: %s from %s", self.feature_columns, cols_path.name)
            else:
                logger.warning(
                    "Feature columns file not found. Using default features: %s",
                    self.feature_columns,
                )

            # 2. Load regression model
            reg_path = self._resolve_file("aqi_regressor_5_features.pkl")
            if not reg_path:
                raise FileNotFoundError(
                    "Regression model file 'aqi_regressor_5_features.pkl' not found in models/ or backend/"
                )
            self.regressor = joblib.load(reg_path)
            logger.info("Successfully loaded AQI regressor from %s", reg_path.name)

            # 3. Load classification model
            clf_path = self._resolve_file("aqi_bucket_classifier_5_features.pkl")
            if not clf_path:
                raise FileNotFoundError(
                    "Classification model file 'aqi_bucket_classifier_5_features.pkl' not found in models/ or backend/"
                )
            self.classifier = joblib.load(clf_path)
            logger.info("Successfully loaded AQI classifier from %s", clf_path.name)

            self.is_loaded = True
            self.load_error = None
            logger.info("All AQI models loaded successfully and ready for inference.")

        except Exception as exc:
            self.is_loaded = False
            self.load_error = str(exc)
            logger.error("Failed to load AQI models: %s", exc, exc_info=True)

    def predict(
        self,
        pm2_5: float,
        pm10: float,
        no: float,
        no2: float,
        so2: float,
    ) -> Dict[str, Any]:
        """
        Execute prediction pipeline for both continuous AQI and discrete AQI category.
        """
        if not self.is_loaded:
            raise RuntimeError(
                f"Models are not loaded or failed during startup: {self.load_error or 'Unknown error'}"
            )

        # Prepare DataFrame with exact feature names and order
        data_dict = {
            "PM2.5": [float(pm2_5)],
            "PM10": [float(pm10)],
            "NO": [float(no)],
            "NO2": [float(no2)],
            "SO2": [float(so2)],
        }
        input_df = pd.DataFrame(data_dict, columns=self.feature_columns)

        try:
            # Numerical regression prediction
            raw_aqi = self.regressor.predict(input_df)[0]
            predicted_aqi = round(float(raw_aqi), 2)

            # Categorical classification prediction
            raw_bucket = self.classifier.predict(input_df)[0]
            predicted_bucket = str(raw_bucket)

            return {
                "predicted_aqi": predicted_aqi,
                "predicted_aqi_bucket": predicted_bucket,
                "model_version": self.model_version,
                "inputs_used": {
                    "PM2.5": float(pm2_5),
                    "PM10": float(pm10),
                    "NO": float(no),
                    "NO2": float(no2),
                    "SO2": float(so2),
                },
            }
        except Exception as exc:
            logger.error("Prediction inference failed: %s", exc, exc_info=True)
            raise RuntimeError(f"Model inference failed: {exc}") from exc

    def get_info(self) -> Dict[str, Any]:
        """
        Return safe model metadata for inspection.
        """
        classes = []
        if self.classifier:
            if hasattr(self.classifier, "classes_"):
                classes = [str(c) for c in self.classifier.classes_]
            elif hasattr(self.classifier, "named_steps") and "model" in self.classifier.named_steps:
                inner = self.classifier.named_steps["model"]
                if hasattr(inner, "classes_"):
                    classes = [str(c) for c in inner.classes_]

        reg_name = type(self.regressor).__name__ if self.regressor else "Not loaded"
        clf_name = type(self.classifier).__name__ if self.classifier else "Not loaded"

        return {
            "model_version": self.model_version,
            "feature_count": len(self.feature_columns),
            "expected_features": self.feature_columns,
            "target_outputs": ["AQI (numeric regression)", "AQI_Bucket (classification)"],
            "supported_buckets": classes,
            "regressor_type": reg_name,
            "classifier_type": clf_name,
            "is_loaded": self.is_loaded,
        }


# Global singleton instance
model_service = ModelService()

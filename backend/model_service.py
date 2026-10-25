"""
Air Quality Model Service
Loads and serves Linear Regression (numerical AQI) and KNN Classifier (AQI Category).
Supports 15 features: PM2.5, PM10, NO, NO2, NOx, NH3, CO, SO2, O3, Benzene, Toluene, Xylene, Year, Month, Day.
"""

from datetime import datetime
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
import joblib
import numpy as np
import pandas as pd

logger = logging.getLogger("airsense.model_service")

# Default expected features for Linear Regression and KNN models
DEFAULT_15_FEATURES = [
    "PM2.5", "PM10", "NO", "NO2", "NOx", "NH3", "CO",
    "SO2", "O3", "Benzene", "Toluene", "Xylene",
    "Year", "Month", "Day"
]
MODEL_VERSION = "linear-regression-knn-v2"


class ModelService:
    """
    Singleton service managing the lifecycle and inference of Linear Regression and KNN models.
    """

    def __init__(self, base_dir: Optional[Path] = None):
        self.base_dir = base_dir or Path(__file__).resolve().parent
        self.feature_columns: List[str] = DEFAULT_15_FEATURES
        self.regressor: Any = None
        self.classifier: Any = None
        self.is_loaded: bool = False
        self.load_error: Optional[str] = None
        self.model_version: str = MODEL_VERSION
        self.regressor_name: str = "Linear Regression"
        self.classifier_name: str = "K-Nearest Neighbors (KNN)"

    def _resolve_file(self, filename: str) -> Optional[Path]:
        """
        Locate model file by checking models/ subdirectory first, then base directory.
        """
        candidates = [
            self.base_dir / "models" / filename,
            self.base_dir / filename,
        ]
        for path in candidates:
            if path.exists() and path.is_file():
                return path
        return None

    def load_models(self) -> None:
        """
        Load Linear Regression and KNN Classifier models once at startup.
        """
        try:
            logger.info("Initializing ModelService from %s", self.base_dir)

            # 1. Locate and load Linear Regression model (numeric AQI)
            lr_path = self._resolve_file("linear_regression_aqi_model.pkl")
            if lr_path:
                self.regressor = joblib.load(lr_path)
                self.regressor_name = "Linear Regression"
                logger.info("Loaded Linear Regression AQI model from %s", lr_path.name)
            else:
                # Fallback to Random Forest regressor if not found
                rf_path = self._resolve_file("aqi_regressor_5_features.pkl")
                if rf_path:
                    self.regressor = joblib.load(rf_path)
                    self.regressor_name = "Random Forest Regressor (5-feature fallback)"
                    logger.warning("Linear Regression not found. Loaded fallback RF regressor: %s", rf_path.name)
                else:
                    raise FileNotFoundError("Could not find linear_regression_aqi_model.pkl")

            # 2. Locate and load KNN Classifier (AQI category bucket)
            knn_path = self._resolve_file("knn_aqi_category_model.pkl")
            if knn_path:
                self.classifier = joblib.load(knn_path)
                self.classifier_name = "K-Nearest Neighbors (KNN Classifier)"
                logger.info("Loaded KNN Category model from %s", knn_path.name)
            else:
                # Fallback to Random Forest classifier if not found
                rf_clf_path = self._resolve_file("aqi_bucket_classifier_5_features.pkl")
                if rf_clf_path:
                    self.classifier = joblib.load(rf_clf_path)
                    self.classifier_name = "Random Forest Classifier (5-feature fallback)"
                    logger.warning("KNN Classifier not found. Loaded fallback RF classifier: %s", rf_clf_path.name)
                else:
                    raise FileNotFoundError("Could not find knn_aqi_category_model.pkl")

            # 3. Align feature names directly from the loaded model
            if hasattr(self.regressor, "feature_names_in_"):
                self.feature_columns = list(self.regressor.feature_names_in_)
            elif hasattr(self.classifier, "feature_names_in_"):
                self.feature_columns = list(self.classifier.feature_names_in_)
            else:
                self.feature_columns = DEFAULT_15_FEATURES

            logger.info("Aligned feature columns (%d features): %s", len(self.feature_columns), self.feature_columns)

            self.is_loaded = True
            self.load_error = None
            logger.info("Models loaded successfully: %s + %s", self.regressor_name, self.classifier_name)

        except Exception as exc:
            self.is_loaded = False
            self.load_error = str(exc)
            logger.error("Failed to load models: %s", exc, exc_info=True)

    def predict(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute prediction pipeline for both continuous AQI (Linear Regression)
        and discrete category (KNN Classifier).
        """
        if not self.is_loaded:
            raise RuntimeError(
                f"Models are not loaded or failed during startup: {self.load_error or 'Unknown error'}"
            )

        now = datetime.now()
        year_val = input_data.get("Year") or input_data.get("year") or now.year
        month_val = input_data.get("Month") or input_data.get("month") or now.month
        day_val = input_data.get("Day") or input_data.get("day") or now.day

        # Build feature dictionary aligned to self.feature_columns
        row: Dict[str, Any] = {}
        for col in self.feature_columns:
            if col == "Year":
                row["Year"] = float(year_val)
            elif col == "Month":
                row["Month"] = float(month_val)
            elif col == "Day":
                row["Day"] = float(day_val)
            else:
                # Check direct or lowercase/alias key
                val = input_data.get(col)
                if val is None:
                    # check normalized key
                    alt_key = col.lower().replace(".", "_")
                    val = input_data.get(alt_key)
                
                # If value is present, cast to float; else pass np.nan for pipeline's SimpleImputer
                if val is not None and val != "":
                    try:
                        row[col] = float(val)
                    except (ValueError, TypeError):
                        row[col] = np.nan
                else:
                    row[col] = np.nan

        input_df = pd.DataFrame([row], columns=self.feature_columns)

        try:
            # 1. Linear Regression predicted AQI
            raw_aqi = self.regressor.predict(input_df)[0]
            predicted_aqi = round(float(raw_aqi), 2)

            # 2. KNN Classifier predicted category bucket
            raw_bucket = self.classifier.predict(input_df)[0]
            predicted_bucket = str(raw_bucket)

            # Filter inputs for safe readable return
            clean_inputs = {
                k: (round(v, 4) if isinstance(v, float) and not np.isnan(v) else ("Auto-Imputed" if np.isnan(v) else v))
                for k, v in row.items()
            }

            return {
                "predicted_aqi": predicted_aqi,
                "predicted_aqi_bucket": predicted_bucket,
                "model_version": self.model_version,
                "algorithms": {
                    "regression": self.regressor_name,
                    "classification": self.classifier_name,
                },
                "inputs_used": clean_inputs,
            }
        except Exception as exc:
            logger.error("Inference execution failed: %s", exc, exc_info=True)
            raise RuntimeError(f"Prediction inference failed: {exc}") from exc

    def get_info(self) -> Dict[str, Any]:
        """
        Return model metadata for inspection.
        """
        classes = []
        if self.classifier:
            if hasattr(self.classifier, "classes_"):
                classes = [str(c) for c in self.classifier.classes_]
            elif hasattr(self.classifier, "named_steps") and "model" in self.classifier.named_steps:
                inner = self.classifier.named_steps["model"]
                if hasattr(inner, "classes_"):
                    classes = [str(c) for c in inner.classes_]

        return {
            "model_version": self.model_version,
            "feature_count": len(self.feature_columns),
            "expected_features": self.feature_columns,
            "target_outputs": ["AQI (Linear Regression)", "AQI_Bucket (KNN Classifier)"],
            "supported_buckets": classes,
            "regressor_algorithm": self.regressor_name,
            "classifier_algorithm": self.classifier_name,
            "is_loaded": self.is_loaded,
        }


# Global singleton instance
model_service = ModelService()

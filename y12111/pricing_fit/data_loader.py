from typing import Any, Dict, List, Optional, Union
"""Data loading module for package prices, conversion records, and trial durations."""

import hashlib
import json
from pathlib import Path

import numpy as np
import pandas as pd


class DataLoader:
    """Load and validate pricing analysis data from input directory."""
    
    REQUIRED_FILES_STAGE1 = {
        "packages": "packages.csv",
        "conversions": "conversions.csv",
    }
    
    REQUIRED_FILES_STAGE2 = {
        "packages": "packages.csv",
        "conversions": "conversions.csv",
        "trials": "trials.csv",
    }
    
    def __init__(self, input_dir: Path) -> None:
        self.input_dir = input_dir
    
    def load(self, stage: str) -> Dict[str, pd.DataFrame]:
        """Load data based on the stage."""
        if stage == "stage1":
            files = self.REQUIRED_FILES_STAGE1
        elif stage == "stage2":
            files = self.REQUIRED_FILES_STAGE2
        else:
            raise ValueError(f"Unknown stage: {stage}")
        
        for key, filename in files.items():
            filepath = self.input_dir / filename
            if not filepath.exists():
                raise FileNotFoundError(f"Required file not found: {filepath}")
        
        data = {}
        for key, filename in files.items():
            filepath = self.input_dir / filename
            df = self._load_csv(filepath, key)
            data[key] = df
        
        self._validate_data(data, stage)
        data = self._enrich_data(data, stage)
        
        return data
    
    def _load_csv(self, filepath: Path, data_type: str) -> pd.DataFrame:
        """Load a CSV file with appropriate type inference."""
        df = pd.read_csv(filepath)
        
        if data_type == "packages":
            df = self._validate_packages(df)
        elif data_type == "conversions":
            df = self._validate_conversions(df)
        elif data_type == "trials":
            df = self._validate_trials(df)
        
        return df
    
    def _validate_packages(self, df: pd.DataFrame) -> pd.DataFrame:
        """Validate packages data structure."""
        required_cols = ["package_id", "price", "name", "tier"]
        for col in required_cols:
            if col not in df.columns:
                raise ValueError(f"packages.csv missing required column: {col}")
        
        if df["price"].min() < 0:
            raise ValueError("Package prices cannot be negative")
        
        if df["package_id"].duplicated().any():
            raise ValueError("Duplicate package_id found in packages.csv")
        
        return df
    
    def _validate_conversions(self, df: pd.DataFrame) -> pd.DataFrame:
        """Validate conversions data structure."""
        required_cols = ["record_id", "customer_id", "package_id", "price",
                        "quantity", "converted", "date"]
        for col in required_cols:
            if col not in df.columns:
                raise ValueError(f"conversions.csv missing required column: {col}")
        
        if df["price"].min() < 0:
            raise ValueError("Conversion prices cannot be negative")
        
        if df["quantity"].min() < 0:
            raise ValueError("Quantities cannot be negative")
        
        if df["record_id"].duplicated().any():
            raise ValueError("Duplicate record_id found in conversions.csv")
        
        df["date"] = pd.to_datetime(df["date"])
        
        if "discount" not in df.columns:
            df["discount"] = 0.0
        
        if "customer_segment" not in df.columns:
            df["customer_segment"] = "unknown"
        
        if "region" not in df.columns:
            df["region"] = "unknown"
        
        return df
    
    def _validate_trials(self, df: pd.DataFrame) -> pd.DataFrame:
        """Validate trials data structure."""
        required_cols = ["customer_id", "trial_start_date", "trial_duration_days"]
        for col in required_cols:
            if col not in df.columns:
                raise ValueError(f"trials.csv missing required column: {col}")
        
        if df["trial_duration_days"].min() < 0:
            raise ValueError("Trial durations cannot be negative")
        
        df["trial_start_date"] = pd.to_datetime(df["trial_start_date"])
        
        if "converted_to_paid" not in df.columns:
            df["converted_to_paid"] = False
        
        return df
    
    def _validate_data(self, data: Dict[str, pd.DataFrame], stage: str) -> None:
        """Validate cross-file consistency."""
        packages = data["packages"]
        conversions = data["conversions"]
        
        invalid_package_ids = conversions[~conversions["package_id"].isin(packages["package_id"])]
        if not invalid_package_ids.empty:
            raise ValueError(
                f"Found {len(invalid_package_ids)} conversion records with invalid package_id: "
                f"{invalid_package_ids['package_id'].unique()[:5].tolist()}"
            )
        
        if len(conversions) < 10:
            raise ValueError(f"Too few conversion records: {len(conversions)}. Minimum required: 10")
        
        if stage == "stage2" and "trials" in data:
            trials = data["trials"]
            trial_cust = set(trials["customer_id"])
            conv_cust = set(conversions["customer_id"])
            overlap = trial_cust & conv_cust
            if len(overlap) < 5:
                raise ValueError(
                    f"Too few overlapping customers between trials and conversions: {len(overlap)}. "
                    f"Minimum required: 5"
                )
    
    def _enrich_data(self, data: Dict[str, pd.DataFrame], stage: str) -> Dict[str, pd.DataFrame]:
        """Enrich data with derived features."""
        packages = data["packages"]
        conversions = data["conversions"].copy()
        
        pkg_price_map = dict(zip(packages["package_id"], packages["price"]))
        conversions["base_price"] = conversions["package_id"].map(pkg_price_map)
        conversions["discount_pct"] = np.where(
            conversions["base_price"] > 0,
            (conversions["base_price"] - conversions["price"]) / conversions["base_price"],
            0.0
        )
        conversions["has_discount"] = conversions["discount_pct"] > 0.01
        conversions["revenue"] = conversions["price"] * conversions["quantity"]
        conversions["unit_price"] = np.where(
            conversions["quantity"] > 0,
            conversions["revenue"] / conversions["quantity"],
            conversions["price"]
        )
        conversions["log_price"] = np.log(conversions["price"].clip(lower=1))
        conversions["log_quantity"] = np.log(conversions["quantity"].clip(lower=1))
        
        if stage == "stage2" and "trials" in data:
            trials = data["trials"].copy()
            trial_map = trials.groupby("customer_id").agg(
                trial_duration=("trial_duration_days", "mean"),
                had_trial=("customer_id", "count"),
                trial_converted=("converted_to_paid", "max")
            ).reset_index()
            trial_map["had_trial"] = trial_map["had_trial"] > 0
            
            conversions = conversions.merge(
                trial_map,
                on="customer_id",
                how="left"
            )
            conversions["had_trial"] = conversions["had_trial"].fillna(False)
            conversions["trial_duration"] = conversions["trial_duration"].fillna(0)
            conversions["trial_converted"] = conversions["trial_converted"].fillna(False)
            
            data["trials"] = trials
        
        data["conversions"] = conversions
        return data
    
    def get_data_hash(self, stage: str) -> str:
        """Generate a hash of the data to detect changes."""
        files = self.REQUIRED_FILES_STAGE2 if stage == "stage2" else self.REQUIRED_FILES_STAGE1
        
        hasher = hashlib.md5()
        for key, filename in files.items():
            filepath = self.input_dir / filename
            if filepath.exists():
                hasher.update(filepath.read_bytes())
        
        return hasher.hexdigest()
    
    def get_summary(self, data: Dict[str, pd.DataFrame]) -> Dict[str, Any]:
        """Generate a summary of the loaded data."""
        conversions = data["conversions"]
        packages = data["packages"]
        
        def _to_iso(val):
            if hasattr(val, 'isoformat'):
                return val.isoformat()
            return str(val)
        
        summary = {
            "package_count": len(packages),
            "conversion_count": len(conversions),
            "customer_count": conversions["customer_id"].nunique(),
            "date_range": {
                "start": _to_iso(conversions["date"].min()),
                "end": _to_iso(conversions["date"].max()),
            },
            "conversion_rate": conversions["converted"].mean(),
            "total_revenue": conversions["revenue"].sum(),
            "avg_price": conversions["price"].mean(),
            "avg_quantity": conversions["quantity"].mean(),
            "price_range": {
                "min": float(conversions["price"].min()),
                "max": float(conversions["price"].max()),
                "median": float(conversions["price"].median()),
            },
            "discount_count": int(conversions["has_discount"].sum()),
            "discount_pct": float(conversions["has_discount"].mean()),
        }
        
        if "trials" in data:
            trials = data["trials"]
            summary.update({
                "trial_count": len(trials),
                "avg_trial_duration": float(trials["trial_duration_days"].mean()),
                "trial_conversion_rate": float(trials["converted_to_paid"].mean()),
            })
        
        return summary

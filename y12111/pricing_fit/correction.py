from typing import Any, Dict, List, Optional, Union
"""Manual correction management for conversion records."""

import json
from pathlib import Path
from copy import deepcopy

import numpy as np
import pandas as pd


class CorrectionManager:
    """Manage manual corrections to conversion records and result comparisons."""
    
    def __init__(self, output_dir: Path) -> None:
        self.output_dir = output_dir
        self.correction_log_file = output_dir / "correction_log.json"
        self._load_correction_log()
    
    def _load_correction_log(self) -> None:
        """Load the correction log from file."""
        if self.correction_log_file.exists():
            with open(self.correction_log_file) as f:
                self.correction_log = json.load(f)
        else:
            self.correction_log = []
    
    def _save_correction_log(self) -> None:
        """Save the correction log to file."""
        with open(self.correction_log_file, "w") as f:
            json.dump(self.correction_log, f, indent=2, default=str)
    
    def get_correction_log(self) -> List[dict[str, Any]]:
        """Get the full correction log."""
        return self.correction_log
    
    def find_record(self, record_id: str) -> Optional[Dict[str, Any]]:
        """Find a conversion record by ID across all runs."""
        runs = self.list_all_runs()
        
        for run in runs:
            conversions = self._extract_conversions_from_run(run)
            if conversions is not None:
                for _, row in conversions.iterrows():
                    if str(row.get("record_id")) == str(record_id):
                        return row.to_dict()
        
        latest = self.load_run("latest_original")
        if latest and "original_data" in latest:
            conversions = pd.DataFrame(latest["original_data"].get("conversions", []))
            if not conversions.empty and "record_id" in conversions.columns:
                match = conversions[conversions["record_id"].astype(str) == str(record_id)]
                if not match.empty:
                    return match.iloc[0].to_dict()
        
        return None
    
    def _extract_conversions_from_run(self, run: Dict[str, Any]) -> Optional[pd.DataFrame]:
        """Extract conversions DataFrame from a run result."""
        df = None
        if "original_data" in run:
            conv_data = run["original_data"].get("conversions")
            if isinstance(conv_data, list):
                df = pd.DataFrame(conv_data)
            elif isinstance(conv_data, dict):
                df = pd.DataFrame.from_dict(conv_data)
        
        if df is None and "data_summary" in run and "corrected_conversions" in run:
            df = pd.DataFrame(run["corrected_conversions"])
        
        if df is not None and "date" in df.columns:
            df["date"] = pd.to_datetime(df["date"])
        
        return df
    
    def apply_correction(self, record_id: str, field: str, new_value: str,
                        reason: str) -> Dict[str, Any]:
        """Apply a correction to a conversion record."""
        latest = self.load_run("latest_original")
        if not latest:
            raise ValueError("No original run found. Run 'pricing-fit fit' first.")
        
        conversions_df = self._extract_conversions_from_run(latest)
        if conversions_df is None:
            if "original_data" in latest and isinstance(latest["original_data"].get("conversions"), list):
                conversions_df = pd.DataFrame(latest["original_data"]["conversions"])
            else:
                raise ValueError("Could not find original conversion data")
        
        original_record = conversions_df[
            conversions_df["record_id"].astype(str) == str(record_id)
        ]
        
        if original_record.empty:
            raise ValueError(f"Record {record_id} not found in original data")
        
        old_value = original_record.iloc[0][field]
        
        converted_value = self._convert_value(new_value, field, conversions_df[field].dtype)
        
        conversions_df.loc[
            conversions_df["record_id"].astype(str) == str(record_id),
            field
        ] = converted_value
        
        correction_entry = {
            "correction_number": len(self.correction_log) + 1,
            "timestamp": pd.Timestamp.now().isoformat(),
            "record_id": record_id,
            "field": field,
            "old_value": str(old_value),
            "new_value": str(new_value),
            "converted_value": str(converted_value),
            "reason": reason,
        }
        
        self.correction_log.append(correction_entry)
        self._save_correction_log()
        
        return {
            "conversions": conversions_df,
            "original_results": latest,
            "correction": correction_entry,
            "meta": {
                "input_dir": latest.get("params", {}).get("input_dir", ""),
                "stage": latest.get("stage", "stage1"),
                "params": latest.get("params", {}),
            },
        }
    
    def _convert_value(self, value: str, field: str, dtype: np.dtype) -> Any:
        """Convert string value to appropriate data type."""
        if np.issubdtype(dtype, np.integer):
            try:
                return int(value)
            except ValueError:
                return 0
        elif np.issubdtype(dtype, np.floating):
            try:
                return float(value)
            except ValueError:
                return 0.0
        elif np.issubdtype(dtype, np.bool_):
            return value.lower() in ("true", "1", "yes")
        elif np.issubdtype(dtype, np.datetime64):
            return pd.to_datetime(value)
        else:
            return value
    
    def load_run(self, run_identifier: str) -> Optional[Dict[str, Any]]:
        """Load a specific run by hash or special identifier."""
        if run_identifier == "latest":
            return self._load_latest_run()
        elif run_identifier == "latest_original":
            return self._load_latest_run(original_only=True)
        elif run_identifier == "latest_corrected":
            return self._load_latest_run(corrected_only=True)
        
        return self._load_run_by_hash(run_identifier)
    
    def _load_latest_run(self, original_only: bool = False,
                        corrected_only: bool = False) -> Optional[Dict[str, Any]]:
        """Load the most recent run, optionally filtered by type."""
        runs = self.list_all_runs()
        
        for run in runs:
            if original_only and run.get("is_corrected"):
                continue
            if corrected_only and not run.get("is_corrected"):
                continue
            return run
        
        return None
    
    def _load_run_by_hash(self, run_hash: str) -> Optional[Dict[str, Any]]:
        """Load a specific run by its hash."""
        runs = self.list_all_runs()
        
        for run in runs:
            if run.get("run_hash", "").startswith(run_hash):
                return run
        
        return None
    
    def list_all_runs(self) -> List[dict[str, Any]]:
        """List all available runs sorted by timestamp (newest first)."""
        runs = []
        
        run_dirs = sorted(
            self.output_dir.glob("run_*"),
            key=lambda p: p.name,
            reverse=True
        )
        
        for run_dir in run_dirs:
            results_file = run_dir / "results.json"
            if results_file.exists():
                try:
                    with open(results_file) as f:
                        run_data = json.load(f)
                    run_data["run_dir"] = str(run_dir)
                    runs.append(run_data)
                except Exception:
                    continue
        
        return runs
    
    def get_comparison_data(self, run1: Dict[str, Any], run2: Dict[str, Any]) -> Dict[str, Any]:
        """Get structured comparison data between two runs."""
        fit1 = run1.get("fit_results", {})
        fit2 = run2.get("fit_results", {})
        anom1 = run1.get("anomaly_report", {})
        anom2 = run2.get("anomaly_report", {})
        sens1 = run1.get("sensitivity_results", {})
        sens2 = run2.get("sensitivity_results", {})
        
        comparison = {
            "metrics": [],
            "parameters": [],
            "elasticity": [],
            "data_quality": [],
        }
        
        metrics = [
            ("R² 分数", "r2_score", fit1.get("r2_score"), fit2.get("r2_score"), True),
            ("RMSE", "rmse", fit1.get("rmse"), fit2.get("rmse"), True),
            ("模型类型", "model_type", fit1.get("model_type"), fit2.get("model_type"), False),
            ("异常值数量", "outliers", len(anom1.get("outliers", [])), len(anom2.get("outliers", [])), True),
            ("大客户数量", "large_customers", len(anom1.get("large_customers", [])), len(anom2.get("large_customers", [])), True),
            ("折扣记录数", "discounts", len(anom1.get("discount_records", [])), len(anom2.get("discount_records", [])), True),
            ("稀疏组数", "sparse_groups", len(anom1.get("sparse_groups", [])), len(anom2.get("sparse_groups", [])), True),
        ]
        
        for name, key, v1, v2, numeric in metrics:
            if numeric and v1 is not None and v2 is not None:
                diff = v2 - v1
                pct = (diff / v1 * 100) if v1 != 0 else float("inf")
                comparison["metrics"].append({
                    "name": name,
                    "key": key,
                    "value1": v1,
                    "value2": v2,
                    "diff": diff,
                    "pct_change": pct,
                    "improved": (key == "r2_score" and diff > 0) or (key != "r2_score" and diff < 0),
                })
            else:
                comparison["metrics"].append({
                    "name": name,
                    "key": key,
                    "value1": v1,
                    "value2": v2,
                    "changed": v1 != v2,
                })
        
        params1 = fit1.get("parameters", {})
        params2 = fit2.get("parameters", {})
        
        all_param_keys = set(params1.keys()) | set(params2.keys())
        for key in sorted(all_param_keys):
            if key.endswith("_std"):
                continue
            v1 = params1.get(key)
            v2 = params2.get(key)
            if isinstance(v1, (int, float)) and isinstance(v2, (int, float)):
                diff = v2 - v1
                pct = (diff / v1 * 100) if v1 != 0 else float("inf")
                comparison["parameters"].append({
                    "name": key,
                    "value1": v1,
                    "value2": v2,
                    "diff": diff,
                    "pct_change": pct,
                })
        
        e1 = fit1.get("elasticity", {})
        e2 = fit2.get("elasticity", {})
        
        for key in ["at_mean", "at_median", "average"]:
            v1 = e1.get(key)
            v2 = e2.get(key)
            if isinstance(v1, (int, float)) and isinstance(v2, (int, float)):
                diff = v2 - v1
                comparison["elasticity"].append({
                    "name": key,
                    "value1": v1,
                    "value2": v2,
                    "diff": diff,
                })
        
        ds1 = run1.get("data_summary", {})
        ds2 = run2.get("data_summary", {})
        
        for key in ["conversion_count", "customer_count", "total_revenue", "avg_price"]:
            v1 = ds1.get(key)
            v2 = ds2.get(key)
            if isinstance(v1, (int, float)) and isinstance(v2, (int, float)):
                diff = v2 - v1
                pct = (diff / v1 * 100) if v1 != 0 else float("inf")
                comparison["data_quality"].append({
                    "name": key,
                    "value1": v1,
                    "value2": v2,
                    "diff": diff,
                    "pct_change": pct,
                })
        
        return comparison
    
    def save_corrected_data(self, corrected_conversions: pd.DataFrame,
                           original_results: Dict[str, Any],
                           correction_info: Dict[str, Any]) -> Path:
        """Save corrected data for re-fitting."""
        run_hash = f"corrected_{correction_info['correction_number']}"
        run_dir = self.output_dir / f"run_{run_hash}"
        run_dir.mkdir(parents=True, exist_ok=True)
        
        corrected_data = {
            "conversions": corrected_conversions.to_dict("records"),
            "packages": original_results.get("original_data", {}).get("packages", []),
        }
        
        data_file = run_dir / "corrected_data.json"
        with open(data_file, "w") as f:
            json.dump(corrected_data, f, indent=2, default=str)
        
        return data_file

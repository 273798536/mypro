from typing import Any, Dict, List, Optional, Union
"""Anomaly detection module for handling edge cases in pricing data."""


import numpy as np
import pandas as pd
from sklearn.covariance import EllipticEnvelope
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler


class AnomalyDetector:
    """Detect anomalies, large customers, discounts, and sparse groups."""
    
    def __init__(self, threshold: float = 3.0, random_seed: int = 42) -> None:
        self.threshold = threshold
        self.random_seed = random_seed
        self.large_customer_percentile = 95
        self.min_group_size = 5
    
    def detect(self, data: Dict[str, pd.DataFrame]) -> Dict[str, Any]:
        """Run comprehensive anomaly detection."""
        conversions = data["conversions"]
        
        outliers = self._detect_statistical_outliers(conversions)
        outliers.extend(self._detect_multivariate_outliers(conversions))
        
        outliers = self._dedupe_outliers(outliers)
        
        large_customers = self._detect_large_customers(conversions)
        discount_records = self._detect_discount_records(conversions)
        sparse_groups = self._detect_sparse_groups(conversions)
        
        return {
            "outliers": outliers,
            "large_customers": large_customers,
            "discount_records": discount_records,
            "sparse_groups": sparse_groups,
            "summary": {
                "outlier_count": len(outliers),
                "large_customer_count": len(large_customers),
                "discount_count": len(discount_records),
                "sparse_group_count": len(sparse_groups),
            },
        }
    
    def _detect_statistical_outliers(self, df: pd.DataFrame) -> List[dict[str, Any]]:
        """Detect outliers using z-score method."""
        outliers = []
        
        numeric_cols = ["price", "quantity", "revenue", "unit_price", "discount_pct"]
        
        for col in numeric_cols:
            if col not in df.columns:
                continue
            
            values = df[col].dropna()
            if len(values) < 2:
                continue
            
            mean = values.mean()
            std = values.std()
            
            if std == 0:
                continue
            
            z_scores = (df[col] - mean) / std
            
            mask = z_scores.abs() > self.threshold
            for idx in df[mask].index:
                record = df.loc[idx]
                outliers.append({
                    "record_id": record["record_id"],
                    "customer_id": record["customer_id"],
                    "field": col,
                    "value": float(record[col]),
                    "z_score": float(z_scores.loc[idx]),
                    "mean": float(mean),
                    "std": float(std),
                    "reason": f"{col}超出{self.threshold}σ范围",
                    "method": "z-score",
                })
        
        return outliers
    
    def _detect_multivariate_outliers(self, df: pd.DataFrame) -> List[dict[str, Any]]:
        """Detect multivariate outliers using Isolation Forest and Elliptic Envelope."""
        outliers = []
        
        feature_cols = ["price", "quantity", "revenue", "unit_price", "discount_pct"]
        features = df[feature_cols].fillna(0)
        
        if len(features) < 10:
            return outliers
        
        scaler = StandardScaler()
        features_scaled = scaler.fit_transform(features)
        
        iso_forest = IsolationForest(
            contamination=0.05,
            random_state=self.random_seed,
            n_estimators=100,
        )
        iso_preds = iso_forest.fit_predict(features_scaled)
        iso_scores = iso_forest.score_samples(features_scaled)
        
        try:
            elliptic = EllipticEnvelope(
                contamination=0.05,
                random_state=self.random_seed,
                support_fraction=0.7,
            )
            ell_preds = elliptic.fit_predict(features_scaled)
        except Exception:
            ell_preds = np.ones(len(features))
        
        for i, (iso_pred, ell_pred, iso_score) in enumerate(zip(iso_preds, ell_preds, iso_scores)):
            if iso_pred == -1 and ell_pred == -1:
                record = df.iloc[i]
                outliers.append({
                    "record_id": record["record_id"],
                    "customer_id": record["customer_id"],
                    "field": "multivariate",
                    "value": None,
                    "z_score": None,
                    "anomaly_score": float(-iso_score),
                    "reason": "多变量联合异常（Isolation Forest + Elliptic Envelope）",
                    "method": "multivariate",
                })
        
        return outliers
    
    def _dedupe_outliers(self, outliers: List[dict[str, Any]]) -> List[dict[str, Any]]:
        """Remove duplicate outliers for the same record."""
        seen = {}
        for outlier in outliers:
            rid = outlier["record_id"]
            if rid not in seen:
                seen[rid] = outlier
            else:
                existing = seen[rid]
                if outlier.get("anomaly_score", 0) > existing.get("anomaly_score", 0):
                    seen[rid] = outlier
        
        return list(seen.values())
    
    def _detect_large_customers(self, df: pd.DataFrame) -> List[dict[str, Any]]:
        """Detect abnormally large customers."""
        large_customers = []
        
        customer_metrics = df.groupby("customer_id").agg(
            total_revenue=("revenue", "sum"),
            total_quantity=("quantity", "sum"),
            order_count=("record_id", "count"),
            arpu=("revenue", "mean"),
            max_single_order=("revenue", "max"),
        ).reset_index()
        
        revenue_threshold = np.percentile(customer_metrics["total_revenue"], self.large_customer_percentile)
        quantity_threshold = np.percentile(customer_metrics["total_quantity"], self.large_customer_percentile)
        
        for _, row in customer_metrics.iterrows():
            is_large = (
                row["total_revenue"] > revenue_threshold
                or row["total_quantity"] > quantity_threshold
                or row["max_single_order"] > np.percentile(df["revenue"], 99)
            )
            
            if is_large:
                large_customers.append({
                    "customer_id": row["customer_id"],
                    "total_revenue": float(row["total_revenue"]),
                    "total_quantity": float(row["total_quantity"]),
                    "order_count": int(row["order_count"]),
                    "arpu": float(row["arpu"]),
                    "quantity": float(row["total_quantity"]),
                    "revenue_multiple": float(row["total_revenue"] / customer_metrics["total_revenue"].median()),
                    "is_extreme": row["total_revenue"] > revenue_threshold * 2,
                })
        
        large_customers.sort(key=lambda x: x["total_revenue"], reverse=True)
        return large_customers
    
    def _detect_discount_records(self, df: pd.DataFrame) -> List[dict[str, Any]]:
        """Detect records with discounts applied."""
        discount_records = []
        
        discount_mask = df["has_discount"]
        for _, row in df[discount_mask].iterrows():
            discount_records.append({
                "record_id": row["record_id"],
                "customer_id": row["customer_id"],
                "package_id": row["package_id"],
                "base_price": float(row["base_price"]),
                "actual_price": float(row["price"]),
                "discount_pct": float(row["discount_pct"]),
                "discount_amount": float(row["base_price"] - row["price"]),
                "quantity": float(row["quantity"]),
                "revenue": float(row["revenue"]),
            })
        
        discount_records.sort(key=lambda x: x["discount_pct"], reverse=True)
        return discount_records
    
    def _detect_sparse_groups(self, df: pd.DataFrame) -> List[dict[str, Any]]:
        """Detect groups with insufficient sample size."""
        sparse_groups = []
        
        group_fields = ["package_id", "customer_segment", "region"]
        
        if "had_trial" in df.columns:
            group_fields.append("had_trial")
        
        for field in group_fields:
            if field not in df.columns:
                continue
            
            counts = df[field].value_counts()
            for group, count in counts.items():
                if count < self.min_group_size:
                    sparse_groups.append({
                        "group_field": field,
                        "group": str(group),
                        "count": int(count),
                        "min_required": self.min_group_size,
                        "deficit": self.min_group_size - count,
                    })
        
        return sparse_groups
    
    def remove_outliers(self, data: Dict[str, pd.DataFrame], 
                       anomaly_report: Dict[str, Any]) -> Dict[str, pd.DataFrame]:
        """Remove detected outliers from the data."""
        conversions = data["conversions"].copy()
        outlier_ids = {o["record_id"] for o in anomaly_report["outliers"]}
        
        if outlier_ids:
            conversions = conversions[~conversions["record_id"].isin(outlier_ids)]
            conversions = conversions.reset_index(drop=True)
        
        result = {
            "conversions": conversions,
            "packages": data["packages"],
        }
        
        if "trials" in data:
            result["trials"] = data["trials"]
        
        return result
    
    def remove_large_customers(self, data: Dict[str, pd.DataFrame],
                               anomaly_report: Dict[str, Any],
                               remove_extreme_only: bool = True) -> Dict[str, pd.DataFrame]:
        """Remove large customers from the data."""
        conversions = data["conversions"].copy()
        
        if remove_extreme_only:
            large_customer_ids = {
                lc["customer_id"] for lc in anomaly_report["large_customers"]
                if lc.get("is_extreme", False)
            }
        else:
            large_customer_ids = {lc["customer_id"] for lc in anomaly_report["large_customers"]}
        
        if large_customer_ids:
            conversions = conversions[~conversions["customer_id"].isin(large_customer_ids)]
            conversions = conversions.reset_index(drop=True)
        
        result = {
            "conversions": conversions,
            "packages": data["packages"],
        }
        
        if "trials" in data:
            result["trials"] = data["trials"]
        
        return result

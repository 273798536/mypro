import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, field
from statsmodels.tsa.seasonal import STL
from scipy import stats


@dataclass
class AnomalyPoint:
    timestamp: pd.Timestamp
    value: float
    trend: float
    seasonal: float
    residual: float
    anomaly_type: str
    severity: str
    z_score: float
    threshold: float
    confidence: float


@dataclass
class DecompositionResult:
    original_data: pd.DataFrame
    trend: pd.Series
    seasonal: pd.Series
    residual: pd.Series
    anomalies: List[AnomalyPoint]
    anomaly_df: pd.DataFrame
    stats: Dict
    params: Dict


class TrendDecomposer:
    def __init__(self, seasonal_period: int = 24, anomaly_threshold: float = 3.0,
                 robust: bool = True):
        self.seasonal_period = seasonal_period
        self.anomaly_threshold = anomaly_threshold
        self.robust = robust

    def decompose(self, df: pd.DataFrame, value_col: str = 'value',
                  timestamp_col: str = 'timestamp') -> DecompositionResult:
        data = df.copy()
        data = data.sort_values(timestamp_col).reset_index(drop=True)

        data = data.set_index(timestamp_col)
        ts = data[value_col].astype(float)

        if ts.isnull().any():
            ts = ts.interpolate(method='time')

        try:
            stl = STL(ts, period=self.seasonal_period, robust=self.robust)
            result = stl.fit()
        except Exception as e:
            print(f"STL decomposition failed: {e}, using fallback method")
            result = self._fallback_decomposition(ts)

        trend = result.trend
        seasonal = result.seasonal
        residual = result.resid

        anomalies, anomaly_df = self._detect_anomalies(
            residual, ts, trend, seasonal, data.index
        )

        stats = self._calculate_stats(ts, trend, seasonal, residual, anomalies)

        decomposed_df = pd.DataFrame({
            'timestamp': data.index,
            'original': ts.values,
            'trend': trend.values,
            'seasonal': seasonal.values,
            'residual': residual.values
        }).reset_index(drop=True)

        return DecompositionResult(
            original_data=decomposed_df,
            trend=trend,
            seasonal=seasonal,
            residual=residual,
            anomalies=anomalies,
            anomaly_df=anomaly_df,
            stats=stats,
            params={
                'seasonal_period': self.seasonal_period,
                'anomaly_threshold': self.anomaly_threshold,
                'robust': self.robust
            }
        )

    def _fallback_decomposition(self, ts: pd.Series):
        from collections import namedtuple

        trend = ts.rolling(window=self.seasonal_period, center=True, min_periods=1).mean()
        detrended = ts - trend

        seasonal = pd.Series(index=ts.index, dtype=float)
        for i in range(self.seasonal_period):
            mask = np.arange(len(ts)) % self.seasonal_period == i
            if mask.any():
                seasonal.values[mask] = detrended.values[mask].mean()

        residual = ts - trend - seasonal

        DecompResult = namedtuple('DecompResult', ['trend', 'seasonal', 'resid'])
        return DecompResult(trend=trend, seasonal=seasonal, resid=residual)

    def _detect_anomalies(self, residual: pd.Series, original: pd.Series,
                          trend: pd.Series, seasonal: pd.Series,
                          timestamps: pd.Index) -> Tuple[List[AnomalyPoint], pd.DataFrame]:
        residual_mean = residual.mean()
        residual_std = residual.std()

        if residual_std == 0:
            return [], pd.DataFrame()

        z_scores = np.abs((residual - residual_mean) / residual_std)
        anomaly_mask = z_scores > self.anomaly_threshold

        anomalies = []
        anomaly_records = []

        for idx in np.where(anomaly_mask)[0]:
            ts = timestamps[idx]
            val = original.iloc[idx]
            t = trend.iloc[idx]
            s = seasonal.iloc[idx]
            r = residual.iloc[idx]
            z = z_scores.iloc[idx]

            expected = t + s
            pct_change = (val - expected) / abs(expected) * 100 if expected != 0 else 0

            if val > expected:
                anomaly_type = 'spike'
            else:
                anomaly_type = 'drop'

            if z > self.anomaly_threshold * 2:
                severity = 'critical'
            elif z > self.anomaly_threshold * 1.5:
                severity = 'high'
            else:
                severity = 'medium'

            confidence = min(0.99, (z - self.anomaly_threshold) / (self.anomaly_threshold * 2) + 0.5)

            anomaly = AnomalyPoint(
                timestamp=ts,
                value=val,
                trend=t,
                seasonal=s,
                residual=r,
                anomaly_type=anomaly_type,
                severity=severity,
                z_score=z,
                threshold=self.anomaly_threshold,
                confidence=confidence
            )
            anomalies.append(anomaly)

            anomaly_records.append({
                'timestamp': ts,
                'value': val,
                'trend': t,
                'seasonal': s,
                'residual': r,
                'expected': expected,
                'deviation_pct': pct_change,
                'anomaly_type': anomaly_type,
                'severity': severity,
                'z_score': z,
                'confidence': confidence
            })

        anomaly_df = pd.DataFrame(anomaly_records)
        return anomalies, anomaly_df

    def _calculate_stats(self, ts: pd.Series, trend: pd.Series, seasonal: pd.Series,
                         residual: pd.Series, anomalies: List[AnomalyPoint]) -> Dict:
        total_variance = np.var(ts)
        residual_variance = np.var(residual)
        explained_variance = 1 - (residual_variance / total_variance) if total_variance > 0 else 0

        anomaly_counts = {'spike': 0, 'drop': 0}
        severity_counts = {'low': 0, 'medium': 0, 'high': 0, 'critical': 0}
        for a in anomalies:
            anomaly_counts[a.anomaly_type] = anomaly_counts.get(a.anomaly_type, 0) + 1
            severity_counts[a.severity] = severity_counts.get(a.severity, 0) + 1

        return {
            'total_points': len(ts),
            'anomaly_count': len(anomalies),
            'anomaly_rate': len(anomalies) / len(ts) if len(ts) > 0 else 0,
            'anomaly_by_type': anomaly_counts,
            'anomaly_by_severity': severity_counts,
            'explained_variance': explained_variance,
            'residual_mean': float(residual.mean()),
            'residual_std': float(residual.std()),
            'trend_strength': np.var(trend) / total_variance if total_variance > 0 else 0,
            'seasonal_strength': np.var(seasonal) / total_variance if total_variance > 0 else 0
        }

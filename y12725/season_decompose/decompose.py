import pandas as pd
import numpy as np
from dataclasses import dataclass, field
from typing import Optional, Dict, Any
from statsmodels.tsa.seasonal import STL
from .config import DecomposeConfig
from .data_loader import LoadedData, DataStatus


@dataclass
class DecomposeResult:
    trend: pd.Series
    seasonal: pd.Series
    residual: pd.Series
    observed: pd.Series
    dates: pd.Series
    data_quality: Dict[str, int]
    model_type: str
    seasonal_period: int
    metrics: Dict[str, float] = field(default_factory=dict)
    full_df: Optional[pd.DataFrame] = None
    status_series: Optional[pd.Series] = None


class SeasonalDecomposer:
    def __init__(self, config: DecomposeConfig):
        errors = config.validate()
        if errors:
            raise ValueError("配置错误:\n" + "\n".join(errors))
        self.config = config

    def decompose(self, loaded_data: LoadedData) -> DecomposeResult:
        clean_df = loaded_data.clean_df.copy()

        if len(clean_df) < 2 * self.config.seasonal_period:
            raise ValueError(
                f"可用数据不足: 需要至少 {2 * self.config.seasonal_period} 行, "
                f"实际只有 {len(clean_df)} 行"
            )

        clean_df = clean_df.set_index(self.config.date_col)
        clean_df = clean_df.sort_index()

        full_idx = pd.date_range(
            start=clean_df.index.min(),
            end=clean_df.index.max(),
            freq=pd.infer_freq(clean_df.index) or "D",
        )
        clean_df = clean_df.reindex(full_idx)
        clean_df.index.name = self.config.date_col

        values = clean_df[self.config.value_col]
        values = values.interpolate(method="linear", limit_direction="both")

        stl_kwargs = {
            "period": self.config.seasonal_period,
            "seasonal": self.config.seasonal,
            "robust": self.config.robust,
        }
        if self.config.trend is not None:
            stl_kwargs["trend"] = self.config.trend
        if self.config.low_pass is not None:
            stl_kwargs["low_pass"] = self.config.low_pass

        stl = STL(values, **stl_kwargs)
        res = stl.fit()

        trend = pd.Series(res.trend.values, index=clean_df.index, name="trend")
        seasonal = pd.Series(res.seasonal.values, index=clean_df.index, name="seasonal")
        residual = pd.Series(res.resid.values, index=clean_df.index, name="residual")
        observed = pd.Series(values.values, index=clean_df.index, name="observed")

        if self.config.model == "multiplicative":
            residual_ratio = residual / (trend * seasonal)
            residual_ratio = residual_ratio.replace([np.inf, -np.inf], np.nan)
            residual_std = residual_ratio.std()
            seasonality_strength = max(0, 1 - (residual_ratio.var() / ((seasonal + residual_ratio).var() + 1e-10)))
            trend_strength = max(0, 1 - (residual_ratio.var() / ((trend + residual_ratio).var() + 1e-10)))
        else:
            residual_std = residual.std()
            total_var = observed.var() + 1e-10
            seasonality_strength = max(0, 1 - residual.var() / ((seasonal + residual).var() + 1e-10))
            trend_strength = max(0, 1 - residual.var() / ((trend + residual).var() + 1e-10))

        mae = residual.abs().mean()
        mape = (residual.abs() / (observed.abs() + 1e-10)).mean() * 100

        full_df = pd.DataFrame({
            "date": clean_df.index,
            "observed": observed.values,
            "trend": trend.values,
            "seasonal": seasonal.values,
            "residual": residual.values,
        })

        original_with_status = loaded_data.df.copy()
        original_with_status["status"] = loaded_data.status_series.values
        status_map = {}
        for _, row in original_with_status.iterrows():
            d = row[self.config.date_col]
            s = row["status"]
            priority = {
                DataStatus.NEED_RECOLLECT: 0,
                DataStatus.PENDING: 1,
                DataStatus.AVAILABLE: 2,
            }
            if d not in status_map or priority.get(s, 2) < priority.get(status_map[d], 2):
                status_map[d] = s

        full_df["status"] = full_df["date"].map(status_map).fillna(DataStatus.AVAILABLE)
        status_series = full_df["status"].reset_index(drop=True)
        full_df = full_df.drop(columns=["status"])

        metrics = {
            "残差标准差": float(residual_std),
            "残差MAE": float(mae),
            "残差MAPE(%)": float(mape),
            "季节性强度": float(seasonality_strength),
            "趋势强度": float(trend_strength),
        }

        return DecomposeResult(
            trend=trend,
            seasonal=seasonal,
            residual=residual,
            observed=observed,
            dates=pd.Series(clean_df.index),
            data_quality=loaded_data.summary,
            model_type=self.config.model,
            seasonal_period=self.config.seasonal_period,
            metrics=metrics,
            full_df=full_df,
            status_series=status_series,
        )

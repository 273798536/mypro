"""Missing value handling for return data."""

from typing import List, Tuple

import numpy as np
import pandas as pd

from .types import (
    CorrectionTrace,
    CorrectionType,
    Severity,
    CleaningRules,
    ReturnData,
)


class MissingValueHandler:
    """Handles detection and correction of missing values in return data."""

    def __init__(self, rules: CleaningRules):
        self.rules = rules
        self.traces: List[CorrectionTrace] = []

    def analyze(self, data: ReturnData) -> pd.DataFrame:
        """Analyze missing values and generate diagnostic traces."""
        returns = data.returns
        source_file = data.source_file

        missing_counts = returns.isnull().sum()
        missing_ratios = missing_counts / len(returns)

        total_missing = missing_counts.sum()
        total_cells = returns.shape[0] * returns.shape[1]
        overall_ratio = total_missing / total_cells if total_cells > 0 else 0

        self.traces.append(CorrectionTrace(
            correction_type=CorrectionType.MISSING_IMPUTE_MEAN,
            severity=Severity.INFO,
            description=f"Overall missing ratio: {overall_ratio:.2%} ({total_missing}/{total_cells} cells)",
            source_file=source_file,
            details={
                "total_missing": int(total_missing),
                "total_cells": int(total_cells),
                "overall_ratio": float(overall_ratio),
            },
        ))

        for asset, ratio in missing_ratios.items():
            if ratio > 0:
                severity = self._get_severity(ratio)
                self.traces.append(CorrectionTrace(
                    correction_type=CorrectionType.MISSING_IMPUTE_MEAN,
                    severity=severity,
                    description=f"Asset '{asset}' has {ratio:.2%} missing values ({missing_counts[asset]} rows)",
                    source_file=source_file,
                    asset=asset,
                    details={
                        "missing_count": int(missing_counts[asset]),
                        "missing_ratio": float(ratio),
                        "total_rows": int(len(returns)),
                    },
                ))

        for idx, row in returns.iterrows():
            row_missing = row.isnull().sum()
            if row_missing > 0:
                row_ratio = row_missing / len(row)
                if row_ratio > self.rules.missing_threshold_warning:
                    self.traces.append(CorrectionTrace(
                        correction_type=CorrectionType.MISSING_DROP_ROW,
                        severity=self._get_severity(row_ratio),
                        description=f"Row {idx} has {row_ratio:.2%} missing values",
                        source_file=source_file,
                        details={
                            "row_index": str(idx),
                            "missing_count": int(row_missing),
                            "missing_ratio": float(row_ratio),
                            "total_columns": int(len(row)),
                        },
                    ))

        return missing_ratios

    def _get_severity(self, ratio: float) -> Severity:
        """Determine severity based on missing ratio."""
        if ratio >= self.rules.missing_threshold_critical:
            return Severity.CRITICAL
        elif ratio >= self.rules.missing_threshold_warning:
            return Severity.WARNING
        else:
            return Severity.INFO

    def clean(self, data: ReturnData) -> Tuple[pd.DataFrame, List[CorrectionTrace]]:
        """Clean missing values according to the rules."""
        self.traces = []
        returns = data.returns.copy()
        source_file = data.source_file

        self.analyze(data)

        critical_assets = []
        for asset in returns.columns:
            ratio = returns[asset].isnull().sum() / len(returns)
            if ratio >= self.rules.max_missing_ratio:
                critical_assets.append(asset)
                self.traces.append(CorrectionTrace(
                    correction_type=CorrectionType.MISSING_DROP_COL,
                    severity=Severity.CRITICAL,
                    description=f"Asset '{asset}' dropped: missing ratio {ratio:.2%} exceeds limit {self.rules.max_missing_ratio:.2%}",
                    source_file=source_file,
                    asset=asset,
                    details={"missing_ratio": float(ratio), "max_allowed": self.rules.max_missing_ratio},
                    before_value=float(ratio),
                    after_value=None,
                ))

        if critical_assets:
            returns = returns.drop(columns=critical_assets)

        critical_rows = []
        for idx, row in returns.iterrows():
            row_missing = row.isnull().sum()
            row_ratio = row_missing / len(row) if len(row) > 0 else 0
            if row_ratio >= self.rules.max_missing_ratio:
                critical_rows.append(idx)
                self.traces.append(CorrectionTrace(
                    correction_type=CorrectionType.MISSING_DROP_ROW,
                    severity=Severity.CRITICAL,
                    description=f"Row {idx} dropped: missing ratio {row_ratio:.2%} exceeds limit",
                    source_file=source_file,
                    details={"row_index": str(idx), "missing_ratio": float(row_ratio)},
                    before_value=float(row_ratio),
                    after_value=None,
                ))

        if critical_rows:
            returns = returns.drop(index=critical_rows)

        strategy = self.rules.missing_strategy
        if strategy == "impute_mean":
            returns, impute_traces = self._impute_mean(returns, source_file)
        elif strategy == "impute_median":
            returns, impute_traces = self._impute_median(returns, source_file)
        elif strategy == "interpolate":
            returns, impute_traces = self._interpolate(returns, source_file)
        elif strategy == "forward_fill":
            returns, impute_traces = self._forward_fill(returns, source_file)
        else:
            self.traces.append(CorrectionTrace(
                correction_type=CorrectionType.MISSING_IMPUTE_MEAN,
                severity=Severity.ERROR,
                description=f"Unknown missing strategy '{strategy}', falling back to mean imputation",
                source_file=source_file,
            ))
            returns, impute_traces = self._impute_mean(returns, source_file)

        self.traces.extend(impute_traces)

        remaining_missing = returns.isnull().sum().sum()
        if remaining_missing > 0:
            self.traces.append(CorrectionTrace(
                correction_type=CorrectionType.MISSING_IMPUTE_MEAN,
                severity=Severity.CRITICAL,
                description=f"WARNING: {remaining_missing} missing values remain after cleaning - requires manual review",
                source_file=source_file,
                details={"remaining_missing": int(remaining_missing)},
            ))

        return returns, self.traces

    def _impute_mean(self, returns: pd.DataFrame, source_file: str) -> Tuple[pd.DataFrame, List[CorrectionTrace]]:
        """Impute missing values with column means."""
        traces = []
        result = returns.copy()

        for col in result.columns:
            missing_mask = result[col].isnull()
            missing_count = missing_mask.sum()
            if missing_count > 0:
                mean_val = result[col].mean()
                result.loc[missing_mask, col] = mean_val
                traces.append(CorrectionTrace(
                    correction_type=CorrectionType.MISSING_IMPUTE_MEAN,
                    severity=Severity.WARNING,
                    description=f"Imputed {missing_count} missing values for '{col}' with mean={mean_val:.6f}",
                    source_file=source_file,
                    asset=col,
                    details={
                        "imputed_count": int(missing_count),
                        "imputation_value": float(mean_val),
                        "strategy": "mean",
                    },
                    before_value=None,
                    after_value=float(mean_val),
                ))

        return result, traces

    def _impute_median(self, returns: pd.DataFrame, source_file: str) -> Tuple[pd.DataFrame, List[CorrectionTrace]]:
        """Impute missing values with column medians."""
        traces = []
        result = returns.copy()

        for col in result.columns:
            missing_mask = result[col].isnull()
            missing_count = missing_mask.sum()
            if missing_count > 0:
                median_val = result[col].median()
                result.loc[missing_mask, col] = median_val
                traces.append(CorrectionTrace(
                    correction_type=CorrectionType.MISSING_IMPUTE_MEDIAN,
                    severity=Severity.WARNING,
                    description=f"Imputed {missing_count} missing values for '{col}' with median={median_val:.6f}",
                    source_file=source_file,
                    asset=col,
                    details={
                        "imputed_count": int(missing_count),
                        "imputation_value": float(median_val),
                        "strategy": "median",
                    },
                    before_value=None,
                    after_value=float(median_val),
                ))

        return result, traces

    def _interpolate(self, returns: pd.DataFrame, source_file: str) -> Tuple[pd.DataFrame, List[CorrectionTrace]]:
        """Interpolate missing values using linear interpolation."""
        traces = []
        result = returns.copy()

        for col in result.columns:
            missing_mask = result[col].isnull()
            missing_count = missing_mask.sum()
            if missing_count > 0:
                before_vals = result[col].copy()
                result[col] = result[col].interpolate(method="linear", limit_direction="both")
                after_vals = result[col]
                imputed_vals = after_vals[missing_mask].tolist()
                traces.append(CorrectionTrace(
                    correction_type=CorrectionType.MISSING_INTERPOLATE,
                    severity=Severity.WARNING,
                    description=f"Interpolated {missing_count} missing values for '{col}'",
                    source_file=source_file,
                    asset=col,
                    details={
                        "imputed_count": int(missing_count),
                        "strategy": "linear_interpolate",
                        "imputed_values": [float(v) for v in imputed_vals],
                    },
                ))

        return result, traces

    def _forward_fill(self, returns: pd.DataFrame, source_file: str) -> Tuple[pd.DataFrame, List[CorrectionTrace]]:
        """Forward fill missing values."""
        traces = []
        result = returns.copy()

        for col in result.columns:
            missing_mask = result[col].isnull()
            missing_count = missing_mask.sum()
            if missing_count > 0:
                result[col] = result[col].ffill().bfill()
                traces.append(CorrectionTrace(
                    correction_type=CorrectionType.MISSING_FORWARD_FILL,
                    severity=Severity.WARNING,
                    description=f"Forward/backward filled {missing_count} missing values for '{col}'",
                    source_file=source_file,
                    asset=col,
                    details={
                        "imputed_count": int(missing_count),
                        "strategy": "forward_fill",
                    },
                ))

        return result, traces

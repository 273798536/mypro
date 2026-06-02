import pandas as pd
import numpy as np
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Tuple
from enum import Enum
import copy

from .data_loader import LoadedDataset
from .numerical_integration import IntegrationMethod, run_integration, IntegrationReport, METHOD_NAMES
from .unit_validation import UnitReport


class GroupByLevel(Enum):
    TOTAL = "total"
    HOURLY = "h"
    DAILY = "D"
    WEEKLY = "W"
    MONTHLY = "ME"
    QUARTERLY = "QE"
    YEARLY = "YE"


GROUP_NAMES = {
    GroupByLevel.TOTAL: "全部",
    GroupByLevel.HOURLY: "按小时",
    GroupByLevel.DAILY: "按日",
    GroupByLevel.WEEKLY: "按周",
    GroupByLevel.MONTHLY: "按月",
    GroupByLevel.QUARTERLY: "按季度",
    GroupByLevel.YEARLY: "按年",
}


@dataclass
class FilterConfig:
    time_start: Optional[pd.Timestamp] = None
    time_end: Optional[pd.Timestamp] = None
    selected_columns: Optional[List[str]] = None
    group_by: GroupByLevel = GroupByLevel.TOTAL
    integration_method: IntegrationMethod = IntegrationMethod.TRAPEZOIDAL
    exclude_negative: bool = False
    exclude_null: bool = True

    def to_dict(self) -> Dict:
        return {
            "time_start": str(self.time_start) if self.time_start else None,
            "time_end": str(self.time_end) if self.time_end else None,
            "selected_columns": self.selected_columns,
            "group_by": self.group_by.value,
            "group_by_name": GROUP_NAMES[self.group_by],
            "integration_method": self.integration_method.value,
            "integration_method_name": METHOD_NAMES.get(self.integration_method, str(self.integration_method)),
            "exclude_negative": self.exclude_negative,
            "exclude_null": self.exclude_null,
        }


@dataclass
class FilteredResult:
    config: FilterConfig
    dataset: LoadedDataset
    unit_report: UnitReport
    integration_report: IntegrationReport
    filter_description: str = ""
    data_points_before: int = 0
    data_points_after: int = 0

    def get_summary(self) -> Dict:
        return {
            "config": self.config.to_dict(),
            "filter_description": self.filter_description,
            "data_points_before": self.data_points_before,
            "data_points_after": self.data_points_after,
            "data_reduction_pct": round(
                (1 - self.data_points_after / self.data_points_before) * 100, 2
            ) if self.data_points_before > 0 else 0,
            "total_energy": self.integration_report.total_energy_all_columns,
            "energy_unit": self.unit_report.target_energy_unit,
            "group_results": self._get_group_results(),
        }

    def _get_group_results(self) -> Dict:
        results = {}
        for col, col_result in self.integration_report.results.items():
            if col_result.group_results:
                results[col] = col_result.group_results
        return results


def apply_filters(dataset: LoadedDataset,
                  unit_report: UnitReport,
                  config: Optional[FilterConfig] = None) -> FilteredResult:
    config = config or FilterConfig()
    df = dataset.processed_df.copy()
    time_col = dataset.time_column
    reading_cols = list(dataset.reading_columns)

    data_points_before = len(df)

    filter_descriptions = []

    if config.time_start is not None:
        mask = df[time_col] >= config.time_start
        df = df[mask].copy()
        filter_descriptions.append(f"起始时间: {config.time_start}")

    if config.time_end is not None:
        mask = df[time_col] <= config.time_end
        df = df[mask].copy()
        filter_descriptions.append(f"结束时间: {config.time_end}")

    if config.selected_columns:
        selected = [c for c in config.selected_columns if c in reading_cols]
        if selected:
            reading_cols = selected
            filter_descriptions.append(f"已选通道: {', '.join(selected)}")

    if config.exclude_null:
        null_mask = df[reading_cols].isnull().any(axis=1)
        null_count = null_mask.sum()
        if null_count > 0:
            df = df[~null_mask].copy()
            filter_descriptions.append(f"排除空值: 移除 {null_count} 条含空值的记录")

    if config.exclude_negative:
        neg_mask = (df[reading_cols] < 0).any(axis=1)
        neg_count = neg_mask.sum()
        if neg_count > 0:
            df = df[~neg_mask].copy()
            filter_descriptions.append(f"排除负值: 移除 {neg_count} 条含负值的记录")

    if df.empty:
        raise ValueError("筛选后数据为空，请调整筛选条件")

    filtered_dataset = LoadedDataset(
        raw_df=dataset.raw_df,
        processed_df=df,
        source_file=dataset.source_file,
        time_column=time_col,
        reading_columns=reading_cols,
        metadata=dict(dataset.metadata),
        unit_info={k: v for k, v in dataset.unit_info.items() if k in reading_cols},
    )

    filtered_dataset.metadata["filter_config"] = config.to_dict()
    filtered_dataset.metadata["filter_time"] = pd.Timestamp.now()

    group_by_value = config.group_by.value if config.group_by != GroupByLevel.TOTAL else None
    integration_report = run_integration(
        filtered_dataset,
        unit_report,
        method=config.integration_method,
        group_by=group_by_value,
    )

    filter_desc = "；".join(filter_descriptions) if filter_descriptions else "未筛选，使用全部数据"

    return FilteredResult(
        config=config,
        dataset=filtered_dataset,
        unit_report=unit_report,
        integration_report=integration_report,
        filter_description=filter_desc,
        data_points_before=data_points_before,
        data_points_after=len(df),
    )


def sync_filter_to_all(filtered_result: FilteredResult) -> Dict[str, object]:
    """
    将筛选条件同步到图表和明细，确保口径一致。
    返回包含图表数据、明细数据、汇总数据的字典，三者使用完全相同的筛选条件。
    """
    df = filtered_result.dataset.processed_df.copy()
    time_col = filtered_result.dataset.time_column
    reading_cols = filtered_result.dataset.reading_columns

    chart_data = {
        "time_column": time_col,
        "reading_columns": reading_cols,
        "times": df[time_col].tolist(),
        "readings": {col: df[col].tolist() for col in reading_cols},
        "units": {col: filtered_result.unit_report.results[col].standardized_unit
                  for col in reading_cols},
        "filter_config": filtered_result.config.to_dict(),
    }

    detail_data = {
        "time_column": time_col,
        "reading_columns": reading_cols,
        "records": df[[time_col] + reading_cols].to_dict('records'),
        "units": {col: filtered_result.unit_report.results[col].standardized_unit
                  for col in reading_cols},
        "filter_config": filtered_result.config.to_dict(),
        "integration_steps": {
            col: [step.__dict__ for step in result.steps]
            for col, result in filtered_result.integration_report.results.items()
        },
    }

    summary_data = filtered_result.get_summary()

    return {
        "chart_data": chart_data,
        "detail_data": detail_data,
        "summary_data": summary_data,
        "filter_config": filtered_result.config.to_dict(),
        "filter_description": filtered_result.filter_description,
    }


def create_default_filter(dataset: LoadedDataset) -> FilterConfig:
    return FilterConfig(
        time_start=dataset.processed_df[dataset.time_column].min(),
        time_end=dataset.processed_df[dataset.time_column].max(),
        selected_columns=list(dataset.reading_columns),
        group_by=GroupByLevel.TOTAL,
        integration_method=IntegrationMethod.TRAPEZOIDAL,
    )


def modify_filter(existing_config: FilterConfig,
                  dataset: LoadedDataset,
                  unit_report: UnitReport,
                  **kwargs) -> FilteredResult:
    """
    修改筛选条件并重新计算，确保图表和明细使用相同口径。
    """
    new_config = copy.deepcopy(existing_config)

    for key, value in kwargs.items():
        if hasattr(new_config, key):
            setattr(new_config, key, value)

    return apply_filters(dataset, unit_report, new_config)

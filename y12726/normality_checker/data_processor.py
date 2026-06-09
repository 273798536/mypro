from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Union

import numpy as np
import pandas as pd


@dataclass
class ProcessedData:
    dataset_name: str
    source_material: str
    raw_data: Optional[np.ndarray]
    cleaned_data: Optional[np.ndarray]
    is_empty: bool
    n_raw: int
    n_clean: int
    n_removed_nan: int
    n_removed_inf: int
    n_removed_outliers: int
    n_duplicates: int
    issues: List[str] = field(default_factory=list)
    gaps: List[str] = field(default_factory=list)
    outlier_indices: List[int] = field(default_factory=list)
    descriptive_stats: Dict = field(default_factory=dict)
    processing_steps: List[str] = field(default_factory=list)
    preprocessing_changed_verdict: bool = False
    before_cleaning_stats: Dict = field(default_factory=dict)

    @property
    def can_test(self) -> bool:
        return self.cleaned_data is not None and len(self.cleaned_data) >= 3

    def summary(self) -> str:
        lines = [
            f"数据集: {self.dataset_name}",
            f"来源材料: {self.source_material}",
            f"是否空集: {'是' if self.is_empty else '否'}",
            f"原始样本量: {self.n_raw}",
            f"清洗后样本量: {self.n_clean}",
            f"移除NaN: {self.n_removed_nan}",
            f"移除Inf: {self.n_removed_inf}",
            f"移除异常值: {self.n_removed_outliers}",
            f"重复值: {self.n_duplicates}",
        ]
        if self.processing_steps:
            lines.append("处理步骤:")
            for step in self.processing_steps:
                lines.append(f"  - {step}")
        if self.issues:
            lines.append("数据问题:")
            for issue in self.issues:
                lines.append(f"  - {issue}")
        if self.gaps:
            lines.append("材料缺口:")
            for gap in self.gaps:
                lines.append(f"  - {gap}")
        return "\n".join(lines)


class DataProcessor:
    def __init__(
        self,
        remove_outliers: bool = True,
        outlier_method: str = "iqr",
        iqr_factor: float = 1.5,
        z_threshold: float = 3.0,
    ):
        self.remove_outliers = remove_outliers
        self.outlier_method = outlier_method
        self.iqr_factor = iqr_factor
        self.z_threshold = z_threshold

    def _detect_outliers_iqr(
        self, data: np.ndarray
    ) -> Tuple[np.ndarray, List[int]]:
        q1 = np.percentile(data, 25)
        q3 = np.percentile(data, 75)
        iqr = q3 - q1
        lower = q1 - self.iqr_factor * iqr
        upper = q3 + self.iqr_factor * iqr
        mask = (data >= lower) & (data <= upper)
        indices = [int(i) for i in np.where(~mask)[0]]
        return mask, indices

    def _detect_outliers_zscore(
        self, data: np.ndarray
    ) -> Tuple[np.ndarray, List[int]]:
        if np.std(data) == 0:
            return np.ones(len(data), dtype=bool), []
        z_scores = np.abs((data - np.mean(data)) / np.std(data))
        mask = z_scores <= self.z_threshold
        indices = [int(i) for i in np.where(~mask)[0]]
        return mask, indices

    def _compute_stats(self, data: Optional[np.ndarray]) -> Dict:
        if data is None or len(data) == 0:
            return {}
        return {
            "样本量": int(len(data)),
            "均值": round(float(np.mean(data)), 6),
            "标准差": round(float(np.std(data, ddof=1)), 6),
            "最小值": round(float(np.min(data)), 6),
            "Q1": round(float(np.percentile(data, 25)), 6),
            "中位数": round(float(np.median(data)), 6),
            "Q3": round(float(np.percentile(data, 75)), 6),
            "最大值": round(float(np.max(data)), 6),
            "偏度": round(float(pd.Series(data).skew()), 6),
            "峰度": round(float(pd.Series(data).kurtosis()), 6),
        }

    def _parse_data(
        self, raw_input: Union[list, np.ndarray, pd.Series, str, pd.DataFrame]
    ) -> Tuple[Optional[np.ndarray], List[str]]:
        gaps: List[str] = []

        if raw_input is None:
            return None, ["数据为None"]

        if isinstance(raw_input, str):
            stripped = raw_input.strip()
            if not stripped:
                return None, ["数据输入为空字符串"]
            try:
                if "," in stripped:
                    parts = [p.strip() for p in stripped.split(",")]
                else:
                    parts = stripped.split()
                parsed = []
                for p in parts:
                    if not p:
                        continue
                    try:
                        parsed.append(float(p))
                    except ValueError:
                        gaps.append(f"无法解析的值: '{p}'")
                if parsed:
                    return np.array(parsed, dtype=float), gaps
                return None, ["解析后无有效数值"] + gaps
            except Exception as e:
                return None, [f"解析字符串数据失败: {e}"]

        if isinstance(raw_input, pd.DataFrame):
            if raw_input.empty:
                return None, ["DataFrame为空"]
            numeric_cols = raw_input.select_dtypes(include=[np.number]).columns
            if len(numeric_cols) == 0:
                return None, ["DataFrame中无数值列"]
            if len(numeric_cols) > 1:
                gaps.append(
                    f"DataFrame含多个数值列，使用第一列: {numeric_cols[0]}"
                )
            return raw_input[numeric_cols[0]].values.astype(float), gaps

        if isinstance(raw_input, pd.Series):
            if raw_input.empty:
                return None, ["Series为空"]
            return raw_input.values.astype(float), gaps

        if isinstance(raw_input, (list, tuple, np.ndarray)):
            arr = np.array(raw_input, dtype=object)
            if len(arr) == 0:
                return None, ["输入为空集合/空数组"]
            numeric_vals = []
            for i, v in enumerate(arr):
                if v is None or (isinstance(v, float) and np.isnan(v)):
                    gaps.append(f"第{i+1}个值为空(NaN)")
                    continue
                try:
                    numeric_vals.append(float(v))
                except (ValueError, TypeError):
                    gaps.append(f"第{i+1}个值无法转换为数值: '{v}'")
            if not numeric_vals:
                return None, ["无有效数值"] + gaps
            return np.array(numeric_vals, dtype=float), gaps

        return None, [f"不支持的数据类型: {type(raw_input)}"]

    def process(
        self,
        raw_input: Union[list, np.ndarray, pd.Series, str, pd.DataFrame],
        dataset_name: str = "未命名",
        source_material: str = "未知材料",
        known_gaps: Optional[List[str]] = None,
    ) -> ProcessedData:
        steps: List[str] = []
        issues: List[str] = []

        parsed, parse_gaps = self._parse_data(raw_input)
        all_gaps = parse_gaps + (known_gaps or [])
        steps.append("步骤1: 解析原始输入")

        if parsed is None:
            issues.append("数据为空或无法解析")
            empty_stats = self._compute_stats(None)
            return ProcessedData(
                dataset_name=dataset_name,
                source_material=source_material,
                raw_data=None,
                cleaned_data=None,
                is_empty=True,
                n_raw=0,
                n_clean=0,
                n_removed_nan=0,
                n_removed_inf=0,
                n_removed_outliers=0,
                n_duplicates=0,
                issues=issues,
                gaps=all_gaps,
                processing_steps=steps,
                before_cleaning_stats=empty_stats,
                descriptive_stats=empty_stats,
            )

        raw_data = parsed
        n_raw = len(raw_data)
        steps.append(f"步骤2: 基础信息提取，原始有效数值{n_raw}个")

        before_stats = self._compute_stats(raw_data)

        nan_mask = ~np.isnan(raw_data)
        n_nan = n_raw - int(np.sum(nan_mask))
        if n_nan > 0:
            issues.append(f"发现{n_nan}个NaN值，已移除")
            steps.append(f"步骤3: 移除{n_nan}个NaN值")
        data = raw_data[nan_mask]

        if len(data) == 0:
            issues.append("移除NaN后无数据剩余")
            return ProcessedData(
                dataset_name=dataset_name,
                source_material=source_material,
                raw_data=raw_data,
                cleaned_data=None,
                is_empty=True,
                n_raw=n_raw,
                n_clean=0,
                n_removed_nan=n_nan,
                n_removed_inf=0,
                n_removed_outliers=0,
                n_duplicates=0,
                issues=issues,
                gaps=all_gaps,
                processing_steps=steps,
                before_cleaning_stats=before_stats,
                descriptive_stats=self._compute_stats(None),
            )

        inf_mask = ~np.isinf(data)
        n_inf = len(data) - int(np.sum(inf_mask))
        if n_inf > 0:
            issues.append(f"发现{n_inf}个Inf值，已移除")
            steps.append(f"步骤4: 移除{n_inf}个Inf值")
        data = data[inf_mask]

        if len(data) == 0:
            issues.append("移除Inf后无数据剩余")
            return ProcessedData(
                dataset_name=dataset_name,
                source_material=source_material,
                raw_data=raw_data,
                cleaned_data=None,
                is_empty=True,
                n_raw=n_raw,
                n_clean=0,
                n_removed_nan=n_nan,
                n_removed_inf=n_inf,
                n_removed_outliers=0,
                n_duplicates=0,
                issues=issues,
                gaps=all_gaps,
                processing_steps=steps,
                before_cleaning_stats=before_stats,
                descriptive_stats=self._compute_stats(None),
            )

        n_duplicates = int(len(data) - len(np.unique(data)))
        if n_duplicates > 0:
            steps.append(f"步骤5: 发现{n_duplicates}个重复值（保留）")

        outlier_indices: List[int] = []
        n_outliers = 0
        if self.remove_outliers and len(data) >= 4:
            steps.append(
                f"步骤6: 使用{self.outlier_method.upper()}方法检测异常值"
            )
            if self.outlier_method == "iqr":
                outlier_mask, outlier_indices = self._detect_outliers_iqr(data)
            else:
                outlier_mask, outlier_indices = self._detect_outliers_zscore(data)
            n_outliers = len(outlier_indices)
            if n_outliers > 0:
                issues.append(
                    f"检测到{n_outliers}个异常值（因子={self.iqr_factor if self.outlier_method == 'iqr' else self.z_threshold}）"
                )
                data = data[outlier_mask]

        if len(data) == 0:
            issues.append("移除异常值后无数据剩余")
            return ProcessedData(
                dataset_name=dataset_name,
                source_material=source_material,
                raw_data=raw_data,
                cleaned_data=None,
                is_empty=True,
                n_raw=n_raw,
                n_clean=0,
                n_removed_nan=n_nan,
                n_removed_inf=n_inf,
                n_removed_outliers=n_outliers,
                n_duplicates=n_duplicates,
                issues=issues,
                gaps=all_gaps,
                outlier_indices=outlier_indices,
                processing_steps=steps,
                before_cleaning_stats=before_stats,
                descriptive_stats=self._compute_stats(None),
            )

        if len(data) < 3:
            issues.append(f"清洗后样本量仅{len(data)}，不足最少检验要求(3)")

        after_stats = self._compute_stats(data)
        verdict_changed = self._check_verdict_change(before_stats, after_stats)

        return ProcessedData(
            dataset_name=dataset_name,
            source_material=source_material,
            raw_data=raw_data,
            cleaned_data=data,
            is_empty=False,
            n_raw=n_raw,
            n_clean=len(data),
            n_removed_nan=n_nan,
            n_removed_inf=n_inf,
            n_removed_outliers=n_outliers,
            n_duplicates=n_duplicates,
            issues=issues,
            gaps=all_gaps,
            outlier_indices=outlier_indices,
            descriptive_stats=after_stats,
            processing_steps=steps,
            preprocessing_changed_verdict=verdict_changed,
            before_cleaning_stats=before_stats,
        )

    def _check_verdict_change(
        self, before: Dict, after: Dict
    ) -> bool:
        if not before or not after:
            return False
        if "标准差" in before and before["标准差"] == 0:
            return True
        if "标准差" in after and after["标准差"] == 0:
            return True
        if "偏度" in before and "偏度" in after:
            skew_change = abs(before["偏度"] - after["偏度"])
            if skew_change > 0.5:
                return True
        if "峰度" in before and "峰度" in after:
            kurt_change = abs(before["峰度"] - after["峰度"])
            if kurt_change > 1.0:
                return True
        return False

    def process_batch(
        self,
        datasets: List[Dict],
    ) -> List[ProcessedData]:
        results = []
        for ds in datasets:
            raw = ds.get("data", [])
            name = ds.get("name", "未命名")
            material = ds.get("source", "未知材料")
            gaps = ds.get("gaps", [])
            result = self.process(raw, name, material, gaps)
            results.append(result)
        return results

    @staticmethod
    def create_edge_case_datasets() -> List[Dict]:
        return [
            {
                "name": "空集合-完全空",
                "source": "建模社-边界测试材料01.xlsx",
                "data": [],
                "gaps": ["材料01: A列数据区域为空"],
            },
            {
                "name": "空集合-全NaN",
                "source": "建模社-边界测试材料02.csv",
                "data": [np.nan, np.nan, np.nan, np.nan, np.nan],
                "gaps": ["材料02: 第2-6行均为空白"],
            },
            {
                "name": "空集合-非数值字符串",
                "source": "建模社-边界测试材料03.xlsx",
                "data": ["N/A", "缺失", "未记录", "", " "],
                "gaps": ["材料03: B列使用文本占位符代替数值"],
            },
            {
                "name": "样本量不足-仅2个",
                "source": "建模社-真实草稿-2024Q1-项目A",
                "data": [1.2, 3.4],
                "gaps": ["项目A: 只采集到2个有效数据点"],
            },
            {
                "name": "坏数据-混入离群值",
                "source": "建模社-真实草稿-2024Q1-项目B",
                "data": [
                    10.1, 11.2, 9.8, 10.5, 10.0, 999.0, 10.3, 11.0, 9.5, 10.8,
                    10.2, 10.6, 10.9, 9.7, 10.4, -999.0, 10.7, 10.1, 10.3, 9.9,
                ],
                "gaps": ["项目B: 第6行和第16行疑似录入错误(999, -999)"],
            },
            {
                "name": "坏数据-常数列",
                "source": "建模社-真实草稿-2024Q1-项目C",
                "data": [5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0],
                "gaps": ["项目C: D列所有值相同，可能复制粘贴错误"],
            },
            {
                "name": "正常数据-正态分布",
                "source": "建模社-真实草稿-2024Q1-项目D",
                "data": list(np.random.normal(50, 10, 50)),
                "gaps": [],
            },
            {
                "name": "非正态数据-指数分布",
                "source": "建模社-真实草稿-2024Q1-项目E",
                "data": list(np.random.exponential(20, 50)),
                "gaps": [],
            },
        ]

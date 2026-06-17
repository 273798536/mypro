"""分组指标统计模块 - 按来源、难度、数据类型等维度统计"""

from typing import List, Dict, Any
import pandas as pd
from .models import Sample, ValidationResult


class MetricsCalculator:
    """指标计算器 - 计算校验数据集的各种分组指标"""

    def __init__(self, group_by_fields: List[str] = None):
        self.group_by_fields = group_by_fields or [
            "source_file",
            "difficulty",
            "data_type",
        ]

    def calculate_overall(self, results: List[ValidationResult]) -> dict:
        """计算整体指标"""
        total = len(results)
        if total == 0:
            return {"total": 0, "passed": 0, "blocked": 0, "needs_review": 0,
                    "pass_rate": "0%", "review_rate": "0%"}

        passed = sum(1 for r in results
                     if r.validation_status == ValidationResult.STATUS_PASSED)
        blocked = sum(1 for r in results
                      if r.validation_status == ValidationResult.STATUS_BLOCKED)
        needs_review = sum(1 for r in results
                           if r.validation_status == ValidationResult.STATUS_NEEDS_REVIEW)
        pending = sum(1 for r in results
                      if r.validation_status == ValidationResult.STATUS_PENDING)

        return {
            "total": total,
            "passed": passed,
            "blocked": blocked,
            "needs_review": needs_review,
            "pending": pending,
            "pass_rate": f"{passed/total*100:.1f}%",
            "block_rate": f"{blocked/total*100:.1f}%",
            "review_rate": f"{needs_review/total*100:.1f}%",
        }

    def calculate_grouped(
        self,
        samples: List[Sample],
        results: List[ValidationResult],
    ) -> Dict[str, pd.DataFrame]:
        """按各个维度分组统计

        Args:
            samples: 样本列表
            results: 校验结果列表

        Returns:
            各维度的分组统计 DataFrame 字典
        """
        result_map = {r.sample_id: r for r in results}
        records = []

        for sample in samples:
            result = result_map.get(sample.sample_id)
            if not result:
                continue

            record = {
                "sample_id": sample.sample_id,
                "status": result.validation_status,
                "confidence": sample.confidence,
                "data_type": sample.data_type,
                "difficulty": sample.difficulty,
                "source_file": sample.source_trace.source_file,
                "image_name": sample.source_trace.image_name,
                "risk_level": result.safety_check.risk_level,
            }
            records.append(record)

        if not records:
            return {}

        df = pd.DataFrame(records)
        grouped_stats = {}

        for field in self.group_by_fields:
            if field not in df.columns:
                continue

            group = df.groupby(field).agg(
                total=("sample_id", "count"),
                passed=("status", lambda s: (s == "passed").sum()),
                blocked=("status", lambda s: (s == "blocked").sum()),
                needs_review=("status", lambda s: (s == "needs_review").sum()),
                avg_confidence=("confidence", "mean"),
            ).reset_index()

            group["pass_rate"] = (group["passed"] / group["total"] * 100).round(1).astype(str) + "%"
            group["block_rate"] = (group["blocked"] / group["total"] * 100).round(1).astype(str) + "%"
            group["review_rate"] = (group["needs_review"] / group["total"] * 100).round(1).astype(str) + "%"
            group["avg_confidence"] = group["avg_confidence"].round(3)

            grouped_stats[field] = group

        return grouped_stats

    def detect_bias(self, grouped_stats: Dict[str, pd.DataFrame]) -> List[dict]:
        """检测评测集偏科情况

        识别出通过率异常低或异常高的分组，提示训练组注意。

        Returns:
            偏科检测结果列表
        """
        biases = []

        for field, df in grouped_stats.items():
            if len(df) < 2:
                continue

            overall_pass = df["passed"].sum() / df["total"].sum()

            for _, row in df.iterrows():
                group_pass = row["passed"] / row["total"] if row["total"] > 0 else 0
                diff = group_pass - overall_pass

                if abs(diff) >= 0.2 and row["total"] >= 3:
                    severity = "high" if abs(diff) >= 0.4 else "medium"
                    biases.append({
                        "dimension": field,
                        "group": str(row[field]),
                        "group_pass_rate": f"{group_pass*100:.1f}%",
                        "overall_pass_rate": f"{overall_pass*100:.1f}%",
                        "deviation": f"{diff*100:+.1f}%",
                        "sample_count": row["total"],
                        "severity": severity,
                        "can_use_directly": diff >= -0.2,
                        "needs_kr_review": diff < -0.2,
                    })

        return sorted(biases, key=lambda b: b["severity"] == "high", reverse=True)

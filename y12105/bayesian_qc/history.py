"""历史记录管理 - 持久化与去重"""

import json
import os
from datetime import datetime
from typing import List, Optional, Dict, Tuple
from dataclasses import asdict

from .models import (
    SampleRecord,
    PriorParams,
    BayesianResult,
    HistoryRecord,
)


class HistoryManager:
    """历史记录管理器"""

    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        self.history_file = os.path.join(output_dir, "history.json")
        self._records: Dict[str, HistoryRecord] = {}
        self._load()

    def _load(self):
        """从磁盘加载历史记录"""
        if os.path.exists(self.history_file):
            try:
                with open(self.history_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for item in data:
                        result_dict = item["result"]
                        prior_dict = result_dict["prior"]
                        trace_dict = result_dict["trace"]

                        prior = PriorParams(
                            alpha=prior_dict["alpha"],
                            beta=prior_dict["beta"],
                            description=prior_dict.get("description", ""),
                            source=prior_dict.get("source", ""),
                            updated_at=prior_dict.get("updated_at"),
                        )

                        from .models import TraceInfo
                        trace = TraceInfo(
                            batch_id=trace_dict["batch_id"],
                            source_files=trace_dict.get("source_files", []),
                            sample_ids=trace_dict.get("sample_ids", []),
                            prior_source=trace_dict.get("prior_source", ""),
                            calculation_steps=trace_dict.get("calculation_steps", []),
                        )

                        if "credible_interval" in result_dict:
                            ci_low, ci_high = result_dict["credible_interval"]
                        else:
                            ci_low = result_dict["credible_interval_low"]
                            ci_high = result_dict["credible_interval_high"]

                        result = BayesianResult(
                            batch_id=result_dict["batch_id"],
                            total_samples=result_dict["total_samples"],
                            defective_count=result_dict["defective_count"],
                            prior=prior,
                            posterior_alpha=result_dict["posterior_alpha"],
                            posterior_beta=result_dict["posterior_beta"],
                            mean_defect_rate=result_dict["mean_defect_rate"],
                            credible_interval_low=ci_low,
                            credible_interval_high=ci_high,
                            credible_level=result_dict["credible_level"],
                            decision=result_dict["decision"],
                            recommendation=result_dict["recommendation"],
                            trace=trace,
                            warnings=result_dict.get("warnings", []),
                            compared_batches=result_dict.get("compared_batches", {}),
                        )

                        record = HistoryRecord(
                            result_hash=item["result_hash"],
                            batch_id=item["batch_id"],
                            executed_at=item["executed_at"],
                            result=result,
                        )
                        self._records[record.result_hash] = record
            except (json.JSONDecodeError, KeyError):
                self._records = {}

    def _save(self):
        """保存历史记录到磁盘"""
        os.makedirs(os.path.dirname(self.history_file), exist_ok=True)
        data = []
        for record in self._records.values():
            data.append({
                "result_hash": record.result_hash,
                "batch_id": record.batch_id,
                "executed_at": record.executed_at,
                "result": record.result.to_dict(),
            })
        with open(self.history_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def exists(self, batch_id: str, samples: List[SampleRecord], prior: PriorParams) -> bool:
        """检查是否已存在相同的计算结果"""
        result_hash = HistoryRecord.compute_hash(batch_id, samples, prior)
        return result_hash in self._records

    def get_existing(self, batch_id: str, samples: List[SampleRecord], prior: PriorParams) -> Optional[HistoryRecord]:
        """获取已存在的历史记录"""
        result_hash = HistoryRecord.compute_hash(batch_id, samples, prior)
        return self._records.get(result_hash)

    def add(self, result: BayesianResult, samples: List[SampleRecord], prior: PriorParams) -> Tuple[HistoryRecord, bool]:
        """
        添加结果到历史记录

        Returns:
            (record, is_new) - is_new表示是否是新记录（未重复）
        """
        result_hash = HistoryRecord.compute_hash(result.batch_id, samples, prior)

        if result_hash in self._records:
            return self._records[result_hash], False

        record = HistoryRecord(
            result_hash=result_hash,
            batch_id=result.batch_id,
            executed_at=datetime.now().isoformat(),
            result=result,
        )
        self._records[result_hash] = record
        self._save()
        return record, True

    def get_batch_history(self, batch_id: str) -> List[HistoryRecord]:
        """获取指定批次的所有历史记录"""
        return [
            r for r in self._records.values()
            if r.batch_id == batch_id
        ]

    def get_all_results(self) -> Dict[str, BayesianResult]:
        """获取所有批次的最新结果"""
        results = {}
        for record in sorted(
            self._records.values(),
            key=lambda r: r.executed_at
        ):
            results[record.batch_id] = record.result
        return results

    def clear(self):
        """清空所有历史记录"""
        self._records = {}
        self._save()

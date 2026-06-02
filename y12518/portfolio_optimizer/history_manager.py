import json
import os
from datetime import datetime
from typing import Dict, List, Optional, Any
from pathlib import Path

from .data_models import OptimizerInput, OptimizerResult, HistoryRecord


class HistoryManager:
    def __init__(self, storage_path=None):
        if storage_path is None:
            storage_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                "..",
                "history_records"
            )
        self.storage_path = Path(storage_path).resolve()
        self.storage_path.mkdir(parents=True, exist_ok=True)
        self._records = {}
        self._load_from_disk()

    def _load_from_disk(self):
        for file_path in self.storage_path.glob("*.json"):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                record = HistoryRecord(**data)
                self._records[record.record_id] = record
            except Exception:
                continue

    def save_record(self, optimizer_input, optimizer_result, notes=""):
        record = HistoryRecord(
            original_input=optimizer_input.to_dict(),
            processing_result=optimizer_result.to_dict(),
            notes=notes,
        )
        self._records[record.record_id] = record
        self._persist_record(record)
        return record

    def _persist_record(self, record):
        file_path = self.storage_path / f"{record.record_id}.json"
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(record.model_dump(), f, ensure_ascii=False, indent=2, default=str)

    def update_manual_correction(self, record_id, correction, notes=""):
        if record_id not in self._records:
            return None

        record = self._records[record_id]
        record.update_correction(correction, notes)
        self._persist_record(record)
        return record

    def get_record(self, record_id):
        return self._records.get(record_id)

    def list_records(self, limit=10, start_date=None, end_date=None, has_correction=None):
        records = list(self._records.values())

        if start_date:
            records = [r for r in records if r.created_at >= start_date]
        if end_date:
            records = [r for r in records if r.created_at <= end_date]
        if has_correction is not None:
            if has_correction:
                records = [r for r in records if r.manual_correction is not None]
            else:
                records = [r for r in records if r.manual_correction is None]

        records = sorted(records, key=lambda r: r.created_at, reverse=True)
        return records[:limit]

    def get_record_summary(self, record):
        input_data = record.original_input
        result_data = record.processing_result

        original_weights = {}
        for pos in input_data.get("positions", []):
            original_weights[pos["stock_code"]] = pos["target_weight"]

        optimal_weights = result_data.get("optimal_weights", {}) or {}

        return {
            "record_id": record.record_id,
            "created_at": record.created_at.isoformat(),
            "updated_at": record.updated_at.isoformat(),
            "status": result_data.get("status"),
            "stock_count": len(original_weights),
            "original_total_weight": sum(original_weights.values()),
            "optimal_total_weight": sum(optimal_weights.values()),
            "conflicts_count": len(result_data.get("conflicts", [])),
            "violations_count": len(result_data.get("violations", [])),
            "has_manual_correction": record.manual_correction is not None,
            "notes": record.notes,
        }

    def display_record(self, record_id):
        record = self.get_record(record_id)
        if not record:
            return f"未找到记录: {record_id}"

        parts = []
        parts.append("=" * 70)
        parts.append(f"历史记录: {record_id}")
        parts.append("=" * 70)

        input_data = record.original_input
        result_data = record.processing_result

        parts.append("\n【一、原始材料】")
        parts.append("-" * 40)
        parts.append(f"输入ID: {input_data['input_id']}")
        parts.append(f"创建时间: {input_data['timestamp']}")

        parts.append("\n1. 持仓权重(主信息):")
        for pos in input_data["positions"]:
            line = (
                f"  {pos['stock_code']}: 目标={pos['target_weight']:.4f}, "
                f"当前={pos['current_weight']:.4f}, "
                f"范围=[{pos['min_weight']:.4f}, {pos['max_weight']:.4f}]"
            )
            if pos["is_forbidden"]:
                line += "  [禁买]"
            parts.append(line)

        parts.append("\n2. 行业标签(补证据):")
        for ind in input_data["industry_tags"]:
            parts.append(
                f"  {ind['stock_code']}: {ind['industry']} "
                f"(置信度: {ind['industry_confidence']:.2%})"
            )

        parts.append("\n3. 交易成本(补证据):")
        for cost in input_data["transaction_costs"]:
            parts.append(
                f"  {cost['stock_code']}: 买入={cost['buy_cost']:.4%}, "
                f"卖出={cost['sell_cost']:.4%}, "
                f"流动性={cost['liquidity_score']:.2%}"
            )

        parts.append("\n4. 约束配置:")
        const = input_data["constraints"]
        parts.append(f"  总权重: [{const['total_weight_min']}, {const['total_weight_max']}]")
        parts.append(f"  单票最大: {const['max_single_stock_weight']}")
        parts.append(f"  换手率上限: {const['max_turnover']}")
        if const["industry_max_weight"]:
            parts.append(f"  行业上限: {const['industry_max_weight']}")
        if const["industry_min_weight"]:
            parts.append(f"  行业下限: {const['industry_min_weight']}")

        parts.append("\n【二、处理结论】")
        parts.append("-" * 40)
        parts.append(f"结果ID: {result_data['result_id']}")
        parts.append(f"求解状态: {result_data['status']}")
        parts.append(f"求解耗时: {result_data['solve_time_ms']:.2f} ms")

        if result_data.get("optimal_weights"):
            parts.append("\n最优权重:")
            for code, w in sorted(result_data["optimal_weights"].items()):
                parts.append(f"  {code}: {w:.4f}")

        if result_data.get("conflicts"):
            parts.append(f"\n数据冲突 ({len(result_data['conflicts'])} 条):")
            for c in result_data["conflicts"]:
                parts.append(f"  [{c['severity']}] {c['description']}")

        if result_data.get("violations"):
            parts.append(f"\n约束违反 ({len(result_data['violations'])} 条):")
            for v in result_data["violations"]:
                parts.append(f"  ! {v['description']}")

        if result_data.get("explanation"):
            parts.append("\n求解说明:")
            parts.append(f"  {result_data['explanation']}")

        parts.append("\n【三、人工修正】")
        parts.append("-" * 40)
        if record.manual_correction:
            parts.append(f"修正时间: {record.updated_at.isoformat()}")
            parts.append(
                f"修正内容: {json.dumps(record.manual_correction, ensure_ascii=False, indent=2)}"
            )
            if record.notes:
                parts.append(f"备注: {record.notes}")
        else:
            parts.append("暂无人工修正")

        return "\n".join(parts)

    def clear_all(self):
        count = len(self._records)
        for file_path in self.storage_path.glob("*.json"):
            file_path.unlink()
        self._records.clear()
        return count

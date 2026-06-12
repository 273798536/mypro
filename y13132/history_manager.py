"""
凸包面积参数试算 - 历史记录模块
负责权重修改历史、人工确认记录，支持换班复盘
"""

import json
import os
from datetime import datetime
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Tuple


@dataclass
class WeightChangeRecord:
    """权重修改记录"""
    timestamp: str
    operator: str
    old_weights: Dict[str, float]
    new_weights: Dict[str, float]
    reason: str
    is_manual_confirmed: bool = False
    confirmed_by: str = ""
    confirmed_at: str = ""
    area_before: float = 0.0
    area_after: float = 0.0


@dataclass
class CalculationHistory:
    """计算历史记录"""
    timestamp: str
    weights: Dict[str, float]
    area: float
    exclude_duplicates: bool
    exclude_dirty: bool
    used_points_count: int
    excluded_points_count: int
    data_source: str
    operator: str = ""
    note: str = ""


class HistoryManager:
    """历史记录管理器"""

    def __init__(self, history_file: str = "convex_hull_history.json"):
        self.history_file = history_file
        self.weight_changes: List[WeightChangeRecord] = []
        self.calculation_history: List[CalculationHistory] = []
        self._load_history()

    def _load_history(self):
        """从文件加载历史记录"""
        if os.path.exists(self.history_file):
            try:
                with open(self.history_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for item in data.get("weight_changes", []):
                        self.weight_changes.append(WeightChangeRecord(**item))
                    for item in data.get("calculation_history", []):
                        self.calculation_history.append(CalculationHistory(**item))
            except (json.JSONDecodeError, TypeError):
                pass

    def _save_history(self):
        """保存历史记录到文件"""
        data = {
            "weight_changes": [asdict(r) for r in self.weight_changes],
            "calculation_history": [asdict(r) for r in self.calculation_history],
        }
        try:
            with open(self.history_file, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception:
            pass

    def record_weight_change(
        self,
        old_weights: Dict[str, float],
        new_weights: Dict[str, float],
        operator: str,
        reason: str,
        area_before: float = 0.0,
        area_after: float = 0.0,
    ) -> WeightChangeRecord:
        """记录权重修改"""
        record = WeightChangeRecord(
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            operator=operator,
            old_weights=old_weights.copy(),
            new_weights=new_weights.copy(),
            reason=reason,
            area_before=area_before,
            area_after=area_after,
        )
        self.weight_changes.insert(0, record)
        self._save_history()
        return record

    def confirm_weight_change(
        self,
        record_index: int,
        confirmed_by: str,
    ) -> bool:
        """人工确认权重修改"""
        if 0 <= record_index < len(self.weight_changes):
            record = self.weight_changes[record_index]
            record.is_manual_confirmed = True
            record.confirmed_by = confirmed_by
            record.confirmed_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            self._save_history()
            return True
        return False

    def record_calculation(
        self,
        weights: Dict[str, float],
        area: float,
        exclude_duplicates: bool,
        exclude_dirty: bool,
        used_points_count: int,
        excluded_points_count: int,
        data_source: str,
        operator: str = "",
        note: str = "",
    ) -> CalculationHistory:
        """记录一次计算"""
        record = CalculationHistory(
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            weights=weights.copy(),
            area=area,
            exclude_duplicates=exclude_duplicates,
            exclude_dirty=exclude_dirty,
            used_points_count=used_points_count,
            excluded_points_count=excluded_points_count,
            data_source=data_source,
            operator=operator,
            note=note,
        )
        self.calculation_history.insert(0, record)
        self._save_history()
        return record

    def get_weight_change_history(self, limit: int = 20) -> List[WeightChangeRecord]:
        """获取权重修改历史"""
        return self.weight_changes[:limit]

    def get_calculation_history(self, limit: int = 20) -> List[CalculationHistory]:
        """获取计算历史"""
        return self.calculation_history[:limit]

    def get_daily_summary(self, date_str: Optional[str] = None) -> Dict:
        """获取每日汇总（用于换班复盘）"""
        if date_str is None:
            date_str = datetime.now().strftime("%Y-%m-%d")

        day_weight_changes = [
            r for r in self.weight_changes if r.timestamp.startswith(date_str)
        ]
        day_calculations = [
            r for r in self.calculation_history if r.timestamp.startswith(date_str)
        ]

        unconfirmed_changes = [
            r for r in day_weight_changes if not r.is_manual_confirmed
        ]

        return {
            "date": date_str,
            "weight_change_count": len(day_weight_changes),
            "calculation_count": len(day_calculations),
            "unconfirmed_changes": len(unconfirmed_changes),
            "operators": list(set(r.operator for r in day_weight_changes if r.operator)),
            "first_calculation": day_calculations[-1].timestamp if day_calculations else "",
            "last_calculation": day_calculations[0].timestamp if day_calculations else "",
        }

    def get_change_explanation(self, record_index: int) -> str:
        """生成权重变更解释文本（用于给项目经理讲解）"""
        if not (0 <= record_index < len(self.weight_changes)):
            return "记录不存在"

        r = self.weight_changes[record_index]
        old_w = r.old_weights
        new_w = r.new_weights

        x_change = ((new_w.get("x", 1.0) - old_w.get("x", 1.0)) / old_w.get("x", 1.0)) * 100 if old_w.get("x", 1.0) != 0 else 0
        y_change = ((new_w.get("y", 1.0) - old_w.get("y", 1.0)) / old_w.get("y", 1.0)) * 100 if old_w.get("y", 1.0) != 0 else 0
        area_change = ((r.area_after - r.area_before) / r.area_before) * 100 if r.area_before != 0 else 0

        lines = [
            f"【权重变更说明】",
            f"时间: {r.timestamp}",
            f"操作人: {r.operator}",
            f"变更原因: {r.reason}",
            f"",
            f"【参数变化】",
            f"X维度权重: {old_w.get('x', 1.0):.4f} → {new_w.get('x', 1.0):.4f} ({x_change:+.2f}%)",
            f"Y维度权重: {old_w.get('y', 1.0):.4f} → {new_w.get('y', 1.0):.4f} ({y_change:+.2f}%)",
            f"",
            f"【结果变化】",
            f"凸包面积: {r.area_before:.4f} → {r.area_after:.4f} ({area_change:+.2f}%)",
            f"",
            f"【确认状态】",
            f"{'已确认 by ' + r.confirmed_by + ' at ' + r.confirmed_at if r.is_manual_confirmed else '待人工确认'}",
        ]
        return "\n".join(lines)

    def clear_history(self):
        """清空历史记录"""
        self.weight_changes = []
        self.calculation_history = []
        if os.path.exists(self.history_file):
            os.remove(self.history_file)

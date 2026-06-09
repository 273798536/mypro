import json
import uuid
from datetime import datetime
from dataclasses import dataclass, asdict, field
from typing import List, Optional, Dict, Any
from pathlib import Path
from .data_loader import DataStatus


@dataclass
class CorrectionRecord:
    id: str
    timestamp: str
    analyst: str
    date_value: str
    field_name: str
    old_value: Optional[Any]
    new_value: Optional[Any]
    old_status: str
    new_status: str
    reason: str
    source_file: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "CorrectionRecord":
        return cls(**data)


class AuditLog:
    def __init__(self, log_path: str):
        self.log_path = Path(log_path)
        self.log_path.parent.mkdir(parents=True, exist_ok=True)
        self.records: List[CorrectionRecord] = []
        self._load_existing()

    def _load_existing(self):
        if self.log_path.exists():
            try:
                with open(self.log_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                for item in data.get("records", []):
                    self.records.append(CorrectionRecord.from_dict(item))
            except (json.JSONDecodeError, KeyError, TypeError):
                pass

    def log_correction(
        self,
        analyst: str,
        date_value: str,
        field_name: str,
        old_value: Optional[Any],
        new_value: Optional[Any],
        old_status: DataStatus,
        new_status: DataStatus,
        reason: str,
        source_file: str,
    ) -> CorrectionRecord:
        record = CorrectionRecord(
            id=str(uuid.uuid4())[:8],
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            analyst=analyst,
            date_value=str(date_value),
            field_name=field_name,
            old_value=old_value,
            new_value=new_value,
            old_status=old_status.value,
            new_status=new_status.value,
            reason=reason,
            source_file=source_file,
        )
        self.records.append(record)
        self._save()
        return record

    def confirm_pending(
        self,
        analyst: str,
        date_value: str,
        old_value: Optional[Any],
        confirmed_value: Optional[Any],
        reason: str,
        source_file: str,
    ) -> CorrectionRecord:
        return self.log_correction(
            analyst=analyst,
            date_value=date_value,
            field_name="value",
            old_value=old_value,
            new_value=confirmed_value,
            old_status=DataStatus.PENDING,
            new_status=DataStatus.AVAILABLE,
            reason=reason,
            source_file=source_file,
        )

    def mark_recollect(
        self,
        analyst: str,
        date_value: str,
        current_status: DataStatus,
        reason: str,
        source_file: str,
    ) -> CorrectionRecord:
        return self.log_correction(
            analyst=analyst,
            date_value=date_value,
            field_name="value",
            old_value=None,
            new_value=None,
            old_status=current_status,
            new_status=DataStatus.NEED_RECOLLECT,
            reason=reason,
            source_file=source_file,
        )

    def _save(self):
        data = {
            "meta": {
                "version": "1.0",
                "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "total_records": len(self.records),
            },
            "records": [r.to_dict() for r in self.records],
        }
        with open(self.log_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def get_changes_for_date(self, date_value: str) -> List[CorrectionRecord]:
        return [r for r in self.records if r.date_value == str(date_value)]

    def get_status_change_summary(self) -> Dict[str, int]:
        summary: Dict[str, int] = {}
        for r in self.records:
            key = f"{r.old_status} -> {r.new_status}"
            summary[key] = summary.get(key, 0) + 1
        return summary

    def print_summary(self):
        if not self.records:
            print("暂无修正记录。")
            return

        print(f"\n===== 修正日志摘要（共 {len(self.records)} 条）=====")
        for status_change, count in self.get_status_change_summary().items():
            print(f"  {status_change}: {count} 次")
        print()
        print(f"{'ID':<10} {'时间':<20} {'分析师':<10} {'日期':<14} {'变化':<22} {'原因'}")
        print("-" * 100)
        for r in self.records[-20:]:
            change = f"{r.old_status} → {r.new_status}"
            print(
                f"{r.id:<10} {r.timestamp:<20} {r.analyst:<10} "
                f"{r.date_value:<14} {change:<22} {r.reason}"
            )
        if len(self.records) > 20:
            print(f"...（仅显示最近20条，完整记录见 {self.log_path}）")

    def to_markdown(self) -> str:
        lines = [
            "# 人工修正留痕记录",
            "",
            f"- 总记录数: {len(self.records)}",
            f"- 日志文件: `{self.log_path}`",
            "",
        ]
        status_summary = self.get_status_change_summary()
        if status_summary:
            lines.append("## 状态变化统计")
            lines.append("")
            for change, count in status_summary.items():
                lines.append(f"- {change}: {count} 次")
            lines.append("")

        if self.records:
            lines.append("## 详细记录")
            lines.append("")
            lines.append(
                "| ID | 时间 | 分析师 | 日期 | 字段 | 原值 | 新值 | 原状态 | 新状态 | 原因 |"
            )
            lines.append("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |")
            for r in self.records:
                lines.append(
                    f"| {r.id} | {r.timestamp} | {r.analyst} | {r.date_value} | "
                    f"{r.field_name} | {r.old_value} | {r.new_value} | "
                    f"{r.old_status} | {r.new_status} | {r.reason} |"
                )
        return "\n".join(lines)

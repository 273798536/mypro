from dataclasses import dataclass, field
from enum import Enum
from typing import List, Dict, Any, Optional
import pandas as pd
from datetime import datetime


class DataStatus(Enum):
    """
    数据状态枚举，对应水产养殖场长复核时的三类判断：
    - AVAILABLE: 可用 - 船队可直接使用
    - PENDING: 暂缓 - 需要进一步确认，暂不投入使用
    - RECOLLECT: 需重新采集 - 数据质量问题，需要场长补采/改口径
    """
    AVAILABLE = "可用"
    PENDING = "暂缓"
    RECOLLECT = "需重新采集"

    @property
    def color_code(self) -> str:
        """用于可视化的颜色编码，不只是单一红色"""
        return {
            DataStatus.AVAILABLE: "#27ae60",
            DataStatus.PENDING: "#f39c12",
            DataStatus.RECOLLECT: "#e74c3c",
        }[self]

    @property
    def for_fleet(self) -> str:
        """船队视角的简短说明"""
        return {
            DataStatus.AVAILABLE: "直接使用",
            DataStatus.PENDING: "待场长复核",
            DataStatus.RECOLLECT: "请勿使用，需重采",
        }[self]


@dataclass
class TrackedRecord:
    """
    带追溯信息的单条记录

    保留的关键追溯字段：
    - source_row: 原始行号（对应Excel/CSV中的行号）
    - source_file: 来源文件名
    - source_note: 来源备注（如"原件扫描版第3页"）
    - data_status: 数据状态
    - issue_type: 异常类型（如"潮位时区错"、"潮位值异常"）
    - issue_description: 异常详细说明
    - next_action: 下一步操作建议（给场长看的，是补材料还是改口径）
    - raw_data: 原始数据的副本，便于回溯
    """
    record_id: str
    source_row: int
    source_file: str
    source_note: str
    data_status: DataStatus
    issue_type: Optional[str] = None
    issue_description: Optional[str] = None
    next_action: Optional[str] = None
    raw_data: Dict[str, Any] = field(default_factory=dict)
    tracked_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "record_id": self.record_id,
            "source_row": self.source_row,
            "source_file": self.source_file,
            "source_note": self.source_note,
            "data_status": self.data_status.value,
            "data_status_color": self.data_status.color_code,
            "for_fleet": self.data_status.for_fleet,
            "issue_type": self.issue_type or "",
            "issue_description": self.issue_description or "",
            "next_action": self.next_action or "",
            "tracked_at": self.tracked_at.strftime("%Y-%m-%d %H:%M:%S"),
        }


class DataTracker:
    """
    数据追溯管理器

    负责：
    1. 给每条记录分配可追溯的record_id
    2. 管理数据状态（可用/暂缓/需重采）
    3. 记录异常类型和下一步处理建议
    4. 生成复核报告，场长和船队各取所需
    """

    def __init__(self):
        self._records: Dict[str, TrackedRecord] = {}
        self._counter = 0

    def _next_id(self, prefix: str = "REC") -> str:
        self._counter += 1
        return f"{prefix}-{self._counter:05d}"

    def track_record(
        self,
        source_row: int,
        source_file: str,
        source_note: str,
        data_status: DataStatus = DataStatus.AVAILABLE,
        issue_type: Optional[str] = None,
        issue_description: Optional[str] = None,
        next_action: Optional[str] = None,
        raw_data: Optional[Dict[str, Any]] = None,
        record_id: Optional[str] = None,
    ) -> TrackedRecord:
        """登记一条带追溯信息的记录"""
        rid = record_id or self._next_id()
        record = TrackedRecord(
            record_id=rid,
            source_row=source_row,
            source_file=source_file,
            source_note=source_note,
            data_status=data_status,
            issue_type=issue_type,
            issue_description=issue_description,
            next_action=next_action,
            raw_data=raw_data or {},
        )
        self._records[rid] = record
        return record

    def update_status(
        self,
        record_id: str,
        new_status: DataStatus,
        issue_type: Optional[str] = None,
        issue_description: Optional[str] = None,
        next_action: Optional[str] = None,
    ):
        """更新记录状态（场长复核后可回写）"""
        if record_id not in self._records:
            raise KeyError(f"未找到记录: {record_id}")
        rec = self._records[record_id]
        rec.data_status = new_status
        if issue_type is not None:
            rec.issue_type = issue_type
        if issue_description is not None:
            rec.issue_description = issue_description
        if next_action is not None:
            rec.next_action = next_action

    def to_dataframe(self) -> pd.DataFrame:
        """导出为DataFrame，便于后续处理和展示"""
        rows = [r.to_dict() for r in self._records.values()]
        return pd.DataFrame(rows)

    def get_records_by_status(self, status: DataStatus) -> List[TrackedRecord]:
        """按状态筛选记录"""
        return [r for r in self._records.values() if r.data_status == status]

    def status_summary(self) -> Dict[str, Any]:
        """生成状态汇总（给场长看的概览）"""
        total = len(self._records)
        counts = {}
        for s in DataStatus:
            recs = self.get_records_by_status(s)
            counts[s.value] = {
                "count": len(recs),
                "ratio": round(len(recs) / total * 100, 1) if total > 0 else 0,
                "color": s.color_code,
                "records": [r.to_dict() for r in recs],
            }

        issues = {}
        for r in self._records.values():
            if r.issue_type:
                issues.setdefault(r.issue_type, 0)
                issues[r.issue_type] += 1

        return {
            "total": total,
            "by_status": counts,
            "issue_types": issues,
        }

    def generate_review_report(self) -> str:
        """
        生成水产养殖场长复核报告

        报告特点：
        - 说明哪些可用、哪些暂缓、哪些需重采
        - 每条异常都给出下一步操作（补材料还是改口径）
        - 保留原始行号和来源备注，便于回溯
        """
        summary = self.status_summary()
        lines = []
        lines.append("=" * 70)
        lines.append("  潮汐赶海安全助手 - 数据复核报告")
        lines.append(f"  生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("=" * 70)
        lines.append(f"总记录数: {summary['total']}")
        for s in DataStatus:
            info = summary["by_status"][s.value]
            lines.append(f"  [{s.value}] {info['count']} 条 ({info['ratio']}%)")
        lines.append("")

        if summary["issue_types"]:
            lines.append("-- 异常类型统计 --")
            for itype, cnt in summary["issue_types"].items():
                lines.append(f"  {itype}: {cnt} 条")
            lines.append("")

        lines.append("-- 明细（可追溯） --")
        for status in [DataStatus.RECOLLECT, DataStatus.PENDING, DataStatus.AVAILABLE]:
            recs = self.get_records_by_status(status)
            if not recs:
                continue
            lines.append("")
            lines.append(f"【{status.value}】 - {status.for_fleet}")
            for r in recs:
                line = f"  * [{r.record_id}] 行{r.source_row} | {r.source_file} | {r.source_note}"
                if r.issue_type:
                    line += f" | 问题: {r.issue_type}"
                if r.issue_description:
                    line += f" - {r.issue_description}"
                lines.append(line)
                if r.next_action:
                    lines.append(f"    下一步: {r.next_action}")

        lines.append("")
        lines.append("=" * 70)
        lines.append("说明:")
        lines.append("  [可用] 船队可直接使用")
        lines.append("  [暂缓] 需场长复核后再下发船队")
        lines.append("  [需重新采集] 请勿下发，联系场长补材料或改口径")
        lines.append("=" * 70)
        return "\n".join(lines)

    def generate_fleet_brief(self) -> str:
        """
        生成船队视角的简洁说明

        船队拿到结果时，能一眼分清：
        - 哪些能直接用
        - 哪些还要找水产养殖场长复核
        """
        lines = []
        lines.append("=" * 50)
        lines.append("  潮汐数据 - 船队使用说明")
        lines.append("=" * 50)
        available = self.get_records_by_status(DataStatus.AVAILABLE)
        pending = self.get_records_by_status(DataStatus.PENDING)
        recollect = self.get_records_by_status(DataStatus.RECOLLECT)

        lines.append(f"直接可用: {len(available)} 条")
        for r in available:
            lines.append(f"  + [{r.record_id}] {r.source_file} 行{r.source_row}")

        if pending:
            lines.append("")
            lines.append(f"待场长复核: {len(pending)} 条（暂勿使用）")
            for r in pending:
                lines.append(f"  ? [{r.record_id}] {r.source_file} 行{r.source_row} - {r.issue_type or '待确认'}")

        if recollect:
            lines.append("")
            lines.append(f"数据异常，请勿使用: {len(recollect)} 条")
            for r in recollect:
                lines.append(f"  X [{r.record_id}] {r.source_file} 行{r.source_row} - {r.issue_type or '数据异常'}")
                lines.append(f"    请联系场长处理")

        lines.append("")
        lines.append("=" * 50)
        return "\n".join(lines)

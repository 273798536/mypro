from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Dict, Optional
import pandas as pd


@dataclass
class ProcessingRecord:
    batch_no: str
    sample_name: str
    record_id: str
    record_type: str
    record_time: datetime
    raw_data: Dict
    peak_areas: List[Dict] = field(default_factory=list)
    interpretation: Optional[Dict] = None
    weight_info: Optional[Dict] = None
    final_decision: Optional[str] = None
    is_duplicate: bool = False
    superseded_by: Optional[str] = None
    notes: str = ""
    human_explanation: str = ""

    def to_dict(self) -> Dict:
        return {
            "批号": self.batch_no,
            "样品名称": self.sample_name,
            "记录编号": self.record_id,
            "记录类型": self.record_type,
            "记录时间": self.record_time.strftime("%Y-%m-%d %H:%M:%S"),
            "最终结论": self.final_decision or "待确认",
            "是否重复批次": "是" if self.is_duplicate else "否",
            "被替代记录": self.superseded_by or "",
            "处理意见": self.human_explanation,
            "主峰面积": self._get_main_peak_area(),
            "称量重量(g)": self.weight_info.get("样品重量(g)", "") if self.weight_info else "",
            "稀释倍数": self.weight_info.get("稀释倍数", "") if self.weight_info else "",
        }

    def _get_main_peak_area(self) -> float:
        if not self.peak_areas:
            return 0.0
        main_peaks = [p for p in self.peak_areas if float(p.get("峰序号", 0)) > 1]
        if main_peaks:
            return max(float(p.get("峰面积", 0)) for p in main_peaks)
        return 0.0


class BatchRecordManager:
    def __init__(self):
        self._records: Dict[str, List[ProcessingRecord]] = {}
        self._latest_per_batch: Dict[str, ProcessingRecord] = {}

    def add_record(self, record: ProcessingRecord) -> None:
        batch_no = record.batch_no
        if batch_no not in self._records:
            self._records[batch_no] = []

        existing = self._records[batch_no]
        if existing:
            record.is_duplicate = True
            latest = self._find_latest(existing)
            latest.superseded_by = record.record_id
            record.human_explanation = self._generate_duplicate_explanation(latest, record)

        self._records[batch_no].append(record)
        self._latest_per_batch[batch_no] = self._find_latest(self._records[batch_no])

    def _find_latest(self, records: List[ProcessingRecord]) -> ProcessingRecord:
        return max(records, key=lambda r: r.record_time)

    def _generate_duplicate_explanation(self, old: ProcessingRecord, new: ProcessingRecord) -> str:
        reason = new.weight_info.get("备注", "") if new.weight_info else ""
        if "复检" in reason:
            return (
                f"该批号（{old.batch_no}）存在多次检测记录。"
                f"首次记录编号为{old.record_id}（{old.record_time.strftime('%Y-%m-%d')}），"
                f"因「{reason}」进行复检，"
                f"复检记录编号为{new.record_id}（{new.record_time.strftime('%Y-%m-%d')}）。"
                f"报告中以复检数据为准。"
            )
        else:
            return (
                f"该批号（{old.batch_no}）存在多次检测记录。"
                f"前次记录编号{old.record_id}（{old.record_time.strftime('%Y-%m-%d')}），"
                f"本次记录编号{new.record_id}（{new.record_time.strftime('%Y-%m-%d')}）。"
                f"系统自动保留最新一次的检测结果，前次记录已归档备查。"
            )

    def get_latest(self, batch_no: str) -> Optional[ProcessingRecord]:
        return self._latest_per_batch.get(batch_no)

    def get_all_records(self, batch_no: str) -> List[ProcessingRecord]:
        return self._records.get(batch_no, [])

    def get_all_latest(self) -> List[ProcessingRecord]:
        return list(self._latest_per_batch.values())

    def get_duplicate_batches(self) -> List[Dict]:
        result = []
        for batch_no, records in self._records.items():
            if len(records) > 1:
                latest = self._latest_per_batch[batch_no]
                result.append({
                    "批号": batch_no,
                    "样品名称": latest.sample_name,
                    "检测次数": len(records),
                    "最早记录": min(r.record_time for r in records).strftime("%Y-%m-%d"),
                    "最新记录": latest.record_time.strftime("%Y-%m-%d"),
                    "采用记录": latest.record_id,
                    "说明": latest.human_explanation,
                })
        return result

    def trace_batch(self, batch_no: str) -> Dict:
        records = self.get_all_records(batch_no)
        if not records:
            return {"error": f"未找到批号 {batch_no} 的任何记录"}

        trace_data = {
            "批号": batch_no,
            "样品名称": records[0].sample_name,
            "检测次数": len(records),
            "记录时间线": [],
        }

        for r in sorted(records, key=lambda x: x.record_time):
            timeline_entry = {
                "记录编号": r.record_id,
                "记录时间": r.record_time.strftime("%Y-%m-%d %H:%M:%S"),
                "记录类型": r.record_type,
                "主峰面积": r._get_main_peak_area(),
                "处理意见": r.human_explanation or (r.interpretation.get("处理意见", "") if r.interpretation else ""),
                "结论": r.final_decision or "待确认",
                "谱图数据文件": [p.get("数据文件名", "") for p in r.peak_areas],
                "称量详情": r.weight_info,
                "判读详情": r.interpretation,
            }
            trace_data["记录时间线"].append(timeline_entry)

        return trace_data

    def to_dataframe(self) -> pd.DataFrame:
        rows = []
        for batch_no in sorted(self._records.keys()):
            for r in sorted(self._records[batch_no], key=lambda x: x.record_time):
                row = r.to_dict()
                if r.interpretation:
                    row["判读人"] = r.interpretation.get("判读人", "")
                    row["判读日期"] = r.interpretation.get("判读日期", "")
                    row["峰形评价"] = r.interpretation.get("峰形评价", "")
                    row["复核结论"] = r.interpretation.get("复核结论", "")
                rows.append(row)
        return pd.DataFrame(rows)

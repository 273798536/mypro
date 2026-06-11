"""报表导出模块 - 供复核人和阿禾交付使用"""
import csv
import json
from pathlib import Path
from typing import Optional, Dict, Any, List

from .database import Database, RECORD_STATUS
from .models import DisputeReplayer, NoteManager


class ReportExporter:
    """复核报表导出器"""

    def __init__(self, db: Database):
        self.db = db
        self.replayer = DisputeReplayer(db)
        self.note_mgr = NoteManager(db)

    def export_status_overview(self, output_path: Path) -> Path:
        """
        导出处理状态总览表 - 复核人日常查看用。
        包含：已处理、挂起待确认、待补证据、待处理 四类数量统计。
        """
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        summary: Dict[str, int] = {k: 0 for k in RECORD_STATUS.keys()}
        records = self.replayer.list_records()
        for r in records:
            summary[r["status"]] = summary.get(r["status"], 0) + 1

        total = len(records)
        with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["处理状态", "数量", "说明"])
            for code, desc in RECORD_STATUS.items():
                writer.writerow([desc, summary.get(code, 0), code])
            writer.writerow([])
            writer.writerow(["总计", total, ""])

        return output_path

    def export_detail_csv(self, output_path: Path, status: Optional[str] = None) -> Path:
        """
        导出 CSV 明细表 - 阿禾给别人看用。
        包含托管回执编号、卡号、金额、日期、审批人、处理状态、结论、挂起原因等。
        """
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        records = self.replayer.list_records(status=status)

        headers = [
            "争议记录ID", "托管回执编号", "来源文件", "卡号", "争议金额",
            "争议日期", "审批人快照", "处理状态", "处理结论",
            "是否挂起", "挂起原因", "是否含脏数据", "脏数据字段",
            "创建时间", "更新时间"
        ]

        with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            for r in records:
                writer.writerow([
                    r["id"],
                    r["receipt_no"],
                    r["source_file"],
                    r["card_no"] or "",
                    r["dispute_amount"] if r["dispute_amount"] is not None else "",
                    r["dispute_date"] or "",
                    r["approver_name_snapshot"] or "",
                    RECORD_STATUS.get(r["status"], r["status"]),
                    r["conclusion"] or "",
                    "是" if r["is_suspended"] else "否",
                    r["suspend_reason"] or "",
                    "是" if r["is_dirty"] else "否",
                    r["dirty_fields"] or "",
                    r["created_at"],
                    r["updated_at"],
                ])

        return output_path

    def export_receipt_mapping(self, output_path: Path) -> Path:
        """
        导出托管回执对照明细表 - 阿禾核对原始回执用。
        包含回执编号、原始内容（JSON）、脏数据标记。
        """
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with self.db.transaction() as conn:
            cur = conn.execute("SELECT * FROM trust_receipts ORDER BY imported_at DESC")
            receipts = cur.fetchall()

        headers = [
            "回执编号", "来源文件", "卡号", "争议金额",
            "争议日期", "原始审批人", "是否脏数据", "脏数据字段",
            "导入时间", "原始内容(JSON)"
        ]

        with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            for r in receipts:
                writer.writerow([
                    r["receipt_no"],
                    r["source_file"],
                    r["card_no"] or "",
                    r["dispute_amount"] if r["dispute_amount"] is not None else "",
                    r["dispute_date"] or "",
                    r["original_approver_name"] or "",
                    "是" if r["is_dirty"] else "否",
                    r["dirty_fields"] or "",
                    r["imported_at"],
                    r["raw_content"],
                ])

        return output_path

    def export_record_history(self, record_id: int, output_path: Path) -> Path:
        """
        导出单条记录的完整历史 - 包括托管回执、备注、改判历史。
        供阿禾对别人演示时使用。
        """
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        detail = self.replayer.get_record_detail(record_id)
        record = detail["record"]
        notes = detail["notes"]
        history = detail["history"]

        with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)

            writer.writerow(["=== 信用卡争议款异常回放 - 单条记录完整档案 ==="])
            writer.writerow([])

            writer.writerow(["【基本信息】"])
            writer.writerow(["争议记录ID", record.get("id")])
            writer.writerow(["托管回执编号", record.get("receipt_no")])
            writer.writerow(["来源文件", record.get("source_file")])
            writer.writerow(["卡号", record.get("card_no") or ""])
            writer.writerow(["争议金额", record.get("dispute_amount") if record.get("dispute_amount") is not None else ""])
            writer.writerow(["争议日期", record.get("dispute_date") or ""])
            writer.writerow(["审批人快照", record.get("approver_name_snapshot") or ""])
            writer.writerow(["当前状态", RECORD_STATUS.get(record.get("status"), record.get("status"))])
            writer.writerow(["当前结论", record.get("conclusion") or ""])
            writer.writerow(["是否挂起", "是" if record.get("is_suspended") else "否"])
            writer.writerow(["挂起原因", record.get("suspend_reason") or ""])
            writer.writerow(["是否含脏数据", "是" if record.get("is_dirty") else "否"])
            writer.writerow(["脏数据字段", record.get("dirty_fields") or ""])
            writer.writerow(["创建时间", record.get("created_at")])
            writer.writerow(["更新时间", record.get("updated_at")])
            writer.writerow([])

            writer.writerow(["【原始托管回执内容】"])
            writer.writerow([record.get("raw_content", "")])
            writer.writerow([])

            writer.writerow(["【手工备注记录】(按时间倒序，不可硬删除)"])
            writer.writerow(["备注ID", "内容", "操作人", "创建时间", "是否已软删"])
            for n in notes:
                writer.writerow([
                    n["id"], n["note_content"], n["operator"],
                    n["created_at"], "是" if n.get("is_deleted") else "否"
                ])
            if not notes:
                writer.writerow(["(无备注)"])
            writer.writerow([])

            writer.writerow(["【结论变更历史】(补录后改判需留痕)"])
            writer.writerow([
                "变更ID", "旧结论", "新结论", "改判原因",
                "新备注", "操作人", "变更时间", "旧材料快照"
            ])
            for h in history:
                writer.writerow([
                    h["id"],
                    h["old_conclusion"] or "(首次录入)",
                    h["new_conclusion"] or "",
                    h["change_reason"] or "",
                    h["new_note"] or "",
                    h["operator"],
                    h["changed_at"],
                    h["old_materials"] or "",
                ])
            if not history:
                writer.writerow(["(无变更历史)"])

        return output_path

    def export_full_package(self, output_dir: Path) -> Dict[str, Path]:
        """
        一键导出完整交付包 - 阿禾给别人看的全部材料。
        包含：状态总览、CSV明细、托管回执对照。
        """
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        paths = {
            "status_overview": self.export_status_overview(output_dir / "01_处理状态总览.csv"),
            "detail_csv": self.export_detail_csv(output_dir / "02_争议处理明细.csv"),
            "receipt_mapping": self.export_receipt_mapping(output_dir / "03_托管回执对照表.csv"),
        }
        return paths

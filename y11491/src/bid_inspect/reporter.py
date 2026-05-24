from datetime import datetime
from typing import Dict, List, Any
from pathlib import Path

import pandas as pd
from sqlalchemy.orm import Session

from .models import (
    BidRecord,
    RecordStatus,
    RecordType,
    ImportFailure,
    RecordHistory,
    ImportSession,
)
from .config import Config


class ReportGenerator:
    def __init__(self, db: Session):
        self.db = db

    def generate_summary(self) -> Dict[str, Any]:
        total_records = self.db.query(BidRecord).count()
        valid_records = (
            self.db.query(BidRecord).filter(BidRecord.status == RecordStatus.VALID).count()
        )
        invalid_records = (
            self.db.query(BidRecord).filter(BidRecord.status == RecordStatus.INVALID).count()
        )
        pending_records = (
            self.db.query(BidRecord).filter(BidRecord.status == RecordStatus.PENDING).count()
        )
        fixed_records = (
            self.db.query(BidRecord).filter(BidRecord.status == RecordStatus.FIXED).count()
        )

        type_stats = {}
        for rtype in RecordType:
            count = (
                self.db.query(BidRecord)
                .filter(BidRecord.record_type == rtype)
                .count()
            )
            type_stats[rtype.value] = count

        unresolved_failures = (
            self.db.query(ImportFailure)
            .filter(ImportFailure.is_resolved == False)
            .count()
        )

        return {
            "generated_at": datetime.now().isoformat(),
            "total_records": total_records,
            "status_breakdown": {
                "valid": valid_records,
                "invalid": invalid_records,
                "pending": pending_records,
                "fixed": fixed_records,
            },
            "type_breakdown": type_stats,
            "unresolved_failures": unresolved_failures,
        }

    def generate_failure_list(self) -> List[Dict[str, Any]]:
        failures = (
            self.db.query(ImportFailure)
            .filter(ImportFailure.is_resolved == False)
            .order_by(ImportFailure.source_file, ImportFailure.source_row)
            .all()
        )

        result = []
        for f in failures:
            result.append({
                "id": f.id,
                "source_file": f.source_file,
                "source_row": f.source_row,
                "error_code": f.error_code,
                "error_message": f.error_message,
                "field_name": f.field_name,
                "raw_value": f.raw_value,
                "record_id": f.record_id,
            })

        return result

    def generate_record_list(
        self,
        status: RecordStatus = None,
        record_type: RecordType = None,
    ) -> List[Dict[str, Any]]:
        query = self.db.query(BidRecord)

        if status:
            query = query.filter(BidRecord.status == status)
        if record_type:
            query = query.filter(BidRecord.record_type == record_type)

        records = query.order_by(BidRecord.source_file, BidRecord.source_row).all()

        result = []
        for r in records:
            result.append({
                "id": r.id,
                "record_key": r.record_key,
                "record_type": r.record_type.value,
                "source_file": r.source_file,
                "source_row": r.source_row,
                "version": r.version,
                "status": r.status.value,
                "supplier_name": r.supplier_name,
                "qualification_type": r.qualification_type,
                "qualification_level": r.qualification_level,
                "price_version": r.price_version,
                "total_amount": r.total_amount,
                "scan_page": r.scan_page,
                "photo_path": r.photo_path,
                "anomaly_type": r.anomaly_type,
                "customer_remark": r.customer_remark,
                "updated_by": r.updated_by,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            })

        return result

    def generate_full_report(self) -> Dict[str, Any]:
        return {
            "summary": self.generate_summary(),
            "failures": self.generate_failure_list(),
            "valid_records": self.generate_record_list(status=RecordStatus.VALID),
            "invalid_records": self.generate_record_list(status=RecordStatus.INVALID),
            "pending_records": self.generate_record_list(status=RecordStatus.PENDING),
            "fixed_records": self.generate_record_list(status=RecordStatus.FIXED),
        }


class Exporter:
    def __init__(self, db: Session):
        self.db = db
        self.generator = ReportGenerator(db)

    def export_to_excel(self, filename: str = None) -> str:
        Config.ensure_dirs()

        if not filename:
            filename = f"bid_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

        filepath = Config.EXPORT_DIR / filename

        report = self.generator.generate_full_report()

        with pd.ExcelWriter(filepath, engine="openpyxl") as writer:
            summary_data = []
            summary = report["summary"]
            summary_data.append(["报表生成时间", summary["generated_at"]])
            summary_data.append(["总记录数", summary["total_records"]])
            summary_data.append(["有效记录", summary["status_breakdown"]["valid"]])
            summary_data.append(["无效记录", summary["status_breakdown"]["invalid"]])
            summary_data.append(["待处理", summary["status_breakdown"]["pending"]])
            summary_data.append(["已修复", summary["status_breakdown"]["fixed"]])
            summary_data.append(["未解决失败数", summary["unresolved_failures"]])
            pd.DataFrame(summary_data, columns=["项目", "数值"]).to_excel(
                writer, sheet_name="汇总", index=False
            )

            for status_name, records in [
                ("有效记录", report["valid_records"]),
                ("无效记录", report["invalid_records"]),
                ("待处理", report["pending_records"]),
                ("已修复", report["fixed_records"]),
            ]:
                if records:
                    df = pd.DataFrame(records)
                    df.to_excel(writer, sheet_name=status_name, index=False)

            if report["failures"]:
                df_failures = pd.DataFrame(report["failures"])
                df_failures.to_excel(writer, sheet_name="失败清单", index=False)

        return str(filepath)

    def export_valid_records_csv(self, filename: str = None) -> str:
        Config.ensure_dirs()

        if not filename:
            filename = f"valid_records_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

        filepath = Config.EXPORT_DIR / filename

        records = self.generator.generate_record_list(status=RecordStatus.VALID)
        if records:
            df = pd.DataFrame(records)
            df.to_csv(filepath, index=False, encoding="utf-8-sig")

        return str(filepath)


class HistoryQuery:
    def __init__(self, db: Session):
        self.db = db

    def get_record_history(self, record_id: int) -> List[Dict[str, Any]]:
        histories = (
            self.db.query(RecordHistory)
            .filter(RecordHistory.record_id == record_id)
            .order_by(RecordHistory.operated_at.desc())
            .all()
        )

        result = []
        for h in histories:
            result.append({
                "id": h.id,
                "operation": h.operation.value,
                "operated_by": h.operated_by,
                "operated_at": h.operated_at.isoformat(),
                "old_values": h.old_values,
                "new_values": h.new_values,
                "remark": h.remark,
            })

        return result

    def get_import_sessions(self, limit: int = 50) -> List[Dict[str, Any]]:
        sessions = (
            self.db.query(ImportSession)
            .order_by(ImportSession.imported_at.desc())
            .limit(limit)
            .all()
        )

        result = []
        for s in sessions:
            result.append({
                "session_id": s.session_id,
                "import_type": s.import_type.value,
                "source_file": s.source_file,
                "total_rows": s.total_rows,
                "success_count": s.success_count,
                "failure_count": s.failure_count,
                "imported_by": s.imported_by,
                "imported_at": s.imported_at.isoformat(),
                "is_duplicate": s.is_duplicate,
            })

        return result

    def get_all_changes(self, start_date: datetime = None, end_date: datetime = None) -> List[Dict[str, Any]]:
        query = self.db.query(RecordHistory)

        if start_date:
            query = query.filter(RecordHistory.operated_at >= start_date)
        if end_date:
            query = query.filter(RecordHistory.operated_at <= end_date)

        histories = query.order_by(RecordHistory.operated_at.desc()).all()

        result = []
        for h in histories:
            result.append({
                "record_id": h.record_id,
                "operation": h.operation.value,
                "operated_by": h.operated_by,
                "operated_at": h.operated_at.isoformat(),
                "remark": h.remark,
            })

        return result

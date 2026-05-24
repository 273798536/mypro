import pytest
import pandas as pd
import tempfile
import os

from bid_inspect.importer import ImportService
from bid_inspect.reporter import ReportGenerator, Exporter, HistoryQuery
from bid_inspect.checker import CheckService
from bid_inspect.models import RecordType, BidRecord, RecordStatus


class TestDataConsistency:
    def test_report_and_export_use_same_data(self, test_db, temp_excel_file, tmp_path):
        df = pd.DataFrame([
            {
                "supplier_name": "供应商A",
                "qualification_type": "营业执照",
                "qualification_level": "一级",
            },
            {
                "supplier_name": "供应商B",
                "qualification_type": "资质证书",
                "qualification_level": "甲级",
            },
        ])
        file_path = temp_excel_file(df)

        service = ImportService(test_db, "test_user")
        service.import_file(file_path, RecordType.QUALIFICATION)

        generator = ReportGenerator(test_db)
        report = generator.generate_full_report()

        exporter = Exporter(test_db)
        export_path = exporter.export_to_excel(str(tmp_path / "test_export.xlsx"))

        export_df = pd.read_excel(export_path, sheet_name="有效记录")

        assert len(report["valid_records"]) == len(export_df)
        assert report["summary"]["total_records"] == 2

    def test_history_persists_after_update(self, test_db, temp_excel_file):
        df = pd.DataFrame([
            {
                "supplier_name": "供应商A",
                "qualification_type": "营业执照",
            }
        ])
        file_path = temp_excel_file(df)

        service = ImportService(test_db, "user1")
        result1 = service.import_file(file_path, RecordType.QUALIFICATION)

        df2 = pd.DataFrame([
            {
                "supplier_name": "供应商A",
                "qualification_type": "营业执照",
                "qualification_level": "一级",
            }
        ])
        file_path2 = temp_excel_file(df2)
        service2 = ImportService(test_db, "user2")
        result2 = service2.import_file(file_path2, RecordType.QUALIFICATION, allow_duplicate=True)

        record = test_db.query(BidRecord).first()
        assert record.version == 2

        query = HistoryQuery(test_db)
        histories = query.get_record_history(record.id)
        assert len(histories) == 2
        assert histories[0]["operation"] == "update" or histories[1]["operation"] == "update"

    def test_check_results_affect_status(self, test_db, temp_excel_file):
        df = pd.DataFrame([
            {
                "supplier_name": "A",
                "qualification_type": "营业执照",
            }
        ])
        file_path = temp_excel_file(df)

        service = ImportService(test_db, "test_user")
        service.import_file(file_path, RecordType.QUALIFICATION)

        record_before = test_db.query(BidRecord).first()
        assert record_before.status == RecordStatus.VALID

        checker = CheckService(test_db)
        checker.check_all()

        record_after = test_db.query(BidRecord).first()
        assert record_after.status == RecordStatus.INVALID

    def test_export_includes_source_row_for_traceability(self, test_db, temp_excel_file, tmp_path):
        df = pd.DataFrame([
            {
                "supplier_name": "供应商A",
                "qualification_type": "营业执照",
            },
            {
                "supplier_name": "供应商B",
                "qualification_type": "资质证书",
            },
        ])
        file_path = temp_excel_file(df)

        service = ImportService(test_db, "test_user")
        service.import_file(file_path, RecordType.QUALIFICATION)

        exporter = Exporter(test_db)
        export_path = exporter.export_to_excel(str(tmp_path / "trace.xlsx"))

        export_df = pd.read_excel(export_path, sheet_name="有效记录")
        assert "source_row" in export_df.columns
        assert "source_file" in export_df.columns

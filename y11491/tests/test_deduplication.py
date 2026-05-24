import pytest
import pandas as pd

from bid_inspect.importer import ImportService
from bid_inspect.models import RecordType, BidRecord, ImportSession


class TestDeduplication:
    def test_same_record_import_only_updates(self, test_db, temp_excel_file):
        df1 = pd.DataFrame([
            {
                "supplier_name": "测试供应商A",
                "qualification_type": "营业执照",
                "qualification_level": "一级",
            }
        ])
        file_path1 = temp_excel_file(df1)

        service = ImportService(test_db, "test_user")

        result1 = service.import_file(file_path1, RecordType.QUALIFICATION)
        assert result1["success_count"] == 1
        assert result1["update_count"] == 0

        df2 = pd.DataFrame([
            {
                "supplier_name": "测试供应商A",
                "qualification_type": "营业执照",
                "qualification_level": "特级",
            }
        ])
        file_path2 = temp_excel_file(df2)

        result2 = service.import_file(file_path2, RecordType.QUALIFICATION, allow_duplicate=True)
        assert result2["success_count"] == 0
        assert result2["update_count"] == 1

        records = test_db.query(BidRecord).all()
        assert len(records) == 1
        assert records[0].version == 2
        assert records[0].qualification_level == "特级"

    def test_different_same_type_records_both_imported(self, test_db, temp_excel_file):
        df = pd.DataFrame([
            {
                "supplier_name": "供应商A",
                "qualification_type": "营业执照",
                "qualification_level": "一级",
            },
            {
                "supplier_name": "供应商B",
                "qualification_type": "营业执照",
                "qualification_level": "二级",
            },
        ])
        file_path = temp_excel_file(df)

        service = ImportService(test_db, "test_user")
        result = service.import_file(file_path, RecordType.QUALIFICATION)

        assert result["success_count"] == 2
        records = test_db.query(BidRecord).all()
        assert len(records) == 2

    def test_same_supplier_different_qualification_types(self, test_db, temp_excel_file):
        df = pd.DataFrame([
            {
                "supplier_name": "供应商A",
                "qualification_type": "营业执照",
                "qualification_level": "一级",
            },
            {
                "supplier_name": "供应商A",
                "qualification_type": "资质证书",
                "qualification_level": "甲级",
            },
        ])
        file_path = temp_excel_file(df)

        service = ImportService(test_db, "test_user")
        result = service.import_file(file_path, RecordType.QUALIFICATION)

        assert result["success_count"] == 2
        records = test_db.query(BidRecord).all()
        assert len(records) == 2

    def test_duplicate_file_detection(self, test_db, temp_excel_file):
        df = pd.DataFrame([
            {
                "supplier_name": "测试供应商",
                "qualification_type": "营业执照",
            }
        ])
        file_path = temp_excel_file(df, filename="test_dup_detect.xlsx")

        service = ImportService(test_db, "test_user")

        result1 = service.import_file(file_path, RecordType.QUALIFICATION)
        assert not result1["is_duplicate"]

        result2 = service.import_file(file_path, RecordType.QUALIFICATION)
        assert result2["is_duplicate"]

        sessions = test_db.query(ImportSession).all()
        assert len(sessions) == 1

    def test_force_import_bypasses_duplicate_check(self, test_db, temp_excel_file):
        df = pd.DataFrame([
            {
                "supplier_name": "测试供应商",
                "qualification_type": "营业执照",
            }
        ])
        file_path = temp_excel_file(df)

        service = ImportService(test_db, "test_user")

        result1 = service.import_file(file_path, RecordType.QUALIFICATION)
        assert not result1["is_duplicate"]

        result2 = service.import_file(file_path, RecordType.QUALIFICATION, allow_duplicate=True)
        assert not result2["is_duplicate"]

        sessions = test_db.query(ImportSession).all()
        assert len(sessions) == 2

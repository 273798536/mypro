import pytest
import pandas as pd

from bid_inspect.importer import ImportService
from bid_inspect.core import FailureManager, RecordManager
from bid_inspect.models import RecordType, ImportFailure, BidRecord, RecordStatus


class TestFailureHandling:
    def test_missing_required_field_creates_failure(self, test_db, temp_excel_file):
        df = pd.DataFrame([
            {
                "supplier_name": "",
                "qualification_type": "营业执照",
            }
        ])
        file_path = temp_excel_file(df)

        service = ImportService(test_db, "test_user")
        result = service.import_file(file_path, RecordType.QUALIFICATION)

        assert result["failure_count"] == 1
        failures = test_db.query(ImportFailure).all()
        assert len(failures) == 1
        assert "缺少必填字段" in failures[0].error_message

    def test_invalid_price_creates_failure(self, test_db, temp_excel_file):
        df = pd.DataFrame([
            {
                "supplier_name": "测试供应商",
                "price_version": "V1",
                "total_amount": "不是数字",
            }
        ])
        file_path = temp_excel_file(df)

        service = ImportService(test_db, "test_user")
        result = service.import_file(file_path, RecordType.PRICE_VERSION)

        assert result["failure_count"] == 1

    def test_failures_are_not_included_in_valid_summary(self, test_db, temp_excel_file):
        df = pd.DataFrame([
            {
                "supplier_name": "有效供应商",
                "qualification_type": "营业执照",
            },
            {
                "supplier_name": "",
                "qualification_type": "资质证书",
            },
        ])
        file_path = temp_excel_file(df)

        service = ImportService(test_db, "test_user")
        service.import_file(file_path, RecordType.QUALIFICATION)

        valid_records = test_db.query(BidRecord).filter(
            BidRecord.status == RecordStatus.VALID
        ).count()
        failures = test_db.query(ImportFailure).filter(
            ImportFailure.is_resolved == False
        ).count()

        assert valid_records == 1
        assert failures == 1

    def test_failure_preserves_source_row(self, test_db, temp_excel_file):
        df = pd.DataFrame([
            {
                "supplier_name": "有效供应商",
                "qualification_type": "营业执照",
            },
            {
                "supplier_name": "",
                "qualification_type": "资质证书",
            },
        ])
        file_path = temp_excel_file(df)

        service = ImportService(test_db, "test_user")
        service.import_file(file_path, RecordType.QUALIFICATION)

        failure = test_db.query(ImportFailure).first()
        assert failure.source_row == 3

    def test_fix_record_resolves_failures(self, test_db):
        record = BidRecord(
            record_key="test_key_123",
            record_type=RecordType.QUALIFICATION,
            source_file="test.xlsx",
            source_row=2,
            supplier_name="测试供应商",
            qualification_type="营业执照",
            status=RecordStatus.INVALID,
        )
        test_db.add(record)
        test_db.flush()

        failure = ImportFailure(
            record_id=record.id,
            source_file="test.xlsx",
            source_row=2,
            error_code="TEST_ERROR",
            error_message="测试错误",
        )
        test_db.add(failure)
        test_db.commit()

        manager = RecordManager(test_db, "fixer")
        manager.fix_record(record.id, {"qualification_level": "一级"}, "测试修复")
        test_db.commit()

        updated_failure = test_db.query(ImportFailure).first()
        assert updated_failure.is_resolved == True
        assert updated_failure.resolved_at is not None

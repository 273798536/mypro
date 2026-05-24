import pytest
import pandas as pd

from bid_inspect.importer import ImportService
from bid_inspect.core import FailureManager, RecordManager
from bid_inspect.reporter import ReportGenerator
from bid_inspect.models import RecordType, ImportFailure, BidRecord, RecordStatus


class TestFailureConvergence:
    def test_reimport_fixed_row_resolves_old_failure(self, test_db, temp_excel_file):
        df_bad = pd.DataFrame([
            {
                "supplier_name": "测试供应商",
                "price_version": "V1",
                "total_amount": "不是数字",
            }
        ])
        file_path = temp_excel_file(df_bad, filename="convergence_test.xlsx")

        service = ImportService(test_db, "user1")
        result1 = service.import_file(file_path, RecordType.PRICE_VERSION, allow_duplicate=True)

        assert result1["failure_count"] == 1

        unresolved = test_db.query(ImportFailure).filter(
            ImportFailure.is_resolved == False
        ).count()
        assert unresolved == 1

        df_fixed = pd.DataFrame([
            {
                "supplier_name": "测试供应商",
                "price_version": "V1",
                "total_amount": "1000000",
            }
        ])
        file_path_fixed = temp_excel_file(df_fixed, filename="convergence_test.xlsx")

        result2 = service.import_file(file_path_fixed, RecordType.PRICE_VERSION, allow_duplicate=True)

        assert result2["success_count"] == 1
        assert result2["failure_count"] == 0

        unresolved_after = test_db.query(ImportFailure).filter(
            ImportFailure.is_resolved == False
        ).count()
        assert unresolved_after == 0

        resolved = test_db.query(ImportFailure).filter(
            ImportFailure.is_resolved == True
        ).count()
        assert resolved == 1

    def test_parse_failure_row_resolved_on_successful_import(self, test_db, temp_excel_file):
        df1 = pd.DataFrame([
            {"supplier_name": "", "qualification_type": "营业执照"},
        ])
        file_path = temp_excel_file(df1, filename="parse_fail_test.xlsx")

        service = ImportService(test_db, "user1")
        service.import_file(file_path, RecordType.QUALIFICATION, allow_duplicate=True)

        failures = test_db.query(ImportFailure).all()
        assert len(failures) == 1
        assert failures[0].record_id is None
        assert failures[0].is_resolved == False

        df2 = pd.DataFrame([
            {"supplier_name": "修复后的供应商", "qualification_type": "营业执照"},
        ])
        file_path2 = temp_excel_file(df2, filename="parse_fail_test.xlsx")

        service.import_file(file_path2, RecordType.QUALIFICATION, allow_duplicate=True)

        failure_after = test_db.query(ImportFailure).first()
        assert failure_after.is_resolved == True

        records = test_db.query(BidRecord).all()
        assert len(records) == 1

    def test_report_shows_correct_unresolved_count(self, test_db, temp_excel_file):
        df = pd.DataFrame([
            {"supplier_name": "好供应商A", "qualification_type": "资质A"},
            {"supplier_name": "", "qualification_type": "资质B"},
        ])
        file_path = temp_excel_file(df, filename="report_test.xlsx")

        service = ImportService(test_db, "user1")
        service.import_file(file_path, RecordType.QUALIFICATION, allow_duplicate=True)

        generator = ReportGenerator(test_db)
        report1 = generator.generate_summary()
        assert report1["unresolved_failures"] == 1

        df_fixed = pd.DataFrame([
            {"supplier_name": "好供应商A", "qualification_type": "资质A"},
            {"supplier_name": "修复后供应商B", "qualification_type": "资质B"},
        ])
        file_path_fixed = temp_excel_file(df_fixed, filename="report_test.xlsx")

        service.import_file(file_path_fixed, RecordType.QUALIFICATION, allow_duplicate=True)

        report2 = generator.generate_summary()
        assert report2["unresolved_failures"] == 0

    def test_fix_record_resolves_unbound_failures(self, test_db):
        failure = ImportFailure(
            source_file="manual_fix_test.xlsx",
            source_row=5,
            error_code="PARSE_ERROR",
            error_message="测试错误",
            is_resolved=False,
        )
        test_db.add(failure)
        test_db.commit()

        record = BidRecord(
            record_key="test_manual_fix_123",
            record_type=RecordType.QUALIFICATION,
            source_file="manual_fix_test.xlsx",
            source_row=5,
            supplier_name="测试供应商",
            qualification_type="营业执照",
            status=RecordStatus.INVALID,
        )
        test_db.add(record)
        test_db.commit()

        manager = RecordManager(test_db, "fixer")
        manager.fix_record(record.id, {"qualification_level": "一级"}, "手动修复")
        test_db.commit()

        updated_failure = test_db.query(ImportFailure).first()
        assert updated_failure.is_resolved == True

    def test_multiple_failures_same_row_all_resolved(self, test_db, temp_excel_file):
        for i in range(3):
            df = pd.DataFrame([
                {"supplier_name": "", "qualification_type": "营业执照"},
            ])
            file_path = temp_excel_file(df, filename="multi_fail_test.xlsx")
            service = ImportService(test_db, "user1")
            service.import_file(file_path, RecordType.QUALIFICATION, allow_duplicate=True)

        failures = test_db.query(ImportFailure).all()
        assert len(failures) == 3
        unresolved = test_db.query(ImportFailure).filter(
            ImportFailure.is_resolved == False
        ).count()
        assert unresolved == 3

        df_fixed = pd.DataFrame([
            {"supplier_name": "最终修复", "qualification_type": "营业执照"},
        ])
        file_path_fixed = temp_excel_file(df_fixed, filename="multi_fail_test.xlsx")
        service.import_file(file_path_fixed, RecordType.QUALIFICATION, allow_duplicate=True)

        unresolved_after = test_db.query(ImportFailure).filter(
            ImportFailure.is_resolved == False
        ).count()
        assert unresolved_after == 0

        all_resolved = test_db.query(ImportFailure).filter(
            ImportFailure.is_resolved == True
        ).count()
        assert all_resolved == 3

    def test_failure_resolve_message_remark(self, test_db, temp_excel_file):
        df_bad = pd.DataFrame([
            {"supplier_name": "", "qualification_type": "营业执照"},
        ])
        file_path = temp_excel_file(df_bad, filename="remark_test.xlsx")

        service = ImportService(test_db, "user1")
        service.import_file(file_path, RecordType.QUALIFICATION, allow_duplicate=True)

        df_fixed = pd.DataFrame([
            {"supplier_name": "已修复供应商", "qualification_type": "营业执照"},
        ])
        file_path_fixed = temp_excel_file(df_fixed, filename="remark_test.xlsx")
        service.import_file(file_path_fixed, RecordType.QUALIFICATION, allow_duplicate=True)

        failure = test_db.query(ImportFailure).first()
        assert "已解决" in failure.error_message
        assert "重新导入成功" in failure.error_message

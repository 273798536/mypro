import os
import sys
import tempfile
import pandas as pd

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from ledger.database import Base
from ledger.models import (
    RecordType, RecordStatus, Role, ChangeReason,
    LedgerRecord, DeclarationForm, AuditLog
)
from ledger.services import (
    RecordService, ImportService, ExportService, AuditService,
    StateTransitionError, RecordFrozenError
)


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class TestStateMachine:
    def test_valid_transitions(self, db_session):
        service = RecordService(db_session)
        record = service.create_record(
            record_type=RecordType.DECLARATION,
            tracking_no="TEST001",
            created_by="user1",
            created_by_role=Role.DATA_ENTRY,
            hs_code="85171210",
            goods_description="手机",
            declared_value=1000,
        )
        assert record.status == RecordStatus.DRAFT

        record = service.submit_record(record.id, "user1", Role.DATA_ENTRY)
        assert record.status == RecordStatus.SUBMITTED

        record = service.reject_record(record.id, "reviewer1", Role.REVIEWER, "信息不全")
        assert record.status == RecordStatus.REJECTED

        record = service.submit_record(record.id, "user1", Role.DATA_ENTRY, "已补充信息")
        assert record.status == RecordStatus.SUBMITTED

        record = service.confirm_record(record.id, "manager1", Role.MANAGER)
        assert record.status == RecordStatus.CONFIRMED

    def test_invalid_transition(self, db_session):
        service = RecordService(db_session)
        record = service.create_record(
            record_type=RecordType.DECLARATION,
            tracking_no="TEST002",
            created_by="user1",
            created_by_role=Role.DATA_ENTRY,
        )

        with pytest.raises(StateTransitionError):
            service.confirm_record(record.id, "manager1", Role.MANAGER)

    def test_frozen_record_cannot_be_modified(self, db_session):
        service = RecordService(db_session)
        record = service.create_record(
            record_type=RecordType.DECLARATION,
            tracking_no="TEST003",
            created_by="user1",
            created_by_role=Role.DATA_ENTRY,
        )

        record = service.submit_record(record.id, "user1", Role.DATA_ENTRY)
        record = service.confirm_record(record.id, "manager1", Role.MANAGER)
        record = service.freeze_record(record.id, "manager1", Role.MANAGER, "导出前冻结")

        assert record.is_frozen == True

        with pytest.raises(RecordFrozenError):
            service.submit_record(record.id, "user1", Role.DATA_ENTRY)


class TestVersionControl:
    def test_version_increments_on_change(self, db_session):
        service = RecordService(db_session)
        record = service.create_record(
            record_type=RecordType.DECLARATION,
            tracking_no="TEST004",
            created_by="user1",
            created_by_role=Role.DATA_ENTRY,
            declared_value=1000,
        )
        initial_version = record.version

        record = service.update_record(
            record.id,
            "user1",
            Role.DATA_ENTRY,
            change_reason=ChangeReason.DATA_ENTRY_ERROR,
            change_reason_note="修正申报价值",
            declared_value=1500,
        )

        assert record.version == initial_version + 1

    def test_audit_log_captures_changes(self, db_session):
        service = RecordService(db_session)
        audit_service = AuditService(db_session)

        record = service.create_record(
            record_type=RecordType.DECLARATION,
            tracking_no="TEST005",
            created_by="user1",
            created_by_role=Role.DATA_ENTRY,
            declared_value=1000,
        )

        record = service.update_record(
            record.id,
            "user1",
            Role.DATA_ENTRY,
            change_reason=ChangeReason.DATA_ENTRY_ERROR,
            declared_value=2000,
            tax_amount=100,
        )

        history = audit_service.get_record_history(record.id)
        assert len(history) >= 2

        update_action = next((h for h in history if h.audit_log.action.value == "update"), None)
        assert update_action is not None

        diff_fields = {d.field_name for d in update_action.diffs}
        assert "declared_value" in diff_fields
        assert "tax_amount" in diff_fields


class TestRecallAndResubmit:
    def test_recall_submitted_record(self, db_session):
        service = RecordService(db_session)
        record = service.create_record(
            record_type=RecordType.DECLARATION,
            tracking_no="TEST006",
            created_by="user1",
            created_by_role=Role.DATA_ENTRY,
        )

        record = service.submit_record(record.id, "user1", Role.DATA_ENTRY)
        assert record.status == RecordStatus.SUBMITTED

        record = service.recall_record(record.id, "user1", Role.DATA_ENTRY, "发现错误需要修改")
        assert record.status == RecordStatus.DRAFT

        record = service.update_record(
            record.id,
            "user1",
            Role.DATA_ENTRY,
            change_reason=ChangeReason.DATA_ENTRY_ERROR,
            goods_description="修正后的商品名称",
        )

        record = service.submit_record(record.id, "user1", Role.DATA_ENTRY, "重新提交")
        assert record.status == RecordStatus.SUBMITTED

    def test_recall_rejected_record(self, db_session):
        service = RecordService(db_session)
        record = service.create_record(
            record_type=RecordType.DECLARATION,
            tracking_no="TEST007",
            created_by="user1",
            created_by_role=Role.DATA_ENTRY,
        )

        record = service.submit_record(record.id, "user1", Role.DATA_ENTRY)
        record = service.reject_record(record.id, "reviewer1", Role.REVIEWER, "HS编码错误")
        assert record.status == RecordStatus.REJECTED

        record = service.recall_record(record.id, "user1", Role.DATA_ENTRY, "修改HS编码")
        assert record.status == RecordStatus.DRAFT


class TestImportService:
    def test_import_with_source_tracking(self, db_session):
        service = ImportService(db_session)

        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("tracking_no,hs_code,goods_description,declared_value\n")
            f.write("IMP001,85171210,手机,1000\n")
            f.write("IMP002,85258013,耳机,500\n")
            temp_path = f.name

        try:
            with open(temp_path, 'rb') as f:
                content = f.read()

            import_source, result = service.import_from_file(
                filename="test.csv",
                file_content=content,
                record_type=RecordType.DECLARATION,
                imported_by="importer1",
                imported_by_role=Role.DATA_ENTRY,
            )

            assert result.success_count == 2
            assert result.failed_count == 0

            records = service.get_records_by_source(import_source.id)
            assert len(records) == 2

            for record in records:
                assert record.import_source_id == import_source.id
                assert record.import_row_number is not None
                assert record.import_raw_data is not None

        finally:
            os.unlink(temp_path)

    def test_partial_import_failure(self, db_session):
        service = ImportService(db_session)

        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("tracking_no,hs_code,goods_description,declared_value\n")
            f.write(",85171210,手机,1000\n")
            f.write("VALID001,85258013,耳机,500\n")
            f.write(",85171210,平板,800\n")
            temp_path = f.name

        try:
            with open(temp_path, 'rb') as f:
                content = f.read()

            import_source, result = service.import_from_file(
                filename="test.csv",
                file_content=content,
                record_type=RecordType.DECLARATION,
                imported_by="importer1",
                imported_by_role=Role.DATA_ENTRY,
            )

            assert result.success_count == 1
            assert result.failed_count == 2
            assert len(result.errors) == 2

        finally:
            os.unlink(temp_path)

    def test_duplicate_import_detection(self, db_session):
        service = ImportService(db_session)

        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("tracking_no,hs_code\n")
            f.write("DUP001,85171210\n")
            temp_path = f.name

        try:
            with open(temp_path, 'rb') as f:
                content = f.read()

            file_hash = service._calculate_file_hash(content)
            assert service.check_duplicate_import(file_hash) is None

            service.import_from_file(
                filename="test.csv",
                file_content=content,
                record_type=RecordType.DECLARATION,
                imported_by="importer1",
                imported_by_role=Role.DATA_ENTRY,
            )

            duplicate = service.check_duplicate_import(file_hash)
            assert duplicate is not None

        finally:
            os.unlink(temp_path)


class TestManualCorrection:
    def test_manual_correction_with_reason(self, db_session):
        service = RecordService(db_session)
        audit_service = AuditService(db_session)

        record = service.create_record(
            record_type=RecordType.DECLARATION,
            tracking_no="MANUAL001",
            created_by="user1",
            created_by_role=Role.DATA_ENTRY,
            tax_amount=100,
            is_exception=False,
        )

        record = service.submit_record(record.id, "user1", Role.DATA_ENTRY)
        record = service.reject_record(record.id, "reviewer1", Role.REVIEWER, "税费计算错误")

        record = service.update_record(
            record.id,
            "manager1",
            Role.MANAGER,
            change_reason=ChangeReason.TAX_RECALCULATION,
            change_reason_note="海关重新核定税费",
            tax_amount=150,
            is_exception=True,
            exception_owner="税务组",
        )

        reasons = audit_service.get_change_reason_summary(record.id)
        assert len(reasons) >= 1

        reason_entry = next((r for r in reasons if "税费" in (r.get("reason") or "")), None)
        assert reason_entry is not None

    def test_package_split_tracking(self, db_session):
        service = RecordService(db_session)

        parent = service.create_record(
            record_type=RecordType.DECLARATION,
            tracking_no="SPLIT001",
            created_by="user1",
            created_by_role=Role.DATA_ENTRY,
            goods_description="组合商品",
            quantity=2,
            declared_value=2000,
        )

        child1 = service.create_record(
            record_type=RecordType.DECLARATION,
            tracking_no="SPLIT001-A",
            created_by="user1",
            created_by_role=Role.DATA_ENTRY,
            goods_description="商品A",
            quantity=1,
            declared_value=1200,
        )
        child1.parent_record_id = parent.id

        child2 = service.create_record(
            record_type=RecordType.DECLARATION,
            tracking_no="SPLIT001-B",
            created_by="user1",
            created_by_role=Role.DATA_ENTRY,
            goods_description="商品B",
            quantity=1,
            declared_value=800,
        )
        child2.parent_record_id = parent.id

        db_session.commit()

        children = db_session.query(LedgerRecord).filter(LedgerRecord.parent_record_id == parent.id).all()
        assert len(children) == 2


class TestFreezeAndExport:
    def test_freeze_before_export(self, db_session):
        service = RecordService(db_session)
        export_service = ExportService(db_session)

        record = service.create_record(
            record_type=RecordType.DECLARATION,
            tracking_no="FREEZE001",
            created_by="user1",
            created_by_role=Role.DATA_ENTRY,
            declared_value=1000,
            tax_amount=100,
        )
        record = service.submit_record(record.id, "user1", Role.DATA_ENTRY)
        record = service.confirm_record(record.id, "manager1", Role.MANAGER)
        record = service.freeze_record(record.id, "manager1", Role.MANAGER, "月度导出")

        data = export_service.export_records(record_ids=[record.id])
        assert len(data) == 1
        assert data[0]["is_frozen"] == True

    def test_desensitized_export(self, db_session):
        service = RecordService(db_session)
        export_service = ExportService(db_session)

        record = service.create_record(
            record_type=RecordType.DECLARATION,
            tracking_no="SENS001",
            created_by="user1",
            created_by_role=Role.DATA_ENTRY,
            declared_value=1000,
            tax_amount=100,
            duty_amount=50,
            vat_amount=50,
        )

        data = export_service.export_records(record_ids=[record.id], desensitize=True)
        assert data[0]["declared_value"] == "***"
        assert data[0]["tax_amount"] == "***"

    def test_role_based_export(self, db_session):
        service = RecordService(db_session)
        export_service = ExportService(db_session)

        record = service.create_record(
            record_type=RecordType.DECLARATION,
            tracking_no="ROLE001",
            created_by="user1",
            created_by_role=Role.DATA_ENTRY,
            declared_value=1000,
            tax_amount=100,
            is_exception=True,
            exception_owner="税务组",
        )

        data_entry_view = export_service.export_records(
            record_ids=[record.id], role=Role.DATA_ENTRY
        )
        assert len(data_entry_view) > 0

        manager_view = export_service.export_records(
            record_ids=[record.id], role=Role.MANAGER
        )
        assert "declared_value" in manager_view[0]
        assert manager_view[0]["declared_value"] == 1000

        export_view = export_service.export_records(
            record_ids=[record.id], desensitize=True
        )
        assert export_view[0]["declared_value"] == "***"


class TestExceptionTracking:
    def test_exception_owner_assignment(self, db_session):
        service = RecordService(db_session)
        export_service = ExportService(db_session)

        service.create_record(
            record_type=RecordType.DECLARATION,
            tracking_no="EXC001",
            created_by="user1",
            created_by_role=Role.DATA_ENTRY,
            is_exception=True,
            exception_owner="税务组",
            exception_note="税费计算待确认",
        )

        service.create_record(
            record_type=RecordType.DECLARATION,
            tracking_no="EXC002",
            created_by="user1",
            created_by_role=Role.DATA_ENTRY,
            is_exception=True,
            exception_owner="报关组",
        )

        service.create_record(
            record_type=RecordType.DECLARATION,
            tracking_no="EXC003",
            created_by="user1",
            created_by_role=Role.DATA_ENTRY,
            is_exception=False,
        )

        report = export_service.generate_exception_report()
        assert report["total_exceptions"] == 2
        assert "税务组" in report["exception_by_owner"]
        assert "报关组" in report["exception_by_owner"]


class TestExportConsistency:
    def test_details_report_export_consistency(self, db_session):
        service = RecordService(db_session)
        audit_service = AuditService(db_session)
        export_service = ExportService(db_session)

        record = service.create_record(
            record_type=RecordType.DECLARATION,
            tracking_no="CONSIST001",
            created_by="user1",
            created_by_role=Role.DATA_ENTRY,
            tax_amount=100,
        )

        record = service.update_record(
            record.id,
            "manager1",
            Role.MANAGER,
            change_reason=ChangeReason.TAX_RECALCULATION,
            change_reason_note="海关核定调整",
            tax_amount=150,
        )

        history = audit_service.get_record_history(record.id)
        export_data = export_service.export_records(
            record_ids=[record.id], include_history=True
        )

        history_actions = {h.audit_log.action.value for h in history}
        export_actions = {h["action"] for h in export_data[0].get("change_history", [])}

        assert history_actions == export_actions

        reasons = audit_service.get_change_reason_summary(record.id)
        if reasons:
            assert "海关核定调整" in reasons[0].get("reason", "")

import pytest
from app.services.queue_service import QueueService
from app.services.data_import import DataImportService
from app.schemas.compensation_queue import QueueItemCreate
from app.models.enums import QueueStatus, FailCategory, DataSourceType


class TestQueueIdempotency:
    def test_create_same_queue_key_returns_existing(self, db_session):
        service = QueueService(db_session)
        item_data = QueueItemCreate(
            queue_key="idem_test_001",
            appointment_no="APPT_IDEM_001",
        )

        item1 = service.create_queue_item(item_data, "op1")
        item2 = service.create_queue_item(item_data, "op2")

        assert item1.id == item2.id
        assert item1.appointment_no == item2.appointment_no
        history = service.get_status_history(item1.id)
        assert len(history) == 1

    def test_submit_receipt_twice_no_change(self, db_session):
        service = QueueService(db_session)
        item_data = QueueItemCreate(queue_key="idem_test_002")
        item = service.create_queue_item(item_data)

        item1 = service.submit_receipt(item.id, {"回执编号": "RCPT001"}, "op1")
        submitted_at_1 = item1.receipt_submitted_at

        item2 = service.submit_receipt(item.id, {"回执编号": "RCPT002"}, "op2")
        submitted_at_2 = item2.receipt_submitted_at

        assert item1.id == item2.id
        assert submitted_at_1 == submitted_at_2
        assert item2.receipt_data["回执编号"] == "RCPT001"
        history = service.get_status_history(item.id)
        processing_count = sum(1 for h in history if h.to_status == QueueStatus.PROCESSING)
        assert processing_count == 1

    def test_build_queue_from_raw_data_twice_no_duplicate(self, db_session):
        import_service = DataImportService(db_session)
        queue_service = QueueService(db_session)

        appointment_data = [
            {"预约单号": "APPT_IDEM_003", "订单号": "ORD_IDEM_003", "用户ID": "U1", "师傅ID": "T1", "区域": "华东区"}
        ]
        import_service.import_from_data(
            appointment_data,
            DataSourceType.APPOINTMENT,
            "test_file",
            "system",
        )

        item1 = queue_service.build_queue_from_raw_data("APPT_IDEM_003", "op1")
        item2 = queue_service.build_queue_from_raw_data("APPT_IDEM_003", "op2")

        assert item1.id == item2.id
        history = queue_service.get_status_history(item1.id)
        assert len(history) == 1

    def test_retry_same_item_multiple_times(self, db_session):
        service = QueueService(db_session)
        item_data = QueueItemCreate(queue_key="idem_test_004")
        item = service.create_queue_item(item_data)
        service.submit_receipt(item.id, {"回执编号": "RCPT001"})
        service.mark_failed(item.id, "错误1", FailCategory.RETRYABLE)

        initial_retry_count = item.retry_count

        item = service.retry_item(item.id, "op1")
        assert item.status == QueueStatus.PROCESSING

        with pytest.raises(ValueError):
            service.retry_item(item.id, "op2")

        item = service.get_queue_item(item.id)
        assert item.status == QueueStatus.PROCESSING
        assert item.retry_count == initial_retry_count

    def test_complete_compensation_only_once(self, db_session):
        service = QueueService(db_session)
        item_data = QueueItemCreate(queue_key="idem_test_005")
        item = service.create_queue_item(item_data)
        service.submit_receipt(item.id, {"回执编号": "RCPT001"})
        service.start_compensation(item.id, 100, "测试", "op1")

        item1 = service.complete_compensation(item.id, "finance1")
        completed_at_1 = item1.compensated_at

        with pytest.raises(ValueError):
            service.complete_compensation(item.id, "finance2")

        item2 = service.get_queue_item(item.id)
        assert item2.compensated_at == completed_at_1
        assert item2.compensated_by == "finance1"
        history = service.get_status_history(item.id)
        completed_count = sum(1 for h in history if h.to_status == QueueStatus.COMPLETED)
        assert completed_count == 1

    def test_close_queue_only_once(self, db_session):
        service = QueueService(db_session)
        item_data = QueueItemCreate(queue_key="idem_test_006")
        item = service.create_queue_item(item_data)

        item1 = service.close_queue_item(item.id, "原因1", "op1")
        closed_at_1 = item1.closed_at

        with pytest.raises(ValueError):
            service.close_queue_item(item.id, "原因2", "op2")

        item2 = service.get_queue_item(item.id)
        assert item2.closed_at == closed_at_1
        assert item2.closed_by == "op1"
        assert item2.close_reason == "原因1"


class TestRawDataIntegrity:
    def test_raw_data_not_modified_after_import(self, db_session):
        import_service = DataImportService(db_session)

        original_data = {"预约单号": "APPT_DATA_001", "订单号": "ORD_DATA_001", "用户ID": "U1"}
        import_service.import_from_data(
            [original_data],
            DataSourceType.APPOINTMENT,
            "test_file.xlsx",
            "system",
        )

        from app.models.raw_data import RawDataRecord
        record = db_session.query(RawDataRecord).filter(
            RawDataRecord.appointment_no == "APPT_DATA_001"
        ).first()

        assert record is not None
        assert record.original_row_number == 1
        assert record.source_file == "test_file.xlsx"
        assert record.source_type == DataSourceType.APPOINTMENT
        assert record.original_data["预约单号"] == "APPT_DATA_001"
        assert record.parsed_data["appointment_no"] == "APPT_DATA_001"

        original_json = str(record.original_data)
        record.appointment_no = "MODIFIED"
        db_session.commit()

        record_reloaded = db_session.query(RawDataRecord).filter(
            RawDataRecord.id == record.id
        ).first()
        assert str(record_reloaded.original_data) == original_json

    def test_multiple_sources_merged_without_overwriting(self, db_session):
        import_service = DataImportService(db_session)
        queue_service = QueueService(db_session)

        import_service.import_from_data(
            [{"预约单号": "APPT_MERGE_001", "是否改约": "是"}],
            DataSourceType.APPOINTMENT,
            "appt.xlsx",
        )
        import_service.import_from_data(
            [{"预约单号": "APPT_MERGE_001", "评价类型": "差评", "差评原因": "师傅迟到"}],
            DataSourceType.USER_REVIEW,
            "review.xlsx",
        )

        item = queue_service.build_queue_from_raw_data("APPT_MERGE_001")

        assert item.is_rescheduled is True
        assert item.has_negative_review is True
        assert item.review_reason == "师傅迟到"
        assert len(item.raw_data_ids) == 2
        assert len(item.raw_data_sources) == 2
        assert DataSourceType.APPOINTMENT.value in item.raw_data_sources
        assert DataSourceType.USER_REVIEW.value in item.raw_data_sources

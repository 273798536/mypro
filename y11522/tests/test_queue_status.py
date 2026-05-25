import pytest
from app.services.queue_service import QueueService
from app.schemas.compensation_queue import QueueItemCreate
from app.models.enums import QueueStatus, FailCategory


class TestQueueStatusTransitions:
    def test_create_queue_item_pending(self, db_session):
        service = QueueService(db_session)
        item_data = QueueItemCreate(
            queue_key="test_status_001",
            appointment_no="APPT_TEST_001",
            region="华东区",
        )

        item = service.create_queue_item(item_data, "test_operator")

        assert item.status == QueueStatus.PENDING
        history = service.get_status_history(item.id)
        assert len(history) == 1
        assert history[0].to_status == QueueStatus.PENDING
        assert history[0].changed_by == "test_operator"

    def test_submit_receipt_to_processing(self, db_session):
        service = QueueService(db_session)
        item_data = QueueItemCreate(queue_key="test_status_002")
        item = service.create_queue_item(item_data)

        item = service.submit_receipt(item.id, {"回执编号": "RCPT001"}, "operator1")

        assert item.status == QueueStatus.PROCESSING
        assert item.receipt_submitted is True
        history = service.get_status_history(item.id)
        assert len(history) == 2
        assert history[-1].from_status == QueueStatus.PENDING
        assert history[-1].to_status == QueueStatus.PROCESSING

    def test_retryable_failure_to_waiting_retry(self, db_session):
        service = QueueService(db_session)
        item_data = QueueItemCreate(queue_key="test_status_003")
        item = service.create_queue_item(item_data)
        service.submit_receipt(item.id, {"回执编号": "RCPT001"})

        item = service.mark_failed(item.id, "网络超时", FailCategory.RETRYABLE, "system")

        assert item.status == QueueStatus.WAITING_RETRY
        assert item.retry_count == 1
        assert item.fail_category == FailCategory.RETRYABLE
        assert item.next_retry_at is not None

    def test_max_retry_reaches_permanent_failure(self, db_session):
        service = QueueService(db_session)
        item_data = QueueItemCreate(queue_key="test_status_004", max_retry_times=2)
        item = service.create_queue_item(item_data)
        service.submit_receipt(item.id, {"回执编号": "RCPT001"})

        service.mark_failed(item.id, "错误1", FailCategory.RETRYABLE)
        service.retry_item(item.id)
        service.mark_failed(item.id, "错误2", FailCategory.RETRYABLE)
        service.retry_item(item.id)

        item = service.mark_failed(item.id, "错误3", FailCategory.RETRYABLE)

        assert item.status == QueueStatus.PERMANENT_FAILED
        assert item.retry_count == 3
        assert item.fail_category == FailCategory.PERMANENT

    def test_manual_failure_to_waiting_manual(self, db_session):
        service = QueueService(db_session)
        item_data = QueueItemCreate(queue_key="test_status_005")
        item = service.create_queue_item(item_data)
        service.submit_receipt(item.id, {"回执编号": "RCPT001"})

        item = service.mark_failed(item.id, "用户有异议", FailCategory.NEED_MANUAL, "system")

        assert item.status == QueueStatus.WAITING_MANUAL
        assert item.fail_category == FailCategory.NEED_MANUAL

    def test_permanent_failure_status(self, db_session):
        service = QueueService(db_session)
        item_data = QueueItemCreate(queue_key="test_status_006")
        item = service.create_queue_item(item_data)
        service.submit_receipt(item.id, {"回执编号": "RCPT001"})

        item = service.mark_failed(item.id, "业务规则不满足", FailCategory.PERMANENT, "system")

        assert item.status == QueueStatus.PERMANENT_FAILED
        assert item.fail_category == FailCategory.PERMANENT

    def test_manual_takeover_sets_status(self, db_session):
        service = QueueService(db_session)
        item_data = QueueItemCreate(queue_key="test_status_007")
        item = service.create_queue_item(item_data)

        item = service.manual_takeover(item.id, "supervisor1", "需要人工核查")

        assert item.status == QueueStatus.WAITING_MANUAL
        assert item.manual_taken_by == "supervisor1"
        assert item.manual_note == "需要人工核查"

    def test_compensation_flow(self, db_session):
        service = QueueService(db_session)
        item_data = QueueItemCreate(queue_key="test_status_008")
        item = service.create_queue_item(item_data)
        service.submit_receipt(item.id, {"回执编号": "RCPT001"})

        item = service.start_compensation(item.id, 100, "改约补偿", "operator1")
        assert item.status == QueueStatus.COMPENSATING
        assert item.compensation_amount == 100

        item = service.complete_compensation(item.id, "finance_user")
        assert item.status == QueueStatus.COMPLETED
        assert item.compensated_by == "finance_user"

    def test_close_queue_item(self, db_session):
        service = QueueService(db_session)
        item_data = QueueItemCreate(queue_key="test_status_009")
        item = service.create_queue_item(item_data)

        item = service.close_queue_item(item.id, "无需补偿", "operator1")

        assert item.status == QueueStatus.CLOSED
        assert item.close_reason == "无需补偿"
        assert item.closed_by == "operator1"

    def test_status_history_records_all_changes(self, db_session):
        service = QueueService(db_session)
        item_data = QueueItemCreate(queue_key="test_status_010")
        item = service.create_queue_item(item_data, "op1")

        service.submit_receipt(item.id, {"回执编号": "RCPT001"}, "op2")
        service.start_compensation(item.id, 50, "测试", "op3")
        service.complete_compensation(item.id, "op4")
        service.close_queue_item(item.id, "完成", "op5")

        history = service.get_status_history(item.id)

        assert len(history) == 5
        assert history[0].to_status == QueueStatus.PENDING
        assert history[1].from_status == QueueStatus.PENDING
        assert history[1].to_status == QueueStatus.PROCESSING
        assert history[2].to_status == QueueStatus.COMPENSATING
        assert history[3].to_status == QueueStatus.COMPLETED
        assert history[4].to_status == QueueStatus.CLOSED

        assert history[0].changed_by == "op1"
        assert history[1].changed_by == "op2"
        assert history[2].changed_by == "op3"
        assert history[3].changed_by == "op4"
        assert history[4].changed_by == "op5"


class TestIllegalStateTransitions:
    def test_submit_receipt_not_from_pending(self, db_session):
        service = QueueService(db_session)
        item = service.create_queue_item(QueueItemCreate(queue_key="illegal_001"))
        service.submit_receipt(item.id, {"回执编号": "RCPT001"})

        assert item.receipt_submitted is True
        result = service.submit_receipt(item.id, {"回执编号": "RCPT002"})
        assert result.receipt_data["回执编号"] == "RCPT001"

    def test_start_compensation_from_pending_forbidden(self, db_session):
        service = QueueService(db_session)
        item = service.create_queue_item(QueueItemCreate(queue_key="illegal_002"))

        with pytest.raises(ValueError, match="不允许开始补偿"):
            service.start_compensation(item.id, 50, "测试", "op1")

    def test_start_compensation_from_closed_forbidden(self, db_session):
        service = QueueService(db_session)
        item = service.create_queue_item(QueueItemCreate(queue_key="illegal_003"))
        service.close_queue_item(item.id, "测试关闭", "op1")

        with pytest.raises(ValueError, match="不允许开始补偿"):
            service.start_compensation(item.id, 50, "测试", "op2")

    def test_mark_failed_from_pending_forbidden(self, db_session):
        service = QueueService(db_session)
        item = service.create_queue_item(QueueItemCreate(queue_key="illegal_004"))

        with pytest.raises(ValueError, match="不允许标记失败"):
            service.mark_failed(item.id, "错误", FailCategory.RETRYABLE)

    def test_mark_failed_from_closed_forbidden(self, db_session):
        service = QueueService(db_session)
        item = service.create_queue_item(QueueItemCreate(queue_key="illegal_005"))
        service.submit_receipt(item.id, {"回执编号": "RCPT001"})
        service.close_queue_item(item.id, "测试关闭", "op1")

        with pytest.raises(ValueError, match="不允许标记失败"):
            service.mark_failed(item.id, "错误", FailCategory.RETRYABLE)

    def test_mark_failed_from_completed_forbidden(self, db_session):
        service = QueueService(db_session)
        item = service.create_queue_item(QueueItemCreate(queue_key="illegal_006"))
        service.submit_receipt(item.id, {"回执编号": "RCPT001"})
        service.start_compensation(item.id, 50, "测试", "op1")
        service.complete_compensation(item.id, "finance")

        with pytest.raises(ValueError, match="不允许标记失败"):
            service.mark_failed(item.id, "错误", FailCategory.RETRYABLE)

    def test_retry_from_pending_forbidden(self, db_session):
        service = QueueService(db_session)
        item = service.create_queue_item(QueueItemCreate(queue_key="illegal_007"))

        with pytest.raises(ValueError, match="不支持重试"):
            service.retry_item(item.id)

    def test_retry_from_processing_forbidden(self, db_session):
        service = QueueService(db_session)
        item = service.create_queue_item(QueueItemCreate(queue_key="illegal_008"))
        service.submit_receipt(item.id, {"回执编号": "RCPT001"})

        with pytest.raises(ValueError, match="不支持重试"):
            service.retry_item(item.id)

    def test_complete_compensation_not_from_compensating(self, db_session):
        service = QueueService(db_session)
        item = service.create_queue_item(QueueItemCreate(queue_key="illegal_009"))
        service.submit_receipt(item.id, {"回执编号": "RCPT001"})

        with pytest.raises(ValueError, match="不是补偿中状态"):
            service.complete_compensation(item.id, "finance")

    def test_close_queue_item_twice_forbidden(self, db_session):
        service = QueueService(db_session)
        item = service.create_queue_item(QueueItemCreate(queue_key="illegal_010"))
        service.close_queue_item(item.id, "原因1", "op1")

        with pytest.raises(ValueError, match="已关闭"):
            service.close_queue_item(item.id, "原因2", "op2")

    def test_valid_compensation_via_manual_takeover(self, db_session):
        service = QueueService(db_session)
        item = service.create_queue_item(QueueItemCreate(queue_key="illegal_011"))
        service.submit_receipt(item.id, {"回执编号": "RCPT001"})
        service.manual_takeover(item.id, "supervisor", "需要审核")

        item = service.start_compensation(item.id, 100, "审核通过", "supervisor")
        assert item.status == QueueStatus.COMPENSATING

        item = service.complete_compensation(item.id, "finance")
        assert item.status == QueueStatus.COMPLETED

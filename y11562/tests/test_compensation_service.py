import pytest
from app.services.compensation_service import (
    create_compensation,
    get_compensation_by_no,
    process_compensation,
    handle_processing_success,
    handle_processing_failure,
    retry_compensation,
    manual_takeover,
    manual_compensate,
    close_compensation,
    get_state_transitions,
    get_operation_logs
)
from app.schemas.schemas import CompensationQueueCreate
from app.models.models import (
    CompensationStatus,
    FailureType,
    DataSourceType,
    OperationType
)


class TestStatusTransitions:
    def test_create_compensation(self, db_session):
        compensation_data = CompensationQueueCreate(
            source_type=DataSourceType.CHECK_IN,
            check_in_no="CI20240520001",
            room_no="1001",
            guest_name="张三",
            amount=580.0,
            deposit_amount=600.0,
            invoice_amount=580.0
        )
        
        compensation = create_compensation(db_session, compensation_data)
        
        assert compensation is not None
        assert compensation.compensation_no.startswith("COMP")
        assert compensation.status == CompensationStatus.PENDING
        assert compensation.retry_count == 0
        
        transitions = get_state_transitions(db_session, compensation.id)
        assert len(transitions) == 1
        assert transitions[0].to_status == CompensationStatus.PENDING
        assert transitions[0].transition_reason == "创建补偿记录"

    def test_process_compensation_from_pending(self, db_session):
        compensation_data = CompensationQueueCreate(
            source_type=DataSourceType.CHECK_IN,
            check_in_no="CI20240520001",
            amount=580.0
        )
        compensation = create_compensation(db_session, compensation_data)
        
        success, message, status = process_compensation(
            db_session, compensation.compensation_no
        )
        
        assert success is True
        assert status == CompensationStatus.PROCESSING
        
        transitions = get_state_transitions(db_session, compensation.id)
        assert len(transitions) == 2
        assert transitions[1].from_status == CompensationStatus.PENDING
        assert transitions[1].to_status == CompensationStatus.PROCESSING

    def test_handle_processing_success(self, db_session):
        compensation_data = CompensationQueueCreate(
            source_type=DataSourceType.CHECK_IN,
            check_in_no="CI20240520001",
            amount=580.0
        )
        compensation = create_compensation(db_session, compensation_data)
        process_compensation(db_session, compensation.compensation_no)
        
        success, message, status = handle_processing_success(
            db_session, compensation.compensation_no
        )
        
        assert success is True
        assert status == CompensationStatus.COMPENSATED
        
        transitions = get_state_transitions(db_session, compensation.id)
        assert transitions[-1].to_status == CompensationStatus.COMPENSATED

    def test_handle_processing_failure_retryable(self, db_session):
        compensation_data = CompensationQueueCreate(
            source_type=DataSourceType.CHECK_IN,
            check_in_no="CI20240520001",
            amount=580.0,
            max_retry_times=3
        )
        compensation = create_compensation(db_session, compensation_data)
        process_compensation(db_session, compensation.compensation_no)
        
        success, message, status = handle_processing_failure(
            db_session,
            compensation.compensation_no,
            "网络超时",
            FailureType.RETRYABLE
        )
        
        assert success is True
        assert status == CompensationStatus.WAITING_RETRY
        
        compensation = get_compensation_by_no(db_session, compensation.compensation_no)
        assert compensation.retry_count == 1
        assert compensation.next_retry_at is not None

    def test_handle_processing_failure_need_manual(self, db_session):
        compensation_data = CompensationQueueCreate(
            source_type=DataSourceType.CHECK_IN,
            check_in_no="CI20240520001",
            amount=580.0
        )
        compensation = create_compensation(db_session, compensation_data)
        process_compensation(db_session, compensation.compensation_no)
        
        success, message, status = handle_processing_failure(
            db_session,
            compensation.compensation_no,
            "数据校验失败",
            FailureType.NEED_MANUAL
        )
        
        assert success is True
        assert status == CompensationStatus.WAITING_MANUAL

    def test_handle_processing_failure_permanent(self, db_session):
        compensation_data = CompensationQueueCreate(
            source_type=DataSourceType.CHECK_IN,
            check_in_no="CI20240520001",
            amount=580.0
        )
        compensation = create_compensation(db_session, compensation_data)
        process_compensation(db_session, compensation.compensation_no)
        
        success, message, status = handle_processing_failure(
            db_session,
            compensation.compensation_no,
            "入住单不存在",
            FailureType.PERMANENT
        )
        
        assert success is True
        assert status == CompensationStatus.PERMANENT_FAILED

    def test_retry_count_exceeded(self, db_session):
        compensation_data = CompensationQueueCreate(
            source_type=DataSourceType.CHECK_IN,
            check_in_no="CI20240520001",
            amount=580.0,
            max_retry_times=1
        )
        compensation = create_compensation(db_session, compensation_data)
        
        process_compensation(db_session, compensation.compensation_no)
        handle_processing_failure(
            db_session, compensation.compensation_no, "错误1", FailureType.RETRYABLE
        )
        
        retry_compensation(db_session, compensation.compensation_no)
        process_compensation(db_session, compensation.compensation_no)
        
        success, message, status = handle_processing_failure(
            db_session, compensation.compensation_no, "错误2", FailureType.RETRYABLE
        )
        
        assert success is True
        assert status == CompensationStatus.PERMANENT_FAILED
        
        compensation = get_compensation_by_no(db_session, compensation.compensation_no)
        assert compensation.retry_count == 2

    def test_manual_takeover_flow(self, db_session):
        compensation_data = CompensationQueueCreate(
            source_type=DataSourceType.CHECK_IN,
            check_in_no="CI20240520001",
            amount=580.0
        )
        compensation = create_compensation(db_session, compensation_data)
        process_compensation(db_session, compensation.compensation_no)
        handle_processing_failure(
            db_session, compensation.compensation_no, "需要人工", FailureType.NEED_MANUAL
        )
        
        success, message, status = manual_takeover(
            db_session,
            compensation.compensation_no,
            "财务小张",
            "经核实，确实需要补偿"
        )
        
        assert success is True
        assert status == CompensationStatus.MANUAL_TAKEOVER
        
        compensation = get_compensation_by_no(db_session, compensation.compensation_no)
        assert compensation.judged_by == "财务小张"
        assert compensation.judgment_remark == "经核实，确实需要补偿"

    def test_manual_compensate_flow(self, db_session):
        compensation_data = CompensationQueueCreate(
            source_type=DataSourceType.CHECK_IN,
            check_in_no="CI20240520001",
            amount=580.0
        )
        compensation = create_compensation(db_session, compensation_data)
        process_compensation(db_session, compensation.compensation_no)
        handle_processing_failure(
            db_session, compensation.compensation_no, "需要人工", FailureType.NEED_MANUAL
        )
        manual_takeover(
            db_session, compensation.compensation_no, "财务小张", "需要补偿"
        )
        
        success, message, status = manual_compensate(
            db_session,
            compensation.compensation_no,
            "财务小张",
            "已手动入账"
        )
        
        assert success is True
        assert status == CompensationStatus.COMPENSATED

    def test_close_compensation(self, db_session):
        compensation_data = CompensationQueueCreate(
            source_type=DataSourceType.CHECK_IN,
            check_in_no="CI20240520001",
            amount=580.0
        )
        compensation = create_compensation(db_session, compensation_data)
        
        success, message, status = close_compensation(
            db_session,
            compensation.compensation_no,
            "财务主管",
            "重复记录，不予补偿"
        )
        
        assert success is True
        assert status == CompensationStatus.CLOSED
        
        compensation = get_compensation_by_no(db_session, compensation.compensation_no)
        assert compensation.closed_by == "财务主管"
        assert compensation.close_remark == "重复记录，不予补偿"

    def test_operation_logs_created(self, db_session):
        compensation_data = CompensationQueueCreate(
            source_type=DataSourceType.CHECK_IN,
            check_in_no="CI20240520001",
            amount=580.0
        )
        compensation = create_compensation(db_session, compensation_data)
        
        logs = get_operation_logs(db_session, compensation.id)
        assert len(logs) >= 1
        assert logs[0].operation_type == OperationType.SUBMIT


class TestIdempotency:
    def test_retry_idempotency(self, db_session):
        compensation_data = CompensationQueueCreate(
            source_type=DataSourceType.CHECK_IN,
            check_in_no="CI20240520001",
            amount=580.0
        )
        compensation = create_compensation(db_session, compensation_data)
        process_compensation(db_session, compensation.compensation_no)
        handle_processing_failure(
            db_session, compensation.compensation_no, "错误", FailureType.RETRYABLE
        )
        
        success1, _, _ = retry_compensation(db_session, compensation.compensation_no)
        success2, _, _ = retry_compensation(db_session, compensation.compensation_no)
        
        assert success1 is True
        assert success2 is False

    def test_close_idempotency(self, db_session):
        compensation_data = CompensationQueueCreate(
            source_type=DataSourceType.CHECK_IN,
            check_in_no="CI20240520001",
            amount=580.0
        )
        compensation = create_compensation(db_session, compensation_data)
        
        success1, _, _ = close_compensation(
            db_session, compensation.compensation_no, "财务", "关闭"
        )
        success2, _, _ = close_compensation(
            db_session, compensation.compensation_no, "财务", "再次关闭"
        )
        
        assert success1 is True
        assert success2 is False

    def test_compensate_already_compensated(self, db_session):
        compensation_data = CompensationQueueCreate(
            source_type=DataSourceType.CHECK_IN,
            check_in_no="CI20240520001",
            amount=580.0
        )
        compensation = create_compensation(db_session, compensation_data)
        process_compensation(db_session, compensation.compensation_no)
        handle_processing_success(db_session, compensation.compensation_no)
        
        success, message, status = process_compensation(
            db_session, compensation.compensation_no
        )
        
        assert success is False
        assert "不允许处理" in message


class TestInvalidTransitions:
    def test_cannot_process_compensated(self, db_session):
        compensation_data = CompensationQueueCreate(
            source_type=DataSourceType.CHECK_IN,
            amount=580.0
        )
        compensation = create_compensation(db_session, compensation_data)
        process_compensation(db_session, compensation.compensation_no)
        handle_processing_success(db_session, compensation.compensation_no)
        
        success, message, _ = process_compensation(
            db_session, compensation.compensation_no
        )
        
        assert success is False
        assert "不允许处理" in message

    def test_cannot_takeover_pending(self, db_session):
        compensation_data = CompensationQueueCreate(
            source_type=DataSourceType.CHECK_IN,
            amount=580.0
        )
        compensation = create_compensation(db_session, compensation_data)
        
        success, message, _ = manual_takeover(
            db_session, compensation.compensation_no, "财务", "接管"
        )
        
        assert success is False
        assert "不允许人工接管" in message

    def test_cannot_manual_compensate_without_takeover(self, db_session):
        compensation_data = CompensationQueueCreate(
            source_type=DataSourceType.CHECK_IN,
            amount=580.0
        )
        compensation = create_compensation(db_session, compensation_data)
        
        success, message, _ = manual_compensate(
            db_session, compensation.compensation_no, "财务", "补偿"
        )
        
        assert success is False
        assert "不允许人工补偿" in message

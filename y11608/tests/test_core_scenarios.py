"""核心场景测试"""
import pytest
from datetime import date, datetime
import uuid

from invoice_finance.models import (
    Invoice, BuyerConfirmation, CreditPool, RepaymentFlow,
    WriteOffApplication, DataSource, InvoiceStatus,
    ConfirmationStatus, RiskType, ProcessingStatus
)
from invoice_finance.engine import InvoiceFinanceEngine


@pytest.fixture
def engine():
    """创建测试引擎"""
    return InvoiceFinanceEngine()


@pytest.fixture
def sample_invoice():
    """示例发票"""
    return Invoice(
        id="inv_test_001",
        source=DataSource.INVOICE_SYSTEM,
        invoice_no="INVTEST001",
        invoice_code="001100100111",
        amount=100000.00,
        invoice_date=date(2026, 5, 1),
        buyer_name="甲公司",
        seller_name="乙公司",
        status=InvoiceStatus.VERIFIED,
        verified_at=datetime.now(),
        verified_by="tester",
        created_by="test"
    )


@pytest.fixture
def sample_pool():
    """示例额度池"""
    return CreditPool(
        id="pool_test_001",
        source=DataSource.CREDIT_POOL,
        pool_id="POOLTEST001",
        pool_name="测试额度池",
        total_credit=500000.00,
        effective_date=date(2026, 1, 1),
        expire_date=date(2026, 12, 31),
        created_by="test"
    )


class TestDuplicatePledge:
    """测试重复质押拦截"""

    def test_duplicate_invoice_detected(self, engine, sample_invoice, sample_pool):
        """测试重复发票被检测到"""
        engine.add_credit_pool(sample_pool)

        inv1 = sample_invoice
        inv2 = Invoice(
            id="inv_test_002",
            source=DataSource.INVOICE_SYSTEM,
            invoice_no="INVTEST001",
            invoice_code="001100100111",
            amount=100000.00,
            invoice_date=date(2026, 5, 1),
            buyer_name="甲公司",
            seller_name="乙公司",
            status=InvoiceStatus.VERIFIED,
            verified_at=datetime.now(),
            verified_by="tester",
            created_by="test"
        )
        conf1 = BuyerConfirmation(
            id="conf_test_001",
            source=DataSource.BUYER_CONFIRM,
            invoice_id="inv_test_001",
            buyer_name="甲公司",
            confirmed_amount=100000.00,
            status=ConfirmationStatus.CONFIRMED,
            confirmed_at=datetime.now(),
            created_by="test"
        )
        conf2 = BuyerConfirmation(
            id="conf_test_002",
            source=DataSource.BUYER_CONFIRM,
            invoice_id="inv_test_002",
            buyer_name="甲公司",
            confirmed_amount=100000.00,
            status=ConfirmationStatus.CONFIRMED,
            confirmed_at=datetime.now(),
            created_by="test"
        )

        engine.add_invoice(inv1)
        engine.add_invoice(inv2)
        engine.add_confirmation(conf1)
        engine.add_confirmation(conf2)

        result1 = engine.process_invoice("inv_test_001", "pool_test_001")

        result2 = engine.process_invoice("inv_test_002", "pool_test_001")

        assert result2.status == ProcessingStatus.NEED_MANUAL
        duplicate_alerts = [a for a in result2.risk_alerts if a.risk_type == RiskType.DUPLICATE_PLEDGE]
        assert len(duplicate_alerts) == 1
        assert duplicate_alerts[0].severity == "high"


class TestBuyerRevoked:
    """测试买方撤确认"""

    def test_revoked_confirmation_blocked(self, engine, sample_invoice, sample_pool):
        """测试已撤销的确认被拦截"""
        engine.add_credit_pool(sample_pool)
        engine.add_invoice(sample_invoice)

        conf = BuyerConfirmation(
            id="conf_test_001",
            source=DataSource.BUYER_CONFIRM,
            invoice_id="inv_test_001",
            buyer_name="甲公司",
            confirmed_amount=100000.00,
            status=ConfirmationStatus.REVOKED,
            confirmed_at=datetime.now(),
            revoked_at=datetime.now(),
            revoker="manager",
            revocation_reason="质量问题",
            created_by="test"
        )
        engine.add_confirmation(conf)

        result = engine.process_invoice("inv_test_001", "pool_test_001")

        assert result.status == ProcessingStatus.NEED_MANUAL
        revoked_alerts = [a for a in result.risk_alerts if a.risk_type == RiskType.BUYER_REVOKED]
        assert len(revoked_alerts) == 1
        assert result.occupied_amount == 0


class TestPartialWriteOff:
    """测试部分核销"""

    def test_partial_repayment_detected(self, engine, sample_invoice, sample_pool):
        """测试部分回款被检测到"""
        engine.add_credit_pool(sample_pool)
        engine.add_invoice(sample_invoice)

        conf = BuyerConfirmation(
            id="conf_test_001",
            source=DataSource.BUYER_CONFIRM,
            invoice_id="inv_test_001",
            buyer_name="甲公司",
            confirmed_amount=100000.00,
            status=ConfirmationStatus.CONFIRMED,
            confirmed_at=datetime.now(),
            created_by="test"
        )
        repayment = RepaymentFlow(
            id="rep_test_001",
            source=DataSource.REPAYMENT_FLOW,
            flow_no="FLOWTEST001",
            invoice_id="inv_test_001",
            amount=30000.00,
            repayment_date=date(2026, 5, 20),
            payer_account="6222****1234",
            payer_name="甲公司",
            created_by="test"
        )
        engine.add_confirmation(conf)
        engine.add_repayment(repayment)

        result = engine.process_invoice("inv_test_001", "pool_test_001")

        assert result.status != ProcessingStatus.NORMAL
        assert result.status == ProcessingStatus.CORRECTED
        partial_alerts = [a for a in result.risk_alerts if a.risk_type == RiskType.PARTIAL_WRITE_OFF]
        assert len(partial_alerts) == 1
        assert partial_alerts[0].severity == "medium"
        assert "部分回款" in str(result.notes)


class TestCreditLock:
    """测试额度锁定"""

    def test_insufficient_credit_rejected(self, engine, sample_invoice, sample_pool):
        """测试额度不足被拒绝"""
        small_pool = CreditPool(
            id="pool_small",
            source=DataSource.CREDIT_POOL,
            pool_id="POOLSMALL",
            pool_name="小额池",
            total_credit=50000.00,
            effective_date=date(2026, 1, 1),
            expire_date=date(2026, 12, 31),
            created_by="test"
        )
        engine.add_credit_pool(small_pool)
        engine.add_invoice(sample_invoice)

        conf = BuyerConfirmation(
            id="conf_test_001",
            source=DataSource.BUYER_CONFIRM,
            invoice_id="inv_test_001",
            buyer_name="甲公司",
            confirmed_amount=100000.00,
            status=ConfirmationStatus.CONFIRMED,
            confirmed_at=datetime.now(),
            created_by="test"
        )
        engine.add_confirmation(conf)

        result = engine.process_invoice("inv_test_001", "pool_small")

        assert result.status == ProcessingStatus.UNPROCESSED
        exceed_alerts = [a for a in result.risk_alerts if a.risk_type == RiskType.EXCEED_CREDIT]
        assert len(exceed_alerts) == 1

    def test_sufficient_credit_locked(self, engine, sample_invoice, sample_pool):
        """测试额度充足被锁定"""
        engine.add_credit_pool(sample_pool)
        engine.add_invoice(sample_invoice)

        conf = BuyerConfirmation(
            id="conf_test_001",
            source=DataSource.BUYER_CONFIRM,
            invoice_id="inv_test_001",
            buyer_name="甲公司",
            confirmed_amount=100000.00,
            status=ConfirmationStatus.CONFIRMED,
            confirmed_at=datetime.now(),
            created_by="test"
        )
        engine.add_confirmation(conf)

        result = engine.process_invoice("inv_test_001", "pool_test_001")

        assert result.status == ProcessingStatus.NORMAL
        assert result.occupied_amount == 100000.00
        assert sample_pool.frozen_credit == 100000.00


class TestWriteOffRollback:
    """测试核销回滚"""

    def test_rollback_restores_credit(self, engine, sample_invoice, sample_pool):
        """测试回滚恢复额度"""
        engine.add_credit_pool(sample_pool)
        engine.add_invoice(sample_invoice)

        conf = BuyerConfirmation(
            id="conf_test_001",
            source=DataSource.BUYER_CONFIRM,
            invoice_id="inv_test_001",
            buyer_name="甲公司",
            confirmed_amount=100000.00,
            status=ConfirmationStatus.CONFIRMED,
            confirmed_at=datetime.now(),
            created_by="test"
        )
        repayment = RepaymentFlow(
            id="rep_test_001",
            source=DataSource.REPAYMENT_FLOW,
            flow_no="FLOWTEST001",
            invoice_id="inv_test_001",
            amount=50000.00,
            repayment_date=date(2026, 5, 20),
            payer_account="6222****1234",
            payer_name="甲公司",
            created_by="test"
        )
        write_off = WriteOffApplication(
            id="wo_test_001",
            source=DataSource.WRITE_OFF_APPLY,
            apply_no="WO_TEST_001",
            invoice_id="inv_test_001",
            amount=30000.00,
            apply_date=date(2026, 5, 22),
            created_by="test"
        )
        engine.add_confirmation(conf)
        engine.add_repayment(repayment)
        engine.add_write_off(write_off)

        result = engine.process_invoice("inv_test_001", "pool_test_001")

        for occ in engine.occupations.values():
            if occ.invoice_id == "inv_test_001":
                engine.occupy_credit(occ.id)

        success, alerts = engine.approve_write_off("wo_test_001", "approver")
        assert success is True

        pool_after_approval = sample_pool.used_credit

        rollback_success = engine.rollback_write_off("wo_test_001", "operator", "测试回滚")
        assert rollback_success is True

        assert sample_pool.used_credit < pool_after_approval

"""单元测试 - 验证核心反推引擎功能"""

import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from quote_backtester.models import (
    QuoteItem, DiscountTier, CustomerLevel, ApprovalLevel,
    RoundingMode
)
from quote_backtester.engine import QuoteBacktester


@pytest.fixture
def sample_customer_levels():
    return [
        CustomerLevel(
            original_record={"level_name": "普通客户"},
            level_name="普通客户",
            level_code="C001",
            base_discount_rate=0.05,
            max_allowed_discount_rate=0.10
        ),
        CustomerLevel(
            original_record={"level_name": "VIP客户"},
            level_name="VIP客户",
            level_code="C002",
            base_discount_rate=0.10,
            max_allowed_discount_rate=0.20
        ),
        CustomerLevel(
            original_record={"level_name": "战略客户"},
            level_name="战略客户",
            level_code="C003",
            base_discount_rate=0.20,
            max_allowed_discount_rate=0.35
        )
    ]


@pytest.fixture
def sample_approval_levels():
    return [
        ApprovalLevel(
            original_record={"level_name": "销售代表"},
            level_name="销售代表",
            level_order=1,
            max_discount_allowed=0.10,
            max_amount_allowed=5000,
            approver_title="销售代表"
        ),
        ApprovalLevel(
            original_record={"level_name": "销售经理"},
            level_name="销售经理",
            level_order=2,
            max_discount_allowed=0.20,
            max_amount_allowed=20000,
            approver_title="销售经理"
        ),
        ApprovalLevel(
            original_record={"level_name": "销售总监"},
            level_name="销售总监",
            level_order=3,
            max_discount_allowed=0.30,
            max_amount_allowed=50000,
            approver_title="销售总监"
        ),
        ApprovalLevel(
            original_record={"level_name": "总经理"},
            level_name="总经理",
            level_order=4,
            max_discount_allowed=0.50,
            max_amount_allowed=None,
            approver_title="总经理"
        )
    ]


@pytest.fixture
def sample_discount_tiers():
    return [
        DiscountTier(
            original_record={"tier_name": "小额散单档"},
            tier_name="小额散单档",
            min_amount=0,
            max_amount=5000,
            discount_rate=0.05,
            required_approval_level="销售代表",
            applicable_customer_levels=["普通客户", "VIP客户", "战略客户"]
        ),
        DiscountTier(
            original_record={"tier_name": "普通订单档"},
            tier_name="普通订单档",
            min_amount=5000,
            max_amount=20000,
            discount_rate=0.15,
            required_approval_level="销售经理",
            applicable_customer_levels=["普通客户", "VIP客户", "战略客户"]
        ),
        DiscountTier(
            original_record={"tier_name": "大额订单档"},
            tier_name="大额订单档",
            min_amount=15000,
            max_amount=50000,
            discount_rate=0.20,
            required_approval_level="销售总监",
            applicable_customer_levels=["VIP客户", "战略客户"]
        ),
        DiscountTier(
            original_record={"tier_name": "战略客户档"},
            tier_name="战略客户档",
            min_amount=20000,
            max_amount=None,
            discount_rate=0.30,
            required_approval_level="总经理",
            applicable_customer_levels=["战略客户"]
        )
    ]


class TestTierMatching:
    """测试折扣阶梯匹配"""

    def test_normal_tier_matching(self, sample_discount_tiers, sample_customer_levels, sample_approval_levels):
        """测试正常阶梯匹配"""
        backtester = QuoteBacktester(
            discount_tiers=sample_discount_tiers,
            customer_levels=sample_customer_levels,
            approval_levels=sample_approval_levels
        )

        quote = QuoteItem(
            original_record={"item_name": "测试产品"},
            item_name="测试产品",
            item_code="TEST-001",
            list_price=10000.00,
            final_price=8500.00,
            quantity=1,
            customer_name="测试客户",
            customer_level_raw="VIP客户",
            salesperson="测试销售",
            approval_level_raw="销售经理"
        )

        result = backtester.backtrace(quote)
        
        assert result.matched_tier is not None
        assert result.matched_tier.tier_name == "普通订单档"
        assert result.tier_match_confidence >= 0.9
        assert result.actual_discount_rate == pytest.approx(0.15)

    def test_no_matching_tier(self, sample_discount_tiers, sample_customer_levels, sample_approval_levels):
        """测试无匹配阶梯的情况"""
        backtester = QuoteBacktester(
            discount_tiers=sample_discount_tiers,
            customer_levels=sample_customer_levels,
            approval_levels=sample_approval_levels
        )

        quote = QuoteItem(
            original_record={"item_name": "测试产品"},
            item_name="测试产品",
            item_code="TEST-001",
            list_price=10000.00,
            final_price=8500.00,
            quantity=1,
            customer_name="测试客户",
            customer_level_raw="不存在的等级",
            salesperson="测试销售"
        )

        result = backtester.backtrace(quote)
        
        assert result.matched_tier is None
        assert len(result.applicable_tiers) == 0
        assert any("无匹配阶梯" in a for a in result.anomalies)


class TestOverlappingDetection:
    """测试阶梯重叠检测"""

    def test_overlapping_tiers_detected(self, sample_discount_tiers, sample_customer_levels, sample_approval_levels):
        """测试阶梯重叠检测"""
        backtester = QuoteBacktester(
            discount_tiers=sample_discount_tiers,
            customer_levels=sample_customer_levels,
            approval_levels=sample_approval_levels
        )

        quote = QuoteItem(
            original_record={"item_name": "测试产品"},
            item_name="测试产品",
            item_code="TEST-001",
            list_price=10000.00,
            final_price=7000.00,
            quantity=3,
            customer_name="战略客户",
            customer_level_raw="战略客户",
            salesperson="测试销售"
        )

        result = backtester.backtrace(quote)
        
        assert len(result.overlapping_tiers) >= 1
        overlapping_tier_names = [t.tier_name for t in result.overlapping_tiers[0]]
        assert "战略客户档" in overlapping_tier_names
        assert "大额订单档" in overlapping_tier_names

    def test_no_overlapping_tiers(self, sample_customer_levels, sample_approval_levels):
        """测试无重叠阶梯的情况"""
        clean_tiers = [
            DiscountTier(
                original_record={"tier_name": "档1"},
                tier_name="档1",
                min_amount=0,
                max_amount=5000,
                discount_rate=0.05,
                required_approval_level="销售代表",
                applicable_customer_levels=["VIP客户"]
            ),
            DiscountTier(
                original_record={"tier_name": "档2"},
                tier_name="档2",
                min_amount=5000,
                max_amount=20000,
                discount_rate=0.10,
                required_approval_level="销售经理",
                applicable_customer_levels=["VIP客户"]
            )
        ]

        backtester = QuoteBacktester(
            discount_tiers=clean_tiers,
            customer_levels=sample_customer_levels,
            approval_levels=sample_approval_levels
        )

        quote = QuoteItem(
            original_record={"item_name": "测试产品"},
            item_name="测试产品",
            item_code="TEST-001",
            list_price=10000.00,
            final_price=9000.00,
            quantity=1,
            customer_name="测试客户",
            customer_level_raw="VIP客户",
            salesperson="测试销售"
        )

        result = backtester.backtrace(quote)
        
        assert len(result.overlapping_tiers) == 0


class TestApprovalVerification:
    """测试审批级别验证"""

    def test_correct_approval(self, sample_discount_tiers, sample_customer_levels, sample_approval_levels):
        """测试正确审批"""
        backtester = QuoteBacktester(
            discount_tiers=sample_discount_tiers,
            customer_levels=sample_customer_levels,
            approval_levels=sample_approval_levels
        )

        quote = QuoteItem(
            original_record={"item_name": "测试产品"},
            item_name="测试产品",
            item_code="TEST-001",
            list_price=10000.00,
            final_price=8500.00,
            quantity=1,
            customer_name="测试客户",
            customer_level_raw="VIP客户",
            salesperson="测试销售",
            approval_level_raw="销售经理"
        )

        result = backtester.backtrace(quote)
        
        assert result.is_approval_overridden is False
        assert result.required_approval is not None
        assert result.required_approval.level_name == "销售经理"

    def test_approval_override(self, sample_discount_tiers, sample_customer_levels, sample_approval_levels):
        """测试审批越权"""
        backtester = QuoteBacktester(
            discount_tiers=sample_discount_tiers,
            customer_levels=sample_customer_levels,
            approval_levels=sample_approval_levels
        )

        quote = QuoteItem(
            original_record={"item_name": "测试产品"},
            item_name="测试产品",
            item_code="TEST-001",
            list_price=12000.00,
            final_price=7800.00,
            quantity=3,
            customer_name="战略客户",
            customer_level_raw="战略客户",
            salesperson="测试销售",
            approval_level_raw="销售经理"
        )

        result = backtester.backtrace(quote)
        
        assert result.is_approval_overridden is True
        assert any("审批越权" in a for a in result.anomalies)


class TestRoundingModeInference:
    """测试舍入模式反推"""

    def test_round_half_up(self, sample_discount_tiers, sample_customer_levels, sample_approval_levels):
        """测试四舍五入模式"""
        backtester = QuoteBacktester(
            discount_tiers=sample_discount_tiers,
            customer_levels=sample_customer_levels,
            approval_levels=sample_approval_levels
        )

        quote = QuoteItem(
            original_record={"item_name": "测试产品"},
            item_name="测试产品",
            item_code="TEST-001",
            list_price=100.00,
            final_price=85.00,
            quantity=1,
            customer_name="测试客户",
            customer_level_raw="VIP客户",
            salesperson="测试销售"
        )

        result = backtester.backtrace(quote)
        
        assert result.inferred_rounding_mode == RoundingMode.ROUND_HALF_UP
        assert abs(result.rounding_error) < 0.001

    def test_rounding_error(self, sample_discount_tiers, sample_customer_levels, sample_approval_levels):
        """测试舍入误差检测"""
        backtester = QuoteBacktester(
            discount_tiers=sample_discount_tiers,
            customer_levels=sample_customer_levels,
            approval_levels=sample_approval_levels,
            tolerance=0.001
        )

        quote = QuoteItem(
            original_record={"item_name": "测试产品"},
            item_name="测试产品",
            item_code="TEST-001",
            list_price=100.00,
            final_price=84.99,
            quantity=100,
            customer_name="测试客户",
            customer_level_raw="VIP客户",
            salesperson="测试销售"
        )

        result = backtester.backtrace(quote)
        
        raw_price = 100.00 * (1 - result.actual_discount_rate) * 100
        expected_error = 84.99 * 100 - raw_price
        assert result.rounding_error == pytest.approx(expected_error, abs=0.001)
        assert "theoretical_prices" in result.model_dump()
        assert len(result.theoretical_prices) == 5


class TestBatchProcessing:
    """测试批量处理"""

    def test_batch_backtrace(self, sample_discount_tiers, sample_customer_levels, sample_approval_levels):
        """测试批量反推"""
        backtester = QuoteBacktester(
            discount_tiers=sample_discount_tiers,
            customer_levels=sample_customer_levels,
            approval_levels=sample_approval_levels
        )

        quotes = [
            QuoteItem(
                original_record={"item_name": f"产品{i}"},
                item_name=f"产品{i}",
                item_code=f"TEST-{i:03d}",
                list_price=10000.00,
                final_price=8500.00,
                quantity=1,
                customer_name="测试客户",
                customer_level_raw="VIP客户",
                salesperson="测试销售"
            )
            for i in range(3)
        ]

        results, summary = backtester.backtrace_batch(quotes)
        
        assert len(results) == 3
        assert summary.total_records == 3
        assert all(r.matched_tier is not None for r in results)


class TestOriginalNamesPreserved:
    """测试原始名称保留"""

    def test_original_names_preserved_in_result(self, sample_discount_tiers, sample_customer_levels, sample_approval_levels):
        """测试结果中保留所有原始名称"""
        backtester = QuoteBacktester(
            discount_tiers=sample_discount_tiers,
            customer_levels=sample_customer_levels,
            approval_levels=sample_approval_levels
        )

        original_record = {
            "item_name": "企业版SaaS服务",
            "item_code": "SAAS-ENT-001",
            "custom_field_1": "自定义值1",
            "custom_field_2": "自定义值2"
        }

        quote = QuoteItem(
            original_record=original_record,
            item_name="企业版SaaS服务",
            item_code="SAAS-ENT-001",
            list_price=12000.00,
            final_price=9600.00,
            quantity=1,
            customer_name="腾讯科技",
            customer_level_raw="战略客户",
            salesperson="张三"
        )

        result = backtester.backtrace(quote)
        
        assert result.quote_item.original_record == original_record
        assert result.quote_item.original_record["custom_field_1"] == "自定义值1"
        assert result.quote_item.item_name == "企业版SaaS服务"
        assert result.quote_item.customer_name == "腾讯科技"
        assert result.quote_item.customer_level_raw == "战略客户"

        if result.matched_tier:
            assert "tier_name" in result.matched_tier.original_record


class TestExplanations:
    """测试解释说明生成"""

    def test_explanations_for_sales_manager(self, sample_discount_tiers, sample_customer_levels, sample_approval_levels):
        """测试生成销售经理能转述的解释"""
        backtester = QuoteBacktester(
            discount_tiers=sample_discount_tiers,
            customer_levels=sample_customer_levels,
            approval_levels=sample_approval_levels
        )

        quote = QuoteItem(
            original_record={"item_name": "测试产品"},
            item_name="测试产品",
            item_code="TEST-001",
            list_price=12000.00,
            final_price=7800.00,
            quantity=3,
            customer_name="战略客户",
            customer_level_raw="战略客户",
            salesperson="测试销售",
            approval_level_raw="销售经理"
        )

        result = backtester.backtrace(quote)
        
        assert len(result.explanations) > 0
        assert any("阶梯" in e for e in result.explanations)
        
        for explanation in result.explanations:
            assert len(explanation) < 200
            assert "「" in explanation and "」" in explanation


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

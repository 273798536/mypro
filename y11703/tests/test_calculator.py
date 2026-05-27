import pytest
from safety_stock_opt.calculator import DemandAnalyzer, SafetyStockCalculator, SkuProcessor
from safety_stock_opt.models import (
    SalesRecord, ReplenishmentCycle, ServiceLevelConfig,
    WarehouseCapacity, ManualSuggestion
)


class TestDemandAnalyzer:
    def test_aggregate_daily_sales(self):
        records = [
            SalesRecord(sku_id="SKU001", date="2024-01-01", quantity=10),
            SalesRecord(sku_id="SKU001", date="2024-01-01", quantity=5),
            SalesRecord(sku_id="SKU001", date="2024-01-02", quantity=8),
        ]
        analyzer = DemandAnalyzer(records)
        daily = analyzer.daily_sales
        assert daily["2024-01-01"] == 15
        assert daily["2024-01-02"] == 8
    
    def test_calculate_demand_stats(self):
        records = [
            SalesRecord(sku_id="SKU001", date="2024-01-01", quantity=10),
            SalesRecord(sku_id="SKU001", date="2024-01-02", quantity=12),
            SalesRecord(sku_id="SKU001", date="2024-01-03", quantity=11),
            SalesRecord(sku_id="SKU001", date="2024-01-04", quantity=13),
            SalesRecord(sku_id="SKU001", date="2024-01-05", quantity=10),
        ]
        analyzer = DemandAnalyzer(records)
        mean, std, trace = analyzer.calculate_demand_stats(remove_outliers=False)
        assert mean == pytest.approx(11.2, rel=0.01)
        assert std > 0
    
    def test_detect_promotion_peaks(self):
        records = []
        for i in range(1, 11):
            records.append(SalesRecord(sku_id="SKU001", date=f"2024-01-{i:02d}", quantity=20 + i))
        records.append(SalesRecord(sku_id="SKU001", date="2024-01-11", quantity=200))
        
        analyzer = DemandAnalyzer(records)
        peaks = analyzer.detect_promotion_peaks(threshold=2.5)
        assert len(peaks) >= 1
        assert peaks[0]["value"] == 200


class TestSafetyStockCalculator:
    def test_calculate_z_score(self):
        calc = SafetyStockCalculator()
        z95 = calc.calculate_z_score(0.95)
        assert z95 == pytest.approx(1.645, rel=0.01)
        
        z99 = calc.calculate_z_score(0.99)
        assert z99 == pytest.approx(2.326, rel=0.01)
    
    def test_calculate_raw_safety_stock(self):
        calc = SafetyStockCalculator()
        ss = calc.calculate_raw_safety_stock(
            demand_std=10,
            lead_time_days=7,
            review_period_days=7,
            z_score=1.645
        )
        assert ss > 0
    
    def test_calculate_reorder_point(self):
        calc = SafetyStockCalculator()
        rop = calc.calculate_reorder_point(
            demand_mean=20,
            lead_time_days=7,
            safety_stock=50
        )
        assert rop == 20 * 7 + 50


class TestSkuProcessor:
    def test_process_normal_sku(self):
        processor = SkuProcessor("SKU001")
        
        sales_records = []
        for i in range(1, 32):
            sales_records.append(SalesRecord(
                sku_id="SKU001", 
                date=f"2024-01-{i:02d}", 
                quantity=15 + i % 5
            ))
        processor.add_sales(sales_records)
        
        processor.set_replenishment_cycle(ReplenishmentCycle(
            sku_id="SKU001", lead_time_days=7, review_period_days=7
        ))
        
        result = processor.process()
        assert result is not None
        assert result.sku_id == "SKU001"
        assert result.final_safety_stock > 0
        assert result.reorder_point > 0
    
    def test_new_product_warning(self):
        processor = SkuProcessor("NEW_SKU")
        
        sales_records = []
        for i in range(1, 6):
            sales_records.append(SalesRecord(
                sku_id="NEW_SKU", 
                date=f"2024-01-{i:02d}", 
                quantity=10
            ))
        processor.add_sales(sales_records)
        
        result = processor.process()
        assert result is not None
        
        has_new_product_warning = any(
            w.get("type") == "new_product" for w in result.warnings
        )
        assert has_new_product_warning
    
    def test_capacity_limit_warning(self):
        processor = SkuProcessor("LIMITED_SKU")
        
        sales_records = []
        for i in range(1, 32):
            sales_records.append(SalesRecord(
                sku_id="LIMITED_SKU", 
                date=f"2024-01-{i:02d}", 
                quantity=50 + i * 3
            ))
        processor.add_sales(sales_records)
        
        processor.set_warehouse_capacity(WarehouseCapacity(
            sku_id="LIMITED_SKU", max_capacity=10
        ))
        
        result = processor.process()
        assert result is not None
        
        has_capacity_warning = any(
            w.get("type") == "capacity_limit" for w in result.warnings
        )
        assert has_capacity_warning
    
    def test_manual_override(self):
        processor = SkuProcessor("OVERRIDE_SKU")
        
        sales_records = []
        for i in range(1, 32):
            sales_records.append(SalesRecord(
                sku_id="OVERRIDE_SKU", 
                date=f"2024-01-{i:02d}", 
                quantity=20
            ))
        processor.add_sales(sales_records)
        
        processor.set_manual_suggestion(ManualSuggestion(
            sku_id="OVERRIDE_SKU", suggested_safety_stock=999, note="测试手动调整"
        ))
        
        result = processor.process()
        assert result is not None
        assert result.final_safety_stock == 999
        assert result.manual_override == 999
        assert result.manual_note == "测试手动调整"
    
    def test_no_sales_data(self):
        processor = SkuProcessor("NO_DATA_SKU")
        result = processor.process()
        assert result is None
        
        has_error = any(
            w.get("severity") == "error" for w in processor.warnings
        )
        assert has_error

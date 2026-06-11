from datetime import datetime
from models import PreOrder, VersionItem, SleeveInventory, OrderStatus, RiskType
from inventory_manager import InventoryManager

def test_case_1_two_orders_same_version_shortage():
    print("=" * 60)
    print("测试1: 两单同版本签名版各2张, 压盘仅2张 (用户报告场景)")
    print("=" * 60)
    im = InventoryManager()
    im.load_pre_orders([
        PreOrder('T1', '用户1', '专辑X', '标准版', 2, True, datetime(2024,1,1), OrderStatus.PENDING),
        PreOrder('T2', '用户2', '专辑X', '标准版', 2, True, datetime(2024,1,2), OrderStatus.PENDING),
    ])
    im.load_version_list([VersionItem('专辑X', '标准版', True, 2, datetime(2024,1,1))])
    im.load_sleeve_inventory([SleeveInventory('专辑X', '标准版', 10, 'A区')])

    shipping, risks = im.generate_shipping_plan()
    total = sum(s.quantity for s in shipping)
    assert total == 2, f"总发货应为2, 实际{total}"
    assert len(shipping) == 1, f"发货单数应为1, 实际{len(shipping)}"
    assert shipping[0].order_id == 'T1', f"先下单的T1应获得发货"
    assert len(risks) == 1, f"风险预警应为1, 实际{len(risks)}"
    assert risks[0].risk_type == RiskType.SIGNED_SHORTAGE
    assert risks[0].shortage_quantity == 2
    summary = im.get_inventory_summary()
    assert summary['total_shortage_qty'] == 2
    print("✅ 通过: T1发2张, T2缺货预警, 总缺口2")
    print()

def test_case_2_fifo_ordering():
    print("=" * 60)
    print("测试2: FIFO优先级 - 晚下单的排在后面")
    print("=" * 60)
    im = InventoryManager()
    im.load_pre_orders([
        PreOrder('T3', '用户C', '专辑Y', '豪华版', 3, True, datetime(2024,1,10), OrderStatus.PENDING),
        PreOrder('T1', '用户A', '专辑Y', '豪华版', 2, True, datetime(2024,1,1), OrderStatus.PENDING),
        PreOrder('T2', '用户B', '专辑Y', '豪华版', 2, True, datetime(2024,1,5), OrderStatus.PENDING),
    ])
    im.load_version_list([VersionItem('专辑Y', '豪华版', True, 5, datetime(2024,1,1))])
    im.load_sleeve_inventory([SleeveInventory('专辑Y', '豪华版', 10, 'B区')])

    shipping, risks = im.generate_shipping_plan()
    order_ids = [s.order_id for s in shipping]
    assert order_ids == ['T1', 'T2', 'T3'], f"发货顺序应为T1,T2,T3, 实际{order_ids}"
    assert shipping[0].quantity == 2
    assert shipping[0].status == "待发货"
    assert shipping[1].quantity == 2
    assert shipping[1].status == "待发货"
    assert shipping[2].quantity == 1
    assert shipping[2].status == "部分发货"
    assert sum(s.quantity for s in shipping) == 5
    signed_shortage_risks = [r for r in risks if r.risk_type == RiskType.SIGNED_SHORTAGE]
    order_split_risks = [r for r in risks if r.risk_type == RiskType.ORDER_SPLIT]
    assert len(signed_shortage_risks) == 1
    assert signed_shortage_risks[0].shortage_quantity == 2
    assert len(order_split_risks) == 1
    print("✅ 通过: T1(2张全发) → T2(2张全发) → T3(1张部分发, 缺2张)")
    print()

def test_case_3_partial_ship():
    print("=" * 60)
    print("测试3: 单订单部分发货 (需求3, 可用2)")
    print("=" * 60)
    im = InventoryManager()
    im.load_pre_orders([
        PreOrder('T1', '用户A', '专辑Z', '限定版', 3, True, datetime(2024,1,1), OrderStatus.PENDING),
    ])
    im.load_version_list([VersionItem('专辑Z', '限定版', True, 2, datetime(2024,1,1))])
    im.load_sleeve_inventory([SleeveInventory('专辑Z', '限定版', 5, 'C区')])

    shipping, risks = im.generate_shipping_plan()
    assert len(shipping) == 1
    assert shipping[0].quantity == 2
    assert shipping[0].status == "部分发货"
    assert len(risks) == 2
    risk_types = {r.risk_type for r in risks}
    assert RiskType.SIGNED_SHORTAGE in risk_types
    assert RiskType.ORDER_SPLIT in risk_types
    print("✅ 通过: 部分发货2张, 触发签名缺货+订单拆分两个风险")
    print()

def test_case_4_version_mismatch():
    print("=" * 60)
    print("测试4: 版本漏配 (无压盘记录)")
    print("=" * 60)
    im = InventoryManager()
    im.load_pre_orders([
        PreOrder('T1', '用户A', '专辑W', '未知版', 1, True, datetime(2024,1,1), OrderStatus.PENDING),
    ])
    im.load_version_list([])
    im.load_sleeve_inventory([SleeveInventory('专辑W', '未知版', 5, 'D区')])

    shipping, risks = im.generate_shipping_plan()
    assert len(shipping) == 0
    assert len(risks) == 1
    assert risks[0].risk_type == RiskType.VERSION_MISMATCH
    assert "无压盘记录" in risks[0].description
    print("✅ 通过: 版本漏配正确触发风险, 不发货")
    print()

def test_case_5_non_signed_shortage_no_signed_risk():
    print("=" * 60)
    print("测试5: 非签名版库存耗尽不触发签名缺货风险")
    print("=" * 60)
    im = InventoryManager()
    im.load_pre_orders([
        PreOrder('T1', '用户A', '专辑Q', '普通版', 2, False, datetime(2024,1,1), OrderStatus.PENDING),
        PreOrder('T2', '用户B', '专辑Q', '普通版', 2, False, datetime(2024,1,2), OrderStatus.PENDING),
    ])
    im.load_version_list([VersionItem('专辑Q', '普通版', False, 2, datetime(2024,1,1))])
    im.load_sleeve_inventory([SleeveInventory('专辑Q', '普通版', 10, 'E区')])

    shipping, risks = im.generate_shipping_plan()
    assert sum(s.quantity for s in shipping) == 2
    signed_risks = [r for r in risks if r.risk_type == RiskType.SIGNED_SHORTAGE]
    assert len(signed_risks) == 0, f"非签名版不应触发签名缺货, 实际有{len(signed_risks)}条"
    print("✅ 通过: 非签名版耗尽不触发签名缺货风险")
    print()

def test_case_6_sleeve_is_bottleneck():
    print("=" * 60)
    print("测试6: 封套库存是瓶颈 (压盘5张, 封套仅2张)")
    print("=" * 60)
    im = InventoryManager()
    im.load_pre_orders([
        PreOrder('T1', '用户A', '专辑R', '标准版', 3, True, datetime(2024,1,1), OrderStatus.PENDING),
    ])
    im.load_version_list([VersionItem('专辑R', '标准版', True, 5, datetime(2024,1,1))])
    im.load_sleeve_inventory([SleeveInventory('专辑R', '标准版', 2, 'F区')])

    shipping, risks = im.generate_shipping_plan()
    assert len(shipping) == 1
    assert shipping[0].quantity == 2, f"封套仅2张, 应只能发2张, 实际{shipping[0].quantity}"
    print("✅ 通过: 取min(压盘,封套)作为可用上限")
    print()

if __name__ == "__main__":
    test_case_1_two_orders_same_version_shortage()
    test_case_2_fifo_ordering()
    test_case_3_partial_ship()
    test_case_4_version_mismatch()
    test_case_5_non_signed_shortage_no_signed_risk()
    test_case_6_sleeve_is_bottleneck()
    print("=" * 60)
    print("🎉 全部测试通过!")
    print("=" * 60)

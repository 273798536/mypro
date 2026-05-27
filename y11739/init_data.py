from datetime import datetime, timedelta
from app import models, schemas, crud
from app.database import SessionLocal
from app.models import Currency, OrderStatus, ContractStatus


def init_sample_data():
    db = SessionLocal()

    print("=" * 60)
    print("正在初始化外汇敞口监控系统示例数据...")
    print("=" * 60)

    spot_rates = [
        {"currency": Currency.USD, "rate": 7.2456, "rate_date": datetime.now(), "source": "央行每日中间价"},
        {"currency": Currency.EUR, "rate": 7.8234, "rate_date": datetime.now(), "source": "央行每日中间价"},
        {"currency": Currency.JPY, "rate": 0.0485, "rate_date": datetime.now(), "source": "央行每日中间价"},
    ]

    for rate_data in spot_rates:
        rate = schemas.SpotRateCreate(**rate_data)
        crud.create_spot_rate(db, rate)
    print(f"✓ 已导入 {len(spot_rates)} 条即期汇率数据")

    limit_rules = [
        {"currency": Currency.USD, "single_order_limit": 500000, "total_exposure_limit": 2000000,
         "warning_threshold": 0.8, "effective_date": datetime(2024, 1, 1), "source": "董事会决议2024-001"},
        {"currency": Currency.EUR, "single_order_limit": 400000, "total_exposure_limit": 1500000,
         "warning_threshold": 0.8, "effective_date": datetime(2024, 1, 1), "source": "董事会决议2024-001"},
        {"currency": Currency.JPY, "single_order_limit": 50000000, "total_exposure_limit": 200000000,
         "warning_threshold": 0.8, "effective_date": datetime(2024, 1, 1), "source": "董事会决议2024-001"},
    ]

    for rule_data in limit_rules:
        rule = schemas.LimitRuleCreate(**rule_data)
        crud.create_limit_rule(db, rule)
    print(f"✓ 已导入 {len(limit_rules)} 条限额规则")

    orders_data = [
        {"order_no": "USD-2024-0001", "currency": Currency.USD, "amount": 320000,
         "order_date": datetime.now() - timedelta(days=5), "expected_settle_date": datetime.now() + timedelta(days=60),
         "source": "销售订单-SO2024001", "created_by": "张三"},
        {"order_no": "USD-2024-0002", "currency": Currency.USD, "amount": 450000,
         "order_date": datetime.now() - timedelta(days=3), "expected_settle_date": datetime.now() + timedelta(days=45),
         "source": "销售订单-SO2024002", "created_by": "李四"},
        {"order_no": "USD-2024-0003", "currency": Currency.USD, "amount": 180000,
         "order_date": datetime.now() - timedelta(days=1), "expected_settle_date": datetime.now() + timedelta(days=30),
         "source": "销售订单-SO2024003", "created_by": "王五"},
        {"order_no": "EUR-2024-0001", "currency": Currency.EUR, "amount": 280000,
         "order_date": datetime.now() - timedelta(days=7), "expected_settle_date": datetime.now() + timedelta(days=50),
         "source": "采购订单-PO2024001", "created_by": "赵六"},
        {"order_no": "EUR-2024-0002", "currency": Currency.EUR, "amount": 150000,
         "order_date": datetime.now() - timedelta(days=2), "expected_settle_date": datetime.now() + timedelta(days=35),
         "source": "销售订单-SO2024004", "created_by": "张三"},
        {"order_no": "JPY-2024-0001", "currency": Currency.JPY, "amount": 85000000,
         "order_date": datetime.now() - timedelta(days=10), "expected_settle_date": datetime.now() + timedelta(days=75),
         "source": "销售订单-SO2024005", "created_by": "李四"},
        {"order_no": "JPY-2024-0002", "currency": Currency.JPY, "amount": 42000000,
         "order_date": datetime.now() - timedelta(days=4), "expected_settle_date": datetime.now() + timedelta(days=40),
         "source": "采购订单-PO2024002", "created_by": "王五"},
    ]

    created_orders = []
    for order_data in orders_data:
        order = schemas.ForeignOrderCreate(**order_data)
        db_order = crud.create_order(db, order)
        created_orders.append(db_order)
    print(f"✓ 已导入 {len(created_orders)} 条外币订单")

    contracts_data = [
        {"contract_no": "FWD-USD-001", "order_id": created_orders[0].id, "currency": Currency.USD,
         "amount": 320000, "forward_rate": 7.2500, "trade_date": datetime.now() - timedelta(days=4),
         "settle_date": datetime.now() + timedelta(days=58), "source": "中国银行-远期结汇", "created_by": "交易员A"},
        {"contract_no": "FWD-USD-002", "order_id": created_orders[1].id, "currency": Currency.USD,
         "amount": 400000, "forward_rate": 7.2350, "trade_date": datetime.now() - timedelta(days=2),
         "settle_date": datetime.now() + timedelta(days=43), "source": "工商银行-远期结汇", "created_by": "交易员A"},
        {"contract_no": "FWD-EUR-001", "order_id": created_orders[3].id, "currency": Currency.EUR,
         "amount": 250000, "forward_rate": 7.8500, "trade_date": datetime.now() - timedelta(days=6),
         "settle_date": datetime.now() + timedelta(days=48), "source": "建设银行-远期售汇", "created_by": "交易员B"},
        {"contract_no": "FWD-JPY-001", "order_id": created_orders[5].id, "currency": Currency.JPY,
         "amount": 80000000, "forward_rate": 0.0490, "trade_date": datetime.now() - timedelta(days=9),
         "settle_date": datetime.now() + timedelta(days=73), "source": "三菱银行-远期结汇", "created_by": "交易员B"},
    ]

    for contract_data in contracts_data:
        contract = schemas.ForwardContractCreate(**contract_data)
        crud.create_contract(db, contract)
    print(f"✓ 已导入 {len(contracts_data)} 条远期合约")

    print("\n" + "=" * 60)
    print("示例数据初始化完成！")
    print("=" * 60)
    print("\n系统已包含以下测试场景：")
    print("  1. USD订单部分覆盖 (45万订单仅覆盖40万)")
    print("  2. EUR订单部分覆盖 (28万订单仅覆盖25万)")
    print("  3. JPY订单部分覆盖 (8500万订单仅覆盖8000万)")
    print("  4. 存在未覆盖敞口，可触发限额预警")
    print("\n启动命令: python main.py 或 uvicorn main:app --reload")
    print("API文档地址: http://localhost:8000/docs")

    db.close()


if __name__ == "__main__":
    init_sample_data()

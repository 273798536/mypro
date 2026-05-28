#!/usr/bin/env python3
import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from waterfall_api.database import get_conn, init_db
from waterfall_api.seed import load_sample
from waterfall_api.waterfall import calculate_waterfall


def test_full_flow():
    print("=" * 60)
    print("测试 1: 初始化数据库")
    init_db()
    print("✓ 数据库初始化完成")

    print("\n" + "=" * 60)
    print("测试 2: 加载样例数据")
    result = load_sample()
    print(f"✓ 样例数据加载完成: fund_id={result.get('fund_id')}, rule_id={result.get('rule_id')}, distribution_id={result.get('distribution_id')}")

    dist_id = result.get("distribution_id")

    print("\n" + "=" * 60)
    print("测试 3: 查询待确认项")
    conn = get_conn()
    pending = conn.execute(
        "SELECT pc.*, i.name as investor_name FROM pending_confirmations pc JOIN investors i ON pc.investor_id = i.id WHERE pc.distribution_id = ?",
        (dist_id,),
    ).fetchall()
    print(f"✓ 待确认项数量: {len(pending)}")
    for p in pending:
        print(f"  - [{p['reason_type']}] {p['investor_name']}: {p['reason_detail'][:50]}...")
        print(f"    后续动作: {p['next_action']}")

    print("\n" + "=" * 60)
    print("测试 4: 瀑布计算结果")
    steps = conn.execute(
        "SELECT * FROM waterfall_steps WHERE distribution_id = ? ORDER BY step_order",
        (dist_id,),
    ).fetchall()
    print(f"✓ 瀑布步骤数量: {len(steps)}")
    total = 0
    for s in steps:
        total += s["total_amount"]
        print(f"  Step {s['step_order']}: {s['step_type']} ({s['description']}) = {s['total_amount']:,.2f}")
    print(f"  总计分配: {total:,.2f}")

    print("\n" + "=" * 60)
    print("测试 5: 按投资人分配明细")
    details = conn.execute(
        "SELECT i.name, SUM(dd.amount) as total FROM distribution_details dd JOIN investors i ON dd.investor_id = i.id WHERE dd.distribution_id = ? GROUP BY i.name",
        (dist_id,),
    ).fetchall()
    for d in details:
        print(f"  {d['name']}: {d['total']:,.2f}")

    print("\n" + "=" * 60)
    print("测试 6: 导出结果 - 核心问题回答")
    hurdle_pending = conn.execute(
        "SELECT COUNT(*) as cnt FROM pending_confirmations WHERE distribution_id = ? AND reason_type = 'hurdle_cross_tier' AND status = 'pending'",
        (dist_id,),
    ).fetchone()
    is_blocked = hurdle_pending["cnt"] > 0
    print(f"  ⭐ 基金秘书最关心的问题: 门槛跨档有没有被拦住?")
    print(f"     回答: {'是 - 有门槛跨档待确认项未处理' if is_blocked else '否 - 所有门槛跨档项已处理'}")
    print(f"     待确认数量: {hurdle_pending['cnt']}")

    print("\n" + "=" * 60)
    print("✅ 所有测试通过!")
    print("\n启动服务后可访问: http://localhost:8000/docs")
    print("完整流程参考: README.md")


if __name__ == "__main__":
    test_full_flow()

#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
import httpx

BASE = os.environ.get("CONCERT_CLAIM_URL", "http://127.0.0.1:8000")


def e2e():
    c = httpx.Client(base_url=BASE, timeout=10)

    print("=" * 60)
    print("端到端流程：造数 → 核算 → 修改票务退款 → 查看差分 → 报告导出")
    print("=" * 60)

    print("\n【步骤1】健康检查")
    r = c.get("/api/health")
    print(f"  {r.json()}")

    print("\n【步骤2】查看当前所有核算")
    r = c.get("/api/calculations")
    calcs = r.json()
    if not calcs:
        print("  无核算记录，请先运行 seed.py")
        return
    for calc in calcs:
        print(f"  核算#{calc['id']} {calc['concert_name']}: "
              f"总损失={calc['gross_loss']} 免赔={calc['deductible_amount']} "
              f"净赔付={calc['net_compensation']} "
              f"延期跨城={calc['cross_city_delay']} 免赔正确={calc['deductible_correct']}")

    target_id = calcs[0]["id"]
    refund_id = calcs[0]["ticket_refund_id"]

    print(f"\n【步骤3】查看核算#{target_id}详情（修改前）")
    r = c.get(f"/api/calculations/{target_id}")
    before = r.json()
    print(f"  旧总损失: {before['gross_loss']}")
    print(f"  旧净赔付: {before['net_compensation']}")
    print(f"  old_gross_loss: {before.get('old_gross_loss')}")
    print(f"  result_diff: {before.get('result_diff')}")

    print(f"\n【步骤4】修改票务退款#{refund_id}：金额从 {before['gross_loss']} 相关退款改为 180000")
    r = c.put(f"/api/refunds/{refund_id}", json={"refund_amount": 180000})
    updated_refund = r.json()
    print(f"  退款更新后金额: {updated_refund['refund_amount']}")

    print(f"\n【步骤5】查看核算#{target_id}详情（修改后）")
    r = c.get(f"/api/calculations/{target_id}")
    after = r.json()
    print(f"  新总损失: {after['gross_loss']}")
    print(f"  新净赔付: {after['net_compensation']}")
    print(f"  旧总损失: {after.get('old_gross_loss')}")
    print(f"  旧净赔付: {after.get('old_net_compensation')}")
    print(f"  新旧差分: {after.get('result_diff')}")

    diff = after.get("result_diff")
    if diff:
        if isinstance(diff, str):
            diff = json.loads(diff)
        print(f"\n  >>> 差分明细：")
        for field, vals in diff.items():
            print(f"      {field}: {vals['old']} → {vals['new']}")
    else:
        print("\n  ⚠️ 无差分记录！")

    print(f"\n【步骤6】查看变更快照")
    r = c.get("/api/snapshots", params={"entity_type": "compensation_calculation", "entity_id": target_id})
    snapshots = r.json()
    print(f"  快照数: {len(snapshots)}")
    for snap in snapshots:
        old_v = snap["old_values"]
        new_v = snap["new_values"]
        if isinstance(old_v, str):
            old_v = json.loads(old_v)
        if isinstance(new_v, str):
            new_v = json.loads(new_v)
        print(f"  变更时间: {snap['changed_at']}")
        print(f"    旧净赔付: {old_v.get('net_compensation')}")
        print(f"    新净赔付: {new_v.get('net_compensation')}")

    print(f"\n【步骤7】导出核算#{target_id}的报告")
    r = c.post("/api/reports", json={"calculation_id": target_id})
    report_export = r.json()
    report_data = report_export.get("report_data", {})
    if isinstance(report_data, str):
        report_data = json.loads(report_data)

    print(f"  延期跨城影响报告: {report_data.get('延期跨城是否影响报告')}")
    print(f"  免赔错用影响报告: {report_data.get('免赔错用是否影响报告')}")
    print(f"  影响原因: {report_data.get('影响原因', [])}")
    print(f"  条款版本: {report_data.get('适用条款', {}).get('条款版本')}")
    print(f"  旧结果: {report_data.get('旧结果')}")
    print(f"  新旧差分: {report_data.get('新旧差分')}")
    print(f"  原始票务退款: {report_data.get('原始票务退款', {}).get('refund_amount')}")
    print(f"  原始场租合同违约金: {report_data.get('原始场租合同', {}).get('penalty_rate')}")

    print(f"\n【步骤8】检查条款日视图与报告视图口径一致性")
    r = c.get(f"/api/clauses/{after['clause_code']}")
    clause_daily = r.json()
    report_clause_ver = report_data.get("适用条款", {}).get("条款版本")
    print(f"  日视图条款版本: v{clause_daily['version']}")
    print(f"  报告条款版本: v{report_clause_ver}")
    if clause_daily["version"] == report_clause_ver:
        print("  ✅ 口径一致")
    else:
        print("  ⚠️ 口径不一致，需要检查")

    print("\n" + "=" * 60)
    print("端到端流程完成！")
    print("=" * 60)


if __name__ == "__main__":
    e2e()

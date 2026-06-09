"""快速冒烟测试: 验证核心功能正常"""

import json
import os
import sys
import tempfile
from pathlib import Path

# ---------------------------------------------------------------------------
# 1. 配平算法测试
# ---------------------------------------------------------------------------
print("=" * 60)
print("[1/5] 配平算法测试")
from chemeq_balancer.balancer import balance_equation, BalanceMethod

cases = [
    ("H2 + O2 -> H2O", "2H2 + O2 -> 2H2O"),
    ("CH4 + O2 -> CO2 + H2O", "CH4 + 2O2 -> CO2 + 2H2O"),
    ("Ca(OH)2 + HCl -> CaCl2 + H2O", "Ca(OH)2 + 2HCl -> CaCl2 + 2H2O"),
    ("N2 + H2 -> NH3", "N2 + 3H2 -> 2NH3"),
    ("C2H5OH + O2 -> CO2 + H2O", "C2H5OH + 3O2 -> 2CO2 + 3H2O"),
]
for raw, expected in cases:
    r = balance_equation(raw, method=BalanceMethod.AUTO)
    ok = r.success and r.format_equation() == expected
    mark = "✓" if ok else "✗"
    print(f"  {mark} {raw}  =>  {r.format_equation()}")
    assert ok, f"Expected {expected}, got {r.format_equation()}"

# 失败场景
r = balance_equation("H2 + O2 -> NaCl")
assert not r.success and r.fail_reason == "NO_SOLUTION"
print(f"  ✓ 元素不匹配正确检测: {r.fail_reason}")

r = balance_equation("not an equation")
assert not r.success and r.fail_reason == "PARSE_ERROR"
print(f"  ✓ 解析错误正确检测: {r.fail_reason}")

print()

# ---------------------------------------------------------------------------
# 2. 批次管理 + 去重 + 补录 + 空白对照
# ---------------------------------------------------------------------------
print("[2/5] 批次管理 / 去重 / 补录 / 空白对照")

with tempfile.TemporaryDirectory() as tmp:
    store_path = Path(tmp) / "store.json"
    os.environ["CHEMEQ_STORE_PATH"] = str(store_path)

    from chemeq_balancer.storage import JsonFileStorage
    from chemeq_balancer.reports import create_default_manager, RetestManager, Exporter, ExportFormat, Tracer

    storage = JsonFileStorage(store_path)
    mgr = create_default_manager()

    batch = mgr.create_batch(title="测试批次", operator="tester", description="验收测试")
    bid = batch.id
    print(f"  ✓ 创建批次: {bid}")

    # 添加正常反应
    res = mgr.add_reaction(bid, "H2 + O2 -> H2O", operator="tester",
                           reaction_conditions="25C", experiment_id="EXP-001")
    assert res.success and not res.is_duplicate
    rid1 = res.reaction.id
    print(f"  ✓ 新增反应 EXP-001 ({rid1})")

    # 重复添加同一指纹 (应补录合并, 保留原 ID)
    res2 = mgr.add_reaction(bid, "H2 + O2 -> H2O", operator="tester",
                            reaction_conditions="25C", experiment_id="EXP-001",
                            notes="补录备注")
    assert res2.success and res2.is_duplicate and res2.reaction.id == rid1
    print(f"  ✓ 补录合并生效, 保留原 ID={rid1}, 动作='{res2.action}'")

    # 标记为已验证, 再次添加应该被拒绝
    mgr.set_status(bid, rid1, __import__("chemeq_balancer.models", fromlist=["ReactionStatus"]).ReactionStatus.VERIFIED,
                   operator="审核员", comment="符合文献")
    res3 = mgr.add_reaction(bid, "H2 + O2 -> H2O", operator="tester",
                            reaction_conditions="25C", experiment_id="EXP-001")
    assert not res3.success and res3.is_duplicate
    print(f"  ✓ 已验证记录拒绝重复添加, 动作='{res3.action}'")

    # 添加空白对照
    res_blank = mgr.add_reaction(bid, "H2O -> H2 + O2", operator="tester",
                                 experiment_id="BLANK", is_blank=True)
    assert res_blank.success
    print(f"  ✓ 空白对照添加: {res_blank.reaction.id}")

    # 质控检查
    ok, issues = mgr.check_blank_control(bid)
    print(f"  ✓ 质控空白对照检查={ok}, issues={issues}")
    assert ok

print()

# ---------------------------------------------------------------------------
# 3. 复测建议 (日常入口)
# ---------------------------------------------------------------------------
print("[3/5] 复测建议扫描 (日常入口)")

# 新建一个无空白对照的批次来验证空白对照缺失告警
with tempfile.TemporaryDirectory() as tmp:
    store_path = Path(tmp) / "store2.json"
    storage2 = JsonFileStorage(store_path)
    mgr2 = create_default_manager()
    mgr2.storage = storage2
    mgr2._store = None
    batch2 = mgr2.create_batch(title="无空白对照批次", operator="tester")
    mgr2.add_reaction(batch2.id, "H2 + O2 -> H2O")

    rm = RetestManager(storage2)
    items = rm.scan_all()
    critical = [i for i in items if i["priority"] == "critical"]
    has_blank_alert = any("空白对照" in i["reason"] for i in critical)
    print(f"  ✓ 复测扫描生成 {len(items)} 条建议, 其中紧急 {len(critical)} 条")
    print(f"  ✓ 空白对照缺失告警触发={has_blank_alert}")
    assert has_blank_alert, "应当触发空白对照缺失告警"

print()

# ---------------------------------------------------------------------------
# 4. 导出一致性 (界面摘要 vs 导出文件)
# ---------------------------------------------------------------------------
print("[4/5] 导出一致性 (界面摘要=导出文件)")

with tempfile.TemporaryDirectory() as tmp:
    store_path = Path(tmp) / "store3.json"
    storage3 = JsonFileStorage(store_path)
    mgr3 = create_default_manager()
    mgr3.storage = storage3
    mgr3._store = None
    b = mgr3.create_batch(title="一致性测试批次", operator="tester")
    mgr3.add_reaction(b.id, "H2 + O2 -> H2O", experiment_id="E1")
    mgr3.add_reaction(b.id, "CH4 + O2 -> CO2 + H2O", experiment_id="E2", is_blank=True)

    batch_reloaded = mgr3.get_batch(b.id)
    cli_summary = batch_reloaded.compute_summary()

    exporter = Exporter(storage3)
    json_text = exporter.export_batch(batch_reloaded, ExportFormat.JSON)
    payload = json.loads(json_text)
    exported_summary = payload["summary"]

    # 验证关键字段完全一致
    for k in ["total_reactions", "verified_count", "pending_count", "blank_count",
              "needs_retest_count", "has_blank_control", "all_consistent"]:
        v1 = getattr(cli_summary, k)
        v2 = exported_summary[k]
        assert v1 == v2, f"字段 {k} 不一致: CLI={v1}, 导出={v2}"
        print(f"  ✓ {k}: {v1}")

    # TXT 导出
    txt = exporter.export_batch(batch_reloaded, ExportFormat.TXT)
    assert "化学方程式配平批次报告" in txt
    assert "质控项" in txt
    print(f"  ✓ TXT 导出生成, {len(txt.splitlines())} 行, 含报告标题和质控项")

    # CSV 导出
    csv_text = exporter.export_batch(batch_reloaded, ExportFormat.CSV)
    assert "id,experiment_id" in csv_text
    print(f"  ✓ CSV 导出生成, {len(csv_text.splitlines())} 行")

print()

# ---------------------------------------------------------------------------
# 5. 数据追溯 (验收倒查)
# ---------------------------------------------------------------------------
print("[5/5] 数据追溯 (验收倒查)")

with tempfile.TemporaryDirectory() as tmp:
    store_path = Path(tmp) / "store4.json"
    storage4 = JsonFileStorage(store_path)
    mgr4 = create_default_manager()
    mgr4.storage = storage4
    mgr4._store = None
    b = mgr4.create_batch(title="追溯测试批次", operator="tester")
    res = mgr4.add_reaction(b.id, "H2 + O2 -> H2O", operator="实验员甲",
                            reaction_conditions="25C, 1atm", experiment_id="EXP-TRACE")
    rid = res.reaction.id
    RS = __import__("chemeq_balancer.models", fromlist=["ReactionStatus"]).ReactionStatus
    mgr4.set_status(b.id, rid, RS.VERIFIED, operator="审核员乙", comment="已复核, 系数正确")

    tracer = Tracer(storage4)
    tr = tracer.trace_reaction_id(rid)

    assert tr.found
    print(f"  ✓ 通过 reaction_id 追溯成功")
    print(f"  ✓ 找到配平过程: method={tr.balance_process.get('method')}, success={tr.balance_process.get('success')}")
    print(f"  ✓ 审计记录 {len(tr.audit_trail)} 条:")
    for a in tr.audit_trail:
        print(f"      - [{a['timestamp'][:19]}] {a['action']} by {a['operator'] or 'system'}: {a['comment']}")

    assert any("已复核" in a["comment"] for a in tr.audit_trail)
    assert tr.reaction["operator"] == "实验员甲"

    # 通过方程式内容追溯
    tr2 = tracer.trace_equation("2H2 + O2 -> 2H2O")
    assert tr2.found and tr2.reaction["id"] == rid
    print(f"  ✓ 通过方程式内容追溯成功, 命中同一记录")

print()
print("=" * 60)
print("ALL SMOKE TESTS PASSED ✓")

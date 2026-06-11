import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from service import (
    store,
    generate_sample_data,
    replay_batch,
    change_status,
    add_remark,
    update_voucher,
    detect_duplicate_claims,
)
from report import generate_markdown_report
from models import PaymentStatus, ChangeSource


def test_full_flow():
    print("=" * 60)
    print("测试：供应链预付款异常回放 完整流程")
    print("=" * 60)

    print("\n【1/7】生成示例数据...")
    batch_id = generate_sample_data()
    print(f"  批次号: {batch_id}")
    payments = store.list_payments(batch_id)
    print(f"  记录数: {len(payments)}")
    for p in payments:
        print(f"    - {p.payment_no} | {p.supplier_name} | ¥{p.amount:,.2f} | {p.current_status.value}")

    print("\n【2/7】检测重复认领（同金额同日期）...")
    dups = detect_duplicate_claims(payments)
    for key, ids in dups.items():
        print(f"  ⚠️  重复金额 ¥{key[0]:,.2f} 日期 {key[1]}: {len(ids)} 笔")
        for pid in ids:
            p = store.get_payment(pid)
            print(f"      - {p.payment_no} ({p.recon_caliber})")

    print("\n【3/7】第一遍回放...")
    results1, summary1 = replay_batch(batch_id)
    print(f"  变更笔数: {summary1.changed_count}")
    print(f"  可放行: {summary1.released_count} | 需补材料: {summary1.need_supplement_count} | 争议: {summary1.disputed_count}")
    for r in results1:
        icon = "✅" if not r.is_status_changed else "🔄"
        print(f"  {icon} {r.payment_no}: {r.previous_status.value} → {r.new_status.value}")
        if r.action_needed:
            print(f"      💡 {r.action_needed}")

    print("\n【4/7】人工改判 + 补备注（模拟老许操作）...")
    target = payments[2]
    print(f"  对 {target.payment_no} 进行人工改判: {target.current_status.value} → 可放行")
    change_status(
        target.id,
        PaymentStatus.RELEASED,
        ChangeSource.MANUAL_ADJUST,
        operator="老许",
        remark="电话确认过，对方已发货，先放行",
        detail="业务台账截图已存档，截图编号 SCR-20260609-001",
    )

    target2 = payments[1]
    print(f"  对 {target2.payment_no} 补充备注: 核实为口径B正确，口径A重复认领，已通知A调账")
    add_remark(
        target2.id,
        "核实为口径B正确，口径A重复认领，已通知A调账。业务台账截图SCR-20260609-002",
        operator="老许",
        screenshot_ref="SCR-20260609-002",
    )

    target3 = payments[2]
    print(f"  对 {target3.payment_no} 录入凭证号")
    update_voucher(target3.id, "PZ2026060100-NEW", operator="老许")

    print("\n【5/7】第二遍回放（同一批材料再跑一遍）...")
    results2, summary2 = replay_batch(batch_id)
    print(f"  变更笔数: {summary2.changed_count}")
    print(f"  可放行: {summary2.released_count} | 需补材料: {summary2.need_supplement_count} | 争议: {summary2.disputed_count}")

    print("\n【6/7】检查历史轨迹是否完整保留...")
    payments_after = store.list_payments(batch_id)
    all_ok = True
    for p in payments_after:
        print(f"\n  {p.payment_no} 当前状态: {p.current_status.value}")
        print(f"  当前备注: {p.current_remark or '(无)'}")
        print(f"  历史条目数: {len(p.history)}")
        if len(p.history) < 1:
            print(f"    ❌ 历史条目为空！")
            all_ok = False
        for h in p.history:
            old = h.old_status.value if h.old_status else "(初始)"
            print(f"    [{h.timestamp.strftime('%H:%M:%S')}] {h.source.value} | {h.operator} | {old} → {h.new_status.value} | {h.remark or h.detail or ''}")

    print("\n【7/7】生成 Markdown 报告并导出...")
    md = generate_markdown_report(batch_id, results2, summary2)
    out_path = f"data/report_{batch_id}.md"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(md)
    print(f"  报告已导出: {out_path}")
    print(f"  报告字符数: {len(md)}")

    report_ok = all(kw in md for kw in ["可放行", "需补材料", "重复认领", "历史轨迹", "老许"])
    print(f"  报告包含关键信息: {'✅' if report_ok else '❌'}")

    print("\n" + "=" * 60)
    if all_ok and report_ok:
        print("✅ 所有测试通过！历史记录完整，报告正确。")
    else:
        print("❌ 存在问题，请检查上方输出。")
    print("=" * 60)


if __name__ == "__main__":
    test_full_flow()

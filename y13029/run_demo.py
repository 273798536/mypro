#!/usr/bin/env python3
"""券商适当性风险预警 - 完整演示流程
运行: rm -rf data reports && python3 run_demo.py
然后看 reports/ 里最新的 CLEAN Markdown 报告。
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.importer import import_custody_csv
from app import storage
from app.workflow import (
    confirm_warning, add_remark, link_late_attachment,
    finalize_batch, check_batch_consistency,
)
from app.reporter import generate_markdown_report
from app.models import ConfirmReason, WarningStatus


BATCH_ID = "20260609-01"
OP = "小林"


def pr(label, obj):
    print(f"\n{'='*72}\n=== {label}\n{'='*72}")
    s = json.dumps(obj, ensure_ascii=False, indent=2, default=str)
    # 截短过长输出
    if len(s) > 3000:
        s = s[:2900] + "\n... [truncated] ..."
    print(s)


def main():
    storage.init_db()
    all_step_results = []

    # 1. 第一批托管回执（含 双口径 + 币种RMB错 + 金额NOT_A_NUMBER坏数据）
    r1 = import_custody_csv(
        "sample_materials/托管回执_20260609_batch01.csv", BATCH_ID
    )
    pr("STEP 1/8: 第一次导入托管回执(含冲突、币种错、坏数据)", r1)
    assert r1["ok"], f"STEP1 失败: {r1}"
    all_step_results.append(("STEP1 导入", r1))

    # 2. 导入晚到附件（INV011黄十三风险不匹配R5>稳健型 + INV012刘十四R4>平衡型）
    r2 = import_custody_csv(
        "sample_materials/托管回执_晚到附件_20260609_batch01.csv", BATCH_ID
    )
    pr("STEP 2/8: 导入晚到附件（同批次）", r2)
    assert r2["ok"], f"STEP2 失败: {r2}"
    all_step_results.append(("STEP2 晚到附件导入", r2))

    # 3. 币种错误 + 晚到附件关联（INV008郑十 = RMB写成RMB的那条）
    from app.storage import get_warnings_by_batch
    batch_w = get_warnings_by_batch(BATCH_ID)
    inv008_currency = next(
        (w for w in batch_w
         if w.confirm_reason == ConfirmReason.CURRENCY_MISMATCH
         and "郑十" in w.description), None
    )
    assert inv008_currency, "没找到郑十的币种错误预警！"
    r3 = confirm_warning(
        inv008_currency.id, OP,
        conclusion="币种写错RMB需人工确认：经晚到附件说明核对，实际应为CNY；投资者R5=激进型与产品匹配；结论：确认通过，原因归档。",
        reason=ConfirmReason.CURRENCY_MISMATCH,
        note="下一步：币种异常已通过人工复核，后续由系统统一收尾进入报告归档。",
        late_attachment_ref="晚到附件_币种更正说明(见sample_materials/托管回执_晚到附件_20260609_batch01.csv第2行)"
    )
    pr(f"STEP 3/8: 币种错误人工确认预警#{inv008_currency.id}(郑十RMB→CNY)", r3)
    assert r3["ok"], f"STEP3 失败: {r3}"
    all_step_results.append(("STEP3 币种错误确认", r3))

    # 4. 晚到附件 INV011黄十三 关联附件并确认
    inv011 = next(
        (w for w in get_warnings_by_batch(BATCH_ID)
         if "黄十三" in w.description or "INV011" in w.description), None
    )
    assert inv011, "没找到黄十三的晚到附件预警！"
    r4 = link_late_attachment(
        inv011.id,
        "晚到附件_托管回执_晚到附件_20260609_batch01.csv:行1-私募基金申购确认单",
        conclusion="晚到附件核验完成：私募基金申购确认单已齐；投资者虽为稳健型(R2)，但该笔为12个月以上定期开放、客户签署高风险告知书，结论：确认通过。",
        operator=OP,
    )
    pr(f"STEP 4/8: 关联晚到附件 → 确认预警#{inv011.id}(黄十三R5私募)", r4)
    assert r4["ok"], f"STEP4 失败: {r4}"
    all_step_results.append(("STEP4 晚到附件关联", r4))

    # 5. 同一批材料跑第二遍（README要求的关键场景）
    r5 = import_custody_csv(
        "sample_materials/托管回执_20260609_batch01.csv", BATCH_ID
    )
    pr("STEP 5/8: 同一批材料跑第二遍（应SHA1指纹完全去重，skipped_duplicates=12）", r5)
    assert r5["ok"], f"STEP5 失败: {r5}"
    all_step_results.append(("STEP5 二次导入", r5))

    # 6. 补备注（README要求）
    any_w = get_warnings_by_batch(BATCH_ID)[0]
    r6 = add_remark(
        any_w.id,
        "小林备注：本批次托管回执已跑两遍导入，历史记录完整可查；所有冲突将在收尾步骤按口径A优先规则统一闭环。",
        operator=OP,
    )
    pr(f"STEP 6/8: 给预警#{any_w.id}追加备注", r6)
    assert r6["ok"], f"STEP6 失败: {r6}"
    all_step_results.append(("STEP6 追加备注", r6))

    # 7. ⭐ 批次收尾关键步骤（README新增的核心命令）
    r7 = finalize_batch(BATCH_ID, OP)
    pr("STEP 7/8: ⭐ finalize —— 自动解决所有冲突 → 批量确认 → 一致性检查", r7)
    # 收尾失败不一定致命，先不 assert ok，只看 clean
    all_step_results.append(("STEP7 批次收尾", r7))

    # 8. 一致性检查 + 报告
    r8 = check_batch_consistency(BATCH_ID)
    pr("STEP 8a/8: check 批次最终一致性（clean 必须为 True）", r8)
    all_step_results.append(("STEP8a 一致性检查", r8))
    if not r8["clean"]:
        print("\n[WARN] 一致性检查仍有未闭环项，尝试加 --force 的 finalize...")
        r7b = finalize_batch(BATCH_ID, OP, force=True)
        pr("STEP 7b/8 retry: finalize --force", r7b)
        r8b = check_batch_consistency(BATCH_ID)
        pr("STEP 8b/8 retry: check again", r8b)
        if not r8b["clean"]:
            print("\n[ERROR] 强制收尾后仍有未闭环，报告将 UNCLOSED 标记，但我们仍会生成。")

    r9 = generate_markdown_report(BATCH_ID)
    if r9.get("ok"):
        pr("STEP 8c/8: 生成 Markdown 报告", {
            k: v for k, v in r9.items()
            if k not in ("consistency",)
        })
        all_step_results.append(("STEP9 报告生成", r9))
    else:
        # 一致性检查未过会走 fail，我们强制输出带 UNCLOSED 的一份（和 CLI --ignore-unclosed 等价）
        r9_force = generate_markdown_report(
            BATCH_ID,
            output_path=os.path.join(
                os.path.dirname(r9.get("report_path", os.path.join(
                    os.path.dirname(__file__), "reports", "_tmp.md"))
                ),
                f"warning_report_{BATCH_ID}_FORCE_GENERATED.md",
            )
        )
        pr("STEP 8c/8 retry: 强制生成带 UNCLOSED 标记的报告", r9_force)
        all_step_results.append(("STEP9 报告生成(force)", r9_force))

    # 最终汇总
    print("\n" + "#" * 72)
    print("#  全部步骤完成 —— 核心检查点总结")
    print("#" * 72)
    last_check = check_batch_consistency(BATCH_ID)
    print(f"  [1] 批次 {BATCH_ID} 一致性:          ✅ CLEAN" if last_check["clean"]
          else f"  [1] 批次 {BATCH_ID} 一致性:          ❌ 未闭环 ({last_check.get('issues', [])[:3]})")
    print(f"  [2] 预警总数: {last_check['total']}  "
          f"(已确认 {last_check['confirmed']} / 已撤回 {last_check['withdrawn']} / "
          f"待确认 {last_check['pending']} / 冲突中 {last_check['conflict']})")
    print(f"  [3] 导入轮次: {storage.get_import_rounds(BATCH_ID)}")
    print(f"  [4] 报告路径: {r9.get('report_path') if r9.get('ok') else '(未生成，见force路径)'}")
    reports = sorted([f for f in os.listdir("reports") if f.endswith(".md")]) if os.path.isdir("reports") else []
    print(f"  [5] reports/ 目录下所有报告: {reports}")


if __name__ == "__main__":
    main()

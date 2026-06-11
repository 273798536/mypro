import sys
import os
import json
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from service import (
    store,
    generate_sample_data,
    replay_batch,
    change_status,
    add_remark,
    update_voucher,
)
from models import PaymentStatus, ChangeSource
from main import _serialize_payment, _serialize_history, _serialize_replay_result
from report import generate_markdown_report

VALID_STATUS_NAMES = {"PENDING", "MATCHED", "RELEASED", "DISPUTED", "NEED_VOUCHER", "NEED_SUPPLEMENT", "DUPLICATE"}
VALID_STATUS_LABELS = {"待核实", "已匹配", "可放行", "有争议", "待补凭证", "需补材料", "重复认领"}
VALID_SOURCE_NAMES = {"AUTO_REPLAY", "MANUAL_ADJUST", "VOUCHER_ARRIVED", "SUPPLEMENT_UPLOAD", "REMARK_ADD"}


def test_api_serialization():
    print("=" * 60)
    print("端到端验证：API 序列化 → 前端逻辑 → 报告导出 对齐")
    print("=" * 60)

    print("\n【1/5】生成数据 + 回放 + 人工操作...")
    batch_id = generate_sample_data()
    payments = store.list_payments(batch_id)
    replay_batch(batch_id)
    change_status(payments[2].id, PaymentStatus.RELEASED, ChangeSource.MANUAL_ADJUST, operator="老许", remark="先放行")
    add_remark(payments[1].id, "口径B正确", operator="老许")
    update_voucher(payments[2].id, "PZ-NEW", operator="老许")
    payments = store.list_payments(batch_id)
    results, summary = replay_batch(batch_id)

    print("\n【2/5】验证 _serialize_payment 输出格式...")
    all_ok = True
    for p in payments:
        d = _serialize_payment(p)
        status = d["current_status"]
        label = d["status_label"]
        if status not in VALID_STATUS_NAMES:
            print(f"  ❌ {p.payment_no}: current_status='{status}' 不是合法英文名")
            all_ok = False
        else:
            print(f"  ✅ {p.payment_no}: current_status='{status}' (英文名)")
        if label not in VALID_STATUS_LABELS:
            print(f"  ❌ {p.payment_no}: status_label='{label}' 不是合法中文标签")
            all_ok = False
        else:
            print(f"  ✅ {p.payment_no}: status_label='{label}' (中文标签)")

        for h_d in d["history"]:
            h_src = h_d["source"]
            h_src_l = h_d.get("source_label", "")
            if h_src not in VALID_SOURCE_NAMES:
                print(f"  ❌ 历史条目 source='{h_src}' 不是合法英文名")
                all_ok = False
            if h_d["new_status"] not in VALID_STATUS_NAMES:
                print(f"  ❌ 历史条目 new_status='{h_d['new_status']}' 不是合法英文名")
                all_ok = False
            if h_d.get("old_status") and h_d["old_status"] not in VALID_STATUS_NAMES:
                print(f"  ❌ 历史条目 old_status='{h_d['old_status']}' 不是合法英文名")
                all_ok = False

    print("\n【3/5】验证 _serialize_replay_result 输出格式...")
    for r in results:
        rd = _serialize_replay_result(r)
        for field in ["previous_status", "new_status"]:
            if rd[field] not in VALID_STATUS_NAMES:
                print(f"  ❌ {rd['payment_no']}: {field}='{rd[field]}' 不是合法英文名")
                all_ok = False
            else:
                print(f"  ✅ {rd['payment_no']}: {field}='{rd[field]}'")
        for field in ["previous_status_label", "new_status_label"]:
            if rd[field] not in VALID_STATUS_LABELS:
                print(f"  ❌ {rd['payment_no']}: {field}='{rd[field]}' 不是合法中文标签")
                all_ok = False

    print("\n【4/5】验证前端 JS 逻辑和 API 数据对齐...")
    js_logic_names = ["MATCHED", "RELEASED", "NEED_VOUCHER", "NEED_SUPPLEMENT", "DISPUTED", "DUPLICATE", "PENDING"]
    for p in payments:
        d = _serialize_payment(p)
        s = d["current_status"]
        if s in js_logic_names:
            category = "ok" if s in ["MATCHED", "RELEASED"] else "warn" if s in ["NEED_VOUCHER", "NEED_SUPPLEMENT"] else "err"
            print(f"  ✅ {p.payment_no}: '{s}' → JS 可归类为 {category}")
        else:
            print(f"  ❌ {p.payment_no}: '{s}' → JS 无法归类！")
            all_ok = False

    print("\n【5/5】验证 Markdown 报告和页面数据一致...")
    md = generate_markdown_report(batch_id, results, summary)
    for p in payments:
        d = _serialize_payment(p)
        label = d["status_label"]
        payment_no = p.payment_no
        if payment_no in md and label in md:
            print(f"  ✅ {payment_no}: 页面标签 '{label}' 在报告中出现")
        else:
            print(f"  ❌ {payment_no}: 页面标签 '{label}' 在报告中缺失")
            all_ok = False

    md_keywords = ["可放行", "需催凭证", "重复认领", "历史轨迹", "老许", "下一步怎么做"]
    for kw in md_keywords:
        if kw in md:
            print(f"  ✅ 报告含关键词: '{kw}'")
        else:
            print(f"  ❌ 报告缺关键词: '{kw}'")
            all_ok = False

    print("\n" + "=" * 60)
    if all_ok:
        print("✅ 全部验证通过！API 输出英文名+中文标签，JS 逻辑和报告导出对齐。")
    else:
        print("❌ 存在不一致，请检查上方输出。")
    print("=" * 60)
    return all_ok


if __name__ == "__main__":
    ok = test_api_serialization()
    sys.exit(0 if ok else 1)

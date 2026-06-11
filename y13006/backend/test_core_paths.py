import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import CashflowRecord, ApprovalEmail, ManualRemark, ImportLog, RecordStatus
from app.services import CashflowImportService
from app.simulated_emails import SIMULATED_EMAILS

def test_core_paths():
    db = SessionLocal()
    results = []

    def check(label, condition, detail=""):
        status = "✅ PASS" if condition else "❌ FAIL"
        results.append(f"{status} | {label}" + (f" — {detail}" if detail else ""))

    print("=" * 70)
    print("ABS现金流异常回放 — 核心路径验证")
    print("=" * 70)

    print("\n--- 1. 正常记录验证 ---")
    normal_records = db.query(CashflowRecord).filter_by(status=RecordStatus.NORMAL).all()
    check("存在正常记录", len(normal_records) >= 4, f"实际{len(normal_records)}条")
    for r in normal_records:
        check(f"  凭证{r.voucher_number}税费已解析", r.tax_amount is not None and r.tax_amount > 0,
              f"tax_amount={r.tax_amount}")
        check(f"  凭证{r.voucher_number}汇率已解析", r.exchange_rate is not None,
              f"exchange_rate={r.exchange_rate}")
        check(f"  凭证{r.voucher_number}原始列保留", r.raw_mixed_tax_rate_column is not None,
              f"raw='{r.raw_mixed_tax_rate_column}'")

    print("\n--- 2. 挂起记录验证 ---")
    suspended = db.query(CashflowRecord).filter_by(status=RecordStatus.SUSPENDED).all()
    check("存在挂起记录", len(suspended) >= 1, f"实际{len(suspended)}条")
    for r in suspended:
        check(f"  凭证{r.voucher_number}挂起原因包含原始行号",
              str(r.original_row_number) in (r.abnormal_reason or ""),
              f"行号={r.original_row_number}")
        check(f"  凭证{r.voucher_number}挂起原因提及附件",
              "附件" in (r.abnormal_reason or ""),
              f"reason前50字: {(r.abnormal_reason or '')[:50]}")

    print("\n--- 3. 异常记录验证 ---")
    abnormal = db.query(CashflowRecord).filter_by(status=RecordStatus.ABNORMAL).all()
    check("存在异常记录", len(abnormal) >= 1, f"实际{len(abnormal)}条")
    for r in abnormal:
        check(f"  凭证{r.voucher_number}异常原因指向邮件行号",
              str(r.original_row_number) in (r.abnormal_reason or ""))
        check(f"  凭证{r.voucher_number}异常原因包含具体字段",
              any(kw in (r.abnormal_reason or "") for kw in ["金额", "税费", "汇率", "对手方"]),
              f"reason前80字: {(r.abnormal_reason or '')[:80]}")

    print("\n--- 4. 人工备注验证 ---")
    remarked = db.query(CashflowRecord).filter_by(is_manual_remark_updated=True).all()
    check("存在已备注记录", len(remarked) >= 1, f"实际{len(remarked)}条")
    for r in remarked:
        remarks = db.query(ManualRemark).filter_by(cashflow_record_id=r.id).all()
        check(f"  凭证{r.voucher_number}有备注记录", len(remarks) >= 1,
              f"备注数={len(remarks)}")

    print("\n--- 5. 重复导入去重验证 ---")
    service = CashflowImportService(db)
    before_total = db.query(CashflowRecord).count()
    before_normal = db.query(CashflowRecord).filter_by(status=RecordStatus.NORMAL).count()

    reimport_result = service.import_email_records(SIMULATED_EMAILS[0], "测试重复导入")
    after_total = db.query(CashflowRecord).count()
    after_normal = db.query(CashflowRecord).filter_by(status=RecordStatus.NORMAL).count()

    check("重复导入后总记录数不变", after_total == before_total,
          f"前={before_total}, 后={after_total}")
    check("重复导入后正常记录数不变", after_normal == before_normal,
          f"前={before_normal}, 后={after_normal}")
    check("重复导入返回skipped>0", reimport_result["skipped"] > 0,
          f"skipped={reimport_result['skipped']}")
    check("重复导入返回created=0", reimport_result["created"] == 0,
          f"created={reimport_result['created']}")

    print("\n--- 6. 重复导入不覆盖人工备注验证 ---")
    remarked_before = db.query(CashflowRecord).filter_by(is_manual_remark_updated=True).all()
    remark_counts_before = {r.id: db.query(ManualRemark).filter_by(cashflow_record_id=r.id).count() for r in remarked_before}

    service2 = CashflowImportService(db)
    service2.import_email_records(SIMULATED_EMAILS[0], "二次重复导入")

    for r_id, cnt_before in remark_counts_before.items():
        cnt_after = db.query(ManualRemark).filter_by(cashflow_record_id=r_id).count()
        rec = db.query(CashflowRecord).filter_by(id=r_id).first()
        check(f"  凭证{rec.voucher_number}备注数未变", cnt_after == cnt_before,
              f"前={cnt_before}, 后={cnt_after}")

    print("\n--- 7. 补录验证（挂起→补录） ---")
    suspended_record = db.query(CashflowRecord).filter_by(status=RecordStatus.SUSPENDED).first()
    if suspended_record:
        check("找到挂起记录", True, f"凭证{ suspended_record.voucher_number}")
        service3 = CashflowImportService(db)
        supplemented = service3.supplement_record(
            suspended_record.id,
            {"tax_amount": 6400.0, "exchange_rate": 0.9125, "amount": 320000.0},
            "项目经理-李明"
        )
        if supplemented:
            check("补录后状态为supplementary", supplemented.status == RecordStatus.SUPPLEMENTARY,
                  f"status={supplemented.status.value}")
            check("补录后税费已填充", supplemented.tax_amount == 6400.0,
                  f"tax_amount={supplemented.tax_amount}")
            check("补录后汇率已填充", supplemented.exchange_rate == 0.9125,
                  f"exchange_rate={supplemented.exchange_rate}")
            check("补录原因包含原始挂起信息", "已补录" in (supplemented.abnormal_reason or ""),
                  f"reason前30字: {(supplemented.abnormal_reason or '')[:30]}")

            db.expire_all()
            email = db.query(ApprovalEmail).filter_by(id=supplemented.approval_email_id).first()
            any_suspended = db.query(CashflowRecord).filter_by(
                approval_email_id=email.id, status=RecordStatus.SUSPENDED
            ).first()
            check("关联邮件已更新为completed", email.status.value == "completed" and not any_suspended,
                  f"email.status={email.status.value}, suspended_exists={any_suspended is not None}")
        else:
            check("补录操作成功", False, "返回None")
    else:
        check("找到挂起记录", False, "无挂起记录可测试")

    print("\n--- 8. 导出同步验证 ---")
    unsynced_before = db.query(ManualRemark).filter_by(is_export_synced=False).count()
    check("存在未同步备注", unsynced_before >= 1, f"未同步数={unsynced_before}")

    service4 = CashflowImportService(db)
    synced = service4.sync_export_remarks()
    unsynced_after = db.query(ManualRemark).filter_by(is_export_synced=False).count()
    check("同步后未同步数为0", unsynced_after == 0,
          f"同步了{synced}条, 剩余未同步={unsynced_after}")

    print("\n--- 9. 导入日志验证 ---")
    logs = db.query(ImportLog).order_by(ImportLog.created_at.desc()).limit(10).all()
    check("存在导入日志", len(logs) >= 1, f"最近{len(logs)}条")
    skip_logs = [l for l in logs if l.action.value == "skipped"]
    check("日志中有跳过(去重)记录", len(skip_logs) >= 1, f"跳过日志数={len(skip_logs)}")
    for l in skip_logs[:3]:
        has_voucher_ref = any(v in (l.detail or "") for v in ["ABS-2026-001", "ABS-2026-002"])
        check(f"  跳过日志提及凭证号", has_voucher_ref, f"detail前60字: {(l.detail or '')[:60]}")

    print("\n--- 10. API接口加载验证 ---")
    try:
        from app.main import app
        routes = [r.path for r in app.routes if hasattr(r, 'path')]
        expected = [
            "/api/import/packages",
            "/api/import/email",
            "/api/records/{record_id}/supplement",
            "/api/export/sync",
            "/api/records",
            "/api/emails",
            "/api/export/records"
        ]
        for ep in expected:
            check(f"  API端点{ep}已注册", ep in routes)
    except Exception as e:
        check("API加载", False, str(e))

    print("\n" + "=" * 70)
    passed = sum(1 for r in results if r.startswith("✅"))
    failed = sum(1 for r in results if r.startswith("❌"))
    total = len(results)
    print(f"验证结果: {passed}/{total} 通过, {failed} 失败")
    print("=" * 70)

    if failed > 0:
        print("\n失败项:")
        for r in results:
            if r.startswith("❌"):
                print(f"  {r}")

    db.close()
    return failed == 0

if __name__ == "__main__":
    success = test_core_paths()
    sys.exit(0 if success else 1)

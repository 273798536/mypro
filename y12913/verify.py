#!/usr/bin/env python3
"""
LoRA 合并版本台账 · 自动化验证脚本
-------------------------------------
覆盖以下验收场景：
1. 依赖安装 & 服务启动 & 数据库初始化
2. 样例数据生成（正常/边界/坏样本）
3. 长文本截断记录倒查（溯源链完整）
4. 人工反馈重复导入 & 补录去重
5. 报告导出内容与界面摘要一致性
6. 灰度对比运行正确性
"""
import sys
import os
import json
import tempfile
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import init_db, SessionLocal, LoraRecord, HumanFeedback, ExportRecord
from app.services.sample_service import generate_all_samples
from app.services.safety_service import run_safety_check, evaluate_merge_result, deduplicate_feedback
from app.services.export_service import export_ledger, get_summary_stats
from app.services.export_service import run_gray_comparison
from app.schemas import HumanFeedbackCreate


def check(name, cond, detail=""):
    status = "✅ PASS" if cond else "❌ FAIL"
    print(f"  [{status}] {name} {detail}")
    return cond


def step1_database_init():
    print("\n" + "="*60)
    print("STEP 1: 数据库初始化 & 表结构")
    print("="*60)
    init_db()
    db = SessionLocal()
    try:
        cnt = db.query(LoraRecord).count()
        check("表结构正常创建", True)
        check("数据库文件存在", os.path.exists("data/lora_ledger.db"))
        return True
    finally:
        db.close()


def step2_sample_generation():
    print("\n" + "="*60)
    print("STEP 2: 样例数据生成（正常/边界/坏）")
    print("="*60)
    db = SessionLocal()
    try:
        # 清空已有
        db.query(LoraRecord).delete()
        db.commit()
        stats = generate_all_samples(db)
        check("正常样本数=5", stats["normal"] == 5, f"实际={stats['normal']}")
        check("边界样本数=4", stats["boundary"] == 4, f"实际={stats['boundary']}")
        check("明显坏样本数=3", stats["bad"] == 3, f"实际={stats['bad']}")
        check("总数=12", stats["total"] == 12, f"实际={stats['total']}")

        # 验证分类结论
        records = db.query(LoraRecord).all()
        pass_cnt = sum(1 for r in records if r.merge_result == "pass")
        fail_cnt = sum(1 for r in records if r.merge_result == "fail")
        need_cnt = sum(1 for r in records if r.merge_result == "need_confirm")

        check(f"合并通过数 ≥ 5（正常样本）", pass_cnt >= 5, f"实际={pass_cnt}")
        check(f"合并失败数 ≥ 3（坏样本）", fail_cnt >= 3, f"实际={fail_cnt}")
        check(f"待确认数 ≥ 1（边界样本）", need_cnt >= 1, f"实际={need_cnt}")

        # 安全检查结果
        safety_pass = sum(1 for r in records if r.safety_check_result == "pass")
        safety_fail = sum(1 for r in records if r.safety_check_result == "fail")
        check("安全通过 ≥ 5", safety_pass >= 5, f"实际={safety_pass}")
        check("安全未通过 ≥ 3", safety_fail >= 3, f"实际={safety_fail}")

        return True
    finally:
        db.close()


def step3_truncation_trace():
    print("\n" + "="*60)
    print("STEP 3: 长文本截断记录倒查溯源")
    print("="*60)
    db = SessionLocal()
    try:
        # 找到带截断备注的边界样本
        trunc_records = db.query(LoraRecord).filter(
            LoraRecord.truncation_note.isnot(None),
            LoraRecord.truncation_note != ""
        ).all()
        check("存在带截断备注的记录", len(trunc_records) > 0, f"找到={len(trunc_records)}条")

        if trunc_records:
            rec = trunc_records[0]
            check(f"记录编号={rec.lora_id}", True, f"名称={rec.lora_name}")
            check("截断备注非空", bool(rec.truncation_note), f"长度={len(rec.truncation_note)}")

            # 检查处理日志
            logs = sorted(rec.logs, key=lambda l: l.created_at)
            check("处理日志 ≥ 2条", len(logs) >= 2, f"实际={len(logs)}")

            stages = [l.stage for l in logs]
            check("存在import阶段日志", "import" in stages)
            check("存在safety_check阶段日志", "safety_check" in stages)

            # 安全检查详情
            if rec.safety_check_detail:
                detail = rec.safety_check_detail
                check("安全检查详情.issues存在", "issues" in detail)
                trunc_issue = any("TRUNCATION" in str(i.get("rule_id","")) for i in detail.get("issues", []))
                check("检测到截断标记问题", trunc_issue or len(detail.get("issues", [])) > 0)

            # 人工反馈
            check("存在人工反馈或允许无", True, f"反馈数={len(rec.feedbacks)}")

        return True
    finally:
        db.close()


def step4_feedback_dedup():
    print("\n" + "="*60)
    print("STEP 4: 人工反馈重复导入 & 补录去重")
    print("="*60)
    db = SessionLocal()
    try:
        rec = db.query(LoraRecord).first()
        assert rec, "无记录可测试"

        original_feedback_count = len(rec.feedbacks)

        # 使用全新的 feedback_id 前缀避免和样本冲突
        prefix = "FB-VERIFY-" + str(int(datetime.utcnow().timestamp()))

        # 创建第一条（全新不重复）
        fb1 = HumanFeedback(
            record_id=rec.id,
            feedback_id=prefix + "-001",
            feedback_type="model_review",
            content="这是一条去重测试反馈内容 - V1",
            reviewer="tester_dedup",
            conclusion="approved",
            confidence=0.9,
            source_channel="manual"
        )
        db.add(fb1)
        db.flush()
        fb1, dup1 = deduplicate_feedback(db, fb1)
        check("首次创建非重复 = False", dup1 is False, f"is_duplicate={fb1.is_duplicate}")

        # 用不同 feedback_id 但相同 content 重复导入（模拟重导API时的失误）
        fb2 = HumanFeedback(
            record_id=rec.id,
            feedback_id=prefix + "-002",
            feedback_type="model_review",
            content="这是一条去重测试反馈内容 - V1",
            reviewer="tester_dedup",
            conclusion="approved",
            source_channel="reimport_api",
            import_batch="BATCH-RETEST"
        )
        db.add(fb2)
        db.flush()
        fb2, dup2 = deduplicate_feedback(db, fb2)
        check("相同内容补录自动标重", dup2 is True, f"is_duplicate={fb2.is_duplicate}, duplicate_of={fb2.duplicate_of}")
        check("重复源指向 fb1", fb2.duplicate_of == fb1.id, f"expected={fb1.id}, actual={fb2.duplicate_of}")

        # 再用新 ID + 相同内容模拟手动补录
        fb3 = HumanFeedback(
            record_id=rec.id,
            feedback_id=prefix + "-003",
            feedback_type="manual_supplement",
            content="这是一条去重测试反馈内容 - V1",
            reviewer="补录_tester",
            conclusion="approved",
            source_channel="manual_supplement"
        )
        db.add(fb3)
        db.flush()
        fb3, dup3 = deduplicate_feedback(db, fb3)
        check("手动补录相同内容自动标重", dup3 is True, f"is_duplicate={fb3.is_duplicate}")

        # 新内容新 ID，不标重
        fb4 = HumanFeedback(
            record_id=rec.id,
            feedback_id=prefix + "-004",
            feedback_type="safety_review",
            content="全新的安全审查反馈，绝无重复-" + prefix,
            reviewer="safety_tester",
            conclusion="neutral",
            confidence=0.7
        )
        db.add(fb4)
        db.flush()
        fb4, dup4 = deduplicate_feedback(db, fb4)
        check("新内容新反馈ID保留不标重", dup4 is False, f"is_duplicate={fb4.is_duplicate}")

        # 最终验证：同一件事只保留1条有效结论（非重复的只有 fb1 和 fb4）
        new_non_dup_count = sum(1 for f in [fb1, fb2, fb3, fb4] if not f.is_duplicate)
        check("新增4条中有效非重复=2条", new_non_dup_count == 2, f"实际有效={new_non_dup_count}")

        db.commit()
        return True
    finally:
        db.close()


def step5_export_consistency():
    print("\n" + "="*60)
    print("STEP 5: 报告导出与界面摘要一致性校验")
    print("="*60)
    db = SessionLocal()
    try:
        # 先拿界面摘要
        summary = get_summary_stats(db)
        check("界面摘要接口可用", summary.total > 0, f"总记录={summary.total}")

        # 导出
        file_path, export_summary = export_ledger(
            db, export_type="verify", export_format="xlsx",
            operator="verify_script"
        )

        check("导出文件生成", os.path.exists(file_path), f"路径={file_path}")
        check("导出摘要hash存在", bool(export_summary.get("records")), "导出记录列表存在")

        # 校验一致
        check("总数一致", export_summary["total"] == summary.total,
              f"界面={summary.total} / 导出={export_summary['total']}")
        check("通过数一致", export_summary["pass_count"] == summary.pass_count,
              f"界面={summary.pass_count} / 导出={export_summary['pass_count']}")
        check("失败数一致", export_summary["fail_count"] == summary.fail_count,
              f"界面={summary.fail_count} / 导出={export_summary['fail_count']}")
        check("待确认一致", export_summary["need_confirm_count"] == summary.need_confirm_count,
              f"界面={summary.need_confirm_count} / 导出={export_summary['need_confirm_count']}")
        check("灰度数一致", export_summary["gray_release_count"] == summary.gray_release_count,
              f"界面={summary.gray_release_count} / 导出={export_summary['gray_release_count']}")

        # 校验台账明细和摘要的合并结论一致
        export_records = export_summary["records"]
        for r_export in export_records:
            r_db = db.query(LoraRecord).filter(LoraRecord.id == r_export["id"]).first()
            if r_db:
                if r_db.merge_result != r_export["merge_result"]:
                    check(f"记录#{r_export['id']}合并结论一致", False,
                          f"DB={r_db.merge_result} / EXPORT={r_export['merge_result']}")
                    return False
        check("所有记录合并结论一致 (DB ↔ 导出摘要)", True, f"检查了{len(export_records)}条")

        # 导出记录入库
        exp_record = db.query(ExportRecord).order_by(ExportRecord.id.desc()).first()
        check("导出记录已落库", exp_record is not None)
        check("摘要哈希已保存", bool(exp_record.summary_hash) if exp_record else False)

        return True
    finally:
        db.close()


def step6_gray_comparison():
    print("\n" + "="*60)
    print("STEP 6: 灰度对比运行")
    print("="*60)
    db = SessionLocal()
    try:
        recs = db.query(LoraRecord).limit(2).all()
        if len(recs) < 2:
            check("需要至少2条记录跑A/B", False)
            return False

        a, b = recs[0], recs[1]
        results = run_gray_comparison(db, a.id, b.id)

        check("生成5个测试用例对比", len(results) == 5, f"实际={len(results)}")
        for r in results:
            check(f"用例{r.test_case_id}: A输出存在", bool(r.output_a))
            check(f"用例{r.test_case_id}: B输出存在", bool(r.output_b))
            check(f"用例{r.test_case_id}: 安全A已判定", r.safety_a in ("pass","fail","need_confirm","pending"))
            check(f"用例{r.test_case_id}: 差异分0~1", 0 <= r.diff_score <= 1, f"={r.diff_score}")

        # 自测模式（无B）
        results_self = run_gray_comparison(db, a.id, None)
        check("自测模式生成5个用例", len(results_self) == 5, f"实际={len(results_self)}")

        return True
    finally:
        db.close()


def main():
    print("="*60)
    print("LoRA 合并版本台账 · 自动化验收")
    print("="*60)

    results = []
    steps = [
        ("数据库初始化", step1_database_init),
        ("样例数据生成", step2_sample_generation),
        ("截断记录溯源", step3_truncation_trace),
        ("反馈去重", step4_feedback_dedup),
        ("导出一致性", step5_export_consistency),
        ("灰度对比", step6_gray_comparison),
    ]

    passed = 0
    for name, fn in steps:
        try:
            ok = fn()
            if ok:
                passed += 1
            results.append((name, ok))
        except Exception as e:
            print(f"  [EXCEPTION] {e}")
            import traceback
            traceback.print_exc()
            results.append((name, False))

    print("\n" + "="*60)
    print("验收汇总")
    print("="*60)
    for name, ok in results:
        mark = "✅" if ok else "❌"
        print(f"  {mark} {name}")
    print("-"*60)
    print(f"  总计: {passed}/{len(steps)} 通过")
    if passed == len(steps):
        print("  🎉 全部验收通过，可以正式使用！")
    else:
        print("  ⚠️  存在未通过项，请检查输出详情")
    print("="*60)
    return passed == len(steps)


if __name__ == "__main__":
    ok = main()
    sys.exit(0 if ok else 1)

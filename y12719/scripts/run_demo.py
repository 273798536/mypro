#!/usr/bin/env python3
"""风险价值分位回测 - 一键跑通完整流程演示

从空目录开始：
1. 初始化数据库和默认校验规则
2. 导入第一版题目清单
3. 执行回测（含外推越界样例）
4. 导出 HTML + JSON 报告
5. 导入第二版题目清单（演示延迟到达时的差异检测和影响提示）
6. 增量重校验（演示边界样例补录后图表联动更新）
"""

import os
import sys
import json
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from var_backtest.database import SessionLocal, Base, engine
from var_backtest import models
from var_backtest.var_calculator import (
    HistoricalVaRCalculator, generate_sample_returns, check_answer_match
)
from var_backtest.validator import IncrementalValidator
from var_backtest.question_diff import QuestionListDiffDetector
from var_backtest.charting import sync_chart_with_result
from var_backtest.reporting import build_researcher_dashboard, build_operator_report
from var_backtest.exporter import export_html_report
from datetime import datetime


def seed():
    print("=" * 60)
    print(" ① 初始化数据库 + 默认校验规则")
    print("=" * 60)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        IncrementalValidator(db).ensure_rules_exist()
        print("  ✅ 数据库和 5 条默认规则就绪")
    finally:
        db.close()


def step1_import_question_list_v1():
    print("\n" + "=" * 60)
    print(" ② 导入第一版题目清单 (batch=BATCH-2026-001)")
    print("=" * 60)
    db = SessionLocal()
    try:
        ql = models.QuestionList(
            batch_id="BATCH-2026-001",
            name="6月风险价值回测",
            version="v1",
            is_current=True,
        )
        questions_spec = [
            ("Q-001", "沪深300 VaR(95%)", 0.95, 252),
            ("Q-002", "中证500 VaR(99%)", 0.99, 252),
            ("Q-003", "创业板指 VaR(95%)", 0.95, 252),
            ("Q-004", "恒生指数 VaR(95%)", 0.95, 252),
            ("Q-005", "标普500 VaR(95%)", 0.95, 252),
        ]
        for qid, title, quantile, window in questions_spec:
            ql.questions.append(models.Question(
                question_id=qid, title=title, quantile=quantile, window=window, var_level=quantile
            ))
        db.add(ql)
        db.commit()
        print(f"  ✅ 导入 {len(ql.questions)} 道题目")
        return ql.id
    finally:
        db.close()


def step2_run_backtest(ql_id: int):
    print("\n" + "=" * 60)
    print(" ③ 执行回测 (batch=BT-2026-001)")
    print("=" * 60)
    db = SessionLocal()
    try:
        ql = db.query(models.QuestionList).filter_by(id=ql_id).first()
        qmap = {q.question_id: q for q in ql.questions}

        run = models.BacktestRun(
            batch_id="BT-2026-001",
            question_list_id=ql_id,
            triggered_by="demo_script",
            notes="首次完整回测，含外推越界样例",
        )
        db.add(run)
        db.flush()

        rng = np.random.RandomState(42)
        validator = IncrementalValidator(db)
        validator.ensure_rules_exist()

        sample_config = {
            "Q-001": {"n": 500, "vol": 0.018, "hist_var": 0.0285},
            "Q-002": {"n": 500, "vol": 0.022, "hist_var": 0.0410},
            "Q-003": {"n": 40,  "vol": 0.035, "hist_var": 0.0380},
            "Q-004": {"n": 25,  "vol": 0.050, "hist_var": 0.0350},
            "Q-005": {"n": 500, "vol": 0.015, "hist_var": 0.0240},
        }

        for qid, cfg in sample_config.items():
            q = qmap[qid]
            returns = rng.normal(loc=0.0005, scale=cfg["vol"], size=cfg["n"])

            calc = HistoricalVaRCalculator(quantile=q.quantile, window=q.window)
            var = calc.calculate(returns, historical_var=cfg["hist_var"])
            match = check_answer_match(var.var_value, cfg["hist_var"])

            vr = models.VarResult(
                backtest_run_id=run.id,
                question_id=q.id,
                question_external_id=qid,
                var_value=var.var_value,
                var_lower=var.var_lower,
                var_upper=var.var_upper,
                var_expected=cfg["hist_var"],
                historical_var_value=cfg["hist_var"],
                historical_var_source="教研历史答案",
                is_extrapolation=var.is_extrapolation,
                extrapolation_bounds_breached=var.extrapolation_bounds_breached,
                answer_match=match,
            )
            db.add(vr)
            db.flush()

            chart_info = sync_chart_with_result(db, vr, returns, quantile=q.quantile)
            validator.validate_result(
                vr, incremental=True, context={"sample_size": var.sample_size}
            )

            status = "🚫越界" if vr.extrapolation_bounds_breached else ("⚠️外推" if vr.is_extrapolation else "✅正常")
            print(f"  {status} {qid}: VaR={var.var_value:.6f} 历史={cfg['hist_var']:.6f} n={cfg['n']} 图={chart_info['chart_path'].split('/')[-1]}")

        run.status = "completed"
        run.finished_at = datetime.utcnow()
        db.commit()

        print(f"\n  📊 教研编辑看板摘要:")
        dash = build_researcher_dashboard(db, run.id)
        ov = dash["anomaly_overview"]
        print(f"     总数={ov['total']} 阻断={ov['blockers']} 严重={ov['criticals']} 警告={ov['warnings']}")
        print(f"  🛠   待办动作:")
        for a in dash["action_items"]:
            print(f"     · {a['action_required']}: {a['count']} 项 — {a['hint']}")

        return run.id
    finally:
        db.close()


def step3_export_report(run_id: int):
    print("\n" + "=" * 60)
    print(" ④ 导出 HTML + JSON 报告")
    print("=" * 60)
    db = SessionLocal()
    try:
        info = export_html_report(db, run_id, "BT-2026-001")
        print(f"  📄 HTML: {info['html_path']}")
        print(f"  📋 JSON: {info['json_path']}")
        s = info["summary"]
        print(f"  📈 总览: {s['total_questions']}题 通过={s['passed']} 越界拦截={s['extrapolation_breached']} 答案不匹配={s['answer_mismatch']}")
    finally:
        db.close()


def step4_question_list_v2_arrives_late():
    print("\n" + "=" * 60)
    print(" ⑤ 题目清单 v2 延迟到达 → 差异检测 + 影响提示 (不覆盖旧结果)")
    print("=" * 60)
    db = SessionLocal()
    try:
        old_list = (
            db.query(models.QuestionList)
            .filter_by(is_current=True)
            .order_by(models.QuestionList.received_at.desc())
            .first()
        )
        if old_list:
            old_list.is_current = False
            db.flush()
        ql2 = models.QuestionList(
            batch_id="BATCH-2026-002",
            name="6月风险价值回测(修正版)",
            version="v2",
            is_current=True,
        )
        ql2.questions.append(models.Question(question_id="Q-001", title="沪深300 VaR(95%)", quantile=0.95, var_level=0.95, window=252))
        ql2.questions.append(models.Question(question_id="Q-002", title="中证500 VaR(99%)", quantile=0.99, var_level=0.99, window=504))
        ql2.questions.append(models.Question(question_id="Q-003", title="创业板指 VaR(95%)", quantile=0.95, var_level=0.95, window=252))
        ql2.questions.append(models.Question(question_id="Q-006", title="纳斯达克 VaR(95%)", quantile=0.95, var_level=0.95, window=252))
        db.add(ql2)
        db.commit()
        db.refresh(ql2)

        detector = QuestionListDiffDetector(db)
        diff_report = detector.detect_and_report(ql2, auto_notify=True)
        impact = detector.summarize_impact(diff_report)

        print(f"  🔄 对比 {impact['old_batch_id']} → {impact['new_batch_id']}:")
        print(f"     新增: {impact['added_count']} 题 {impact['details']['added']}")
        print(f"     删除: {impact['removed_count']} 题 {impact['details']['removed']}")
        print(f"     修改: {impact['modified_count']} 题")
        for m in impact["details"]["modified"]:
            rerun = " (需要重跑)" if m["needs_rerun"] else ""
            print(f"       · {m['question_external_id']} {m['field']}: {m['old_value']} → {m['new_value']}{rerun}")
        print(f"  ⚠️  需要重跑: {impact['needs_rerun_count']} 题 (旧结果保留，未覆盖)")
        for ir in impact["impacted_results"]:
            print(f"     · {ir['question_external_id']} ({ir['reason']}) 旧 VaR = {ir['old_var_value']:.6f}")
    finally:
        db.close()


def step5_boundary_sample_added_revalidate_and_chart(run_id: int):
    print("\n" + "=" * 60)
    print(" ⑥ 边界样例补录 → 增量校验 + 图表联动更新")
    print("=" * 60)
    db = SessionLocal()
    try:
        run = db.query(models.BacktestRun).filter_by(id=run_id).first()
        rng = np.random.RandomState(7)

        vr = next((r for r in run.results if r.question_external_id == "Q-004"), None)
        if vr:
            print(f"  补录前: {vr.question_external_id} 样本不足 → 外推越界={vr.extrapolation_bounds_breached}")
            more_returns = rng.normal(loc=0.0005, scale=0.035, size=475)
            all_returns = np.concatenate([rng.normal(loc=0.0005, scale=0.05, size=25), more_returns])

            q = vr.question
            calc = HistoricalVaRCalculator(quantile=q.quantile, window=q.window)
            var = calc.calculate(all_returns, historical_var=vr.historical_var_value)

            vr.var_value = var.var_value
            vr.var_lower = var.var_lower
            vr.var_upper = var.var_upper
            vr.is_extrapolation = var.is_extrapolation
            vr.extrapolation_bounds_breached = var.extrapolation_bounds_breached
            vr.answer_match = check_answer_match(var.var_value, vr.historical_var_value)
            vr.updated_at = datetime.utcnow()
            db.commit()

            info = sync_chart_with_result(db, vr, all_returns, quantile=q.quantile)
            validator = IncrementalValidator(db)
            outcomes = validator.validate_result(vr, incremental=True, context={"sample_size": var.sample_size})

            print(f"  补录后: 样本={var.sample_size} 越界={vr.extrapolation_bounds_breached} 图表更新={info['chart_changed']}")
            failed = [o for o in outcomes if not o.passed]
            if failed:
                for o in failed:
                    print(f"     ⚠ {o.rule_code} {o.action_required.value if hasattr(o.action_required, 'value') else o.action_required}: {o.detail[:80]}")
            else:
                print(f"     ✅ 增量校验全部通过")
    finally:
        db.close()


def step6_classify_anomalies_for_researcher():
    print("\n" + "=" * 60)
    print(" ⑦ 分级异常：教研编辑视图 (下一步是补材料 / 改口径？)")
    print("=" * 60)
    db = SessionLocal()
    try:
        classification = classify_anomalies(db)
        for action_group in classification["by_action"]:
            if action_group["count"] > 0 and action_group["action_required"] != "无需处理":
                print(f"\n  📌 {action_group['action_required']} ({action_group['count']}项) — {action_group['hint']}")
                for item in action_group["items"]:
                    print(f"     · [{item['severity']}] {item['question_external_id']}: {item['title']}")
        print("\n  💡 提示：异常不会合并成一个红色数字，每题都明确了下一步动作。")
    finally:
        db.close()


if __name__ == "__main__":
    from var_backtest.reporting import classify_anomalies

    seed()
    ql_id = step1_import_question_list_v1()
    run_id = step2_run_backtest(ql_id)
    step3_export_report(run_id)
    step4_question_list_v2_arrives_late()
    step5_boundary_sample_added_revalidate_and_chart(run_id)
    step6_classify_anomalies_for_researcher()

    print("\n" + "=" * 60)
    print(" 🎉 完整流程跑通！")
    print("    · 数据库:   data/var_backtest.db")
    print("    · 图表:     charts/*.png")
    print("    · 报告:     exports/*.html")
    print("    · 启动 API: bash scripts/run.sh")
    print("=" * 60)

#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Optional

from mc_review import MonteCarloReview, WeightChangeReason, TimelineStatus


DEFAULT_DB = "mc_review_data.json"


def _load(db_path: str) -> MonteCarloReview:
    if not os.path.exists(db_path):
        print(f"[错误] 数据文件不存在: {db_path}，请先执行 init 或 init-demo 初始化", file=sys.stderr)
        sys.exit(1)
    return MonteCarloReview.load(db_path)


def _save(review: MonteCarloReview, db_path: str) -> None:
    review.save(db_path)


def cmd_init(args: argparse.Namespace) -> None:
    if os.path.exists(args.db) and not args.force:
        print(f"[跳过] 数据文件已存在: {args.db}，使用 --force 覆盖")
        return
    review = MonteCarloReview()
    _save(review, args.db)
    print(f"[OK] 已初始化空数据库: {args.db}")


def cmd_init_demo(args: argparse.Namespace) -> None:
    if os.path.exists(args.db) and not args.force:
        print(f"[跳过] 数据文件已存在: {args.db}，使用 --force 覆盖")
        return
    from mc_review import WeightChangeReason
    review = MonteCarloReview()

    wa1 = review.add_wrong_answer(
        question_id="MC-001",
        student_answer=120.5,
        correct_answer=100.0,
        error_type="蒙特卡洛采样不足",
        unit="kPa",
        student_id="S2023101",
        original_statement="跑了一万次采样，均值120.5kPa",
        is_dirty=True,
        dirt_description="学生只写了一万次，未说明是否含burn-in",
        raw_data={"iterations": 10000, "burn_in": None},
    )

    wa2 = review.add_wrong_answer(
        question_id="MC-002",
        student_answer=0.95,
        correct_answer=0.90,
        error_type="置信区间误解",
        unit="无量纲",
        student_id="S2023102",
        original_statement="95%置信区间就是0.95",
    )

    wa3 = review.add_wrong_answer(
        question_id="MC-003",
        student_answer="大概2.5米每秒",
        correct_answer=3.2,
        error_type="有效数字缺失",
        unit="m/s",
        student_id="S2023103",
        original_statement="我估算速度大概2.5m/s吧",
        is_dirty=True,
        dirt_description="学生答案含文字，无法直接数值比较",
        raw_data={"raw_text": "大概2.5米每秒"},
    )

    review.change_weight(
        wrong_answer_id=wa1.id,
        param_name="采样次数权重",
        old_value=0.3,
        new_value=0.5,
        unit="无量纲",
        reason=WeightChangeReason.CALIBRATION.value,
        reason_detail="经三组对照实验确认采样不足时权重应提高",
        changed_by="小岑",
    )

    review.change_weight(
        wrong_answer_id=wa1.id,
        param_name="收敛阈值",
        old_value=1e-3,
        new_value=5e-4,
        unit="无量纲",
        reason=WeightChangeReason.MANUAL_JUDGMENT.value,
        reason_detail="根据班级整体情况收紧",
        changed_by="小岑",
    )

    breach = review.check_extrapolation(
        wrong_answer_id=wa2.id,
        param_name="置信水平",
        extrapolated_value=0.95,
        boundary_low=0.80,
        boundary_high=0.90,
        unit="无量纲",
    )

    review.resolve_breach(breach.id, "学生混淆了置信水平与置信区间宽度，已纠正并补做练习", "小岑")

    review.add_calculation_step(
        description="蒙特卡洛标准误计算",
        formula="σ_MC = s / √N",
        input_values={"s": 15.2, "N": 10000},
        output_value=0.152,
        unit_before="kPa",
        unit_after="kPa",
        boundary_low=0,
        boundary_high=1.0,
        note="按题目要求取10000次采样",
    )

    review.add_calculation_step(
        description="单位换算：kPa → Pa",
        formula="x_Pa = x_kPa × 1000",
        input_values={"x_kPa": 0.152},
        output_value=152.0,
        unit_before="kPa",
        unit_after="Pa",
        conversion_factor=1000,
    )

    _save(review, args.db)
    print(f"[OK] 已初始化示例数据库: {args.db}")
    print(f"     包含 {len(review.wrong_answers)} 道错题, {len(review.weight_changes)} 次权重修改, "
          f"{len(review.breaches)} 次越界检测, {len(review.calculation_steps)} 个计算步骤")


def cmd_add_question(args: argparse.Namespace) -> None:
    review = _load(args.db)
    try:
        student_val = _parse_value(args.student_answer)
        correct_val = _parse_value(args.correct_answer)
    except ValueError as e:
        print(f"[错误] 答案解析失败: {e}", file=sys.stderr)
        sys.exit(1)
    wa = review.add_wrong_answer(
        question_id=args.question_id,
        student_answer=student_val,
        correct_answer=correct_val,
        error_type=args.error_type,
        unit=args.unit,
        student_id=args.student_id,
        original_statement=args.original,
        is_dirty=args.dirty,
        dirt_description=args.dirt_desc,
    )
    _save(review, args.db)
    print(f"[OK] 已录入错题 {args.question_id} (ID: {wa.id})")
    if args.dirty:
        print(f"     ⚠  标记为脏数据: {args.dirt_desc}")


def cmd_list(args: argparse.Namespace) -> None:
    review = _load(args.db)
    if args.kind == "questions":
        rows = review.list_wrong_answers()
        print(f"=== 错题记录（共 {len(rows)} 条）===")
        for r in rows:
            sid = r["raw_source"]["student_id"] if r.get("raw_source") else ""
            dirty = " [脏]" if r.get("raw_source", {}).get("is_dirty") else ""
            print(f"  [{r['id']}] {r['question_id']}: 学生={r['student_answer']} "
                  f"正确={r['correct_answer']} ({r['error_type']}) 学生={sid}{dirty}")
    elif args.kind == "weights":
        rows = review.list_weight_changes(args.param)
        print(f"=== 权重修改记录（共 {len(rows)} 条）===")
        for r in rows:
            print(f"  [{r['id']}] {r['param_name']}: {r['old_value']} → {r['new_value']} "
                  f"({r['unit']}) 原因={r['reason']} 修改人={r['changed_by']}")
    elif args.kind == "breaches":
        rows = review.list_breaches(args.resolved)
        print(f"=== 外推越界记录（共 {len(rows)} 条）===")
        for r in rows:
            status = "已处理" if r["resolution"] else "待补材料"
            print(f"  [{r['id']}] {r['param_name']}={r['extrapolated_value']}{r['unit']} "
                  f"边界=[{r['boundary_low']}, {r['boundary_high']}] "
                  f"原始='{r['original_statement']}' {status}")
    elif args.kind == "timeline":
        grouped = review.get_timeline_grouped()
        for status_name in [TimelineStatus.PROCESSED.value, TimelineStatus.PENDING.value, TimelineStatus.MANUAL_OVERRIDE.value]:
            entries = grouped.get(status_name, [])
            print(f"\n=== 时间线：{status_name}（共 {len(entries)} 条）===")
            for t in entries:
                print(f"  [{t['timestamp'][:19]}] {t['event_type']}: {t['description']} "
                      f"操作人={t['operator'] or '系统'}")


def cmd_summary(args: argparse.Namespace) -> None:
    review = _load(args.db)
    s = review.summary()
    print("=== 蒙特卡洛错题复盘概览 ===")
    for k, v in s.items():
        label = {
            "wrong_answer_count": "错题总数",
            "weight_change_count": "权重修改次数",
            "breach_count": "外推越界次数",
            "resolved_breach_count": "已处理越界",
            "calculation_step_count": "计算步骤数",
            "timeline_total": "时间线总计",
            "timeline_processed": "  已处理",
            "timeline_pending": "  待补材料",
            "timeline_manual_override": "  人工改判",
        }.get(k, k)
        print(f"  {label}: {v}")


def cmd_change_weight(args: argparse.Namespace) -> None:
    review = _load(args.db)
    try:
        old_val = _parse_value(args.old_value)
        new_val = _parse_value(args.new_value)
    except ValueError as e:
        print(f"[错误] 数值解析失败: {e}", file=sys.stderr)
        sys.exit(1)
    wc = review.change_weight(
        wrong_answer_id=args.wrong_answer_id,
        param_name=args.param_name,
        old_value=old_val,
        new_value=new_val,
        unit=args.unit,
        reason=args.reason,
        reason_detail=args.detail,
        changed_by=args.by,
    )
    _save(review, args.db)
    print(f"[OK] 已修改参数 {args.param_name}: {old_val} → {new_val} ({args.unit})")
    print(f"     原因={args.reason} 修改人={args.by}")


def cmd_calc(args: argparse.Namespace) -> None:
    review = _load(args.db)
    out_val = _parse_value(args.output) if args.output is not None else None
    cf = _parse_value(args.conversion) if args.conversion is not None else None
    bl = _parse_value(args.lo) if args.lo is not None else None
    bh = _parse_value(args.hi) if args.hi is not None else None
    inputs = {}
    if args.input:
        for item in args.input:
            if "=" in item:
                k, v = item.split("=", 1)
                try:
                    inputs[k] = _parse_value(v)
                except ValueError:
                    inputs[k] = v
    step = review.add_calculation_step(
        description=args.description,
        formula=args.formula,
        input_values=inputs,
        output_value=out_val,
        unit_before=args.ub,
        unit_after=args.ua,
        conversion_factor=cf,
        boundary_low=bl,
        boundary_high=bh,
        note=args.note,
    )
    _save(review, args.db)
    print(f"[OK] 已添加计算步骤 #{step.step_index}: {args.description}")
    if args.formula:
        print(f"     公式: {args.formula}")


def cmd_check_breach(args: argparse.Namespace) -> None:
    review = _load(args.db)
    val = _parse_value(args.value)
    lo = _parse_value(args.lo)
    hi = _parse_value(args.hi)
    breach = review.check_extrapolation(
        wrong_answer_id=args.wrong_answer_id,
        param_name=args.param_name,
        extrapolated_value=val,
        boundary_low=lo,
        boundary_high=hi,
        unit=args.unit,
    )
    _save(review, args.db)
    if breach:
        print(f"[!] 检测到外推越界 ID={breach.id}")
        print(f"    参数 {args.param_name}={val}{args.unit} 越出边界 [{lo}, {hi}]")
        print(f"    学生原始说法: {breach.original_statement or '无'}")
        print(f"    状态: 待补材料，使用 resolve 命令处理")
    else:
        print(f"[OK] {args.param_name}={val}{args.unit} 在合法范围 [{lo}, {hi}] 内")


def cmd_resolve(args: argparse.Namespace) -> None:
    review = _load(args.db)
    if args.breach_id not in review.breaches:
        print(f"[错误] 越界记录 {args.breach_id} 不存在", file=sys.stderr)
        sys.exit(1)
    review.resolve_breach(args.breach_id, args.resolution, args.by)
    _save(review, args.db)
    print(f"[OK] 越界 {args.breach_id} 已处理")
    print(f"     处理结果: {args.resolution}")


def cmd_trace(args: argparse.Namespace) -> None:
    review = _load(args.db)
    if args.wrong_answer_id:
        info = review.trace_wrong_answer(args.wrong_answer_id)
        print(f"=== 错题 {args.wrong_answer_id} 全量追溯 ===")
        print(json.dumps(info, ensure_ascii=False, indent=2))
    elif args.original:
        results = review.trace_from_original_statement(args.original)
        print(f"=== 按原始说法搜索: \"{args.original}\"（命中 {len(results)} 条）===")
        for i, info in enumerate(results, 1):
            wa = info["wrong_answer"]
            print(f"\n[{i}] 题目 {wa['question_id']}（错题ID {wa['id']}）")
            if wa.get("raw_source"):
                print(f"    学生原始说法: {wa['raw_source']['original_statement']}")
                print(f"    脏数据标记: {'是' if wa['raw_source']['is_dirty'] else '否'}")
            if info["weight_changes"]:
                print(f"    关联权重修改 {len(info['weight_changes'])} 条:")
                for wc in info["weight_changes"]:
                    print(f"      - {wc['param_name']}: {wc['old_value']}→{wc['new_value']} ({wc['reason']}, {wc['changed_by']})")
            if info["breaches"]:
                print(f"    关联越界 {len(info['breaches'])} 条:")
                for b in info["breaches"]:
                    print(f"      - {b['param_name']}={b['extrapolated_value']}{b['unit']} 边界[{b['boundary_low']},{b['boundary_high']}]")
                    if b["resolution"]:
                        print(f"        处理结果: {b['resolution']}")


def cmd_compare(args: argparse.Namespace) -> None:
    review = _load(args.db)
    view = review.get_comparison_view()
    print("=== 参数对照视图 ===")
    for param, changes in view["weight_changes_by_param"].items():
        print(f"\n参数: {param}")
        for wc in changes:
            print(f"  错题 {wc['wrong_answer_id']}: {wc['old_value']} → {wc['new_value']} "
                  f"({wc['unit']}) 原因={wc['reason']} 修改人={wc['changed_by']} 时间={wc['changed_at'][:19]}")
    if view["calculation_steps"]:
        print(f"\n计算步骤（共 {len(view['calculation_steps'])} 步）:")
        for s in view["calculation_steps"]:
            line = f"  #{s['step_index']} {s['description']}"
            if s["formula"]:
                line += f" | {s['formula']}"
            if s["output_value"] is not None:
                line += f" = {s['output_value']}"
            if s["unit_before"] and s["unit_after"]:
                line += f" [{s['unit_before']}→{s['unit_after']}]"
            print(line)


def cmd_export(args: argparse.Namespace) -> None:
    review = _load(args.db)
    if args.format == "json":
        review.export_json(args.output)
        print(f"[OK] JSON 数据已导出到: {args.output}")
    elif args.format == "csv":
        paths = review.export_csv(args.output)
        print(f"[OK] CSV 文件已导出到目录: {args.output}")
        for k, p in paths.items():
            print(f"     - {k}: {p}")
    elif args.format == "html":
        review.export_html_report(args.output, title=args.title)
        print(f"[OK] HTML 报告已生成: {args.output}")
    elif args.format == "all":
        paths = review.export_all(args.output, title=args.title)
        print(f"[OK] 已导出全部格式到目录: {args.output}")
        print(f"     JSON: {paths['json']}")
        for k, p in paths["csv"].items():
            print(f"     CSV ({k}): {p}")
        print(f"     HTML 报告: {paths['html']}")


def _parse_value(v: str) -> object:
    if v is None or v == "":
        return v
    try:
        if "." in v or "e" in v.lower():
            return float(v)
        return int(v)
    except ValueError:
        return v


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="mc-review",
        description="蒙特卡洛误差错题复盘系统 CLI",
    )
    parser.add_argument("--db", default=DEFAULT_DB, help=f"数据文件路径（默认: {DEFAULT_DB}）")

    sub = parser.add_subparsers(dest="command", required=True)

    sp = sub.add_parser("init", help="初始化空数据库")
    sp.add_argument("--force", action="store_true", help="覆盖已有数据文件")
    sp.set_defaults(func=cmd_init)

    sp = sub.add_parser("init-demo", help="初始化含示例数据的数据库")
    sp.add_argument("--force", action="store_true", help="覆盖已有数据文件")
    sp.set_defaults(func=cmd_init_demo)

    sp = sub.add_parser("summary", help="显示复盘概览统计")
    sp.set_defaults(func=cmd_summary)

    sp = sub.add_parser("add-question", help="录入错题")
    sp.add_argument("--question-id", required=True, help="题目编号")
    sp.add_argument("--student-answer", required=True, help="学生答案（数字或文字）")
    sp.add_argument("--correct-answer", required=True, help="正确答案")
    sp.add_argument("--error-type", required=True, help="错误类型，如'计算误差'、'外推越界'")
    sp.add_argument("--unit", default="", help="单位")
    sp.add_argument("--student-id", default="", help="学生学号")
    sp.add_argument("--original", default="", help="学生原始说法")
    sp.add_argument("--dirty", action="store_true", help="标记为脏数据")
    sp.add_argument("--dirt-desc", default="", help="脏数据描述")
    sp.set_defaults(func=cmd_add_question)

    sp = sub.add_parser("list", help="列出记录")
    sp.add_argument("kind", choices=["questions", "weights", "breaches", "timeline"],
                    help="记录类型: questions/weights/breaches/timeline")
    sp.add_argument("--param", default=None, help="过滤权重参数名（仅 kind=weights）")
    sp.add_argument("--resolved", choices=["true", "false"], default=None,
                    help="过滤越界处理状态（仅 kind=breaches）")
    sp.set_defaults(func=cmd_list)

    sp = sub.add_parser("change-weight", help="修改权重参数")
    sp.add_argument("--wrong-answer-id", required=True, help="错题ID")
    sp.add_argument("--param-name", required=True, help="参数名")
    sp.add_argument("--old-value", required=True, help="旧值")
    sp.add_argument("--new-value", required=True, help="新值")
    sp.add_argument("--unit", default="", help="单位")
    sp.add_argument("--reason", default=WeightChangeReason.OTHER.value,
                    choices=[e.value for e in WeightChangeReason],
                    help="修改原因")
    sp.add_argument("--detail", default="", help="详细说明")
    sp.add_argument("--by", default="", help="修改人")
    sp.set_defaults(func=cmd_change_weight)

    sp = sub.add_parser("calc", help="记录一步计算")
    sp.add_argument("--description", required=True, help="步骤描述")
    sp.add_argument("--formula", default="", help="公式")
    sp.add_argument("--input", action="append", default=None, help="输入变量，格式 key=value，可重复")
    sp.add_argument("--output", default=None, help="输出值")
    sp.add_argument("--ub", default="", help="换算前单位")
    sp.add_argument("--ua", default="", help="换算后单位")
    sp.add_argument("--conversion", default=None, help="换算因子")
    sp.add_argument("--lo", default=None, help="下界")
    sp.add_argument("--hi", default=None, help="上界")
    sp.add_argument("--note", default="", help="备注")
    sp.set_defaults(func=cmd_calc)

    sp = sub.add_parser("check-breach", help="检测外推越界")
    sp.add_argument("--wrong-answer-id", required=True, help="错题ID")
    sp.add_argument("--param-name", required=True, help="参数名")
    sp.add_argument("--value", required=True, help="外推值")
    sp.add_argument("--lo", required=True, help="下界")
    sp.add_argument("--hi", required=True, help="上界")
    sp.add_argument("--unit", default="", help="单位")
    sp.set_defaults(func=cmd_check_breach)

    sp = sub.add_parser("resolve", help="处理外推越界")
    sp.add_argument("--breach-id", required=True, help="越界记录ID")
    sp.add_argument("--resolution", required=True, help="处理结果说明")
    sp.add_argument("--by", default="", help="处理人")
    sp.set_defaults(func=cmd_resolve)

    sp = sub.add_parser("trace", help="追溯错题或原始说法")
    grp = sp.add_mutually_exclusive_group(required=True)
    grp.add_argument("--wrong-answer-id", default=None, help="按错题ID追溯")
    grp.add_argument("--original", default=None, help="按原始说法关键词搜索")
    sp.set_defaults(func=cmd_trace)

    sp = sub.add_parser("compare", help="参数对照视图（给项目经理）")
    sp.set_defaults(func=cmd_compare)

    sp = sub.add_parser("export", help="导出数据/报告")
    sp.add_argument("--format", required=True, choices=["json", "csv", "html", "all"],
                    help="导出格式")
    sp.add_argument("--output", required=True, help="输出文件或目录路径")
    sp.add_argument("--title", default="蒙特卡洛误差错题复盘报告", help="HTML报告标题")
    sp.set_defaults(func=cmd_export)

    return parser


def main(argv: Optional[list[str]] = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    main()

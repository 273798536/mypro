import argparse
import json
import sys
import os
from typing import Optional
from .db import Database
from .importer import DataImporter
from .engine import ParamEngine
from .reviewer import Reviewer, ReviewAction
from .report import ReportGenerator
from .models import DataSource


def _get_db(db_path: str = "interpreter.db") -> Database:
    return Database(db_path)


def cmd_init(args) -> None:
    db = _get_db(args.db)
    db.reset()
    print(f"[OK] 数据库已初始化: {os.path.abspath(args.db)}")


def cmd_import(args) -> None:
    db = _get_db(args.db)
    importer = DataImporter(db)
    source = DataSource(args.source)
    result = importer.import_file(args.file, source)
    print(f"[OK] 导入批次 {result['batch_id']} ({args.source})")
    print(f"     总计 {result['total']} · 成功 {result['success']} · "
          f"跳过 {result['skipped']} · 错误 {result['errors']}")
    if result["skipped_details"]:
        print(f"     跳过/错误详情（教研编辑待补）：")
        for d in result["skipped_details"][:5]:
            print(f"       * 行{d.get('index')} 题{d.get('question_id')}: {d.get('reason')}")
        if len(result["skipped_details"]) > 5:
            print(f"       * ...另有 {len(result['skipped_details']) - 5} 条")


def cmd_run(args) -> None:
    db = _get_db(args.db)
    engine = ParamEngine(db)
    if args.question:
        recs = engine.run_question(args.question)
        print(f"[OK] 题目 {args.question} 完成 {len(recs)} 条参数计算")
        for r in recs:
            flag = " ⚠️边界" if r.is_edge_case else ""
            print(f"     - {r.parameter_name}: raw={r.raw_value} → "
                  f"adj={r.adjusted_value} "
                  f"[{r.judgment_before.value}→{r.judgment_after.value}]{flag}")
    else:
        result = engine.run_all()
        print(f"[OK] 计算批次 {result['batch_id']}")
        print(f"     题目 {result['total']} 条 · 参数计算 {result['calculated']} 条 · "
              f"边界异常 {result['edge_cases']} 条")
        print(f"     👉 执行 `mpi review` 进入复核入口（无需重新导入）")


def cmd_review(args) -> None:
    db = _get_db(args.db)
    reviewer = Reviewer(db)
    pending = reviewer.list_pending(edge_only=not args.all)
    if not pending:
        print("[OK] 暂无待复核记录")
        return

    print(f"\n待复核记录（共 {len(pending)} 条）：")
    print("-" * 70)
    for i, c in enumerate(pending, 1):
        et = c.get("edge_type") or c["judgment_after"]
        print(f"  [{i}] #{c['id']}  题 {c['question_id']}  "
              f"参数 {c['parameter_name']}  "
              f"判定 {c['judgment_after']}  "
              f"[{et}]")
    print("-" * 70)
    print("操作：输入编号进入单条复核，或 'q' 退出，或 'all' 一键确认全部")

    choice = input("> ").strip()
    if choice.lower() == "q":
        return
    if choice.lower() == "all":
        for c in pending:
            reviewer.review(c["id"], ReviewAction.CONFIRM, "批量复核：确认接受")
        print(f"[OK] 已批量确认 {len(pending)} 条")
        return

    try:
        idx = int(choice) - 1
        c = pending[idx]
    except (ValueError, IndexError):
        print("[!] 无效选择")
        return

    calc = db.get_calculation(c["id"])
    print("\n" + "=" * 70)
    print(f"计算记录 #{calc['id']} · 题目 {calc['question_id']} · 参数 {calc['parameter_name']}")
    print("=" * 70)
    print(f"  原始值 raw_value       : {calc.get('raw_value')}")
    print(f"  修正值 adjusted_value  : {calc.get('adjusted_value')}")
    print(f"  原始公式 formula_before: {calc.get('formula_before')}")
    print(f"  修正公式 formula_after : {calc.get('formula_after')}")
    print(f"  解释（前）             : {calc.get('explanation_before')}")
    print(f"  解释（后）             : {calc.get('explanation_after')}")
    print(f"  判定 before → after    : {calc['judgment_before']} → {calc['judgment_after']}")
    print(f"  是否边界案例           : {'是' if calc.get('is_edge_case') else '否'}")
    print(f"  边界类型               : {calc.get('edge_type')}")
    print(f"  边界详情               : {calc.get('edge_detail')}")
    print(f"  来源材料追溯           : {calc.get('source_material')}")
    print("-" * 70)
    history = reviewer.get_review_history(calc["id"])
    if history:
        print("历史复核记录：")
        for h in history:
            print(f"  - [{h['reviewed_at']}] {h['reviewed_by']} {h['action']}: {h['reviewer_note']}")
        print("-" * 70)
    print("可选动作：")
    print("  1) confirm   — 确认接受当前修正结果")
    print("  2) adjust    — 人工调整 adjusted_value 数值")
    print("  3) reject    — 驳回该题目参数")
    print("  4) supplement— 补充说明并标记为可接受")
    print("  q) 退出")

    act = input("选择动作 > ").strip().lower()
    if act == "q":
        return
    action_map = {
        "1": ReviewAction.CONFIRM,
        "confirm": ReviewAction.CONFIRM,
        "2": ReviewAction.ADJUST,
        "adjust": ReviewAction.ADJUST,
        "3": ReviewAction.REJECT,
        "reject": ReviewAction.REJECT,
        "4": ReviewAction.SUPPLEMENT,
        "supplement": ReviewAction.SUPPLEMENT,
    }
    action = action_map.get(act)
    if not action:
        print("[!] 无效动作")
        return

    note = input("复核备注 > ").strip() or "（无）"
    param_adj = None
    if action == ReviewAction.ADJUST:
        raw = input("新 adjusted_value 数值 > ").strip()
        try:
            param_adj = {"adjusted_value": float(raw)}
        except ValueError:
            print("[!] 无效数值，取消")
            return

    result = reviewer.review(calc["id"], action, note, parameter_adjustment=param_adj)
    print(f"[OK] 已提交复核：{result['action']}，更新字段：{result['updates_applied']}")


def cmd_report(args) -> None:
    db = _get_db(args.db)
    rep = ReportGenerator(db)
    if args.question:
        qrep = rep.generate_question_report(args.question)
        if args.json:
            print(json.dumps(qrep, ensure_ascii=False, indent=2))
        else:
            print(f"\n题目 {qrep['question_id']} · 最终判定：{qrep['final_judgment']}")
            print("-" * 70)
            print("数据来源口径：")
            for s in qrep["sources"]:
                print(f"  - {s['source']} @ {s.get('import_batch_id')}："
                      f"{list(s['fields_present'].keys())}")
            print("-" * 70)
            print("公式前后差异：")
            for fd in qrep["formula_diffs"]:
                flag = " ⚠️边界" if fd["is_edge_case"] else ""
                print(f"  [{fd['parameter']}]{flag}")
                print(f"    公式: {fd['formula_before']}  →  {fd['formula_after']}")
                print(f"    数值: {fd['raw_value']}  →  {fd['adjusted_value']}")
                print(f"    判定: {fd['judgment_before']}  →  {fd['judgment_after']}")
                print(f"    解释: {fd['explanation_before']}")
                print(f"          ↓")
                print(f"          {fd['explanation_after']}")
                if fd.get("edge_type"):
                    print(f"    边界: {fd['edge_type']} — {fd.get('edge_detail')}")
                if fd.get("review_action"):
                    print(f"    复核: {fd['review_action']} — {fd.get('reviewer_note')}")
    else:
        if args.json:
            print(json.dumps(rep.generate_executive_summary(), ensure_ascii=False, indent=2))
        else:
            print(rep.generate_text_report())


def cmd_trace(args) -> None:
    db = _get_db(args.db)
    reviewer = Reviewer(db)
    trace = reviewer.get_formula_trace(args.question)
    if not trace:
        print(f"[!] 题目 {args.question} 无计算记录")
        return
    print(f"\n题目 {args.question} 的公式与判定追踪：")
    print("=" * 70)
    for t in trace:
        if not t.get("parameter_name"):
            continue
        print(f"[{t['parameter_name']}] @ {t.get('created_at')}")
        print(f"  公式: {t['formula_before']}  →  {t['formula_after']}")
        print(f"  判定: {t['judgment_before']}  →  {t['judgment_after']}")
        if t.get("review_action"):
            print(f"  复核: {t['review_action']} — {t.get('reviewer_note')}")
        print("-" * 70)


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="mpi",
        description="多目标调参解释器：统一三种口径、处理外推越界/除零边界、留复核入口",
    )
    p.add_argument("--db", default="interpreter.db", help="SQLite 数据库路径（默认 interpreter.db）")
    sub = p.add_subparsers(dest="cmd", required=True)

    pi = sub.add_parser("init", help="初始化/重置数据库")
    pi.set_defaults(func=cmd_init)

    pi = sub.add_parser("import", help="导入数据文件（JSON/CSV/TSV）")
    pi.add_argument("file", help="数据文件路径")
    pi.add_argument("--source", required=True,
                    choices=[s.value for s in DataSource],
                    help="数据口径来源：historical_answers / student_mistakes / question_list")
    pi.set_defaults(func=cmd_import)

    pr = sub.add_parser("run", help="执行多目标调参计算")
    pr.add_argument("--question", help="仅计算单个题目（不传则全部计算）")
    pr.set_defaults(func=cmd_run)

    pv = sub.add_parser("review", help="进入终端复核入口（无需重新导入）")
    pv.add_argument("--all", action="store_true", help="列出所有待复核（默认仅列边界异常）")
    pv.set_defaults(func=cmd_review)

    pre = sub.add_parser("report", help="生成投委会报告")
    pre.add_argument("--question", help="单个题目详细报告")
    pre.add_argument("--json", action="store_true", help="输出 JSON 格式")
    pre.set_defaults(func=cmd_report)

    pt = sub.add_parser("trace", help="查看单题公式前后差异与复核历史")
    pt.add_argument("question", help="题目编号")
    pt.set_defaults(func=cmd_trace)

    return p


def main(argv: Optional[list] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    args.func(args)
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""prob-review: 概率树错因复盘 CLI 工具"""

import argparse
import os
import sys
import json
import glob
from datetime import datetime

from prob_review import (
    process_file,
    Store,
    generate_markdown_report,
    interactive_review,
    file_hash,
)


def _default_batch_id() -> str:
    return datetime.now().strftime("batch_%Y%m%d")


def cmd_run(args):
    store = Store(args.output)

    input_files = []
    if os.path.isfile(args.input):
        input_files = [args.input]
    elif os.path.isdir(args.input):
        for pat in ("*.json", "*.JSON"):
            input_files.extend(sorted(glob.glob(os.path.join(args.input, pat))))
    else:
        print(f"❌ 输入路径不存在: {args.input}", file=sys.stderr)
        sys.exit(1)

    if not input_files:
        print(f"❌ 在 {args.input} 中未找到 .json 输入文件", file=sys.stderr)
        sys.exit(1)

    batch_id = args.batch or _default_batch_id()
    print(f"📦 批次 ID: {batch_id}")
    print(f"📂 输入目录: {os.path.abspath(args.input)}")
    print(f"📂 输出目录: {os.path.abspath(args.output)}")
    print(f"🔍 发现 {len(input_files)} 个待处理文件")
    print()

    results = []
    for fpath in input_files:
        fname = os.path.basename(fpath)
        fh = file_hash(fpath)

        if not args.force:
            existing = store.find_by_source_hash(fh)
            if existing:
                print(f"⏭  {fname}: 已存在处理记录（hash 一致），跳过。")
                print(f"   记录ID: {existing.id}, 状态: {existing.status.value}, 误差数: {len(existing.errors)}")
                if args.report:
                    content = generate_markdown_report(existing)
                    rpath = store.save_report(existing.id, content)
                    print(f"   📄 报告: {rpath}")
                results.append(existing)
                continue

        try:
            rec = process_file(fpath, batch_id)
            store.save_record(rec)
            sev_counts = {}
            for e in rec.errors:
                key = e.severity.value
                sev_counts[key] = sev_counts.get(key, 0) + 1
            print(f"✅ {fname}: 处理完成，记录ID={rec.id}, 共 {len(rec.errors)} 处偏差。", end="")
            if sev_counts:
                print(" (" + ", ".join(f"{k}={v}" for k, v in sorted(sev_counts.items())) + ")")
            else:
                print("")

            if args.report:
                content = generate_markdown_report(rec)
                rpath = store.save_report(rec.id, content)
                print(f"   📄 报告: {rpath}")
            results.append(rec)
        except Exception as exc:
            print(f"❌ {fname}: 处理失败 — {exc}", file=sys.stderr)

    print()
    print("=" * 60)
    print(f"📊 批次完成：成功处理 {len(results)} 个文件")
    if any(r.errors for r in results):
        print("💡 提示: 运行 `prob-review review` 进入交互复核模式，")
        print("         或 `prob-review list` 查看所有处理记录。")
    return 0


def cmd_list(args):
    store = Store(args.output)
    records = store.list_all_records()
    if not records:
        print(f"📭 输出目录 {args.output} 中暂无处理记录。")
        return 0

    print(f"📋 共找到 {len(records)} 条处理记录：")
    print()
    print(f"{'ID':<20} {'来源文件':<28} {'批次':<16} {'状态':<10} {'偏差数':<6} {'更新时间'}")
    print("-" * 100)
    for r in records:
        print(
            f"{r['id']:<20} "
            f"{(r['source_file'][:26]+'..') if len(r['source_file'])>28 else r['source_file']:<28} "
            f"{r['batch_id'][:14] + ('..' if len(r['batch_id'])>14 else ''):<16} "
            f"{r['status']:<10} "
            f"{r['error_count']:<6} "
            f"{r['updated_at'][:19]}"
        )
    print()
    print("💡 运行 `prob-review review <记录ID>` 进入复核模式。")
    return 0


def cmd_review(args):
    store = Store(args.output)

    if args.record_id:
        rec = store.load_record(args.record_id)
        if not rec:
            print(f"❌ 未找到记录ID: {args.record_id}", file=sys.stderr)
            sys.exit(1)
        interactive_review(store, rec)
        return 0

    records = store.list_all_records()
    if not records:
        print("📭 暂无处理记录，先运行 `prob-review run`。")
        return 0

    print("📋 可用记录：")
    for i, r in enumerate(records[:10], 1):
        print(f"  [{i}] {r['id']}  {r['source_file']}  偏差={r['error_count']}  状态={r['status']}")
    try:
        choice = input("\n请选择要复核的记录编号（回车选第1条，q 退出）> ").strip()
    except (EOFError, KeyboardInterrupt):
        return 0
    if choice in ("q", "quit", ""):
        idx = 1 if choice == "" else None
        if idx is None:
            return 0
    else:
        try:
            idx = int(choice)
        except ValueError:
            print("❌ 无效输入。")
            return 1
    if not 1 <= idx <= len(records):
        print("❌ 编号超出范围。")
        return 1
    rec = store.load_record(records[idx - 1]["id"])
    interactive_review(store, rec)
    return 0


def cmd_report(args):
    store = Store(args.output)
    rec = store.load_record(args.record_id)
    if not rec:
        print(f"❌ 未找到记录ID: {args.record_id}", file=sys.stderr)
        sys.exit(1)
    content = generate_markdown_report(rec)
    if args.stdout:
        sys.stdout.write(content)
    else:
        path = store.save_report(rec.id, content, suffix=args.suffix or "")
        print(f"📄 报告已生成: {path}")
    return 0


def cmd_trace(args):
    store = Store(args.output)
    rec = store.load_record(args.record_id)
    if not rec:
        print(f"❌ 未找到记录ID: {args.record_id}", file=sys.stderr)
        sys.exit(1)

    target_err = None
    for e in rec.errors:
        if e.record_id == args.error_id or e.node_id == args.error_id:
            target_err = e
            break
    if target_err is None:
        print(f"❌ 在记录 {args.record_id} 中未找到误差ID或节点ID: {args.error_id}", file=sys.stderr)
        sys.exit(1)

    print("=" * 60)
    print(f"🔍 异常倒查链路")
    print("=" * 60)
    print()
    print(f"  误差记录ID : {target_err.record_id}")
    print(f"  节点名称    : {target_err.node_label}")
    print(f"  节点ID      : {target_err.node_id}")
    print(f"  误差类型    : {target_err.error_type}")
    print(f"  严重程度    : {target_err.severity.value}")
    print(f"  预期值      : {target_err.expected_prob:.6f}")
    print(f"  实际值      : {target_err.actual_prob:.6f}")
    print(f"  绝对误差    : {target_err.absolute_error:.6f}")
    print(f"  相对误差    : {target_err.relative_error*100:.2f}%")
    print()
    print(f"  📝 计算草稿引用: {target_err.calc_draft_ref or '（未记录）'}")
    print(f"  📋 处理意见    : {target_err.processing_note or '（无）'}")
    print()
    print("-" * 60)
    print("  问题说明（可直接复制）:")
    print(f"  {target_err.explanation_zh}")
    print()
    print("  处理建议（可直接复制）:")
    print(f"  {target_err.suggestion_zh}")
    print()

    if rec.tree_root:
        from prob_review.report import render_tree_trace
        from prob_review import find_node_by_id
        print("-" * 60)
        print("🌲 在概率树中的回溯路径:")
        print()
        trace = render_tree_trace(rec.tree_root, target_err.node_id)
        if trace:
            print(trace)
        else:
            node = find_node_by_id(rec.tree_root, target_err.node_id)
            if node:
                print(f"  节点: {node.label}")
                if node.calc_note:
                    print(f"  计算草稿: {node.calc_note}")
                if node.source_ref:
                    print(f"  来源引用: {node.source_ref}")
        print()

    related_notes = [n for n in rec.review_notes if n.get("error_id") in (target_err.record_id, "*")]
    if related_notes:
        print("-" * 60)
        print(f"📌 复核记录（{len(related_notes)} 条）:")
        for i, n in enumerate(related_notes, 1):
            print(f"  #{i} @ {n.get('timestamp', 'N/A')} by {n.get('reviewer', '?')}")
            print(f"     意见: {n.get('comment', '')}")
            if n.get("corrected_value") is not None:
                print(f"     修正值: {n['corrected_value']}")
        print()
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="prob-review",
        description="概率树错因复盘工具：计算草稿校验、误差分析、复核追溯一体化。",
    )
    sub = p.add_subparsers(dest="command", required=True)

    p_run = sub.add_parser("run", help="批量处理输入目录中的概率树JSON文件")
    p_run.add_argument("-i", "--input", required=True, help="输入文件或目录（目录下自动寻找 *.json）")
    p_run.add_argument("-o", "--output", required=True, help="输出目录（存放处理记录与报告）")
    p_run.add_argument("-b", "--batch", default=None, help="批次ID（默认按日期生成）")
    p_run.add_argument("-f", "--force", action="store_true", help="强制重新处理已存在记录的文件")
    p_run.add_argument("-r", "--report", action="store_true", help="处理完成后同时生成Markdown报告")
    p_run.set_defaults(func=cmd_run)

    p_list = sub.add_parser("list", help="列出所有处理记录")
    p_list.add_argument("-o", "--output", required=True, help="输出目录")
    p_list.set_defaults(func=cmd_list)

    p_rev = sub.add_parser("review", help="进入交互复核模式")
    p_rev.add_argument("-o", "--output", required=True, help="输出目录")
    p_rev.add_argument("record_id", nargs="?", default=None, help="处理记录ID（不填则列出可选）")
    p_rev.set_defaults(func=cmd_review)

    p_rep = sub.add_parser("report", help="生成Markdown报告")
    p_rep.add_argument("-o", "--output", required=True, help="输出目录")
    p_rep.add_argument("record_id", help="处理记录ID")
    p_rep.add_argument("--stdout", action="store_true", help="直接打印到标准输出而非写入文件")
    p_rep.add_argument("--suffix", default="", help="报告文件名后缀")
    p_rep.set_defaults(func=cmd_report)

    p_tra = sub.add_parser("trace", help="根据误差ID或节点ID回溯来源和处理记录")
    p_tra.add_argument("-o", "--output", required=True, help="输出目录")
    p_tra.add_argument("record_id", help="处理记录ID")
    p_tra.add_argument("error_id", help="误差记录ID 或 节点ID")
    p_tra.set_defaults(func=cmd_trace)

    return p


def main():
    parser = build_parser()
    args = parser.parse_args()
    sys.exit(args.func(args) or 0)


if __name__ == "__main__":
    main()

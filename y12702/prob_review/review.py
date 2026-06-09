import sys
from typing import Optional
from datetime import datetime
from .models import ProcessingRecord, ErrorRecord, ErrorSeverity, find_node_by_id
from .report import render_tree_trace


def _print_error_summary(errors):
    sev_label = {
        ErrorSeverity.CRITICAL: ("🔴", "严重"),
        ErrorSeverity.HIGH: ("🟠", "较大"),
        ErrorSeverity.MEDIUM: ("🟡", "中等"),
        ErrorSeverity.LOW: ("🟢", "轻微"),
    }
    print()
    print("=" * 60)
    print("误差记录列表（按严重程度排序）")
    print("=" * 60)
    sorted_errs = sorted(
        errors,
        key=lambda e: [
            ErrorSeverity.CRITICAL, ErrorSeverity.HIGH, ErrorSeverity.MEDIUM, ErrorSeverity.LOW
        ].index(e.severity) if e.severity in [
            ErrorSeverity.CRITICAL, ErrorSeverity.HIGH, ErrorSeverity.MEDIUM, ErrorSeverity.LOW
        ] else 99,
    )
    for i, e in enumerate(sorted_errs, 1):
        icon, label = sev_label.get(e.severity, ("⚪", "未知"))
        print(f"  [{i:2d}] {icon} {label}  {e.record_id}  「{e.node_label}」 {e.error_type}")
        print(f"        绝对误差={e.absolute_error:.4f}  相对误差={e.relative_error*100:.2f}%")
    print()
    return sorted_errs


def interactive_review(store, record: ProcessingRecord) -> ProcessingRecord:
    print()
    print("=" * 60)
    print("📋 概率树错因复盘 — 复核模式")
    print("=" * 60)
    print(f"  处理记录 ID : {record.id}")
    print(f"  来源文件    : {record.source_file}")
    print(f"  误差总数    : {len(record.errors)}")
    print(f"  状态        : {record.status.value}")
    print()

    if not record.errors:
        print("✅ 本批次无误差记录，无需复核。")
        return record

    sorted_errs = _print_error_summary(record.errors)

    while True:
        print("-" * 60)
        print("复核菜单:")
        print("  <数字>    查看指定误差详情并回溯来源")
        print("  l / list  重新列出所有误差")
        print("  s / sum   查看总体总结")
        print("  t / tree  打印整棵概率树")
        print("  r / report 重新生成Markdown报告")
        print("  c / comment 对某条误差添加复核意见")
        print("  m / mark  将本批次标记为已复核")
        print("  q / quit  退出复核")
        print("-" * 60)
        try:
            choice = input("请选择操作 > ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break

        if not choice:
            continue

        if choice in ("q", "quit", "exit"):
            break

        elif choice in ("l", "list"):
            sorted_errs = _print_error_summary(record.errors)

        elif choice in ("s", "sum"):
            print()
            print("📝 总体总结（可直接复制）:")
            print()
            print(f"  {record.overall_summary_zh}")
            print()

        elif choice in ("t", "tree"):
            if record.tree_root:
                print()
                print("🌲 概率树结构:")
                print()
                trace = render_tree_trace(record.tree_root, "__never_match__")
                if trace:
                    print(trace)
                else:
                    _print_full_tree(record.tree_root)
                print()
            else:
                print("⚠️  本批次无树结构数据。")

        elif choice in ("r", "report"):
            from .report import generate_markdown_report
            content = generate_markdown_report(record)
            path = store.save_report(record.id, content)
            print(f"✅ 报告已生成: {path}")

        elif choice in ("m", "mark"):
            from .models import RecordStatus
            record.status = RecordStatus.REVIEWED
            record.review_notes.append({
                "timestamp": datetime.now().isoformat(),
                "reviewer": input("复核人姓名（回车留空）: ").strip() or "未署名",
                "comment": input("总体复核意见（回车跳过）: ").strip(),
                "error_id": "*",
                "corrected_value": None,
            })
            store.update_record(record)
            print("✅ 已标记为已复核状态。")

        elif choice in ("c", "comment"):
            try:
                idx = int(input("请输入误差编号（对应列表中的序号）: ").strip())
                if 1 <= idx <= len(sorted_errs):
                    target = sorted_errs[idx - 1]
                    reviewer = input("复核人姓名（回车留空）: ").strip() or "未署名"
                    comment = input(f"对「{target.node_label}」的复核意见: ").strip()
                    corrected = input("修正后的概率值（回车不改）: ").strip()
                    try:
                        corrected_val = float(corrected) if corrected else None
                    except ValueError:
                        corrected_val = None
                        print("⚠️  修正值不是合法数字，已忽略。")
                    record.review_notes.append({
                        "timestamp": datetime.now().isoformat(),
                        "reviewer": reviewer,
                        "comment": comment,
                        "error_id": target.record_id,
                        "corrected_value": corrected_val,
                    })
                    store.update_record(record)
                    print(f"✅ 已保存对 {target.record_id} 的复核意见。")
                else:
                    print("❌ 编号超出范围。")
            except ValueError:
                print("❌ 请输入数字。")

        else:
            try:
                idx = int(choice)
                if 1 <= idx <= len(sorted_errs):
                    target = sorted_errs[idx - 1]
                    _show_error_detail(record, target)
                else:
                    print("❌ 编号超出范围。")
            except ValueError:
                print(f"❌ 未知命令: {choice}")

    return record


def _print_full_tree(node, depth=0):
    prefix = "  " * depth
    print(f"{prefix}├─ [{node.id}] {node.label}  P={node.probability:.4f}")
    if node.calc_note:
        print(f"{prefix}│   📝 计算草稿: {node.calc_note}")
    if node.source_ref:
        print(f"{prefix}│   📎 来源引用: {node.source_ref}")
    for child in node.children:
        _print_full_tree(child, depth + 1)


def _show_error_detail(record: ProcessingRecord, err: ErrorRecord):
    print()
    print("=" * 60)
    print(f"🔍 误差详情 {err.record_id}")
    print("=" * 60)
    print(f"  节点名称     : {err.node_label}")
    print(f"  节点 ID      : {err.node_id}")
    print(f"  误差类型     : {err.error_type}")
    print(f"  严重程度     : {err.severity.value}")
    print(f"  预期值       : {err.expected_prob:.6f}")
    print(f"  实际值       : {err.actual_prob:.6f}")
    print(f"  绝对误差     : {err.absolute_error:.6f}")
    print(f"  相对误差     : {err.relative_error*100:.2f}%")
    print()
    print(f"  问题说明     : {err.explanation_zh}")
    print()
    print(f"  处理建议     : {err.suggestion_zh}")
    print()
    if err.calc_draft_ref:
        print(f"  📝 计算草稿引用: {err.calc_draft_ref}")
    if err.processing_note:
        print(f"  📋 处理过程记录: {err.processing_note}")
    print()

    if record.tree_root:
        print("-" * 60)
        print("🌲 在概率树中的位置（回溯路径）:")
        print()
        trace = render_tree_trace(record.tree_root, err.node_id)
        if trace:
            print(trace)
        else:
            node = find_node_by_id(record.tree_root, err.node_id)
            if node:
                print(f"  找到节点: {node.label}")
                if node.calc_note:
                    print(f"  计算草稿: {node.calc_note}")
            else:
                print("  ⚠️  未在树结构中找到该节点。")
        print()

    related_notes = [n for n in record.review_notes if n.get("error_id") == err.record_id]
    if related_notes:
        print("-" * 60)
        print(f"📌 历史复核记录（{len(related_notes)} 条）:")
        for i, n in enumerate(related_notes, 1):
            print(f"  #{i} @ {n.get('timestamp', 'N/A')} by {n.get('reviewer', '?')}")
            print(f"     意见: {n.get('comment', '')}")
            if n.get("corrected_value") is not None:
                print(f"     修正值: {n['corrected_value']}")
        print()

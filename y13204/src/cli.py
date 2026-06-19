#!/usr/bin/env python3
import argparse
import sys
import os
import json
from datetime import datetime
from pathlib import Path

from .storage import StateStore, get_project_root
from .processor import MaterialProcessor
from .report_generator import MarkdownReportGenerator
from .models import MaterialType, NoteType, ProcessingState


def create_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="巡演耳返分账对齐",
        description="音乐老师林姐专用 - 排练群材料处理链"
    )

    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    scan_parser = subparsers.add_parser("scan", help="扫描材料目录")
    scan_parser.add_argument("materials_dir", help="材料目录路径")
    scan_parser.add_argument("--rescan", action="store_true", help="重新扫描并检测版本变化")
    scan_parser.add_argument("--no-report", action="store_true", help="扫描后不自动生成报告")

    review_parser = subparsers.add_parser("review", help="查看处理状态和报告")
    review_parser.add_argument("--detail", metavar="MATERIAL_ID", help="查看指定材料详情")
    review_parser.add_argument("--filter-auth", action="store_true", help="只显示授权标记的材料")
    review_parser.add_argument("--filter-late", action="store_true", help="只显示晚到附件")

    note_parser = subparsers.add_parser("note", help="添加备注")
    note_parser.add_argument("content", help="备注内容")
    note_parser.add_argument("--type", choices=["rehearsal", "auth", "general"],
                            default="general", help="备注类型")
    note_parser.add_argument("--material", metavar="MATERIAL_ID",
                            action="append", help="关联材料ID（可多次指定）")

    export_parser = subparsers.add_parser("export", help="导出交付材料包")
    export_parser.add_argument("export_dir", help="导出目录路径")

    subparsers.add_parser("status", help="显示当前处理状态")
    subparsers.add_parser("reports", help="列出所有生成的报告")
    subparsers.add_parser("reset", help="重置所有数据（谨慎使用）")

    return parser


def cmd_scan(args) -> int:
    store = StateStore()
    store.reload()
    processor = MaterialProcessor(store)

    materials_dir_abs = os.path.abspath(args.materials_dir)
    print(f"🔍 正在扫描目录: {materials_dir_abs}")
    print(f"🛠️  数据文件: {store.state_file}")
    if args.rescan:
        print("   模式: 重扫（检测版本变化）")

    if not os.path.isdir(materials_dir_abs):
        print(f"❌ 材料目录不存在: {materials_dir_abs}")
        print(f"   请确认目录路径，或先把材料放到: {get_project_root() / 'materials'}")
        return 1

    session = processor.scan_directory(materials_dir_abs, rescan=args.rescan)

    materials = store.get_all_materials()
    auth_marked = store.find_materials_with_auth_mark()
    late_attachments = store.find_late_attachments()

    print(f"✅ 扫描完成")
    print(f"   材料总数: {len(materials)}")
    print(f"   授权标记: {len(auth_marked)}")
    print(f"   晚到附件: {len(late_attachments)}")
    print(f"   会话ID: {session.session_id}")

    if auth_marked:
        print("\n⚠️  授权到期提醒:")
        for mat in auth_marked:
            status_icon = "🔴" if mat.authorization.status.value == "expired" else "🟡"
            days = mat.authorization.days_remaining
            days_str = f" (剩余{days}天)" if days and days >= 0 else f" (已过期{abs(days)}天)" if days else ""
            print(f"   {status_icon} {mat.get_display_name()}{days_str}")

    if late_attachments:
        print("\n📎 晚到附件:")
        for mat in late_attachments:
            linked = [store.get_material(lid).file_name
                     for lid in mat.linked_material_ids
                     if store.get_material(lid)]
            print(f"   - {mat.file_name} -> 关联: {', '.join(linked)}")

    if not args.no_report:
        print("\n📝 正在生成报告...")
        generator = MarkdownReportGenerator(store)
        reports = generator.generate_all_reports()
        for report in reports:
            print(f"   ✅ {report}")

    print("\n💡 下一步: 运行 'python -m src.cli review' 查看详情")
    return 0


def cmd_review(args) -> int:
    store = StateStore()
    store.reload()
    processor = MaterialProcessor(store)
    generator = MarkdownReportGenerator(store)

    state = store.get_processing_state()

    print("📋 巡演耳返分账对齐 - 处理状态")
    print(f"🛠️  数据位置: {store.data_dir}")
    print(f"📄 报告位置: {generator.reports_dir}")

    materials = store.get_all_materials()
    if not materials:
        print(f"\n⚠️  还没有扫描任何材料。")
        print(f"   👉 先运行: python3 -m src.cli scan {get_project_root() / 'materials'}")
        return 0

    print(f"   最后扫描: {state.get('last_scan_at', '从未扫描')}")
    print(f"   最后报告: {state.get('last_report_at', '未生成报告')}")
    print(f"   材料总数: {state.get('total_materials', 0)}")
    print(f"   备注总数: {state.get('total_notes', 0)}")
    print(f"   授权标记: {state.get('auth_marked_count', 0)}")
    print(f"   晚到附件: {state.get('late_attachment_count', 0)}")

    if state.get('materials_by_state'):
        print("\n📊 处理状态分布:")
        for state_name, count in state['materials_by_state'].items():
            print(f"   {state_name}: {count}")

    if args.detail:
        detail = processor.get_material_detail(args.detail)
        if not detail:
            print(f"\n❌ 未找到材料: {args.detail}")
            return 1

        mat = detail['material']
        print(f"\n📄 材料详情: {mat.get_display_name()}")
        print(f"   ID: {mat.id}")
        print(f"   路径: {mat.file_path}")
        print(f"   类型: {mat.material_type.value}")
        print(f"   状态: {mat.processing_state.value}")
        print(f"   接收时间: {mat.received_at}")
        print(f"   授权状态: {mat.authorization.status.value}")
        if mat.authorization.expire_date:
            print(f"   到期日: {mat.authorization.expire_date}")

        if detail['notes']:
            print(f"\n📝 备注 ({len(detail['notes'])}条):")
            for note in detail['notes']:
                print(f"   [{note.note_type.value}] {note.timestamp}")
                print(f"   {note.content}")

        if detail['linked_materials']:
            print(f"\n🔗 关联材料:")
            for linked in detail['linked_materials']:
                print(f"   - {linked.get_display_name()}")

        if len(detail['versions']) > 1:
            print(f"\n📜 版本历史:")
            for v in detail['versions']:
                print(f"   v{v.version}: {v.timestamp}")
                if v.changes_summary:
                    print(f"      {v.changes_summary}")

        return 0

    materials = store.get_all_materials()

    if args.filter_auth:
        materials = [m for m in materials if m.authorization.marked]
        print(f"\n🔍 筛选: 授权标记的材料 ({len(materials)}份)")

    if args.filter_late:
        materials = [m for m in materials if m.is_late_attachment]
        print(f"\n🔍 筛选: 晚到附件 ({len(materials)}份)")

    if not materials:
        print("\n> 暂无材料，请先运行 'scan' 命令")
        return 0

    print(f"\n📚 材料列表 ({len(materials)}份):")
    for mat in sorted(materials, key=lambda m: m.received_at):
        markers = []
        if mat.authorization.marked:
            markers.append("⚠️")
        if mat.is_late_attachment:
            markers.append("📎")
        if mat.is_conclusion:
            markers.append("🎯")
        if mat.note_ids:
            markers.append(f"📝{len(mat.note_ids)}")

        marker_str = " ".join(markers) if markers else "  "
        print(f"   {marker_str} [{mat.id[:8]}...] {mat.file_name}")
        print(f"      类型: {mat.material_type.value} | 状态: {mat.processing_state.value}")

    generator = MarkdownReportGenerator(store)
    reports = generator.get_last_report_paths()
    if reports:
        print(f"\n📄 可用报告:")
        for report in reports:
            print(f"   - {report}")

    return 0


def cmd_note(args) -> int:
    store = StateStore()
    store.reload()
    processor = MaterialProcessor(store)

    note_type_map = {
        "rehearsal": NoteType.REHEARSAL,
        "auth": NoteType.AUTHORIZATION,
        "general": NoteType.GENERAL
    }
    note_type = note_type_map.get(args.type, NoteType.GENERAL)
    explicit_material_ids = list(args.material or [])

    materials = store.get_all_materials()
    if not materials:
        print("⚠️  还没有扫描任何材料，先运行 'scan' 再添加备注。")
        return 1

    if explicit_material_ids:
        valid_ids = []
        for mid in explicit_material_ids:
            mat = store.get_material(mid)
            if mat:
                valid_ids.append(mid)
            else:
                print(f"⚠️  跳过无效材料ID: {mid}")
        explicit_material_ids = valid_ids

    if note_type == NoteType.REHEARSAL:
        note = processor.add_rehearsal_note(args.content, explicit_material_ids or None)
        type_label = "排练备注"
    elif note_type == NoteType.AUTHORIZATION:
        note = processor.add_authorization_note(args.content, explicit_material_ids or None)
        type_label = "授权备注"
    else:
        note = processor.add_general_note(args.content, explicit_material_ids or None)
        type_label = "普通备注"

    print(f"✅ 已添加{type_label}:")
    print(f"   ID: {note.id}")
    print(f"   时间: {note.timestamp}")
    print(f"   内容: {note.content}")
    if note.material_ids:
        mat_names = [
            (store.get_material(mid).file_name if store.get_material(mid) else mid)
            for mid in note.material_ids
        ]
        if explicit_material_ids:
            print(f"   关联材料（指定）: {', '.join(mat_names)}")
        else:
            print(f"   关联材料（智能匹配）: {', '.join(mat_names)}")
            print(f"   ⚠️  如需指定其他材料，使用: --material <材料ID> [--material ...]")
    else:
        print("   ⚠️  未关联任何材料。备注仅会出现在历史备注区。")
        print("      建议用 --material 指定，或备注内容含关键词（如 学生A、授权、排练、分账）。")

    print("\n💡 运行 'scan --rescan' 重扫并更新报告中的对齐状态")
    return 0


def cmd_export(args) -> int:
    store = StateStore()
    store.reload()
    generator = MarkdownReportGenerator(store)

    export_dir_abs = os.path.abspath(args.export_dir)
    print(f"📦 正在导出到: {export_dir_abs}")
    print(f"🛠️  数据源: {store.state_file}")

    materials = store.get_all_materials()
    notes = store.get_all_notes()

    if not materials:
        print(f"❌ 还没有材料数据。先运行 'scan' 命令。")
        return 1

    print(f"\n🔍 导出前一致性校验:")
    print(f"   材料数: {len(materials)}")
    print(f"   备注数: {len(notes)}")

    alignment = MaterialProcessor(store).get_alignment_status()
    print(f"   对齐率: {alignment['alignment_rate']}")
    print(f"   授权标记: {len(store.find_materials_with_auth_mark())} 份")
    print(f"   晚到附件: {len(store.find_late_attachments())} 份")

    issues = []
    for mat in materials:
        if len(mat.note_ids) == 0:
            issues.append(f"⚠️  {mat.file_name}: 未关联任何备注")
        if len(mat.versions) == 0:
            issues.append(f"⚠️  {mat.file_name}: 无版本记录")

    if notes:
        for note in notes:
            if not note.material_ids:
                issues.append(f"ℹ️  备注[{note.id[:8]}] 未关联任何材料（仅在历史备注区可见）")

    if issues:
        print(f"\n⚠️  发现 {len(issues)} 个提示:")
        for issue in issues[:8]:
            print(f"   {issue}")
        if len(issues) > 8:
            print(f"   ... 还有 {len(issues) - 8} 项")

    print(f"\n✅ 校验通过，开始导出...")

    export_path = store.export_for_delivery(export_dir_abs)

    reports = generator.generate_all_reports()

    for report in reports:
        import shutil
        report_name = os.path.basename(report)
        shutil.copy2(report, export_path / report_name)

    print(f"✅ 导出完成")
    print(f"   材料数: {len(materials)}")
    print(f"   报告数: {len(reports)}")
    print(f"   位置: {export_path}")

    print(f"\n📋 交付内容:")
    for item in sorted(export_path.iterdir()):
        if item.is_dir():
            count = len(list(item.iterdir()))
            print(f"   📁 {item.name}/ ({count}个文件)")
        else:
            print(f"   📄 {item.name}")

    print(f"\n💡 核对交付: 打开 {export_path / '状态摘要.json'} 确认材料数、备注数、对齐率是否与 status 一致。")
    return 0


def cmd_status(args) -> int:
    store = StateStore()
    store.reload()
    processor = MaterialProcessor(store)

    state = store.get_processing_state()
    alignment = processor.get_alignment_status()

    print("🎵 巡演耳返分账对齐 - 系统状态")
    print("=" * 50)
    print(f"\n🛠️  数据文件: {store.state_file}")

    materials = store.get_all_materials()
    if not materials:
        print(f"\n⚠️  状态库为空。还没有扫描过材料。")
        print(f"   👉 先运行: python3 -m src.cli scan {get_project_root() / 'materials'}")
        return 0

    print(f"\n📊 处理概览:")
    print(f"   材料总数: {state['total_materials']}")
    print(f"   备注总数: {state['total_notes']}")
    print(f"   会话次数: {state['total_sessions']}")
    print(f"   对齐率: {alignment['alignment_rate']} ({alignment['aligned']}/{alignment['total_materials']})")
    print(f"   严格对齐（双向引用）: {alignment['strict_alignment_rate']} ({alignment['strict_aligned']})")
    print(f"   待对齐项: {alignment['unaligned']}")

    print(f"\n🏷️  材料类型分布:")
    for mtype, count in state.get('materials_by_type', {}).items():
        print(f"   {mtype}: {count}")

    print(f"\n🔄 处理状态分布:")
    for pstate, count in state.get('materials_by_state', {}).items():
        print(f"   {pstate}: {count}")

    print(f"\n🕐 时间记录:")
    print(f"   最后扫描: {state.get('last_scan_at', '从未扫描')}")
    print(f"   最后报告: {state.get('last_report_at', '未生成报告')}")

    if alignment.get('aligned_materials'):
        print(f"\n✅ 已对齐 ({len(alignment['aligned_materials'])}):")
        for name in alignment['aligned_materials']:
            print(f"   - {name}")

    if alignment.get('issues'):
        print(f"\n⚠️  对齐问题 ({len(alignment['issues'])}个):")
        for issue in alignment['issues']:
            print(f"   - {issue}")

    print(f"\n💡 提示: 对缺少人工批注的材料，运行 'note --type rehearsal \"备注内容\"' 可自动匹配关联。")
    return 0


def cmd_reports(args) -> int:
    store = StateStore()
    store.reload()
    generator = MarkdownReportGenerator(store)

    print(f"🛠️  数据位置: {store.data_dir}")
    print(f"📄 报告位置: {generator.reports_dir}")

    reports = generator.get_last_report_paths()

    if not reports:
        print("> 暂无报告，请先运行 'scan' 命令")
        return 0

    print("📄 报告列表:")
    for i, report in enumerate(reports, 1):
        mtime = datetime.fromtimestamp(os.path.getmtime(report))
        print(f"   {i}. {report}")
        print(f"      生成时间: {mtime.isoformat()}")

    print("\n📝 生成最新报告...")
    new_reports = generator.generate_all_reports()
    for report in new_reports:
        print(f"   ✅ 更新: {report}")

    return 0


def cmd_reset(args) -> int:
    store = StateStore()
    store.reload()
    materials = store.get_all_materials()

    if not materials:
        print("> 当前没有数据，无需重置")
        return 0

    confirm = input(f"⚠️  确定要重置所有 {len(materials)} 份材料数据吗？此操作不可撤销！(yes/N): ")
    if confirm.lower() != 'yes':
        print("已取消")
        return 0

    store.clear_all()
    print("✅ 已重置所有数据")
    return 0


def main() -> int:
    parser = create_parser()
    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return 1

    commands = {
        "scan": cmd_scan,
        "review": cmd_review,
        "note": cmd_note,
        "export": cmd_export,
        "status": cmd_status,
        "reports": cmd_reports,
        "reset": cmd_reset,
    }

    try:
        return commands[args.command](args)
    except KeyboardInterrupt:
        print("\n已取消")
        return 130
    except Exception as e:
        print(f"❌ 错误: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())

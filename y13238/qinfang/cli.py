#!/usr/bin/env python3
import argparse
import json
import sys
from pathlib import Path

from .state_manager import StateManager
from .scanner import Scanner
from .exception_queue import ExceptionQueue
from .note_manager import NoteManager
from .exporter import Exporter
from . import ExceptionStatus


def cmd_init(args):
    sm = StateManager(data_dir=args.data_dir)
    sm.reset()
    print("✅ 琴房课时异常提醒系统已初始化")
    print(f"   数据目录: {sm.data_dir}")


def cmd_scan(args):
    sm = StateManager(data_dir=args.data_dir)
    scanner = Scanner(sm)
    record = scanner.scan(args.audio_dir)
    print(f"🔍 扫描完成")
    print(f"   扫描文件数: {record.files_scanned}")
    print(f"   新增材料数: {record.materials_added}")
    print(f"   发现异常数: {record.exceptions_found}")


def cmd_rescan(args):
    sm = StateManager(data_dir=args.data_dir)
    scanner = Scanner(sm)
    record = scanner.rescan(args.audio_dir)
    print(f"🔄 重扫完成")
    print(f"   扫描文件数: {record.files_scanned}")
    print(f"   新增材料数: {record.materials_added}")
    print(f"   发现异常数: {record.exceptions_found}")


def cmd_queue(args):
    sm = StateManager(data_dir=args.data_dir)
    eq = ExceptionQueue(sm)

    if args.action == "summary":
        summary = eq.get_summary()
        print("📋 异常队列概览")
        print(f"   总数: {summary['total']}")
        print(f"   ⏳ 待处理: {summary['pending']}")
        print(f"   ✅ 已处理: {summary['resolved']}")
        print(f"   ✏️  人工改判: {summary['manual_override']}")

        if summary["pending"]:
            print("\n⏳ 待处理项:")
            for item in summary["pending_items"]:
                print(f"   [{item['id']}] {item['filename']}")
                print(f"       类型: {item['type']}")
                print(f"       原因: {item['reason']}")
                print(f"       下一步: {item['next_step']}")

        if summary["resolved"]:
            print("\n✅ 已处理项:")
            for item in summary["resolved_items"]:
                print(f"   [{item['id']}] {item['filename']} → {item['type']} (处理人: {item['resolved_by']})")

        if summary["manual_override"]:
            print("\n✏️  人工改判项:")
            for item in summary["manual_override_items"]:
                reason_str = f" 原因: {item['reason']}" if item["reason"] else ""
                print(f"   [{item['id']}] {item['filename']} → {item['type']} (处理人: {item['resolved_by']}){reason_str}")

    elif args.action == "pending":
        items = eq.list_pending()
        print(f"⏳ 待处理异常 ({len(items)} 条)")
        for item in items:
            print(f"   [{item.id}] {item.material_filename}")
            print(f"       类型: {item.exception_type}")
            print(f"       原因: {item.reason}")
            print(f"       下一步: {item.next_step}")

    elif args.action == "resolved":
        items = eq.list_resolved()
        print(f"✅ 已处理异常 ({len(items)} 条)")
        for item in items:
            print(f"   [{item.id}] {item.material_filename} (处理人: {item.resolved_by}, 时间: {item.resolved_at})")

    elif args.action == "manual":
        items = eq.list_manual_override()
        print(f"✏️  人工改判异常 ({len(items)} 条)")
        for item in items:
            reason_note = next((n for n in item.notes if n.note_type == "manual_override_reason"), None)
            reason_str = f" 原因: {reason_note.content}" if reason_note else ""
            print(f"   [{item.id}] {item.material_filename} (处理人: {item.resolved_by}){reason_str}")


def cmd_resolve(args):
    sm = StateManager(data_dir=args.data_dir)
    eq = ExceptionQueue(sm)
    result = eq.resolve(args.item_id, resolved_by=args.operator, note=args.note or "")
    if result:
        print(f"✅ 异常项 [{args.item_id}] 已标记为已处理")
    else:
        print(f"❌ 未找到异常项 [{args.item_id}]")


def cmd_manual_override(args):
    sm = StateManager(data_dir=args.data_dir)
    eq = ExceptionQueue(sm)
    result = eq.manual_override(args.item_id, resolved_by=args.operator, reason=args.reason or "", note=args.note or "")
    if result:
        print(f"✏️  异常项 [{args.item_id}] 已标记为人工改判")
    else:
        print(f"❌ 未找到异常项 [{args.item_id}]")


def cmd_note(args):
    sm = StateManager(data_dir=args.data_dir)
    nm = NoteManager(sm)

    if args.action == "add":
        result = nm.add_note(args.material_id, args.content, note_type=args.type or "general", author=args.operator)
        if result:
            print(f"📝 备注已添加到材料 [{args.material_id}]")
        else:
            print(f"❌ 未找到材料 [{args.material_id}]")

    elif args.action == "alias":
        result = nm.add_alias(args.material_id, args.alias)
        if result:
            print(f"🔗 别名「{args.alias}」已添加到材料 [{args.material_id}]")
        else:
            print(f"❌ 未找到材料 [{args.material_id}]")

    elif args.action == "rename":
        result = nm.set_canonical_name(args.material_id, args.name)
        if result:
            print(f"✏️  材料 [{args.material_id}] 标准名已更新为「{args.name}」")
        else:
            print(f"❌ 未找到材料 [{args.material_id}]")

    elif args.action == "version":
        result = nm.set_version(args.material_id, int(args.version))
        if result:
            print(f"🔢 材料 [{args.material_id}] 版本已更新为 v{args.version}")
        else:
            print(f"❌ 未找到材料 [{args.material_id}]")

    elif args.action == "list":
        notes = nm.list_notes(args.material_id)
        if notes is not None:
            print(f"📝 材料 [{args.material_id}] 的备注 ({len(notes)} 条)")
            for n in notes:
                print(f"   [{n.note_type}] {n.content} (作者: {n.author}, 时间: {n.created_at})")
        else:
            print(f"❌ 未找到材料 [{args.material_id}]")


def cmd_status(args):
    sm = StateManager(data_dir=args.data_dir)
    sm.load()
    state = sm.state

    print("📊 琴房课时异常提醒 - 当前状态")
    print(f"   材料总数: {len(state.materials)}")
    print(f"   异常队列总数: {len(state.exception_queue)}")
    print(f"   上次扫描时间: {state.last_scan_time or '尚未扫描'}")

    if state.materials:
        print("\n📁 材料列表:")
        for mat in state.materials:
            status_icon = {"normal": "✅", "anomalous": "⚠️", "supplemented": "📝"}.get(mat.status, "❓")
            aliases_str = f" 别名: {mat.aliases}" if mat.aliases else ""
            print(f"   {status_icon} [{mat.id}] {mat.filename} (标准名: {mat.canonical_name}, v{mat.version}){aliases_str}")

    eq = ExceptionQueue(sm)
    summary = eq.get_summary()
    if summary["total"] > 0:
        print(f"\n📋 异常队列: 待处理 {summary['pending']} | 已处理 {summary['resolved']} | 人工改判 {summary['manual_override']}")


def cmd_delivery(args):
    sm = StateManager(data_dir=args.data_dir)
    nm = NoteManager(sm)
    delivery = nm.get_delivery_list()
    print("📦 交付清单")
    print(json.dumps(delivery, ensure_ascii=False, indent=2))


def cmd_export(args):
    sm = StateManager(data_dir=args.data_dir)
    exporter = Exporter(sm)
    target = args.target
    fmt = args.format.lower()
    out = Path(args.output)

    if target in ("queue", "exception", "exceptions"):
        if fmt == "json":
            path = exporter.export_queue_json(out)
        elif fmt in ("csv", "xlsx"):
            if fmt == "xlsx":
                print("⚠️  未安装 openpyxl，将以 CSV 格式导出（可被 Excel 正常打开）。")
            path = exporter.export_queue_csv(out)
        else:
            print(f"❌ 不支持的格式: {fmt}")
            return
    elif target in ("delivery", "materials"):
        if fmt == "json":
            path = exporter.export_delivery_json(out)
        elif fmt in ("csv", "xlsx"):
            if fmt == "xlsx":
                print("⚠️  未安装 openpyxl，将以 CSV 格式导出（可被 Excel 正常打开）。")
            path = exporter.export_delivery_csv(out)
        else:
            print(f"❌ 不支持的格式: {fmt}")
            return
    elif target == "all":
        paths = exporter.export_all(out, prefix=args.prefix or "qinfang")
        print("📤 已导出全部文件:")
        for k, p in paths.items():
            print(f"   - {k}: {p}")
        return
    else:
        print(f"❌ 不支持的导出对象: {target}")
        return
    print(f"📤 导出成功: {path}")
    size = path.stat().st_size
    print(f"   文件大小: {size} 字节")


def main():
    parser = argparse.ArgumentParser(
        prog="qinfang",
        description="琴房课时异常提醒 - 音频材料管理与异常检测",
    )
    parser.add_argument("--data-dir", default=None, help="数据存储目录")
    sub = parser.add_subparsers(dest="command", help="子命令")

    p_init = sub.add_parser("init", help="初始化系统")
    p_init.set_defaults(func=cmd_init)

    p_scan = sub.add_parser("scan", help="扫描音频文件夹")
    p_scan.add_argument("audio_dir", help="音频文件夹路径")
    p_scan.set_defaults(func=cmd_scan)

    p_rescan = sub.add_parser("rescan", help="重扫音频文件夹（先检查已修复异常）")
    p_rescan.add_argument("audio_dir", help="音频文件夹路径")
    p_rescan.set_defaults(func=cmd_rescan)

    p_queue = sub.add_parser("queue", help="查看异常队列")
    p_queue.add_argument("action", choices=["summary", "pending", "resolved", "manual"], help="队列操作")
    p_queue.set_defaults(func=cmd_queue)

    p_resolve = sub.add_parser("resolve", help="标记异常为已处理")
    p_resolve.add_argument("item_id", help="异常项ID")
    p_resolve.add_argument("--operator", default="operator", help="处理人")
    p_resolve.add_argument("--note", default="", help="处理备注")
    p_resolve.set_defaults(func=cmd_resolve)

    p_manual = sub.add_parser("manual", help="标记异常为人工改判")
    p_manual.add_argument("item_id", help="异常项ID")
    p_manual.add_argument("--operator", default="operator", help="处理人")
    p_manual.add_argument("--reason", default="", help="改判原因")
    p_manual.add_argument("--note", default="", help="改判备注")
    p_manual.set_defaults(func=cmd_manual_override)

    p_note = sub.add_parser("note", help="管理材料备注")
    p_note.add_argument("action", choices=["add", "alias", "rename", "version", "list"], help="备注操作")
    p_note.add_argument("material_id", help="材料ID")
    p_note.add_argument("--content", default="", help="备注内容")
    p_note.add_argument("--type", default="general", help="备注类型 (general/rehearsal/authorization)")
    p_note.add_argument("--alias", default="", help="要添加的别名")
    p_note.add_argument("--name", default="", help="新的标准名")
    p_note.add_argument("--version", default="", help="新的版本号")
    p_note.add_argument("--operator", default="operator", help="操作人")
    p_note.set_defaults(func=cmd_note)

    p_status = sub.add_parser("status", help="查看当前状态")
    p_status.set_defaults(func=cmd_status)

    p_delivery = sub.add_parser("delivery", help="查看交付清单")
    p_delivery.set_defaults(func=cmd_delivery)

    p_export = sub.add_parser("export", help="导出异常队列或交付清单")
    p_export.add_argument("target", choices=["queue", "delivery", "all"], help="导出对象: queue(异常队列) / delivery(交付清单) / all(全部)")
    p_export.add_argument("--format", choices=["json", "csv", "xlsx"], default="csv", help="导出格式 (默认 csv，xlsx 会回退到 csv 以兼容 Excel)")
    p_export.add_argument("--output", default="./exports", help="输出文件路径(target=all时为目录)")
    p_export.add_argument("--prefix", default="qinfang", help="导出全部时的文件名前缀")
    p_export.set_defaults(func=cmd_export)

    args = parser.parse_args()
    if not hasattr(args, "func"):
        parser.print_help()
        sys.exit(1)
    args.func(args)


if __name__ == "__main__":
    main()

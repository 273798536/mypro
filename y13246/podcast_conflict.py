#!/usr/bin/env python3
"""
播客片头排期冲突检测工具

三件事：
  1. 启动  python3 podcast_conflict.py run   --data-dir DIR --input INPUT.json
  2. 重跑  python3 podcast_conflict.py rerun  --data-dir DIR --input INPUT.json [--rehearsal-note ID:备注] [--resolve-pending ID:解决备注]
  3. 报告  python3 podcast_conflict.py report --data-dir DIR [--show]

输入JSON格式:
  {
    "entries": [{"podcast_name":"...", "intro_name":"...", "scheduled_date":"2026-06-20", "slot":"evening", "note":"..."}],
    "screenshot_notes": [{"path":"...", "text":"...", "note":"..."}],
    "auth_notes": [{"podcast_name":"...", "expiry_date":"2026-08-01", "note":"授权已续期..."}]
  }

退出码: 0=正常 1=有冲突 2=有待确认 3=错误
状态持久化在 <data-dir>/state.json，报告在 <data-dir>/reports/
"""
import argparse
import json
import os
import sys
from datetime import datetime, date
from pathlib import Path

STATE_FILENAME = "state.json"
REPORTS_DIRNAME = "reports"

EXIT_OK = 0
EXIT_CONFLICT = 1
EXIT_PENDING = 2
EXIT_ERROR = 3


def _now_iso():
    return datetime.now().isoformat(timespec="seconds")


def _today_str():
    return date.today().isoformat()


def _load_state(data_dir):
    path = Path(data_dir) / STATE_FILENAME
    if path.exists():
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except json.JSONDecodeError as e:
            print(json.dumps({"error": f"状态文件损坏: {str(e)}"}, ensure_ascii=False), file=sys.stderr)
            raise
        except IOError as e:
            print(json.dumps({"error": f"状态文件读取失败: {str(e)}"}, ensure_ascii=False), file=sys.stderr)
            raise
    return {
        "version": 1,
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
        "entries": [],
        "screenshot_notes": [],
        "scan_history": [],
        "pending_confirmations": [],
    }


def _save_state(data_dir, state):
    state["updated_at"] = _now_iso()
    path = Path(data_dir) / STATE_FILENAME
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


def _find_entry(state, podcast_name, intro_name):
    for e in state["entries"]:
        if e["podcast_name"] == podcast_name and e["intro_name"] == intro_name:
            return e
    return None


def _add_or_update_entry(state, entry_data, source, note):
    podcast_name = entry_data.get("podcast_name", "")
    intro_name = entry_data.get("intro_name", "")
    existing = _find_entry(state, podcast_name, intro_name)

    if existing:
        new_version = existing["current_version"] + 1
        existing["versions"].append({
            "version": new_version,
            "scheduled_date": entry_data.get("scheduled_date", ""),
            "slot": entry_data.get("slot", ""),
            "source": source,
            "note": note or "",
            "created_at": _now_iso(),
        })
        existing["current_version"] = new_version
        if entry_data.get("scheduled_date"):
            existing["scheduled_date"] = entry_data["scheduled_date"]
        if entry_data.get("slot"):
            existing["slot"] = entry_data["slot"]
        if entry_data.get("delivery_checklist"):
            existing["delivery_checklist"] = entry_data["delivery_checklist"]
        existing["status"] = "active"
        existing["conflict_reason"] = ""
        return existing, new_version
    else:
        new_entry = {
            "id": f"entry_{len(state['entries']) + 1:03d}",
            "podcast_name": podcast_name,
            "intro_name": intro_name,
            "scheduled_date": entry_data.get("scheduled_date", ""),
            "slot": entry_data.get("slot", ""),
            "current_version": 1,
            "versions": [{
                "version": 1,
                "scheduled_date": entry_data.get("scheduled_date", ""),
                "slot": entry_data.get("slot", ""),
                "source": source,
                "note": note or "",
                "created_at": _now_iso(),
            }],
            "auth_status": entry_data.get("auth_status", "active"),
            "auth_expiry_date": entry_data.get("auth_expiry_date", ""),
            "status": "active",
            "conflict_reason": "",
            "delivery_checklist": entry_data.get("delivery_checklist", []),
        }
        state["entries"].append(new_entry)
        return new_entry, 1


def _add_screenshot_note(state, screenshot_data):
    sn = {
        "id": f"screenshot_{len(state['screenshot_notes']) + 1:03d}",
        "path": screenshot_data.get("path", ""),
        "text": screenshot_data.get("text", ""),
        "note": screenshot_data.get("note", ""),
        "created_at": _now_iso(),
        "affected_entries": [],
    }
    state["screenshot_notes"].append(sn)
    return sn


def _detect_schedule_conflicts(state):
    conflicts = []
    entries = state["entries"]
    for i in range(len(entries)):
        for j in range(i + 1, len(entries)):
            a, b = entries[i], entries[j]
            if (a["scheduled_date"] and b["scheduled_date"]
                    and a["scheduled_date"] == b["scheduled_date"]
                    and a["slot"] and b["slot"]
                    and a["slot"] == b["slot"]):
                reason = f"{a['podcast_name']}/{a['intro_name']} 与 {b['podcast_name']}/{b['intro_name']} 在 {a['scheduled_date']} {a['slot']} 时段冲突"
                a["status"] = "conflict"
                b["status"] = "conflict"
                a["conflict_reason"] = reason
                b["conflict_reason"] = reason
                conflicts.append(reason)
    return conflicts


def _has_open_pending(state, entry_id, reason):
    for pc in state["pending_confirmations"]:
        if pc["status"] == "open" and pc["entry_id"] == entry_id and pc["reason"] == reason:
            return True
    return False


def _check_auth_expiry(state, auth_notes):
    pendings = []
    today = _today_str()
    reason_expired = "授权到期"
    for an in auth_notes:
        podcast_name = an.get("podcast_name", "")
        expiry_date = an.get("expiry_date", "")
        note_text = an.get("note", "")
        is_renewal = any(kw in note_text for kw in ["续期", "已续", "已更新", "续约"])
        for entry in state["entries"]:
            if entry["podcast_name"] == podcast_name:
                entry["auth_expiry_date"] = expiry_date
                if is_renewal:
                    entry["auth_status"] = "active"
                    entry["status"] = "active"
                    entry["conflict_reason"] = ""
                elif expiry_date and expiry_date <= today:
                    if _has_open_pending(state, entry["id"], reason_expired):
                        continue
                    entry["auth_status"] = "expired"
                    entry["status"] = "pending_confirmation"
                    pc = {
                        "id": f"pending_{len(state['pending_confirmations']) + 1:03d}",
                        "entry_id": entry["id"],
                        "reason": reason_expired,
                        "impact_scope": f"{entry['podcast_name']}/{entry['intro_name']} 在 {expiry_date} 后不可用",
                        "status": "open",
                        "created_at": _now_iso(),
                        "resolved_at": "",
                        "resolution_note": "",
                    }
                    state["pending_confirmations"].append(pc)
                    pendings.append(pc)
                elif expiry_date:
                    entry["auth_status"] = "active"
                else:
                    if _has_open_pending(state, entry["id"], reason_expired):
                        continue
                    entry["auth_status"] = "expired"
                    entry["status"] = "pending_confirmation"
                    pc = {
                        "id": f"pending_{len(state['pending_confirmations']) + 1:03d}",
                        "entry_id": entry["id"],
                        "reason": reason_expired,
                        "impact_scope": f"{entry['podcast_name']}/{entry['intro_name']} 授权已到期",
                        "status": "open",
                        "created_at": _now_iso(),
                        "resolved_at": "",
                        "resolution_note": "",
                    }
                    state["pending_confirmations"].append(pc)
                    pendings.append(pc)
    return pendings


def _check_screenshot_auth(state, screenshot_data):
    text = screenshot_data.get("text", "")
    note = screenshot_data.get("note", "")
    combined = text + note
    pendings = []
    auth_keywords = ["授权到期", "授权过期", "授权失效", "到期", "过期"]
    has_auth_issue = any(kw in combined for kw in auth_keywords)
    reason = "排练群截图显示授权到期，待确认"
    if has_auth_issue:
        for entry in state["entries"]:
            if _has_open_pending(state, entry["id"], reason):
                continue
            if entry["auth_status"] != "expired":
                entry["auth_status"] = "pending_confirmation"
                entry["status"] = "pending_confirmation"
                pc = {
                    "id": f"pending_{len(state['pending_confirmations']) + 1:03d}",
                    "entry_id": entry["id"],
                    "reason": reason,
                    "impact_scope": f"{entry['podcast_name']}/{entry['intro_name']} 授权状态需确认",
                    "status": "open",
                    "created_at": _now_iso(),
                    "resolved_at": "",
                    "resolution_note": "",
                }
                state["pending_confirmations"].append(pc)
                pendings.append(pc)
    return pendings


def _add_rehearsal_note(state, entry_id, note_text):
    for entry in state["entries"]:
        if entry["id"] == entry_id or (entry["podcast_name"] + "/" + entry["intro_name"] == entry_id):
            new_version = entry["current_version"] + 1
            entry["versions"].append({
                "version": new_version,
                "scheduled_date": entry["scheduled_date"],
                "slot": entry["slot"],
                "source": "排练备注",
                "note": note_text,
                "created_at": _now_iso(),
            })
            entry["current_version"] = new_version
            return entry
    return None


def _resolve_pending(state, pending_id, resolution_note):
    for pc in state["pending_confirmations"]:
        if pc["id"] == pending_id and pc["status"] == "open":
            pc["status"] = "resolved"
            pc["resolved_at"] = _now_iso()
            pc["resolution_note"] = resolution_note
            for entry in state["entries"]:
                if entry["id"] == pc["entry_id"]:
                    if "授权" in pc["reason"]:
                        entry["auth_status"] = "active"
                    entry["status"] = "active"
                    entry["conflict_reason"] = ""
            return pc
    return None


def _generate_markdown_report(state, data_dir):
    reports_dir = Path(data_dir) / REPORTS_DIRNAME
    reports_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"report_{ts}.md"
    filepath = reports_dir / filename

    lines = []
    lines.append(f"# 播客片头排期冲突报告")
    lines.append(f"")
    lines.append(f"- 生成时间: {_now_iso()}")
    lines.append(f"- 数据版本: v{state['version']}")
    lines.append(f"- 创建时间: {state['created_at']}")
    lines.append(f"- 最后更新: {state['updated_at']}")
    lines.append(f"")

    lines.append(f"## 排期条目 ({len(state['entries'])} 条)")
    lines.append(f"")
    for entry in state["entries"]:
        status_label = {
            "active": "✅ 正常",
            "conflict": "⚠️ 冲突",
            "pending_confirmation": "❓ 待确认",
        }.get(entry["status"], entry["status"])
        auth_label = {
            "active": "✅ 有效",
            "expired": "❌ 已到期",
            "pending_confirmation": "❓ 待确认",
        }.get(entry["auth_status"], entry["auth_status"])
        lines.append(f"### {entry['podcast_name']} / {entry['intro_name']}")
        lines.append(f"")
        lines.append(f"- 条目ID: `{entry['id']}`")
        lines.append(f"- 排期日期: {entry['scheduled_date'] or '未定'}")
        lines.append(f"- 时段: {entry['slot'] or '未定'}")
        lines.append(f"- 当前版本: v{entry['current_version']}")
        lines.append(f"- 状态: {status_label}")
        lines.append(f"- 授权: {auth_label}" + (f" (到期日: {entry['auth_expiry_date']})" if entry.get("auth_expiry_date") else ""))
        if entry["conflict_reason"]:
            lines.append(f"- 冲突原因: {entry['conflict_reason']}")
        if entry.get("delivery_checklist"):
            lines.append(f"- 交付清单:")
            for item in entry["delivery_checklist"]:
                lines.append(f"  - {item}")
        lines.append(f"")
        lines.append(f"**版本历史:**")
        lines.append(f"")
        lines.append(f"| 版本 | 日期 | 时段 | 来源 | 备注 | 时间 |")
        lines.append(f"| --- | --- | --- | --- | --- | --- |")
        for v in entry["versions"]:
            lines.append(f"| v{v['version']} | {v['scheduled_date'] or '-'} | {v['slot'] or '-'} | {v['source']} | {v['note'] or '-'} | {v['created_at'][:16]} |")
        lines.append(f"")

    if state["screenshot_notes"]:
        lines.append(f"## 排练群截图备注 ({len(state['screenshot_notes'])} 条)")
        lines.append(f"")
        for sn in state["screenshot_notes"]:
            lines.append(f"### {sn['id']}")
            lines.append(f"")
            lines.append(f"- 路径: `{sn['path'] or '无'}`")
            lines.append(f"- 识别文本: {sn['text'] or '无'}")
            lines.append(f"- 备注: {sn['note'] or '无'}")
            lines.append(f"- 记录时间: {sn['created_at']}")
            if sn.get("affected_entries"):
                lines.append(f"- 关联条目: {', '.join(sn['affected_entries'])}")
            lines.append(f"")

    if state["pending_confirmations"]:
        lines.append(f"## 待确认项 ({len(state['pending_confirmations'])} 条)")
        lines.append(f"")
        for pc in state["pending_confirmations"]:
            status_icon = "🔴" if pc["status"] == "open" else "🟢"
            lines.append(f"### {status_icon} {pc['id']}")
            lines.append(f"")
            lines.append(f"- 关联条目: `{pc['entry_id']}`")
            lines.append(f"- 原因: {pc['reason']}")
            lines.append(f"- 影响范围: {pc['impact_scope']}")
            lines.append(f"- 状态: {pc['status']}")
            lines.append(f"- 创建时间: {pc['created_at']}")
            if pc["status"] == "resolved":
                lines.append(f"- 解决时间: {pc['resolved_at']}")
                lines.append(f"- 解决备注: {pc['resolution_note']}")
            lines.append(f"")

    if state["scan_history"]:
        lines.append(f"## 扫描历史 ({len(state['scan_history'])} 次)")
        lines.append(f"")
        lines.append(f"| 扫描ID | 时间 | 类型 | 变更 |")
        lines.append(f"| --- | --- | --- | --- |")
        for sh in state["scan_history"]:
            changes = "; ".join(sh.get("changes", [])) or "无变更"
            lines.append(f"| {sh['scan_id']} | {sh['timestamp'][:16]} | {sh['type']} | {changes} |")
        lines.append(f"")

    report_content = "\n".join(lines)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(report_content)

    latest_path = Path(data_dir) / REPORTS_DIRNAME / "report_latest.md"
    with open(latest_path, "w", encoding="utf-8") as f:
        f.write(report_content)

    return str(filepath)


def _load_input_data(args):
    input_data = {}
    if args.input:
        try:
            with open(args.input, "r", encoding="utf-8") as f:
                input_data = json.load(f)
        except FileNotFoundError:
            print(json.dumps({"error": f"输入文件不存在: {args.input}"}, ensure_ascii=False), file=sys.stderr)
            return None, EXIT_ERROR
        except json.JSONDecodeError as e:
            print(json.dumps({"error": f"输入文件JSON格式错误: {str(e)}"}, ensure_ascii=False), file=sys.stderr)
            return None, EXIT_ERROR
    else:
        try:
            input_data = {
                "entries": json.loads(args.entries) if args.entries else [],
                "screenshot_notes": json.loads(args.screenshots) if args.screenshots else [],
                "auth_notes": json.loads(args.auth_notes) if args.auth_notes else [],
            }
        except json.JSONDecodeError as e:
            print(json.dumps({"error": f"参数JSON格式错误: {str(e)}"}, ensure_ascii=False), file=sys.stderr)
            return None, EXIT_ERROR
    return input_data, EXIT_OK


def cmd_run(args):
    data_dir = args.data_dir
    state = _load_state(data_dir)

    input_data, err = _load_input_data(args)
    if err != EXIT_OK:
        return err

    changes = []
    scan_id = f"scan_{len(state['scan_history']) + 1:03d}"

    for entry_data in input_data.get("entries", []):
        source = entry_data.get("source", "参数输入")
        note = entry_data.get("note", "")
        entry, ver = _add_or_update_entry(state, entry_data, source, note)
        changes.append(f"条目 {entry['podcast_name']}/{entry['intro_name']} 更新至 v{ver}")

    for sn_data in input_data.get("screenshot_notes", []):
        sn = _add_screenshot_note(state, sn_data)
        changes.append(f"截图备注 {sn['id']} 已添加")
        pendings = _check_screenshot_auth(state, sn_data)
        if pendings:
            for pc in pendings:
                changes.append(f"待确认: {pc['reason']} — {pc['impact_scope']}")

    for an_data in input_data.get("auth_notes", []):
        pendings = _check_auth_expiry(state, [an_data])
        if pendings:
            for pc in pendings:
                changes.append(f"待确认: {pc['reason']} — {pc['impact_scope']}")

    open_pending_entry_ids = {pc["entry_id"] for pc in state["pending_confirmations"] if pc["status"] == "open"}
    for entry in state["entries"]:
        if entry["id"] not in open_pending_entry_ids:
            entry["status"] = "active"
        entry["conflict_reason"] = ""

    conflicts = _detect_schedule_conflicts(state)
    for c in conflicts:
        changes.append(f"冲突: {c}")

    if args.rehearsal_note:
        parts = args.rehearsal_note.split(":", 1)
        entry_id = parts[0]
        note_text = parts[1] if len(parts) > 1 else args.rehearsal_note
        result = _add_rehearsal_note(state, entry_id, note_text)
        if result:
            changes.append(f"排练备注已添加至 {result['podcast_name']}/{result['intro_name']} v{result['current_version']}")
        else:
            changes.append(f"排练备注未找到匹配条目: {entry_id}")

    state["scan_history"].append({
        "scan_id": scan_id,
        "timestamp": _now_iso(),
        "type": "initial",
        "changes": changes,
    })

    _save_state(data_dir, state)
    report_path = _generate_markdown_report(state, data_dir)

    has_conflicts = any(e["status"] == "conflict" for e in state["entries"])
    has_pending = any(pc["status"] == "open" for pc in state["pending_confirmations"])

    result = {
        "scan_id": scan_id,
        "changes": changes,
        "report": report_path,
        "has_conflicts": has_conflicts,
        "has_pending_confirmations": has_pending,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))

    if has_pending:
        return EXIT_PENDING
    if has_conflicts:
        return EXIT_CONFLICT
    return EXIT_OK


def cmd_rerun(args):
    data_dir = args.data_dir
    state = _load_state(data_dir)

    if not state["entries"] and not state["screenshot_notes"]:
        print(json.dumps({"error": "无历史数据，请先执行 run"}, ensure_ascii=False), file=sys.stderr)
        return EXIT_ERROR

    input_data, err = _load_input_data(args)
    if err != EXIT_OK:
        return err

    changes = []
    judgments_changed = []
    scan_id = f"scan_{len(state['scan_history']) + 1:03d}"

    old_statuses = {e["id"]: e["status"] for e in state["entries"]}

    for entry_data in input_data.get("entries", []):
        source = entry_data.get("source", "重跑输入")
        note = entry_data.get("note", "")
        entry, ver = _add_or_update_entry(state, entry_data, source, note)
        changes.append(f"条目 {entry['podcast_name']}/{entry['intro_name']} 更新至 v{ver}")

    for sn_data in input_data.get("screenshot_notes", []):
        sn = _add_screenshot_note(state, sn_data)
        changes.append(f"截图备注 {sn['id']} 已添加")
        pendings = _check_screenshot_auth(state, sn_data)
        if pendings:
            for pc in pendings:
                changes.append(f"待确认: {pc['reason']} — {pc['impact_scope']}")

    for an_data in input_data.get("auth_notes", []):
        pendings = _check_auth_expiry(state, [an_data])
        if pendings:
            for pc in pendings:
                changes.append(f"待确认: {pc['reason']} — {pc['impact_scope']}")

    if args.rehearsal_note:
        parts = args.rehearsal_note.split(":", 1)
        entry_id = parts[0]
        note_text = parts[1] if len(parts) > 1 else args.rehearsal_note
        result = _add_rehearsal_note(state, entry_id, note_text)
        if result:
            changes.append(f"排练备注已添加至 {result['podcast_name']}/{result['intro_name']} v{result['current_version']}")
        else:
            changes.append(f"排练备注未找到匹配条目: {entry_id}")

    if args.resolve_pending:
        for rp in args.resolve_pending:
            parts = rp.split(":", 1)
            pid = parts[0]
            rnote = parts[1] if len(parts) > 1 else "人工确认"
            resolved = _resolve_pending(state, pid, rnote)
            if resolved:
                changes.append(f"待确认项 {pid} 已解决: {rnote}")
            else:
                changes.append(f"待确认项 {pid} 未找到或已解决")

    open_pending_entry_ids = {pc["entry_id"] for pc in state["pending_confirmations"] if pc["status"] == "open"}
    for entry in state["entries"]:
        if entry["id"] not in open_pending_entry_ids:
            entry["status"] = "active"
        entry["conflict_reason"] = ""

    conflicts = _detect_schedule_conflicts(state)
    for c in conflicts:
        changes.append(f"冲突: {c}")

    for entry in state["entries"]:
        old_status = old_statuses.get(entry["id"], "")
        if old_status != entry["status"]:
            judgments_changed.append(
                f"{entry['podcast_name']}/{entry['intro_name']}: {old_status or '新'} → {entry['status']}"
            )

    state["scan_history"].append({
        "scan_id": scan_id,
        "timestamp": _now_iso(),
        "type": "rerun",
        "changes": changes,
    })

    _save_state(data_dir, state)
    report_path = _generate_markdown_report(state, data_dir)

    has_conflicts = any(e["status"] == "conflict" for e in state["entries"])
    has_pending = any(pc["status"] == "open" for pc in state["pending_confirmations"])

    result = {
        "scan_id": scan_id,
        "changes": changes,
        "judgments_changed": judgments_changed,
        "report": report_path,
        "has_conflicts": has_conflicts,
        "has_pending_confirmations": has_pending,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))

    if has_pending:
        return EXIT_PENDING
    if has_conflicts:
        return EXIT_CONFLICT
    return EXIT_OK


def cmd_report(args):
    data_dir = args.data_dir
    state = _load_state(data_dir)

    if not state["entries"] and not state["screenshot_notes"]:
        print(json.dumps({"error": "无数据，请先执行 run"}, ensure_ascii=False), file=sys.stderr)
        return EXIT_ERROR

    report_path = _generate_markdown_report(state, data_dir)

    if args.show:
        latest = Path(data_dir) / REPORTS_DIRNAME / "report_latest.md"
        if latest.exists():
            with open(latest, "r", encoding="utf-8") as f:
                print(f.read())
        else:
            print(f"报告文件不存在: {latest}", file=sys.stderr)
            return EXIT_ERROR

    result = {"report": report_path}
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return EXIT_OK


def main():
    parser = argparse.ArgumentParser(
        prog="podcast_conflict",
        description="播客片头排期冲突检测工具",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    p_run = subparsers.add_parser("run", help="启动扫描")
    p_run.add_argument("--data-dir", default="./podcast_conflict_data")
    p_run.add_argument("--input", help="输入JSON文件路径")
    p_run.add_argument("--entries", help="排期条目JSON数组")
    p_run.add_argument("--screenshots", help="截图备注JSON数组")
    p_run.add_argument("--auth-notes", help="授权备注JSON数组")
    p_run.add_argument("--rehearsal-note", help="排练备注 格式: 条目ID:备注内容")

    p_rerun = subparsers.add_parser("rerun", help="重跑扫描")
    p_rerun.add_argument("--data-dir", default="./podcast_conflict_data")
    p_rerun.add_argument("--input", help="输入JSON文件路径")
    p_rerun.add_argument("--entries", help="排期条目JSON数组")
    p_rerun.add_argument("--screenshots", help="截图备注JSON数组")
    p_rerun.add_argument("--auth-notes", help="授权备注JSON数组")
    p_rerun.add_argument("--rehearsal-note", help="排练备注 格式: 条目ID:备注内容")
    p_rerun.add_argument("--resolve-pending", nargs="*", help="解决待确认项 格式: 待确认ID:解决备注")

    p_report = subparsers.add_parser("report", help="查看Markdown报告")
    p_report.add_argument("--data-dir", default="./podcast_conflict_data")
    p_report.add_argument("--show", action="store_true", help="输出报告内容到终端")

    args = parser.parse_args()

    try:
        if args.command == "run":
            sys.exit(cmd_run(args))
        elif args.command == "rerun":
            sys.exit(cmd_rerun(args))
        elif args.command == "report":
            sys.exit(cmd_report(args))
    except SystemExit:
        raise
    except Exception as e:
        print(json.dumps({"error": f"执行异常: {type(e).__name__}: {str(e)}"}, ensure_ascii=False), file=sys.stderr)
        sys.exit(EXIT_ERROR)


if __name__ == "__main__":
    main()

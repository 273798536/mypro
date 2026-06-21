from __future__ import annotations

import argparse
import json
import sys
from typing import List

from sample_checker import (
    SamplePackage,
    SampleItem,
    Note,
    NoteType,
    CheckStatus,
    IdempotencyGuard,
    SampleAnomalyDetector,
    HistoryTracker,
    CrossValidator,
    DeliveryChecklist,
    DeliveryChecklistItem,
)


def build_demo_package() -> SamplePackage:
    pkg = SamplePackage(name="公演A场采样包 v1.0", version="v1.0")

    pkg.items = [
        SampleItem(
            name="kick_drum_loop.wav",
            file_path="audio/drums/kick_drum_loop.wav",
            duration_sec=8.0,
            sample_rate=44100,
            bit_depth=24,
            timecode_offset_beats=0.0,
            checksum="a1b2c3d4e5f6",
            channel_count=2,
        ),
        SampleItem(
            name="snare_hd.wav",
            file_path="audio/drums/snare_hd.wav",
            duration_sec=0.15,
            sample_rate=48000,
            bit_depth=16,
            timecode_offset_beats=0.0,
            checksum="bb11cc22dd33",
            channel_count=2,
        ),
        SampleItem(
            name="synth_pad_intro.wav",
            file_path="audio/synths/synth_pad_intro.wav",
            duration_sec=12.5,
            sample_rate=44100,
            bit_depth=24,
            timecode_offset_beats=0.49,
            checksum="ee55ff66aa77",
            channel_count=2,
        ),
        SampleItem(
            name="vocal_chop_01.wav",
            file_path="audio/vox/vocal_chop_01.wav",
            duration_sec=2.3,
            sample_rate=22050,
            bit_depth=8,
            timecode_offset_beats=0.0,
            checksum="",
            channel_count=6,
        ),
        SampleItem(
            name="hihat_pattern.wav",
            file_path="audio/drums/hihat_pattern.wav",
            duration_sec=4.0,
            sample_rate=44100,
            bit_depth=24,
            timecode_offset_beats=1.20,
            checksum="1234567890ab",
            channel_count=1,
        ),
    ]

    pkg.delivery_checklist = DeliveryChecklist(
        checklist_version="v1.0",
        items=[
            DeliveryChecklistItem(name="底鼓循环", expected=True, found=True),
            DeliveryChecklistItem(name="军鼓", expected=True, found=True),
            DeliveryChecklistItem(name="合成铺垫", expected=True, found=True),
            DeliveryChecklistItem(name="人声切片", expected=True, found=False),
            DeliveryChecklistItem(name="踩镲", expected=True, found=True),
        ],
    )

    return pkg


def print_record(record, title="扫描结果"):
    print()
    print("=" * 70)
    print(f"  {title}")
    print("=" * 70)
    print(f"扫描ID : {record.record_id}")
    print(f"包ID   : {record.package_id}")
    print(f"扫描时间: {record.scanned_at}   操作人: {record.operator or '（未填）'}")
    print(f"舞台通道备注已应用: {record.stage_channel_note_applied}")
    print(f"音乐老师改判已应用: {record.teacher_edit_applied}")
    print(f"排练确认备注已应用: {record.rehearsal_note_applied}")
    print(f"备注签名数 (已去重): {len(record.note_signatures_seen)}")
    print()
    print("-- 检测条目 --")
    status_sym = {
        "pass": "✅",
        "warning": "⚠️ ",
        "fail": "❌",
        "hang": "⏸️ ",
        "pending": "⏳",
    }
    for i, r in enumerate(record.results, 1):
        sym = status_sym.get(r.status.value, "?")
        print(f" {i:>2}. {sym} [{r.status.value.upper():>7}] {r.title}")
        if r.detail:
            print(f"     {r.detail}")
        if r.requires_confirm_role:
            print(f"     >>> 需要确认角色：{r.requires_confirm_role}")
        if r.changed_by_note_ids:
            print(f"     >>> 受备注影响：{r.changed_by_note_ids}")
    print()
    print("-- 交叉对齐（旧版本↔人工批注↔交付清单） --")
    cv = "✅ 通过" if record.cross_validation_ok else "⚠️ 存在问题"
    print(f"总体: {cv}")
    for iss in record.cross_validation_issues:
        print(f"  - {iss}")


def demo_workflow():
    print("【演示】采样包素材异常提醒 · 完整换班场景")
    print("场景：两次相同压测 → 补舞台通道备注 → 时码半拍挂起 → 补排练备注重扫 → 交接班")
    print()

    pkg = build_demo_package()

    detector = SampleAnomalyDetector()
    idem = IdempotencyGuard()
    hist = HistoryTracker()
    cross = CrossValidator()

    # ========== 1. 第一次扫描 ==========
    print(">>> [1/6] 第一次扫描（无任何备注）")
    hist.snapshot_package(pkg, changed_by="系统", changed_reason="建包初始基线")
    rec1 = detector.scan(pkg, operator="白班小王", idem_guard=idem)
    prev = None
    cross.apply(pkg, rec1, prev)
    hist.record_scan(pkg, rec1)
    print_record(rec1, "第一次扫描")

    # ========== 2. 第二次：相同请求压测 ==========
    print(">>> [2/6] 相同请求第二次扫描（幂等测试：一条备注也没加，看看会不会重复算）")
    rec2 = detector.scan(pkg, operator="白班小王", idem_guard=idem)
    cross.apply(pkg, rec2, rec1)
    hist.record_scan(pkg, rec2)
    print_record(rec2, "第二次扫描（幂等验证）")

    # ========== 3. 补一条舞台通道表备注 ==========
    print(">>> [3/6] 临时补舞台通道表备注：vocal_chop 声道数是故意设计，按通道表配置正确")
    stage_note = Note(
        note_type=NoteType.STAGE_CHANNEL,
        content="舞台通道表 v2.1：vocal_chop_01 走 LCR+环绕，声道数6为正确配置；采样率 22050 系特殊音效压缩要求。",
        author="舞台组·小张",
        affects_fields=["channels", "sr_standard", "vocal", "checksum"],
    )
    pkg.add_note(stage_note)
    hist.snapshot_package(pkg, changed_by="舞台组·小张", changed_reason="补舞台通道表备注")

    rec3 = detector.scan(pkg, operator="白班小王", idem_guard=idem)
    cross.apply(pkg, rec3, rec2)
    hist.record_scan(pkg, rec3)
    print_record(rec3, "第三次扫描：应用舞台通道备注")

    # ========== 4. 林姐临时改判断 ==========
    print(">>> [4/6] 音乐老师林姐临时改：snare 时长 0.15s 是故意设计的极短军鼓，不要报警")
    teacher_note = Note(
        note_type=NoteType.TEACHER_EDIT,
        content="林姐：snare_hd 时长 0.15s 为特意保留的极短打击感，无需时长警告。",
        author="音乐老师·林姐",
        affects_fields=["duration_min", "snare"],
    )
    pkg.add_note(teacher_note)
    hist.snapshot_package(pkg, changed_by="音乐老师·林姐", changed_reason="临改snare时长判定")

    rec4 = detector.scan(pkg, operator="白班小王", idem_guard=idem)
    cross.apply(pkg, rec4, rec3)
    hist.record_scan(pkg, rec4)
    print_record(rec4, "第四次：林姐改判")

    # ========== 5. 补排练/授权备注再重扫 ==========
    print(">>> [5/6] 补排练备注 + 主管确认时码半拍，然后重扫")
    rehearsal_note = Note(
        note_type=NoteType.REHEARSAL,
        content="6月15日彩排确认：synth_pad_intro 半拍偏移为入场设计，故意为之。",
        author="运营主管·老赵",
        affects_fields=["timecode_half_beat_hang", "synth"],
    )
    pkg.add_note(rehearsal_note)
    pkg.manual_annotations.append("【主管确认】synth_pad_intro 时码偏半拍 已由老赵 6/15 彩排确认OK")
    pkg.manual_annotations.append("人声切片缺少：vocal_chop_01 素材6月16日下午重新交付")
    pkg.version = "v1.1"
    hist.snapshot_package(pkg, changed_by="运营主管·老赵", changed_reason="补排练备注+升版v1.1")

    rec5 = detector.scan(pkg, operator="白班小王", idem_guard=idem)
    cross.apply(pkg, rec5, rec4)
    hist.record_scan(pkg, rec5)
    print_record(rec5, "第五次：补排练备注重扫 + 交叉对齐")

    # ========== 6. 交接班摘要 ==========
    print()
    print(">>> [6/6] 生成交接班摘要（给下一班看，不只是最终结果）")
    print()
    print(hist.handoff_summary(pkg, rec5))

    print()
    print("【演示完毕】所有文件结构和核心逻辑已就绪。")
    print("运行 python -m pytest tests/ 可执行单元测试。")


def cmd_scan(args):
    try:
        with open(args.input, "r", encoding="utf-8") as f:
            raw = json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        print(f"读取输入失败: {e}", file=sys.stderr)
        sys.exit(1)

    pkg = SamplePackage(
        package_id=raw.get("package_id", ""),
        name=raw.get("name", "未命名包"),
        version=raw.get("version", "v1.0"),
        manual_annotations=raw.get("manual_annotations", []),
    )
    for it in raw.get("items", []):
        pkg.items.append(SampleItem(**it))
    for n in raw.get("notes", []):
        pkg.notes.append(Note(
            note_id=n.get("note_id"),
            note_type=NoteType(n.get("note_type", "other")),
            content=n.get("content", ""),
            author=n.get("author", ""),
            affects_fields=n.get("affects_fields", []),
        ))
    cl_raw = raw.get("delivery_checklist")
    if cl_raw:
        pkg.delivery_checklist = DeliveryChecklist(
            checklist_version=cl_raw.get("checklist_version", "v1.0"),
            items=[
                DeliveryChecklistItem(**i) for i in cl_raw.get("items", [])
            ],
        )

    detector = SampleAnomalyDetector()
    idem = IdempotencyGuard()
    hist = HistoryTracker()
    cross = CrossValidator()

    hist.snapshot_package(pkg, changed_by=args.operator or "cli", changed_reason="CLI扫描")
    rec = detector.scan(pkg, operator=args.operator or "", idem_guard=idem)
    cross.apply(pkg, rec, None)
    hist.record_scan(pkg, rec)
    print_record(rec, title=f"CLI 扫描 {pkg.name}")

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(rec.to_dict(), f, ensure_ascii=False, indent=2)
        print(f"结果已写出: {args.output}")

    if args.handoff:
        print()
        print(hist.handoff_summary(pkg, rec))


def main():
    parser = argparse.ArgumentParser(
        prog="sample_checker",
        description="采样包素材异常提醒 CLI",
    )
    sub = parser.add_subparsers(dest="cmd")

    p_demo = sub.add_parser("demo", help="运行完整交接班演示场景")

    p_scan = sub.add_parser("scan", help="扫描一个 JSON 描述的采样包")
    p_scan.add_argument("--input", "-i", required=True, help="输入 JSON 文件")
    p_scan.add_argument("--output", "-o", help="输出结果 JSON 文件")
    p_scan.add_argument("--operator", "-u", default="", help="操作人")
    p_scan.add_argument("--handoff", action="store_true", help="同时打印交接班摘要")

    args = parser.parse_args()
    if args.cmd == "demo" or args.cmd is None:
        demo_workflow()
    elif args.cmd == "scan":
        cmd_scan(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()

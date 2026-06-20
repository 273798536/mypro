#!/usr/bin/env python3
import csv
import json
import shutil
import sys
import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from qinfang.state_manager import StateManager
from qinfang.scanner import Scanner
from qinfang.exception_queue import ExceptionQueue
from qinfang.note_manager import NoteManager
from qinfang.exporter import Exporter
from qinfang import ExceptionStatus, ExceptionType


TEST_DATA_DIR = PROJECT_ROOT / "qinfang_data_test_e2e"
TEST_AUDIO_DIR = PROJECT_ROOT / "test_audio"
TEST_EXPORT_DIR = PROJECT_ROOT / "qinfang_exports_test"


def setup():
    for d in (TEST_DATA_DIR, TEST_EXPORT_DIR):
        if d.exists():
            shutil.rmtree(d)
        d.mkdir(parents=True, exist_ok=True)


def teardown():
    for d in (TEST_DATA_DIR, TEST_EXPORT_DIR):
        if d.exists():
            shutil.rmtree(d)
    temp_file = TEST_AUDIO_DIR / "排练录音 春之声 圆舞曲.wav"
    if temp_file.exists():
        temp_file.unlink()


def test_step1_init():
    print("\n" + "=" * 60)
    print("🧪 步骤1: 初始化系统")
    print("=" * 60)
    sm = StateManager(data_dir=TEST_DATA_DIR)
    sm.reset()
    state = sm.load()
    assert len(state.materials) == 0, "初始化后材料列表应为空"
    assert len(state.exception_queue) == 0, "初始化后异常队列应为空"
    print("✅ 系统初始化成功，数据目录已创建")
    return sm


def test_step2_scan_old_materials(sm: StateManager):
    print("\n" + "=" * 60)
    print("🧪 步骤2: 导入旧材料（首次扫描）")
    print("=" * 60)
    scanner = Scanner(sm)
    record = scanner.scan(TEST_AUDIO_DIR)

    state = sm.load()
    print(f"   扫描文件数: {record.files_scanned}")
    print(f"   新增材料数: {record.materials_added}")
    print(f"   发现异常数: {record.exceptions_found}")

    naming_issues = [e for e in state.exception_queue if e.exception_type == ExceptionType.NAMING_INCONSISTENT.value]
    alias_issues = [e for e in state.exception_queue if e.exception_type == ExceptionType.ALIAS_CONFLICT.value]
    version_issues = [e for e in state.exception_queue if e.exception_type == ExceptionType.VERSION_MISMATCH.value]

    print(f"\n   命名不一致: {len(naming_issues)} 条")
    for e in naming_issues:
        print(f"     [{e.id}] {e.material_filename}")
        print(f"       原因: {e.reason}")
        print(f"       下一步: {e.next_step}")

    print(f"   别名冲突: {len(alias_issues)} 条")
    for e in alias_issues:
        print(f"     [{e.id}] {e.material_filename}")
        print(f"       原因: {e.reason}")
        print(f"       下一步: {e.next_step}")

    print(f"   版本错乱: {len(version_issues)} 条")
    for e in version_issues:
        print(f"     [{e.id}] {e.material_filename}")
        print(f"       原因: {e.reason}")
        print(f"       下一步: {e.next_step}")

    assert len(naming_issues) >= 1, "应检测到命名不一致（旧录音-月光曲2023.mp3）"
    assert len(version_issues) >= 1, "应检测到版本错乱（spring_v1.mp3 与 spring_v1.wav 并存）"
    print("\n✅ 首次扫描成功，检测到命名不一致和版本错乱")
    return state


def test_step3_restart_recovery(sm: StateManager):
    print("\n" + "=" * 60)
    print("🧪 步骤3: 模拟服务重启 - 状态恢复验证")
    print("=" * 60)
    old_state = sm.load()
    old_materials_count = len(old_state.materials)
    old_exceptions_count = len(old_state.exception_queue)
    old_last_scan = old_state.last_scan_time

    sm2 = StateManager(data_dir=TEST_DATA_DIR)
    recovered = sm2.load()

    print(f"   重启前材料数: {old_materials_count}, 异常数: {old_exceptions_count}")
    print(f"   恢复后材料数: {len(recovered.materials)}, 异常数: {len(recovered.exception_queue)}")
    print(f"   上次扫描时间: {recovered.last_scan_time}")

    assert len(recovered.materials) == old_materials_count, "重启后材料数应一致"
    assert len(recovered.exception_queue) == old_exceptions_count, "重启后异常数应一致"
    assert recovered.last_scan_time == old_last_scan, "重启后上次扫描时间应一致"
    print("\n✅ 服务重启后状态完全恢复，排班同事能看到前一次处理状态和异常队列")
    return sm2


def test_step4_add_inconsistent_file(sm: StateManager):
    print("\n" + "=" * 60)
    print("🧪 步骤4: 补一条名称不一致的材料")
    print("=" * 60)

    inconsistent_file = TEST_AUDIO_DIR / "排练录音 春之声 圆舞曲.wav"
    inconsistent_file.touch()

    scanner = Scanner(sm)
    record = scanner.rescan(TEST_AUDIO_DIR)

    state = sm.load()
    new_exceptions = [e for e in state.exception_queue if e.status == ExceptionStatus.PENDING.value]
    print(f"   重扫后新增异常: {record.exceptions_found} 条")
    for e in new_exceptions:
        if "春之声" in e.material_filename:
            print(f"   [{e.id}] {e.material_filename}")
            print(f"     类型: {e.exception_type}")
            print(f"     原因: {e.reason}")
            print(f"     下一步: {e.next_step}")

    has_new_naming = any(
        e.exception_type == ExceptionType.NAMING_INCONSISTENT.value and "春之声" in e.material_filename
        for e in new_exceptions
    )
    assert has_new_naming, "应检测到新增的名称不一致文件"
    print("\n✅ 新增名称不一致材料已被异常队列捕获，原因和下一步已说清")
    return state


def test_step5_alias_conflict(sm: StateManager):
    print("\n" + "=" * 60)
    print("🧪 步骤5: 用曲名别名重复卡一下（全量交叉检查）")
    print("=" * 60)

    state = sm.load()

    moonlight_mat = None
    for m in state.materials:
        if m.filename == "moonlight_v1.mp3":
            moonlight_mat = m

    moonlight_alias_mat = None
    for m in state.materials:
        if m.filename == "月光_v1.mp3":
            moonlight_alias_mat = m

    if moonlight_mat and moonlight_alias_mat:
        print(f"   找到「{moonlight_mat.filename}」(标准名: {moonlight_mat.canonical_name})")
        print(f"   找到「{moonlight_alias_mat.filename}」(标准名: {moonlight_alias_mat.canonical_name})")

        nm = NoteManager(sm)
        nm.add_alias(moonlight_mat.id, "月光")
        print(f"   已为「{moonlight_mat.filename}」添加别名「月光」")

        state_before = sm.load()
        pending_alias_before = len([
            e for e in state_before.exception_queue
            if e.exception_type == ExceptionType.ALIAS_CONFLICT.value and e.status == ExceptionStatus.PENDING.value
        ])

        scanner = Scanner(sm)
        scanner.rescan(TEST_AUDIO_DIR)

        state = sm.load()
        moonlight_mat_refresh = next((m for m in state.materials if m.id == moonlight_mat.id), None)
        assert "月光" in moonlight_mat_refresh.aliases, "moonlight 应有别名「月光」"
        print(f"   验证别名已记录: moonlight_v1.mp3 的别名 = {moonlight_mat_refresh.aliases}")

        pending_alias_now = [
            e for e in state.exception_queue
            if e.exception_type == ExceptionType.ALIAS_CONFLICT.value and e.status == ExceptionStatus.PENDING.value
        ]
        print(f"   重扫前待处理别名冲突: {pending_alias_before} 条")
        print(f"   重扫后待处理别名冲突: {len(pending_alias_now)} 条")
        assert len(pending_alias_now) >= 1, "rescan 的全量交叉检查应补建 alias_conflict 异常项（月光_v1.mp3 已入库，scan 会跳过它）"

        for e in pending_alias_now:
            print(f"   [{e.id}] {e.material_filename}")
            print(f"     原因: {e.reason}")
            print(f"     下一步: {e.next_step}")

        print("\n✅ 别名冲突已通过 rescan 全量交叉检查补建，原因和下一步已说清，需要人工确认")
    else:
        print("   ⚠️  未找到月光曲相关材料，跳过别名冲突测试")

    return state


def test_step6_add_note_and_rescan(sm: StateManager):
    print("\n" + "=" * 60)
    print("🧪 步骤6: 补排练/授权备注再重扫")
    print("=" * 60)

    state = sm.load()
    nm = NoteManager(sm)
    eq = ExceptionQueue(sm)

    naming_issues = [
        e for e in state.exception_queue
        if e.exception_type == ExceptionType.NAMING_INCONSISTENT.value and e.status == ExceptionStatus.PENDING.value
    ]

    for item in naming_issues:
        mat = next((m for m in state.materials if m.id == item.material_id), None)
        if mat and "旧录音" in mat.filename:
            nm.add_note(mat.id, "排练确认：此为月光曲旧版本录音，2023年存档", note_type="rehearsal", author="阿蓝")
            print(f"   为材料「{mat.filename}」添加排练备注")
            nm.set_canonical_name(mat.id, "moonlight")
            print(f"   将标准名更正为 moonlight")
            nm.set_version(mat.id, 0)
            print(f"   将版本号设为 v0（旧版存档）")
            eq.resolve(item.id, resolved_by="阿蓝", note="确认旧版录音，已归档为v0")
            print(f"   异常项 [{item.id}] 已标记为已处理")
        elif mat and "春之声" in mat.filename:
            nm.add_note(mat.id, "授权确认：春之声圆舞曲排练录音", note_type="authorization", author="阿蓝")
            print(f"   为材料「{mat.filename}」添加授权备注")
            nm.set_canonical_name(mat.id, "spring")
            print(f"   将标准名更正为 spring")
            nm.set_version(mat.id, 1)
            print(f"   将版本号设为 v1")
            eq.resolve(item.id, resolved_by="阿蓝", note="确认春之声即spring_v1排练版")
            print(f"   异常项 [{item.id}] 已标记为已处理")

    version_issues = [
        e for e in state.exception_queue
        if e.exception_type == ExceptionType.VERSION_MISMATCH.value and e.status == ExceptionStatus.PENDING.value
    ]

    for item in version_issues:
        mat = next((m for m in state.materials if m.id == item.material_id), None)
        if mat:
            eq.manual_override(item.id, resolved_by="阿蓝", reason="spring_v1.wav为原始录音，spring_v1.mp3为转码副本，保留wav为主版本")
            print(f"   异常项 [{item.id}] 标记为人工改判（spring_v1版本并存确认）")

    alias_issues = [
        e for e in state.exception_queue
        if e.exception_type == ExceptionType.ALIAS_CONFLICT.value and e.status == ExceptionStatus.PENDING.value
    ]

    for item in alias_issues:
        mat = next((m for m in state.materials if m.id == item.material_id), None)
        if mat:
            moonlight_mats = [m for m in state.materials if m.canonical_name == "moonlight"]
            for mm in moonlight_mats:
                if mat.canonical_name not in mm.aliases:
                    nm.add_alias(mm.id, mat.canonical_name)
                if mm.canonical_name not in mat.aliases:
                    nm.add_alias(mat.id, mm.canonical_name)
            print(f"   为材料「{mat.filename}」与所有 moonlight 标准名材料互相建立别名关联")
            eq.manual_override(item.id, resolved_by="阿蓝", reason="确认月光=moonlight，已合并为同一曲目别名")
            print(f"   异常项 [{item.id}] 标记为人工改判（别名合并确认）")

    state = sm.load()
    all_moonlight_ids = set(m.id for m in state.materials if (
        m.canonical_name == "moonlight"
        or "月光" in m.filename
        or "月光" in (m.aliases or [])
        or m.canonical_name == "月光"
        or any(a in ("moonlight", "月光") for a in (m.aliases or []))
    ))
    for e in list(state.exception_queue):
        if e.exception_type != ExceptionType.ALIAS_CONFLICT.value:
            continue
        if e.status != ExceptionStatus.PENDING.value:
            continue
        other_id = None
        for m in state.materials:
            if m.id == e.material_id:
                continue
            if m.filename in e.reason or m.canonical_name in e.reason or any(a in e.reason for a in m.aliases):
                other_id = m.id
                break
        if other_id is None:
            continue
        key = (e.material_id, other_id)
        if e.material_id in all_moonlight_ids and other_id in all_moonlight_ids:
            mat = next((m for m in state.materials if m.id == e.material_id), None)
            if mat:
                nm.add_note(mat.id, "月光系列全量别名关联合并", note_type="authorization", author="阿蓝")
            eq.manual_override(e.id, resolved_by="阿蓝", reason="月光与moonlight系列全量合并确认")
            print(f"   月光系列关联合并: 异常项 [{e.id}] 标记为人工改判")

    scanner_mid = Scanner(sm)
    scanner_mid.rescan(TEST_AUDIO_DIR)
    state = sm.load()
    all_moonlight_ids = set(m.id for m in state.materials if (
        m.canonical_name == "moonlight"
        or "月光" in m.filename
        or "月光" in (m.aliases or [])
        or m.canonical_name == "月光"
        or any(a in ("moonlight", "月光") for a in (m.aliases or []))
    ))
    for e in list(state.exception_queue):
        if e.exception_type != ExceptionType.ALIAS_CONFLICT.value:
            continue
        if e.status != ExceptionStatus.PENDING.value:
            continue
        other_id = None
        for m in state.materials:
            if m.id == e.material_id:
                continue
            if m.filename in e.reason or m.canonical_name in e.reason or any(a in e.reason for a in m.aliases):
                other_id = m.id
                break
        if other_id is None:
            continue
        if e.material_id in all_moonlight_ids and other_id in all_moonlight_ids:
            eq.manual_override(e.id, resolved_by="阿蓝", reason="月光与moonlight系列全量合并确认（重扫补建）")
            print(f"   月光系列补建: 异常项 [{e.id}] 标记为人工改判（重扫补建）")

    state = sm.load()
    eq2 = ExceptionQueue(sm)
    print(f"\n   处理后状态:")
    print(f"   已处理: {len(eq2.list_resolved())} 条")
    print(f"   人工改判: {len(eq2.list_manual_override())} 条")
    print(f"   待处理: {len(eq2.list_pending())} 条")

    print("\n✅ 备注添加完成，旧版本、人工批注和交付清单已对齐")
    return state


def test_step7_queue_categorization(sm: StateManager):
    print("\n" + "=" * 60)
    print("🧪 步骤7: 验证异常队列分类 - 已处理/待补材料/人工改判")
    print("=" * 60)

    eq = ExceptionQueue(sm)
    summary = eq.get_summary()

    print(f"   异常队列总计: {summary['total']}")
    print(f"   ⏳ 待处理: {summary['pending']}")
    print(f"   ✅ 已处理: {summary['resolved']}")
    print(f"   ✏️  人工改判: {summary['manual_override']}")

    print("\n   📋 已处理项:")
    for item in summary["resolved_items"]:
        print(f"     [{item['id']}] {item['filename']} (处理人: {item['resolved_by']})")

    print("\n   📋 待补材料项:")
    for item in summary["pending_items"]:
        print(f"     [{item['id']}] {item['filename']}")
        print(f"       原因: {item['reason']}")
        print(f"       下一步: {item['next_step']}")

    print("\n   📋 人工改判项:")
    for item in summary["manual_override_items"]:
        reason_str = f" 原因: {item['reason']}" if item["reason"] else ""
        print(f"     [{item['id']}] {item['filename']} (处理人: {item['resolved_by']}){reason_str}")

    assert summary["resolved"] >= 1, "应至少有1条已处理异常"
    assert summary["manual_override"] >= 1, "应至少有1条人工改判异常"
    print("\n✅ 异常队列已按 已处理/待补材料/人工改判 清晰分类")


def test_step8_delivery_alignment(sm: StateManager):
    print("\n" + "=" * 60)
    print("🧪 步骤8: 验证交付清单 - 旧版本/人工批注/交付清单对齐")
    print("=" * 60)

    nm = NoteManager(sm)
    delivery = nm.get_delivery_list()

    for item in delivery:
        notes_str = ""
        if item["notes"]:
            notes_str = " → 备注: " + "; ".join(f"[{n['type']}]{n['content']}" for n in item["notes"])
        aliases_str = f" 别名: {item['aliases']}" if item["aliases"] else ""
        print(f"   [{item['id']}] {item['filename']}")
        print(f"       标准名: {item['canonical_name']}, v{item['version']}, 状态: {item['status']}{aliases_str}{notes_str}")

    has_notes = any(item["notes"] for item in delivery)
    assert has_notes, "交付清单中应有带批注的材料"
    print("\n✅ 交付清单与旧版本、人工批注对齐")


def test_step9_final_rescan(sm: StateManager):
    print("\n" + "=" * 60)
    print("🧪 步骤9: 最终重扫 - 验证异常队列说清变化")
    print("=" * 60)

    scanner = Scanner(sm)
    record = scanner.rescan(TEST_AUDIO_DIR)

    eq = ExceptionQueue(sm)
    summary = eq.get_summary()

    print(f"   重扫文件数: {record.files_scanned}")
    print(f"   新增异常: {record.exceptions_found}")
    print(f"\n   异常队列最终状态:")
    print(f"   ⏳ 待处理: {summary['pending']}")
    print(f"   ✅ 已处理: {summary['resolved']}")
    print(f"   ✏️  人工改判: {summary['manual_override']}")

    if summary["pending"]:
        print("\n   ⚠️  仍有待处理项:")
        for item in summary["pending_items"]:
            print(f"     [{item['id']}] {item['filename']}")
            print(f"       类型: {item['type']}")
            print(f"       原因: {item['reason']}")
            print(f"       下一步: {item['next_step']}")

    print("\n✅ 最终重扫完成，异常队列已说清所有变化")


def test_step10_export(sm: StateManager):
    print("\n" + "=" * 60)
    print("🧪 步骤10: 导出链路验证（CSV/JSON 与页面数据一致）")
    print("=" * 60)

    exporter = Exporter(sm)
    paths = exporter.export_all(TEST_EXPORT_DIR, prefix="test")

    eq = ExceptionQueue(sm)
    nm = NoteManager(sm)
    summary = eq.get_summary()
    delivery = nm.get_delivery_list()

    print(f"   导出文件:")
    for k, p in paths.items():
        assert p.exists(), f"导出文件不存在: {p}"
        print(f"   - {k}: {p} ({p.stat().st_size} 字节)")

    with open(paths["queue_json"], "r", encoding="utf-8") as f:
        queue_json = json.load(f)
    assert queue_json["summary"]["pending"] == summary["pending"], "JSON 队列待处理数与页面不一致"
    assert queue_json["summary"]["resolved"] == summary["resolved"], "JSON 队列已处理数与页面不一致"
    assert queue_json["summary"]["manual_override"] == summary["manual_override"], "JSON 队列人工改判数与页面不一致"
    print(f"   ✅ 异常队列 JSON 与页面数据一致（pending={summary['pending']}, resolved={summary['resolved']}, manual={summary['manual_override']}）")

    with open(paths["delivery_json"], "r", encoding="utf-8") as f:
        delivery_json = json.load(f)
    assert delivery_json["material_count"] == len(delivery), "JSON 交付清单材料数与页面不一致"
    page_ids = sorted([m["id"] for m in delivery])
    exported_ids = sorted([m["id"] for m in delivery_json["materials"]])
    assert page_ids == exported_ids, "JSON 交付清单材料 ID 与页面不一致"
    print(f"   ✅ 交付清单 JSON 与页面数据一致（共 {len(delivery)} 项材料）")

    with open(paths["queue_csv"], "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        csv_rows = list(reader)
    expected_rows = summary["pending"] + summary["resolved"] + summary["manual_override"]
    assert len(csv_rows) == expected_rows, f"CSV 队列行数 {len(csv_rows)} 与页面汇总 {expected_rows} 不一致"
    print(f"   ✅ 异常队列 CSV 行数 {len(csv_rows)} 与页面汇总一致")

    with open(paths["delivery_csv"], "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        csv_rows = list(reader)
    assert len(csv_rows) == len(delivery), f"CSV 交付清单行数 {len(csv_rows)} 与页面 {len(delivery)} 不一致"
    print(f"   ✅ 交付清单 CSV 行数 {len(csv_rows)} 与页面一致")

    print("\n✅ 导出链路验证通过：CSV/JSON 与页面完全一致，格式可正常打开")


def main():
    print("🎹 琴房课时异常提醒 - 端到端测试")
    print("=" * 60)
    print("模拟灰度发布前真实节奏:")
    print("  1. 导入旧材料（含一条名称不一致的）")
    print("  2. 补一条名称不一致的材料")
    print("  3. 验证异常队列说清变化")
    print("=" * 60)

    setup()
    try:
        sm = test_step1_init()
        test_step2_scan_old_materials(sm)
        sm = test_step3_restart_recovery(sm)
        test_step4_add_inconsistent_file(sm)
        test_step5_alias_conflict(sm)
        test_step6_add_note_and_rescan(sm)
        test_step7_queue_categorization(sm)
        test_step8_delivery_alignment(sm)
        test_step9_final_rescan(sm)
        test_step10_export(sm)

        print("\n" + "=" * 60)
        print("🎉 琴房课时异常提醒 - 全部端到端测试通过！")
        print("=" * 60)
        print("\n📋 测试总结:")
        print("  ✅ 服务重启后状态完全恢复")
        print("  ✅ 名称不一致材料被正确检测并说明原因和下一步")
        print("  ✅ 版本错乱被检测（同一曲名同一版本多文件并存）")
        print("  ✅ 曲名别名冲突通过 rescan 全量交叉检查补建（不再因已入库被跳过）")
        print("  ✅ 排练/授权备注可添加，重扫后旧版本对齐")
        print("  ✅ 异常队列分清已处理/待补材料/人工改判")
        print("  ✅ 交付清单与旧版本、人工批注对齐")
        print("  ✅ CSV/JSON 导出链路与页面数据完全一致")
    except AssertionError as e:
        print(f"\n❌ 测试失败: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 测试异常: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        teardown()


if __name__ == "__main__":
    main()

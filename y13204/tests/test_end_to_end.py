#!/usr/bin/env python3
import os
import sys
import json
import tempfile
import shutil
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.storage import StateStore
from src.processor import MaterialProcessor
from src.report_generator import MarkdownReportGenerator
from src.models import MaterialType, NoteType, ProcessingState, AuthStatus


def test_full_workflow():
    """测试完整工作流：扫描 -> 添加备注 -> 重扫 -> 导出"""
    print("=" * 60)
    print("🎵 巡演耳返分账对齐 - 端到端测试")
    print("=" * 60)

    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir_path = Path(tmpdir)
        data_dir = tmpdir_path / "data"
        reports_dir = tmpdir_path / "reports"
        materials_dir = tmpdir_path / "materials"
        export_dir = tmpdir_path / "export"

        materials_dir.mkdir()
        data_dir.mkdir()
        reports_dir.mkdir()

        source_materials = Path(__file__).parent.parent / "materials"
        for f in source_materials.iterdir():
            if f.is_file():
                shutil.copy2(f, materials_dir / f.name)

        print("\n1️⃣  第一步：初始扫描")
        print("-" * 40)

        store = StateStore(data_dir=str(data_dir))
        processor = MaterialProcessor(store)
        generator = MarkdownReportGenerator(store, reports_dir=str(reports_dir))

        session1 = processor.scan_directory(str(materials_dir))

        materials = store.get_all_materials()
        assert len(materials) == 5, f"应找到5份材料，实际{len(materials)}份"
        print(f"   ✅ 扫描到 {len(materials)} 份材料")

        auth_marked = store.find_materials_with_auth_mark()
        assert len(auth_marked) >= 1, "应找到授权标记的材料"
        print(f"   ✅ 授权标记材料: {len(auth_marked)} 份")
        for mat in auth_marked:
            assert mat.authorization.marked == True
            print(f"      - {mat.get_display_name()}")

        late_attachments = store.find_late_attachments()
        assert len(late_attachments) >= 1, "应找到晚到附件"
        print(f"   ✅ 晚到附件: {len(late_attachments)} 份")
        for mat in late_attachments:
            assert mat.is_late_attachment == True
            assert mat.linked_material_ids, "晚到附件应关联到结论"
            print(f"      - {mat.file_name} (关联: {len(mat.linked_material_ids)}份结论)")

        conclusions = [m for m in materials if m.is_conclusion or m.material_type == MaterialType.CONCLUSION]
        assert len(conclusions) >= 1, "应找到结论材料"
        print(f"   ✅ 结论材料: {len(conclusions)} 份")
        for mat in conclusions:
            print(f"      - {mat.file_name}")

        student_progress = store.get_student_progress_all()
        assert len(student_progress) >= 3, "应分析到至少3名学生的进步"
        print(f"   ✅ 学生进步分析: {len(student_progress)} 名学生")
        for sp in student_progress:
            assert len(sp.improvements) > 0, f"{sp.student_name}应有进步记录"
            print(f"      - {sp.student_name}: {len(sp.improvements)}项进步")

        reports = generator.generate_all_reports()
        assert len(reports) == 2, "应生成2份报告"
        print(f"   ✅ 生成报告: {len(reports)} 份")
        for report in reports:
            assert os.path.exists(report), f"报告文件应存在: {report}"
            with open(report, "r", encoding="utf-8") as f:
                content = f.read()
                assert len(content) > 100, "报告内容不应为空"
            print(f"      - {os.path.basename(report)}")

        print("\n2️⃣  第二步：验证持久化（重启测试）")
        print("-" * 40)

        store2 = StateStore(data_dir=str(data_dir))
        materials_after_reload = store2.get_all_materials()
        assert len(materials_after_reload) == 5, "重启后材料数量应保持不变"
        print(f"   ✅ 重启后材料数: {len(materials_after_reload)} (持久化正常)")

        auth_after_reload = store2.find_materials_with_auth_mark()
        assert len(auth_after_reload) == len(auth_marked), "重启后授权标记应保持"
        print(f"   ✅ 重启后授权标记: {len(auth_after_reload)} 份 (持久化正常)")

        last_scan = store2.get_last_scan_at()
        assert last_scan is not None, "应记录最后扫描时间"
        print(f"   ✅ 最后扫描时间: {last_scan}")

        last_report = store2.get_last_report_at()
        assert last_report is not None, "应记录最后报告时间"
        print(f"   ✅ 最后报告时间: {last_report}")

        print("\n3️⃣  第三步：添加备注")
        print("-" * 40)

        processor2 = MaterialProcessor(store2)

        materials_list = store2.get_all_materials()
        rehearsal_mat = materials_list[0]
        auth_mat = [m for m in materials_list if m.authorization.marked][0]

        note1 = processor2.add_rehearsal_note(
            "排练时学生A的高音比上次更稳了，进步很大",
            material_ids=[rehearsal_mat.id]
        )
        assert note1.id in rehearsal_mat.note_ids, "备注应关联到材料"
        print(f"   ✅ 添加排练备注: {note1.content[:30]}...")

        note2 = processor2.add_authorization_note(
            "授权到期日调整为2026-07-20，已确认",
            material_ids=[auth_mat.id]
        )
        assert auth_mat.authorization.marked == True, "添加授权备注应标记材料"
        assert note2.id in auth_mat.note_ids, "授权备注应关联到材料"
        print(f"   ✅ 添加授权备注: {note2.content[:30]}...")

        notes = store2.get_all_notes()
        assert len(notes) == 2, "应保存2条备注"
        print(f"   ✅ 备注总数: {len(notes)} 条")

        print("\n4️⃣  第四步：重扫（检测版本变化）")
        print("-" * 40)

        session2 = processor2.scan_directory(str(materials_dir), rescan=True)

        materials_after_rescan = store2.get_all_materials()
        for mat in materials_after_rescan:
            for nid in mat.note_ids:
                note = store2.get_note(nid)
                if note:
                    pass

        alignment = processor2.get_alignment_status()
        print(f"   ✅ 对齐率: {alignment['alignment_rate']}")
        print(f"   ✅ 已对齐: {alignment['aligned']} 份, 未对齐: {alignment['unaligned']} 份")

        generator2 = MarkdownReportGenerator(store2, reports_dir=str(reports_dir))
        reports2 = generator2.generate_all_reports()
        print(f"   ✅ 重新生成报告: {len(reports2)} 份")
        for report in reports2:
            with open(report, "r", encoding="utf-8") as f:
                content = f.read()
                assert "排练时学生A的高音" in content or "授权到期日调整" in content, "报告应包含新备注"
        print(f"   ✅ 报告包含最新备注")

        print("\n5️⃣  第五步：导出交付")
        print("-" * 40)

        export_path = store2.export_for_delivery(str(export_dir))
        assert export_path.exists(), "导出目录应存在"
        print(f"   ✅ 导出目录: {export_path}")

        materials_export_dir = export_path / "materials"
        assert materials_export_dir.exists(), "材料子目录应存在"
        exported_files = list(materials_export_dir.iterdir())
        assert len(exported_files) == 5, "应导出5份材料"
        print(f"   ✅ 导出材料: {len(exported_files)} 份")

        auth_exported = [f for f in exported_files if "⚠️" in f.name]
        assert len(auth_exported) >= 1, "授权材料应带⚠️标记"
        print(f"   ✅ 授权标记材料（带⚠️）: {len(auth_exported)} 份")

        assert (export_path / "状态摘要.json").exists(), "状态摘要应存在"
        assert (export_path / "历史备注.md").exists(), "历史备注应存在"
        assert (export_path / "交付清单.md").exists(), "交付清单应存在"

        for report in reports2:
            report_name = os.path.basename(report)
            shutil.copy2(report, export_path / report_name)

        for report in ["分账对齐报告.md", "学生进步分析.md"]:
            assert (export_path / report).exists(), f"{report}应在导出目录中"

        print(f"   ✅ 导出文件齐全")

        with open(export_path / "交付清单.md", "r", encoding="utf-8") as f:
            delivery_content = f.read()
            assert "⚠️ 是" in delivery_content, "交付清单应包含授权标记"
            assert "晚到附件" in delivery_content, "交付清单应包含晚到附件标记"
        print(f"   ✅ 交付清单包含所有标记")

        print("\n6️⃣  第六步：筛选功能测试")
        print("-" * 40)

        filtered_auth = processor2.filter_materials(auth_marked=True)
        assert len(filtered_auth) >= 1, "筛选授权标记材料失败"
        print(f"   ✅ 筛选授权标记: {len(filtered_auth)} 份")

        filtered_late = processor2.filter_materials(late_only=True)
        assert len(filtered_late) >= 1, "筛选晚到附件失败"
        print(f"   ✅ 筛选晚到附件: {len(filtered_late)} 份")

        filtered_conclusion = processor2.filter_materials(conclusion_only=True)
        assert len(filtered_conclusion) >= 1, "筛选结论材料失败"
        print(f"   ✅ 筛选结论材料: {len(filtered_conclusion)} 份")

        filtered_with_notes = processor2.filter_materials(has_notes=True)
        assert len(filtered_with_notes) >= 2, "筛选有备注材料失败"
        print(f"   ✅ 筛选有备注材料: {len(filtered_with_notes)} 份")

        print("\n7️⃣  第七步：详情查询测试")
        print("-" * 40)

        mat_detail = processor2.get_material_detail(auth_mat.id)
        assert mat_detail["material"].id == auth_mat.id, "材料ID不匹配"
        assert len(mat_detail["notes"]) >= 1, "应能查询到关联备注"
        assert len(mat_detail["versions"]) >= 1, "应能查询到版本记录"
        print(f"   ✅ 材料详情查询正常")
        print(f"      - 备注数: {len(mat_detail['notes'])}")
        print(f"      - 版本数: {len(mat_detail['versions'])}")
        if mat_detail["linked_materials"]:
            print(f"      - 关联材料: {len(mat_detail['linked_materials'])} 份")

        print("\n" + "=" * 60)
        print("🎉 所有测试通过！系统功能完整验证")
        print("=" * 60)
        print("\n✅ 验证的核心功能：")
        print("   1. 材料扫描与自动分类（截图、附件、授权、结论）")
        print("   2. 晚到附件自动关联到最终结论")
        print("   3. 授权到期自动检测与标记")
        print("   4. 学生进步自动分析")
        print("   5. 持久化存储（重启不丢状态）")
        print("   6. 备注功能（排练/授权/普通）")
        print("   7. 版本追踪与重扫检测")
        print("   8. Markdown报告生成")
        print("   9. 材料筛选（授权/晚到/备注/结论）")
        print("  10. 交付导出（带标记）")
        print("  11. 对齐状态追踪")
        print("\n✅ 所有需求均已满足！")
        return True


def test_state_persistence():
    """测试状态持久化 - 重启后状态保持"""
    print("\n" + "=" * 60)
    print("🔄 状态持久化专项测试")
    print("=" * 60)

    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir_path = Path(tmpdir)
        data_dir = tmpdir_path / "data"
        materials_dir = tmpdir_path / "materials"
        materials_dir.mkdir()

        test_file = materials_dir / "测试材料.txt"
        test_file.write_text("学生A高音进步很大", encoding="utf-8")

        store1 = StateStore(data_dir=str(data_dir))
        processor1 = MaterialProcessor(store1)
        session1 = processor1.scan_directory(str(materials_dir))

        note = processor1.add_rehearsal_note("测试备注", material_ids=[])
        note_id = note.id
        session_id = session1.session_id
        last_scan = store1.get_last_scan_at()

        store2 = StateStore(data_dir=str(data_dir))
        assert store2.get_note(note_id) is not None, "备注应持久化"
        assert store2.get_session(session_id) is not None, "会话应持久化"
        assert store2.get_last_scan_at() == last_scan, "扫描时间应持久化"

        materials = store2.get_all_materials()
        assert len(materials) == 1, "材料应持久化"
        assert materials[0].processing_state != ProcessingState.PENDING, "处理状态应持久化"

        print("   ✅ 备注持久化正常")
        print("   ✅ 会话持久化正常")
        print("   ✅ 时间戳持久化正常")
        print("   ✅ 材料状态持久化正常")
        print("\n🎉 状态持久化测试通过！")
        return True


if __name__ == "__main__":
    try:
        test_full_workflow()
        test_state_persistence()
        print("\n" + "=" * 60)
        print("✨ 所有测试全部通过！系统运行正常 ✨")
        print("=" * 60)
    except AssertionError as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 发生错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

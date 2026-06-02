"""完整流程测试脚本 - 验证MIDI力度曲线清洗系统的所有功能"""

import os
import sys
import json
import tempfile
import shutil
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from midi_cleaner.midi_parser import MidiParser
from midi_cleaner.velocity_cleaner import VelocityCleaner
from midi_cleaner.measure_align import MeasureAlignChecker
from midi_cleaner.version_tracker import VersionTracker
from midi_cleaner.data_store import JsonDataStore
from midi_cleaner.report_generator import ReportGenerator
from midi_cleaner.manual_correction import ManualCorrector
from midi_cleaner.data_store import FileRelationship


def run_full_test():
    """运行完整的测试流程"""

    print("=" * 80)
    print("MIDI力度曲线清洗系统 - 完整流程测试")
    print("=" * 80)

    test_dir = tempfile.mkdtemp(prefix='midi_cleaner_test_')
    print(f"\n测试目录: {test_dir}")

    examples_dir = os.path.join(os.path.dirname(__file__), '..', 'examples', 'test_files')
    midi_file = os.path.join(examples_dir, 'test_with_anomalies.mid')

    if not os.path.exists(midi_file):
        print(f"\n❌ 错误: 测试MIDI文件不存在: {midi_file}")
        print("请先运行 examples/generate_test_midi.py 生成测试文件")
        return False

    try:
        print("\n" + "=" * 60)
        print("步骤 1: MIDI文件解析")
        print("=" * 60)

        parser = MidiParser(source_version='v1.0.0', track_version='piano-main')
        parsed_midi = parser.parse_file(midi_file)

        print(f"✅ 解析成功")
        print(f"  - 音符总数: {len(parsed_midi.notes)}")
        print(f"  - 轨道数: {len(parsed_midi.metadata.track_names)}")
        print(f"  - 时长: {parsed_midi.metadata.total_duration:.2f}秒")
        print(f"  - 文件哈希: {parsed_midi.metadata.file_hash[:16]}...")

        if parsed_midi.bad_rows:
            print(f"  - 检测到坏行: {len(parsed_midi.bad_rows)} 条")
            for br in parsed_midi.bad_rows[:3]:
                print(f"    * {br['type']}: 音高{br.get('pitch', 'N/A')} - {br['description']}")

        print("\n" + "=" * 60)
        print("步骤 2: 力度曲线清洗")
        print("=" * 60)

        velocity_cleaner = VelocityCleaner()
        cleaned_data = velocity_cleaner.clean(parsed_midi)

        print(f"✅ 清洗完成")
        print(f"  - 总异常数: {len(cleaned_data.anomalies)}")
        print(f"  - 坏行数: {len(cleaned_data.bad_rows)}")
        print(f"  - 力度统计:")
        print(f"    * 均值: {cleaned_data.statistics.mean:.2f}")
        print(f"    * 中位数: {cleaned_data.statistics.median}")
        print(f"    * 标准差: {cleaned_data.statistics.std_dev:.2f}")
        print(f"    * 范围: {cleaned_data.statistics.min} - {cleaned_data.statistics.max}")

        spikes = velocity_cleaner.get_velocity_spikes(cleaned_data)
        statistical = velocity_cleaner.get_statistical_outliers(cleaned_data)
        print(f"  - 力度爆点: {len(spikes)} 个")
        print(f"  - 统计异常: {len(statistical)} 个")

        bad_rows_separate = velocity_cleaner.get_bad_rows_separate(cleaned_data)
        print(f"  - 坏行分类:")
        for br_type, rows in bad_rows_separate.items():
            print(f"    * {br_type}: {len(rows)} 条")

        print("\n" + "=" * 60)
        print("步骤 3: 小节对齐检查")
        print("=" * 60)

        align_checker = MeasureAlignChecker()
        alignment_result = align_checker.check_alignment(parsed_midi)

        print(f"✅ 对齐检查完成")
        print(f"  - 单个音符错位: {len(alignment_result.misalignments)} 个")
        print(f"  - 轨道对齐分析: {len(alignment_result.track_alignments)} 个轨道")

        for misalign in alignment_result.misalignments[:3]:
            print(f"    * 音符#{misalign.note_id}: 偏差{misalign.deviation:.3f}拍 - {misalign.description}")

        print("\n" + "=" * 60)
        print("步骤 4: 版本混用检查")
        print("=" * 60)

        version_tracker = VersionTracker()
        version_result = version_tracker.check_versions([parsed_midi])

        print(f"✅ 版本检查完成")
        print(f"  - 版本数量: {len(version_result.all_versions)}")
        print(f"  - 版本冲突: {len(version_result.conflicts)} 个")
        print(f"  - 版本不匹配: {len(version_result.mismatches)} 个")

        print("\n" + "=" * 60)
        print("步骤 5: 数据存储")
        print("=" * 60)

        data_store = JsonDataStore(base_dir=test_dir)
        import uuid
        session_id = str(uuid.uuid4())

        now = datetime.now().isoformat()
        relationship = FileRelationship(
            midi_file=midi_file,
            midi_hash=parsed_midi.metadata.file_hash,
            cleaned_data_file="",
            velocity_curve_file="",
            report_json_file="",
            report_markdown_file="",
            correction_history_file="",
            created_at=now,
            updated_at=now
        )

        from midi_cleaner.data_store import CleaningSession
        session = CleaningSession(
            session_id=session_id,
            midi_file_path=midi_file,
            midi_file_hash=parsed_midi.metadata.file_hash,
            source_version='v1.0.0',
            track_version='piano-main',
            parsed_at=parsed_midi.metadata.parsed_at,
            cleaned_at=now,
            has_manual_corrections=False,
            statistics_modified=False,
            modified_fields=[],
            relationships=relationship
        )

        data_store.register_session(session, midi_file, relationship)
        print(f"✅ 会话已注册: {session_id}")

        saved_files = data_store.save_cleaned_data(
            cleaned_data, alignment_result, version_result, session_id
        )

        print(f"✅ 数据已保存")
        for key, path in saved_files.items():
            filename = os.path.basename(path)
            print(f"  - {key}: {filename}")

        relationship.cleaned_data_file = saved_files.get("velocity_data", "")
        relationship.velocity_curve_file = saved_files.get("velocity_curve", "")
        relationship.updated_at = datetime.now().isoformat()

        print("\n" + "=" * 60)
        print("步骤 6: 报告生成")
        print("=" * 60)

        report_gen = ReportGenerator()
        report = report_gen.generate_report(
            parsed_midi, cleaned_data, alignment_result, version_result,
            session_id, relationship, None
        )

        print(f"✅ 报告生成完成")
        print(f"  - 报告ID: {report.report_id}")
        print(f"  - 章节数: {len(report.sections)}")

        report_dict = report_gen.to_json(report)
        report_md = report_gen.to_markdown(report)

        report_files = data_store.save_reports(report_dict, report_md, session_id)
        print(f"✅ 报告已保存")
        print(f"  - JSON: {os.path.basename(report_files['report_json'])}")
        print(f"  - Markdown: {os.path.basename(report_files['report_markdown'])}")

        print("\n报告章节摘要:")
        for section in report.sections:
            print(f"  - {section.title}: {section.total_count} 项内容")

        print("\n" + "=" * 60)
        print("步骤 7: 手动修正")
        print("=" * 60)

        corrector = ManualCorrector(data_store)

        anomalies = cleaned_data.anomalies
        if anomalies:
            test_anomaly = anomalies[0]
            test_note_id = test_anomaly.note_id
            original_note = None
            for note in cleaned_data.cleaned_notes:
                if note.note_id == test_note_id:
                    original_note = note
                    break

            if original_note:
                print(f"选择音符 #{test_note_id} 进行修正")
                print(f"  - 原力度: {original_note.velocity}")
                print(f"  - 异常类型: {test_anomaly.type}")

                new_velocity = 64
                new_parsed, new_cleaned, correction = corrector.apply_correction(
                    parsed_midi, cleaned_data, test_note_id, new_velocity,
                    reason="测试修正 - 将异常力度调整为正常值",
                    corrected_by="test_user",
                    anomaly_id=test_anomaly.anomaly_id
                )

                print(f"✅ 修正成功")
                print(f"  - 修正ID: {correction.correction_id[:16]}...")
                print(f"  - 力度变化: {correction.old_velocity} → {correction.new_velocity}")
                print(f"  - 变化量: {correction.new_velocity - correction.old_velocity}")

                print("\n" + "=" * 60)
                print("步骤 8: 新旧版本对比")
                print("=" * 60)

                correction_history = data_store.load_correction_history(parsed_midi.metadata.file_hash)
                comparison = corrector.compare_versions(cleaned_data, new_cleaned, correction_history)

                print(f"✅ 对比完成")
                print(f"  - 修正音符数: {comparison.total_corrections}")
                print(f"  - 总力度变化: {comparison.total_velocity_change}")
                print(f"  - 平均力度变化: {comparison.average_change:+.2f}")
                print(f"  - 统计数据变化:")
                print(f"    * 均值差异: {comparison.original_stats_diff['mean_diff']:+.2f}")
                print(f"    * 标准差差异: {comparison.original_stats_diff['std_dev_diff']:+.2f}")
                print(f"    * 中位数差异: {comparison.original_stats_diff['median_diff']:+.2f}")

                comparison_md = corrector.generate_comparison_markdown(comparison, session_id)
                print(f"\n对比报告:")
                print(comparison_md[:500] + "...")

                print("\n" + "=" * 60)
                print("步骤 9: 重新生成报告（包含修正）")
                print("=" * 60)

                new_saved_files = data_store.save_cleaned_data(
                    new_cleaned, alignment_result, version_result, session_id
                )

                correction_history = data_store.load_correction_history(parsed_midi.metadata.file_hash)
                has_manual_corrections = correction_history is not None and len(correction_history.corrections) > 0

                data_store.update_session_correction_status(
                    session_id,
                    has_manual_corrections=has_manual_corrections,
                    statistics_modified=new_cleaned.statistics.is_manually_modified,
                    modified_fields=new_cleaned.statistics.modified_fields
                )

                relationship.cleaned_data_file = new_saved_files.get("velocity_data", "")
                relationship.velocity_curve_file = new_saved_files.get("velocity_curve", "")
                relationship.correction_history_file = os.path.join(
                    data_store.base_dir, 'cleaned', f"{parsed_midi.metadata.file_hash}_corrections.json"
                )
                relationship.updated_at = datetime.now().isoformat()

                new_report = report_gen.generate_report(
                    new_parsed, new_cleaned, alignment_result, version_result,
                    session_id, relationship, correction_history
                )

                new_report_dict = report_gen.to_json(new_report)
                new_report_md = report_gen.to_markdown(new_report)
                new_report_files = data_store.save_reports(new_report_dict, new_report_md, session_id)

                print(f"✅ 新报告已生成")
                print(f"  - 统计数据已修改: {new_cleaned.statistics.is_manually_modified}")
                print(f"  - 修改的统计字段: {new_cleaned.statistics.modified_fields}")

                print("\n报告中影响分析:")
                for section in new_report.sections:
                    if section.title == "人工修改影响分析":
                        print(f"  {section.content[0][:200]}...")
                        break

        print("\n" + "=" * 60)
        print("步骤 10: 验证数据存储和查询")
        print("=" * 60)

        session = data_store.get_session(session_id)
        print(f"✅ 会话查询成功")
        print(f"  - 会话ID: {session['session_id']}")
        print(f"  - MIDI文件: {os.path.basename(session['midi_file_path'])}")
        print(f"  - 已修正: {session['has_manual_corrections']}")
        print(f"  - 统计已修改: {session['statistics_modified']}")
        print(f"  - 修改字段: {session['modified_fields']}")

        all_sessions = data_store.get_all_sessions()
        print(f"  - 总会话数: {len(all_sessions)}")

        rel = data_store.get_relationship_by_midi(midi_file)
        if rel:
            print(f"✅ 文件对应关系查询成功")
            print(f"  - MIDI文件: {rel['midi_file']}")
            print(f"  - 清洗数据: {os.path.basename(rel['cleaned_data_file'])}")
            print(f"  - 报告: {os.path.basename(rel['report_markdown_file'])}")

        print("\n" + "=" * 80)
        print("✅ 所有测试通过！系统功能完整")
        print("=" * 80)

        print("\n生成的文件:")
        for root, dirs, files in os.walk(test_dir):
            for file in files:
                filepath = os.path.join(root, file)
                rel_path = os.path.relpath(filepath, test_dir)
                size = os.path.getsize(filepath)
                print(f"  {rel_path} ({size} bytes)")

        print(f"\n测试目录: {test_dir}")
        return True

    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

    finally:
        print("\n" + "=" * 80)
        print("测试完成")
        print("=" * 80)


if __name__ == '__main__':
    success = run_full_test()
    sys.exit(0 if success else 1)

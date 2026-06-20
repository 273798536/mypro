import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

try:
    from src.data_reader import DataReader
    print('[OK] data_reader 导入成功')
except Exception as e:
    print(f'[FAIL] data_reader 导入失败: {e}')
    sys.exit(1)

try:
    from src.conflict_detector import ConflictDetector, AliasResolver, VersionManager
    print('[OK] conflict_detector 导入成功')
except Exception as e:
    print(f'[FAIL] conflict_detector 导入失败: {e}')
    sys.exit(1)

try:
    from src.history_tracker import HistoryTracker
    print('[OK] history_tracker 导入成功')
except Exception as e:
    print(f'[FAIL] history_tracker 导入失败: {e}')
    sys.exit(1)

try:
    from src.report_generator import ReportGenerator
    print('[OK] report_generator 导入成功')
except Exception as e:
    print(f'[FAIL] report_generator 导入失败: {e}')
    sys.exit(1)

reader = DataReader(BASE_DIR)
rows = reader.read_all_files()
file_summaries = reader.get_file_summaries()
print(f'[OK] 读取到 {len(rows)} 行数据，来自 {len(file_summaries)} 个文件')

detector = ConflictDetector(BASE_DIR)
conflicts = detector.detect_all(rows)
print(f'[OK] 排期冲突: {len(conflicts["schedule_conflicts"])}')
print(f'[OK] 别名重复: {len(conflicts["alias_duplicates"])}')
print(f'[OK] 版本冲突: {len(conflicts["version_conflicts"])}')

tracker = HistoryTracker(BASE_DIR)
linjie_mods = tracker.get_linjie_modifications(rows)
print(f'[OK] 林姐临时修改: {len(linjie_mods)} 条')

generator = ReportGenerator(BASE_DIR)
result = generator.generate_unified_result(rows, conflicts, linjie_mods, file_summaries)
json_path = generator.save_json(result)
report_path = generator.save_text_report(result)
print(f'[OK] JSON结果已保存: {json_path}')
print(f'[OK] 文本报告已保存: {report_path}')

run_summary = {
        'total_files': result['statistics']['total_files'],
        'total_rows': result['statistics']['total_rows'],
        'total_conflicts': result['statistics']['total_conflicts'],
        'linjie_modification_count': result['statistics']['linjie_modification_count']
    }
    tracker.record_run(run_summary)
print('[OK] 历史记录已更新')

print('')
print('═══════════════════════════════════════════')
print('  全部模块验证通过！系统运行正常 ✓')
print('═══════════════════════════════════════════')

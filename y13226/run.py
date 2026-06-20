#!/usr/bin/env python3
import os
import sys
import json
import argparse


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

from src.data_reader import DataReader
from src.conflict_detector import ConflictDetector
from src.history_tracker import HistoryTracker
from src.report_generator import ReportGenerator


def print_help():
    help_text = """
╔══════════════════════════════════════════════════════════════╗
║              剧场返场曲排期冲突检测工具                        ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  使用方法:                                                    ║
║    python run.py                    # 执行一次完整检测        ║
║    python run.py --report           # 仅输出文本报告          ║
║    python run.py --json             # 输出JSON路径            ║
║    python run.py --list-files       # 列出已读取的文件        ║
║    python run.py --decision         # 记录人工判断            ║
║    python run.py --history          # 查看历史记录            ║
║                                                              ║
║  数据存放位置:                                                ║
║    音频文件夹(CSV): data/audio_files/                         ║
║    输出结果:       data/output/                                ║
║    历史记录:       data/history/                               ║
║                                                              ║
║  配置文件:                                                    ║
║    字段映射: config/field_mapping.json                        ║
║    曲名别名: config/alias_config.json                         ║
║    路径配置: config/paths.json                                ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    """
    print(help_text)


def run_detection(output_json: bool = False, output_report: bool = False):
    try:
        print('> 剧场返场曲排期冲突检测开始...')

        reader = DataReader(BASE_DIR)
        print(f'> [1/5] 读取音频文件夹...')
        all_rows = reader.read_all_files()
        file_summaries = reader.get_file_summaries()

        if not all_rows:
            print('  ! 未找到任何有效数据，请检查CSV文件格式')
            return False

        print(f'    共读取 {len(file_summaries)} 个文件，{len(all_rows)} 行数据')
        for fs in file_summaries:
            print(f'      - {fs["filename"]}: {fs["valid_rows"]}/{fs["total_rows"]} 行有效')

        print(f'> [2/5] 检测冲突（排期冲突 / 曲名别名重复 / 多版本冲突）...')
        detector = ConflictDetector(BASE_DIR)
        conflicts = detector.detect_all(all_rows)

        print(f'    排期时间冲突: {len(conflicts["schedule_conflicts"])} 条')
        print(f'    曲名别名重复: {len(conflicts["alias_duplicates"])} 条')
        print(f'    多版本冲突:   {len(conflicts["version_conflicts"])} 条')

        print(f'> [3/5] 识别林姐临时修改...')
        tracker = HistoryTracker(BASE_DIR)
        linjie_mods = tracker.get_linjie_modifications(all_rows)
        print(f'    林姐临时修改: {len(linjie_mods)} 条')

        print(f'> [4/5] 生成统一结果（筛选条件 + 统计 + 明细表 + 截图说明）...')
        generator = ReportGenerator(BASE_DIR)
        result = generator.generate_unified_result(all_rows, conflicts, linjie_mods, file_summaries)

        print(f'> [5/5] 保存结果并记录历史...')
        json_path = generator.save_json(result)
        ts_json_path = generator.save_timestamped_json(result)
        report_path = generator.save_text_report(result)

        run_summary = {
            'total_files': result['statistics']['total_files'],
            'total_rows': result['statistics']['total_rows'],
            'total_conflicts': result['statistics']['total_conflicts'],
            'linjie_modifications': result['statistics']['linjie_modification_count']
        }
        tracker.record_run(run_summary)

        print('')
        print('╔════════════════════════════════════════════╗')
        print('║            检测完成                        ║')
        print('╠════════════════════════════════════════════╣')
        print(f'║  冲突总数:     {result["statistics"]["total_conflicts"]:>4} 条                  ║')
        print(f'║  排期冲突:     {result["statistics"]["schedule_conflict_count"]:>4} 条                  ║')
        print(f'║  别名重复:     {result["statistics"]["alias_duplicate_count"]:>4} 条                  ║')
        print(f'║  版本冲突:     {result["statistics"]["version_conflict_count"]:>4} 条                  ║')
        print(f'║  林姐临时修改: {result["statistics"]["linjie_modification_count"]:>4} 条                  ║')
        print('╚════════════════════════════════════════════╝')
        print('')
        print(f'  文本报告: {report_path}')
        print(f'  最新JSON: {json_path}')
        print(f'  归档JSON: {ts_json_path}')
        print('')

        if output_report:
            with open(report_path, 'r', encoding='utf-8') as f:
                print(f.read())

        if output_json:
            print(json_path)

        return True

    except FileNotFoundError as e:
        print(f'[致命错误] 文件不存在: {e}')
        print('  请确保 config/ 目录下的配置文件完整')
        return False
    except ValueError as e:
        print(f'[致命错误] 数据错误: {e}')
        return False
    except Exception as e:
        print(f'[致命错误] 运行异常: {e}')
        import traceback
        traceback.print_exc()
        return False


def list_files():
    reader = DataReader(BASE_DIR)
    summaries = reader.get_file_summaries()
    if not summaries:
        print('data/audio_files/ 目录下暂无CSV文件')
        return
    print('已检测到以下文件：')
    for s in summaries:
        print(f'  {s["filename"]}')
        print(f'    修改时间: {s["modified_at"]}')
        print(f'    有效行: {s["valid_rows"]}/{s["total_rows"]}')


def show_history():
    tracker = HistoryTracker(BASE_DIR)
    runs = tracker.get_recent_runs(10)
    decisions = tracker.get_manual_decisions()

    print('── 最近运行记录 ──')
    if runs:
        for r in runs:
            s = r['summary']
            linjie = s.get('linjie_modification_count', s.get('linjie_modifications', '?'))
            print(f"  {r['timestamp']} | 冲突:{s.get('total_conflicts', '?')} 林姐修改:{linjie}")
    else:
        print('  暂无运行记录')

    print('')
    print('── 人工判断记录 ──')
    if decisions:
        for d in decisions:
            print(f"  {d['timestamp']} | {d['operator']} | {d['conflict_id']}")
            print(f"    判断: {d['decision']}")
            if d.get('note'):
                print(f"    备注: {d['note']}")
    else:
        print('  暂无人工判断记录')


def add_decision():
    print('记录人工判断（林姐临时修改专用）')
    conflict_id = input('请输入冲突编号/标识: ').strip()
    decision = input('请输入判断内容（如：保留临时修改版，不覆盖新版）: ').strip()
    operator = input('请输入操作人（如：林姐）: ').strip() or '林姐'
    note = input('请输入备注（可选）: ').strip()

    tracker = HistoryTracker(BASE_DIR)
    record = tracker.record_manual_decision(conflict_id, decision, operator, note)
    print(f"已记录: {record['timestamp']} {record['operator']} - {record['decision']}")


def main():
    parser = argparse.ArgumentParser(
        description='剧场返场曲排期冲突检测工具',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument('--report', action='store_true', help='输出完整文本报告')
    parser.add_argument('--json', action='store_true', help='仅输出JSON结果路径')
    parser.add_argument('--list-files', action='store_true', help='列出已读取的音频文件')
    parser.add_argument('--history', action='store_true', help='查看历史运行和判断记录')
    parser.add_argument('--decision', action='store_true', help='记录一条人工判断')
    parser.add_argument('--help-text', action='store_true', help='显示详细帮助')

    args = parser.parse_args()

    if args.help_text:
        print_help()
        return

    if args.list_files:
        list_files()
        return

    if args.history:
        show_history()
        return

    if args.decision:
        add_decision()
        return

    run_detection(output_json=args.json, output_report=args.report)


if __name__ == '__main__':
    main()

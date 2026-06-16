#!/usr/bin/env python3
import sys
import os
import argparse
import csv
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'src'))

from replay_engine import ReplayEngine


def print_banner():
    print("=" * 60)
    print("  🔧 工具调用失败回放器")
    print("  知识库运营 · 重复运行 / 补录 / 人工确认")
    print("=" * 60)
    print()


def show_summary(engine):
    stats = engine.get_statistics()
    s = stats['summary']
    print("📊 总体统计")
    print("-" * 40)
    print(f"  总调用数: {s['total']}")
    print(f"  成功数:   {s['success']}  ({s['success_rate']}%)")
    print(f"  失败数:   {s['fail']}")
    print(f"  拦截数:   {s['blocked']}")
    print(f"  丢失数:   {s['lost']}")
    print()

    print("📋 失败类型分布")
    print("-" * 40)
    for ftype, count in stats['fail_by_type'].items():
        print(f"  {ftype}: {count}条")
    print()


def show_batches(engine):
    batches = engine.get_run_batches()
    print("📦 运行批次列表")
    print("-" * 60)
    for b in batches:
        print(f"  {b['batch_id']}  版本:{b['version']:<8}  总数:{b['total_calls']:<4}  "
              f"成功:{b['success_count']:<4}  失败:{b['fail_count']:<4}  "
              f"拦截:{b['blocked_count']:<4}  时间:{b['call_time']}")
    print()


def show_lost(engine):
    lost = engine.find_lost_records()
    print("⚠️  版本回滚丢失记录")
    print("-" * 60)
    if not lost:
        print("  暂无丢失记录 ✓")
    else:
        for r in lost:
            print(f"  题目: {r['question_id']}")
            print(f"    题干: {r['question_text']}")
            print(f"    卡在材料: {r['material_name']} ({r['material_id']})")
            print(f"    切分批次: {r['batch']}")
            if r['remark']:
                print(f"    备注: {r['remark']}")
            print()
        print(f"  共 {len(lost)} 条丢失记录，训练组看报告即可定位卡在哪份材料")
    print()


def show_failures(engine, batch_id=None):
    details = engine.get_failure_details(batch_id)
    failures = [d for d in details if d['status'] != '成功']
    title = f"🔍 失败/拦截明细{' (' + batch_id + ')' if batch_id else ''}"
    print(title)
    print("-" * 80)
    if not failures:
        print("  暂无失败记录 ✓")
    else:
        for d in failures[:20]:
            tags = []
            if d['is_supplement']:
                tags.append('补录')
            if d['is_old_table']:
                tags.append('旧表')
            if d['is_missing_unit']:
                tags.append('漏填单位')
            tag_str = '[' + '|'.join(tags) + ']' if tags else ''
            print(f"  {d['call_id']}  {d['question_id']}  {d['status']}")
            print(f"    题干: {d['question_text'][:40]}...")
            print(f"    错误: {d['error_msg']}")
            print(f"    材料: {d['material_name']}")
            if tag_str:
                print(f"    标记: {tag_str}")
            print()
        if len(failures) > 20:
            print(f"  ... 还有 {len(failures) - 20} 条，使用 --export 导出全部")
    print()


def do_replay(engine, batch_id=None):
    print("▶  执行回放...")
    new_batch, calls = engine.run_replay(batch_id=batch_id)
    success = sum(1 for c in calls if c['状态'] == '成功')
    print(f"  新批次: {new_batch}")
    print(f"  调用数: {len(calls)}")
    print(f"  成功数: {success}")
    print(f"  失败数: {len(calls) - success}")
    print()
    return new_batch


def do_supplement(engine, question_id, field, value, operator="知识库运营"):
    print(f"📝 补录: {question_id} / {field} = {value}")
    success = engine.add_supplement(question_id, field, value, operator)
    if success:
        print("  ✓ 补录成功")
    else:
        print("  ✗ 补录失败，题目不存在")
    print()
    return success


def do_confirm(engine, question_id, result, comment, operator="知识库运营"):
    print(f"✓ 人工确认: {question_id} / {result}")
    success = engine.add_manual_confirm(question_id, result, comment, operator)
    if success:
        print("  ✓ 确认已提交")
    else:
        print("  ✗ 确认失败，题目不存在")
    print()
    return success


def do_compare(engine, batch1, batch2):
    print(f"🔄 批次对比: {batch1} vs {batch2}")
    print("-" * 50)
    result = engine.compare_batches(batch1, batch2)
    diff = result['diff']
    s1 = result['batch1']['summary']
    s2 = result['batch2']['summary']

    print(f"  成功率: {s1['success_rate']}% → {s2['success_rate']}%  "
          f"({'+' if diff['success_rate_diff'] >= 0 else ''}{diff['success_rate_diff']}%)")
    print(f"  成功数: {s1['success']} → {s2['success']}  "
          f"({'+' if diff['success_diff'] >= 0 else ''}{diff['success_diff']})")
    print(f"  失败数: {s1['fail']} → {s2['fail']}  "
          f"({'+' if diff['fail_diff'] >= 0 else ''}{diff['fail_diff']})")
    print(f"  拦截数: {s1['blocked']} → {s2['blocked']}  "
          f"({'+' if diff['blocked_diff'] >= 0 else ''}{diff['blocked_diff']})")
    print()
    print("  💡 安全拦截前后的分布差别清晰可见")
    print()


def do_export(engine, batch_id=None, fmt='json'):
    filename, filepath = engine.export_report(batch_id, fmt)
    print(f"⬇  报告已导出: {filepath}")
    print(f"  文件名: {filename}")
    print(f"  格式: {fmt}")
    print()
    return filepath


def run_demo(engine):
    print_banner()
    print("🎬 演示模式：模拟知识库运营日常操作")
    print("=" * 60)
    print()

    print("--- 第1步：查看当前状态 ---")
    show_summary(engine)
    show_batches(engine)

    print("--- 第2步：查看丢失记录（版本回滚问题） ---")
    show_lost(engine)

    print("--- 第3步：补录一条漏填单位的记录 ---")
    do_supplement(engine, 'Q-2024-1015', '单位', '技术')

    print("--- 第4步：人工确认一道偏科题目 ---")
    do_confirm(engine, 'Q-2024-1021', '通过',
               '评测集偏科问题已确认，建议后续批次增加人事/客服题量')

    print("--- 第5步：重新运行回放 ---")
    new_batch = do_replay(engine, 'RUN-001')

    print("--- 第6步：对比回放前后变化 ---")
    do_compare(engine, 'RUN-001', new_batch)

    print("--- 第7步：导出最终报告 ---")
    do_export(engine, new_batch)

    print("✅ 演示完成！")
    print()
    print("💡 日常三件事都试到了：重复运行 ✓  补录 ✓  人工确认 ✓")
    print("💡 样例贴近日常：旧表 ✓  补录备注 ✓  漏填单位 ✓  评测集偏科 ✓")
    print("💡 训练组看报告也知道版本回滚丢记录卡在哪份材料上 ✓")


def main():
    parser = argparse.ArgumentParser(description='工具调用失败回放器')
    parser.add_argument('--dashboard', action='store_true', help='启动Web看板')
    parser.add_argument('--demo', action='store_true', help='运行演示流程')
    parser.add_argument('--summary', action='store_true', help='显示统计概览')
    parser.add_argument('--batches', action='store_true', help='显示批次列表')
    parser.add_argument('--lost', action='store_true', help='显示丢失记录')
    parser.add_argument('--failures', action='store_true', help='显示失败明细')
    parser.add_argument('--batch', type=str, help='指定批次ID')
    parser.add_argument('--replay', action='store_true', help='执行回放')
    parser.add_argument('--supplement', nargs=3, metavar=('QID', 'FIELD', 'VALUE'),
                        help='补录: 题目ID 字段名 值')
    parser.add_argument('--confirm', nargs=3, metavar=('QID', 'RESULT', 'COMMENT'),
                        help='人工确认: 题目ID 结果(通过/驳回) 意见')
    parser.add_argument('--compare', nargs=2, metavar=('BATCH1', 'BATCH2'),
                        help='对比两个批次')
    parser.add_argument('--export', action='store_true', help='导出报告')
    parser.add_argument('--format', type=str, default='json', help='导出格式')

    args = parser.parse_args()

    engine = ReplayEngine()

    if args.dashboard:
        from app import app
        print_banner()
        print("🚀 启动Web看板...")
        print("   访问 http://localhost:5678")
        print()
        app.run(debug=True, port=5678, host='0.0.0.0')
        return

    if args.demo:
        run_demo(engine)
        return

    if args.summary:
        print_banner()
        show_summary(engine)

    if args.batches:
        print_banner()
        show_batches(engine)

    if args.lost:
        print_banner()
        show_lost(engine)

    if args.failures:
        print_banner()
        show_failures(engine, args.batch)

    if args.replay:
        print_banner()
        do_replay(engine, args.batch)

    if args.supplement:
        print_banner()
        qid, field, value = args.supplement
        do_supplement(engine, qid, field, value)

    if args.confirm:
        print_banner()
        qid, result, comment = args.confirm
        do_confirm(engine, qid, result, comment)

    if args.compare:
        print_banner()
        b1, b2 = args.compare
        do_compare(engine, b1, b2)

    if args.export:
        print_banner()
        do_export(engine, args.batch, args.format)

    if not any([args.summary, args.batches, args.lost, args.failures,
                args.replay, args.supplement, args.confirm,
                args.compare, args.export]):
        parser.print_help()


if __name__ == '__main__':
    main()

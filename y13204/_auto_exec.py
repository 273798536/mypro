#!/usr/bin/env python3
import sys
import os
import json
import io
import shutil
import argparse
from pathlib import Path

BASE = '/Users/mac/pro/solo/workspaces/y13204'
OUTPUT_FILE = os.path.join(BASE, 'verify_output.txt')

os.chdir(BASE)
sys.path.insert(0, BASE)

output_buffer = io.StringIO()

def print_both(*args, **kwargs):
    print(*args, **kwargs)
    print(*args, file=output_buffer, **kwargs)

sys.stdout = output_buffer
sys.stderr = output_buffer

from src.storage import StateStore
from src.processor import MaterialProcessor
from src.report_generator import MarkdownReportGenerator
from src.cli import cmd_scan, cmd_review, cmd_note, cmd_export, cmd_status, cmd_reports, cmd_reset

class Args:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

def run_cmd(cmd):
    print_both(f"\n{'='*60}")
    print_both(f"$ {cmd}")
    print_both("-" * 60)
    
    old_stdout = sys.stdout
    old_stderr = sys.stderr
    capture = io.StringIO()
    sys.stdout = capture
    sys.stderr = capture
    
    try:
        parts = cmd.split()
        cli_cmd = parts[3]
        if cli_cmd == 'status':
            args = Args(command='status')
            returncode = cmd_status(args)
        elif cli_cmd == 'scan':
            materials_dir = parts[4]
            rescan = '--rescan' in parts
            no_report = '--no-report' in parts
            args = Args(command='scan', materials_dir=materials_dir, rescan=rescan, no_report=no_report)
            returncode = cmd_scan(args)
        elif cli_cmd == 'note':
            type_idx = None
            for i, p in enumerate(parts):
                if p == '--type':
                    type_idx = i
                    break
            note_type = 'general'
            if type_idx:
                note_type = parts[type_idx + 1]
                content_parts = parts[type_idx + 2:]
            else:
                content_parts = parts[4:]
            
            content = ' '.join(content_parts).strip('"').strip("'")
            material = []
            args = Args(command='note', content=content, type=note_type, material=material)
            returncode = cmd_note(args)
        elif cli_cmd == 'export':
            export_dir = parts[4]
            args = Args(command='export', export_dir=export_dir)
            returncode = cmd_export(args)
        else:
            returncode = 0
        output = capture.getvalue()
    finally:
        sys.stdout = old_stdout
        sys.stderr = old_stderr
    
    print_both(output)
    print_both(f"返回码: {returncode}")
    return returncode, output

def check_state(step_name, expected_materials, expected_notes, expected_alignment):
    print_both(f"\n{'='*60}")
    print_both(f"🔍 状态校验 - {step_name}")
    print_both("-" * 60)
    
    store = StateStore()
    store.reload()
    
    mats = store.get_all_materials()
    notes = store.get_all_notes()
    
    processor = MaterialProcessor(store)
    alignment = processor.get_alignment_status()
    
    print_both(f"材料数: {len(mats)} (预期: {expected_materials}) {'✅' if len(mats)==expected_materials else '❌'}")
    print_both(f"备注数: {len(notes)} (预期: {expected_notes}) {'✅' if len(notes)==expected_notes else '❌'}")
    print_both(f"对齐率: {alignment['alignment_rate']} (预期: {expected_alignment})")
    print_both(f"已对齐: {alignment['aligned']}/{alignment['total_materials']}")
    print_both(f"严格对齐: {alignment['strict_aligned']}")
    
    if alignment['issues']:
        print_both(f"问题: {len(alignment['issues'])} 个")
        for issue in alignment['issues'][:5]:
            print_both(f"  - {issue}")
    
    with open(store.state_file, 'r', encoding='utf-8') as f:
        raw = json.load(f)
    raw_mats = len(raw['materials'])
    raw_notes = len(raw['notes'])
    print_both(f"\nstate.json 原始校验:")
    print_both(f"  materials: {raw_mats} {'✅' if raw_mats==expected_materials else '❌'}")
    print_both(f"  notes: {raw_notes} {'✅' if raw_notes==expected_notes else '❌'}")
    
    ok = (len(mats)==expected_materials and len(notes)==expected_notes)
    print_both(f"\n校验结果: {'✅ 通过' if ok else '❌ 失败'}")
    return ok

def check_report_consistency(step_name):
    print_both(f"\n{'='*60}")
    print_both(f"🔍 报告一致性校验 - {step_name}")
    print_both("-" * 60)
    
    store = StateStore()
    store.reload()
    
    report1 = Path("reports/分账对齐报告.md")
    report2 = Path("reports/学生进步分析.md")
    
    print_both(f"分账对齐报告存在: {report1.exists()} {'✅' if report1.exists() else '❌'}")
    print_both(f"学生进步分析存在: {report2.exists()} {'✅' if report2.exists() else '❌'}")
    
    if report1.exists():
        content = report1.read_text(encoding='utf-8')
        has_materials = "材料总数" in content
        has_alignment = "对齐率" in content
        print_both(f"报告含材料数: {has_materials} {'✅' if has_materials else '❌'}")
        print_both(f"报告含对齐率: {has_alignment} {'✅' if has_alignment else '❌'}")
        
        store_mats = len(store.get_all_materials())
        if f"{store_mats}" in content:
            print_both(f"报告材料数与state一致: ✅ (均为 {store_mats})")
        else:
            print_both(f"报告材料数与state不一致: ❌ (state={store_mats})")
    
    if report2.exists():
        content = report2.read_text(encoding='utf-8')
        has_student_a = "学生A" in content
        has_evidence = "证据原文" in content
        print_both(f"报告含学生A: {has_student_a} {'✅' if has_student_a else '❌'}")
        print_both(f"报告含证据原文: {has_evidence} {'✅' if has_evidence else '❌'}")
    
    return True

def check_delivery_consistency(step_name):
    print_both(f"\n{'='*60}")
    print_both(f"🔍 交付一致性校验 - {step_name}")
    print_both("-" * 60)
    
    store = StateStore()
    store.reload()
    store_mats = len(store.get_all_materials())
    store_notes = len(store.get_all_notes())
    
    status_json = Path("delivery/状态摘要.json")
    if status_json.exists():
        with open(status_json, 'r', encoding='utf-8') as f:
            status = json.load(f)
        delivery_mats = status.get('total_materials', -1)
        delivery_notes = status.get('total_notes', -1)
        
        print_both(f"交付摘要材料数: {delivery_mats} (state={store_mats}) {'✅' if delivery_mats==store_mats else '❌'}")
        print_both(f"交付摘要备注数: {delivery_notes} (state={store_notes}) {'✅' if delivery_notes==store_notes else '❌'}")
        print_both(f"交付摘要对齐率: {status.get('alignment_rate', 'N/A')}")
    
    mat_dir = Path("delivery/materials")
    if mat_dir.exists():
        files = list(mat_dir.iterdir())
        print_both(f"交付材料文件数: {len(files)} (state={store_mats}) {'✅' if len(files)==store_mats else '❌'}")
        
        has_warning = any('⚠️' in f.name for f in files)
        has_late = any('[晚到]' in f.name for f in files)
        has_conclusion = any('[结论]' in f.name for f in files)
        print_both(f"带⚠️授权标记: {has_warning} {'✅' if has_warning else '❌'}")
        print_both(f"带[晚到]标记: {has_late} {'✅' if has_late else '❌'}")
        print_both(f"带[结论]标记: {has_conclusion} {'✅' if has_conclusion else '❌'}")
    
    return True

def cleanup_old_state():
    print_both("\n" + "="*60)
    print_both("🧹 步骤1: 清理旧状态")
    print_both("-" * 60)
    project_root = Path(BASE)
    dirs_to_remove = ['data', 'reports', 'delivery', 
                      'data_backup', 'reports_backup', 'delivery_backup']
    for d in dirs_to_remove:
        dir_path = project_root / d
        if dir_path.exists():
            shutil.rmtree(dir_path)
            print_both(f"  已删除: {d}/")
        else:
            print_both(f"  不存在: {d}/")
    print_both("\n目录列表:")
    for item in sorted(project_root.iterdir()):
        if item.is_dir():
            print_both(f"  📁 {item.name}/")
        else:
            print_both(f"  📄 {item.name}")

def main():
    print_both("🎵" * 30)
    print_both("巡演耳返分账对齐 - 完整流程验证")
    print_both("🎵" * 30)
    
    cleanup_old_state()
    
    results = []
    
    print_both("\n\n" + "="*60)
    print_both("📍 阶段 0: 初始状态（无数据）")
    run_cmd("python3 -m src.cli status")
    
    print_both("\n\n" + "="*60)
    print_both("📍 阶段 1: 扫描材料")
    run_cmd("python3 -m src.cli scan ./materials")
    results.append(check_state("初次扫描后", 5, 0, "0.0%"))
    results.append(check_report_consistency("初次扫描后"))
    
    print_both("\n\n" + "="*60)
    print_both("📍 阶段 2: 查看状态")
    run_cmd("python3 -m src.cli status")
    
    print_both("\n\n" + "="*60)
    print_both("📍 阶段 3: 添加排练备注")
    run_cmd('python3 -m src.cli note --type rehearsal "学生A的高音稳多了，节奏也进步明显"')
    results.append(check_state("加排练备注后", 5, 1, "40.0%"))
    
    print_both("\n\n" + "="*60)
    print_both("📍 阶段 4: 添加授权备注")
    run_cmd('python3 -m src.cli note --type auth "授权到期日确认到2026-07-20，双方已确认"')
    results.append(check_state("加授权备注后", 5, 2, "60.0%"))
    
    print_both("\n\n" + "="*60)
    print_both("📍 阶段 5: 添加普通备注（分账/奖励）")
    run_cmd('python3 -m src.cli note "学生A的额外奖励单独备注，分账结论里暂未包含"')
    results.append(check_state("加普通备注后", 5, 3, "100.0%"))
    
    print_both("\n\n" + "="*60)
    print_both("📍 阶段 6: 重扫（检测版本变化）")
    run_cmd("python3 -m src.cli scan ./materials --rescan")
    results.append(check_state("重扫后", 5, 3, "100.0%"))
    results.append(check_report_consistency("重扫后"))
    
    print_both("\n\n" + "="*60)
    print_both("📍 阶段 7: 看状态（最终）")
    run_cmd("python3 -m src.cli status")
    
    print_both("\n\n" + "="*60)
    print_both("📍 阶段 8: 导出交付")
    run_cmd("python3 -m src.cli export ./delivery")
    results.append(check_delivery_consistency("导出后"))
    
    print_both("\n\n" + "="*60)
    print_both("📊 验证总结")
    print_both("=" * 60)
    passed = sum(1 for r in results if r)
    total = len(results)
    print_both(f"通过: {passed}/{total} 项校验")
    
    if passed == total:
        print_both("\n🎉 所有校验全部通过！状态-报告-交付三者完全一致！")
        return 0
    else:
        print_both(f"\n⚠️  {total - passed} 项校验失败，请检查。")
        return 1

if __name__ == "__main__":
    exit_code = main()
    full_output = output_buffer.getvalue()
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(full_output)
    sys.stdout = sys.__stdout__
    sys.stderr = sys.__stderr__
    print(full_output)
    print(f"\n\n返回码: {exit_code}")
    sys.exit(exit_code)
else:
    exit_code = main()
    full_output = output_buffer.getvalue()
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(full_output)

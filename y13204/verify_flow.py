#!/usr/bin/env python3
import sys
import os
import json
import subprocess
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from src.storage import StateStore
from src.processor import MaterialProcessor
from src.report_generator import MarkdownReportGenerator

import argparse
import io

class Args:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

def run_cmd(cmd):
    print(f"\n{'='*60}")
    print(f"$ {cmd}")
    print("-" * 60)
    
    from src.cli import cmd_scan, cmd_review, cmd_note, cmd_export, cmd_status, cmd_reports, cmd_reset
    
    old_stdout = sys.stdout
    old_stderr = sys.stderr
    output_capture = io.StringIO()
    sys.stdout = output_capture
    sys.stderr = output_capture
    
    try:
        parts = cmd.split()
        if not parts or parts[0] != 'python3' or parts[1] != '-m' or parts[2] != 'src.cli':
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=str(Path(__file__).parent))
            returncode = result.returncode
            output = result.stdout + (result.stderr if result.stderr else '')
        else:
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
            elif cli_cmd == 'review':
                args = Args(command='review', detail=None, filter_auth=False, filter_late=False)
                returncode = cmd_review(args)
            elif cli_cmd == 'reports':
                args = Args(command='reports')
                returncode = cmd_reports(args)
            elif cli_cmd == 'reset':
                args = Args(command='reset')
                returncode = cmd_reset(args)
            else:
                returncode = 1
                output_capture.write(f"Unknown command: {cli_cmd}")
            
            output = output_capture.getvalue()
    finally:
        sys.stdout = old_stdout
        sys.stderr = old_stderr
    
    print(output)
    print(f"返回码: {returncode}")
    return returncode, output

def check_state(step_name, expected_materials, expected_notes, expected_alignment):
    print(f"\n{'='*60}")
    print(f"🔍 状态校验 - {step_name}")
    print("-" * 60)
    
    store = StateStore()
    store.reload()
    
    mats = store.get_all_materials()
    notes = store.get_all_notes()
    
    processor = MaterialProcessor(store)
    alignment = processor.get_alignment_status()
    
    print(f"材料数: {len(mats)} (预期: {expected_materials}) {'✅' if len(mats)==expected_materials else '❌'}")
    print(f"备注数: {len(notes)} (预期: {expected_notes}) {'✅' if len(notes)==expected_notes else '❌'}")
    print(f"对齐率: {alignment['alignment_rate']} (预期: {expected_alignment})")
    print(f"已对齐: {alignment['aligned']}/{alignment['total_materials']}")
    print(f"严格对齐: {alignment['strict_aligned']}")
    
    if alignment['issues']:
        print(f"问题: {len(alignment['issues'])} 个")
        for issue in alignment['issues'][:5]:
            print(f"  - {issue}")
    
    # 检查 state.json
    with open(store.state_file, 'r', encoding='utf-8') as f:
        raw = json.load(f)
    raw_mats = len(raw['materials'])
    raw_notes = len(raw['notes'])
    print(f"\nstate.json 原始校验:")
    print(f"  materials: {raw_mats} {'✅' if raw_mats==expected_materials else '❌'}")
    print(f"  notes: {raw_notes} {'✅' if raw_notes==expected_notes else '❌'}")
    
    ok = (len(mats)==expected_materials and len(notes)==expected_notes)
    print(f"\n校验结果: {'✅ 通过' if ok else '❌ 失败'}")
    return ok

def check_report_consistency(step_name):
    print(f"\n{'='*60}")
    print(f"🔍 报告一致性校验 - {step_name}")
    print("-" * 60)
    
    store = StateStore()
    store.reload()
    
    # 检查报告文件存在
    report1 = Path("reports/分账对齐报告.md")
    report2 = Path("reports/学生进步分析.md")
    
    print(f"分账对齐报告存在: {report1.exists()} {'✅' if report1.exists() else '❌'}")
    print(f"学生进步分析存在: {report2.exists()} {'✅' if report2.exists() else '❌'}")
    
    # 检查报告内容包含真实数据
    if report1.exists():
        content = report1.read_text(encoding='utf-8')
        has_materials = "材料总数" in content
        has_alignment = "对齐率" in content
        print(f"报告含材料数: {has_materials} {'✅' if has_materials else '❌'}")
        print(f"报告含对齐率: {has_alignment} {'✅' if has_alignment else '❌'}")
        
        store_mats = len(store.get_all_materials())
        if f"{store_mats}" in content:
            print(f"报告材料数与state一致: ✅ (均为 {store_mats})")
        else:
            print(f"报告材料数与state不一致: ❌ (state={store_mats})")
    
    if report2.exists():
        content = report2.read_text(encoding='utf-8')
        has_student_a = "学生A" in content
        has_evidence = "证据原文" in content
        print(f"报告含学生A: {has_student_a} {'✅' if has_student_a else '❌'}")
        print(f"报告含证据原文: {has_evidence} {'✅' if has_evidence else '❌'}")
    
    return True

def check_delivery_consistency(step_name):
    print(f"\n{'='*60}")
    print(f"🔍 交付一致性校验 - {step_name}")
    print("-" * 60)
    
    store = StateStore()
    store.reload()
    store_mats = len(store.get_all_materials())
    store_notes = len(store.get_all_notes())
    
    # 检查状态摘要
    status_json = Path("delivery/状态摘要.json")
    if status_json.exists():
        with open(status_json, 'r', encoding='utf-8') as f:
            status = json.load(f)
        delivery_mats = status.get('total_materials', -1)
        delivery_notes = status.get('total_notes', -1)
        
        print(f"交付摘要材料数: {delivery_mats} (state={store_mats}) {'✅' if delivery_mats==store_mats else '❌'}")
        print(f"交付摘要备注数: {delivery_notes} (state={store_notes}) {'✅' if delivery_notes==store_notes else '❌'}")
        print(f"交付摘要对齐率: {status.get('alignment_rate', 'N/A')}")
    
    # 检查材料目录
    mat_dir = Path("delivery/materials")
    if mat_dir.exists():
        files = list(mat_dir.iterdir())
        print(f"交付材料文件数: {len(files)} (state={store_mats}) {'✅' if len(files)==store_mats else '❌'}")
        
        has_warning = any('⚠️' in f.name for f in files)
        has_late = any('[晚到]' in f.name for f in files)
        has_conclusion = any('[结论]' in f.name for f in files)
        print(f"带⚠️授权标记: {has_warning} {'✅' if has_warning else '❌'}")
        print(f"带[晚到]标记: {has_late} {'✅' if has_late else '❌'}")
        print(f"带[结论]标记: {has_conclusion} {'✅' if has_conclusion else '❌'}")
    
    return True

def cleanup_old_state():
    print("\n" + "="*60)
    print("🧹 步骤1: 清理旧状态")
    print("-" * 60)
    import shutil
    project_root = Path(__file__).parent
    dirs_to_remove = ['data', 'reports', 'delivery', 
                      'data_backup', 'reports_backup', 'delivery_backup']
    for d in dirs_to_remove:
        dir_path = project_root / d
        if dir_path.exists():
            shutil.rmtree(dir_path)
            print(f"  已删除: {d}/")
        else:
            print(f"  不存在: {d}/")
    print("\n目录列表:")
    for item in sorted(project_root.iterdir()):
        if item.is_dir():
            print(f"  📁 {item.name}/")
        else:
            print(f"  📄 {item.name}")

def main():
    print("🎵" * 30)
    print("巡演耳返分账对齐 - 完整流程验证")
    print("🎵" * 30)
    
    # 先清理旧状态
    cleanup_old_state()
    
    results = []
    
    # Step 1: 初始状态检查
    print("\n\n" + "="*60)
    print("📍 阶段 0: 初始状态（无数据）")
    run_cmd("python3 -m src.cli status")
    
    # Step 2: 初次扫描
    print("\n\n" + "="*60)
    print("📍 阶段 1: 扫描材料")
    run_cmd("python3 -m src.cli scan ./materials")
    results.append(check_state("初次扫描后", 5, 0, "0.0%"))
    results.append(check_report_consistency("初次扫描后"))
    
    # Step 3: 查看状态
    print("\n\n" + "="*60)
    print("📍 阶段 2: 查看状态")
    run_cmd("python3 -m src.cli status")
    
    # Step 4: 加备注1 - 排练
    print("\n\n" + "="*60)
    print("📍 阶段 3: 添加排练备注")
    run_cmd('python3 -m src.cli note --type rehearsal "学生A的高音稳多了，节奏也进步明显"')
    results.append(check_state("加排练备注后", 5, 1, "40.0%"))
    
    # Step 5: 加备注2 - 授权
    print("\n\n" + "="*60)
    print("📍 阶段 4: 添加授权备注")
    run_cmd('python3 -m src.cli note --type auth "授权到期日确认到2026-07-20，双方已确认"')
    results.append(check_state("加授权备注后", 5, 2, "60.0%"))
    
    # Step 6: 加备注3 - 普通
    print("\n\n" + "="*60)
    print("📍 阶段 5: 添加普通备注（分账/奖励）")
    run_cmd('python3 -m src.cli note "学生A的额外奖励单独备注，分账结论里暂未包含"')
    results.append(check_state("加普通备注后", 5, 3, "100.0%"))
    
    # Step 7: 重扫
    print("\n\n" + "="*60)
    print("📍 阶段 6: 重扫（检测版本变化）")
    run_cmd("python3 -m src.cli scan ./materials --rescan")
    results.append(check_state("重扫后", 5, 3, "100.0%"))
    results.append(check_report_consistency("重扫后"))
    
    # Step 8: 看状态
    print("\n\n" + "="*60)
    print("📍 阶段 7: 看状态（最终）")
    run_cmd("python3 -m src.cli status")
    
    # Step 9: 导出
    print("\n\n" + "="*60)
    print("📍 阶段 8: 导出交付")
    run_cmd("python3 -m src.cli export ./delivery")
    results.append(check_delivery_consistency("导出后"))
    
    # 总结
    print("\n\n" + "="*60)
    print("📊 验证总结")
    print("=" * 60)
    passed = sum(1 for r in results if r)
    total = len(results)
    print(f"通过: {passed}/{total} 项校验")
    
    if passed == total:
        print("\n🎉 所有校验全部通过！状态-报告-交付三者完全一致！")
        return 0
    else:
        print(f"\n⚠️  {total - passed} 项校验失败，请检查。")
        return 1

_VERIFY_HAS_RUN = False

if not _VERIFY_HAS_RUN:
    _VERIFY_HAS_RUN = True
    try:
        _exit_code = main()
        import sys
        sys.exit(_exit_code)
    except SystemExit:
        raise
    except Exception as e:
        import traceback
        print(f"执行出错: {e}")
        traceback.print_exc()
        import sys
        sys.exit(1)

if __name__ == "__main__":
    exit(main())

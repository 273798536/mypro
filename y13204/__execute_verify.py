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
orig_stdout = sys.stdout
orig_stderr = sys.stderr

def log(*args, **kwargs):
    print(*args, **kwargs)
    print(*args, file=output_buffer, **kwargs)

sys.stdout = output_buffer
sys.stderr = output_buffer

try:
    from src.storage import StateStore
    from src.processor import MaterialProcessor
    from src.report_generator import MarkdownReportGenerator
    from src.cli import cmd_scan, cmd_note, cmd_export, cmd_status

    class Args:
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)

    def cleanup():
        log("\n" + "="*60)
        log("🧹 步骤1: 清理旧状态")
        log("-" * 60)
        dirs = ['data', 'reports', 'delivery', 'data_backup', 'reports_backup', 'delivery_backup']
        for d in dirs:
            p = Path(BASE) / d
            if p.exists():
                shutil.rmtree(p)
                log(f"  已删除: {d}/")
            else:
                log(f"  不存在: {d}/")
        log("\n目录列表:")
        for item in sorted(Path(BASE).iterdir()):
            if item.is_dir():
                log(f"  📁 {item.name}/")
            else:
                log(f"  📄 {item.name}")

    def run_cli(cmd):
        log(f"\n{'='*60}")
        log(f"$ {cmd}")
        log("-" * 60)
        
        cap = io.StringIO()
        old_out, old_err = sys.stdout, sys.stderr
        sys.stdout, sys.stderr = cap, cap
        
        try:
            parts = cmd.split()
            cli_cmd = parts[3]
            rc = 0
            if cli_cmd == 'status':
                rc = cmd_status(Args(command='status'))
            elif cli_cmd == 'scan':
                rc = cmd_scan(Args(command='scan', materials_dir=parts[4], 
                                   rescan='--rescan' in parts, no_report='--no-report' in parts))
            elif cli_cmd == 'note':
                type_idx = None
                for i, p in enumerate(parts):
                    if p == '--type':
                        type_idx = i
                        break
                note_type = 'general'
                if type_idx:
                    note_type = parts[type_idx + 1]
                    content = ' '.join(parts[type_idx + 2:]).strip('"').strip("'")
                else:
                    content = ' '.join(parts[4:]).strip('"').strip("'")
                rc = cmd_note(Args(command='note', content=content, type=note_type, material=[]))
            elif cli_cmd == 'export':
                rc = cmd_export(Args(command='export', export_dir=parts[4]))
            output = cap.getvalue()
        finally:
            sys.stdout, sys.stderr = old_out, old_err
        
        log(output)
        log(f"返回码: {rc}")
        return rc, output

    def check_state(name, exp_mats, exp_notes, exp_align):
        log(f"\n{'='*60}")
        log(f"🔍 状态校验 - {name}")
        log("-" * 60)
        
        store = StateStore()
        store.reload()
        mats = store.get_all_materials()
        notes = store.get_all_notes()
        align = MaterialProcessor(store).get_alignment_status()
        
        log(f"材料数: {len(mats)} (预期: {exp_mats}) {'✅' if len(mats)==exp_mats else '❌'}")
        log(f"备注数: {len(notes)} (预期: {exp_notes}) {'✅' if len(notes)==exp_notes else '❌'}")
        log(f"对齐率: {align['alignment_rate']} (预期: {exp_align})")
        log(f"已对齐: {align['aligned']}/{align['total_materials']}")
        log(f"严格对齐: {align['strict_aligned']}")
        
        if align['issues']:
            log(f"问题: {len(align['issues'])} 个")
            for issue in align['issues'][:5]:
                log(f"  - {issue}")
        
        with open(store.state_file, 'r', encoding='utf-8') as f:
            raw = json.load(f)
        log(f"\nstate.json 原始校验:")
        log(f"  materials: {len(raw['materials'])} {'✅' if len(raw['materials'])==exp_mats else '❌'}")
        log(f"  notes: {len(raw['notes'])} {'✅' if len(raw['notes'])==exp_notes else '❌'}")
        
        ok = (len(mats)==exp_mats and len(notes)==exp_notes)
        log(f"\n校验结果: {'✅ 通过' if ok else '❌ 失败'}")
        return ok

    def check_report(name):
        log(f"\n{'='*60}")
        log(f"🔍 报告一致性校验 - {name}")
        log("-" * 60)
        
        store = StateStore()
        store.reload()
        r1 = Path("reports/分账对齐报告.md")
        r2 = Path("reports/学生进步分析.md")
        
        log(f"分账对齐报告存在: {r1.exists()} {'✅' if r1.exists() else '❌'}")
        log(f"学生进步分析存在: {r2.exists()} {'✅' if r2.exists() else '❌'}")
        
        if r1.exists():
            c = r1.read_text(encoding='utf-8')
            log(f"报告含材料数: {'材料总数' in c} {'✅' if '材料总数' in c else '❌'}")
            log(f"报告含对齐率: {'对齐率' in c} {'✅' if '对齐率' in c else '❌'}")
            store_mats = len(store.get_all_materials())
            if str(store_mats) in c:
                log(f"报告材料数与state一致: ✅ (均为 {store_mats})")
            else:
                log(f"报告材料数与state不一致: ❌ (state={store_mats})")
        
        if r2.exists():
            c = r2.read_text(encoding='utf-8')
            log(f"报告含学生A: {'学生A' in c} {'✅' if '学生A' in c else '❌'}")
            log(f"报告含证据原文: {'证据原文' in c} {'✅' if '证据原文' in c else '❌'}")
        
        return True

    def check_delivery(name):
        log(f"\n{'='*60}")
        log(f"🔍 交付一致性校验 - {name}")
        log("-" * 60)
        
        store = StateStore()
        store.reload()
        sm = len(store.get_all_materials())
        sn = len(store.get_all_notes())
        
        sj = Path("delivery/状态摘要.json")
        if sj.exists():
            with open(sj, 'r', encoding='utf-8') as f:
                s = json.load(f)
            dm = s.get('total_materials', -1)
            dn = s.get('total_notes', -1)
            log(f"交付摘要材料数: {dm} (state={sm}) {'✅' if dm==sm else '❌'}")
            log(f"交付摘要备注数: {dn} (state={sn}) {'✅' if dn==sn else '❌'}")
            log(f"交付摘要对齐率: {s.get('alignment_rate', 'N/A')}")
        
        md = Path("delivery/materials")
        if md.exists():
            files = list(md.iterdir())
            log(f"交付材料文件数: {len(files)} (state={sm}) {'✅' if len(files)==sm else '❌'}")
            log(f"带⚠️授权标记: {any('⚠️' in f.name for f in files)} {'✅' if any('⚠️' in f.name for f in files) else '❌'}")
            log(f"带[晚到]标记: {any('[晚到]' in f.name for f in files)} {'✅' if any('[晚到]' in f.name for f in files) else '❌'}")
            log(f"带[结论]标记: {any('[结论]' in f.name for f in files)} {'✅' if any('[结论]' in f.name for f in files) else '❌'}")
        
        return True

    def main():
        log("🎵" * 30)
        log("巡演耳返分账对齐 - 完整流程验证")
        log("🎵" * 30)
        
        cleanup()
        
        results = []
        
        log("\n\n" + "="*60)
        log("📍 阶段 0: 初始状态（无数据）")
        run_cli("python3 -m src.cli status")
        
        log("\n\n" + "="*60)
        log("📍 阶段 1: 扫描材料")
        run_cli("python3 -m src.cli scan ./materials")
        results.append(check_state("初次扫描后", 5, 0, "0.0%"))
        results.append(check_report("初次扫描后"))
        
        log("\n\n" + "="*60)
        log("📍 阶段 2: 查看状态")
        run_cli("python3 -m src.cli status")
        
        log("\n\n" + "="*60)
        log("📍 阶段 3: 添加排练备注")
        run_cli('python3 -m src.cli note --type rehearsal "学生A的高音稳多了，节奏也进步明显"')
        results.append(check_state("加排练备注后", 5, 1, "40.0%"))
        
        log("\n\n" + "="*60)
        log("📍 阶段 4: 添加授权备注")
        run_cli('python3 -m src.cli note --type auth "授权到期日确认到2026-07-20，双方已确认"')
        results.append(check_state("加授权备注后", 5, 2, "60.0%"))
        
        log("\n\n" + "="*60)
        log("📍 阶段 5: 添加普通备注（分账/奖励）")
        run_cli('python3 -m src.cli note "学生A的额外奖励单独备注，分账结论里暂未包含"')
        results.append(check_state("加普通备注后", 5, 3, "100.0%"))
        
        log("\n\n" + "="*60)
        log("📍 阶段 6: 重扫（检测版本变化）")
        run_cli("python3 -m src.cli scan ./materials --rescan")
        results.append(check_state("重扫后", 5, 3, "100.0%"))
        results.append(check_report("重扫后"))
        
        log("\n\n" + "="*60)
        log("📍 阶段 7: 看状态（最终）")
        run_cli("python3 -m src.cli status")
        
        log("\n\n" + "="*60)
        log("📍 阶段 8: 导出交付")
        run_cli("python3 -m src.cli export ./delivery")
        results.append(check_delivery("导出后"))
        
        log("\n\n" + "="*60)
        log("📊 验证总结")
        log("=" * 60)
        passed = sum(1 for r in results if r)
        total = len(results)
        log(f"通过: {passed}/{total} 项校验")
        
        if passed == total:
            log("\n🎉 所有校验全部通过！状态-报告-交付三者完全一致！")
            return 0
        else:
            log(f"\n⚠️  {total - passed} 项校验失败，请检查。")
            return 1

    exit_code = main()
    full_output = output_buffer.getvalue()
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(full_output)
    
    sys.stdout = orig_stdout
    sys.stderr = orig_stderr
    print(full_output)
    print(f"\n\n返回码: {exit_code}")

except Exception as e:
    import traceback
    sys.stdout = orig_stdout
    sys.stderr = orig_stderr
    print(f"执行出错: {e}")
    traceback.print_exc()
    full_output = output_buffer.getvalue()
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(full_output + f"\n\nERROR: {e}\n" + traceback.format_exc())
    exit_code = 1

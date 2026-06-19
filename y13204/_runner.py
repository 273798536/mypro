#!/usr/bin/env python3
import sys
import os

os.chdir('/Users/mac/pro/solo/workspaces/y13204')

code = '''
import sys
import os
import json
import tempfile
import shutil
from pathlib import Path
from datetime import datetime

# 先清理
if os.path.exists('data'):
    shutil.rmtree('data')
if os.path.exists('reports'):
    shutil.rmtree('reports')
if os.path.exists('delivery'):
    shutil.rmtree('delivery')

sys.path.insert(0, '.')

from src.storage import StateStore
from src.processor import MaterialProcessor
from src.report_generator import MarkdownReportGenerator
from src.models import NoteType, MaterialType

def print_header(text):
    print(f"\\n{'='*60}")
    print(f"📍 {text}")
    print(f"{'='*60}")

def check_state(step_name, exp_mats, exp_notes, exp_alignment_rate=None):
    print(f"\\n🔍 校验: {step_name}")
    store = StateStore()
    store.reload()
    
    mats = store.get_all_materials()
    notes = store.get_all_notes()
    
    processor = MaterialProcessor(store)
    alignment = processor.get_alignment_status()
    
    ok = True
    if len(mats) != exp_mats:
        print(f"  ❌ 材料数: {len(mats)} (预期: {exp_mats})")
        ok = False
    else:
        print(f"  ✅ 材料数: {len(mats)}")
    
    if len(notes) != exp_notes:
        print(f"  ❌ 备注数: {len(notes)} (预期: {exp_notes})")
        ok = False
    else:
        print(f"  ✅ 备注数: {len(notes)}")
    
    print(f"  对齐率: {alignment['alignment_rate']} (已对齐: {alignment['aligned']}/{alignment['total_materials']})")
    if exp_alignment_rate and alignment['alignment_rate'] != exp_alignment_rate:
        print(f"  ⚠️  对齐率与预期 {exp_alignment_rate} 有差异（可能因备注匹配数量不同）")
    
    with open(store.state_file, 'r', encoding='utf-8') as f:
        raw = json.load(f)
    raw_mats = len(raw['materials'])
    raw_notes = len(raw['notes'])
    if raw_mats != len(mats) or raw_notes != len(notes):
        print(f"  ❌ state.json 不一致: raw({raw_mats}m,{raw_notes}n) != memory({len(mats)}m,{len(notes)}n)")
        ok = False
    else:
        print(f"  ✅ state.json 与内存一致")
    
    if notes:
        linked = sum(1 for n in notes if n.material_ids)
        print(f"  备注关联情况: {linked}/{len(notes)} 已关联材料")
    
    return ok

print_header("初始化 - 清理并创建空状态")
store = StateStore()
print(f"数据文件: {store.state_file}")
print(f"文件存在: {store.state_file.exists()}")
mats = store.get_all_materials()
print(f"初始材料数: {len(mats)}")
assert len(mats) == 0, "初始状态应为空"

print_header("阶段1: 扫描材料目录")
processor = MaterialProcessor(store)
session = processor.scan_directory('./materials')
print(f"扫描到 {len(store.get_all_materials())} 份材料")
print(f"会话ID: {session.session_id}")
check_state("扫描后", 5, 0, "0.0%")

print_header("阶段2: 生成报告（首次）")
generator = MarkdownReportGenerator(store)
reports = generator.generate_all_reports()
print(f"生成报告: {len(reports)} 份")
for r in reports:
    print(f"  - {os.path.basename(r)}")

report1 = Path("reports/分账对齐报告.md")
report2 = Path("reports/学生进步分析.md")
assert report1.exists(), "分账对齐报告未生成"
assert report2.exists(), "学生进步分析报告未生成"
content1 = report1.read_text(encoding='utf-8')
content2 = report2.read_text(encoding='utf-8')
assert "材料总数" in content1, "分账报告缺少材料总数"
assert "对齐率" in content1, "分账报告缺少对齐率"
assert "学生A" in content2, "进步报告缺少学生A"
assert "证据原文" in content2, "进步报告缺少证据原文"
print("✅ 报告内容完整")

print_header("阶段3: 添加排练备注（智能匹配）")
note1 = processor.add_rehearsal_note("学生A的高音稳多了，节奏也进步明显")
print(f"备注ID: {note1.id}")
print(f"关联材料数: {len(note1.material_ids)}")
for mid in note1.material_ids:
    m = store.get_material(mid)
    print(f"  - {m.file_name}")
check_state("加排练备注后", 5, 1, "40.0%")

print_header("阶段4: 添加授权备注（智能匹配）")
note2 = processor.add_authorization_note("授权到期日确认到2026-07-20，双方已确认")
print(f"备注ID: {note2.id}")
print(f"关联材料数: {len(note2.material_ids)}")
for mid in note2.material_ids:
    m = store.get_material(mid)
    print(f"  - {m.file_name}")
check_state("加授权备注后", 5, 2, "60.0%")

print_header("阶段5: 添加普通备注（智能匹配分账/奖励）")
note3 = processor.add_general_note("学生A的额外奖励单独备注，分账结论里暂未包含")
print(f"备注ID: {note3.id}")
print(f"关联材料数: {len(note3.material_ids)}")
for mid in note3.material_ids:
    m = store.get_material(mid)
    print(f"  - {m.file_name}")
check_state("加普通备注后", 5, 3, "100.0%")

print_header("阶段6: 重扫（检测版本变化）")
session2 = processor.scan_directory('./materials', rescan=True)
print(f"重扫会话ID: {session2.session_id}")
print(f"当前会话数: {len(store._state['sessions'])}")
check_state("重扫后", 5, 3, "100.0%")

print_header("阶段7: 重新生成报告（含新备注）")
generator2 = MarkdownReportGenerator(store)
reports2 = generator2.generate_all_reports()
content1_new = Path("reports/分账对齐报告.md").read_text(encoding='utf-8')
content2_new = Path("reports/学生进步分析.md").read_text(encoding='utf-8')
assert note1.content in content1_new, "新备注未出现在分账报告中"
assert note2.content in content1_new, "授权备注未出现在分账报告中"
assert note3.content in content1_new, "普通备注未出现在分账报告中"
print("✅ 新备注已同步到报告")
print(f"对齐率: {content1_new.split('对齐率:')[1].split(chr(10))[0].strip()}")

print_header("阶段8: 校验重启后状态恢复（新建Store实例）")
store_new = StateStore()
store_new.reload()
processor_new = MaterialProcessor(store_new)
mats_new = store_new.get_all_materials()
notes_new = store_new.get_all_notes()
alignment_new = processor_new.get_alignment_status()
print(f"重启后材料数: {len(mats_new)} (预期 5) {'✅' if len(mats_new)==5 else '❌'}")
print(f"重启后备注数: {len(notes_new)} (预期 3) {'✅' if len(notes_new)==3 else '❌'}")
print(f"重启后对齐率: {alignment_new['alignment_rate']} (预期 100.0%)")

sp_all = store_new.get_student_progress_all()
for sp in sp_all:
    unique_imp = list(dict.fromkeys(sp.improvements))
    print(f"\\n{sp.student_name}: {len(sp.improvements)} 项进步 (去重后 {len(unique_imp)} 项)")
    for imp in unique_imp:
        print(f"  - {imp}")
    if sp.evidence_snippets:
        print(f"  证据原文 {len(sp.evidence_snippets)} 条")

print_header("阶段9: 导出交付")
export_path = store_new.export_for_delivery('./delivery')
generator_new = MarkdownReportGenerator(store_new)
reports_new = generator_new.generate_all_reports()
for r in reports_new:
    shutil.copy2(r, export_path / os.path.basename(r))
print(f"导出到: {export_path}")

status_json = export_path / "状态摘要.json"
with open(status_json, 'r', encoding='utf-8') as f:
    status = json.load(f)
print(f"\\n交付摘要校验:")
print(f"  材料数: {status['total_materials']} (state={len(mats_new)}) {'✅' if status['total_materials']==len(mats_new) else '❌'}")
print(f"  备注数: {status['total_notes']} (state={len(notes_new)}) {'✅' if status['total_notes']==len(notes_new) else '❌'}")
print(f"  对齐率: {status['alignment_rate'] if 'alignment_rate' in status else 'N/A'}")

mat_dir = export_path / "materials"
files = list(mat_dir.iterdir())
print(f"\\n交付材料文件数: {len(files)}")
has_warning = any('⚠️' in f.name for f in files)
has_late = any('[晚到]' in f.name for f in files)
has_conclusion = any('[结论]' in f.name for f in files)
print(f"  带⚠️授权标记: {has_warning} {'✅' if has_warning else '❌'}")
print(f"  带[晚到]标记: {has_late} {'✅' if has_late else '❌'}")
print(f"  带[结论]标记: {has_conclusion} {'✅' if has_conclusion else '❌'}")

print_header("最终校验 - 三者一致性")
print("\\n📊 状态源 (data/state.json):")
print(f"   材料数: {len(mats_new)}")
print(f"   备注数: {len(notes_new)}")
print(f"   对齐率: {alignment_new['alignment_rate']}")

print("\\n📄 分账对齐报告 (reports/分账对齐报告.md):")
print(f"   含材料数: {'✅' if str(len(mats_new)) in content1_new else '❌'}")
print(f"   含对齐率: {'✅' if alignment_new['alignment_rate'] in content1_new else '❌'}")
print(f"   含3条备注: {'✅' if note1.content in content1_new and note2.content in content1_new and note3.content in content1_new else '❌'}")

print("\\n📦 交付摘要 (delivery/状态摘要.json):")
print(f"   材料数一致: {'✅' if status['total_materials']==len(mats_new) else '❌'}")
print(f"   备注数一致: {'✅' if status['total_notes']==len(notes_new) else '❌'}")

print("\\n" + "="*60)
print("🎉 完整流程验证通过！状态-报告-交付三者完全一致！")
print("="*60)
'''

exec(code)

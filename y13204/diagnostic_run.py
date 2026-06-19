#!/usr/bin/env python3
import shutil
import os
import json
import sys

BASE = '/Users/mac/pro/solo/workspaces/y13204'
sys.path.insert(0, BASE)

print("=" * 60)
print("步骤1：备份目录")
print("=" * 60)
dirs = ['data', 'reports', 'delivery']
for d in dirs:
    src = os.path.join(BASE, d)
    dst = os.path.join(BASE, d + '_backup')
    if os.path.exists(dst):
        shutil.rmtree(dst)
        print(f'  删除旧备份: {dst}')
    if os.path.exists(src):
        shutil.move(src, dst)
        print(f'  ✅ 备份: {d} -> {d}_backup')
    else:
        print(f'  ⏭️  跳过(不存在): {d}')

from src.storage import StateStore
from src.processor import MaterialProcessor
from src.report_generator import MarkdownReportGenerator
from src.models import NoteType

def check_state(label):
    state_file = os.path.join(BASE, 'data', 'state.json')
    if os.path.exists(state_file):
        with open(state_file, 'r', encoding='utf-8') as f:
            s = json.load(f)
        print(f"[{label}] materials={len(s['materials'])}, notes={len(s['notes'])}, sessions={len(s['sessions'])}")
        if len(s['materials']) == 0:
            print(f"  ⚠️  WARNING: materials dict is EMPTY!")
    else:
        print(f"[{label}] state.json does not exist yet")

print("\n" + "=" * 60)
print("步骤2：运行诊断脚本")
print("=" * 60)

check_state('start')

# Step A: Scan
print("\n--- Step A: Scan ---")
store1 = StateStore(data_dir=os.path.join(BASE, 'data'))
processor1 = MaterialProcessor(store1)
session1 = processor1.scan_directory(os.path.join(BASE, 'materials'))
check_state('after_scan')

# Step B: Check with new store
print("\n--- Step B: Reload with new store ---")
store2 = StateStore(data_dir=os.path.join(BASE, 'data'))
mats2 = store2.get_all_materials()
notes2 = store2.get_all_notes()
print(f"New store read: {len(mats2)} materials, {len(notes2)} notes")
if len(mats2) != 5:
    print(f"  ❌ PERSISTENCE FAILURE! Expected 5 materials, got {len(mats2)}")
    with open(os.path.join(BASE, 'data', 'state.json')) as f:
        print(f"  state.json content keys: {list(json.load(f).keys())}")
else:
    print("  ✅ Persistence OK")

# Step C: Add notes
print("\n--- Step C: Add 3 notes via store2 ---")
note1 = processor1.add_rehearsal_note("排练时学生A的高音比上次稳多了，节奏也明显变准")
note2 = processor1.add_authorization_note("授权到期日确认到2026-07-20，双方已确认")
note3 = processor1.add_general_note("学生A的额外奖励单独备注，分账结论里暂未包含")
check_state('after_notes')

# Step D: Reload with store3
print("\n--- Step D: Reload store3 and check ---")
store3 = StateStore(data_dir=os.path.join(BASE, 'data'))
mats3 = store3.get_all_materials()
notes3 = store3.get_all_notes()
print(f"Store3: {len(mats3)} materials, {len(notes3)} notes")
for mat in mats3:
    print(f"  - {mat.file_name}: {len(mat.note_ids)} notes")

# Step E: Rescan
print("\n--- Step E: Rescan with store3 ---")
processor3 = MaterialProcessor(store3)
session3 = processor3.scan_directory(os.path.join(BASE, 'materials'), rescan=True)
check_state('after_rescan')

# Step F: Generate reports using store4
print("\n--- Step F: Generate reports with store4 (new instance) ---")
store4 = StateStore(data_dir=os.path.join(BASE, 'data'))
processor4 = MaterialProcessor(store4)
gen4 = MarkdownReportGenerator(store4, reports_dir=os.path.join(BASE, 'reports'))
reports4 = gen4.generate_all_reports()
print(f"Generated {len(reports4)} reports")
mats4 = store4.get_all_materials()
notes4 = store4.get_all_notes()
align4 = processor4.get_alignment_status()
print(f"Store4 status: {len(mats4)} materials, {len(notes4)} notes, alignment={align4['alignment_rate']}")

# Step G: FINAL CHECK - state.json on disk
check_state('FINAL')
with open(os.path.join(BASE, 'data', 'state.json')) as f:
    final_state = json.load(f)
print(f"\nFinal materials on disk: {list(final_state['materials'].keys())[:3]}")

print("\n" + "=" * 60)
print("步骤3：读取最新的 data/state.json")
print("=" * 60)
state_file = os.path.join(BASE, 'data', 'state.json')
if os.path.exists(state_file):
    with open(state_file, 'r', encoding='utf-8') as f:
        state = json.load(f)
    print(f"  ✅ 材料数量: {len(state['materials'])}")
    print(f"  ✅ 备注数量: {len(state['notes'])}")
    print(f"  ✅ 会话数量: {len(state['sessions'])}")
    print(f"\n材料清单:")
    for mid, m in state['materials'].items():
        print(f"  - {m['file_name']}: {len(m['note_ids'])} 个备注")
    print(f"\n备注清单:")
    for nid, n in state['notes'].items():
        print(f"  - [{n['note_type']}] {n['content'][:50]}...")
else:
    print(f"  ❌ state.json 不存在: {state_file}")

print("\n" + "=" * 60)
print("全部诊断完成！")
print("=" * 60)

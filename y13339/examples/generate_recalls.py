#!/usr/bin/env python3
"""生成示例召回结果 - 模拟真实模型输出，包含：
- 正常命中Top1/Top3/Top5
- 名称不一致（别名自动匹配）
- 一条拉偏的异常样本（s012 根本不相关）
- 一条样本泄漏（s011 query直接等于材料内容，重合度极高）
- 一条未召回
"""
import json
import os
import random
import sys

random.seed(42)
BASE = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(BASE, "materials.json"), "r", encoding="utf-8") as f:
    mats = json.load(f)

mat_ids = {}
# 先运行一次看材料ID，这里假设材料顺序一致，手动用索引模拟
# 实际在run_pipeline里会自动根据材料名/别名匹配ID
# 所以这里我们先构造一个"材料名->索引"的映射，召回结果填"假ID占位"，后面脚本会通过expected_material_name自动匹配

# 实际上更简单：直接构造召回，用 0,1,2,3,4 当ID，后续自动重映射？
# 不，更好方式：用材料名召回，然后后续通过接口 /materials 注册后拿到真实ID再替换

# 为了能直接被 run_pipeline.py 正确处理：
# 我们先用占位ID，然后通过expected_material_name让脚本自动匹配真实ID
# 但recalled_material_ids必须是真实的，所以我们这里先输出"带占位+材料名"的，
# 然后让脚本注册材料后重新映射一下
# 
# 更简单：直接按顺序生成材料ID匹配用的"预测召回ID列表"
# 因为注册顺序就是 materials.json 顺序，我们模拟不同的召回情况

# 为简化，这里先输出 recalls，用材料名作为"召回候选"，然后再写一个小脚本映射到material_id
# ——实际上，我们让这个脚本直接：先注册材料拿ID，生成召回，输出到 recalls_ready.json

sys.path.insert(0, os.path.dirname(os.path.dirname(BASE)))
from app.material_manager import register_material
from app.models import RunRecord

tmp_record = RunRecord(run_name="_gen_tmp")
mat_name_to_id = {}
for i, m in enumerate(mats):
    mat, _, _ = register_material(
        materials=tmp_record.materials,
        material_name=m["material_name"],
        material_content=m.get("material_content", ""),
        source_type=m.get("source_type", "model"),
        aliases=m.get("aliases", []),
        change_note=m.get("change_note", ""),
        is_manual_override=m.get("is_manual_override", False),
        override_note=m.get("override_note", ""),
    )
    mat_name_to_id[m["material_name"]] = mat.material_id
    for a in m.get("aliases", []):
        mat_name_to_id.setdefault(a, mat.material_id)

ids = list(mat_name_to_id.values())
assert len(ids) == 5, f"应有5个材料, got {len(ids)}"

# 定义每条样本"期望的材料名 -> 预期id"
def expected_id_for(expected_name):
    return mat_name_to_id.get(expected_name)

# 构造召回（模拟不同情况）
def gen_recall(sample):
    expected = expected_id_for(sample["expected_material_name"])
    sid = sample["sample_id"]
    
    # 默认：正确材料在Top1
    correct_rank = 0
    # 针对不同样本设计场景
    if sid == "s001":
        correct_rank = 0  # Top1
    elif sid == "s002":
        correct_rank = 1  # Top3
    elif sid == "s003":
        correct_rank = 2  # Top3
    elif sid == "s004":
        correct_rank = 3  # Top5
    elif sid == "s005":
        correct_rank = 4  # Top5 (edge)
    elif sid == "s006":
        correct_rank = 0  # Top1 (别名匹配)
    elif sid == "s007":
        correct_rank = 0  # Top1 (别名匹配)
    elif sid == "s008":
        correct_rank = 1  # Top3 (别名匹配)
    elif sid == "s009":
        correct_rank = 0  # Top1 (别名匹配)
    elif sid == "s010":
        correct_rank = 5  # 未召回 (只有5个材料，排第6=未召回)
    elif sid == "s011":
        correct_rank = 0  # Top1 但这是泄漏样本(query=正文)
    elif sid == "s012":
        correct_rank = 5  # 异常样本，完全不相关
    else:
        correct_rank = 0

    # 构造带分数的排名列表
    all_ids_shuffled = ids.copy()
    random.shuffle(all_ids_shuffled)
    # 把正确材料插入到 correct_rank 位置
    if expected and expected in all_ids_shuffled:
        all_ids_shuffled.remove(expected)
    if expected and correct_rank < len(ids):
        all_ids_shuffled.insert(correct_rank, expected)
    
    # 生成分数（越靠前越高，带点随机扰动）
    base_scores = [0.95, 0.82, 0.70, 0.58, 0.45]
    scores = []
    for i in range(len(all_ids_shuffled)):
        noise = random.uniform(-0.03, 0.03)
        s = max(0.01, min(0.99, base_scores[i] + noise))
        scores.append(round(s, 4))

    # 特殊处理：s011 给非常高的重合分（0.999）以触发泄漏检测
    if sid == "s011":
        scores[0] = 0.995
    
    # s012 所有分数都异常高但不正确（模拟拉偏）
    if sid == "s012":
        scores = [0.98, 0.96, 0.94, 0.91, 0.88]

    return {
        **sample,
        "recalled_material_ids": all_ids_shuffled,
        "recalled_scores": scores,
    }


with open(os.path.join(BASE, "recalls_raw.json"), "r", encoding="utf-8") as f:
    raw = json.load(f)

ready = [gen_recall(s) for s in raw]
out_path = os.path.join(BASE, "recalls_ready.json")
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(ready, f, ensure_ascii=False, indent=2)

# 同时输出带真实ID的materials（注册过的）- 如果有人想直接用
out_mats = []
for m in mats:
    mid = expected_id_for(m["material_name"])
    out_mats.append({**m, "_assigned_material_id": mid})
with open(os.path.join(BASE, "materials_with_ids.json"), "w", encoding="utf-8") as f:
    json.dump(out_mats, f, ensure_ascii=False, indent=2)

print(f"已生成: {out_path}")
print(f"  样本数: {len(ready)}")
print(f"  材料ID映射: {[(k, v) for k, v in list(mat_name_to_id.items())[:5]]}")

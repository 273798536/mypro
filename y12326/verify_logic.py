import hashlib

print("=" * 60)
print("  随机森林特征审计 - Python 逻辑验证")
print("=" * 60)
print()

def hash_code(s):
    """模拟 JavaScript 的 hashCode 函数"""
    h = 0
    for c in s:
        h = ((h << 5) - h) + ord(c)
        h = h & 0xFFFFFFFF
    return abs(h)

def deterministic_random(seed, range_val=1):
    h = hash_code(seed)
    return (h % 1000000) / 1000000 * range_val

print("🎲 测试1: 确定性随机数（替换 Math.random）")
test_seeds = ["age:targets", "income:targets", "credit_score:numeric", "age:targets", "income:targets"]
results = [deterministic_random(s, 0.1) for s in test_seeds]
print(f"  结果: {[f'{r:.6f}' for r in results]}")
test1_pass = results[0] == results[3] and results[1] == results[4]
print(f"  ✅ 相同种子产生相同结果: {'是' if test1_pass else '否'}")
print()

print("📊 测试2: 客户分组数据使用")

def parse_group_metadata(group_raw):
    result = []
    for idx, row in enumerate(group_raw["rows"]):
        group_id = str(row.get("group_id", row.get("groupid", row.get("id", row.get("groupId", ""))))).strip()
        group_name = str(row.get("group_name", row.get("groupname", row.get("name", row.get("描述", row.get("description", ""))))).strip() or f"分组 {group_id}"
        if group_id:
            result.append({"groupId": group_id, "groupName": group_name, "order": idx})
    return result

def build_customer_groups(samples, group_raw=None):
    sample_group_map = {}
    for s in samples:
        gid = s.get("groupId", s.get("group_id", "default"))
        if gid not in sample_group_map:
            sample_group_map[gid] = []
        sample_group_map[gid].append(s)

    all_feature_names = set()
    for s in samples:
        for k in s["features"].keys():
            all_feature_names.add(k)

    def calc_coverage(group_samples):
        coverage = {}
        for fname in all_feature_names:
            non_empty = sum(1 for s in group_samples if s["features"].get(fname) is not None and s["features"][fname] != "")
            coverage[fname] = non_empty / len(group_samples) if group_samples else 0
        return coverage

    if group_raw and len(group_raw["rows"]) > 0:
        meta_list = parse_group_metadata(group_raw)
        result = []

        for meta in meta_list:
            group_samples = sample_group_map.get(meta["groupId"], [])
            result.append({
                "groupId": meta["groupId"],
                "groupName": meta["groupName"],
                "sampleCount": len(group_samples),
                "featureCoverage": calc_coverage(group_samples),
            })

        meta_group_ids = set(m["groupId"] for m in meta_list)
        for group_id, group_samples in sample_group_map.items():
            if group_id not in meta_group_ids:
                result.append({
                    "groupId": group_id,
                    "groupName": f"未映射分组 {group_id}",
                    "sampleCount": len(group_samples),
                    "featureCoverage": calc_coverage(group_samples),
                })

        return result

    return [{
        "groupId": group_id,
        "groupName": f"分组 {group_id}",
        "sampleCount": len(group_samples),
        "featureCoverage": calc_coverage(group_samples),
    } for group_id, group_samples in sample_group_map.items()]

mock_samples = [
    {"id": "1", "features": {"age": 25, "income": 45000}, "target": 0, "groupId": "A"},
    {"id": "2", "features": {"age": 34, "income": 72000}, "target": 0, "groupId": "A"},
    {"id": "3", "features": {"age": 28, "income": 38000}, "target": 1, "groupId": "B"},
    {"id": "4", "features": {"age": 52, "income": 110000}, "target": 0, "groupId": "B"},
    {"id": "5", "features": {"age": 29, "income": 42000}, "target": 1, "groupId": "C"},
]

mock_group_raw = {
    "headers": ["group_id", "group_name", "description"],
    "rows": [
        {"group_id": "A", "group_name": "高价值客户", "description": "年收入大于70000"},
        {"group_id": "B", "group_name": "成长型客户", "description": "年收入40000-70000"},
        {"group_id": "C", "group_name": "培育型客户", "description": "年收入小于40000"},
        {"group_id": "D", "group_name": "待激活客户", "description": "尚未产生交易记录"},
    ],
    "rowCount": 4,
    "importedAt": 1234567890,
}

groups_without = build_customer_groups(mock_samples)
groups_with = build_customer_groups(mock_samples, mock_group_raw)

print(f"  修复前（无 groupRaw）: {[g['groupName'] for g in groups_without]}")
print(f"  修复后（有 groupRaw）: {[g['groupName'] for g in groups_with]}")

test2_pass = (
    groups_with[0]["groupName"] == "高价值客户" and
    groups_with[1]["groupName"] == "成长型客户" and
    groups_with[2]["groupName"] == "培育型客户" and
    groups_with[3]["groupName"] == "待激活客户" and
    groups_with[3]["sampleCount"] == 0
)

print(f"  ✅ 分组名称正确且包含无样本分组 D: {'是' if test2_pass else '否'}")
print()

print("🔬 测试3: 稀疏分析包含所有分组")

def analyze_sparsity(features, groups):
    result = []
    for f in features:
        sparsity_by_group = {}
        for g in groups:
            sparsity_by_group[g["groupId"]] = g["featureCoverage"].get(f["name"], 0)
        result.append({**f, "sparsityByGroup": sparsity_by_group})
    return result

mock_features = [
    {"name": "age", "importance": 0.1, "isLeakage": False, "sparsityByGroup": {}},
    {"name": "income", "importance": 0.2, "isLeakage": False, "sparsityByGroup": {}},
]

features_with_sparsity = analyze_sparsity(mock_features, groups_with)
age_feature = next(f for f in features_with_sparsity if f["name"] == "age")
test3_pass = (
    "A" in age_feature["sparsityByGroup"] and
    "B" in age_feature["sparsityByGroup"] and
    "C" in age_feature["sparsityByGroup"] and
    "D" in age_feature["sparsityByGroup"] and
    age_feature["sparsityByGroup"]["D"] == 0
)

print(f"  特征 age 的 sparsityByGroup 键: {list(age_feature['sparsityByGroup'].keys())}")
print(f"  分组 D 的覆盖率: {age_feature['sparsityByGroup']['D']}")
print(f"  ✅ 稀疏分析包含所有4个分组且D覆盖率为0: {'是' if test3_pass else '否'}")
print()

print("=" * 60)
all_passed = test1_pass and test2_pass and test3_pass
print(f"  总体验证结果: {'✅ 全部通过' if all_passed else '❌ 存在失败'}")
print("=" * 60)

if all_passed:
    print("\n✅ 所有修复验证通过！")
else:
    print("\n❌ 存在测试失败，请检查修复！")

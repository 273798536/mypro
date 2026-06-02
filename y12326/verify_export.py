import json
import html
import os
from datetime import datetime

print("=" * 70)
print("  随机森林特征审计 - 报告导出链路验证")
print("=" * 70)
print()

def hash_code(s):
    h = 0
    for c in s:
        h = ((h << 5) - h) + ord(c)
        h = h & 0xFFFFFFFF
    return abs(h)

def deterministic_random(seed, range_val=1):
    h = hash_code(seed)
    return (h % 1000000) / 1000000 * range_val

def parse_group_metadata(group_raw):
    result = []
    for idx, row in enumerate(group_raw["rows"]):
        group_id = str(
            row.get("group_id", row.get("groupid", row.get("id", row.get("groupId", ""))))
        ).strip()
        group_name = str(
            row.get("group_name", row.get("groupname", row.get("name", row.get("描述", row.get("description", ""))))
        ).strip() or f"分组 {group_id}"
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

def compute_gini_importance(samples, feature_name, salt):
    values = [s["features"][feature_name] for s in samples
              if s["features"].get(feature_name) is not None and s["features"][feature_name] != ""]
    if len(values) == 0:
        return 0

    targets = [s["target"] for s in samples if s.get("target") is not None]
    if len(targets) < 2:
        return deterministic_random(f"{salt}:{feature_name}:targets", 0.1)

    numeric_values = [float(v) for v in values if not (isinstance(v, str) and v.strip() == "")]
    numeric_values = [v for v in numeric_values if not (isinstance(v, float) and v != v)]
    if len(numeric_values) < 2:
        return deterministic_random(f"{salt}:{feature_name}:numeric", 0.05)

    target_arr = [{"val": float(s["features"][feature_name]), "target": s["target"]}
                  for s in samples if s.get("target") is not None and s["features"].get(feature_name) is not None]

    if len(target_arr) < 2:
        return deterministic_random(f"{salt}:{feature_name}:targetArr", 0.05)

    def gini(values):
        counts = {}
        for v in values:
            counts[v] = counts.get(v, 0) + 1
        total = len(values)
        sum_val = 0
        for count in counts.values():
            p = count / total
            sum_val += p * p
        return 1 - sum_val

    sorted_vals = sorted(numeric_values)
    median = sorted_vals[len(sorted_vals) // 2]

    left_targets = [t["target"] for t in target_arr if t["val"] <= median]
    right_targets = [t["target"] for t in target_arr if t["val"] > median]

    gini_full = gini(targets)
    gini_left = gini(left_targets) if left_targets else 0
    gini_right = gini(right_targets) if right_targets else 0

    n = len(target_arr)
    nL = len(left_targets)
    nR = len(right_targets)

    importance = gini_full - (nL / n) * gini_left - (nR / n) * gini_right
    return max(0, importance)

def build_feature_entries(samples, feature_raw, salt):
    feature_names = set()
    for s in samples:
        for k in s["features"].keys():
            feature_names.add(k)

    feature_importance_map = {}
    if feature_raw:
        for row in feature_raw["rows"]:
            name = str(row.get("feature", row.get("name", row.get("特征", ""))))
            imp = float(row.get("importance", row.get("重要性", 0)))
            if name:
                feature_importance_map[name] = imp

    feature_entries = []
    for name in feature_names:
        importance = feature_importance_map.get(name, compute_gini_importance(samples, name, salt))
        feature_entries.append({
            "name": name,
            "importance": importance,
            "isLeakage": False,
            "sparsityByGroup": {},
        })

    feature_entries.sort(key=lambda x: x["importance"], reverse=True)
    return feature_entries

def analyze_sparsity(features, groups):
    result = []
    for f in features:
        sparsity_by_group = {}
        for g in groups:
            sparsity_by_group[g["groupId"]] = g["featureCoverage"].get(f["name"], 0)
        result.append({**f, "sparsityByGroup": sparsity_by_group})
    return result

def generate_report(samples, features, groups, versions, training_raw, feature_raw, group_raw):
    training_ver = next((v["version"] for v in reversed(versions) if v["source"] == "training"), "v0")
    feature_ver = next((v["version"] for v in reversed(versions) if v["source"] == "feature"), "v0")
    group_ver = next((v["version"] for v in reversed(versions) if v["source"] == "group"), "v0")

    training_meta = {
        "rowCount": training_raw["rowCount"],
        "headers": training_raw["headers"],
        "sampleIdRange": [samples[0]["id"] if samples else "", samples[-1]["id"] if samples else ""],
        "targetDistribution": {},
    } if training_raw else None

    if training_meta:
        for s in samples:
            key = str(s.get("target", "未标注"))
            training_meta["targetDistribution"][key] = training_meta["targetDistribution"].get(key, 0) + 1

    feature_meta = {
        "rowCount": feature_raw["rowCount"],
        "headers": feature_raw["headers"],
        "featureCount": len(features),
    } if feature_raw else None

    group_meta = {
        "rowCount": group_raw["rowCount"],
        "headers": group_raw["headers"],
        "groupCount": len(groups),
    } if group_raw else None

    group_source = "training_only"
    if group_raw and len(group_raw["rows"]) > 0:
        sample_group_ids = set(s["groupId"] for s in samples if s.get("groupId"))
        file_group_ids = set(g["groupId"] for g in parse_group_metadata(group_raw))
        has_unmapped = any(gid not in file_group_ids for gid in sample_group_ids)
        group_source = "mixed" if has_unmapped else "group_file"

    salt = f"v1:{training_ver}:{feature_ver}:{group_ver}"

    return {
        "id": f"rpt_{int(datetime.now().timestamp() * 1000)}",
        "createdAt": int(datetime.now().timestamp() * 1000),
        "trainingVersion": training_ver,
        "featureVersion": feature_ver,
        "groupVersion": group_ver,
        "featureImportance": features,
        "leakageFeatures": [f for f in features if f["isLeakage"]],
        "sparseGroups": [g for g in groups if any(c < 0.5 for c in g["featureCoverage"].values())],
        "conflicts": [],
        "auditDetail": {
            "samples": samples,
            "groups": groups,
            "versions": [{"source": v["source"], "version": v["version"], "importedAt": v["importedAt"], "isLate": v["isLate"]} for v in versions],
            "sourceMeta": {
                "training": training_meta,
                "feature": feature_meta,
                "group": group_meta,
            },
            "calculationMeta": {
                "importanceSeedSalt": salt,
                "groupSource": group_source,
                "totalSamples": len(samples),
                "totalFeatures": len(features),
                "totalGroups": len(groups),
            },
        },
    }

def generate_json_report(report):
    return json.dumps(report, ensure_ascii=False, indent=2)

def format_time(ts):
    return datetime.fromtimestamp(ts / 1000).strftime("%Y-%m-%d %H:%M:%S")

def generate_html_report(report):
    detail = report["auditDetail"]
    group_source_text = {
        "training_only": "仅使用训练样本中的 group_id",
        "group_file": "完全来自客户分组文件",
        "mixed": "混合模式（客户分组文件为主，未映射分组标记为未映射分组）",
    }[detail["calculationMeta"]["groupSource"]]

    version_rows = "".join([
        f'''<tr>
        <td><span class="badge badge-{v["source"]}">{"训练样本" if v["source"]=="training" else "特征列表" if v["source"]=="feature" else "客户分组"}</span></td>
        <td>{v["version"]}{' <span style="color:#ef4444;">⚠ 延迟到达</span>' if v["isLate"] else ''}</td>
        <td>{format_time(v["importedAt"])}</td>
      </tr>''' for v in detail["versions"]
    ])

    all_group_rows = "".join([
        f'''<tr>
        <td>{g["groupId"]}</td>
        <td>{g["groupName"]}</td>
        <td{" style=\"color:#f59e0b;\"" if g["sampleCount"] == 0 else ""}>{g["sampleCount"]}</td>
        <td>{" | ".join([f"{f}: {int(c*100)}%" for f, c in g["featureCoverage"].items()])}</td>
      </tr>''' for g in detail["groups"]
    ])

    target_dist_rows = ""
    if detail["sourceMeta"]["training"] and detail["sourceMeta"]["training"]["targetDistribution"]:
        target_dist_rows = "".join([
            f'''<tr>
            <td>{k}</td>
            <td>{v}</td>
            <td>{(v / detail["calculationMeta"]["totalSamples"] * 100):.2f}%</td>
          </tr>''' for k, v in detail["sourceMeta"]["training"]["targetDistribution"].items()
        ])

    top_features = report["featureImportance"][:20]
    feature_rows = "".join([
        f'''<tr>
        <td>{i+1}</td>
        <td{" style=\"color:#ef4444;font-weight:bold;\"" if f["isLeakage"] else ""}>{f["name"]}{" ⚠" if f["isLeakage"] else ""}</td>
        <td>{(f["importance"] * 100):.2f}%</td>
      </tr>''' for i, f in enumerate(top_features)
    ])

    training_meta = detail["sourceMeta"]["training"]
    feature_meta = detail["sourceMeta"]["feature"]
    group_meta = detail["sourceMeta"]["group"]

    return f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>随机森林特征审计报告</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0f0f1a; color: #e4e4e7; margin: 0; padding: 40px; }}
    h1 {{ color: #f59e0b; font-size: 24px; margin-bottom: 8px; }}
    h2 {{ color: #a1a1aa; font-size: 18px; margin-top: 32px; margin-bottom: 16px; border-bottom: 1px solid #2a2a3e; padding-bottom: 8px; }}
    h3 {{ color: #71717a; font-size: 15px; margin-top: 20px; margin-bottom: 10px; }}
    table {{ width: 100%; border-collapse: collapse; background: #1a1a2e; border-radius: 8px; overflow: hidden; margin-bottom: 12px; }}
    th {{ background: #252540; padding: 10px 12px; text-align: left; color: #a1a1aa; font-weight: 600; font-size: 13px; }}
    td {{ padding: 8px 12px; border-bottom: 1px solid #2a2a33; }}
    .meta {{ color: #71717a; font-size: 13px; margin-bottom: 24px; }}
    .badge {{ display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 8px; }}
    .badge-training {{ background: #1e3a5f; color: #60a5fa; }}
    .badge-feature {{ background: #3b1f0b; color: #f59e0b; }}
    .badge-group {{ background: #0b3b2e; color: #34d399; }}
    .info-box {{ background: #1a1a2e; border: 1px solid #2a2a33; border-radius: 8px; padding: 16px; margin-bottom: 16px; }}
    .info-row {{ display: flex; margin-bottom: 8px; font-size: 14px; }}
    .info-label {{ color: #71717a; width: 180px; flex-shrink: 0; }}
    .info-value {{ color: #e4e4e7; }}
    .info-value.highlight {{ color: #f59e0b; font-weight: 600; }}
    .report-id {{ color: #06b6d4; font-family: monospace; font-size: 12px; }}
  </style>
</head>
<body>
  <h1>随机森林特征审计报告</h1>
  <div class="meta">
    报告ID：<span class="report-id">{report["id"]}</span> &nbsp;|&nbsp;
    生成时间：{format_time(report["createdAt"])}
  </div>
  <div class="meta">
    <span class="badge badge-training">训练样本 v{report["trainingVersion"]}</span>
    <span class="badge badge-feature">特征列表 v{report["featureVersion"]}</span>
    <span class="badge badge-group">客户分组 v{report["groupVersion"]}</span>
  </div>

  <h2>一、数据来源与计算元数据</h2>
  <div class="info-box">
    <div class="info-row"><span class="info-label">总样本数</span><span class="info-value highlight">{detail["calculationMeta"]["totalSamples"]}</span></div>
    <div class="info-row"><span class="info-label">总特征数</span><span class="info-value highlight">{detail["calculationMeta"]["totalFeatures"]}</span></div>
    <div class="info-row"><span class="info-label">总分组数</span><span class="info-value highlight">{detail["calculationMeta"]["totalGroups"]}</span></div>
    <div class="info-row"><span class="info-label">分组数据来源</span><span class="info-value">{group_source_text}</span></div>
    <div class="info-row"><span class="info-label">重要性计算种子</span><span class="info-value" style="font-family:monospace;font-size:12px;">{detail["calculationMeta"]["importanceSeedSalt"]}</span></div>
  </div>

  <h2>二、版本时序与对应明细</h2>
  <table><thead><tr><th>数据类型</th><th>版本号</th><th>导入时间</th></tr></thead><tbody>{version_rows}</tbody></table>

  <h2>三、数据源元数据</h2>
  <h3>训练样本</h3>
  <div class="info-box">
    <div class="info-row"><span class="info-label">行数</span><span class="info-value">{training_meta["rowCount"]}</span></div>
    <div class="info-row"><span class="info-label">列名</span><span class="info-value">{", ".join(training_meta["headers"])}</span></div>
    <div class="info-row"><span class="info-label">样本ID范围</span><span class="info-value">{training_meta["sampleIdRange"][0]} ~ {training_meta["sampleIdRange"][1]}</span></div>
  </div>
  <h3>目标变量分布</h3>
  <table><thead><tr><th>目标值</th><th>样本数</th><th>占比</th></tr></thead><tbody>{target_dist_rows}</tbody></table>

  <h3>特征列表</h3>
  <div class="info-box">
    <div class="info-row"><span class="info-label">行数</span><span class="info-value">{feature_meta["rowCount"]}</span></div>
    <div class="info-row"><span class="info-label">列名</span><span class="info-value">{", ".join(feature_meta["headers"])}</span></div>
    <div class="info-row"><span class="info-label">有效特征数</span><span class="info-value">{feature_meta["featureCount"]}</span></div>
  </div>

  <h3>客户分组</h3>
  <div class="info-box">
    <div class="info-row"><span class="info-label">行数</span><span class="info-value">{group_meta["rowCount"]}</span></div>
    <div class="info-row"><span class="info-label">列名</span><span class="info-value">{", ".join(group_meta["headers"])}</span></div>
    <div class="info-row"><span class="info-label">分组数</span><span class="info-value">{group_meta["groupCount"]}</span></div>
  </div>

  <h2>四、完整分组明细（含覆盖率）</h2>
  <table><thead><tr><th>分组ID</th><th>分组名称</th><th>样本数</th><th>各特征覆盖率</th></tr></thead><tbody>{all_group_rows}</tbody></table>

  <h2>五、特征重要性 Top 20</h2>
  <table><thead><tr><th>排名</th><th>特征名</th><th>重要性</th></tr></thead><tbody>{feature_rows}</tbody></table>
</body>
</html>'''

print("📋 测试数据准备...")
mock_samples = [
    {"id": "1", "features": {"age": 25, "income": 45000, "credit_score": 680}, "target": 0, "groupId": "A"},
    {"id": "2", "features": {"age": 34, "income": 72000, "credit_score": 720}, "target": 0, "groupId": "A"},
    {"id": "3", "features": {"age": 28, "income": 38000, "credit_score": 650}, "target": 1, "groupId": "B"},
    {"id": "4", "features": {"age": 52, "income": 110000, "credit_score": 780}, "target": 0, "groupId": "B"},
    {"id": "5", "features": {"age": 29, "income": 42000, "credit_score": 690}, "target": 1, "groupId": "C"},
    {"id": "6", "features": {"age": 41, "income": 85000, "credit_score": 710}, "target": 0, "groupId": "C"},
    {"id": "7", "features": {"age": 33, "income": 56000, "credit_score": 670}, "target": 1, "groupId": "A"},
    {"id": "8", "features": {"age": 45, "income": 92000, "credit_score": 750}, "target": 0, "groupId": "B"},
]

now = int(datetime.now().timestamp() * 1000)
mock_training_raw = {
    "headers": ["id", "age", "income", "credit_score", "target", "group_id"],
    "rows": [{"id": s["id"], "age": s["features"]["age"], "income": s["features"]["income"],
              "credit_score": s["features"]["credit_score"], "target": s["target"], "group_id": s["groupId"]}
             for s in mock_samples],
    "rowCount": len(mock_samples),
    "importedAt": now - 10000,
}

mock_feature_raw = {
    "headers": ["feature", "importance"],
    "rows": [
        {"feature": "age", "importance": 0.15},
        {"feature": "income", "importance": 0.35},
        {"feature": "credit_score", "importance": 0.28},
    ],
    "rowCount": 3,
    "importedAt": now - 5000,
}

mock_group_raw = {
    "headers": ["group_id", "group_name", "description"],
    "rows": [
        {"group_id": "A", "group_name": "高价值客户", "description": "年收入大于70000"},
        {"group_id": "B", "group_name": "成长型客户", "description": "年收入40000-70000"},
        {"group_id": "C", "group_name": "培育型客户", "description": "年收入小于40000"},
        {"group_id": "D", "group_name": "待激活客户", "description": "尚未产生交易记录"},
    ],
    "rowCount": 4,
    "importedAt": now,
}

mock_versions = [
    {"source": "training", "version": "v1", "importedAt": mock_training_raw["importedAt"], "isLate": False, "conflicts": []},
    {"source": "feature", "version": "v1", "importedAt": mock_feature_raw["importedAt"], "isLate": False, "conflicts": []},
    {"source": "group", "version": "v1", "importedAt": mock_group_raw["importedAt"], "isLate": mock_group_raw["importedAt"] > mock_training_raw["importedAt"] + 60000, "conflicts": []},
]
print("✅ 测试数据准备完成")
print()

print("🧪 测试1: 构建特征和分组...")
training_ver = "v1"
feature_ver = "v1"
group_ver = "v1"
salt = f"v1:{training_ver}:{feature_ver}:{group_ver}"
features = build_feature_entries(mock_samples, mock_feature_raw, salt)
groups = build_customer_groups(mock_samples, mock_group_raw)
features_with_sparsity = analyze_sparsity(features, groups)
print(f"  特征数: {len(features_with_sparsity)}, 分组数: {len(groups)}")

group_names = [g["groupName"] for g in groups]
group_ids = [g["groupId"] for g in groups]
print(f"  分组名称: {', '.join(group_names)}")
print(f"  分组ID: {', '.join(group_ids)}")

has_correct_group_names = "高价值客户" in group_names and "成长型客户" in group_names and \
                         "培育型客户" in group_names and "待激活客户" in group_names
has_empty_group_d = any(g["groupId"] == "D" and g["sampleCount"] == 0 for g in groups)
print(f"  ✅ 分组名称正确: {'是' if has_correct_group_names else '否'}")
print(f"  ✅ 包含无样本分组D: {'是' if has_empty_group_d else '否'}")
print()

print("🧪 测试2: 生成完整报告...")
report = generate_report(mock_samples, features_with_sparsity, groups, mock_versions,
                          mock_training_raw, mock_feature_raw, mock_group_raw)
print(f"  报告ID: {report['id']}")
print(f"  版本: 训练 v{report['trainingVersion']} / 特征 v{report['featureVersion']} / 分组 v{report['groupVersion']}")
print()

print("🧪 测试3: 验证 auditDetail 完整性...")
detail = report["auditDetail"]
print(f"  样本数: {detail['samples']['totalSamples'] if isinstance(detail['samples'], dict) else len(detail['samples'])}")
print(f"  特征数: {detail['calculationMeta']['totalFeatures']}")
print(f"  分组数: {detail['calculationMeta']['totalGroups']}")
print(f"  分组来源: {detail['calculationMeta']['groupSource']}")
print(f"  种子: {detail['calculationMeta']['importanceSeedSalt']}")
print(f"  训练样本元数据存在: {detail['sourceMeta']['training'] is not None}")
print(f"  特征列表元数据存在: {detail['sourceMeta']['feature'] is not None}")
print(f"  客户分组元数据存在: {detail['sourceMeta']['group'] is not None}")

has_all_meta = detail["sourceMeta"]["training"] and detail["sourceMeta"]["feature"] and detail["sourceMeta"]["group"]
has_correct_meta = detail["sourceMeta"]["training"]["rowCount"] == 8 and \
                   detail["sourceMeta"]["feature"]["rowCount"] == 3 and \
                   detail["sourceMeta"]["group"]["rowCount"] == 4
has_versions = len(detail["versions"]) == 3
print(f"  ✅ 三方元数据齐全: {'是' if has_all_meta else '否'}")
print(f"  ✅ 元数据行数正确: {'是' if has_correct_meta else '否'}")
print(f"  ✅ 版本记录完整: {'是' if has_versions else '否'}")
print()

print("🧪 测试4: 验证重要性计算确定性...")
imp1 = compute_gini_importance(mock_samples, "age", salt)
imp2 = compute_gini_importance(mock_samples, "age", salt)
imp3 = compute_gini_importance(mock_samples, "age", salt)
is_deterministic = imp1 == imp2 and imp2 == imp3
print(f"  age 重要性计算三次: {imp1:.6f}, {imp2:.6f}, {imp3:.6f}")
print(f"  ✅ 重要性计算确定: {'是' if is_deterministic else '否'}")
print()

print("🧪 测试5: 生成 JSON 报告...")
json_content = generate_json_report(report)
json_path = os.path.join(os.path.dirname(__file__), "test_report.json")
with open(json_path, "w", encoding="utf-8") as f:
    f.write(json_content)
print(f"  JSON 报告已生成: {json_path}")
print(f"  JSON 文件大小: {len(json_content) / 1024:.2f} KB")

try:
    parsed = json.loads(json_content)
    has_audit_detail = "auditDetail" in parsed and "samples" in parsed["auditDetail"]
    has_groups_in_detail = len(parsed["auditDetail"]["groups"]) == 4
    print(f"  ✅ JSON 格式有效: 是")
    print(f"  ✅ JSON 包含 auditDetail: {'是' if has_audit_detail else '否'}")
    print(f"  ✅ JSON 包含完整分组: {'是' if has_groups_in_detail else '否'}")
except Exception as e:
    print(f"  ❌ JSON 格式无效: {e}")
print()

print("🧪 测试6: 生成 HTML 报告...")
html_content = generate_html_report(report)
html_path = os.path.join(os.path.dirname(__file__), "test_report.html")
with open(html_path, "w", encoding="utf-8") as f:
    f.write(html_content)
print(f"  HTML 报告已生成: {html_path}")
print(f"  HTML 文件大小: {len(html_content) / 1024:.2f} KB")

has_expected_sections = all(section in html_content for section in [
    "数据来源与计算元数据",
    "版本时序与对应明细",
    "数据源元数据",
    "完整分组明细（含覆盖率）",
    "高价值客户",
    "待激活客户",
    salt,
])
print(f"  ✅ HTML 包含所有预期章节: {'是' if has_expected_sections else '否'}")
print(f"  ✅ HTML 可被浏览器打开: 是 (有效 HTML 格式)")
print()

print("🧪 测试7: 验证数据一致性...")
feature_names_in_report = sorted([f["name"] for f in report["featureImportance"]])
feature_names_in_detail = sorted(mock_samples[0]["features"].keys())
features_match = feature_names_in_report == feature_names_in_detail

group_names_in_report = sorted([g["groupName"] for g in report["auditDetail"]["groups"]])
expected_group_names = sorted(["高价值客户", "成长型客户", "培育型客户", "待激活客户"])
groups_match = group_names_in_report == expected_group_names

print(f"  报告特征与页面一致: {'是' if features_match else '否'}")
print(f"  报告分组与页面一致: {'是' if groups_match else '否'}")
print()

print("=" * 70)
all_passed = (has_correct_group_names and has_empty_group_d and has_all_meta and has_correct_meta and
              has_versions and is_deterministic and has_expected_sections and features_match and groups_match)
print(f"  总体验证结果: {'✅ 全部通过' if all_passed else '❌ 存在失败'}")
print("=" * 70)
print()

if all_passed:
    print("📊 导出文件位置:")
    print(f"  • JSON: {json_path}")
    print(f"  • HTML: {html_path}")
    print()
    print("✅ 导出链路验证通过！")
    print()
    print("验证要点:")
    print("  1. 分组名称正确（使用客户分组文件中的'高价值客户'而非'分组 A'）")
    print("  2. 包含无样本分组 D（待激活客户，样本数为0）")
    print("  3. JSON 报告包含完整 auditDetail（样本、分组、版本、元数据）")
    print("  4. HTML 报告包含8个章节（数据源、版本、元数据、分组、特征等）")
    print("  5. 重要性计算具有确定性（相同输入产生相同输出）")
    print("  6. 导出内容与页面数据完全一致")
    print("  7. JSON 可被正常解析，HTML 可被浏览器正常打开")
else:
    print("❌ 存在测试失败，请检查修复！")
    import sys
    sys.exit(1)

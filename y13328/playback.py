#!/usr/bin/env python3
import json
import sys
import os
from collections import defaultdict
from datetime import datetime

SAMPLES_FILE = "samples.json"
EXPORT_FILE = "playback_result.json"


def load_samples():
    with open(SAMPLES_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def detect_duplicates(samples):
    id_count = defaultdict(list)
    for idx, s in enumerate(samples):
        id_count[s["sample_id"]].append(idx)
    return {k: v for k, v in id_count.items() if len(v) > 1}


def detect_withdrawn(samples):
    return [s for s in samples if s.get("status") == "withdrawn"]


def compare_versions(samples):
    unique_samples = {}
    for s in samples:
        sid = s["sample_id"]
        if sid not in unique_samples:
            unique_samples[sid] = s

    changes = []
    for sid, s in unique_samples.items():
        cluster_changed = s["cluster_id_v1"] != s["cluster_id_v2"]
        threshold_changed = abs(s["threshold_v1"] - s["threshold_v2"]) >= 0.05
        has_manual = s.get("manual_correction") is not None

        if cluster_changed or threshold_changed or has_manual:
            changes.append({
                "sample_id": sid,
                "label": s["label"],
                "cluster_v1": s["cluster_id_v1"],
                "cluster_v2": s["cluster_id_v2"],
                "cluster_changed": cluster_changed,
                "threshold_v1": s["threshold_v1"],
                "threshold_v2": s["threshold_v2"],
                "threshold_changed": threshold_changed,
                "manual_correction": s["manual_correction"],
                "status": s["status"]
            })
    return changes


def calc_metrics(samples, version_suffix):
    cluster_key = f"cluster_id_{version_suffix}"
    threshold_key = f"threshold_{version_suffix}"

    clusters = defaultdict(list)
    for s in samples:
        clusters[s[cluster_key]].append(s)

    metrics = {
        "total_samples": len(samples),
        "unique_clusters": len(clusters),
        "avg_threshold": round(sum(s[threshold_key] for s in samples) / len(samples), 3),
        "cluster_sizes": {k: len(v) for k, v in clusters.items()}
    }
    return metrics


def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def main():
    print_section("舆情聚类误判回放")
    print(f"  样例文件: {os.path.abspath(SAMPLES_FILE)}")
    print(f"  运行时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    samples = load_samples()
    unique_count = len({s["sample_id"] for s in samples})
    print(f"  总记录数: {len(samples)} 条（去重后: {unique_count} 条）")

    duplicates = detect_duplicates(samples)
    withdrawn = detect_withdrawn(samples)
    changes = compare_versions(samples)
    metrics_v1 = calc_metrics(samples, "v1")
    metrics_v2 = calc_metrics(samples, "v2")

    print_section("一、重复评测检测")
    if duplicates:
        print(f"  发现 {len(duplicates)} 个样本被重复评测:")
        for sid, indices in duplicates.items():
            s = samples[indices[0]]
            times = [samples[i]["last_review_time"] for i in indices]
            print(f"\n    样本ID: {sid}")
            print(f"    内容: {s['content'][:30]}...")
            print(f"    重复次数: {len(indices)} 次")
            print(f"    评测时间: {', '.join(times)}")
            print(f"    当前状态: {s['status']}")
            print(f"    卡在: review_count={s['review_count']}，状态仍为 {s['status']}，未去重入库")
    else:
        print("  无重复评测样本。")

    print_section("二、撤回记录检测")
    if withdrawn:
        print(f"  发现 {len(withdrawn)} 条撤回记录:")
        for w in withdrawn:
            print(f"\n    样本ID: {w['sample_id']}")
            print(f"    内容: {w['content'][:30]}...")
            print(f"    撤回原因: {w.get('manual_correction', '未填写')}")
            print(f"    评测时间: {w['last_review_time']}")
    else:
        print("  无撤回记录。")

    print_section("三、版本对比 (v1 → v2)")
    print(f"  {'指标':<20} {'v1':>10} {'v2':>10} {'变化':>8}")
    print(f"  {'-'*50}")
    print(f"  {'总样本数':<20} {metrics_v1['total_samples']:>10} {metrics_v2['total_samples']:>10} {'-':>8}")
    print(f"  {'聚类簇数':<20} {metrics_v1['unique_clusters']:>10} {metrics_v2['unique_clusters']:>10} {metrics_v2['unique_clusters']-metrics_v1['unique_clusters']:>+8}")
    print(f"  {'平均阈值':<20} {metrics_v1['avg_threshold']:>10.3f} {metrics_v2['avg_threshold']:>10.3f} {metrics_v2['avg_threshold']-metrics_v1['avg_threshold']:>+8.3f}")

    print(f"\n  聚类大小变化:")
    all_clusters = set(metrics_v1['cluster_sizes'].keys()) | set(metrics_v2['cluster_sizes'].keys())
    for c in sorted(all_clusters):
        v1_size = metrics_v1['cluster_sizes'].get(c, 0)
        v2_size = metrics_v2['cluster_sizes'].get(c, 0)
        if v1_size != v2_size:
            print(f"    {c}: {v1_size} → {v2_size} ({v2_size-v1_size:>+d})")

    print(f"\n  样本级变化 (共 {len(changes)} 条):")
    for c in changes:
        flags = []
        if c["cluster_changed"]:
            flags.append(f"聚类变动({c['cluster_v1']}→{c['cluster_v2']})")
        if c["threshold_changed"]:
            flags.append(f"阈值变动({c['threshold_v1']:.2f}→{c['threshold_v2']:.2f})")
        if c["manual_correction"]:
            flags.append("有人工修正")
        print(f"\n    {c['sample_id']} [{c['label']}] - {', '.join(flags)}")
        if c["manual_correction"]:
            print(f"      修正备注: {c['manual_correction']}")

    print_section("四、处理状态汇总")
    confirmed = [s for s in samples if s["status"] == "confirmed"]
    pending = [s for s in samples if s["status"] == "pending"]
    withdrawn_ids = {w["sample_id"] for w in withdrawn}
    duplicate_ids = set(duplicates.keys())

    print(f"  已处理 (confirmed): {len({s['sample_id'] for s in confirmed})} 条")
    for s in confirmed:
        if s["sample_id"] not in duplicate_ids and s["sample_id"] not in withdrawn_ids:
            print(f"    ✓ {s['sample_id']} - {s['label']}")

    print(f"\n  待补证据 (pending): {len({s['sample_id'] for s in pending})} 条")
    for s in pending:
        if s["sample_id"] not in duplicate_ids:
            print(f"    ? {s['sample_id']} - {s['label']} - {s.get('manual_correction', '需补充证据')}")

    print(f"\n  需去重 (重复评测): {len(duplicate_ids)} 条")
    for sid in duplicate_ids:
        print(f"    ! {sid} - 重复 {len(duplicates[sid])} 次，需合并评测记录")

    print(f"\n  已撤回 (withdrawn): {len(withdrawn_ids)} 条")
    for sid in withdrawn_ids:
        print(f"    × {sid} - 不计入统计")

    result = {
        "run_time": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        "duplicate_samples": [
            {
                "sample_id": sid,
                "content": samples[indices[0]]["content"],
                "repeat_count": len(indices),
                "review_times": [samples[i]["last_review_time"] for i in indices],
                "blocked_at": f"review_count={samples[indices[0]]['review_count']}, status={samples[indices[0]]['status']}, 未去重入库",
                "next_step": "1. 合并同一样本的多次评测记录\n2. 保留最新一次评测结果\n3. 更新 review_count=1\n4. 若为pending状态补充证据后改为confirmed"
            }
            for sid, indices in duplicates.items()
        ],
        "withdrawn_samples": [
            {
                "sample_id": w["sample_id"],
                "content": w["content"],
                "reason": w.get("manual_correction", "")
            }
            for w in withdrawn
        ],
        "version_changes": changes,
        "metrics_v1": metrics_v1,
        "metrics_v2": metrics_v2,
        "summary": {
            "confirmed": len({s["sample_id"] for s in confirmed}),
            "pending": len({s["sample_id"] for s in pending}),
            "duplicate": len(duplicate_ids),
            "withdrawn": len(withdrawn_ids)
        }
    }

    with open(EXPORT_FILE, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print_section("五、导出结果")
    print(f"  结果文件: {os.path.abspath(EXPORT_FILE)}")

    print_section("六、退出提示")
    if duplicates:
        sid = list(duplicates.keys())[0]
        s = samples[duplicates[sid][0]]
        print(f"  重复评测卡在哪:")
        print(f"    样本 {sid} 的 review_count={s['review_count']}，但实际重复评测了 {len(duplicates[sid])} 次")
        print(f"    原因: 入库时未按 sample_id 去重，导致同一条样本多次写入")
        print(f"\n  下一步怎么处理 (照着做):")
        print(f"    1. 打开样本表，按 sample_id 排序找到重复行")
        print(f"    2. 保留 last_review_time 最新的那一条，删除其余重复项")
        print(f"    3. 将保留的那条的 review_count 改为实际评测次数")
        print(f"    4. 如果状态是 pending，补充完证据后改为 confirmed")
        print(f"    5. 重新运行本脚本验证")
    else:
        print("  无重复评测问题。")

    print(f"\n  老唐接班须知:")
    print(f"    样例在哪 → {os.path.abspath(SAMPLES_FILE)}")
    print(f"    异常在哪 → 上面 '一、二、三' 节已标出")
    print(f"    结果怎么导出 → 已自动导出到 {os.path.abspath(EXPORT_FILE)}")

    exit_code = 1 if duplicates else 0
    print(f"\n  退出码: {exit_code} {'(存在重复评测，需处理)' if exit_code else '(正常)'}")
    sys.exit(exit_code)


if __name__ == "__main__":
    main()

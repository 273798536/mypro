import os
import json
import random
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from .database import SNAPSHOT_DIR


def list_available_snapshots() -> List[Dict[str, Any]]:
    snapshots = []
    if os.path.exists(SNAPSHOT_DIR):
        for fname in os.listdir(SNAPSHOT_DIR):
            if fname.endswith(".json"):
                fpath = os.path.join(SNAPSHOT_DIR, fname)
                try:
                    with open(fpath, "r") as f:
                        data = json.load(f)
                    snapshots.append({
                        "filename": fname,
                        "version": data.get("version", "unknown"),
                        "alias": data.get("alias", ""),
                        "created_at": data.get("created_at", ""),
                        "sample_count": len(data.get("samples", [])),
                        "is_latest": data.get("is_latest", False),
                    })
                except Exception:
                    pass
    return sorted(snapshots, key=lambda x: x.get("created_at", ""), reverse=True)


def load_snapshot(filename: str) -> Optional[Dict[str, Any]]:
    fpath = os.path.join(SNAPSHOT_DIR, filename)
    if not os.path.exists(fpath):
        return None
    with open(fpath, "r") as f:
        return json.load(f)


def check_alias_points_old(alias: str) -> Dict[str, Any]:
    if not alias:
        return {"points_to_old": False, "action_steps": []}

    snapshots = list_available_snapshots()
    alias_matches = [s for s in snapshots if s.get("alias") == alias]

    if not alias_matches:
        return {
            "points_to_old": False,
            "alias_name": alias,
            "current_file": "",
            "latest_file": "",
            "action_steps": [
                f"检查特征快照目录中是否存在别名 '{alias}' 对应的文件",
                "如果是新别名，请在快照文件中设置正确的 alias 字段",
            ],
        }

    current = alias_matches[0]
    latest = snapshots[0] if snapshots else None

    points_old = latest is not None and current["filename"] != latest["filename"]

    action_steps = []
    if points_old:
        action_steps = [
            f"当前别名 '{alias}' 指向旧文件: {current['filename']}",
            f"最新快照文件为: {latest['filename']} (版本 {latest.get('version', '?')})",
            "请确认是否需要使用旧版快照进行回放：",
            "  - 若需要旧版：直接继续回放，在备注中注明使用旧版原因",
            "  - 若需要新版：切换快照文件为最新版，或更新别名指向最新文件",
            "完成选择后重新执行回放，并记录版本选择理由",
        ]
    else:
        action_steps = [f"别名 '{alias}' 已指向最新版本，无需额外操作"]

    return {
        "points_to_old": points_old,
        "alias_name": alias,
        "current_file": current["filename"],
        "latest_file": latest["filename"] if latest else "",
        "action_steps": action_steps,
    }


def execute_replay(snapshot_file: str, threshold: float, parameters: Dict[str, Any]) -> Dict[str, Any]:
    snapshot = load_snapshot(snapshot_file)
    if snapshot is None:
        return {"status": "error", "message": f"快照文件 {snapshot_file} 不存在"}

    samples = snapshot.get("samples", [])
    random.seed(hash(f"{snapshot_file}_{threshold}_{json.dumps(parameters, sort_keys=True)}"))

    anomaly_ids = []
    sample_ids = []
    for s in samples:
        sid = s.get("id", "")
        sample_ids.append(sid)
        score = s.get("score", random.random())
        param_factor = 1.0
        if "topk" in parameters:
            param_factor *= 0.9 + (int(parameters["topk"]) % 10) * 0.01
        if "ef_search" in parameters:
            param_factor *= 0.95 + (int(parameters["ef_search"]) % 20) * 0.003
        final_score = score * param_factor
        if final_score > threshold:
            anomaly_ids.append(sid)

    precision = len(anomaly_ids) / max(len(sample_ids), 1) * 0.7 + random.uniform(0, 0.2)
    recall = min(1.0, len(anomaly_ids) / max(20, 1) * 0.8 + random.uniform(0, 0.15))
    f1 = 2 * precision * recall / max(precision + recall, 0.001)

    metrics = {
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "anomaly_rate": round(len(anomaly_ids) / max(len(sample_ids), 1), 4),
        "avg_score": round(sum(s.get("score", 0) for s in samples) / max(len(samples), 1), 4),
    }

    return {
        "status": "success",
        "sample_count": len(sample_ids),
        "anomaly_count": len(anomaly_ids),
        "metrics": metrics,
        "sample_ids": sample_ids,
        "anomaly_ids": anomaly_ids,
    }


def compare_parameters(prev_params: List[Any], curr_params: List[Any]) -> List[Dict[str, Any]]:
    prev_map = {p.param_name if hasattr(p, "param_name") else p["param_name"]:
                p.param_value if hasattr(p, "param_value") else p["param_value"]
                for p in prev_params}
    curr_map = {p.param_name if hasattr(p, "param_name") else p["param_name"]:
                p.param_value if hasattr(p, "param_value") else p["param_value"]
                for p in curr_params}

    diffs = []
    all_names = set(prev_map.keys()) | set(curr_map.keys())
    for name in sorted(all_names):
        pv = prev_map.get(name, None)
        cv = curr_map.get(name, None)
        if pv != cv:
            diffs.append({
                "param_name": name,
                "previous_value": pv,
                "current_value": cv,
                "change_type": "added" if pv is None else "removed" if cv is None else "modified",
            })
    return diffs


def compare_metrics(prev_metrics: Dict[str, Any], curr_metrics: Dict[str, Any]) -> List[Dict[str, Any]]:
    diffs = []
    all_keys = set(prev_metrics.keys()) | set(curr_metrics.keys())
    for k in sorted(all_keys):
        pv = prev_metrics.get(k)
        cv = curr_metrics.get(k)
        if pv != cv:
            try:
                delta = round(float(cv) - float(pv), 4) if pv is not None and cv is not None else None
            except (ValueError, TypeError):
                delta = None
            diffs.append({
                "metric_name": k,
                "previous_value": pv,
                "current_value": cv,
                "delta": delta,
            })
    return diffs


def analyze_influencing_factors(
    prev_run: Any,
    curr_run: Any,
    prev_judgments: List[Any],
    curr_judgments: List[Any],
    prev_notes: List[Any],
    curr_notes: List[Any],
    alias_warning: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    factors = []

    if prev_run is not None and curr_run is not None:
        prev_snap = prev_run.snapshot_file if hasattr(prev_run, "snapshot_file") else prev_run.get("snapshot_file")
        curr_snap = curr_run.snapshot_file if hasattr(curr_run, "snapshot_file") else curr_run.get("snapshot_file")
        if prev_snap != curr_snap:
            factors.append({
                "factor": "特征快照版本",
                "type": "snapshot",
                "detail": f"快照从 {prev_snap} 变更为 {curr_snap}",
                "impact": "高 - 特征数据变化直接影响索引构建和异常检测结果",
            })

        prev_thresh = prev_run.threshold if hasattr(prev_run, "threshold") else prev_run.get("threshold")
        curr_thresh = curr_run.threshold if hasattr(curr_run, "threshold") else curr_run.get("threshold")
        if prev_thresh != curr_thresh:
            factors.append({
                "factor": "异常阈值",
                "type": "threshold",
                "detail": f"阈值从 {prev_thresh} 变更为 {curr_thresh}",
                "impact": "高 - 阈值直接决定异常判定数量",
            })

        prev_params = prev_run.parameters if hasattr(prev_run, "parameters") else prev_run.get("parameters", [])
        curr_params = curr_run.parameters if hasattr(curr_run, "parameters") else curr_run.get("parameters", [])
        param_diffs = compare_parameters(prev_params, curr_params)
        if param_diffs:
            factors.append({
                "factor": "算法参数",
                "type": "parameters",
                "detail": f"共有 {len(param_diffs)} 个参数发生变化",
                "changes": param_diffs,
                "impact": "中 - 参数变化会影响召回和精确率",
            })

    prev_jids = set(j.sample_id if hasattr(j, "sample_id") else j["sample_id"] for j in prev_judgments)
    curr_jids = set(j.sample_id if hasattr(j, "sample_id") else j["sample_id"] for j in curr_judgments)
    if prev_jids != curr_jids:
        added = curr_jids - prev_jids
        removed = prev_jids - curr_jids
        factors.append({
            "factor": "人工改判",
            "type": "judgment",
            "detail": f"新增 {len(added)} 条改判，移除 {len(removed)} 条改判",
            "added_samples": list(added),
            "removed_samples": list(removed),
            "impact": "高 - 人工改判直接影响最终结论",
        })

    if len(prev_notes) != len(curr_notes):
        factors.append({
            "factor": "备注信息",
            "type": "notes",
            "detail": f"备注从 {len(prev_notes)} 条变为 {len(curr_notes)} 条",
            "impact": "低 - 备注不直接影响算法结果，但可能影响结论解读",
        })

    if alias_warning and alias_warning.get("points_to_old"):
        factors.append({
            "factor": "版本别名",
            "type": "alias",
            "detail": f"别名 '{alias_warning.get('alias_name')}' 指向旧快照文件",
            "action_steps": alias_warning.get("action_steps", []),
            "impact": "高 - 旧版快照数据可能已过时",
        })

    return factors


def generate_task_summary(task: Any, runs: List[Any]) -> Dict[str, Any]:
    latest_run = runs[-1] if runs else None
    sample_location = f"data/snapshots/{latest_run.snapshot_file}" if latest_run and latest_run.snapshot_file else "未指定"
    anomaly_count = latest_run.anomaly_count if latest_run else 0
    total_samples = latest_run.sample_count if latest_run else 0
    anomaly_location = f"任务#{task.id} -> 最新回放#{latest_run.id if latest_run else '-'} -> '异常样本' 标签页" if latest_run else "暂无回放"

    return {
        "task_id": task.id,
        "task_name": task.name,
        "latest_run_id": latest_run.id if latest_run else None,
        "sample_location": sample_location,
        "anomaly_location": anomaly_location,
        "export_method": "点击回放详情页右上角 '导出报告' 按钮，选择 JSON 或 CSV 格式",
        "anomaly_count": anomaly_count,
        "total_samples": total_samples,
        "last_updated": task.updated_at,
    }


def ensure_demo_snapshots():
    os.makedirs(SNAPSHOT_DIR, exist_ok=True)

    old_snapshot = {
        "version": "v2025.06.15",
        "alias": "daily_prod",
        "created_at": "2025-06-15T08:00:00",
        "is_latest": False,
        "samples": [
            {"id": f"s{i:04d}", "score": round(random.uniform(0.5, 0.95), 4), "category": "user_behavior"}
            for i in range(1, 51)
        ],
    }
    with open(os.path.join(SNAPSHOT_DIR, "features_v2025.06.15.json"), "w") as f:
        json.dump(old_snapshot, f, indent=2, ensure_ascii=False)

    latest_snapshot = {
        "version": "v2025.06.20",
        "alias": "daily_prod",
        "created_at": "2025-06-20T08:00:00",
        "is_latest": True,
        "samples": [
            {"id": f"s{i:04d}", "score": round(random.uniform(0.5, 0.95), 4), "category": "user_behavior"}
            for i in range(1, 56)
        ],
    }
    with open(os.path.join(SNAPSHOT_DIR, "features_v2025.06.20.json"), "w") as f:
        json.dump(latest_snapshot, f, indent=2, ensure_ascii=False)

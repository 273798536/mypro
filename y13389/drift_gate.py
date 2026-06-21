#!/usr/bin/env python3
"""
漂移监控上线守门 (Drift Gate)
===============================
用法：
  python drift_gate.py run      # 放样例 → 执行守门全流程 → 输出报告（首次）
  python drift_gate.py rerun    # 重置状态 → 再跑一遍
  python drift_gate.py show     # 打印最近一次守门的接口返回（JSON）

材料位置：
  samples/training_logs/        训练日志（分批），文件名 batch_*.jsonl，按文件名字典序加载
  samples/version_aliases/      alias_manifest.json：版本别名 → 旧文件的卡点、影响范围、来源行
  samples/gray_data/            gray_compare_*.json：灰度对比数据（含三因素拆解原始字段）
输出：
  reports/gate_report_*.json    守门完整报告（可被 show 读取）
  .state/                       中间状态（分批加载时保留 supersedes 历史，避免无声覆盖）
"""
import sys
import os
import json
import glob
import re
import shutil
from datetime import datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
SAMPLES_DIR = os.path.join(ROOT, "samples")
LOGS_DIR = os.path.join(SAMPLES_DIR, "training_logs")
ALIAS_DIR = os.path.join(SAMPLES_DIR, "version_aliases")
GRAY_DIR = os.path.join(SAMPLES_DIR, "gray_data")
REPORTS_DIR = os.path.join(ROOT, "reports")
STATE_DIR = os.path.join(ROOT, ".state")

STEPS = [
    ("STEP1_GOLDENSET_VERIFY", "样本集解密校验 / 版本别名依赖链检查"),
    ("STEP2_THRESHOLD_LOAD",    "阈值字典加载 / PSI阈值口径对齐"),
    ("STEP3_ONLINE_ALIGN",      "线上口径对齐 / 样本量与阈值统一"),
    ("STEP4_METRIC_MERGE",      "分批训练日志合并 / supersedes 历史保留"),
    ("STEP5_GRAY_BREAKDOWN",    "灰度报告三因素拆解"),
]

def ensure_dirs():
    for d in (REPORTS_DIR, STATE_DIR):
        os.makedirs(d, exist_ok=True)

def reset_state():
    if os.path.isdir(STATE_DIR):
        shutil.rmtree(STATE_DIR)
    for f in glob.glob(os.path.join(REPORTS_DIR, "gate_report_*.json")):
        os.remove(f)
    ensure_dirs()

def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def load_jsonl(path):
    rows = []
    with open(path, "r", encoding="utf-8") as f:
        for lineno, line in enumerate(f, 1):
            s = line.strip()
            if not s:
                continue
            obj = json.loads(s)
            obj["__source_file"] = os.path.basename(path)
            obj["__source_line"] = lineno
            rows.append(obj)
    return rows

def step1_check_aliases(manifest):
    """STEP1: 版本别名依赖链检查，报告每个别名卡在哪、影响范围、来源行"""
    aliases = manifest.get("aliases", [])
    result = {
        "step": STEPS[0][0],
        "pass": True,
        "warnings": [],
        "alias_status": [],
    }
    alias_map = {a["alias_name"]: a for a in aliases}
    for a in aliases:
        stuck_step = a.get("stuck_step_code", "UNKNOWN")
        stuck_step_idx = next((i for i, (code, _) in enumerate(STEPS) if code == stuck_step), -1)
        blocked_by = a.get("blocked_by_alias")
        is_stuck = stuck_step_idx >= 0 and stuck_step_idx < len(STEPS) - 1
        chain = []
        cur = blocked_by
        while cur and cur in alias_map:
            chain.append(cur)
            cur = alias_map[cur].get("blocked_by_alias")
        status = {
            "alias_name": a["alias_name"],
            "resolves_to_file": a.get("resolves_to_file", ""),
            "is_stuck": is_stuck,
            "stuck_step_code": stuck_step,
            "stuck_step_name": STEPS[stuck_step_idx][1] if stuck_step_idx >= 0 else "",
            "stuck_point": a.get("stuck_point", ""),
            "stuck_description": a.get("stuck_step_description", ""),
            "impact_scope": a.get("impact_scope", []),
            "source_refs": a.get("source_refs", []),
            "blocked_by": blocked_by,
            "blocked_by_chain": chain,
            "note": a.get("note", ""),
        }
        if is_stuck:
            result["pass"] = False
            result["warnings"].append(
                f"别名[{a['alias_name']}] 卡在 {stuck_step} -> {a.get('stuck_point')}"
            )
        result["alias_status"].append(status)
    return result

def step2_check_thresholds(step1_result, manifest):
    """STEP2: 阈值口径检查 — 标记哪些别名引用了旧阈值 0.150 未对齐"""
    result = {"step": STEPS[1][0], "pass": True, "warnings": [], "threshold_mismatch": []}
    for a in step1_result["alias_status"]:
        if a["stuck_step_code"] == "STEP2_THRESHOLD_LOAD":
            result["pass"] = False
            mismatch = {
                "alias_name": a["alias_name"],
                "resolves_to_file": a["resolves_to_file"],
                "issue": "阈值文件未对齐线上 v3.3.0 (0.100)",
                "source_refs": a["source_refs"],
            }
            result["threshold_mismatch"].append(mismatch)
            result["warnings"].append(
                f"阈值别名[{a['alias_name']}] 未对齐线上 0.100，来源行见: "
                + ", ".join(f"{r['file']}:L{','.join(map(str,r['lines']))}" for r in a["source_refs"])
            )
    return result

def step3_online_align(step1_result):
    """STEP3: 线上口径对齐 — 检查 sample_cnt / threshold 的离线线上差异"""
    result = {"step": STEPS[2][0], "pass": True, "warnings": [], "misalignments": []}
    for a in step1_result["alias_status"]:
        if a["stuck_step_code"] == "STEP3_ONLINE_ALIGN":
            result["pass"] = False
            item = {
                "alias_name": a["alias_name"],
                "stuck_point": a["stuck_point"],
                "impact_scope": a["impact_scope"],
                "source_refs": a["source_refs"],
            }
            result["misalignments"].append(item)
            for scope in a["impact_scope"]:
                result["warnings"].append(f"[{a['alias_name']}] 口径未对齐: {scope}")
    return result

def step4_merge_training_logs():
    """STEP4: 分批合并训练日志 — 保留 supersedes 历史，绝不无声覆盖早先判断"""
    result = {
        "step": STEPS[3][0],
        "pass": True,
        "warnings": [],
        "batches_loaded": [],
        "final_metrics": {},
        "superseded_chain": {},
    }
    log_files = sorted(glob.glob(os.path.join(LOGS_DIR, "batch_*.jsonl")))
    state_path = os.path.join(STATE_DIR, "metrics_state.json")
    state = {"metrics": {}, "chain": {}}
    if os.path.isfile(state_path):
        state = load_json(state_path)

    for fp in log_files:
        base = os.path.basename(fp)
        batch_rows = load_jsonl(fp)
        loaded_cnt = 0
        superseded_cnt = 0
        for row in batch_rows:
            metric = row.get("metric")
            if not metric:
                continue
            key = metric
            old = state["metrics"].get(key)
            supersedes_ref = row.get("supersedes_metric_line")
            if old:
                state["chain"][key][-1]["superseded_by_ref"] = f"{row.get('__source_file')}:L{row.get('__source_line')}"
                state["chain"][key].append({
                    "version": len(state["chain"][key]) + 1,
                    "value_snapshot": {
                        k: row[k] for k in ("offline_value", "threshold", "online_expected",
                                            "judgement", "source", "batch") if k in row
                    },
                    "source_ref": f"{row.get('__source_file')}:L{row.get('__source_line')}",
                    "superseded_by_ref": "",
                    "supersedes_declared_in_new_row": supersedes_ref or "",
                    "note": row.get("note", old.get("note", "")),
                })
                superseded_cnt += 1
            else:
                if key not in state["chain"]:
                    state["chain"][key] = []
                state["chain"][key].append({
                    "version": 1,
                    "value_snapshot": {
                        k: row[k] for k in ("offline_value", "threshold", "online_expected",
                                            "judgement", "source", "batch") if k in row
                    },
                    "source_ref": f"{row.get('__source_file')}:L{row.get('__source_line')}",
                    "superseded_by_ref": "",
                    "supersedes_declared_in_new_row": supersedes_ref or "",
                    "note": row.get("note", ""),
                })
            state["metrics"][key] = row
            loaded_cnt += 1
        result["batches_loaded"].append({
            "file": base,
            "loaded_metric_count": loaded_cnt,
            "superseded_prior_entries": superseded_cnt,
        })
    with open(state_path, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)
    for k, v in state["metrics"].items():
        snap = {kk: v[kk] for kk in ("offline_value", "online_expected", "threshold",
                                     "judgement", "judge_reason", "source", "batch",
                                     "train_sample_cnt", "eval_sample_cnt", "gray_actual",
                                     "__source_file", "__source_line") if kk in v}
        result["final_metrics"][k] = snap
    for k, chain in state["chain"].items():
        if len(chain) > 1:
            result["warnings"].append(
                f"指标[{k}] 共被覆盖 {len(chain) - 1} 次，历史版本见 reports superseded_chain"
            )
    result["superseded_chain"] = state["chain"]
    return result

def step5_gray_breakdown(step4_result):
    """STEP5: 灰度三因素拆解 — 样本变化 / 阈值变化 / 人工改判 独立归因"""
    gray_files = sorted(glob.glob(os.path.join(GRAY_DIR, "gray_compare_*.json")))
    result = {
        "step": STEPS[4][0],
        "pass": True,
        "warnings": [],
        "gray_run_id": None,
        "factors": {
            "sample_change": {"metrics": [], "explanation": "", "attribution_pct": 0, "details": []},
            "threshold_change": {"metrics": [], "explanation": "", "attribution_pct": 0, "details": []},
            "manual_override": {"metrics": [], "explanation": "", "attribution_pct": 0, "details": []},
        },
        "metric_table": [],
    }
    if not gray_files:
        result["warnings"].append("未找到灰度对比文件 samples/gray_data/gray_compare_*.json")
        result["pass"] = False
        return result
    gf = load_json(gray_files[-1])
    result["gray_run_id"] = gf.get("gray_run_id")
    raw = gf.get("factor_breakdown_raw", {})
    factor_map = {
        "sample_change": "sample_change",
        "threshold_change": "threshold_change",
        "manual_override": "manual_override",
    }
    for k, v in factor_map.items():
        r = raw.get(k, {})
        result["factors"][v]["metrics"] = r.get("affected_metrics", [])
        result["factors"][v]["explanation"] = r.get("explanation", "")
        result["factors"][v]["attribution_pct"] = r.get("baseline_to_target_expected_delta_attribution_pct", 0)
    for m in gf.get("metrics", []):
        metric = m["metric"]
        row = {
            "metric": metric,
            "baseline": m.get("baseline_value"),
            "target_expected": m.get("target_expected_online", m.get("target_expected_judgement")),
            "target_gray_actual": m.get("target_gray_actual", m.get("target_gray_actual_judgement")),
            "delta_sample_change_effect": None,
            "delta_threshold_change_effect": None,
            "delta_manual_override_effect": None,
            "final_judgement": m.get("target_gray_actual_judgement", m.get("target_expected_judgement")),
        }
        if metric in result["factors"]["sample_change"]["metrics"]:
            row["delta_sample_change_effect"] = (
                m.get("target_gray_actual", 0) - m.get("target_expected_online", m.get("target_expected_online", 0))
            ) if isinstance(m.get("target_gray_actual"), (int, float)) else None
        if metric in result["factors"]["threshold_change"]["metrics"]:
            if m.get("target_expected_judgement") and m.get("baseline_judgement"):
                row["delta_threshold_change_effect"] = (
                    f"{m['baseline_judgement']}→{m['target_expected_judgement']}"
                )
        mo = m.get("manual_override")
        if mo:
            row["delta_manual_override_effect"] = f"{mo['from']}→{mo['to']} (by {mo.get('operator','')})"
            row["final_judgement"] = mo["to"]
            result["factors"]["manual_override"]["details"].append({
                "metric": metric,
                "from": mo["from"], "to": mo["to"],
                "operator": mo.get("operator"), "reason": mo.get("reason"), "timestamp": mo.get("timestamp"),
            })
        for fk, fv in result["factors"].items():
            if metric in fv["metrics"]:
                if fk == "threshold_change":
                    fv["details"].append({
                        "metric": metric,
                        "baseline_threshold": m.get("baseline_threshold"),
                        "target_threshold": m.get("target_threshold"),
                        "judgement_flip": f"{m.get('baseline_judgement')}→{m.get('target_expected_judgement')}",
                    })
                elif fk == "sample_change":
                    fv["details"].append({
                        "metric": metric,
                        "baseline_sample_cnt": m.get("baseline_sample_cnt"),
                        "gray_sample_cnt": m.get("gray_sample_cnt"),
                        "delta_expected_vs_baseline": m.get("delta_expected_vs_baseline"),
                        "delta_actual_vs_expected": m.get("delta_actual_vs_expected"),
                    })
        result["metric_table"].append(row)
    for row in result["metric_table"]:
        if row["final_judgement"] == "FAIL":
            result["warnings"].append(f"灰度最终判定 FAIL: {row['metric']}")
    if result["warnings"]:
        result["pass"] = False
    return result

def build_exit_summary(step1, step2, step3, step4, step5):
    """组装 exit 提示：讲清每个版本别名指哪、旧文件卡在哪一步、影响范围与来源行"""
    lines = []
    lines.append("=" * 72)
    lines.append("【漂移监控上线守门】执行完成 —— 版本别名卡点汇总")
    lines.append("=" * 72)
    alias_by_step = {}
    for a in step1["alias_status"]:
        alias_by_step.setdefault(a["stuck_step_code"], []).append(a)
    for code, name in STEPS:
        aliases = alias_by_step.get(code, [])
        if not aliases:
            continue
        lines.append("")
        lines.append(f"▶ {code}  {name}")
        for a in aliases:
            flag = "⚠️  卡住" if a["is_stuck"] else "✅ 已解"
            lines.append(f"  {flag} 别名: {a['alias_name']}")
            lines.append(f"     指向文件  → {a['resolves_to_file']}")
            lines.append(f"     卡点描述  → {a['stuck_point']}")
            lines.append(f"     细节说明  → {a['stuck_description']}")
            if a["blocked_by_chain"]:
                lines.append(f"     依赖链阻塞 → {' → '.join(a['blocked_by_chain'])} → {a['alias_name']}")
            if a["impact_scope"]:
                lines.append(f"     影响范围:")
                for s in a["impact_scope"]:
                    lines.append(f"       - {s}")
            if a["source_refs"]:
                lines.append(f"     来源行证据:")
                for r in a["source_refs"]:
                    lines.append(f"       - {r['file']} #L{','.join(map(str, r['lines']))}  — {r.get('comment', '')}")
            if a["note"]:
                lines.append(f"     备注: {a['note']}")
    lines.append("")
    lines.append("-" * 72)
    lines.append("【后补材料覆盖情况】STEP4_METRIC_MERGE (绝不无声覆盖)")
    for metric, chain in step4["superseded_chain"].items():
        if len(chain) > 1:
            lines.append(f"  ※ 指标[{metric}] 修订 {len(chain) - 1} 次，版本链：")
            for ver in chain:
                s = f"      v{ver['version']}. {ver['source_ref']}"
                if ver["superseded_by_ref"]:
                    s += f"  → 被 {ver['superseded_by_ref']} 覆盖"
                if ver.get("supersedes_declared_in_new_row"):
                    s += f"  [supersedes字段: {ver['supersedes_declared_in_new_row']}]"
                lines.append(s)
    lines.append("")
    lines.append("-" * 72)
    lines.append("【灰度三因素拆解】STEP5_GRAY_BREAKDOWN")
    for fk, label in [("sample_change", "样本变化"),
                       ("threshold_change", "阈值变化"),
                       ("manual_override", "人工改判")]:
        f = step5["factors"][fk]
        lines.append(f"  • {label} ({f['attribution_pct']}%): {f['explanation']}")
        if f["metrics"]:
            lines.append(f"      受影响指标: {', '.join(f['metrics'])}")
    final_pass = step1["pass"] and step2["pass"] and step3["pass"] and step4["pass"] and step5["pass"]
    lines.append("")
    lines.append("=" * 72)
    lines.append(f"守门结论: {'🟢 PASS' if final_pass else '🔴 FAIL'} — 详细报告见 reports/gate_report_*.json")
    lines.append("=" * 72)
    return "\n".join(lines), final_pass

def run_gate():
    ensure_dirs()
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    manifest = load_json(os.path.join(ALIAS_DIR, "alias_manifest.json"))
    print("[1/5] STEP1_GOLDENSET_VERIFY  版本别名依赖链检查 ...")
    s1 = step1_check_aliases(manifest)
    print(f"      → 别名 {len(s1['alias_status'])} 个，卡住 "
          f"{sum(1 for a in s1['alias_status'] if a['is_stuck'])} 个")
    print("[2/5] STEP2_THRESHOLD_LOAD     阈值口径对齐检查 ...")
    s2 = step2_check_thresholds(s1, manifest)
    print(f"      → 阈值未对齐 {len(s2['threshold_mismatch'])} 项")
    print("[3/5] STEP3_ONLINE_ALIGN       线上口径对齐检查 ...")
    s3 = step3_online_align(s1)
    print(f"      → 口径偏差项 {len(s3['misalignments'])} 项")
    print("[4/5] STEP4_METRIC_MERGE       训练日志分批合并（保留 supersedes 链）...")
    s4 = step4_merge_training_logs()
    print(f"      → 加载 {len(s4['batches_loaded'])} 批，产出指标 {len(s4['final_metrics'])} 个")
    print("[5/5] STEP5_GRAY_BREAKDOWN     灰度三因素拆解 ...")
    s5 = step5_gray_breakdown(s4)
    print(f"      → 灰度run={s5.get('gray_run_id')}，FAIL指标 "
          f"{sum(1 for r in s5['metric_table'] if r.get('final_judgement')=='FAIL')} 个")
    report = {
        "gate_version": "1.0.0",
        "generated_at": ts,
        "material_paths": {
            "training_logs_dir": "samples/training_logs/",
            "alias_manifest": "samples/version_aliases/alias_manifest.json",
            "gray_data_dir": "samples/gray_data/",
        },
        "how_to_rerun": "python drift_gate.py rerun",
        "how_to_show": "python drift_gate.py show",
        "steps": {
            "STEP1_GOLDENSET_VERIFY": s1,
            "STEP2_THRESHOLD_LOAD": s2,
            "STEP3_ONLINE_ALIGN": s3,
            "STEP4_METRIC_MERGE": s4,
            "STEP5_GRAY_BREAKDOWN": s5,
        },
    }
    report_path = os.path.join(REPORTS_DIR, f"gate_report_{ts}.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    latest_link = os.path.join(REPORTS_DIR, "gate_report_latest.json")
    if os.path.lexists(latest_link):
        os.remove(latest_link)
    try:
        os.symlink(os.path.basename(report_path), latest_link)
    except OSError:
        shutil.copy(report_path, latest_link)
    summary, final_pass = build_exit_summary(s1, s2, s3, s4, s5)
    print()
    print(summary)
    print()
    print(f"报告已写入: {report_path}")
    print(f"查看接口返回: python drift_gate.py show")
    print(f"重跑整包:     python drift_gate.py rerun")
    return 0 if final_pass else 1

def show_latest():
    latest = os.path.join(REPORTS_DIR, "gate_report_latest.json")
    if not os.path.isfile(latest) and not os.path.islink(latest):
        print("尚未发现报告，请先执行: python drift_gate.py run")
        return 1
    data = load_json(latest)
    print(json.dumps(data, ensure_ascii=False, indent=2))
    return 0

def main():
    argv = sys.argv[1:]
    if not argv or argv[0] == "run":
        sys.exit(run_gate())
    elif argv[0] == "rerun":
        print("重置状态并重跑...")
        reset_state()
        sys.exit(run_gate())
    elif argv[0] == "show":
        sys.exit(show_latest())
    elif argv[0] in ("-h", "--help", "help"):
        print(__doc__)
        sys.exit(0)
    else:
        print(f"未知命令: {argv[0]}", file=sys.stderr)
        print(__doc__, file=sys.stderr)
        sys.exit(2)

if __name__ == "__main__":
    main()

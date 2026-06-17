import copy
from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional
from collections import Counter, defaultdict

from .data_loader import (
    AuditDataset, parse_mixed_required,
    find_duplicate_groups, count_dirty_issues,
)


# ---------------------------------------------------------------------------
# 评测回放模块：按一套规则重放校验，对比原始结论
# ---------------------------------------------------------------------------

VALID_TYPES = {"string", "integer", "number", "boolean", "array", "object"}
CORE_PARAM_HINTS = {"path", "url", "query", "file", "body", "schema", "data", "pattern", "input"}


def _validate_single_param(param: Dict[str, Any], tool_name: str) -> List[Dict[str, Any]]:
    """校验单个参数，返回问题清单 [{param_name, issue_type, detail}]"""
    issues = []
    pname = param.get("param_name", "<unnamed>")
    ptype = param.get("param_type")
    description = param.get("description")
    enum_val = param.get("enum")
    required_raw = param.get("required", True)

    if ptype not in VALID_TYPES:
        issues.append({
            "param": pname, "type": "类型不匹配",
            "detail": f"param_type={ptype!r} 不在允许的集合 {VALID_TYPES}",
        })

    clean_req, _ = parse_mixed_required(required_raw)
    is_core = any(h in pname.lower() for h in CORE_PARAM_HINTS)
    if is_core and clean_req is False:
        issues.append({
            "param": pname, "type": "必填缺失",
            "detail": f"核心参数 {pname} 被标记为非必填",
        })

    if description is None or (isinstance(description, str) and not description.strip()):
        issues.append({
            "param": pname, "type": "空值异常",
            "detail": "description 为空",
        })

    if enum_val is not None:
        if isinstance(enum_val, list) and len(enum_val) == 0:
            issues.append({
                "param": pname, "type": "枚举值非法",
                "detail": "enum 是空数组",
            })
        elif not isinstance(enum_val, list):
            issues.append({
                "param": pname, "type": "枚举值非法",
                "detail": f"enum 不是 list 类型: {type(enum_val).__name__}",
            })

    if not isinstance(required_raw, bool):
        issues.append({
            "param": pname, "type": "备注混写",
            "detail": f"required 为非布尔: {required_raw!r}",
        })

    return issues


def replay_audit(dataset: AuditDataset) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    重放评测，对每条记录再跑一次校验
    返回:
      (replay_rows 对比明细列表, stats 统计汇总)
    replay_rows 中每行: {
      record_id, tool_name, annotator,
      original_status, replay_status, status_changed,
      original_summary, replay_summary,
      issue_count, issue_types
    }
    """
    rows: List[Dict[str, Any]] = []
    issue_counter = Counter()
    status_cmp = Counter()

    for rec in dataset.records:
        all_issues: List[Dict[str, Any]] = []
        for p in rec.get("params", []):
            all_issues.extend(_validate_single_param(p, rec["tool_name"]))

        if not rec.get("source_material_ids"):
            all_issues.append({
                "param": "-", "type": "来源不可追溯",
                "detail": "未关联任何 source_material_ids",
            })

        summary_mentions_pending = (
            "待确认" in rec.get("original_audit_summary", "")
            or "未通过" in rec.get("original_audit_summary", "")
        )
        if rec.get("original_audit_status") == "通过" and summary_mentions_pending:
            all_issues.append({
                "param": "-", "type": "结论冲突",
                "detail": "状态为通过但摘要含待确认/未通过字样",
            })

        if all_issues:
            if rec.get("gray_flag"):
                replay_status = "灰度观察"
            elif any(i["type"] in {"类型不匹配", "必填缺失", "枚举值非法",
                                   "结论冲突", "来源不可追溯"} for i in all_issues):
                replay_status = "未通过"
            else:
                replay_status = "待确认"
            replay_summary = "; ".join(
                f"{i['param']}[{i['type']}]:{i['detail']}" for i in all_issues[:3]
            ) + (" ..." if len(all_issues) > 3 else "")
        else:
            replay_status = "通过"
            replay_summary = "重放校验通过，所有参数合规"

        original_status = rec.get("original_audit_status", "")
        status_changed = original_status != replay_status
        change_key = f"{original_status} → {replay_status}"
        status_cmp[change_key] += 1

        for it in {i["type"] for i in all_issues}:
            issue_counter[it] += 1

        rows.append({
            "record_id": rec["record_id"],
            "tool_name": rec["tool_name"],
            "tool_category": rec.get("tool_category", ""),
            "annotator": rec.get("annotator", ""),
            "original_status": original_status,
            "replay_status": replay_status,
            "status_changed": status_changed,
            "original_summary": rec.get("original_audit_summary", ""),
            "replay_summary": replay_summary,
            "issue_count": len(all_issues),
            "issue_types": sorted({i["type"] for i in all_issues}),
            "issue_details": all_issues,
        })

    total = len(rows)
    pass_n = sum(1 for r in rows if r["replay_status"] == "通过")
    fail_n = sum(1 for r in rows if r["replay_status"] == "未通过")
    pending_n = sum(1 for r in rows if r["replay_status"] == "待确认")
    gray_n = sum(1 for r in rows if r["replay_status"] == "灰度观察")
    changed_n = sum(1 for r in rows if r["status_changed"])

    stats = {
        "total": total,
        "pass_rate": round(pass_n / total * 100, 1) if total else 0.0,
        "by_replay_status": {"通过": pass_n, "未通过": fail_n,
                             "待确认": pending_n, "灰度观察": gray_n},
        "changed_count": changed_n,
        "status_transitions": dict(status_cmp),
        "top_issue_types": issue_counter.most_common(),
    }
    return rows, stats


# ---------------------------------------------------------------------------
# 人工修正模块：脏数据清洗 + 修正流水
# ---------------------------------------------------------------------------

def clean_record(rec: Dict[str, Any]) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    """
    对单条记录做脏数据清洗
    返回: (清洗后的记录, 清洗动作列表)
    """
    cleaned = copy.deepcopy(rec)
    actions: List[Dict[str, Any]] = []

    for p in cleaned.get("params", []):
        if p.get("description") is None or (
            isinstance(p.get("description"), str) and not p["description"].strip()
        ):
            new_desc = f"（自动补）{p['param_name']} 参数说明"
            p["description"] = new_desc
            actions.append({
                "field": f"params[{p['param_name']}].description",
                "action": "空值补全",
                "detail": f"空 → {new_desc}",
            })

        if isinstance(p.get("enum"), list) and len(p.get("enum", [])) == 0:
            p["enum"] = None
            actions.append({
                "field": f"params[{p['param_name']}].enum",
                "action": "空枚举置空",
                "detail": "[] → None（表示无枚举约束）",
            })

        if not isinstance(p.get("required"), bool):
            clean_bool, remark = parse_mixed_required(p.get("required"))
            old_val = p["required"]
            p["required"] = clean_bool if clean_bool is not None else False
            if remark:
                p["annotation_remark"] = (
                    (p.get("annotation_remark") or "") + " " + remark
                ).strip()
            actions.append({
                "field": f"params[{p['param_name']}].required",
                "action": "备注剥离",
                "detail": f"{old_val!r} → {p['required']}"
                        + (f" (备注入annotation_remark: {remark})" if remark else ""),
            })

    if not cleaned.get("source_material_ids"):
        cleaned["risk_tags"] = list(dict.fromkeys(
            cleaned.get("risk_tags", []) + ["来源不可追溯"]
        ))
        actions.append({
            "field": "source_material_ids",
            "action": "标记缺失",
            "detail": "空列表 → 保留并打标签，需人工补充来源",
        })

    summary = cleaned.get("original_audit_summary", "")
    status = cleaned.get("original_audit_status", "")
    if status == "通过" and ("待确认" in summary or "未通过" in summary):
        cleaned["original_audit_status"] = "待确认"
        actions.append({
            "field": "original_audit_status",
            "action": "结论冲突修正",
            "detail": f"状态由「通过」改为「待确认」，以摘要为准",
        })

    return cleaned, actions


def build_correction_flow(dataset: AuditDataset) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    整合系统自动清洗 + 已有的人工修正记录，生成完整修正流水
    """
    flow: List[Dict[str, Any]] = []
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    auto_cleaned_counts = Counter()
    for rec in dataset.records:
        cleaned_rec, actions = clean_record(rec)
        for act in actions:
            auto_cleaned_counts[act["action"]] += 1
            flow.append({
                "time": ts,
                "corrector": "系统自动清洗",
                "record_id": rec["record_id"],
                "tool_name": rec["tool_name"],
                "field": act["field"],
                "action": act["action"],
                "detail": act["detail"],
            })

    for c in dataset.corrections:
        rec = dataset.record_by_id(c["record_id"])
        flow.append({
            "time": c.get("corrected_at", ""),
            "corrector": c.get("corrector", ""),
            "record_id": c["record_id"],
            "tool_name": rec["tool_name"] if rec else "",
            "field": c.get("field_name", ""),
            "action": c.get("reason", "人工修正"),
            "detail": f"{c.get('old_value')!r} → {c.get('new_value')!r}",
            "is_cleaned": c.get("is_cleaned", False),
        })

    flow.sort(key=lambda x: x["time"])

    dirty_before = count_dirty_issues(dataset.records)
    cleaned_records = []
    for rec in dataset.records:
        c, _ = clean_record(rec)
        cleaned_records.append(c)
    dirty_after = count_dirty_issues(cleaned_records)

    dup_before = sum(len(g) for g in find_duplicate_groups(dataset.records))
    dup_groups = find_duplicate_groups(dataset.records)
    dedup_removed = 0
    for g in dup_groups:
        dedup_removed += max(0, len(g) - 1)
    dirty_after["重复标注"] = max(0, dirty_before["重复标注"] - dedup_removed)

    stats = {
        "auto_clean_actions": dict(auto_cleaned_counts),
        "manual_correction_count": len(dataset.corrections),
        "dirty_before": dirty_before,
        "dirty_after": dirty_after,
        "dirty_fixed_rate": {},
        "duplicate_groups": dup_groups,
        "dedup_would_remove": dedup_removed,
    }
    for k in dirty_before:
        b = dirty_before.get(k, 0)
        a = dirty_after.get(k, 0)
        if b > 0:
            stats["dirty_fixed_rate"][k] = round((b - a) / b * 100, 1)
        else:
            stats["dirty_fixed_rate"][k] = 0.0

    return flow, stats


# ---------------------------------------------------------------------------
# 灰度对比模块：来源材料回溯 + 前后对比
# ---------------------------------------------------------------------------

def build_gray_analysis(dataset: AuditDataset,
                        replay_rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    灰度对比分析:
    - 按批次分组
    - 对比 灰度 vs 非灰度 的通过率
    - 每条记录 → 关联的来源材料引用链
    """
    by_batch: Dict[str, List[str]] = defaultdict(list)
    gray_rids, non_gray_rids = [], []
    for rec in dataset.records:
        if rec.get("gray_flag") and rec.get("gray_batch"):
            by_batch[rec["gray_batch"]].append(rec["record_id"])
            gray_rids.append(rec["record_id"])
        else:
            non_gray_rids.append(rec["record_id"])

    replay_by_rid = {r["record_id"]: r for r in replay_rows}

    def _pass_rate(rids):
        if not rids:
            return 0.0, 0, 0
        n_pass = sum(1 for rid in rids
                     if replay_by_rid.get(rid, {}).get("replay_status") == "通过")
        return round(n_pass / len(rids) * 100, 1), n_pass, len(rids)

    overall_non_gray_rate, non_gray_pass, non_gray_total = _pass_rate(non_gray_rids)
    overall_gray_rate, gray_pass, gray_total = _pass_rate(gray_rids)

    batch_stats = []
    for batch, rids in sorted(by_batch.items()):
        rate, p, t = _pass_rate(rids)
        batch_stats.append({
            "gray_batch": batch,
            "total": t, "pass": p,
            "pass_rate": rate,
            "delta_vs_non_gray": round(rate - overall_non_gray_rate, 1),
            "record_ids": rids,
        })

    source_chains = []
    for rec in dataset.records:
        chain = []
        for mid in rec.get("source_material_ids", []):
            mat = dataset.material_by_id(mid)
            if mat:
                chain.append({
                    "material_id": mid,
                    "title": mat.get("title", ""),
                    "url": mat.get("url", ""),
                    "snippet": mat.get("content_snippet", ""),
                })
        source_chains.append({
            "record_id": rec["record_id"],
            "tool_name": rec["tool_name"],
            "conclusion": rec.get("original_audit_status", ""),
            "source_count": len(chain),
            "source_chain": chain,
            "can_trace": len(chain) > 0,
        })

    return {
        "gray_batch_count": len(by_batch),
        "gray_record_count": len(gray_rids),
        "non_gray_pass_rate": overall_non_gray_rate,
        "gray_pass_rate": overall_gray_rate,
        "pass_rate_delta": round(overall_gray_rate - overall_non_gray_rate, 1),
        "by_batch": batch_stats,
        "source_chains": source_chains,
        "untraced_count": sum(1 for s in source_chains if not s["can_trace"]),
    }


# ---------------------------------------------------------------------------
# 摘要-导出一致性校验 & 报告导出
# ---------------------------------------------------------------------------

def build_ui_summary(gray_analysis: Dict[str, Any],
                     replay_stats: Dict[str, Any],
                     correction_stats: Dict[str, Any]) -> Dict[str, Any]:
    """生成界面摘要（与导出内容一致的统一来源）"""
    total = replay_stats["total"]
    pass_rt = replay_stats["pass_rate"]
    issues = replay_stats["top_issue_types"]
    top_issue = issues[0] if issues else ("-", 0)

    summary_text = (
        f"本轮审计共 {total} 条记录，重放通过率 {pass_rt}%；"
        f"最常见问题「{top_issue[0]}」共 {top_issue[1]} 条。"
    )
    if gray_analysis["gray_record_count"]:
        summary_text += (
            f" 其中灰度观察 {gray_analysis['gray_record_count']} 条，"
            f"灰度通过率 {gray_analysis['gray_pass_rate']}%，"
            f"较非灰度 {'低' if gray_analysis['pass_rate_delta']<0 else '高'} "
            f"{abs(gray_analysis['pass_rate_delta'])} 个百分点。"
        )
    untraced = gray_analysis["untraced_count"]
    if untraced:
        summary_text += f" 另有 {untraced} 条未关联来源材料，需补齐。"

    dirty_total_before = sum(correction_stats["dirty_before"].values())
    dirty_total_after = sum(correction_stats["dirty_after"].values())
    fixed_total = dirty_total_before - dirty_total_after
    if dirty_total_before:
        summary_text += (
            f" 脏数据清洗：本轮共处理 {fixed_total}/{dirty_total_before} 处。"
        )

    changed = replay_stats["changed_count"]
    if changed:
        transitions = "; ".join(
            f"{k} x{v}" for k, v in replay_stats["status_transitions"].items() if v
        )
        summary_text += f" 重放结论变化 {changed} 条（{transitions}）。"

    return {
        "summary_text": summary_text,
        "metrics": {
            "总记录数": total,
            "重放通过率": f"{pass_rt}%",
            "结论变化条数": changed,
            "灰度记录数": gray_analysis["gray_record_count"],
            "未溯源记录数": untraced,
            "脏数据修复率": (
                f"{round(fixed_total / dirty_total_before * 100, 1)}%"
                if dirty_total_before else "0%"
            ),
        },
        "audit_verdict": (
            "通过" if pass_rt >= 80 and untraced == 0 and changed <= total * 0.1
            else "有条件通过（待复核）"
        ),
    }


def check_consistency(ui_summary: Dict[str, Any],
                      exported_summary: Dict[str, Any]) -> Dict[str, Any]:
    """
    检查界面摘要与导出文件是否一致
    返回 {matched: bool, diffs: [...]}
    """
    diffs = []
    for k in ["summary_text", "audit_verdict"]:
        if ui_summary.get(k) != exported_summary.get(k):
            diffs.append({
                "field": k,
                "ui_value": ui_summary.get(k),
                "export_value": exported_summary.get(k),
            })
    for k, v in ui_summary.get("metrics", {}).items():
        ev = exported_summary.get("metrics", {}).get(k)
        if v != ev:
            diffs.append({
                "field": f"metrics.{k}",
                "ui_value": v, "export_value": ev,
            })
    return {"matched": len(diffs) == 0, "diffs": diffs}

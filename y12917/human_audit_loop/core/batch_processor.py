import os
from typing import Dict, List, Tuple
from datetime import datetime
from collections import defaultdict

from .data_loader import (
    UnifiedRecord,
    BatchProcessResult,
    build_unified_records,
    load_all_data,
)


def _normalize(s: str) -> str:
    return (s or "").strip().replace(" ", "").replace("\u3000", "").lower()


def detect_duplicates(records: List[UnifiedRecord]) -> Dict[str, List[str]]:
    groups: Dict[str, List[str]] = defaultdict(list)
    id_to_rec = {r.record_id: r for r in records}

    for rec in records:
        cust = _normalize(rec.customer_name)
        prod = _normalize(rec.product)
        amt = round(rec.amount, 2)
        city_norm = _normalize(rec.city)
        if cust and prod and amt > 0:
            key = f"{cust}|{prod}|{amt}|{city_norm}"
            groups[key].append(rec.record_id)

    link_groups: Dict[str, List[str]] = defaultdict(list)
    for rec in records:
        if rec.link_old_id and rec.link_old_id in id_to_rec:
            k = sorted([rec.record_id, rec.link_old_id])
            link_groups["|".join(k)] = [rec.record_id, rec.link_old_id]

    dedup_groups: Dict[str, List[str]] = {}
    used_rids = set()

    for key, rids in groups.items():
        if len(rids) > 1:
            canonical = sorted(rids)[0]
            if canonical not in used_rids:
                dedup_groups[canonical] = []
            for rid in rids:
                if rid != canonical:
                    rec = id_to_rec[rid]
                    rec.is_duplicate = True
                    rec.duplicate_of = canonical
                    rec.dedupe_reason = "客户+产品+金额+城市完全一致，判定为重复录入"
                    if rid not in dedup_groups[canonical]:
                        dedup_groups[canonical].append(rid)
                    used_rids.add(rid)
            used_rids.add(canonical)

    for key, rids in link_groups.items():
        canonical = sorted(rids)[0]
        dupe = sorted(rids)[1]
        rec = id_to_rec[dupe]
        if not rec.is_duplicate:
            rec.is_duplicate = True
            rec.duplicate_of = canonical
            rec.dedupe_reason = "新版表中显式关联了旧流水号，判定为跨表重复"
        if canonical not in dedup_groups:
            dedup_groups[canonical] = []
        if dupe not in dedup_groups[canonical]:
            dedup_groups[canonical].append(dupe)

    return dedup_groups


def gray_analysis(records: List[UnifiedRecord]) -> Dict[str, object]:
    by_group: Dict[str, List[UnifiedRecord]] = defaultdict(list)
    for rec in records:
        if rec.gray_group:
            by_group[rec.gray_group].append(rec)

    result: Dict[str, object] = {}
    for group, recs in by_group.items():
        total = len(recs)
        consistent = sum(1 for r in recs if r.is_consistent == "是")
        inconsistent = total - consistent
        auto_pass = sum(1 for r in recs if r.auto_decision == "自动通过")
        auto_reject = sum(1 for r in recs if r.auto_decision == "自动拒绝")
        auto_human = sum(1 for r in recs if r.auto_decision == "转人工")
        human_pass = sum(1 for r in recs if r.human_decision == "通过")
        human_reject = sum(1 for r in recs if r.human_decision == "驳回")
        human_pending = sum(1 for r in recs if r.human_decision == "待补充")
        result[group] = {
            "总数": total,
            "一致数": consistent,
            "不一致数": inconsistent,
            "一致率(%)": round(consistent / total * 100, 2) if total else 0,
            "系统自动通过": auto_pass,
            "系统自动拒绝": auto_reject,
            "系统转人工": auto_human,
            "人工通过": human_pass,
            "人工驳回": human_reject,
            "人工待补充": human_pending,
            "不一致明细": [
                {
                    "记录ID": r.record_id,
                    "系统判定": r.auto_decision,
                    "人工判定": r.human_decision,
                    "来源表": r.source_table,
                    "客户": r.customer_name,
                    "金额": r.amount,
                    "标注标签": r.label,
                    "处理意见": r.opinion,
                }
                for r in recs if r.is_consistent == "否"
            ],
        }
    return result


def compute_overall_stats(
    records: List[UnifiedRecord],
    dedup_groups: Dict[str, List[str]],
    gray_result: Dict[str, object],
    excep_df,
) -> Dict[str, object]:
    total = len(records)
    old_count = sum(1 for r in records if r.source_table == "旧版人审表")
    new_count = sum(1 for r in records if r.source_table == "新版人审表")
    dup_count = sum(1 for r in records if r.is_duplicate)
    unique_count = total - dup_count
    unit_missing = sum(1 for r in records if "金额单位未填" in r.issues)
    remark_bulu = sum(1 for r in records if "存在补录备注" in r.issues)
    labeled = sum(1 for r in records if r.label)
    has_opinion = sum(1 for r in records if r.opinion)
    gray_covered = sum(1 for r in records if r.gray_group)
    label_dist: Dict[str, int] = defaultdict(int)
    for rec in records:
        if rec.label:
            label_dist[rec.label] += 1
    status_dist: Dict[str, int] = defaultdict(int)
    for rec in records:
        if rec.status:
            status_dist[rec.status] += 1

    return {
        "总记录数": total,
        "旧版表记录数": old_count,
        "新版表记录数": new_count,
        "重复记录数": dup_count,
        "去重后有效记录数": unique_count,
        "重复组数": len(dedup_groups),
        "金额单位缺失数": unit_missing,
        "含补录备注记录数": remark_bulu,
        "已标注记录数": labeled,
        "有处理意见记录数": has_opinion,
        "灰度对比覆盖数": gray_covered,
        "标注标签分布": dict(label_dist),
        "处理状态分布": dict(status_dist),
        "灰度对比分析": gray_result,
        "异常案例数": len(excep_df) if excep_df is not None else 0,
    }


def run_batch_process(sample_dir: str, batch_id: str = "") -> BatchProcessResult:
    if not batch_id:
        batch_id = "BATCH-" + datetime.now().strftime("%Y%m%d-%H%M%S")

    old_df, new_df, label_df, gray_df, excep_df = load_all_data(sample_dir)

    records = build_unified_records(old_df, new_df, label_df, gray_df)

    dedup_groups = detect_duplicates(records)

    gray_result = gray_analysis(records)

    stats = compute_overall_stats(records, dedup_groups, gray_result, excep_df)

    return BatchProcessResult(
        batch_id=batch_id,
        run_time=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        unified_records=records,
        raw_old_df=old_df,
        raw_new_df=new_df,
        raw_label_df=label_df,
        raw_gray_df=gray_df,
        raw_excep_df=excep_df,
        dedup_groups=dedup_groups,
        stats=stats,
    )


def trace_record(
    batch: BatchProcessResult, record_id: str
) -> Dict[str, object]:
    rid = str(record_id).strip()
    rec_map = {r.record_id: r for r in batch.unified_records}

    resolved_rid = rid
    via_exception = None

    if rid.upper().startswith("EXCEP") and rid not in rec_map:
        excep_match = batch.raw_excep_df[
            batch.raw_excep_df["excep_id"].astype(str).str.strip() == rid
        ]
        if len(excep_match) > 0:
            er = excep_match.iloc[0]
            linked_rid = str(er.get("record_id", "")).strip()
            if linked_rid and linked_rid in rec_map:
                via_exception = {
                    "异常ID": rid,
                    "异常类型": str(er.get("excep_type", "")),
                    "问题描述": str(er.get("description", "")),
                    "关联记录ID": linked_rid,
                }
                resolved_rid = linked_rid

    if resolved_rid not in rec_map:
        if via_exception:
            return {
                "找到": False,
                "原因": (
                    f"已识别到异常ID {rid}，关联到记录ID {resolved_rid}，"
                    f"但 {resolved_rid} 不在当前批处理中"
                ),
            }
        return {"找到": False, "原因": f"记录ID {rid} 不在当前批处理中"}

    rec = rec_map[resolved_rid]
    chain: Dict[str, object] = {"找到": True, "记录ID": resolved_rid}
    if via_exception:
        chain["查询入口"] = f"异常ID {rid} → 自动关联到记录ID {resolved_rid}"
        chain["异常基本信息"] = via_exception

    chain["基本信息"] = {
        "来源表": rec.source_table,
        "客户": rec.customer_name,
        "城市": rec.city,
        "产品": rec.product,
        "金额": rec.amount,
        "单位": rec.unit if rec.unit else "(未填)",
        "日期": rec.date,
        "审核人": rec.auditor,
        "复核结论": rec.review_result,
        "备注": rec.remark,
    }
    chain["检测到的问题"] = rec.issues if rec.issues else ["无"]
    chain["去重信息"] = {
        "是否被判定为重复": "是" if rec.is_duplicate else "否",
        "与哪条重复": rec.duplicate_of,
        "去重原因": rec.dedupe_reason,
    }
    chain["标注与处理链路"] = {
        "标注标签": rec.label or "(未标注)",
        "标注时间": rec.label_time or "-",
        "标注人": rec.labeler or "-",
        "处理意见": rec.opinion or "-",
        "跟进负责人": rec.owner or "-",
        "当前状态": rec.status or "-",
    }
    chain["灰度判定链路"] = {
        "所属灰度组": rec.gray_group or "(未参与灰度)",
        "模型/规则版本": rec.model_version or "-",
        "系统自动判定": rec.auto_decision or "-",
        "人工复核结果": rec.human_decision or "-",
        "是否一致": rec.is_consistent or "-",
    }
    if rec.link_old_id:
        chain["跨表关联"] = {
            "关联旧流水号": rec.link_old_id,
            "关联记录是否存在": rec.link_old_id in rec_map,
        }
    if rec.duplicate_of and rec.duplicate_of in rec_map:
        master = rec_map[rec.duplicate_of]
        chain["被保留的主记录详情"] = {
            "记录ID": master.record_id,
            "来源表": master.source_table,
            "客户": master.customer_name,
            "金额": master.amount,
            "标注标签": master.label,
            "处理意见": master.opinion,
            "状态": master.status,
        }

    excep_rows = batch.raw_excep_df[
        batch.raw_excep_df["record_id"].astype(str).str.strip() == resolved_rid
    ]
    if len(excep_rows) > 0:
        er = excep_rows.iloc[0]
        chain["关联异常案例"] = {
            "异常ID": str(er.get("excep_id", "")),
            "异常类型": str(er.get("excep_type", "")),
            "发现时间": str(er.get("found_time", "")),
            "问题描述": str(er.get("description", "")),
            "影响范围": str(er.get("impact", "")),
            "处理进展": str(er.get("progress", "")),
            "证据路径": str(er.get("evidence_path", "")),
        }
    return chain

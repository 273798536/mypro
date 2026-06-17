#!/usr/bin/env python3
"""偏好数据冲突合并工具

用法:
  python pref_merge.py detect   --input data.jsonl [--max-len 2048] [--output conflicts.jsonl]
  python pref_merge.py merge    --input data.jsonl --conflicts conflicts.jsonl [--strategy majority] [--output merged.jsonl]
  python pref_merge.py replay   --input data.jsonl --log model_log.jsonl --conflicts conflicts.jsonl [--output replay_result.jsonl]
  python pref_merge.py report   --conflicts conflicts.jsonl [--replay replay_result.jsonl] [--output report.md]

子命令:
  detect   检测冲突（同prompt不同标注 + 长文本截断）
  merge    合并冲突数据
  replay   评测回放：模型日志补录后重新计算灰度对比
  report   导出可读报告，只看报告也能理解拦截原因
"""

import argparse
import copy
import hashlib
import json
import os
import sys
import time
from collections import Counter, defaultdict
from typing import Any


def load_jsonl(path: str) -> list[dict]:
    records = []
    with open(path, "r", encoding="utf-8") as f:
        for lineno, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError as e:
                print(f"[WARN] {path}:{lineno} JSON解析失败: {e}", file=sys.stderr)
    return records


def save_jsonl(path: str, records: list[dict]) -> None:
    with open(path, "w", encoding="utf-8") as f:
        for r in records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")


def prompt_hash(record: dict) -> str:
    p = record.get("prompt", "")
    return hashlib.md5(p.encode("utf-8")).hexdigest()


def record_hash(record: dict) -> str:
    core = json.dumps(
        {"prompt": record.get("prompt", ""), "chosen": record.get("chosen", ""), "rejected": record.get("rejected", "")},
        ensure_ascii=False,
        sort_keys=True,
    )
    return hashlib.sha256(core.encode("utf-8")).hexdigest()[:16]


def detect_annotation_conflicts(records: list[dict]) -> list[dict]:
    groups = defaultdict(list)
    for idx, r in enumerate(records):
        groups[prompt_hash(r)].append((idx, r))

    conflicts = []
    for ph, group in groups.items():
        if len(group) < 2:
            continue

        signatures = set()
        for _, r in group:
            chosen_sig = hashlib.md5(r.get("chosen", "").encode("utf-8")).hexdigest()
            rejected_sig = hashlib.md5(r.get("rejected", "").encode("utf-8")).hexdigest()
            signatures.add((chosen_sig, rejected_sig))

        if len(signatures) > 1:
            conflict = {
                "conflict_type": "annotation_conflict",
                "prompt_hash": ph,
                "prompt_preview": group[0][1].get("prompt", "")[:200],
                "total_records": len(group),
                "distinct_annotation_count": len(signatures),
                "records": [],
            }
            for idx, r in group:
                entry = {
                    "source_index": idx,
                    "record_hash": record_hash(r),
                    "chosen_preview": r.get("chosen", "")[:100],
                    "rejected_preview": r.get("rejected", "")[:100],
                    "human_remark": r.get("human_remark", ""),
                }
                conflict["records"].append(entry)
            conflicts.append(conflict)

    return conflicts


def detect_truncation_conflicts(records: list[dict], max_len: int) -> list[dict]:
    conflicts = []

    for idx, r in enumerate(records):
        chosen = r.get("chosen", "")
        rejected = r.get("rejected", "")
        prompt = r.get("prompt", "")

        truncated_fields = []
        for field_name, field_val in [("chosen", chosen), ("rejected", rejected)]:
            if len(field_val) > max_len:
                truncated_fields.append(field_name)

        if not truncated_fields:
            continue

        original_chosen = chosen
        original_rejected = rejected

        trunc_chosen = chosen[:max_len]
        trunc_rejected = rejected[:max_len]

        annotation_reversed = False
        if trunc_chosen == trunc_rejected and original_chosen != original_rejected:
            annotation_reversed = True

        critical_info_lost = False
        for field_name in truncated_fields:
            field_val = r.get(field_name, "")
            remaining = field_val[max_len:]
            if any(kw in remaining for kw in ["不对", "错误", "应该", "注意", "重要"]):
                critical_info_lost = True
                break

        if annotation_reversed or critical_info_lost:
            conflict = {
                "conflict_type": "truncation_conflict",
                "source_index": idx,
                "record_hash": record_hash(r),
                "prompt_preview": prompt[:200],
                "truncated_fields": truncated_fields,
                "max_len": max_len,
                "annotation_reversed": annotation_reversed,
                "critical_info_lost": critical_info_lost,
                "chosen_original_len": len(original_chosen),
                "rejected_original_len": len(original_rejected),
                "human_remark": r.get("human_remark", ""),
                "block_reason": "",
            }

            reasons = []
            if annotation_reversed:
                reasons.append(
                    f"截断后 chosen 与 rejected 变为相同文本（前{max_len}字符），"
                    f"偏好标注失效：模型无法区分哪条是更好的回答"
                )
            if critical_info_lost:
                reasons.append(
                    f"被截断的部分包含关键信息标记（如'不对''错误''应该'等），"
                    f"截断后丢失了指示回答质量的关键信号"
                )
            conflict["block_reason"] = "；".join(reasons)

            conflicts.append(conflict)

    return conflicts


def cmd_detect(args: argparse.Namespace) -> None:
    records = load_jsonl(args.input)
    print(f"[INFO] 加载 {len(records)} 条记录 from {args.input}")

    all_conflicts = []

    annotation_conflicts = detect_annotation_conflicts(records)
    print(f"[INFO] 检测到 {len(annotation_conflicts)} 组标注冲突（同prompt不同标注）")
    all_conflicts.extend(annotation_conflicts)

    truncation_conflicts = detect_truncation_conflicts(records, args.max_len)
    print(f"[INFO] 检测到 {len(truncation_conflicts)} 条截断冲突（长文本截断导致标注失效）")
    all_conflicts.extend(truncation_conflicts)

    output_path = args.output or "conflicts.jsonl"
    save_jsonl(output_path, all_conflicts)
    print(f"[INFO] 冲突记录已保存至 {output_path}（共 {len(all_conflicts)} 条）")


def cmd_merge(args: argparse.Namespace) -> None:
    records = load_jsonl(args.input)
    conflicts = load_jsonl(args.conflicts)
    print(f"[INFO] 加载 {len(records)} 条原始记录, {len(conflicts)} 条冲突记录")

    strategy = args.strategy

    annotation_conflict_groups = defaultdict(list)
    truncation_indices = set()
    for c in conflicts:
        if c["conflict_type"] == "annotation_conflict":
            annotation_conflict_groups[c["prompt_hash"]].append(c)
        elif c["conflict_type"] == "truncation_conflict":
            truncation_indices.add(c["source_index"])

    skip_indices = set(truncation_indices)
    merge_log = []
    idx_to_rh = {i: record_hash(r) for i, r in enumerate(records)}

    if strategy == "majority":
        for ph, conflict_list in annotation_conflict_groups.items():
            all_records_for_prompt = []
            for c in conflict_list:
                for entry in c["records"]:
                    all_records_for_prompt.append(entry)

            if not all_records_for_prompt:
                continue

            annotation_counter = Counter()
            idx_annotation_map = {}
            for entry in all_records_for_prompt:
                sig = hashlib.md5(
                    (entry["chosen_preview"] + "||" + entry["rejected_preview"]).encode("utf-8")
                ).hexdigest()
                annotation_counter[sig] += 1
                idx_annotation_map[entry["source_index"]] = sig

            majority_sig, majority_count = annotation_counter.most_common(1)[0]

            for entry in all_records_for_prompt:
                sig = idx_annotation_map[entry["source_index"]]
                if sig != majority_sig:
                    skip_indices.add(entry["source_index"])
                    merge_log.append({
                        "action": "skip_minority_annotation",
                        "source_index": entry["source_index"],
                        "record_hash": idx_to_rh.get(entry["source_index"], ""),
                        "reason": f"少数标注（{annotation_counter[sig]}票 vs 多数{majority_count}票），保留原人工备注",
                        "human_remark": entry.get("human_remark", ""),
                    })

            print(f"[INFO] prompt_hash={ph[:8]}... 多数标注={majority_count}票，跳过少数派")

    elif strategy == "keep_all":
        print("[INFO] keep_all策略：保留所有标注冲突记录，仅标记")
    elif strategy == "drop_all":
        for ph, conflict_list in annotation_conflict_groups.items():
            for c in conflict_list:
                for entry in c["records"]:
                    skip_indices.add(entry["source_index"])
        print(f"[INFO] drop_all策略：跳过所有标注冲突记录（{len(skip_indices)}条）")

    merged = []
    unusable = []
    for idx, r in enumerate(records):
        rh = record_hash(r)
        if idx in skip_indices:
            r_copy = copy.deepcopy(r)
            r_copy["record_hash"] = rh
            r_copy["_merge_status"] = "skipped"
            r_copy["_skip_reason"] = "truncation_conflict" if idx in truncation_indices else "annotation_conflict_minority"
            if r.get("human_remark"):
                r_copy["_human_remark_original"] = r["human_remark"]
            unusable.append(r_copy)
        else:
            r_copy = copy.deepcopy(r)
            r_copy["record_hash"] = rh
            r_copy["_merge_status"] = "kept"
            merged.append(r_copy)

    output_path = args.output or "merged.jsonl"
    save_jsonl(output_path, merged)

    unusable_path = output_path.replace(".jsonl", "_unusable.jsonl")
    save_jsonl(unusable_path, unusable)

    print(f"[INFO] 合并完成：保留 {len(merged)} 条，不可用 {len(unusable)} 条")
    print(f"[INFO] 合并结果 -> {output_path}")
    print(f"[INFO] 不可用记录 -> {unusable_path}")

    if merge_log:
        log_path = output_path.replace(".jsonl", "_merge_log.jsonl")
        save_jsonl(log_path, merge_log)
        print(f"[INFO] 合并日志 -> {log_path}")


def cmd_replay(args: argparse.Namespace) -> None:
    records = load_jsonl(args.input)
    conflicts = load_jsonl(args.conflicts)
    model_log = load_jsonl(args.log)
    print(f"[INFO] 加载 {len(records)} 条原始记录, {len(conflicts)} 条冲突, {len(model_log)} 条模型日志")

    idx_to_rh = {i: record_hash(r) for i, r in enumerate(records)}

    log_by_rh = {}
    log_by_idx = {}
    invalid_log_entries = []
    for lineno, ml in enumerate(model_log, 1):
        rh = ml.get("record_hash")
        si = ml.get("source_index")

        if rh is None and si is None:
            invalid_log_entries.append((lineno, "缺少 record_hash 和 source_index，无法建立关联"))
            continue

        rh_is_valid = isinstance(rh, str) and len(rh) >= 8 and any(c.isalpha() for c in rh)
        if rh is not None and not rh_is_valid:
            invalid_log_entries.append(
                (lineno, f"record_hash={rh!r} 看起来不是合法哈希（应为16位十六进制字符串），若用数字索引请改为 source_index 字段")
            )

        if rh_is_valid:
            log_by_rh[str(rh)] = ml
        if si is not None:
            log_by_idx[int(si)] = ml

    if invalid_log_entries:
        print(f"[WARN] 模型日志中有 {len(invalid_log_entries)} 条格式异常：")
        for lineno, msg in invalid_log_entries:
            print(f"       - 行{lineno}: {msg}")

    def lookup_log(entry_rh, entry_si):
        matched_by = None
        ml = None
        if entry_rh and entry_rh in log_by_rh:
            ml = log_by_rh[entry_rh]
            matched_by = "record_hash"
        elif entry_si is not None and entry_si in log_by_idx:
            ml = log_by_idx[entry_si]
            matched_by = "source_index(fallback)"
            if ml.get("record_hash") and entry_rh and str(ml.get("record_hash")) != entry_rh:
                print(
                    f"[WARN] 通过 source_index={entry_si} 匹配到日志，但日志 record_hash={ml.get('record_hash')} "
                    f"与冲突记录 record_hash={entry_rh} 不一致，数据可能已错位"
                )
        return ml, matched_by

    matched_by_hash = 0
    matched_by_idx = 0
    unmatched = 0

    updated_conflicts = []
    for c in conflicts:
        c_copy = copy.deepcopy(c)

        if c["conflict_type"] == "annotation_conflict":
            for entry in c_copy.get("records", []):
                entry_rh = entry.get("record_hash")
                entry_si = entry.get("source_index")
                ml, matched_by = lookup_log(entry_rh, entry_si)
                if ml:
                    entry["model_score_chosen"] = ml.get("score_chosen")
                    entry["model_score_rejected"] = ml.get("score_rejected")
                    entry["model_verdict"] = ml.get("verdict", "")
                    entry["log_supplemented"] = True
                    entry["log_matched_by"] = matched_by
                    if ml.get("human_remark"):
                        entry["human_remark"] = ml["human_remark"]
                    if matched_by == "record_hash":
                        matched_by_hash += 1
                    else:
                        matched_by_idx += 1
                else:
                    unmatched += 1

        elif c["conflict_type"] == "truncation_conflict":
            entry_rh = c_copy.get("record_hash")
            entry_si = c_copy.get("source_index")
            ml, matched_by = lookup_log(entry_rh, entry_si)
            if ml:
                c_copy["model_score_chosen"] = ml.get("score_chosen")
                c_copy["model_score_rejected"] = ml.get("score_rejected")
                c_copy["model_verdict"] = ml.get("verdict", "")
                c_copy["log_supplemented"] = True
                c_copy["log_matched_by"] = matched_by
                if ml.get("human_remark"):
                    c_copy["human_remark"] = ml["human_remark"]
                if matched_by == "record_hash":
                    matched_by_hash += 1
                else:
                    matched_by_idx += 1
            else:
                unmatched += 1

        updated_conflicts.append(c_copy)

    for c in updated_conflicts:
        if c["conflict_type"] == "annotation_conflict":
            supplemented = [e for e in c.get("records", []) if e.get("log_supplemented")]
            not_supplemented = [e for e in c.get("records", []) if not e.get("log_supplemented")]
            if supplemented:
                verdicts = [e.get("model_verdict", "") for e in supplemented if e.get("model_verdict")]
                if verdicts:
                    verdict_counter = Counter(verdicts)
                    top_verdict, top_count = verdict_counter.most_common(1)[0]
                    c["gray_comparison"] = {
                        "supplemented_count": len(supplemented),
                        "not_supplemented_count": len(not_supplemented),
                        "dominant_verdict": top_verdict,
                        "dominant_verdict_ratio": round(top_count / len(verdicts), 2),
                        "updated_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
                    }
        elif c["conflict_type"] == "truncation_conflict":
            if c.get("log_supplemented"):
                c["gray_comparison"] = {
                    "model_verdict_after_supplement": c.get("model_verdict", ""),
                    "still_blocked": c.get("annotation_reversed", False) or c.get("critical_info_lost", False),
                    "updated_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
                }

    print(f"[INFO] 日志匹配统计：record_hash命中 {matched_by_hash} 条，source_index兜底命中 {matched_by_idx} 条，未匹配 {unmatched} 条")
    if unmatched > 0:
        print(f"[WARN] 有 {unmatched} 条冲突记录未匹配到任何模型日志，请检查日志文件是否完整")
    if matched_by_idx > 0 and matched_by_hash == 0:
        print(f"[WARN] 全部命中都通过 source_index 兜底，强烈建议在模型日志中写入真实 record_hash 以避免数据错位")

    output_path = args.output or "replay_result.jsonl"
    save_jsonl(output_path, updated_conflicts)
    print(f"[INFO] 评测回放完成，结果已保存至 {output_path}")


def cmd_report(args: argparse.Namespace) -> None:
    conflicts = load_jsonl(args.conflicts)
    replay_data = []
    if args.replay and os.path.exists(args.replay):
        replay_data = load_jsonl(args.replay)

    replay_by_type = defaultdict(list)
    for r in replay_data:
        key = r.get("conflict_type", "unknown")
        if key == "annotation_conflict":
            replay_by_type[("annotation", r.get("prompt_hash", ""))].append(r)
        elif key == "truncation_conflict":
            replay_by_type[("truncation", str(r.get("source_index", "")))].append(r)

    lines = []
    lines.append("# 偏好数据冲突合并报告")
    lines.append(f"")
    lines.append(f"生成时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"")

    annotation_conflicts = [c for c in conflicts if c["conflict_type"] == "annotation_conflict"]
    truncation_conflicts = [c for c in conflicts if c["conflict_type"] == "truncation_conflict"]

    lines.append(f"## 概览")
    lines.append(f"")
    lines.append(f"| 指标 | 数值 |")
    lines.append(f"|------|------|")
    lines.append(f"| 总冲突数 | {len(conflicts)} |")
    lines.append(f"| 标注冲突组 | {len(annotation_conflicts)} |")
    lines.append(f"| 截断冲突条 | {len(truncation_conflicts)} |")

    unusable_annotation = sum(c.get("total_records", 0) for c in annotation_conflicts)
    lines.append(f"| 标注冲突涉及记录数 | {unusable_annotation} |")
    lines.append(f"")

    lines.append(f"## 一、标注冲突详情（同 prompt 不同标注）")
    lines.append(f"")
    lines.append(f"**为什么被拦下来**: 同一个 prompt 在不同批次/不同标注员下产生了不一致的偏好标注。")
    lines.append(f"如果直接用于训练，模型会收到矛盾的信号，导致学到的偏好不可靠。")
    lines.append(f"")

    if annotation_conflicts:
        for i, c in enumerate(annotation_conflicts, 1):
            lines.append(f"### 冲突组 {i}")
            lines.append(f"")
            lines.append(f"- **Prompt 预览**: {c.get('prompt_preview', '(空)')}")
            lines.append(f"- **涉及记录数**: {c.get('total_records', 0)}")
            lines.append(f"- **不同标注数**: {c.get('distinct_annotation_count', 0)}")

            replay_key = ("annotation", c.get("prompt_hash", ""))
            if replay_key in replay_by_type:
                rp = replay_by_type[replay_key][0]
                gc = rp.get("gray_comparison", {})
                if gc:
                    lines.append(f"- **灰度对比（模型日志补录后）**:")
                    lines.append(f"  - 已补录: {gc.get('supplemented_count', 0)} 条")
                    lines.append(f"  - 未补录: {gc.get('not_supplemented_count', 0)} 条")
                    lines.append(f"  - 主导判定: {gc.get('dominant_verdict', 'N/A')} ({gc.get('dominant_verdict_ratio', 0)} 占比)")
                    lines.append(f"  - 更新时间: {gc.get('updated_at', 'N/A')}")

            lines.append(f"")
            lines.append(f"| # | chosen预览 | rejected预览 | 人工备注 |")
            lines.append(f"|---|-----------|-------------|---------|")
            for j, entry in enumerate(c.get("records", []), 1):
                human_remark = entry.get("human_remark", "")
                remark_display = f'「{human_remark}」' if human_remark else "（无）"
                lines.append(
                    f"| {j} | {entry.get('chosen_preview', '')[:50]} | {entry.get('rejected_preview', '')[:50]} | {remark_display} |"
                )
            lines.append(f"")
    else:
        lines.append(f"无标注冲突。")
        lines.append(f"")

    lines.append(f"## 二、截断冲突详情（长文本截断导致标注失效）")
    lines.append(f"")
    lines.append(f"**为什么被拦下来**: chosen 或 rejected 文本超过最大长度 {truncation_conflicts[0].get('max_len', 'N/A') if truncation_conflicts else 'N/A'} 字符后被截断。")
    lines.append(f"截断可能产生两种严重后果：")
    lines.append(f"1. **标注反转**: 截断后 chosen 和 rejected 变成相同文本，偏好标注彻底失效——模型看到的是两条一模一样的回答，却要学习其中一条更好，这是不可能的。")
    lines.append(f"2. **关键信息丢失**: 被截掉的部分包含指示回答质量的关键信号（如'不对''错误''应该'等），截断后模型看不到这些信号，偏好判断失去依据。")
    lines.append(f"")

    if truncation_conflicts:
        reversed_count = sum(1 for c in truncation_conflicts if c.get("annotation_reversed"))
        info_lost_count = sum(1 for c in truncation_conflicts if c.get("critical_info_lost"))
        lines.append(f"| 指标 | 数值 |")
        lines.append(f"|------|------|")
        lines.append(f"| 标注反转数 | {reversed_count} |")
        lines.append(f"| 关键信息丢失数 | {info_lost_count} |")
        lines.append(f"")

        for i, c in enumerate(truncation_conflicts, 1):
            lines.append(f"### 截断冲突 {i}（原始索引 {c.get('source_index', 'N/A')}）")
            lines.append(f"")
            lines.append(f"- **Prompt 预览**: {c.get('prompt_preview', '(空)')}")
            lines.append(f"- **被截断字段**: {', '.join(c.get('truncated_fields', []))}")
            lines.append(f"- **最大长度限制**: {c.get('max_len', 'N/A')} 字符")
            lines.append(f"- **chosen 原始长度**: {c.get('chosen_original_len', 'N/A')}")
            lines.append(f"- **rejected 原始长度**: {c.get('rejected_original_len', 'N/A')}")
            lines.append(f"- **标注反转**: {'是 ⚠️' if c.get('annotation_reversed') else '否'}")
            lines.append(f"- **关键信息丢失**: {'是 ⚠️' if c.get('critical_info_lost') else '否'}")
            lines.append(f"- **拦截原因**: {c.get('block_reason', 'N/A')}")

            replay_key = ("truncation", str(c.get("source_index", "")))
            if replay_key in replay_by_type:
                rp = replay_by_type[replay_key][0]
                gc = rp.get("gray_comparison", {})
                if gc:
                    lines.append(f"- **灰度对比（模型日志补录后）**:")
                    lines.append(f"  - 补录后模型判定: {gc.get('model_verdict_after_supplement', 'N/A')}")
                    lines.append(f"  - 是否仍然被拦: {'是' if gc.get('still_blocked') else '否（可释放）'}")
                    lines.append(f"  - 更新时间: {gc.get('updated_at', 'N/A')}")

            human_remark = c.get("human_remark", "")
            if human_remark:
                lines.append(f"- **人工备注（原话保留）**: 「{human_remark}」")

            lines.append(f"")
    else:
        lines.append(f"无截断冲突。")
        lines.append(f"")

    lines.append(f"## 三、不可用记录汇总")
    lines.append(f"")
    lines.append(f"以下是所有被标记为不可用的记录，训练组月底转交时重点关注：")
    lines.append(f"")

    unusable_items = []
    for c in annotation_conflicts:
        for entry in c.get("records", []):
            unusable_items.append({
                "type": "标注冲突",
                "source_index": entry.get("source_index"),
                "record_hash": entry.get("record_hash", ""),
                "prompt_preview": c.get("prompt_preview", "")[:80],
                "remark": entry.get("human_remark", ""),
            })
    for c in truncation_conflicts:
        unusable_items.append({
            "type": "截断冲突",
            "source_index": c.get("source_index"),
            "record_hash": c.get("record_hash", ""),
            "prompt_preview": c.get("prompt_preview", "")[:80],
            "remark": c.get("human_remark", ""),
        })

    if unusable_items:
        lines.append(f"| # | 类型 | 索引 | record_hash | Prompt预览 | 人工备注（原话） |")
        lines.append(f"|---|------|------|-------------|-----------|----------------|")
        for j, item in enumerate(unusable_items, 1):
            remark_display = f'「{item["remark"]}」' if item["remark"] else "（无）"
            lines.append(
                f"| {j} | {item['type']} | {item['source_index']} | {item['record_hash'][:12]} | {item['prompt_preview'][:40]} | {remark_display} |"
            )
    else:
        lines.append(f"所有记录均可用，无不可用记录。")

    lines.append(f"")

    report_text = "\n".join(lines)
    output_path = args.output or "report.md"
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(report_text)
    print(f"[INFO] 报告已导出至 {output_path}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="pref_merge",
        description="偏好数据冲突合并工具",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p_detect = sub.add_parser("detect", help="检测冲突（标注冲突 + 截断冲突）")
    p_detect.add_argument("--input", required=True, help="输入 JSONL 文件路径")
    p_detect.add_argument("--max-len", type=int, default=2048, help="最大文本长度，超过视为截断（默认 2048）")
    p_detect.add_argument("--output", default="conflicts.jsonl", help="冲突输出路径（默认 conflicts.jsonl）")

    p_merge = sub.add_parser("merge", help="合并冲突数据")
    p_merge.add_argument("--input", required=True, help="原始 JSONL 文件路径")
    p_merge.add_argument("--conflicts", required=True, help="冲突记录 JSONL 路径（detect 的输出）")
    p_merge.add_argument("--strategy", choices=["majority", "keep_all", "drop_all"], default="majority",
                         help="合并策略: majority=多数表决, keep_all=全部保留, drop_all=全部丢弃（默认 majority）")
    p_merge.add_argument("--output", default="merged.jsonl", help="合并输出路径（默认 merged.jsonl）")

    p_replay = sub.add_parser("replay", help="评测回放：模型日志补录后更新灰度对比")
    p_replay.add_argument("--input", required=True, help="原始 JSONL 文件路径")
    p_replay.add_argument("--log", required=True, help="模型日志 JSONL 路径")
    p_replay.add_argument("--conflicts", required=True, help="冲突记录 JSONL 路径")
    p_replay.add_argument("--output", default="replay_result.jsonl", help="回放结果输出路径")

    p_report = sub.add_parser("report", help="导出可读报告")
    p_report.add_argument("--conflicts", required=True, help="冲突记录 JSONL 路径")
    p_report.add_argument("--replay", default=None, help="评测回放结果 JSONL 路径（可选）")
    p_report.add_argument("--output", default="report.md", help="报告输出路径（默认 report.md）")

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    if args.command == "detect":
        cmd_detect(args)
    elif args.command == "merge":
        cmd_merge(args)
    elif args.command == "replay":
        cmd_replay(args)
    elif args.command == "report":
        cmd_report(args)


if __name__ == "__main__":
    main()

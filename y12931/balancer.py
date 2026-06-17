import pandas as pd
import numpy as np
from typing import List, Dict, Tuple, Any, Optional
from collections import Counter, defaultdict
import re
import difflib


LANG_NAMES = {
    "zh": "中文", "en": "英文", "ja": "日文",
    "ko": "韩文", "es": "西班牙文", "fr": "法文",
    "de": "德文", "ru": "俄文", "ar": "阿拉伯文",
    "pt": "葡萄牙文", "it": "意大利文", "th": "泰文",
}


def samples_to_df(samples: List[Dict]) -> pd.DataFrame:
    df = pd.DataFrame(samples)
    if "text_content" in df.columns:
        df["text_content"] = df["text_content"].astype(str).fillna("")
    for col in ["language", "label", "source"]:
        if col in df.columns:
            df[col] = df[col].astype(str).replace({"None": None, "nan": None})
    if "confidence" in df.columns:
        df["confidence"] = pd.to_numeric(df["confidence"], errors="coerce").fillna(1.0)
    return df


def _text_similarity(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    return difflib.SequenceMatcher(None, a, b).ratio()


def check_language_coverage(df: pd.DataFrame, config: Dict) -> Tuple[bool, List[Dict], List[str]]:
    issues = []
    explanations = []
    min_per = config.get("min_per_lang", 5)
    max_ratio = config.get("max_ratio", 0.4)
    required = config.get("required_langs", [])

    total = len(df)
    lang_counts = Counter(df["language"].dropna())

    for lang in required:
        count = lang_counts.get(lang, 0)
        if count < min_per:
            missing = min_per - count
            lang_name = LANG_NAMES.get(lang, lang)
            issues.append({
                "type": "LANG_INSUFFICIENT",
                "severity": "high",
                "field": "language",
                "value": lang,
                "count": count,
                "required": min_per,
                "shortage": missing,
                "description": f"{lang_name}样本不足：当前{count}条，要求至少{min_per}条，缺{missing}条"
            })
            explanations.append(
                f"【语言覆盖度不足】{lang_name}只有{count}条样本，没达到最少{min_per}条的要求，"
                f"模型学起来容易对{lang_name}内容理解不到位。"
            )

    if total > 0:
        for lang, count in lang_counts.items():
            ratio = count / total
            if ratio > max_ratio:
                lang_name = LANG_NAMES.get(lang, lang)
                issues.append({
                    "type": "LANG_DOMINANT",
                    "severity": "medium",
                    "field": "language",
                    "value": lang,
                    "count": count,
                    "ratio": ratio,
                    "limit_ratio": max_ratio,
                    "description": f"{lang_name}占比过高：{ratio:.1%}，限制{max_ratio:.0%}"
                })
                explanations.append(
                    f"【某语言太偏】{lang_name}占了全部样本的{ratio:.1%}，"
                    f"超过了建议上限{max_ratio:.0%}，会让模型更偏向{lang_name}，"
                    f"其他语言学不好。"
                )

    passed = len(issues) == 0
    return passed, issues, explanations


def check_label_distribution(df: pd.DataFrame, config: Dict) -> Tuple[bool, List[Dict], List[str]]:
    issues = []
    explanations = []
    tolerance = config.get("tolerance", 0.2)

    label_counts = Counter(df["label"].dropna())
    if len(label_counts) < 2:
        issues.append({
            "type": "LABEL_TOO_FEW",
            "severity": "high",
            "description": f"标签种类太少：仅{len(label_counts)}类，无法进行分类学习"
        })
        explanations.append("【标签类别不够】目前只有一种标签或根本没有标签，这样没法训练分类模型。")
        return False, issues, explanations

    counts = np.array(list(label_counts.values()))
    labels = list(label_counts.keys())
    total = counts.sum()
    ideal_ratio = 1.0 / len(labels)

    for label, count in zip(labels, counts):
        actual_ratio = count / total
        if abs(actual_ratio - ideal_ratio) > tolerance:
            direction = "偏多" if actual_ratio > ideal_ratio else "偏少"
            issues.append({
                "type": "LABEL_IMBALANCE",
                "severity": "medium" if abs(actual_ratio - ideal_ratio) < tolerance * 1.5 else "high",
                "field": "label",
                "value": label,
                "count": count,
                "actual_ratio": actual_ratio,
                "ideal_ratio": ideal_ratio,
                "description": f"标签'{label}'分布{direction}：实际{actual_ratio:.1%}，理想{ideal_ratio:.1%}"
            })
            explanations.append(
                f"【标签分布不均衡】「{label}」这类有{count}条，占{actual_ratio:.1%}，"
                f"如果几类标签平均分配的话应该是{ideal_ratio:.1%}左右，差距超过了"
                f"{tolerance:.0%}的容忍度。建议对少的类别补数据，或者对多的类别下采样。"
            )

    passed = len(issues) == 0
    return passed, issues, explanations


def check_quality_threshold(df: pd.DataFrame, config: Dict) -> Tuple[bool, List[Dict], List[str]]:
    issues = []
    explanations = []
    min_conf = config.get("min_confidence", 0.3)
    min_len = config.get("min_text_len", 2)
    max_len = config.get("max_text_len", 5000)

    bad_conf = df[df["confidence"] < min_conf]
    if len(bad_conf) > 0:
        for _, row in bad_conf.iterrows():
            issues.append({
                "type": "LOW_CONFIDENCE",
                "severity": "medium",
                "sample_id": row.get("id"),
                "field": "confidence",
                "value": row["confidence"],
                "threshold": min_conf,
                "text_preview": str(row["text_content"])[:30],
                "description": f"置信度过低：{row['confidence']:.2f} < {min_conf}"
            })
        explanations.append(
            f"【置信度不够】有{len(bad_conf)}条样本的标注置信度低于{min_conf}，"
            f"说明这些样本的标注质量不够确定，可能是标注时犹豫了。"
            f"这类样本建议人工二次确认。"
        )

    short_texts = df[df["text_content"].str.len() < min_len]
    if len(short_texts) > 0:
        for _, row in short_texts.iterrows():
            issues.append({
                "type": "TEXT_TOO_SHORT",
                "severity": "medium",
                "sample_id": row.get("id"),
                "field": "text_content",
                "length": len(str(row["text_content"])),
                "threshold": min_len,
                "description": f"文本过短：{len(str(row['text_content']))}字符 < {min_len}"
            })
        explanations.append(
            f"【文本太短】有{len(short_texts)}条样本的文本少于{min_len}个字，"
            f"信息量太少，模型很难学到有用的模式，可能是漏填或者复制粘贴出错。"
        )

    long_texts = df[df["text_content"].str.len() > max_len]
    if len(long_texts) > 0:
        issues.append({
            "type": "TEXT_TOO_LONG",
            "severity": "low",
            "count": len(long_texts),
            "threshold": max_len,
            "description": f"文本过长：{len(long_texts)}条 > {max_len}字符"
        })
        explanations.append(
            f"【文本太长】有{len(long_texts)}条样本超过了{max_len}字，"
            f"处理时可能会截断，建议拆分成多条或者精简内容。"
        )

    empty_label = df[df["label"].isna() | (df["label"] == "")]
    if len(empty_label) > 0:
        for _, row in empty_label.iterrows():
            issues.append({
                "type": "EMPTY_LABEL",
                "severity": "high",
                "sample_id": row.get("id"),
                "field": "label",
                "description": "标签为空或未填写"
            })
        explanations.append(
            f"【标签漏填】有{len(empty_label)}条样本没有填标签，这是必填项，"
            f"没有标签的样本没法用于训练，请补充标注。"
        )

    empty_lang = df[df["language"].isna() | (df["language"] == "")]
    if len(empty_lang) > 0:
        issues.append({
            "type": "EMPTY_LANGUAGE",
            "severity": "medium",
            "count": len(empty_lang),
            "field": "language",
            "description": f"语言字段为空：{len(empty_lang)}条"
        })
        explanations.append(
            f"【语言没标】有{len(empty_lang)}条样本没填是哪种语言，"
            f"虽然有时能自动识别，但不保证准确，最好人工补上。"
        )

    passed = len(issues) == 0
    return passed, issues, explanations


def check_duplicates(df: pd.DataFrame, config: Dict) -> Tuple[bool, List[Dict], List[str]]:
    issues = []
    explanations = []
    threshold = config.get("similarity_threshold", 0.95)

    texts = df["text_content"].tolist()
    ids = df["id"].tolist() if "id" in df.columns else list(range(len(df)))
    seen_groups = set()

    for i in range(len(texts)):
        for j in range(i + 1, len(texts)):
            group_key = tuple(sorted([ids[i], ids[j]]))
            if group_key in seen_groups:
                continue
            sim = _text_similarity(texts[i], texts[j])
            if sim >= threshold:
                seen_groups.add(group_key)
                dup_type = "完全重复" if sim == 1.0 else f"高度相似({sim:.1%})"
                issues.append({
                    "type": "DUPLICATE_TEXT",
                    "severity": "medium" if sim < 1.0 else "high",
                    "sample_ids": [ids[i], ids[j]],
                    "similarity": sim,
                    "text_a_preview": str(texts[i])[:40],
                    "text_b_preview": str(texts[j])[:40],
                    "description": f"第{i+1}条与第{j+1}条{dup_type}"
                })

    if issues:
        exact_count = sum(1 for x in issues if x["similarity"] == 1.0)
        near_count = len(issues) - exact_count
        parts = []
        if exact_count:
            parts.append(f"{exact_count}对完全重复")
        if near_count:
            parts.append(f"{near_count}对内容几乎一样")
        explanations.append(
            f"【存在重复】样本中发现{'、'.join(parts)}，"
            f"重复数据会让模型高估那类内容的重要性，训练出来的效果有水分。"
            f"建议保留质量最好的一条，其余删除。"
        )

    passed = len(issues) == 0
    return passed, issues, explanations


def check_source_diversity(df: pd.DataFrame, config: Dict) -> Tuple[bool, List[Dict], List[str]]:
    issues = []
    explanations = []
    max_ratio = config.get("max_source_ratio", 0.5)

    src_counts = Counter(df["source"].dropna())
    total = sum(src_counts.values())

    if total == 0:
        issues.append({
            "type": "NO_SOURCE_INFO",
            "severity": "low",
            "description": "所有样本均未填写来源信息"
        })
        explanations.append("【没有来源记录】所有样本都没填是从哪里来的，日后想回溯找原始材料就麻烦了。")
        return False, issues, explanations

    for src, count in src_counts.items():
        ratio = count / total
        if ratio > max_ratio:
            issues.append({
                "type": "SOURCE_DOMINANT",
                "severity": "medium",
                "field": "source",
                "value": src,
                "count": count,
                "ratio": ratio,
                "limit": max_ratio,
                "description": f"来源'{src}'占比过高：{ratio:.1%}，限制{max_ratio:.0%}"
            })
            explanations.append(
                f"【来源太单一】「{src}」这个渠道提供了{ratio:.1%}的样本，"
                f"超过了建议上限{max_ratio:.0%}。数据太集中在一个来源，"
                f"换个场景模型可能就不好用了。"
            )

    passed = len(issues) == 0
    return passed, issues, explanations


def check_label_conflict(df: pd.DataFrame, config: Dict) -> Tuple[bool, List[Dict], List[str]]:
    issues = []
    explanations = []
    threshold = config.get("similarity_threshold", 0.85)

    texts = df["text_content"].tolist()
    labels = df["label"].tolist()
    ids = df["id"].tolist() if "id" in df.columns else list(range(len(df)))

    conflict_groups = defaultdict(list)

    for i in range(len(texts)):
        for j in range(i + 1, len(texts)):
            if not labels[i] or not labels[j]:
                continue
            if labels[i] == labels[j]:
                continue
            sim = _text_similarity(texts[i], texts[j])
            if sim >= threshold:
                group_key = f"conflict_{min(ids[i], ids[j])}_{max(ids[i], ids[j])}"
                conflict_groups[group_key] = {
                    "ids": [ids[i], ids[j]],
                    "labels": [labels[i], labels[j]],
                    "similarity": sim,
                    "texts_preview": [str(texts[i])[:50], str(texts[j])[:50]],
                    "description": (
                        f"相似度{sim:.1%}的文本却标了不同标签："
                        f"'{labels[i]}' vs '{labels[j]}'"
                    )
                }

    for key, info in conflict_groups.items():
        issues.append({
            "type": "LABEL_CONFLICT",
            "severity": "high",
            **info
        })

    if issues:
        explanations.append(
            f"【标签冲突】有{len(issues)}对内容很像（相似度≥{threshold:.0%}）的文本，"
            f"却被标成了不同的类别。这说明标注标准可能没统一，"
            f"或者有些样本标错了。这种冲突数据必须人工逐个核对，"
            f"统一标准后再用。"
        )

    passed = len(issues) == 0
    return passed, issues, explanations


RULE_CHECKERS = {
    "LANG_COVERAGE": check_language_coverage,
    "LABEL_DISTRIBUTION": check_label_distribution,
    "QUALITY_THRESHOLD": check_quality_threshold,
    "DUPLICATE_CHECK": check_duplicates,
    "SOURCE_DIVERSITY": check_source_diversity,
    "CONFLICT_LABEL": check_label_conflict,
}


def apply_rules(df: pd.DataFrame, rules: List[Dict]) -> Dict:
    all_issues = []
    all_explanations = []
    rule_results = {}

    for rule in rules:
        code = rule["rule_code"]
        checker = RULE_CHECKERS.get(code)
        if not checker:
            continue
        config = rule.get("config", {})
        passed, issues, explanations = checker(df, config)
        rule_results[code] = {
            "rule_name": rule["rule_name"],
            "rule_type": rule["rule_type"],
            "description": rule["description"],
            "passed": passed,
            "issue_count": len(issues),
            "issues": issues,
            "explanations": explanations
        }
        all_issues.extend(issues)
        all_explanations.extend(explanations)

    total_severity = {
        "high": sum(1 for x in all_issues if x.get("severity") == "high"),
        "medium": sum(1 for x in all_issues if x.get("severity") == "medium"),
        "low": sum(1 for x in all_issues if x.get("severity") == "low"),
    }

    return {
        "summary": {
            "total_samples": len(df),
            "total_rules": len(rule_results),
            "passed_rules": sum(1 for r in rule_results.values() if r["passed"]),
            "failed_rules": sum(1 for r in rule_results.values() if not r["passed"]),
            "total_issues": len(all_issues),
            "severity_breakdown": total_severity,
            "overall_pass": len(all_issues) == 0 or total_severity["high"] == 0
        },
        "rule_results": rule_results,
        "all_issues": all_issues,
        "human_readable_notes": all_explanations,
    }


def _stratified_sample(df: pd.DataFrame, group_cols: List[str],
                       target_count: int) -> pd.DataFrame:
    if len(df) == 0:
        return df
    if target_count >= len(df):
        return df.copy()

    groups = df.groupby(group_cols, dropna=False)
    group_sizes = groups.size()
    total = group_sizes.sum()

    ideal_per_group = target_count / len(group_sizes) if len(group_sizes) > 0 else target_count

    selected = []
    for key, group in groups:
        n_ideal = max(1, int(round(len(group) / total * target_count)))
        n = min(len(group), n_ideal)
        if n > 0:
            selected.append(group.sample(n=n, random_state=42))

    result = pd.concat(selected) if selected else df.sample(n=target_count, random_state=42)

    if len(result) > target_count:
        result = result.sample(n=target_count, random_state=42)
    elif len(result) < target_count and len(result) < len(df):
        remaining = df.loc[~df.index.isin(result.index)]
        need = min(target_count - len(result), len(remaining))
        if need > 0:
            extra = remaining.sample(n=need, random_state=42)
            result = pd.concat([result, extra])

    return result.reset_index(drop=True)


def balance_samples(df: pd.DataFrame,
                    rules: List[Dict],
                    strategy: str = "stratified",
                    target_total: Optional[int] = None,
                    oversample_rare: bool = False) -> Dict:
    original_df = df.copy()
    rule_check_result = apply_rules(original_df, rules)

    issue_ids = set()
    drop_sample_ids = set()
    for issue in rule_check_result["all_issues"]:
        sid = issue.get("sample_id")
        if sid is not None:
            issue_ids.add(sid)
        sids = issue.get("sample_ids")
        if sids:
            for s in sids:
                issue_ids.add(s)
        severity = issue.get("severity")
        issue_type = issue.get("type")
        if severity == "high" and issue_type in (
            "TEXT_TOO_SHORT", "EMPTY_LABEL", "DUPLICATE_TEXT", "LABEL_CONFLICT", "LOW_CONFIDENCE"
        ):
            if issue.get("sample_id") is not None:
                drop_sample_ids.add(issue["sample_id"])
            if issue.get("sample_ids") and issue_type == "DUPLICATE_TEXT":
                sids = issue["sample_ids"]
                if len(sids) >= 2:
                    drop_sample_ids.add(sids[1])
            if issue.get("sample_ids") and issue_type == "LABEL_CONFLICT":
                for s in issue["sample_ids"]:
                    drop_sample_ids.add(s)

    cleaned_df = original_df.copy()
    if drop_sample_ids and "id" in cleaned_df.columns:
        cleaned_df = cleaned_df[~cleaned_df["id"].isin(drop_sample_ids)].reset_index(drop=True)

    if target_total is None:
        target_total = len(cleaned_df)

    if strategy == "stratified":
        group_cols = [c for c in ["language", "label"] if c in cleaned_df.columns]
        if group_cols:
            balanced_df = _stratified_sample(cleaned_df, group_cols, target_total)
        else:
            balanced_df = cleaned_df.sample(n=min(target_total, len(cleaned_df)), random_state=42)
    elif strategy == "undersample":
        if "label" in cleaned_df.columns:
            min_class = cleaned_df["label"].value_counts().min()
            balanced_parts = []
            for lbl, grp in cleaned_df.groupby("label", dropna=False):
                n = min(min_class, len(grp))
                balanced_parts.append(grp.sample(n=n, random_state=42))
            balanced_df = pd.concat(balanced_parts).reset_index(drop=True)
        else:
            balanced_df = cleaned_df.sample(n=min(target_total, len(cleaned_df)), random_state=42)
    else:
        balanced_df = cleaned_df.sample(n=min(target_total, len(cleaned_df)), random_state=42)

    if oversample_rare and "label" in balanced_df.columns:
        counts = balanced_df["label"].value_counts()
        max_count = counts.max()
        if max_count > 0:
            parts = [balanced_df]
            for lbl, cnt in counts.items():
                if cnt < max_count * 0.5:
                    need = int(max_count * 0.7) - cnt
                    if need > 0:
                        grp = balanced_df[balanced_df["label"] == lbl]
                        if len(grp) > 0:
                            extra = grp.sample(n=min(need, len(grp) * 3), replace=True, random_state=42)
                            parts.append(extra)
            balanced_df = pd.concat(parts).reset_index(drop=True)

    balanced_rule_result = apply_rules(balanced_df, rules)

    lang_dist_before = (
        original_df["language"].value_counts(dropna=False).to_dict()
        if "language" in original_df.columns else {}
    )
    label_dist_before = (
        original_df["label"].value_counts(dropna=False).to_dict()
        if "label" in original_df.columns else {}
    )
    lang_dist_after = (
        balanced_df["language"].value_counts(dropna=False).to_dict()
        if "language" in balanced_df.columns else {}
    )
    label_dist_after = (
        balanced_df["label"].value_counts(dropna=False).to_dict()
        if "label" in balanced_df.columns else {}
    )
    lang_dist_before = {(str(k) if k is not None and not (isinstance(k, float) and pd.isna(k)) else "未填写"): v
                        for k, v in lang_dist_before.items()}
    lang_dist_after = {(str(k) if k is not None and not (isinstance(k, float) and pd.isna(k)) else "未填写"): v
                       for k, v in lang_dist_after.items()}
    label_dist_before = {(str(k) if k is not None and not (isinstance(k, float) and pd.isna(k)) else "未填写"): v
                         for k, v in label_dist_before.items()}
    label_dist_after = {(str(k) if k is not None and not (isinstance(k, float) and pd.isna(k)) else "未填写"): v
                        for k, v in label_dist_after.items()}

    return {
        "original_count": len(original_df),
        "cleaned_count": len(cleaned_df),
        "balanced_count": len(balanced_df),
        "dropped_ids": list(drop_sample_ids),
        "drop_reason_count": len(drop_sample_ids),
        "flagged_sample_ids": list(issue_ids),
        "balanced_sample_ids": balanced_df["id"].tolist() if "id" in balanced_df.columns else list(range(len(balanced_df))),
        "before": {
            "language_distribution": lang_dist_before,
            "label_distribution": label_dist_before,
            "rule_check": rule_check_result,
        },
        "after": {
            "language_distribution": lang_dist_after,
            "label_distribution": label_dist_after,
            "rule_check": balanced_rule_result,
        },
        "improvement": {
            "issues_resolved": (
                rule_check_result["summary"]["total_issues"]
                - balanced_rule_result["summary"]["total_issues"]
            ),
            "high_issues_resolved": (
                rule_check_result["summary"]["severity_breakdown"]["high"]
                - balanced_rule_result["summary"]["severity_breakdown"]["high"]
            ),
            "rules_passed_increase": (
                balanced_rule_result["summary"]["passed_rules"]
                - rule_check_result["summary"]["passed_rules"]
            ),
        },
        "balanced_df": balanced_df,
        "cleaned_df": cleaned_df,
    }


def compare_runs(baseline: Dict, candidate: Dict) -> Dict:
    def _count(d):
        return d.get("original_count", 0)

    base_after = baseline.get("after", {}).get("rule_check", {}).get("summary", {})
    cand_after = candidate.get("after", {}).get("rule_check", {}).get("summary", {})

    base_issues = baseline.get("after", {}).get("rule_check", {}).get("all_issues", [])
    cand_issues = candidate.get("after", {}).get("rule_check", {}).get("all_issues", [])

    base_ids = set(baseline.get("balanced_sample_ids", []))
    cand_ids = set(candidate.get("balanced_sample_ids", []))

    judgment = "PASS"
    judgment_reasons = []

    if cand_after.get("overall_pass") and not base_after.get("overall_pass"):
        judgment = "PASS"
        judgment_reasons.append("候选版本通过了整体安全检查，而基线版本未通过")
    elif not cand_after.get("overall_pass") and base_after.get("overall_pass"):
        judgment = "BLOCK"
        judgment_reasons.append("候选版本未通过整体安全检查，但基线版本通过了——安全检查出现倒退")
    elif cand_after.get("severity_breakdown", {}).get("high", 0) > base_after.get("severity_breakdown", {}).get("high", 0):
        judgment = "BLOCK"
        judgment_reasons.append("候选版本的严重(high)问题比基线版本多，安全质量下降")

    diff = {
        "samples_change": candidate.get("balanced_count", 0) - baseline.get("balanced_count", 0),
        "samples_change_ratio": (
            (candidate.get("balanced_count", 0) - baseline.get("balanced_count", 0))
            / max(1, baseline.get("balanced_count", 1))
        ),
        "high_severity_change": (
            cand_after.get("severity_breakdown", {}).get("high", 0)
            - base_after.get("severity_breakdown", {}).get("high", 0)
        ),
        "medium_severity_change": (
            cand_after.get("severity_breakdown", {}).get("medium", 0)
            - base_after.get("severity_breakdown", {}).get("medium", 0)
        ),
        "total_issues_change": (
            cand_after.get("total_issues", 0) - base_after.get("total_issues", 0)
        ),
        "rules_passed_change": (
            cand_after.get("passed_rules", 0) - base_after.get("passed_rules", 0)
        ),
        "samples_added": list(cand_ids - base_ids),
        "samples_removed": list(base_ids - cand_ids),
    }

    before_after_security = {
        "baseline": {
            "overall_pass": base_after.get("overall_pass"),
            "high_issues": base_after.get("severity_breakdown", {}).get("high", 0),
            "medium_issues": base_after.get("severity_breakdown", {}).get("medium", 0),
            "low_issues": base_after.get("severity_breakdown", {}).get("low", 0),
            "total_issues": base_after.get("total_issues", 0),
        },
        "candidate": {
            "overall_pass": cand_after.get("overall_pass"),
            "high_issues": cand_after.get("severity_breakdown", {}).get("high", 0),
            "medium_issues": cand_after.get("severity_breakdown", {}).get("medium", 0),
            "low_issues": cand_after.get("severity_breakdown", {}).get("low", 0),
            "total_issues": cand_after.get("total_issues", 0),
        },
        "delta": {
            "overall_pass_changed": base_after.get("overall_pass") != cand_after.get("overall_pass"),
            "high_issues_delta": diff["high_severity_change"],
            "medium_issues_delta": diff["medium_severity_change"],
            "total_issues_delta": diff["total_issues_change"],
        }
    }

    if not judgment_reasons and diff["high_severity_change"] < 0:
        judgment_reasons.append(f"候选版本的严重问题减少了{abs(diff['high_severity_change'])}个，安全状况改善")
    if not judgment_reasons and diff["high_severity_change"] == 0 and diff["total_issues_change"] < 0:
        judgment_reasons.append(f"候选版本的总问题数减少了{abs(diff['total_issues_change'])}个，质量提升")

    return {
        "judgment": judgment,
        "judgment_reasons": judgment_reasons,
        "diff": diff,
        "security_comparison": before_after_security,
        "baseline_issue_examples": base_issues[:5],
        "candidate_issue_examples": cand_issues[:5],
    }

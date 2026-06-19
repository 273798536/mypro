from typing import Dict, List, Any
from pathlib import Path


REPORT_WIDTH = 96


def _hr(char: str = "=") -> str:
    return char * REPORT_WIDTH


def _fmt_pct(v: float) -> str:
    return f"{v * 100:6.2f}%"


def _fmt_delta(v: float) -> str:
    sign = "+" if v >= 0 else ""
    return f"{sign}{v * 100:6.2f}pp"


def _fmt_score(v: float) -> str:
    return f"{v:6.4f}"


def _trunc(s: str, width: int) -> str:
    if len(s) <= width:
        return s.ljust(width)
    return s[:width - 3] + "..."


def _classify_status(sample: Dict, threshold: float) -> str:
    pred = 1 if sample["score"] >= threshold else 0
    true = sample["true_label"]
    if sample.get("has_contamination"):
        return "污染"
    if pred == 1 and true == 1:
        return "TP"
    elif pred == 1 and true == 0:
        return "FP"
    elif pred == 0 and true == 0:
        return "TN"
    else:
        return "FN"


def render_header() -> str:
    lines = [
        _hr("="),
        "向量索引任务追踪 · 复核报告".center(REPORT_WIDTH),
        _hr("-"),
        "",
        "【设计要点】",
        "  · 旧/新两版模型独立跑，人工判断按 sample_id 全局化，阈值变化不覆盖人工判断",
        "  · 污染样本单独拎出，不参与主指标结论",
        "  · 每条样本附带原始文件/行号/raw_object，指认具体对象",
        "  · 演示数据刻意保留：正常样本 + 2 条边界样本 + 1 条验证集污染",
        "",
        _hr("-"),
    ]
    return "\n".join(lines)


def render_threshold(r: Dict) -> str:
    t = r["threshold"]
    lines = [
        "▶ 阈值对比",
        f"    旧版模型阈值  : {t['old']:.4f}",
        f"    新版模型阈值  : {t['new']:.4f}   （调整 {_fmt_delta(t['delta'])}）",
        f"    说明          : 阈值下调后，部分边界样本预测会翻转，需人工判断兜底",
        _hr("-"),
    ]
    return "\n".join(lines)


def render_metrics(r: Dict) -> str:
    m = r["metrics"]["deltas"]
    rows = [
        ("accuracy", "准确率"),
        ("precision", "精确率"),
        ("recall", "召回率"),
        ("f1", "F1"),
        ("tp", "TP"),
        ("fp", "FP"),
        ("tn", "TN"),
        ("fn", "FN"),
        ("total", "样本总数"),
    ]
    lines = [
        "▶ 指标变化（主指标：未剔除污染，参考即可；复核时需扣掉污染样本）",
        f"    {'指标':<10}{'旧版':>12}{'新版':>12}{'变化':>12}",
        f"    {'-' * 44}",
    ]
    for k, zh in rows:
        if k not in m:
            continue
        d = m[k]
        if k in ("tp", "fp", "tn", "fn", "total"):
            lines.append(
                f"    {zh:<10}{int(d['old']):>12}{int(d['new']):>12}"
                f"{(d['delta']):>+12.0f}"
            )
        else:
            lines.append(
                f"    {zh:<10}{_fmt_pct(d['old']):>12}{_fmt_pct(d['new']):>12}"
                f"{_fmt_delta(d['delta']):>12}"
            )
    # 剔除污染后的指标
    def clean(group_old, group_new, th_old, th_new):
        def calc(group, th):
            tp = fp = tn = fn = 0
            for s in group:
                p = 1 if s["score"] >= th else 0
                t = s["true_label"]
                if p == 1 and t == 1:
                    tp += 1
                elif p == 1 and t == 0:
                    fp += 1
                elif p == 0 and t == 0:
                    tn += 1
                else:
                    fn += 1
            total = tp + fp + tn + fn
            acc = (tp + tn) / total if total else 0
            prec = tp / (tp + fp) if (tp + fp) else 0
            rec = tp / (tp + fn) if (tp + fn) else 0
            f1 = 2 * prec * rec / (prec + rec) if (prec + rec) else 0
            return {"tp": tp, "fp": fp, "tn": tn, "fn": fn,
                    "accuracy": acc, "precision": prec,
                    "recall": rec, "f1": f1, "total": total}
        return calc(group_old, th_old), calc(group_new, th_new)

    old_clean = r["sample_groups_old"]["normal"] + r["sample_groups_old"]["boundary"]
    new_clean = r["sample_groups_new"]["normal"] + r["sample_groups_new"]["boundary"]
    c_old, c_new = clean(
        old_clean, new_clean,
        r["threshold"]["old"], r["threshold"]["new"]
    )
    lines += [
        "",
        "▶ 指标变化（剔除污染样本后的可信指标）",
        f"    {'指标':<10}{'旧版':>12}{'新版':>12}{'变化':>12}",
        f"    {'-' * 44}",
    ]
    for k, zh in rows:
        vo = c_old.get(k, 0)
        vn = c_new.get(k, 0)
        vd = vn - vo
        if k in ("tp", "fp", "tn", "fn", "total"):
            lines.append(f"    {zh:<10}{int(vo):>12}{int(vn):>12}{vd:>+12.0f}")
        else:
            lines.append(f"    {zh:<10}{_fmt_pct(vo):>12}{_fmt_pct(vn):>12}{_fmt_delta(vd):>12}")
    lines.append(_hr("-"))
    return "\n".join(lines)


def _sample_row(s: Dict, th: float, idx: int) -> str:
    status = _classify_status(s, th)
    mark = []
    if s.get("is_boundary"):
        mark.append("边界")
    if s.get("has_manual_judgment"):
        mark.append(f"人工={s['manual_label']}")
    flags = "、".join(mark) if mark else "-"
    src = f"{s.get('source_file','-')}:{s.get('source_row','-')}"
    return (
        f"    [{idx:>2}] {s['sample_id']:<14} "
        f"score={_fmt_score(s['score'])}  pred={1 if s['score'] >= th else 0}  "
        f"true={s['true_label']}  [{status:<4}]  flags=[{flags:<16}]  src={src}"
    )


def _render_group(title: str, group: List[Dict], th: float) -> str:
    if not group:
        return f"  {title}: 0 条\n"
    lines = [f"  {title}: {len(group)} 条"]
    for i, s in enumerate(group, 1):
        lines.append(_sample_row(s, th, i))
        lines.append(f"         query : {s['query_text']}")
        lines.append(f"         expect: {s['expected_result']}")
        lines.append(f"         actual: {s['actual_result']}")
        if s.get("has_manual_judgment"):
            lines.append(
                f"         人工复核: 标签={s['manual_label']}  "
                f"判断人={s.get('judge_name', '-')}  "
                f"理由={s.get('judge_reason', '')}"
            )
        if s.get("has_contamination"):
            lines.append(
                f"         ★污染类型: {s.get('contamination_type', '-')}  "
                f"说明={s.get('contamination_desc', '')}"
            )
        if s.get("raw_object"):
            ro = s["raw_object"]
            lines.append(f"         原始对象: doc_id={ro.get('doc_id','-')}  "
                         f"section={ro.get('section','-')}  "
                         f"note={ro.get('note','')}")
    return "\n".join(lines)


def render_samples(r: Dict) -> str:
    th_old = r["threshold"]["old"]
    th_new = r["threshold"]["new"]
    parts = ["▶ 样本分组 · 旧版模型（按 正常 / 边界 / 污染 分开）"]
    parts.append(_render_group("正常样本", r["sample_groups_old"]["normal"], th_old))
    parts.append("")
    parts.append(_render_group("边界样本", r["sample_groups_old"]["boundary"], th_old))
    parts.append("")
    parts.append(_render_group("★ 验证集污染样本（单独拎出，不参与主指标）",
                               r["sample_groups_old"]["contaminated"], th_old))
    parts.append("")
    parts.append(_render_group("★ 已有人工判断样本（跨版本保留，阈值变化不覆盖）",
                               r["sample_groups_old"]["judged"], th_old))
    parts.append("")
    parts.append("▶ 样本分组 · 新版模型")
    parts.append(_render_group("正常样本", r["sample_groups_new"]["normal"], th_new))
    parts.append("")
    parts.append(_render_group("边界样本", r["sample_groups_new"]["boundary"], th_new))
    parts.append("")
    parts.append(_render_group("★ 验证集污染样本（单独拎出，不参与主指标）",
                               r["sample_groups_new"]["contaminated"], th_new))
    parts.append("")
    parts.append(_render_group("★ 已有人工判断样本（跨版本保留，阈值变化不覆盖）",
                               r["sample_groups_new"]["judged"], th_new))
    parts.append(_hr("-"))
    return "\n".join(parts)


def render_changed(r: Dict) -> str:
    ch = r["changed_predictions"]
    th_old = r["threshold"]["old"]
    th_new = r["threshold"]["new"]
    lines = [
        f"▶ 预测翻转样本（阈值旧版={th_old:.4f} → 新版={th_new:.4f}，共 {len(ch)} 条翻转）",
    ]
    if not ch:
        lines.append("    （无）")
    for i, c in enumerate(ch, 1):
        lines.append(
            f"    [{i:>2}] {c['sample_id']:<14}  "
            f"旧版 pred={c['label_a']} score={_fmt_score(c['score_a'])}  →  "
            f"新版 pred={c['label_b']} score={_fmt_score(c['score_b'])}"
        )
        lines.append(f"         query: {c['query_text']}")
        lines.append("         ⚠ 复核提示: 预测翻转，需结合人工判断确认是否合理；"
                     "若已有人工标签，以人工为准不被阈值覆盖")
    lines.append(_hr("-"))
    return "\n".join(lines)


def render_summary(r: Dict) -> str:
    bd_old = len(r["sample_groups_old"]["boundary"])
    bd_new = len(r["sample_groups_new"]["boundary"])
    ct = len(r["sample_groups_old"]["contaminated"])
    mj = len(r["sample_groups_old"]["judged"])
    flip = len(r["changed_predictions"])
    lines = [
        "▶ 复核总结（给小许 + 现场老师的一页纸）",
        f"    ① 演示数据构成: 正常 + 边界 {max(bd_old, bd_new)} 条 + 验证集污染 {ct} 条；"
        f"其中 {mj} 条已有人工判断，阈值变化不会覆盖",
        f"    ② 阈值调整: {r['threshold']['old']:.4f} → {r['threshold']['new']:.4f}，"
        f"导致预测翻转 {flip} 条，边界样本翻转为重点复核项",
        f"    ③ 污染样本单独拎出: {ct} 条（sample_id=VI-2026-0006 训练集泄漏），"
        f"主指标扣掉污染后再下结论",
        f"    ④ 证据可追溯: 每条样本均保留 source_file:source_row 和 raw_object.doc_id，"
        f"可直接指认原始行",
        f"    ⑤ 人工判断全局化: manual_judgments 表按 sample_global_id 关联，"
        f"无论阈值怎么调、重跑多少次，人工判断都保留",
        "",
        "▶ 小许复核 Checklist",
        "    □ 边界样本 VI-2026-0003、VI-2026-0009：预测翻转是否符合语义预期",
        "    □ 污染样本 VI-2026-0006：已从主指标剔除，确认不再影响 F1/recall 结论",
        "    □ 人工判断 3 条：与阈值无冲突，或冲突时以人工标签为准",
        "    □ 所有翻转样本的原始 query_text / actual_result / doc_id 已人工看过",
        _hr("="),
    ]
    return "\n".join(lines)


def render_report(r: Dict) -> str:
    sections = [
        render_header(),
        render_threshold(r),
        render_metrics(r),
        render_changed(r),
        render_samples(r),
        render_summary(r),
    ]
    return "\n".join(sections)


def write_report(text: str, path: str = "vector_index_review_report.txt"):
    Path(path).write_text(text, encoding="utf-8")
    return path

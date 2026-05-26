import json
from pathlib import Path
from typing import Dict, List, Any
from collections import Counter
from datetime import datetime

try:
    import plotly.graph_objects as go
    from plotly.subplots import make_subplots
    HAS_PLOTLY = True
except ImportError:
    HAS_PLOTLY = False

from .models import ReconcileContext, DiscrepancyType, MatchResult
from .matcher import bucket_discrepancies


def generate_summary(ctx: ReconcileContext) -> Dict[str, Any]:
    total_trades = len(ctx.trades)
    matched_trades = sum(1 for t in ctx.trades.values() if t.matched)
    unmatched_trades = total_trades - matched_trades

    total_flows = len(ctx.cash_flows)
    matched_flows = sum(1 for cf in ctx.cash_flows.values() if cf.matched)
    unmatched_flows = total_flows - matched_flows

    buckets = bucket_discrepancies(ctx)
    bucket_counts = {k.value: len(v) for k, v in buckets.items()}

    severity_counts = Counter(d.severity for d in ctx.discrepancies)

    match_type_counts = Counter(m.match_type for m in ctx.matches)

    total_trade_amount = sum(abs(t.gross_amount) for t in ctx.trades.values())
    total_fee_amount = sum(t.total_fees for t in ctx.trades.values())

    return {
        "report_date": ctx.report_date.isoformat(),
        "generated_at": datetime.now().isoformat(),
        "trades": {
            "total": total_trades,
            "matched": matched_trades,
            "unmatched": unmatched_trades,
            "match_rate": matched_trades / total_trades if total_trades > 0 else 0,
        },
        "cash_flows": {
            "total": total_flows,
            "matched": matched_flows,
            "unmatched": unmatched_flows,
            "match_rate": matched_flows / total_flows if total_flows > 0 else 0,
        },
        "amounts": {
            "total_trade_amount": total_trade_amount,
            "total_fee_amount": total_fee_amount,
        },
        "discrepancies": {
            "total": len(ctx.discrepancies),
            "by_type": bucket_counts,
            "by_severity": dict(severity_counts),
        },
        "matches": {
            "total": len(ctx.matches),
            "by_type": dict(match_type_counts),
        },
    }


def generate_charts(ctx: ReconcileContext, output_dir: str) -> List[str]:
    if not HAS_PLOTLY:
        return []

    charts: List[str] = []
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    buckets = bucket_discrepancies(ctx)
    if buckets:
        types = [k.value for k in buckets.keys()]
        counts = [len(v) for v in buckets.values()]

        fig = go.Figure(data=[go.Bar(x=types, y=counts, marker_color="#4F81BD")])
        fig.update_layout(
            title="差异类型分布",
            xaxis_title="差异类型",
            yaxis_title="数量",
            height=400,
        )
        chart_file = out_path / "discrepancy_types.html"
        fig.write_html(str(chart_file))
        charts.append(str(chart_file))

    severity_counts = Counter(d.severity for d in ctx.discrepancies)
    if severity_counts:
        labels = list(severity_counts.keys())
        values = list(severity_counts.values())

        fig = go.Figure(data=[go.Pie(labels=labels, values=values, hole=0.3)])
        fig.update_layout(title="差异严重程度分布", height=400)
        chart_file = out_path / "discrepancy_severity.html"
        fig.write_html(str(chart_file))
        charts.append(str(chart_file))

    match_type_counts = Counter(m.match_type for m in ctx.matches)
    if match_type_counts:
        labels = list(match_type_counts.keys())
        values = list(match_type_counts.values())

        fig = go.Figure(data=[go.Pie(labels=labels, values=values)])
        fig.update_layout(title="匹配结果分布", height=400)
        chart_file = out_path / "match_types.html"
        fig.write_html(str(chart_file))
        charts.append(str(chart_file))

    match_scores = [m.match_score for m in ctx.matches]
    if match_scores:
        fig = go.Figure(data=[go.Histogram(x=match_scores, nbinsx=20)])
        fig.update_layout(
            title="匹配得分分布",
            xaxis_title="匹配得分",
            yaxis_title="频次",
            height=400,
        )
        chart_file = out_path / "match_scores.html"
        fig.write_html(str(chart_file))
        charts.append(str(chart_file))

    return charts


def export_json(ctx: ReconcileContext, output_file: str) -> str:
    summary = generate_summary(ctx)

    data = {
        "summary": summary,
        "trades": {tid: t.to_dict() for tid, t in ctx.trades.items()},
        "cash_flows": {fid: cf.to_dict() for fid, cf in ctx.cash_flows.items()},
        "matches": [m.to_dict() for m in ctx.matches],
        "discrepancies": [d.to_dict() for d in ctx.discrepancies],
        "securities": {code: s.to_dict() for code, s in ctx.securities.items()},
        "fee_items": {code: f.to_dict() for code, f in ctx.fee_items.items()},
        "calendar": {d.isoformat(): c.to_dict() for d, c in ctx.calendar.items()},
        "corrections": ctx.corrections,
    }

    out_path = Path(output_file)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    return str(out_path)


def export_text_report(ctx: ReconcileContext, output_file: str) -> str:
    summary = generate_summary(ctx)
    buckets = bucket_discrepancies(ctx)

    lines: List[str] = []
    lines.append("=" * 60)
    lines.append("券商对账差异报告")
    lines.append("=" * 60)
    lines.append(f"报告日期: {summary['report_date']}")
    lines.append(f"生成时间: {summary['generated_at']}")
    lines.append("")

    lines.append("一、总体情况")
    lines.append("-" * 40)
    t = summary["trades"]
    lines.append(f"成交记录: {t['total']} 条, 已匹配 {t['matched']} 条, 匹配率 {t['match_rate']:.1%}")
    f = summary["cash_flows"]
    lines.append(f"资金流水: {f['total']} 条, 已匹配 {f['matched']} 条, 匹配率 {f['match_rate']:.1%}")
    a = summary["amounts"]
    lines.append(f"成交总额: {a['total_trade_amount']:.2f}")
    lines.append(f"费用总额: {a['total_fee_amount']:.2f}")
    lines.append("")

    lines.append("二、差异统计")
    lines.append("-" * 40)
    d = summary["discrepancies"]
    lines.append(f"总差异数: {d['total']} 条")
    lines.append("按类型分布:")
    for dtype, cnt in d["by_type"].items():
        lines.append(f"  {dtype}: {cnt} 条")
    lines.append("按严重程度:")
    for sev, cnt in d["by_severity"].items():
        lines.append(f"  {sev}: {cnt} 条")
    lines.append("")

    lines.append("三、差异明细")
    lines.append("-" * 40)
    for dtype, discs in sorted(buckets.items(), key=lambda x: x[0].value):
        lines.append(f"【{dtype.value}】共 {len(discs)} 条")
        for i, disc in enumerate(discs, 1):
            lines.append(f"  {i}. [{disc.severity}] {disc.description}")
            if disc.trade_ids:
                lines.append(f"     成交编号: {', '.join(disc.trade_ids)}")
            if disc.flow_ids:
                lines.append(f"     流水编号: {', '.join(disc.flow_ids)}")
            if disc.expected_value is not None or disc.actual_value is not None:
                lines.append(f"     预期: {disc.expected_value}, 实际: {disc.actual_value}")
        lines.append("")

    lines.append("四、匹配结果")
    lines.append("-" * 40)
    m = summary["matches"]
    lines.append(f"总匹配数: {m['total']} 条")
    for mtype, cnt in m["by_type"].items():
        lines.append(f"  {mtype}: {cnt} 条")

    out_path = Path(output_file)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    return str(out_path)


def generate_all_reports(ctx: ReconcileContext, output_dir: str) -> Dict[str, str]:
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    results: Dict[str, str] = {}

    results["json"] = export_json(ctx, str(out_path / "reconcile_result.json"))
    results["text"] = export_text_report(ctx, str(out_path / "reconcile_report.txt"))
    results["charts"] = generate_charts(ctx, str(out_path / "charts"))

    return results

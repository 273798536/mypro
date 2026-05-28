from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from models import ChangeRequest, ChangeWarning, Combination, SolveResult, WarningKind


def format_combination(combo: Combination, denom_labels: dict[int, str] | None = None) -> str:
    parts = []
    for val in sorted(combo.counts.keys(), reverse=True):
        c = combo.counts[val]
        if c > 0:
            label = denom_labels.get(val, str(val)) if denom_labels else str(val)
            parts.append(f"{label}x{c}")
    return " + ".join(parts) if parts else "0"


def _warning_icon(kind: WarningKind) -> str:
    mapping = {
        WarningKind.INSUFFICIENT_INVENTORY: "⚠ 库存不足",
        WarningKind.DUPLICATE_DENOMINATION: "⚠ 面额重复",
        WarningKind.TIED_OPTIMAL: "⚠ 并列最优",
    }
    return mapping.get(kind, "⚠")


def generate_text_report(
    request: ChangeRequest,
    result: SolveResult,
    denom_labels: dict[int, str],
    warnings: list[ChangeWarning],
) -> str:
    lines: list[str] = []
    lines.append("=" * 50)
    lines.append("  现金找零报告")
    lines.append("=" * 50)
    lines.append(f"应找金额: {request.amount}")
    lines.append(f"收银员:   {request.cashier or '(未指定)'}")
    lines.append(f"班次:     {request.shift or '(未指定)'}")
    if request.source:
        lines.append(f"来源:     {request.source}")
    lines.append("")

    if warnings:
        lines.append("--- 警告 ---")
        for w in warnings:
            src = f" [{w.source}]" if w.source else ""
            lines.append(f"  {_warning_icon(w.kind)}{src}: {w.message}")
        lines.append("")

    if not result.feasible:
        lines.append("无可行找零组合。")
    else:
        lines.append(f"可行组合数: {len(result.feasible)}")
        lines.append("")

        if result.optimal:
            lines.append("--- 最优解 ---")
            for i, combo in enumerate(result.optimal, 1):
                lines.append(
                    f"  [{i}] {format_combination(combo, denom_labels)}  "
                    f"(共 {combo.total_count} 张)"
                )
            lines.append("")

        lines.append("--- 所有可行组合 ---")
        sorted_feasible = sorted(result.feasible, key=lambda c: c.total_count)
        for i, combo in enumerate(sorted_feasible, 1):
            lines.append(
                f"  {i:3d}. {format_combination(combo, denom_labels)}  "
                f"(共 {combo.total_count} 张)"
            )

    lines.append("")
    lines.append("=" * 50)
    return "\n".join(lines)


def generate_json_report(
    request: ChangeRequest,
    result: SolveResult,
    denom_labels: dict[int, str],
    warnings: list[ChangeWarning],
    history_data: list[dict[str, Any]],
) -> dict[str, Any]:
    report: dict[str, Any] = {
        "request": {
            "amount": request.amount,
            "cashier": request.cashier,
            "shift": request.shift,
            "source": str(request.source) if request.source else None,
        },
        "warnings": [
            {
                "kind": w.kind.value,
                "message": w.message,
                "source": str(w.source) if w.source else None,
            }
            for w in warnings
        ],
        "feasible_count": len(result.feasible),
        "optimal": [
            {
                "counts": combo.counts,
                "total_count": combo.total_count,
                "display": format_combination(combo, denom_labels),
            }
            for combo in result.optimal
        ],
        "feasible": [
            {
                "counts": combo.counts,
                "total_count": combo.total_count,
                "display": format_combination(combo, denom_labels),
            }
            for combo in sorted(result.feasible, key=lambda c: c.total_count)
        ],
        "history": history_data,
    }
    return report


def write_reports(
    run_dir: Path,
    request: ChangeRequest,
    result: SolveResult,
    denom_labels: dict[int, str],
    warnings: list[ChangeWarning],
    history_data: list[dict[str, Any]],
    suffix: str = "",
) -> None:
    txt_name = f"report_{suffix}.txt" if suffix else "report.txt"
    json_name = f"report_{suffix}.json" if suffix else "report.json"

    text = generate_text_report(request, result, denom_labels, warnings)
    (run_dir / txt_name).write_text(text, encoding="utf-8")

    json_data = generate_json_report(request, result, denom_labels, warnings, history_data)
    (run_dir / json_name).write_text(
        json.dumps(json_data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

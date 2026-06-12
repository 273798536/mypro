from collections import Counter
from typing import List, Dict, Any
from .models import ComboItem, CalculationResult


class ChartGenerator:
    def __init__(self):
        pass

    def generate_summary(self, combo_items: List[ComboItem]) -> Dict[str, Any]:
        total_combos = sum(item.count for item in combo_items)
        total_weight = sum(item.combined_weight * item.count for item in combo_items)

        by_size: Dict[int, int] = {}
        by_status: Dict[str, int] = {}

        for item in combo_items:
            size = len(item.question_ids)
            by_size[size] = by_size.get(size, 0) + item.count
            by_status[item.status] = by_status.get(item.status, 0) + item.count

        top_combos = sorted(
            combo_items,
            key=lambda x: (x.combined_weight, x.count),
            reverse=True,
        )[:10]

        summary = {
            "total_combos": total_combos,
            "total_weight": total_weight,
            "by_combo_size": by_size,
            "by_status": by_status,
            "top_combos": [
                {
                    "combo_id": item.combo_id,
                    "combined_weight": round(item.combined_weight, 4),
                    "count": item.count,
                    "status": item.status,
                    "questions": item.question_ids,
                }
                for item in top_combos
            ],
        }

        return summary

    def verify_consistency(self, result: CalculationResult) -> Dict[str, Any]:
        detail_total = sum(item.count for item in result.combo_items)
        chart_total = result.chart_summary.get("total_combos", -1)
        is_consistent = detail_total == chart_total

        detail_status = Counter()
        for item in result.combo_items:
            detail_status[item.status] += item.count

        chart_status = result.chart_summary.get("by_status", {})
        status_consistent = dict(detail_status) == chart_status

        return {
            "is_consistent": is_consistent,
            "detail_total": detail_total,
            "chart_total": chart_total,
            "status_consistent": status_consistent,
            "detail_status_counts": dict(detail_status),
            "chart_status_counts": chart_status,
        }

    def print_chart(self, result: CalculationResult) -> None:
        summary = result.chart_summary

        print("=" * 60)
        print("组合计数图表")
        print("=" * 60)
        print(f"总组合数: {summary['total_combos']}")
        print(f"总权重: {summary['total_weight']:.4f}")
        print()

        print("按组合大小分布:")
        for size in sorted(summary["by_combo_size"].keys()):
            count = summary["by_combo_size"][size]
            bar = "█" * min(count // 5, 40)
            print(f"  {size}个题目: {count:6d} {bar}")
        print()

        print("按状态分布:")
        for status, count in sorted(summary["by_status"].items()):
            bar = "█" * min(count // 3, 40)
            status_label = status.upper()
            print(f"  {status_label:8s}: {count:6d} {bar}")
        print()

        print("Top 10 高权重组合:")
        for i, combo in enumerate(summary["top_combos"], 1):
            marker = " [ERROR]" if combo["status"] == "error" else ""
            print(f"  {i:2d}. {combo['combo_id']:20s} w={combo['combined_weight']:.4f} n={combo['count']}{marker}")
        print("=" * 60)

        check = self.verify_consistency(result)
        print()
        print("图表与明细口径一致性校验:")
        print(f"  明细总数: {check['detail_total']}")
        print(f"  图表总数: {check['chart_total']}")
        print(f"  一致: {'✓ 是' if check['is_consistent'] else '✗ 否'}")
        print(f"  状态口径一致: {'✓ 是' if check['status_consistent'] else '✗ 否'}")
        if not check["status_consistent"]:
            print(f"    明细状态: {check['detail_status_counts']}")
            print(f"    图表状态: {check['chart_status_counts']}")
        print()

from __future__ import annotations

import json
from datetime import datetime
from typing import Dict, List, Optional, Any
from pathlib import Path

import numpy as np

from .data_models import OptimizerInput, OptimizerResult
from .constraint_explainer import ConstraintExplainer
from .history_manager import HistoryManager


class ReportGenerator:
    def __init__(self, output_dir: Optional[str] = None):
        if output_dir is None:
            output_dir = Path(__file__).parent.parent / "reports"
        self.output_dir = Path(output_dir).resolve()
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def generate_full_report(
        self,
        successful_cases: List[Dict[str, Any]],
        conflict_cases: List[Dict[str, Any]],
        include_explanations: bool = True,
    ) -> str:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_path = self.output_dir / f"optimizer_report_{timestamp}.md"

        content = []
        content.append("# 凸优化仓位约束器 - 综合报告")
        content.append("=" * 50)
        content.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        content.append("")

        content.append("## 执行摘要")
        content.append("")
        content.append(f"- 顺利样例数量: {len(successful_cases)}")
        content.append(f"- 冲突样例数量: {len(conflict_cases)}")
        content.append(f"- 总样例数量: {len(successful_cases) + len(conflict_cases)}")
        total = len(successful_cases) + len(conflict_cases)
        success_rate = len(successful_cases) / total * 100 if total > 0 else 0
        content.append(f"- 成功率: {success_rate:.1f}%")
        content.append("")

        content.append("---")
        content.append("")

        content.append("## 第一部分: 顺利样例 (正常求解)")
        content.append("")

        if successful_cases:
            for i, case in enumerate(successful_cases, 1):
                case_content = self._format_case("顺利", i, case, include_explanations)
                content.append(case_content)
        else:
            content.append("> 暂无顺利样例")
            content.append("")

        content.append("---")
        content.append("")

        content.append("## 第二部分: 约束冲突样例 (异常情况诊断)")
        content.append("")

        if conflict_cases:
            for i, case in enumerate(conflict_cases, 1):
                case_content = self._format_case("冲突", i, case, include_explanations)
                content.append(case_content)
        else:
            content.append("> 暂无冲突样例")
            content.append("")

        content.append("---")
        content.append("")

        content.append("## 总结与建议")
        content.append("")
        content.append(self._generate_summary_and_suggestions(successful_cases, conflict_cases))

        full_content = "\n".join(content)
        with open(report_path, "w", encoding="utf-8") as f:
            f.write(full_content)

        return str(report_path)

    def _format_case(
        self,
        case_type: str,
        index: int,
        case: Dict[str, Any],
        include_explanations: bool,
    ) -> str:
        result: List[str] = []
        case_name = case.get("name", f"样例{index}")
        input_data = case["input"]
        result_data = case["result"]
        explanation = case.get("explanation", "")

        result.append(f"### 样例 {index}: {case_name}")
        result.append("")
        result.append(f"**场景描述**: {case.get('description', '无描述')}")
        result.append("")

        result.append("#### 输入数据")
        result.append("")

        result.append("| 股票代码 | 目标权重 | 当前权重 | 权重范围 | 行业 | 流动性 | 禁买 |")
        result.append("|----------|----------|----------|----------|------|--------|------|")

        positions = {p.stock_code: p for p in input_data.positions}
        industries = {it.stock_code: it for it in input_data.industry_tags}
        costs = {tc.stock_code: tc for tc in input_data.transaction_costs}

        for code in sorted(positions.keys()):
            pos = positions[code]
            ind = industries.get(code)
            cost = costs.get(code)

            weight_range = f"[{pos.min_weight:.4f}, {pos.max_weight:.4f}]"
            industry_name = ind.industry if ind else "N/A"
            liquidity = f"{cost.liquidity_score:.2%}" if cost else "N/A"
            forbidden = "是" if pos.is_forbidden else "否"

            result.append(
                f"| {code} | {pos.target_weight:.4f} | {pos.current_weight:.4f} | {weight_range} | {industry_name} | {liquidity} | {forbidden} |"
            )

        result.append("")
        result.append("**约束配置**:")
        result.append("")
        const = input_data.constraints
        result.append(f"- 总权重: [{const.total_weight_min:.4f}, {const.total_weight_max:.4f}]")
        result.append(f"- 单票最大: {const.max_single_stock_weight:.4f}")
        result.append(f"- 换手率上限: {const.max_turnover:.4f}")
        if const.industry_max_weight:
            result.append(f"- 行业上限: {const.industry_max_weight}")
        if const.industry_min_weight:
            result.append(f"- 行业下限: {const.industry_min_weight}")
        result.append("")

        result.append("#### 求解结果")
        result.append("")
        result.append(f"- **状态**: {result_data.status.value}")
        result.append(f"- **求解耗时**: {result_data.solve_time_ms:.2f} ms")
        if result_data.objective_value is not None:
            result.append(f"- **目标函数值**: {result_data.objective_value:.6f}")
        result.append("")

        if result_data.optimal_weights:
            result.append("**最优权重**:")
            result.append("")
            result.append("| 股票代码 | 最优权重 | 与目标偏离 |")
            result.append("|----------|----------|------------|")

            target_map = {p.stock_code: p.target_weight for p in input_data.positions}
            for code, w in sorted(result_data.optimal_weights.items()):
                target = target_map.get(code, 0.0)
                diff = w - target
                diff_str = f"{diff:+.4f}"
                result.append(f"| {code} | {w:.4f} | {diff_str} |")
            result.append("")

        if result_data.conflicts:
            result.append("**数据冲突**:")
            result.append("")
            for c in result_data.conflicts:
                status = "✅" if c.resolved else "⚠️"
                result.append(f"- {status} [{c.severity}] {c.description}")
            result.append("")

        if result_data.violations:
            result.append("**约束违反**:")
            result.append("")
            for v in result_data.violations:
                result.append(f"- ❌ {v.description}: {v.current_value:.6f} (限制: {v.limit_value:.6f})")
            result.append("")

        if include_explanations and result_data.explanation:
            result.append("#### 详细说明")
            result.append("")
            result.append("```")
            result.append(result_data.explanation)
            result.append("```")
            result.append("")

        if include_explanations and explanation:
            result.append("#### 约束解释")
            result.append("")
            result.append("```")
            result.append(explanation)
            result.append("```")
            result.append("")

        if result_data.error_message:
            result.append("**错误信息**:")
            result.append("")
            result.append("```")
            result.append(result_data.error_message)
            result.append("```")
            result.append("")

        return "\n".join(result)

    def _generate_summary_and_suggestions(
        self,
        successful_cases: List[Dict[str, Any]],
        conflict_cases: List[Dict[str, Any]],
    ) -> str:
        summary: List[str] = []

        if successful_cases:
            summary.append("### 顺利样例特点:")
            summary.append("")
            for case in successful_cases:
                total_weight = (
                    sum(case["result"].optimal_weights.values())
                    if case["result"].optimal_weights else 0
                )
                turnover = case.get("turnover", 0)
                summary.append(
                    f"- **{case.get('name', '样例')}**: "
                    f"最优权重合计={total_weight:.4f}, 换手率={turnover:.4f}"
                )
            summary.append("")

        if conflict_cases:
            summary.append("### 冲突样例分析:")
            summary.append("")
            conflict_types: Dict[str, int] = {}
            for case in conflict_cases:
                for c in case["result"].conflicts:
                    ctype = c.conflict_type.value
                    conflict_types[ctype] = conflict_types.get(ctype, 0) + 1
                for v in case["result"].violations:
                    ctype = v.constraint_name
                    conflict_types[ctype] = conflict_types.get(ctype, 0) + 1

            for ctype, count in sorted(conflict_types.items()):
                summary.append(f"- {ctype}: {count} 次")
            summary.append("")

            summary.append("### 处理建议:")
            summary.append("")
            summary.append("1. **权重不满**: 检查总权重约束范围是否合理，考虑放宽下限或增加可选标的")
            summary.append("2. **约束冲突**: 识别冲突约束对，逐步放松进行敏感性分析")
            summary.append("3. **禁买标的**: 确认禁买理由，必要时人工调整权重")
            summary.append("4. **数据冲突**: 优先信任主信息(持仓)，补证据仅作风险提示")
            summary.append("5. **复算验证**: 相同输入使用相同随机种子确保结果一致")
            summary.append("")

        if not successful_cases and not conflict_cases:
            summary.append("> 暂无数据，请先运行测试用例")
            summary.append("")

        return "\n".join(summary)

    def generate_determinism_report(
        self,
        case_name: str,
        is_consistent: bool,
        results: List[OptimizerResult],
    ) -> str:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_path = self.output_dir / f"determinism_report_{timestamp}.md"

        content = []
        content.append("# 复算一致性验证报告")
        content.append("")
        content.append(f"测试样例: {case_name}")
        content.append(f"验证时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        content.append(
            f"验证结果: {'✅ 通过 - 结果完全一致' if is_consistent else '❌ 失败 - 结果不一致'}"
        )
        content.append("")

        content.append("## 各次运行结果对比")
        content.append("")
        content.append("| 运行次数 | 状态 | 目标函数值 | 求解耗时 |")
        content.append("|----------|------|------------|----------|")
        for i, r in enumerate(results, 1):
            obj_val = f"{r.objective_value:.6f}" if r.objective_value is not None else "N/A"
            content.append(f"| {i} | {r.status.value} | {obj_val} | {r.solve_time_ms:.2f} ms |")
        content.append("")

        if results and results[0].optimal_weights:
            content.append("## 权重对比 (首次 vs 末次)")
            content.append("")
            first = results[0].optimal_weights
            last = results[-1].optimal_weights
            content.append("| 股票代码 | 首次权重 | 末次权重 | 差值 |")
            content.append("|----------|----------|----------|------|")
            all_close = True
            for code in sorted(first.keys()):
                w1 = first[code]
                w2 = last.get(code, 0.0)
                diff = abs(w1 - w2)
                if diff > 1e-10:
                    all_close = False
                diff_str = f"{diff:.10f}"
                content.append(f"| {code} | {w1:.6f} | {w2:.6f} | {diff_str} |")
            content.append("")
            content.append(f"权重一致性: {'✅ 一致' if all_close else '❌ 不一致'}")
            content.append("")

        content.append("## 复算保证措施:")
        content.append("- 使用固定随机种子")
        content.append("- 禁用求解器缓存")
        content.append("- 使用高精度求解容差(1e-8)")
        content.append("- CLARABEL 求解器确定性配置")
        content.append("")

        full_content = "\n".join(content)
        with open(report_path, "w", encoding="utf-8") as f:
            f.write(full_content)

        return str(report_path)

    def save_json_report(
        self,
        data: Dict[str, Any],
        filename: str,
    ) -> str:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_path = self.output_dir / f"{filename}_{timestamp}.json"
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)
        return str(report_path)

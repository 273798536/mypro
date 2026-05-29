from typing import Dict, List
import pandas as pd
from datetime import datetime


class ReportGenerator:
    def __init__(self):
        pass

    def generate_text_report(self, run_data: Dict, show_details: bool = True) -> str:
        lines = []
        
        lines.append("=" * 60)
        lines.append("饲料配方优化报告")
        lines.append("=" * 60)
        lines.append(f"方案名称: {run_data.get('run_name', '未命名')}")
        lines.append(f"运行时间: {run_data.get('timestamp', '未知')}")
        lines.append(f"方案状态: {self._get_status_text(run_data)}")
        lines.append("")

        if run_data.get('数据警告'):
            lines.append("⚠️ 数据警告:")
            for warning in run_data['数据警告']:
                lines.append(f"   - {warning}")
            lines.append("")

        if run_data.get('数据错误'):
            lines.append("❌ 数据错误 (请修正后重试):")
            for error in run_data['数据错误']:
                lines.append(f"   - {error}")
            lines.append("")
            return "\n".join(lines)

        if run_data.get('约束错误'):
            lines.append("❌ 约束错误 (请修正后重试):")
            for error in run_data['约束错误']:
                lines.append(f"   - {error}")
            lines.append("")
            return "\n".join(lines)

        if not run_data.get('可行', False):
            lines.append("❌ 配方不可行，原因分析:")
            lines.append("")
            lines.append(self._explain_infeasibility(run_data))
            lines.append("")
            lines.append("💡 建议调整方案:")
            lines.append(self._get_suggestions(run_data))
            return "\n".join(lines)

        lines.append("✅ 配方可行")
        lines.append("")
        
        lines.append(f"💰 总成本: {run_data.get('总成本(元)', 0):.2f} 元")
        lines.append("")

        constraints = run_data.get('约束条件', {})
        if constraints:
            lines.append("📋 约束条件:")
            for key, value in constraints.items():
                lines.append(f"   - {key}: {value}")
            lines.append("")

        lines.append("📊 配方明细:")
        lines.append("-" * 60)
        formula = run_data.get('配方明细', [])
        if formula:
            df = pd.DataFrame(formula)
            df = df[['原料名称', '配比(%)', '用量(吨)', '成本(元)']].copy()
            df['配比(%)'] = df['配比(%)'].round(2)
            df['用量(吨)'] = df['用量(吨)'].round(4)
            df['成本(元)'] = df['成本(元)'].round(2)
            lines.append(df.to_string(index=False))
        lines.append("")

        if show_details:
            lines.append("🥚 营养指标达成情况:")
            lines.append(self._get_nutrition_summary(run_data))
            lines.append("")

            lines.append("📦 库存使用情况:")
            lines.append(self._get_stock_usage(run_data))
            lines.append("")

        lines.append("📝 原料采购清单:")
        lines.append(self._get_purchase_list(run_data))

        return "\n".join(lines)

    def generate_comparison_report(self, comparison: Dict) -> str:
        lines = []
        
        lines.append("=" * 60)
        lines.append("配方方案对比报告")
        lines.append("=" * 60)
        lines.append("")
        
        info = comparison.get('基本信息', {})
        lines.append(f"方案1: {info.get('方案1', {}).get('名称', '未知')} (ID:{info.get('方案1', {}).get('ID', '?')})")
        lines.append(f"方案2: {info.get('方案2', {}).get('名称', '未知')} (ID:{info.get('方案2', {}).get('ID', '?')})")
        lines.append("")

        cost = comparison.get('成本变化', {})
        lines.append("💰 成本变化:")
        lines.append(f"   方案1: {cost.get('方案1成本', 0):.2f} 元")
        lines.append(f"   方案2: {cost.get('方案2成本', 0):.2f} 元")
        diff = cost.get('差额', 0)
        if diff > 0:
            lines.append(f"   ▲ 成本上升: +{diff:.2f} 元 (+{cost.get('变化率', 0):.1f}%)")
        elif diff < 0:
            lines.append(f"   ▼ 成本下降: {diff:.2f} 元 ({cost.get('变化率', 0):.1f}%)")
        else:
            lines.append(f"   = 成本持平")
        lines.append("")

        formula_changes = comparison.get('配方变化', {})
        changes = formula_changes.get('配比变化', [])
        added = formula_changes.get('新增原料', [])
        removed = formula_changes.get('移除原料', [])
        
        lines.append("🔄 配方变化:")
        if changes:
            lines.append("   配比调整:")
            for c in changes[:5]:
                direction = "▲" if c['变化量'] > 0 else "▼"
                lines.append(f"      {direction} {c['原料名称']}: {c['方案1配比(%)']:.2f}% → {c['方案2配比(%)']:.2f}% ({c['变化量']:+.2f}%)")
            if len(changes) > 5:
                lines.append(f"      ... 还有 {len(changes) - 5} 种原料有变化")
        
        if added:
            lines.append("   ✅ 新增原料:")
            for a in added:
                lines.append(f"      + {a['原料名称']}: {a['方案2配比(%)']:.2f}%")
        
        if removed:
            lines.append("   ❌ 移除原料:")
            for r in removed:
                lines.append(f"      - {r['原料名称']}: 原占比 {r['方案1配比(%)']:.2f}%")
        
        if not changes and not added and not removed:
            lines.append("   (配方无变化)")
        lines.append("")

        nutrition = comparison.get('营养指标变化', {})
        nut1 = nutrition.get('方案1', {})
        nut2 = nutrition.get('方案2', {})
        nut_diff = nutrition.get('变化', {})
        lines.append("🥚 营养变化:")
        lines.append(f"   粗蛋白: {nut1.get('粗蛋白(%)', 0):.2f}% → {nut2.get('粗蛋白(%)', 0):.2f}% ({nut_diff.get('粗蛋白变化', 0):+.2f}%)")
        lines.append(f"   消化能: {nut1.get('消化能(兆卡/公斤)', 0):.2f} → {nut2.get('消化能(兆卡/公斤)', 0):.2f} ({nut_diff.get('消化能变化', 0):+.2f})")
        lines.append("")

        status = comparison.get('状态变化', {})
        lines.append(f"📊 可行性: {status.get('状态变化', '未知')}")

        constraints = comparison.get('约束冲突变化', {})
        new_conflicts = constraints.get('新增冲突', [])
        resolved_conflicts = constraints.get('已解决冲突', [])
        
        if new_conflicts:
            lines.append("")
            lines.append("⚠️ 新增问题:")
            for c in new_conflicts:
                lines.append(f"   - {c}")
        
        if resolved_conflicts:
            lines.append("")
            lines.append("✅ 已解决问题:")
            for c in resolved_conflicts:
                lines.append(f"   - {c}")

        return "\n".join(lines)

    def _get_status_text(self, run_data: Dict) -> str:
        if run_data.get('可行', False):
            return "可行 ✓"
        elif run_data.get('状态') == 'Infeasible':
            return "不可行 - 约束冲突"
        elif run_data.get('数据错误'):
            return "数据错误"
        else:
            return f"{run_data.get('状态', '未知')}"

    def _explain_infeasibility(self, run_data: Dict) -> str:
        conflicts = run_data.get('约束冲突', [])
        if not conflicts:
            return "   未找到具体冲突原因，请检查原料数据和约束条件是否合理。"
        
        explanations = []
        for conflict in conflicts:
            if '总库存不足' in conflict:
                explanations.append(f"   📦 {conflict}")
                explanations.append("      → 说明仓库里所有原料加起来都不够生产目标产量")
            elif '蛋白无法达标' in conflict:
                explanations.append(f"   🥚 {conflict}")
                explanations.append("      → 说明即使全用蛋白最高的原料，也达不到要求的蛋白含量")
            elif '蛋白限制过严' in conflict:
                explanations.append(f"   🥚 {conflict}")
                explanations.append("      → 说明即使全用蛋白最低的原料，也超过了限制的蛋白含量")
            elif '最低比例总和' in conflict:
                explanations.append(f"   ⚖️ {conflict}")
                explanations.append("      → 说明各种原料的最低比例加起来超过了100%，无法同时满足")
            elif '库存不足' in conflict:
                explanations.append(f"   📦 {conflict}")
            else:
                explanations.append(f"   ⚠️ {conflict}")
        
        return "\n".join(explanations)

    def _get_suggestions(self, run_data: Dict) -> str:
        conflicts = run_data.get('约束冲突', [])
        suggestions = []
        
        for conflict in conflicts:
            if '总库存不足' in conflict:
                suggestions.append("   1. 降低生产目标产量")
                suggestions.append("   2. 紧急采购补充库存")
            elif '蛋白无法达标' in conflict:
                suggestions.append("   1. 降低粗蛋白的最低要求")
                suggestions.append("   2. 采购高蛋白原料（如豆粕、鱼粉）")
            elif '蛋白限制过严' in conflict:
                suggestions.append("   1. 提高粗蛋白的最高限制")
                suggestions.append("   2. 采购低蛋白原料（如玉米、麸皮）")
            elif '最低比例总和' in conflict:
                suggestions.append("   1. 降低部分原料的最低比例要求")
            elif '库存不足' in conflict:
                suggestions.append("   1. 减少该原料的使用量限制")
                suggestions.append("   2. 补充该原料的库存")
        
        if not suggestions:
            suggestions.append("   1. 检查营养指标要求是否合理")
            suggestions.append("   2. 检查原料库存数据是否准确")
            suggestions.append("   3. 适当放宽部分约束条件")
        
        return "\n".join(suggestions)

    def _get_nutrition_summary(self, run_data: Dict) -> str:
        formula = run_data.get('配方明细', [])
        protein = sum(item.get('粗蛋白贡献(%)', 0) for item in formula)
        energy = sum(item.get('消化能贡献(兆卡/公斤)', 0) for item in formula)
        
        constraints = run_data.get('约束条件', {})
        
        lines = []
        lines.append(f"   粗蛋白: {protein:.2f}%",)
        if '粗蛋白最低' in constraints:
            status = "✓" if protein >= constraints['粗蛋白最低'] else "✗"
            lines[-1] += f" (最低要求 {constraints['粗蛋白最低']}% {status})"
        
        if '粗蛋白最高' in constraints:
            status = "✓" if protein <= constraints['粗蛋白最高'] else "✗"
            lines[-1] += f" (最高限制 {constraints['粗蛋白最高']}% {status})"
        
        lines.append(f"   消化能: {energy:.2f} 兆卡/公斤")
        if '消化能最低' in constraints:
            status = "✓" if energy >= constraints['消化能最低'] else "✗"
            lines[-1] += f" (最低要求 {constraints['消化能最低']} {status})"
        
        return "\n".join(lines)

    def _get_stock_usage(self, run_data: Dict) -> str:
        ingredients = {item['原料名称']: item.get('库存(吨)', 0) for item in run_data.get('原料数据', [])}
        formula = run_data.get('配方明细', [])
        
        lines = []
        for item in formula:
            name = item['原料名称']
            usage = item['用量(吨)']
            stock = ingredients.get(name, 0)
            usage_rate = (usage / stock * 100) if stock > 0 else 100
            lines.append(f"   {name}: 使用 {usage:.2f}吨 / 库存 {stock:.2f}吨 ({usage_rate:.1f}%)")
        
        return "\n".join(lines) if lines else "   (无数据)"

    def _get_purchase_list(self, run_data: Dict) -> str:
        formula = run_data.get('配方明细', [])
        ingredients = {item['原料名称']: item.get('库存(吨)', 0) for item in run_data.get('原料数据', [])}
        
        lines = []
        for item in formula:
            name = item['原料名称']
            usage = item['用量(吨)']
            stock = ingredients.get(name, 0)
            need_buy = max(0, usage - stock)
            
            if need_buy > 0:
                unit_price = item.get('单价(元/吨)', 0)
                cost = need_buy * unit_price / 1000
                lines.append(f"   {name}: 需采购 {need_buy:.2f}吨 (约 {cost:.2f}元)")
            else:
                lines.append(f"   {name}: 库存充足，无需采购")
        
        return "\n".join(lines) if lines else "   (无数据)"

    def export_to_text(self, report: str, filepath: str):
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(report)
        return filepath

    def export_to_excel(self, run_data: Dict, filepath: str):
        with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
            summary_df = pd.DataFrame([
                {'项目': '方案名称', '数值': run_data.get('run_name', '')},
                {'项目': '运行时间', '数值': run_data.get('timestamp', '')},
                {'项目': '状态', '数值': self._get_status_text(run_data)},
                {'项目': '总成本(元)', '数值': run_data.get('总成本(元)', 0)},
                {'项目': '是否可行', '数值': '是' if run_data.get('可行', False) else '否'},
            ])
            summary_df.to_excel(writer, sheet_name='方案概览', index=False)
            
            formula = run_data.get('配方明细', [])
            if formula:
                formula_df = pd.DataFrame(formula)
                formula_df.to_excel(writer, sheet_name='配方明细', index=False)
            
            if run_data.get('约束冲突'):
                conflict_df = pd.DataFrame({'冲突详情': run_data['约束冲突']})
                conflict_df.to_excel(writer, sheet_name='约束冲突', index=False)
            
            if run_data.get('数据错误'):
                error_df = pd.DataFrame({'错误详情': run_data['数据错误']})
                error_df.to_excel(writer, sheet_name='数据错误', index=False)
        
        return filepath

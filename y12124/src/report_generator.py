import pandas as pd
from typing import Dict
from datetime import datetime
from pathlib import Path


class ReportGenerator:
    def __init__(self, output_dir: str = "output"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)

    def generate_full_report(self, 
                              duplicate_conflicts: Dict,
                              radius_issues: Dict,
                              coverage_results: Dict,
                              warehouse_comparison: pd.DataFrame,
                              map_filepath: str = None) -> str:
        report_parts = []
        
        report_parts.append("# 📦 前置仓覆盖范围分析报告\n")
        report_parts.append(f"> 生成时间：{datetime.now().strftime('%Y年%m月%d日 %H:%M')}")
        report_parts.append("")
        
        report_parts.append("## 📋 执行摘要")
        report_parts.append(self._generate_executive_summary(
            duplicate_conflicts, radius_issues, coverage_results
        ))
        report_parts.append("")
        
        report_parts.append("---")
        report_parts.append("## 1️⃣ 坐标重复检测")
        dup_summary = duplicate_conflicts.get('summary', {})
        report_parts.append(f"- 总冲突数：{dup_summary.get('total_conflicts', 0)} 处")
        report_parts.append(f"- 坐标完全重复：{dup_summary.get('exact_duplicate_count', 0)} 处")
        report_parts.append(f"- 坐标接近（50米内）：{dup_summary.get('near_duplicate_count', 0)} 处")
        
        if dup_summary.get('has_high_risk', False):
            report_parts.append("- ⚠️ **存在高风险冲突（跨类型坐标重合），必须先处理才能继续！**")
        else:
            report_parts.append("- ✅ 无高风险冲突")
        report_parts.append("")
        
        if duplicate_conflicts.get('exact_duplicates'):
            report_parts.append("### 坐标完全重复详情")
            for i, conflict in enumerate(duplicate_conflicts['exact_duplicates'], 1):
                report_parts.append(f"\n#### 冲突 #{i} - {conflict.severity.value}")
                report_parts.append(f"**问题：** {conflict.human_reason.split('【为什么')[0]}")
                report_parts.append(f"**涉及：**")
                for record in conflict.records:
                    report_parts.append(f"- [{record['source']}] {record['name']} (ID: {record['id']})")
                report_parts.append(f"**建议：** {conflict.suggestion}")
        report_parts.append("")
        
        report_parts.append("---")
        report_parts.append("## 2️⃣ 半径越界检测")
        rad_summary = radius_issues.get('summary', {})
        report_parts.append(f"- 检查配对数：{rad_summary.get('total_checked_pairs', 0)} 对")
        report_parts.append(f"- 超出半径：{rad_summary.get('over_radius_count', 0)} 对")
        report_parts.append(f"- 接近边界：{rad_summary.get('near_boundary_count', 0)} 对")
        report_parts.append(f"- 受影响小区：{rad_summary.get('affected_communities', 0)} 个")
        report_parts.append("")
        
        if radius_issues.get('over_radius'):
            report_parts.append("### 超出服务半径详情")
            for i, issue in enumerate(radius_issues['over_radius'][:5], 1):
                report_parts.append(f"- {issue.record_link}: {issue.distance_km}km / {issue.radius_km}km (超出{issue.overage_km}km)")
            if len(radius_issues['over_radius']) > 5:
                report_parts.append(f"- ...... 还有 {len(radius_issues['over_radius']) - 5} 条，详见完整报告")
        report_parts.append("")
        
        report_parts.append("---")
        report_parts.append("## 3️⃣ 凸包覆盖评估")
        
        overall = coverage_results.get('overall_coverage', {})
        report_parts.append("### 整体覆盖情况")
        report_parts.append(f"- 小区总数：{overall.get('total_communities', 0)} 个")
        report_parts.append(f"- 已覆盖：{overall.get('covered_communities', 0)} 个")
        report_parts.append(f"- 覆盖率：**{overall.get('coverage_rate', 0)}%**")
        report_parts.append(f"- 覆盖人口：{overall.get('covered_population', 0)} 人")
        report_parts.append("")
        
        individual = coverage_results.get('individual_coverage', [])
        if individual:
            report_parts.append("### 各仓库覆盖详情")
            for cov in individual:
                report_parts.append(f"\n#### {cov.warehouse_name} (ID: {cov.warehouse_id})")
                report_parts.append(f"- 服务半径：{cov.radius_km} 公里")
                report_parts.append(f"- 覆盖小区：{cov.total_communities_count} 个")
                report_parts.append(f"- 覆盖人口：{cov.covered_population} 人")
                report_parts.append(f"- 凸包面积：{cov.hull_area_km2} km²")
                if cov.covered_communities:
                    comm_names = [c['name'] for c in cov.covered_communities]
                    report_parts.append(f"- 覆盖小区列表：{', '.join(comm_names)}")
        report_parts.append("")
        
        uncovered = coverage_results.get('uncovered_communities', [])
        if uncovered:
            report_parts.append("### ⚠️ 未覆盖小区")
            for comm in uncovered:
                report_parts.append(f"- {comm['name']} (ID: {comm['id']})")
        report_parts.append("")
        
        report_parts.append("---")
        report_parts.append("## 4️⃣ 候选仓库比较")
        report_parts.append("")
        report_parts.append(warehouse_comparison.to_markdown(index=False))
        report_parts.append("")
        
        report_parts.append("---")
        report_parts.append("## 5️⃣ 地图可视化")
        if map_filepath:
            report_parts.append(f"- 交互式地图已生成：`{map_filepath}`")
            report_parts.append("- 用浏览器打开即可查看凸包范围、小区分布、覆盖情况")
        else:
            report_parts.append("- 地图文件：请运行程序生成")
        report_parts.append("")
        
        report_parts.append("---")
        report_parts.append("## 📌 行动建议")
        
        suggestions = []
        if dup_summary.get('has_high_risk', False):
            suggestions.append("1. 🔴 **优先处理**：坐标重复冲突必须先解决，否则后面的计算都不准")
        if rad_summary.get('over_radius_count', 0) > 0:
            suggestions.append(f"2. 🟡 评估 {rad_summary['over_radius_count']} 个越界配对，决定是扩半径还是选新仓")
        if uncovered:
            suggestions.append(f"3. 🟠 考虑在未覆盖小区附近增设新仓候选点")
        if overall.get('coverage_rate', 0) < 80:
            suggestions.append("4. 🔵 当前覆盖率低于80%，建议增加仓库候选或扩大服务半径")
        
        if suggestions:
            for s in suggestions:
                report_parts.append(s)
        else:
            report_parts.append("- ✅ 数据质量良好，覆盖情况符合预期，可以进入下一阶段")
        
        report_content = "\n".join(report_parts)
        
        filepath = self.output_dir / f"full_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(report_content)
        
        return str(filepath)

    def _generate_executive_summary(self, duplicate_conflicts, radius_issues, coverage_results):
        parts = []
        
        dup_summary = duplicate_conflicts.get('summary', {})
        rad_summary = radius_issues.get('summary', {})
        overall = coverage_results.get('overall_coverage', {})
        
        has_issues = (
            dup_summary.get('total_conflicts', 0) > 0 or 
            rad_summary.get('over_radius_count', 0) > 0
        )
        
        if has_issues:
            parts.append("⚠️ **存在需要关注的数据质量问题**")
        else:
            parts.append("✅ **数据质量良好，覆盖评估可用**")
        
        parts.append(f"")
        parts.append(f"- 小区覆盖率：{overall.get('coverage_rate', 0)}%")
        parts.append(f"- 覆盖人口：{overall.get('covered_population', 0)} 人")
        parts.append(f"- 数据冲突：{dup_summary.get('total_conflicts', 0)} 处")
        parts.append(f"- 半径越界：{rad_summary.get('over_radius_count', 0)} 对")
        
        return "\n".join(parts)

    def generate_duplicate_only_report(self, duplicate_conflicts: Dict) -> str:
        from src.duplicate_detector import DuplicateDetector
        detector = DuplicateDetector()
        report_content = detector.format_conflicts_for_report(duplicate_conflicts)
        
        filepath = self.output_dir / f"duplicate_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(report_content)
        
        return str(filepath)

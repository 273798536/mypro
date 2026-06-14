"""
凸包面积参数试算 - 报告生成模块
负责生成 Markdown 格式报告，包含筛选口径、数据来源、计算过程
"""

from datetime import datetime
from typing import List, Dict, Optional
import numpy as np
from convex_hull_calculator import ConvexHullResult, PointData
from data_manager import DataManager


class ReportGenerator:
    """Markdown 报告生成器"""

    def __init__(self):
        pass

    def generate_full_report(
        self,
        result: ConvexHullResult,
        data_manager: DataManager,
        report_title: str = "凸包面积参数试算报告",
        operator: str = "",
        include_calculation_trace: bool = True,
        include_raw_data: bool = True,
        include_excluded_data: bool = True,
    ) -> str:
        """
        生成完整的 Markdown 报告

        Args:
            result: 凸包计算结果
            data_manager: 数据管理器（用于获取原始数据信息）
            report_title: 报告标题
            operator: 操作人
            include_calculation_trace: 是否包含计算过程
            include_raw_data: 是否包含原始数据
            include_excluded_data: 是否包含排除数据

        Returns:
            Markdown 格式报告字符串
        """
        summary = data_manager.get_data_summary()

        sections = []

        # 标题
        sections.append(f"# {report_title}")
        sections.append("")
        sections.append(f"**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        if operator:
            sections.append(f"**操作人**: {operator}")
        sections.append(f"**数据来源**: {summary['source']}")
        sections.append("")

        # 核心结论
        sections.append("## 一、核心结论")
        sections.append("")
        sections.append(f"**凸包面积**: {result.area:.4f}")
        sections.append("")
        sections.append(f"- 参与计算样本数: {len(result.used_points)}")
        sections.append(f"- 排除样本数: {len(result.excluded_points)}")
        sections.append(f"- 凸包顶点数: {len(result.hull_points)}")
        sections.append("")

        # 权重参数
        sections.append("## 二、权重参数")
        sections.append("")
        sections.append("| 维度 | 权重值 |")
        sections.append("|------|--------|")
        for dim, value in result.weights.items():
            sections.append(f"| {dim.upper()}维度 | {value:.4f} |")
        sections.append("")

        # 筛选口径 - 直接使用记录的筛选参数，不反推
        sections.append("## 三、筛选口径")
        sections.append("")
        sections.append("本次计算采用以下筛选规则：")
        sections.append("")
        sections.append(f"- 重复样本: {'排除' if result.exclude_duplicates else '保留'}")
        sections.append(f"- 脏数据（缺失/异常）: {'排除' if result.exclude_dirty else '保留'}")
        sections.append(f"- 坐标缺失: 自动排除（不参与计算）")
        sections.append("")
        sections.append(f"> 筛选结果：总样本 {len(result.all_points)} 条 → 有效样本 {len(result.used_points)} 条，排除 {len(result.excluded_points)} 条")
        sections.append("")

        # 数据来源说明
        sections.append("## 四、数据来源说明")
        sections.append("")
        sections.append(f"原始数据来源: `{summary['source']}`")
        sections.append("")
        sources = data_manager.get_sources()
        if len(sources) > 1:
            sections.append("### 各数据源分布")
            sections.append("")
            for src in sources:
                count = sum(1 for p in data_manager.points if p.source == src)
                sections.append(f"- {src}: {count} 条")
            sections.append("")

        sections.append("### 数据质量概览")
        sections.append("")
        sections.append(f"| 指标 | 数量 | 占比 |")
        sections.append(f"|------|------|------|")
        total = summary["total"]
        if total > 0:
            sections.append(f"| 总样本数 | {summary['total']} | 100% |")
            sections.append(f"| 干净数据 | {summary['clean']} | {summary['clean']/total*100:.1f}% |")
            sections.append(f"| 脏数据 | {summary['dirty']} | {summary['dirty']/total*100:.1f}% |")
            sections.append(f"| 重复样本 | {summary['duplicates']} | {summary['duplicates']/total*100:.1f}% |")
        sections.append("")

        # 凸包顶点
        sections.append("## 五、凸包顶点")
        sections.append("")
        sections.append("| 序号 | X坐标 | Y坐标 |")
        sections.append("|------|-------|-------|")
        for i, (x, y) in enumerate(result.hull_points):
            sections.append(f"| {i+1} | {x:.4f} | {y:.4f} |")
        sections.append("")

        # 计算过程追踪
        if include_calculation_trace and result.calculation_trace:
            sections.append("## 六、计算过程")
            sections.append("")
            sections.append("```")
            for line in result.calculation_trace:
                sections.append(line)
            sections.append("```")
            sections.append("")

        # 排除数据详情
        if include_excluded_data and result.excluded_points:
            sections.append("## 七、排除数据详情")
            sections.append("")
            sections.append("以下数据因不符合筛选口径被排除，保留原始记录以供复核：")
            sections.append("")
            sections.append("| 样本ID | 原始X | 原始Y | 排除原因 | 数据来源 | 备注 |")
            sections.append("|--------|-------|-------|----------|----------|------|")
            for ep in result.excluded_points:
                orig_x = ep.original_x if ep.original_x is not None else "-"
                orig_y = ep.original_y if ep.original_y is not None else "-"
                sections.append(f"| {ep.id} | {orig_x} | {orig_y} | {ep.note} | {ep.source} | {ep.dirty_reason} |")
            sections.append("")

        # 原始数据（完整表格）
        if include_raw_data:
            sections.append("## 八、原始数据清单")
            sections.append("")
            sections.append("> 保留完整原始数据，所有清洗和筛选均基于原始数据派生，不改动原始记录")
            sections.append("")
            sections.append("| 样本ID | 原始X值 | 原始Y值 | 加权后X | 加权后Y | 是否脏数据 | 脏数据原因 | 是否重复 | 数据来源 | 备注 |")
            sections.append("|--------|---------|---------|---------|---------|------------|------------|----------|----------|------|")
            for pt in result.all_points:
                is_dirty = "是" if pt.is_dirty else "否"
                is_dup = "是" if pt.is_duplicate else "否"
                # 显示原始值 - 缺失用 None 表示
                disp_orig_x = pt.original_x if pt.original_x is not None else "(缺失)"
                disp_orig_y = pt.original_y if pt.original_y is not None else "(缺失)"
                # 显示加权后的值 - NaN 也标出来
                disp_weighted_x = f"{pt.x * result.weights.get('x', 1.0):.4f}" if not np.isnan(pt.x) else "(缺失)"
                disp_weighted_y = f"{pt.y * result.weights.get('y', 1.0):.4f}" if not np.isnan(pt.y) else "(缺失)"
                sections.append(f"| {pt.id} | {disp_orig_x} | {disp_orig_y} | {disp_weighted_x} | {disp_weighted_y} | {is_dirty} | {pt.dirty_reason} | {is_dup} | {pt.source} | {pt.note} |")
            sections.append("")

        # 复核说明
        sections.append("## 九、复核说明")
        sections.append("")
        sections.append("### 数字从哪来？")
        sections.append("")
        sections.append("1. **原始数据**: 来自上文「八、原始数据清单」，完整保留了导入时的原始记录")
        sections.append("2. **筛选过程**: 按照「三、筛选口径」中的规则，从原始数据中选出有效样本")
        sections.append("3. **权重应用**: 按照「二、权重参数」对各维度坐标进行缩放")
        sections.append("4. **凸包计算**: 使用 Graham 扫描法计算凸包，面积为凸包多边形的面积")
        sections.append("")
        sections.append("### 怎么复核？")
        sections.append("")
        sections.append("1. 核对原始数据条数与数据源是否一致")
        sections.append("2. 确认筛选口径是否符合业务要求")
        sections.append("3. 抽查几条排除数据，确认排除原因是否合理")
        sections.append("4. 对比权重变更历史，确认权重参数是否为最新版本")
        sections.append("")

        # 页脚
        sections.append("---")
        sections.append(f"*本报告由「凸包面积参数试算工具」自动生成于 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*")

        return "\n".join(sections)

    def generate_summary_report(
        self,
        result: ConvexHullResult,
        data_manager: DataManager,
        operator: str = "",
    ) -> str:
        """生成简化版报告（用于快速查看）"""
        return self.generate_full_report(
            result=result,
            data_manager=data_manager,
            report_title="凸包面积参数试算-摘要",
            operator=operator,
            include_calculation_trace=False,
            include_raw_data=False,
            include_excluded_data=True,
        )

    def save_report(self, report_content: str, file_path: str) -> str:
        """保存报告到文件"""
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(report_content)
        return file_path

    def generate_batch_report(
        self,
        batch_results: List[tuple],
        data_manager: DataManager,
        report_title: str = "凸包面积批量试算报告",
        operator: str = "",
    ) -> str:
        """
        生成批量试算报告

        batch_results: [(weights_dict, area), ...]
        """
        summary = data_manager.get_data_summary()

        sections = []

        sections.append(f"# {report_title}")
        sections.append("")
        sections.append(f"**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        if operator:
            sections.append(f"**操作人**: {operator}")
        sections.append(f"**数据来源**: {summary['source']}")
        sections.append(f"**试算组合数**: {len(batch_results)}")
        sections.append("")

        sections.append("## 试算结果汇总")
        sections.append("")
        sections.append("| 序号 | X权重 | Y权重 | 凸包面积 |")
        sections.append("|------|-------|-------|----------|")
        for i, (weights, area) in enumerate(batch_results):
            sections.append(f"| {i+1} | {weights.get('x', 1.0):.4f} | {weights.get('y', 1.0):.4f} | {area:.4f} |")
        sections.append("")

        if batch_results:
            max_area = max(batch_results, key=lambda x: x[1])
            min_area = min(batch_results, key=lambda x: x[1])
            sections.append("## 极值分析")
            sections.append("")
            sections.append(f"- **最大面积**: {max_area[1]:.4f} (X权重={max_area[0].get('x', 1.0):.4f}, Y权重={max_area[0].get('y', 1.0):.4f})")
            sections.append(f"- **最小面积**: {min_area[1]:.4f} (X权重={min_area[0].get('x', 1.0):.4f}, Y权重={min_area[0].get('y', 1.0):.4f})")
            sections.append(f"- **面积范围**: {min_area[1]:.4f} ~ {max_area[1]:.4f}")
            sections.append("")

        return "\n".join(sections)

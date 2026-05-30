from typing import List, Optional
from models import (
    BatchResult, SedimentationResult, AnomalyRecord,
    MergeConflict, AnomalyType, BoundaryType
)
from datetime import datetime
import os


class ReportGenerator:
    def __init__(self, batch_result: BatchResult):
        self.result = batch_result
        self.stats = self._get_stats()

    def _get_stats(self) -> dict:
        from batch_processor import BatchProcessor
        processor = BatchProcessor()
        return processor.get_statistics(self.result)

    def _format_velocity(self, velocity: float) -> str:
        if velocity < 1e-6:
            return f"{velocity * 1e6:.4f} μm/s"
        elif velocity < 1e-3:
            return f"{velocity * 1e3:.4f} mm/s"
        else:
            return f"{velocity:.4f} m/s"

    def _format_time(self, seconds: float) -> str:
        if seconds < 60:
            return f"{seconds:.1f} 秒"
        elif seconds < 3600:
            return f"{seconds / 60:.1f} 分钟"
        elif seconds < 86400:
            return f"{seconds / 3600:.1f} 小时"
        else:
            return f"{seconds / 86400:.1f} 天"

    def _format_size(self, meters: float) -> str:
        microns = meters * 1e6
        if microns < 1:
            return f"{meters * 1e9:.2f} nm"
        elif microns < 1000:
            return f"{microns:.2f} μm"
        else:
            return f"{meters * 1000:.2f} mm"

    def _generate_summary(self) -> str:
        s = self.stats
        lines = [
            "# 粒子沉降速度计算报告",
            "",
            f"**处理时间**：{self.result.processed_at.strftime('%Y年%m月%d日 %H:%M:%S')}",
            f"**总记录数**：{s['total_records']} 条",
            "",
            "## 处理概览",
            "",
            "| 类别 | 数量 | 说明 |",
            "|------|------|------|",
            f"| ✅ 正常结果 | {s['normal_results']} | 计算成功，数据在合理范围内 |",
            f"| ⚠️  边界值结果 | {s['boundary_results']} | 计算成功，但数据在模型适用范围边缘，需谨慎使用 |",
            f"| ❌ 异常数据 | {s['anomalies']} | 数据有问题，未参与计算或需人工处理 |",
            f"| 🔄 数据冲突 | {s['merge_conflicts']} | 不同来源数据不一致，需人工确认 |",
            "",
            f"**整体成功率**：{s['success_rate']}",
            ""
        ]

        if s['critical_anomalies'] > 0:
            lines.append(
                f"> ⚠️  **重要提醒**：发现 {s['critical_anomalies']} 条严重异常，"
                f"这些数据完全无法计算，请优先处理。"
            )
            lines.append("")

        return "\n".join(lines)

    def _generate_normal_results(self) -> str:
        if not self.result.normal_results:
            return ""

        lines = [
            "---",
            "",
            "## 一、正常计算结果",
            "",
            "以下数据一切正常，可直接用于后续分析。",
            "",
            "| 样本编号 | 粒径 | 沉降速度 | 沉降1米所需时间 | 雷诺数 | 流态 | 温度 |",
            "|----------|------|----------|----------------|--------|------|------|"
        ]

        for r in self.result.normal_results:
            flow_state = "层流 ✓" if r.is_laminar else "紊流 ⚠️"
            temp = f"{r.temperature:.1f}°C" if r.temperature else "默认20°C"
            lines.append(
                f"| {r.sample_id} | {self._format_size(r.particle_diameter_m)} | "
                f"{self._format_velocity(r.velocity)} | {self._format_time(r.settling_time_1m)} | "
                f"{r.reynolds_number:.4f} | {flow_state} | {temp} |"
            )

        lines.append("")
        return "\n".join(lines)

    def _generate_boundary_results(self) -> str:
        if not self.result.boundary_results:
            return ""

        lines = [
            "---",
            "",
            "## 二、边界值结果（需谨慎使用）",
            "",
            "以下数据虽然算出了结果，但接近或超出了Stokes模型的适用范围。",
            "Stokes定律假设：粒径0.1~1000μm，雷诺数≤1（层流状态）。",
            "",
            "| 样本编号 | 粒径 | 沉降速度 | 边界类型 | 边界说明 |",
            "|----------|------|----------|----------|----------|"
        ]

        for r in self.result.boundary_results:
            if r.boundary_info:
                if r.boundary_info.boundary_type == BoundaryType.LOWER:
                    boundary_type = "低于下限"
                elif r.boundary_info.boundary_type == BoundaryType.UPPER:
                    boundary_type = "高于上限"
                else:
                    boundary_type = "接近边界"

                boundary_note = (
                    f"{r.boundary_info.field_name}={r.boundary_info.value:.2f}, "
                    f"限值={r.boundary_info.limit}"
                )
            else:
                boundary_type = "未知"
                boundary_note = ""

            lines.append(
                f"| {r.sample_id} | {self._format_size(r.particle_diameter_m)} | "
                f"{self._format_velocity(r.velocity)} | {boundary_type} | {boundary_note} |"
            )

        lines.append("")
        lines.append("> 💡 **建议**：边界值结果请结合实验目的酌情使用。如果对精度要求较高，建议复测或使用更适用的模型。")
        lines.append("")
        return "\n".join(lines)

    def _generate_anomaly_section(self, title: str, anomalies: List[AnomalyRecord], icon: str) -> str:
        if not anomalies:
            return ""

        lines = [
            f"### {icon} {title}",
            "",
            f"共 {len(anomalies)} 条：",
            ""
        ]

        for i, a in enumerate(anomalies, 1):
            lines.append(f"**{i}. 样本【{a.sample_id}】**")
            lines.append("")
            lines.append(f"   {a.human_readable_message}")
            lines.append("")

            if a.raw_value and a.expected:
                lines.append(f"   - 你填的：`{a.raw_value}`")
                lines.append(f"   - 正确格式：`{a.expected}`")
                lines.append("")

            if a.source_file and a.line_number > 0:
                lines.append(f"   - 位置：{os.path.basename(a.source_file)} 第{a.line_number}行")
                lines.append("")

        return "\n".join(lines)

    def _generate_anomalies(self) -> str:
        if not self.result.anomalies:
            return ""

        critical = [a for a in self.result.anomalies if a.severity == "critical"]
        missing_unit = [a for a in self.result.anomalies if a.anomaly_type == AnomalyType.MISSING_SIZE_UNIT]
        invalid_unit = [a for a in self.result.anomalies if a.anomaly_type == AnomalyType.INVALID_SIZE_UNIT]
        missing_temp = [a for a in self.result.anomalies if a.anomaly_type == AnomalyType.MISSING_TEMPERATURE]
        duplicate = [a for a in self.result.anomalies if a.anomaly_type == AnomalyType.DUPLICATE_SAMPLE]
        negative = [a for a in self.result.anomalies if a.anomaly_type == AnomalyType.NEGATIVE_VALUE]
        out_of_range = [a for a in self.result.anomalies if a.anomaly_type == AnomalyType.SIZE_OUT_OF_MODEL_RANGE]
        conflicts = [a for a in self.result.anomalies if a.anomaly_type == AnomalyType.MERGE_CONFLICT]
        other = [a for a in self.result.anomalies if a.anomaly_type not in [
            AnomalyType.MISSING_SIZE_UNIT, AnomalyType.INVALID_SIZE_UNIT,
            AnomalyType.MISSING_TEMPERATURE, AnomalyType.DUPLICATE_SAMPLE,
            AnomalyType.NEGATIVE_VALUE, AnomalyType.SIZE_OUT_OF_MODEL_RANGE,
            AnomalyType.MERGE_CONFLICT
        ]]

        lines = [
            "---",
            "",
            "## 三、异常数据说明",
            "",
            "这部分数据因为各种原因没有参与计算。每条都写了人话解释，不用懂代码也能看懂。",
            ""
        ]

        if critical:
            lines.append("> 🔴 **严重异常**：以下问题导致完全无法计算，必须修正后才能重新运行。")
            lines.append("")

        sections = [
            ("粒径单位漏掉了", missing_unit, "📏"),
            ("粒径单位写错了", invalid_unit, "❌"),
            ("实验温度没填", missing_temp, "🌡️"),
            ("样本编号重复", duplicate, "🔢"),
            ("出现了负数", negative, "➖"),
            ("粒径超出范围", out_of_range, "📐"),
            ("数据合并冲突", conflicts, "🔄"),
            ("其他问题", other, "⚠️"),
        ]

        for title, anomalies, icon in sections:
            section = self._generate_anomaly_section(title, anomalies, icon)
            if section:
                lines.append(section)

        lines.append("")
        return "\n".join(lines)

    def _generate_unit_error_explanation(self) -> str:
        unit_errors = [
            a for a in self.result.anomalies
            if a.anomaly_type in (AnomalyType.MISSING_SIZE_UNIT, AnomalyType.INVALID_SIZE_UNIT)
        ]

        if not unit_errors:
            return ""

        lines = [
            "---",
            "",
            "## 附录：为什么粒径单位错了就过不了？",
            "",
            "很多同事问：不就是少写个单位吗？至于算都不让算？",
            "",
            "**简单说：差1个单位，结果差100万倍。**",
            "",
            "沉降速度和粒径的平方成正比：",
            "",
            "> v = g × (ρp - ρl) × d² / (18 × μ)",
            "",
            "举个实际例子：",
            "",
            "| 你以为的 | 实际写成 | 换算后 | 沉降速度 | 差多少倍 |",
            "|----------|----------|--------|----------|----------|",
            "| 10 微米 | 10 （没写单位，不知道是啥） | ？ | 算不出来 | - |",
            "| 10 微米 | 10 毫米 | 10000 微米 | v × 1,000,000 | 100万倍 |",
            "| 10 微米 | 10 纳米 | 0.01 微米 | v ÷ 1,000,000 | 100万倍 |",
            "",
            "**看到了吧？单位错一个，结果差一百万倍。**",
            "",
            "如果系统不拦着，用错的数据去做环保实验，后面的沉降时间、去除效率、设备选型",
            "全会错，等到发现时可能已经过去好几天，所有实验都得返工。",
            "",
            "**常见坑：**",
            "",
            "1. **`um` vs `μm`**：前者是英文字母u，后者是希腊字母μ（读音：miu）。",
            "   系统只认`μm`，不认`um`。复制粘贴时注意。",
            "",
            "2. **漏掉单位**：只写`10`，不写`10μm`。系统猜不出来你说的是啥。",
            "",
            "3. **中文单位**：写了`10微米`可以，但最好统一用符号`μm`。",
            "",
            f"**本次共发现 {len(unit_errors)} 条粒径单位相关错误：**",
            ""
        ]

        for i, a in enumerate(unit_errors, 1):
            lines.append(f"{i}. 样本【{a.sample_id}】：{a.human_readable_message.split('（')[0]}")

        lines.append("")
        lines.append("> 修正方法：在粒径数值后面加上正确的单位符号（μm、mm、nm、m）即可。")
        lines.append("")
        return "\n".join(lines)

    def _generate_conflicts(self) -> str:
        if not self.result.merge_conflicts:
            return ""

        lines = [
            "---",
            "",
            "## 四、数据合并冲突（需人工确认）",
            "",
            "以下样本的颗粒数据和液体数据由不同人员维护，合并时发现不一致。",
            "**系统不会悄悄选一边**，请相关同事一起确认哪个数据是对的。",
            "",
            "| 样本编号 | 冲突字段 | 颗粒数据的值 | 颗粒维护者 | 液体数据的值 | 液体维护者 | 说明 |",
            "|----------|----------|--------------|------------|--------------|------------|------|"
        ]

        for c in self.result.merge_conflicts:
            p_val = f"{c.particle_value:.4f}" if c.particle_value is not None else "无"
            l_val = f"{c.liquid_value:.4f}" if c.liquid_value is not None else "无"

            field_map = {
                "liquid_density": "液体密度(kg/m³)",
                "temperature": "温度(°C)",
                "density_relationship": "密度关系"
            }
            field_name = field_map.get(c.field_name, c.field_name)

            lines.append(
                f"| {c.sample_id} | {field_name} | {p_val} | {c.particle_source} | "
                f"{l_val} | {c.liquid_source} | 见下方说明 |"
            )

        lines.append("")
        lines.append("### 详细说明")
        lines.append("")

        for i, c in enumerate(self.result.merge_conflicts, 1):
            lines.append(f"**{i}. 样本【{c.sample_id}】**")
            lines.append("")
            lines.append(f"   {c.resolution_note}")
            lines.append("")

        lines.append("")
        return "\n".join(lines)

    def _generate_recommendation(self) -> str:
        s = self.stats
        lines = [
            "---",
            "",
            "## 五、下一步建议",
            ""
        ]

        if s['critical_anomalies'] > 0:
            lines.append(f"1. 🔴 **优先处理**：修正 {s['critical_anomalies']} 条严重异常（主要是粒径单位问题）")
        if s['warning_anomalies'] > 0:
            lines.append(f"2. ⚠️  尽快处理：确认 {s['warning_anomalies']} 条警告（温度缺失、样本重复等）")
        if s['merge_conflicts'] > 0:
            lines.append(f"3. 🔄 协调处理：请颗粒和液体数据维护者一起确认 {s['merge_conflicts']} 处数据冲突")
        if s['boundary_results'] > 0:
            lines.append(f"4. 📐 评估使用：{s['boundary_results']} 条边界值结果请结合实验目的评估是否可用")

        if s['normal_results'] == s['total_records']:
            lines.append("🎉 恭喜！所有数据一次性通过，无异常。")

        lines.append("")
        lines.append("---")
        lines.append("")
        lines.append("*本报告由沉降计算系统自动生成，如有疑问请联系数据维护团队。*")
        lines.append("")

        return "\n".join(lines)

    def generate_report(self, include_unit_explanation: bool = True) -> str:
        parts = [
            self._generate_summary(),
            self._generate_normal_results(),
            self._generate_boundary_results(),
            self._generate_anomalies(),
            self._generate_conflicts(),
            self._generate_unit_error_explanation() if include_unit_explanation else "",
            self._generate_recommendation()
        ]

        return "\n".join(p for p in parts if p)

    def save_report(self, output_path: str, include_unit_explanation: bool = True) -> str:
        report = self.generate_report(include_unit_explanation)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(report)
        return output_path

    def generate_monthly_summary(self, month: str, total_batches: int) -> str:
        s = self.stats
        lines = [
            f"# {month} 沉降计算月度复盘",
            "",
            f"- 总批次数：{total_batches}",
            f"- 总记录数：{s['total_records']}",
            f"- 正常率：{s['success_rate']}",
            f"- 平均异常率：{s['anomalies'] / s['total_records'] * 100:.1f}%" if s['total_records'] > 0 else "",
            "",
            "## 本月异常类型统计",
            ""
        ]

        for anomaly_type, count in s['anomaly_by_type'].items():
            type_name_map = {
                'missing_size_unit': '粒径单位缺失',
                'invalid_size_unit': '粒径单位错误',
                'missing_temperature': '温度缺失',
                'duplicate_sample': '样本重复',
                'negative_value': '负值错误',
                'size_out_of_model_range': '粒径超出范围',
                'merge_conflict': '数据冲突'
            }
            name = type_name_map.get(anomaly_type, anomaly_type)
            lines.append(f"- {name}：{count} 次")

        lines.append("")
        lines.append("## 改进建议")
        lines.append("")
        if s['anomaly_by_type'].get('missing_size_unit', 0) > 0:
            lines.append("- 建议在数据录入模板中增加单位必填校验")
        if s['anomaly_by_type'].get('missing_temperature', 0) > 0:
            lines.append("- 建议实验记录本增加温度字段的必填提示")
        if s['anomaly_by_type'].get('merge_conflict', 0) > 0:
            lines.append("- 建议颗粒和液体数据维护者建立定期同步机制")

        return "\n".join(lines)

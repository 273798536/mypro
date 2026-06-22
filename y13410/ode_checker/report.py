import os
import numpy as np
from datetime import datetime


class ReportGenerator:
    """生成验算报告

    报告里要写清楚：
    - 哪些过了，哪些没过
    - 外推越界的，为什么放行（避免以后被当成普通样本）
    - 撤回的、旧版的、草稿的，各有多少（心里有数）
    """

    def __init__(self, error_analyzer):
        self.analyzer = error_analyzer

    def generate_record_report(self, record):
        """给单条记录生成文字报告"""
        result = record.get("result", {})
        t = np.array(result.get("t_values", []))
        y_approx = np.array(result.get("y_values", []))
        y_exact = np.array(result.get("exact_values", []))

        lines = []
        lines.append("=" * 60)
        lines.append(f"  验算报告：{record.get('title', '未命名')}")
        lines.append("=" * 60)
        lines.append(f"  记录 ID : {record['id']}")
        lines.append(f"  版本    : v{record.get('version', 1)}")
        lines.append(f"  状态    : {self._status_label(record.get('status', 'active'))}")
        lines.append(f"  方程    : {record.get('equation', '')}")
        lines.append(f"  初值    : y({record.get('initial_condition', {}).get('t0', 0)}) = "
                     f"{record.get('initial_condition', {}).get('y0', 0)}")
        lines.append(f"  方法    : {record.get('method', '')}")
        lines.append(f"  步长    : {record.get('dt', '')}")
        lines.append(f"  区间    : {record.get('t_span', [])}")
        lines.append("-" * 60)

        # 误差分析
        if len(t) > 0 and len(y_exact) > 0:
            _, abs_err = self.analyzer.absolute_error(t, y_approx, y_exact)
            _, rel_err = self.analyzer.relative_error(t, y_approx, y_exact)
            max_t, max_err = self.analyzer.max_absolute_error(t, y_approx, y_exact)

            lines.append("  【误差情况】")
            lines.append(f"    最大绝对误差 : {max_err:.6e} (在 t = {max_t:.4f})")
            lines.append(f"    平均绝对误差 : {np.mean(abs_err):.6e}")
            lines.append(f"    阈值（及格线）: {self.analyzer.threshold}")

            violations = self.analyzer.check_threshold(t, y_approx, y_exact)
            if violations:
                lines.append(f"    ⚠ 超过阈值的点: {len(violations)} 个")
                for v in violations[:5]:
                    lines.append(f"      - t={v['t']:.4f}, 绝对误差={v['abs_error']:.6f}")
                if len(violations) > 5:
                    lines.append(f"      ... 还有 {len(violations) - 5} 个")
            else:
                lines.append(f"    ✓ 全部在阈值以内")

            # 误差传播估计
            prop = self.analyzer.error_propagation_estimate(
                record.get("method", "euler"),
                record.get("dt", 0.01),
                record.get("t_span", [0, 1])[1],
            )
            lines.append("")
            lines.append("  【误差传播参考】")
            lines.append(f"    {prop['explanation']}")
        else:
            lines.append("  【误差情况】无精确解数据，跳过")

        # 外推越界检查
        extrap_info = record.get("extrapolation_info")
        if extrap_info and extrap_info.get("limit") is not None:
            limit = extrap_info["limit"]
            t_values = result.get("t_values", [])
            t_max = float(t_values[-1]) if t_values else extrap_info.get("t_max")
            points_outside = sum(1 for ti in t_values if ti > limit) if t_values else extrap_info.get("points_outside")
            has_extrapolation = (t_max is not None and t_max > limit) or extrap_info.get("has_extrapolation", False)

            if has_extrapolation:
                lines.append("")
                lines.append("  【外推越界】⚠ 存在外推")
                lines.append(f"    题目范围边界: t ≤ {limit}")
                if t_max is not None:
                    lines.append(f"    实际计算到  : t = {t_max}")
                if points_outside is not None:
                    lines.append(f"    越界点数    : {points_outside}")

                if extrap_info.get("released"):
                    lines.append("    状态: 已放行（非普通样本！）")
                    lines.append("    放行条件:")
                    for i, cond in enumerate(extrap_info.get("release_conditions", []), 1):
                        lines.append(f"      {i}. {cond}")
                else:
                    lines.append("    状态: 未放行，需复核")

        # 备注
        notes = record.get("notes")
        if notes and notes.strip():
            lines.append("")
            lines.append("  【备注】")
            for line in notes.strip().split("\n"):
                lines.append(f"    {line}")

        # 撤回原因
        if record.get("status") == "withdrawn":
            lines.append("")
            lines.append(f"  【撤回原因】{record.get('withdrawn_reason', '未说明')}")

        lines.append("")
        lines.append("=" * 60)
        lines.append(f"  生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("=" * 60)

        return "\n".join(lines)

    def generate_summary_report(self, records):
        """给一堆记录生成汇总报告"""
        lines = []
        lines.append("=" * 60)
        lines.append("  课堂验算汇总报告")
        lines.append("=" * 60)

        by_status = {}
        for r in records:
            s = r.get("status", "active")
            by_status[s] = by_status.get(s, 0) + 1

        lines.append("")
        lines.append("  【记录统计】")
        for status, count in sorted(by_status.items()):
            lines.append(f"    {self._status_label(status)}: {count} 条")
        lines.append(f"    合计: {len(records)} 条")

        # 挑出有问题的
        lines.append("")
        lines.append("  【需要留意的】")
        has_issues = False
        for r in records:
            if r.get("status") == "withdrawn":
                has_issues = True
                lines.append(f"    - [撤回] {r.get('title', '')}")
            if r.get("status") == "draft":
                has_issues = True
                lines.append(f"    - [草稿] {r.get('title', '')}")
            if r.get("extrapolation_info"):
                has_issues = True
                released = r["extrapolation_info"].get("released", False)
                label = "已放行" if released else "待复核"
                lines.append(f"    - [外推-{label}] {r.get('title', '')}")

        if not has_issues:
            lines.append("    （没有特别需要留意的）")

        lines.append("")
        lines.append("=" * 60)
        lines.append(f"  生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("=" * 60)

        return "\n".join(lines)

    def save_report(self, report_text, filepath):
        """保存报告到文件"""
        os.makedirs(os.path.dirname(filepath) if os.path.dirname(filepath) else ".", exist_ok=True)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(report_text)
        return filepath

    @staticmethod
    def _status_label(status):
        """状态的中文标签，看着清楚"""
        labels = {
            "active": "正常",
            "withdrawn": "已撤回",
            "draft": "草稿",
            "legacy": "旧版",
            "superseded": "已被取代",
        }
        return labels.get(status, status)

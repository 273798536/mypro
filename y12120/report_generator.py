import os
import json
import csv
import numpy as np
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import asdict

from data_layer import DataManager, DataSource
from core import trapezoidal_rule, simpsons_rule, generate_function_from_expr
from error_analysis import perform_error_analysis, ErrorStatus


class DetailExporter:
    def __init__(self, output_dir: str = "./output/data"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def _get_filename(self, data_hash: str, suffix: str, ext: str) -> str:
        return f"{suffix}_{data_hash[:12]}.{ext}"

    def generate_detail_data(self, unified_data: Dict) -> Dict:
        f = unified_data['f']
        a = unified_data['a']
        b = unified_data['b']
        n = unified_data['n']
        data_hash = unified_data['data_hash']

        trap_result, x_trap, y_trap = trapezoidal_rule(f, a, b, n)
        simp_result, x_simp, y_simp = simpsons_rule(f, a, b, n)

        x_fine = np.linspace(a, b, 200)
        y_fine = f(x_fine)

        trap_detail = []
        for i in range(len(x_trap) - 1):
            h = x_trap[i + 1] - x_trap[i]
            area = h * (y_trap[i] + y_trap[i + 1]) / 2
            trap_detail.append({
                'interval_index': i + 1,
                'x_i': float(x_trap[i]),
                'x_i+1': float(x_trap[i + 1]),
                'f(x_i)': float(y_trap[i]),
                'f(x_i+1)': float(y_trap[i + 1]),
                'h': float(h),
                'trapezoid_area': float(area)
            })

        simp_detail = []
        for i in range(0, len(x_simp) - 1, 2):
            h = x_simp[i + 1] - x_simp[i]
            x0, x1, x2 = x_simp[i], x_simp[i + 1], x_simp[i + 2]
            y0, y1, y2 = y_simp[i], y_simp[i + 1], y_simp[i + 2]
            area = (h / 3) * (y0 + 4 * y1 + y2)
            simp_detail.append({
                'pair_index': (i // 2) + 1,
                'x_i': float(x0),
                'x_i+1': float(x1),
                'x_i+2': float(x2),
                'f(x_i)': float(y0),
                'f(x_i+1)': float(y1),
                'f(x_i+2)': float(y2),
                'h': float(h),
                'parabola_area': float(area)
            })

        detail = {
            'data_id': unified_data['data_id'],
            'data_hash': data_hash,
            'version': unified_data['version'],
            'generated_at': datetime.now().isoformat(),
            'function': {
                'expression': unified_data['function_expr'],
                'a': a,
                'b': b,
                'n': n,
                'h': unified_data['h']
            },
            'exact_value': unified_data.get('exact_value'),
            'exact_value_source': unified_data.get('exact_value_source', ''),
            'trapezoidal': {
                'total_integral': float(trap_result),
                'x_points': x_trap.tolist(),
                'y_points': y_trap.tolist(),
                'interval_details': trap_detail
            },
            'simpsons': {
                'total_integral': float(simp_result),
                'x_points': x_simp.tolist(),
                'y_points': y_simp.tolist(),
                'pair_details': simp_detail
            },
            'curve_data': {
                'x_fine': x_fine.tolist(),
                'y_fine': y_fine.tolist()
            },
            'has_changes': unified_data['has_changes'],
            'change_history': unified_data['change_history']
        }

        return detail

    def export_json(self, detail_data: Dict, data_hash: str) -> str:
        filename = self._get_filename(data_hash, "detail", "json")
        filepath = os.path.join(self.output_dir, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(detail_data, f, ensure_ascii=False, indent=2, default=str)
        return filepath

    def export_csv(self, detail_data: Dict, data_hash: str) -> Dict[str, str]:
        filepaths = {}

        trap_filename = self._get_filename(data_hash, "trapezoidal_detail", "csv")
        trap_filepath = os.path.join(self.output_dir, trap_filename)
        with open(trap_filepath, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow(['区间序号', 'x_i', 'x_i+1', 'f(x_i)', 'f(x_i+1)', '步长h', '梯形面积'])
            for d in detail_data['trapezoidal']['interval_details']:
                writer.writerow([
                    d['interval_index'],
                    f"{d['x_i']:.8f}",
                    f"{d['x_i+1']:.8f}",
                    f"{d['f(x_i)']:.8f}",
                    f"{d['f(x_i+1)']:.8f}",
                    f"{d['h']:.8f}",
                    f"{d['trapezoid_area']:.10f}"
                ])
            writer.writerow([])
            writer.writerow(['梯形公式总和', '', '', '', '', '',
                           f"{detail_data['trapezoidal']['total_integral']:.10f}"])
            if detail_data.get('exact_value') is not None:
                error = abs(detail_data['trapezoidal']['total_integral'] - detail_data['exact_value'])
                writer.writerow(['精确值', '', '', '', '', '', f"{detail_data['exact_value']:.10f}"])
                writer.writerow(['绝对误差', '', '', '', '', '', f"{error:.2e}"])
        filepaths['trapezoidal'] = trap_filepath

        simp_filename = self._get_filename(data_hash, "simpsons_detail", "csv")
        simp_filepath = os.path.join(self.output_dir, simp_filename)
        with open(simp_filepath, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow(['子区间对序号', 'x_i', 'x_i+1', 'x_i+2', 'f(x_i)', 'f(x_i+1)', 'f(x_i+2)', '步长h', '抛物面积'])
            for d in detail_data['simpsons']['pair_details']:
                writer.writerow([
                    d['pair_index'],
                    f"{d['x_i']:.8f}",
                    f"{d['x_i+1']:.8f}",
                    f"{d['x_i+2']:.8f}",
                    f"{d['f(x_i)']:.8f}",
                    f"{d['f(x_i+1)']:.8f}",
                    f"{d['f(x_i+2)']:.8f}",
                    f"{d['h']:.8f}",
                    f"{d['parabola_area']:.10f}"
                ])
            writer.writerow([])
            writer.writerow(['辛普森公式总和', '', '', '', '', '', '', '',
                           f"{detail_data['simpsons']['total_integral']:.10f}"])
            if detail_data.get('exact_value') is not None:
                error = abs(detail_data['simpsons']['total_integral'] - detail_data['exact_value'])
                writer.writerow(['精确值', '', '', '', '', '', '', '', f"{detail_data['exact_value']:.10f}"])
                writer.writerow(['绝对误差', '', '', '', '', '', '', '', f"{error:.2e}"])
        filepaths['simpsons'] = simp_filepath

        summary_filename = self._get_filename(data_hash, "summary", "csv")
        summary_filepath = os.path.join(self.output_dir, summary_filename)
        with open(summary_filepath, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow(['项目', '内容'])
            writer.writerow(['函数表达式', detail_data['function']['expression']])
            writer.writerow(['区间左端点a', detail_data['function']['a']])
            writer.writerow(['区间右端点b', detail_data['function']['b']])
            writer.writerow(['区间数n', detail_data['function']['n']])
            writer.writerow(['步长h', f"{detail_data['function']['h']:.8f}"])
            writer.writerow([])
            writer.writerow(['梯形公式近似值', f"{detail_data['trapezoidal']['total_integral']:.10f}"])
            writer.writerow(['辛普森公式近似值', f"{detail_data['simpsons']['total_integral']:.10f}"])
            if detail_data.get('exact_value') is not None:
                writer.writerow(['精确值', f"{detail_data['exact_value']:.10f}"])
                writer.writerow(['梯形绝对误差', f"{abs(detail_data['trapezoidal']['total_integral'] - detail_data['exact_value']):.2e}"])
                writer.writerow(['辛普森绝对误差', f"{abs(detail_data['simpsons']['total_integral'] - detail_data['exact_value']):.2e}"])
            writer.writerow([])
            writer.writerow(['数据ID', detail_data['data_id']])
            writer.writerow(['数据HASH', detail_data['data_hash']])
            writer.writerow(['版本', detail_data['version']])
            writer.writerow(['生成时间', detail_data['generated_at']])
            writer.writerow(['结论有改动', '是' if detail_data['has_changes'] else '否'])
        filepaths['summary'] = summary_filepath

        return filepaths

    def export_all(self, unified_data: Dict) -> Dict:
        detail_data = self.generate_detail_data(unified_data)
        data_hash = unified_data['data_hash']

        result = {
            'detail_data': detail_data,
            'json_file': self.export_json(detail_data, data_hash),
            'csv_files': self.export_csv(detail_data, data_hash)
        }
        return result


class ReportGenerator:
    def __init__(self, output_dir: str = "./output/reports"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        self.detail_exporter = DetailExporter(output_dir.replace('/reports', '/data'))

    def generate_error_report(
        self,
        unified_data: Dict,
        charts: Dict[str, str],
        csv_files: Dict[str, str],
        json_file: str
    ) -> str:
        data_id = unified_data['data_id']
        data_hash = unified_data['data_hash']
        version = unified_data['version']

        ee = unified_data.get('error_estimate', {})
        has_changes = unified_data['has_changes']
        change_history = unified_data['change_history']

        filename = f"error_report_{data_hash[:12]}_v{version}.md"
        filepath = os.path.join(self.output_dir, filename)

        status = ee.get('status', '未知')
        action = ee.get('action', '无')

        now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        report_lines = []

        report_lines.append(f"# 积分近似误差分析报告")
        report_lines.append("")
        report_lines.append(f"**生成时间**: {now}")
        report_lines.append(f"**数据ID**: `{data_id}`")
        report_lines.append(f"**数据哈希**: `{data_hash}`")
        report_lines.append(f"**版本**: v{version}")
        if has_changes:
            report_lines.append(f"**⚠ 结论已被修改**: 此报告包含已更新的精确值或误差估计")
        report_lines.append("")

        report_lines.append("## 一、问题概述")
        report_lines.append("")
        report_lines.append("本报告用于分析数值积分方法（梯形公式、辛普森公式）的近似误差，")
        report_lines.append("帮助学生理解步长选择对计算精度的影响。")
        report_lines.append("")

        report_lines.append("## 二、计算参数")
        report_lines.append("")
        report_lines.append("| 参数 | 值 |")
        report_lines.append("|------|-----|")
        report_lines.append(f"| 函数表达式 | `{unified_data['function_expr']}` |")
        report_lines.append(f"| 积分区间 | [{unified_data['a']}, {unified_data['b']}] |")
        report_lines.append(f"| 区间数 n | {unified_data['n']} |")
        report_lines.append(f"| 步长 h | {unified_data['h']:.8f} |")
        if unified_data.get('exact_value') is not None:
            report_lines.append(f"| 精确值 | {unified_data['exact_value']:.10f} |")
            report_lines.append(f"| 精确值来源 | {unified_data.get('exact_value_source', '未指定')} |")
        else:
            report_lines.append(f"| 精确值 | [待补录] |")
        report_lines.append("")

        report_lines.append("## 三、计算状态")
        report_lines.append("")
        report_lines.append(f"**状态**: {status}")
        report_lines.append(f"**建议动作**: {action}")
        report_lines.append("")

        if ee.get('notes'):
            report_lines.append("### 检测到的问题")
            report_lines.append("")
            for note in ee['notes']:
                report_lines.append(f"- ⚠ {note}")
            report_lines.append("")

        report_lines.append("## 四、数值积分结果")
        report_lines.append("")
        report_lines.append("| 方法 | 近似值 | 绝对误差 | 相对误差 |")
        report_lines.append("|------|--------|----------|----------|")

        trap_approx = ee.get('trapezoidal_approx', float('nan'))
        simp_approx = ee.get('simpsons_approx', float('nan'))
        trap_error = ee.get('trapezoidal_error')
        simp_error = ee.get('simpsons_error')
        trap_rel = ee.get('trapezoidal_relative_error')
        simp_rel = ee.get('simpsons_relative_error')

        trap_error_str = f"{trap_error:.2e}" if trap_error is not None else "待补录精确值"
        simp_error_str = f"{simp_error:.2e}" if simp_error is not None else "待补录精确值"
        trap_rel_str = f"{trap_rel:.2e}" if trap_rel is not None else "待补录精确值"
        simp_rel_str = f"{simp_rel:.2e}" if simp_rel is not None else "待补录精确值"

        report_lines.append(f"| 梯形公式 | {trap_approx:.10f} | {trap_error_str} | {trap_rel_str} |")
        report_lines.append(f"| 辛普森公式 | {simp_approx:.10f} | {simp_error_str} | {simp_rel_str} |")
        report_lines.append("")

        if ee.get('trapezoidal_theoretical_bound') or ee.get('simpsons_theoretical_bound'):
            report_lines.append("### 理论误差界")
            report_lines.append("")
            if ee.get('trapezoidal_theoretical_bound'):
                report_lines.append(f"- 梯形公式理论误差上界: {ee['trapezoidal_theoretical_bound']:.2e}")
            if ee.get('simpsons_theoretical_bound'):
                report_lines.append(f"- 辛普森公式理论误差上界: {ee['simpsons_theoretical_bound']:.2e}")
            report_lines.append("")

        report_lines.append("## 五、误差分析与曲线对比")
        report_lines.append("")
        report_lines.append("### 5.1 曲线对比图")
        report_lines.append("")
        report_lines.append("下图展示了梯形公式和辛普森公式如何用分段多项式逼近原函数曲线：")
        report_lines.append("")
        if 'curve_comparison' in charts:
            report_lines.append(f"![曲线对比]({charts['curve_comparison']})")
        report_lines.append("")
        report_lines.append("- **左图（梯形公式）**：用分段线性函数逼近，误差为 O(h²)")
        report_lines.append("- **右图（辛普森公式）**：用分段二次多项式（抛物线）逼近，误差为 O(h⁴)")
        report_lines.append("")

        if 'error_vs_stepsize' in charts:
            report_lines.append("### 5.2 误差-步长关系")
            report_lines.append("")
            report_lines.append("下图展示了步长减小时误差的收敛行为：")
            report_lines.append("")
            report_lines.append(f"![误差-步长关系]({charts['error_vs_stepsize']})")
            report_lines.append("")
            report_lines.append("#### 关键观察：")
            report_lines.append("")
            report_lines.append("1. **双对数图（左）**：")
            report_lines.append("   - 梯形公式误差直线斜率 ≈ 2，验证 E_T ∝ h²")
            report_lines.append("   - 辛普森公式误差直线斜率 ≈ 4，验证 E_S ∝ h⁴")
            report_lines.append("   - 斜率越接近理论值，收敛行为越符合预期")
            report_lines.append("")
            report_lines.append("2. **收敛过程（右）**：")
            report_lines.append("   - 可见随步长减小，两种方法的近似值逐渐逼近精确值")
            report_lines.append("   - 辛普森公式收敛速度明显快于梯形公式")
            report_lines.append("")

        if 'convergence_table' in charts:
            report_lines.append("### 5.3 收敛阶分析表")
            report_lines.append("")
            report_lines.append("通过逐步减半步长，可以观察误差的衰减比例：")
            report_lines.append("")
            report_lines.append(f"![收敛阶分析]({charts['convergence_table']})")
            report_lines.append("")

        if 'status_summary' in charts:
            report_lines.append("## 六、状态汇总")
            report_lines.append("")
            report_lines.append(f"![状态汇总]({charts['status_summary']})")
            report_lines.append("")

        if has_changes and change_history:
            report_lines.append("## 七、修改历史")
            report_lines.append("")
            report_lines.append("以下结论字段在此报告版本中被修改过：")
            report_lines.append("")
            report_lines.append("| 字段 | 原值 | 新值 | 修改人 | 时间 | 备注 |")
            report_lines.append("|------|------|------|--------|------|------|")
            for ch in change_history:
                if ch.get('field') in ['exact_value', 'error_estimate']:
                    old = ch.get('old_value', '-')
                    new = ch.get('new_value', '-')
                    if isinstance(old, (int, float)):
                        old = f"{old:.8f}"
                    if isinstance(new, (int, float)):
                        new = f"{new:.8f}"
                    report_lines.append(f"| {ch.get('field', '')} | {old} | {new} | {ch.get('changed_by', '')} | {ch.get('timestamp', '')[:19]} | {ch.get('comment', '')} |")
            report_lines.append("")

        report_lines.append("## 八、附录：数据来源说明")
        report_lines.append("")
        report_lines.append("本报告的所有图表、明细数据、下载文件均来自同一批计算数据，")
        report_lines.append(f"数据哈希为 `{data_hash}`。")
        report_lines.append("")
        report_lines.append("### 可下载数据文件")
        report_lines.append("")
        report_lines.append(f"- **完整明细 (JSON)**: [{os.path.basename(json_file)}]({json_file})")
        if 'summary' in csv_files:
            report_lines.append(f"- **汇总表 (CSV)**: [{os.path.basename(csv_files['summary'])}]({csv_files['summary']})")
        if 'trapezoidal' in csv_files:
            report_lines.append(f"- **梯形公式明细 (CSV)**: [{os.path.basename(csv_files['trapezoidal'])}]({csv_files['trapezoidal']})")
        if 'simpsons' in csv_files:
            report_lines.append(f"- **辛普森公式明细 (CSV)**: [{os.path.basename(csv_files['simpsons'])}]({csv_files['simpsons']})")
        report_lines.append("")

        report_lines.append("### 数值积分计算说明")
        report_lines.append("")
        report_lines.append("1. **梯形公式**：")
        report_lines.append("   - 公式：∫ₐᵇ f(x)dx ≈ h/2 [f(x₀) + 2f(x₁) + 2f(x₂) + ... + 2f(xₙ₋₁) + f(xₙ)]")
        report_lines.append("   - 误差：|E_T| ≤ (b-a)/12 · h² · max|f''(x)|")
        report_lines.append("")
        report_lines.append("2. **辛普森公式**（要求 n 为偶数）：")
        report_lines.append("   - 公式：∫ₐᵇ f(x)dx ≈ h/3 [f(x₀) + 4f(x₁) + 2f(x₂) + 4f(x₃) + ... + 4f(xₙ₋₁) + f(xₙ)]")
        report_lines.append("   - 误差：|E_S| ≤ (b-a)/180 · h⁴ · max|f⁽⁴⁾(x)|")
        report_lines.append("")
        report_lines.append("---")
        report_lines.append(f"*报告生成完成 - {now}*")

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write('\n'.join(report_lines))

        return filepath

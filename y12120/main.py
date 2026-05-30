import os
import sys
import argparse
import numpy as np
from typing import Optional, List

from data_layer import DataManager
from core import generate_function_from_expr
from error_analysis import perform_error_analysis, ErrorStatus
from visualization import ChartGenerator
from report_generator import DetailExporter, ReportGenerator


class IntegrationErrorPanel:
    def __init__(self, base_dir: str = "."):
        self.data_manager = DataManager(os.path.join(base_dir, "data"))
        self.chart_generator = ChartGenerator(os.path.join(base_dir, "output", "charts"))
        self.detail_exporter = DetailExporter(os.path.join(base_dir, "output", "data"))
        self.report_generator = ReportGenerator(os.path.join(base_dir, "output", "reports"))

    def submit_calculation(
        self,
        function_expr: str,
        a: float,
        b: float,
        n: int,
        exact_value: Optional[float] = None,
        exact_value_source: str = "",
        tags: Optional[List[str]] = None
    ) -> str:
        ds = self.data_manager.create_data_source(
            function_expr=function_expr,
            a=a,
            b=b,
            n=n,
            exact_value=exact_value,
            exact_value_source=exact_value_source,
            tags=tags
        )

        f, _ = generate_function_from_expr(function_expr)
        error_est = perform_error_analysis(f, a, b, n, exact_value)
        self.data_manager.update_error_estimate(ds.data_id, error_est)

        print(f"✓ 计算任务已提交，数据ID: {ds.data_id}")
        print(f"  状态: {error_est.status.value}")
        if error_est.status != ErrorStatus.OK:
            print(f"  建议动作: {error_est.action.value}")
        print(f"  版本: v{ds.version}")

        return ds.data_id

    def update_exact_value(
        self,
        data_id: str,
        exact_value: float,
        exact_value_source: str = "",
        changed_by: str = "助教",
        comment: str = ""
    ) -> bool:
        ds = self.data_manager.update_exact_value(
            data_id, exact_value, exact_value_source, changed_by, comment
        )

        unified = self.data_manager.get_unified_data(data_id)
        f = unified['f']
        error_est = perform_error_analysis(
            f, unified['a'], unified['b'], unified['n'], exact_value
        )
        self.data_manager.update_error_estimate(data_id, error_est)

        has_changes = self.data_manager.has_conclusions_changed(data_id)

        print(f"✓ 精确值已更新，数据ID: {data_id}")
        print(f"  新版本: v{ds.version}")
        print(f"  结论有改动: {'是' if has_changes else '否'}")
        if has_changes:
            changes = self.data_manager.get_conclusions_modified_fields(data_id)
            print(f"  修改记录: {len(changes)} 处改动")
            for ch in changes:
                print(f"    - {ch.field}: {ch.old_value} → {ch.new_value} ({ch.changed_by})")

        return True

    def generate_outputs(self, data_id: str, n_values: Optional[List[int]] = None) -> dict:
        unified = self.data_manager.get_unified_data(data_id)

        print(f"正在生成输出，数据ID: {data_id}")
        print(f"  数据哈希: {unified['data_hash']}")

        charts = self.chart_generator.generate_all_charts(unified, n_values)
        print(f"  已生成 {len(charts)} 张图表:")
        for name, path in charts.items():
            print(f"    - {name}: {os.path.basename(path)}")

        export_result = self.detail_exporter.export_all(unified)
        self.data_manager.update_detail_data(data_id, export_result['detail_data'])
        print(f"  已生成明细数据文件:")
        print(f"    - JSON: {os.path.basename(export_result['json_file'])}")
        for name, path in export_result['csv_files'].items():
            print(f"    - CSV ({name}): {os.path.basename(path)}")

        report_path = self.report_generator.generate_error_report(
            unified, charts, export_result['csv_files'], export_result['json_file']
        )
        print(f"  已生成报告: {os.path.basename(report_path)}")

        return {
            'unified_data': unified,
            'charts': charts,
            'detail_data': export_result['detail_data'],
            'json_file': export_result['json_file'],
            'csv_files': export_result['csv_files'],
            'report_file': report_path
        }

    def get_status(self, data_id: str) -> dict:
        ds = self.data_manager.get_data_source(data_id)
        if not ds:
            return {'error': '数据不存在'}

        unified = self.data_manager.get_unified_data(data_id)
        ee = unified.get('error_estimate', {})

        return {
            'data_id': data_id,
            'version': ds.version,
            'function_expr': ds.function_expr,
            'interval': [ds.a, ds.b],
            'n': ds.n,
            'step_size': unified['h'],
            'exact_value': ds.exact_value,
            'status': ee.get('status'),
            'action': ee.get('action'),
            'trapezoidal_approx': ee.get('trapezoidal_approx'),
            'simpsons_approx': ee.get('simpsons_approx'),
            'has_changes': unified['has_changes'],
            'created_at': ds.created_at,
            'modified_at': ds.modified_at
        }

    def list_all(self) -> list:
        sources = self.data_manager.list_all_data_sources()
        result = []
        for ds in sources:
            result.append({
                'data_id': ds.data_id,
                'function_expr': ds.function_expr,
                'interval': [ds.a, ds.b],
                'n': ds.n,
                'version': ds.version,
                'has_exact_value': ds.exact_value is not None,
                'has_changes': self.data_manager.has_conclusions_changed(ds.data_id),
                'created_at': ds.created_at[:19]
            })
        return result

    def run_full_demo(self):
        print("=" * 70)
        print("  积分近似误差分析面板 - 完整演示")
        print("=" * 70)
        print()

        examples = [
            {
                'name': '正常案例 - 光滑函数',
                'expr': 'exp(x)',
                'a': 0, 'b': 1, 'n': 8,
                'exact_value': np.e - 1,
                'exact_source': '解析积分 ∫e^x dx = e^x'
            },
            {
                'name': '步长过大案例',
                'expr': 'sin(10*x)',
                'a': 0, 'b': 1, 'n': 4,
                'exact_value': (1 - np.cos(10)) / 10,
                'exact_source': '解析积分'
            },
            {
                'name': '区间反向案例',
                'expr': 'x**2',
                'a': 2, 'b': 0, 'n': 8,
                'exact_value': -8/3,
                'exact_source': '∫x²dx 从2到0'
            },
            {
                'name': '奇点附近案例',
                'expr': '1/sqrt(x)',
                'a': 0, 'b': 1, 'n': 16,
                'exact_value': 2,
                'exact_source': '∫x^(-1/2)dx = 2√x'
            }
        ]

        all_ids = []

        for i, example in enumerate(examples, 1):
            print(f"【示例 {i}/{len(examples)}】{example['name']}")
            print("-" * 70)
            print(f"  函数: f(x) = {example['expr']}")
            print(f"  区间: [{example['a']}, {example['b']}]")
            print(f"  初始 n: {example['n']}")
            print()

            print("  步骤1: 提交计算（暂不提供精确值）...")
            data_id = self.submit_calculation(
                example['expr'], example['a'], example['b'], example['n']
            )
            all_ids.append(data_id)
            print()

            print("  步骤2: 补录精确值（模拟后续补录）...")
            self.update_exact_value(
                data_id, example['exact_value'], example['exact_source'],
                changed_by="李助教", comment=f"补录{example['name']}的精确值"
            )
            print()

            print("  步骤3: 生成全套输出（图表、明细、报告）...")
            output = self.generate_outputs(data_id)
            print()

            print(f"  ✓ 演示完成，报告位置: {output['report_file']}")
            print()

        print("=" * 70)
        print("  所有计算任务列表")
        print("=" * 70)
        all_tasks = self.list_all()
        for task in all_tasks:
            status = self.get_status(task['data_id'])
            print(f"  ID: {task['data_id']}")
            print(f"    函数: {task['function_expr']}, 区间: {task['interval']}, n={task['n']}")
            print(f"    版本: v{task['version']}, 有改动: {'是' if task['has_changes'] else '否'}")
            print(f"    状态: {status.get('status', '未知')}")
            print()

        print("=" * 70)
        print("  演示完成！")
        print("=" * 70)
        print()
        print("  输出文件结构:")
        print("  ./data/                    - 数据源JSON（版本追踪）")
        print("  ./output/charts/           - 图表文件（PNG）")
        print("  ./output/data/             - 明细数据（JSON/CSV）")
        print("  ./output/reports/          - 误差分析报告（Markdown）")
        print()

        return all_ids


def main():
    parser = argparse.ArgumentParser(description='积分近似误差分析面板')
    parser.add_argument('--demo', action='store_true', help='运行完整演示')
    parser.add_argument('--submit', nargs=4, metavar=('EXPR', 'A', 'B', 'N'),
                        help='提交计算: 函数表达式 左端点 右端点 区间数')
    parser.add_argument('--exact', nargs=2, metavar=('DATA_ID', 'VALUE'),
                        help='补录精确值: 数据ID 精确值')
    parser.add_argument('--generate', metavar='DATA_ID',
                        help='生成该数据的全套输出')
    parser.add_argument('--status', metavar='DATA_ID',
                        help='查看数据状态')
    parser.add_argument('--list', action='store_true',
                        help='列出所有计算任务')

    args = parser.parse_args()

    panel = IntegrationErrorPanel()

    if args.demo:
        panel.run_full_demo()
    elif args.submit:
        expr, a_str, b_str, n_str = args.submit
        data_id = panel.submit_calculation(expr, float(a_str), float(b_str), int(n_str))
        print(f"\n数据ID: {data_id}")
    elif args.exact:
        data_id, value_str = args.exact
        panel.update_exact_value(data_id, float(value_str))
    elif args.generate:
        panel.generate_outputs(args.generate)
    elif args.status:
        status = panel.get_status(args.status)
        for k, v in status.items():
            print(f"  {k}: {v}")
    elif args.list:
        tasks = panel.list_all()
        for task in tasks:
            print(f"{task['data_id']}: {task['function_expr']} on {task['interval']}, n={task['n']}, v{task['version']}")
    else:
        parser.print_help()
        print("\n提示: 使用 --demo 参数运行完整演示")


if __name__ == '__main__':
    main()

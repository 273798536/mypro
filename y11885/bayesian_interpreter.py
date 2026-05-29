#!/usr/bin/env python3
import argparse
import json
import csv
import sys
import os
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Tuple
import math


@dataclass
class TestScenario:
    name: str
    prevalence: float
    sensitivity: float
    specificity: float
    description: str = ""
    is_broken: bool = False
    broken_reason: str = ""


@dataclass
class BayesianResult:
    scenario_name: str
    prevalence: float
    sensitivity: float
    specificity: float
    ppv: float
    npv: float
    false_positive_rate: float
    false_negative_rate: float
    confusion_matrix: Dict[str, int]
    warnings: List[str] = field(default_factory=list)
    prior_update_history: List[Dict] = field(default_factory=list)


class BayesianCalculator:
    def __init__(self, population_size: int = 10000):
        self.population_size = population_size

    def calculate(self, scenario: TestScenario, prior_prevalence: Optional[float] = None) -> BayesianResult:
        prevalence = prior_prevalence if prior_prevalence is not None else scenario.prevalence
        sensitivity = scenario.sensitivity
        specificity = scenario.specificity

        warnings = []

        if prevalence < 0 or prevalence > 1:
            warnings.append(f"患病率 {prevalence:.4f} 超出有效范围 [0, 1]")
        if sensitivity < 0 or sensitivity > 1:
            warnings.append(f"灵敏度 {sensitivity:.4f} 超出有效范围 [0, 1]")
        if specificity < 0 or specificity > 1:
            warnings.append(f"特异度 {specificity:.4f} 超出有效范围 [0, 1]")

        if prevalence > 1 and prevalence <= 100:
            warnings.append(f"⚠️  待确认: 患病率 {prevalence:.1f}% 看起来像百分比值，是否忘记除以100？")
        if sensitivity > 1 and sensitivity <= 100:
            warnings.append(f"⚠️  待确认: 灵敏度 {sensitivity:.1f}% 看起来像百分比值，是否忘记除以100？")
        if specificity > 1 and specificity <= 100:
            warnings.append(f"⚠️  待确认: 特异度 {specificity:.1f}% 看起来像百分比值，是否忘记除以100？")

        if prevalence < 0.01:
            warnings.append(f"⚠️  低患病率预警: 当前患病率为 {prevalence*100:.4f}%，阳性预测值可能被严重低估！")

        if scenario.is_broken:
            warnings.append(f"❌ 异常场景: {scenario.broken_reason}")

        prev = max(0, min(1, prevalence / 100 if prevalence > 1 else prevalence))
        sens = max(0, min(1, sensitivity / 100 if sensitivity > 1 else sensitivity))
        spec = max(0, min(1, specificity / 100 if specificity > 1 else specificity))

        diseased = int(self.population_size * prev)
        healthy = self.population_size - diseased

        true_positives = int(diseased * sens)
        false_negatives = diseased - true_positives
        true_negatives = int(healthy * spec)
        false_positives = healthy - true_negatives

        total_positives = true_positives + false_positives
        total_negatives = true_negatives + false_negatives

        ppv = true_positives / total_positives if total_positives > 0 else 0
        npv = true_negatives / total_negatives if total_negatives > 0 else 0

        fpr = false_positives / healthy if healthy > 0 else 0
        fnr = false_negatives / diseased if diseased > 0 else 0

        if prev < 0.01 and ppv < 0.5:
            warnings.append(
                f"⚠️  关键提醒: 低患病率下，即使检测阳性，真正患病的概率只有 {ppv*100:.2f}%！\n"
                f"   这是因为健康人群中的假阳性 ({false_positives}人) "
                f"远多于真正患病的阳性 ({true_positives}人)"
            )

        return BayesianResult(
            scenario_name=scenario.name,
            prevalence=prev,
            sensitivity=sens,
            specificity=spec,
            ppv=ppv,
            npv=npv,
            false_positive_rate=fpr,
            false_negative_rate=fnr,
            confusion_matrix={
                "population": self.population_size,
                "diseased": diseased,
                "healthy": healthy,
                "true_positives": true_positives,
                "false_positives": false_positives,
                "false_negatives": false_negatives,
                "true_negatives": true_negatives,
                "total_positives": total_positives,
                "total_negatives": total_negatives
            },
            warnings=warnings
        )

    def sequential_testing(self, scenario: TestScenario, num_tests: int = 3) -> BayesianResult:
        result = self.calculate(scenario)
        history = []

        current_prevalence = result.prevalence
        history.append({
            "test_round": 0,
            "prevalence": current_prevalence,
            "ppv": None,
            "note": "初始患病率（先验）"
        })

        for i in range(1, num_tests + 1):
            test_result = self.calculate(scenario, prior_prevalence=current_prevalence)
            history.append({
                "test_round": i,
                "prevalence": current_prevalence,
                "ppv": test_result.ppv,
                "note": f"第{i}次检测阳性后更新"
            })
            current_prevalence = test_result.ppv

        result.prior_update_history = history
        return result


class InputParser:
    @staticmethod
    def parse_json(file_path: str) -> List[TestScenario]:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        scenarios = []
        for item in data.get('scenarios', []):
            scenarios.append(TestScenario(
                name=item.get('name', '未命名场景'),
                prevalence=item['prevalence'],
                sensitivity=item['sensitivity'],
                specificity=item['specificity'],
                description=item.get('description', ''),
                is_broken=item.get('is_broken', False),
                broken_reason=item.get('broken_reason', '')
            ))
        return scenarios

    @staticmethod
    def parse_csv(file_path: str) -> List[TestScenario]:
        scenarios = []
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                scenarios.append(TestScenario(
                    name=row.get('name', '未命名场景'),
                    prevalence=float(row['prevalence']),
                    sensitivity=float(row['sensitivity']),
                    specificity=float(row['specificity']),
                    description=row.get('description', ''),
                    is_broken=row.get('is_broken', 'false').lower() == 'true',
                    broken_reason=row.get('broken_reason', '')
                ))
        return scenarios


class OutputFormatter:
    @staticmethod
    def format_text(results: List[BayesianResult]) -> str:
        output = []
        output.append("=" * 80)
        output.append("贝叶斯检测阳性解释报告")
        output.append("=" * 80)

        for i, result in enumerate(results, 1):
            output.append(f"\n{'='*80}")
            output.append(f"场景 {i}: {result.scenario_name}")
            output.append(f"{'='*80}")

            output.append(f"\n【输入参数】")
            output.append(f"  患病率: {result.prevalence*100:.4f}%")
            output.append(f"  灵敏度: {result.sensitivity*100:.2f}%")
            output.append(f"  特异度: {result.specificity*100:.2f}%")

            output.append(f"\n【核心结果】")
            output.append(f"  阳性预测值 (PPV): {result.ppv*100:.2f}%")
            output.append(f"  阴性预测值 (NPV): {result.npv*100:.2f}%")
            output.append(f"  假阳性率: {result.false_positive_rate*100:.4f}%")
            output.append(f"  假阴性率: {result.false_negative_rate*100:.4f}%")

            cm = result.confusion_matrix
            output.append(f"\n【混淆矩阵】(基于 {cm['population']:,} 人模拟)")
            output.append(f"  真阳性 (TP): {cm['true_positives']:,} 人")
            output.append(f"  假阳性 (FP): {cm['false_positives']:,} 人")
            output.append(f"  假阴性 (FN): {cm['false_negatives']:,} 人")
            output.append(f"  真阴性 (TN): {cm['true_negatives']:,} 人")
            output.append(f"  总阳性数: {cm['total_positives']:,} 人")
            output.append(f"  总阴性数: {cm['total_negatives']:,} 人")

            if result.ppv < 0.5:
                output.append(f"\n  💡 关键洞察: 在这个场景下，检测阳性的人中")
                output.append(f"     真正患病的只有 {result.ppv*100:.2f}%")
                output.append(f"     被误诊的却有 {(1-result.ppv)*100:.2f}%")
                output.append(f"     这就是为什么不能把阳性率当患病率！")

            if result.warnings:
                output.append(f"\n【待确认区】")
                for warning in result.warnings:
                    output.append(f"  {warning}")

            if result.prior_update_history:
                output.append(f"\n【重复检测 - 贝叶斯更新历史】")
                for record in result.prior_update_history:
                    if record['ppv'] is None:
                        output.append(f"  第{record['test_round']}轮: 先验 = {record['prevalence']*100:.4f}% - {record['note']}")
                    else:
                        output.append(f"  第{record['test_round']}轮: 先验 = {record['prevalence']*100:.4f}% → PPV = {record['ppv']*100:.2f}% - {record['note']}")

        output.append(f"\n{'='*80}")
        output.append("报告结束")
        output.append("=" * 80)

        return "\n".join(output)

    @staticmethod
    def format_json(results: List[BayesianResult]) -> str:
        dict_results = [asdict(r) for r in results]
        return json.dumps(dict_results, ensure_ascii=False, indent=2)

    @staticmethod
    def format_csv(results: List[BayesianResult], output_path: str):
        with open(output_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([
                'scenario_name', 'prevalence', 'sensitivity', 'specificity',
                'ppv', 'npv', 'false_positive_rate', 'false_negative_rate',
                'population', 'diseased', 'healthy',
                'true_positives', 'false_positives', 'false_negatives', 'true_negatives',
                'total_positives', 'total_negatives', 'warnings'
            ])

            for r in results:
                cm = r.confusion_matrix
                writer.writerow([
                    r.scenario_name,
                    r.prevalence, r.sensitivity, r.specificity,
                    r.ppv, r.npv, r.false_positive_rate, r.false_negative_rate,
                    cm['population'], cm['diseased'], cm['healthy'],
                    cm['true_positives'], cm['false_positives'],
                    cm['false_negatives'], cm['true_negatives'],
                    cm['total_positives'], cm['total_negatives'],
                    ' | '.join(r.warnings)
                ])


def get_builtin_scenarios() -> List[TestScenario]:
    return [
        TestScenario(
            name="正常场景 - 罕见病筛查",
            prevalence=0.001,
            sensitivity=0.99,
            specificity=0.99,
            description="千分之一患病率，99%灵敏度和特异度"
        ),
        TestScenario(
            name="常见场景 - 低流行区新冠检测",
            prevalence=0.01,
            sensitivity=0.95,
            specificity=0.98,
            description="1%患病率，典型抗原检测参数"
        ),
        TestScenario(
            name="教学场景 - 百分比混用错误",
            prevalence=1.0,
            sensitivity=99.0,
            specificity=99.0,
            description="用户可能把百分比直接输入而忘记除以100"
        ),
        TestScenario(
            name="❌ 坏掉的患病率 - 超出范围",
            prevalence=1.5,
            sensitivity=0.99,
            specificity=0.99,
            description="患病率150%的异常输入，用于测试异常检测",
            is_broken=True,
            broken_reason="患病率150%明显是错误数据，患病率不可能超过100%"
        ),
        TestScenario(
            name="❌ 坏掉的患病率 - 负数",
            prevalence=-0.05,
            sensitivity=0.95,
            specificity=0.95,
            description="负患病率的异常输入",
            is_broken=True,
            broken_reason="患病率为负数(-5%)，这在统计学上不可能"
        ),
        TestScenario(
            name="教学场景 - 极低患病率",
            prevalence=0.0001,
            sensitivity=0.99,
            specificity=0.995,
            description="万分之一患病率，展示极低患病率下的假阳性问题"
        )
    ]


def main():
    parser = argparse.ArgumentParser(
        description="贝叶斯检测阳性解释工具 - 帮助理解先验概率、假阳性对检测结果的影响",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例用法:
  # 使用内置场景运行
  python bayesian_interpreter.py --builtin

  # 指定输入文件
  python bayesian_interpreter.py --input scenarios.json

  # 指定输出文件和格式
  python bayesian_interpreter.py --input scenarios.csv --output results.txt --format text

  # 启用重复检测分析
  python bayesian_interpreter.py --builtin --sequential-tests 3

  # 坏样例演示（仅显示异常场景）
  python bayesian_interpreter.py --builtin --broken-only
        """
    )

    parser.add_argument('--input', '-i', type=str, help='输入文件路径 (JSON或CSV)')
    parser.add_argument('--output', '-o', type=str, help='输出文件路径')
    parser.add_argument('--format', '-f', type=str, choices=['text', 'json', 'csv'],
                        default='text', help='输出格式 (默认: text)')
    parser.add_argument('--builtin', action='store_true', help='使用内置教学场景')
    parser.add_argument('--sequential-tests', type=int, default=1,
                        help='重复检测次数，用于展示贝叶斯更新 (默认: 1)')
    parser.add_argument('--broken-only', action='store_true', help='仅显示异常/坏掉的场景')
    parser.add_argument('--population', type=int, default=10000,
                        help='模拟人群大小 (默认: 10000)')
    parser.add_argument('--generate-sample', type=str, metavar='FORMAT',
                        choices=['json', 'csv'], help='生成示例输入文件模板')

    args = parser.parse_args()

    if args.generate_sample:
        generate_sample_input(args.generate_sample)
        return

    scenarios = []

    if args.input:
        if args.input.endswith('.json'):
            scenarios = InputParser.parse_json(args.input)
        elif args.input.endswith('.csv'):
            scenarios = InputParser.parse_csv(args.input)
        else:
            print("错误: 输入文件必须是 .json 或 .csv 格式", file=sys.stderr)
            sys.exit(1)
    elif args.builtin:
        scenarios = get_builtin_scenarios()
    else:
        print("错误: 必须指定 --input 或 --builtin", file=sys.stderr)
        parser.print_help()
        sys.exit(1)

    if args.broken_only:
        scenarios = [s for s in scenarios if s.is_broken]
        if not scenarios:
            print("未找到标记为异常的场景")
            return

    calculator = BayesianCalculator(population_size=args.population)
    results = []

    for scenario in scenarios:
        if args.sequential_tests > 1:
            result = calculator.sequential_testing(scenario, num_tests=args.sequential_tests)
        else:
            result = calculator.calculate(scenario)
        results.append(result)

    formatter = OutputFormatter()

    if args.output:
        if args.format == 'csv':
            formatter.format_csv(results, args.output)
        else:
            with open(args.output, 'w', encoding='utf-8') as f:
                if args.format == 'json':
                    f.write(formatter.format_json(results))
                else:
                    f.write(formatter.format_text(results))
        print(f"结果已写入: {args.output}")
    else:
        if args.format == 'text':
            print(formatter.format_text(results))
        elif args.format == 'json':
            print(formatter.format_json(results))
        else:
            formatter.format_csv(results, 'results.csv')
            print("结果已写入: results.csv")


def generate_sample_input(format_type: str):
    sample_scenarios = [
        {
            "name": "示例场景1 - 罕见病筛查",
            "prevalence": 0.005,
            "sensitivity": 0.95,
            "specificity": 0.98,
            "description": "0.5%患病率",
            "is_broken": False,
            "broken_reason": ""
        },
        {
            "name": "示例场景2 - 常见疾病",
            "prevalence": 0.1,
            "sensitivity": 0.9,
            "specificity": 0.9,
            "description": "10%患病率",
            "is_broken": False,
            "broken_reason": ""
        },
        {
            "name": "示例场景3 - 异常数据",
            "prevalence": 2.0,
            "sensitivity": 0.95,
            "specificity": 0.95,
            "description": "200%患病率，不可能存在",
            "is_broken": True,
            "broken_reason": "患病率超过100%"
        }
    ]

    if format_type == 'json':
        output = {"scenarios": sample_scenarios}
        with open('sample_input.json', 'w', encoding='utf-8') as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
        print("示例文件已生成: sample_input.json")
    else:
        with open('sample_input.csv', 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=[
                'name', 'prevalence', 'sensitivity', 'specificity',
                'description', 'is_broken', 'broken_reason'
            ])
            writer.writeheader()
            writer.writerows(sample_scenarios)
        print("示例文件已生成: sample_input.csv")


if __name__ == "__main__":
    main()

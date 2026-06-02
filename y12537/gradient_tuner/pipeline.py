import os
import json
from datetime import datetime
from typing import List, Dict, Optional
from .importer import DataImporter
from .checker import GradientChecker
from .advisor import CorrectionAdvisor
from .exporter import ResultExporter
from .visualizer import ProcessVisualizer
from .models import TrainingRecord, CheckResult


class TuningPipeline:
    def __init__(
        self,
        output_dir: str = "./output",
        min_iterations_required: int = 50,
        explosion_threshold: float = 2.0,
    ):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

        self.importer = DataImporter()
        self.checker = GradientChecker(
            min_iterations_required=min_iterations_required,
            explosion_threshold=explosion_threshold,
        )
        self.advisor = CorrectionAdvisor()
        self.exporter = ResultExporter(output_dir=output_dir)
        self.visualizer = ProcessVisualizer(output_dir=output_dir)

        self.records: List[TrainingRecord] = []
        self.check_results: List[CheckResult] = []
        self.advisor_result: Dict = {}
        self.export_paths: Dict[str, str] = {}
        self.visualization_paths: Dict = {}
        self.process_snapshots: List[Dict] = []

    def run(
        self,
        input_path: str,
        output_dir: Optional[str] = None,
    ) -> Dict:
        if output_dir:
            self.output_dir = output_dir
            os.makedirs(output_dir, exist_ok=True)
            self.exporter.output_dir = output_dir
            self.visualizer.output_dir = output_dir

        self._log("=" * 60)
        self._log("梯度下降调参教具 - 完整分析流程")
        self._log("=" * 60)
        self._log(f"开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        self._log(f"输入路径: {input_path}")
        self._log("")

        self._log("【阶段 1/5】数据导入")
        self._log("-" * 60)
        self._import_data(input_path)
        self._log(f"成功导入 {len(self.records)} 条记录")

        parsing_issues = self.importer.get_parsing_issues()
        if parsing_issues:
            self._log(f"⚠️  导入时发现 {len(parsing_issues)} 个解析问题")
            for issue in parsing_issues[:5]:
                self._log(f"   - [{issue.severity}] {issue.message}")
            if len(parsing_issues) > 5:
                self._log(f"   ... 还有 {len(parsing_issues) - 5} 个问题")
        self._log("")

        self._collect_snapshots()

        self._log("【阶段 2/5】质量检查")
        self._log("-" * 60)
        self._run_checks()
        total_issues = sum(len(cr.issues) for cr in self.check_results)
        self._log(f"检查完成，共发现 {total_issues} 个问题")

        issue_types = {}
        for cr in self.check_results:
            for issue in cr.issues:
                itype = issue.issue_type.value
                issue_types[itype] = issue_types.get(itype, 0) + 1
        for itype, count in issue_types.items():
            self._log(f"   - {self._format_issue_type(itype)}: {count} 个")
        self._log("")

        self._collect_snapshots()

        self._log("【阶段 3/5】生成修正建议")
        self._log("-" * 60)
        self._generate_advice()

        prioritized = self.advisor_result.get("prioritized_actions", [])
        self._log(f"生成 {len(prioritized)} 条优先处理建议")
        for action in prioritized[:5]:
            priority = {"P0": "🔴 紧急", "P1": "🟡 重要", "P2": "🟢 一般"}.get(action.get("priority", "P2"), action.get("priority"))
            self._log(f"   - [{priority}] {action.get('message', '')}")
        if len(prioritized) > 5:
            self._log(f"   ... 还有 {len(prioritized) - 5} 条建议")
        self._log("")

        self._collect_snapshots()

        self._log("【阶段 4/5】导出结果")
        self._log("-" * 60)
        self._export_results()
        self._log(f"已导出到 {self.output_dir}")
        for name, path in self.export_paths.items():
            display_path = path if isinstance(path, str) else f"{len(path)} 个文件"
            self._log(f"   - {name}: {display_path}")
        self._log("")

        self._collect_snapshots()

        self._log("【阶段 5/5】生成可视化图表")
        self._log("-" * 60)
        self._generate_visualizations()
        self._log(f"已生成图表到 {self.output_dir}")
        for name, path in self.visualization_paths.items():
            if isinstance(path, list):
                self._log(f"   - {name}: {len(path)} 张图")
            else:
                self._log(f"   - {name}: {os.path.basename(path) if isinstance(path, str) else path}")
        self._log("")

        self._collect_snapshots()

        self._log("=" * 60)
        self._log("分析完成！")
        self._log("=" * 60)
        self._log(f"结束时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        self._log(f"分析班级数: {len(self.records)}")
        self._log(f"发现问题数: {sum(len(cr.issues) for cr in self.check_results)}")
        self._log(f"输出目录: {os.path.abspath(self.output_dir)}")
        self._log("")
        self._log("重点查看文件:")
        self._log("  📄 business_report_*.md - 给业务同事看的友好报告")
        self._log("  📊 overview_chart_*.png - 分析总览图")
        self._log("  📋 failure_review_*.md - 失败案例回看手册")
        self._log("  📈 parameter_comparison_*.csv - 参数对比表")
        self._log("  📑 full_analysis_*.json - 完整分析数据（用于回看）")
        self._log("=" * 60)

        return self._get_summary()

    def _import_data(self, input_path: str) -> None:
        if os.path.isfile(input_path):
            self.records = self.importer.import_from_file(input_path)
        elif os.path.isdir(input_path):
            self.records = self.importer.import_from_directory(input_path)
        else:
            raise FileNotFoundError(f"输入路径不存在: {input_path}")

    def _run_checks(self) -> None:
        self.check_results = self.checker.check_all(self.records)

    def _generate_advice(self) -> None:
        self.advisor_result = self.advisor.analyze(self.records, self.check_results)

    def _export_results(self) -> None:
        self.export_paths = self.exporter.export_all(
            self.records,
            self.check_results,
            self.advisor_result,
            self.process_snapshots,
        )

    def _generate_visualizations(self) -> None:
        self.visualization_paths = self.visualizer.visualize_all(
            self.records,
            self.check_results,
            self.process_snapshots,
        )

    def _collect_snapshots(self) -> None:
        self.process_snapshots.extend(self.importer.get_import_snapshots())
        self.process_snapshots.extend(self.checker.get_check_snapshots())
        self.process_snapshots.extend(self.advisor.get_advisor_snapshots())
        self.process_snapshots.extend(self.exporter.get_export_snapshots())
        self.process_snapshots.extend(self.visualizer.get_visualization_snapshots())

        self.importer.import_snapshots = []
        self.checker.check_snapshots = []
        self.advisor.advisor_snapshots = []
        self.exporter.export_snapshots = []
        self.visualizer.visualization_snapshots = []

    def _format_issue_type(self, issue_type: str) -> str:
        mapping = {
            "learning_rate_explosion": "学习率爆炸",
            "local_minimum": "局部极小",
            "insufficient_iterations": "迭代不足",
            "missing_learning_rate": "学习率缺失",
            "corrupted_loss_record": "损失记录损坏",
            "renamed_class_record": "班级名自动命名",
        }
        return mapping.get(issue_type, issue_type)

    def _log(self, message: str) -> None:
        print(message)

    def _get_summary(self) -> Dict:
        total_issues = sum(len(cr.issues) for cr in self.check_results)
        normal_count = sum(1 for cr in self.check_results if not cr.issues)
        has_issues_count = len(self.check_results) - normal_count

        return {
            "timestamp": datetime.now().isoformat(),
            "output_dir": os.path.abspath(self.output_dir),
            "records_count": len(self.records),
            "check_results_count": len(self.check_results),
            "total_issues": total_issues,
            "normal_count": normal_count,
            "has_issues_count": has_issues_count,
            "export_paths": self.export_paths,
            "visualization_paths": self.visualization_paths,
            "prioritized_actions": self.advisor_result.get("prioritized_actions", []),
            "process_snapshots_count": len(self.process_snapshots),
        }

    def get_records(self) -> List[TrainingRecord]:
        return self.records

    def get_check_results(self) -> List[CheckResult]:
        return self.check_results

    def get_advisor_result(self) -> Dict:
        return self.advisor_result

    def get_export_paths(self) -> Dict[str, str]:
        return self.export_paths

    def get_visualization_paths(self) -> Dict:
        return self.visualization_paths

    def get_process_snapshots(self) -> List[Dict]:
        return self.process_snapshots

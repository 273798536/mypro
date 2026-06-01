import os
from typing import Dict, Optional, Any
from .config import CheckResult
from .data_import import DataImporter
from .torque_calculator import TorqueCalculator
from .violation_detector import ViolationDetector
from .visualizer import MotionVisualizer
from .report_exporter import ReportExporter, ReportConfig


class JointCheckWorkflow:
    def __init__(
        self,
        output_dir: str = "reports",
        report_config: Optional[ReportConfig] = None,
    ):
        self.check_result = CheckResult()
        self.output_dir = output_dir
        self.report_config = report_config or ReportConfig()
        os.makedirs(output_dir, exist_ok=True)

        self.importer = DataImporter(self.check_result)
        self.calculator = TorqueCalculator(self.check_result)
        self.detector = ViolationDetector(self.check_result)
        self.visualizer = MotionVisualizer(self.check_result, output_dir)
        self.exporter = ReportExporter(self.check_result, output_dir, self.report_config)

    def import_data(
        self,
        joint_config_file: Optional[str] = None,
        load_config_file: Optional[str] = None,
        motion_sequence_file: Optional[str] = None,
    ) -> "JointCheckWorkflow":
        print("=" * 60)
        print("阶段 1: 数据导入")
        print("=" * 60)

        if joint_config_file:
            print(f"  导入关节配置: {joint_config_file}")
            self.importer.import_joint_config(joint_config_file)
            print(f"  ✓ 已导入 {len(self.check_result.joint_configs)} 个关节配置")

        if load_config_file:
            print(f"  导入载荷配置: {load_config_file}")
            self.importer.import_load_config(load_config_file)
            print(f"  ✓ 已导入载荷配置")

        if motion_sequence_file:
            print(f"  导入动作序列: {motion_sequence_file}")
            self.importer.import_motion_sequence(motion_sequence_file)
            motion_config = self.check_result.motion_config
            if motion_config:
                print(f"  ✓ 已导入 {len(motion_config.time_steps)} 个时间步的动作序列")

        summary = self.importer.get_data_summary()
        print(f"\n  数据摘要:")
        print(f"    - 数据源总数: {summary['total_sources']}")
        print(f"    - 关节数量: {summary['joint_count']}")
        print(f"    - 动作步数: {summary['motion_steps']}")

        return self

    def calculate_torque(self) -> "JointCheckWorkflow":
        print("\n" + "=" * 60)
        print("阶段 2: 力矩计算")
        print("=" * 60)

        if not self.check_result.joint_configs:
            print("  ⚠️  缺少关节配置，跳过力矩计算")
            return self

        if not self.check_result.load_config:
            print("  ⚠️  缺少载荷配置，跳过力矩计算")
            return self

        if not self.check_result.motion_config:
            print("  ⚠️  缺少动作序列，跳过力矩计算")
            return self

        print("  正在计算关节力矩...")
        torque_results, velocity_results = self.calculator.calculate(
            joint_configs=self.check_result.joint_configs,
            load_config=self.check_result.load_config,
            motion_config=self.check_result.motion_config,
        )

        summary = self.calculator.get_summary()
        print(f"  ✓ 力矩计算完成")
        print(f"\n  计算结果摘要:")
        for joint_id, max_torque in summary["max_torque"].items():
            config = self.check_result.joint_configs.get(joint_id)
            if config:
                status = "✓" if max_torque <= config.max_torque else "✗"
                print(f"    关节{joint_id}: 最大力矩 {max_torque:.2f} Nm / {config.max_torque:.2f} Nm {status}")

        return self

    def detect_violations(self) -> "JointCheckWorkflow":
        print("\n" + "=" * 60)
        print("阶段 3: 超限检测")
        print("=" * 60)

        violations = self.detector.detect_all(
            joint_configs=self.check_result.joint_configs,
            load_config=self.check_result.load_config,
            motion_config=self.check_result.motion_config,
            torque_results=self.check_result.torque_results,
            velocity_results=self.check_result.velocity_results,
        )

        summary = self.detector.get_summary()
        print(f"  ✓ 超限检测完成")
        print(f"\n  检测结果:")
        print(f"    - 总超限数: {summary['total_violations']}")
        print(f"    - 严重超限: {summary['critical_count']}")
        print(f"    - 警告: {summary['warning_count']}")

        if summary["has_load_violation"]:
            print(f"\n  🔴 关键失败路径: 载荷越界检测失败！")
            print(f"     这会影响后续力矩计算的可靠性，请优先处理。")

        if violations:
            print(f"\n  详细超限信息:")
            for v in violations[:5]:
                severity_mark = "【严重】" if v.severity == "critical" else "【警告】"
                print(f"    {severity_mark} {v.message}")
            if len(violations) > 5:
                print(f"    ... 还有 {len(violations) - 5} 条超限信息")

        return self

    def generate_visualizations(self) -> Dict[str, str]:
        print("\n" + "=" * 60)
        print("阶段 4: 生成可视化")
        print("=" * 60)

        print("  正在生成可视化图表...")
        plots = self.visualizer.generate_all_plots()

        print(f"  ✓ 可视化生成完成")
        for name, path in plots.items():
            if not name.endswith("_error"):
                print(f"    - {name}: {path}")

        return plots

    def export_reports(self, plots: Optional[Dict[str, str]] = None) -> Dict[str, str]:
        print("\n" + "=" * 60)
        print("阶段 5: 导出报告")
        print("=" * 60)

        print("  正在导出报告...")
        outputs = self.exporter.export_all(plots=plots)

        print(f"  ✓ 报告导出完成")
        for name, path in outputs.items():
            if not name.endswith("_error"):
                print(f"    - {name}: {path}")

        return outputs

    def run_full_workflow(
        self,
        joint_config_file: Optional[str] = None,
        load_config_file: Optional[str] = None,
        motion_sequence_file: Optional[str] = None,
        generate_plots: bool = True,
    ) -> Dict[str, Any]:
        print("\n" + "╔" + "═" * 58 + "╗")
        print("║" + " " * 15 + "机器人关节力矩检查工作流" + " " * 15 + "║")
        print("╚" + "═" * 58 + "╝")
        print(f"\n开始时间: {self.check_result.timestamp.strftime('%Y-%m-%d %H:%M:%S')}")

        self.import_data(joint_config_file, load_config_file, motion_sequence_file)
        self.calculate_torque()
        self.detect_violations()

        plots = None
        if generate_plots:
            plots = self.generate_visualizations()

        reports = self.export_reports(plots)

        print("\n" + "=" * 60)
        print("工作流完成")
        print("=" * 60)

        result_summary = {
            "check_result": self.check_result,
            "violation_summary": self.detector.get_summary(),
            "plots": plots,
            "reports": reports,
            "has_critical_violations": self.detector.get_summary()["critical_count"] > 0,
            "has_load_violation": self.detector.get_summary()["has_load_violation"],
        }

        if result_summary["has_load_violation"]:
            print("\n🔴 注意: 检测到载荷越界，这是关键失败路径！")
            print("   请检查导出的报告获取详细信息。")

        return result_summary

    def get_result(self) -> CheckResult:
        return self.check_result

    def save_intermediate_result(self, filename: str = "intermediate_result.json"):
        output_path = os.path.join(self.output_dir, filename)
        self.check_result.save_json(output_path)
        print(f"  中间结果已保存: {output_path}")
        return output_path

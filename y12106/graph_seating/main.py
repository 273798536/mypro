import os
import sys
import json
from typing import List, Dict, Any, Optional, Tuple
from datetime import date, datetime
from dataclasses import asdict

from .config import Config
from .exceptions import DataAnomaly, ConflictCycle
from .models import (
    Student, ConflictRelation, ConflictGraph, ColoringResult, SeatingPlan
)
from .models.trace import TraceChain
from .data_loader import DataLoader
from .graph_builder import GraphBuilder
from .coloring import GraphColoring
from .seating import SeatAllocator
from .traceability import TraceabilityManager
from .exporter import ResultExporter
from .visualization import Visualizer


class GraphSeatingPipeline:
    def __init__(self, config: Optional[Config] = None):
        self.config = config or Config()
        self.data_loader = DataLoader(self.config)
        self.graph_builder = GraphBuilder(self.config)
        self.graph_coloring = GraphColoring(self.config)
        self.seat_allocator = SeatAllocator(self.config)
        self.trace_manager = TraceabilityManager(self.config)
        self.exporter = ResultExporter(self.config)
        self.visualizer = Visualizer(self.config)

        self.students: List[Student] = []
        self.explicit_conflicts: List[ConflictRelation] = []
        self.graph: Optional[ConflictGraph] = None
        self.coloring_result: Optional[ColoringResult] = None
        self.seating_plan: Optional[SeatingPlan] = None
        self.cycles: List[ConflictCycle] = []

    def run(self, input_file: str, target_date: Optional[date] = None) -> Dict[str, Any]:
        print("=" * 80)
        print("图论社团排座位系统 - 端到端处理流程")
        print("=" * 80)
        print(f"\n[1/6] 数据加载与清洗 - {os.path.basename(input_file)}")
        self._step_load_data(input_file)

        print(f"\n[2/6] 冲突图构建")
        self._step_build_graph()

        print(f"\n[3/6] 图着色算法 - {self.config.COLORING_ALGORITHM}")
        self._step_color_graph()

        print(f"\n[4/6] 座位分配与容量管理")
        self._step_allocate_seats(target_date)

        print(f"\n[5/6] 结果导出")
        exported_files = self._step_export_results()

        print(f"\n[6/6] 可视化图表生成")
        chart_files = self._step_generate_visualizations()

        print("\n" + "=" * 80)
        print("处理完成！结果汇总：")
        print("=" * 80)
        self._print_summary(exported_files, chart_files)

        return {
            "students": self.students,
            "graph": self.graph,
            "coloring_result": self.coloring_result,
            "seating_plan": self.seating_plan,
            "anomalies": self.data_loader.anomalies,
            "bad_rows": self.data_loader.bad_rows,
            "cycles": self.cycles,
            "trace_manager": self.trace_manager,
            "exported_files": exported_files,
            "chart_files": chart_files
        }

    def _step_load_data(self, input_file: str):
        self.students, self.explicit_conflicts = self.data_loader.load_file(input_file)

        self.trace_manager.register_trace_chains(self.data_loader.trace_chains, "data_loader")

        for student in self.students:
            self.trace_manager.register_data_hash(
                student.student_id, "data_loaded",
                student.get_data_hash(), "data_loader"
            )

        print(f"  ✓ 加载学生数据: {len(self.students)} 人")
        print(f"  ✓ 明确冲突关系: {len(self.explicit_conflicts)} 条")
        print(f"  ✓ 异常记录: {len(self.data_loader.anomalies)} 条")
        print(f"  ✓ 坏行: {len(self.data_loader.bad_rows)} 行")
        print(f"  ✓ 空行: {len(self.data_loader.blank_rows)} 行")
        print(f"  ✓ 备注行: {len(self.data_loader.comment_rows)} 行")

        if self.data_loader.anomalies:
            error_count = sum(1 for a in self.data_loader.anomalies if a.severity == "error")
            warning_count = sum(1 for a in self.data_loader.anomalies if a.severity == "warning")
            print(f"    - 错误: {error_count}, 警告: {warning_count}")

    def _step_build_graph(self):
        self.graph = self.graph_builder.build(
            self.students,
            self.explicit_conflicts,
            self.data_loader.trace_chains
        )

        self.trace_manager.register_trace_chains(self.graph_builder.trace_chains, "graph_builder")

        for student in self.students:
            if hasattr(student, 'get_data_hash'):
                self.trace_manager.register_data_hash(
                    student.student_id, "graph_built",
                    student.get_data_hash(), "graph_builder"
                )

        print(f"  ✓ 图节点数: {len(self.graph.nodes)}")
        print(f"  ✓ 图边数: {len(self.graph.edges)}")

        conflict_types = {}
        for edge in self.graph.edges.values():
            ctype = edge.conflict_type
            conflict_types[ctype] = conflict_types.get(ctype, 0) + 1

        for ctype, count in conflict_types.items():
            print(f"    - {ctype}: {count} 条")

    def _step_color_graph(self):
        self.coloring_result = self.graph_coloring.color(
            self.graph,
            self.graph_builder.trace_chains
        )

        self.cycles = self.graph_coloring.cycles

        self.trace_manager.register_trace_chains(self.graph_coloring.trace_chains, "coloring")

        for student in self.students:
            self.trace_manager.register_data_hash(
                student.student_id, "colored",
                student.get_data_hash(), "coloring"
            )

        print(f"  ✓ 着色成功: {self.coloring_result.success}")
        print(f"  ✓ 使用颜色数: {self.coloring_result.colors_used}")
        print(f"  ✓ 已着色节点: {len(self.coloring_result.assignments)}")
        print(f"  ✓ 未着色节点: {len(self.coloring_result.uncolored_nodes)}")
        print(f"  ✓ 回溯次数: {self.coloring_result.backtrack_count}")
        print(f"  ✓ 检测到环: {len(self.cycles)} 个")
        print(f"  ✓ 隔离节点: {len(self.graph_coloring.isolated_nodes)} 个")

        if self.cycles:
            for i, cycle in enumerate(self.cycles):
                print(f"    - 环 {i+1}: {cycle.cycle_id}, 节点数: {len(cycle.nodes)}")

    def _step_allocate_seats(self, target_date: Optional[date] = None):
        self.seating_plan = self.seat_allocator.allocate(
            self.students,
            self.graph,
            self.coloring_result,
            self.graph_coloring.trace_chains,
            target_date
        )

        self.trace_manager.register_trace_chains(self.seat_allocator.trace_chains, "seating")

        for student in self.students:
            self.trace_manager.register_data_hash(
                student.student_id, "seated",
                student.get_data_hash(), "seating"
            )

        total_assigned = len(self.seating_plan.assignments)
        print(f"  ✓ 已分配座位: {total_assigned} 人")
        print(f"  ✓ 班级数: {len(self.seating_plan.classes)}")

        for class_id, class_info in self.seating_plan.classes.items():
            students_in_class = [
                s for s, a in self.seating_plan.assignments.items()
                if a.class_id == class_id
            ]
            print(f"    - {class_info.class_name}: {len(students_in_class)} 人 "
                  f"(容量: {class_info.min_capacity}-{class_info.max_capacity})")

        print(f"  ✓ 容量警告: {len(self.seating_plan.capacity_warnings)} 条")
        print(f"  ✓ 请假槽位: {len(self.seating_plan.leave_slots)} 个")

        review_items = self.seat_allocator.filter_for_review(
            self.seating_plan,
            ["capacity", "leave", "conflict", "override", "isolation"]
        )
        print(f"  ✓ 待复核项: {sum(len(v) for v in review_items.values())} 项")
        for key, items in review_items.items():
            if items:
                print(f"    - {key}: {len(items)} 项")

    def _step_export_results(self) -> Dict[str, str]:
        exported_files = self.exporter.export_all(
            self.students,
            self.graph,
            self.coloring_result,
            self.seating_plan,
            self.data_loader.anomalies,
            self.data_loader.bad_rows,
            self.cycles,
            self.trace_manager,
            self.config.OUTPUT_DIR
        )

        print(f"  ✓ 导出文件数: {len(exported_files)} 个")
        for name, path in exported_files.items():
            if path:
                print(f"    - {name}: {os.path.basename(path)}")

        return exported_files

    def _step_generate_visualizations(self) -> Dict[str, str]:
        chart_files = self.visualizer.generate_all_charts(
            self.students,
            self.graph,
            self.coloring_result,
            self.seating_plan,
            self.data_loader.anomalies,
            self.cycles,
            self.trace_manager,
            self.config.OUTPUT_DIR
        )

        print(f"  ✓ 生成图表: {len(chart_files)} 个")
        for name, path in chart_files.items():
            if path:
                print(f"    - {name}: {os.path.basename(path)}")

        return chart_files

    def _print_summary(self, exported_files: Dict[str, str], chart_files: Dict[str, str]):
        print(f"\n📊 关键指标:")
        print(f"  学生总数: {len(self.students)}")
        print(f"  冲突边数: {len(self.graph.edges) if self.graph else 0}")
        print(f"  着色成功率: {len(self.coloring_result.assignments) / max(1, len(self.graph.nodes)) * 100:.1f}%")
        print(f"  异常数量: {len(self.data_loader.anomalies)}")
        print(f"  待复核项: {len(self.seating_plan.capacity_warnings) if self.seating_plan else 0}")

        print(f"\n📁 输出目录: {self.config.OUTPUT_DIR}")

        all_files = list(exported_files.values()) + list(chart_files.values())
        all_files = [f for f in all_files if f]

        if all_files:
            print(f"\n🔍 导出文件共 {len(all_files)} 个:")
            for f in sorted(all_files):
                print(f"  - {os.path.basename(f)}")

    def query_student_trace(self, student_id: str) -> Optional[Dict[str, Any]]:
        return self.trace_manager.get_full_trace(student_id)

    def get_review_queue(self, filter_types: Optional[List[str]] = None) -> Dict[str, List[Dict[str, Any]]]:
        if filter_types is None:
            filter_types = ["capacity", "leave", "conflict", "override", "isolation"]
        return self.seat_allocator.filter_for_review(self.seating_plan, filter_types)

    def verify_consistency(self) -> List[Dict[str, Any]]:
        issues = []

        if self.seating_plan:
            for student_id, assignment in self.seating_plan.assignments.items():
                check_result = self.trace_manager._check_consistency(student_id)
                if not check_result["consistent"]:
                    issues.append({
                        "student_id": student_id,
                        "issues": check_result["issues"]
                    })

        return issues


def run_pipeline(input_file: str, target_date: Optional[date] = None) -> GraphSeatingPipeline:
    pipeline = GraphSeatingPipeline()
    pipeline.run(input_file, target_date)
    return pipeline


def main():
    if len(sys.argv) < 2:
        print("使用方法: python -m graph_seating.main <input_file> [target_date]")
        print("示例: python -m graph_seating.main data/test_students.csv 2024-09-12")
        sys.exit(1)

    input_file = sys.argv[1]

    target_date = None
    if len(sys.argv) >= 3:
        try:
            target_date = datetime.strptime(sys.argv[2], "%Y-%m-%d").date()
        except ValueError:
            print(f"错误: 日期格式不正确，请使用 YYYY-MM-DD 格式")
            sys.exit(1)

    if not os.path.isabs(input_file):
        input_file = os.path.join(os.getcwd(), input_file)

    if not os.path.exists(input_file):
        print(f"错误: 文件不存在 - {input_file}")
        sys.exit(1)

    try:
        pipeline = run_pipeline(input_file, target_date)

        print("\n" + "=" * 80)
        print("🔍 追溯性测试 - 查询 S001 学生完整链路")
        print("=" * 80)
        trace = pipeline.query_student_trace("S001")
        if trace:
            print(f"学生: {trace.get('student_id')}")
            print(f"记录数: {len(trace.get('records', []))}")
            print(f"约束数: {len(trace.get('constraints', []))}")
            print(f"换座历史: {len(trace.get('change_history', []))}")
            print(f"数据哈希链: {len(trace.get('data_hash_chain', []))} 个节点")
            print(f"一致性检查: {'✓ 通过' if trace.get('consistency_check', {}).get('consistent') else '✗ 失败'}")

        print("\n" + "=" * 80)
        print("📋 待复核队列")
        print("=" * 80)
        review_queue = pipeline.get_review_queue()
        for category, items in review_queue.items():
            if items:
                print(f"\n{category} ({len(items)} 项):")
                for i, item in enumerate(items[:3]):
                    print(f"  {i+1}. {json.dumps(item, ensure_ascii=False)[:100]}...")
                if len(items) > 3:
                    print(f"  ... 还有 {len(items) - 3} 项")

        print("\n" + "=" * 80)
        print("✅ 端到端链路一致性验证")
        print("=" * 80)
        consistency_issues = pipeline.verify_consistency()
        if consistency_issues:
            print(f"❌ 发现 {len(consistency_issues)} 个一致性问题")
            for issue in consistency_issues[:5]:
                print(f"  - {issue['student_id']}: {issue['issues']}")
        else:
            print("✅ 所有学生数据链路一致，无异常")

        print("\n🎉 处理完成！请查看 output 目录下的结果文件。")

    except Exception as e:
        print(f"\n❌ 处理失败: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

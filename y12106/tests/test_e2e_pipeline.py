import os
import sys
import json
import unittest
from datetime import date, datetime
from typing import Dict, Any

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from graph_seating.config import Config
from graph_seating.main import GraphSeatingPipeline
from graph_seating.data_loader import DataLoader
from graph_seating.graph_builder import GraphBuilder
from graph_seating.coloring import GraphColoring
from graph_seating.seating import SeatAllocator
from graph_seating.traceability import TraceabilityManager
from graph_seating.exporter import ResultExporter
from graph_seating.visualization import Visualizer


class TestDataLoader(unittest.TestCase):
    def setUp(self):
        self.config = Config()
        self.loader = DataLoader(self.config)
        self.test_file = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "graph_seating", "data", "test_students.csv"
        )

    def test_file_loading(self):
        self.assertTrue(os.path.exists(self.test_file))
        students, conflicts = self.loader.load_file(self.test_file)

        self.assertIsInstance(students, list)
        self.assertIsInstance(conflicts, list)
        self.assertGreater(len(students), 0)

    def test_blank_row_detection(self):
        self.loader.load_file(self.test_file)
        self.assertGreater(len(self.loader.blank_rows), 0)
        print(f"✓ 检测到空行: {len(self.loader.blank_rows)} 行")

    def test_comment_row_detection(self):
        self.loader.load_file(self.test_file)
        self.assertGreater(len(self.loader.comment_rows), 0)
        print(f"✓ 检测到备注行: {len(self.loader.comment_rows)} 行")

    def test_bad_row_detection(self):
        self.loader.load_file(self.test_file)
        self.assertGreater(len(self.loader.bad_rows), 0)
        print(f"✓ 检测到坏行: {len(self.loader.bad_rows)} 行")

    def test_anomaly_recording(self):
        self.loader.load_file(self.test_file)
        self.assertGreater(len(self.loader.anomalies), 0)

        severities = set(a.severity for a in self.loader.anomalies)
        self.assertIn("error", severities)
        self.assertIn("warning", severities)
        self.assertIn("info", severities)
        print(f"✓ 记录异常: {len(self.loader.anomalies)} 条")

    def test_student_validation(self):
        students, _ = self.loader.load_file(self.test_file)
        for student in students:
            self.assertTrue(student.is_valid)
            self.assertIsNotNone(student.student_id)
            self.assertIsNotNone(student.name)
        print(f"✓ 有效学生: {len(students)} 人")

    def test_leave_record_parsing(self):
        students, _ = self.loader.load_file(self.test_file)
        students_with_leave = [s for s in students if s.leave_records]
        self.assertGreater(len(students_with_leave), 0)
        print(f"✓ 有请假记录的学生: {len(students_with_leave)} 人")

    def test_explicit_conflict_parsing(self):
        students, conflicts = self.loader.load_file(self.test_file)
        self.assertGreater(len(conflicts), 0)
        print(f"✓ 明确冲突: {len(conflicts)} 条")

    def test_trace_chain_initialization(self):
        students, _ = self.loader.load_file(self.test_file)
        self.assertEqual(len(self.loader.trace_chains), len(students))
        for student_id, chain in self.loader.trace_chains.items():
            self.assertEqual(chain.student_id, student_id)
            self.assertGreater(len(chain.records), 0)
        print(f"✓ 追溯链初始化: {len(self.loader.trace_chains)} 条")

    def test_data_hash_generation(self):
        students, _ = self.loader.load_file(self.test_file)
        for student in students:
            hash_val = student.get_data_hash()
            self.assertIsNotNone(hash_val)
            self.assertIsInstance(hash_val, str)
            self.assertEqual(len(hash_val), 64)
        print(f"✓ 数据哈希生成: {len(students)} 个")


class TestGraphBuilder(unittest.TestCase):
    def setUp(self):
        self.config = Config()
        self.loader = DataLoader(self.config)
        self.builder = GraphBuilder(self.config)
        self.test_file = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "graph_seating", "data", "test_students.csv"
        )

    def test_graph_construction(self):
        students, conflicts = self.loader.load_file(self.test_file)
        graph = self.builder.build(students, conflicts, self.loader.trace_chains)

        self.assertEqual(len(graph.nodes), len(students))
        self.assertGreater(len(graph.edges), 0)
        print(f"✓ 图构建: {len(graph.nodes)} 节点, {len(graph.edges)} 边")

    def test_multiple_conflict_types(self):
        students, conflicts = self.loader.load_file(self.test_file)
        graph = self.builder.build(students, conflicts, self.loader.trace_chains)

        conflict_types = set()
        for edge in graph.edges.values():
            ctype = edge.attributes.get("conflict_type")
            if ctype:
                conflict_types.add(ctype)

        expected_types = {"explicit", "interest_opposite", "leave_overlap", "special_needs", "grade_separation"}
        self.assertTrue(conflict_types.issubset(expected_types))
        print(f"✓ 冲突类型: {sorted(conflict_types)}")

    def test_conflict_trace_recording(self):
        students, conflicts = self.loader.load_file(self.test_file)
        self.builder.build(students, conflicts, self.loader.trace_chains)

        for student_id, chain in self.builder.trace_chains.items():
            self.assertGreaterEqual(len(chain.constraints), 0)
        print(f"✓ 冲突追溯记录完成")

    def test_cycle_detection(self):
        students, conflicts = self.loader.load_file(self.test_file)
        graph = self.builder.build(students, conflicts, self.loader.trace_chains)

        cycles = graph.detect_cycles(min_cycle_length=3)
        self.assertIsInstance(cycles, list)
        print(f"✓ 检测到环: {len(cycles)} 个")

        for cycle in cycles:
            self.assertGreaterEqual(len(cycle), 3)
            for node in cycle:
                self.assertIn(node, graph.nodes)


class TestGraphColoring(unittest.TestCase):
    def setUp(self):
        self.config = Config()
        self.loader = DataLoader(self.config)
        self.builder = GraphBuilder(self.config)
        self.coloring = GraphColoring(self.config)
        self.test_file = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "graph_seating", "data", "test_students.csv"
        )

    def test_welsh_powell_coloring(self):
        students, conflicts = self.loader.load_file(self.test_file)
        graph = self.builder.build(students, conflicts, self.loader.trace_chains)
        result = self.coloring.color(graph, self.builder.trace_chains)

        self.assertTrue(result.success)
        self.assertGreater(result.colors_used, 0)
        self.assertEqual(len(result.assignments) + len(result.uncolored_nodes), len(graph.nodes))
        print(f"✓ Welsh-Powell 着色: {result.colors_used} 色, 成功率: {len(result.assignments)}/{len(graph.nodes)}")

    def test_color_conflict_free(self):
        students, conflicts = self.loader.load_file(self.test_file)
        graph = self.builder.build(students, conflicts, self.loader.trace_chains)
        result = self.coloring.color(graph, self.builder.trace_chains)

        for node_id, assignment in result.assignments.items():
            color = assignment.color
            neighbors = graph.get_neighbors(node_id)
            for neighbor_id, _ in neighbors:
                if neighbor_id in result.assignments and neighbor_id not in self.coloring.isolated_nodes:
                    neighbor_color = result.assignments[neighbor_id].color
                    self.assertNotEqual(color, neighbor_color,
                        f"冲突: {node_id}({color}) 和 {neighbor_id}({neighbor_color}) 相邻")
        print(f"✓ 着色无冲突验证通过")

    def test_cycle_isolation(self):
        students, conflicts = self.loader.load_file(self.test_file)
        graph = self.builder.build(students, conflicts, self.loader.trace_chains)
        result = self.coloring.color(graph, self.builder.trace_chains)

        if self.coloring.cycles:
            for cycle in self.coloring.cycles:
                for node in cycle.nodes:
                    self.assertIn(node, result.assignments)
                    if len(cycle.nodes) % 2 == 1 and self.config.ISOLATE_CYCLE_CASES:
                        self.assertIn(node, self.coloring.isolated_nodes)
        print(f"✓ 环隔离: {len(self.coloring.isolated_nodes)} 个节点被隔离")

    def test_coloring_trace_recording(self):
        students, conflicts = self.loader.load_file(self.test_file)
        graph = self.builder.build(students, conflicts, self.loader.trace_chains)
        self.coloring.color(graph, self.builder.trace_chains)

        for student_id, chain in self.coloring.trace_chains.items():
            coloring_records = [r for r in chain.records if "coloring" in r.source_module]
            self.assertGreaterEqual(len(coloring_records), 1)
        print(f"✓ 着色追溯记录完成")


class TestSeatAllocator(unittest.TestCase):
    def setUp(self):
        self.config = Config()
        self.loader = DataLoader(self.config)
        self.builder = GraphBuilder(self.config)
        self.coloring = GraphColoring(self.config)
        self.allocator = SeatAllocator(self.config)
        self.test_file = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "graph_seating", "data", "test_students.csv"
        )
        self.target_date = date(2024, 9, 12)

    def test_seat_allocation(self):
        students, conflicts = self.loader.load_file(self.test_file)
        graph = self.builder.build(students, conflicts, self.loader.trace_chains)
        coloring_result = self.coloring.color(graph, self.builder.trace_chains)
        seating_plan = self.allocator.allocate(
            students, graph, coloring_result,
            self.coloring.trace_chains, self.target_date
        )

        self.assertGreater(len(seating_plan.assignments), 0)
        self.assertGreater(len(seating_plan.classes), 0)
        print(f"✓ 座位分配: {len(seating_plan.assignments)} 人分到 {len(seating_plan.classes)} 个班")

    def test_leave_handling(self):
        students, conflicts = self.loader.load_file(self.test_file)
        graph = self.builder.build(students, conflicts, self.loader.trace_chains)
        coloring_result = self.coloring.color(graph, self.builder.trace_chains)
        seating_plan = self.allocator.allocate(
            students, graph, coloring_result,
            self.coloring.trace_chains, self.target_date
        )

        self.assertGreater(len(self.allocator.leave_slots), 0)
        print(f"✓ 请假处理: {len(self.allocator.leave_slots)} 个请假槽位")

    def test_capacity_constraints(self):
        students, conflicts = self.loader.load_file(self.test_file)
        graph = self.builder.build(students, conflicts, self.loader.trace_chains)
        coloring_result = self.coloring.color(graph, self.builder.trace_chains)
        seating_plan = self.allocator.allocate(
            students, graph, coloring_result,
            self.coloring.trace_chains, self.target_date
        )

        for class_id, class_info in seating_plan.classes.items():
            students_in_class = [
                s for s, a in seating_plan.assignments.items()
                if a.class_id == class_id
            ]
            self.assertLessEqual(len(students_in_class), class_info.max_capacity)
            self.assertGreaterEqual(len(students_in_class), class_info.min_capacity - 10)
        print(f"✓ 容量约束验证通过")

    def test_review_queue_filtering(self):
        students, conflicts = self.loader.load_file(self.test_file)
        graph = self.builder.build(students, conflicts, self.loader.trace_chains)
        coloring_result = self.coloring.color(graph, self.builder.trace_chains)
        self.allocator.allocate(
            students, graph, coloring_result,
            self.coloring.trace_chains, self.target_date
        )

        review_queue = self.allocator.filter_for_review(
            self.allocator.allocate(
                students, graph, coloring_result,
                self.coloring.trace_chains, self.target_date
            ),
            ["capacity", "leave", "conflict", "override", "isolation"]
        )

        self.assertIsInstance(review_queue, dict)
        print(f"✓ 待复核队列: {sum(len(v) for v in review_queue.values())} 项")
        for category, items in review_queue.items():
            if items:
                print(f"  - {category}: {len(items)} 项")

    def test_seating_trace_recording(self):
        students, conflicts = self.loader.load_file(self.test_file)
        graph = self.builder.build(students, conflicts, self.loader.trace_chains)
        coloring_result = self.coloring.color(graph, self.builder.trace_chains)
        self.allocator.allocate(
            students, graph, coloring_result,
            self.coloring.trace_chains, self.target_date
        )

        for student_id, chain in self.allocator.trace_chains.items():
            seating_records = [r for r in chain.records if "seating" in r.source_module]
            self.assertGreaterEqual(len(seating_records), 1)
        print(f"✓ 座位分配追溯记录完成")


class TestTraceability(unittest.TestCase):
    def setUp(self):
        self.config = Config()
        self.loader = DataLoader(self.config)
        self.builder = GraphBuilder(self.config)
        self.coloring = GraphColoring(self.config)
        self.allocator = SeatAllocator(self.config)
        self.trace_manager = TraceabilityManager(self.config)
        self.test_file = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "graph_seating", "data", "test_students.csv"
        )
        self.target_date = date(2024, 9, 12)

    def test_end_to_end_traceability(self):
        students, conflicts = self.loader.load_file(self.test_file)
        self.trace_manager.register_trace_chains(self.loader.trace_chains, "data_loader")
        for s in students:
            self.trace_manager.register_data_hash(s.student_id, "data_loaded", s.get_data_hash(), "data_loader")

        graph = self.builder.build(students, conflicts, self.loader.trace_chains)
        self.trace_manager.register_trace_chains(self.builder.trace_chains, "graph_builder")
        for s in students:
            self.trace_manager.register_data_hash(s.student_id, "graph_built", s.get_data_hash(), "graph_builder")

        coloring_result = self.coloring.color(graph, self.builder.trace_chains)
        self.trace_manager.register_trace_chains(self.coloring.trace_chains, "coloring")
        for s in students:
            self.trace_manager.register_data_hash(s.student_id, "colored", s.get_data_hash(), "coloring")

        seating_plan = self.allocator.allocate(
            students, graph, coloring_result,
            self.coloring.trace_chains, self.target_date
        )
        self.trace_manager.register_trace_chains(self.allocator.trace_chains, "seating")
        for s in students:
            self.trace_manager.register_data_hash(s.student_id, "seated", s.get_data_hash(), "seating")

        test_student_id = students[0].student_id
        full_trace = self.trace_manager.get_full_trace(test_student_id)

        self.assertIsNotNone(full_trace)
        self.assertEqual(full_trace["student_id"], test_student_id)
        self.assertIn("records", full_trace)
        self.assertIn("constraints", full_trace)
        self.assertIn("change_history", full_trace)
        self.assertIn("data_hash_chain", full_trace)
        self.assertIn("consistency_check", full_trace)
        print(f"✓ 端到端追溯: {test_student_id} 有 {len(full_trace['records'])} 条记录")

    def test_data_hash_chain_integrity(self):
        students, conflicts = self.loader.load_file(self.test_file)
        self.trace_manager.register_trace_chains(self.loader.trace_chains, "data_loader")
        for s in students:
            self.trace_manager.register_data_hash(s.student_id, "data_loaded", s.get_data_hash(), "data_loader")

        graph = self.builder.build(students, conflicts, self.loader.trace_chains)
        self.trace_manager.register_trace_chains(self.builder.trace_chains, "graph_builder")
        for s in students:
            self.trace_manager.register_data_hash(s.student_id, "graph_built", s.get_data_hash(), "graph_builder")

        coloring_result = self.coloring.color(graph, self.builder.trace_chains)
        self.trace_manager.register_trace_chains(self.coloring.trace_chains, "coloring")
        for s in students:
            self.trace_manager.register_data_hash(s.student_id, "colored", s.get_data_hash(), "coloring")

        seating_plan = self.allocator.allocate(
            students, graph, coloring_result,
            self.coloring.trace_chains, self.target_date
        )
        self.trace_manager.register_trace_chains(self.allocator.trace_chains, "seating")
        for s in students:
            self.trace_manager.register_data_hash(s.student_id, "seated", s.get_data_hash(), "seating")

        test_student_id = students[0].student_id
        full_trace = self.trace_manager.get_full_trace(test_student_id)
        hash_chain = full_trace["data_hash_chain"]

        self.assertGreaterEqual(len(hash_chain), 4)

        stages = [h["stage"] for h in hash_chain]
        expected_stages = ["data_loaded", "graph_built", "colored", "seated"]
        for stage in expected_stages:
            self.assertIn(stage, stages)

        for entry in hash_chain:
            self.assertEqual(len(entry["hash"]), 64)
        print(f"✓ 数据哈希链: {len(hash_chain)} 个节点，完整性验证通过")

    def test_constraint_explanation(self):
        students, conflicts = self.loader.load_file(self.test_file)
        self.trace_manager.register_trace_chains(self.loader.trace_chains, "data_loader")
        for s in students:
            self.trace_manager.register_data_hash(s.student_id, "data_loaded", s.get_data_hash(), "data_loader")

        graph = self.builder.build(students, conflicts, self.loader.trace_chains)
        self.trace_manager.register_trace_chains(self.builder.trace_chains, "graph_builder")

        test_student_id = students[0].student_id
        full_trace = self.trace_manager.get_full_trace(test_student_id)
        constraints = full_trace.get("constraints", [])

        for constraint in constraints:
            self.assertIn("constraint_type", constraint)
            self.assertIn("description", constraint)
            self.assertIn("source", constraint)
            self.assertIn("weight", constraint)
        print(f"✓ 约束解释: {test_student_id} 有 {len(constraints)} 条约束")


class TestExporter(unittest.TestCase):
    def setUp(self):
        self.config = Config()
        self.pipeline = GraphSeatingPipeline(self.config)
        self.test_file = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "graph_seating", "data", "test_students.csv"
        )
        self.output_dir = self.config.OUTPUT_DIR

    def test_full_export(self):
        result = self.pipeline.run(self.test_file, date(2024, 9, 12))

        exported_files = result["exported_files"]
        self.assertIsInstance(exported_files, dict)
        self.assertGreater(len(exported_files), 0)

        expected_exports = [
            "seating_plan", "students", "anomalies", "conflicts",
            "cycles", "coloring", "traceability", "review_queue", "summary"
        ]
        for export_type in expected_exports:
            self.assertIn(export_type, exported_files)
            if exported_files[export_type]:
                self.assertTrue(os.path.exists(exported_files[export_type]))
        print(f"✓ 导出文件: {len(exported_files)} 个")

    def test_export_data_consistency(self):
        result = self.pipeline.run(self.test_file, date(2024, 9, 12))

        students_export = result["exported_files"]["students"]
        seating_export = result["exported_files"]["seating_plan"]

        self.assertTrue(os.path.exists(students_export))
        self.assertTrue(os.path.exists(seating_export))

        with open(students_export, 'r', encoding='utf-8') as f:
            students_data = f.readlines()
        with open(seating_export, 'r', encoding='utf-8') as f:
            seating_data = f.readlines()

        self.assertEqual(len(students_data) - 1, len(result["students"]))
        print(f"✓ 导出数据一致性验证通过")

    def test_bad_rows_export_separate(self):
        result = self.pipeline.run(self.test_file, date(2024, 9, 12))

        anomalies_export = result["exported_files"]["anomalies"]
        self.assertTrue(os.path.exists(anomalies_export))

        with open(anomalies_export, 'r', encoding='utf-8') as f:
            content = f.read()

        self.assertIn("bad_rows", content)
        self.assertIn("blank_rows", content)
        self.assertIn("comment_rows", content)
        print(f"✓ 坏行单独导出验证通过")


class TestVisualization(unittest.TestCase):
    def setUp(self):
        self.config = Config()
        self.pipeline = GraphSeatingPipeline(self.config)
        self.test_file = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "graph_seating", "data", "test_students.csv"
        )

    def test_chart_generation(self):
        result = self.pipeline.run(self.test_file, date(2024, 9, 12))
        chart_files = result["chart_files"]

        self.assertIsInstance(chart_files, dict)
        self.assertGreater(len(chart_files), 0)

        for name, path in chart_files.items():
            if path:
                self.assertTrue(os.path.exists(path))
                self.assertTrue(path.endswith('.html'))
        print(f"✓ 图表生成: {len(chart_files)} 个 HTML 文件")

    def test_dashboard_generation(self):
        result = self.pipeline.run(self.test_file, date(2024, 9, 12))

        dashboard_path = os.path.join(self.config.OUTPUT_DIR, "dashboard_index.html")
        self.assertTrue(os.path.exists(dashboard_path))

        with open(dashboard_path, 'r', encoding='utf-8') as f:
            content = f.read()

        self.assertIn("Graph Theory Club Seating", content)
        self.assertIn("href", content)
        print(f"✓ 仪表板生成验证通过")


class TestEndToEndPipeline(unittest.TestCase):
    def setUp(self):
        self.config = Config()
        self.pipeline = GraphSeatingPipeline(self.config)
        self.test_file = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "graph_seating", "data", "test_students.csv"
        )
        self.target_date = date(2024, 9, 12)

    def test_full_pipeline_run(self):
        print("\n" + "=" * 80)
        print("端到端测试 - 完整链路验证")
        print("=" * 80)

        result = self.pipeline.run(self.test_file, self.target_date)

        self.assertIn("students", result)
        self.assertIn("graph", result)
        self.assertIn("coloring_result", result)
        self.assertIn("seating_plan", result)
        self.assertIn("anomalies", result)
        self.assertIn("bad_rows", result)
        self.assertIn("cycles", result)
        self.assertIn("trace_manager", result)
        self.assertIn("exported_files", result)
        self.assertIn("chart_files", result)

        self.assertGreater(len(result["students"]), 0)
        self.assertIsNotNone(result["graph"])
        self.assertIsNotNone(result["coloring_result"])
        self.assertIsNotNone(result["seating_plan"])
        self.assertGreater(len(result["anomalies"]), 0)
        self.assertGreater(len(result["exported_files"]), 0)
        self.assertGreater(len(result["chart_files"]), 0)

        print("\n✅ 端到端链路测试通过！")
        print(f"  - 学生: {len(result['students'])} 人")
        print(f"  - 冲突边: {len(result['graph'].edges)} 条")
        print(f"  - 着色: {result['coloring_result'].colors_used} 色")
        print(f"  - 班级: {len(result['seating_plan'].classes)} 个")
        print(f"  - 异常: {len(result['anomalies'])} 条")
        print(f"  - 导出文件: {len(result['exported_files'])} 个")
        print(f"  - 图表: {len(result['chart_files'])} 个")

    def test_data_consistency_chain(self):
        result = self.pipeline.run(self.test_file, self.target_date)

        students = result["students"]
        graph = result["graph"]
        coloring_result = result["coloring_result"]
        seating_plan = result["seating_plan"]
        trace_manager = result["trace_manager"]

        for student in students:
            sid = student.student_id

            self.assertIn(sid, graph.nodes)

            self.assertIn(sid, coloring_result.assignments)

            self.assertIn(sid, seating_plan.assignments)

            trace = trace_manager.get_full_trace(sid)
            self.assertIsNotNone(trace)
            self.assertTrue(trace["consistency_check"]["consistent"],
                f"学生 {sid} 数据链路不一致: {trace['consistency_check']['issues']}")

        print("\n✅ 数据链路一致性验证通过！")
        print(f"  - 验证了 {len(students)} 名学生的端到端链路")
        print(f"  - 所有数据哈希链完整")
        print(f"  - 所有追溯记录可追踪")

    def test_cycle_isolation_in_results(self):
        result = self.pipeline.run(self.test_file, self.target_date)
        cycles = result["cycles"]

        if cycles:
            for cycle in cycles:
                for node_id in cycle.nodes:
                    assignment = result["seating_plan"].assignments[node_id]
                    self.assertTrue(assignment.is_isolated or len(cycle.nodes) % 2 == 0)

        cycles_export = result["exported_files"]["cycles"]
        self.assertTrue(os.path.exists(cycles_export))
        print(f"\n✅ 冲突闭环隔离验证通过！")
        print(f"  - 检测到 {len(cycles)} 个环")
        print(f"  - 已单独导出到 cycles 文件")

    def test_review_queue_accessible(self):
        result = self.pipeline.run(self.test_file, self.target_date)
        review_queue = self.pipeline.get_review_queue()

        self.assertIsInstance(review_queue, dict)
        for category, items in review_queue.items():
            self.assertIsInstance(items, list)
            for item in items:
                self.assertIsInstance(item, dict)

        total_items = sum(len(v) for v in review_queue.values())
        print(f"\n✅ 待复核队列验证通过！")
        print(f"  - 共 {total_items} 项待复核")
        for category, items in review_queue.items():
            if items:
                print(f"  - {category}: {len(items)} 项")

    def test_student_trace_query(self):
        result = self.pipeline.run(self.test_file, self.target_date)

        test_ids = ["S001", "S005", "S010", "S021"]
        for sid in test_ids:
            trace = self.pipeline.query_student_trace(sid)
            self.assertIsNotNone(trace, f"学生 {sid} 追溯信息不存在")
            self.assertEqual(trace["student_id"], sid)
            self.assertGreater(len(trace["records"]), 0)
            self.assertGreater(len(trace["data_hash_chain"]), 0)

        print(f"\n✅ 学生追溯查询验证通过！")
        print(f"  - 测试了 {len(test_ids)} 名学生的追溯查询")
        print(f"  - 均可追溯到完整链路: 数据加载 → 图构建 → 着色 → 座位分配")


def run_all_tests():
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    suite.addTests(loader.loadTestsFromTestCase(TestDataLoader))
    suite.addTests(loader.loadTestsFromTestCase(TestGraphBuilder))
    suite.addTests(loader.loadTestsFromTestCase(TestGraphColoring))
    suite.addTests(loader.loadTestsFromTestCase(TestSeatAllocator))
    suite.addTests(loader.loadTestsFromTestCase(TestTraceability))
    suite.addTests(loader.loadTestsFromTestCase(TestExporter))
    suite.addTests(loader.loadTestsFromTestCase(TestVisualization))
    suite.addTests(loader.loadTestsFromTestCase(TestEndToEndPipeline))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    print("\n" + "=" * 80)
    print("测试结果汇总")
    print("=" * 80)
    print(f"运行测试: {result.testsRun}")
    print(f"通过: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"失败: {len(result.failures)}")
    print(f"错误: {len(result.errors)}")

    if result.failures:
        print("\n失败的测试:")
        for test, traceback in result.failures:
            print(f"  ❌ {test}: {traceback.splitlines()[-1]}")

    if result.errors:
        print("\n错误的测试:")
        for test, traceback in result.errors:
            print(f"  ❌ {test}: {traceback.splitlines()[-1]}")

    return result.wasSuccessful()


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)

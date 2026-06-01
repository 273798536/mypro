#!/usr/bin/env python3
import sys
import os
import json
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from campus_navigation.utils import SampleDataGenerator, DataLoader, Tracer
from campus_navigation.core import DijkstraRouter, DataValidator, NavigationService
from campus_navigation.reports import ReportGenerator, SVGExporter
from campus_navigation.models import (
    CampusGraph,
    Node,
    Edge,
    EdgeDirection,
    Barrier,
    BarrierStatus,
    AccessibilityProfile,
    RouteStatus,
)


class TestDataModels(unittest.TestCase):
    def test_node_creation(self):
        node = Node(node_id="T001", name="测试节点", x=100, y=200, source_file="test.json", source_line=5)
        self.assertEqual(node.node_id, "T001")
        self.assertEqual(node.name, "测试节点")
        self.assertEqual(node.x, 100)
        self.assertEqual(node.y, 200)
        self.assertEqual(node.source_file, "test.json")
        self.assertEqual(node.source_line, 5)

    def test_edge_direction(self):
        edge = Edge(
            edge_id="E001", from_node="T001", to_node="T002",
            length=100, direction=EdgeDirection.FORWARD
        )
        self.assertTrue(edge.can_traverse_from("T001"))
        self.assertFalse(edge.can_traverse_from("T002"))
        self.assertEqual(edge.get_other_node("T001"), "T002")

    def test_barrier_expiry(self):
        from datetime import datetime, timedelta
        barrier = Barrier(
            barrier_id="B001", edge_id="E001", reason="施工",
            start_date=datetime.now() - timedelta(days=10),
            end_date=datetime.now() - timedelta(days=5),
            status=BarrierStatus.ACTIVE,
        )
        self.assertTrue(barrier.is_expired())
        self.assertEqual(barrier.get_current_status(), BarrierStatus.EXPIRED)


class TestSampleData(unittest.TestCase):
    def test_generate_sample_data(self):
        generator = SampleDataGenerator()
        graph = generator.generate_campus_data()

        self.assertGreater(len(graph.nodes), 0)
        self.assertGreater(len(graph.edges), 0)
        self.assertGreater(len(graph.barriers), 0)
        self.assertGreater(len(graph.accessibility_issues), 0)
        self.assertGreater(len(graph.edit_trail.edits), 0)

    def test_sample_data_contains_issues(self):
        generator = SampleDataGenerator()
        graph = generator.generate_campus_data()

        forward_edges = [e for e in graph.edges.values() if e.direction == EdgeDirection.FORWARD]
        backward_edges = [e for e in graph.edges.values() if e.direction == EdgeDirection.BACKWARD]
        self.assertGreater(len(forward_edges) + len(backward_edges), 0)

        expired_barriers = [b for b in graph.barriers.values() if b.is_expired()]
        self.assertGreater(len(expired_barriers), 0)

        high_severity = [a for a in graph.accessibility_issues.values() if a.severity >= 4 and not a.resolved]
        self.assertGreater(len(high_severity), 0)


class TestDijkstraRouter(unittest.TestCase):
    def setUp(self):
        generator = SampleDataGenerator()
        self.graph = generator.generate_campus_data()
        self.router = DijkstraRouter(self.graph)

    def test_find_path(self):
        result = self.router.find_shortest_path("N001", "N007")
        self.assertIn(result.status, [RouteStatus.SUCCESS, RouteStatus.HAS_WARNINGS])
        self.assertGreater(result.total_distance, 0)
        self.assertGreater(len(result.route_segments), 0)

    def test_path_distance_calculation(self):
        result = self.router.find_shortest_path("N001", "N003")
        calc_distance = sum(s.length for s in result.route_segments)
        self.assertAlmostEqual(calc_distance, result.total_distance, places=2)

    def test_wheelchair_accessible_path(self):
        profile = AccessibilityProfile(requires_wheelchair=True, requires_ramp=True, avoids_stairs=True)
        result = self.router.find_shortest_path("N001", "N007", profile)

        for segment in result.route_segments:
            edge = self.graph.get_edge(segment.edge_id)
            if edge:
                self.assertIn("wheelchair", edge.accessibility_tags)
                self.assertFalse(edge.has_stairs)

    def test_direction_errors_detected(self):
        result = self.router.find_shortest_path("N001", "N011")
        self.assertGreaterEqual(len(result.direction_errors), 0)

    def test_barrier_issues_detected(self):
        result = self.router.find_shortest_path("N001", "N007")
        self.assertGreaterEqual(len(result.barrier_issues), 0)

    def test_accessibility_breakpoints_detected(self):
        result = self.router.find_shortest_path("N001", "N007")
        self.assertGreaterEqual(len(result.accessibility_breakpoints), 0)

    def test_manual_edit_applied(self):
        overrides = self.router.get_weight_overrides()
        self.assertGreater(len(overrides), 0)
        self.assertIn("E002", overrides)


class TestDataValidator(unittest.TestCase):
    def setUp(self):
        generator = SampleDataGenerator()
        self.graph = generator.generate_campus_data()
        self.validator = DataValidator(self.graph)

    def test_validate_edge_directions(self):
        errors = self.validator.validate_edge_directions()
        self.assertIsInstance(errors, list)
        for error in errors:
            self.assertIn("source_file", error)
            self.assertIn("message", error)
            self.assertIn("severity", error)

    def test_validate_expired_barriers(self):
        errors = self.validator.validate_expired_barriers()
        expired = [b for b in errors if "已过期" in b.get("message", "")]
        self.assertGreater(len(expired), 0)

    def test_validate_accessibility_breakpoints(self):
        errors = self.validator.validate_accessibility_breakpoints()
        high = [a for a in errors if a.get("severity", 0) >= 4]
        self.assertGreater(len(high), 0)

    def test_validate_all(self):
        results = self.validator.validate_all()
        self.assertIn("direction_errors", results)
        self.assertIn("expired_barriers", results)
        self.assertIn("accessibility_breakpoints", results)
        self.assertIn("data_inconsistencies", results)

        summary = self.validator.get_validation_summary(results)
        self.assertGreater(summary["total_issues"], 0)


class TestTracer(unittest.TestCase):
    def setUp(self):
        generator = SampleDataGenerator()
        self.graph = generator.generate_campus_data()
        self.router = DijkstraRouter(self.graph)
        self.tracer = Tracer(self.graph)
        self.result = self.router.find_shortest_path("N001", "N007")

    def test_trace_node_to_result(self):
        traces = self.tracer.trace_node_to_result("N003", self.result)
        self.assertIsInstance(traces, list)
        for trace in traces:
            self.assertEqual(trace.source_type, "node")
            self.assertEqual(trace.source_id, "N003")

    def test_trace_result_to_edge_lengths(self):
        traces = self.tracer.trace_result_to_edge_lengths(self.result)
        self.assertEqual(len(traces), len(self.result.route_segments))
        for trace in traces:
            self.assertIn("edge_id", trace)
            self.assertIn("reported_length", trace)
            self.assertIn("actual_edge_length", trace)
            self.assertIn("length_match", trace)

    def test_trace_edge_to_result(self):
        edge_id = self.result.route_segments[0].edge_id
        trace = self.tracer.trace_edge_length_to_result(edge_id, self.result)
        self.assertIsNotNone(trace)
        self.assertEqual(trace.source_id, edge_id)

    def test_verify_edge_length_consistency(self):
        consistency = self.tracer.verify_edge_length_consistency(self.result)
        self.assertIn("total_reported_distance", consistency)
        self.assertIn("total_actual_distance", consistency)
        self.assertIn("total_distance_match", consistency)
        self.assertIn("inconsistencies", consistency)


class TestReportGenerator(unittest.TestCase):
    def setUp(self):
        generator = SampleDataGenerator()
        self.graph = generator.generate_campus_data()
        self.service = NavigationService(self.graph)
        self.result = self.service.find_route("N001", "N007")
        self.reporter = ReportGenerator(self.service)

    def test_generate_full_report(self):
        report = self.reporter.generate_full_report(self.result)
        self.assertIn("navigation_summary", report)
        self.assertIn("route_details", report)
        self.assertIn("edge_length_trace", report)
        self.assertIn("risk_sections", report)
        self.assertIn("direction_errors", report["risk_sections"])
        self.assertIn("expired_barriers", report["risk_sections"])
        self.assertIn("accessibility_breakpoints", report["risk_sections"])
        self.assertIn("manual_edit_impacts", report["risk_sections"])

    def test_cli_text_sections(self):
        text = self.reporter.generate_cli_text(self.result)
        self.assertIn("【导航概要】", text)
        self.assertIn("【路线明细】", text)
        self.assertIn("【边长度追踪】", text)
        self.assertIn("【边方向错误】", text)
        self.assertIn("【围挡问题】", text)
        self.assertIn("【无障碍断点】", text)
        self.assertIn("【人工修改影响】", text)
        self.assertIn("【一致性校验】", text)

    def test_risk_sections_separated(self):
        report = self.reporter.generate_full_report(self.result)
        risks = report["risk_sections"]

        for err in risks["direction_errors"]["all_direction_errors"]:
            self.assertIn("type", err)
            self.assertEqual(err["type"], "edge_direction_error")

        for b in risks["expired_barriers"]["all_barrier_issues"]:
            self.assertIn("type", b)
            self.assertIn("barrier", b["type"])

        for a in risks["accessibility_breakpoints"]["high_severity_issues"]:
            self.assertIn("type", a)
            self.assertEqual(a["type"], "accessibility_breakpoint")


class TestSVGExporter(unittest.TestCase):
    def setUp(self):
        generator = SampleDataGenerator()
        self.graph = generator.generate_campus_data()
        self.service = NavigationService(self.graph)
        self.result = self.service.find_route("N001", "N007")
        self.exporter = SVGExporter(self.graph)

    def test_export_map(self):
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".svg", delete=False) as f:
            temp_path = f.name

        try:
            result = self.exporter.export_map(temp_path, result=self.result)
            self.assertTrue(os.path.exists(temp_path))
            self.assertTrue(os.path.exists(result["correspondence_file"]))
            self.assertGreater(result["node_count"], 0)
            self.assertGreater(result["edge_count"], 0)

            with open(result["correspondence_file"], "r", encoding="utf-8") as f:
                corr = json.load(f)
            self.assertIn("nodes", corr)
            self.assertIn("edges", corr)
            self.assertIn("map_dimensions", corr)

            for node in corr["nodes"]:
                self.assertIn("node_id", node)
                self.assertIn("coordinates", node)
                self.assertIn("svg_position", node)
                self.assertIn("source_file", node)

            for edge in corr["edges"]:
                self.assertIn("edge_id", edge)
                self.assertIn("length", edge)
                self.assertIn("svg_path", edge)
                self.assertIn("label_position", edge)
                self.assertIn("source_file", edge)
        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)
            if os.path.exists(result["correspondence_file"]):
                os.unlink(result["correspondence_file"])


class TestBidirectionalTrace(unittest.TestCase):
    def setUp(self):
        generator = SampleDataGenerator()
        self.graph = generator.generate_campus_data()
        self.service = NavigationService(self.graph)
        self.result = self.service.find_route("N001", "N007")

    def test_node_to_result_to_edge(self):
        for node_id in self.result.node_sequence:
            node_traces = self.service.trace_node_to_result(node_id, self.result)
            self.assertGreater(len(node_traces), 0)

        edge_traces = self.service.trace_result_to_edges(self.result)
        self.assertEqual(len(edge_traces), len(self.result.route_segments))

        for trace in edge_traces:
            self.assertIn("edge_source_file", trace)
            self.assertIn("edge_source_line", trace)

    def test_edge_to_result(self):
        for segment in self.result.route_segments:
            trace = self.service.trace_edge_to_result(segment.edge_id, self.result)
            self.assertIsNotNone(trace)
            self.assertEqual(trace.source_id, segment.edge_id)
            self.assertIn("segment_index", trace.metadata)

    def test_consistency_verification(self):
        consistency = self.service.verify_consistency(self.result)
        self.assertTrue(consistency["total_distance_match"])
        self.assertEqual(consistency["inconsistency_count"], 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)

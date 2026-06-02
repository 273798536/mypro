import json
import os
from datetime import datetime, timedelta
from typing import Dict, Any, List
from ..models import (
    CampusGraph,
    Node,
    Edge,
    EdgeDirection,
    Barrier,
    BarrierStatus,
    AccessibilityIssue,
    AccessibilityIssueType,
    ManualEdit,
    EditType,
)


class SampleDataGenerator:
    def __init__(self):
        self.graph = CampusGraph()

    def generate_campus_data(self) -> CampusGraph:
        self._generate_nodes()
        self._generate_edges()
        self._generate_barriers()
        self._generate_accessibility_issues()
        self._generate_manual_edits()
        return self.graph

    def _generate_nodes(self) -> None:
        nodes_data = [
            ("N001", "校门", 0, 0, "主入口"),
            ("N002", "行政楼", 100, 50, "行政办公楼"),
            ("N003", "图书馆", 200, 100, "图书馆"),
            ("N004", "教学楼A", 150, 200, "教学楼A座"),
            ("N005", "教学楼B", 250, 200, "教学楼B座"),
            ("N006", "食堂", 300, 100, "学生食堂"),
            ("N007", "宿舍1号楼", 350, 200, "学生宿舍1号楼"),
            ("N008", "体育馆", 200, 300, "体育馆"),
            ("N009", "实验楼", 100, 300, "实验楼"),
            ("N010", "医务室", 50, 200, "校医务室"),
            ("N011", "北门", -50, 150, "校园北门"),
            ("N012", "停车场", 400, 50, "校园停车场"),
        ]

        for node_id, name, x, y, desc in nodes_data:
            node = Node(
                node_id=node_id,
                name=name,
                x=x,
                y=y,
                description=desc,
                source_file="sample_campus.json",
            )
            self.graph.add_node(node)

    def _generate_edges(self) -> None:
        edges_data = [
            ("E001", "N001", "N002", 112, EdgeDirection.BIDIRECTIONAL, ["wheelchair", "ramp"], 3.0, False, True, False, "主入口大道"),
            ("E002", "N002", "N003", 112, EdgeDirection.BIDIRECTIONAL, ["wheelchair", "ramp"], 3.0, False, True, False, "行政楼到图书馆"),
            ("E003", "N003", "N004", 112, EdgeDirection.BIDIRECTIONAL, ["wheelchair", "ramp"], 3.0, False, True, False, "图书馆到教学楼A"),
            ("E004", "N004", "N005", 100, EdgeDirection.BIDIRECTIONAL, ["wheelchair", "ramp"], 3.0, False, True, False, "教学楼A到B"),
            ("E005", "N005", "N006", 112, EdgeDirection.BIDIRECTIONAL, ["wheelchair", "ramp"], 3.0, False, True, False, "教学楼B到食堂"),
            ("E006", "N006", "N007", 112, EdgeDirection.BIDIRECTIONAL, ["wheelchair", "ramp"], 3.0, False, True, False, "食堂到宿舍"),
            ("E007", "N004", "N008", 112, EdgeDirection.BIDIRECTIONAL, ["wheelchair", "ramp"], 3.0, False, True, False, "教学楼A到体育馆"),
            ("E008", "N008", "N009", 100, EdgeDirection.BIDIRECTIONAL, ["wheelchair", "ramp"], 3.0, False, True, False, "体育馆到实验楼"),
            ("E009", "N009", "N010", 112, EdgeDirection.BIDIRECTIONAL, ["wheelchair", "ramp"], 3.0, False, True, False, "实验楼到医务室"),
            ("E010", "N010", "N011", 112, EdgeDirection.BIDIRECTIONAL, ["wheelchair", "ramp"], 3.0, False, True, False, "医务室到北门"),
            ("E011", "N002", "N010", 150, EdgeDirection.BIDIRECTIONAL, ["stairs"], None, True, False, False, "行政楼到医务室（有台阶）"),
            ("E012", "N006", "N012", 141, EdgeDirection.BIDIRECTIONAL, ["wheelchair", "ramp"], 3.0, False, True, False, "食堂到停车场"),
            ("E013", "N003", "N006", 100, EdgeDirection.BIDIRECTIONAL, ["wheelchair", "ramp"], 3.0, False, True, False, "图书馆到食堂捷径"),
            ("E014", "N007", "N008", 141, EdgeDirection.BIDIRECTIONAL, ["wheelchair", "ramp"], 3.0, False, True, False, "宿舍到体育馆"),
            ("E015", "N001", "N011", 180, EdgeDirection.FORWARD, ["wheelchair", "ramp"], 3.0, False, True, False, "入口到北门单向道"),
            ("E016", "N009", "N004", 141, EdgeDirection.BACKWARD, ["stairs"], None, True, False, False, "实验楼到教学楼A（单向，有台阶）"),
            ("E017", "N002", "N009", 250, EdgeDirection.BIDIRECTIONAL, ["wheelchair", "elevator"], 2.5, False, False, True, "行政楼到实验楼电梯通道"),
        ]

        for edge_id, from_node, to_node, length, direction, tags, width, has_stairs, has_ramp, has_elevator, desc in edges_data:
            edge = Edge(
                edge_id=edge_id,
                from_node=from_node,
                to_node=to_node,
                length=length,
                direction=direction,
                accessibility_tags=tags,
                width=width,
                has_stairs=has_stairs,
                has_ramp=has_ramp,
                has_elevator=has_elevator,
                description=desc,
                source_file="sample_campus.json",
            )
            self.graph.add_edge(edge)

    def _generate_barriers(self) -> None:
        now = datetime.now()
        barriers_data = [
            ("B001", "E003", "道路施工", now - timedelta(days=30), now - timedelta(days=5), BarrierStatus.ACTIVE, None, "图书馆前主路维修", "张工"),
            ("B002", "E007", "管线维修", now - timedelta(days=10), now + timedelta(days=20), BarrierStatus.ACTIVE, None, "教学楼A到体育馆管线改造", "李工"),
            ("B003", "E011", "过期围挡", now - timedelta(days=60), now - timedelta(days=30), BarrierStatus.ACTIVE, None, "此围挡已过期未拆除", "王工"),
            ("B004", "E005", "临时围挡", now + timedelta(days=5), now + timedelta(days=15), BarrierStatus.SCHEDULED, None, "计划中施工", "赵工"),
            ("B005", "E009", "绿化施工", now - timedelta(days=15), now + timedelta(days=5), BarrierStatus.ACTIVE, "forward", "半幅施工，单向通行", "刘工"),
        ]

        for barrier_id, edge_id, reason, start, end, status, aff_dir, desc, contact in barriers_data:
            barrier = Barrier(
                barrier_id=barrier_id,
                edge_id=edge_id,
                reason=reason,
                start_date=start,
                end_date=end,
                status=status,
                affected_direction=aff_dir,
                description=desc,
                contact_person=contact,
                source_file="sample_campus.json",
            )
            self.graph.add_barrier(barrier)

    def _generate_accessibility_issues(self) -> None:
        now = datetime.now()
        issues_data = [
            ("A001", "E011", AccessibilityIssueType.STAIRS_ONLY, 5, "只有台阶，无坡道", "行政楼到医务室路段", "运维检查", now - timedelta(days=20), False, None),
            ("A002", "E008", AccessibilityIssueType.NARROW_PATH, 3, "道路狭窄，轮椅通行困难", "体育馆到实验楼中间段", "学生反馈", now - timedelta(days=10), False, None),
            ("A003", "E016", AccessibilityIssueType.STAIRS_ONLY, 5, "只有台阶，无电梯", "实验楼到教学楼A", "系统检测", now - timedelta(days=5), False, None),
            ("A004", "E002", AccessibilityIssueType.UNEVEN_SURFACE, 2, "路面不平整", "行政楼到图书馆", "日常巡查", now - timedelta(days=3), False, None),
            ("A005", "E010", AccessibilityIssueType.BROKEN_TACTILE_PAVING, 4, "盲道砖破损", "医务室到北门路段", "运维检查", now - timedelta(days=2), False, None),
        ]

        for issue_id, edge_id, issue_type, severity, desc, location, reporter, report_date, resolved, resolved_date in issues_data:
            issue = AccessibilityIssue(
                issue_id=issue_id,
                edge_id=edge_id,
                issue_type=issue_type,
                severity=severity,
                description=desc,
                location_detail=location,
                reported_by=reporter,
                reported_date=report_date,
                resolved=resolved,
                resolved_date=resolved_date,
                source_file="sample_campus.json",
            )
            self.graph.add_accessibility_issue(issue)

    def _generate_manual_edits(self) -> None:
        now = datetime.now()
        edits_data = [
            ("M001", EditType.EDGE_WEIGHT_OVERRIDE, "运维主管", now - timedelta(days=2), "临时调整权重", "E002", 112, 200, ["N002", "N003"], ["E002"], {"reason": "人流过大，临时增加权重"}),
            ("M002", EditType.BARRIER_STATUS_CHANGE, "运维主管", now - timedelta(days=1), "过期围挡标记", "B003", "active", "expired", [], ["E011"], {"note": "围挡已过期，应拆除"}),
            ("M003", EditType.ROUTE_SEGMENT_OVERRIDE, "调度员", now - timedelta(hours=2), "手动指定绕行路线", "N004-N008", None, ["N004", "N005", "N008"], ["N004", "N005", "N008"], ["E004", "E014"], {"original_route": "E007"}),
        ]

        for edit_id, edit_type, editor, edit_time, reason, target_id, old_val, new_val, aff_nodes, aff_edges, metadata in edits_data:
            edit = ManualEdit(
                edit_id=edit_id,
                edit_type=edit_type,
                editor=editor,
                edit_time=edit_time,
                reason=reason,
                target_id=target_id,
                old_value=old_val,
                new_value=new_val,
                affected_node_ids=aff_nodes,
                affected_edge_ids=aff_edges,
                metadata=metadata,
                source_file="sample_campus.json",
            )
            self.graph.add_manual_edit(edit)

    def save_sample_data(self, output_dir: str) -> Dict[str, str]:
        os.makedirs(output_dir, exist_ok=True)
        graph = self.generate_campus_data()

        main_data_file = os.path.join(output_dir, "sample_campus.json")
        from .data_loader import DataLoader
        loader = DataLoader()
        loader.save_to_file(graph, main_data_file)

        separate_files = {
            "main": main_data_file,
        }

        nodes_only_file = os.path.join(output_dir, "nodes_only.json")
        with open(nodes_only_file, "w", encoding="utf-8") as f:
            json.dump({"nodes": [n.to_dict() for n in graph.nodes.values()]}, f, ensure_ascii=False, indent=2)
        separate_files["nodes"] = nodes_only_file

        edges_only_file = os.path.join(output_dir, "edges_only.json")
        with open(edges_only_file, "w", encoding="utf-8") as f:
            json.dump({"edges": [e.to_dict() for e in graph.edges.values()]}, f, ensure_ascii=False, indent=2)
        separate_files["edges"] = edges_only_file

        barriers_only_file = os.path.join(output_dir, "barriers_only.json")
        with open(barriers_only_file, "w", encoding="utf-8") as f:
            json.dump({"barriers": [b.to_dict() for b in graph.barriers.values()]}, f, ensure_ascii=False, indent=2)
        separate_files["barriers"] = barriers_only_file

        accessibility_only_file = os.path.join(output_dir, "accessibility_only.json")
        with open(accessibility_only_file, "w", encoding="utf-8") as f:
            json.dump({"accessibility_issues": [a.to_dict() for a in graph.accessibility_issues.values()]}, f, ensure_ascii=False, indent=2)
        separate_files["accessibility"] = accessibility_only_file

        edits_only_file = os.path.join(output_dir, "manual_edits_only.json")
        with open(edits_only_file, "w", encoding="utf-8") as f:
            json.dump({"manual_edits": [e.to_dict() for e in graph.edit_trail.edits]}, f, ensure_ascii=False, indent=2)
        separate_files["edits"] = edits_only_file

        return separate_files

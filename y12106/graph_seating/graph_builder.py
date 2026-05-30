from typing import List, Dict, Set, Tuple, Optional, Any
from collections import defaultdict
from datetime import date
import itertools

from .config import Config
from .models import Student, ConflictRelation, ConflictGraph, LeaveRecord
from .models.trace import TraceChain, TraceRecord, ConstraintExplanation


class GraphBuilder:
    def __init__(self, config: Optional[Config] = None):
        self.config = config or Config()
        self.graph = ConflictGraph()
        self.trace_chains: Dict[str, TraceChain] = {}
        self.conflict_sources: Dict[str, List[Dict[str, Any]]] = defaultdict(list)

    def build(self, students: List[Student],
              explicit_conflicts: List[ConflictRelation],
              trace_chains: Optional[Dict[str, TraceChain]] = None) -> ConflictGraph:

        if trace_chains:
            self.trace_chains = trace_chains

        for student in students:
            self.graph.add_node(student.student_id, {
                "name": student.name,
                "grade": student.grade,
                "class": student.class_name,
                "gender": student.gender,
                "interest_tags": student.interest_tags,
                "special_needs": student.special_needs,
                "has_leave": len(student.leave_records) > 0,
                "is_valid": student.is_valid
            })

        self._add_explicit_conflicts(explicit_conflicts)
        self._add_interest_based_conflicts(students)
        self._add_leave_overlap_conflicts(students)
        self._add_special_needs_conflicts(students)
        self._add_grade_separation(students)

        self._trace_graph_building(students)

        return self.graph

    def _add_explicit_conflicts(self, conflicts: List[ConflictRelation]):
        for conflict in conflicts:
            if conflict.weight <= 0 or not conflict.active:
                continue

            edge = self.graph.add_edge(
                conflict.student_a_id,
                conflict.student_b_id,
                weight=conflict.weight,
                conflict_type=conflict.conflict_type,
                attributes={
                    "source": conflict.source,
                    "description": conflict.description,
                    "created_at": conflict.created_at.isoformat()
                }
            )

            if edge:
                self._record_conflict_source(
                    conflict.student_a_id, conflict.student_b_id,
                    "explicit", conflict.weight, conflict.description
                )

                self._add_constraint_to_traces(
                    conflict.student_a_id, conflict.student_b_id,
                    "explicit_conflict",
                    f"明确冲突: {conflict.description}",
                    conflict.source,
                    conflict.weight
                )

    def _add_interest_based_conflicts(self, students: List[Student]):
        opposite_pairs = [
            ({"安静", "阅读", "学习"}, {"好动", "运动", "游戏"}),
            ({"艺术", "音乐", "绘画"}, {"科技", "编程", "机器人"}),
            ({"内向", "独处"}, {"外向", "社交"})
        ]

        student_interests: Dict[str, Set[str]] = {
            s.student_id: set(s.interest_tags) for s in students
        }

        for s1, s2 in itertools.combinations(students, 2):
            if s1.student_id == s2.student_id:
                continue

            interests1 = student_interests.get(s1.student_id, set())
            interests2 = student_interests.get(s2.student_id, set())

            if not interests1 or not interests2:
                continue

            is_opposite = False
            for group_a, group_b in opposite_pairs:
                if (interests1 & group_a and interests2 & group_b) or \
                   (interests1 & group_b and interests2 & group_a):
                    is_opposite = True
                    break

            if is_opposite:
                weight = self.config.CONFLICT_WEIGHTS["interest_opposite"]
                edge = self.graph.add_edge(
                    s1.student_id, s2.student_id,
                    weight=weight,
                    conflict_type="interest_opposite",
                    attributes={
                        "s1_interests": list(interests1),
                        "s2_interests": list(interests2)
                    }
                )

                if edge:
                    self._record_conflict_source(
                        s1.student_id, s2.student_id,
                        "interest_opposite", weight,
                        f"兴趣对立: {list(interests1 & set.union(*[g for pair in opposite_pairs for g in pair]))} vs {list(interests2)}"
                    )

                    self._add_constraint_to_traces(
                        s1.student_id, s2.student_id,
                        "interest_conflict",
                        f"兴趣标签对立，不宜同班",
                        "interest_tags",
                        weight
                    )

    def _add_leave_overlap_conflicts(self, students: List[Student]):
        student_leaves: Dict[str, List[LeaveRecord]] = {
            s.student_id: [lr for lr in s.leave_records if lr.approved] for s in students
        }

        for s1, s2 in itertools.combinations(students, 2):
            if s1.student_id == s2.student_id:
                continue

            leaves1 = student_leaves.get(s1.student_id, [])
            leaves2 = student_leaves.get(s2.student_id, [])

            if not leaves1 or not leaves2:
                continue

            overlap_found = False
            max_overlap_days = 0
            overlapping_periods = []

            for l1 in leaves1:
                for l2 in leaves2:
                    if l1.overlaps_with(l2):
                        overlap_start = max(l1.start_date, l2.start_date)
                        overlap_end = min(l1.end_date, l2.end_date)
                        overlap_days = (overlap_end - overlap_start).days + 1
                        max_overlap_days = max(max_overlap_days, overlap_days)
                        overlapping_periods.append({
                            "s1_leave": l1.to_dict(),
                            "s2_leave": l2.to_dict(),
                            "overlap_days": overlap_days
                        })
                        overlap_found = True

            if overlap_found and max_overlap_days >= 3:
                weight = min(
                    self.config.CONFLICT_WEIGHTS["leave_overlap"] + (max_overlap_days * 0.05),
                    0.9
                )
                edge = self.graph.add_edge(
                    s1.student_id, s2.student_id,
                    weight=weight,
                    conflict_type="leave_overlap",
                    attributes={
                        "max_overlap_days": max_overlap_days,
                        "overlapping_periods": overlapping_periods
                    }
                )

                if edge:
                    self._record_conflict_source(
                        s1.student_id, s2.student_id,
                        "leave_overlap", weight,
                        f"请假重叠{max_overlap_days}天，请假期间班级管理复杂度高"
                    )

                    self._add_constraint_to_traces(
                        s1.student_id, s2.student_id,
                        "leave_overlap",
                        f"请假期间重叠{max_overlap_days}天，不宜同班以降低管理风险",
                        "leave_records",
                        weight,
                        evidence=overlapping_periods
                    )

    def _add_special_needs_conflicts(self, students: List[Student]):
        special_needs_students = [s for s in students if s.special_needs]

        for student in special_needs_students:
            needs = student.special_needs.lower()

            if "过敏" in needs or "哮喘" in needs:
                for other in students:
                    if other.student_id == student.student_id:
                        continue

                    other_tags = set(t.lower() for t in other.interest_tags)
                    if "运动" in other_tags or "体育" in other_tags:
                        weight = self.config.CONFLICT_WEIGHTS["special_needs"]
                        edge = self.graph.add_edge(
                            student.student_id, other.student_id,
                            weight=weight,
                            conflict_type="special_needs",
                            attributes={
                                "student_needs": student.special_needs,
                                "other_tags": other.interest_tags
                            }
                        )
                        if edge:
                            self._add_constraint_to_traces(
                                student.student_id, other.student_id,
                                "special_needs",
                                f"特殊需求: {student.special_needs} vs 活跃学生",
                                "special_needs",
                                weight
                            )

    def _add_grade_separation(self, students: List[Student]):
        grades = defaultdict(list)
        for s in students:
            if s.grade:
                grades[s.grade].append(s.student_id)

        for grade, student_ids in grades.items():
            if len(student_ids) < 2:
                continue

    def _record_conflict_source(self, s1: str, s2: str, source_type: str,
                                weight: float, description: str):
        key = tuple(sorted([s1, s2]))
        self.conflict_sources[key].append({
            "type": source_type,
            "weight": weight,
            "description": description
        })

    def _add_constraint_to_traces(self, s1: str, s2: str, constraint_type: str,
                                  description: str, source: str, weight: float,
                                  evidence: Optional[List[Dict[str, Any]]] = None):
        for student_id in [s1, s2]:
            if student_id not in self.trace_chains:
                self.trace_chains[student_id] = TraceChain(student_id=student_id)

            chain = self.trace_chains[student_id]
            other_id = s2 if student_id == s1 else s1

            chain.add_constraint(ConstraintExplanation(
                student_id=student_id,
                constraint_type=constraint_type,
                description=description,
                source=source,
                weight=weight,
                affected_students=[other_id],
                evidence=evidence or []
            ))

    def _trace_graph_building(self, students: List[Student]):
        if not self.config.ENABLE_TRACE:
            return

        summary = self.graph.summary()

        for student in students:
            if student.student_id not in self.trace_chains:
                continue

            chain = self.trace_chains[student.student_id]
            neighbors = self.graph.get_neighbors(student.student_id)

            chain.add_record(TraceRecord(
                student_id=student.student_id,
                trace_type="graph_build",
                action="node_added",
                description=f"在冲突图中添加节点，连接{len(neighbors)}个冲突节点",
                source_module="graph_builder",
                data_hash=student.get_data_hash(),
                input_state={"student_id": student.student_id},
                output_state={
                    "degree": len(neighbors),
                    "neighbors": [{"id": n[0], "weight": n[1]} for n in neighbors]
                },
                constraints=[
                    ConstraintExplanation(
                        student_id=student.student_id,
                        constraint_type="graph_edges",
                        description=f"建立{len(neighbors)}条冲突边",
                        source="graph_builder",
                        weight=1.0,
                        affected_students=[n[0] for n in neighbors],
                        evidence=[{"neighbor": n[0], "weight": n[1]} for n in neighbors]
                    )
                ]
            ))

    def get_conflict_sources(self, student_a: str, student_b: str) -> List[Dict[str, Any]]:
        key = tuple(sorted([student_a, student_b]))
        return self.conflict_sources.get(key, [])

    def get_all_conflict_sources(self) -> Dict[Tuple[str, str], List[Dict[str, Any]]]:
        return dict(self.conflict_sources)

    def get_trace_chain(self, student_id: str) -> Optional[TraceChain]:
        return self.trace_chains.get(student_id)

    def get_all_trace_chains(self) -> Dict[str, TraceChain]:
        return self.trace_chains

    def validate_graph(self) -> List[str]:
        issues = []
        for student_id, node in self.graph.nodes.items():
            if node.degree > len(self.graph.nodes) * 0.5:
                issues.append(
                    f"学生{student_id}的冲突节点数过高（{node.degree}/{len(self.graph.nodes)}），"
                    f"可能导致着色困难"
                )

        isolated = [n for n in self.graph.nodes.values() if n.degree == 0]
        if len(isolated) > len(self.graph.nodes) * 0.3:
            issues.append(
                f"孤立节点比例过高（{len(isolated)}/{len(self.graph.nodes)}），"
                f"建议检查冲突数据完整性"
            )

        return issues

    def get_conflict_type_distribution(self) -> Dict[str, int]:
        distribution = defaultdict(int)
        for edge in self.graph.edges.values():
            distribution[edge.conflict_type] += 1
        return dict(distribution)

    def get_weight_distribution(self) -> Dict[str, int]:
        distribution = defaultdict(int)
        for edge in self.graph.edges.values():
            if edge.weight >= 0.9:
                distribution["high (>=0.9)"] += 1
            elif edge.weight >= 0.7:
                distribution["medium-high (0.7-0.9)"] += 1
            elif edge.weight >= 0.5:
                distribution["medium (0.5-0.7)"] += 1
            else:
                distribution["low (<0.5)"] += 1
        return dict(distribution)

from typing import List, Dict, Optional, Any, Tuple
from collections import defaultdict
from datetime import datetime

from .config import Config
from .models import Student, ConflictGraph, ColoringResult, SeatingPlan
from .models.trace import (
    TraceChain, TraceRecord, ConstraintExplanation, SeatChangeHistory
)


class TraceabilityManager:
    def __init__(self, config: Optional[Config] = None):
        self.config = config or Config()
        self.trace_chains: Dict[str, TraceChain] = {}
        self.data_hashes: Dict[str, List[Tuple[str, str, str]]] = defaultdict(list)
        self.consistency_checks: List[Dict[str, Any]] = []

    def register_trace_chains(self, chains: Dict[str, TraceChain], source: str):
        for student_id, chain in chains.items():
            if student_id not in self.trace_chains:
                self.trace_chains[student_id] = TraceChain(student_id=student_id)

            target_chain = self.trace_chains[student_id]

            for record in chain.records:
                record.source_module = f"{source}:{record.source_module}"
                target_chain.add_record(record)

            for constraint in chain.constraints:
                target_chain.add_constraint(constraint)

            for change in chain.change_history:
                target_chain.add_change(change)

    def register_data_hash(self, student_id: str, stage: str, data_hash: str, module: str):
        self.data_hashes[student_id].append((
            stage, module, data_hash
        ))

    def get_full_trace(self, student_id: str) -> Optional[Dict[str, Any]]:
        if student_id not in self.trace_chains:
            return None

        chain = self.trace_chains[student_id]
        full_trace = chain.to_dict()

        full_trace["data_hash_chain"] = [
            {
                "stage": h[0],
                "module": h[1],
                "hash": h[2]
            }
            for h in self.data_hashes.get(student_id, [])
        ]

        full_trace["consistency_check"] = self._check_consistency(student_id)

        return full_trace

    def get_trace_summary(self, student_id: str) -> Optional[Dict[str, Any]]:
        if student_id not in self.trace_chains:
            return None

        chain = self.trace_chains[student_id]
        records_by_type = defaultdict(list)
        for record in chain.records:
            records_by_type[record.trace_type].append(record)

        return {
            "student_id": student_id,
            "record_count": len(chain.records),
            "constraint_count": len(chain.constraints),
            "change_count": len(chain.change_history),
            "trace_types": list(records_by_type.keys()),
            "constraint_types": list(set(c.constraint_type for c in chain.constraints)),
            "last_change": chain.change_history[-1].to_dict() if chain.change_history else None,
            "consistency_status": self._check_consistency(student_id)
        }

    def get_constraint_explanation(self, student_id: str,
                                   constraint_type: Optional[str] = None) -> List[ConstraintExplanation]:
        if student_id not in self.trace_chains:
            return []

        chain = self.trace_chains[student_id]
        constraints = chain.constraints

        if constraint_type:
            constraints = [c for c in constraints if c.constraint_type == constraint_type]

        return constraints

    def get_seat_change_history(self, student_id: str) -> List[SeatChangeHistory]:
        if student_id not in self.trace_chains:
            return []
        return self.trace_chains[student_id].change_history

    def get_coloring_trace(self, student_id: str) -> Optional[Dict[str, Any]]:
        if student_id not in self.trace_chains:
            return None

        chain = self.trace_chains[student_id]
        coloring_records = [r for r in chain.records if r.trace_type == "coloring"]
        coloring_constraints = [c for c in chain.constraints if "color" in c.constraint_type]

        if not coloring_records:
            return None

        final_assignment = None
        for r in reversed(coloring_records):
            if r.action == "coloring_complete":
                final_assignment = r.output_state
                break

        return {
            "student_id": student_id,
            "final_assignment": final_assignment,
            "step_count": len(coloring_records),
            "steps": [
                {
                    "timestamp": r.timestamp.isoformat(),
                    "action": r.action,
                    "description": r.description,
                    "input": r.input_state,
                    "output": r.output_state
                }
                for r in coloring_records
            ],
            "constraints": [c.to_dict() for c in coloring_constraints]
        }

    def _check_consistency(self, student_id: str) -> Dict[str, Any]:
        hashes = self.data_hashes.get(student_id, [])
        issues = []

        if not hashes:
            return {
                "consistent": False,
                "status": "unknown",
                "hash_count": 0,
                "issues": ["No data hashes recorded"]
            }

        stages = [h[0] for h in hashes]
        expected_stages = ["data_loaded", "graph_built", "colored", "seated"]

        for stage in expected_stages:
            if stage not in stages:
                issues.append(f"Missing hash for stage: {stage}")

        for i in range(len(hashes) - 1):
            stage1, module1, hash1 = hashes[i]
            stage2, module2, hash2 = hashes[i + 1]
            if hash1 != hash2:
                issues.append(
                    f"Data integrity issue: Hash changed between {stage1} and {stage2}, indicating data modification"
                )

        is_consistent = len(issues) == 0
        check_result = {
            "consistent": is_consistent,
            "status": "consistent" if is_consistent else "inconsistent",
            "hash_count": len(hashes),
            "stages_covered": stages,
            "issues": issues
        }

        self.consistency_checks.append({
            "student_id": student_id,
            "checked_at": datetime.now().isoformat(),
            "result": check_result
        })

        return check_result

    def verify_end_to_end(self, student: Student, graph: ConflictGraph,
                          coloring_result: ColoringResult,
                          seating_plan: SeatingPlan) -> Dict[str, Any]:
        issues = []
        verifications = []

        student_id = student.student_id

        verifications.append({
            "stage": "data_load",
            "check": "Student exists in trace",
            "result": student_id in self.trace_chains,
            "details": f"Trace chain found: {student_id in self.trace_chains}"
        })

        verifications.append({
            "stage": "data_load",
            "check": "Student is valid",
            "result": student.is_valid,
            "details": f"Validation errors: {student.validation_errors}"
        })

        verifications.append({
            "stage": "graph_build",
            "check": "Student exists in graph",
            "result": student_id in graph.nodes,
            "details": f"Graph node found: {student_id in graph.nodes}"
        })

        if student_id in graph.nodes:
            verifications.append({
                "stage": "graph_build",
                "check": "Graph attributes match",
                "result": graph.nodes[student_id].attributes.get("name") == student.name,
                "details": f"Name match: {graph.nodes[student_id].attributes.get('name')} == {student.name}"
            })

        verifications.append({
            "stage": "coloring",
            "check": "Student colored",
            "result": student_id in coloring_result.assignments,
            "details": f"Color assignment found: {student_id in coloring_result.assignments}"
        })

        if student_id in coloring_result.assignments:
            color = coloring_result.assignments[student_id].color
            verifications.append({
                "stage": "coloring",
                "check": "No adjacent same color",
                "result": self._check_color_conflicts(student_id, color, graph, coloring_result),
                "details": "No conflicts with adjacent nodes"
            })

        verifications.append({
            "stage": "seating",
            "check": "Student assigned to class",
            "result": student_id in seating_plan.assignments or student_id in seating_plan.unassigned_students,
            "details": f"Assignment status: {'assigned' if student_id in seating_plan.assignments else 'unassigned'}"
        })

        if student_id in seating_plan.assignments:
            assignment = seating_plan.assignments[student_id]
            if student_id in coloring_result.assignments:
                verifications.append({
                    "stage": "seating",
                    "check": "Color matches seating group",
                    "result": assignment.color_group == coloring_result.assignments[student_id].color,
                    "details": f"Color: {coloring_result.assignments[student_id].color} == Group: {assignment.color_group}"
                })

            cls = seating_plan.classes.get(assignment.class_id)
            if cls:
                verifications.append({
                    "stage": "seating",
                    "check": "Student in class roster",
                    "result": student_id in cls.students,
                    "details": f"Student in class list: {student_id in cls.students}"
                })

        for v in verifications:
            if not v["result"]:
                issues.append(f"{v['stage']}: {v['check']} - FAILED")

        consistency = self._check_consistency(student_id)
        if consistency["status"] == "inconsistent":
            issues.extend(consistency["issues"])

        return {
            "student_id": student_id,
            "overall_status": "PASS" if not issues else "FAIL",
            "issues": issues,
            "verifications": verifications,
            "data_consistency": consistency,
            "full_trace_available": self.get_full_trace(student_id) is not None
        }

    def _check_color_conflicts(self, student_id: str, color: int,
                               graph: ConflictGraph,
                               coloring_result: ColoringResult) -> bool:
        for neighbor, weight in graph.get_neighbors(student_id):
            if neighbor in coloring_result.assignments:
                neighbor_color = coloring_result.assignments[neighbor].color
                if neighbor_color == color and weight >= 0.9:
                    return False
        return True

    def find_inconsistencies(self) -> List[Dict[str, Any]]:
        issues = []
        for student_id in self.trace_chains:
            consistency = self._check_consistency(student_id)
            if consistency["status"] == "inconsistent":
                issues.append({
                    "student_id": student_id,
                    "issues": consistency["issues"],
                    "hashes": self.data_hashes.get(student_id, [])
                })
        return issues

    def get_trace_statistics(self) -> Dict[str, Any]:
        total_students = len(self.trace_chains)
        total_records = sum(len(c.records) for c in self.trace_chains.values())
        total_constraints = sum(len(c.constraints) for c in self.trace_chains.values())
        total_changes = sum(len(c.change_history) for c in self.trace_chains.values())

        consistency_statuses = defaultdict(int)
        for student_id in self.trace_chains:
            status = self._check_consistency(student_id)["status"]
            consistency_statuses[status] += 1

        return {
            "total_students": total_students,
            "total_trace_records": total_records,
            "total_constraints": total_constraints,
            "total_seat_changes": total_changes,
            "avg_records_per_student": total_records / max(1, total_students),
            "consistency_status": dict(consistency_statuses),
            "trace_coverage": f"{total_students} students with full trace"
        }

    def export_trace_for_student(self, student_id: str,
                                 include_details: bool = True) -> Dict[str, Any]:
        summary = self.get_trace_summary(student_id)
        if summary is None:
            return {}

        export_data = {
            "student_id": student_id,
            "trace_summary": summary,
            "exported_at": datetime.now().isoformat()
        }

        if include_details:
            export_data["full_trace"] = self.get_full_trace(student_id)
            export_data["constraints"] = [
                c.to_dict() for c in self.get_constraint_explanation(student_id)
            ]
            export_data["seat_changes"] = [
                c.to_dict() for c in self.get_seat_change_history(student_id)
            ]
            export_data["coloring_trace"] = self.get_coloring_trace(student_id)

        return export_data

    def export_all_traces(self, include_details: bool = False) -> Dict[str, Any]:
        return {
            "statistics": self.get_trace_statistics(),
            "exported_at": datetime.now().isoformat(),
            "student_traces": {
                sid: self.export_trace_for_student(sid, include_details)
                for sid in self.trace_chains
            }
        }

    def query_traces(self, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        results = []
        for student_id, chain in self.trace_chains.items():
            match = True

            if "constraint_type" in filters:
                constraint_types = [c.constraint_type for c in chain.constraints]
                if filters["constraint_type"] not in constraint_types:
                    match = False

            if "has_changes" in filters:
                has_changes = len(chain.change_history) > 0
                if filters["has_changes"] != has_changes:
                    match = False

            if "trace_type" in filters:
                trace_types = [r.trace_type for r in chain.records]
                if filters["trace_type"] not in trace_types:
                    match = False

            if "min_changes" in filters:
                if len(chain.change_history) < filters["min_changes"]:
                    match = False

            if match:
                results.append({
                    "student_id": student_id,
                    "summary": self.get_trace_summary(student_id)
                })

        return results

    def get_all_students_with_issues(self) -> List[Dict[str, Any]]:
        return [
            {
                "student_id": sid,
                "issues": self._check_consistency(sid)["issues"],
                "constraints_with_violations": [
                    c.to_dict() for c in chain.constraints
                    if "violation" in c.constraint_type.lower()
                ],
                "manual_changes": [
                    c.to_dict() for c in chain.change_history
                    if "manual" in c.triggered_by
                ]
            }
            for sid, chain in self.trace_chains.items()
            if self._check_consistency(sid)["status"] == "inconsistent"
            or any("violation" in c.constraint_type.lower() for c in chain.constraints)
            or any("manual" in c.triggered_by for c in chain.change_history)
        ]

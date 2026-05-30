from typing import List, Dict, Set, Optional, Any, Tuple
from collections import defaultdict
from datetime import date, datetime, timedelta
import copy

from .config import Config
from .exceptions import CapacityError
from .models import (
    Student, ConflictGraph, ColoringResult, ColorAssignment,
    SeatAssignment, ClassCapacity, SeatingPlan, LeaveSlot
)
from .models.trace import TraceChain, TraceRecord, ConstraintExplanation, SeatChangeHistory


class SeatAllocator:
    def __init__(self, config: Optional[Config] = None):
        self.config = config or Config()
        self.trace_chains: Dict[str, TraceChain] = {}
        self.change_history: List[SeatChangeHistory] = []
        self.leave_slots: Dict[str, LeaveSlot] = {}
        self.capacity_warnings: List[Dict[str, Any]] = []

    def allocate(self, students: List[Student], graph: ConflictGraph,
                 coloring_result: ColoringResult,
                 trace_chains: Optional[Dict[str, TraceChain]] = None,
                 target_date: Optional[date] = None,
                 num_classes: Optional[int] = None) -> SeatingPlan:

        if trace_chains:
            self.trace_chains = trace_chains

        target_date = target_date or date.today()
        grade = students[0].grade if students else "unknown"

        if num_classes is None:
            num_classes = coloring_result.colors_used

        seating_plan = SeatingPlan(grade=grade)

        self._initialize_classes(seating_plan, num_classes, students)

        self._allocate_by_color(students, coloring_result, seating_plan, graph)

        self._handle_leaves(students, seating_plan, target_date, graph, coloring_result)

        self._check_capacity(seating_plan)

        seating_plan.leave_slots = {k: v.to_dict() for k, v in self.leave_slots.items()}
        seating_plan.capacity_warnings = self.capacity_warnings

        self._trace_allocation(students, seating_plan, coloring_result)

        return seating_plan

    def _initialize_classes(self, seating_plan: SeatingPlan, num_classes: int, students: List[Student]):
        total_students = len(students)
        base_capacity = max(
            self.config.MIN_STUDENTS_PER_CLASS,
            (total_students + num_classes - 1) // num_classes
        )
        max_capacity = max(base_capacity, self.config.DEFAULT_SEATS_PER_CLASS)

        grade = students[0].grade if students else "G"
        class_names = ["一班", "二班", "三班", "四班", "五班", "六班", "七班", "八班"]

        for i in range(num_classes):
            class_id = f"{grade}_C{i + 1}"
            class_name = class_names[i] if i < len(class_names) else f"{i + 1}班"

            seating_plan.classes[class_id] = ClassCapacity(
                class_id=class_id,
                class_name=class_name,
                grade=grade,
                max_capacity=max_capacity,
                min_capacity=self.config.MIN_STUDENTS_PER_CLASS
            )

    def _allocate_by_color(self, students: List[Student], coloring_result: ColoringResult,
                           seating_plan: SeatingPlan, graph: ConflictGraph):

        student_map = {s.student_id: s for s in students}
        color_to_class = self._map_colors_to_classes(coloring_result, seating_plan)

        for color, student_ids in sorted(coloring_result.color_classes.items()):
            class_id = color_to_class.get(color)
            if class_id is None:
                for sid in student_ids:
                    seating_plan.unassigned_students.append(sid)
                continue

            cls = seating_plan.classes[class_id]

            for idx, student_id in enumerate(student_ids):
                student = student_map.get(student_id)
                if student is None:
                    seating_plan.unassigned_students.append(student_id)
                    continue

                color_assignment = coloring_result.assignments.get(student_id)
                conflict_warnings = self._check_class_conflicts(
                    student_id, cls.students, graph
                )

                if not cls.has_capacity():
                    self.capacity_warnings.append({
                        "type": "capacity_exceeded",
                        "student_id": student_id,
                        "class_id": class_id,
                        "current_count": cls.current_count,
                        "max_capacity": cls.max_capacity,
                        "timestamp": datetime.now().isoformat()
                    })

                seat_number = idx + 1 if cls.current_count < cls.max_capacity else None

                assignment = SeatAssignment(
                    student_id=student_id,
                    class_id=class_id,
                    class_name=cls.class_name,
                    grade=student.grade,
                    seat_number=seat_number,
                    color_group=color,
                    assignment_type="color_based",
                    source_trace=[
                        f"color_assignment:{color_assignment.color if color_assignment else color}",
                        f"graph_degree:{graph.nodes[student_id].degree if student_id in graph.nodes else 0}"
                    ],
                    capacity_warning=not cls.has_capacity(),
                    conflict_warnings=conflict_warnings
                )

                if color_assignment and color_assignment.is_override:
                    assignment.is_leave_override = True
                    assignment.override_reason = color_assignment.override_reason
                    cls.leave_overrides.append(student_id)

                if student.special_needs:
                    cls.special_needs_count += 1

                success = cls.add_student(student_id)
                if not success:
                    assignment.capacity_warning = True
                    seating_plan.unassigned_students.append(student_id)
                    continue

                seating_plan.assignments[student_id] = assignment

                self._record_change_history(
                    student_id, None, class_id, None, seat_number,
                    "initial_allocation", "color_based",
                    f"根据颜色组{color}分配到{cls.class_name}"
                )

    def _map_colors_to_classes(self, coloring_result: ColoringResult,
                               seating_plan: SeatingPlan) -> Dict[int, str]:
        color_sizes = [(color, len(students)) for color, students in coloring_result.color_classes.items()]
        color_sizes.sort(key=lambda x: -x[1])

        class_ids = list(seating_plan.classes.keys())
        class_capacities = [(cid, seating_plan.classes[cid].max_capacity) for cid in class_ids]
        class_capacities.sort(key=lambda x: -x[1])

        mapping = {}
        for i, (color, size) in enumerate(color_sizes):
            if i < len(class_capacities):
                mapping[color] = class_capacities[i][0]
            else:
                mapping[color] = class_ids[-1]

        return mapping

    def _check_class_conflicts(self, student_id: str, classmates: List[str],
                               graph: ConflictGraph) -> List[str]:
        warnings = []
        for classmate in classmates:
            edge = graph.get_edge(student_id, classmate)
            if edge:
                if edge.weight >= 0.9:
                    warnings.append(
                        f"严重冲突: 与{classmate} ({edge.conflict_type}, 权重{edge.weight})"
                    )
                elif edge.weight >= 0.7:
                    warnings.append(
                        f"冲突警告: 与{classmate} ({edge.conflict_type}, 权重{edge.weight})"
                    )
        return warnings

    def _handle_leaves(self, students: List[Student], seating_plan: SeatingPlan,
                       target_date: date, graph: ConflictGraph, coloring_result: ColoringResult):

        student_map = {s.student_id: s for s in students}
        leave_students: List[Student] = []
        present_students: List[Student] = []

        for student in students:
            if student.has_leave_on(target_date):
                leave_students.append(student)
            else:
                present_students.append(student)

        if not leave_students:
            return

        leave_slot = LeaveSlot(
            slot_date=target_date,
            absent_students=[s.student_id for s in leave_students]
        )

        available_substitutes = self._find_substitutes(
            leave_students, present_students, seating_plan, graph, coloring_result
        )
        leave_slot.available_substitutes = [s.student_id for s in available_substitutes]

        self._process_leave_substitutions(
            leave_students, available_substitutes, seating_plan, graph, coloring_result
        )

        total_leave = len(leave_students)
        total_sub = len(available_substitutes)
        leave_slot.capacity_shortage = max(0, total_leave - total_sub)

        if leave_slot.capacity_shortage > 0:
            self.capacity_warnings.append({
                "type": "leave_shortage",
                "date": target_date.isoformat(),
                "absent_count": total_leave,
                "substitute_count": total_sub,
                "shortage": leave_slot.capacity_shortage,
                "severity": "high" if leave_slot.capacity_shortage > 5 else "medium",
                "suggested_action": "需要人工复核并补充学生或临时合班"
            })

        self.leave_slots[target_date.isoformat()] = leave_slot

    def _find_substitutes(self, leave_students: List[Student],
                          present_students: List[Student],
                          seating_plan: SeatingPlan,
                          graph: ConflictGraph,
                          coloring_result: ColoringResult) -> List[Student]:

        substitutes: List[Student] = []
        used_colors: Set[int] = set()

        for ls in leave_students:
            if ls.student_id in coloring_result.assignments:
                used_colors.add(coloring_result.assignments[ls.student_id].color)

        for student in present_students:
            if student.student_id not in coloring_result.assignments:
                continue

            color = coloring_result.assignments[student.student_id].color
            if color in used_colors and not student.is_leave_override:
                continue

            if self._is_suitable_substitute(student, leave_students, graph, coloring_result):
                substitutes.append(student)

        substitutes.sort(key=lambda s: len(s.leave_records))
        return substitutes

    def _is_suitable_substitute(self, candidate: Student, leave_students: List[Student],
                                graph: ConflictGraph, coloring_result: ColoringResult) -> bool:
        for ls in leave_students:
            edge = graph.get_edge(candidate.student_id, ls.student_id)
            if edge and edge.weight >= 0.7:
                return False

        if candidate.special_needs:
            return False

        return True

    def _process_leave_substitutions(self, leave_students: List[Student],
                                     substitutes: List[Student],
                                     seating_plan: SeatingPlan,
                                     graph: ConflictGraph,
                                     coloring_result: ColoringResult):

        sub_idx = 0
        for ls in leave_students:
            if ls.student_id not in seating_plan.assignments:
                continue

            old_assignment = seating_plan.assignments[ls.student_id]
            target_class_id = old_assignment.class_id
            target_class = seating_plan.classes.get(target_class_id)

            if target_class is None:
                continue

            target_class.remove_student(ls.student_id)
            del seating_plan.assignments[ls.student_id]

            ls.is_leave_override = True

            self._record_change_history(
                ls.student_id, target_class_id, None,
                old_assignment.seat_number, None,
                "leave_removal", "leave_record",
                f"请假移除: {ls.leave_records[0].reason if ls.leave_records else '请假'}"
            )

            if sub_idx < len(substitutes):
                sub = substitutes[sub_idx]
                sub_idx += 1

                if sub.student_id in seating_plan.assignments:
                    old_sub_assignment = seating_plan.assignments[sub.student_id]
                    old_class = seating_plan.classes.get(old_sub_assignment.class_id)
                    if old_class:
                        old_class.remove_student(sub.student_id)

                    self._record_change_history(
                        sub.student_id, old_sub_assignment.class_id, target_class_id,
                        old_sub_assignment.seat_number, old_assignment.seat_number,
                        "leave_substitution", "leave_record",
                        f"补位替换: 填补{ls.name}的请假空缺"
                    )

                new_seat = target_class.current_count + 1
                assignment = SeatAssignment(
                    student_id=sub.student_id,
                    class_id=target_class_id,
                    class_name=target_class.class_name,
                    grade=sub.grade,
                    seat_number=new_seat,
                    color_group=old_assignment.color_group,
                    is_leave_override=True,
                    override_reason=f"请假补位，替代{ls.name}",
                    assignment_type="leave_substitute",
                    source_trace=[
                        f"leave_substitute_for:{ls.student_id}",
                        f"original_color:{old_assignment.color_group}"
                    ],
                    conflict_warnings=self._check_class_conflicts(
                        sub.student_id, target_class.students, graph
                    )
                )

                target_class.add_student(sub.student_id)
                target_class.leave_overrides.append(sub.student_id)
                seating_plan.assignments[sub.student_id] = assignment

                self._update_trace_for_substitution(sub, ls, old_assignment)

            seating_plan.unassigned_students.append(ls.student_id)

    def _check_capacity(self, seating_plan: SeatingPlan):
        for class_id, cls in seating_plan.classes.items():
            if not cls.meets_minimum():
                self.capacity_warnings.append({
                    "type": "below_minimum",
                    "class_id": class_id,
                    "class_name": cls.class_name,
                    "current_count": cls.current_count,
                    "min_capacity": cls.min_capacity,
                    "shortage": cls.min_capacity - cls.current_count,
                    "severity": "warning",
                    "suggested_action": "考虑与其他班级合并或调整"
                })

            utilization = cls.get_utilization()
            if utilization > 0.95:
                self.capacity_warnings.append({
                    "type": "near_full",
                    "class_id": class_id,
                    "class_name": cls.class_name,
                    "current_count": cls.current_count,
                    "max_capacity": cls.max_capacity,
                    "utilization": utilization,
                    "severity": "info",
                    "suggested_action": "班级接近满员，注意后续新学生分配"
                })

    def _record_change_history(self, student_id: str,
                               old_class_id: Optional[str], new_class_id: Optional[str],
                               old_seat: Optional[int], new_seat: Optional[int],
                               change_reason: str, triggered_by: str, notes: str = ""):

        change = SeatChangeHistory(
            student_id=student_id,
            old_class_id=old_class_id,
            new_class_id=new_class_id,
            old_seat_number=old_seat,
            new_seat_number=new_seat,
            change_reason=change_reason,
            triggered_by=triggered_by,
            notes=notes
        )
        self.change_history.append(change)

        if student_id in self.trace_chains:
            self.trace_chains[student_id].add_change(change)

    def _update_trace_for_substitution(self, substitute: Student, leave_student: Student,
                                       old_assignment: SeatAssignment):
        if substitute.student_id not in self.trace_chains:
            return

        chain = self.trace_chains[substitute.student_id]
        chain.add_record(TraceRecord(
            student_id=substitute.student_id,
            trace_type="seating",
            action="leave_substitution",
            description=f"请假补位，替代{leave_student.name}到{old_assignment.class_name}",
            source_module="seating",
            input_state={
                "leave_student": leave_student.to_dict(),
                "target_class": old_assignment.class_name
            },
            output_state={
                "new_class": old_assignment.class_name,
                "new_seat": old_assignment.seat_number
            },
            constraints=[
                ConstraintExplanation(
                    student_id=substitute.student_id,
                    constraint_type="leave_substitution",
                    description=f"因{leave_student.name}请假，临时调整到{old_assignment.class_name}",
                    source="leave_records",
                    weight=0.8,
                    affected_students=[leave_student.student_id]
                )
            ]
        ))

    def _trace_allocation(self, students: List[Student], seating_plan: SeatingPlan,
                          coloring_result: ColoringResult):
        if not self.config.ENABLE_TRACE:
            return

        for student in students:
            if student.student_id not in self.trace_chains:
                continue

            chain = self.trace_chains[student.student_id]
            assignment = seating_plan.assignments.get(student.student_id)

            if assignment:
                chain.add_record(TraceRecord(
                    student_id=student.student_id,
                    trace_type="seating",
                    action="allocation_complete",
                    description=f"座位分配完成: {assignment.class_name} #{assignment.seat_number}",
                    source_module="seating",
                    data_hash=f"{student.student_id}_{assignment.class_id}_{assignment.seat_number}",
                    input_state={
                        "color_group": assignment.color_group
                    },
                    output_state=assignment.to_dict(),
                    constraints=[
                        ConstraintExplanation(
                            student_id=student.student_id,
                            constraint_type="class_assignment",
                            description=f"分配到{assignment.class_name}",
                            source="seating",
                            weight=1.0,
                            evidence=[{"capacity_warning": assignment.capacity_warning}]
                        )
                    ]
                ))
            elif student.student_id in seating_plan.unassigned_students:
                chain.add_record(TraceRecord(
                    student_id=student.student_id,
                    trace_type="seating",
                    action="allocation_failed",
                    description="座位分配失败，进入未分配列表",
                    source_module="seating",
                    input_state={},
                    output_state={"status": "unassigned"},
                    constraints=[]
                ))

    def get_change_history(self, student_id: Optional[str] = None) -> List[SeatChangeHistory]:
        if student_id:
            return [c for c in self.change_history if c.student_id == student_id]
        return self.change_history

    def get_leave_slot(self, slot_date: date) -> Optional[LeaveSlot]:
        return self.leave_slots.get(slot_date.isoformat())

    def get_all_leave_slots(self) -> Dict[str, LeaveSlot]:
        return self.leave_slots

    def get_capacity_warnings(self, filter_type: Optional[str] = None) -> List[Dict[str, Any]]:
        if filter_type:
            return [w for w in self.capacity_warnings if w.get("type") == filter_type]
        return self.capacity_warnings

    def get_trace_chain(self, student_id: str) -> Optional[TraceChain]:
        return self.trace_chains.get(student_id)

    def get_all_trace_chains(self) -> Dict[str, TraceChain]:
        return self.trace_chains

    def filter_for_review(self, seating_plan: SeatingPlan,
                          filter_types: List[str]) -> Dict[str, List[Dict[str, Any]]]:
        results = defaultdict(list)

        for warning in self.capacity_warnings:
            if "capacity" in filter_types:
                results["capacity_issues"].append(warning)

        if "leave" in filter_types:
            for date_str, slot in self.leave_slots.items():
                if slot.capacity_shortage > 0:
                    results["leave_shortages"].append({
                        "date": date_str,
                        "absent": slot.absent_students,
                        "substitutes": slot.available_substitutes,
                        "shortage": slot.capacity_shortage
                    })

        if "conflict" in filter_types:
            for student_id, assignment in seating_plan.assignments.items():
                if assignment.conflict_warnings:
                    results["conflict_warnings"].append({
                        "student_id": student_id,
                        "class_id": assignment.class_id,
                        "warnings": assignment.conflict_warnings
                    })

        if "override" in filter_types:
            for student_id, assignment in seating_plan.assignments.items():
                if assignment.is_leave_override:
                    results["leave_overrides"].append({
                        "student_id": student_id,
                        "class_id": assignment.class_id,
                        "reason": assignment.override_reason
                    })

        return dict(results)

    def reallocate_student(self, student_id: str, new_class_id: str,
                           seating_plan: SeatingPlan, graph: ConflictGraph,
                           reason: str, operator: str = "manual") -> bool:

        if student_id not in seating_plan.assignments:
            return False

        old_assignment = seating_plan.assignments[student_id]
        old_class = seating_plan.classes.get(old_assignment.class_id)
        new_class = seating_plan.classes.get(new_class_id)

        if old_class is None or new_class is None:
            return False

        if not new_class.has_capacity():
            return False

        conflicts = self._check_class_conflicts(student_id, new_class.students, graph)
        if any("严重冲突" in c for c in conflicts):
            return False

        old_class.remove_student(student_id)
        new_class.add_student(student_id)

        new_seat_number = new_class.current_count

        seating_plan.assignments[student_id] = SeatAssignment(
            student_id=student_id,
            class_id=new_class_id,
            class_name=new_class.class_name,
            grade=old_assignment.grade,
            seat_number=new_seat_number,
            color_group=old_assignment.color_group,
            is_leave_override=old_assignment.is_leave_override,
            override_reason=old_assignment.override_reason,
            assignment_type="manual_reallocation",
            source_trace=old_assignment.source_trace + [f"manual_reallocation:{reason}"],
            conflict_warnings=conflicts
        )

        self._record_change_history(
            student_id, old_assignment.class_id, new_class_id,
            old_assignment.seat_number, new_seat_number,
            reason, f"manual:{operator}",
            f"人工重新分配: {reason}"
        )

        return True

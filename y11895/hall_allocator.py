from typing import Dict, List, Tuple, Optional
from collections import defaultdict

from models import (
    Course, Student, ExamHall, ExamAssignment,
    Conflict, ConflictType, PendingItem, SpecialNeedType,
    SchedulingResult
)


class HallAllocator:
    def __init__(self, courses: List[Course], students: List[Student], halls: List[ExamHall]):
        self.courses = courses
        self.students = students
        self.halls = halls
        
        self.course_map = {c.course_id: c for c in courses}
        self.student_map = {s.student_id: s for s in students}
        self.hall_map = {h.hall_id: h for h in halls}
        
        self.pending_items: List[PendingItem] = []
        self.conflicts: List[Conflict] = []
        self.assignments: List[ExamAssignment] = []
        
    def allocate(self, course_colors: Dict[str, int]) -> SchedulingResult:
        timeslot_students = self._group_students_by_timeslot(course_colors)
        
        assignment_order = 0
        for timeslot, courses_info in timeslot_students.items():
            for course_id, student_ids in courses_info.items():
                hall_assignments = self._allocate_course_to_halls(
                    course_id, student_ids, timeslot, assignment_order
                )
                self.assignments.extend(hall_assignments)
                assignment_order += len(hall_assignments)
        
        self._check_same_class_adjacent()
        self._check_capacity_constraints()
        self._check_special_needs()
        
        return SchedulingResult(
            assignments=self.assignments,
            conflicts=self.conflicts,
            pending_items=self.pending_items
        )
    
    def _group_students_by_timeslot(self, course_colors: Dict[str, int]) -> Dict[int, Dict[str, List[str]]]:
        timeslot_data: Dict[int, Dict[str, List[str]]] = defaultdict(lambda: defaultdict(list))
        
        for student in self.students:
            for course_id in student.course_ids:
                if course_id in course_colors:
                    timeslot = course_colors[course_id]
                    timeslot_data[timeslot][course_id].append(student.student_id)
        
        return timeslot_data
    
    def _allocate_course_to_halls(
        self, course_id: str, student_ids: List[str], timeslot: int, start_order: int
    ) -> List[ExamAssignment]:
        assignments = []
        global_seat_counter = defaultdict(int)
        
        special_students = self._separate_special_students(student_ids)
        normal_students = [sid for sid in student_ids if sid not in special_students]
        
        special_assignments = self._allocate_special_students(
            course_id, special_students, timeslot, start_order, global_seat_counter
        )
        assignments.extend(special_assignments)
        
        normal_assignments = self._allocate_normal_students(
            course_id, normal_students, timeslot, start_order + len(assignments), global_seat_counter
        )
        assignments.extend(normal_assignments)
        
        return assignments
    
    def _separate_special_students(self, student_ids: List[str]) -> List[str]:
        special = []
        for sid in student_ids:
            student = self.student_map.get(sid)
            if student and student.special_needs:
                special.append(sid)
        return special
    
    def _allocate_special_students(
        self, course_id: str, student_ids: List[str], timeslot: int, start_order: int,
        global_seat_counter: Dict[Tuple[str, int], int]
    ) -> List[ExamAssignment]:
        assignments = []
        
        for idx, sid in enumerate(student_ids):
            student = self.student_map[sid]
            allocated = False
            
            for hall in self.halls:
                if self._can_accommodate_special_needs(hall, student):
                    key = (hall.hall_id, timeslot)
                    global_seat_counter[key] += 1
                    assignments.append(ExamAssignment(
                        student_id=sid,
                        course_id=course_id,
                        hall_id=hall.hall_id,
                        timeslot=timeslot,
                        seat_number=global_seat_counter[key],
                        import_order=start_order + idx,
                        trace_info={
                            "allocation_reason": "特殊需求安排",
                            "special_needs": [n.need_type.value for n in student.special_needs]
                        }
                    ))
                    allocated = True
                    break
            
            if not allocated:
                self.pending_items.append(PendingItem(
                    item_type=ConflictType.SPECIAL_NEED_MISSING,
                    description=f"学生{student.name}({sid})的特殊需求无法满足",
                    details={
                        "student_id": sid,
                        "course_id": course_id,
                        "special_needs": [n.need_type.value for n in student.special_needs]
                    }
                ))
        
        return assignments
    
    def _can_accommodate_special_needs(self, hall: ExamHall, student: Student) -> bool:
        for need in student.special_needs:
            if need.need_type == SpecialNeedType.ALONE_ROOM:
                return False
            if need.need_type == SpecialNeedType.WHEELCHAIR:
                if hall.special_capacity.get(SpecialNeedType.WHEELCHAIR, 0) <= 0:
                    return False
        return True
    
    def _allocate_normal_students(
        self, course_id: str, student_ids: List[str], timeslot: int, start_order: int,
        global_seat_counter: Dict[Tuple[str, int], int]
    ) -> List[ExamAssignment]:
        assignments = []
        
        sorted_students = sorted(
            student_ids,
            key=lambda sid: (self.student_map[sid].class_name, sid)
        )
        
        for idx, sid in enumerate(sorted_students):
            student = self.student_map[sid]
            allocated = False
            
            for hall in self.halls:
                key = (hall.hall_id, timeslot)
                current_count = global_seat_counter[key]
                if current_count < hall.capacity:
                    global_seat_counter[key] += 1
                    assignments.append(ExamAssignment(
                        student_id=sid,
                        course_id=course_id,
                        hall_id=hall.hall_id,
                        timeslot=timeslot,
                        seat_number=global_seat_counter[key],
                        import_order=start_order + idx,
                        trace_info={
                            "allocation_reason": "按班级排序分配",
                            "class_name": student.class_name
                        }
                    ))
                    allocated = True
                    break
            
            if not allocated:
                self.pending_items.append(PendingItem(
                    item_type=ConflictType.CAPACITY_OVERFLOW,
                    description=f"课程{self.course_map[course_id].name}({course_id})在时段{timeslot}考场容量不足",
                    details={
                        "student_id": sid,
                        "course_id": course_id,
                        "timeslot": timeslot
                    }
                ))
        
        return assignments
    
    def _check_same_class_adjacent(self) -> None:
        hall_timeslot_assignments = defaultdict(list)
        
        for assignment in self.assignments:
            key = (assignment.hall_id, assignment.timeslot)
            hall_timeslot_assignments[key].append(assignment)
        
        for (hall_id, timeslot), assignments in hall_timeslot_assignments.items():
            sorted_assignments = sorted(assignments, key=lambda a: a.seat_number)
            
            for i in range(len(sorted_assignments) - 1):
                a1 = sorted_assignments[i]
                a2 = sorted_assignments[i + 1]
                
                s1 = self.student_map.get(a1.student_id)
                s2 = self.student_map.get(a2.student_id)
                
                if s1 and s2 and s1.class_name == s2.class_name:
                    self.conflicts.append(Conflict(
                        conflict_type=ConflictType.SAME_CLASS_ADJACENT,
                        description=f"同班学生相邻: {s1.name}和{s2.name}({s1.class_name})在考场{hall_id}座位{a1.seat_number}-{a2.seat_number}",
                        student_ids=[a1.student_id, a2.student_id],
                        hall_id=hall_id,
                        timeslot=timeslot
                    ))
    
    def _check_capacity_constraints(self) -> None:
        hall_timeslot_count = defaultdict(int)
        
        for assignment in self.assignments:
            key = (assignment.hall_id, assignment.timeslot)
            hall_timeslot_count[key] += 1
        
        for (hall_id, timeslot), count in hall_timeslot_count.items():
            hall = self.hall_map.get(hall_id)
            if not hall:
                continue
            
            if count > hall.capacity:
                self.conflicts.append(Conflict(
                    conflict_type=ConflictType.CAPACITY_OVERFLOW,
                    description=f"考场{hall.name}({hall_id})时段{timeslot}超容: {count}/{hall.capacity}",
                    hall_id=hall_id,
                    timeslot=timeslot
                ))
    
    def _check_special_needs(self) -> None:
        assigned_students = set(a.student_id for a in self.assignments)
        
        for student in self.students:
            if student.special_needs and student.student_id not in assigned_students:
                continue
            
            for need in student.special_needs:
                if need.need_type == SpecialNeedType.FRONT_SEAT:
                    for assignment in self.assignments:
                        if assignment.student_id == student.student_id:
                            hall = self.hall_map.get(assignment.hall_id)
                            if hall and assignment.seat_number > hall.capacity // 2:
                                self.pending_items.append(PendingItem(
                                    item_type=ConflictType.SPECIAL_NEED_MISSING,
                                    description=f"学生{student.name}需要前排座位，但被安排在座位{assignment.seat_number}",
                                    details={
                                        "student_id": student.student_id,
                                        "hall_id": assignment.hall_id,
                                        "seat_number": assignment.seat_number,
                                        "need_type": need.need_type.value
                                    }
                                ))

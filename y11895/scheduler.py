from typing import List, Dict, Optional
from collections import defaultdict

from models import (
    Student, Course, ExamHall, SchedulingResult,
    ExamAssignment, ConflictType
)
from graph_coloring import GraphColoringScheduler
from hall_allocator import HallAllocator
from data_importer import DataImporter


class ExamScheduler:
    def __init__(self):
        self.students: List[Student] = []
        self.courses: List[Course] = []
        self.halls: List[ExamHall] = []
        self.import_errors: List[Dict] = []
        self.result: Optional[SchedulingResult] = None
    
    def load_data(self, students_file: str = None, courses_file: str = None, 
                  halls_file: str = None) -> Dict:
        importer = DataImporter()
        self.students, self.courses, self.halls, self.import_errors = importer.import_all(
            students_file, courses_file, halls_file
        )
        
        return {
            "students_count": len(self.students),
            "courses_count": len(self.courses),
            "halls_count": len(self.halls),
            "import_errors": self.import_errors,
            "import_order": {
                "students": [{"id": s.student_id, "order": s.import_order} for s in self.students],
                "courses": [{"id": c.course_id, "order": c.import_order} for c in self.courses],
                "halls": [{"id": h.hall_id, "order": h.import_order} for h in self.halls]
            }
        }
    
    def schedule(self, algorithm: str = "dsatur") -> SchedulingResult:
        if not self.students or not self.courses:
            raise ValueError("学生和课程数据不能为空")
        
        if not self.halls:
            result = SchedulingResult()
            result.import_errors = self.import_errors
            result.pending_items.append({
                "type": "missing_halls",
                "message": "考场数据未加载，请稍后补充考场信息后重新安排"
            })
            return result
        
        color_scheduler = GraphColoringScheduler(self.courses, self.students)
        course_colors, color_trace = color_scheduler.run(algorithm)
        
        hall_allocator = HallAllocator(self.courses, self.students, self.halls)
        result = hall_allocator.allocate(course_colors)
        
        result.import_errors = self.import_errors
        result.graph_coloring_trace = color_trace
        
        self.result = result
        return result
    
    def get_assignment_trace(self, student_id: str, course_id: str) -> Optional[Dict]:
        if not self.result:
            return None
        
        assignment = None
        for a in self.result.assignments:
            if a.student_id == student_id and a.course_id == course_id:
                assignment = a
                break
        
        if not assignment:
            return None
        
        color_trace = self.result.graph_coloring_trace
        course_color_info = None
        
        for info in color_trace.get("color_assignments", []):
            if info["course"] == course_id:
                course_color_info = info
                break
        
        return {
            "assignment": {
                "student_id": assignment.student_id,
                "course_id": assignment.course_id,
                "hall_id": assignment.hall_id,
                "timeslot": assignment.timeslot,
                "seat_number": assignment.seat_number
            },
            "allocation_trace": assignment.trace_info,
            "graph_coloring_trace": course_color_info,
            "constraints_check": self._get_constraints_for_assignment(assignment)
        }
    
    def _get_constraints_for_assignment(self, assignment: ExamAssignment) -> Dict:
        constraints = {
            "capacity_check": "通过",
            "adjacent_check": "通过",
            "special_needs_check": "通过"
        }
        
        student_map = {s.student_id: s for s in self.students}
        hall_map = {h.hall_id: h for h in self.halls}
        
        student = student_map.get(assignment.student_id)
        hall = hall_map.get(assignment.hall_id)
        
        if student and student.special_needs:
            for need in student.special_needs:
                for pending in self.result.pending_items:
                    if (pending.details.get("student_id") == student.student_id and
                        pending.details.get("need_type") == need.need_type.value):
                        constraints["special_needs_check"] = f"待确认: {pending.description}"
        
        for conflict in self.result.conflicts:
            if (conflict.hall_id == assignment.hall_id and
                conflict.timeslot == assignment.timeslot):
                if assignment.student_id in conflict.student_ids:
                    if conflict.conflict_type == ConflictType.SAME_CLASS_ADJACENT:
                        constraints["adjacent_check"] = f"警告: {conflict.description}"
                if conflict.conflict_type == ConflictType.CAPACITY_OVERFLOW:
                    constraints["capacity_check"] = f"超容: {conflict.description}"
        
        return constraints
    
    def get_statistics(self) -> Dict:
        if not self.result:
            return {}
        
        stats = {
            "total_assignments": len(self.result.assignments),
            "total_conflicts": len(self.result.conflicts),
            "total_pending": len(self.result.pending_items),
            "total_import_errors": len(self.result.import_errors),
            "conflicts_by_type": defaultdict(int),
            "pending_by_type": defaultdict(int)
        }
        
        for conflict in self.result.conflicts:
            stats["conflicts_by_type"][conflict.conflict_type.value] += 1
        
        for pending in self.result.pending_items:
            stats["pending_by_type"][pending.item_type.value] += 1
        
        stats["conflicts_by_type"] = dict(stats["conflicts_by_type"])
        stats["pending_by_type"] = dict(stats["pending_by_type"])
        
        return stats
    
    def export_result(self, output_file: str) -> None:
        if not self.result:
            raise ValueError("暂无排班结果")
        
        import csv
        
        with open(output_file, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['学号', '姓名', '班级', '课程ID', '课程名称', 
                           '考场ID', '考场名称', '时段', '座位号', '导入顺序'])
            
            student_map = {s.student_id: s for s in self.students}
            course_map = {c.course_id: c for c in self.courses}
            hall_map = {h.hall_id: h for h in self.halls}
            
            for assignment in self.result.assignments:
                student = student_map.get(assignment.student_id)
                course = course_map.get(assignment.course_id)
                hall = hall_map.get(assignment.hall_id)
                
                writer.writerow([
                    assignment.student_id,
                    student.name if student else '',
                    student.class_name if student else '',
                    assignment.course_id,
                    course.name if course else '',
                    assignment.hall_id,
                    hall.name if hall else '',
                    assignment.timeslot,
                    assignment.seat_number,
                    assignment.import_order
                ])
        
        print(f"排班结果已导出到: {output_file}")

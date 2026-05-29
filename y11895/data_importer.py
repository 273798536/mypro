import csv
import json
from typing import List, Dict, Tuple, Optional
from pathlib import Path

from models import (
    Student, Course, ExamHall, SpecialNeed, SpecialNeedType,
    SchedulingResult
)


class DataImporter:
    def __init__(self):
        self.import_errors: List[Dict] = []
        self.import_order_counter = {
            "student": 0,
            "course": 0,
            "hall": 0
        }
    
    def import_students_from_csv(self, file_path: str) -> Tuple[List[Student], List[Dict]]:
        students = []
        errors = []
        order_counter = 0
        
        path = Path(file_path)
        if not path.exists():
            errors.append({
                "type": "file_not_found",
                "message": f"学生数据文件不存在: {file_path}",
                "row": None
            })
            return students, errors
        
        with open(path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            required_fields = ['student_id', 'name', 'class_name']
            
            for field in required_fields:
                if field not in reader.fieldnames:
                    errors.append({
                        "type": "missing_field",
                        "message": f"缺少必填字段: {field}",
                        "row": None
                    })
            
            if errors:
                return students, errors
            
            for row_num, row in enumerate(reader, start=2):
                try:
                    student = self._parse_student_row(row, row_num, order_counter)
                    if student:
                        students.append(student)
                        order_counter += 1
                except Exception as e:
                    errors.append({
                        "type": "parse_error",
                        "message": str(e),
                        "row": row_num,
                        "data": row
                    })
        
        return students, errors
    
    def _parse_student_row(self, row: Dict, row_num: int, order: int) -> Optional[Student]:
        student_id = row.get('student_id', '').strip()
        name = row.get('name', '').strip()
        class_name = row.get('class_name', '').strip()
        
        if not student_id:
            raise ValueError(f"第{row_num}行: 学号不能为空")
        if not name:
            raise ValueError(f"第{row_num}行: 姓名不能为空")
        if not class_name:
            raise ValueError(f"第{row_num}行: 班级不能为空")
        
        course_ids = []
        if 'course_ids' in row:
            course_ids = [c.strip() for c in row['course_ids'].split(';') if c.strip()]
        
        special_needs = []
        if 'special_needs' in row and row['special_needs'].strip():
            needs_str = row['special_needs'].strip()
            for need_str in needs_str.split(';'):
                need_str = need_str.strip()
                if need_str:
                    special_needs.append(self._parse_special_need(need_str))
        
        return Student(
            student_id=student_id,
            name=name,
            class_name=class_name,
            course_ids=course_ids,
            special_needs=special_needs,
            import_order=order
        )
    
    def _parse_special_need(self, need_str: str) -> SpecialNeed:
        need_map = {
            '轮椅': SpecialNeedType.WHEELCHAIR,
            '视力障碍': SpecialNeedType.VISUAL_IMPAIRMENT,
            '听力障碍': SpecialNeedType.HEARING_IMPAIRMENT,
            '延时': SpecialNeedType.EXTRA_TIME,
            '单独考场': SpecialNeedType.ALONE_ROOM,
            '前排座位': SpecialNeedType.FRONT_SEAT
        }
        
        parts = need_str.split(':', 1)
        need_type_str = parts[0].strip()
        description = parts[1].strip() if len(parts) > 1 else ""
        
        need_type = need_map.get(need_type_str, SpecialNeedType.EXTRA_TIME)
        return SpecialNeed(need_type=need_type, description=description)
    
    def import_courses_from_csv(self, file_path: str) -> Tuple[List[Course], List[Dict]]:
        courses = []
        errors = []
        order_counter = 0
        
        path = Path(file_path)
        if not path.exists():
            errors.append({
                "type": "file_not_found",
                "message": f"课程数据文件不存在: {file_path}",
                "row": None
            })
            return courses, errors
        
        with open(path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            required_fields = ['course_id', 'name']
            
            for field in required_fields:
                if field not in reader.fieldnames:
                    errors.append({
                        "type": "missing_field",
                        "message": f"缺少必填字段: {field}",
                        "row": None
                    })
            
            if errors:
                return courses, errors
            
            for row_num, row in enumerate(reader, start=2):
                try:
                    course = self._parse_course_row(row, row_num, order_counter)
                    if course:
                        courses.append(course)
                        order_counter += 1
                except Exception as e:
                    errors.append({
                        "type": "parse_error",
                        "message": str(e),
                        "row": row_num,
                        "data": row
                    })
        
        return courses, errors
    
    def _parse_course_row(self, row: Dict, row_num: int, order: int) -> Optional[Course]:
        course_id = row.get('course_id', '').strip()
        name = row.get('name', '').strip()
        
        if not course_id:
            raise ValueError(f"第{row_num}行: 课程ID不能为空")
        if not name:
            raise ValueError(f"第{row_num}行: 课程名称不能为空")
        
        student_ids = []
        if 'student_ids' in row:
            student_ids = [s.strip() for s in row['student_ids'].split(';') if s.strip()]
        
        return Course(
            course_id=course_id,
            name=name,
            student_ids=student_ids,
            import_order=order
        )
    
    def import_halls_from_csv(self, file_path: str) -> Tuple[List[ExamHall], List[Dict]]:
        halls = []
        errors = []
        order_counter = 0
        
        path = Path(file_path)
        if not path.exists():
            errors.append({
                "type": "file_not_found",
                "message": f"考场数据文件不存在: {file_path}",
                "row": None
            })
            return halls, errors
        
        with open(path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            required_fields = ['hall_id', 'name', 'capacity']
            
            for field in required_fields:
                if field not in reader.fieldnames:
                    errors.append({
                        "type": "missing_field",
                        "message": f"缺少必填字段: {field}",
                        "row": None
                    })
            
            if errors:
                return halls, errors
            
            for row_num, row in enumerate(reader, start=2):
                try:
                    hall = self._parse_hall_row(row, row_num, order_counter)
                    if hall:
                        halls.append(hall)
                        order_counter += 1
                except Exception as e:
                    errors.append({
                        "type": "parse_error",
                        "message": str(e),
                        "row": row_num,
                        "data": row
                    })
        
        return halls, errors
    
    def _parse_hall_row(self, row: Dict, row_num: int, order: int) -> Optional[ExamHall]:
        hall_id = row.get('hall_id', '').strip()
        name = row.get('name', '').strip()
        capacity_str = row.get('capacity', '').strip()
        
        if not hall_id:
            raise ValueError(f"第{row_num}行: 考场ID不能为空")
        if not name:
            raise ValueError(f"第{row_num}行: 考场名称不能为空")
        if not capacity_str:
            raise ValueError(f"第{row_num}行: 考场容量不能为空")
        
        try:
            capacity = int(capacity_str)
            if capacity <= 0:
                raise ValueError(f"第{row_num}行: 考场容量必须大于0")
        except ValueError as e:
            if '行' in str(e):
                raise
            raise ValueError(f"第{row_num}行: 考场容量必须是有效数字") from e
        
        special_capacity = {}
        if 'special_capacity' in row and row['special_capacity'].strip():
            parts = row['special_capacity'].split(';')
            for part in parts:
                if ':' in part:
                    key, val = part.split(':', 1)
                    key = key.strip()
                    val = val.strip()
                    need_type = None
                    if key == '轮椅':
                        need_type = SpecialNeedType.WHEELCHAIR
                    if need_type and val.isdigit():
                        special_capacity[need_type] = int(val)
        
        return ExamHall(
            hall_id=hall_id,
            name=name,
            capacity=capacity,
            special_capacity=special_capacity,
            import_order=order
        )
    
    def import_all(self, students_file: str = None, courses_file: str = None, 
                   halls_file: str = None) -> Tuple[List[Student], List[Course], List[ExamHall], List[Dict]]:
        all_errors = []
        
        students = []
        if students_file:
            students, errors = self.import_students_from_csv(students_file)
            all_errors.extend([{"category": "student", **e} for e in errors])
        
        courses = []
        if courses_file:
            courses, errors = self.import_courses_from_csv(courses_file)
            all_errors.extend([{"category": "course", **e} for e in errors])
        
        halls = []
        if halls_file:
            halls, errors = self.import_halls_from_csv(halls_file)
            all_errors.extend([{"category": "hall", **e} for e in errors])
        
        self._link_students_courses(students, courses)
        
        return students, courses, halls, all_errors
    
    def _link_students_courses(self, students: List[Student], courses: List[Course]) -> None:
        course_map = {c.course_id: c for c in courses}
        student_map = {s.student_id: s for s in students}
        
        for student in students:
            for course_id in student.course_ids:
                if course_id in course_map:
                    course = course_map[course_id]
                    if student.student_id not in course.student_ids:
                        course.student_ids.append(student.student_id)
        
        for course in courses:
            for student_id in course.student_ids:
                if student_id in student_map:
                    student = student_map[student_id]
                    if course.course_id not in student.course_ids:
                        student.course_ids.append(course.course_id)

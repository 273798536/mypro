"""数据加载器 - 支持JSON/CSV，保留原始名称以便追溯"""

import json
import csv
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from .models import (
    Course, Classroom, Teacher, TimeSlot, Weekday
)


WEEKDAY_MAP = {
    "周一": Weekday.MONDAY,
    "星期二": Weekday.MONDAY,
    "周二": Weekday.TUESDAY,
    "星期三": Weekday.TUESDAY,
    "周三": Weekday.WEDNESDAY,
    "星期四": Weekday.WEDNESDAY,
    "周四": Weekday.THURSDAY,
    "星期五": Weekday.THURSDAY,
    "周五": Weekday.FRIDAY,
    "星期六": Weekday.FRIDAY,
    "周六": Weekday.SATURDAY,
    "星期日": Weekday.SATURDAY,
    "周日": Weekday.SUNDAY,
    "Monday": Weekday.MONDAY,
    "Tuesday": Weekday.TUESDAY,
    "Wednesday": Weekday.WEDNESDAY,
    "Thursday": Weekday.THURSDAY,
    "Friday": Weekday.FRIDAY,
    "Saturday": Weekday.SATURDAY,
    "Sunday": Weekday.SUNDAY,
}


class DataLoader:
    """数据加载器，支持从JSON或CSV文件加载排课数据"""

    def __init__(self):
        self.source_info: Dict[str, List[str]] = {}

    def load_all(self,
                 courses_file: Optional[str] = None,
                 classrooms_file: Optional[str] = None,
                 teachers_file: Optional[str] = None,
                 timeslots_file: Optional[str] = None) -> Tuple[
                     List[Course], List[Classroom], List[Teacher], List[TimeSlot]]:
        """加载所有数据文件"""
        courses = []
        classrooms = []
        teachers = []
        timeslots = []

        if timeslots_file:
            timeslots = self._load_timeslots(timeslots_file)
            self.source_info["时间段"] = [timeslots_file]

        if teachers_file:
            teachers = self._load_teachers(teachers_file, timeslots)
            self.source_info["教师"] = [teachers_file]

        if classrooms_file:
            classrooms = self._load_classrooms(classrooms_file, timeslots)
            self.source_info["教室"] = [classrooms_file]

        if courses_file:
            courses = self._load_courses(courses_file, teachers, classrooms, timeslots)
            self.source_info["课程"] = [courses_file]

        return courses, classrooms, teachers, timeslots

    def _load_json(self, filepath: str) -> Dict:
        """加载JSON文件"""
        path = Path(filepath)
        if not path.exists():
            raise FileNotFoundError(f"文件不存在: {filepath}")
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def _load_csv(self, filepath: str) -> List[Dict]:
        """加载CSV文件"""
        path = Path(filepath)
        if not path.exists():
            raise FileNotFoundError(f"文件不存在: {filepath}")
        with open(path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            return list(reader)

    def _detect_format(self, filepath: str) -> str:
        """检测文件格式"""
        suffix = Path(filepath).suffix.lower()
        if suffix == ".json":
            return "json"
        elif suffix == ".csv":
            return "csv"
        else:
            raise ValueError(f"不支持的文件格式: {suffix}，仅支持 .json 和 .csv")

    def _parse_weekday(self, raw_value: str) -> Weekday:
        """解析星期，支持多种格式"""
        if raw_value in WEEKDAY_MAP:
            return WEEKDAY_MAP[raw_value]
        for key, value in WEEKDAY_MAP.items():
            if key in raw_value:
                return value
        raise ValueError(f"无法识别的星期格式: {raw_value}")

    def _parse_period(self, raw_value: str) -> Tuple[int, int]:
        """解析节次，支持多种格式如 '1-2', '第3-4节', '5,6'"""
        import re
        numbers = re.findall(r'\d+', raw_value)
        if len(numbers) >= 2:
            return int(numbers[0]), int(numbers[1])
        elif len(numbers) == 1:
            n = int(numbers[0])
            return n, n
        raise ValueError(f"无法解析节次: {raw_value}")

    def _load_timeslots(self, filepath: str) -> List[TimeSlot]:
        """加载时间段数据"""
        fmt = self._detect_format(filepath)
        timeslots: Dict[str, TimeSlot] = {}

        if fmt == "json":
            data = self._load_json(filepath)
            slot_list = data.get("时间段", data.get("timeslots", []))
            for item in slot_list:
                raw_name = item.get("名称", item.get("name", ""))
                weekday = self._parse_weekday(item.get("星期", item.get("weekday", "")))
                start, end = self._parse_period(item.get("节次", item.get("period", "")))
                start_time = item.get("开始时间", item.get("start_time"))
                end_time = item.get("结束时间", item.get("end_time"))

                slot = TimeSlot(
                    raw_name=raw_name,
                    weekday=weekday,
                    start_period=start,
                    end_period=end,
                    start_time=start_time,
                    end_time=end_time
                )
                timeslots[raw_name] = slot

        else:
            rows = self._load_csv(filepath)
            for row in rows:
                raw_name = row.get("名称", row.get("name", ""))
                weekday = self._parse_weekday(row.get("星期", row.get("weekday", "")))
                start, end = self._parse_period(row.get("节次", row.get("period", "")))
                start_time = row.get("开始时间", row.get("start_time"))
                end_time = row.get("结束时间", row.get("end_time"))

                slot = TimeSlot(
                    raw_name=raw_name,
                    weekday=weekday,
                    start_period=start,
                    end_period=end,
                    start_time=start_time,
                    end_time=end_time
                )
                timeslots[raw_name] = slot

        return list(timeslots.values())

    def _load_teachers(self, filepath: str, timeslots: List[TimeSlot]) -> List[Teacher]:
        """加载教师数据"""
        fmt = self._detect_format(filepath)
        teachers: Dict[str, Teacher] = {}
        slot_map = {s.raw_name: s for s in timeslots}

        if fmt == "json":
            data = self._load_json(filepath)
            teacher_list = data.get("教师", data.get("teachers", []))
            for item in teacher_list:
                raw_name = item.get("姓名", item.get("name", ""))
                teacher_id = item.get("工号", item.get("teacher_id", item.get("id")))

                unavailable = set()
                for slot_name in item.get("不可用时间", item.get("unavailable", [])):
                    if slot_name in slot_map:
                        unavailable.add(slot_map[slot_name])

                preferred = set()
                for slot_name in item.get("偏好时间", item.get("preferred", [])):
                    if slot_name in slot_map:
                        preferred.add(slot_map[slot_name])

                teacher = Teacher(
                    raw_name=raw_name,
                    teacher_id=teacher_id,
                    unavailable_slots=unavailable,
                    preferred_slots=preferred
                )
                teachers[raw_name] = teacher

        else:
            rows = self._load_csv(filepath)
            for row in rows:
                raw_name = row.get("姓名", row.get("name", ""))
                teacher_id = row.get("工号", row.get("teacher_id", row.get("id")))

                unavailable = set()
                unavailable_str = row.get("不可用时间", row.get("unavailable", ""))
                if unavailable_str:
                    for slot_name in unavailable_str.split(";"):
                        slot_name = slot_name.strip()
                        if slot_name in slot_map:
                            unavailable.add(slot_map[slot_name])

                preferred = set()
                preferred_str = row.get("偏好时间", row.get("preferred", ""))
                if preferred_str:
                    for slot_name in preferred_str.split(";"):
                        slot_name = slot_name.strip()
                        if slot_name in slot_map:
                            preferred.add(slot_map[slot_name])

                teacher = Teacher(
                    raw_name=raw_name,
                    teacher_id=teacher_id,
                    unavailable_slots=unavailable,
                    preferred_slots=preferred
                )
                teachers[raw_name] = teacher

        return list(teachers.values())

    def _load_classrooms(self, filepath: str, timeslots: List[TimeSlot]) -> List[Classroom]:
        """加载教室数据"""
        fmt = self._detect_format(filepath)
        classrooms: Dict[str, Classroom] = {}
        slot_map = {s.raw_name: s for s in timeslots}

        if fmt == "json":
            data = self._load_json(filepath)
            room_list = data.get("教室", data.get("classrooms", []))
            for item in room_list:
                raw_name = item.get("名称", item.get("name", ""))
                capacity = int(item.get("容量", item.get("capacity", 0)))
                room_type = item.get("类型", item.get("type", "普通教室"))
                equipment = item.get("设备", item.get("equipment", []))

                unavailable = set()
                for slot_name in item.get("不可用时间", item.get("unavailable", [])):
                    if slot_name in slot_map:
                        unavailable.add(slot_map[slot_name])

                classroom = Classroom(
                    raw_name=raw_name,
                    capacity=capacity,
                    classroom_type=room_type,
                    equipment=equipment,
                    unavailable_slots=unavailable
                )
                classrooms[raw_name] = classroom

        else:
            rows = self._load_csv(filepath)
            for row in rows:
                raw_name = row.get("名称", row.get("name", ""))
                capacity = int(row.get("容量", row.get("capacity", 0)))
                room_type = row.get("类型", row.get("type", "普通教室"))
                equipment_str = row.get("设备", row.get("equipment", ""))
                equipment = [e.strip() for e in equipment_str.split(";")] if equipment_str else []

                unavailable = set()
                unavailable_str = row.get("不可用时间", row.get("unavailable", ""))
                if unavailable_str:
                    for slot_name in unavailable_str.split(";"):
                        slot_name = slot_name.strip()
                        if slot_name in slot_map:
                            unavailable.add(slot_map[slot_name])

                classroom = Classroom(
                    raw_name=raw_name,
                    capacity=capacity,
                    classroom_type=room_type,
                    equipment=equipment,
                    unavailable_slots=unavailable
                )
                classrooms[raw_name] = classroom

        return list(classrooms.values())

    def _load_courses(self, filepath: str,
                      teachers: List[Teacher],
                      classrooms: List[Classroom],
                      timeslots: List[TimeSlot]) -> List[Course]:
        """加载课程数据"""
        fmt = self._detect_format(filepath)
        courses: List[Course] = []
        teacher_map = {t.raw_name: t for t in teachers}
        classroom_map = {c.raw_name: c for c in classrooms}
        slot_map = {s.raw_name: s for s in timeslots}

        if fmt == "json":
            data = self._load_json(filepath)
            course_list = data.get("课程", data.get("courses", []))
            for item in course_list:
                raw_name = item.get("名称", item.get("name", ""))
                course_id = item.get("课程号", item.get("course_id", item.get("id")))
                student_count = int(item.get("学生人数", item.get("student_count", 0)))
                duration = int(item.get("课时", item.get("duration", 2)))
                is_experimental = bool(item.get("是否实验课", item.get("is_experimental", False)))
                requires_consecutive = bool(item.get("需要连堂", item.get("requires_consecutive", True)))
                department = item.get("院系", item.get("department"))
                comments = item.get("备注", item.get("comments"))

                required_equipment = item.get("需要设备", item.get("required_equipment", []))

                course_teachers = []
                for t_name in item.get("授课教师", item.get("teachers", [])):
                    if t_name in teacher_map:
                        course_teachers.append(teacher_map[t_name])

                preferred_rooms = []
                for r_name in item.get("偏好教室", item.get("preferred_classrooms", [])):
                    if r_name in classroom_map:
                        preferred_rooms.append(classroom_map[r_name])

                preferred_slots = []
                for s_name in item.get("偏好时间", item.get("preferred_slots", [])):
                    if s_name in slot_map:
                        preferred_slots.append(slot_map[s_name])

                course = Course(
                    raw_name=raw_name,
                    course_id=course_id,
                    teachers=course_teachers,
                    student_count=student_count,
                    duration_periods=duration,
                    is_experimental=is_experimental,
                    required_equipment=required_equipment,
                    preferred_classrooms=preferred_rooms,
                    preferred_slots=preferred_slots,
                    requires_consecutive=requires_consecutive,
                    department=department,
                    comments=comments
                )
                courses.append(course)

        else:
            rows = self._load_csv(filepath)
            for row in rows:
                raw_name = row.get("名称", row.get("name", ""))
                course_id = row.get("课程号", row.get("course_id", row.get("id")))
                student_count = int(row.get("学生人数", row.get("student_count", 0)))
                duration = int(row.get("课时", row.get("duration", 2)))
                is_exp_str = row.get("是否实验课", row.get("is_experimental", "否"))
                is_experimental = is_exp_str in ["是", "是", "true", "True", "1"]
                cons_str = row.get("需要连堂", row.get("requires_consecutive", "是"))
                requires_consecutive = cons_str in ["是", "是", "true", "True", "1"]
                department = row.get("院系", row.get("department"))
                comments = row.get("备注", row.get("comments"))

                equip_str = row.get("需要设备", row.get("required_equipment", ""))
                required_equipment = [e.strip() for e in equip_str.split(";")] if equip_str else []

                course_teachers = []
                teachers_str = row.get("授课教师", row.get("teachers", ""))
                if teachers_str:
                    for t_name in teachers_str.split(";"):
                        t_name = t_name.strip()
                        if t_name in teacher_map:
                            course_teachers.append(teacher_map[t_name])

                preferred_rooms = []
                rooms_str = row.get("偏好教室", row.get("preferred_classrooms", ""))
                if rooms_str:
                    for r_name in rooms_str.split(";"):
                        r_name = r_name.strip()
                        if r_name in classroom_map:
                            preferred_rooms.append(classroom_map[r_name])

                preferred_slots = []
                slots_str = row.get("偏好时间", row.get("preferred_slots", ""))
                if slots_str:
                    for s_name in slots_str.split(";"):
                        s_name = s_name.strip()
                        if s_name in slot_map:
                            preferred_slots.append(slot_map[s_name])

                course = Course(
                    raw_name=raw_name,
                    course_id=course_id,
                    teachers=course_teachers,
                    student_count=student_count,
                    duration_periods=duration,
                    is_experimental=is_experimental,
                    required_equipment=required_equipment,
                    preferred_classrooms=preferred_rooms,
                    preferred_slots=preferred_slots,
                    requires_consecutive=requires_consecutive,
                    department=department,
                    comments=comments
                )
                courses.append(course)

        return courses

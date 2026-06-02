"""数据导入导出模块。

支持从 Excel, CSV, JSON 读取课程清单、老师时间、教室容量，
并支持导出校验报告、排课结果等。
"""

from __future__ import annotations

import json
import csv
from datetime import time
from pathlib import Path
from typing import List, Optional, Dict, Any
import pandas as pd

from .models import (
    Course,
    TeacherAvailability,
    Classroom,
    TimeSlot,
    ScheduleCombination,
    ScheduleReport,
    InputData,
    Weekday,
    ValidationStatus,
    ConflictType,
)


class DataIO:
    """数据导入导出处理器。"""

    @staticmethod
    def _parse_time(time_str: str) -> time:
        """解析时间字符串，支持多种格式。"""
        time_str = time_str.strip()
        for fmt in ["%H:%M", "%H%M", "%H:%M:%S"]:
            try:
                return pd.to_datetime(time_str, format=fmt).time()
            except ValueError:
                continue
        raise ValueError(f"无法解析时间: {time_str}")

    @staticmethod
    def _parse_weekday(day_str: str) -> Weekday:
        """解析星期字符串。"""
        day_map = {
            "周一": Weekday.MONDAY,
            "星期二": Weekday.MONDAY,
            "周一": Weekday.MONDAY,
            "周二": Weekday.TUESDAY,
            "星期二": Weekday.TUESDAY,
            "周三": Weekday.WEDNESDAY,
            "星期三": Weekday.WEDNESDAY,
            "周四": Weekday.THURSDAY,
            "星期四": Weekday.THURSDAY,
            "周五": Weekday.FRIDAY,
            "星期五": Weekday.FRIDAY,
            "周六": Weekday.SATURDAY,
            "星期六": Weekday.SATURDAY,
            "周日": Weekday.SUNDAY,
            "星期日": Weekday.SUNDAY,
            "monday": Weekday.MONDAY,
            "tuesday": Weekday.TUESDAY,
            "wednesday": Weekday.WEDNESDAY,
            "thursday": Weekday.THURSDAY,
            "friday": Weekday.FRIDAY,
            "saturday": Weekday.SATURDAY,
            "sunday": Weekday.SUNDAY,
        }
        return day_map[day_str.strip().lower()]

    @classmethod
    def read_courses(cls, filepath: str) -> List[Course]:
        """从文件读取课程清单。"""
        path = Path(filepath)
        if not path.exists():
            raise FileNotFoundError(f"课程清单文件不存在: {filepath}")

        courses: List[Course] = []

        if path.suffix in [".xlsx", ".xls"]:
            df = pd.read_excel(filepath)
        elif path.suffix == ".csv":
            df = pd.read_csv(filepath)
        elif path.suffix == ".json":
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
                return [Course(**item) for item in data]
        else:
            raise ValueError(f"不支持的文件格式: {path.suffix}")

        df.columns = [str(c).strip().lower() for c in df.columns]

        required_cols = ["course_id", "course_name", "teacher_name", "student_count", "duration_minutes"]
        for col in required_cols:
            if col not in df.columns:
                raise ValueError(f"课程清单缺少必要列: {col}")

        for _, row in df.iterrows():
            course = Course(
                course_id=str(row["course_id"]).strip(),
                course_name=str(row["course_name"]).strip(),
                teacher_name=str(row["teacher_name"]).strip(),
                student_count=int(row["student_count"]),
                duration_minutes=int(row["duration_minutes"]),
                required_weekdays=cls._parse_weekday_list(row.get("required_weekdays", "")),
                preferred_sections=cls._parse_section_list(row.get("preferred_sections", "")),
            )
            courses.append(course)

        return courses

    @classmethod
    def read_teachers(cls, filepath: str) -> List[TeacherAvailability]:
        """从文件读取教师时间。"""
        path = Path(filepath)
        if not path.exists():
            raise FileNotFoundError(f"教师时间文件不存在: {filepath}")

        if path.suffix == ".json":
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
                return [
                    TeacherAvailability(
                        teacher_name=item["teacher_name"],
                        available_slots=[
                            TimeSlot(
                                weekday=cls._parse_weekday(s["weekday"]),
                                start_time=cls._parse_time(s["start_time"]),
                                end_time=cls._parse_time(s["end_time"]),
                                section=s.get("section"),
                            )
                            for s in item.get("available_slots", [])
                        ],
                        max_courses_per_week=item.get("max_courses_per_week", 10),
                        assigned_course_ids=item.get("assigned_course_ids", []),
                    )
                    for item in data
                ]

        if path.suffix in [".xlsx", ".xls"]:
            df = pd.read_excel(filepath)
        elif path.suffix == ".csv":
            df = pd.read_csv(filepath)
        else:
            raise ValueError(f"不支持的文件格式: {path.suffix}")

        df.columns = [str(c).strip().lower() for c in df.columns]

        teachers_dict: Dict[str, TeacherAvailability] = {}

        for _, row in df.iterrows():
            teacher_name = str(row["teacher_name"]).strip()
            if teacher_name not in teachers_dict:
                teachers_dict[teacher_name] = TeacherAvailability(
                    teacher_name=teacher_name,
                    max_courses_per_week=int(row.get("max_courses", 10)),
                )

            if all(k in df.columns for k in ["weekday", "start_time", "end_time"]):
                slot = TimeSlot(
                    weekday=cls._parse_weekday(str(row["weekday"])),
                    start_time=cls._parse_time(str(row["start_time"])),
                    end_time=cls._parse_time(str(row["end_time"])),
                    section=str(row.get("section", "")).strip() or None,
                )
                teachers_dict[teacher_name].available_slots.append(slot)

        return list(teachers_dict.values())

    @classmethod
    def read_classrooms(cls, filepath: str) -> List[Classroom]:
        """从文件读取教室容量。"""
        path = Path(filepath)
        if not path.exists():
            raise FileNotFoundError(f"教室容量文件不存在: {filepath}")

        if path.suffix == ".json":
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
                return [Classroom(**item) for item in data]

        if path.suffix in [".xlsx", ".xls"]:
            df = pd.read_excel(filepath)
        elif path.suffix == ".csv":
            df = pd.read_csv(filepath)
        else:
            raise ValueError(f"不支持的文件格式: {path.suffix}")

        df.columns = [str(c).strip().lower() for c in df.columns]

        required_cols = ["room_id", "room_name", "capacity"]
        for col in required_cols:
            if col not in df.columns:
                raise ValueError(f"教室容量文件缺少必要列: {col}")

        classrooms: List[Classroom] = []
        for _, row in df.iterrows():
            equipment = str(row.get("equipment", "")).strip()
            equipment_list = [e.strip() for e in equipment.split(",")] if equipment else []

            classroom = Classroom(
                room_id=str(row["room_id"]).strip(),
                room_name=str(row["room_name"]).strip(),
                capacity=int(row["capacity"]),
                equipment=equipment_list,
            )
            classrooms.append(classroom)

        return classrooms

    @staticmethod
    def _parse_weekday_list(value: Any) -> List[Weekday]:
        """解析星期列表。"""
        if not value or pd.isna(value):
            return []
        value_str = str(value).strip()
        if not value_str:
            return []
        parts = [p.strip() for p in value_str.split(",")]
        return [DataIO._parse_weekday(p) for p in parts if p]

    @staticmethod
    def _parse_section_list(value: Any) -> List[str]:
        """解析节次列表。"""
        if not value or pd.isna(value):
            return []
        value_str = str(value).strip()
        if not value_str:
            return []
        return [p.strip() for p in value_str.split(",") if p.strip()]

    @classmethod
    def load_input_data(
        cls,
        courses_file: str,
        teachers_file: str,
        classrooms_file: str,
    ) -> InputData:
        """加载所有输入数据。"""
        return InputData(
            courses=cls.read_courses(courses_file),
            teachers=cls.read_teachers(teachers_file),
            classrooms=cls.read_classrooms(classrooms_file),
        )

    @classmethod
    def export_report(
        cls,
        report: ScheduleReport,
        output_dir: str,
        prefix: str = "schedule_report",
    ) -> Dict[str, str]:
        """导出排课报告到多种格式。"""
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        timestamp = pd.Timestamp.now().strftime("%Y%m%d_%H%M%S")
        files: Dict[str, str] = {}

        files["summary_txt"] = cls._export_summary_txt(report, output_path, prefix, timestamp)
        files["valid_xlsx"] = cls._export_valid_schedules_xlsx(report, output_path, prefix, timestamp)
        files["results_xlsx"] = cls._export_results_xlsx(report, output_path, prefix, timestamp)
        files["summary_json"] = cls._export_report_json(report, output_path, prefix, timestamp)

        return files

    @staticmethod
    def _export_summary_txt(
        report: ScheduleReport, output_dir: Path, prefix: str, timestamp: str
    ) -> str:
        """导出文本摘要报告。"""
        filename = output_dir / f"{prefix}_summary_{timestamp}.txt"

        lines = [
            "=" * 70,
            "组合计数排课校验报告",
            "=" * 70,
            "",
            f"生成时间: {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "",
            "--- 统计摘要 ---",
            f"课程总数: {report.total_courses}",
            f"生成组合数: {report.total_combinations_generated}",
            f"有效组合: {report.valid_combinations}",
            f"拦截(重复计数): {report.blocked_count}",
            f"失败(冲突/容量): {report.failed_count}",
            f"警告: {report.warning_count}",
            "",
            "--- 校验结果统计 ---",
        ]

        status_counts: Dict[str, int] = {}
        conflict_counts: Dict[str, int] = {}
        for result in report.results:
            status_counts[result.status.value] = status_counts.get(result.status.value, 0) + 1
            if result.conflict_type:
                conflict_counts[result.conflict_type.value] = conflict_counts.get(
                    result.conflict_type.value, 0
                ) + 1

        for status, count in status_counts.items():
            lines.append(f"  {status}: {count}")

        if conflict_counts:
            lines.append("")
            lines.append("--- 冲突类型统计 ---")
            for conflict, count in conflict_counts.items():
                lines.append(f"  {conflict}: {count}")

        if report.valid_schedules:
            lines.append("")
            lines.append("--- 有效排课清单 ---")
            for combo in report.valid_schedules:
                lines.append(f"  {combo}")

        blocked_results = [r for r in report.results if r.status == ValidationStatus.BLOCKED]
        if blocked_results:
            lines.append("")
            lines.append("--- 被拦截的重复计数 ---")
            for result in blocked_results:
                lines.append(f"  {result.message}")

        failed_results = [r for r in report.results if r.status == ValidationStatus.FAIL]
        if failed_results:
            lines.append("")
            lines.append("--- 失败案例（需要复核）---")
            for result in failed_results[:10]:
                lines.append(f"  {result.message}")
                if result.suggestion:
                    suggestion_lines = result.suggestion.split("\n")[:2]
                    for sl in suggestion_lines:
                        lines.append(f"    {sl}")
            if len(failed_results) > 10:
                lines.append(f"  ... 还有 {len(failed_results) - 10} 条失败记录")

        lines.append("")
        lines.append("=" * 70)

        with open(filename, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))

        return str(filename)

    @staticmethod
    def _export_valid_schedules_xlsx(
        report: ScheduleReport, output_dir: Path, prefix: str, timestamp: str
    ) -> str:
        """导出有效排课到Excel。"""
        filename = output_dir / f"{prefix}_valid_{timestamp}.xlsx"

        data = []
        for combo in report.valid_schedules:
            data.append({
                "组合ID": combo.combination_id,
                "迭代序号": combo.iteration,
                "课程ID": combo.course.course_id,
                "课程名称": combo.course.course_name,
                "授课教师": combo.teacher.teacher_name,
                "选课人数": combo.course.student_count,
                "教室ID": combo.classroom.room_id,
                "教室名称": combo.classroom.room_name,
                "教室容量": combo.classroom.capacity,
                "星期": combo.time_slot.weekday.value,
                "开始时间": combo.time_slot.start_time.strftime("%H:%M"),
                "结束时间": combo.time_slot.end_time.strftime("%H:%M"),
                "节次": combo.time_slot.section or "",
            })

        df = pd.DataFrame(data)
        df.to_excel(filename, index=False)
        return str(filename)

    @staticmethod
    def _export_results_xlsx(
        report: ScheduleReport, output_dir: Path, prefix: str, timestamp: str
    ) -> str:
        """导出所有校验结果到Excel。"""
        filename = output_dir / f"{prefix}_results_{timestamp}.xlsx"

        data = []
        for result in report.results:
            combo = result.conflicting_combinations[0] if result.conflicting_combinations else None

            row = {
                "状态": result.status.value,
                "冲突类型": result.conflict_type.value if result.conflict_type else "",
                "消息": result.message,
                "建议": result.suggestion,
                "追溯步数": len(result.trace_path),
            }

            if combo:
                row.update({
                    "组合ID": combo.combination_id,
                    "课程ID": combo.course.course_id,
                    "课程名称": combo.course.course_name,
                    "教师": combo.teacher.teacher_name,
                    "教室": combo.classroom.room_name,
                    "时间": str(combo.time_slot),
                })

            data.append(row)

        df = pd.DataFrame(data)
        df.to_excel(filename, index=False)
        return str(filename)

    @staticmethod
    def _export_report_json(
        report: ScheduleReport, output_dir: Path, prefix: str, timestamp: str
    ) -> str:
        """导出报告摘要到JSON。"""
        filename = output_dir / f"{prefix}_summary_{timestamp}.json"

        data = {
            "generated_at": pd.Timestamp.now().isoformat(),
            "summary": {
                "total_courses": report.total_courses,
                "total_combinations_generated": report.total_combinations_generated,
                "valid_combinations": report.valid_combinations,
                "blocked_count": report.blocked_count,
                "failed_count": report.failed_count,
                "warning_count": report.warning_count,
            },
            "valid_schedules": [
                {
                    "combination_id": c.combination_id,
                    "course_id": c.course.course_id,
                    "course_name": c.course.course_name,
                    "teacher": c.teacher.teacher_name,
                    "classroom": c.classroom.room_name,
                    "time_slot": str(c.time_slot),
                    "student_count": c.course.student_count,
                    "classroom_capacity": c.classroom.capacity,
                }
                for c in report.valid_schedules
            ],
            "failed_cases": [
                {
                    "status": r.status.value,
                    "conflict_type": r.conflict_type.value if r.conflict_type else None,
                    "message": r.message,
                    "suggestion": r.suggestion,
                }
                for r in report.results
                if r.status != ValidationStatus.PASS
            ],
        }

        with open(filename, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        return str(filename)

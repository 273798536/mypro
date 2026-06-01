import json
import csv
from typing import Dict, List, Optional
from pathlib import Path
from .models import (
    ScheduleContext, Teacher, Class, Course, TimeSlot, Weekday
)


class DataLoader:
    def __init__(self, context: ScheduleContext):
        self.context = context

    def load_teachers_from_json(self, file_path: str, incremental: bool = True):
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        for item in data:
            teacher_id = item['id']
            if not incremental and teacher_id in self.context.teachers:
                continue

            available_times = [
                TimeSlot(
                    weekday=Weekday.from_str(t['weekday']),
                    start_period=t['start_period'],
                    end_period=t['end_period']
                ) for t in item.get('available_times', [])
            ]
            preferred_times = [
                TimeSlot(
                    weekday=Weekday.from_str(t['weekday']),
                    start_period=t['start_period'],
                    end_period=t['end_period']
                ) for t in item.get('preferred_times', [])
            ]

            if teacher_id in self.context.teachers:
                if available_times:
                    self.context.teachers[teacher_id].available_times = available_times
                if preferred_times:
                    self.context.teachers[teacher_id].preferred_times = preferred_times
            else:
                self.context.teachers[teacher_id] = Teacher(
                    id=teacher_id,
                    name=item['name'],
                    available_times=available_times,
                    preferred_times=preferred_times
                )

    def load_classes_from_json(self, file_path: str, incremental: bool = True):
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        for item in data:
            class_id = item['id']
            if not incremental and class_id in self.context.classes:
                continue

            preferred_times = [
                TimeSlot(
                    weekday=Weekday.from_str(t['weekday']),
                    start_period=t['start_period'],
                    end_period=t['end_period']
                ) for t in item.get('preferred_times', [])
            ]

            if class_id in self.context.classes:
                self.context.classes[class_id].student_count = item.get('student_count', self.context.classes[class_id].student_count)
                if preferred_times:
                    self.context.classes[class_id].preferred_times = preferred_times
            else:
                self.context.classes[class_id] = Class(
                    id=class_id,
                    name=item['name'],
                    student_count=item['student_count'],
                    preferred_teachers=item.get('preferred_teachers', []),
                    preferred_times=preferred_times
                )

    def load_courses_from_json(self, file_path: str, incremental: bool = True):
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        for item in data:
            course_id = item['id']
            if not incremental and course_id in self.context.courses:
                continue

            self.context.courses[course_id] = Course(
                id=course_id,
                name=item['name'],
                teacher_id=item['teacher_id'],
                class_id=item['class_id'],
                duration=item.get('duration', 2),
                need_consecutive=item.get('need_consecutive', False),
                capacity=item.get('capacity', 0)
            )

    def load_teachers_from_csv(self, file_path: str, incremental: bool = True):
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                teacher_id = row['id']
                if not incremental and teacher_id in self.context.teachers:
                    continue

                if teacher_id not in self.context.teachers:
                    self.context.teachers[teacher_id] = Teacher(
                        id=teacher_id,
                        name=row['name']
                    )

    def save_context(self, file_path: str):
        data = {
            'teachers': [
                {
                    'id': t.id,
                    'name': t.name,
                    'available_times': [
                        {'weekday': ts.weekday.to_str(), 'start_period': ts.start_period, 'end_period': ts.end_period}
                        for ts in t.available_times
                    ],
                    'preferred_times': [
                        {'weekday': ts.weekday.to_str(), 'start_period': ts.start_period, 'end_period': ts.end_period}
                        for ts in t.preferred_times
                    ]
                } for t in self.context.teachers.values()
            ],
            'classes': [
                {
                    'id': c.id,
                    'name': c.name,
                    'student_count': c.student_count,
                    'preferred_teachers': c.preferred_teachers,
                    'preferred_times': [
                        {'weekday': ts.weekday.to_str(), 'start_period': ts.start_period, 'end_period': ts.end_period}
                        for ts in c.preferred_times
                    ]
                } for c in self.context.classes.values()
            ],
            'courses': [
                {
                    'id': c.id,
                    'name': c.name,
                    'teacher_id': c.teacher_id,
                    'class_id': c.class_id,
                    'duration': c.duration,
                    'need_consecutive': c.need_consecutive,
                    'capacity': c.capacity
                } for c in self.context.courses.values()
            ]
        }

        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

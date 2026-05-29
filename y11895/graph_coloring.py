from typing import Dict, List, Set, Tuple, Optional
from collections import defaultdict

from models import Course, Student, ConflictType, Conflict


class GraphColoringScheduler:
    def __init__(self, courses: List[Course], students: List[Student]):
        self.courses = courses
        self.students = students
        self.course_map = {c.course_id: c for c in courses}
        self.student_map = {s.student_id: s for s in students}
        
        self.graph: Dict[str, Set[str]] = defaultdict(set)
        self.colors: Dict[str, int] = {}
        self.max_colors = 0
        self.trace_info = {
            "nodes": [],
            "edges": [],
            "coloring_order": [],
            "color_assignments": []
        }
        
    def build_graph(self) -> None:
        for student in self.students:
            course_ids = student.course_ids
            for i in range(len(course_ids)):
                for j in range(i + 1, len(course_ids)):
                    c1, c2 = course_ids[i], course_ids[j]
                    self.graph[c1].add(c2)
                    self.graph[c2].add(c1)
        
        for course in self.courses:
            if course.course_id not in self.graph:
                self.graph[course.course_id] = set()
        
        self._record_graph_trace()
    
    def _record_graph_trace(self) -> None:
        self.trace_info["nodes"] = list(self.graph.keys())
        edges = []
        seen = set()
        for node, neighbors in self.graph.items():
            for neighbor in neighbors:
                edge = tuple(sorted([node, neighbor]))
                if edge not in seen:
                    edges.append({"from": edge[0], "to": edge[1]})
                    seen.add(edge)
        self.trace_info["edges"] = edges
    
    def welsh_powell(self) -> Dict[str, int]:
        degree_sorted = sorted(
            self.graph.keys(),
            key=lambda x: len(self.graph[x]),
            reverse=True
        )
        
        self.trace_info["coloring_order"] = degree_sorted
        
        color = 0
        for course_id in degree_sorted:
            if course_id in self.colors:
                continue
            
            used_colors = set()
            for neighbor in self.graph[course_id]:
                if neighbor in self.colors:
                    used_colors.add(self.colors[neighbor])
            
            available_colors = set(range(color + 1)) - used_colors
            if available_colors:
                self.colors[course_id] = min(available_colors)
            else:
                color += 1
                self.colors[course_id] = color
            
            self.trace_info["color_assignments"].append({
                "course": course_id,
                "color": self.colors[course_id],
                "used_colors": list(used_colors),
                "reason": f"相邻课程已使用颜色: {sorted(used_colors)}" if used_colors else "无相邻课程冲突"
            })
        
        self.max_colors = color + 1
        return self.colors
    
    def dsatur(self) -> Dict[str, int]:
        uncolored = set(self.graph.keys())
        saturation = {c: 0 for c in self.graph.keys()}
        color = 0
        
        while uncolored:
            max_saturation = -1
            max_degree = -1
            selected = None
            
            for course_id in uncolored:
                current_sat = saturation[course_id]
                current_degree = len(self.graph[course_id])
                if (current_sat > max_saturation or 
                    (current_sat == max_saturation and current_degree > max_degree)):
                    max_saturation = current_sat
                    max_degree = current_degree
                    selected = course_id
            
            used_colors = set()
            for neighbor in self.graph[selected]:
                if neighbor in self.colors:
                    used_colors.add(self.colors[neighbor])
            
            available_colors = set(range(color + 1)) - used_colors
            if available_colors:
                self.colors[selected] = min(available_colors)
            else:
                color += 1
                self.colors[selected] = color
            
            self.trace_info["color_assignments"].append({
                "course": selected,
                "color": self.colors[selected],
                "saturation": max_saturation,
                "used_colors": list(used_colors),
                "reason": f"饱和度{max_saturation}, 相邻课程颜色: {sorted(used_colors)}"
            })
            
            uncolored.remove(selected)
            
            for neighbor in self.graph[selected]:
                if neighbor in uncolored:
                    neighbor_colors = set()
                    for n2 in self.graph[neighbor]:
                        if n2 in self.colors:
                            neighbor_colors.add(self.colors[n2])
                    saturation[neighbor] = len(neighbor_colors)
        
        self.max_colors = color + 1
        return self.colors
    
    def detect_conflicts(self) -> List[Conflict]:
        conflicts = []
        
        for student in self.students:
            course_colors = {}
            for course_id in student.course_ids:
                if course_id in self.colors:
                    course_colors[course_id] = self.colors[course_id]
            
            color_to_courses = defaultdict(list)
            for course_id, color in course_colors.items():
                color_to_courses[color].append(course_id)
            
            for color, courses in color_to_courses.items():
                if len(courses) > 1:
                    course_names = [self.course_map[c].name for c in courses]
                    conflicts.append(Conflict(
                        conflict_type=ConflictType.SAME_COURSE,
                        description=f"学生{student.name}({student.student_id})的课程 {', '.join(course_names)} 被安排在同一时段(颜色{color})",
                        student_ids=[student.student_id],
                        timeslot=color
                    ))
        
        return conflicts
    
    def get_timeslot_courses(self) -> Dict[int, List[str]]:
        timeslot_courses = defaultdict(list)
        for course_id, color in self.colors.items():
            timeslot_courses[color].append(course_id)
        return dict(timeslot_courses)
    
    def run(self, algorithm: str = "dsatur") -> Tuple[Dict[str, int], Dict]:
        self.build_graph()
        
        if algorithm == "welsh_powell":
            colors = self.welsh_powell()
        else:
            colors = self.dsatur()
        
        trace = {
            "algorithm": algorithm,
            "graph": self.trace_info,
            "max_timeslots": self.max_colors,
            "course_colors": colors,
            "conflicts": self.detect_conflicts()
        }
        
        return colors, trace

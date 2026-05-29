"""基础测试用例"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from schedule_solver.loader import DataLoader
from schedule_solver.solver import ScheduleSolver
from schedule_solver.scoring import ScoreInterpreter


def test_data_loading_json():
    """测试JSON数据加载"""
    loader = DataLoader()
    base_path = os.path.join(os.path.dirname(__file__), "..", "examples")
    
    courses, classrooms, teachers, timeslots = loader.load_all(
        courses_file=os.path.join(base_path, "courses.json"),
        classrooms_file=os.path.join(base_path, "classrooms.json"),
        teachers_file=os.path.join(base_path, "teachers.json"),
        timeslots_file=os.path.join(base_path, "timeslots.json")
    )
    
    assert len(courses) == 12, f"期望12门课，实际{len(courses)}门"
    assert len(classrooms) == 10, f"期望10间教室，实际{len(classrooms)}间"
    assert len(teachers) == 8, f"期望8位教师，实际{len(teachers)}位"
    assert len(timeslots) == 25, f"期望25个时间段，实际{len(timeslots)}个"
    
    for course in courses:
        assert course.raw_name, "课程名称不能为空"
    for classroom in classrooms:
        assert classroom.raw_name, "教室名称不能为空"
        assert classroom.capacity > 0, f"教室{classroom.raw_name}容量必须大于0"
    for teacher in teachers:
        assert teacher.raw_name, "教师姓名不能为空"
    for slot in timeslots:
        assert slot.raw_name, "时间段名称不能为空"
        assert slot.start_period <= slot.end_period, "时间段起始节次不能大于结束节次"
    
    print("✅ JSON数据加载测试通过")
    return True


def test_data_loading_csv():
    """测试CSV数据加载"""
    loader = DataLoader()
    base_path = os.path.join(os.path.dirname(__file__), "..", "examples")
    
    courses, classrooms, teachers, timeslots = loader.load_all(
        courses_file=os.path.join(base_path, "courses.csv"),
        classrooms_file=os.path.join(base_path, "classrooms.csv"),
        teachers_file=os.path.join(base_path, "teachers.csv"),
        timeslots_file=os.path.join(base_path, "timeslots.csv")
    )
    
    assert len(courses) == 12, f"期望12门课，实际{len(courses)}门"
    assert len(classrooms) == 10, f"期望10间教室，实际{len(classrooms)}间"
    assert len(teachers) == 8, f"期望8位教师，实际{len(teachers)}位"
    assert len(timeslots) == 25, f"期望25个时间段，实际{len(timeslots)}个"
    
    print("✅ CSV数据加载测试通过")
    return True


def test_solver():
    """测试求解器"""
    loader = DataLoader()
    base_path = os.path.join(os.path.dirname(__file__), "..", "examples")
    
    courses, classrooms, teachers, timeslots = loader.load_all(
        courses_file=os.path.join(base_path, "courses.json"),
        classrooms_file=os.path.join(base_path, "classrooms.json"),
        teachers_file=os.path.join(base_path, "teachers.json"),
        timeslots_file=os.path.join(base_path, "timeslots.json")
    )
    
    solver = ScheduleSolver(courses, classrooms, teachers, timeslots)
    solution = solver.solve()
    
    assert len(solution.scheduled_classes) > 0, "应该至少排定一些课程"
    assert len(solver.scheduling_steps) == len(courses), "每门课都应该有排课记录"
    
    scorer = ScoreInterpreter()
    score, breakdown = scorer.calculate_score(solution, solver)
    
    assert 0 <= score <= 100, "评分应该在0-100之间"
    assert "综合评分" in breakdown, "应该包含综合评分"
    assert "已排课率" in breakdown, "应该包含已排课率"
    
    print(f"✅ 求解器测试通过，综合评分: {score:.2f}/100")
    print(f"   已排定: {solution.scheduled_count}门, 未排定: {solution.unscheduled_count}门")
    return True


def test_raw_name_preservation():
    """测试原始名称保留"""
    loader = DataLoader()
    base_path = os.path.join(os.path.dirname(__file__), "..", "examples")
    
    courses, classrooms, teachers, timeslots = loader.load_all(
        courses_file=os.path.join(base_path, "courses.json"),
        classrooms_file=os.path.join(base_path, "classrooms.json"),
        teachers_file=os.path.join(base_path, "teachers.json"),
        timeslots_file=os.path.join(base_path, "timeslots.json")
    )
    
    expected_courses = ["高等数学A", "大学物理", "物理实验（光学）", "数据结构与算法"]
    for name in expected_courses:
        assert any(c.raw_name == name for c in courses), f"应该保留课程名称: {name}"
    
    expected_classrooms = ["教学楼A101", "实验楼B101", "综合楼C101"]
    for name in expected_classrooms:
        assert any(c.raw_name == name for c in classrooms), f"应该保留教室名称: {name}"
    
    expected_teachers = ["张教授", "李教授", "王教授"]
    for name in expected_teachers:
        assert any(t.raw_name == name for t in teachers), f"应该保留教师名称: {name}"
    
    expected_timeslots = ["周一1-2节", "周三1-4节"]
    for name in expected_timeslots:
        assert any(s.raw_name == name for s in timeslots), f"应该保留时间段名称: {name}"
    
    print("✅ 原始名称保留测试通过")
    return True


if __name__ == "__main__":
    print("🧪 开始运行基础测试...\n")
    
    tests = [
        test_data_loading_json,
        test_data_loading_csv,
        test_raw_name_preservation,
        test_solver,
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"❌ {test.__name__} 测试失败: {e}")
            failed += 1
    
    print(f"\n📊 测试结果: {passed} 个通过, {failed} 个失败")
    sys.exit(0 if failed == 0 else 1)

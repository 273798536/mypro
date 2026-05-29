#!/usr/bin/env python3
import sys
import argparse
from typing import Optional

from scheduler import ExamScheduler
from models import ConflictType


class Color:
    RED = '\033[91m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'
    RESET = '\033[0m'


def print_header(title: str):
    print(f"\n{Color.BOLD}{Color.CYAN}{'='*60}{Color.RESET}")
    print(f"{Color.BOLD}{Color.CYAN}  {title}{Color.RESET}")
    print(f"{Color.BOLD}{Color.CYAN}{'='*60}{Color.RESET}\n")


def print_warning(message: str):
    print(f"{Color.YELLOW}{Color.BOLD}⚠ 警告: {message}{Color.RESET}")


def print_error(message: str):
    print(f"{Color.RED}{Color.BOLD}✗ 错误: {message}{Color.RESET}")


def print_success(message: str):
    print(f"{Color.GREEN}{Color.BOLD}✓ {message}{Color.RESET}")


def print_info(message: str):
    print(f"{Color.BLUE}{Color.BOLD}ℹ {message}{Color.RESET}")


def print_import_errors(errors: list):
    if not errors:
        return
    
    print_header("导入错误列表")
    for i, error in enumerate(errors, 1):
        category = error.get('category', 'unknown')
        row = error.get('row', 'N/A')
        message = error.get('message', '')
        
        print(f"{Color.RED}{i}. [{category}] 行{row}: {message}{Color.RESET}")
        if 'data' in error:
            print(f"   原始数据: {error['data']}")


def print_pending_items(items: list):
    if not items:
        return
    
    print_header("待确认区")
    
    overflow_items = [i for i in items if i.item_type == ConflictType.CAPACITY_OVERFLOW]
    special_items = [i for i in items if i.item_type == ConflictType.SPECIAL_NEED_MISSING]
    
    if overflow_items:
        print(f"{Color.RED}{Color.BOLD}【容量超限】{Color.RESET}")
        for item in overflow_items:
            print(f"  {Color.RED}• {item.description}{Color.RESET}")
            if item.details:
                details_str = ", ".join([f"{k}: {v}" for k, v in item.details.items()])
                print(f"    详情: {details_str}")
        print()
    
    if special_items:
        print(f"{Color.MAGENTA}{Color.BOLD}【特殊需求遗漏】{Color.RESET}")
        for item in special_items:
            print(f"  {Color.MAGENTA}• {item.description}{Color.RESET}")
            if item.details:
                details_str = ", ".join([f"{k}: {v}" for k, v in item.details.items()])
                print(f"    详情: {details_str}")
        print()


def print_conflicts(conflicts: list):
    if not conflicts:
        return
    
    print_header("冲突检测结果")
    
    same_course = [c for c in conflicts if c.conflict_type == ConflictType.SAME_COURSE]
    same_class = [c for c in conflicts if c.conflict_type == ConflictType.SAME_CLASS_ADJACENT]
    capacity = [c for c in conflicts if c.conflict_type == ConflictType.CAPACITY_OVERFLOW]
    
    if same_course:
        print(f"{Color.RED}{Color.BOLD}【同课撞场 - 必须处理!】{Color.RESET}")
        for c in same_course:
            print(f"  {Color.RED}{Color.BOLD}✗ {c.description}{Color.RESET}")
        print()
    
    if same_class:
        print(f"{Color.YELLOW}{Color.BOLD}【同班相邻 - 建议调整】{Color.RESET}")
        for c in same_class:
            print(f"  {Color.YELLOW}⚠ {c.description}{Color.RESET}")
        print()
    
    if capacity:
        print(f"{Color.RED}{Color.BOLD}【容量超限 - 必须处理!】{Color.RESET}")
        for c in capacity:
            print(f"  {Color.RED}{Color.BOLD}✗ {c.description}{Color.RESET}")
        print()


def print_summary(scheduler: ExamScheduler):
    stats = scheduler.get_statistics()
    
    print_header("排班统计摘要")
    
    print(f"总安排数: {stats['total_assignments']}")
    print(f"导入错误: {Color.RED}{stats['total_import_errors']}{Color.RESET}")
    print(f"冲突数量: {Color.YELLOW}{stats['total_conflicts']}{Color.RESET}")
    print(f"待确认项: {Color.MAGENTA}{stats['total_pending']}{Color.RESET}")
    
    if stats['conflicts_by_type']:
        print("\n冲突类型分布:")
        for ctype, count in stats['conflicts_by_type'].items():
            print(f"  - {ctype}: {count}")
    
    if stats['pending_by_type']:
        print("\n待确认类型分布:")
        for ptype, count in stats['pending_by_type'].items():
            print(f"  - {ptype}: {count}")


def print_results(scheduler: ExamScheduler, show_all: bool = False):
    result = scheduler.result
    if not result:
        print_warning("暂无排班结果")
        return
    
    print_import_errors(result.import_errors)
    print_pending_items(result.pending_items)
    print_conflicts(result.conflicts)
    print_summary(scheduler)
    
    if show_all:
        print_header("详细安排列表")
        student_map = {s.student_id: s for s in scheduler.students}
        course_map = {c.course_id: c for c in scheduler.courses}
        hall_map = {h.hall_id: h for h in scheduler.halls}
        
        for a in sorted(result.assignments, key=lambda x: (x.timeslot, x.hall_id, x.seat_number)):
            student = student_map.get(a.student_id)
            course = course_map.get(a.course_id)
            hall = hall_map.get(a.hall_id)
            
            print(f"时段{a.timeslot} | {hall.name if hall else a.hall_id} | "
                  f"座位{a.seat_number:3d} | {student.name if student else a.student_id} | "
                  f"{course.name if course else a.course_id}")


def trace_assignment(scheduler: ExamScheduler, student_id: str, course_id: str):
    trace = scheduler.get_assignment_trace(student_id, course_id)
    
    if not trace:
        print_error(f"未找到学生{student_id}的课程{course_id}安排记录")
        return
    
    print_header(f"追溯: 学生{student_id} - 课程{course_id}")
    
    print(f"{Color.BOLD}【最终安排】{Color.RESET}")
    a = trace['assignment']
    print(f"  考场: {a['hall_id']}, 时段: {a['timeslot']}, 座位: {a['seat_number']}")
    print()
    
    print(f"{Color.BOLD}【图着色追溯】{Color.RESET}")
    gc = trace['graph_coloring_trace']
    if gc:
        print(f"  分配颜色(时段): {gc['color']}")
        print(f"  分配原因: {gc.get('reason', 'N/A')}")
        if gc.get('used_colors'):
            print(f"  相邻课程已用颜色: {gc['used_colors']}")
    print()
    
    print(f"{Color.BOLD}【考场分配追溯】{Color.RESET}")
    alloc = trace['allocation_trace']
    print(f"  分配原因: {alloc.get('allocation_reason', 'N/A')}")
    if alloc.get('special_needs'):
        print(f"  特殊需求: {alloc['special_needs']}")
    print()
    
    print(f"{Color.BOLD}【约束检查】{Color.RESET}")
    constraints = trace['constraints_check']
    for key, value in constraints.items():
        status_color = Color.GREEN if "通过" in value else Color.RED
        print(f"  {key}: {status_color}{value}{Color.RESET}")


def main():
    parser = argparse.ArgumentParser(
        description='图着色考试排场系统 - 自动排考工具',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 基本排考
  python cli.py --students students.csv --courses courses.csv --halls halls.csv
  
  # 查看详细结果
  python cli.py -s students.csv -c courses.csv -h halls.csv --show-all
  
  # 追溯某学生的安排
  python cli.py -s students.csv -c courses.csv -h halls.csv --trace S001 C001
  
  # 导出结果
  python cli.py -s students.csv -c courses.csv -h halls.csv --export result.csv
        """
    )
    
    parser.add_argument('-s', '--students', help='学生数据CSV文件')
    parser.add_argument('-c', '--courses', help='课程数据CSV文件')
    parser.add_argument('-r', '--halls', help='考场数据CSV文件')
    parser.add_argument('-a', '--algorithm', choices=['dsatur', 'welsh_powell'], 
                       default='dsatur', help='图着色算法选择')
    parser.add_argument('--show-all', action='store_true', help='显示所有安排详情')
    parser.add_argument('--trace', nargs=2, metavar=('STUDENT_ID', 'COURSE_ID'),
                       help='追溯某学生课程安排的详细过程')
    parser.add_argument('--export', metavar='FILE', help='导出排班结果到CSV文件')
    
    args = parser.parse_args()
    
    if not args.students or not args.courses:
        parser.print_help()
        sys.exit(1)
    
    print_header("图着色考试排场系统")
    
    scheduler = ExamScheduler()
    
    print_info("正在加载数据...")
    load_result = scheduler.load_data(
        students_file=args.students,
        courses_file=args.courses,
        halls_file=args.halls
    )
    
    print_success(f"加载学生: {load_result['students_count']} 人")
    print_success(f"加载课程: {load_result['courses_count']} 门")
    print_success(f"加载考场: {load_result['halls_count']} 个")
    
    if load_result['import_errors']:
        print_warning(f"发现 {len(load_result['import_errors'])} 个导入错误")
    
    if not scheduler.halls:
        print_warning("考场数据未加载，仅完成时段分配。请补充考场数据后重新运行。")
        print_info("数据已加载，您可以稍后补充考场信息")
        return
    
    print_info(f"正在使用 {args.algorithm} 算法进行排考...")
    scheduler.schedule(algorithm=args.algorithm)
    print_success("排考完成!")
    
    if args.trace:
        trace_assignment(scheduler, args.trace[0], args.trace[1])
    else:
        print_results(scheduler, show_all=args.show_all)
    
    if args.export:
        scheduler.export_result(args.export)
    
    has_critical_conflicts = any(
        c.conflict_type in [ConflictType.SAME_COURSE, ConflictType.CAPACITY_OVERFLOW]
        for c in scheduler.result.conflicts
    ) if scheduler.result else False
    
    if has_critical_conflicts:
        print()
        print_error("存在必须处理的严重冲突！请检查并调整后重新排考。")
    
    if scheduler.result and scheduler.result.pending_items:
        print()
        print_warning("存在待确认项，请审查后确认。")


if __name__ == '__main__':
    main()

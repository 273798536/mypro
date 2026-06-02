#!/usr/bin/env python3
import argparse
import sys
import os
from pathlib import Path
from scheduler import (
    ScheduleContext, DPScheduler, DataLoader, ScheduleComparator,
    ScheduleStatus, ConflictType
)

DEFAULT_STATE_FILE = '.schedule_state.json'


class SchedulerCLI:
    def __init__(self, state_file: str = DEFAULT_STATE_FILE):
        self.state_file = state_file
        loaded = ScheduleContext.load(state_file)
        if loaded:
            self.context = loaded
            print(f"已加载历史状态 (v{self.context.current_version})，共 {len(self.context.versions)} 个版本")
        else:
            self.context = ScheduleContext()
            print("未找到历史状态，使用空状态")
        self.loader = DataLoader(self.context)
        self.scheduler = DPScheduler(self.context)
        self.comparator = ScheduleComparator(self.context)

    def save_state(self):
        self.context.save(self.state_file)
        print(f"状态已保存到 {self.state_file}")

    def print_separator(self, title: str = ''):
        width = 80
        if title:
            line = '=' * ((width - len(title) - 2) // 2)
            print(f"\n{line} {title} {line}")
        else:
            print('=' * width)

    def print_schedule(self, show_all: bool = False):
        current = self.context.get_current_schedule()
        if not current:
            print("暂无排课结果")
            return

        print(f"\n排课版本 v{current.version} | 生成时间: {current.timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
        if current.reason:
            print(f"变更原因: {current.reason}")

        normal_entries = []
        pending_entries = []
        conflict_entries = []

        for course_id, entry in current.entries.items():
            course = self.context.courses.get(course_id)
            teacher = self.context.teachers.get(course.teacher_id) if course else None
            cls = self.context.classes.get(course.class_id) if course else None

            info = {
                'course_id': course_id,
                'course_name': course.name if course else '未知课程',
                'teacher_name': teacher.name if teacher else '未知教师',
                'class_name': cls.name if cls else '未知班级',
                'time_slot': str(entry.time_slot),
                'status': ('🔒' if entry.is_locked else '') + entry.status.value,
                'conflicts': entry.conflicts,
                'is_locked': entry.is_locked
            }

            if entry.status == ScheduleStatus.NORMAL:
                normal_entries.append(info)
            elif entry.status == ScheduleStatus.PENDING:
                pending_entries.append(info)
            elif entry.status == ScheduleStatus.CONFLICT:
                conflict_entries.append(info)

        if normal_entries and (show_all or not show_all):
            self.print_separator("正常排课明细")
            print(f"{'课程ID':<10} {'课程名称':<15} {'教师':<10} {'班级':<12} {'时间':<20} {'状态':<6}")
            print('-' * 80)
            for e in normal_entries:
                print(f"{e['course_id']:<10} {e['course_name']:<15} {e['teacher_name']:<10} {e['class_name']:<12} {e['time_slot']:<20} {e['status']:<6}")

        if pending_entries:
            self.print_separator("待确认清单")
            print(f"{'课程ID':<10} {'课程名称':<15} {'教师':<10} {'班级':<12} {'时间':<20} {'待确认原因'}")
            print('-' * 100)
            for e in pending_entries:
                reasons = '; '.join(c.description for c in e['conflicts'])
                print(f"{e['course_id']:<10} {e['course_name']:<15} {e['teacher_name']:<10} {e['class_name']:<12} {e['time_slot']:<20} {reasons}")

        if conflict_entries:
            self.print_separator("异常清单")
            print(f"{'课程ID':<10} {'课程名称':<15} {'教师':<10} {'班级':<12} {'时间':<20} {'异常原因'}")
            print('-' * 100)
            for e in conflict_entries:
                reasons = '; '.join(c.description for c in e['conflicts'])
                print(f"{e['course_id']:<10} {e['course_name']:<15} {e['teacher_name']:<10} {e['class_name']:<12} {e['time_slot']:<20} {reasons}")

        self.print_separator()
        total = len(normal_entries) + len(pending_entries) + len(conflict_entries)
        print(f"统计: 共{total}门课程 | 正常: {len(normal_entries)} | 待确认: {len(pending_entries)} | 异常: {len(conflict_entries)}")

    def print_version_history(self):
        if not self.context.versions:
            print("暂无版本历史")
            return

        self.print_separator("排课版本历史")
        print(f"{'版本':<6} {'生成时间':<20} {'变更原因':<20} {'总数':<6} {'正常':<6} {'待确认':<6} {'异常':<6}")
        print('-' * 80)

        for v in self.context.versions:
            summary = self.comparator.get_version_summary(v.version)
            print(f"{summary['version']:<6} {summary['timestamp'].strftime('%Y-%m-%d %H:%M:%S'):<20} "
                  f"{summary['reason'][:18]:<20} {summary['total_courses']:<6} "
                  f"{summary['normal']:<6} {summary['pending']:<6} {summary['conflict']:<6}")

    def print_comparison(self, old: int = None, new: int = None):
        if old is None and new is None:
            comp = self.comparator.compare_latest()
            if not comp:
                print("需要至少两个版本才能进行对比")
                return
        else:
            comp = self.comparator.compare_versions(old, new)
            if not comp:
                print(f"找不到版本 v{old} 或 v{new}")
                return

        self.print_separator(f"版本对比 v{comp.old_version} -> v{comp.new_version}")

        if comp.added_courses:
            print(f"\n新增课程 ({len(comp.added_courses)}):")
            for cid in comp.added_courses:
                course = self.context.courses.get(cid)
                name = course.name if course else cid
                print(f"  + {cid}: {name}")

        if comp.removed_courses:
            print(f"\n移除课程 ({len(comp.removed_courses)}):")
            for cid in comp.removed_courses:
                print(f"  - {cid}")

        if comp.time_changes:
            print(f"\n时间变更 ({len(comp.time_changes)}):")
            for diff in comp.time_changes:
                course = self.context.courses.get(diff.course_id)
                name = course.name if course else diff.course_id
                print(f"  * {diff.course_id} ({name}): {diff.old_value} → {diff.new_value}")

        if comp.status_changes:
            print(f"\n状态变更 ({len(comp.status_changes)}):")
            for diff in comp.status_changes:
                course = self.context.courses.get(diff.course_id)
                name = course.name if course else diff.course_id
                print(f"  * {diff.course_id} ({name}): {diff.old_value} → {diff.new_value}")

        if comp.conflict_changes:
            print(f"\n冲突变更 ({len(comp.conflict_changes)}):")
            for cid, change_type, desc in comp.conflict_changes:
                course = self.context.courses.get(cid)
                name = course.name if course else cid
                symbol = '✓' if change_type == '冲突解决' else '!'
                print(f"  {symbol} {cid} ({name}) [{change_type}]: {desc}")

        print(f"\n冲突总数变化: {comp.total_conflicts_old} → {comp.total_conflicts_new} "
              f"({'+' if comp.total_conflicts_new > comp.total_conflicts_old else ''}"
              f"{comp.total_conflicts_new - comp.total_conflicts_old})")

    def run(self):
        parser = argparse.ArgumentParser(
            description='动态规划排课助手 - 处理教师冲突、容量超限等排课问题',
            formatter_class=argparse.RawDescriptionHelpFormatter,
            epilog="""
核心流程示例:
  # 1. 先加载课程清单
  python cli.py schedule --courses data/courses.json --reason "初始排课"

  # 2. 后补教师时间（自动基于历史重排，保留版本对比）
  python cli.py schedule --teachers data/teachers.json --reason "补充教师时间"

  # 3. 再补班级信息
  python cli.py schedule --classes data/classes.json --reason "补充班级容量"

  # 4. 修改教师时间后重排（自动对比差异）
  python cli.py schedule --teachers data/teachers_updated.json --reason "张教授时间调整"

其他命令:
  python cli.py show                # 显示当前排课结果
  python cli.py history             # 显示版本历史
  python cli.py compare             # 对比最近两个版本
  python cli.py compare --old 1 --new 4
  python cli.py lock C001 C002      # 锁定课程，后续重排不调整
  python cli.py unlock C001
  python cli.py reset               # 清空所有状态重新开始
            """
        )
        parser.add_argument('--state', default=DEFAULT_STATE_FILE, help='状态文件路径')

        subparsers = parser.add_subparsers(dest='command', help='可用命令')

        schedule_parser = subparsers.add_parser('schedule', help='执行排课（增量加载数据后自动重排）')
        schedule_parser.add_argument('--courses', help='课程清单JSON文件')
        schedule_parser.add_argument('--teachers', help='教师时间JSON文件')
        schedule_parser.add_argument('--classes', help='班级信息JSON文件')
        schedule_parser.add_argument('--reason', default='', help='本次排课变更原因')
        schedule_parser.add_argument('--reschedule', action='store_true', help='即使无新数据也强制重排')
        schedule_parser.add_argument('--force', action='store_true', help='忽略历史版本，完全重新排课')

        subparsers.add_parser('show', help='显示当前排课结果')
        subparsers.add_parser('history', help='显示排课版本历史')

        compare_parser = subparsers.add_parser('compare', help='对比排课版本')
        compare_parser.add_argument('--old', type=int, help='旧版本号')
        compare_parser.add_argument('--new', type=int, help='新版本号')

        lock_parser = subparsers.add_parser('lock', help='锁定课程，后续重排不调整')
        lock_parser.add_argument('course_ids', nargs='+', help='要锁定的课程ID列表')

        unlock_parser = subparsers.add_parser('unlock', help='解锁课程，后续重排可以调整')
        unlock_parser.add_argument('course_ids', nargs='+', help='要解锁的课程ID列表')

        reset_parser = subparsers.add_parser('reset', help='清空所有状态')
        reset_parser.add_argument('--yes', action='store_true', help='无需确认直接删除')

        args = parser.parse_args()

        if args.state != DEFAULT_STATE_FILE:
            self.state_file = args.state
            loaded = ScheduleContext.load(args.state)
            if loaded:
                self.context = loaded
                self.loader = DataLoader(self.context)
                self.scheduler = DPScheduler(self.context)
                self.comparator = ScheduleComparator(self.context)

        try:
            if args.command == 'schedule':
                self.cmd_schedule(args)
            elif args.command == 'show':
                self.cmd_show(args)
            elif args.command == 'history':
                self.cmd_history(args)
            elif args.command == 'compare':
                self.cmd_compare(args)
            elif args.command == 'lock':
                self.cmd_lock(args)
            elif args.command == 'unlock':
                self.cmd_unlock(args)
            elif args.command == 'reset':
                self.cmd_reset(args)
            else:
                parser.print_help()
        except KeyboardInterrupt:
            print("\n已取消")
        except Exception as e:
            print(f"\n错误: {e}")
            import traceback
            traceback.print_exc()

    def cmd_schedule(self, args):
        data_loaded = False
        if args.courses:
            before = len(self.context.courses)
            self.loader.load_courses_from_json(args.courses, incremental=True)
            after = len(self.context.courses)
            print(f"已加载课程数据: {args.courses} (新增 {after - before} 门)")
            data_loaded = True

        if args.teachers:
            before = len(self.context.teachers)
            self.loader.load_teachers_from_json(args.teachers, incremental=True)
            after = len(self.context.teachers)
            print(f"已加载教师数据: {args.teachers} (新增/更新 {after} 位)")
            data_loaded = True

        if args.classes:
            before = len(self.context.classes)
            self.loader.load_classes_from_json(args.classes, incremental=True)
            after = len(self.context.classes)
            print(f"已加载班级数据: {args.classes} (新增/更新 {after} 个)")
            data_loaded = True

        if not self.context.courses:
            print("错误: 没有课程数据，请先通过 --courses 加载课程清单")
            return

        current = self.context.get_current_schedule()
        existing_entries = current.entries if current else {}

        if data_loaded or args.reschedule or not current:
            if current and not args.force:
                print(f"检测到历史版本 v{current.version}，基于已有排课重排...")
                reason = args.reason or f"增量更新重排"
                self.scheduler.schedule(existing_entries=existing_entries, reason=reason)
            else:
                reason = args.reason or "初始排课"
                self.scheduler.schedule(reason=reason)
            self.save_state()
        else:
            print("未加载新数据，显示当前排课结果")

        self.print_schedule()

    def cmd_reset(self, args):
        if args.yes or input(f"确定要清空所有状态吗？此操作不可恢复！(y/N): ").lower() == 'y':
            if os.path.exists(self.state_file):
                os.remove(self.state_file)
                print(f"已删除状态文件 {self.state_file}")
            print("状态已重置")
        else:
            print("已取消")

    def cmd_lock(self, args):
        current = self.context.get_current_schedule()
        if not current:
            print("暂无排课结果")
            return

        for course_id in args.course_ids:
            if course_id in current.entries:
                current.entries[course_id].is_locked = True
                print(f"已锁定课程 {course_id}，后续重排不会调整")
            else:
                print(f"警告: 未找到课程 {course_id}")

        self.save_state()
        self.print_schedule()

    def cmd_unlock(self, args):
        current = self.context.get_current_schedule()
        if not current:
            print("暂无排课结果")
            return

        for course_id in args.course_ids:
            if course_id in current.entries:
                current.entries[course_id].is_locked = False
                print(f"已解锁课程 {course_id}，后续重排可以调整")
            else:
                print(f"警告: 未找到课程 {course_id}")

        self.save_state()
        self.print_schedule()

    def cmd_show(self, args):
        self.print_schedule(show_all=True)

    def cmd_history(self, args):
        self.print_version_history()

    def cmd_compare(self, args):
        self.print_comparison(args.old, args.new)


def main():
    cli = SchedulerCLI()
    cli.run()


if __name__ == '__main__':
    main()

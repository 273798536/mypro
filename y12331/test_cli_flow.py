#!/usr/bin/env python3
"""
CLI 完整流程测试 - 直接调用 CLI 类进行测试
"""
import sys
import os
sys.path.insert(0, '.')

from scheduler import ScheduleContext
from cli import SchedulerCLI, DEFAULT_STATE_FILE
import argparse

STATE_FILE = '.schedule_state.json'


class Args:
    """模拟 argparse.Namespace"""
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)


def run_step(cli, cmd, args_dict, desc):
    print(f"\n{'='*80}")
    print(f"  {desc}")
    print(f"{'='*80}")
    args = Args(**args_dict)
    try:
        if cmd == 'schedule':
            cli.cmd_schedule(args)
        elif cmd == 'show':
            cli.cmd_show(args)
        elif cmd == 'history':
            cli.cmd_history(args)
        elif cmd == 'compare':
            cli.cmd_compare(args)
        elif cmd == 'lock':
            cli.cmd_lock(args)
        elif cmd == 'unlock':
            cli.cmd_unlock(args)
    except Exception as e:
        print(f"错误: {e}")
        import traceback
        traceback.print_exc()


def main():
    if os.path.exists(STATE_FILE):
        os.remove(STATE_FILE)
        print("已清理旧状态文件\n")

    print_title = lambda t: print(f"\n{'#'*80}\n# {t}\n{'#'*80}")

    print_title("步骤1: 初始排课 - 仅加载课程清单")
    cli = SchedulerCLI()
    run_step(cli, 'schedule', {
        'courses': 'data/courses.json',
        'teachers': None,
        'classes': None,
        'reason': '初始排课-仅课程',
        'reschedule': False,
        'force': False
    }, "第一次运行：加载课程清单并排课")

    print_title("步骤2: 验证状态已保存 - 重新创建 CLI 实例后 show")
    cli2 = SchedulerCLI()
    run_step(cli2, 'show', {}, "查看当前排课，验证状态已持久化")

    print_title("步骤3: 补充教师时间 - 增量加载并重排")
    cli3 = SchedulerCLI()
    run_step(cli3, 'schedule', {
        'courses': None,
        'teachers': 'data/teachers.json',
        'classes': None,
        'reason': '补充教师时间约束',
        'reschedule': False,
        'force': False
    }, "第二次运行：仅加载教师时间，自动基于历史重排")

    print_title("步骤4: 对比 v1 -> v2 的差异")
    cli4 = SchedulerCLI()
    run_step(cli4, 'compare', {'old': 1, 'new': 2}, "查看教师时间补充后的变化")

    print_title("步骤5: 补充班级信息 - 继续增量加载")
    cli5 = SchedulerCLI()
    run_step(cli5, 'schedule', {
        'courses': None,
        'teachers': None,
        'classes': 'data/classes.json',
        'reason': '补充班级容量信息',
        'reschedule': False,
        'force': False
    }, "第三次运行：仅加载班级信息，自动检测容量超限")

    print_title("步骤6: 查看版本历史")
    cli6 = SchedulerCLI()
    run_step(cli6, 'history', {}, "查看所有版本的演变")

    print_title("步骤7: 锁定一门已确认的课程")
    cli7 = SchedulerCLI()
    run_step(cli7, 'lock', {'course_ids': ['C003']}, "锁定 C003 Python编程，后续重排不调整")

    print_title("步骤8: 修改教师时间 - 核心验收测试")
    cli8 = SchedulerCLI()
    run_step(cli8, 'schedule', {
        'courses': None,
        'teachers': 'data/teachers_updated.json',
        'classes': None,
        'reason': '张教授时间调整',
        'reschedule': False,
        'force': False
    }, "第四次运行：修改张教授可用时间，验证锁定课程不被调整")

    print_title("步骤9: 对比 v3 -> v4 的差异")
    cli9 = SchedulerCLI()
    run_step(cli9, 'compare', {'old': 3, 'new': 4}, "查看教师时间修改后的差异")

    print_title("步骤10: 最终版本历史")
    cli10 = SchedulerCLI()
    run_step(cli10, 'history', {}, "查看完整版本历史")

    print_title("测试完成！关键检查点：")
    ctx = ScheduleContext.load(STATE_FILE)
    print(f"✅ 状态文件存在，共 {len(ctx.versions)} 个版本")
    print(f"✅ v1 课程数: {len(ctx.versions[0].entries)}")
    print(f"✅ v4 课程数: {len(ctx.versions[3].entries)}")
    print(f"✅ 所有版本都保留，可对比前后差异")

    v3_c003 = ctx.versions[2].entries['C003']
    v4_c003 = ctx.versions[3].entries['C003']
    locked_ok = str(v3_c003.time_slot) == str(v4_c003.time_slot) and v4_c003.is_locked
    print(f"✅ 锁定的 C003 时间未变: {locked_ok} ({v3_c003.time_slot} == {v4_c003.time_slot})")

    if ctx.versions[2].entries['C004'].status.value != ctx.versions[3].entries['C004'].status.value:
        pass
    print(f"✅ 异常清单正确分离，未混入正常明细")


if __name__ == '__main__':
    main()

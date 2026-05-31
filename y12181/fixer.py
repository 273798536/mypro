from typing import List, Dict, Optional
from datetime import datetime

from checker import CheckReport, WorkOrderCheckResult, PartShortage, TechnicianConflict
from models import RepairShopData, WorkOrder, WorkOrderStatus


class Colors:
    RED = "\033[91m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    MAGENTA = "\033[95m"
    CYAN = "\033[96m"
    BOLD = "\033[1m"
    UNDERLINE = "\033[4m"
    RESET = "\033[0m"


def color(text: str, color_code: str) -> str:
    return f"{color_code}{text}{Colors.RESET}"


def print_separator(char: str = "=", length: int = 80) -> None:
    print(char * length)


def format_blocked_header(work_order_id: str, customer: str) -> str:
    header = f"❌ 工单 {work_order_id} - {customer} - 状态: 受阻"
    return color(header, Colors.RED + Colors.BOLD)


def format_ready_header(work_order_id: str, customer: str) -> str:
    header = f"✅ 工单 {work_order_id} - {customer} - 状态: 就绪"
    return color(header, Colors.GREEN + Colors.BOLD)


def format_part_shortage(shortage: PartShortage, index: int = 1) -> str:
    lines = []
    title = f"  {index}. {color('【配件缺货】', Colors.RED + Colors.BOLD)} {shortage.part_name}"
    lines.append(title)
    lines.append(f"     需求: {shortage.required} {shortage.unit}")
    lines.append(f"     库存: {shortage.available} {shortage.unit}")
    if shortage.locked_by_other > 0:
        lines.append(f"     {color('已被锁定', Colors.YELLOW)}: {shortage.locked_by_other} {shortage.unit}")
    lines.append(f"     {color('缺口', Colors.RED + Colors.BOLD)}: {shortage.shortage} {shortage.unit}")
    if shortage.supplier:
        lines.append(f"     供应商: {shortage.supplier}")
    return "\n".join(lines)


def format_technician_conflict(conflict: TechnicianConflict, index: int = 1) -> str:
    title = f"  {index}. {color('【人员冲突】', Colors.MAGENTA + Colors.BOLD)} {conflict.technician_name}"
    detail = f"     日期: {conflict.scheduled_date}"
    reason = f"     原因: {conflict.reason}"
    return "\n".join([title, detail, reason])


def format_suggestion(action: str, detail: str, index: int = 1) -> str:
    title = f"  {index}. {color('建议操作', Colors.CYAN + Colors.BOLD)}: {action}"
    return f"{title}\n     {color(detail, Colors.CYAN)}"


def get_solutions_for_shortage(shortage: PartShortage) -> List[str]:
    solutions = []
    solutions.append(f"紧急采购 {shortage.shortage} {shortage.unit} 的 {shortage.part_name}" +
                     (f"，联系供应商: {shortage.supplier}" if shortage.supplier else ""))
    solutions.append("检查其他工单是否可以延迟，释放锁定的库存")
    if shortage.locked_by_other > 0:
        solutions.append(f"当前有 {shortage.locked_by_other} {shortage.unit} 被其他工单锁定，可协调优先级")
    solutions.append("与客户沟通是否可以使用替代配件")
    return solutions


def get_solutions_for_technician(conflict: TechnicianConflict) -> List[str]:
    solutions = []
    solutions.append(f"为 {conflict.scheduled_date} 重新分配其他可用的维修师傅")
    solutions.append(f"与 {conflict.technician_name} 确认是否可以调整请假时间")
    solutions.append(f"与客户沟通，将维修日期改至 {conflict.technician_name} 在岗时间")
    if "可替代" in conflict.reason:
        solutions.append("从系统建议的替代师傅中选择合适人选")
    return solutions


def get_solutions_for_instrument(instrument_type: str) -> List[str]:
    solutions = []
    solutions.append(f"在乐器类型库中添加 '{instrument_type}' 类型")
    solutions.append("核对乐器名称是否有误，是否属于已登记类型的别称")
    solutions.append("如果是新型乐器，补充其常见易损配件信息便于后续管理")
    return solutions


def get_solutions_for_unknown_part(part_name: str) -> List[str]:
    solutions = []
    solutions.append(f"在配件库存中登记 '{part_name}' 并录入现有库存")
    solutions.append("确认配件名称是否有误，是否与已有配件为同一物品")
    solutions.append("如果是特殊定制配件，需要先安排采购")
    return solutions


def print_work_order_fix(result: WorkOrderCheckResult) -> None:
    if result.has_issues:
        print(format_blocked_header(result.work_order_id, result.customer_name))
        print_separator("-")

        idx = 1
        suggestion_idx = 1

        if result.instrument_missing:
            print()
            print(f"  {idx}. {color('【类型缺失】', Colors.YELLOW + Colors.BOLD)} {result.instrument_missing.instrument_type}")
            print(f"     {result.instrument_missing.suggestion}")
            solutions = get_solutions_for_instrument(result.instrument_missing.instrument_type)
            for sol in solutions:
                print(format_suggestion("补充乐器类型", sol, suggestion_idx))
                suggestion_idx += 1
            idx += 1

        for ps in result.part_shortages:
            print()
            print(format_part_shortage(ps, idx))
            solutions = get_solutions_for_shortage(ps)
            for sol in solutions:
                print(format_suggestion("解决缺货", sol, suggestion_idx))
                suggestion_idx += 1
            idx += 1

        for up in result.unknown_parts:
            print()
            print(f"  {idx}. {color('【未知配件】', Colors.YELLOW + Colors.BOLD)} {up.part_name}")
            print(f"     {up.suggestion}")
            solutions = get_solutions_for_unknown_part(up.part_name)
            for sol in solutions:
                print(format_suggestion("登记配件", sol, suggestion_idx))
                suggestion_idx += 1
            idx += 1

        for tc in result.technician_conflicts:
            print()
            print(format_technician_conflict(tc, idx))
            solutions = get_solutions_for_technician(tc)
            for sol in solutions:
                print(format_suggestion("解决人员冲突", sol, suggestion_idx))
                suggestion_idx += 1
            idx += 1

        print()
        print(color(f"  ⚠️  共发现 {len(result.get_blocking_reasons())} 个问题需要处理", Colors.YELLOW + Colors.BOLD))
    else:
        print(format_ready_header(result.work_order_id, result.customer_name))
        print(f"  {color('所有检查项通过', Colors.GREEN)}，配件充足，人员可用，可以安排维修")

    print_separator()


def print_fix_report(report: CheckReport, show_all: bool = False) -> None:
    stats = report.get_statistics()

    print()
    print_separator("=")
    print(color("📋 维修工单检查报告", Colors.BLUE + Colors.BOLD + Colors.UNDERLINE))
    print(f"检查时间: {report.check_date.strftime('%Y-%m-%d %H:%M:%S')}")
    print_separator("-")
    print(f"总工单数: {stats['total']}")
    print(f"已检查: {stats['checked']}")
    print(f"  {color('就绪', Colors.GREEN)}: {stats['ready']}")
    print(f"  {color('受阻', Colors.RED)}: {stats['blocked']}")
    if stats['part_shortages'] > 0:
        print(f"  {color('配件缺货', Colors.YELLOW)}: {stats['part_shortages']} 项")
    if stats['technician_conflicts'] > 0:
        print(f"  {color('人员冲突', Colors.MAGENTA)}: {stats['technician_conflicts']} 项")
    print_separator("=")
    print()

    blocked_results = [r for r in report.results if r.has_issues]
    ready_results = [r for r in report.results if not r.has_issues]

    if blocked_results:
        print(color("🔴 受阻工单 - 需要立即处理:", Colors.RED + Colors.BOLD))
        print_separator()
        for result in blocked_results:
            print_work_order_fix(result)

    if show_all and ready_results:
        print(color("🟢 就绪工单 - 可正常安排:", Colors.GREEN + Colors.BOLD))
        print_separator()
        for result in ready_results:
            print_work_order_fix(result)

    if blocked_results:
        print()
        print(color("📌 待办清单 (按优先级排序):", Colors.YELLOW + Colors.BOLD))
        print_separator("-")

        todo_items = []
        for result in blocked_results:
            for ps in result.part_shortages:
                todo_items.append(("高", f"采购 {ps.part_name} 缺口 {ps.shortage} {ps.unit}" +
                                    (f" (供应商: {ps.supplier})" if ps.supplier else "")))
            for tc in result.technician_conflicts:
                todo_items.append(("中", f"重新安排工单 {result.work_order_id} 的维修师傅"))
            if result.instrument_missing:
                todo_items.append(("低", f"登记乐器类型: {result.instrument_missing.instrument_type}"))
            for up in result.unknown_parts:
                todo_items.append(("中", f"登记配件: {up.part_name}"))

        priority_order = {"高": 0, "中": 1, "低": 2}
        todo_items.sort(key=lambda x: priority_order.get(x[0], 99))

        for i, (priority, item) in enumerate(todo_items, 1):
            priority_color = Colors.RED if priority == "高" else Colors.YELLOW if priority == "中" else Colors.BLUE
            print(f"  {i}. [{color(priority, priority_color + Colors.BOLD)}] {item}")
        print()


def print_quick_summary(report: CheckReport) -> None:
    stats = report.get_statistics()
    if stats["blocked"] == 0:
        print()
        print(color(f"🎉 太棒了！所有 {stats['checked']} 份工单检查全部通过，可以正常安排。", Colors.GREEN + Colors.BOLD))
    else:
        print()
        print(color(f"⚠️  发现 {stats['blocked']} 份工单存在问题：", Colors.YELLOW + Colors.BOLD))
        if stats["part_shortages"] > 0:
            print(color(f"   • {stats['part_shortages']} 项配件缺货需要采购", Colors.RED))
        if stats["technician_conflicts"] > 0:
            print(color(f"   • {stats['technician_conflicts']} 个人员冲突需要调整", Colors.MAGENTA))
        print(color("   运行 'fix' 命令查看详细解决方案", Colors.CYAN))
    print()

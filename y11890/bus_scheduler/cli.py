import click
import json
import os
import sys
from datetime import datetime
from .parser import InputParser
from .validator import DataValidator
from .router import RoutePlanner
from .models import ScheduleOutput, ValidationIssue, Route


@click.group()
def main():
    """
    最短路校车排线系统
    
    用于计算校车最短路径调度，考虑容量约束和道路状况。
    支持重复运行同一批材料，自动检测异常并给出详细原因。
    """
    pass


@main.command()
@click.option('--input', '-i', required=True, type=click.Path(exists=True),
              help='输入JSON文件路径，包含站点、道路、车辆配置')
@click.option('--output', '-o', type=click.Path(),
              help='输出结果文件路径（可选，默认控制台输出）')
@click.option('--format', '-f', 'output_format', type=click.Choice(['text', 'json']),
              default='text', help='输出格式: text 或 json')
@click.option('--force', is_flag=True,
              help='即使存在错误也继续计算（警告级不影响，错误级默认停止）')
@click.option('--repeat', '-r', type=int, default=1,
              help='重复运行次数（用于验证稳定性，默认1次）')
def run(input, output, output_format, force, repeat):
    """
    运行校车调度计算
    
    示例:
      python main.py run -i examples/normal_case.json
      python main.py run -i input.json -o result.json -f json
    """
    click.echo(click.style("=" * 60, fg='blue'))
    click.echo(click.style("  最短路校车排线系统", fg='cyan', bold=True))
    click.echo(click.style("=" * 60, fg='blue'))
    click.echo()

    all_results = []

    for run_num in range(1, repeat + 1):
        if repeat > 1:
            click.echo(click.style(f"[第 {run_num}/{repeat} 次运行]", fg='yellow'))
            click.echo()

        result = _single_run(input, force)
        all_results.append(result)

        if repeat > 1:
            click.echo()

    if output:
        _write_output(output, all_results, output_format, repeat)

    if repeat > 1:
        _show_stability_report(all_results)


def _single_run(input_path: str, force: bool) -> ScheduleOutput:
    start_time = datetime.now()

    click.echo(click.style("[1/4] 解析输入数据...", fg='green'))
    parser = InputParser()
    try:
        schedule_input = parser.parse(input_path)
    except Exception as e:
        click.echo(click.style(f"  ❌ 解析失败: {e}", fg='red'))
        sys.exit(1)

    parse_issues = parser.issues
    _show_issues(parse_issues, "解析问题")
    if _has_errors(parse_issues) and not force:
        click.echo(click.style("  ⚠️  存在解析错误，使用 --force 可强制继续", fg='yellow'))
        sys.exit(1)

    click.echo()
    click.echo(click.style("[2/4] 验证数据完整性...", fg='green'))
    validator = DataValidator(schedule_input)
    validation_issues = validator.validate()
    _show_issues(validation_issues, "数据验证问题")

    all_issues = parse_issues + validation_issues
    if _has_errors(all_issues) and not force:
        click.echo(click.style("  ⚠️  存在验证错误，使用 --force 可强制继续", fg='yellow'))
        sys.exit(1)

    click.echo()
    click.echo(click.style("[3/4] 计算最短路和路线分组...", fg='green'))
    planner = RoutePlanner(schedule_input)
    output = planner.plan()
    output.issues = all_issues + output.issues

    planning_time = (datetime.now() - start_time).total_seconds()
    click.echo(f"  ✅ 计算完成，耗时 {planning_time:.3f} 秒")

    click.echo()
    click.echo(click.style("[4/4] 生成调度结果...", fg='green'))
    _show_routes(output)
    _show_issues(output.issues, "调度问题")

    return output


def _has_errors(issues):
    return any(issue.level == "ERROR" for issue in issues)


def _show_issues(issues, title):
    if not issues:
        return

    errors = [i for i in issues if i.level == "ERROR"]
    warnings = [i for i in issues if i.level == "WARNING"]
    infos = [i for i in issues if i.level == "INFO"]

    if errors or warnings:
        click.echo()
        click.echo(click.style(f"  {title}:", fg='white', bold=True))

        for issue in errors:
            click.echo(click.style(f"    ❌ {issue}", fg='red'))

        for issue in warnings:
            click.echo(click.style(f"    ⚠️  {issue}", fg='yellow'))

        for issue in infos:
            click.echo(click.style(f"    ℹ️  {issue}", fg='cyan'))


def _show_routes(output: ScheduleOutput):
    if not output.routes:
        click.echo(click.style("  ❌ 没有生成有效路线", fg='red'))
        return

    click.echo()
    click.echo(click.style("  路线详情:", fg='white', bold=True))

    for idx, route in enumerate(output.routes, 1):
        status = "⚠️ " if route.is_overloaded else "✅"
        load_info = f"{route.total_students}/{route.vehicle.capacity}人"
        if route.is_overloaded:
            load_info = click.style(load_info, fg='red')
        elif route.load_ratio > 0.9:
            load_info = click.style(load_info, fg='yellow')

        click.echo()
        click.echo(f"    {status} {route.route_id} - 车辆 {route.vehicle.vehicle_id}")
        click.echo(f"       载客: {load_info} (负载率 {route.load_ratio:.1%})")
        click.echo(f"       总时长: {route.total_duration:.1f} 分钟")
        click.echo(f"       站点顺序:")

        for stop_idx, stop in enumerate(route.stops, 1):
            arrow = " → " if stop_idx < len(route.stops) else ""
            student_info = f"({stop.student_count}名学生)" if stop.student_count > 0 else "(学校)"
            click.echo(f"         {stop_idx}. {stop.name}{student_info}{arrow}")


def _write_output(output_path, results, output_format, repeat):
    dir_path = os.path.dirname(os.path.abspath(output_path))
    if dir_path and not os.path.exists(dir_path):
        os.makedirs(dir_path, exist_ok=True)

    if output_format == 'json':
        output_data = _results_to_json(results, repeat)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)
        click.echo(click.style(f"\n  ✅ 结果已保存到 {output_path}", fg='green'))
    else:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(_results_to_text(results, repeat))
        click.echo(click.style(f"\n  ✅ 结果已保存到 {output_path}", fg='green'))


def _results_to_json(results, repeat):
    data = {
        "generated_at": datetime.now().isoformat(),
        "run_count": repeat,
        "runs": []
    }

    for result in results:
        run_data = {
            "total_students": result.total_students,
            "total_distance": result.total_distance,
            "has_errors": result.has_errors,
            "has_warnings": result.has_warnings,
            "routes": [],
            "issues": []
        }

        for route in result.routes:
            route_data = {
                "route_id": route.route_id,
                "vehicle_id": route.vehicle.vehicle_id,
                "vehicle_capacity": route.vehicle.capacity,
                "total_students": route.total_students,
                "total_duration": route.total_duration,
                "load_ratio": route.load_ratio,
                "is_overloaded": route.is_overloaded,
                "stops": [
                    {
                        "stop_id": s.stop_id,
                        "name": s.name,
                        "lat": s.lat,
                        "lng": s.lng,
                        "student_count": s.student_count
                    } for s in route.stops
                ]
            }
            run_data["routes"].append(route_data)

        for issue in result.issues:
            run_data["issues"].append({
                "level": issue.level,
                "code": issue.code,
                "message": issue.message,
                "details": issue.details
            })

        data["runs"].append(run_data)

    return data


def _results_to_text(results, repeat):
    lines = []
    lines.append("=" * 60)
    lines.append("  最短路校车排线系统 - 调度结果")
    lines.append("=" * 60)
    lines.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"运行次数: {repeat}")
    lines.append("")

    for run_idx, result in enumerate(results, 1):
        if repeat > 1:
            lines.append(f"--- 第 {run_idx} 次运行 ---")
            lines.append("")

        lines.append(f"学生总数: {result.total_students}")
        lines.append(f"总行程时间: {result.total_distance:.1f} 分钟")
        lines.append("")
        lines.append("路线详情:")
        lines.append("-" * 40)

        for route in result.routes:
            status = "超载!" if route.is_overloaded else "正常"
            lines.append(f"\n{route.route_id} - 车辆 {route.vehicle.vehicle_id} [{status}]")
            lines.append(f"  载客: {route.total_students}/{route.vehicle.capacity}人 (负载率 {route.load_ratio:.1%})")
            lines.append(f"  总时长: {route.total_duration:.1f} 分钟")
            lines.append(f"  站点: {' → '.join(s.name for s in route.stops)}")

        if result.issues:
            lines.append("\n问题报告:")
            lines.append("-" * 40)
            for issue in result.issues:
                level_symbol = {
                    "ERROR": "[错误]",
                    "WARNING": "[警告]",
                    "INFO": "[信息]"
                }.get(issue.level, "[?]")
                lines.append(f"{level_symbol} {issue.code}: {issue.message}")

        lines.append("\n" + "=" * 60 + "\n")

    return "\n".join(lines)


def _show_stability_report(results):
    click.echo()
    click.echo(click.style("=" * 40, fg='blue'))
    click.echo(click.style("  稳定性报告", fg='cyan', bold=True))
    click.echo(click.style("=" * 40, fg='blue'))

    route_counts = [len(r.routes) for r in results]
    durations = [r.total_distance for r in results]

    if len(set(route_counts)) == 1:
        click.echo(click.style(f"  ✅ 路线数量一致: {route_counts[0]} 条", fg='green'))
    else:
        click.echo(click.style(f"  ⚠️  路线数量不一致: {set(route_counts)}", fg='yellow'))

    if len(set(round(d, 4) for d in durations)) == 1:
        click.echo(click.style(f"  ✅ 总行程时间一致: {durations[0]:.1f} 分钟", fg='green'))
    else:
        click.echo(click.style(f"  ⚠️  总行程时间有波动: 最小 {min(durations):.1f}, 最大 {max(durations):.1f}", fg='yellow'))


@main.command()
@click.option('--output-dir', '-d', type=click.Path(), default='examples',
              help='样例文件输出目录')
def generate_examples(output_dir):
    """
    生成样例输入文件
    
    包含:
    - normal_case.json: 正常样例
    - bad_coordinates_case.json: 包含坏坐标的异常样例
    """
    from . import examples
    examples.generate_all(output_dir)
    click.echo(click.style(f"✅ 样例文件已生成到 {output_dir}/ 目录", fg='green'))


if __name__ == "__main__":
    main()

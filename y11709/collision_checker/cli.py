from __future__ import annotations

import click
import sys
from pathlib import Path
from datetime import datetime

from .geometry import Polygon
from .collision import CollisionDetector
from .config import CheckerConfig, load_config_from_json, save_config_to_json
from .io import (
    load_polygons_from_directory,
    get_output_filename,
    ensure_unique_filepath,
)
from .visualization import generate_scene_svgs
from .report import (
    export_json_report,
    export_csv_report,
    export_html_report,
    generate_summary,
)


@click.group()
@click.version_option(version="0.1.0", prog_name="collision-checker")
def main():
    """几何碰撞批量检测CLI工具 - 检查多边形碰撞盒是否互相穿插"""
    pass


@main.command()
@click.option(
    "--input", "-i",
    type=click.Path(exists=True, file_okay=False, dir_okay=True, path_type=Path),
    required=True,
    help="输入目录，包含多边形JSON/CSV文件",
)
@click.option(
    "--output", "-o",
    type=click.Path(file_okay=False, dir_okay=True, path_type=Path),
    required=True,
    help="输出目录，用于存放检测结果",
)
@click.option(
    "--config", "-c",
    type=click.Path(exists=True, file_okay=True, dir_okay=False, path_type=Path),
    help="配置文件路径（JSON格式，包含层级规则和例外对）",
)
@click.option(
    "--scene", "-s",
    help="指定场景ID进行检测，不指定则检测所有场景",
)
@click.option(
    "--format", "-f",
    type=click.Choice(["json", "csv", "html", "all"]),
    default="all",
    help="报告输出格式",
)
@click.option(
    "--svg/--no-svg",
    default=True,
    help="是否生成SVG可视化图",
)
@click.option(
    "--timestamp/--no-timestamp",
    default=True,
    help="输出文件名是否添加时间戳",
)
@click.option(
    "--quiet", "-q",
    is_flag=True,
    help="静默模式，减少输出信息",
)
def check(input: Path, output: Path, config: Path = None, scene: str = None,
          format: str = "all", svg: bool = True, timestamp: bool = True,
          quiet: bool = False):
    """批量检测多边形碰撞"""
    if not quiet:
        click.echo(f"📁 加载多边形数据从: {input}")

    polygons = load_polygons_from_directory(input)

    if not polygons:
        click.echo("❌ 未找到任何多边形数据", err=True)
        sys.exit(1)

    if not quiet:
        click.echo(f"✅ 加载了 {len(polygons)} 个多边形")

    checker_config = CheckerConfig()
    if config and config.exists():
        checker_config = load_config_from_json(config)
        if not quiet:
            click.echo(f"⚙️  加载配置: {len(checker_config.layer_rules)} 层级规则, "
                       f"{len(checker_config.exception_pairs)} 例外对")

    detector = CollisionDetector()
    detector.layer_collision_matrix = checker_config.get_layer_collision_matrix()
    detector.exception_pairs = checker_config.get_exception_set(scene)

    for poly in polygons:
        if scene is None or poly.scene_id == scene:
            detector.add_polygon(poly)

    invalid_polys = detector.get_invalid_polygons()
    if invalid_polys and not quiet:
        click.echo(f"⚠️  发现 {len(invalid_polys)} 个无效多边形")
        for poly in invalid_polys[:5]:
            click.echo(f"   - {poly.id}: {'; '.join(poly.issues)}")
        if len(invalid_polys) > 5:
            click.echo(f"   ... 还有 {len(invalid_polys) - 5} 个")

    if not quiet:
        click.echo("🔍 开始碰撞检测...")

    if scene:
        collisions = detector.get_collisions_by_scene(scene)
    else:
        collisions = detector.check_all_collisions()

    actual_collisions = [c for c in collisions if c.is_colliding and not c.is_exception]
    exception_collisions = [c for c in collisions if c.is_colliding and c.is_exception]

    if not quiet:
        click.echo(f"📊 检测完成:")
        click.echo(f"   - 检查了 {len(collisions)} 对组合")
        click.echo(f"   - 发现 {len(actual_collisions)} 处碰撞")
        click.echo(f"   - {len(exception_collisions)} 处属于例外")

    output.mkdir(parents=True, exist_ok=True)

    ts = datetime.now().strftime("%Y%m%d_%H%M%S") if timestamp else ""
    ts_prefix = f"_{ts}" if ts else ""

    svg_paths = []
    if svg:
        svg_dir = output / f"svg{ts_prefix}"
        svg_paths = generate_scene_svgs(polygons, collisions, svg_dir)
        if not quiet:
            click.echo(f"🖼️  生成了 {len(svg_paths)} 个SVG图")

    exported_files = []

    if format in ["json", "all"]:
        json_name = f"report{ts_prefix}.json"
        json_path = ensure_unique_filepath(output, json_name)
        export_json_report(polygons, collisions, detector, json_path)
        exported_files.append(json_path)

    if format in ["csv", "all"]:
        csv_dir = output / f"csv{ts_prefix}"
        csv_files = export_csv_report(polygons, collisions, detector, csv_dir)
        exported_files.extend(csv_files)

    if format in ["html", "all"]:
        html_name = f"report{ts_prefix}.html"
        html_path = ensure_unique_filepath(output, html_name)
        export_html_report(polygons, collisions, detector, html_path, svg_paths)
        exported_files.append(html_path)

    if not quiet:
        click.echo(f"📄 导出了 {len(exported_files)} 个报告文件")
        click.echo(f"📍 输出目录: {output}")

    if actual_collisions:
        if not quiet:
            click.echo("\n🔴 碰撞详情:")
            for c in actual_collisions[:10]:
                click.echo(f"   - {c.polygon_a_id} ↔ {c.polygon_b_id} "
                           f"(面积: {c.overlap_area:.4f})")
            if len(actual_collisions) > 10:
                click.echo(f"   ... 还有 {len(actual_collisions) - 10} 处")
        sys.exit(2)
    elif invalid_polys:
        if not quiet:
            click.echo("\n⚠️  存在无效多边形，请检查输入数据")
        sys.exit(1)
    else:
        if not quiet:
            click.echo("\n✅ 未发现碰撞，所有多边形有效")
        sys.exit(0)


@main.command()
@click.option(
    "--output", "-o",
    type=click.Path(file_okay=True, dir_okay=False, path_type=Path),
    default="config.json",
    help="配置文件输出路径",
)
def init_config(output: Path):
    """生成示例配置文件"""
    config = CheckerConfig()

    config.add_layer_rule("player", "trigger", True)
    config.add_layer_rule("player", "obstacle", True)
    config.add_layer_rule("enemy", "obstacle", True)
    config.add_layer_rule("trigger", "obstacle", False)

    config.add_exception_pair("poly_1", "poly_2", "设计允许的重叠", "scene_01")
    config.add_exception_pair("door_a", "door_frame", "门与门框", "scene_02")

    output.parent.mkdir(parents=True, exist_ok=True)
    save_config_to_json(config, output)
    click.echo(f"✅ 示例配置已生成: {output}")


@main.command()
@click.option(
    "--output", "-o",
    type=click.Path(file_okay=False, dir_okay=True, path_type=Path),
    default="examples",
    help="示例数据输出目录",
)
def examples(output: Path):
    """生成示例多边形数据用于测试"""
    import json

    output.mkdir(parents=True, exist_ok=True)

    scene1_polygons = [
        {
            "id": "player_01",
            "vertices": [[0, 0], [20, 0], [20, 30], [0, 30]],
            "collision_layer": "player",
            "scale": 1.0,
            "scene_id": "scene_01",
            "exception_note": "",
        },
        {
            "id": "obstacle_01",
            "vertices": [[50, 10], [80, 10], [80, 40], [50, 40]],
            "collision_layer": "obstacle",
            "scale": 1.0,
            "scene_id": "scene_01",
            "exception_note": "",
        },
        {
            "id": "obstacle_02",
            "vertices": [[10, 40], [30, 40], [30, 60], [10, 60]],
            "collision_layer": "obstacle",
            "scale": 1.0,
            "scene_id": "scene_01",
            "exception_note": "",
        },
        {
            "id": "trigger_01",
            "vertices": [[15, 15], [25, 15], [25, 25], [15, 25]],
            "collision_layer": "trigger",
            "scale": 1.0,
            "scene_id": "scene_01",
            "exception_note": "",
        },
    ]

    scene2_polygons = [
        {
            "id": "enemy_01",
            "vertices": [[100, 0], [130, 0], [130, 30], [100, 30]],
            "collision_layer": "enemy",
            "scale": 1.0,
            "scene_id": "scene_02",
            "exception_note": "",
        },
        {
            "id": "self_intersect_01",
            "vertices": [[0, 0], [20, 20], [0, 20], [20, 0]],
            "collision_layer": "default",
            "scale": 1.0,
            "scene_id": "scene_02",
            "exception_note": "",
        },
    ]

    with open(output / "scene_01.json", "w", encoding="utf-8") as f:
        json.dump(scene1_polygons, f, indent=2, ensure_ascii=False)

    with open(output / "scene_02.json", "w", encoding="utf-8") as f:
        json.dump(scene2_polygons, f, indent=2, ensure_ascii=False)

    click.echo(f"✅ 示例数据已生成到: {output}")
    click.echo(f"   - scene_01.json (正常场景，含1处碰撞)")
    click.echo(f"   - scene_02.json (含自交多边形)")
    click.echo(f"\n运行检测: collision-checker check -i {output} -o results")


if __name__ == "__main__":
    main()

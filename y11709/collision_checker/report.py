from __future__ import annotations

import json
import csv
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any
from .geometry import Polygon
from .collision import CollisionResult, CollisionDetector
from .io import polygon_to_dict


def generate_summary(
    polygons: List[Polygon],
    collisions: List[CollisionResult],
    detector: CollisionDetector,
) -> Dict[str, Any]:
    total_polygons = len(polygons)
    invalid_polygons = [p for p in polygons if not p.is_valid]
    valid_polygons = [p for p in polygons if p.is_valid]

    actual_collisions = [c for c in collisions if c.is_colliding and not c.is_exception]
    exception_collisions = [c for c in collisions if c.is_colliding and c.is_exception]

    scenes = {}
    for poly in polygons:
        scene_id = poly.scene_id or "default"
        if scene_id not in scenes:
            scenes[scene_id] = {"polygons": 0, "collisions": 0, "exceptions": 0}
        scenes[scene_id]["polygons"] += 1

    for c in actual_collisions:
        poly_a = next((p for p in polygons if p.id == c.polygon_a_id), None)
        if poly_a:
            scene_id = poly_a.scene_id or "default"
            scenes[scene_id]["collisions"] += 1

    for c in exception_collisions:
        poly_a = next((p for p in polygons if p.id == c.polygon_a_id), None)
        if poly_a:
            scene_id = poly_a.scene_id or "default"
            scenes[scene_id]["exceptions"] += 1

    issues = []
    for poly in invalid_polygons:
        for issue in poly.issues:
            issues.append({"polygon_id": poly.id, "issue": issue, "source": poly.source_file})

    return {
        "timestamp": datetime.now().isoformat(),
        "total_polygons": total_polygons,
        "valid_polygons": len(valid_polygons),
        "invalid_polygons": len(invalid_polygons),
        "total_collision_pairs": len(actual_collisions),
        "exception_collision_pairs": len(exception_collisions),
        "total_pairs_checked": len(collisions),
        "issues": issues,
        "scenes": scenes,
    }


def export_json_report(
    polygons: List[Polygon],
    collisions: List[CollisionResult],
    detector: CollisionDetector,
    output_path: Path,
) -> Path:
    report = {
        "summary": generate_summary(polygons, collisions, detector),
        "polygons": [polygon_to_dict(p) for p in polygons],
        "collisions": [c.to_dict() for c in collisions],
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    return output_path


def export_csv_report(
    polygons: List[Polygon],
    collisions: List[CollisionResult],
    detector: CollisionDetector,
    output_dir: Path,
) -> List[Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    generated = []

    polygons_csv = output_dir / "polygons.csv"
    with open(polygons_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            "id", "collision_layer", "scale", "scene_id",
            "exception_note", "source_file", "is_valid", "issues"
        ])
        for poly in polygons:
            writer.writerow([
                poly.id,
                poly.collision_layer,
                poly.scale,
                poly.scene_id,
                poly.exception_note,
                poly.source_file,
                poly.is_valid,
                "; ".join(poly.issues),
            ])
    generated.append(polygons_csv)

    collisions_csv = output_dir / "collisions.csv"
    with open(collisions_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            "polygon_a_id", "polygon_b_id", "is_colliding",
            "overlap_area", "collision_depth", "is_exception", "exception_reason"
        ])
        for c in collisions:
            writer.writerow([
                c.polygon_a_id,
                c.polygon_b_id,
                c.is_colliding,
                round(c.overlap_area, 4),
                round(c.collision_depth, 4),
                c.is_exception,
                c.exception_reason,
            ])
    generated.append(collisions_csv)

    issues_csv = output_dir / "issues.csv"
    summary = generate_summary(polygons, collisions, detector)
    with open(issues_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["polygon_id", "issue", "source_file"])
        for issue in summary["issues"]:
            writer.writerow([
                issue["polygon_id"],
                issue["issue"],
                issue["source"],
            ])
    generated.append(issues_csv)

    return generated


def export_html_report(
    polygons: List[Polygon],
    collisions: List[CollisionResult],
    detector: CollisionDetector,
    output_path: Path,
    svg_paths: List[Path] = None,
) -> Path:
    svg_paths = svg_paths or []
    summary = generate_summary(polygons, collisions, detector)

    actual_collisions = [c for c in collisions if c.is_colliding and not c.is_exception]
    exception_collisions = [c for c in collisions if c.is_colliding and c.is_exception]
    invalid_polygons = [p for p in polygons if not p.is_valid]

    html_content = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>几何碰撞检测报告</title>
    <style>
        {{% raw %}}
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #1a1a2e; color: #e0e0e0; }}
        h1, h2, h3 {{ color: #4CAF50; }}
        .summary {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }}
        .card {{ background: #16213e; padding: 20px; border-radius: 8px; border-left: 4px solid #4CAF50; }}
        .card.warning {{ border-left-color: #FF9800; }}
        .card.danger {{ border-left-color: #F44336; }}
        .card-value {{ font-size: 2em; font-weight: bold; margin: 10px 0; }}
        table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
        th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #2a2a4a; }}
        th {{ background: #16213e; color: #4CAF50; }}
        tr:hover {{ background: #16213e; }}
        .collision {{ color: #F44336; }}
        .exception {{ color: #FFD700; }}
        .valid {{ color: #4CAF50; }}
        .invalid {{ color: #F44336; }}
        .scene-section {{ margin: 30px 0; padding: 20px; background: #16213e; border-radius: 8px; }}
        .svg-container {{ margin: 20px 0; text-align: center; }}
        svg {{ max-width: 100%; height: auto; }}
        .timestamp {{ color: #888; font-size: 0.9em; }}
        {{% endraw %}}
    </style>
</head>
<body>
    <h1>🎮 几何碰撞检测报告</h1>
    <p class="timestamp">生成时间: {summary['timestamp']}</p>

    <h2>📊 概览</h2>
    <div class="summary">
        <div class="card">
            <div>总多边形数</div>
            <div class="card-value">{summary['total_polygons']}</div>
        </div>
        <div class="card {'danger' if summary['invalid_polygons'] > 0 else ''}">
            <div>无效多边形</div>
            <div class="card-value {'invalid' if summary['invalid_polygons'] > 0 else ''}">{summary['invalid_polygons']}</div>
        </div>
        <div class="card {'danger' if summary['total_collision_pairs'] > 0 else ''}">
            <div>碰撞对数</div>
            <div class="card-value {'collision' if summary['total_collision_pairs'] > 0 else ''}">{summary['total_collision_pairs']}</div>
        </div>
        <div class="card warning">
            <div>例外碰撞</div>
            <div class="card-value exception">{summary['exception_collision_pairs']}</div>
        </div>
    </div>
"""

    if invalid_polygons:
        html_content += """
    <h2>⚠️ 问题列表</h2>
    <table>
        <tr><th>多边形ID</th><th>问题</th><th>来源文件</th></tr>
"""
        for poly in invalid_polygons:
            for issue in poly.issues:
                html_content += f"""
        <tr>
            <td class="invalid">{poly.id}</td>
            <td>{issue}</td>
            <td>{poly.source_file}</td>
        </tr>
"""
        html_content += "</table>"

    if actual_collisions:
        html_content += """
    <h2>🔴 碰撞列表</h2>
    <table>
        <tr><th>多边形A</th><th>多边形B</th><th>重叠面积</th><th>碰撞深度</th></tr>
"""
        for c in actual_collisions:
            html_content += f"""
        <tr>
            <td class="collision">{c.polygon_a_id}</td>
            <td class="collision">{c.polygon_b_id}</td>
            <td>{c.overlap_area:.4f}</td>
            <td>{c.collision_depth:.4f}</td>
        </tr>
"""
        html_content += "</table>"

    if exception_collisions:
        html_content += """
    <h2>🟡 例外碰撞列表</h2>
    <table>
        <tr><th>多边形A</th><th>多边形B</th><th>例外原因</th><th>重叠面积</th></tr>
"""
        for c in exception_collisions:
            html_content += f"""
        <tr>
            <td class="exception">{c.polygon_a_id}</td>
            <td class="exception">{c.polygon_b_id}</td>
            <td>{c.exception_reason}</td>
            <td>{c.overlap_area:.4f}</td>
        </tr>
"""
        html_content += "</table>"

    if svg_paths:
        html_content += """
    <h2>🖼️ 可视化</h2>
"""
        for svg_path in svg_paths:
            svg_name = svg_path.name
            try:
                with open(svg_path, "r", encoding="utf-8") as f:
                    svg_content = f.read()
                html_content += f"""
    <div class="scene-section">
        <h3>{svg_name}</h3>
        <div class="svg-container">
            {svg_content}
        </div>
    </div>
"""
            except Exception:
                pass

    html_content += """
</body>
</html>
"""

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    return output_path

from __future__ import annotations

import svgwrite
from pathlib import Path
from typing import List, Dict, Tuple
from .geometry import Polygon, Point
from .collision import CollisionResult


LAYER_COLORS = {
    "default": "#4CAF50",
    "player": "#2196F3",
    "enemy": "#F44336",
    "obstacle": "#FF9800",
    "trigger": "#9C27B0",
    "ground": "#795548",
}


def get_layer_color(layer: str) -> str:
    return LAYER_COLORS.get(layer, "#607D8B")


def calculate_bounds(polygons: List[Polygon], padding: float = 50.0) -> Tuple[float, float, float, float]:
    if not polygons:
        return (0, 0, 100, 100)

    all_bounds = [p.get_bounds() for p in polygons]
    min_x = min(b[0] for b in all_bounds)
    min_y = min(b[1] for b in all_bounds)
    max_x = max(b[2] for b in all_bounds)
    max_y = max(b[3] for b in all_bounds)

    return (
        min_x - padding,
        min_y - padding,
        max_x + padding,
        max_y + padding,
    )


def generate_collision_svg(
    polygons: List[Polygon],
    collisions: List[CollisionResult],
    output_path: Path,
    title: str = "Collision Detection Result",
) -> Path:
    min_x, min_y, max_x, max_y = calculate_bounds(polygons)
    width = max_x - min_x
    height = max_y - min_y

    scale = 1.0
    max_dim = 1000
    if width > max_dim or height > max_dim:
        scale = max_dim / max(width, height)

    view_width = width * scale
    view_height = height * scale

    dwg = svgwrite.Drawing(
        str(output_path),
        size=(view_width, view_height),
        profile="tiny",
    )

    dwg.add(dwg.rect(insert=(0, 0), size=(view_width, view_height), fill="#1a1a2e"))

    def transform_point(p: Point) -> Tuple[float, float]:
        x = (p.x - min_x) * scale
        y = (max_y - p.y) * scale
        return (x, y)

    collision_pairs = set()
    collision_ids = set()
    for c in collisions:
        if c.is_colliding and not c.is_exception:
            pair = tuple(sorted([c.polygon_a_id, c.polygon_b_id]))
            collision_pairs.add(pair)
            collision_ids.add(c.polygon_a_id)
            collision_ids.add(c.polygon_b_id)

    exception_pairs = set()
    for c in collisions:
        if c.is_colliding and c.is_exception:
            pair = tuple(sorted([c.polygon_a_id, c.polygon_b_id]))
            exception_pairs.add(pair)

    poly_by_id = {p.id: p for p in polygons}

    for poly in polygons:
        points = [transform_point(v) for v in poly.get_scaled_vertices()]
        color = get_layer_color(poly.collision_layer)

        is_colliding = poly.id in collision_ids
        is_exception = any(
            poly.id in pair for pair in exception_pairs
        )

        fill_opacity = 0.3 if is_colliding else 0.5
        stroke_width = 3 if is_colliding else 1
        stroke_color = "#FF0000" if (is_colliding and not is_exception) else color

        if is_exception:
            stroke_color = "#FFD700"

        dwg.add(
            dwg.polygon(
                points=points,
                fill=color,
                fill_opacity=fill_opacity,
                stroke=stroke_color,
                stroke_width=stroke_width,
            )
        )

        center = transform_point(poly._get_center())
        text_center = (center[0], center[1] + 4)
        dwg.add(
            dwg.text(
                poly.id,
                insert=text_center,
                fill="#ffffff",
                font_size="12px",
                text_anchor="middle",
            )
        )

    y_offset = 30
    for layer, color in LAYER_COLORS.items():
        has_polys = any(p.collision_layer == layer for p in polygons)
        if has_polys:
            dwg.add(
                dwg.rect(
                    insert=(10, y_offset - 10),
                    size=(15, 15),
                    fill=color,
                    fill_opacity=0.5,
                    stroke=color,
                )
            )
            dwg.add(
                dwg.text(
                    layer,
                    insert=(30, y_offset + 2),
                    fill="#ffffff",
                    font_size="12px",
                )
            )
            y_offset += 25

    dwg.add(
        dwg.rect(
            insert=(10, y_offset - 10),
            size=(15, 15),
            fill="none",
            stroke="#FF0000",
            stroke_width=2,
        )
    )
    dwg.add(
        dwg.text(
            "碰撞",
            insert=(30, y_offset + 2),
            fill="#ffffff",
            font_size="12px",
        )
    )
    y_offset += 25

    dwg.add(
        dwg.rect(
            insert=(10, y_offset - 10),
            size=(15, 15),
            fill="none",
            stroke="#FFD700",
            stroke_width=2,
        )
    )
    dwg.add(
        dwg.text(
            "例外",
            insert=(30, y_offset + 2),
            fill="#ffffff",
            font_size="12px",
        )
    )

    dwg.save()
    return output_path


def generate_scene_svgs(
    polygons: List[Polygon],
    collisions: List[CollisionResult],
    output_dir: Path,
) -> List[Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    generated = []

    scenes = {}
    for poly in polygons:
        scene_id = poly.scene_id or "default"
        if scene_id not in scenes:
            scenes[scene_id] = []
        scenes[scene_id].append(poly)

    for scene_id, scene_polys in scenes.items():
        scene_collisions = [
            c
            for c in collisions
            if c.polygon_a_id in [p.id for p in scene_polys]
            and c.polygon_b_id in [p.id for p in scene_polys]
        ]

        filename = f"scene_{scene_id}_collisions.svg"
        filepath = output_dir / filename
        generate_collision_svg(scene_polys, scene_collisions, filepath, f"Scene {scene_id}")
        generated.append(filepath)

    return generated

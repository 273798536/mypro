from __future__ import annotations

import json
import csv
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime
from .geometry import Polygon, parse_polygon


def load_polygons_from_json(filepath: Path) -> List[Polygon]:
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    polygons = []
    source_name = filepath.name

    if isinstance(data, list):
        for item in data:
            poly = parse_polygon(item, source_name)
            polygons.append(poly)
    elif isinstance(data, dict) and "polygons" in data:
        for item in data["polygons"]:
            poly = parse_polygon(item, source_name)
            polygons.append(poly)

    return polygons


def load_polygons_from_csv(filepath: Path) -> List[Polygon]:
    polygons = []
    source_name = filepath.name

    with open(filepath, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            vertices_str = row.get("vertices", "[]")
            try:
                vertices = json.loads(vertices_str)
            except json.JSONDecodeError:
                vertices = []

            data = {
                "id": row.get("id", ""),
                "vertices": vertices,
                "collision_layer": row.get("collision_layer", "default"),
                "scale": float(row.get("scale", 1.0)),
                "scene_id": row.get("scene_id", ""),
                "exception_note": row.get("exception_note", ""),
            }
            poly = parse_polygon(data, source_name)
            polygons.append(poly)

    return polygons


def load_polygons_from_directory(directory: Path) -> List[Polygon]:
    polygons = []

    for filepath in directory.rglob("*.json"):
        try:
            polys = load_polygons_from_json(filepath)
            polygons.extend(polys)
        except Exception as e:
            print(f"警告: 无法加载 {filepath}: {e}")

    for filepath in directory.rglob("*.csv"):
        try:
            polys = load_polygons_from_csv(filepath)
            polygons.extend(polys)
        except Exception as e:
            print(f"警告: 无法加载 {filepath}: {e}")

    return polygons


def get_output_filename(base_name: str, extension: str, timestamp: bool = True) -> str:
    if timestamp:
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"{base_name}_{ts}.{extension}"
    return f"{base_name}.{extension}"


def ensure_unique_filepath(directory: Path, filename: str) -> Path:
    directory.mkdir(parents=True, exist_ok=True)
    filepath = directory / filename

    counter = 1
    while filepath.exists():
        stem = filepath.stem
        suffix = filepath.suffix
        filepath = directory / f"{stem}_{counter}{suffix}"
        counter += 1

    return filepath


def polygon_to_dict(polygon: Polygon) -> Dict[str, Any]:
    return {
        "id": polygon.id,
        "vertices": [[v.x, v.y] for v in polygon.vertices],
        "collision_layer": polygon.collision_layer,
        "scale": polygon.scale,
        "scene_id": polygon.scene_id,
        "exception_note": polygon.exception_note,
        "source_file": polygon.source_file,
        "issues": polygon.issues,
        "is_valid": polygon.is_valid,
    }

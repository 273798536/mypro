from typing import List, Tuple, Dict
from shapely.geometry import Polygon
from shapely.ops import unary_union
import uuid

from .models import (
    LandParcel, DedupResult, ConclusionTrace,
    SourceReference, DataSource, ActionItem
)


def parcel_to_polygon(parcel: LandParcel) -> Polygon:
    coords = [(p.x, p.y) for p in parcel.boundary]
    if coords[0] != coords[-1]:
        coords.append(coords[0])
    return Polygon(coords)


def calculate_overlap(
    poly1: Polygon,
    poly2: Polygon
) -> Tuple[float, Polygon]:
    if not poly1.intersects(poly2):
        return 0.0, None
    intersection = poly1.intersection(poly2)
    return intersection.area, intersection


def detect_and_resolve_overlaps(
    parcels: List[LandParcel],
    apply_dedup: bool = True
) -> Tuple[List[LandParcel], List[DedupResult], List[ActionItem]]:
    polygons = {}
    for parcel in parcels:
        polygons[parcel.parcel_id] = parcel_to_polygon(parcel)

    dedup_results = []
    action_items = []
    processed_parcels = {p.parcel_id: p.model_copy() for p in parcels}

    overlap_map: Dict[str, List[Tuple[str, float, Polygon]]] = {}

    parcel_ids = list(polygons.keys())
    for i in range(len(parcel_ids)):
        for j in range(i + 1, len(parcel_ids)):
            id1 = parcel_ids[i]
            id2 = parcel_ids[j]
            p1 = polygons[id1]
            p2 = polygons[id2]

            overlap_area, _ = calculate_overlap(p1, p2)
            if overlap_area > 0.01:
                if id1 not in overlap_map:
                    overlap_map[id1] = []
                if id2 not in overlap_map:
                    overlap_map[id2] = []
                overlap_map[id1].append((id2, overlap_area, None))
                overlap_map[id2].append((id1, overlap_area, None))

    for parcel_id, overlaps in overlap_map.items():
        parcel = processed_parcels[parcel_id]
        original_area = parcel.area
        total_overlap = sum(o[1] for o in overlaps)
        overlapping_with = [o[0] for o in overlaps]

        parcel.is_overlapping = True
        parcel.overlapping_with = overlapping_with
        parcel.overlapping_area = total_overlap

        dedup_area = original_area - total_overlap
        if dedup_area < 0:
            dedup_area = 0

        trace = ConclusionTrace(
            conclusion_id=f"dedup_{parcel_id}",
            conclusion=f"图斑{parcel.parcel_id}存在重叠，原始面积{original_area:.2f}亩，重叠面积{total_overlap:.2f}亩，去重后面积{dedup_area:.2f}亩",
            value=dedup_area,
            sources=[parcel.source_ref],
            calculation_steps=[
                f"检测到与{len(overlapping_with)}个图斑重叠: {', '.join(overlapping_with)}",
                f"重叠总面积: {total_overlap:.2f}亩",
                f"计算公式: {original_area:.2f} - {total_overlap:.2f} = {dedup_area:.2f}亩"
            ]
        )

        for other_id, overlap_area, _ in overlaps:
            other_parcel = processed_parcels[other_id]
            other_ref = SourceReference(
                source=DataSource.SATELLITE_POLYGON,
                file_path=other_parcel.file_path,
                field=f"parcels.{other_id}",
                raw_value=f"图斑{other_id}，面积{other_parcel.area:.2f}亩"
            )
            trace.add_source(other_ref)
            trace.add_step(f"与图斑{other_id}({other_parcel.farmer_name})重叠{overlap_area:.2f}亩")

        dedup_result = DedupResult(
            original_parcel_id=parcel_id,
            farmer_name=parcel.farmer_name,
            original_area=original_area,
            overlapping_area=total_overlap,
            deduplicated_area=dedup_area,
            overlapping_with=overlapping_with,
            applied=apply_dedup,
            trace=trace
        )
        dedup_results.append(dedup_result)

        action = ActionItem(
            action_id=f"action_dedup_{parcel_id}",
            type="图斑重叠核实",
            description=f"{parcel.farmer_name}的图斑{parcel_id}与{len(overlapping_with)}个图斑重叠({', '.join(overlapping_with)})，重叠面积{total_overlap:.2f}亩，需现场核实确认权属",
            responsible_person="村主任/驻村干部",
            contact="联系村两委核实地块边界",
            file_to_modify=parcel.file_path,
            field_to_fix=f"parcels.{parcel_id}.boundary 或 parcels.{parcel_id}.area",
            priority="高",
            status="待处理",
            related_conclusion=trace.conclusion_id
        )
        action_items.append(action)

    updated_parcels = list(processed_parcels.values())
    return updated_parcels, dedup_results, action_items


def apply_dedup_to_area(
    parcels: List[LandParcel],
    dedup_results: List[DedupResult]
) -> List[LandParcel]:
    dedup_map = {r.original_parcel_id: r for r in dedup_results}
    updated = []
    for parcel in parcels:
        if parcel.parcel_id in dedup_map:
            result = dedup_map[parcel.parcel_id]
            if result.applied:
                new_parcel = parcel.model_copy()
                new_parcel.area = result.deduplicated_area
                updated.append(new_parcel)
            else:
                updated.append(parcel)
        else:
            updated.append(parcel)
    return updated

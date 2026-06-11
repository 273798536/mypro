from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List
from enum import Enum


class MaterialStatus(str, Enum):
    NORMAL = "normal"
    ANOMALY = "anomaly"
    BOUNDARY = "boundary"
    SUPPLEMENT = "supplement"


class ViewAngle(str, Enum):
    PROFILE_SIDE = "profile_side"
    PROFILE_CROSS = "profile_cross"
    CLOSE_UP = "close_up"
    TOP_DOWN = "top_down"


@dataclass
class FilterCondition:
    section_range: str
    sensor_type: str
    anomaly_level_min: int
    anomaly_level_max: int
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    raw_query: str = ""

    def fingerprint(self) -> str:
        parts = [
            self.section_range,
            self.sensor_type,
            f"L{self.anomaly_level_min}-{self.anomaly_level_max}",
            self.date_from or "",
            self.date_to or "",
        ]
        return "|".join(parts)


@dataclass
class ViewSnapshot:
    angle: ViewAngle
    zoom_level: float
    pan_offset_x: int
    pan_offset_y: int
    highlighted_objects: List[str] = field(default_factory=list)
    filter_fp: str = ""

    def tag(self) -> str:
        return f"[{self.angle.value}|z{self.zoom_level}|{self.filter_fp[:8]}]"


@dataclass
class AnomalyQueueItem:
    object_id: str
    object_name: str
    level: int
    first_seen: datetime
    last_seen: datetime
    related_material_ids: List[str] = field(default_factory=list)


@dataclass
class SceneAnnotation:
    text: str
    anchor_points: List[tuple] = field(default_factory=list)


@dataclass
class SideNote:
    order: int
    content: str


@dataclass
class Material:
    material_id: str
    topic: str = "桥隧检修平台剖面讲解"
    status: MaterialStatus = MaterialStatus.NORMAL
    sensor_record_id: str = ""
    capture_time: datetime = field(default_factory=datetime.now)
    filter_condition: FilterCondition = field(default_factory=FilterCondition)
    view_snapshot: Optional[ViewSnapshot] = None
    scene_annotation: Optional[SceneAnnotation] = None
    side_notes: List[SideNote] = field(default_factory=list)
    anomaly_refs: List[str] = field(default_factory=list)
    is_screenshot: bool = False
    export_markers: List[str] = field(default_factory=list)
    boundary_note: str = ""
    supplement_note: str = ""

    def detail_marker(self) -> str:
        fp = self.filter_condition.fingerprint()
        vt = self.view_snapshot.tag() if self.view_snapshot else "[NOVIEW]"
        st = f"[{self.status.value}]"
        return f"{st}{vt}|F{fp[:12]}"

    def export_stamp(self, step: str) -> str:
        stamp = f"[{self.topic}][{step}][{self.material_id}]{self.detail_marker()}"
        self.export_markers.append(stamp)
        return stamp

    def consistent_triplet(self) -> dict:
        base = self.detail_marker()
        scene_body = self.scene_annotation.text.split(" ", 1)[1] if (self.scene_annotation and " " in self.scene_annotation.text) else (self.scene_annotation.text if self.scene_annotation else "未标注")
        side_parts = []
        for n in self.side_notes:
            body = n.content.split(" ", 1)[1] if " " in n.content else n.content
            side_parts.append(f"[{n.order}]{body[:15]}")
        anomaly_body = ",".join(self.anomaly_refs) if self.anomaly_refs else "无"
        return {
            "scene": f"{base} 场景:{scene_body[:20]}",
            "side": (f"{base} 侧边:" + " | ".join(side_parts)) if side_parts else f"{base} 侧边:待补充",
            "anomaly": f"{base} 异常对象:{anomaly_body}",
        }

    def handover_checklist(self) -> List[str]:
        items = []
        if self.status == MaterialStatus.ANOMALY:
            items.append("★ 异常对象：" + ",".join(self.anomaly_refs))
        if self.view_snapshot and self.view_snapshot.filter_fp:
            items.append("★ 视图筛选关联：已绑定")
        else:
            items.append("⚠  视图未绑定筛选条件")
        items.append("● 放样例：sensor_record=" + (self.sensor_record_id or "缺"))
        items.append("● 重跑：filter_fp=" + self.filter_condition.fingerprint()[:16])
        items.append("● 异常队列：" + (",".join(self.anomaly_refs) or "无"))
        return items

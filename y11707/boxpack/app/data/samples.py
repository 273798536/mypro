from __future__ import annotations

from app.schemas.models import SKU, OrderLine, BoxType, PackingConstraints, RecommendRequest


def normal_sample() -> RecommendRequest:
    catalog = [
        SKU(
            sku_id="S1", name="书本",
            length=20, width=15, height=3, weight=0.5,
            fragile=False, rotation_allowed=True,
            source="pim.manual", note="普通商品",
        ),
        SKU(
            sku_id="S2", name="陶瓷杯",
            length=10, width=10, height=12, weight=0.4,
            fragile=True, bearing_capacity_kg=0.5, rotation_allowed=True,
            source="pim.fragile", note="易碎，上方堆重不得超过 0.5kg",
        ),
    ]
    boxes = [
        BoxType(box_id="B1", name="小号", length=25, width=20, height=15, max_weight=3, cost=1.0, source="boxlib.v1"),
        BoxType(box_id="B2", name="中号", length=35, width=25, height=20, max_weight=5, cost=1.8, source="boxlib.v1"),
        BoxType(box_id="B3", name="大号", length=45, width=35, height=30, max_weight=10, cost=2.6, source="boxlib.v1"),
    ]
    return RecommendRequest(
        order_id="DEMO_NORMAL",
        lines=[OrderLine(sku_id="S1", qty=3, source="order.o1"), OrderLine(sku_id="S2", qty=2, source="order.o1")],
        catalog=catalog,
        boxes=boxes,
        constraints=PackingConstraints(split_penalty=0.6, time_limit_sec=8),
    )


def boundary_sample() -> RecommendRequest:
    catalog = [
        SKU(
            sku_id="S3", name="大画板",
            length=60, width=40, height=2, weight=1.2,
            fragile=False, rotation_allowed=False,
            source="pim.boundary", note="不允许旋转，需要大箱",
        ),
        SKU(
            sku_id="S4", name="精密仪器",
            length=30, width=20, height=15, weight=4.5,
            fragile=True, bearing_capacity_kg=0.1, rotation_allowed=True,
            source="pim.fragile", note="承重极弱，基本只能单装",
        ),
    ]
    boxes = [
        BoxType(box_id="B4", name="大号", length=45, width=35, height=30, max_weight=8, cost=3.0, source="boxlib.v1"),
        BoxType(box_id="B5", name="超大", length=70, width=50, height=40, max_weight=15, cost=4.5, source="boxlib.v1"),
    ]
    return RecommendRequest(
        order_id="DEMO_BOUNDARY",
        lines=[OrderLine(sku_id="S3", qty=1, source="order.o2"), OrderLine(sku_id="S4", qty=1, source="order.o2")],
        catalog=catalog,
        boxes=boxes,
        constraints=PackingConstraints(split_penalty=0.8, time_limit_sec=8),
    )


def bad_data_sample() -> RecommendRequest:
    catalog = [
        SKU(
            sku_id="S_BAD", name="巨型物品",
            length=200, width=100, height=80, weight=50,
            fragile=False, rotation_allowed=True,
            source="pim.bad", note="尺寸明显超出现有箱型库",
        ),
    ]
    boxes = [
        BoxType(box_id="B1", name="小号", length=25, width=20, height=15, max_weight=3, cost=1.0, source="boxlib.v1"),
    ]
    return RecommendRequest(
        order_id="DEMO_BAD",
        lines=[OrderLine(sku_id="S_BAD", qty=1, source="order.o3")],
        catalog=catalog,
        boxes=boxes,
        constraints=PackingConstraints(),
    )

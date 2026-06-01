from datetime import datetime
from models import PreOrder, VersionItem, SleeveInventory, OrderStatus


def create_sample_pre_orders():
    return [
        PreOrder(
            order_id="PO001",
            customer_name="张三",
            album_name="星辰大海",
            version="A版",
            quantity=2,
            is_signed=True,
            order_date=datetime(2024, 1, 15),
            status=OrderStatus.PENDING
        ),
        PreOrder(
            order_id="PO002",
            customer_name="李四",
            album_name="星辰大海",
            version="A版",
            quantity=1,
            is_signed=False,
            order_date=datetime(2024, 1, 16),
            status=OrderStatus.PENDING
        ),
        PreOrder(
            order_id="PO003",
            customer_name="王五",
            album_name="星辰大海",
            version="B版",
            quantity=3,
            is_signed=True,
            order_date=datetime(2024, 1, 17),
            status=OrderStatus.PENDING
        ),
        PreOrder(
            order_id="PO004",
            customer_name="赵六",
            album_name="月光之城",
            version="豪华版",
            quantity=1,
            is_signed=True,
            order_date=datetime(2024, 1, 18),
            status=OrderStatus.PENDING
        ),
        PreOrder(
            order_id="PO005",
            customer_name="孙七",
            album_name="月光之城",
            version="普通版",
            quantity=2,
            is_signed=False,
            order_date=datetime(2024, 1, 19),
            status=OrderStatus.PENDING
        ),
        PreOrder(
            order_id="PO006",
            customer_name="周八",
            album_name="夏日回忆",
            version="限定版",
            quantity=1,
            is_signed=True,
            order_date=datetime(2024, 1, 20),
            status=OrderStatus.PENDING
        )
    ]


def create_sample_version_list():
    return [
        VersionItem(
            album_name="星辰大海",
            version="A版",
            is_signed=True,
            pressing_quantity=2,
            pressing_date=datetime(2024, 1, 10),
            expected_arrival=datetime(2024, 1, 25),
            remarks="首批签名版"
        ),
        VersionItem(
            album_name="星辰大海",
            version="A版",
            is_signed=False,
            pressing_quantity=5,
            pressing_date=datetime(2024, 1, 10),
            expected_arrival=datetime(2024, 1, 25),
            remarks="普通版"
        ),
        VersionItem(
            album_name="星辰大海",
            version="B版",
            is_signed=True,
            pressing_quantity=1,
            pressing_date=datetime(2024, 1, 12),
            expected_arrival=datetime(2024, 1, 28),
            remarks="签名版缺货中"
        ),
        VersionItem(
            album_name="月光之城",
            version="豪华版",
            is_signed=True,
            pressing_quantity=5,
            pressing_date=datetime(2024, 1, 8),
            expected_arrival=datetime(2024, 1, 22),
            remarks=""
        ),
        VersionItem(
            album_name="月光之城",
            version="普通版",
            is_signed=False,
            pressing_quantity=10,
            pressing_date=datetime(2024, 1, 8),
            expected_arrival=datetime(2024, 1, 22),
            remarks=""
        )
    ]


def create_sample_sleeve_inventory():
    return [
        SleeveInventory(
            album_name="星辰大海",
            version="A版",
            quantity=10,
            location="A区-01",
            last_updated=datetime(2024, 1, 20)
        ),
        SleeveInventory(
            album_name="星辰大海",
            version="B版",
            quantity=5,
            location="A区-02",
            last_updated=datetime(2024, 1, 20)
        ),
        SleeveInventory(
            album_name="月光之城",
            version="豪华版",
            quantity=8,
            location="B区-01",
            last_updated=datetime(2024, 1, 20)
        ),
        SleeveInventory(
            album_name="月光之城",
            version="普通版",
            quantity=15,
            location="B区-02",
            last_updated=datetime(2024, 1, 20)
        )
    ]


def create_modified_version_list():
    versions = create_sample_version_list()
    for v in versions:
        if v.album_name == "星辰大海" and v.version == "B版" and v.is_signed:
            v.pressing_quantity = 5
            v.remarks = "补货完成"
    versions.append(
        VersionItem(
            album_name="夏日回忆",
            version="限定版",
            is_signed=True,
            pressing_quantity=3,
            pressing_date=datetime(2024, 1, 15),
            expected_arrival=datetime(2024, 1, 30),
            remarks="新增版本"
        )
    )
    return versions

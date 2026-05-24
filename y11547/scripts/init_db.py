import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine, Base
from app.models import Material

def init_database():
    print("=" * 60)
    print("正在初始化数据库...")
    print("=" * 60)

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    print("✓ 数据库表创建完成")

    from sqlalchemy.orm import Session
    db = Session(bind=engine)

    materials = [
        Material(material_code="MAT001", name="易拉宝", specification="80x200cm", unit="个", unit_price=150.0, category="展示器材"),
        Material(material_code="MAT002", name="展架", specification="60x160cm", unit="个", unit_price=80.0, category="展示器材"),
        Material(material_code="MAT003", name="宣传册", specification="A4铜版纸", unit="本", unit_price=5.0, category="印刷品"),
        Material(material_code="MAT004", name="名片", specification="90x54mm", unit="盒", unit_price=25.0, category="印刷品"),
        Material(material_code="MAT005", name="LED显示屏", specification="55寸", unit="台", unit_price=3500.0, category="电子设备"),
        Material(material_code="MAT006", name="投影仪", specification="1080P", unit="台", unit_price=2800.0, category="电子设备"),
        Material(material_code="MAT007", name="接待台", specification="120x60x110cm", unit="个", unit_price=580.0, category="家具"),
        Material(material_code="MAT008", name="洽谈桌椅", specification="一桌四椅", unit="套", unit_price=1200.0, category="家具"),
    ]

    db.add_all(materials)
    db.commit()
    db.close()

    print(f"✓ 已导入 {len(materials)} 条物料主数据")
    print("=" * 60)
    print("数据库初始化完成!")
    print("=" * 60)

if __name__ == "__main__":
    init_database()

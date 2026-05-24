#!/usr/bin/env python3
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import get_db, engine, Base
from app.auth import create_default_users

Base.metadata.create_all(bind=engine)
from app.services import generate_no
from app import models
from app.enums import ReturnApplicationStatus, DisputeCategory
from datetime import datetime, timedelta


def init_sample_data():
    db = next(get_db())
    create_default_users(db)

    admin_user = db.query(models.User).filter(models.User.username == "admin").first()
    procurement_user = db.query(models.User).filter(models.User.username == "procurement").first()

    sample_applications = [
        {
            "supplier_id": "SUP001",
            "supplier_name": "供应商A有限公司",
            "warehouse_id": "WH001",
            "description": "2024年Q1季度退货",
            "items": [
                {"sku_code": "SKU001", "sku_name": "商品A", "batch_no": "B20240101", "quantity": 100, "unit_price": 50.0, "amount": 5000.0},
                {"sku_code": "SKU002", "sku_name": "商品B", "batch_no": "B20240102", "quantity": 50, "unit_price": 80.0, "amount": 4000.0},
            ],
        },
        {
            "supplier_id": "SUP002",
            "supplier_name": "供应商B贸易公司",
            "warehouse_id": "WH001",
            "description": "临期商品退货",
            "items": [
                {"sku_code": "SKU003", "sku_name": "商品C", "batch_no": "B20240201", "quantity": 200, "unit_price": 30.0, "amount": 6000.0},
            ],
        },
        {
            "supplier_id": "SUP003",
            "supplier_name": "供应商C科技",
            "warehouse_id": "WH002",
            "description": "质量问题退货",
            "status": ReturnApplicationStatus.SUPPLIER_PARTIAL,
            "items": [
                {"sku_code": "SKU004", "sku_name": "商品D", "batch_no": "B20240301", "quantity": 30, "unit_price": 200.0, "amount": 6000.0,
                 "disputed_qty": 10, "supplier_accepted_qty": 20, "supplier_rejected_qty": 10,
                 "dispute_category": DisputeCategory.QUALITY_MISMATCH, "dispute_reason": "质量标准不符"},
            ],
        },
    ]

    for app_data in sample_applications:
        existing = db.query(models.ReturnApplication).filter(
            models.ReturnApplication.supplier_id == app_data["supplier_id"]
        ).first()
        if existing:
            continue

        total_items = len(app_data["items"])
        total_amount = sum(item["amount"] for item in app_data["items"])

        application = models.ReturnApplication(
            application_no=generate_no("RA"),
            supplier_id=app_data["supplier_id"],
            supplier_name=app_data["supplier_name"],
            warehouse_id=app_data["warehouse_id"],
            description=app_data["description"],
            total_items=total_items,
            total_amount=total_amount,
            status=app_data.get("status", ReturnApplicationStatus.SUBMITTED),
            created_by=admin_user.id,
        )

        for item_data in app_data["items"]:
            item = models.ReturnItem(
                sku_code=item_data["sku_code"],
                sku_name=item_data["sku_name"],
                batch_no=item_data["batch_no"],
                quantity=item_data["quantity"],
                unit_price=item_data["unit_price"],
                amount=item_data["amount"],
                supplier_accepted_qty=item_data.get("supplier_accepted_qty", 0),
                supplier_rejected_qty=item_data.get("supplier_rejected_qty", 0),
                disputed_qty=item_data.get("disputed_qty", 0),
                dispute_category=item_data.get("dispute_category"),
                dispute_reason=item_data.get("dispute_reason"),
            )
            application.items.append(item)

        db.add(application)

    db.commit()
    print("示例数据初始化完成！")


if __name__ == "__main__":
    init_sample_data()

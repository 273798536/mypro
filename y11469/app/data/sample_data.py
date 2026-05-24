from datetime import datetime

SAMPLE_STYLE_CODE = "STYLE-2024-S001"

SAMPLE_TRANSFERS = [
    {
        "transfer_no": "TRF-2024-001",
        "style_code": SAMPLE_STYLE_CODE,
        "version": 1,
        "transfer_type": "打版→样衣",
        "from_department": "打版部",
        "to_department": "样衣部",
        "from_person": "张打版",
        "to_person": "李样衣",
        "sample_count": 3,
        "transfer_date": "2024-01-15T09:00:00",
        "received_date": "2024-01-15T14:00:00",
        "is_obsolete": False,
        "status": "完成",
        "remarks": "初版样衣"
    },
    {
        "transfer_no": "TRF-2024-002",
        "style_code": SAMPLE_STYLE_CODE,
        "version": 2,
        "transfer_type": "设计→打版",
        "from_department": "设计部",
        "to_department": "打版部",
        "from_person": "王设计",
        "to_person": "张打版",
        "sample_count": 1,
        "transfer_date": "2024-01-20T10:00:00",
        "received_date": "2024-01-20T11:30:00",
        "is_obsolete": False,
        "status": "完成",
        "remarks": "修改版设计稿"
    }
]

SAMPLE_SIZE_MODIFICATIONS = [
    {
        "modification_no": "MOD-2024-001",
        "style_code": SAMPLE_STYLE_CODE,
        "version": 1,
        "size_type": "M",
        "original_specs": {"chest": 100, "waist": 80, "length": 70},
        "modified_specs": {"chest": 102, "waist": 82, "length": 70},
        "modification_reason": "胸围腰围各放宽2cm",
        "designer": "王设计",
        "pattern_maker": "张打版",
        "modified_date": "2024-01-18T15:00:00",
        "requires_new_fabric": False,
        "is_approved": True,
        "remarks": "客户反馈偏紧"
    },
    {
        "modification_no": "MOD-2024-002",
        "style_code": SAMPLE_STYLE_CODE,
        "version": 2,
        "size_type": "L",
        "original_specs": {"chest": 108, "waist": 88, "length": 72},
        "modified_specs": {"chest": 110, "waist": 90, "length": 75},
        "modification_reason": "版型调整，需要重新裁剪",
        "designer": "王设计",
        "pattern_maker": "张打版",
        "modified_date": "2024-01-22T14:00:00",
        "requires_new_fabric": True,
        "old_fabric_disposition": "退回仓库",
        "is_approved": True,
        "remarks": "重大改版"
    }
]

SAMPLE_FABRIC_INVENTORY = [
    {
        "inventory_no": "FAB-2024-001",
        "style_code": SAMPLE_STYLE_CODE,
        "version": 1,
        "fabric_code": "FAB-C001",
        "fabric_name": "纯棉斜纹布",
        "fabric_batch": "BATCH-2024-001",
        "color": "藏青色",
        "operation_type": "入库",
        "quantity": 50.0,
        "unit": "米",
        "operation_date": "2024-01-10T08:30:00",
        "operator": "陈仓管",
        "is_old_version": False,
        "remarks": "初版面料入库"
    },
    {
        "inventory_no": "FAB-2024-002",
        "style_code": SAMPLE_STYLE_CODE,
        "version": 1,
        "fabric_code": "FAB-C001",
        "fabric_name": "纯棉斜纹布",
        "fabric_batch": "BATCH-2024-001",
        "color": "藏青色",
        "operation_type": "出库",
        "quantity": 15.0,
        "unit": "米",
        "operation_date": "2024-01-12T09:15:00",
        "operator": "陈仓管",
        "receiver": "李样衣",
        "receiver_role": "sample_maker",
        "is_old_version": False,
        "remarks": "样衣制作领用"
    },
    {
        "inventory_no": "FAB-2024-003",
        "style_code": SAMPLE_STYLE_CODE,
        "version": 2,
        "fabric_code": "FAB-C001",
        "fabric_name": "纯棉斜纹布",
        "fabric_batch": "BATCH-2024-001",
        "color": "藏青色",
        "operation_type": "出库",
        "quantity": 10.0,
        "unit": "米",
        "operation_date": "2024-01-23T10:00:00",
        "operator": "陈仓管",
        "receiver": "李样衣",
        "receiver_role": "sample_maker",
        "is_old_version": False,
        "old_version_note": "应该用新版面料，但领用了旧版",
        "remarks": "改版后样衣制作（问题记录）"
    },
    {
        "inventory_no": "FAB-2024-004",
        "style_code": SAMPLE_STYLE_CODE,
        "version": 2,
        "fabric_code": "FAB-C002",
        "fabric_name": "高支棉府绸",
        "fabric_batch": "BATCH-2024-005",
        "color": "藏青色",
        "operation_type": "入库",
        "quantity": 30.0,
        "unit": "米",
        "operation_date": "2024-01-22T16:00:00",
        "operator": "陈仓管",
        "is_old_version": False,
        "remarks": "新版面料入库"
    }
]

SAMPLE_MANUAL_PRICINGS = [
    {
        "pricing_no": "PRC-2024-001",
        "style_code": SAMPLE_STYLE_CODE,
        "original_price": 299.0,
        "modified_price": 359.0,
        "pricing_reason": "面料升级，成本增加",
        "approved_by": "赵经理",
        "approved_date": "2024-01-25T11:00:00",
        "is_approved": True,
        "remarks": "品牌企划审批"
    }
]

SAMPLE_SHIFT_RECORDS = [
    {
        "shift_no": "SHF-2024-001",
        "shift_date": "2024-01-15T08:00:00",
        "shift_type": "早班",
        "worker": "李样衣",
        "worker_role": "sample_maker",
        "style_code": SAMPLE_STYLE_CODE,
        "work_content": "初版样衣裁剪与缝制",
        "work_hours": 8.0,
        "output_quantity": 3,
        "remarks": "完成初版3件样衣"
    },
    {
        "shift_no": "SHF-2024-002",
        "shift_date": "2024-01-18T08:00:00",
        "shift_type": "早班",
        "worker": "张打版",
        "worker_role": "pattern_maker",
        "style_code": SAMPLE_STYLE_CODE,
        "work_content": "尺码修正版型调整",
        "work_hours": 6.5,
        "output_quantity": 1,
        "remarks": "完成M码版型调整"
    },
    {
        "shift_no": "SHF-2024-003",
        "shift_date": "2024-01-23T13:00:00",
        "shift_type": "晚班",
        "worker": "李样衣",
        "worker_role": "sample_maker",
        "style_code": SAMPLE_STYLE_CODE,
        "work_content": "改版后样衣重新制作",
        "work_hours": 7.0,
        "output_quantity": 2,
        "remarks": "使用旧版面料返工（问题记录）"
    }
]

SAMPLE_LEDGER_RECORDS = [
    {
        "style_code": SAMPLE_STYLE_CODE,
        "style_name": "2024春季新款休闲西装",
        "version": 1,
        "designer": "王设计",
        "pattern_maker": "张打版",
        "sample_maker": "李样衣",
        "warehouse_keeper": "陈仓管",
        "fabric_code": "FAB-C001",
        "fabric_name": "纯棉斜纹布",
        "fabric_quantity": 15.0,
        "fabric_unit": "米",
        "remarks": "初版打样"
    },
    {
        "style_code": SAMPLE_STYLE_CODE,
        "style_name": "2024春季新款休闲西装",
        "version": 2,
        "designer": "王设计",
        "pattern_maker": "张打版",
        "sample_maker": "李样衣",
        "warehouse_keeper": "陈仓管",
        "fabric_code": "FAB-C002",
        "fabric_name": "高支棉府绸",
        "fabric_quantity": 10.0,
        "fabric_unit": "米",
        "remarks": "改版后打样",
        "parent_version_id": 1
    }
]

BAD_DATA_EXAMPLES = [
    {
        "transfer_no": "TRF-2024-001",
        "style_code": SAMPLE_STYLE_CODE,
        "version": 1,
        "transfer_type": "重复提交",
    },
    {
        "style_code": SAMPLE_STYLE_CODE,
        "version": 2,
    },
    {
        "inventory_no": "FAB-BAD-001",
        "style_code": SAMPLE_STYLE_CODE,
        "version": 999,
        "fabric_code": "BAD-FAB",
        "quantity": "无效数量",
    }
]

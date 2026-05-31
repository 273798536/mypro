import os
from pathlib import Path

APP_NAME = "bde"
APP_DIR = Path.home() / f".{APP_NAME}"
DATA_DIR = APP_DIR / "data"
DB_PATH = DATA_DIR / "bde.db"
EXPORT_DIR = APP_DIR / "exports"
TEMP_DIR = APP_DIR / "temp"

for d in [APP_DIR, DATA_DIR, EXPORT_DIR, TEMP_DIR]:
    d.mkdir(parents=True, exist_ok=True)

DATABASE_URL = f"sqlite:///{DB_PATH}"

EXCEL_ENGINE = "openpyxl"

REVIEW_STATUS = {
    "PENDING": "待复核",
    "REVIEWED": "已复核",
    "APPROVED": "已通过",
    "REJECTED": "已驳回",
}

ANOMALY_TYPES = {
    "HS_CODE_MISMATCH": "税则错用",
    "EXCHANGE_RATE_CROSS_PERIOD": "汇率跨期",
    "SUPPLEMENT_DECLARATION": "补申报覆盖",
    "DUPLICATE_IMPORT": "重复导入",
    "ABNORMAL_RESERVE": "异常保留",
    "CALCULATION_MISMATCH": "计算口径不一致",
    "MISSING_DATA": "数据缺失",
}

COLUMN_MAPPINGS = {
    "商品清单": {
        "sku": ["SKU", "商品编码", "货号", "sku"],
        "name": ["商品名称", "品名", "名称", "name"],
        "hs_code": ["税则号", "HS编码", "HSCODE", "税则编码", "hs_code"],
        "declared_hs_code": ["申报税则号", "申报HS编码", "declared_hs_code"],
        "origin_country": ["原产国", "原产地", "origin_country"],
        "unit_price": ["单价", "价格", "unit_price", "price"],
        "currency": ["币制", "币种", "currency"],
        "quantity": ["数量", "qty", "quantity"],
        "unit": ["单位", "unit"],
        "contract_no": ["合同号", "contract_no"],
    },
    "报关单": {
        "entry_no": ["报关单号", "申报单号", "entry_no"],
        "entry_date": ["申报日期", "报关日期", "entry_date"],
        "sku": ["SKU", "商品编码", "货号", "sku"],
        "hs_code": ["税则号", "HS编码", "HSCODE", "hs_code"],
        "duty_rate": ["关税率", "税率", "duty_rate"],
        "tax_rate": ["增值税率", "tax_rate"],
        "cif_amount": ["CIF价", "完税价格", "cif_amount"],
        "currency": ["币制", "币种", "currency"],
        "exchange_rate": ["汇率", "exchange_rate"],
        "duty_amount": ["关税税额", "duty_amount"],
        "tax_amount": ["增值税额", "tax_amount"],
    },
    "暂估报告": {
        "report_no": ["报告编号", "暂估编号", "report_no"],
        "period": ["所属期", "期间", "period"],
        "sku": ["SKU", "商品编码", "货号", "sku"],
        "estimated_duty": ["暂估关税", "estimated_duty"],
        "estimated_tax": ["暂估增值税", "estimated_tax"],
        "exchange_rate_used": ["使用汇率", "exchange_rate_used"],
        "hs_code_used": ["使用税则号", "hs_code_used"],
        "estimation_date": ["暂估日期", "estimation_date"],
        "estimator": ["暂估人", "estimator"],
    },
}

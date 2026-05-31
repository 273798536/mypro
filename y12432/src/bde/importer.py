import os
import hashlib
import pandas as pd
from pathlib import Path
from datetime import datetime
from .config import COLUMN_MAPPINGS, EXCEL_ENGINE
from .models import (
    ImportRecord, GoodsItem, CustomsDeclaration, DutyEstimation,
    get_session, init_db
)
from .utils import normalize_hs_code, parse_period

init_db()


def calculate_file_hash(file_path):
    hash_md5 = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()


def detect_data_type(file_path, sheet_name=None):
    xls = pd.ExcelFile(file_path, engine=EXCEL_ENGINE)
    target_sheet = sheet_name if sheet_name else xls.sheet_names[0]
    df = pd.read_excel(xls, sheet_name=target_sheet, nrows=5, engine=EXCEL_ENGINE)
    columns = set(str(c).strip() for c in df.columns)

    type_scores = {}

    declaration_unique = ["报关单号", "申报单号", "entry_no", "关税率", "税率", "duty_rate",
                          "增值税率", "tax_rate", "CIF价", "完税价格", "cif_amount",
                          "关税税额", "duty_amount", "增值税额", "tax_amount"]
    goods_unique = ["商品名称", "品名", "name", "原产国", "原产地", "origin_country",
                    "单价", "价格", "unit_price", "数量", "qty", "quantity",
                    "单位", "unit", "合同号", "contract_no"]
    estimation_unique = ["报告编号", "暂估编号", "report_no", "所属期", "期间", "period",
                         "暂估关税", "estimated_duty", "暂估增值税", "estimated_tax",
                         "使用汇率", "exchange_rate_used", "使用税则号", "hs_code_used",
                         "暂估日期", "estimation_date", "暂估人", "estimator"]

    type_scores["报关单"] = sum(1 for f in declaration_unique if f in columns) * 3
    type_scores["商品清单"] = sum(1 for f in goods_unique if f in columns) * 3
    type_scores["暂估报告"] = sum(1 for f in estimation_unique if f in columns) * 3

    for data_type, mappings in COLUMN_MAPPINGS.items():
        for std_name, aliases in mappings.items():
            if any(alias in columns for alias in aliases):
                type_scores[data_type] = type_scores.get(data_type, 0) + 1

    best_type = max(type_scores, key=type_scores.get)
    if type_scores[best_type] >= 3:
        return best_type
    return None


def map_columns(df_columns, data_type):
    mappings = COLUMN_MAPPINGS.get(data_type, {})
    column_map = {}
    df_cols = {str(c).strip(): c for c in df_columns}

    for std_name, aliases in mappings.items():
        for alias in aliases:
            if alias in df_cols:
                column_map[std_name] = df_cols[alias]
                break
    return column_map


def check_duplicate_import(session, file_hash, data_type):
    existing = session.query(ImportRecord).filter(
        ImportRecord.file_hash == file_hash,
        ImportRecord.data_type == data_type,
        ImportRecord.is_duplicate == False
    ).first()
    return existing


def import_goods_list(session, df, import_record_id, column_map):
    items = []
    for idx, row in df.iterrows():
        sku = str(row.get(column_map.get("sku", ""), "")).strip()
        if not sku or sku == "nan":
            continue

        hs_code = str(row.get(column_map.get("hs_code", ""), "")).strip()
        hs_code = normalize_hs_code(hs_code)

        declared_hs = str(row.get(column_map.get("declared_hs_code", ""), "")).strip()
        declared_hs = normalize_hs_code(declared_hs)

        def safe_float(val):
            try:
                return float(str(val).replace(",", "")) if val and str(val).strip() != "" else None
            except (ValueError, TypeError):
                return None

        item = GoodsItem(
            import_record_id=import_record_id,
            source_row=idx + 2,
            sku=sku,
            name=str(row.get(column_map.get("name", ""), "")).strip(),
            hs_code=hs_code,
            declared_hs_code=declared_hs,
            origin_country=str(row.get(column_map.get("origin_country", ""), "")).strip(),
            unit_price=safe_float(row.get(column_map.get("unit_price", ""))),
            currency=str(row.get(column_map.get("currency", ""), "")).strip(),
            quantity=safe_float(row.get(column_map.get("quantity", ""))),
            unit=str(row.get(column_map.get("unit", ""), "")).strip(),
            contract_no=str(row.get(column_map.get("contract_no", ""), "")).strip(),
        )
        items.append(item)
    return items


def import_customs_declaration(session, df, import_record_id, column_map):
    items = []
    for idx, row in df.iterrows():
        entry_no = str(row.get(column_map.get("entry_no", ""), "")).strip()
        if not entry_no or entry_no == "nan":
            continue

        sku = str(row.get(column_map.get("sku", ""), "")).strip()
        hs_code = normalize_hs_code(str(row.get(column_map.get("hs_code", ""), "")).strip())

        def safe_float(val):
            try:
                return float(str(val).replace(",", "").replace("%", "")) if val and str(val).strip() != "" else None
            except (ValueError, TypeError):
                return None

        def safe_date(val):
            if not val or str(val).strip() == "":
                return None
            try:
                if isinstance(val, datetime):
                    return val.date()
                return pd.to_datetime(val).date()
            except:
                return None

        item = CustomsDeclaration(
            import_record_id=import_record_id,
            source_row=idx + 2,
            entry_no=entry_no,
            entry_date=safe_date(row.get(column_map.get("entry_date", ""))),
            sku=sku,
            hs_code=hs_code,
            duty_rate=safe_float(row.get(column_map.get("duty_rate", ""))),
            tax_rate=safe_float(row.get(column_map.get("tax_rate", ""))),
            cif_amount=safe_float(row.get(column_map.get("cif_amount", ""))),
            currency=str(row.get(column_map.get("currency", ""), "")).strip(),
            exchange_rate=safe_float(row.get(column_map.get("exchange_rate", ""))),
            duty_amount=safe_float(row.get(column_map.get("duty_amount", ""))),
            tax_amount=safe_float(row.get(column_map.get("tax_amount", ""))),
        )
        items.append(item)
    return items


def import_estimation_report(session, df, import_record_id, column_map):
    items = []
    for idx, row in df.iterrows():
        report_no = str(row.get(column_map.get("report_no", ""), "")).strip()
        sku = str(row.get(column_map.get("sku", ""), "")).strip()
        if (not report_no or report_no == "nan") and (not sku or sku == "nan"):
            continue

        def safe_float(val):
            try:
                return float(str(val).replace(",", "")) if val and str(val).strip() != "" else None
            except (ValueError, TypeError):
                return None

        def safe_date(val):
            if not val or str(val).strip() == "":
                return None
            try:
                if isinstance(val, datetime):
                    return val.date()
                return pd.to_datetime(val).date()
            except:
                return None

        period = str(row.get(column_map.get("period", ""), "")).strip()
        period = parse_period(period)

        item = DutyEstimation(
            import_record_id=import_record_id,
            source_row=idx + 2,
            report_no=report_no,
            period=period,
            sku=sku,
            estimated_duty=safe_float(row.get(column_map.get("estimated_duty", ""))),
            estimated_tax=safe_float(row.get(column_map.get("estimated_tax", ""))),
            exchange_rate_used=safe_float(row.get(column_map.get("exchange_rate_used", ""))),
            hs_code_used=normalize_hs_code(str(row.get(column_map.get("hs_code_used", ""), "")).strip()),
            estimation_date=safe_date(row.get(column_map.get("estimation_date", ""))),
            estimator=str(row.get(column_map.get("estimator", ""), "")).strip(),
        )
        items.append(item)
    return items


def import_file(file_path, data_type=None, sheet_name=None, imported_by=None, force=False):
    file_path = Path(file_path)
    if not file_path.exists():
        return {"success": False, "error": f"文件不存在: {file_path}"}

    session = next(get_session())
    try:
        file_hash = calculate_file_hash(str(file_path))

        if data_type is None:
            data_type = detect_data_type(str(file_path), sheet_name)
            if data_type is None:
                return {"success": False, "error": "无法识别文件类型，请指定 --type 参数"}

        if not force:
            duplicate = check_duplicate_import(session, file_hash, data_type)
            if duplicate:
                return {
                    "success": False,
                    "error": f"检测到重复导入: 该文件已在 {duplicate.import_time} 导入",
                    "duplicate_of": duplicate.id
                }

        xls = pd.ExcelFile(str(file_path), engine=EXCEL_ENGINE)
        actual_sheet = sheet_name if sheet_name else xls.sheet_names[0]
        df = pd.read_excel(xls, sheet_name=actual_sheet, engine=EXCEL_ENGINE)
        column_map = map_columns(df.columns, data_type)

        import_record = ImportRecord(
            source_file=str(file_path),
            file_hash=file_hash,
            sheet_name=actual_sheet,
            data_type=data_type,
            imported_by=imported_by,
            row_count=len(df),
        )
        session.add(import_record)
        session.flush()

        items = []
        if data_type == "商品清单":
            items = import_goods_list(session, df, import_record.id, column_map)
        elif data_type == "报关单":
            items = import_customs_declaration(session, df, import_record.id, column_map)
        elif data_type == "暂估报告":
            items = import_estimation_report(session, df, import_record.id, column_map)

        for item in items:
            session.add(item)

        session.commit()

        return {
            "success": True,
            "data_type": data_type,
            "import_id": import_record.id,
            "row_count": len(items),
            "columns_mapped": column_map,
        }
    except Exception as e:
        session.rollback()
        return {"success": False, "error": str(e)}
    finally:
        session.close()


def import_batch(file_pattern, data_type=None, imported_by=None, force=False):
    from glob import glob
    files = glob(file_pattern)
    if not files:
        return {"success": False, "error": f"未找到匹配文件: {file_pattern}"}

    results = []
    for file_path in sorted(files):
        result = import_file(file_path, data_type, imported_by=imported_by, force=force)
        result["file"] = file_path
        results.append(result)

    success_count = sum(1 for r in results if r["success"])
    return {
        "success": success_count > 0,
        "total": len(results),
        "success_count": success_count,
        "results": results,
    }

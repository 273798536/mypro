#!/usr/bin/env python3
import pandas as pd
import re
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
import uuid


class DataCleaner:
    @staticmethod
    def clean_print_no(print_no: str) -> str:
        if pd.isna(print_no) or print_no is None:
            return ""
        print_no = str(print_no).strip()
        print_no = re.sub(r'[\s\-_/\\]+', '', print_no)
        print_no = print_no.upper()
        return print_no

    @staticmethod
    def clean_amount(amount: Any) -> float:
        if pd.isna(amount) or amount is None or amount == "":
            return 0.0
        if isinstance(amount, (int, float)):
            return float(amount)
        amount_str = str(amount).strip()
        amount_str = re.sub(r'[^\d.]', '', amount_str)
        try:
            return float(amount_str) if amount_str else 0.0
        except ValueError:
            return 0.0

    @staticmethod
    def clean_ratio(ratio: Any) -> float:
        if pd.isna(ratio) or ratio is None or ratio == "":
            return 0.0
        if isinstance(ratio, (int, float)):
            val = float(ratio)
            return val if val <= 1 else val / 100
        ratio_str = str(ratio).strip()
        ratio_str = ratio_str.replace('%', '')
        try:
            val = float(ratio_str)
            return val if val <= 1 else val / 100
        except ValueError:
            return 0.0

    @staticmethod
    def clean_date(date_val: Any) -> str:
        if pd.isna(date_val) or date_val is None or date_val == "":
            return ""
        if isinstance(date_val, datetime):
            return date_val.strftime("%Y-%m-%d %H:%M:%S")
        try:
            if isinstance(date_val, str):
                for fmt in ["%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d", 
                           "%Y/%m/%d %H:%M:%S", "%Y/%m/%d", "%m/%d/%Y", "%d/%m/%Y"]:
                    try:
                        dt = datetime.strptime(date_val.strip(), fmt)
                        return dt.strftime("%Y-%m-%d %H:%M:%S")
                    except ValueError:
                        continue
            return ""
        except Exception:
            return ""

    @staticmethod
    def clean_name(name: str) -> str:
        if pd.isna(name) or name is None:
            return ""
        return str(name).strip()

    @staticmethod
    def parse_edition_range(edition_str: str) -> List[str]:
        if pd.isna(edition_str) or edition_str is None:
            return []
        edition_str = str(edition_str).strip()
        match = re.match(r'(\d+)-(\d+)', edition_str)
        if match:
            start, end = int(match.group(1)), int(match.group(2))
            return [str(i) for i in range(start, end + 1)]
        match = re.match(r'(\d+)/(\d+)', edition_str)
        if match:
            return [match.group(1)]
        nums = re.findall(r'\d+', edition_str)
        return nums


class InventoryImporter:
    def __init__(self, cleaner: DataCleaner = None):
        self.cleaner = cleaner or DataCleaner()
        self.imported_records = []
        self.import_errors = []

    def import_from_excel(self, file_path: str, sheet_name: Optional[str] = None) -> Tuple[List[Dict], List[Dict]]:
        try:
            df = pd.read_excel(file_path, sheet_name=sheet_name if sheet_name else 0)
        except Exception as e:
            self.import_errors.append({"type": "file_error", "message": f"无法读取文件: {e}"})
            return [], self.import_errors

        for idx, row in df.iterrows():
            try:
                record = self._parse_row(row, idx)
                if record:
                    self.imported_records.append(record)
            except Exception as e:
                self.import_errors.append({
                    "type": "row_parse_error",
                    "row": idx + 2,
                    "message": str(e),
                    "data": row.to_dict()
                })

        return self.imported_records, self.import_errors

    def import_from_csv(self, file_path: str) -> Tuple[List[Dict], List[Dict]]:
        try:
            df = pd.read_csv(file_path)
        except Exception as e:
            self.import_errors.append({"type": "file_error", "message": f"无法读取文件: {e}"})
            return [], self.import_errors

        for idx, row in df.iterrows():
            try:
                record = self._parse_row(row, idx)
                if record:
                    self.imported_records.append(record)
            except Exception as e:
                self.import_errors.append({
                    "type": "row_parse_error",
                    "row": idx + 2,
                    "message": str(e),
                    "data": row.to_dict()
                })

        return self.imported_records, self.import_errors

    def import_from_manual_list(self, data_list: List[Dict]) -> Tuple[List[Dict], List[Dict]]:
        for idx, item in enumerate(data_list):
            try:
                record = self._parse_row(pd.Series(item), idx)
                if record:
                    self.imported_records.append(record)
            except Exception as e:
                self.import_errors.append({
                    "type": "row_parse_error",
                    "row": idx + 1,
                    "message": str(e),
                    "data": item
                })

        return self.imported_records, self.import_errors

    def _parse_row(self, row: pd.Series, row_idx: int) -> Optional[Dict]:
        def get_val(*possible_names: str) -> Any:
            for name in possible_names:
                if name in row and not pd.isna(row[name]):
                    return row[name]
            return None

        print_no = self.cleaner.clean_print_no(get_val('版画编号', '编号', 'print_no', '编号 '))
        if not print_no:
            raise ValueError("版画编号不能为空")

        title = self.cleaner.clean_name(get_val('作品名称', '名称', 'title', '作品名'))
        artist_name = self.cleaner.clean_name(get_val('艺术家', 'artist', '作者'))
        edition = self.cleaner.clean_name(get_val('版数', 'edition', '版次'))
        material = self.cleaner.clean_name(get_val('材质', 'material', '材料'))
        size = self.cleaner.clean_name(get_val('尺寸', 'size', '大小'))
        year = get_val('创作年份', '年份', 'year')
        year_val = int(year) if year and not pd.isna(year) else None
        inbound_date = self.cleaner.clean_date(get_val('入库日期', '日期', 'date', '入库时间'))
        value = self.cleaner.clean_amount(get_val('当前价值', '价值', 'value', '估价', '价格'))
        source = self.cleaner.clean_name(get_val('数据来源', '来源', 'source')) or "批量导入"
        notes = self.cleaner.clean_name(get_val('备注', 'notes', '说明'))

        return {
            "版画编号": print_no,
            "作品名称": title,
            "版数": edition,
            "材质": material,
            "尺寸": size,
            "创作年份": year_val,
            "入库日期": inbound_date,
            "当前价值": value,
            "数据来源": source,
            "是否编号重复": False,
            "备注": notes,
            "艺术家姓名": artist_name,
            "_row_idx": row_idx,
        }

    def expand_batch_numbers(self, records: List[Dict]) -> List[Dict]:
        expanded = []
        for rec in records:
            edition_nums = self.cleaner.parse_edition_range(rec.get("版数", ""))
            if len(edition_nums) > 1:
                base_no = rec.get("版画编号", "")
                for num in edition_nums:
                    new_rec = rec.copy()
                    new_rec["版画编号"] = f"{base_no}-{num}" if base_no else num
                    new_rec["版数"] = f"{num}/{len(edition_nums)}"
                    new_rec["_expanded"] = True
                    new_rec["_batch_id"] = str(uuid.uuid4())
                    expanded.append(new_rec)
            else:
                rec["_expanded"] = False
                expanded.append(rec)
        return expanded


class SalesOrderImporter:
    def __init__(self, cleaner: DataCleaner = None):
        self.cleaner = cleaner or DataCleaner()
        self.imported_records = []
        self.import_errors = []

    def import_from_manual(self, data_list: List[Dict]) -> Tuple[List[Dict], List[Dict]]:
        for idx, item in enumerate(data_list):
            try:
                record = self._parse_row(pd.Series(item), idx)
                if record:
                    self.imported_records.append(record)
            except Exception as e:
                self.import_errors.append({
                    "type": "row_parse_error",
                    "row": idx + 1,
                    "message": str(e),
                    "data": item
                })
        return self.imported_records, self.import_errors

    def _parse_row(self, row: pd.Series, row_idx: int) -> Optional[Dict]:
        def get_val(*possible_names: str) -> Any:
            for name in possible_names:
                if name in row and not pd.isna(row[name]):
                    return row[name]
            return None

        order_no = self.cleaner.clean_name(get_val('订单编号', '单号', 'order_no', '订单号'))
        print_no = self.cleaner.clean_print_no(get_val('版画编号', '编号', 'print_no'))
        customer = self.cleaner.clean_name(get_val('客户名称', '客户', 'customer', '买家'))
        contact = self.cleaner.clean_name(get_val('联系方式', '电话', 'contact', '手机'))
        amount = self.cleaner.clean_amount(get_val('销售金额', '金额', 'amount', '售价', '价格'))
        contract_ratio = self.cleaner.clean_ratio(get_val('合同分润比例', '分润比例', 'ratio', '比例'))
        order_date = self.cleaner.clean_date(get_val('订单日期', '日期', 'date', '销售日期'))
        payment_status = self.cleaner.clean_name(get_val('收款状态', '收款', 'payment_status')) or "未收款"
        order_status = self.cleaner.clean_name(get_val('订单状态', '状态', 'order_status')) or "待确认"
        exhibition_name = self.cleaner.clean_name(get_val('所属展会', '展会', 'exhibition'))
        source = self.cleaner.clean_name(get_val('数据来源', '来源', 'source')) or "手工录入"
        notes = self.cleaner.clean_name(get_val('备注', 'notes', '说明'))

        if not print_no:
            raise ValueError("版画编号不能为空")

        return {
            "订单编号": order_no or f"SO{datetime.now().strftime('%Y%m%d')}{row_idx + 1:04d}",
            "订单日期": order_date,
            "客户名称": customer,
            "联系方式": contact,
            "版画编号": print_no,
            "销售金额": amount,
            "合同分润比例": contract_ratio,
            "收款状态": payment_status if payment_status in ["未收款", "部分收款", "已收款"] else "未收款",
            "订单状态": order_status if order_status in ["待确认", "已确认", "已发货", "已完成", "已取消"] else "待确认",
            "展会名称": exhibition_name,
            "数据来源": source,
            "备注": notes,
            "_row_idx": row_idx,
        }


class ReturnRecordImporter:
    def __init__(self, cleaner: DataCleaner = None):
        self.cleaner = cleaner or DataCleaner()
        self.imported_records = []
        self.import_errors = []

    def import_from_attachment(self, attachment_text: str) -> Tuple[List[Dict], List[Dict]]:
        lines = attachment_text.strip().split('\n')
        for idx, line in enumerate(lines):
            if not line.strip():
                continue
            try:
                parts = re.split(r'[,，\t|]', line.strip())
                data = {}
                for i, part in enumerate(parts):
                    data[f'col_{i}'] = part.strip()
                record = self._parse_line(data, idx)
                if record:
                    self.imported_records.append(record)
            except Exception as e:
                self.import_errors.append({
                    "type": "line_parse_error",
                    "line": idx + 1,
                    "message": str(e),
                    "data": line
                })
        return self.imported_records, self.import_errors

    def _parse_line(self, data: Dict, line_idx: int) -> Optional[Dict]:
        print_no = ""
        return_no = ""
        return_reason = ""
        return_amount = 0.0
        original_exhibition = ""
        return_exhibition = ""

        for key, val in data.items():
            if re.search(r'编号|print|no', key, re.I) or re.match(r'^[A-Z]+\d+', val):
                cleaned = self.cleaner.clean_print_no(val)
                if cleaned and len(cleaned) > len(print_no):
                    print_no = cleaned
            elif re.search(r'退货|return', key, re.I) or re.match(r'^R\d+', val):
                return_no = val
            elif re.search(r'原因|reason', key, re.I) or len(val) > 10:
                return_reason = val
            elif re.search(r'金额|amount|price', key, re.I) or re.match(r'^[\d.,]+$', val):
                amount = self.cleaner.clean_amount(val)
                if amount > return_amount:
                    return_amount = amount
            elif re.search(r'原展|销售展|original', key, re.I):
                original_exhibition = val
            elif re.search(r'退货展|return', key, re.I):
                return_exhibition = val

        if not print_no:
            raise ValueError("无法识别版画编号")

        return {
            "退货编号": return_no or f"RT{datetime.now().strftime('%Y%m%d')}{line_idx + 1:04d}",
            "退货日期": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "版画编号": print_no,
            "退货原因": return_reason,
            "退货金额": return_amount,
            "原销售展会": original_exhibition,
            "退货展会": return_exhibition,
            "退款状态": "待退款",
            "退货状态": "待审核",
            "是否跨展退货": False,
            "备注": f"从附件第{line_idx + 1}行导入",
            "_line_idx": line_idx,
        }

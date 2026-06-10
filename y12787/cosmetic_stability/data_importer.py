"""
数据导入模块
支持CSV格式，处理旧表格式、补录备注、漏填单位等日常混乱情况
"""
import csv
import re
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Tuple, Any

from .models import BatchInfo, TestPoint, TestItem, StorageCondition
from .batch_manager import BatchManager
from .config import Config


ITEM_CODE_MAPPING = {
    "含量": "CONTENT",
    "有效成分含量": "CONTENT",
    "主成分含量": "CONTENT",
    "活性物含量": "CONTENT",
    "ph": "PH",
    "ph值": "PH",
    "酸碱度": "PH",
    "微生物": "MICROBE",
    "菌落总数": "MICROBE",
    "细菌总数": "MICROBE",
    "性状": "APPEARANCE",
    "外观": "APPEARANCE",
    "色泽": "COLOR",
    "颜色": "COLOR",
    "气味": "ODOR",
    "香气": "ODOR",
    "黏度": "VISCOSITY",
    "粘度": "VISCOSITY",
    "密度": "DENSITY",
    "比重": "DENSITY",
}

STORAGE_CONDITION_MAPPING = {
    "室温": StorageCondition.ROOM_TEMP,
    "常温": StorageCondition.ROOM_TEMP,
    "加速": StorageCondition.ACCELERATED,
    "加速试验": StorageCondition.ACCELERATED,
    "40°c": StorageCondition.ACCELERATED,
    "40℃": StorageCondition.ACCELERATED,
    "冷藏": StorageCondition.REFRIGERATED,
    "2-8℃": StorageCondition.REFRIGERATED,
    "2~8℃": StorageCondition.REFRIGERATED,
    "冷冻": StorageCondition.FREEZER,
    "-18℃": StorageCondition.FREEZER,
    "光照": StorageCondition.LIGHT,
    "4500lux": StorageCondition.LIGHT,
}


class DataImporter:
    """数据导入器"""

    def __init__(self, config: Config, batch_manager: BatchManager):
        self.config = config
        self.batch_manager = batch_manager

    def _normalize_key(self, key: str) -> str:
        """标准化字段名"""
        if not key:
            return ""
        key = key.strip().lower()
        key = re.sub(r'[\s_\-()（）]', '', key)
        return key

    def _match_item_code(self, item_name: str) -> Tuple[str, str]:
        """匹配项目代码"""
        normalized = self._normalize_key(item_name)
        for key, code in ITEM_CODE_MAPPING.items():
            if self._normalize_key(key) == normalized:
                return item_name, code
        return item_name, "OTHER"

    def _parse_storage_condition(self, condition: str) -> StorageCondition:
        """解析存储条件"""
        normalized = self._normalize_key(condition)
        for key, enum_val in STORAGE_CONDITION_MAPPING.items():
            if self._normalize_key(key) in normalized:
                return enum_val
        return StorageCondition.ROOM_TEMP

    def _parse_float(self, value: str) -> Optional[float]:
        """解析浮点数，处理各种混乱格式"""
        if value is None or value == "":
            return None
        value_str = str(value).strip()
        if value_str in ["-", "/", "无", "未检", "未测", "N/A", "n/a"]:
            return None
        value_str = re.sub(r'[^\d.\-]', '', value_str)
        if not value_str or value_str in [".", "-"]:
            return None
        try:
            return float(value_str)
        except ValueError:
            return None

    def _parse_bool(self, value: str) -> Optional[bool]:
        """解析合格判定"""
        if value is None or value == "":
            return None
        value_str = str(value).strip()
        if value_str in ["合格", "符合", "是", "√", "YES", "Yes", "yes", "Y", "y", "1"]:
            return True
        if value_str in ["不合格", "不符合", "否", "×", "NO", "No", "no", "N", "n", "0"]:
            return False
        return None

    def _parse_datetime(self, value: str) -> Optional[datetime]:
        """解析日期时间"""
        if value is None or value == "":
            return None
        value_str = str(value).strip()
        for fmt in ["%Y-%m-%d %H:%M:%S", "%Y/%m/%d %H:%M:%S",
                    "%Y-%m-%d %H:%M", "%Y/%m/%d %H:%M",
                    "%Y-%m-%d", "%Y/%m/%d",
                    "%Y年%m月%d日 %H:%M", "%Y年%m月%d日"]:
            try:
                return datetime.strptime(value_str, fmt)
            except ValueError:
                continue
        return None

    def _parse_date_str(self, value: str) -> str:
        """解析日期为字符串"""
        if value is None or value == "":
            return ""
        value_str = str(value).strip()
        dt = self._parse_datetime(value_str)
        if dt:
            return dt.strftime("%Y-%m-%d")
        return value_str

    def _find_column(self, headers: List[str], keywords: List[str]) -> Optional[int]:
        """根据关键词查找列索引"""
        for i, header in enumerate(headers):
            normalized_header = self._normalize_key(header)
            for keyword in keywords:
                if self._normalize_key(keyword) in normalized_header:
                    return i
        return None

    def import_csv(self, file_path: str, operator: str) -> Dict[str, Any]:
        """
        导入CSV文件
        支持旧表格式、混乱的列名、补录备注等
        """
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"文件不存在: {file_path}")

        results = {
            "batches_added": 0,
            "batches_updated": 0,
            "test_points_added": 0,
            "test_points_updated": 0,
            "test_items_added": 0,
            "test_items_updated": 0,
            "records": []
        }

        with open(path, "r", encoding="utf-8-sig") as f:
            reader = csv.reader(f)
            rows = list(reader)

        if not rows:
            return results

        header_row_idx = self._find_header_row(rows)
        if header_row_idx is None:
            raise ValueError("无法识别表头行，请检查CSV格式")

        headers = [h.strip() for h in rows[header_row_idx]]
        data_rows = rows[header_row_idx + 1:]

        has_batch_info = self._detect_batch_info(headers)

        if has_batch_info:
            results = self._import_with_batch_info(headers, data_rows, path.name, operator, results)
        else:
            results = self._import_test_data_only(headers, data_rows, path.name, operator, results)

        self.batch_manager.save()
        return results

    def _find_header_row(self, rows: List[List[str]]) -> Optional[int]:
        """查找表头行，处理旧表可能有标题行的情况"""
        for i, row in enumerate(rows[:5]):
            has_keyword = False
            for cell in row:
                normalized = self._normalize_key(cell)
                keywords = ["批次", "批号", "时间", "含量", "ph", "检验", "项目"]
                if any(self._normalize_key(kw) in normalized for kw in keywords):
                    has_keyword = True
                    break
            if has_keyword and len([c for c in row if c.strip()]) >= 3:
                return i
        return 0

    def _detect_batch_info(self, headers: List[str]) -> bool:
        """检测是否包含批次信息"""
        batch_keywords = ["批次", "批号", "产品", "生产", "规格", "厂家"]
        for header in headers:
            normalized = self._normalize_key(header)
            for kw in batch_keywords:
                if self._normalize_key(kw) in normalized:
                    return True
        return False

    def _import_with_batch_info(self, headers: List[str], data_rows: List[List[str]],
                                 source_file: str, operator: str, results: Dict) -> Dict:
        """导入包含批次信息的数据"""
        batch_no_col = self._find_column(headers, ["批次号", "批号", "批次", "batch"])
        product_name_col = self._find_column(headers, ["产品名称", "品名", "产品"])
        product_code_col = self._find_column(headers, ["产品代码", "产品编号", "货号"])
        spec_col = self._find_column(headers, ["规格", "包装规格"])
        manu_date_col = self._find_column(headers, ["生产日期", "生产批号", "生产"])
        expiry_col = self._find_column(headers, ["有效期", "失效期", "拟有效期"])
        manufacturer_col = self._find_column(headers, ["生产厂家", "厂家", "制造商"])
        storage_col = self._find_column(headers, ["储存条件", "贮藏", "存放"])
        inspector_col = self._find_column(headers, ["检验员", "检查员", "负责人"])
        remarks_col = self._find_column(headers, ["备注", "说明", "附注"])

        for row in data_rows:
            if not any(cell.strip() for cell in row):
                continue

            batch_no = self._get_cell_value(row, batch_no_col)
            if not batch_no:
                continue

            batch_data = {
                "batch_no": batch_no.strip(),
                "product_name": self._get_cell_value(row, product_name_col, "未知产品"),
                "product_code": self._get_cell_value(row, product_code_col, ""),
                "specification": self._get_cell_value(row, spec_col, ""),
                "manufacture_date": self._parse_date_str(self._get_cell_value(row, manu_date_col)),
                "expiry_date_candidate": self._parse_date_str(self._get_cell_value(row, expiry_col)),
                "manufacturer": self._get_cell_value(row, manufacturer_col, ""),
                "storage_condition": self._parse_storage_condition(
                    self._get_cell_value(row, storage_col, "室温")
                ),
                "inspector": self._get_cell_value(row, inspector_col, operator),
                "remarks": self._get_cell_value(row, remarks_col, "")
            }

            is_new = batch_data["batch_no"] not in self.batch_manager.ledger.batches
            batch = BatchInfo(**batch_data)
            _, pr = self.batch_manager.add_batch(batch, operator, source_file)

            if is_new:
                results["batches_added"] += 1
            else:
                results["batches_updated"] += 1
            results["records"].append(pr)

            results = self._extract_test_data_from_row(
                headers, row, batch_data["batch_no"], source_file, operator, results
            )

        return results

    def _import_test_data_only(self, headers: List[str], data_rows: List[List[str]],
                                source_file: str, operator: str, results: Dict) -> Dict:
        """仅导入检验数据（没有批次信息）"""
        batch_no_col = self._find_column(headers, ["批次号", "批号", "批次"])
        time_point_col = self._find_column(headers, ["时间点", "考察时间", "取样时间", "月份"])
        test_date_col = self._find_column(headers, ["检验日期", "测试日期", "检测日期"])
        temp_col = self._find_column(headers, ["温度", "恒温"])
        humidity_col = self._find_column(headers, ["湿度", "相对湿度"])
        operator_col = self._find_column(headers, ["检验员", "操作员", "试验员"])
        record_time_col = self._find_column(headers, ["记录时间", "反应时间", "实际时间"])
        blank_col = self._find_column(headers, ["空白对照", "空白", "阴性对照"])
        remarks_col = self._find_column(headers, ["备注", "说明"])
        supplement_col = self._find_column(headers, ["补录", "补填", "补充"])

        item_columns = self._identify_item_columns(headers)

        for row in data_rows:
            if not any(cell.strip() for cell in row):
                continue

            batch_no = self._get_cell_value(row, batch_no_col)
            if not batch_no:
                continue

            if batch_no not in self.batch_manager.ledger.batches:
                self._create_default_batch(batch_no, operator, source_file)
                results["batches_added"] += 1

            time_point = self._get_cell_value(row, time_point_col, "0月")
            test_date = self._parse_date_str(self._get_cell_value(row, test_date_col))
            is_blank = self._parse_bool(self._get_cell_value(row, blank_col)) is True

            test_point = TestPoint(
                batch_no=batch_no,
                time_point=time_point,
                test_date=test_date,
                temperature=self._parse_float(self._get_cell_value(row, temp_col)),
                humidity=self._parse_float(self._get_cell_value(row, humidity_col)),
                operator=self._get_cell_value(row, operator_col, operator),
                record_time=self._parse_datetime(self._get_cell_value(row, record_time_col)),
                is_blank_control=is_blank,
                remarks=self._get_cell_value(row, remarks_col, "")
            )

            is_new_tp = not any(
                tp.time_point == test_point.time_point and tp.is_blank_control == test_point.is_blank_control
                for tp in self.batch_manager.ledger.test_points.get(batch_no, [])
            )
            _, pr = self.batch_manager.add_test_point(test_point, operator, source_file)
            if is_new_tp:
                results["test_points_added"] += 1
            else:
                results["test_points_updated"] += 1
            results["records"].append(pr)

            for item_name, col_idx, spec_col_idx in item_columns:
                value_str = self._get_cell_value(row, col_idx)
                if not value_str:
                    continue

                display_name, item_code = self._match_item_code(item_name)
                unit = self._extract_unit(value_str, item_code)
                measured_value = self._parse_float(value_str)

                spec_str = self._get_cell_value(row, spec_col_idx, "")
                is_qualified = self._parse_bool(self._get_cell_value(row, col_idx + 1))
                if is_qualified is None:
                    is_qualified = self._check_qualification(measured_value, spec_str)

                inspection_date = test_date or self._parse_date_str(
                    self._get_cell_value(row, self._find_column(headers, ["检验日期", "检测日期"]))
                )

                supplementary = ""
                if supplement_col is not None:
                    supplementary = self._get_cell_value(row, supplement_col, "")

                test_item = TestItem(
                    test_id=f"{batch_no}-{time_point}-{item_code}",
                    batch_no=batch_no,
                    time_point=time_point,
                    item_name=display_name,
                    item_code=item_code,
                    measured_value=measured_value,
                    unit=unit,
                    specification=spec_str,
                    is_qualified=is_qualified,
                    inspector=self._get_cell_value(row, operator_col, operator),
                    inspection_date=inspection_date,
                    remarks=self._get_cell_value(row, remarks_col, ""),
                    supplementary_note=supplementary
                )

                is_new_item = not any(
                    ti.item_code == test_item.item_code and ti.time_point == test_item.time_point
                    for ti in self.batch_manager.ledger.test_items.get(batch_no, [])
                )
                _, pr = self.batch_manager.add_test_item(test_item, operator, source_file)
                if is_new_item:
                    results["test_items_added"] += 1
                else:
                    results["test_items_updated"] += 1
                results["records"].append(pr)

        return results

    def _extract_test_data_from_row(self, headers: List[str], row: List[str],
                                     batch_no: str, source_file: str, operator: str,
                                     results: Dict) -> Dict:
        """从行中提取检验数据"""
        item_columns = self._identify_item_columns(headers)
        time_point_col = self._find_column(headers, ["时间点", "考察时间", "月份"])
        test_date_col = self._find_column(headers, ["检验日期", "测试日期"])
        operator_col = self._find_column(headers, ["检验员", "操作员"])
        record_time_col = self._find_column(headers, ["记录时间", "反应时间"])
        blank_col = self._find_column(headers, ["空白对照", "空白"])

        time_point = self._get_cell_value(row, time_point_col, "0月")
        if time_point:
            test_point = TestPoint(
                batch_no=batch_no,
                time_point=time_point,
                test_date=self._parse_date_str(self._get_cell_value(row, test_date_col)),
                operator=self._get_cell_value(row, operator_col, operator),
                record_time=self._parse_datetime(self._get_cell_value(row, record_time_col)),
                is_blank_control=self._parse_bool(self._get_cell_value(row, blank_col)) is True
            )

            is_new = not any(
                tp.time_point == test_point.time_point and tp.is_blank_control == test_point.is_blank_control
                for tp in self.batch_manager.ledger.test_points.get(batch_no, [])
            )
            _, pr = self.batch_manager.add_test_point(test_point, operator, source_file)
            if is_new:
                results["test_points_added"] += 1
            else:
                results["test_points_updated"] += 1
            results["records"].append(pr)

            for item_name, col_idx, spec_col_idx in item_columns:
                value_str = self._get_cell_value(row, col_idx)
                if not value_str:
                    continue

                display_name, item_code = self._match_item_code(item_name)
                unit = self._extract_unit(value_str, item_code)
                measured_value = self._parse_float(value_str)

                spec_str = self._get_cell_value(row, spec_col_idx, "")
                is_qualified = self._check_qualification(measured_value, spec_str)

                test_item = TestItem(
                    test_id=f"{batch_no}-{time_point}-{item_code}",
                    batch_no=batch_no,
                    time_point=time_point,
                    item_name=display_name,
                    item_code=item_code,
                    measured_value=measured_value,
                    unit=unit,
                    specification=spec_str,
                    is_qualified=is_qualified,
                    inspector=self._get_cell_value(row, operator_col, operator),
                    inspection_date=test_point.test_date
                )

                is_new = not any(
                    ti.item_code == test_item.item_code and ti.time_point == test_item.time_point
                    for ti in self.batch_manager.ledger.test_items.get(batch_no, [])
                )
                _, pr = self.batch_manager.add_test_item(test_item, operator, source_file)
                if is_new:
                    results["test_items_added"] += 1
                else:
                    results["test_items_updated"] += 1
                results["records"].append(pr)

        return results

    def _identify_item_columns(self, headers: List[str]) -> List[Tuple[str, int, int]]:
        """识别检验项目列"""
        items = []
        item_keywords = ["含量", "ph", "微生物", "性状", "外观", "色泽", "气味", "黏度", "密度"]

        for i, header in enumerate(headers):
            normalized = self._normalize_key(header)
            for kw in item_keywords:
                if self._normalize_key(kw) in normalized and "标准" not in normalized and "规格" not in normalized:
                    spec_idx = self._find_adjacent_spec_column(headers, i)
                    items.append((header.strip(), i, spec_idx))
                    break

        return items

    def _find_adjacent_spec_column(self, headers: List[str], item_idx: int) -> int:
        """查找相邻的标准/规格列"""
        for offset in [1, -1, 2, -2]:
            idx = item_idx + offset
            if 0 <= idx < len(headers):
                normalized = self._normalize_key(headers[idx])
                if any(kw in normalized for kw in ["标准", "规格", "限度", "规定"]):
                    return idx
        return -1

    def _extract_unit(self, value_str: str, item_code: str) -> str:
        """从数值中提取单位，处理漏填情况"""
        if not value_str:
            return ""

        unit_patterns = [
            (r'mg/g', 'mg/g'),
            (r'μg/g', 'μg/g'),
            (r'ng/g', 'ng/g'),
            (r'%', '%'),
            (r'pH', 'pH'),
            (r'CFU/g', 'CFU/g'),
            (r'CFU/mL', 'CFU/mL'),
            (r'mPa·s', 'mPa·s'),
            (r'mPa\.s', 'mPa·s'),
            (r'Pa·s', 'Pa·s'),
            (r'g/cm³', 'g/cm³'),
            (r'g/mL', 'g/mL'),
            (r'°C', '°C'),
        ]

        value_str = str(value_str)
        for pattern, unit in unit_patterns:
            if re.search(pattern, value_str, re.IGNORECASE):
                return unit

        if item_code == "PH":
            return "pH"

        return ""

    def _check_qualification(self, value: Optional[float], spec: str) -> Optional[bool]:
        """根据标准判断是否合格"""
        if value is None or not spec:
            return None

        spec = spec.strip()

        match = re.match(r'([\d.]+)\s*[~～\-]\s*([\d.]+)', spec)
        if match:
            low = float(match.group(1))
            high = float(match.group(2))
            return low <= value <= high

        match = re.match(r'≥\s*([\d.]+)', spec)
        if match:
            return value >= float(match.group(1))

        match = re.match(r'≤\s*([\d.]+)', spec)
        if match:
            return value <= float(match.group(1))

        match = re.match(r'>\s*([\d.]+)', spec)
        if match:
            return value > float(match.group(1))

        match = re.match(r'<\s*([\d.]+)', spec)
        if match:
            return value < float(match.group(1))

        match = re.match(r'([\d.]+)\s*±\s*([\d.]+)', spec)
        if match:
            center = float(match.group(1))
            tol = float(match.group(2))
            return center - tol <= value <= center + tol

        return None

    def _get_cell_value(self, row: List[str], col_idx: Optional[int], default: str = "") -> str:
        """安全获取单元格值"""
        if col_idx is None or col_idx < 0 or col_idx >= len(row):
            return default
        return str(row[col_idx]).strip()

    def _create_default_batch(self, batch_no: str, operator: str, source_file: str):
        """创建默认批次信息"""
        batch = BatchInfo(
            batch_no=batch_no,
            product_name="未命名产品",
            product_code="",
            specification="",
            manufacture_date="",
            expiry_date_candidate="",
            manufacturer="",
            storage_condition=StorageCondition.ROOM_TEMP,
            inspector=operator,
            remarks="系统自动创建，信息待补充"
        )
        self.batch_manager.add_batch(batch, operator, source_file)

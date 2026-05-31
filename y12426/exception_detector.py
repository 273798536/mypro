#!/usr/bin/env python3
from typing import Dict, List, Any, Optional, Tuple
from collections import defaultdict
from datetime import datetime
import uuid


class ExceptionDetector:
    def __init__(self, base_client=None):
        self.client = base_client
        self.exceptions = []

    def detect_duplicate_print_numbers(self, inventory_records: List[Dict]) -> Tuple[List[Dict], List[Dict]]:
        print_no_map = defaultdict(list)
        for idx, rec in enumerate(inventory_records):
            print_no = rec.get("版画编号", "")
            if print_no:
                print_no_map[print_no].append((idx, rec))

        normal_records = []
        duplicate_records = []

        for print_no, entries in print_no_map.items():
            if len(entries) > 1:
                for idx, rec in entries:
                    rec = rec.copy()
                    rec["是否编号重复"] = True
                    duplicate_records.append(rec)
                    self._add_exception(
                        exception_type="编号重复",
                        exception_level="高",
                        print_no=print_no,
                        table_name="版画库存表",
                        description=f"版画编号 {print_no} 出现 {len(entries)} 次重复，请核实后处理",
                        record_id=rec.get("_record_id", ""),
                        extra_data={"duplicate_count": len(entries), "positions": [e[0] for e in entries]}
                    )
            else:
                for idx, rec in entries:
                    rec = rec.copy()
                    rec["是否编号重复"] = False
                    normal_records.append(rec)

        return normal_records, duplicate_records

    def detect_cross_exhibition_returns(self, return_records: List[Dict], sales_orders: List[Dict]) -> List[Dict]:
        sales_order_map = {so.get("版画编号"): so for so in sales_orders}

        for rec in return_records:
            print_no = rec.get("版画编号", "")
            original_exhibition = rec.get("原销售展会", "")
            return_exhibition = rec.get("退货展会", "")

            if not original_exhibition and print_no in sales_order_map:
                original_exhibition = sales_order_map[print_no].get("展会名称", "")
                rec["原销售展会"] = original_exhibition

            if original_exhibition and return_exhibition and original_exhibition != return_exhibition:
                rec["是否跨展退货"] = True
                self._add_exception(
                    exception_type="退货跨展",
                    exception_level="中",
                    print_no=print_no,
                    table_name="退货记录表",
                    description=f"版画 {print_no} 跨展退货：原销售展会「{original_exhibition}」→ 退货展会「{return_exhibition}」，请财务复核",
                    record_id=rec.get("_record_id", ""),
                    extra_data={
                        "original_exhibition": original_exhibition,
                        "return_exhibition": return_exhibition
                    }
                )
            else:
                rec["是否跨展退货"] = False

        return return_records

    def detect_contract_ratio_errors(self, sales_orders: List[Dict], artist_contracts: List[Dict]) -> List[Dict]:
        contract_map = {}
        for contract in artist_contracts:
            artist_name = contract.get("艺术家姓名", "")
            if artist_name:
                contract_map[artist_name] = contract

        for so in sales_orders:
            artist_name = so.get("艺术家姓名", "")
            order_ratio = so.get("合同分润比例", 0)
            contract_ratio = 0

            if artist_name in contract_map:
                contract_ratio = contract_map[artist_name].get("分润比例", 0)
                contract_status = contract_map[artist_name].get("合同状态", "")

                if contract_status != "生效中":
                    self._add_exception(
                        exception_type="合同比例错误",
                        exception_level="高",
                        print_no=so.get("版画编号", ""),
                        table_name="销售订单表",
                        description=f"艺术家 {artist_name} 的合同状态为「{contract_status}」，非生效中状态，订单分润需复核",
                        record_id=so.get("_record_id", ""),
                        extra_data={
                            "artist_name": artist_name,
                            "contract_status": contract_status,
                            "order_ratio": order_ratio
                        }
                    )

            if contract_ratio > 0 and abs(order_ratio - contract_ratio) > 0.001:
                so["_ratio_abnormal"] = True
                self._add_exception(
                    exception_type="合同比例错误",
                    exception_level="高",
                    print_no=so.get("版画编号", ""),
                    table_name="销售订单表",
                    description=f"版画 {so.get('版画编号')} 分润比例异常：订单比例 {order_ratio*100:.1f}% ≠ 合同比例 {contract_ratio*100:.1f}%，请财务复核",
                    record_id=so.get("_record_id", ""),
                    extra_data={
                        "order_ratio": order_ratio,
                        "contract_ratio": contract_ratio,
                        "artist_name": artist_name
                    }
                )
            else:
                so["_ratio_abnormal"] = False

        return sales_orders

    def detect_inventory_status_abnormalities(self, inventory_records: List[Dict], sales_orders: List[Dict], return_records: List[Dict]) -> List[Dict]:
        sold_print_nos = {so.get("版画编号"): so for so in sales_orders if so.get("订单状态") in ["已确认", "已发货", "已完成"]}
        returned_print_nos = {ret.get("版画编号"): ret for ret in return_records if ret.get("退货状态") in ["已审核", "已入库"]}

        for rec in inventory_records:
            print_no = rec.get("版画编号", "")
            status = rec.get("库存状态", "")

            if status == "已售出" and print_no not in sold_print_nos:
                self._add_exception(
                    exception_type="库存状态异常",
                    exception_level="中",
                    print_no=print_no,
                    table_name="版画库存表",
                    description=f"版画 {print_no} 库存状态为「已售出」，但无对应销售订单记录",
                    record_id=rec.get("_record_id", ""),
                    extra_data={"current_status": status}
                )

            if print_no in sold_print_nos and print_no not in returned_print_nos and status not in ["已售出", "已锁定"]:
                self._add_exception(
                    exception_type="库存状态异常",
                    exception_level="中",
                    print_no=print_no,
                    table_name="版画库存表",
                    description=f"版画 {print_no} 已有销售订单，但库存状态为「{status}」，应为「已售出」",
                    record_id=rec.get("_record_id", ""),
                    extra_data={"current_status": status, "should_be": "已售出"}
                )

            if print_no in returned_print_nos and status not in ["已退货", "在库"]:
                self._add_exception(
                    exception_type="库存状态异常",
                    exception_level="中",
                    print_no=print_no,
                    table_name="版画库存表",
                    description=f"版画 {print_no} 已有退货记录，但库存状态为「{status}」，应为「已退货」",
                    record_id=rec.get("_record_id", ""),
                    extra_data={"current_status": status, "should_be": "已退货"}
                )

        return inventory_records

    def detect_data_format_errors(self, records: List[Dict], required_fields: List[str], table_name: str) -> List[Dict]:
        for rec in records:
            for field in required_fields:
                val = rec.get(field)
                if val is None or val == "" or (isinstance(val, float) and val != val):
                    self._add_exception(
                        exception_type="数据格式错误",
                        exception_level="低",
                        print_no=rec.get("版画编号", ""),
                        table_name=table_name,
                        description=f"{table_name} 中字段「{field}」为空或格式错误",
                        record_id=rec.get("_record_id", ""),
                        extra_data={"field": field, "value": val}
                    )
        return records

    def run_all_detections(self, inventory_records: List[Dict], sales_orders: List[Dict], 
                           return_records: List[Dict], artist_contracts: List[Dict]) -> Dict[str, Any]:
        print("开始异常检测...")

        inventory_required = ["版画编号", "作品名称"]
        sales_required = ["版画编号", "销售金额", "订单日期"]
        return_required = ["版画编号", "退货日期"]

        self.detect_data_format_errors(inventory_records, inventory_required, "版画库存表")
        self.detect_data_format_errors(sales_orders, sales_required, "销售订单表")
        self.detect_data_format_errors(return_records, return_required, "退货记录表")

        normal_inventory, duplicate_inventory = self.detect_duplicate_print_numbers(inventory_records)
        self.detect_inventory_status_abnormalities(inventory_records, sales_orders, return_records)
        self.detect_contract_ratio_errors(sales_orders, artist_contracts)
        self.detect_cross_exhibition_returns(return_records, sales_orders)

        print(f"异常检测完成，共发现 {len(self.exceptions)} 条异常")
        for exc in self.exceptions:
            print(f"  [{exc['异常类型']}] {exc['异常等级']}: {exc['异常描述']}")

        return {
            "normal_inventory": normal_inventory,
            "duplicate_inventory": duplicate_inventory,
            "sales_orders": sales_orders,
            "return_records": return_records,
            "exceptions": self.exceptions
        }

    def _add_exception(self, exception_type: str, exception_level: str, print_no: str, 
                       table_name: str, description: str, record_id: str = "", 
                       extra_data: Optional[Dict] = None):
        exception = {
            "预警日期": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "异常类型": exception_type,
            "异常等级": exception_level,
            "关联版画编号": print_no,
            "关联表名": table_name,
            "关联记录ID": record_id,
            "异常描述": description,
            "处理状态": "待处理",
            "备注": str(extra_data) if extra_data else "",
            "_exception_id": str(uuid.uuid4())
        }
        self.exceptions.append(exception)

    def get_exceptions(self) -> List[Dict]:
        return self.exceptions

    def get_exceptions_by_type(self, exception_type: str) -> List[Dict]:
        return [e for e in self.exceptions if e.get("异常类型") == exception_type]

    def get_unprocessed_exceptions(self) -> List[Dict]:
        return [e for e in self.exceptions if e.get("处理状态") == "待处理"]

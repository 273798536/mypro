#!/usr/bin/env python3
from typing import Dict, List, Any, Optional
from datetime import datetime
import time
from base_client import BaseClient
from config import TABLES, FIELD_NAMES


class DataSyncer:
    def __init__(self, client: BaseClient):
        self.client = client
        self.record_ids = {
            "artist_contract": {},
            "exhibition": {},
            "inventory": {},
            "sales_order": {},
            "return_record": {},
            "profit_share": {},
            "exception": {},
        }

    def sync_artist_contracts(self, contracts: List[Dict]) -> Dict[str, str]:
        print(f"同步 {len(contracts)} 条艺术家合同...")
        table_id = TABLES["artist_contract"]
        fields = FIELD_NAMES["artist_contract"]
        results = {}

        for idx, contract in enumerate(contracts):
            record_data = {
                fields["name"]: contract.get("艺术家姓名", ""),
                fields["contract_no"]: contract.get("合同编号", ""),
                fields["start_date"]: contract.get("合同生效日期", ""),
                fields["end_date"]: contract.get("合同到期日期", ""),
                fields["profit_ratio"]: contract.get("分润比例", 0),
                fields["status"]: contract.get("合同状态", "生效中"),
                fields["notes"]: contract.get("备注", ""),
            }

            try:
                result = self.client.upsert_record(table_id, record_data)
                record_id = result.get("data", {}).get("record", {}).get("id", "")
                results[contract.get("艺术家姓名", "")] = record_id
                contract["_record_id"] = record_id
                print(f"  ✓ {contract.get('艺术家姓名')}: {record_id}")
            except Exception as e:
                print(f"  ✗ {contract.get('艺术家姓名')}: {e}")

            if idx < len(contracts) - 1:
                time.sleep(0.5)

        self.record_ids["artist_contract"] = results
        return results

    def sync_exhibitions(self, exhibitions: List[Dict]) -> Dict[str, str]:
        print(f"同步 {len(exhibitions)} 条展会信息...")
        table_id = TABLES["exhibition"]
        fields = FIELD_NAMES["exhibition"]
        results = {}

        for idx, exhibition in enumerate(exhibitions):
            record_data = {
                fields["name"]: exhibition.get("展会名称", ""),
                fields["location"]: exhibition.get("展会地点", ""),
                fields["start_date"]: exhibition.get("开始日期", ""),
                fields["end_date"]: exhibition.get("结束日期", ""),
                fields["status"]: exhibition.get("展会状态", "进行中"),
            }

            try:
                result = self.client.upsert_record(table_id, record_data)
                record_id = result.get("data", {}).get("record", {}).get("id", "")
                results[exhibition.get("展会名称", "")] = record_id
                exhibition["_record_id"] = record_id
                print(f"  ✓ {exhibition.get('展会名称')}: {record_id}")
            except Exception as e:
                print(f"  ✗ {exhibition.get('展会名称')}: {e}")

            if idx < len(exhibitions) - 1:
                time.sleep(0.5)

        self.record_ids["exhibition"] = results
        return results

    def sync_inventory(self, inventory_records: List[Dict], artist_ids: Dict[str, str], 
                       exhibition_ids: Dict[str, str]) -> Dict[str, str]:
        print(f"同步 {len(inventory_records)} 条版画库存...")
        table_id = TABLES["inventory"]
        fields = FIELD_NAMES["inventory"]
        results = {}

        for idx, inv in enumerate(inventory_records):
            artist_name = inv.get("艺术家姓名", "")
            artist_link = [{"id": artist_ids[artist_name]}] if artist_name in artist_ids else []
            
            exhibition_name = inv.get("锁定展会名称", "")
            exhibition_link = [{"id": exhibition_ids[exhibition_name]}] if exhibition_name in exhibition_ids else []

            record_data = {
                fields["print_no"]: inv.get("版画编号", ""),
                fields["title"]: inv.get("作品名称", ""),
                fields["artist"]: artist_link,
                fields["edition"]: inv.get("版数", ""),
                fields["material"]: inv.get("材质", ""),
                fields["size"]: inv.get("尺寸", ""),
                fields["year"]: inv.get("创作年份"),
                fields["inbound_date"]: inv.get("入库日期", ""),
                fields["status"]: inv.get("库存状态", "在库"),
                fields["locked_exhibition"]: exhibition_link,
                fields["locked_time"]: inv.get("锁定时间", ""),
                fields["value"]: inv.get("当前价值", 0),
                fields["source"]: inv.get("数据来源", "批量导入"),
                fields["has_duplicate"]: inv.get("是否编号重复", False),
                fields["notes"]: inv.get("备注", ""),
            }

            try:
                result = self.client.upsert_record(table_id, record_data)
                record_id = result.get("data", {}).get("record", {}).get("id", "")
                results[inv.get("版画编号", "")] = record_id
                inv["_record_id"] = record_id
                status = "⚠️重复" if inv.get("是否编号重复") else "✓"
                print(f"  {status} {inv.get('版画编号')}: {record_id}")
            except Exception as e:
                print(f"  ✗ {inv.get('版画编号')}: {e}")

            if idx < len(inventory_records) - 1:
                time.sleep(0.5)

        self.record_ids["inventory"] = results
        return results

    def sync_sales_orders(self, sales_orders: List[Dict], exhibition_ids: Dict[str, str],
                          inventory_ids: Dict[str, str]) -> Dict[str, str]:
        print(f"同步 {len(sales_orders)} 条销售订单...")
        table_id = TABLES["sales_order"]
        fields = FIELD_NAMES["sales_order"]
        results = {}

        for idx, so in enumerate(sales_orders):
            exhibition_name = so.get("展会名称", "")
            exhibition_link = [{"id": exhibition_ids[exhibition_name]}] if exhibition_name in exhibition_ids else []
            
            print_no = so.get("版画编号", "")
            inventory_link = [{"id": inventory_ids[print_no]}] if print_no in inventory_ids else []

            record_data = {
                fields["order_no"]: so.get("订单编号", ""),
                fields["order_date"]: so.get("订单日期", ""),
                fields["exhibition"]: exhibition_link,
                fields["customer"]: so.get("客户名称", ""),
                fields["contact"]: so.get("联系方式", ""),
                fields["inventory"]: inventory_link,
                fields["print_no"]: print_no,
                fields["amount"]: so.get("销售金额", 0),
                fields["payment_status"]: so.get("收款状态", "未收款"),
                fields["order_status"]: so.get("订单状态", "待确认"),
                fields["contract_ratio"]: so.get("合同分润比例", 0),
                fields["source"]: so.get("数据来源", "手工录入"),
                fields["notes"]: so.get("备注", ""),
            }

            try:
                result = self.client.upsert_record(table_id, record_data)
                record_id = result.get("data", {}).get("record", {}).get("id", "")
                results[so.get("订单编号", "")] = record_id
                so["_record_id"] = record_id
                status = "⚠️比例异常" if so.get("_ratio_abnormal") else "✓"
                print(f"  {status} {so.get('订单编号')}: {record_id}")
            except Exception as e:
                print(f"  ✗ {so.get('订单编号')}: {e}")

            if idx < len(sales_orders) - 1:
                time.sleep(0.5)

        self.record_ids["sales_order"] = results
        return results

    def sync_return_records(self, return_records: List[Dict], sales_order_ids: Dict[str, str],
                            inventory_ids: Dict[str, str], exhibition_ids: Dict[str, str]) -> Dict[str, str]:
        print(f"同步 {len(return_records)} 条退货记录...")
        table_id = TABLES["return_record"]
        fields = FIELD_NAMES["return_record"]
        results = {}

        for idx, ret in enumerate(return_records):
            order_no = ret.get("订单编号", "")
            sales_order_link = [{"id": sales_order_ids[order_no]}] if order_no in sales_order_ids else []
            
            print_no = ret.get("版画编号", "")
            inventory_link = [{"id": inventory_ids[print_no]}] if print_no in inventory_ids else []
            
            original_exhibition = ret.get("原销售展会", "")
            original_link = [{"id": exhibition_ids[original_exhibition]}] if original_exhibition in exhibition_ids else []
            
            return_exhibition = ret.get("退货展会", "")
            return_link = [{"id": exhibition_ids[return_exhibition]}] if return_exhibition in exhibition_ids else []

            record_data = {
                fields["return_no"]: ret.get("退货编号", ""),
                fields["return_date"]: ret.get("退货日期", ""),
                fields["sales_order"]: sales_order_link,
                fields["inventory"]: inventory_link,
                fields["print_no"]: print_no,
                fields["original_exhibition"]: original_link,
                fields["return_exhibition"]: return_link,
                fields["is_cross_exhibition"]: ret.get("是否跨展退货", False),
                fields["reason"]: ret.get("退货原因", ""),
                fields["return_amount"]: ret.get("退货金额", 0),
                fields["refund_status"]: ret.get("退款状态", "待退款"),
                fields["return_status"]: ret.get("退货状态", "待审核"),
                fields["notes"]: ret.get("备注", ""),
            }

            try:
                result = self.client.upsert_record(table_id, record_data)
                record_id = result.get("data", {}).get("record", {}).get("id", "")
                results[ret.get("退货编号", "")] = record_id
                ret["_record_id"] = record_id
                status = "⚠️跨展" if ret.get("是否跨展退货") else "✓"
                print(f"  {status} {ret.get('退货编号')}: {record_id}")
            except Exception as e:
                print(f"  ✗ {ret.get('退货编号')}: {e}")

            if idx < len(return_records) - 1:
                time.sleep(0.5)

        self.record_ids["return_record"] = results
        return results

    def sync_profit_share(self, profit_shares: List[Dict], artist_ids: Dict[str, str],
                          sales_order_ids: Dict[str, str], inventory_ids: Dict[str, str],
                          return_ids: Dict[str, str]) -> Dict[str, str]:
        print(f"同步 {len(profit_shares)} 条分润明细...")
        table_id = TABLES["profit_share"]
        fields = FIELD_NAMES["profit_share"]
        results = {}

        for idx, ps in enumerate(profit_shares):
            artist_name = ps.get("艺术家姓名", "")
            artist_link = [{"id": artist_ids[artist_name]}] if artist_name in artist_ids else []
            
            order_no = ps.get("订单编号", "")
            sales_order_link = [{"id": sales_order_ids[order_no]}] if order_no in sales_order_ids else []
            
            print_no = ps.get("版画编号", "")
            inventory_link = [{"id": inventory_ids[print_no]}] if print_no in inventory_ids else []
            
            return_no = ps.get("退货编号", "")
            return_link = [{"id": return_ids[return_no]}] if return_no in return_ids else []

            record_data = {
                fields["calc_date"]: ps.get("分润计算日期", ""),
                fields["artist"]: artist_link,
                fields["sales_order"]: sales_order_link,
                fields["inventory"]: inventory_link,
                fields["print_no"]: print_no,
                fields["sales_amount"]: ps.get("销售金额", 0),
                fields["contract_ratio"]: ps.get("合同分润比例", 0),
                fields["actual_ratio"]: ps.get("实际分润比例", 0),
                fields["ratio_abnormal"]: ps.get("比例是否异常", False),
                fields["artist_share"]: ps.get("艺术家分润金额", 0),
                fields["gallery_share"]: ps.get("画廊分润金额", 0),
                fields["status"]: ps.get("分润状态", "待确认"),
                fields["has_return"]: ps.get("是否有退货关联", False),
                fields["return_record"]: return_link,
                fields["trace_id"]: ps.get("追溯ID", ""),
                fields["notes"]: ps.get("备注", ""),
            }

            try:
                result = self.client.upsert_record(table_id, record_data)
                record_id = result.get("data", {}).get("record", {}).get("id", "")
                results[ps.get("追溯ID", "")] = record_id
                ps["_record_id"] = record_id
                status = "⚠️异常" if ps.get("比例是否异常") or ps.get("是否有退货关联") else "✓"
                print(f"  {status} {ps.get('追溯ID')}: 艺术家¥{ps.get('艺术家分润金额'):.2f} / 画廊¥{ps.get('画廊分润金额'):.2f}")
            except Exception as e:
                print(f"  ✗ {ps.get('追溯ID')}: {e}")

            if idx < len(profit_shares) - 1:
                time.sleep(0.5)

        self.record_ids["profit_share"] = results
        return results

    def sync_exceptions(self, exceptions: List[Dict]) -> Dict[str, str]:
        print(f"同步 {len(exceptions)} 条异常预警...")
        table_id = TABLES["exception"]
        fields = FIELD_NAMES["exception"]
        results = {}

        for idx, exc in enumerate(exceptions):
            record_data = {
                fields["exception_date"]: exc.get("预警日期", ""),
                fields["exception_type"]: exc.get("异常类型", ""),
                fields["exception_level"]: exc.get("异常等级", ""),
                fields["print_no"]: exc.get("关联版画编号", ""),
                fields["table_name"]: exc.get("关联表名", ""),
                fields["record_id"]: exc.get("关联记录ID", ""),
                fields["description"]: exc.get("异常描述", ""),
                fields["process_status"]: exc.get("处理状态", "待处理"),
                fields["process_result"]: exc.get("处理结果", ""),
                fields["process_date"]: exc.get("处理日期", ""),
                fields["notes"]: exc.get("备注", ""),
            }

            try:
                result = self.client.upsert_record(table_id, record_data)
                record_id = result.get("data", {}).get("record", {}).get("id", "")
                results[exc.get("_exception_id", "")] = record_id
                exc["_record_id"] = record_id
                level_icon = {"高": "🔴", "中": "🟠", "低": "🟡"}.get(exc.get("异常等级"), "⚪")
                print(f"  {level_icon} [{exc.get('异常类型')}] {exc.get('关联版画编号')}: {record_id}")
            except Exception as e:
                print(f"  ✗ {exc.get('_exception_id')}: {e}")

            if idx < len(exceptions) - 1:
                time.sleep(0.5)

        self.record_ids["exception"] = results
        return results

    def sync_all(self, artist_contracts: List[Dict], exhibitions: List[Dict],
                 inventory_records: List[Dict], sales_orders: List[Dict],
                 return_records: List[Dict], profit_shares: List[Dict],
                 exceptions: List[Dict]) -> Dict[str, Any]:
        print("\n" + "="*60)
        print("开始同步数据到飞书多维表格...")
        print("="*60 + "\n")

        artist_ids = self.sync_artist_contracts(artist_contracts)
        print()
        exhibition_ids = self.sync_exhibitions(exhibitions)
        print()
        inventory_ids = self.sync_inventory(inventory_records, artist_ids, exhibition_ids)
        print()
        sales_order_ids = self.sync_sales_orders(sales_orders, exhibition_ids, inventory_ids)
        print()
        return_ids = self.sync_return_records(return_records, sales_order_ids, inventory_ids, exhibition_ids)
        print()
        profit_share_ids = self.sync_profit_share(profit_shares, artist_ids, sales_order_ids, inventory_ids, return_ids)
        print()
        exception_ids = self.sync_exceptions(exceptions)

        print("\n" + "="*60)
        print("数据同步完成！")
        print("="*60 + "\n")

        return {
            "artist_contract_ids": artist_ids,
            "exhibition_ids": exhibition_ids,
            "inventory_ids": inventory_ids,
            "sales_order_ids": sales_order_ids,
            "return_ids": return_ids,
            "profit_share_ids": profit_share_ids,
            "exception_ids": exception_ids,
        }

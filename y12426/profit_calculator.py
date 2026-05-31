#!/usr/bin/env python3
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
import uuid


class ProfitShareCalculator:
    def __init__(self, base_client=None):
        self.client = base_client
        self.profit_share_records = []

    def calculate_profit_share(self, sales_order: Dict, artist_contract: Dict, 
                              inventory: Dict, has_return: bool = False,
                              return_record: Optional[Dict] = None) -> Dict:
        sales_amount = sales_order.get("销售金额", 0)
        order_ratio = sales_order.get("合同分润比例", 0)
        contract_ratio = artist_contract.get("分润比例", 0)

        actual_ratio = order_ratio if order_ratio > 0 else contract_ratio
        ratio_abnormal = False

        if contract_ratio > 0 and abs(order_ratio - contract_ratio) > 0.001:
            ratio_abnormal = True

        if has_return and return_record:
            return_amount = return_record.get("退货金额", 0)
            sales_amount = max(0, sales_amount - return_amount)

        artist_share = round(sales_amount * actual_ratio, 2)
        gallery_share = round(sales_amount - artist_share, 2)

        trace_id = self._generate_trace_id(sales_order, inventory, artist_contract)

        profit_share = {
            "分润计算日期": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "版画编号": sales_order.get("版画编号", ""),
            "销售金额": sales_amount,
            "合同分润比例": contract_ratio,
            "实际分润比例": actual_ratio,
            "比例是否异常": ratio_abnormal,
            "艺术家分润金额": artist_share,
            "画廊分润金额": gallery_share,
            "分润状态": "待审核" if ratio_abnormal else "待确认",
            "是否有退货关联": has_return,
            "追溯ID": trace_id,
            "备注": self._generate_notes(sales_order, artist_contract, ratio_abnormal, has_return),
            "_trace_data": {
                "sales_order": sales_order,
                "inventory": inventory,
                "artist_contract": artist_contract,
                "return_record": return_record,
                "calculation_steps": [
                    f"原始销售金额: {sales_order.get('销售金额', 0)}",
                    f"合同分润比例: {contract_ratio*100:.1f}%",
                    f"订单分润比例: {order_ratio*100:.1f}%",
                    f"实际使用比例: {actual_ratio*100:.1f}%" + (" (比例异常)" if ratio_abnormal else ""),
                    f"退货扣减: {return_record.get('退货金额', 0) if has_return else 0}",
                    f"有效销售金额: {sales_amount}",
                    f"艺术家分润: {sales_amount} × {actual_ratio} = {artist_share}",
                    f"画廊分润: {sales_amount} - {artist_share} = {gallery_share}"
                ]
            }
        }

        return profit_share

    def batch_calculate(self, sales_orders: List[Dict], artist_contracts: List[Dict],
                        inventories: List[Dict], return_records: List[Dict]) -> List[Dict]:
        print("开始批量分润计算...")

        contract_map = {c.get("艺术家姓名", ""): c for c in artist_contracts}
        inventory_map = {inv.get("版画编号", ""): inv for inv in inventories}
        return_map = {ret.get("版画编号", ""): ret for ret in return_records if ret.get("退货状态") in ["已审核", "已入库"]}

        for so in sales_orders:
            if so.get("订单状态") not in ["已确认", "已发货", "已完成"]:
                print(f"  跳过订单 {so.get('订单编号')}：状态为 {so.get('订单状态')}")
                continue

            if so.get("收款状态") != "已收款":
                print(f"  跳过订单 {so.get('订单编号')}：未收款")
                continue

            print_no = so.get("版画编号", "")
            artist_name = so.get("艺术家姓名", "") or inventory_map.get(print_no, {}).get("艺术家姓名", "")

            artist_contract = contract_map.get(artist_name, {})
            inventory = inventory_map.get(print_no, {})
            has_return = print_no in return_map
            return_record = return_map.get(print_no)

            if not artist_contract:
                print(f"  ⚠️ 订单 {so.get('订单编号')}：未找到艺术家 {artist_name} 的合同")
                continue

            try:
                profit_share = self.calculate_profit_share(
                    sales_order=so,
                    artist_contract=artist_contract,
                    inventory=inventory,
                    has_return=has_return,
                    return_record=return_record
                )
                profit_share["艺术家姓名"] = artist_name
                profit_share["订单编号"] = so.get("订单编号", "")
                self.profit_share_records.append(profit_share)
                print(f"  ✓ 订单 {so.get('订单编号')} 分润计算完成：艺术家 {artist_share['艺术家分润金额']:.2f} / 画廊 {artist_share['画廊分润金额']:.2f}")
            except Exception as e:
                print(f"  ✗ 订单 {so.get('订单编号')} 分润计算失败：{e}")

        print(f"分润计算完成，共生成 {len(self.profit_share_records)} 条分润记录")
        return self.profit_share_records

    def get_profit_share_by_artist(self, artist_name: str) -> List[Dict]:
        return [ps for ps in self.profit_share_records if ps.get("艺术家姓名") == artist_name]

    def get_profit_share_by_print_no(self, print_no: str) -> List[Dict]:
        return [ps for ps in self.profit_share_records if ps.get("版画编号") == print_no]

    def get_abnormal_profit_shares(self) -> List[Dict]:
        return [ps for ps in self.profit_share_records if ps.get("比例是否异常")]

    def get_total_summary(self) -> Dict[str, Any]:
        total_sales = sum(ps.get("销售金额", 0) for ps in self.profit_share_records)
        total_artist = sum(ps.get("艺术家分润金额", 0) for ps in self.profit_share_records)
        total_gallery = sum(ps.get("画廊分润金额", 0) for ps in self.profit_share_records)
        abnormal_count = len(self.get_abnormal_profit_shares())
        return_count = len([ps for ps in self.profit_share_records if ps.get("是否有退货关联")])

        artist_summary = {}
        for ps in self.profit_share_records:
            name = ps.get("艺术家姓名", "未知")
            if name not in artist_summary:
                artist_summary[name] = {"count": 0, "artist_share": 0, "gallery_share": 0, "sales_amount": 0}
            artist_summary[name]["count"] += 1
            artist_summary[name]["artist_share"] += ps.get("艺术家分润金额", 0)
            artist_summary[name]["gallery_share"] += ps.get("画廊分润金额", 0)
            artist_summary[name]["sales_amount"] += ps.get("销售金额", 0)

        return {
            "total_records": len(self.profit_share_records),
            "total_sales_amount": round(total_sales, 2),
            "total_artist_share": round(total_artist, 2),
            "total_gallery_share": round(total_gallery, 2),
            "abnormal_count": abnormal_count,
            "return_count": return_count,
            "artist_summary": artist_summary
        }

    def _generate_trace_id(self, sales_order: Dict, inventory: Dict, artist_contract: Dict) -> str:
        parts = [
            sales_order.get("版画编号", ""),
            sales_order.get("订单编号", ""),
            artist_contract.get("合同编号", ""),
            datetime.now().strftime("%Y%m%d%H%M%S")
        ]
        return "TRACE-" + "-".join(p for p in parts if p)

    def _generate_notes(self, sales_order: Dict, artist_contract: Dict, 
                        ratio_abnormal: bool, has_return: bool) -> str:
        notes = []
        if ratio_abnormal:
            notes.append("⚠️分润比例与合同不一致，需财务复核")
        if has_return:
            notes.append("📦已扣除退货金额")
        if artist_contract.get("合同状态") != "生效中":
            notes.append(f"⚠️合同状态为「{artist_contract.get('合同状态')}」")
        return "; ".join(notes)

    def trace_profit_share(self, trace_id: str) -> Optional[Dict]:
        for ps in self.profit_share_records:
            if ps.get("追溯ID") == trace_id:
                return ps.get("_trace_data")
        return None

    def print_calculation_steps(self, trace_id: str):
        trace_data = self.trace_profit_share(trace_id)
        if not trace_data:
            print(f"未找到追溯ID: {trace_id}")
            return

        print(f"\n{'='*60}")
        print(f"分润追溯详情 - {trace_id}")
        print(f"{'='*60}")
        print(f"\n📇 库存锁定信息:")
        inv = trace_data.get("inventory", {})
        print(f"  版画编号: {inv.get('版画编号')}")
        print(f"  作品名称: {inv.get('作品名称')}")
        print(f"  版数: {inv.get('版数')}")
        print(f"  库存状态: {inv.get('库存状态')}")
        print(f"  入库日期: {inv.get('入库日期')}")

        print(f"\n👨‍🎨 艺术家合同:")
        contract = trace_data.get("artist_contract", {})
        print(f"  艺术家: {contract.get('艺术家姓名')}")
        print(f"  合同编号: {contract.get('合同编号')}")
        print(f"  合同分润比例: {contract.get('分润比例', 0)*100:.1f}%")
        print(f"  合同状态: {contract.get('合同状态')}")
        print(f"  有效期: {contract.get('合同生效日期')} ~ {contract.get('合同到期日期')}")

        print(f"\n📝 销售订单:")
        so = trace_data.get("sales_order", {})
        print(f"  订单编号: {so.get('订单编号')}")
        print(f"  订单日期: {so.get('订单日期')}")
        print(f"  销售金额: ¥{so.get('销售金额', 0):.2f}")
        print(f"  订单分润比例: {so.get('合同分润比例', 0)*100:.1f}%")
        print(f"  客户: {so.get('客户名称')}")

        ret = trace_data.get("return_record")
        if ret:
            print(f"\n🔄 退货记录:")
            print(f"  退货编号: {ret.get('退货编号')}")
            print(f"  退货日期: {ret.get('退货日期')}")
            print(f"  退货金额: ¥{ret.get('退货金额', 0):.2f}")
            print(f"  退货原因: {ret.get('退货原因')}")

        print(f"\n🧮 计算步骤:")
        for step in trace_data.get("calculation_steps", []):
            print(f"  → {step}")
        print(f"\n{'='*60}\n")

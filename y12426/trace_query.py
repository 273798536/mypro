#!/usr/bin/env python3
import sys
import json
import pickle
import os
from typing import Dict, List, Any, Optional

from profit_calculator import ProfitShareCalculator
from base_client import BaseClient
from config import TABLES, FIELD_NAMES


CACHE_FILE = ".profit_share_cache.pkl"


class TraceQuery:
    def __init__(self):
        self.client = BaseClient()
        self.calculator = ProfitShareCalculator(self.client)

    def query_by_trace_id(self, trace_id: str, use_online: bool = False) -> Optional[Dict]:
        print(f"\n🔍 查询追溯ID: {trace_id}")
        print("=" * 70)

        trace_data = None

        if not use_online and os.path.exists(CACHE_FILE):
            try:
                with open(CACHE_FILE, 'rb') as f:
                    cache = pickle.load(f)
                if trace_id in cache:
                    print("📦 从本地缓存获取数据...")
                    trace_data = cache[trace_id]
            except Exception as e:
                print(f"⚠️  缓存读取失败: {e}")

        if trace_data is None and use_online:
            print("🌐 从飞书多维表格查询...")
            trace_data = self._query_online(trace_id)

        if trace_data is None:
            print(f"❌ 未找到追溯ID: {trace_id}")
            print(f"\n💡 提示: 如果您刚运行过 main.py，可以尝试:")
            print(f"   1. 检查追溯ID是否正确")
            print(f"   2. 使用 --online 参数从飞书查询")
            print(f"   3. 重新运行 main.py 生成缓存")
            return None

        self._print_trace_detail(trace_id, trace_data)
        return trace_data

    def _query_online(self, trace_id: str) -> Optional[Dict]:
        try:
            query = {
                "table_id": TABLES["profit_share"],
                "filter": {
                    "conjunction": "and",
                    "conditions": [
                        {"field_name": "追溯ID", "operator": "is", "value": trace_id}
                    ]
                },
                "limit": 1
            }
            result = self.client.data_query(query)
            records = result.get("data", {}).get("items", [])
            if not records:
                return None

            ps_record = records[0]["fields"]
            
            inventory_links = ps_record.get("关联版画", [])
            sales_order_links = ps_record.get("关联订单", [])
            return_links = ps_record.get("关联退货", [])
            artist_links = ps_record.get("艺术家", [])

            inventory_data = {}
            if inventory_links:
                inv_id = inventory_links[0]["id"]
                inv_result = self.client.get_record(TABLES["inventory"], inv_id)
                inventory_data = inv_result.get("data", {}).get("record", {}).get("fields", {})

            sales_data = {}
            if sales_order_links:
                so_id = sales_order_links[0]["id"]
                so_result = self.client.get_record(TABLES["sales_order"], so_id)
                sales_data = so_result.get("data", {}).get("record", {}).get("fields", {})

            return_data = None
            if return_links:
                ret_id = return_links[0]["id"]
                ret_result = self.client.get_record(TABLES["return_record"], ret_id)
                return_data = ret_result.get("data", {}).get("record", {}).get("fields", {})

            contract_data = {}
            if artist_links:
                artist_id = artist_links[0]["id"]
                contract_result = self.client.get_record(TABLES["artist_contract"], artist_id)
                contract_data = contract_result.get("data", {}).get("record", {}).get("fields", {})

            sales_amount = ps_record.get("销售金额", 0)
            actual_ratio = ps_record.get("实际分润比例", 0)
            artist_share = ps_record.get("艺术家分润金额", 0)
            gallery_share = ps_record.get("画廊分润金额", 0)
            contract_ratio = ps_record.get("合同分润比例", 0)
            order_ratio = sales_data.get("合同分润比例", 0)
            return_amount = return_data.get("退货金额", 0) if return_data else 0
            original_sales = sales_amount + return_amount if return_data else sales_amount

            calculation_steps = [
                f"原始销售金额: {original_sales}",
                f"合同分润比例: {contract_ratio*100:.1f}%",
                f"订单分润比例: {order_ratio*100:.1f}%",
                f"实际使用比例: {actual_ratio*100:.1f}%" + (" (比例异常)" if ps_record.get("比例是否异常") else ""),
                f"退货扣减: {return_amount}",
                f"有效销售金额: {sales_amount}",
                f"艺术家分润: {sales_amount} × {actual_ratio} = {artist_share}",
                f"画廊分润: {sales_amount} - {artist_share} = {gallery_share}"
            ]

            return {
                "inventory": inventory_data,
                "sales_order": sales_data,
                "artist_contract": contract_data,
                "return_record": return_data,
                "calculation_steps": calculation_steps
            }

        except Exception as e:
            print(f"❌ 在线查询失败: {e}")
            return None

    def _print_trace_detail(self, trace_id: str, trace_data: Dict):
        print(f"\n📇 【链路1/3】库存锁定信息")
        print("-" * 50)
        inv = trace_data.get("inventory", {})
        inv_fields = FIELD_NAMES["inventory"]
        print(f"  版画编号: {inv.get(inv_fields['print_no'], '-')}")
        print(f"  作品名称: {inv.get(inv_fields['title'], '-')}")
        print(f"  艺术家: {inv.get('_artist_name', '-')}")
        print(f"  版数: {inv.get(inv_fields['edition'], '-')}")
        print(f"  材质: {inv.get(inv_fields['material'], '-')}")
        print(f"  尺寸: {inv.get(inv_fields['size'], '-')}")
        print(f"  创作年份: {inv.get(inv_fields['year'], '-')}")
        print(f"  入库日期: {inv.get(inv_fields['inbound_date'], '-')}")
        print(f"  库存状态: {inv.get(inv_fields['status'], '-')}")
        
        locked_exhibition = inv.get(inv_fields['locked_exhibition'])
        if locked_exhibition:
            if isinstance(locked_exhibition, list) and locked_exhibition:
                print(f"  锁定展会: {locked_exhibition[0].get('title', locked_exhibition[0].get('id', '-'))}")
            else:
                print(f"  锁定展会: {locked_exhibition}")
        print(f"  锁定时间: {inv.get(inv_fields['locked_time'], '-')}")
        print(f"  当前价值: ¥{inv.get(inv_fields['value'], 0):.2f}")
        print(f"  数据来源: {inv.get(inv_fields['source'], '-')}")
        print(f"  是否编号重复: {'⚠️ 是' if inv.get(inv_fields['has_duplicate']) else '否'}")
        
        if inv.get(inv_fields['has_duplicate']):
            print(f"  ⚠️  注意: 该版画编号存在重复，已从正常分润中排除")
        if inv.get(inv_fields['notes']):
            print(f"  备注: {inv.get(inv_fields['notes'])}")

        print(f"\n👨‍🎨 【链路2/3】合同与订单信息")
        print("-" * 50)
        
        contract = trace_data.get("artist_contract", {})
        contract_fields = FIELD_NAMES["artist_contract"]
        print(f"  ▶️ 艺术家合同:")
        print(f"     艺术家: {contract.get(contract_fields['name'], '-')}")
        print(f"     合同编号: {contract.get(contract_fields['contract_no'], '-')}")
        print(f"     合同分润比例: {contract.get(contract_fields['profit_ratio'], 0)*100:.1f}%")
        print(f"     合同状态: {contract.get(contract_fields['status'], '-')}")
        print(f"     有效期: {contract.get(contract_fields['start_date'], '-')} ~ {contract.get(contract_fields['end_date'], '-')}")
        
        if contract.get(contract_fields['status']) != "生效中":
            print(f"     ⚠️  注意: 合同非生效状态，分润需特别复核")

        so = trace_data.get("sales_order", {})
        so_fields = FIELD_NAMES["sales_order"]
        print(f"\n  ▶️ 销售订单:")
        print(f"     订单编号: {so.get(so_fields['order_no'], '-')}")
        print(f"     订单日期: {so.get(so_fields['order_date'], '-')}")
        print(f"     销售金额: ¥{so.get(so_fields['amount'], 0):.2f}")
        print(f"     订单分润比例: {so.get(so_fields['contract_ratio'], 0)*100:.1f}%")
        print(f"     收款状态: {so.get(so_fields['payment_status'], '-')}")
        print(f"     订单状态: {so.get(so_fields['order_status'], '-')}")
        print(f"     客户: {so.get(so_fields['customer'], '-')}")
        print(f"     联系方式: {so.get(so_fields['contact'], '-')}")
        print(f"     数据来源: {so.get(so_fields['source'], '-')}")

        exhibition = so.get(so_fields['exhibition'])
        if exhibition:
            if isinstance(exhibition, list) and exhibition:
                print(f"     所属展会: {exhibition[0].get('title', exhibition[0].get('id', '-'))}")
            else:
                print(f"     所属展会: {exhibition}")
        if so.get(so_fields['notes']):
            print(f"     备注: {so.get(so_fields['notes'])}")

        ret = trace_data.get("return_record")
        if ret:
            ret_fields = FIELD_NAMES["return_record"]
            print(f"\n  🔄 退货记录:")
            print(f"     退货编号: {ret.get(ret_fields['return_no'], '-')}")
            print(f"     退货日期: {ret.get(ret_fields['return_date'], '-')}")
            print(f"     退货金额: ¥{ret.get(ret_fields['return_amount'], 0):.2f}")
            print(f"     退货原因: {ret.get(ret_fields['reason'], '-')}")
            print(f"     退款状态: {ret.get(ret_fields['refund_status'], '-')}")
            print(f"     退货状态: {ret.get(ret_fields['return_status'], '-')}")
            print(f"     是否跨展退货: {'⚠️ 是' if ret.get(ret_fields['is_cross_exhibition']) else '否'}")
            
            if ret.get(ret_fields['is_cross_exhibition']):
                orig_exh = ret.get(ret_fields['original_exhibition'])
                ret_exh = ret.get(ret_fields['return_exhibition'])
                orig_name = orig_exh[0].get('title', orig_exh[0].get('id', '-')) if isinstance(orig_exh, list) and orig_exh else orig_exh
                ret_name = ret_exh[0].get('title', ret_exh[0].get('id', '-')) if isinstance(ret_exh, list) and ret_exh else ret_exh
                print(f"     ⚠️  跨展详情: 原销售「{orig_name}」→ 退货「{ret_name}」")
                print(f"     ⚠️  注意: 跨展退货需财务复核，原销售分润可能已发放")
            if ret.get(ret_fields['notes']):
                print(f"     备注: {ret.get(ret_fields['notes'])}")

        print(f"\n🧮 【链路3/3】分润计算步骤")
        print("-" * 50)
        steps = trace_data.get("calculation_steps", [])
        for i, step in enumerate(steps, 1):
            icon = "⚠️ " if "异常" in step else "→ "
            print(f"  {icon} 步骤{i}: {step}")

        print(f"\n{'='*70}")
        print(f"📌 追溯结论:")
        print(f"  追溯ID: {trace_id}")
        
        ratio_abnormal = "比例异常 ⚠️" if "异常" in str(steps) else "比例正常 ✓"
        has_return = "有退货 🔄" if ret else "无退货 ✓"
        duplicate = "编号重复 ⚠️" if inv.get(inv_fields['has_duplicate']) else "编号正常 ✓"
        
        print(f"  检查结果: {ratio_abnormal} | {has_return} | {duplicate}")
        print(f"\n💡 如需进一步核查:")
        print(f"  1. 检查异常预警表是否有相关记录")
        print(f"  2. 查看版画编号历史变更记录")
        print(f"  3. 核对原始销售合同和订单凭证")
        print(f"{'='*70}\n")

    @staticmethod
    def save_to_cache(profit_shares: List[Dict]):
        cache = {}
        for ps in profit_shares:
            trace_id = ps.get("追溯ID")
            trace_data = ps.get("_trace_data")
            if trace_id and trace_data:
                cache[trace_id] = trace_data
        
        try:
            with open(CACHE_FILE, 'wb') as f:
                pickle.dump(cache, f)
            print(f"💾 已保存 {len(cache)} 条追溯记录到缓存")
        except Exception as e:
            print(f"⚠️  缓存保存失败: {e}")


def main():
    if len(sys.argv) < 2:
        print("用法:")
        print("  python trace_query.py <追溯ID> [--online]")
        print("  python trace_query.py list                     # 列出缓存中的追溯ID")
        print("\n示例:")
        print("  python trace_query.py TRACE-ZXM-001-SO-20240405-001")
        print("  python trace_query.py TRACE-ZXM-001-SO-20240405-001 --online")
        print()
        return

    if sys.argv[1] == "list":
        if os.path.exists(CACHE_FILE):
            with open(CACHE_FILE, 'rb') as f:
                cache = pickle.load(f)
            print(f"📦 缓存中共 {len(cache)} 条追溯记录:")
            for trace_id in cache.keys():
                print(f"  - {trace_id}")
        else:
            print("❌ 未找到缓存文件，请先运行 main.py")
        return

    trace_id = sys.argv[1]
    use_online = "--online" in sys.argv

    query = TraceQuery()
    query.query_by_trace_id(trace_id, use_online=use_online)


if __name__ == "__main__":
    main()

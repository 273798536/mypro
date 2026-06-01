from typing import List, Dict, Any
from datetime import datetime
import csv
import io
from models import ShippingItem, RiskAlert, PreOrder, VersionItem, SleeveInventory


class ShippingExporter:
    def __init__(self):
        pass

    def generate_shipping_report(
        self,
        shipping_items: List[ShippingItem],
        risk_alerts: List[RiskAlert],
        pre_orders: List[PreOrder],
        version_list: List[VersionItem],
        sleeve_inventory: List[SleeveInventory],
        inventory_summary: Dict
    ) -> Dict[str, Any]:
        version_mismatch_risks = [r for r in risk_alerts if r.risk_type.value == "版本漏配"]
        signed_shortage_risks = [r for r in risk_alerts if r.risk_type.value == "签名缺货"]
        order_split_risks = [r for r in risk_alerts if r.risk_type.value == "订单拆分"]

        return {
            "report_info": {
                "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "report_title": "唱片库存压盘计划与发货表"
            },
            "summary": {
                **inventory_summary,
                "shipping_items_count": len(shipping_items),
                "total_shipping_qty": sum(s.quantity for s in shipping_items),
                "risk_count": len(risk_alerts),
                "version_mismatch_count": len(version_mismatch_risks),
                "signed_shortage_count": len(signed_shortage_risks),
                "order_split_count": len(order_split_risks)
            },
            "shipping_table": [s.to_dict(include_source=True) for s in shipping_items],
            "risk_analysis": {
                "version_mismatch": [r.to_dict() for r in version_mismatch_risks],
                "signed_shortage": [r.to_dict() for r in signed_shortage_risks],
                "order_split": [r.to_dict() for r in order_split_risks]
            },
            "source_data": {
                "pre_orders": [o.to_dict() for o in pre_orders],
                "version_list": [v.to_dict() for v in version_list],
                "sleeve_inventory": [s.to_dict() for s in sleeve_inventory]
            },
            "mapping_details": self._generate_mapping_details(
                shipping_items, pre_orders, version_list, sleeve_inventory
            )
        }

    def _generate_mapping_details(
        self,
        shipping_items: List[ShippingItem],
        pre_orders: List[PreOrder],
        version_list: List[VersionItem],
        sleeve_inventory: List[SleeveInventory]
    ) -> List[Dict]:
        mapping_details = []

        for item in shipping_items:
            order = next((o for o in pre_orders if o.order_id == item.order_id), None)
            version = next((v for v in version_list
                          if v.album_name == item.album_name
                          and v.version == item.version
                          and v.is_signed == item.is_signed), None)
            sleeve = next((s for s in sleeve_inventory
                         if s.album_name == item.album_name
                         and s.version == item.version), None)

            mapping_details.append({
                "shipping_id": item.shipping_id,
                "order_mapping": {
                    "order_id": item.order_id,
                    "exists": order is not None,
                    "order_qty": order.quantity if order else 0,
                    "shipped_qty": item.quantity,
                    "remaining_qty": (order.quantity - item.quantity) if order else 0
                },
                "version_mapping": {
                    "album_name": item.album_name,
                    "version": item.version,
                    "is_signed": item.is_signed,
                    "exists": version is not None,
                    "pressing_qty": version.pressing_quantity if version else 0
                },
                "sleeve_mapping": {
                    "exists": sleeve is not None,
                    "sleeve_qty": sleeve.quantity if sleeve else 0,
                    "location": sleeve.location if sleeve else ""
                }
            })

        return mapping_details

    def export_to_csv(self, report: Dict[str, Any], filepath: str):
        shipping_items = report["shipping_table"]

        with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)

            writer.writerow(["=== 唱片库存压盘计划与发货表 ==="])
            writer.writerow(["生成时间", report["report_info"]["generated_at"]])
            writer.writerow([])

            writer.writerow(["=== 汇总信息 ==="])
            for key, value in report["summary"].items():
                writer.writerow([key, value])
            writer.writerow([])

            writer.writerow(["=== 发货表明细 ==="])
            if shipping_items:
                headers = list(shipping_items[0].keys())
                headers.remove("来源明细")
                writer.writerow(headers)
                for item in shipping_items:
                    row = [item.get(h, '') for h in headers]
                    writer.writerow(row)
            writer.writerow([])

            writer.writerow(["=== 风险分析 ==="])
            for risk_type, risks in report["risk_analysis"].items():
                if risks:
                    writer.writerow([f"--- {risk_type} ---"])
                    headers = list(risks[0].keys())
                    writer.writerow(headers)
                    for risk in risks:
                        row = [risk.get(h, '') for h in headers]
                        writer.writerow(row)
            writer.writerow([])

            writer.writerow(["=== 预售订单明细 ==="])
            if report["source_data"]["pre_orders"]:
                headers = list(report["source_data"]["pre_orders"][0].keys())
                writer.writerow(headers)
                for order in report["source_data"]["pre_orders"]:
                    row = [order.get(h, '') for h in headers]
                    writer.writerow(row)
            writer.writerow([])

            writer.writerow(["=== 版本清单明细 ==="])
            if report["source_data"]["version_list"]:
                headers = list(report["source_data"]["version_list"][0].keys())
                writer.writerow(headers)
                for version in report["source_data"]["version_list"]:
                    row = [version.get(h, '') for h in headers]
                    writer.writerow(row)
            writer.writerow([])

            writer.writerow(["=== 封套库存明细 ==="])
            if report["source_data"]["sleeve_inventory"]:
                headers = list(report["source_data"]["sleeve_inventory"][0].keys())
                writer.writerow(headers)
                for sleeve in report["source_data"]["sleeve_inventory"]:
                    row = [sleeve.get(h, '') for h in headers]
                    writer.writerow(row)

    def export_detailed_report(self, report: Dict[str, Any], filepath: str):
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write("=" * 80 + "\n")
            f.write("  唱片库存压盘计划与发货表 - 详细报告\n")
            f.write("=" * 80 + "\n\n")
            f.write(f"生成时间: {report['report_info']['generated_at']}\n\n")

            f.write("-" * 80 + "\n")
            f.write("一、汇总信息\n")
            f.write("-" * 80 + "\n")
            for key, value in report["summary"].items():
                f.write(f"  {key}: {value}\n")
            f.write("\n")

            f.write("-" * 80 + "\n")
            f.write("二、发货表明细\n")
            f.write("-" * 80 + "\n")
            for i, item in enumerate(report["shipping_table"], 1):
                f.write(f"\n  发货项 {i}:\n")
                for key, value in item.items():
                    if key != "来源明细":
                        f.write(f"    {key}: {value}\n")
                if "来源明细" in item and item["来源明细"]:
                    f.write(f"    来源明细:\n")
                    for src_key, src_val in item["来源明细"].items():
                        f.write(f"      {src_key}: {src_val}\n")
            f.write("\n")

            f.write("-" * 80 + "\n")
            f.write("三、风险分析\n")
            f.write("-" * 80 + "\n")

            risk_names = {
                "version_mismatch": "版本漏配",
                "signed_shortage": "签名缺货",
                "order_split": "订单拆分"
            }

            for risk_key, risk_name in risk_names.items():
                risks = report["risk_analysis"][risk_key]
                f.write(f"\n  3.1 {risk_name} ({len(risks)}项)\n")
                if risks:
                    for i, risk in enumerate(risks, 1):
                        f.write(f"    风险 {i}:\n")
                        for key, value in risk.items():
                            f.write(f"      {key}: {value}\n")
                else:
                    f.write("    无此类风险\n")
            f.write("\n")

            f.write("-" * 80 + "\n")
            f.write("四、对应关系详情\n")
            f.write("-" * 80 + "\n")
            for i, mapping in enumerate(report["mapping_details"], 1):
                f.write(f"\n  发货单 {mapping['shipping_id']} 对应关系:\n")
                f.write(f"    预售订单: {mapping['order_mapping']['order_id']} "
                       f"(存在: {'是' if mapping['order_mapping']['exists'] else '否'})\n")
                f.write(f"      订单数量: {mapping['order_mapping']['order_qty']}, "
                       f"已发: {mapping['order_mapping']['shipped_qty']}, "
                       f"待发: {mapping['order_mapping']['remaining_qty']}\n")
                f.write(f"    版本清单: {mapping['version_mapping']['album_name']} - "
                       f"{mapping['version_mapping']['version']} "
                       f"({'签名版' if mapping['version_mapping']['is_signed'] else '普通版'})\n")
                f.write(f"      压盘数量: {mapping['version_mapping']['pressing_qty']}\n")
                f.write(f"    封套库存: {'存在' if mapping['sleeve_mapping']['exists'] else '不存在'}, "
                       f"数量: {mapping['sleeve_mapping']['sleeve_qty']}, "
                       f"位置: {mapping['sleeve_mapping']['location']}\n")
            f.write("\n")

            f.write("-" * 80 + "\n")
            f.write("五、原始数据\n")
            f.write("-" * 80 + "\n")
            f.write(f"\n  5.1 预售订单 ({len(report['source_data']['pre_orders'])}条)\n")
            for order in report["source_data"]["pre_orders"]:
                f.write(f"    {order['订单编号']}: {order['客户名称']} - "
                       f"{order['专辑名称']} {order['版本']} x{order['数量']} "
                       f"({'签名' if order['是否签名'] == '是' else '普通'})\n")

            f.write(f"\n  5.2 版本清单 ({len(report['source_data']['version_list'])}条)\n")
            for version in report["source_data"]["version_list"]:
                f.write(f"    {version['专辑名称']} - {version['版本']} "
                       f"({'签名' if version['是否签名'] == '是' else '普通'}) "
                       f"x{version['压盘数量']}\n")

            f.write(f"\n  5.3 封套库存 ({len(report['source_data']['sleeve_inventory'])}条)\n")
            for sleeve in report["source_data"]["sleeve_inventory"]:
                f.write(f"    {sleeve['专辑名称']} - {sleeve['版本']} "
                       f"x{sleeve['库存数量']} @ {sleeve['存放位置']}\n")

            f.write("\n" + "=" * 80 + "\n")
            f.write("  报告结束\n")
            f.write("=" * 80 + "\n")

    def get_shipping_item_details(self, shipping_id: str, report: Dict[str, Any]) -> Dict:
        shipping_item = next(
            (s for s in report["shipping_table"] if s["发货单号"] == shipping_id),
            None
        )
        if not shipping_item:
            return {"error": "找不到该发货单"}

        mapping = next(
            (m for m in report["mapping_details"] if m["shipping_id"] == shipping_id),
            None
        )

        order = next(
            (o for o in report["source_data"]["pre_orders"]
             if o["订单编号"] == shipping_item["订单编号"]),
            None
        )

        return {
            "shipping_item": shipping_item,
            "mapping_details": mapping,
            "order_details": order
        }

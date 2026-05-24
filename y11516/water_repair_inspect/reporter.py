from datetime import datetime
from typing import Dict, Any, List, Optional
from collections import defaultdict

from .config import Config
from .storage import RecordStorage
from .models import DataSourceType, RecordStatus, RepairRecord


class ReportGenerator:
    def __init__(self, config: Config, storage: RecordStorage):
        self.config = config
        self.storage = storage

    def generate_text_report(self) -> str:
        lines = []
        lines.append("=" * 80)
        lines.append("水务抢修材料多源导入巡检报表")
        lines.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("=" * 80)
        
        lines.append("\n一、数据概览")
        lines.append("-" * 80)
        lines.extend(self._generate_overview_section())
        
        lines.append("\n二、失败清单（带原始行号）")
        lines.append("-" * 80)
        lines.extend(self._generate_failures_section())
        
        lines.append("\n三、负库存明细（夜间抢修用料）")
        lines.append("-" * 80)
        lines.extend(self._generate_negative_inventory_section())
        
        lines.append("\n四、跨源关联检查")
        lines.append("-" * 80)
        lines.extend(self._generate_cross_check_section())
        
        lines.append("\n五、修正历史")
        lines.append("-" * 80)
        lines.extend(self._generate_fix_history_section())
        
        lines.append("\n" + "=" * 80)
        lines.append("报表结束")
        lines.append("=" * 80)
        
        return "\n".join(lines)

    def generate_html_report(self) -> str:
        html = f"""
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>水务抢修材料多源导入巡检报表</title>
    <style>
        body {{ font-family: 'Microsoft YaHei', sans-serif; margin: 20px; }}
        h1 {{ color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }}
        h2 {{ color: #34495e; margin-top: 30px; }}
        table {{ border-collapse: collapse; width: 100%; margin: 10px 0; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
        th {{ background-color: #3498db; color: white; }}
        tr:nth-child(even) {{ background-color: #f2f2f2; }}
        .warning {{ background-color: #fff3cd !important; }}
        .error {{ background-color: #f8d7da !important; }}
        .success {{ background-color: #d4edda !important; }}
        .summary-box {{ display: flex; gap: 20px; flex-wrap: wrap; }}
        .summary-item {{ background: #f8f9fa; padding: 15px; border-radius: 5px; min-width: 150px; }}
        .summary-number {{ font-size: 24px; font-weight: bold; color: #3498db; }}
    </style>
</head>
<body>
    <h1>水务抢修材料多源导入巡检报表</h1>
    <p>生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
"""
        
        html += "<h2>一、数据概览</h2>"
        html += self._generate_html_overview()
        
        html += "<h2>二、失败清单（带原始行号）</h2>"
        html += self._generate_html_failures()
        
        html += "<h2>三、负库存明细（夜间抢修用料）</h2>"
        html += self._generate_html_negative_inventory()
        
        html += "<h2>四、修正历史</h2>"
        html += self._generate_html_fix_history()
        
        html += """
</body>
</html>
"""
        return html

    def _generate_overview_section(self) -> List[str]:
        lines = []
        
        for st in DataSourceType:
            records = self.storage.get_all_records(source_type=st)
            if not records:
                continue
            
            counts = defaultdict(int)
            for r in records:
                counts[r.status.value] += 1
            
            lines.append(f"\n{st.value}:")
            lines.append(f"  总数: {len(records)}")
            lines.append(f"  有效: {counts.get('valid', 0)}")
            lines.append(f"  无效: {counts.get('invalid', 0)}")
            lines.append(f"  待处理: {counts.get('pending', 0) + counts.get('fixed', 0)}")
            lines.append(f"  撤回: {counts.get('withdrawn', 0)}")
            lines.append(f"  人工改判: {counts.get('manual_judged', 0)}")
            lines.append(f"  已冻结: {sum(1 for r in records if r.is_frozen)}")
        
        return lines

    def _generate_failures_section(self) -> List[str]:
        lines = []
        
        invalid_records = self.storage.get_all_records(status=RecordStatus.INVALID)
        
        if not invalid_records:
            lines.append("  无失败记录")
            return lines
        
        for i, record in enumerate(invalid_records, 1):
            lines.append(f"\n[{i}] 记录ID: {record.record_id}")
            
            if record.source_evidence:
                latest = record.source_evidence[-1]
                lines.append(f"    来源文件: {latest.source_file}")
                lines.append(f"    原始行号: {latest.original_row_number}")
            
            lines.append(f"    当前值: {record.current_value}")
            
            for issue in record.check_results:
                if issue.get('severity') == 'error':
                    lines.append(f"    错误: {issue.get('message', '')}")
        
        return lines

    def _generate_negative_inventory_section(self) -> List[str]:
        lines = []
        
        inventory_records = self.storage.get_all_records(DataSourceType.VALVE_INVENTORY)
        negative_records = [r for r in inventory_records 
                          if r.current_value.get('quantity', 0) < 0]
        
        if not negative_records:
            lines.append("  无负库存记录")
            return lines
        
        lines.append(f"  共 {len(negative_records)} 条负库存记录")
        
        for i, record in enumerate(negative_records, 1):
            lines.append(f"\n[{i}] 阀门编码: {record.current_value.get('valve_code', 'N/A')}")
            lines.append(f"    阀门名称: {record.current_value.get('valve_name', 'N/A')}")
            lines.append(f"    库存数量: {record.current_value.get('quantity', 0)}")
            lines.append(f"    盘点日期: {record.current_value.get('inventory_date', 'N/A')}")
            
            if record.source_evidence:
                latest = record.source_evidence[-1]
                lines.append(f"    来源文件: {latest.source_file}")
                lines.append(f"    原始行号: {latest.original_row_number}")
            
            lines.append(f"    备注: 夜间抢修先用料后补录（正常业务场景）")
        
        return lines

    def _generate_cross_check_section(self) -> List[str]:
        lines = []
        
        dispatch_records = self.storage.get_all_records(DataSourceType.DISPATCH_ORDER)
        photo_records = self.storage.get_all_records(DataSourceType.SITE_PHOTO)
        scan_records = self.storage.get_all_records(DataSourceType.SCAN_DETAIL)
        
        dispatch_orders = {r.current_value.get('order_no') for r in dispatch_records}
        photo_orders = {r.current_value.get('order_no') for r in photo_records}
        scan_orders = {r.current_value.get('order_no') for r in scan_records}
        
        lines.append(f"  派工单数: {len(dispatch_orders)}")
        lines.append(f"  有关联照片: {len(dispatch_orders & photo_orders)}")
        lines.append(f"  有关联扫码: {len(dispatch_orders & scan_orders)}")
        lines.append(f"  资料齐全: {len(dispatch_orders & photo_orders & scan_orders)}")
        
        missing_photo = dispatch_orders - photo_orders
        if missing_photo:
            lines.append(f"\n  缺少照片的工单 ({len(missing_photo)} 个):")
            for order in sorted(missing_photo)[:5]:
                lines.append(f"    - {order}")
            if len(missing_photo) > 5:
                lines.append(f"    ... 还有 {len(missing_photo) - 5} 个")
        
        return lines

    def _generate_fix_history_section(self) -> List[str]:
        lines = []
        
        all_records = self.storage.get_all_records()
        fixed_records = [r for r in all_records if r.fix_history]
        
        if not fixed_records:
            lines.append("  无修正记录")
            return lines
        
        lines.append(f"  共 {len(fixed_records)} 条记录有修正历史")
        
        for i, record in enumerate(fixed_records[:10], 1):
            lines.append(f"\n[{i}] 记录ID: {record.record_id}")
            for fix in record.fix_history[-3:]:
                fix_type = fix.get('type', 'unknown')
                timestamp = fix.get('timestamp', 'N/A')
                lines.append(f"    - {fix_type} @ {timestamp}")
                if 'actions' in fix:
                    for action in fix['actions']:
                        lines.append(f"      * {action}")
        
        if len(fixed_records) > 10:
            lines.append(f"\n  ... 还有 {len(fixed_records) - 10} 条记录有修正历史")
        
        return lines

    def _generate_html_overview(self) -> str:
        html = '<div class="summary-box">'
        
        for st in DataSourceType:
            records = self.storage.get_all_records(source_type=st)
            if not records:
                continue
            
            valid = sum(1 for r in records if r.status == RecordStatus.VALID)
            invalid = sum(1 for r in records if r.status == RecordStatus.INVALID)
            frozen = sum(1 for r in records if r.is_frozen)
            
            html += f"""
            <div class="summary-item">
                <div>{st.value}</div>
                <div class="summary-number">{len(records)}</div>
                <div>有效: {valid} | 无效: {invalid} | 冻结: {frozen}</div>
            </div>
            """
        
        html += "</div>"
        return html

    def _generate_html_failures(self) -> str:
        invalid_records = self.storage.get_all_records(status=RecordStatus.INVALID)
        
        if not invalid_records:
            return "<p>无失败记录</p>"
        
        html = """
        <table>
            <tr>
                <th>序号</th>
                <th>记录ID</th>
                <th>来源文件</th>
                <th>原始行号</th>
                <th>错误信息</th>
            </tr>
        """
        
        for i, record in enumerate(invalid_records, 1):
            source_file = record.source_evidence[-1].source_file if record.source_evidence else "N/A"
            row_num = record.source_evidence[-1].original_row_number if record.source_evidence else "N/A"
            errors = "; ".join([issue.get('message', '') 
                               for issue in record.check_results 
                               if issue.get('severity') == 'error'])
            
            html += f"""
            <tr class="error">
                <td>{i}</td>
                <td>{record.record_id}</td>
                <td>{source_file}</td>
                <td>{row_num}</td>
                <td>{errors}</td>
            </tr>
            """
        
        html += "</table>"
        return html

    def _generate_html_negative_inventory(self) -> str:
        inventory_records = self.storage.get_all_records(DataSourceType.VALVE_INVENTORY)
        negative_records = [r for r in inventory_records 
                          if r.current_value.get('quantity', 0) < 0]
        
        if not negative_records:
            return "<p>无负库存记录</p>"
        
        html = """
        <table>
            <tr>
                <th>序号</th>
                <th>阀门编码</th>
                <th>阀门名称</th>
                <th>库存数量</th>
                <th>盘点日期</th>
                <th>来源文件</th>
                <th>原始行号</th>
            </tr>
        """
        
        for i, record in enumerate(negative_records, 1):
            source_file = record.source_evidence[-1].source_file if record.source_evidence else "N/A"
            row_num = record.source_evidence[-1].original_row_number if record.source_evidence else "N/A"
            
            html += f"""
            <tr class="warning">
                <td>{i}</td>
                <td>{record.current_value.get('valve_code', '')}</td>
                <td>{record.current_value.get('valve_name', '')}</td>
                <td>{record.current_value.get('quantity', 0)}</td>
                <td>{record.current_value.get('inventory_date', '')}</td>
                <td>{source_file}</td>
                <td>{row_num}</td>
            </tr>
            """
        
        html += "</table>"
        html += "<p><em>备注: 负值为夜间抢修先用料后补录的正常业务场景，已做特殊标记</em></p>"
        return html

    def _generate_html_fix_history(self) -> str:
        all_records = self.storage.get_all_records()
        fixed_records = [r for r in all_records if r.fix_history]
        
        if not fixed_records:
            return "<p>无修正记录</p>"
        
        html = """
        <table>
            <tr>
                <th>记录ID</th>
                <th>修正次数</th>
                <th>最近修正</th>
                <th>修正内容</th>
            </tr>
        """
        
        for record in fixed_records[:20]:
            last_fix = record.fix_history[-1]
            fix_type = last_fix.get('type', 'unknown')
            timestamp = last_fix.get('timestamp', '')
            actions = last_fix.get('actions', [])
            actions_str = "; ".join(actions[:2]) if actions else fix_type
            
            html += f"""
            <tr>
                <td>{record.record_id}</td>
                <td>{len(record.fix_history)}</td>
                <td>{timestamp}</td>
                <td>{actions_str}</td>
            </tr>
            """
        
        html += "</table>"
        return html

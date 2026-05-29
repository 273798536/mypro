import os
import pandas as pd
from datetime import datetime
from typing import Dict, List
from pathlib import Path

from .models import (
    ReconciliationSummary,
    ReconciliationItem,
    ExceptionType,
    DataSource,
)


def _format_datetime(dt) -> str:
    if dt is None:
        return "-"
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def _format_amount(amount: float) -> str:
    return f"¥{amount:,.2f}"


def _format_exception_type(exception_type: ExceptionType) -> str:
    mapping = {
        ExceptionType.NORMAL: "✅ 正常",
        ExceptionType.DEPOSIT_NOT_REFUND: "⚠️ 定金不退",
        ExceptionType.BALANCE_TIMEOUT: "⏰ 尾款超时",
        ExceptionType.DEPOSIT_MISMATCH: "💰 定金金额不符",
        ExceptionType.BALANCE_MISMATCH: "💰 尾款金额不符",
        ExceptionType.AMOUNT_MISMATCH: "💰 总金额不符",
        ExceptionType.MISSING_DEPOSIT: "📋 缺失定金流水",
        ExceptionType.MISSING_BALANCE: "📋 缺失尾款支付",
        ExceptionType.MISSING_ORDER: "📋 缺失预售订单",
    }
    return mapping.get(exception_type, str(exception_type))


def _format_problem_source(sources: List[DataSource]) -> str:
    if not sources:
        return "-"
    return "、".join([s.value for s in sources])


def _get_exception_style(exception_type: ExceptionType) -> str:
    if exception_type == ExceptionType.DEPOSIT_NOT_REFUND:
        return "background-color: #fff3cd; color: #856404; font-weight: bold;"
    elif exception_type == ExceptionType.BALANCE_TIMEOUT:
        return "background-color: #f8d7da; color: #721c24; font-weight: bold;"
    elif exception_type in [ExceptionType.DEPOSIT_MISMATCH, ExceptionType.BALANCE_MISMATCH, ExceptionType.AMOUNT_MISMATCH]:
        return "background-color: #fff3cd; color: #856404;"
    elif exception_type in [ExceptionType.MISSING_DEPOSIT, ExceptionType.MISSING_BALANCE, ExceptionType.MISSING_ORDER]:
        return "background-color: #f8d7da; color: #721c24;"
    else:
        return "background-color: #d4edda; color: #155724;"


def generate_markdown_report(
    summary: ReconciliationSummary,
    output_dir: str,
    input_files: Dict = None,
    filename_prefix: str = None,
) -> str:
    if filename_prefix is None:
        filename_prefix = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    filename = f"{filename_prefix}_预售尾款对账报告.md"
    filepath = os.path.join(output_dir, filename)
    
    os.makedirs(output_dir, exist_ok=True)
    
    lines = []
    
    lines.append("# 电商预售尾款对账报告")
    lines.append("")
    lines.append(f"**对账时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("")
    
    if input_files:
        lines.append("## 📁 输入文件")
        lines.append("")
        lines.append("| 数据类型 | 文件路径 | 记录数 |")
        lines.append("|---------|---------|-------:|")
        if input_files.get("order_file"):
            lines.append(f"| 预售订单 | {input_files['order_file']} | {len(input_files.get('orders', []))} |")
        else:
            lines.append("| 预售订单 | ❌ 未找到 | 0 |")
        if input_files.get("deposit_file"):
            lines.append(f"| 定金流水 | {input_files['deposit_file']} | {len(input_files.get('deposits', []))} |")
        else:
            lines.append("| 定金流水 | ❌ 未找到 | 0 |")
        if input_files.get("balance_file"):
            lines.append(f"| 尾款支付 | {input_files['balance_file']} | {len(input_files.get('balances', []))} |")
        else:
            lines.append("| 尾款支付 | ❌ 未找到 | 0 |")
        lines.append("")
    
    lines.append("## 📊 对账统计")
    lines.append("")
    lines.append("| 指标 | 数值 | 说明 |")
    lines.append("|-----|-----:|-----|")
    
    match_rate = (summary.matched_count / summary.total_orders * 100) if summary.total_orders > 0 else 0
    exception_rate = (summary.exception_count / summary.total_orders * 100) if summary.total_orders > 0 else 0
    
    lines.append(f"| 总订单数 | {summary.total_orders} | 参与对账的订单总数 |")
    lines.append(f"| ✅ 对账通过 | {summary.matched_count} ({match_rate:.1f}%) | 三方数据完全一致 |")
    lines.append(f"| ❌ 存在异常 | {summary.exception_count} ({exception_rate:.1f}%) | 需要人工核查 |")
    lines.append(f"| ⚠️  定金不退 | **{summary.deposit_not_refund_count}** | 买家未付尾款，定金不予退还 |")
    lines.append(f"| ⏰ 尾款超时 | **{summary.balance_timeout_count}** | 超过尾款支付截止时间 |")
    lines.append(f"| 💰 金额不符 | {summary.amount_mismatch_count} | 金额不一致 |")
    lines.append(f"| 📋 缺失数据 | {summary.missing_data_count} | 缺少订单/流水/支付记录 |")
    lines.append(f"| 📊 订单总金额 | {_format_amount(summary.total_order_amount)} | 预售订单总额 |")
    lines.append(f"| 💳 定金总额 | {_format_amount(summary.total_deposit_amount)} | 实际收到定金 |")
    lines.append(f"| 💵 尾款总额 | {_format_amount(summary.total_balance_amount)} | 实际收到尾款 |")
    lines.append(f"| 💰 累计收款 | {_format_amount(summary.total_deposit_amount + summary.total_balance_amount)} | 定金+尾款合计 |")
    lines.append("")
    
    if summary.exception_details:
        lines.append("## 🔍 异常订单详情")
        lines.append("")
        
        high_priority = [item for item in summary.exception_details 
                        if item.exception_type in [ExceptionType.DEPOSIT_NOT_REFUND, ExceptionType.BALANCE_TIMEOUT]]
        normal_priority = [item for item in summary.exception_details 
                          if item.exception_type not in [ExceptionType.DEPOSIT_NOT_REFUND, ExceptionType.BALANCE_TIMEOUT]]
        
        if high_priority:
            lines.append("### 🚨 高优先级 - 需要立即处理")
            lines.append("")
            for item in high_priority:
                lines.append(f"#### 订单号: {item.order_no}")
                lines.append("")
                if item.order:
                    lines.append(f"- **商品**: {item.order.product_name}")
                    lines.append(f"- **金额**: 定金{_format_amount(item.order.deposit_amount)} + 尾款{_format_amount(item.order.balance_amount)} = {_format_amount(item.order.total_amount)}")
                    lines.append(f"- **买家**: {item.order.buyer_name or '-'}")
                lines.append(f"- **状态**: {_format_exception_type(item.exception_type)}")
                lines.append(f"- **问题材料**: {_format_problem_source(item.problem_source)}")
                lines.append(f"- **说明**: {item.exception_desc}")
                if item.deposit:
                    lines.append(f"- **定金流水**: {item.deposit.transaction_no} | 金额{_format_amount(item.deposit.pay_amount)} | {_format_datetime(item.deposit.pay_time)}")
                if item.balance:
                    lines.append(f"- **尾款支付**: {item.balance.transaction_no} | 金额{_format_amount(item.balance.pay_amount)} | {_format_datetime(item.balance.pay_time)}")
                lines.append("")
                lines.append("---")
                lines.append("")
        
        if normal_priority:
            lines.append("### 📌 普通优先级 - 需要核实")
            lines.append("")
            for item in normal_priority:
                lines.append(f"#### 订单号: {item.order_no}")
                lines.append("")
                if item.order:
                    lines.append(f"- **商品**: {item.order.product_name}")
                    lines.append(f"- **金额**: 定金{_format_amount(item.order.deposit_amount)} + 尾款{_format_amount(item.order.balance_amount)} = {_format_amount(item.order.total_amount)}")
                lines.append(f"- **状态**: {_format_exception_type(item.exception_type)}")
                lines.append(f"- **问题材料**: {_format_problem_source(item.problem_source)}")
                lines.append(f"- **说明**: {item.exception_desc}")
                lines.append("")
                lines.append("---")
                lines.append("")
    
    lines.append("## 📋 全部订单对账结果")
    lines.append("")
    lines.append("| 订单号 | 商品 | 状态 | 问题材料 | 说明 |")
    lines.append("|-------|-----|-----|---------|-----|")
    
    for item in summary.all_results:
        product = item.order.product_name if item.order else "-"
        lines.append(
            f"| {item.order_no} | {product} | {_format_exception_type(item.exception_type)} | "
            f"{_format_problem_source(item.problem_source)} | {item.exception_desc} |"
        )
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    
    return filepath


def generate_html_report(
    summary: ReconciliationSummary,
    output_dir: str,
    input_files: Dict = None,
    filename_prefix: str = None,
) -> str:
    if filename_prefix is None:
        filename_prefix = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    filename = f"{filename_prefix}_预售尾款对账报告.html"
    filepath = os.path.join(output_dir, filename)
    
    os.makedirs(output_dir, exist_ok=True)
    
    match_rate = (summary.matched_count / summary.total_orders * 100) if summary.total_orders > 0 else 0
    exception_rate = (summary.exception_count / summary.total_orders * 100) if summary.total_orders > 0 else 0
    
    html_template = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>电商预售尾款对账报告</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
            color: #333;
        }}
        h1 {{
            color: #2c3e50;
            text-align: center;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }}
        h2 {{
            color: #2c3e50;
            margin-top: 30px;
            border-left: 4px solid #3498db;
            padding-left: 10px;
        }}
        h3 {{
            color: #e74c3c;
        }}
        .summary-box {{
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }}
        .stat-card {{
            background: #f8f9fa;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
        }}
        .stat-card .label {{
            font-size: 14px;
            color: #666;
            margin-bottom: 5px;
        }}
        .stat-card .value {{
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
        }}
        .stat-card.success .value {{ color: #27ae60; }}
        .stat-card.danger .value {{ color: #e74c3c; }}
        .stat-card.warning .value {{ color: #f39c12; }}
        .stat-card.high-priority {{
            background: #fff3cd;
            border: 2px solid #ffc107;
        }}
        .stat-card.high-priority .value {{
            color: #856404;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        th {{
            background: #3498db;
            color: white;
            padding: 12px;
            text-align: left;
        }}
        td {{
            padding: 12px;
            border-bottom: 1px solid #eee;
        }}
        tr:hover {{
            background-color: #f5f5f5;
        }}
        .exception-item {{
            background: white;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .exception-header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }}
        .exception-order-no {{
            font-size: 18px;
            font-weight: bold;
            color: #2c3e50;
        }}
        .exception-badge {{
            padding: 4px 12px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 14px;
        }}
        .exception-detail {{
            margin: 5px 0;
            line-height: 1.6;
        }}
        .exception-detail strong {{
            color: #555;
        }}
        .problem-source {{
            display: inline-block;
            background: #ffeaa7;
            color: #856404;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            margin-right: 5px;
        }}
        .high-priority-section {{
            background: #fff3cd;
            border: 2px solid #ffc107;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
        }}
        .footer {{
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #999;
            font-size: 14px;
        }}
    </style>
</head>
<body>
    <h1>📊 电商预售尾款对账报告</h1>
    <p style="text-align: center; color: #666;">对账时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
"""

    if input_files:
        html_template += f"""
    <div class="summary-box">
        <h2 style="margin-top: 0;">📁 输入文件</h2>
        <table>
            <tr>
                <th>数据类型</th>
                <th>文件路径</th>
                <th style="text-align: right;">记录数</th>
            </tr>
            <tr>
                <td>预售订单</td>
                <td>{input_files.get('order_file', '❌ 未找到')}</td>
                <td style="text-align: right;">{len(input_files.get('orders', []))}</td>
            </tr>
            <tr>
                <td>定金流水</td>
                <td>{input_files.get('deposit_file', '❌ 未找到')}</td>
                <td style="text-align: right;">{len(input_files.get('deposits', []))}</td>
            </tr>
            <tr>
                <td>尾款支付</td>
                <td>{input_files.get('balance_file', '❌ 未找到')}</td>
                <td style="text-align: right;">{len(input_files.get('balances', []))}</td>
            </tr>
        </table>
    </div>
"""

    html_template += f"""
    <div class="summary-box">
        <h2 style="margin-top: 0;">📈 对账统计</h2>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="label">总订单数</div>
                <div class="value">{summary.total_orders}</div>
            </div>
            <div class="stat-card success">
                <div class="label">✅ 对账通过</div>
                <div class="value">{summary.matched_count}</div>
                <div style="font-size: 12px; color: #666;">{match_rate:.1f}%</div>
            </div>
            <div class="stat-card danger">
                <div class="label">❌ 存在异常</div>
                <div class="value">{summary.exception_count}</div>
                <div style="font-size: 12px; color: #666;">{exception_rate:.1f}%</div>
            </div>
            <div class="stat-card high-priority">
                <div class="label">⚠️  定金不退</div>
                <div class="value">{summary.deposit_not_refund_count}</div>
            </div>
            <div class="stat-card high-priority">
                <div class="label">⏰ 尾款超时</div>
                <div class="value">{summary.balance_timeout_count}</div>
            </div>
            <div class="stat-card warning">
                <div class="label">💰 金额不符</div>
                <div class="value">{summary.amount_mismatch_count}</div>
            </div>
            <div class="stat-card">
                <div class="label">📊 订单总金额</div>
                <div class="value" style="font-size: 18px;">{_format_amount(summary.total_order_amount)}</div>
            </div>
            <div class="stat-card success">
                <div class="label">💰 累计收款</div>
                <div class="value" style="font-size: 18px;">{_format_amount(summary.total_deposit_amount + summary.total_balance_amount)}</div>
            </div>
        </div>
    </div>
"""

    if summary.exception_details:
        html_template += """
    <h2>🔍 异常订单详情</h2>
"""
        
        high_priority = [item for item in summary.exception_details 
                        if item.exception_type in [ExceptionType.DEPOSIT_NOT_REFUND, ExceptionType.BALANCE_TIMEOUT]]
        normal_priority = [item for item in summary.exception_details 
                          if item.exception_type not in [ExceptionType.DEPOSIT_NOT_REFUND, ExceptionType.BALANCE_TIMEOUT]]
        
        if high_priority:
            html_template += """
    <div class="high-priority-section">
        <h3>🚨 高优先级 - 需要立即处理</h3>
"""
            for item in high_priority:
                html_template += _generate_exception_html(item)
            html_template += "</div>"
        
        if normal_priority:
            html_template += """
    <h3>📌 普通优先级 - 需要核实</h3>
"""
            for item in normal_priority:
                html_template += _generate_exception_html(item)

    html_template += """
    <h2>📋 全部订单对账结果</h2>
    <table>
        <tr>
            <th>订单号</th>
            <th>商品</th>
            <th>状态</th>
            <th>问题材料</th>
            <th>说明</th>
        </tr>
"""
    
    for item in summary.all_results:
        product = item.order.product_name if item.order else "-"
        exception_style = _get_exception_style(item.exception_type)
        html_template += f"""
        <tr>
            <td>{item.order_no}</td>
            <td>{product}</td>
            <td><span style="{exception_style} padding: 4px 8px; border-radius: 4px;">{_format_exception_type(item.exception_type)}</span></td>
            <td>{_format_problem_source(item.problem_source)}</td>
            <td>{item.exception_desc}</td>
        </tr>
"""
    
    html_template += """
    </table>
    <div class="footer">
        <p>本报告由预售尾款对账工具自动生成</p>
    </div>
</body>
</html>
"""
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(html_template)
    
    return filepath


def _generate_exception_html(item: ReconciliationItem) -> str:
    exception_style = _get_exception_style(item.exception_type)
    problem_sources_html = "".join(
        f'<span class="problem-source">{s.value}</span>' 
        for s in item.problem_source
    )
    
    html = f"""
    <div class="exception-item">
        <div class="exception-header">
            <span class="exception-order-no">订单号: {item.order_no}</span>
            <span class="exception-badge" style="{exception_style}">{_format_exception_type(item.exception_type)}</span>
        </div>
"""
    
    if item.order:
        html += f"""
        <div class="exception-detail">
            <strong>商品:</strong> {item.order.product_name}
        </div>
        <div class="exception-detail">
            <strong>金额:</strong> 定金{_format_amount(item.order.deposit_amount)} + 尾款{_format_amount(item.order.balance_amount)} = {_format_amount(item.order.total_amount)}
        </div>
"""
    
    html += f"""
        <div class="exception-detail">
            <strong>问题材料:</strong> {problem_sources_html if problem_sources_html else '-'}
        </div>
        <div class="exception-detail" style="color: #e74c3c;">
            <strong>说明:</strong> {item.exception_desc}
        </div>
"""
    
    if item.deposit or item.balance:
        html += '<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee;">'
        if item.deposit:
            html += f"""
        <div class="exception-detail" style="font-size: 13px; color: #666;">
            <strong>定金流水:</strong> {item.deposit.transaction_no} | 金额{_format_amount(item.deposit.pay_amount)} | {_format_datetime(item.deposit.pay_time)}
        </div>
"""
        if item.balance:
            html += f"""
        <div class="exception-detail" style="font-size: 13px; color: #666;">
            <strong>尾款支付:</strong> {item.balance.transaction_no} | 金额{_format_amount(item.balance.pay_amount)} | {_format_datetime(item.balance.pay_time)}
        </div>
"""
        html += "</div>"
    
    html += "</div>"
    return html


def generate_excel_report(
    summary: ReconciliationSummary,
    output_dir: str,
    input_files: Dict = None,
    filename_prefix: str = None,
) -> str:
    if filename_prefix is None:
        filename_prefix = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    filename = f"{filename_prefix}_预售尾款对账明细.xlsx"
    filepath = os.path.join(output_dir, filename)
    
    os.makedirs(output_dir, exist_ok=True)
    
    all_results_data = []
    for item in summary.all_results:
        row = {
            "订单号": item.order_no,
            "商品名称": item.order.product_name if item.order else "-",
            "订单总金额": item.order.total_amount if item.order else 0,
            "定金金额": item.order.deposit_amount if item.order else 0,
            "尾款金额": item.order.balance_amount if item.order else 0,
            "实际定金支付": item.deposit.pay_amount if item.deposit else 0,
            "实际尾款支付": item.balance.pay_amount if item.balance else 0,
            "对账状态": _format_exception_type(item.exception_type),
            "异常类型": item.exception_type.value,
            "问题材料": _format_problem_source(item.problem_source),
            "异常说明": item.exception_desc,
            "定金流水号": item.deposit.transaction_no if item.deposit else "-",
            "定金支付时间": _format_datetime(item.deposit.pay_time) if item.deposit else "-",
            "尾款支付流水号": item.balance.transaction_no if item.balance else "-",
            "尾款支付时间": _format_datetime(item.balance.pay_time) if item.balance else "-",
            "对账时间": _format_datetime(item.reconcile_time),
        }
        all_results_data.append(row)
    
    exception_data = []
    for item in summary.exception_details:
        row = {
            "订单号": item.order_no,
            "商品名称": item.order.product_name if item.order else "-",
            "对账状态": _format_exception_type(item.exception_type),
            "异常类型": item.exception_type.value,
            "优先级": "高" if item.exception_type in [ExceptionType.DEPOSIT_NOT_REFUND, ExceptionType.BALANCE_TIMEOUT] else "普通",
            "问题材料": _format_problem_source(item.problem_source),
            "异常说明": item.exception_desc,
            "订单总金额": item.order.total_amount if item.order else 0,
            "定金金额": item.order.deposit_amount if item.order else 0,
            "尾款金额": item.order.balance_amount if item.order else 0,
            "实际定金支付": item.deposit.pay_amount if item.deposit else 0,
            "实际尾款支付": item.balance.pay_amount if item.balance else 0,
        }
        exception_data.append(row)
    
    summary_data = [
        {"指标": "总订单数", "数值": summary.total_orders},
        {"指标": "对账通过", "数值": summary.matched_count},
        {"指标": "存在异常", "数值": summary.exception_count},
        {"指标": "定金不退", "数值": summary.deposit_not_refund_count},
        {"指标": "尾款超时", "数值": summary.balance_timeout_count},
        {"指标": "金额不符", "数值": summary.amount_mismatch_count},
        {"指标": "缺失数据", "数值": summary.missing_data_count},
        {"指标": "订单总金额", "数值": summary.total_order_amount},
        {"指标": "定金总额", "数值": summary.total_deposit_amount},
        {"指标": "尾款总额", "数值": summary.total_balance_amount},
    ]
    
    with pd.ExcelWriter(filepath, engine="openpyxl") as writer:
        pd.DataFrame(summary_data).to_excel(writer, sheet_name="对账摘要", index=False)
        pd.DataFrame(exception_data).to_excel(writer, sheet_name="异常明细", index=False)
        pd.DataFrame(all_results_data).to_excel(writer, sheet_name="全部对账结果", index=False)
    
    return filepath


def generate_all_reports(
    summary: ReconciliationSummary,
    output_dir: str,
    input_files: Dict = None,
) -> Dict[str, str]:
    filename_prefix = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    reports = {}
    reports["markdown"] = generate_markdown_report(summary, output_dir, input_files, filename_prefix)
    reports["html"] = generate_html_report(summary, output_dir, input_files, filename_prefix)
    reports["excel"] = generate_excel_report(summary, output_dir, input_files, filename_prefix)
    
    return reports

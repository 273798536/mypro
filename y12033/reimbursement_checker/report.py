import json
from pathlib import Path
from typing import List, Dict
from collections import defaultdict
from datetime import datetime
from .models import CheckResult, CheckStatus, CheckType


class Summary:
    def __init__(self, results: List[CheckResult]):
        self.results = results
        self.total = len(results)
        self.by_status: Dict[CheckStatus, int] = defaultdict(int)
        self.by_type: Dict[CheckType, Dict[CheckStatus, int]] = defaultdict(lambda: defaultdict(int))
        self.by_record: Dict[str, List[CheckResult]] = defaultdict(list)

        for r in results:
            self.by_status[r.status] += 1
            self.by_type[r.check_type][r.status] += 1
            self.by_record[r.record_id].append(r)

    @property
    def pass_count(self) -> int:
        return self.by_status[CheckStatus.PASS]

    @property
    def warning_count(self) -> int:
        return self.by_status[CheckStatus.WARNING]

    @property
    def fail_count(self) -> int:
        return self.by_status[CheckStatus.FAIL]

    @property
    def has_failure(self) -> bool:
        return self.fail_count > 0

    def get_records_with_issues(self) -> List[str]:
        return [
            rid for rid, rlist in self.by_record.items()
            if any(r.status != CheckStatus.PASS for r in rlist)
        ]


def print_terminal_summary(summary: Summary) -> None:
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    RESET = "\033[0m"
    BOLD = "\033[1m"

    print(f"\n{BOLD}════════════════════════════════════════════════════════════{RESET}")
    print(f"{BOLD}              院校科研经费报销校验报告                  {RESET}")
    print(f"{BOLD}════════════════════════════════════════════════════════════{RESET}")
    print(f"  生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{BOLD}────────────────────────────────────────────────────────────{RESET}")

    total = summary.total
    pass_pct = (summary.pass_count / total * 100) if total > 0 else 0
    warn_pct = (summary.warning_count / total * 100) if total > 0 else 0
    fail_pct = (summary.fail_count / total * 100) if total > 0 else 0

    print(f"\n  {BOLD}总体统计:{RESET}")
    print(f"    总检查项: {total}")
    print(f"    {GREEN}✓ 通过:     {summary.pass_count} ({pass_pct:.1f}%){RESET}")
    print(f"    {YELLOW}⚠ 警告:     {summary.warning_count} ({warn_pct:.1f}%){RESET}")
    print(f"    {RED}✗ 不通过:   {summary.fail_count} ({fail_pct:.1f}%){RESET}")

    print(f"\n  {BOLD}分类统计:{RESET}")
    type_names = {
        CheckType.BUDGET: "预算占用",
        CheckType.INVOICE: "发票查重",
        CheckType.CONTRACT: "合同余额",
    }
    for check_type in [CheckType.BUDGET, CheckType.INVOICE, CheckType.CONTRACT]:
        stats = summary.by_type[check_type]
        name = type_names[check_type]
        type_total = stats[CheckStatus.PASS] + stats[CheckStatus.WARNING] + stats[CheckStatus.FAIL]
        if type_total == 0:
            continue
        print(f"    {name:8s}: {GREEN}{stats[CheckStatus.PASS]:2d}✓ {RESET}"
              f"{YELLOW}{stats[CheckStatus.WARNING]:2d}⚠ {RESET}"
              f"{RED}{stats[CheckStatus.FAIL]:2d}✗{RESET}")

    if summary.has_failure or summary.warning_count > 0:
        print(f"\n  {BOLD}问题明细:{RESET}")
        for result in sorted(summary.results, key=lambda r: (r.status != CheckStatus.FAIL, r.status != CheckStatus.WARNING)):
            if result.status == CheckStatus.PASS:
                continue
            status_icon = f"{RED}✗{RESET}" if result.status == CheckStatus.FAIL else f"{YELLOW}⚠{RESET}"
            status_color = RED if result.status == CheckStatus.FAIL else YELLOW
            print(f"\n    {status_icon} {status_color}{result.status.value}{RESET} | {result.check_type.value}")
            print(f"       记录: {result.record_id} | 科目: {result.subject_code} | 金额: ¥{result.amount:,.2f}")
            print(f"       {result.message}")
            if result.source_refs:
                print(f"       来源:")
                for src in result.source_refs:
                    print(f"         → {src}")

    print(f"\n{BOLD}────────────────────────────────────────────────────────────{RESET}")
    if summary.has_failure:
        print(f"  {RED}{BOLD}结论: 存在不通过项，请核实后再处理。{RESET}")
        print(f"  详细报告已保存到输出目录，可转发给相关人员。")
    elif summary.warning_count > 0:
        print(f"  {YELLOW}{BOLD}结论: 存在警告项，建议复核。{RESET}")
        print(f"  详细报告已保存到输出目录，可转发给相关人员。")
    else:
        print(f"  {GREEN}{BOLD}结论: 全部校验通过！{RESET}")
        print(f"  详细报告已保存到输出目录，可转发给相关人员。")
    print(f"{BOLD}════════════════════════════════════════════════════════════{RESET}\n")


def generate_html_report(summary: Summary, output_path: Path) -> None:
    type_names = {
        CheckType.BUDGET: "预算占用",
        CheckType.INVOICE: "发票查重",
        CheckType.CONTRACT: "合同余额",
    }

    status_styles = {
        CheckStatus.PASS: 'background: #d4edda; color: #155724;',
        CheckStatus.WARNING: 'background: #fff3cd; color: #856404;',
        CheckStatus.FAIL: 'background: #f8d7da; color: #721c24;',
    }

    status_icons = {
        CheckStatus.PASS: '✓',
        CheckStatus.WARNING: '⚠',
        CheckStatus.FAIL: '✗',
    }

    sorted_results = sorted(
        summary.results,
        key=lambda r: (
            0 if r.status == CheckStatus.FAIL else 1 if r.status == CheckStatus.WARNING else 2,
            r.record_id,
            r.check_type.value,
        )
    )

    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>院校科研经费报销校验报告</title>
    <style>
        * {{ box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f7fa;
            color: #333;
        }}
        .container {{
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.08);
            overflow: hidden;
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
        }}
        .header h1 {{ margin: 0; font-size: 24px; }}
        .header p {{ margin: 8px 0 0; opacity: 0.9; font-size: 14px; }}
        .summary {{
            padding: 30px;
            border-bottom: 1px solid #eee;
        }}
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }}
        .stat-card {{
            padding: 16px;
            border-radius: 8px;
            text-align: center;
        }}
        .stat-card .num {{ font-size: 28px; font-weight: bold; }}
        .stat-card .label {{ font-size: 13px; margin-top: 4px; opacity: 0.8; }}
        .pass {{ background: #d4edda; color: #155724; }}
        .warn {{ background: #fff3cd; color: #856404; }}
        .fail {{ background: #f8d7da; color: #721c24; }}
        .total {{ background: #e3f2fd; color: #0d47a1; }}
        .type-stats {{
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }}
        .type-stat {{
            padding: 10px 16px;
            background: #f5f7fa;
            border-radius: 6px;
            font-size: 14px;
        }}
        .details {{ padding: 30px; }}
        .details h2 {{
            margin: 0 0 20px;
            font-size: 18px;
            color: #555;
        }}
        .result-card {{
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            margin-bottom: 12px;
            overflow: hidden;
        }}
        .result-header {{
            padding: 12px 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 500;
        }}
        .result-header .status-icon {{
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
        }}
        .result-body {{
            padding: 16px;
            background: #fafafa;
        }}
        .result-body .meta {{
            font-size: 13px;
            color: #666;
            margin-bottom: 8px;
        }}
        .result-body .message {{
            font-size: 15px;
            margin-bottom: 12px;
            line-height: 1.6;
        }}
        .result-body .sources {{
            font-size: 12px;
            color: #888;
        }}
        .result-body .sources .title {{
            font-weight: 500;
            color: #666;
            margin-bottom: 4px;
        }}
        .result-body .sources ul {{
            margin: 0;
            padding-left: 20px;
        }}
        .result-body .sources li {{
            font-family: "SF Mono", Monaco, Consolas, monospace;
            margin: 2px 0;
        }}
        .conclusion {{
            padding: 20px 30px;
            border-top: 1px solid #eee;
            font-weight: 500;
        }}
        .conclusion.pass {{ background: #d4edda; color: #155724; }}
        .conclusion.warn {{ background: #fff3cd; color: #856404; }}
        .conclusion.fail {{ background: #f8d7da; color: #721c24; }}
        .badge {{
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            margin-right: 8px;
        }}
        .badge.budget {{ background: #e3f2fd; color: #1565c0; }}
        .badge.invoice {{ background: #f3e5f5; color: #6a1b9a; }}
        .badge.contract {{ background: #e8f5e9; color: #2e7d32; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>院校科研经费报销校验报告</h1>
            <p>生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        </div>

        <div class="summary">
            <h2 style="margin:0 0 20px;font-size:18px;color:#555;">校验概览</h2>
            <div class="stats-grid">
                <div class="stat-card total">
                    <div class="num">{summary.total}</div>
                    <div class="label">总检查项</div>
                </div>
                <div class="stat-card pass">
                    <div class="num">{summary.pass_count}</div>
                    <div class="label">通过</div>
                </div>
                <div class="stat-card warn">
                    <div class="num">{summary.warning_count}</div>
                    <div class="label">警告</div>
                </div>
                <div class="stat-card fail">
                    <div class="num">{summary.fail_count}</div>
                    <div class="label">不通过</div>
                </div>
            </div>
            <div class="type-stats">
"""

    for check_type in [CheckType.BUDGET, CheckType.INVOICE, CheckType.CONTRACT]:
        stats = summary.by_type[check_type]
        name = type_names[check_type]
        type_total = stats[CheckStatus.PASS] + stats[CheckStatus.WARNING] + stats[CheckStatus.FAIL]
        if type_total == 0:
            continue
        html += f"""
                <div class="type-stat">
                    <strong>{name}:</strong>
                    <span style="color:#155724;">{stats[CheckStatus.PASS]}✓</span> /
                    <span style="color:#856404;">{stats[CheckStatus.WARNING]}⚠</span> /
                    <span style="color:#721c24;">{stats[CheckStatus.FAIL]}✗</span>
                </div>
"""

    html += f"""
            </div>
        </div>

        <div class="details">
            <h2>检查明细</h2>
"""

    for result in sorted_results:
        badge_class = {
            CheckType.BUDGET: "budget",
            CheckType.INVOICE: "invoice",
            CheckType.CONTRACT: "contract",
        }[result.check_type]
        badge_name = type_names[result.check_type]
        style = status_styles[result.status]
        icon = status_icons[result.status]

        sources_html = ""
        if result.source_refs:
            sources_html = '<div class="sources"><div class="title">数据来源:</div><ul>'
            for src in result.source_refs:
                sources_html += f"<li>{src}</li>"
            sources_html += "</ul></div>"

        html += f"""
            <div class="result-card">
                <div class="result-header" style="{style}">
                    <span class="status-icon">{icon}</span>
                    <span class="badge {badge_class}">{badge_name}</span>
                    <span>{result.status.value}</span>
                </div>
                <div class="result-body">
                    <div class="meta">
                        <strong>记录ID:</strong> {result.record_id} |
                        <strong>科目:</strong> {result.subject_code} |
                        <strong>金额:</strong> ¥{result.amount:,.2f}
                    </div>
                    <div class="message">{result.message}</div>
                    {sources_html}
                </div>
            </div>
"""

    conclusion_class = "pass"
    conclusion_text = "全部校验通过！"
    if summary.has_failure:
        conclusion_class = "fail"
        conclusion_text = "存在不通过项，请核实后再处理。"
    elif summary.warning_count > 0:
        conclusion_class = "warn"
        conclusion_text = "存在警告项，建议复核。"

    html += f"""
        </div>

        <div class="conclusion {conclusion_class}">
            结论: {conclusion_text}
        </div>
    </div>
</body>
</html>
"""

    output_path.write_text(html, encoding="utf-8")


def generate_json_report(summary: Summary, output_path: Path) -> None:
    data = {
        "generated_at": datetime.now().isoformat(),
        "summary": {
            "total": summary.total,
            "pass": summary.pass_count,
            "warning": summary.warning_count,
            "fail": summary.fail_count,
            "has_failure": summary.has_failure,
            "records_with_issues": summary.get_records_with_issues(),
        },
        "results": [r.to_dict() for r in sorted(summary.results, key=lambda r: (r.status != CheckStatus.FAIL, r.record_id))],
    }
    output_path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def generate_reports(
    results: List[CheckResult],
    output_dir: Path,
) -> Summary:
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    summary = Summary(results)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    html_path = output_path / f"reimbursement_report_{timestamp}.html"
    json_path = output_path / f"reimbursement_report_{timestamp}.json"

    generate_html_report(summary, html_path)
    generate_json_report(summary, json_path)

    print_terminal_summary(summary)

    print(f"\n📄 报告已生成:")
    print(f"   → HTML报告: {html_path}")
    print(f"   → JSON报告: {json_path}")

    return summary

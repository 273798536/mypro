import os
import json
from datetime import datetime
from typing import List, Dict
from .models import EquationRecord, BadRecord


EQUATION_EXPLANATIONS = {
    '一阶线性': {
        'form': "y' + P(x)y = Q(x)",
        'method': "积分因子法：先算积分因子 μ(x) = e^(∫P(x)dx)，再乘两边积分",
        'solution_form': "y = e^(-∫Pdx) · (∫Q·e^(∫Pdx) dx + C)",
    },
    '可分离变量': {
        'form': "dy/dx = f(x)·g(y)",
        'method': "分离变量：把 y 的放左边 dy/g(y)，x 的放右边 f(x)dx，两边积分",
        'solution_form': "∫1/g(y) dy = ∫f(x) dx + C",
    },
    '二阶常系数齐次': {
        'form': "y'' + py' + qy = 0",
        'method': "特征方程法：令 r² + pr + q = 0，根据根的三种情况写出通解",
        'solution_form': "相异实根: y = C1·e^(r1x) + C2·e^(r2x)；重根: y = (C1+C2x)e^(rx)；共轭复根: y = e^(αx)(C1cosβx + C2sinβx)",
    },
    '二阶常系数非齐次': {
        'form': "y'' + py' + qy = f(x)",
        'method': "先求对应齐次方程的通解 Y，再找非齐次的一个特解 y*，通解 y = Y + y*",
        'solution_form': "y = C1y1 + C2y2 + y*(特解)",
    },
}


class ReportGenerator:
    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)

    def generate_report(self, process_result: Dict) -> str:
        ts = process_result.get('timestamp', datetime.now().strftime('%Y%m%d_%H%M%S'))
        details = process_result.get('details', {})

        md_lines = []
        md_lines.append(f"# 微分方程错因追踪报告")
        md_lines.append(f"")
        md_lines.append(f"> 生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        md_lines.append(f"")

        md_lines.append(self._write_summary(process_result))
        md_lines.append("")

        md_lines.append(self._write_success_cases(details.get('successful', [])))
        md_lines.append("")

        md_lines.append(self._write_bad_cases(details))
        md_lines.append("")

        md_lines.append(self._write_handover(details))
        md_lines.append("")

        report_path = os.path.join(self.output_dir, f'report_{ts}.md')
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(md_lines))

        return report_path

    def _write_summary(self, result: Dict) -> str:
        s = result.get('summary', {})
        lines = [
            "## 一、处理概览",
            "",
            "| 类别 | 数量 |",
            "|------|------|",
            f"| 总计 | {s.get('total', 0)} |",
            f"| 成功 | {s.get('successful', 0)} |",
            f"| 缺字段 | {s.get('bad_missing', 0)} |",
            f"| 格式问题 | {s.get('bad_format', 0)} |",
            f"| 业务规则 | {s.get('bad_business', 0)} |",
            f"| 重复样本 | {s.get('duplicates', 0)} |",
        ]
        return '\n'.join(lines)

    def _write_success_cases(self, records: List[Dict]) -> str:
        if not records:
            return "## 二、成功通过记录\n\n（无）"

        lines = ["## 二、成功通过记录", ""]
        for i, rec in enumerate(records, 1):
            etype = rec.get('equation_type', '')
            expl = EQUATION_EXPLANATIONS.get(etype, {})
            params = rec.get('input_params', {})
            params_str = '，'.join(f"{k}={v}" for k, v in params.items()) if params else '（无参数）'

            lines.append(f"### {i}. 记录 [{rec.get('record_id', '')}]",)
            lines.append("")
            lines.append(f"- **来源**：{rec.get('source', '')}")
            lines.append(f"- **方程类型**：{etype}")
            lines.append(f"- **标准形式**：{expl.get('form', '—')}")
            lines.append(f"- **输入参数**：{params_str}")
            lines.append(f"- **给出解**：{rec.get('solution', '')}")
            lines.append(f"- **解题方法**：{expl.get('method', '—')}")
            lines.append(f"- **通解公式**：{expl.get('solution_form', '—')}")
            if rec.get('remark'):
                lines.append(f"- **备注**：{rec.get('remark', '')}")
            lines.append("")
            lines.append("**给学生讲解串讲：**")
            lines.append("")
            lines.append(f"> 同学们看这道题，题目给的是{etype}方程，标准形式写成 {expl.get('form', '')}。")
            lines.append(f"> 我们这道题的参数是 {params_str}。")
            lines.append(f"> 解题用的是{expl.get('method', '对应方法')}，套通解公式 {expl.get('solution_form', '')}，")
            lines.append(f"> 最后得到的解是：{rec.get('solution', '')}。")
            lines.append("")
        return '\n'.join(lines)

    def _write_bad_cases(self, details: Dict) -> str:
        lines = ["## 三、异常记录错因分析", ""]

        sections = [
            ('缺字段问题', details.get('bad_missing', []),
             "这条记录必要字段没填全，没法做后续校验。先把下表中标红的字段补齐再重新跑。"),
            ('格式问题', details.get('bad_format', []),
             "记录ID或方程类型填得不符合规范。ID只能是字母数字下划线横杠，方程类型必须是系统支持的四种之一。"),
            ('业务规则问题', details.get('bad_business', []),
             "格式是对的，但解题步骤或结果不符合这一类方程的业务逻辑。对照下方每一条的具体说明改。"),
        ]

        for title, recs, hint in sections:
            lines.append(f"### {title}")
            lines.append("")
            lines.append(f"*{hint}*")
            lines.append("")

            if not recs:
                lines.append("_（本类暂无）_")
                lines.append("")
                continue

            for i, rec in enumerate(recs, 1):
                etype = rec.get('equation_type', '')
                expl = EQUATION_EXPLANATIONS.get(etype, {})
                params = rec.get('input_params', {})
                params_str = '，'.join(f"{k}={v}" for k, v in params.items()) if isinstance(params, dict) and params else '（无参数/解析失败）'

                lines.append(f"#### {i}. [{rec.get('record_id', '???')}] {rec.get('equation_type', '未知类型')}")
                lines.append("")
                lines.append(f"- **来源**：{rec.get('source', '未填')}")
                lines.append(f"- **输入参数**：{params_str}")
                lines.append(f"- **给出解**：{rec.get('solution', '未填')}")
                lines.append(f"- **系统判定问题**：{rec.get('error_detail', '')}")
                lines.append(f"- **涉及字段**：{', '.join(rec.get('error_fields', []))}")
                if rec.get('last_manual_note'):
                    lines.append(f"- **上次人工说明**：{rec.get('last_manual_note', '')}")
                lines.append("")

                lines.append("**给学生/复盘的讲解口径：**")
                lines.append("")
                lines.append(f"> 这条记录是{title}。"
                             f"题目输入是 {params_str}，给出的解是 {rec.get('solution', '空')}。"
                             f"系统检查发现：{rec.get('error_detail', '')}。"
                             f"对照标准 {expl.get('form', '')} 和通解形式 {expl.get('solution_form', '—')}，"
                             f"问题出在 {', '.join(rec.get('error_fields', []))} 这几项。")
                if rec.get('last_manual_note'):
                    lines.append(f"> 上次人工备注提过：{rec.get('last_manual_note', '')}，这次还没改。")
                lines.append("")

        return '\n'.join(lines)

    def _write_handover(self, details: Dict) -> str:
        duplicates = details.get('duplicates', [])
        all_bad = (details.get('bad_missing', [])
                   + details.get('bad_format', [])
                   + details.get('bad_business', []))

        lines = ["## 四、现场交接（复盘会直接读这段就行）", ""]

        if not all_bad and not duplicates:
            lines.append("这批记录全部通过，没有待确认项，无需交接。")
            return '\n'.join(lines)

        lines.append("各位，这批微分方程错因追踪跑出来有几件事需要交接：")
        lines.append("")

        missing = details.get('bad_missing', [])
        if missing:
            lines.append(f"**① 缺字段 {len(missing)} 条**")
            lines.append("")
            for r in missing:
                lines.append(f"- 记录 {r.get('record_id', '???')}（来源 {r.get('source', '未填')}）：缺的是 "
                             f"{', '.join(r.get('error_fields', []))}，请对应同事补齐后重跑。")
            lines.append("")

        bad_fmt = details.get('bad_format', [])
        if bad_fmt:
            lines.append(f"**② 格式问题 {len(bad_fmt)} 条**")
            lines.append("")
            for r in bad_fmt:
                lines.append(f"- 记录 {r.get('record_id', '???')}：{r.get('error_detail', '')}")
            lines.append("")

        bad_biz = details.get('bad_business', [])
        if bad_biz:
            lines.append(f"**③ 业务规则 {len(bad_biz)} 条**")
            lines.append("")
            for r in bad_biz:
                lines.append(f"- 记录 {r.get('record_id', '???')}（{r.get('equation_type', '')}）：{r.get('error_detail', '')}")
                if r.get('last_manual_note'):
                    lines.append(f"  → 上次人工说明：{r.get('last_manual_note', '')}")
            lines.append("")

        if duplicates:
            lines.append(f"**④ 重复样本 {len(duplicates)} 条（重点）**")
            lines.append("")
            lines.append("下面这些和系统里已有记录完全重复——方程类型、参数、给出的解一模一样。")
            lines.append("这类不用再改，直接回标“和已有记录重复，以旧记录为准”就行：")
            lines.append("")
            for r in duplicates:
                lines.append(f"- 新记录 {r.get('record_id', '???')}  对应旧记录 {r.get('is_duplicate_of', '')}，"
                             f"方程类型：{r.get('equation_type', '')}，来源：{r.get('source', '')}")
            lines.append("")

        lines.append("以上就是这批需要确认的，有疑问现场提。")
        return '\n'.join(lines)

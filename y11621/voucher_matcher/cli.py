import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text
from rich.prompt import Prompt, Confirm
from rich import print as rprint

from .state_manager import StateManager
from .matcher import MatchingEngine
from .exporter import Exporter
from .sample_data import load_sample_data
from .models import MatchStatus, DataSource, HistoryEntry

console = Console()


class VoucherMatcherCLI:
    def __init__(self):
        self.sm = StateManager()
        self.engine = MatchingEngine()
        self.exporter = Exporter(self.sm)

    def run(self):
        self._show_header()
        while True:
            self._show_menu()
            choice = Prompt.ask("选择操作", choices=["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"], default="1")
            if choice == "0":
                rprint("[yellow]已退出，状态已保存[/yellow]")
                break
            self._handle_choice(choice)

    def _show_header(self):
        console.clear()
        title = Text("银行流水凭证匹配工具", style="bold cyan")
        subtitle = Text("Bank Flow Voucher Matcher CLI", style="dim")
        console.print(Panel.fit(Text.assemble(title, "\n", subtitle), border_style="cyan"))

    def _show_menu(self):
        stats = self._get_stats()
        menu_table = Table(show_header=False, box=None, padding=(0, 2))
        menu_table.add_column("选项", style="cyan")
        menu_table.add_column("功能", style="white")
        menu_table.add_row("[1]", "📋 查看匹配列表")
        menu_table.add_row("[2]", "🔍 查看详情")
        menu_table.add_row("[3]", "✏️  编辑匹配")
        menu_table.add_row("[4]", "📜 查看历史记录")
        menu_table.add_row("[5]", "🔄 重新匹配")
        menu_table.add_row("[6]", "📊 导出Excel")
        menu_table.add_row("[7]", "📥 加载样例数据")
        menu_table.add_row("[8]", "🗑️  清除匹配结果")
        menu_table.add_row("[9]", "ℹ️  数据统计")
        menu_table.add_row("[0]", "🚪 退出")

        stats_text = Text(f"总记录: {stats['total']} | ", style="dim")
        stats_text.append(f"已匹配: {stats['matched']} ", style="green")
        stats_text.append(f"| 冲突: {stats['conflict']} ", style="red")
        stats_text.append(f"| 待处理: {stats['pending']}", style="yellow")

        console.print(Panel(menu_table, title="菜单", subtitle=stats_text, border_style="blue"))

    def _get_stats(self):
        matches = self.sm.state.matches
        return {
            "total": len(matches),
            "matched": len([m for m in matches if m.status == MatchStatus.MATCHED]),
            "conflict": len([m for m in matches if m.status == MatchStatus.CONFLICT]),
            "pending": len([m for m in matches if m.status == MatchStatus.PENDING]),
            "manual": len([m for m in matches if m.status == MatchStatus.MANUAL]),
            "split": len([m for m in matches if m.status == MatchStatus.SPLIT]),
            "red": len([m for m in matches if m.status == MatchStatus.RED_INVOICE]),
        }

    def _handle_choice(self, choice):
        if choice == "1":
            self._list_matches()
        elif choice == "2":
            self._show_detail()
        elif choice == "3":
            self._edit_match()
        elif choice == "4":
            self._show_history()
        elif choice == "5":
            self._run_matching()
        elif choice == "6":
            self._export_excel()
        elif choice == "7":
            self._load_samples()
        elif choice == "8":
            self._clear_matches()
        elif choice == "9":
            self._show_stats()

    def _list_matches(self):
        if not self.sm.state.matches:
            rprint("[yellow]暂无匹配记录，请先加载数据并运行匹配[/yellow]")
            console.input("\n按回车键继续...")
            return

        status_filter = Prompt.ask(
            "筛选状态 (回车=全部)",
            choices=["", "已匹配", "待匹配", "冲突", "拆分中", "人工确认", "红冲发票"],
            default=""
        )

        table = Table(title="匹配记录列表", show_lines=False)
        table.add_column("#", style="dim", width=4)
        table.add_column("ID", style="cyan", width=10)
        table.add_column("状态", width=10)
        table.add_column("日期", style="white", width=12)
        table.add_column("对方", style="white", width=16)
        table.add_column("金额", justify="right", width=12)
        table.add_column("分数", justify="center", width=8)
        table.add_column("匹配方式", style="dim", width=30)
        table.add_column("标记", style="yellow", width=16)

        matches = self.sm.state.matches
        if status_filter:
            matches = [m for m in matches if m.status.value == status_filter]

        for idx, match in enumerate(matches, 1):
            flow = self.sm.get_bank_flow_by_id(match.bank_flow_id)
            status_style = self._get_status_style(match.status)
            flags = " ".join(match.flags) if match.flags else "-"

            table.add_row(
                str(idx),
                match.id[:8],
                Text(match.status.value, style=status_style),
                flow.trade_date if flow else "-",
                (flow.counterparty[:14] + "…") if flow and len(flow.counterparty) > 14 else (flow.counterparty if flow else "-"),
                f"{match.matched_amount:,.2f}",
                f"{match.match_score:.0f}%" if match.match_score else "-",
                (match.match_method[:28] + "…") if len(match.match_method) > 28 else match.match_method,
                flags,
            )

        console.print(table)
        console.input("\n按回车键继续...")

    def _get_status_style(self, status):
        styles = {
            MatchStatus.MATCHED: "green",
            MatchStatus.PENDING: "yellow",
            MatchStatus.CONFLICT: "red bold",
            MatchStatus.SPLIT: "blue",
            MatchStatus.MANUAL: "magenta",
            MatchStatus.FLAGGED: "orange",
            MatchStatus.RED_INVOICE: "red",
        }
        return styles.get(status, "white")

    def _show_detail(self):
        if not self.sm.state.matches:
            rprint("[yellow]暂无匹配记录[/yellow]")
            console.input("\n按回车键继续...")
            return

        match_id = Prompt.ask("请输入匹配ID (或序号)")
        match = self._find_match(match_id)
        if not match:
            rprint("[red]未找到该记录[/red]")
            console.input("\n按回车键继续...")
            return

        flow = self.sm.get_bank_flow_by_id(match.bank_flow_id)
        invoices = [self.sm.get_invoice_by_id(iid) for iid in match.invoice_ids]
        contract = self.sm.get_contract_by_id(match.contract_id) if match.contract_id else None

        console.clear()
        title = Text(f"匹配详情 - {match.id[:8]}", style="bold cyan")
        console.print(Panel(title, border_style="cyan"))

        info_table = Table(show_header=False, box=None, padding=(0, 2))
        info_table.add_column("字段", style="bold blue", width=12)
        info_table.add_column("值", style="white")

        status_style = self._get_status_style(match.status)
        info_table.add_row("状态", Text(match.status.value, style=status_style))
        info_table.add_row("匹配分数", f"{match.match_score:.0f}%" if match.match_score else "-")
        info_table.add_row("匹配方式", match.match_method)
        info_table.add_row("来源", " | ".join([s.value for s in match.sources]))
        info_table.add_row("标记", ", ".join(match.flags) if match.flags else "-")
        info_table.add_row("备注", match.remarks or "-")
        info_table.add_row("版本", f"v{match.version}")
        info_table.add_row("更新时间", match.updated_at)

        console.print(Panel(info_table, title="基本信息", border_style="blue"))

        if flow:
            flow_table = Table(show_header=False, box=None, padding=(0, 2))
            flow_table.add_column("字段", style="bold green", width=12)
            flow_table.add_column("值", style="white")
            flow_table.add_row("流水ID", flow.id)
            flow_table.add_row("交易日期", flow.trade_date)
            flow_table.add_row("交易时间", flow.trade_time)
            flow_table.add_row("金额", f"{flow.amount:,.2f}")
            flow_table.add_row("方向", flow.direction)
            flow_table.add_row("对方账户", flow.counterparty)
            flow_table.add_row("摘要", flow.summary)
            flow_table.add_row("银行账户", flow.bank_account)
            console.print(Panel(flow_table, title="银行流水", border_style="green"))

        if invoices:
            inv_table = Table(title="匹配发票", show_lines=True)
            inv_table.add_column("发票号", style="cyan")
            inv_table.add_column("日期", style="white")
            inv_table.add_column("金额", justify="right")
            inv_table.add_column("税额", justify="right")
            inv_table.add_column("价税合计", justify="right")
            inv_table.add_column("销售方", style="white")
            inv_table.add_column("状态", style="yellow")

            for inv in invoices:
                if inv:
                    inv_table.add_row(
                        f"{inv.invoice_code}-{inv.invoice_number}",
                        inv.invoice_date,
                        f"{inv.amount:,.2f}",
                        f"{inv.tax_amount:,.2f}",
                        f"{inv.total_amount:,.2f}",
                        inv.seller_name,
                        inv.status,
                    )
            console.print(inv_table)

        if contract:
            ct_table = Table(show_header=False, box=None, padding=(0, 2))
            ct_table.add_column("字段", style="bold magenta", width=12)
            ct_table.add_column("值", style="white")
            ct_table.add_row("合同号", contract.contract_no)
            ct_table.add_row("合同日期", contract.contract_date)
            ct_table.add_row("甲方", contract.party_a)
            ct_table.add_row("乙方", contract.party_b)
            ct_table.add_row("合同金额", f"{contract.contract_amount:,.2f}")
            ct_table.add_row("付款条件", contract.payment_terms)
            console.print(Panel(ct_table, title="关联合同", border_style="magenta"))

        history = self.sm.get_history_for_record(match.id)
        if history:
            h_table = Table(title="变更历史", show_lines=False)
            h_table.add_column("时间", style="dim", width=20)
            h_table.add_column("操作", style="white")
            h_table.add_column("旧值", style="red", width=30)
            h_table.add_column("新值", style="green", width=30)
            h_table.add_column("操作人", style="cyan")

            for h in history:
                h_table.add_row(
                    h.changed_at[:19].replace("T", " "),
                    h.field_name,
                    h.old_value[:28] + "…" if len(h.old_value) > 28 else h.old_value,
                    h.new_value[:28] + "…" if len(h.new_value) > 28 else h.new_value,
                    h.operator,
                )
            console.print(h_table)

        console.input("\n按回车键继续...")

    def _find_match(self, identifier):
        if identifier.isdigit():
            idx = int(identifier) - 1
            if 0 <= idx < len(self.sm.state.matches):
                return self.sm.state.matches[idx]
        return self.sm.get_match_by_id(identifier)

    def _edit_match(self):
        if not self.sm.state.matches:
            rprint("[yellow]暂无匹配记录[/yellow]")
            console.input("\n按回车键继续...")
            return

        match_id = Prompt.ask("请输入要编辑的匹配ID (或序号)")
        match = self._find_match(match_id)
        if not match:
            rprint("[red]未找到该记录[/red]")
            console.input("\n按回车键继续...")
            return

        console.clear()
        rprint(f"[cyan]编辑匹配记录: {match.id[:8]}[/cyan]")
        rprint(f"当前状态: [bold]{match.status.value}[/bold]")
        rprint(f"当前发票: {', '.join(match.invoice_ids) if match.invoice_ids else '无'}")
        rprint(f"当前备注: {match.remarks or '无'}")
        rprint("")

        edit_table = Table(show_header=False, box=None)
        edit_table.add_row("[1]", "人工确认匹配")
        edit_table.add_row("[2]", "修改备注")
        edit_table.add_row("[3]", "标记为异常")
        edit_table.add_row("[4]", "重置为待匹配")
        edit_table.add_row("[5]", "✂️  拆分付款")
        edit_table.add_row("[6]", "🔗 合并到其他匹配")
        edit_table.add_row("[0]", "返回")
        console.print(edit_table)

        choice = Prompt.ask("选择操作", choices=["1", "2", "3", "4", "5", "6", "0"], default="0")

        if choice == "1":
            self._manual_confirm(match)
        elif choice == "2":
            self._edit_remarks(match)
        elif choice == "3":
            self._flag_as_exception(match)
        elif choice == "4":
            self._reset_match(match)
        elif choice == "5":
            self._split_match(match)
        elif choice == "6":
            self._merge_match(match)

        self.sm.save()

    def _manual_confirm(self, match):
        if not match.invoice_ids:
            rprint("[yellow]该记录没有候选发票，请先检查流水数据[/yellow]")
            console.input("\n按回车键继续...")
            return

        rprint("[cyan]候选发票列表:[/cyan]")
        for idx, inv_id in enumerate(match.invoice_ids, 1):
            inv = self.sm.get_invoice_by_id(inv_id)
            if inv:
                rprint(f"  [{idx}] {inv.invoice_number} - {inv.seller_name} - {inv.total_amount:,.2f}")

        inv_choice = Prompt.ask("请选择正确的发票序号", default="1")
        if inv_choice.isdigit():
            inv_idx = int(inv_choice) - 1
            if 0 <= inv_idx < len(match.invoice_ids):
                selected_id = match.invoice_ids[inv_idx]
                updated_match, history = self.engine.manual_confirm(match, selected_id)
                self.sm.update_match(updated_match)
                self.sm.add_history(history)
                rprint("[green]✓ 人工确认成功[/green]")
        console.input("\n按回车键继续...")

    def _edit_remarks(self, match):
        new_remark = Prompt.ask("输入新备注", default=match.remarks or "")
        old_remark = match.remarks
        match.remarks = new_remark
        match.updated_at = __import__("datetime").datetime.now().isoformat()
        match.version += 1

        history = HistoryEntry(
            record_id=match.id,
            field_name="备注",
            old_value=old_remark or "-",
            new_value=new_remark or "-",
            operator="user",
            source=DataSource.MANUAL,
        )
        self.sm.update_match(match)
        self.sm.add_history(history)
        rprint("[green]✓ 备注已更新[/green]")
        console.input("\n按回车键继续...")

    def _flag_as_exception(self, match):
        reason = Prompt.ask("输入异常原因", default="人工标记异常")
        old_status = match.status.value
        match.status = MatchStatus.FLAGGED
        match.flags.append("人工标记")
        match.remarks = reason
        match.updated_at = __import__("datetime").datetime.now().isoformat()
        match.version += 1

        history = HistoryEntry(
            record_id=match.id,
            field_name="状态",
            old_value=old_status,
            new_value=f"异常标记: {reason}",
            operator="user",
            source=DataSource.MANUAL,
        )
        self.sm.update_match(match)
        self.sm.add_history(history)
        rprint("[green]✓ 已标记为异常[/green]")
        console.input("\n按回车键继续...")

    def _reset_match(self, match):
        if Confirm.ask("确定要重置该匹配记录吗？"):
            old_status = match.status.value
            match.status = MatchStatus.PENDING
            match.flags = ["待人工处理"]
            match.updated_at = __import__("datetime").datetime.now().isoformat()
            match.version += 1

            history = HistoryEntry(
                record_id=match.id,
                field_name="状态",
                old_value=old_status,
                new_value="重置为待匹配",
                operator="user",
                source=DataSource.MANUAL,
            )
            self.sm.update_match(match)
            self.sm.add_history(history)
            rprint("[green]✓ 已重置[/green]")
        console.input("\n按回车键继续...")

    def _split_match(self, match):
        flow = self.sm.get_bank_flow_by_id(match.bank_flow_id)
        if not flow:
            rprint("[red]找不到对应的银行流水记录[/red]")
            console.input("\n按回车键继续...")
            return

        total_amount = abs(match.matched_amount)
        rprint(f"[cyan]拆分付款 - 原金额: {total_amount:,.2f}[/cyan]")
        rprint(f"  流水ID: {match.bank_flow_id}")
        rprint(f"  对方: {flow.counterparty}")
        rprint(f"  摘要: {flow.summary}")
        rprint("")

        try:
            num_splits = int(Prompt.ask("拆分为几笔？", default="2"))
            if num_splits < 2:
                rprint("[yellow]至少拆分为2笔[/yellow]")
                console.input("\n按回车键继续...")
                return

            split_amounts = []
            remaining = total_amount
            sign = 1 if match.matched_amount > 0 else -1

            for i in range(num_splits):
                if i == num_splits - 1:
                    amount = remaining * sign
                    rprint(f"  第{i+1}笔 (最后一笔): {amount:,.2f}")
                else:
                    default_amount = (total_amount / num_splits)
                    amount_str = Prompt.ask(
                        f"  第{i+1}笔金额 (剩余: {remaining:,.2f})",
                        default=f"{default_amount:.2f}"
                    )
                    amount = float(amount_str) * sign
                    remaining -= abs(amount)

                if abs(amount) <= 0:
                    rprint("[red]金额必须大于0[/red]")
                    console.input("\n按回车键继续...")
                    return
                split_amounts.append(amount)

            if abs(sum(split_amounts) - match.matched_amount) > 0.01:
                rprint(f"[red]拆分金额合计 {sum(split_amounts):,.2f} 与原金额 {match.matched_amount:,.2f} 不符[/red]")
                console.input("\n按回车键继续...")
                return

        except ValueError:
            rprint("[red]输入无效[/red]")
            console.input("\n按回车键继续...")
            return

        if not Confirm.ask(f"确认拆分为 {num_splits} 笔，金额分别为 {split_amounts}？"):
            console.input("\n按回车键继续...")
            return

        old_status = match.status.value
        match.status = MatchStatus.SPLIT
        match.flags = [f"已拆分为{num_splits}笔"]
        match.updated_at = __import__("datetime").datetime.now().isoformat()
        match.version += 1

        history = HistoryEntry(
            record_id=match.id,
            field_name="拆分",
            old_value=f"{old_status}, 金额: {match.matched_amount:,.2f}",
            new_value=f"已拆分为{num_splits}笔: {split_amounts}",
            operator="user",
            source=DataSource.MANUAL,
        )
        self.sm.update_match(match)
        self.sm.add_history(history)

        new_matches = self.engine.split_match(match, split_amounts, self.sm.state.invoices)
        for new_match in new_matches:
            self.sm.add_match(new_match)

        rprint(f"[green]✓ 拆分成功，生成 {len(new_matches)} 条新记录[/green]")
        console.input("\n按回车键继续...")

    def _merge_match(self, match):
        same_flow_matches = [
            m for m in self.sm.state.matches
            if m.bank_flow_id == match.bank_flow_id and m.id != match.id
        ]

        if not same_flow_matches:
            rprint("[yellow]没有找到同一条流水的其他匹配记录可合并[/yellow]")
            console.input("\n按回车键继续...")
            return

        rprint(f"[cyan]合并匹配 - 当前记录: {match.id[:8]}[/cyan]")
        rprint(f"  金额: {match.matched_amount:,.2f}")
        rprint(f"  发票: {', '.join(match.invoice_ids) if match.invoice_ids else '无'}")
        rprint("")
        rprint("[cyan]可合并的记录:[/cyan]")

        for idx, m in enumerate(same_flow_matches, 1):
            inv_count = len(m.invoice_ids)
            rprint(f"  [{idx}] {m.id[:8]} | {m.status.value:8s} | {m.matched_amount:,.2f} | 发票{inv_count}张")

        rprint("")
        choices_str = Prompt.ask("选择要合并的记录序号（用逗号分隔多个）", default="1")

        try:
            selected_indices = [int(x.strip()) - 1 for x in choices_str.split(",")]
            source_matches = [same_flow_matches[i] for i in selected_indices if 0 <= i < len(same_flow_matches)]

            if not source_matches:
                rprint("[yellow]未选择有效记录[/yellow]")
                console.input("\n按回车键继续...")
                return

            total_new = sum(m.matched_amount for m in source_matches)
            rprint(f"  选中 {len(source_matches)} 条记录，合计金额: {total_new:,.2f}")
            rprint(f"  合并后总金额: {match.matched_amount + total_new:,.2f}")

        except (ValueError, IndexError):
            rprint("[red]选择无效[/red]")
            console.input("\n按回车键继续...")
            return

        if not Confirm.ask("确认合并？"):
            console.input("\n按回车键继续...")
            return

        updated_match, history_entries = self.engine.merge_matches(match, source_matches)
        self.sm.update_match(updated_match)

        for h in history_entries:
            self.sm.add_history(h)

        for src in source_matches:
            src.status = MatchStatus.FLAGGED
            src.flags = [f"已合并到 {match.id[:8]}"]
            self.sm.update_match(src)

        rprint(f"[green]✓ 合并成功，共合并 {len(source_matches)} 条记录[/green]")
        console.input("\n按回车键继续...")

    def _show_history(self):
        if not self.sm.state.history:
            rprint("[yellow]暂无历史记录[/yellow]")
            console.input("\n按回车键继续...")
            return

        table = Table(title="所有变更历史")
        table.add_column("时间", style="dim", width=20)
        table.add_column("记录ID", style="cyan", width=10)
        table.add_column("字段", style="white")
        table.add_column("旧值", style="red", width=25)
        table.add_column("新值", style="green", width=25)
        table.add_column("操作人", style="blue")
        table.add_column("来源", style="magenta")

        for h in sorted(self.sm.state.history, key=lambda x: x.changed_at, reverse=True):
            table.add_row(
                h.changed_at[:19].replace("T", " "),
                h.record_id[:8],
                h.field_name,
                h.old_value[:23] + "…" if len(h.old_value) > 23 else h.old_value,
                h.new_value[:23] + "…" if len(h.new_value) > 23 else h.new_value,
                h.operator,
                h.source.value,
            )

        console.print(table)
        console.input("\n按回车键继续...")

    def _run_matching(self):
        if not self.sm.state.bank_flows:
            rprint("[yellow]请先加载银行流水数据[/yellow]")
            console.input("\n按回车键继续...")
            return

        if self.sm.state.matches and Confirm.ask("已有匹配结果，是否覆盖？"):
            self.sm.clear_matches()

        with console.status("[cyan]正在执行匹配...", spinner="dots"):
            matches = self.engine.match_all(
                self.sm.state.bank_flows,
                self.sm.state.invoices,
                self.sm.state.contracts,
            )

        for match in matches:
            self.sm.add_match(match)

        stats = self._get_stats()
        rprint(f"[green]✓ 匹配完成[/green] - 共生成 {len(matches)} 条记录")
        rprint(f"  已匹配: {stats['matched']} | 冲突: {stats['conflict']} | 待处理: {stats['pending']} | 红冲: {stats['red']}")
        console.input("\n按回车键继续...")

    def _export_excel(self):
        if not self.sm.state.matches:
            rprint("[yellow]暂无匹配记录可导出[/yellow]")
            console.input("\n按回车键继续...")
            return

        output_path = Prompt.ask("输出文件路径", default="匹配结果.xlsx")
        try:
            final_path = self.exporter.export_to_excel(output_path)
            rprint(f"[green]✓ 导出成功: {final_path}[/green]")
        except Exception as e:
            rprint(f"[red]导出失败: {e}[/red]")
        console.input("\n按回车键继续...")

    def _load_samples(self):
        if self.sm.state.bank_flows and not Confirm.ask("已有数据，是否覆盖？"):
            return

        self.sm.clear_all()
        load_sample_data(self.sm)
        rprint("[green]✓ 样例数据已加载[/green]")
        rprint(f"  银行流水: {len(self.sm.state.bank_flows)} 条")
        rprint(f"  发票: {len(self.sm.state.invoices)} 张")
        rprint(f"  合同: {len(self.sm.state.contracts)} 份")

        if Confirm.ask("是否立即运行匹配？"):
            self._run_matching()
        else:
            console.input("\n按回车键继续...")

    def _clear_matches(self):
        if Confirm.ask("确定要清除所有匹配结果吗？历史记录也会被清除"):
            self.sm.clear_matches()
            rprint("[green]✓ 匹配结果已清除[/green]")
        console.input("\n按回车键继续...")

    def _show_stats(self):
        stats = self._get_stats()

        table = Table(title="数据统计")
        table.add_column("统计项", style="bold")
        table.add_column("数量", justify="right")
        table.add_column("说明", style="dim")

        table.add_row("银行流水", str(len(self.sm.state.bank_flows)), "待匹配的银行交易")
        table.add_row("发票台账", str(len(self.sm.state.invoices)), "可匹配的发票")
        table.add_row("合同", str(len(self.sm.state.contracts)), "关联合同")
        table.add_row("匹配记录总数", str(stats["total"]), "所有匹配结果")
        table.add_row("  ✓ 已匹配", str(stats["matched"]), "自动匹配成功")
        table.add_row("  ⚠️  待匹配", str(stats["pending"]), "需要人工处理")
        table.add_row("  ❌ 冲突", str(stats["conflict"]), "同名/多候选")
        table.add_row("  ✂️  拆分中", str(stats["split"]), "可能需要拆分")
        table.add_row("  👤 人工确认", str(stats["manual"]), "已人工确认")
        table.add_row("  🔴 红冲发票", str(stats["red"]), "红字发票匹配")

        console.print(table)

        if self.sm.state.bank_flows:
            total_in = sum([f.amount for f in self.sm.state.bank_flows if f.amount > 0])
            total_out = sum([abs(f.amount) for f in self.sm.state.bank_flows if f.amount < 0])
            rprint(f"\n[dim]流水总额: 收入 {total_in:,.2f} | 支出 {total_out:,.2f}[/dim]")

        console.input("\n按回车键继续...")

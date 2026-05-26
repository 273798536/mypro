import pandas as pd
from datetime import datetime
from typing import List

from .models import MatchRecord, MatchStatus
from .state_manager import StateManager


class Exporter:
    def __init__(self, state_manager: StateManager):
        self.sm = state_manager

    def export_to_excel(self, output_path: str, status_filter: str = None) -> str:
        matches = self.sm.state.matches
        if status_filter:
            matches = [m for m in matches if m.status.value == status_filter]

        data = []
        for match in matches:
            flow = self.sm.get_bank_flow_by_id(match.bank_flow_id)
            invoices = [self.sm.get_invoice_by_id(iid) for iid in match.invoice_ids]
            contract = self.sm.get_contract_by_id(match.contract_id) if match.contract_id else None

            row = {
                "匹配ID": match.id[:8],
                "状态": match.status.value,
                "匹配分数": f"{match.match_score:.0f}%" if match.match_score else "-",
                "匹配方式": match.match_method,
                "来源": " | ".join([s.value for s in match.sources]),
                "标记": " | ".join(match.flags) if match.flags else "-",
                "备注": match.remarks or "-",
                "版本": match.version,
                "银行流水ID": flow.id if flow else "-",
                "交易日期": flow.trade_date if flow else "-",
                "交易时间": flow.trade_time if flow else "-",
                "金额": flow.amount if flow else "-",
                "方向": flow.direction if flow else "-",
                "对方账户": flow.counterparty if flow else "-",
                "摘要": flow.summary if flow else "-",
                "银行账户": flow.bank_account if flow else "-",
                "匹配发票数": len(invoices),
                "发票号码": " | ".join([inv.invoice_number for inv in invoices if inv]),
                "发票金额合计": sum([inv.total_amount for inv in invoices if inv]),
                "合同号": contract.contract_no if contract else "-",
                "合同金额": contract.contract_amount if contract else "-",
                "创建时间": match.created_at,
                "更新时间": match.updated_at,
            }
            data.append(row)

        df = pd.DataFrame(data)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        final_path = output_path.replace(".xlsx", f"_{timestamp}.xlsx")

        with pd.ExcelWriter(final_path, engine="openpyxl") as writer:
            df.to_excel(writer, sheet_name="匹配结果", index=False)

            stats_df = self._get_stats_dataframe()
            stats_df.to_excel(writer, sheet_name="统计概览", index=False)

        return final_path

    def _get_stats_dataframe(self) -> pd.DataFrame:
        total = len(self.sm.state.matches)
        status_counts = {}
        for status in MatchStatus:
            count = len(self.sm.get_matches_by_status(status.value))
            status_counts[status.value] = count

        data = [
            {"统计项": "总记录数", "数量": total},
        ]
        for status, count in status_counts.items():
            pct = f"{(count/total*100):.1f}%" if total > 0 else "0%"
            data.append({"统计项": f"{status}", "数量": count, "占比": pct})

        total_amount = sum([m.matched_amount for m in self.sm.state.matches])
        data.append({"统计项": "涉及总金额", "数量": f"{total_amount:.2f}"})

        return pd.DataFrame(data)

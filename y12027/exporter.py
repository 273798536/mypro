import pandas as pd
from datetime import date, datetime
from typing import List, Dict, Optional
import io
import os

from models import (
    VerificationResult, Dispute, VerificationStatus, DisputeType,
    AttendanceRecord, Staff
)
from data_store import DataStore
from version_compare import VersionDiff


class DataExporter:
    def __init__(self, data_store: DataStore):
        self.data_store = data_store
    
    def export_to_excel(self, result: VerificationResult, 
                       output_path: Optional[str] = None) -> bytes:
        output = io.BytesIO()
        
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            self._write_summary_sheet(writer, result)
            self._write_attendance_sheet(writer, result)
            self._write_disputes_sheet(writer, result)
            self._write_duplicate_days_sheet(writer, result)
            self._write_version_info_sheet(writer, result)
        
        output.seek(0)
        excel_data = output.getvalue()
        
        if output_path:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, 'wb') as f:
                f.write(excel_data)
        
        return excel_data
    
    def export_to_csv(self, result: VerificationResult, 
                     output_dir: str = "exports") -> Dict[str, str]:
        os.makedirs(output_dir, exist_ok=True)
        files = {}
        
        attendance_df = self._get_attendance_dataframe(result)
        attendance_path = os.path.join(output_dir, f"attendance_v{result.version}.csv")
        attendance_df.to_csv(attendance_path, index=False, encoding='utf-8-sig')
        files['attendance'] = attendance_path
        
        disputes_df = self._get_disputes_dataframe(result)
        disputes_path = os.path.join(output_dir, f"disputes_v{result.version}.csv")
        disputes_df.to_csv(disputes_path, index=False, encoding='utf-8-sig')
        files['disputes'] = disputes_path
        
        summary_df = self._get_summary_dataframe(result)
        summary_path = os.path.join(output_dir, f"summary_v{result.version}.csv")
        summary_df.to_csv(summary_path, index=False, encoding='utf-8-sig')
        files['summary'] = summary_path
        
        return files
    
    def export_version_diff(self, diff: VersionDiff, 
                           output_path: Optional[str] = None) -> bytes:
        output = io.BytesIO()
        
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            self._write_diff_summary_sheet(writer, diff)
            self._write_added_disputes_sheet(writer, diff)
            self._write_removed_disputes_sheet(writer, diff)
            self._write_changed_disputes_sheet(writer, diff)
            self._write_attendance_changes_sheet(writer, diff)
        
        output.seek(0)
        excel_data = output.getvalue()
        
        if output_path:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, 'wb') as f:
                f.write(excel_data)
        
        return excel_data
    
    def _write_summary_sheet(self, writer, result: VerificationResult):
        data = [
            ["核验版本", result.version],
            ["核验结果ID", result.result_id],
            ["核验时间", result.created_at.strftime("%Y-%m-%d %H:%M:%S")],
            ["操作人", result.created_by],
            ["", ""],
            ["总人天", result.total_days],
            ["总金额(元)", result.total_amount],
            ["重复人天", result.duplicate_days],
            ["重复金额(元)", result.duplicate_amount],
            ["", ""],
            ["考勤记录数", len(result.attendance_ids)],
            ["争议总数", len(result.disputes)],
            ["  - 人天重复", sum(1 for d in result.disputes if d.dispute_type == DisputeType.DUPLICATE_DAYS)],
            ["  - 验收缺失", result.missing_acceptance_count],
            ["  - 费率变更", result.rate_change_count],
            ["  - 字段缺失", sum(1 for d in result.disputes if d.dispute_type == DisputeType.FIELD_MISSING)],
            ["", ""],
            ["状态统计", ""],
            ["  - 通过", sum(1 for d in result.disputes if d.status == VerificationStatus.PASS)],
            ["  - 警告", sum(1 for d in result.disputes if d.status == VerificationStatus.WARNING)],
            ["  - 错误", sum(1 for d in result.disputes if d.status == VerificationStatus.ERROR)],
            ["  - 待确认", sum(1 for d in result.disputes if d.status == VerificationStatus.PENDING)],
        ]
        
        df = pd.DataFrame(data, columns=["项目", "数值/说明"])
        df.to_excel(writer, sheet_name="汇总", index=False)
        
        workbook = writer.book
        worksheet = writer.sheets["汇总"]
        header_format = workbook.add_format({'bold': True, 'bg_color': '#4472C4', 'font_color': 'white'})
        worksheet.set_column('A:A', 20)
        worksheet.set_column('B:B', 40)
        
        for col_num, value in enumerate(df.columns.values):
            worksheet.write(0, col_num, value, header_format)
    
    def _write_attendance_sheet(self, writer, result: VerificationResult):
        df = self._get_attendance_dataframe(result)
        df.to_excel(writer, sheet_name="考勤明细", index=False)
        
        workbook = writer.book
        worksheet = writer.sheets["考勤明细"]
        header_format = workbook.add_format({'bold': True, 'bg_color': '#70AD47', 'font_color': 'white'})
        
        for col_num, value in enumerate(df.columns.values):
            worksheet.write(0, col_num, value, header_format)
        
        worksheet.set_column('A:A', 12)
        worksheet.set_column('B:B', 12)
        worksheet.set_column('C:C', 12)
        worksheet.set_column('D:D', 10)
        worksheet.set_column('E:E', 15)
        worksheet.set_column('F:F', 20)
        worksheet.set_column('G:G', 12)
        worksheet.set_column('H:H', 15)
        worksheet.set_column('I:I', 30)
    
    def _get_attendance_dataframe(self, result: VerificationResult) -> pd.DataFrame:
        records = []
        for aid in result.attendance_ids:
            record = self.data_store.attendance.get(aid)
            if record:
                staff = self.data_store.staff.get(record.staff_id)
                staff_name = staff.name if staff else record.staff_id
                rate = self.data_store.get_rate_for_date(record.staff_id, record.work_date)
                daily_rate = rate.daily_rate if rate else 0
                amount = (record.hours / 8.0) * daily_rate
                
                records.append({
                    "考勤ID": record.attendance_id,
                    "人员ID": record.staff_id,
                    "人员姓名": staff_name,
                    "日期": record.work_date.isoformat(),
                    "工时(小时)": record.hours,
                    "项目编号": record.project_code,
                    "日费率(元)": daily_rate,
                    "费用(元)": round(amount, 2),
                    "数据来源": record.source,
                    "备注": record.remark,
                    "审批状态": "已审批" if record.is_approved else "未审批"
                })
        
        return pd.DataFrame(records)
    
    def _write_disputes_sheet(self, writer, result: VerificationResult):
        df = self._get_disputes_dataframe(result)
        df.to_excel(writer, sheet_name="争议明细", index=False)
        
        workbook = writer.book
        worksheet = writer.sheets["争议明细"]
        header_format = workbook.add_format({'bold': True, 'bg_color': '#C00000', 'font_color': 'white'})
        
        for col_num, value in enumerate(df.columns.values):
            worksheet.write(0, col_num, value, header_format)
        
        worksheet.set_column('A:A', 12)
        worksheet.set_column('B:B', 15)
        worksheet.set_column('C:C', 12)
        worksheet.set_column('D:D', 12)
        worksheet.set_column('E:E', 12)
        worksheet.set_column('F:F', 50)
        worksheet.set_column('G:G', 50)
        worksheet.set_column('H:H', 12)
    
    def _get_disputes_dataframe(self, result: VerificationResult) -> pd.DataFrame:
        records = []
        for dispute in result.disputes:
            staff = self.data_store.staff.get(dispute.staff_id)
            staff_name = staff.name if staff else dispute.staff_id
            
            records.append({
                "争议ID": dispute.dispute_id,
                "争议类型": dispute.dispute_type.value,
                "人员姓名": staff_name,
                "日期": dispute.work_date.isoformat() if dispute.work_date else "",
                "状态": dispute.status.value,
                "问题描述": dispute.description,
                "操作建议": dispute.suggestion,
                "是否解决": "是" if dispute.resolved else "否",
                "关联考勤ID": ", ".join(dispute.attendance_ids),
                "原值": dispute.old_value or "",
                "新值": dispute.new_value or ""
            })
        
        return pd.DataFrame(records)
    
    def _write_duplicate_days_sheet(self, writer, result: VerificationResult):
        duplicate_disputes = [d for d in result.disputes if d.dispute_type == DisputeType.DUPLICATE_DAYS]
        
        records = []
        for dispute in duplicate_disputes:
            staff = self.data_store.staff.get(dispute.staff_id)
            staff_name = staff.name if staff else dispute.staff_id
            
            for aid in dispute.attendance_ids:
                record = self.data_store.attendance.get(aid)
                if record:
                    records.append({
                        "争议ID": dispute.dispute_id,
                        "人员姓名": staff_name,
                        "日期": dispute.work_date.isoformat() if dispute.work_date else "",
                        "考勤ID": aid,
                        "工时": record.hours,
                        "数据来源": record.source,
                        "项目编号": record.project_code,
                        "备注": record.remark
                    })
        
        df = pd.DataFrame(records)
        df.to_excel(writer, sheet_name="重复人天明细", index=False)
        
        if not df.empty:
            workbook = writer.book
            worksheet = writer.sheets["重复人天明细"]
            header_format = workbook.add_format({'bold': True, 'bg_color': '#FFC000', 'font_color': 'black'})
            
            for col_num, value in enumerate(df.columns.values):
                worksheet.write(0, col_num, value, header_format)
    
    def _write_version_info_sheet(self, writer, result: VerificationResult):
        prev_result = self.data_store.get_previous_result(result.result_id)
        
        data = [
            ["当前版本", result.version],
            ["当前结果ID", result.result_id],
            ["当前核验时间", result.created_at.strftime("%Y-%m-%d %H:%M:%S")],
            ["", ""],
        ]
        
        if prev_result:
            data.extend([
                ["上一版本", prev_result.version],
                ["上一结果ID", prev_result.result_id],
                ["上一核验时间", prev_result.created_at.strftime("%Y-%m-%d %H:%M:%S")],
                ["", ""],
                ["版本变化", ""],
                ["  人天变化", result.total_days - prev_result.total_days],
                ["  金额变化", result.total_amount - prev_result.total_amount],
                ["  争议数变化", len(result.disputes) - len(prev_result.disputes)]
            ])
        else:
            data.append(["说明", "这是第一个核验版本"])
        
        df = pd.DataFrame(data, columns=["项目", "数值/说明"])
        df.to_excel(writer, sheet_name="版本信息", index=False)
    
    def _get_summary_dataframe(self, result: VerificationResult) -> pd.DataFrame:
        data = [
            {"项目": "核验版本", "数值": result.version},
            {"项目": "总人天", "数值": result.total_days},
            {"项目": "总金额(元)", "数值": result.total_amount},
            {"项目": "重复人天", "数值": result.duplicate_days},
            {"项目": "重复金额(元)", "数值": result.duplicate_amount},
            {"项目": "考勤记录数", "数值": len(result.attendance_ids)},
            {"项目": "争议总数", "数值": len(result.disputes)}
        ]
        return pd.DataFrame(data)
    
    def _write_diff_summary_sheet(self, writer, diff: VersionDiff):
        data = [
            ["版本变更", f"V{diff.old_version} -> V{diff.new_version}"],
            ["结果ID变更", f"{diff.old_result_id} -> {diff.new_result_id}"],
            ["", ""],
            ["总人天变化", f"{diff.total_days_change:+} ({'增加' if diff.total_days_change > 0 else '减少' if diff.total_days_change < 0 else '不变'})"],
            ["总金额变化", f"{diff.total_amount_change:+}元 ({'增加' if diff.total_amount_change > 0 else '减少' if diff.total_amount_change < 0 else '不变'})"],
            ["重复人天变化", f"{diff.duplicate_days_change:+}"],
            ["重复金额变化", f"{diff.duplicate_amount_change:+}元"],
            ["", ""],
            ["争议变化", ""],
            ["  新增争议", len(diff.added_disputes)],
            ["  解决争议", len(diff.removed_disputes)],
            ["  变更争议", len(diff.changed_disputes)],
            ["", ""],
            ["考勤记录变化", len(diff.attendance_changes)]
        ]
        
        df = pd.DataFrame(data, columns=["项目", "数值/说明"])
        df.to_excel(writer, sheet_name="版本对比汇总", index=False)
    
    def _write_added_disputes_sheet(self, writer, diff: VersionDiff):
        records = []
        for dispute in diff.added_disputes:
            staff = self.data_store.staff.get(dispute.staff_id)
            staff_name = staff.name if staff else dispute.staff_id
            records.append({
                "争议ID": dispute.dispute_id,
                "类型": dispute.dispute_type.value,
                "人员": staff_name,
                "日期": dispute.work_date.isoformat() if dispute.work_date else "",
                "状态": dispute.status.value,
                "描述": dispute.description,
                "建议": dispute.suggestion
            })
        
        df = pd.DataFrame(records)
        df.to_excel(writer, sheet_name="新增争议", index=False)
    
    def _write_removed_disputes_sheet(self, writer, diff: VersionDiff):
        records = []
        for dispute in diff.removed_disputes:
            staff = self.data_store.staff.get(dispute.staff_id)
            staff_name = staff.name if staff else dispute.staff_id
            records.append({
                "争议ID": dispute.dispute_id,
                "类型": dispute.dispute_type.value,
                "人员": staff_name,
                "日期": dispute.work_date.isoformat() if dispute.work_date else "",
                "原状态": dispute.status.value,
                "描述": dispute.description
            })
        
        df = pd.DataFrame(records)
        df.to_excel(writer, sheet_name="已解决争议", index=False)
    
    def _write_changed_disputes_sheet(self, writer, diff: VersionDiff):
        records = []
        for old_d, new_d, changes in diff.changed_disputes:
            staff = self.data_store.staff.get(new_d.staff_id)
            staff_name = staff.name if staff else new_d.staff_id
            
            change_desc = "; ".join([f"{c.field_name}: {c.old_value} -> {c.new_value}" for c in changes])
            records.append({
                "争议ID": new_d.dispute_id,
                "类型": new_d.dispute_type.value,
                "人员": staff_name,
                "日期": new_d.work_date.isoformat() if new_d.work_date else "",
                "原状态": old_d.status.value,
                "新状态": new_d.status.value,
                "变更内容": change_desc
            })
        
        df = pd.DataFrame(records)
        df.to_excel(writer, sheet_name="变更争议", index=False)
    
    def _write_attendance_changes_sheet(self, writer, diff: VersionDiff):
        records = []
        for change in diff.attendance_changes:
            records.append({
                "变更类型": change.field_name,
                "原值": change.old_value,
                "新值": change.new_value,
                "类型": change.change_type
            })
        
        df = pd.DataFrame(records)
        df.to_excel(writer, sheet_name="考勤变更明细", index=False)

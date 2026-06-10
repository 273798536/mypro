from typing import Dict, Any, List, Tuple
from dataclasses import dataclass, field
from .fitter import FitResult, SternVolmerFitter


@dataclass
class SafetyAlert:
    level: str = ''
    category: str = ''
    title: str = ''
    detail: str = ''
    affected_materials: List[str] = field(default_factory=list)
    affected_rows: List[int] = field(default_factory=list)
    affected_batches: List[str] = field(default_factory=list)
    evidence: str = ''


@dataclass
class SafetyReport:
    alerts: List[SafetyAlert] = field(default_factory=list)
    fit_before: Dict[str, Any] = field(default_factory=dict)
    fit_after: Dict[str, Any] = field(default_factory=dict)
    comparison: Dict[str, Any] = field(default_factory=dict)
    summary_text: str = ''
    executive_summary: str = ''


class SafetyAnalyzer:
    def __init__(self, issues: Dict[str, Any]):
        self.issues = issues
        self.report = SafetyReport()

    def _alert_time_missing(self) -> None:
        if not self.issues.get('time_missing'):
            return

        for item in self.issues['time_missing']:
            batch = item.get('batch_no', '')
            material = item.get('material', '')
            row_id = item.get('row_id', '')
            remark = item.get('remark', '')

            evidence_parts = []
            if remark:
                evidence_parts.append(f'备注写有"{remark}"')
            if item.get('idx'):
                evidence_parts.append(f'序号{item["idx"]}')

            evidence = '；'.join(evidence_parts) if evidence_parts else '无'

            self.report.alerts.append(SafetyAlert(
                level='高风险',
                category='反应时间漏记',
                title=f'反应时间缺失 - 批号[{batch}]',
                detail=(f'材料【{material}】的第{row_id}行记录缺少反应时间。'
                        f'荧光猝灭反应时间直接影响I0/I比值准确性，'
                        f'漏记将导致拟合结果不可靠。'),
                affected_materials=[material] if material else [],
                affected_rows=[row_id],
                affected_batches=[batch],
                evidence=evidence
            ))

    def _alert_duplicate_batches(self) -> None:
        if not self.issues.get('duplicate_batches'):
            return

        for item in self.issues['duplicate_batches']:
            batch = item.get('batch_no', '')
            materials = list(set(item.get('materials', [])))
            rows = item.get('row_ids', [])
            concentrations = item.get('concentrations', [])

            self.report.alerts.append(SafetyAlert(
                level='中风险',
                category='批号重复',
                title=f'批号重复检测 - 批号[{batch}]',
                detail=(f'批号【{batch}】在原始数据中出现{item["count"]}次，'
                        f'涉及浓度值: {concentrations}。'
                        f'系统已自动按浓度取均值处理，但需人工确认是否为平行样或录入错误。'
                        f'涉及材料: {", ".join(materials)}'),
                affected_materials=materials,
                affected_rows=rows,
                affected_batches=[batch],
                evidence=f'涉及行号: {rows}'
            ))

    def _alert_unit_missing(self) -> None:
        if not self.issues.get('unit_missing'):
            return

        for item in self.issues['unit_missing']:
            batch = item.get('batch_no', '')
            material = item.get('material', '')
            row_id = item.get('row_id', '')
            remark = item.get('remark', '')

            evidence = f'备注"{remark}"' if remark else '无'

            self.report.alerts.append(SafetyAlert(
                level='中风险',
                category='单位漏填',
                title=f'浓度单位缺失 - 批号[{batch}]',
                detail=(f'材料【{material}】的第{row_id}行缺少浓度单位。'
                        f'已假定单位为 mmol/L，如实际不同将严重影响Ksv值量纲。'),
                affected_materials=[material] if material else [],
                affected_rows=[row_id],
                affected_batches=[batch],
                evidence=evidence
            ))

    def _alert_abnormal_intensity(self) -> None:
        if not self.issues.get('abnormal_intensity'):
            return

        for item in self.issues['abnormal_intensity']:
            batch = item.get('batch_no', '')
            material = item.get('material', '')
            row_id = item.get('row_id', '')
            intensity = item.get('intensity', 'N/A')
            reasons = '; '.join(item.get('reasons', []))

            self.report.alerts.append(SafetyAlert(
                level='高风险',
                category='异常数据点',
                title=f'异常荧光强度 - 批号[{batch}]',
                detail=(f'材料【{material}】第{row_id}行的荧光强度值{intensity}判定为异常。'
                        f'已自动从拟合中排除。可能原因：仪器故障、操作失误、样品污染等。'
                        f'建议重新检测确认。'),
                affected_materials=[material] if material else [],
                affected_rows=[row_id],
                affected_batches=[batch],
                evidence=reasons
            ))

    def _alert_supplementary(self) -> None:
        if not self.issues.get('supplementary_records'):
            return

        for item in self.issues['supplementary_records']:
            batch = item.get('batch_no', '')
            material = item.get('material', '')
            row_id = item.get('row_id', '')
            remark = item.get('remark', '')

            self.report.alerts.append(SafetyAlert(
                level='低风险',
                category='补录/旧表数据',
                title=f'补录数据提醒 - 批号[{batch}]',
                detail=(f'第{row_id}行数据标记为【{remark}】。'
                        f'补录数据的原始记录追溯性可能不足，建议在纸质档案中确认原始数据。'),
                affected_materials=[material] if material else [],
                affected_rows=[row_id],
                affected_batches=[batch],
                evidence=remark
            ))

    def _alert_inconsistent_time(self) -> None:
        if not self.issues.get('inconsistent_time'):
            return

        for item in self.issues['inconsistent_time']:
            batch = item.get('batch_no', '')
            material = item.get('material', '')
            row_id = item.get('row_id', '')
            current = item.get('reaction_time', '')
            standard = item.get('standard_time', '')

            self.report.alerts.append(SafetyAlert(
                level='中风险',
                category='反应时间不一致',
                title=f'反应时间异常 - 批号[{batch}]',
                detail=(f'材料【{material}】第{row_id}行反应时间为{current}min，'
                        f'与大多数记录的{standard}min不符。'
                        f'已在配平计算中按时间比例校正，但建议人工复核原始记录。'),
                affected_materials=[material] if material else [],
                affected_rows=[row_id],
                affected_batches=[batch],
                evidence=f'当前{current}min vs 标准{standard}min'
            ))

    def _alert_mixed_materials(self) -> None:
        mats = self.issues.get('mixed_materials', [])
        if not mats or len(mats) <= 1:
            return

        self.report.alerts.append(SafetyAlert(
            level='提示',
            category='多材料混合',
            title='检测到多种荧光材料',
            detail=(f'本批数据包含 {len(mats)} 种材料: {", ".join(mats)}。'
                    f'已合并拟合。如需分别拟合请按材料拆分后重新运行。'),
            affected_materials=mats,
            evidence=f'材料种类: {mats}'
        ))

    def analyze(self, fit_before: FitResult, fit_after: FitResult,
                df_before: FitResult = None) -> SafetyReport:
        self._alert_time_missing()
        self._alert_duplicate_batches()
        self._alert_unit_missing()
        self._alert_abnormal_intensity()
        self._alert_supplementary()
        self._alert_inconsistent_time()
        self._alert_mixed_materials()

        self.report.fit_before = {
            'method': fit_before.method,
            'ksv': fit_before.ksv,
            'ksv_err': fit_before.ksv_err,
            'intercept': fit_before.intercept,
            'r_squared': fit_before.r_squared,
            'rmse': fit_before.rmse,
            'n_points': fit_before.n_points,
            'warnings': fit_before.warnings
        }

        self.report.fit_after = {
            'method': fit_after.method,
            'ksv': fit_after.ksv,
            'ksv_err': fit_after.ksv_err,
            'intercept': fit_after.intercept,
            'r_squared': fit_after.r_squared,
            'rmse': fit_after.rmse,
            'n_points': fit_after.n_points,
            'warnings': fit_after.warnings
        }

        self.report.comparison = SternVolmerFitter.compare_fits(fit_before, fit_after)
        self._build_summary()

        return self.report

    def _build_summary(self) -> None:
        high_risk = [a for a in self.report.alerts if a.level == '高风险']
        mid_risk = [a for a in self.report.alerts if a.level == '中风险']
        low_risk = [a for a in self.report.alerts if a.level == '低风险']

        lines = []
        lines.append('=' * 70)
        lines.append('安全分析总结报告')
        lines.append('=' * 70)
        lines.append(f'风险分级统计: 高风险 {len(high_risk)} 项 | 中风险 {len(mid_risk)} 项 | 低风险 {len(low_risk)} 项')
        lines.append('')

        if high_risk:
            lines.append('【高风险项 - 必须人工确认】')
            for a in high_risk:
                mats = ','.join(a.affected_materials) if a.affected_materials else '未标记'
                lines.append(f'  ● {a.title}')
                lines.append(f'    材料: {mats} | 批号: {", ".join(a.affected_batches)} | 行: {a.affected_rows}')
                lines.append(f'    说明: {a.detail}')
            lines.append('')

        if mid_risk:
            lines.append('【中风险项 - 建议复核】')
            for a in mid_risk:
                mats = ','.join(a.affected_materials) if a.affected_materials else '未标记'
                lines.append(f'  ● {a.title}')
                lines.append(f'    材料: {mats} | 批号: {", ".join(a.affected_batches)} | 行: {a.affected_rows}')
            lines.append('')

        comp = self.report.comparison
        lines.append('【配平前后对比】')
        lines.append(f'  Ksv 变化: {self.report.fit_before["ksv"]:.6f} → {self.report.fit_after["ksv"]:.6f} '
                     f'({comp["ksv_pct_change"]:+.2f}%)')
        lines.append(f'  R² 变化:  {self.report.fit_before["r_squared"]:.4f} → {self.report.fit_after["r_squared"]:.4f}')
        lines.append(f'  判定结果: {comp["judgment_before"]} → {comp["judgment_after"]}')
        if comp['judgment_changed']:
            lines.append(f'  ⚠ 判定结果发生改变！配平前后结论不同，需重点关注。')
        lines.append('')

        time_alerts = [a for a in self.report.alerts if a.category == '反应时间漏记']
        if time_alerts:
            lines.append('【反应时间漏记定位清单 - 供质检主管复核】')
            for a in time_alerts:
                mats = ','.join(a.affected_materials) if a.affected_materials else '未标记'
                batches = ','.join(a.affected_batches)
                lines.append(f'  → 材料【{mats}】| 批号【{batches}】| 数据行: {a.affected_rows}')
                if a.evidence and a.evidence != '无':
                    lines.append(f'    佐证: {a.evidence}')
            lines.append('')

        dup_alerts = [a for a in self.report.alerts if a.category == '批号重复']
        if dup_alerts:
            lines.append('【批号重复定位清单 - 供质检主管复核】')
            for a in dup_alerts:
                mats = ','.join(a.affected_materials) if a.affected_materials else '未标记'
                batches = ','.join(a.affected_batches)
                lines.append(f'  → 材料【{mats}】| 批号【{batches}】| 数据行: {a.affected_rows}')
            lines.append('')

        lines.append('=' * 70)
        self.report.summary_text = '\n'.join(lines)

        exec_lines = []
        exec_lines.append(f'本批数据共检测到安全隐患 {len(self.report.alerts)} 项')
        exec_lines.append(f'（高风险{len(high_risk)}、中风险{len(mid_risk)}、低风险{len(low_risk)}）。')
        if comp['judgment_changed']:
            exec_lines.append(
                f'【重要】配平计算改变了质量判定："{comp["judgment_before"]}" → "{comp["judgment_after"]}"。'
                f'反应时间漏记数据位于: '
            )
            for a in time_alerts:
                mats = ','.join(a.affected_materials)
                exec_lines.append(f'  - 材料【{mats}】批号【{", ".join(a.affected_batches)}】(行{a.affected_rows})')
            for a in dup_alerts:
                mats = ','.join(a.affected_materials)
                exec_lines.append(f'  - 材料【{mats}】批号【{", ".join(a.affected_batches)}】重复记录')
        else:
            exec_lines.append(f'配平前后判定一致（{comp["judgment_after"]}）。')
            if time_alerts:
                exec_lines.append('反应时间漏记问题记录如下：')
                for a in time_alerts:
                    mats = ','.join(a.affected_materials)
                    exec_lines.append(f'  - 材料【{mats}】批号【{", ".join(a.affected_batches)}】(行{a.affected_rows})')
            if dup_alerts:
                exec_lines.append('批号重复问题记录如下：')
                for a in dup_alerts:
                    mats = ','.join(a.affected_materials)
                    exec_lines.append(f'  - 材料【{mats}】批号【{", ".join(a.affected_batches)}】重复记录')
        self.report.executive_summary = ' '.join(exec_lines)

    def format_alerts_table(self) -> str:
        if not self.report.alerts:
            return '（无安全问题）'

        lines = []
        lines.append(f'{"风险等级":<8} {"类别":<14} {"批号":<20} {"材料":<16} {"行号":<8} 说明')
        lines.append('─' * 100)
        for a in self.report.alerts:
            mats = ','.join(a.affected_materials)[:14] if a.affected_materials else '-'
            batches = ','.join(a.affected_batches)[:18] if a.affected_batches else '-'
            rows = ','.join(str(r) for r in a.affected_rows)[:6]
            detail = a.detail[:40] + ('...' if len(a.detail) > 40 else '')
            lines.append(f'{a.level:<8} {a.category:<14} {batches:<20} {mats:<16} {rows:<8} {detail}')
        return '\n'.join(lines)

    def get_executive_for_manager(self) -> str:
        return self.report.executive_summary

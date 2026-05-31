import csv
import json
from datetime import date, datetime
from typing import List, Dict, Optional
from pathlib import Path


class Reporter:
    def __init__(self, output_dir: str = "reports"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)

    def export_charges_csv(self, charges: List, filename: str = None) -> str:
        if filename is None:
            filename = f"charges_{date.today().isoformat()}.csv"
        filepath = self.output_dir / filename

        with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow([
                '客户', '日期', '机柜ID', '电表读数(kWh)', 'PUE系数',
                '分摊后电量(kWh)', '峰时电费(元)', '谷时电费(元)', '总电费(元)',
                '抄表记录ID', 'PUE记录ID'
            ])

            for c in charges:
                writer.writerow([
                    c.customer,
                    c.date.isoformat(),
                    c.rack_id,
                    c.consumption_kwh,
                    c.pue_factor,
                    c.final_kwh,
                    c.peak_cost,
                    c.offpeak_cost,
                    c.total_cost,
                    ','.join(c.reading_ids),
                    ','.join(c.pue_ids)
                ])

        return str(filepath)

    def export_price_details_csv(self, charges: List, filename: str = None) -> str:
        if filename is None:
            filename = f"price_details_{date.today().isoformat()}.csv"
        filepath = self.output_dir / filename

        rows = []
        for c in charges:
            for detail in c.price_details:
                rows.append([
                    c.customer,
                    c.date.isoformat(),
                    c.rack_id,
                    detail['period'],
                    detail['hours'],
                    detail['kwh'],
                    detail['price'],
                    detail['cost'],
                    '峰时' if detail['is_peak'] else '谷时'
                ])

        with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow([
                '客户', '日期', '机柜ID', '时段', '小时数',
                '电量(kWh)', '单价(元/kWh)', '电费(元)', '峰谷标识'
            ])
            writer.writerows(rows)

        return str(filepath)

    def export_bad_rows_csv(self, bad_rows: List, filename: str = None) -> str:
        if filename is None:
            filename = f"bad_rows_{date.today().isoformat()}.csv"
        filepath = self.output_dir / filename

        with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow([
                '数据类型', '记录ID', '是否排除', '问题数量',
                '问题类型', '严重程度', '问题描述', '原始数据'
            ])

            for br in bad_rows:
                for issue in br.issues:
                    writer.writerow([
                        br.row_type,
                        br.row_id,
                        '是' if br.excluded_from_calc else '否',
                        len(br.issues),
                        issue.issue_type,
                        issue.severity,
                        issue.message,
                        json.dumps(br.data, ensure_ascii=False, default=str)
                    ])

        return str(filepath)

    def export_gaps_csv(self, gaps: List, filename: str = None) -> str:
        if filename is None:
            filename = f"meter_gaps_{date.today().isoformat()}.csv"
        filepath = self.output_dir / filename

        with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow([
                '缺口ID', '机柜ID', '缺口开始时间', '缺口结束时间',
                '缺口小时数', '前次抄表ID', '后次抄表ID',
                '预估耗电量(kWh)', '是否已解决', '解决说明'
            ])

            for g in gaps:
                writer.writerow([
                    g.gap_id,
                    g.rack_id,
                    g.gap_start.isoformat() if g.gap_start else '',
                    g.gap_end.isoformat() if g.gap_end else '',
                    g.gap_hours,
                    g.previous_reading_id,
                    g.next_reading_id,
                    g.estimated_consumption if g.estimated_consumption is not None else '',
                    '是' if g.is_resolved else '否',
                    g.resolve_note or ''
                ])

        return str(filepath)

    def export_migrations_csv(self, migrations: List, filename: str = None) -> str:
        if filename is None:
            filename = f"migrations_{date.today().isoformat()}.csv"
        filepath = self.output_dir / filename

        with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow([
                '迁柜ID', '机柜ID', '客户', '原位置', '新位置',
                '迁柜日期', '是否跨日', '缺口小时数', '影响抄表ID'
            ])

            for m in migrations:
                writer.writerow([
                    m.migration_id,
                    m.rack_id,
                    m.customer,
                    m.old_location,
                    m.new_location,
                    m.migration_date.isoformat(),
                    '是' if m.cross_day else '否',
                    m.gap_hours,
                    ','.join(m.affected_readings)
                ])

        return str(filepath)

    def export_reading_versions_csv(self, explanations: List[Dict],
                                    filename: str = None) -> str:
        if filename is None:
            filename = f"reading_versions_{date.today().isoformat()}.csv"
        filepath = self.output_dir / filename

        rows = []
        for exp in explanations:
            for rv in exp.get('reading_versions', []):
                for v in rv['versions']:
                    rows.append([
                        exp['customer'],
                        rv['rack_id'],
                        rv['date'],
                        v['version'],
                        v['reading_id'],
                        '是' if v['is_supplement'] else '否',
                        v['start_kwh'],
                        v['end_kwh'],
                        v['consumption'],
                        v['replaced_by'] or '',
                        v['source']
                    ])

        with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow([
                '客户', '机柜ID', '日期', '版本号', '抄表ID',
                '是否补充', '起度(kWh)', '止度(kWh)', '用电量(kWh)',
                '被替换为', '数据来源'
            ])
            writer.writerows(rows)

        return str(filepath)

    def export_summary_excel(self, charges: List, explanations: List[Dict],
                             bad_rows: List, gaps: List, migrations: List,
                             filename: str = None) -> Dict[str, str]:
        if filename is None:
            filename = f"summary_report_{date.today().isoformat()}"

        files = {}
        files['charges'] = self.export_charges_csv(charges, f"{filename}_charges.csv")
        files['price_details'] = self.export_price_details_csv(charges, f"{filename}_price_details.csv")
        files['bad_rows'] = self.export_bad_rows_csv(bad_rows, f"{filename}_bad_rows.csv")
        files['gaps'] = self.export_gaps_csv(gaps, f"{filename}_gaps.csv")
        files['migrations'] = self.export_migrations_csv(migrations, f"{filename}_migrations.csv")
        files['reading_versions'] = self.export_reading_versions_csv(
            explanations, f"{filename}_reading_versions.csv"
        )

        summary_file = self.output_dir / f"{filename}_summary.txt"
        self._write_summary_text(charges, explanations, bad_rows, gaps, migrations, summary_file)
        files['summary'] = str(summary_file)

        json_file = self.output_dir / f"{filename}_full.json"
        self._write_full_json(charges, explanations, bad_rows, gaps, migrations, json_file)
        files['json'] = str(json_file)

        return files

    def _write_summary_text(self, charges, explanations, bad_rows, gaps, migrations, filepath):
        cross_day_migrations = [m for m in migrations if m.cross_day]
        unresolved_gaps = [g for g in gaps if not g.is_resolved]
        error_bad_rows = [br for br in bad_rows
                          if any(i.severity == "error" for i in br.issues)]

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write("=" * 70 + "\n")
            f.write("                  数据中心电费分摊汇总报告\n")
            f.write("=" * 70 + "\n")
            f.write(f"生成时间: {datetime.now().isoformat()}\n\n")

            total_cost = sum(c.total_cost for c in charges)
            total_kwh = sum(c.final_kwh for c in charges)
            customers = set(c.customer for c in charges)

            f.write("【总体情况】\n")
            f.write(f"  客户数量: {len(customers)}\n")
            f.write(f"  分摊记录: {len(charges)} 条\n")
            f.write(f"  总分摊电量: {total_kwh:,.2f} kWh\n")
            f.write(f"  总电费: {total_cost:,.2f} 元\n\n")

            f.write("【异常汇总】\n")
            f.write(f"  ⚠️  迁柜跨日: {len(cross_day_migrations)} 笔 (需要人工核对)\n")
            f.write(f"  ⚠️  抄表缺口: {len(unresolved_gaps)} 笔 (未解决)\n")
            f.write(f"  ⚠️  坏行记录: {len(bad_rows)} 笔 (严重错误{len(error_bad_rows)}笔)\n")
            f.write(f"  ⚠️  补充抄表: {len([r for r in explanations for v in r.get('reading_versions', [])])} 笔\n\n")

            if cross_day_migrations:
                f.write("\n" + "!" * 70 + "\n")
                f.write("【醒目】迁柜跨日记录 - 必须人工核对！\n")
                f.write("!" * 70 + "\n")
                for m in cross_day_migrations:
                    f.write(f"  迁柜ID: {m.migration_id}\n")
                    f.write(f"  客户: {m.customer} | 机柜: {m.rack_id}\n")
                    f.write(f"  {m.old_location} → {m.new_location} | 日期: {m.migration_date}\n")
                    f.write(f"  缺口: {m.gap_hours} 小时 | 影响抄表: {m.affected_readings}\n")
                    f.write(f"  处理建议: 请确认迁柜当日电费归属和缺口小时数分摊方式\n\n")

            if unresolved_gaps:
                f.write("\n" + "!" * 70 + "\n")
                f.write("【醒目】抄表缺口记录 - 必须人工处理！\n")
                f.write("!" * 70 + "\n")
                for g in unresolved_gaps:
                    f.write(f"  缺口ID: {g.gap_id}\n")
                    f.write(f"  机柜: {g.rack_id}\n")
                    f.write(f"  时间: {g.gap_start} → {g.gap_end}\n")
                    f.write(f"  缺口: {g.gap_hours} 小时\n")
                    f.write(f"  前次抄表: {g.previous_reading_id} | 后次抄表: {g.next_reading_id}\n")
                    f.write(f"  预估耗电: {g.estimated_consumption} kWh\n")
                    f.write(f"  处理建议: 请补录抄表或说明缺口原因\n\n")

            f.write("\n【按客户汇总】\n")
            f.write("-" * 70 + "\n")
            for exp in explanations:
                s = exp['summary']
                f.write(f"\n客户: {exp['customer']}\n")
                f.write(f"  有效天数: {s['total_days']} 天 | 活跃机柜: {s['active_racks']} 台\n")
                f.write(f"  分摊电量: {s['total_kwh']:,.2f} kWh\n")
                f.write(f"  电费合计: {s['total_cost']:,.2f} 元 (峰: {s['peak_cost']:,.2f} / 谷: {s['offpeak_cost']:,.2f})\n")
                for note in exp['notes']:
                    f.write(f"  {note}\n")

            if bad_rows:
                f.write("\n\n【坏行明细 - 已排除计算】\n")
                f.write("-" * 70 + "\n")
                for br in bad_rows:
                    f.write(f"\n[{br.row_type}] {br.row_id}\n")
                    for issue in br.issues:
                        f.write(f"  [{issue.severity}] {issue.issue_type}: {issue.message}\n")

    def _write_full_json(self, charges, explanations, bad_rows, gaps, migrations, filepath):
        data = {
            "generated_at": datetime.now().isoformat(),
            "summary": {
                "total_charges": len(charges),
                "total_cost": sum(c.total_cost for c in charges),
                "total_kwh": sum(c.final_kwh for c in charges),
                "cross_day_migrations": len([m for m in migrations if m.cross_day]),
                "unresolved_gaps": len([g for g in gaps if not g.is_resolved]),
                "bad_rows": len(bad_rows)
            },
            "explanations": explanations,
            "charges": [
                {
                    "customer": c.customer,
                    "date": c.date.isoformat(),
                    "rack_id": c.rack_id,
                    "consumption_kwh": c.consumption_kwh,
                    "pue_factor": c.pue_factor,
                    "final_kwh": c.final_kwh,
                    "peak_cost": c.peak_cost,
                    "offpeak_cost": c.offpeak_cost,
                    "total_cost": c.total_cost,
                    "reading_ids": c.reading_ids,
                    "pue_ids": c.pue_ids,
                    "price_details": c.price_details
                }
                for c in charges
            ],
            "bad_rows": [
                {
                    "row_type": br.row_type,
                    "row_id": br.row_id,
                    "excluded": br.excluded_from_calc,
                    "issues": [
                        {
                            "type": i.issue_type,
                            "severity": i.severity,
                            "message": i.message,
                            "details": i.details
                        }
                        for i in br.issues
                    ]
                }
                for br in bad_rows
            ],
            "migrations": [
                {
                    "migration_id": m.migration_id,
                    "rack_id": m.rack_id,
                    "customer": m.customer,
                    "old_location": m.old_location,
                    "new_location": m.new_location,
                    "migration_date": m.migration_date.isoformat(),
                    "cross_day": m.cross_day,
                    "gap_hours": m.gap_hours,
                    "affected_readings": m.affected_readings
                }
                for m in migrations
            ],
            "gaps": [
                {
                    "gap_id": g.gap_id,
                    "rack_id": g.rack_id,
                    "gap_start": g.gap_start.isoformat() if g.gap_start else None,
                    "gap_end": g.gap_end.isoformat() if g.gap_end else None,
                    "gap_hours": g.gap_hours,
                    "previous_reading_id": g.previous_reading_id,
                    "next_reading_id": g.next_reading_id,
                    "estimated_consumption": g.estimated_consumption,
                    "is_resolved": g.is_resolved,
                    "resolve_note": g.resolve_note
                }
                for g in gaps
            ]
        }

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

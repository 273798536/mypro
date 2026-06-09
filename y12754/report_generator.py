from database import get_conn


def generate_report(requisition_id):
    conn = get_conn()

    req = conn.execute('SELECT * FROM requisitions WHERE id = ?', (requisition_id,)).fetchone()
    if not req:
        conn.close()
        return None

    reagent = conn.execute('SELECT * FROM reagents WHERE id = ?', (req['reagent_id'],)).fetchone()
    anomalies = conn.execute(
        'SELECT * FROM anomalies WHERE requisition_id = ? ORDER BY is_resolved, severity DESC, created_at',
        (requisition_id,)
    ).fetchall()
    remarks = conn.execute(
        'SELECT * FROM safety_remarks WHERE requisition_id = ? ORDER BY created_at',
        (requisition_id,)
    ).fetchall()
    balances = conn.execute(
        'SELECT * FROM balance_calculations WHERE requisition_id = ? ORDER BY version DESC LIMIT 1',
        (requisition_id,)
    ).fetchall()
    audit_logs = conn.execute(
        'SELECT * FROM audit_logs WHERE requisition_id = ? ORDER BY created_at',
        (requisition_id,)
    ).fetchall()

    conn.close()

    lines = []

    lines.append("=" * 60)
    lines.append("        危化品领用审计报告")
    lines.append("=" * 60)
    lines.append("")

    lines.append("【一、领用基本信息】")
    lines.append(f"  领用单号：{req['req_no']}")
    lines.append(f"  试剂名称：{req['reagent_name']}")
    if reagent:
        lines.append(f"  CAS 编号：{reagent['cas_no'] or '—'}")
        lines.append(f"  分子式  ：{reagent['formula'] or '—'}")
        lines.append(f"  危险等级：{reagent['hazard_level'] or '—'}")
    lines.append(f"  填写浓度：{req['concentration']}%")
    if reagent:
        lines.append(f"  标准浓度：{reagent['standard_concentration_min']}% ~ {reagent['standard_concentration_max']}%")
    if req['ph_value'] is not None:
        lines.append(f"  填写 pH ：{req['ph_value']}")
        if reagent:
            lines.append(f"  标准 pH ：{reagent['standard_ph_min']} ~ {reagent['standard_ph_max']}")
    lines.append(f"  领用数量：{req['quantity']} {req['unit']}")
    lines.append(f"  课题组  ：{req['project_group']}")
    lines.append(f"  申请人  ：{req['applicant']}")
    lines.append(f"  申请日期：{req['apply_date']}")
    lines.append(f"  用途说明：{req['purpose'] or '—'}")
    status_text = '通过' if req['status'] == 'approved' else '待整改'
    lines.append(f"  当前状态：{status_text}")
    lines.append("")

    if balances:
        bal = balances[0]
        lines.append("【二、配平计算结果】")
        lines.append(f"  计算版本：v{bal['version']}")
        lines.append(f"  综合结果：{bal['balance_result']}")
        lines.append(f"  风险评分：{bal['risk_score']}（越低越安全）")
        if bal['concentration_deviation'] is not None:
            lines.append(f"  浓度偏差：{bal['concentration_deviation']:+.2f} 个百分点")
        if bal['ph_deviation'] is not None:
            lines.append(f"  pH 偏差 ：{bal['ph_deviation']:+.2f}")
        lines.append("")

    fix_materials = [a for a in anomalies if a['action_type'] == '补材料' and a['is_resolved'] == 0]
    fix_caliber = [a for a in anomalies if a['action_type'] == '改口径' and a['is_resolved'] == 0]
    resolved = [a for a in anomalies if a['is_resolved'] == 1]

    lines.append("【三、审计异常与处理建议】")

    if not anomalies:
        lines.append("  （无异常）")
    else:
        lines.append(f"  待处理异常共 {len(fix_materials) + len(fix_caliber)} 条，已闭环 {len(resolved)} 条。")
        lines.append("")

        if fix_materials:
            lines.append("  ▶ 需要补充材料（{0}条）：".format(len(fix_materials)))
            lines.append("")
            for i, a in enumerate(fix_materials, 1):
                sev = '严重' if a['severity'] == 'error' else '警告'
                lines.append(f"    [{i}] {a['anomaly_type']}（{sev}）")
                lines.append(f"        问题：{a['description']}")
                lines.append(f"        下一步：请课题组补充相关检测报告或说明材料，提交后系统将自动复核。")
                lines.append("")

        if fix_caliber:
            lines.append("  ▶ 需要修改口径（{0}条）：".format(len(fix_caliber)))
            lines.append("")
            for i, a in enumerate(fix_caliber, 1):
                sev = '严重' if a['severity'] == 'error' else '警告'
                lines.append(f"    [{i}] {a['anomaly_type']}（{sev}）")
                lines.append(f"        问题：{a['description']}")
                lines.append(f"        下一步：请核对试剂原始规格，修改领用登记中的填写数据后重新提交审计。")
                lines.append("")

        if resolved:
            lines.append("  ▶ 已闭环异常（{0}条）：".format(len(resolved)))
            lines.append("")
            for i, a in enumerate(resolved, 1):
                lines.append(f"    [{i}] {a['anomaly_type']}")
                lines.append(f"        闭环说明：{a['resolved_note']}")
                lines.append(f"        闭环时间：{a['resolved_at']}")
                lines.append("")

    lines.append("【四、普通话说明（质检工程师可直接复制下发）】")
    lines.append("")
    lines.append(_generate_plain_text_explanation(req, reagent, anomalies, fix_materials, fix_caliber, resolved))
    lines.append("")

    if remarks:
        lines.append("【五、人工安全备注（保留原话）】")
        lines.append("")
        for i, r in enumerate(remarks, 1):
            lines.append(f"  备注{i}（{r['operator']} @ {r['created_at']}）：")
            lines.append(f"    {r['remark_text']}")
            lines.append("")

    lines.append("【六、审计操作日志】")
    lines.append("")
    for log in audit_logs:
        lines.append(f"  [{log['created_at']}] {log['operator']} - {log['action']}")
        lines.append(f"      {log['detail']}")
    lines.append("")

    lines.append("=" * 60)
    lines.append("报告结束")
    lines.append("=" * 60)

    return "\n".join(lines)


def _generate_plain_text_explanation(req, reagent, anomalies, fix_materials, fix_caliber, resolved):
    paragraphs = []

    hello = f"{req['project_group']}的同事您好，关于{req['apply_date']}申请领用的"
    hello += f"{req['reagent_name']}（领用单号{req['req_no']}），审计复核情况如下："
    paragraphs.append(hello)

    if not anomalies:
        paragraphs.append("本次领用各项指标均在标准范围内，审计已通过，可以正常领用。")
        return "\n\n".join(paragraphs)

    if fix_materials:
        parts = []
        for a in fix_materials:
            if a['field_name'] == 'concentration':
                parts.append(f"浓度（填了{req['concentration']}%，标准是{reagent['standard_concentration_min']}%-{reagent['standard_concentration_max']}%）")
            elif a['field_name'] == 'ph_value':
                parts.append(f"pH值（填了{req['ph_value']}，标准是{reagent['standard_ph_min']}-{reagent['standard_ph_max']}）")
        desc = "、".join(parts)
        para = f"关于{desc}的问题：数值偏离标准范围但在可解释区间内，请补充对应的检测报告或书面说明。材料上传后系统会自动重新审计，无需修改登记数据。"
        paragraphs.append(para)

    if fix_caliber:
        parts = []
        for a in fix_caliber:
            if a['field_name'] == 'concentration':
                parts.append(f"浓度（填了{req['concentration']}%，标准是{reagent['standard_concentration_min']}%-{reagent['standard_concentration_max']}%）")
            elif a['field_name'] == 'ph_value':
                parts.append(f"pH值（填了{req['ph_value']}，标准是{reagent['standard_ph_min']}-{reagent['standard_ph_max']}）")
        desc = "、".join(parts)
        para = f"关于{desc}的问题：数值偏离标准范围较大，推测可能是填写口径有误。请核对试剂瓶上的实际规格，修改领用登记表中的对应数值后重新提交。"
        paragraphs.append(para)

    if resolved:
        para = f"另外，之前标记的{len(resolved)}条异常已通过补充材料闭环，系统已自动更新审计结论。"
        paragraphs.append(para)

    if req['status'] == 'approved':
        paragraphs.append("目前所有异常均已处理完毕，审计通过，可以正常领用。")
    else:
        paragraphs.append(f"当前还有{len(fix_materials) + len(fix_caliber)}条异常待处理，请按上述建议操作后等待系统自动复核。如有疑问请联系质检组。")

    return "\n\n".join(paragraphs)

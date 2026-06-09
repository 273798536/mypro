from database import get_conn
from datetime import datetime
import json


def _log_audit(conn, req_id, action, detail, operator='system'):
    conn.execute('''
        INSERT INTO audit_logs (requisition_id, action, detail, operator)
        VALUES (?, ?, ?, ?)
    ''', (req_id, action, detail, operator))


def run_audit(requisition_id):
    conn = get_conn()
    anomalies = []

    req = conn.execute('SELECT * FROM requisitions WHERE id = ?', (requisition_id,)).fetchone()
    if not req:
        conn.close()
        return []

    reagent = conn.execute('SELECT * FROM reagents WHERE id = ?', (req['reagent_id'],)).fetchone()

    conn.execute('DELETE FROM anomalies WHERE requisition_id = ? AND is_resolved = 0', (requisition_id,))

    if reagent:
        conc = req['concentration']
        if conc < reagent['standard_concentration_min'] or conc > reagent['standard_concentration_max']:
            anomaly_type = '浓度越界'
            severity = 'error' if abs(conc - (reagent['standard_concentration_min'] + reagent['standard_concentration_max']) / 2) > 5 else 'warning'
            action_type = '改口径' if conc > reagent['standard_concentration_max'] + 10 else '补材料'

            desc = f"试剂{req['reagent_name']}浓度填写为{conc}%，标准范围为{reagent['standard_concentration_min']}%-{reagent['standard_concentration_max']}%"
            if action_type == '改口径':
                desc += f"，偏离超过10个百分点，建议核对试剂规格后修改浓度口径"
            else:
                desc += f"，偏离在可解释范围内，建议补充浓度检测报告或说明材料"

            cur = conn.execute('''
                INSERT INTO anomalies (requisition_id, anomaly_type, field_name, expected_value,
                                       actual_value, severity, action_type, description)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (requisition_id, anomaly_type, 'concentration',
                  f"{reagent['standard_concentration_min']}-{reagent['standard_concentration_max']}%",
                  f"{conc}%", severity, action_type, desc))
            anomalies.append(dict(id=cur.lastrowid, anomaly_type=anomaly_type,
                                  action_type=action_type, severity=severity, description=desc))

        if req['ph_value'] is not None:
            ph = req['ph_value']
            if ph < reagent['standard_ph_min'] or ph > reagent['standard_ph_max']:
                anomaly_type = 'pH越界'
                severity = 'error' if abs(ph - (reagent['standard_ph_min'] + reagent['standard_ph_max']) / 2) > 2 else 'warning'
                action_type = '改口径' if abs(ph - (reagent['standard_ph_min'] + reagent['standard_ph_max']) / 2) > 3 else '补材料'

                desc = f"试剂{req['reagent_name']}pH值填写为{ph}，标准范围为{reagent['standard_ph_min']}-{reagent['standard_ph_max']}"
                if action_type == '改口径':
                    desc += f"，pH偏离较大，建议核对试剂实际pH后修改填写口径"
                else:
                    desc += f"，建议补充pH检测原始记录或说明偏差原因的材料"

                cur = conn.execute('''
                    INSERT INTO anomalies (requisition_id, anomaly_type, field_name, expected_value,
                                           actual_value, severity, action_type, description)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (requisition_id, anomaly_type, 'ph_value',
                      f"{reagent['standard_ph_min']}-{reagent['standard_ph_max']}",
                      str(ph), severity, action_type, desc))
                anomalies.append(dict(id=cur.lastrowid, anomaly_type=anomaly_type,
                                      action_type=action_type, severity=severity, description=desc))

    has_unresolved = conn.execute(
        'SELECT COUNT(*) FROM anomalies WHERE requisition_id = ? AND is_resolved = 0',
        (requisition_id,)
    ).fetchone()[0]

    new_status = 'approved' if has_unresolved == 0 else 'rejected'
    conn.execute('''
        UPDATE requisitions SET status = ?, updated_at = datetime('now','localtime')
        WHERE id = ?
    ''', (new_status, requisition_id))

    _log_audit(conn, requisition_id, 'audit_run',
               f"执行审计，发现{len(anomalies)}条异常，状态更新为{new_status}")

    calculate_balance(conn, requisition_id)

    conn.commit()
    conn.close()
    return anomalies


def add_safety_remark(requisition_id, remark_text, operator):
    conn = get_conn()

    cur = conn.execute('''
        INSERT INTO safety_remarks (requisition_id, remark_text, operator)
        VALUES (?, ?, ?)
    ''', (requisition_id, remark_text, operator))
    remark_id = cur.lastrowid

    _log_audit(conn, requisition_id, 'remark_added',
               f"添加安全备注（ID:{remark_id}），操作人：{operator}", operator)

    calculate_balance(conn, requisition_id)
    run_audit_on_remark(conn, requisition_id)

    conn.commit()
    conn.close()
    return remark_id


def run_audit_on_remark(conn, requisition_id):
    remarks = conn.execute(
        'SELECT remark_text FROM safety_remarks WHERE requisition_id = ? ORDER BY created_at',
        (requisition_id,)
    ).fetchall()

    remark_texts = ' '.join([r['remark_text'] for r in remarks])

    unresolved = conn.execute(
        'SELECT * FROM anomalies WHERE requisition_id = ? AND is_resolved = 0',
        (requisition_id,)
    ).fetchall()

    for anom in unresolved:
        field = anom['field_name']
        resolved = False
        resolved_note = ''

        if field == 'concentration':
            if any(kw in remark_texts for kw in ['浓度检测', '检测报告', '实测浓度', '实际浓度', '浓度校准']):
                resolved = True
                resolved_note = '已通过补充浓度检测材料闭环'
        elif field == 'ph_value':
            if any(kw in remark_texts for kw in ['pH检测', 'pH记录', '实测pH', 'pH校准', 'pH偏差说明']):
                resolved = True
                resolved_note = '已通过补充pH检测材料闭环'

        if resolved:
            conn.execute('''
                UPDATE anomalies SET is_resolved = 1, resolved_at = datetime('now','localtime'),
                                     resolved_note = ? WHERE id = ?
            ''', (resolved_note, anom['id']))
            _log_audit(conn, requisition_id, 'anomaly_resolved',
                       f"异常ID:{anom['id']}（{anom['anomaly_type']}）已闭环：{resolved_note}")

    has_unresolved = conn.execute(
        'SELECT COUNT(*) FROM anomalies WHERE requisition_id = ? AND is_resolved = 0',
        (requisition_id,)
    ).fetchone()[0]

    new_status = 'approved' if has_unresolved == 0 else 'rejected'
    conn.execute('''
        UPDATE requisitions SET status = ?, updated_at = datetime('now','localtime')
        WHERE id = ?
    ''', (new_status, requisition_id))


def calculate_balance(conn, requisition_id):
    req = conn.execute('SELECT * FROM requisitions WHERE id = ?', (requisition_id,)).fetchone()
    reagent = conn.execute('SELECT * FROM reagents WHERE id = ?', (req['reagent_id'],)).fetchone()

    last_calc = conn.execute(
        'SELECT MAX(version) as v FROM balance_calculations WHERE requisition_id = ?',
        (requisition_id,)
    ).fetchone()
    version = (last_calc['v'] or 0) + 1

    conc_deviation = None
    ph_deviation = None

    if reagent:
        conc_mid = (reagent['standard_concentration_min'] + reagent['standard_concentration_max']) / 2
        conc_deviation = round(req['concentration'] - conc_mid, 2)

        if req['ph_value'] is not None:
            ph_mid = (reagent['standard_ph_min'] + reagent['standard_ph_max']) / 2
            ph_deviation = round(req['ph_value'] - ph_mid, 2)

    remarks = conn.execute(
        'SELECT id FROM safety_remarks WHERE requisition_id = ? ORDER BY created_at',
        (requisition_id,)
    ).fetchall()
    remark_ids = json.dumps([r['id'] for r in remarks], ensure_ascii=False)

    risk_score = 0.0
    if conc_deviation is not None:
        risk_score += abs(conc_deviation) * 0.5
    if ph_deviation is not None:
        risk_score += abs(ph_deviation) * 2.0
    if remarks:
        risk_score = max(0, risk_score - len(remarks) * 3.0)
    risk_score = round(risk_score, 2)

    balance_parts = []
    if conc_deviation is not None:
        direction = '偏高' if conc_deviation > 0 else '偏低' if conc_deviation < 0 else '正常'
        balance_parts.append(f"浓度偏差{direction}{abs(conc_deviation)}个百分点")
    if ph_deviation is not None:
        direction = '偏高' if ph_deviation > 0 else '偏低' if ph_deviation < 0 else '正常'
        balance_parts.append(f"pH偏差{direction}{abs(ph_deviation)}")
    if remarks:
        balance_parts.append(f"已补充{len(remarks)}条安全备注")

    balance_result = '；'.join(balance_parts) if balance_parts else '无明显偏差'

    conn.execute('''
        INSERT INTO balance_calculations (requisition_id, version, balance_result,
                                          concentration_deviation, ph_deviation, risk_score, remark_ids)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (requisition_id, version, balance_result, conc_deviation, ph_deviation, risk_score, remark_ids))

    _log_audit(conn, requisition_id, 'balance_updated',
               f"配平计算更新至版本{version}，风险评分：{risk_score}，{balance_result}")

import { Router, type Request, type Response } from 'express';
import { getDb } from '../database.js';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT e.*, r.name as resident_name
    FROM events e
    JOIN residents r ON e.resident_id = r.id
    ORDER BY e.updated_at DESC
  `).all();

  const result = rows.map((row: any) => ({
    ...row,
    details: JSON.parse(row.details_json || '{}'),
    feeCalculation: row.fee_calculation_json ? JSON.parse(row.fee_calculation_json) : null,
  }));

  res.json({ success: true, data: result });
});

router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare(`
    SELECT e.*, r.name as resident_name
    FROM events e
    JOIN residents r ON e.resident_id = r.id
    WHERE e.id = ?
  `).get(req.params.id) as any;

  if (!row) {
    res.status(404).json({ success: false, error: '事件不存在' });
    return;
  }

  row.details = JSON.parse(row.details_json || '{}');
  row.feeCalculation = row.fee_calculation_json ? JSON.parse(row.fee_calculation_json) : null;
  res.json({ success: true, data: row });
});

function calculateRoomTransferFee(db: any, details: any): any {
  const originalBed = db.prepare('SELECT * FROM beds WHERE id = ?').get(details.originalBedId) as any;
  const targetBed = db.prepare('SELECT * FROM beds WHERE id = ?').get(details.targetBedId) as any;
  const resident = db.prepare('SELECT * FROM residents WHERE id = ?').get(
    db.prepare('SELECT resident_id FROM beds WHERE id = ?').get(details.originalBedId)?.resident_id
  ) as any;

  if (!originalBed || !targetBed) return null;

  const nursingLevel = resident?.nursing_level || '自理';
  const originalRate = db.prepare('SELECT * FROM fee_rates WHERE room_type = ? AND nursing_level = ?').get(originalBed.room_type, nursingLevel) as any;
  const targetRate = db.prepare('SELECT * FROM fee_rates WHERE room_type = ? AND nursing_level = ?').get(targetBed.room_type, nursingLevel) as any;

  const originalDaily = originalRate?.daily_rate || originalBed.daily_rate;
  const targetDaily = targetRate?.daily_rate || targetBed.daily_rate;
  const originalDeposit = originalRate?.deposit_amount || 0;
  const targetDeposit = targetRate?.deposit_amount || 0;

  const dailyDiff = targetDaily - originalDaily;
  const depositDiff = targetDeposit - originalDeposit;

  const items = [];
  let totalDue = 0;
  let totalRefund = 0;

  if (depositDiff > 0) {
    items.push({
      name: '押金补差',
      amount: depositDiff,
      calculationBasis: `${targetBed.room_type}押金标准 ${targetDeposit} - ${originalBed.room_type}押金标准 ${originalDeposit}`,
    });
    totalDue += depositDiff;
  } else if (depositDiff < 0) {
    items.push({
      name: '押金退还差额',
      amount: Math.abs(depositDiff),
      calculationBasis: `${originalBed.room_type}押金标准 ${originalDeposit} - ${targetBed.room_type}押金标准 ${targetDeposit}`,
    });
    totalRefund += Math.abs(depositDiff);
  }

  if (dailyDiff > 0) {
    items.push({
      name: '日费差额（月度预估）',
      amount: dailyDiff * 30,
      calculationBasis: `新房日费 ${targetDaily} - 原房日费 ${originalDaily}，按30天预估`,
    });
    totalDue += dailyDiff * 30;
  } else if (dailyDiff < 0) {
    items.push({
      name: '日费减少（月度预估）',
      amount: Math.abs(dailyDiff) * 30,
      calculationBasis: `原房日费 ${originalDaily} - 新房日费 ${targetDaily}，按30天预估`,
    });
    totalRefund += Math.abs(dailyDiff) * 30;
  }

  return {
    items,
    totalDue,
    totalRefund,
    netAmount: totalDue - totalRefund,
  };
}

function calculateRefundFee(db: any, residentId: string, details: any): any {
  const resident = db.prepare('SELECT * FROM residents WHERE id = ?').get(residentId) as any;
  const bed = db.prepare('SELECT * FROM beds WHERE id = ?').get(resident?.bed_id) as any;
  const deposit = db.prepare('SELECT * FROM deposits WHERE resident_id = ?').get(residentId) as any;

  if (!resident || !bed) return null;

  const admitDate = new Date(resident.admit_date);
  const now = new Date();
  const daysStaying = Math.max(1, Math.ceil((now.getTime() - admitDate.getTime()) / (1000 * 60 * 60 * 24)));

  const feeRate = db.prepare('SELECT * FROM fee_rates WHERE room_type = ? AND nursing_level = ?').get(bed.room_type, resident.nursing_level) as any;
  const dailyRate = feeRate?.daily_rate || bed.daily_rate;
  const totalFee = dailyRate * daysStaying;
  const depositBalance = deposit?.current_balance || 0;

  const items = [
    {
      name: '实际住宿费用',
      amount: totalFee,
      calculationBasis: `日费 ${dailyRate} × 入住天数 ${daysStaying}（${resident.admit_date} 至今）`,
    },
    {
      name: '押金余额',
      amount: depositBalance,
      calculationBasis: `押金余额 ${depositBalance}`,
    },
  ];

  const netRefund = Math.max(0, depositBalance - totalFee);

  return {
    items,
    totalDue: totalFee,
    totalRefund: netRefund,
    netAmount: netRefund - totalFee,
    daysStaying,
  };
}

function calculateNursingChangeFee(db: any, residentId: string, details: any): any {
  const resident = db.prepare('SELECT * FROM residents WHERE id = ?').get(residentId) as any;
  const bed = db.prepare('SELECT * FROM beds WHERE id = ?').get(resident?.bed_id) as any;

  if (!resident || !bed) return null;

  const originalRate = db.prepare('SELECT * FROM fee_rates WHERE room_type = ? AND nursing_level = ?').get(bed.room_type, details.originalNursingLevel) as any;
  const targetRate = db.prepare('SELECT * FROM fee_rates WHERE room_type = ? AND nursing_level = ?').get(bed.room_type, details.targetNursingLevel) as any;

  const originalDaily = originalRate?.daily_rate || bed.daily_rate;
  const targetDaily = targetRate?.daily_rate || 0;
  const originalDeposit = originalRate?.deposit_amount || 0;
  const targetDeposit = targetRate?.deposit_amount || 0;

  const dailyDiff = targetDaily - originalDaily;
  const depositDiff = targetDeposit - originalDeposit;

  const items = [];
  let totalDue = 0;
  let totalRefund = 0;

  if (depositDiff > 0) {
    items.push({
      name: '护理升级押金补差',
      amount: depositDiff,
      calculationBasis: `${details.targetNursingLevel}押金标准 ${targetDeposit} - ${details.originalNursingLevel}押金标准 ${originalDeposit}`,
    });
    totalDue += depositDiff;
  } else if (depositDiff < 0) {
    items.push({
      name: '护理降级押金退还',
      amount: Math.abs(depositDiff),
      calculationBasis: `${details.originalNursingLevel}押金标准 ${originalDeposit} - ${details.targetNursingLevel}押金标准 ${targetDeposit}`,
    });
    totalRefund += Math.abs(depositDiff);
  }

  items.push({
    name: '日费变更（月度预估）',
    amount: Math.abs(dailyDiff * 30),
    calculationBasis: `${details.targetNursingLevel}日费 ${targetDaily} - ${details.originalNursingLevel}日费 ${originalDaily}，按30天预估`,
  });
  if (dailyDiff > 0) totalDue += dailyDiff * 30;
  else totalRefund += Math.abs(dailyDiff) * 30;

  return {
    items,
    totalDue,
    totalRefund,
    netAmount: totalDue - totalRefund,
  };
}

router.post('/', (req: Request, res: Response) => {
  const db = getDb();
  const { type, residentId, details, triggerSource } = req.body;
  const now = new Date().toISOString();
  const id = 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  const stepMap: Record<string, { current: string; next: string }> = {
    '转房补差': { current: '已提交转房申请', next: '费用试算' },
    '短住退押': { current: '已提交退住申请', next: '费用结算' },
    '护理变更': { current: '已提交护理变更申请', next: '费用调整' },
  };

  const steps = stepMap[type] || { current: '已提交申请', next: '待处理' };

  try {
    let feeCalculation = null;

    if (type === '转房补差' && details?.originalBedId && details?.targetBedId) {
      feeCalculation = calculateRoomTransferFee(db, details);
    } else if (type === '短住退押') {
      feeCalculation = calculateRefundFee(db, residentId, details);
    } else if (type === '护理变更' && details?.originalNursingLevel && details?.targetNursingLevel) {
      feeCalculation = calculateNursingChangeFee(db, residentId, details);
    }

    const enrichedDetails = { ...details };
    if (feeCalculation && type === '短住退押' && (feeCalculation as any).daysStaying) {
      enrichedDetails.daysStaying = (feeCalculation as any).daysStaying;
    }

    db.prepare(`
      INSERT INTO events (id, type, resident_id, status, trigger_source, current_step, next_step, details_json, fee_calculation_json, created_at, updated_at)
      VALUES (?, ?, ?, '申请', ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, type, residentId,
      triggerSource || `${type}申请`,
      steps.current, steps.next,
      JSON.stringify(enrichedDetails),
      feeCalculation ? JSON.stringify(feeCalculation) : null,
      now, now
    );

    if (type === '转房补差' && details?.originalBedId) {
      db.prepare('UPDATE beds SET status = ? WHERE id = ?').run('待转出', details.originalBedId);
    }
    if (type === '转房补差' && details?.targetBedId) {
      db.prepare('UPDATE beds SET status = ? WHERE id = ?').run('待转入', details.targetBedId);
    }

    const row = db.prepare(`
      SELECT e.*, r.name as resident_name
      FROM events e
      JOIN residents r ON e.resident_id = r.id
      WHERE e.id = ?
    `).get(id) as any;
    row.details = JSON.parse(row.details_json || '{}');
    row.feeCalculation = row.fee_calculation_json ? JSON.parse(row.fee_calculation_json) : null;
    res.json({ success: true, data: row });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/:id/advance', (req: Request, res: Response) => {
  const db = getDb();
  const eventId = req.params.id;
  const now = new Date().toISOString();

  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId) as any;
  if (!event) {
    res.status(404).json({ success: false, error: '事件不存在' });
    return;
  }

  const details = JSON.parse(event.details_json || '{}');

  const statusFlow: Record<string, { current: string; next: string; currentStep: string; nextStep: string }[]> = {
    '转房补差': [
      { current: '申请', next: '试算', currentStep: '费用试算中', nextStep: '补差确认' },
      { current: '试算', next: '待确认', currentStep: '待财务确认补差', nextStep: '执行转房' },
      { current: '待确认', next: '已完成', currentStep: '转房已完成', nextStep: '无' },
    ],
    '短住退押': [
      { current: '申请', next: '试算', currentStep: '费用结算中', nextStep: '退押确认' },
      { current: '试算', next: '待确认', currentStep: '待财务确认退押', nextStep: '执行退押' },
      { current: '待确认', next: '已完成', currentStep: '退住已完成', nextStep: '无' },
    ],
    '护理变更': [
      { current: '申请', next: '试算', currentStep: '费用调整中', nextStep: '变更确认' },
      { current: '试算', next: '待确认', currentStep: '待确认护理变更', nextStep: '执行变更' },
      { current: '待确认', next: '已完成', currentStep: '护理变更已完成', nextStep: '无' },
    ],
  };

  const flow = statusFlow[event.type] || [];
  const transition = flow.find((f) => f.current === event.status);

  if (!transition) {
    res.status(400).json({ success: false, error: '事件已结束，无法推进' });
    return;
  }

  const advance = db.transaction(() => {
    db.prepare(`
      UPDATE events SET status = ?, current_step = ?, next_step = ?, updated_at = ? WHERE id = ?
    `).run(transition.next, transition.currentStep, transition.nextStep, now, eventId);

    if (transition.next === '试算' && !event.fee_calculation_json) {
      let feeCalculation = null;
      if (event.type === '转房补差') {
        feeCalculation = calculateRoomTransferFee(db, details);
      } else if (event.type === '短住退押') {
        feeCalculation = calculateRefundFee(db, event.resident_id, details);
        if (feeCalculation && (feeCalculation as any).daysStaying) {
          details.daysStaying = (feeCalculation as any).daysStaying;
          db.prepare('UPDATE events SET details_json = ? WHERE id = ?').run(JSON.stringify(details), eventId);
        }
      } else if (event.type === '护理变更') {
        feeCalculation = calculateNursingChangeFee(db, event.resident_id, details);
      }
      if (feeCalculation) {
        db.prepare('UPDATE events SET fee_calculation_json = ? WHERE id = ?').run(JSON.stringify(feeCalculation), eventId);
      }
    }

    if (transition.next === '已完成') {
      if (event.type === '转房补差') {
        const resident = db.prepare('SELECT * FROM residents WHERE id = ?').get(event.resident_id) as any;
        if (resident) {
          if (details.originalBedId) {
            db.prepare('UPDATE beds SET status = ?, resident_id = NULL WHERE id = ?').run('空', details.originalBedId);
          }
          if (details.targetBedId) {
            const targetBed = db.prepare('SELECT * FROM beds WHERE id = ?').get(details.targetBedId) as any;
            const feeRate = db.prepare('SELECT * FROM fee_rates WHERE room_type = ? AND nursing_level = ?').get(targetBed?.room_type, resident.nursing_level) as any;
            const newRate = feeRate?.daily_rate || targetBed?.daily_rate || 0;
            db.prepare('UPDATE beds SET status = ?, resident_id = ?, daily_rate = ? WHERE id = ?')
              .run('已住', event.resident_id, newRate, details.targetBedId);
            db.prepare('UPDATE residents SET bed_id = ?, updated_at = ? WHERE id = ?')
              .run(details.targetBedId, now, event.resident_id);
          }
        }

        if (details.targetBedId && details.originalBedId) {
          const deposit = db.prepare('SELECT * FROM deposits WHERE resident_id = ?').get(event.resident_id) as any;
          if (deposit) {
            const feeCalc = event.fee_calculation_json ? JSON.parse(event.fee_calculation_json) : null;
            if (feeCalc && feeCalc.netAmount !== 0) {
              const txType = feeCalc.netAmount > 0 ? '补差收取' : '补差退还';
              const txAmount = Math.abs(feeCalc.netAmount);
              const txId = 'dt' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
              db.prepare(`
                INSERT INTO deposit_transactions (id, deposit_id, type, amount, reason, trigger_source, trigger_event_id, created_at)
                VALUES (?, ?, ?, ?, '转房补差', ?, ?, ?)
              `).run(txId, deposit.id, txType, txAmount, `转房补差事件 ${eventId}`, eventId, now);

              let newBalance = deposit.current_balance;
              if (txType === '补差收取') newBalance += txAmount;
              else newBalance -= txAmount;
              const newTotal = txType === '补差收取' ? deposit.total_amount + txAmount : deposit.total_amount;
              const newStatus = newBalance <= 0 ? '已退' : (newBalance < deposit.total_amount ? '部分退' : '已收');
              db.prepare('UPDATE deposits SET current_balance = ?, total_amount = ?, status = ?, updated_at = ? WHERE id = ?')
                .run(newBalance, newTotal, newStatus, now, deposit.id);
            }
          }
        }
      } else if (event.type === '短住退押') {
        const deposit = db.prepare('SELECT * FROM deposits WHERE resident_id = ?').get(event.resident_id) as any;
        if (deposit && deposit.current_balance > 0) {
          const txId = 'dt' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
          db.prepare(`
            INSERT INTO deposit_transactions (id, deposit_id, type, amount, reason, trigger_source, trigger_event_id, created_at)
            VALUES (?, ?, '费用抵扣', ?, '退住费用抵扣', ?, ?, ?)
          `).run(txId, deposit.id, deposit.current_balance, `短住退押事件 ${eventId}`, eventId, now);
          db.prepare('UPDATE deposits SET current_balance = 0, status = ?, updated_at = ? WHERE id = ?')
            .run('已退', now, deposit.id);
        }

        const resident = db.prepare('SELECT * FROM residents WHERE id = ?').get(event.resident_id) as any;
        if (resident) {
          if (resident.bed_id) {
            db.prepare('UPDATE beds SET status = ?, resident_id = NULL WHERE id = ?').run('空', resident.bed_id);
          }
          db.prepare('UPDATE residents SET status = ?, bed_id = NULL, updated_at = ? WHERE id = ?')
            .run('退住', now, event.resident_id);
        }
      } else if (event.type === '护理变更') {
        const deposit = db.prepare('SELECT * FROM deposits WHERE resident_id = ?').get(event.resident_id) as any;
        if (deposit) {
          const feeCalc = event.fee_calculation_json ? JSON.parse(event.fee_calculation_json) : null;
          if (feeCalc && feeCalc.netAmount !== 0) {
            const txType = feeCalc.netAmount > 0 ? '补差收取' : '补差退还';
            const txAmount = Math.abs(feeCalc.netAmount);
            const txId = 'dt' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
            db.prepare(`
              INSERT INTO deposit_transactions (id, deposit_id, type, amount, reason, trigger_source, trigger_event_id, created_at)
              VALUES (?, ?, ?, ?, '护理变更调整', ?, ?, ?)
            `).run(txId, deposit.id, txType, txAmount, `护理变更事件 ${eventId}`, eventId, now);

            let newBalance = deposit.current_balance;
            if (txType === '补差收取') newBalance += txAmount;
            else newBalance -= txAmount;
            const newTotal = txType === '补差收取' ? deposit.total_amount + txAmount : deposit.total_amount;
            const newStatus = newBalance <= 0 ? '已退' : (newBalance < deposit.total_amount ? '部分退' : '已收');
            db.prepare('UPDATE deposits SET current_balance = ?, total_amount = ?, status = ?, updated_at = ? WHERE id = ?')
              .run(newBalance, newTotal, newStatus, now, deposit.id);
          }
        }

        if (details.targetNursingLevel) {
          db.prepare('UPDATE residents SET nursing_level = ?, updated_at = ? WHERE id = ?')
            .run(details.targetNursingLevel, now, event.resident_id);
          const resident = db.prepare('SELECT * FROM residents WHERE id = ?').get(event.resident_id) as any;
          if (resident && resident.bed_id) {
            const bed = db.prepare('SELECT * FROM beds WHERE id = ?').get(resident.bed_id) as any;
            if (bed) {
              const feeRate = db.prepare('SELECT * FROM fee_rates WHERE room_type = ? AND nursing_level = ?').get(bed.room_type, details.targetNursingLevel) as any;
              if (feeRate) {
                db.prepare('UPDATE beds SET daily_rate = ? WHERE id = ?').run(feeRate.daily_rate, resident.bed_id);
              }
            }
          }
        }
      }
    }
  });

  try {
    advance();
    const row = db.prepare(`
      SELECT e.*, r.name as resident_name
      FROM events e
      JOIN residents r ON e.resident_id = r.id
      WHERE e.id = ?
    `).get(eventId) as any;
    row.details = JSON.parse(row.details_json || '{}');
    row.feeCalculation = row.fee_calculation_json ? JSON.parse(row.fee_calculation_json) : null;
    res.json({ success: true, data: row });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;

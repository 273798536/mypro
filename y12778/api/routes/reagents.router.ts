import { Router } from 'express';
import { dataStore } from '../repositories/store';
import { createReagent, supplementReagent } from '../services/reagent.service';
import { logAudit } from '../services/audit.service';

const router = Router();

router.get('/', (req, res) => {
  res.json(dataStore.getReagents());
});

router.get('/:id', (req, res) => {
  const reagent = dataStore.getReagentById(req.params.id);
  if (!reagent) {
    res.status(404).json({ message: '试剂不存在' });
    return;
  }
  res.json(reagent);
});

router.post('/', (req, res) => {
  const result = createReagent(req.body);
  if (result.error) {
    res.status(409).json({ error: result.error });
    return;
  }

  logAudit({
    entityType: 'reagent',
    entityId: result.reagent!.id,
    action: 'create',
    operator: result.reagent!.createdBy,
    details: `录入批次${result.reagent!.batchNo}：${result.reagent!.name}`,
    newValues: {
      batchNo: result.reagent!.batchNo,
      nominalConcentration: result.reagent!.nominalConcentration,
    },
  });

  res.status(201).json(result.reagent);
});

router.put('/:id/supplement', (req, res) => {
  const { fieldName, newValue, reason, operator } = req.body;
  const result = supplementReagent(req.params.id, {
    fieldName,
    newValue,
    reason,
    operator: operator ?? '质检工程师',
  });

  if (result.error) {
    res.status(409).json({ error: result.error });
    return;
  }

  logAudit({
    entityType: 'reagent',
    entityId: req.params.id,
    action: 'supplement',
    operator: operator ?? '质检工程师',
    details: `补录${fieldName}：${reason}`,
    newValues: { [fieldName]: newValue },
  });

  res.json(result.reagent);
});

export default router;

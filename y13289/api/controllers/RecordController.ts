import { Request, Response } from 'express';
import { RecordService } from '../services/RecordService';
import { HistoryRepository } from '../repositories/HistoryRepository';
import type { FilterCriteria } from '@shared/types';

const recordService = new RecordService();
const historyRepo = new HistoryRepository();

export async function getRecords(req: Request, res: Response) {
  try {
    const filters: FilterCriteria = req.query as any;
    const records = await recordService.getAllRecords(filters);
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}

export async function getRecord(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const record = await recordService.getRecordById(id);
    if (!record) {
      res.status(404).json({ error: '记录不存在' });
      return;
    }
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}

export async function createRecord(req: Request, res: Response) {
  try {
    const id = await recordService.createRecord(req.body);
    res.status(201).json({ id });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}

export async function updateRecord(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { updates, note } = req.body;
    await recordService.updateRecord(id, updates, note);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}

export async function deleteRecord(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await recordService.deleteRecord(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}

export async function resolveIssue(req: Request, res: Response) {
  try {
    const { issueId } = req.params;
    await recordService.resolveIssue(issueId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}

export async function validateCoordinates(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await recordService.validateCoordinates(id);
    if (!result) {
      res.status(404).json({ error: '记录不存在' });
      return;
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}

export async function findSimilarLocations(req: Request, res: Response) {
  try {
    const groups = await recordService.findSimilarLocations();
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}

export async function mergeLocations(req: Request, res: Response) {
  try {
    const { targetId, sourceIds, reason } = req.body;
    await recordService.mergeLocations(targetId, sourceIds, reason);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}

export async function getHistory(req: Request, res: Response) {
  try {
    const { recordId } = req.params;
    const history = historyRepo.getByRecordId(recordId);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}

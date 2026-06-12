import { Router, Request, Response } from 'express';
import * as recordService from '../services/recordService';
import * as materialService from '../services/materialService';
import * as noteService from '../services/noteService';
import * as historyService from '../services/historyService';
import * as userService from '../services/userService';
import type { ApiResponse, FilterCriteria } from '@shared/types';
import { searchParamsToFilterCriteria } from '@shared/utils';

const router = Router();

function parseFilterFromQuery(req: Request): FilterCriteria {
  return searchParamsToFilterCriteria(new URLSearchParams(req.query as any));
}

router.get('/', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    const filter = parseFilterFromQuery(req);
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    
    const result = await recordService.getRecords(filter, page, pageSize);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/overlapping', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    const filter = parseFilterFromQuery(req);
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    
    const result = await recordService.getOverlappingRecords(filter, page, pageSize);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    const record = await recordService.getRecordById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }
    res.json({ success: true, data: record });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id/details', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    const details = await recordService.getRecordDetails(req.params.id);
    if (!details) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }
    res.json({ success: true, data: details });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    const user = await userService.getCurrentUser();
    const record = await recordService.createRecord(req.body, user.id);
    res.status(201).json({ success: true, data: record });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    const user = await userService.getCurrentUser();
    const record = await recordService.updateRecord(req.params.id, req.body, user.id);
    if (!record) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }
    res.json({ success: true, data: record });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/confirm', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    const user = await userService.getCurrentUser();
    const { remark } = req.body;
    const record = await recordService.confirmRecord(req.params.id, user.id, remark);
    if (!record) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }
    res.json({ success: true, data: record });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/reject', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    const user = await userService.getCurrentUser();
    const { remark } = req.body;
    const record = await recordService.rejectRecord(req.params.id, user.id, remark);
    if (!record) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }
    res.json({ success: true, data: record });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    const deleted = await recordService.deleteRecord(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }
    res.json({ success: true, message: 'Record deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id/materials', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    const materials = await materialService.getMaterialsByRecordId(req.params.id);
    res.json({ success: true, data: materials });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/materials', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    const user = await userService.getCurrentUser();
    const material = await materialService.createMaterial({
      ...req.body,
      recordId: req.params.id
    }, user.id);
    res.status(201).json({ success: true, data: material });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id/notes', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    const notes = await noteService.getNotesByRecordId(req.params.id);
    res.json({ success: true, data: notes });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/notes', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    const user = await userService.getCurrentUser();
    const note = await noteService.createNote({
      ...req.body,
      recordId: req.params.id
    }, user.id);
    res.status(201).json({ success: true, data: note });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id/history', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    const history = await historyService.getHistoryByRecordId(req.params.id);
    res.json({ success: true, data: history });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

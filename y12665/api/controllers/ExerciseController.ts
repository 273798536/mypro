import type { Request, Response, NextFunction } from 'express';
import fs from 'node:fs';
import { exerciseService } from '../services/index.js';
import type { Exercise, ExerciseListQuery } from '../../shared/types.js';

export class ExerciseController {
  async getList(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query: ExerciseListQuery = {};
      if (req.query.status) query.status = req.query.status as Exercise['status'];
      if (req.query.search) query.search = req.query.search as string;
      if (req.query.page) query.page = parseInt(req.query.page as string, 10);
      if (req.query.pageSize) query.pageSize = parseInt(req.query.pageSize as string, 10);

      const result = exerciseService.findAll(query);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const exercise = exerciseService.findById(req.params.id);
      if (!exercise) {
        res.status(404).json({ success: false, error: 'Exercise not found' });
        return;
      }
      res.json({ success: true, data: exercise });
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const created = exerciseService.create(req.body);
      res.status(201).json({ success: true, data: created });
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = exerciseService.update(req.params.id, req.body);
      if (!updated) {
        res.status(404).json({ success: false, error: 'Exercise not found' });
        return;
      }
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const deleted = exerciseService.delete(req.params.id);
      if (!deleted) {
        res.status(404).json({ success: false, error: 'Exercise not found' });
        return;
      }
      res.json({ success: true, message: 'Deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  async import(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let exercises: Array<Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'>>;

      if (req.file) {
        const content = fs.readFileSync(req.file.path, 'utf-8');
        exercises = JSON.parse(content);
      } else if (req.body && Array.isArray(req.body.exercises)) {
        exercises = req.body.exercises;
      } else {
        res.status(400).json({ success: false, error: 'No file or exercises data provided' });
        return;
      }

      const result = exerciseService.bulkImport(exercises);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

export const exerciseController = new ExerciseController();

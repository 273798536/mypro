import { Router } from 'express';
import { db } from '../repository/db';
import type { CreateViewRequest } from '../../shared/types';

const router = Router();

router.get('/', (_req, res) => {
  res.json(db.getAllViews().sort((a, b) => b.createdAt - a.createdAt));
});

router.get('/:id', (req, res) => {
  const v = db.getViewById(req.params.id);
  if (!v) return res.status(404).json({ error: 'View not found' });
  res.json(v);
});

router.post('/', (req, res) => {
  const body = req.body as CreateViewRequest;
  if (!body?.name) return res.status(400).json({ error: 'name is required' });
  if (typeof body.zoom !== 'number') return res.status(400).json({ error: 'zoom is required' });
  const created = db.createView(body);
  res.status(201).json(created);
});

router.delete('/:id', (req, res) => {
  const ok = db.deleteView(req.params.id);
  if (!ok) return res.status(404).json({ error: 'View not found' });
  res.status(204).send();
});

export default router;

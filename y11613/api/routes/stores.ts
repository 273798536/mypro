import { Router } from 'express';
import { getDatabase } from '../database/init.js';

const router = Router();

router.get('/', (req, res) => {
  const db = getDatabase();
  try {
    const stores = db.prepare('SELECT * FROM stores ORDER BY created_at DESC').all();
    res.json(stores);
  } finally {
    db.close();
  }
});

router.get('/:id', (req, res) => {
  const db = getDatabase();
  try {
    const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.id);
    if (!store) {
      return res.status(404).json({ error: '门店不存在' });
    }
    res.json(store);
  } finally {
    db.close();
  }
});

export default router;

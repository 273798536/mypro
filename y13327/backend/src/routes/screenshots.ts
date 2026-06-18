import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import db from '../database';

const router = Router();

const uploadDir = path.join(__dirname, '..', '..', 'data', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${timestamp}_${Math.round(Math.random() * 1e6)}${ext}`);
  }
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/ticket/:ticketId', (req: Request, res: Response) => {
  const { ticketId } = req.params;
  const rows = db.prepare(`
    SELECT * FROM screenshots 
    WHERE ticket_id = ? 
    ORDER BY is_legacy DESC, uploaded_at DESC
  `).all(ticketId);
  res.json(rows);
});

router.post('/ticket/:ticketId', upload.array('files', 20), (req: Request, res: Response) => {
  const { ticketId } = req.params;
  const operator = req.headers['x-operator'] as string || 'system';
  const { descriptions = '[]', is_legacy = '0' } = req.body;

  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
  if (!ticket) {
    return res.status(404).json({ message: '工单不存在' });
  }

  let descList: string[];
  try {
    descList = typeof descriptions === 'string' ? JSON.parse(descriptions) : descriptions;
  } catch {
    descList = [];
  }

  const files = req.files as Express.Multer.File[];
  const results = files.map((file, index) => {
    const description = descList[index] || file.originalname;
    const info = db.prepare(`
      INSERT INTO screenshots (ticket_id, filename, filepath, description, uploaded_by, is_legacy)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      parseInt(ticketId), file.originalname, file.filename,
      description, operator, is_legacy === '1' || is_legacy === true ? 1 : 0
    );
    return db.prepare('SELECT * FROM screenshots WHERE id = ?').get(info.lastInsertRowid);
  });

  res.status(201).json(results);
});

router.get('/:id/file', (req: Request, res: Response) => {
  const { id } = req.params;
  const row = db.prepare('SELECT * FROM screenshots WHERE id = ?').get(id) as any;
  if (!row) {
    return res.status(404).json({ message: '文件不存在' });
  }
  const filePath = path.join(uploadDir, row.filepath);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: '文件已丢失' });
  }
  res.download(filePath, row.filename);
});

router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const row = db.prepare('SELECT * FROM screenshots WHERE id = ?').get(id) as any;
  if (!row) {
    return res.status(404).json({ message: '文件不存在' });
  }
  const filePath = path.join(uploadDir, row.filepath);
  if (fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
  }
  db.prepare('DELETE FROM screenshots WHERE id = ?').run(id);
  res.json({ message: '已删除' });
});

export default router;

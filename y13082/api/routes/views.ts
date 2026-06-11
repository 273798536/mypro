import { Router } from 'express';
import { SavedViewController } from '../controllers/index.js';

const router = Router();

router.get('/', SavedViewController.list);
router.get('/:id', SavedViewController.get);
router.post('/', SavedViewController.create);

export default router;

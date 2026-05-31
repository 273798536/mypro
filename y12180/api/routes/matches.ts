import { Router } from 'express';
import {
  runMatching,
  getMatches,
  getMatch,
  getMatchStats,
  getConflicts,
  getConflict,
  resolveConflict,
  getReviews,
  createReview,
  updateReview,
} from '../controllers/matchController';

const router = Router();

router.post('/run', runMatching);
router.get('/stats', getMatchStats);
router.get('/', getMatches);
router.get('/:id', getMatch);

router.get('/conflicts', getConflicts);
router.get('/conflicts/:id', getConflict);
router.put('/conflicts/:id/resolve', resolveConflict);

router.get('/reviews', getReviews);
router.post('/reviews', createReview);
router.put('/reviews/:id', updateReview);

export default router;

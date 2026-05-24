
import { Router } from 'express';
import { deadLetterController } from '../controllers/deadLetterController';

const router = Router();

router.get('/', deadLetterController.getDeadLetters);
router.post('/:id/revive', deadLetterController.reviveDeadLetter);

export default router;

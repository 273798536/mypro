import { Router } from 'express';
import ticketsRouter from './tickets';
import exportsRouter from './exports';
import statisticsRouter from './statistics';
import deadLettersRouter from './deadLetters';
import healthRouter from './health';
import operatorMiddleware from '../middleware/operatorMiddleware';

const router = Router();

router.use('/health', healthRouter);

router.use(operatorMiddleware);

router.use('/tickets', ticketsRouter);
router.use('/exports', exportsRouter);
router.use('/statistics', statisticsRouter);
router.use('/dead-letters', deadLettersRouter);

export default router;

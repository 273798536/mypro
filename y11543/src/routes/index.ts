import Router from 'koa-router';
import batchRouter from './batch';
import materialRouter from './material';
import auditRouter from './audit';
import handoverRouter from './handover';

const router = new Router();

router.use(batchRouter.routes(), batchRouter.allowedMethods());
router.use(materialRouter.routes(), materialRouter.allowedMethods());
router.use(auditRouter.routes(), auditRouter.allowedMethods());
router.use(handoverRouter.routes(), handoverRouter.allowedMethods());

router.get('/health', (ctx) => {
  ctx.body = {
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'ad-material-audit-replay-service'
    }
  };
});

export default router;

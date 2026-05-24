import Router from 'koa-router';
import batchRouter from './batch';
import materialRouter from './material';
import auditRouter from './audit';

const router = new Router();

router.use(batchRouter.routes(), batchRouter.allowedMethods());
router.use(materialRouter.routes(), materialRouter.allowedMethods());
router.use(auditRouter.routes(), auditRouter.allowedMethods());

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

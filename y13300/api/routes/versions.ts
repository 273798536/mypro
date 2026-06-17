import { Router, type Request, type Response } from 'express';
import { VersionController } from '../controllers/index.js';

const router = Router();
const versionController = new VersionController();

router.get('/:id/versions', async (req: Request, res: Response): Promise<void> => {
  await versionController.listVersions(req, res);
});

router.get('/:id/versions/:version', async (req: Request, res: Response): Promise<void> => {
  await versionController.getVersionDetail(req, res);
});

router.post('/:id/versions', async (req: Request, res: Response): Promise<void> => {
  await versionController.createVersion(req, res);
});

router.get('/:id/compare', async (req: Request, res: Response): Promise<void> => {
  await versionController.compareVersions(req, res);
});

router.post('/:id/lock', async (req: Request, res: Response): Promise<void> => {
  await versionController.lockVersion(req, res);
});

router.post('/:id/unlock', async (req: Request, res: Response): Promise<void> => {
  await versionController.unlockVersion(req, res);
});

export default router;

import { Router, Request, Response } from 'express';
import { getHealthReport } from '../../infrastructure/http/utils/health';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});


router.get('/ready', async (_req: Request, res: Response) => {
    const report = await getHealthReport();
    const status = report.status === 'unhealthy' ? 503 : 200;
    res.status(status).json(report);
});

export default router;
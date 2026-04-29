import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRouters from './presentation/auth/auth.routes';
import jobRouters from './presentation/job/job.route';
import './infrastructure/queue/bullmq/workers/email.worker';
import './infrastructure/queue/bullmq/workers/media.worker';
import './infrastructure/queue/bullmq/workers/report.worker';
import './infrastructure/queue/bullmq/workers/webhook.worker';
import { initCloudinary } from './infrastructure/cloudinary/cloudinary.config';

import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { emailQueue, mediaQueue, reportQueue, webhookQueue } from './infrastructure/queue/bullmq/client';
import scheduleRouter from './presentation/schedule/schedule.route';
import webhookRouter from './presentation/webhook/webhook.route';
import auditRouter from './presentation/audit/audit.route';
import { startScheduler } from './infrastructure/queue/bullmq/scheduler';
import { registerAuditListeners } from './infrastructure/events/audit.listener';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
    queues: [
        new BullMQAdapter(emailQueue),
        new BullMQAdapter(mediaQueue),
        new BullMQAdapter(reportQueue),
        new BullMQAdapter(webhookQueue),
    ],
    serverAdapter,
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/admin/queues', (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Bull Board"');
        res.status(401).send('Unauthorized');
        return;
    }
    const [user, pass] = Buffer.from(auth.split(' ')[1], 'base64').toString().split(':');
    if (user !== process.env.BULL_BOARD_USERNAME || pass !== process.env.BULL_BOARD_PASSWORD) {
        res.status(403).send('Forbidden');
        return;
    }
    next();
}, serverAdapter.getRouter());

initCloudinary();

app.use('/auth', authRouters);
app.use('/job', jobRouters);
app.use('/schedule', scheduleRouter);
app.use('/webhook', webhookRouter);
app.use('/audit', auditRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal server error' });
});

const bootstrap = async () => {
    registerAuditListeners();
    await startScheduler();
    app.listen(PORT, () => {
        console.log(`Server:     http://localhost:${PORT}`);
        console.log(`Bull Board: http://localhost:${PORT}/admin/queues`);
        console.log(`Docs:       http://localhost:${PORT}/api/docs`);
    });
};

bootstrap().catch(console.error);

export default app;
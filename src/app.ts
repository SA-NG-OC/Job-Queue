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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

initCloudinary();

app.use('/auth', authRouters);
app.use('/job', jobRouters);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
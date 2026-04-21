import { NextFunction, Router, Response } from 'express';
import { jobController } from './job.controller';
import { createJobSchema, getJobsSchema, jobIdSchema } from './job.dto';
import { authenticate, authorizeRoles } from '../../infrastructure/http/middlewares/authenticate.middleware';
import { validate } from '../../infrastructure/http/middlewares/validate.middleware';
import { AuthRequest } from '../../infrastructure/http/types';

const jobRouters = Router();

jobRouters.use(authenticate);

jobRouters.post(
    '/',
    authorizeRoles('USER', 'ADMIN'),
    validate(createJobSchema),
    jobController.createJob
);

jobRouters.get(
    '/',
    authorizeRoles('USER', 'ADMIN'),
    validate(getJobsSchema),
    jobController.getJobs
);

jobRouters.get(
    '/:id',
    authorizeRoles('USER', 'ADMIN'),
    validate(jobIdSchema),
    jobController.getJobById
);

jobRouters.post(
    '/:id/retry',
    authorizeRoles('USER', 'ADMIN'),
    validate(jobIdSchema),
    jobController.retryJob
);

jobRouters.delete(
    '/:id',
    authorizeRoles('USER', 'ADMIN'),
    validate(jobIdSchema),
    jobController.cancelJob
);

export default jobRouters;

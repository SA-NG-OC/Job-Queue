import { Router } from 'express';
import { scheduleController } from './schedule.controller';
import { authenticate, authorizeRoles } from '../../infrastructure/http/middlewares/authenticate.middleware';
import { validate } from '../../infrastructure/http/middlewares/validate.middleware';
import {
    createScheduleSchema,
    updateScheduleSchema,
    scheduleIdSchema,
} from './schedule.dto';

const scheduleRouter = Router();
scheduleRouter.use(authenticate);

// Schedule routes
scheduleRouter.post('/schedules', authorizeRoles('USER', 'ADMIN'), validate(createScheduleSchema), scheduleController.create);
scheduleRouter.get('/schedules', authorizeRoles('USER', 'ADMIN'), scheduleController.getAll);
scheduleRouter.patch('/schedules/:id', authorizeRoles('USER', 'ADMIN'), validate(updateScheduleSchema), scheduleController.update);
scheduleRouter.patch('/schedules/:id/toggle', authorizeRoles('USER', 'ADMIN'), validate(scheduleIdSchema), scheduleController.toggle);
scheduleRouter.delete('/schedules/:id', authorizeRoles('USER', 'ADMIN'), validate(scheduleIdSchema), scheduleController.delete);

export default scheduleRouter;
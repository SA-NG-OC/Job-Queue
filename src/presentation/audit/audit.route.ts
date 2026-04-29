import { Router } from "express";
import { authenticate, authorizeRoles } from "../../infrastructure/http/middlewares/authenticate.middleware";
import { validate } from "../../infrastructure/http/middlewares/validate.middleware";
import { auditController } from "./audit.controller";
import { getAuditLogsSchema } from "./audit.dto";

const auditRouter = Router();
auditRouter.use(authenticate);
auditRouter.get('/', authorizeRoles('USER', 'ADMIN'), validate(getAuditLogsSchema), auditController.getLogs);

export default auditRouter;
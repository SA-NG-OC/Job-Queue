import { Router } from "express";
import { authenticate, authorizeRoles } from "../../infrastructure/http/middlewares/authenticate.middleware";
import { validate } from "../../infrastructure/http/middlewares/validate.middleware";
import { registerWebhookSchema, webhookIdSchema } from "./webhook.dto";
import { webhookController } from "./webhook.controller";

const webhookRouter = Router();
webhookRouter.use(authenticate);

webhookRouter.post('/webhooks', authorizeRoles('USER', 'ADMIN'), validate(registerWebhookSchema), webhookController.register);
webhookRouter.get('/webhooks', authorizeRoles('USER', 'ADMIN'), webhookController.getAll);
webhookRouter.delete('/webhooks/:id', authorizeRoles('USER', 'ADMIN'), validate(webhookIdSchema), webhookController.delete);

export default webhookRouter;

CREATE UNIQUE INDEX "api_keys_key_idx" ON "api_keys" USING btree ("key");--> statement-breakpoint
CREATE INDEX "api_keys_user_id_idx" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_keys_expires_at_idx" ON "api_keys" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_job_id_idx" ON "audit_logs" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "jobs_status_priority_idx" ON "jobs" USING btree ("status","priority");--> statement-breakpoint
CREATE INDEX "jobs_user_id_status_idx" ON "jobs" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "jobs_type_idx" ON "jobs" USING btree ("type");--> statement-breakpoint
CREATE INDEX "jobs_scheduled_at_idx" ON "jobs" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "jobs_created_at_idx" ON "jobs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "schedules_is_active_next_run_at_idx" ON "schedules" USING btree ("is_active","next_run_at");--> statement-breakpoint
CREATE INDEX "schedules_user_id_idx" ON "schedules" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "webhooks_is_active_idx" ON "webhooks" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "webhooks_user_id_idx" ON "webhooks" USING btree ("user_id");
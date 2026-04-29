import { UserRole } from "../../domain/auth/entities/user.entity";
import { ScheduleRepository } from "../../domain/schedule/repositories/schedule.repository";
import { err, ok, Result } from "../../domain/shared/result";
import { emitAudit } from "../../infrastructure/events/audit.listener";
import { stopSchedule } from "../../infrastructure/queue/bullmq/scheduler";

export const makeDeleteScheduleUseCase =
    (scheduleRepo: ScheduleRepository) =>
        async (
            id: string,
            requesterId: string,
            requesterRole: UserRole
        ): Promise<Result<{ message: string }>> => {
            const schedule = await scheduleRepo.findById(id);
            if (!schedule) return err('Không tìm thấy');

            if (requesterRole !== 'ADMIN' && schedule.userId !== requesterId) {
                return err('Bạn không có quyền xóa schedule này');
            }

            stopSchedule(id);
            await scheduleRepo.delete(id);

            emitAudit({
                action: 'schedule.deleted',
                userId: requesterId,
                meta: { scheduleId: id, deletedBy: requesterRole },
            });

            return ok({ message: 'Xóa schedule thành công' });
        };
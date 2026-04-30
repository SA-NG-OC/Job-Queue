import { Resend } from 'resend';
import { SendEmailPayload, SendSmsPayload } from '../../../domain/job/value-objects/job-payload.vo';

const resend = new Resend(process.env.RESEND_API_KEY);

export const processEmailJob = async (
    payload: SendEmailPayload
): Promise<Record<string, unknown>> => {
    const { data, error } = await resend.emails.send({
        from: process.env.MAIL_FROM || 'onboarding@resend.dev',
        to: payload.to,
        subject: payload.subject,
        html: payload.body,
    });

    if (error) throw new Error(error.message);
    return { messageId: data?.id, accepted: [payload.to] };
};

export const processSmsJob = async (
    payload: SendSmsPayload
): Promise<Record<string, unknown>> => {
    // Giả lập gửi SMS — swap bằng Twilio/AWS SNS sau
    console.log(`[SMS] Sending to ${payload.to}: ${payload.message}`);
    return { to: payload.to, status: 'sent' };
};
import { SendEmailPayload, SendSmsPayload } from '../../../domain/job/value-objects/job-payload.vo';

export const processEmailJob = async (
    payload: SendEmailPayload
): Promise<Record<string, unknown>> => {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'api-key': process.env.BREVO_API_KEY || '',
        },
        body: JSON.stringify({
            sender: { email: process.env.MAIL_FROM || 'noreply@example.com', name: 'Job Queue API' },
            to: [{ email: payload.to }],
            subject: payload.subject,
            htmlContent: payload.body,
        }),
    });

    const json = await response.json() as Record<string, unknown>;

    if (!response.ok) {
        throw new Error((json.message as string) || `Brevo error: ${response.status}`);
    }

    return { messageId: json['messageId'], accepted: [payload.to] };
};

export const processSmsJob = async (
    payload: SendSmsPayload
): Promise<Record<string, unknown>> => {
    // Giả lập gửi SMS — swap bằng Twilio/AWS SNS sau
    console.log(`[SMS] Sending to ${payload.to}: ${payload.message}`);
    return { to: payload.to, status: 'sent' };
};
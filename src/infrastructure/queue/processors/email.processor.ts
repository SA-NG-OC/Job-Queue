import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { SendEmailPayload, SendSmsPayload } from '../../../domain/job/value-objects/job-payload.vo';

const smtpOptions: SMTPTransport.Options = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
    },
    tls: {
        family: 4
    } as any
};

const transporter = nodemailer.createTransport(smtpOptions);

export const processEmailJob = async (
    payload: SendEmailPayload
): Promise<Record<string, unknown>> => {
    const info = await transporter.sendMail({
        from: process.env.MAIL_FROM || 'noreply@app.com',
        to: payload.to,
        subject: payload.subject,
        html: payload.body,
    });
    return { messageId: info.messageId, accepted: info.accepted };
};

export const processSmsJob = async (
    payload: SendSmsPayload
): Promise<Record<string, unknown>> => {
    // Giả lập gửi SMS — swap bằng Twilio/AWS SNS sau
    console.log(`[SMS] Sending to ${payload.to}: ${payload.message}`);
    return { to: payload.to, status: 'sent' };
};
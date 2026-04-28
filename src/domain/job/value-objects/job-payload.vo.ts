import { Result, ok, err } from '../../shared/result';
import { JobType } from './job-type.vo';

export type SendEmailPayload = {
    to: string;
    subject: string;
    body: string;
}

export type SendSmsPayload = {
    to: string;
    message: string;
}

export type ResizeImagePayload = {
    imageUrl: string;
    width: number;
    height: number;
    format?: 'jpeg' | 'png' | 'webp';
};

export type CompressVideoPayload = {
    videoUrl: string;
    quality: number;
};

export type GeneratePdfPayload = {
    templateId: string;
    data: Record<string, unknown>;
};

export type ExportCsvPayload = {
    query?: string;
    filename: string;
    data: Record<string, unknown>[];
};

export type CallWebhookPayload = {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
};

export type JobPayload =
    | SendEmailPayload
    | SendSmsPayload
    | ResizeImagePayload
    | CompressVideoPayload
    | GeneratePdfPayload
    | ExportCsvPayload
    | CallWebhookPayload;

type PayloadValidatorMap = {
    [K in JobType]: (payload: unknown) => Result<JobPayload>;
};

const validateSendEmail = (p: unknown): Result<SendEmailPayload> => {
    const payload = p as SendEmailPayload;
    if (!payload?.to) return err('Thiếu trường to');
    if (!payload?.subject) return err('Thiếu trường subject');
    if (!payload?.body) return err('Thiếu trường body');
    return ok(payload);
};

const validateSendSms = (p: unknown): Result<SendSmsPayload> => {
    const payload = p as SendSmsPayload;
    if (!payload?.to) return err('Thiếu trường to');
    if (!payload?.message) return err('Thiếu trường message');
    return ok(payload);
};

const validateResizeImage = (p: unknown): Result<ResizeImagePayload> => {
    const payload = p as ResizeImagePayload;
    if (!payload?.imageUrl) return err('Thiếu trường imageUrl');
    if (!payload?.width) return err('Thiếu trường width');
    if (!payload?.height) return err('Thiếu trường height');
    if (payload.width <= 0) return err('width phải lớn hơn 0');
    if (payload.height <= 0) return err('height phải lớn hơn 0');
    return ok(payload);
};

const validateCompressVideo = (p: unknown): Result<CompressVideoPayload> => {
    const payload = p as CompressVideoPayload;
    if (!payload?.videoUrl) return err('Thiếu trường videoUrl');
    if (payload?.quality < 1 || payload?.quality > 100) return err('quality phải từ 1-100');
    return ok(payload);
};

const validateGeneratePdf = (p: unknown): Result<GeneratePdfPayload> => {
    const payload = p as GeneratePdfPayload;
    if (!payload?.templateId) return err('Thiếu trường templateId');
    if (!payload?.data) return err('Thiếu trường data');
    return ok(payload);
};

const validateExportCsv = (p: unknown): Result<ExportCsvPayload> => {
    const payload = p as ExportCsvPayload;
    if (!payload?.data) return err('Thiếu trường data');
    if (!payload?.filename) return err('Thiếu trường filename');
    return ok(payload);
};

const validateCallWebhook = (p: unknown): Result<CallWebhookPayload> => {
    const payload = p as CallWebhookPayload;
    const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
    if (!payload?.url) return err('Thiếu trường url');
    if (!validMethods.includes(payload?.method)) return err('method không hợp lệ');
    return ok(payload);
};

const payloadValidators: PayloadValidatorMap = {
    SEND_EMAIL: validateSendEmail,
    SEND_SMS: validateSendSms,
    RESIZE_IMAGE: validateResizeImage,
    COMPRESS_VIDEO: validateCompressVideo,
    GENERATE_PDF: validateGeneratePdf,
    EXPORT_CSV: validateExportCsv,
    CALL_WEBHOOK: validateCallWebhook,
};

export const validateJobPayload = (
    type: JobType,
    payload: unknown
): Result<JobPayload> => payloadValidators[type](payload);
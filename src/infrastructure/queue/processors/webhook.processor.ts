import { CallWebhookPayload } from '../../../domain/job/value-objects/job-payload.vo';

export const processWebhookJob = async (
    payload: CallWebhookPayload
): Promise<Record<string, unknown>> => {
    const response = await fetch(payload.url, {
        method: payload.method,
        headers: { 'Content-Type': 'application/json', ...payload.headers },
        body: payload.body ? JSON.stringify(payload.body) : undefined,
    });

    if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }

    return {
        url: payload.url,
        statusCode: response.status,
        status: 'delivered',
    };
};
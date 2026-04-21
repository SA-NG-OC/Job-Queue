import PDFDocument from 'pdfkit';
import { GeneratePdfPayload, ExportCsvPayload } from '../../../domain/job/value-objects/job-payload.vo';

export const processGeneratePdfJob = async (
    payload: GeneratePdfPayload
): Promise<Record<string, unknown>> => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument();
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('error', reject);
        doc.on('end', () => {
            const buffer = Buffer.concat(chunks);
            // Thực tế upload lên S3 — giờ trả về size
            resolve({ templateId: payload.templateId, size: buffer.length, status: 'generated' });
        });

        doc.fontSize(20).text(`Report: ${payload.templateId}`, 50, 50);
        Object.entries(payload.data).forEach(([key, value], i) => {
            doc.fontSize(12).text(`${key}: ${JSON.stringify(value)}`, 50, 90 + i * 20);
        });

        doc.end();
    });
};

export const processExportCsvJob = async (
    payload: ExportCsvPayload
): Promise<Record<string, unknown>> => {
    // Giả lập — thực tế query DB rồi stream ra file
    console.log(`[CSV] Exporting query: ${payload.query}`);
    return { filename: payload.filename, rows: 0, status: 'exported' };
};
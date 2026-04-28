import path from 'path';
import fs from 'fs';
import os from 'os';
import { createObjectCsvWriter } from 'csv-writer';
import PDFDocument from 'pdfkit';
import {
    GeneratePdfPayload,
    ExportCsvPayload,
} from '../../../domain/job/value-objects/job-payload.vo';
import { CloudinaryService } from '../../../infrastructure/cloudinary/cloudinary.service';

// ======================= PDF =======================

export const processGeneratePdfJob = async (
    payload: GeneratePdfPayload,
): Promise<Record<string, unknown>> => {

    const tmpPath = path.join(os.tmpdir(), `report_${Date.now()}.pdf`);

    try {
        const buffer = await buildPdfBuffer(payload);
        fs.writeFileSync(tmpPath, buffer);

        const uploadResult = await CloudinaryService.uploadRaw(tmpPath);

        return {
            templateId: payload.templateId,
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            size: buffer.length,
            status: 'generated',
        };

    } catch (error: any) {
        throw new Error(`PDF generation failed: ${error.message}`);
    } finally {
        safeUnlink(tmpPath);
    }
};

// ======================= CSV =======================

export const processExportCsvJob = async (
    payload: ExportCsvPayload,
): Promise<Record<string, unknown>> => {

    const tmpPath = path.join(
        os.tmpdir(),
        payload.filename.endsWith('.csv')
            ? payload.filename
            : `${payload.filename}_${Date.now()}.csv`
    );

    try {
        const rows: Record<string, unknown>[] = (payload as any).data ?? [
            {
                id: 1,
                name: 'Sample Row',
                query: payload.query,
                createdAt: new Date().toISOString(),
            },
        ];

        if (rows.length === 0) {
            fs.writeFileSync(tmpPath, '');
        } else {
            const headers = Object.keys(rows[0]).map((key) => ({
                id: key,
                title: key.toUpperCase(),
            }));

            const csvWriter = createObjectCsvWriter({
                path: tmpPath,
                header: headers,
            });

            await csvWriter.writeRecords(rows);
        }

        const fileSize = fs.statSync(tmpPath).size;

        const uploadResult = await CloudinaryService.uploadRaw(tmpPath);

        return {
            filename: path.basename(tmpPath),
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            rows: rows.length,
            size: fileSize,
            status: 'exported',
        };

    } catch (error: any) {
        throw new Error(`CSV export failed: ${error.message}`);
    } finally {
        safeUnlink(tmpPath);
    }
};

// ======================= PDF BUILDER =======================

function buildPdfBuffer(payload: GeneratePdfPayload): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('error', reject);
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Header
        doc
            .fontSize(22)
            .font('Helvetica-Bold')
            .text(`Report: ${payload.templateId}`, { align: 'center' });

        doc.moveDown();

        doc
            .fontSize(10)
            .font('Helvetica')
            .text(`Generated: ${new Date().toISOString()}`, { align: 'center' });

        doc.moveDown(2);

        // Data
        doc
            .fontSize(12)
            .font('Helvetica-Bold')
            .text('Data:', { underline: true });

        doc.moveDown(0.5);

        Object.entries(payload.data).forEach(([key, value]) => {
            doc.font('Helvetica-Bold').text(`${key}: `, { continued: true });
            doc.font('Helvetica').text(JSON.stringify(value));
        });

        doc.end();
    });
}

// ======================= UTILS =======================

function safeUnlink(filePath: string) {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch {
        console.warn(`Failed to delete temp file: ${filePath}`);
    }
}
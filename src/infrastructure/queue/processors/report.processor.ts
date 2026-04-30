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
    const cleanFilename = payload.filename.replace(/\.csv$/, '');
    const tmpPath = path.join(
        os.tmpdir(),
        `${cleanFilename}_${Date.now()}.csv`
    );

    try {
        const rows = payload.data || [];
        fs.writeFileSync(tmpPath, '\uFEFF', 'utf8');

        if (rows.length > 0) {
            const headers = Object.keys(rows[0]).map((key) => ({
                id: key,
                title: key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()).trim(),
            }));

            const csvWriter = createObjectCsvWriter({
                path: tmpPath,
                header: headers,
                append: true,
                encoding: 'utf8',
            });

            const formattedRows = rows.map(row => {
                const newRow = { ...row };
                for (const key in newRow) {
                    if (newRow[key] instanceof Date) {
                        newRow[key] = (newRow[key] as Date).toLocaleString('vi-VN');
                    }
                }
                return newRow;
            });

            await csvWriter.writeRecords(formattedRows);
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
        if (fs.existsSync(tmpPath)) {
            fs.unlinkSync(tmpPath);
        }
    }
};

// ======================= PDF BUILDER =======================

async function buildPdfBuffer(payload: GeneratePdfPayload): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        const fontPath = path.join(__dirname, 'fonts/Roboto-Regular.ttf');
        const fontBoldPath = path.join(__dirname, 'fonts/Roboto-Bold.ttf');

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('error', reject);
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Header - Sử dụng font Bold đã đăng ký
        doc
            .font(fontBoldPath)
            .fontSize(22)
            .text(`Báo cáo: ${payload.templateId}`, { align: 'center' });

        doc.moveDown();

        doc
            .font(fontPath)
            .fontSize(10)
            .text(`Ngày tạo: ${new Date().toLocaleString('vi-VN')}`, { align: 'center' });

        doc.moveDown(2);

        // Data
        doc
            .font(fontBoldPath)
            .fontSize(12)
            .text('Dữ liệu chi tiết:', { underline: true });

        doc.moveDown(0.5);

        Object.entries(payload.data).forEach(([key, value]) => {
            doc.font(fontBoldPath).text(`${key}: `, { continued: true });
            doc.font(fontPath).text(typeof value === 'object' ? JSON.stringify(value) : String(value));
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
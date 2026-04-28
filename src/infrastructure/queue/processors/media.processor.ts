import path from 'path';
import fs from 'fs';
import os from 'os';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import {
    ResizeImagePayload,
    CompressVideoPayload,
} from '../../../domain/job/value-objects/job-payload.vo';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';

// Resize Image - thêm cloudinary sau 
export const processResizeImageJob = async (payload: ResizeImagePayload
): Promise<Record<string, unknown>> => {
    // 1. Tải ảnh gốc về buffer
    const response = await fetch(payload.imageUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    //2. Xử lí với sharp
    const fmt = (payload.format ?? 'jpeg') as keyof sharp.FormatEnum;
    const outputBuffer = await sharp(buffer)
        .resize(payload.height, payload.width, { fit: 'cover' })
        .toFormat(fmt, { quality: 85 })
        .toBuffer();

    const uploadResult = await CloudinaryService.uploadImage(outputBuffer);

    return {
        originalUrl: payload.imageUrl,
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        width: payload.width,
        height: payload.height,
        format: fmt,
        status: 'resized',
    };
}

export const processCompressVideoJob = async (
    payload: CompressVideoPayload,
): Promise<Record<string, unknown>> => {

    const tmpInput = path.join(os.tmpdir(), `input_${Date.now()}.mp4`);
    const tmpOutput = path.join(os.tmpdir(), `output_${Date.now()}.mp4`);

    try {
        // 1. Download video
        const response = await fetch(payload.videoUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
        }

        const videoBuffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(tmpInput, videoBuffer);

        const originalSize = videoBuffer.length;

        // 2. Convert quality → CRF
        const crf = Math.round(18 + ((100 - payload.quality) / 100) * 33);

        // 3. Run ffmpeg
        await runFfmpeg(tmpInput, tmpOutput, crf);

        // 4. Get output size
        const outputSize = fs.statSync(tmpOutput).size;

        // 5. Upload to Cloudinary
        const uploadResult = await CloudinaryService.uploadVideo(tmpOutput);

        return {
            originalUrl: payload.videoUrl,
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            originalSize,
            outputSize,
            compressionRatio: ((1 - outputSize / originalSize) * 100).toFixed(1) + '%',
            quality: payload.quality,
            crf,
            status: 'compressed',
        };

    } catch (error: any) {
        throw new Error(`Video compression failed: ${error.message}`);
    } finally {
        // 6. Cleanup (quan trọng)
        safeUnlink(tmpInput);
        safeUnlink(tmpOutput);
    }
};

function runFfmpeg(inputPath: string, outputPath: string, crf: number): Promise<void> {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .videoCodec('libx264')
            .audioCodec('aac')
            .outputOptions([
                `-crf ${crf}`,
                '-preset fast',
                '-movflags +faststart',
            ])
            .on('start', (cmd) => console.log(`[FFMPEG] ${cmd}`))
            .on('end', () => resolve())
            .on('error', (err) => reject(err))
            .save(outputPath);
    });
}

function safeUnlink(filePath: string) {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (err) {
        console.warn(`Failed to delete temp file: ${filePath}`);
    }
}
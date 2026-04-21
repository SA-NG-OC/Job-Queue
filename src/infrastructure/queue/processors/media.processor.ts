import sharp from 'sharp'
import { ResizeImagePayload, CompressVideoPayload } from '../../../domain/job/value-objects/job-payload.vo';

export const processResizeImageJob = async (
    payload: ResizeImagePayload
): Promise<Record<string, unknown>> => {
    const response = await fetch(payload.imageUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    const outputBuffer = await sharp(buffer)
        .resize(payload.width, payload.height, { fit: 'cover' })
        .toFormat(payload.format ?? 'jpeg', { quality: 85 })
        .toBuffer();

    // Thực tế sẽ upload lên S3/GCS — giờ trả về size để demo
    return {
        originalSize: buffer.length,
        outputSize: outputBuffer.length,
        width: payload.width,
        height: payload.height,
        format: payload.format ?? 'jpeg',
    };
}

export const processCompressVideoJob = async (
    payload: CompressVideoPayload
): Promise<Record<string, unknown>> => {
    // Giả lập — thực tế dùng ffmpeg
    console.log(`[VIDEO] Compressing ${payload.videoUrl} at quality ${payload.quality}`);
    return { videoUrl: payload.videoUrl, quality: payload.quality, status: 'compressed' };
};
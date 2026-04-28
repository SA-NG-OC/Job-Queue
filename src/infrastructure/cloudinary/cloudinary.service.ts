import { cloudinary } from './cloudinary.config';

export class CloudinaryService {

    static uploadImage(buffer: Buffer): Promise<any> {
        return new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                {
                    folder: 'job-queue/images',
                    resource_type: 'image',
                },
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            ).end(buffer);
        });
    }

    static async uploadVideo(filePath: string): Promise<any> {
        return cloudinary.uploader.upload(filePath, {
            folder: 'job-queue/videos',
            resource_type: 'video',
        });
    }

    static async uploadRaw(filePath: string): Promise<any> {
        return cloudinary.uploader.upload(filePath, {
            folder: 'job-queue/files',
            resource_type: 'raw',
        });
    }
}
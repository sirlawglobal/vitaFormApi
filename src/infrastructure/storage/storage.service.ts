import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import storageConfig from '../../config/storage.config';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    @Inject(storageConfig.KEY)
    private readonly config: ConfigType<typeof storageConfig>,
  ) {
    if (this.config.provider === 'cloudinary') {
      cloudinary.config({
        cloud_name: this.config.cloudinaryCloudName,
        api_key: this.config.cloudinaryApiKey,
        api_secret: this.config.cloudinaryApiSecret,
      });
      this.logger.log('Initialized Cloudinary storage provider');
    }
  }

  /**
   * Uploads an image file buffer to Cloudinary via streams.
   * @param file The Multer file object containing the buffer
   * @param folder Optional folder name (e.g., 'avatars', 'products')
   * @returns The secure URL string returned by Cloudinary
   */
  async uploadImage(file: Express.Multer.File, folder?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder || 'general',
          resource_type: 'auto',
        },
        (error, result: UploadApiResponse | undefined) => {
          if (error) return reject(error);
          if (!result) return reject(new Error('Cloudinary returned empty result'));
          resolve(result.secure_url);
        },
      );

      // Ensure we have a true Node.js Buffer regardless of platform/multer storage mode
      let buffer: Buffer;
      const raw: any = file.buffer;
      if (Buffer.isBuffer(raw)) {
        buffer = raw;
      } else if (raw instanceof ArrayBuffer) {
        buffer = Buffer.from(raw);
      } else if (raw && typeof raw === 'object') {
        // Handle cases where multer delivers a serialized buffer-like object { type:'Buffer', data:[] }
        buffer = Buffer.from(Object.values(raw as Record<string, number>));
      } else {
        return reject(new Error('File buffer is missing or in an unsupported format'));
      }

      uploadStream.end(buffer);
    });
  }
}

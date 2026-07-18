import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';
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

      // Create a readable stream from the memory buffer and pipe it to Cloudinary
      const readable = new Readable();
      readable.push(Buffer.isBuffer(file.buffer) ? file.buffer : Buffer.from(file.buffer));
      readable.push(null);
      readable.pipe(uploadStream);
    });
  }
}

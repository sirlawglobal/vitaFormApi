import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  provider: process.env.STORAGE_PROVIDER ?? 'cloudinary',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY ?? '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
  maxFileSizeMb: parseInt(process.env.STORAGE_MAX_FILE_SIZE_MB ?? '10', 10),
  allowedMimeTypes: (
    process.env.STORAGE_ALLOWED_MIME_TYPES ??
    'image/jpeg,image/png,image/webp,application/pdf'
  ).split(','),
}));

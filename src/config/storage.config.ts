import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  provider: process.env.STORAGE_PROVIDER ?? 'r2',
  bucket: process.env.STORAGE_BUCKET ?? 'vitaform-assets',
  endpoint: process.env.STORAGE_ENDPOINT ?? '',
  accessKey: process.env.STORAGE_ACCESS_KEY ?? '',
  secretKey: process.env.STORAGE_SECRET_KEY ?? '',
  region: process.env.STORAGE_REGION ?? 'auto',
  cdnUrl: process.env.STORAGE_CDN_URL ?? '',
  maxFileSizeMb: parseInt(process.env.STORAGE_MAX_FILE_SIZE_MB ?? '10', 10),
  allowedMimeTypes: (
    process.env.STORAGE_ALLOWED_MIME_TYPES ??
    'image/jpeg,image/png,image/webp,application/pdf'
  ).split(','),
}));

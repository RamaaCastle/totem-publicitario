import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  env: process.env.NODE_ENV || 'development',
  name: process.env.APP_NAME || 'Signage Platform',
  url: process.env.APP_URL || 'http://localhost:3000',
  apiUrl: process.env.API_URL || 'http://localhost:3001',
  port: parseInt(process.env.BACKEND_PORT || process.env.PORT || '5050', 10),
  host: process.env.BACKEND_HOST || '0.0.0.0',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '500', 10) || 500,
  allowedImageTypes: (process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/webp,image/gif').split(','),
  allowedVideoTypes: (process.env.ALLOWED_VIDEO_TYPES || 'video/mp4,video/webm').split(','),
  storageProvider: process.env.STORAGE_PROVIDER || 'local',
  logLevel: process.env.LOG_LEVEL || 'debug',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || 'dy4kekwzh',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
  cloudinaryUploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || 'ml_default',
  cloudinaryOrgSlugs: (process.env.CLOUDINARY_ORG_SLUGS || '').split(',').map(s => s.trim()).filter(Boolean),
}));

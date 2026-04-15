import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { createReadStream, unlink } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { resolve, relative } from 'path';
import { promisify } from 'util';
import sharp from 'sharp';

import { MediaFile, MediaType, MediaStatus } from '../../database/entities/media-file.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';

const unlinkAsync = promisify(unlink);

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    @InjectRepository(MediaFile) private readonly mediaRepo: Repository<MediaFile>,
    private readonly configService: ConfigService,
  ) {}

  async findAll(
    organizationId: string,
    pagination: PaginationDto,
    type?: MediaType,
  ): Promise<{ items: MediaFile[]; total: number }> {
    const qb = this.mediaRepo.createQueryBuilder('media')
      .where('media.organizationId = :organizationId', { organizationId })
      .orderBy('media.createdAt', 'DESC')
      .take(pagination.limit)
      .skip((pagination.page - 1) * pagination.limit);

    if (type) qb.andWhere('media.type = :type', { type });
    if (pagination.search) {
      qb.andWhere('media.originalName LIKE :search', { search: `%${pagination.search}%` });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async findOne(id: string, organizationId: string): Promise<MediaFile> {
    const file = await this.mediaRepo.findOne({ where: { id, organizationId } });
    if (!file) throw new NotFoundException(`Media file ${id} not found`);
    return file;
  }

  async create(
    multerFile: Express.Multer.File,
    organizationId: string,
    uploadedById: string,
  ): Promise<MediaFile> {
    const type      = this.detectMediaType(multerFile.mimetype);
    const isImage   = multerFile.mimetype.startsWith('image/');
    const appUrl    = this.configService.get<string>('app.url', 'http://localhost:3001');
    const uploadDir = this.configService.get<string>('app.uploadDir', './uploads');

    // Compress images with sharp before storing
    if (isImage) {
      try {
        const buf = await readFile(multerFile.path);
        const compressed = await sharp(buf)
          .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 82 })
          .toBuffer();
        await writeFile(multerFile.path, compressed);
        this.logger.log(`Compressed: ${buf.length >> 10}KB → ${compressed.length >> 10}KB`);
      } catch (err: any) {
        this.logger.warn(`sharp compression failed, keeping original: ${err?.message}`);
      }
    }

    // Build public URL relative to upload dir
    const absUploadDir = resolve(uploadDir);
    const absFilePath  = resolve(multerFile.path);
    const relativePath = relative(absUploadDir, absFilePath).replace(/\\/g, '/');
    const publicUrl    = `${appUrl}/uploads/${relativePath}`;

    const checksum = await this.calculateChecksum(multerFile.path);

    const mediaFile = this.mediaRepo.create({
      originalName: multerFile.originalname,
      storagePath:  multerFile.path,
      publicUrl,
      type,
      mimeType:     multerFile.mimetype,
      sizeBytes:    multerFile.size,
      status:       MediaStatus.READY,
      checksum,
      organizationId,
      uploadedById,
    });

    return this.mediaRepo.save(mediaFile);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const file = await this.findOne(id, organizationId);

    // Delete physical file from disk
    try {
      await unlinkAsync(file.storagePath);
    } catch (err: any) {
      this.logger.warn(`Could not delete file ${file.storagePath}: ${err?.message}`);
    }

    await this.mediaRepo.remove(file);
  }

  private detectMediaType(mimeType: string): MediaType {
    if (mimeType.startsWith('image/')) return MediaType.IMAGE;
    if (mimeType.startsWith('video/')) return MediaType.VIDEO;
    throw new BadRequestException(`Unsupported media type: ${mimeType}`);
  }

  private calculateChecksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash   = createHash('sha256');
      const stream = createReadStream(filePath);
      stream.on('data', (chunk: any) => hash.update(chunk));
      stream.on('end',  () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }
}

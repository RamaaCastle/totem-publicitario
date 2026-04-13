import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { createReadStream, unlink } from 'fs';
import { promisify } from 'util';

import { MediaFile, MediaType, MediaStatus } from '../../database/entities/media-file.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { uploadImageToCloudinary } from '../../common/utils/cloudinary.util';

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
    const type = this.detectMediaType(multerFile.mimetype);
    const checksum = await this.calculateChecksum(multerFile.path);

    // Upload to Cloudinary (images compressed with sharp, videos passed through)
    const cloudName = this.configService.get<string>('app.cloudinaryCloudName', 'dnyuwzead');
    const uploadPreset = this.configService.get<string>('app.cloudinaryUploadPreset', 'Pedraza');
    const isImage = multerFile.mimetype.startsWith('image/');
    const publicUrl = await uploadImageToCloudinary(
      multerFile.path,
      multerFile.mimetype,
      cloudName,
      uploadPreset,
      isImage ? { maxWidth: 1920, maxHeight: 1920, quality: 82, format: 'jpeg' } : {},
    );
    this.logger.log(`Uploaded media to Cloudinary: ${publicUrl}`);

    const mediaFile = this.mediaRepo.create({
      originalName: multerFile.originalname,
      storagePath: multerFile.path,
      publicUrl,
      type,
      mimeType: multerFile.mimetype,
      sizeBytes: multerFile.size,
      status: MediaStatus.READY,
      checksum,
      organizationId,
      uploadedById,
    });

    return this.mediaRepo.save(mediaFile);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const file = await this.findOne(id, organizationId);

    // Delete physical file
    try {
      await unlinkAsync(file.storagePath);
    } catch (err) {
      this.logger.warn(`Could not delete file ${file.storagePath}: ${err.message}`);
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
      const hash = createHash('sha256');
      const stream = createReadStream(filePath);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { readFile } from 'fs/promises';
import { Organization } from '../../database/entities/organization.entity';
import { Screen, ScreenStatus } from '../../database/entities/screen.entity';
import { MediaFile } from '../../database/entities/media-file.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization) private readonly orgRepo: Repository<Organization>,
    @InjectRepository(Screen) private readonly screenRepo: Repository<Screen>,
    @InjectRepository(MediaFile) private readonly mediaRepo: Repository<MediaFile>,
    private readonly configService: ConfigService,
  ) {}

  async findAll() {
    return this.orgRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findPublic(): Promise<{ id: string; name: string; slug: string; logoUrl: string | null; primaryColor: string | null }[]> {
    const orgs = await this.orgRepo.find({ where: { isActive: true }, order: { name: 'ASC' } });
    // Exclude the system default org (created automatically, not a real tenant)
    const EXCLUDED_SLUGS = ['default', 'default-org', 'system'];
    return orgs
      .filter((o) => !EXCLUDED_SLUGS.includes(o.slug.toLowerCase()) && o.name.toLowerCase() !== 'default organization')
      .map((o) => ({ id: o.id, name: o.name, slug: o.slug, logoUrl: o.logoUrl ?? null, primaryColor: o.primaryColor ?? null }));
  }

  async findOne(id: string): Promise<Organization> {
    const org = await this.orgRepo.findOne({ where: { id } });
    if (!org) throw new NotFoundException(`Organization ${id} not found`);
    return org;
  }

  async updateMe(organizationId: string, data: { name?: string; primaryColor?: string; logoUrl?: string }): Promise<Organization> {
    await this.orgRepo.update(organizationId, data);
    return this.findOne(organizationId);
  }

  async uploadLogo(organizationId: string, file: Express.Multer.File): Promise<Organization> {
    const cloudName = this.configService.get<string>('app.cloudinaryCloudName', 'dnyuwzead');
    const uploadPreset = this.configService.get<string>('app.cloudinaryUploadPreset', 'Pedraza');
    const logoUrl = await this.uploadToCloudinary(file, cloudName, uploadPreset);
    return this.updateMe(organizationId, { logoUrl });
  }

  private async uploadToCloudinary(file: Express.Multer.File, cloudName: string, uploadPreset: string): Promise<string> {
    const fileBuffer = await readFile(file.path);
    const base64File = fileBuffer.toString('base64');
    const dataUri = `data:${file.mimetype};base64,${base64File}`;

    const formData = new FormData();
    formData.append('file', dataUri);
    formData.append('upload_preset', uploadPreset);

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
    const response = await fetch(url, { method: 'POST', body: formData });

    if (!response.ok) {
      const text = await response.text();
      throw new BadRequestException(`Cloudinary upload failed: ${text}`);
    }

    const data: any = await response.json();
    return data.secure_url as string;
  }

  async getDashboardStats(organizationId: string) {
    const [
      totalScreens,
      onlineScreens,
      totalMedia,
    ] = await Promise.all([
      this.screenRepo.count({ where: { organizationId } }),
      this.screenRepo.count({ where: { organizationId, status: ScreenStatus.ONLINE } }),
      this.mediaRepo.count({ where: { organizationId } }),
    ]);

    const storageResult = await this.mediaRepo
      .createQueryBuilder('media')
      .where('media.organizationId = :organizationId', { organizationId })
      .select('SUM(media.sizeBytes)', 'totalBytes')
      .getRawOne();

    return {
      screens: { total: totalScreens, online: onlineScreens, offline: totalScreens - onlineScreens },
      media: { total: totalMedia, storageBytes: parseInt(storageResult?.totalBytes || '0', 10) },
    };
  }

  async update(id: string, data: Partial<Organization>): Promise<Organization> {
    await this.orgRepo.update(id, data);
    return this.findOne(id);
  }
}

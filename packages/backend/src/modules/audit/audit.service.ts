import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from '../../database/entities/audit-log.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog) private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async log(entry: {
    action: AuditAction;
    userId?: string;
    organizationId?: string;
    targetId?: string;
    targetType?: string;
    meta?: Record<string, any>;
    before?: Record<string, any>;
    after?: Record<string, any>;
  }): Promise<void> {
    await this.auditRepo.save(this.auditRepo.create(entry)).catch(() => {});
  }

  async findAll(organizationId: string, pagination: PaginationDto) {
    const [items, total] = await this.auditRepo.findAndCount({
      where: { organizationId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: pagination.limit,
      skip: (pagination.page - 1) * pagination.limit,
    });
    return { items, total };
  }
}

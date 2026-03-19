import {
  Injectable, NotFoundException, ConflictException, BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, In } from 'typeorm';
import * as bcrypt from 'bcryptjs';

import { User, UserStatus } from '../../database/entities/user.entity';
import { Role } from '../../database/entities/role.entity';
import { Organization } from '../../database/entities/organization.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(Organization) private readonly orgRepo: Repository<Organization>,
    private readonly mailService: MailService,
  ) {}

  async findAll(
    organizationId: string,
    pagination: PaginationDto,
    isSuperAdmin = false,
  ): Promise<{ items: User[]; total: number }> {
    const where: FindOptionsWhere<User> = isSuperAdmin ? {} : { organizationId };

    if (pagination.search) {
      // In a real app, use QueryBuilder for complex search
    }

    const [items, total] = await this.userRepo.findAndCount({
      where,
      relations: ['roles'],
      order: { createdAt: 'DESC' },
      take: pagination.limit,
      skip: (pagination.page - 1) * pagination.limit,
    });

    return { items, total };
  }

  async findOne(id: string, organizationId?: string): Promise<User> {
    const where: FindOptionsWhere<User> = organizationId ? { id, organizationId } : { id };
    const user = await this.userRepo.findOne({
      where,
      relations: ['roles', 'roles.permissions', 'organization'],
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async create(dto: CreateUserDto, organizationId?: string): Promise<User> {
    const existing = await this.userRepo.findOne({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException('Email already in use');

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    let roles: Role[] = [];
    if (dto.roleIds?.length) {
      roles = await this.roleRepo.findBy({ id: In(dto.roleIds) });
    }

    // Generate 6-digit verification code, expires in 30 minutes
    const verificationCode        = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const user = this.userRepo.create({
      ...dto,
      email: dto.email.toLowerCase(),
      password: hashedPassword,
      organizationId,
      roles,
      status: UserStatus.PENDING,
      verificationCode,
      verificationCodeExpiresAt,
    });

    const saved = await this.userRepo.save(user);

    // Send activation email (non-blocking — don't fail user creation if mail fails)
    const org = await this.orgRepo.findOne({ where: { id: organizationId } });
    this.mailService
      .sendVerificationCode({
        to:      saved.email,
        name:    saved.name,
        code:    verificationCode,
        orgName: org?.name ?? 'Signage Platform',
      })
      .catch((err) => this.logger.error(`Email send failed for ${saved.email}: ${err.message}`));

    return saved;
  }

  async update(id: string, dto: UpdateUserDto, organizationId?: string): Promise<User> {
    const user = await this.findOne(id, organizationId);

    if (dto.email && dto.email !== user.email) {
      const existing = await this.userRepo.findOne({ where: { email: dto.email.toLowerCase() } });
      if (existing) throw new ConflictException('Email already in use');
      dto.email = dto.email.toLowerCase();
    }

    if (dto.password) {
      (dto as any).password = await bcrypt.hash(dto.password, 12);
    }

    if (dto.roleIds !== undefined) {
      user.roles = dto.roleIds.length ? await this.roleRepo.findBy({ id: In(dto.roleIds) }) : [];
    }

    const { roleIds, ...updateData } = dto;
    Object.assign(user, updateData);
    return this.userRepo.save(user);
  }

  async remove(id: string, organizationId?: string): Promise<void> {
    const user = await this.findOne(id, organizationId);
    if (user.isSuperAdmin) throw new BadRequestException('Cannot delete super admin');
    await this.userRepo.remove(user);
  }

  async updateStatus(id: string, status: UserStatus): Promise<User> {
    await this.userRepo.update(id, { status });
    return this.findOne(id);
  }
}

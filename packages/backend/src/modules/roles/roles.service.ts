import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../database/entities/role.entity';
import { Permission } from '../../database/entities/permission.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission) private readonly permRepo: Repository<Permission>,
  ) {}

  async findAll(organizationId: string) {
    return this.roleRepo.find({
      where: [{ organizationId }, { isSystemRole: true }],
      relations: ['permissions'],
      order: { isSystemRole: 'DESC', name: 'ASC' },
    });
  }

  async findAllPermissions() {
    return this.permRepo.find({ order: { resource: 'ASC', action: 'ASC' } });
  }

  async findOne(id: string): Promise<Role> {
    const role = await this.roleRepo.findOne({ where: { id }, relations: ['permissions'] });
    if (!role) throw new NotFoundException(`Role ${id} not found`);
    return role;
  }

  async create(
    name: string,
    description: string | undefined,
    permissionIds: string[],
    organizationId: string,
  ): Promise<Role> {
    const permissions = permissionIds.length
      ? await this.permRepo.findByIds(permissionIds)
      : [];

    const role = this.roleRepo.create({ name, description, organizationId, permissions });
    return this.roleRepo.save(role);
  }

  async update(
    id: string,
    name: string,
    description: string | undefined,
    permissionIds: string[] | undefined,
  ): Promise<Role> {
    const role = await this.findOne(id);
    if (role.isSystemRole) throw new BadRequestException('Cannot modify system roles');
    role.name = name ?? role.name;
    role.description = description ?? role.description;
    if (permissionIds !== undefined) {
      role.permissions = permissionIds.length ? await this.permRepo.findByIds(permissionIds) : [];
    }
    return this.roleRepo.save(role);
  }

  async remove(id: string): Promise<void> {
    const role = await this.findOne(id);
    if (role.isSystemRole) throw new BadRequestException('Cannot delete system roles');
    await this.roleRepo.remove(role);
  }
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from '../../database/entities/user.entity';
import { Role } from '../../database/entities/role.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { Organization } from '../../database/entities/organization.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, AuditLog, Organization])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

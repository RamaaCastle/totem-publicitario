import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { User } from '../../database/entities/user.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermissions('audit_logs:read')
  findAll(@CurrentUser() user: User, @Query() pagination: PaginationDto) {
    return this.auditService.findAll(user.organizationId, pagination);
  }
}

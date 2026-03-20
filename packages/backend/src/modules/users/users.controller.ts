import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query,
  ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { User } from '../../database/entities/user.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'List all users in organization' })
  findAll(
    @CurrentUser() user: User,
    @Query() pagination: PaginationDto,
  ) {
    return this.usersService.findAll(user.organizationId, pagination, user.isSuperAdmin);
  }

  @Get(':id')
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.usersService.findOne(id, user.isSuperAdmin ? undefined : user.organizationId);
  }

  @Post()
  @RequirePermissions('users:create')
  @ApiOperation({ summary: 'Create new user' })
  create(@Body() dto: CreateUserDto, @CurrentUser() user: User) {
    // Super admin users have no org; otherwise use provided org or current user's org
    const orgId = dto.isSuperAdmin ? undefined : ((user.isSuperAdmin && dto.organizationId) ? dto.organizationId : user.organizationId);
    return this.usersService.create(dto, orgId);
  }

  @Put(':id')
  @RequirePermissions('users:update')
  @ApiOperation({ summary: 'Update user' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: User,
  ) {
    return this.usersService.update(id, dto, user.isSuperAdmin ? undefined : user.organizationId);
  }

  @Delete(':id')
  @RequirePermissions('users:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.usersService.remove(id, user.isSuperAdmin ? undefined : user.organizationId);
  }
}

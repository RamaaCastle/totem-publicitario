import {
  Controller, Get, Put, Post, Body, Param, ParseUUIDPipe,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

import { OrganizationsService } from './organizations.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions, Public } from '../../common/decorators/permissions.decorator';
import { User } from '../../database/entities/user.entity';

@ApiTags('organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  /** Public endpoint — no auth required. Used on the org-selection screen. */
  @Get('public')
  @Public()
  findPublic() {
    return this.orgsService.findPublic();
  }

  @Get('dashboard')
  getDashboard(@CurrentUser() user: User) {
    return this.orgsService.getDashboardStats(user.organizationId);
  }

  /** Get the current user's organization */
  @Get('me')
  @RequirePermissions('organizations:read')
  getMe(@CurrentUser() user: User) {
    return this.orgsService.findOne(user.organizationId);
  }

  /** Update current org name / primaryColor */
  @Put('me')
  @RequirePermissions('organizations:update')
  updateMe(
    @CurrentUser() user: User,
    @Body() body: { name?: string; primaryColor?: string },
  ) {
    return this.orgsService.updateMe(user.organizationId, body);
  }

  /** Upload org logo */
  @Post('me/logo')
  @RequirePermissions('organizations:update')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = join('./uploads', 'logos');
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          cb(null, `${uuidv4()}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
      fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new BadRequestException('Solo se permiten imágenes') as any, false);
      },
    }),
  )
  async uploadLogo(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    if (!file) throw new BadRequestException('No se envió ningún archivo');
    return this.orgsService.uploadLogo(user.organizationId, file);
  }

  @Get(':id')
  @RequirePermissions('organizations:read')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.orgsService.findOne(id);
  }

  @Put(':id')
  @RequirePermissions('organizations:update')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() data: any) {
    return this.orgsService.update(id, data);
  }
}

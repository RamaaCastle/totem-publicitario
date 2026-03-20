import {
  Controller, Get, Post, Delete, Param, Query, UseInterceptors,
  UploadedFile, ParseUUIDPipe, HttpCode, HttpStatus, BadRequestException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { join } from 'path';

import { MediaService } from './media.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions, Public } from '../../common/decorators/permissions.decorator';
import { User } from '../../database/entities/user.entity';
import { MediaType } from '../../database/entities/media-file.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('media')
@ApiBearerAuth()
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  @RequirePermissions('media:read')
  @ApiOperation({ summary: 'List media files' })
  findAll(
    @CurrentUser() user: User,
    @Query() pagination: PaginationDto,
    @Query('type') type?: MediaType,
  ) {
    return this.mediaService.findAll(user.organizationId, pagination, type);
  }

  @Get(':id')
  @RequirePermissions('media:read')
  @ApiOperation({ summary: 'Get media file metadata' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.mediaService.findOne(id, user.organizationId);
  }

  @Post('upload')
  @RequirePermissions('media:create')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a media file (image or video)' })
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    return this.mediaService.create(file, user.organizationId, user.id);
  }

  @Delete(':id')
  @RequirePermissions('media:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete media file' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.mediaService.remove(id, user.organizationId);
  }

  // Serve static files for players (public endpoint)
  @Get('files/*')
  @Public()
  serveFile(@Param('0') filePath: string, @Res() res: Response) {
    const safePath = filePath.replace(/\.\./g, ''); // prevent path traversal
    res.sendFile(safePath, { root: './uploads' });
  }
}

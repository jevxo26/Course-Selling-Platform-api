import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Delete,
  Patch,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as express from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'image', maxCount: 1 },
        { name: 'nidFrontSide', maxCount: 1 },
        { name: 'nidBackSide', maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination: './uploads',
          filename: (req, file, callback) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = extname(file.originalname);
            callback(null, `${uniqueSuffix}${ext}`);
          },
        }),
      },
    ),
  )
  create(
    @Body() createUserDto: CreateUserDto,
    @UploadedFiles() files: { image?: Express.Multer.File[]; nidFrontSide?: Express.Multer.File[]; nidBackSide?: Express.Multer.File[] },
    @Request() req: express.Request,
  ) {
    return this.usersService.create(createUserDto, files, req);
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.usersService.findAll({ search, page, limit });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'image', maxCount: 1 },
        { name: 'nidFrontSide', maxCount: 1 },
        { name: 'nidBackSide', maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination: './uploads',
          filename: (req, file, callback) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = extname(file.originalname);
            callback(null, `${uniqueSuffix}${ext}`);
          },
        }),
      },
    ),
  )
  updateProfile(
    @Request() req: any, 
    @Body() updateData: any,
    @UploadedFiles() files: { image?: Express.Multer.File[]; nidFrontSide?: Express.Multer.File[]; nidBackSide?: Express.Multer.File[] },
  ) {
    return this.usersService.update(req.user.id, updateData, files, req);
  }

  // ===========================================================================
  // AFFILIATE DASHBOARD
  // ===========================================================================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AFFILIATE)
  @Get('affiliate/dashboard')
  getAffiliateDashboard(
    @Request() req: any,
    @Query('frontendUrl') frontendUrl?: string,
  ) {
    return this.usersService.getAffiliateDashboard(req.user.id, frontendUrl);
  }

  // ===========================================================================
  // ADMINISTRATIVE ENDPOINTS (ADMIN ONLY)
  // ===========================================================================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/ban')
  ban(@Param('id') id: string, @Body('reason') reason: string) {
    return this.usersService.ban(+id, reason);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/unban')
  unban(@Param('id') id: string) {
    return this.usersService.unban(+id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/restore')
  restore(@Param('id') id: string) {
    return this.usersService.restore(+id);
  }
}

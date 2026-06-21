import { Controller, Get, Put, Body, UseGuards, Param, Delete } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  async findAll() {
    return await this.settingsService.findAll();
  }

  @Get(':key')
  @Roles(UserRole.ADMIN)
  async findByKey(@Param('key') key: string) {
    return await this.settingsService.findByKey(key);
  }

  @Put()
  @Roles(UserRole.ADMIN)
  async upsert(@Body() updateSettingDto: UpdateSettingDto) {
    return await this.settingsService.upsert(updateSettingDto);
  }

  @Delete(':key')
  @Roles(UserRole.ADMIN)
  async remove(@Param('key') key: string) {
    await this.settingsService.remove(key);
    return { message: 'Setting removed successfully' };
  }
}

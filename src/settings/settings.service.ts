import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './entities/setting.entity';
import { UpdateSettingDto } from './dto/update-setting.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting)
    private readonly settingsRepository: Repository<Setting>,
  ) {}

  async findAll(): Promise<Setting[]> {
    return await this.settingsRepository.find();
  }

  async findByKey(key: string): Promise<Setting | null> {
    return await this.settingsRepository.findOne({ where: { key } });
  }

  async getValue(key: string, defaultValue: string = ''): Promise<string> {
    const setting = await this.findByKey(key);
    return setting?.value ?? defaultValue;
  }

  async upsert(updateSettingDto: UpdateSettingDto): Promise<Setting> {
    let setting = await this.findByKey(updateSettingDto.key);
    if (setting) {
      setting.value = updateSettingDto.value;
      return await this.settingsRepository.save(setting);
    } else {
      setting = this.settingsRepository.create({
        key: updateSettingDto.key,
        value: updateSettingDto.value,
      });
      return await this.settingsRepository.save(setting);
    }
  }

  async remove(key: string): Promise<void> {
    const setting = await this.findByKey(key);
    if (!setting) {
      throw new NotFoundException(`Setting with key ${key} not found`);
    }
    await this.settingsRepository.remove(setting);
  }
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as express from 'express';

@Injectable()
export class MediaService {
  constructor(private configService: ConfigService) {}

  getUploadUrl(filename: string, req: express.Request): string {
    const cdnUrl = this.configService.get<string>('CDN_URL');
    
    if (cdnUrl) {
      return `${cdnUrl.replace(/\/$/, '')}/${filename}`;
    } else {
      const protocol = req.protocol;
      const host = req.get('host');
      return `${protocol}://${host}/uploads/${filename}`;
    }
  }
}

import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class ZinipayService {
  private readonly logger = new Logger(ZinipayService.name);
  private readonly zinipayUrl: string;


  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly settingsService: SettingsService,
  ) {
    this.zinipayUrl = this.configService.get<string>('ZINIPAY_URL') || 'https://api.zinipay.com';
  }

  private async getApiKey(): Promise<string> {
    const defaultKey = this.configService.get<string>('ZINIPAY_API_KEY') || '13fb2c1f9ebb4a95a85651c3374e30eed0e4b58a412ef393';
    return await this.settingsService.getValue('ZINIPAY_API_KEY', defaultKey);
  }

  async createPayment(amount: number, referenceId: string | number, callbackPath: string = '/enrollments/callback') {
    // The callbackPath is already fully absolute (because we passed it that way from enrollment/shop-purchase service)
    const callbackURL = callbackPath.startsWith('http')
      ? callbackPath
      : `${this.configService.get<string>('APP_URL') || 'https://api.maruftech.online'}${callbackPath}`;

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.zinipayUrl}/v1/payment/create`,
          {
            amount: amount.toString(),
            reference_id: `INV_${referenceId}_${Date.now()}`,
            redirect_url: callbackURL,
            cancel_url: callbackURL,
            cus_email: 'customer@example.com',
          },
          {
            headers: {
              'zini-api-key': await this.getApiKey(),
            },
          },
        ),
      );

      return {
        paymentID: response.data.payment_id || response.data.id || response.data.paymentID,
        zinipayURL: response.data.payment_url || response.data.url || response.data.bkashURL, // keeping the interface similar if possible
        status: response.data.status || 'success',
      };
    } catch (error) {
      let errorMessage = error.response?.data?.message || error.message || 'ZiniPay Payment Creation Failed';
      if (Array.isArray(errorMessage)) {
        errorMessage = errorMessage.map((err: any) => err.message || JSON.stringify(err)).join(', ');
      } else if (typeof errorMessage === 'object') {
        errorMessage = JSON.stringify(errorMessage);
      }
      this.logger.error('Failed to create ZiniPay payment', error.response?.data || error.message);
      throw new InternalServerErrorException(errorMessage);
    }
  }

  async verifyPayment(paymentID: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.zinipayUrl}/v1/payment/verify`,
          { payment_id: paymentID },
          {
            headers: {
              'zini-api-key': await this.getApiKey(),
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error('Failed to verify ZiniPay payment', error.response?.data || error.message);
      throw new InternalServerErrorException('ZiniPay Payment Verification Failed');
    }
  }
}

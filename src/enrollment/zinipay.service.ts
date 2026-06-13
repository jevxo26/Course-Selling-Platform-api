import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ZinipayService {
  private readonly logger = new Logger(ZinipayService.name);
  private readonly zinipayUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.zinipayUrl = this.configService.get<string>('ZINIPAY_URL') || 'https://api.zinipay.com';
    this.apiKey = this.configService.get<string>('84adb92cf4a8d4af153808a99470d3b85130782cfe866ff4')!;
  }

  async createPayment(amount: number, referenceId: string | number, callbackPath: string = '/enrollments/callback') {
    const callbackURL = `${this.configService.get('https://www.maruftech.online')}${callbackPath}`;

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
              'zini-api-key': this.apiKey,
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
      this.logger.error('Failed to create ZiniPay payment', error.response?.data || error.message);
      throw new InternalServerErrorException('ZiniPay Payment Creation Failed');
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
              'zini-api-key': this.apiKey,
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

// bKash Payment Service
import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class BkashService {
  private readonly logger = new Logger(BkashService.name);
  private readonly bkashUrl: string;
  private readonly appKey: string;
  private readonly appSecret: string;
  private readonly username: string;
  private readonly password: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.bkashUrl = this.configService.get<string>('BKASH_URL')!;
    this.appKey = this.configService.get<string>('BKASH_APP_KEY')!;
    this.appSecret = this.configService.get<string>('BKASH_APP_SECRET')!;
    this.username = this.configService.get<string>('BKASH_USERNAME')!;
    this.password = this.configService.get<string>('BKASH_PASSWORD')!;
  }

  private async getToken() {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.bkashUrl}/tokenized/checkout/token/grant`,
          {
            app_key: this.appKey,
            app_secret: this.appSecret,
          },
          {
            headers: {
              username: this.username,
              password: this.password,
            },
          },
        ),
      );
      return response.data.id_token;
    } catch (error) {
      this.logger.error('Failed to get bKash token', error.response?.data || error.message);
      throw new InternalServerErrorException('bKash Authentication Failed');
    }
  }

  async createPayment(amount: number, enrollmentId: number) {
    const token = await this.getToken();
    const callbackURL = `${this.configService.get('APP_URL')}/enrollment/bkash/callback`;

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.bkashUrl}/tokenized/checkout/create`,
          {
            mode: '0011',
            payerReference: '1',
            callbackURL: callbackURL,
            amount: amount.toString(),
            currency: 'BDT',
            intent: 'sale',
            merchantInvoiceNumber: `INV_${enrollmentId}_${Date.now()}`,
          },
          {
            headers: {
              Authorization: token,
              'X-APP-Key': this.appKey,
            },
          },
        ),
      );

      return {
        paymentID: response.data.paymentID,
        bkashURL: response.data.bkashURL,
        status: response.data.transactionStatus || 'success',
      };
    } catch (error) {
      this.logger.error('Failed to create bKash payment', error.response?.data || error.message);
      throw new InternalServerErrorException('bKash Payment Creation Failed');
    }
  }

  async executePayment(paymentID: string) {
    const token = await this.getToken();

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.bkashUrl}/tokenized/checkout/execute`,
          { paymentID },
          {
            headers: {
              Authorization: token,
              'X-APP-Key': this.appKey,
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error('Failed to execute bKash payment', error.response?.data || error.message);
      throw new InternalServerErrorException('bKash Payment Execution Failed');
    }
  }

  async queryPayment(paymentID: string) {
    const token = await this.getToken();

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.bkashUrl}/tokenized/checkout/payment/status`,
          { paymentID },
          {
            headers: {
              Authorization: token,
              'X-APP-Key': this.appKey,
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error('Failed to query bKash payment', error.response?.data || error.message);
      throw new InternalServerErrorException('bKash Payment Query Failed');
    }
  }
}

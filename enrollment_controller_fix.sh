#!/bin/bash
cat << 'INNER_EOF' > ec_fix.txt
  @Get('zinipay/callback')
  async paymentCallback(
    @Query() query: any,
    @Res() res: Response,
  ) {
    const paymentID = query.paymentID || query.payment_id;
    const enrollmentId = query.enrollmentId;
    const status = query.status;

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || this.configService.get<string>('APP_URL') || 'https://www.maruftech.online';

    console.log('Zinipay Enrollment Callback Query Params:', query);

    if (status === 'cancel' || status === 'failure' || !paymentID) {
      return res.redirect(`${frontendUrl}/payment/cancel`);
    }

    const result = await this.enrollmentService.handlePaymentCallback(paymentID, parseInt(enrollmentId));

    if (result.status === 'success') {
      return res.redirect(`${frontendUrl}/payment/success`);
    } else {
      return res.redirect(`${frontendUrl}/payment/cancel`);
    }
  }
INNER_EOF

# Replace the paymentCallback function
perl -0777 -pi -e 's/  \@Get\(\x27zinipay\/callback\x27\)\n  async paymentCallback\([\s\S]*?  \}\n/`cat ec_fix.txt`/se' /Users/macbookair/Desktop/Nexo-Prodcuts/CSW/CSW-API/src/enrollment/enrollment.controller.ts


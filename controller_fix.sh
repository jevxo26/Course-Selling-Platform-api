#!/bin/bash
cat << 'INNER_EOF' > c_fix.txt
  @Get('zinipay/callback')
  async paymentCallback(
    @Query() query: any,
    @Res() res: Response,
  ) {
    const paymentID = query.paymentID || query.payment_id;
    const purchaseId = query.purchaseId;
    const status = query.status;

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || this.configService.get<string>('APP_URL') || 'https://www.maruftech.online';

    console.log('Zinipay Callback Query Params:', query);

    if (status === 'cancel' || status === 'failure' || !paymentID) {
      return res.redirect(`${frontendUrl}/payment/cancel?type=shop`);
    }

    // Pass the purchaseId to the service (it acts as the referenceId)
    const result = await this.shopPurchaseService.handleZinipayCallback(paymentID, parseInt(purchaseId));

    if (result.status === 'success') {
      return res.redirect(`${frontendUrl}/payment/success?type=shop&purchaseId=${purchaseId}`);
    } else {
      return res.redirect(`${frontendUrl}/payment/cancel?type=shop`);
    }
  }
INNER_EOF

# Replace the paymentCallback function
perl -0777 -pi -e 's/  \@Get\(\x27zinipay\/callback\x27\)\n  async paymentCallback\([\s\S]*?  \}\n/`cat c_fix.txt`/se' /Users/macbookair/Desktop/Nexo-Prodcuts/CSW/CSW-API/src/shop-purchase/shop-purchase.controller.ts


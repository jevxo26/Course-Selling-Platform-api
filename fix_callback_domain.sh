#!/bin/bash

# Update shop-purchase.service.ts
cat << 'INNER_EOF' > sp_fix.txt
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || this.configService.get<string>('APP_URL') || 'https://www.maruftech.online';
    const paymentResponse = await this.zinipayService.createPayment(
      purchase.amount, 
      savedPurchase.id, 
      `${frontendUrl}/api/shop-purchases/zinipay/callback?purchaseId=${savedPurchase.id}`
    );
INNER_EOF
perl -0777 -pi -e 's/    const appUrl = this\.configService\.get<string>\(\x27API_URL\x27\).*?\);\n/`cat sp_fix.txt`/se' /Users/macbookair/Desktop/Nexo-Prodcuts/CSW/CSW-API/src/shop-purchase/shop-purchase.service.ts

# Update enrollment.service.ts
cat << 'INNER_EOF' > en_fix.txt
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || this.configService.get<string>('APP_URL') || 'https://www.maruftech.online';
    const paymentResponse = await this.zinipayService.createPayment(
      course.price,
      savedEnrollment.id,
      `${frontendUrl}/api/enrollments/zinipay/callback?enrollmentId=${savedEnrollment.id}`
    );
INNER_EOF
perl -0777 -pi -e 's/    const appUrl = this\.configService\.get<string>\(\x27API_URL\x27\).*?\);\n/`cat en_fix.txt`/se' /Users/macbookair/Desktop/Nexo-Prodcuts/CSW/CSW-API/src/enrollment/enrollment.service.ts


import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentService {
  constructor(private readonly prisma: PrismaService) {}

  private getBaseUrl() {
    return process.env.CASHFREE_ENVIRONMENT === 'PRODUCTION' 
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg';
  }

  private getHeaders() {
    return {
      'x-client-id': process.env.CASHFREE_APP_ID || '',
      'x-client-secret': process.env.CASHFREE_SECRET_KEY || '',
      'x-api-version': '2023-08-01',
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  async createOrder(userId: string, plan: string) {
    let amount = 0;
    if (plan === 'PLUS' || plan === 'PRO') {
      amount = 25; // ₹25
    } else if (plan === 'MAX' || plan === 'BUSINESS') {
      amount = 99; // ₹99
    } else {
      throw new BadRequestException('Invalid plan for order creation');
    }

    const orderId = `order_${userId.substring(0, 8)}_${Date.now()}`;

    try {
      const response = await fetch(`${this.getBaseUrl()}/orders`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          order_id: orderId,
          order_amount: amount,
          order_currency: 'INR',
          customer_details: {
            customer_id: userId,
            customer_name: 'GMailer User',
            customer_email: 'user@example.com',
            customer_phone: '9999999999' // Cashfree requires a phone number for most methods
          order_meta: {
            return_url: `${process.env.CASHFREE_ENVIRONMENT === 'PRODUCTION' ? 'https://gmailer-3zlj.onrender.com' : 'http://localhost:3000'}/checkout?order_id={order_id}`
          }
        })
      });

      const orderData = await response.json();
      if (!response.ok) {
        console.error('Cashfree Order Error:', orderData);
        throw new BadRequestException('Failed to create Cashfree order');
      }
      
      await this.prisma.payment.create({
        data: {
          userId: userId,
          orderId: orderId,
          amount: amount * 100, // Store in paise for backwards compatibility
          status: 'CREATED',
        }
      });

      return {
        orderId: orderId,
        paymentSessionId: orderData.payment_session_id,
        amount: amount,
        currency: 'INR',
      };
    } catch (error: any) {
      console.error('Cashfree Error:', error);
      throw new BadRequestException('Failed to create Cashfree order');
    }
  }

  async verifyPayment(userId: string, orderId: string) {
    // With Cashfree, we query their API to check if the order was paid securely
    const response = await fetch(`${this.getBaseUrl()}/orders/${orderId}`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    const orderData = await response.json();

    if (!response.ok || orderData.order_status !== 'PAID') {
      throw new BadRequestException('Payment not completed or invalid');
    }

    // Mark payment as successful
    const payment = await this.prisma.payment.update({
      where: { orderId: orderId },
      data: {
        status: 'COMPLETED',
      },
    });

    const upgradedPlan = payment.amount === 9900 ? 'MAX' : 'PRO';

    // Update user plan
    await this.prisma.user.update({
      where: { id: userId },
      data: { plan: upgradedPlan },
    });

    // Create Subscription record
    await this.prisma.subscription.create({
      data: {
        userId: userId,
        plan: upgradedPlan,
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)), // +1 month
      }
    });

    return { success: true };
  }
}

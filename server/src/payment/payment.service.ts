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
    if (plan !== 'PLUS' && plan !== 'PRO' && plan !== 'MAX' && plan !== 'BUSINESS') {
      throw new BadRequestException('Invalid plan for order creation');
    }

    const orderId = `dummy_order_${userId.substring(0, 8)}_${Date.now()}`;

    // DUMMY FLOW: Instantly upgrade the user
    await this.prisma.user.update({
      where: { id: userId },
      data: { plan: plan }
    });

    // Record dummy payment
    await this.prisma.payment.create({
      data: {
        userId: userId,
        orderId: orderId,
        amount: 0, 
        status: 'COMPLETED',
      }
    });

    return {
      orderId: orderId,
      dummySuccess: true,
      amount: 0,
      currency: 'INR',
    };
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

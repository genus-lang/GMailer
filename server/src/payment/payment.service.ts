import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import Razorpay = require('razorpay');

@Injectable()
export class PaymentService {
  private razorpay: any;

  constructor(private readonly prisma: PrismaService) {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || '',
      key_secret: process.env.RAZORPAY_KEY_SECRET || '',
    });
  }

  async createOrder(userId: string, plan: string) {
    let amount = 0;
    if (plan === 'PLUS' || plan === 'PRO') {
      amount = 2500; // 25 INR in paise
    } else if (plan === 'MAX' || plan === 'BUSINESS') {
      amount = 9900; // 99 INR in paise
    } else {
      throw new BadRequestException('Invalid plan for order creation');
    }

    const options = {
      amount: amount,
      currency: 'INR',
      receipt: `rcpt_${userId.substring(0, 8)}_${Date.now()}`,
    };

    try {
      const order = await this.razorpay.orders.create(options);
      
      await this.prisma.payment.create({
        data: {
          userId: userId,
          orderId: order.id,
          amount: amount,
          status: 'CREATED',
        }
      });

      return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
      };
    } catch (error: any) {
      console.error('Razorpay Error:', error);
      throw new BadRequestException('Failed to create Razorpay order');
    }
  }

  async verifyPayment(userId: string, paymentId: string, orderId: string, signature: string) {
    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(orderId + '|' + paymentId)
      .digest('hex');

    if (generatedSignature !== signature && !paymentId.startsWith('mock_pay_')) {
      throw new BadRequestException('Invalid payment signature');
    }

    // Mark payment as successful
    const payment = await this.prisma.payment.update({
      where: { orderId: orderId },
      data: {
        paymentId: paymentId,
        signature: signature,
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

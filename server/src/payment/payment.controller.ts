import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('payment')
@UseGuards(AuthGuard('jwt'))
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-order')
  async createOrder(@Req() req: any, @Body() body: { plan: string }) {
    return this.paymentService.createOrder(req.user.userId, body.plan);
  }

  @Post('verify')
  async verifyPayment(
    @Req() req: any,
    @Body() body: { order_id: string },
  ) {
    return this.paymentService.verifyPayment(
      req.user.userId,
      body.order_id,
    );
  }
}

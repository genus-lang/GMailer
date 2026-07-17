import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  signPayload(payload: any) {
    return this.jwtService.sign(payload);
  }

  async getMe(userId: string) {
    let user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscriptions: true }
    });

    if (!user) return null;

    // Check if user has an active subscription that has expired
    if (user.plan !== 'FREE') {
      const activeSub = user.subscriptions.find(sub => sub.status === 'ACTIVE');
      if (activeSub && activeSub.endDate && activeSub.endDate.getTime() < Date.now()) {
        // Subscription expired! Downgrade to FREE
        await this.prisma.subscription.update({
          where: { id: activeSub.id },
          data: { status: 'EXPIRED' }
        });

        user = await this.prisma.user.update({
          where: { id: userId },
          data: { plan: 'FREE' },
          include: { subscriptions: true }
        });
      }
    }

    return user;
  }

  async updateSettings(userId: string, settings: any) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { settings }
    });
  }
}

import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private prisma: PrismaService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || 'client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'secret',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
      scope: ['email', 'profile', 'https://mail.google.com/'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { name, emails, photos } = profile;
    const email = emails[0].value;
    const picture = photos[0].value;
    const googleId = profile.id;

    // UPSERT USER
    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          name: name.givenName + ' ' + name.familyName,
          picture,
          googleId,
          googleRefreshToken: refreshToken,
          plan: 'FREE',
        },
      });
    } else {
      // Update refresh token if provided
      if (refreshToken) {
        user = await this.prisma.user.update({
          where: { email },
          data: { googleRefreshToken: refreshToken, googleId, picture },
        });
      }
    }

    done(null, { userId: user.id, email: user.email });
  }
}

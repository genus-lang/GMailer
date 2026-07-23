import { Controller, Post, Get, Body, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    return {
      accessType: 'offline',
      prompt: 'consent',
      state: req.query.ext || '',
    };
  }
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth(@Req() req: any) {
    // The AuthGuard automatically handles the redirect to Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(@Req() req: any, @Res() res: any) {
    // Here we generate our own JWT based on the user object returned by GoogleStrategy
    const payload = { sub: req.user.userId, email: req.user.email };
    const token = this.authService.signPayload(payload);
    
    // Check if we need to redirect back to the extension
    const extUrl = req.query.state;
    if (extUrl && extUrl.includes('.chromiumapp.org')) {
      return res.redirect(`${extUrl}?token=${token}`);
    }

    res.send(`<p>Authentication successful. You can close this window. Token: ${token}</p>`);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getMe(@Req() req: any) {
    return this.authService.getMe(req.user.userId);
  }

  @Post('logout')
  async logout() {
    return { success: true };
  }

  /**
   * New endpoint: Extension sends Google authorization code here.
   * We exchange it for tokens, store the refresh token, and return a JWT.
   * This allows the frontend to go directly to Google for auth (no backend redirect needed).
   */
  @Post('google/code')
  async googleCodeAuth(@Body() body: { code: string; redirectUri: string }) {
    // Exchange authorization code for tokens with Google
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: body.code,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: body.redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const tokens = await tokenRes.json() as any;
    if (tokens.error) {
      throw new Error(`Token exchange failed: ${tokens.error_description || tokens.error}`);
    }

    // Get user profile from Google
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = await userInfoRes.json() as any;

    // Create or update the user in our database
    let user = await this.prisma.user.findUnique({ where: { email: userInfo.email } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: userInfo.email,
          name: userInfo.name || userInfo.email,
          picture: userInfo.picture,
          googleId: userInfo.id,
          googleRefreshToken: tokens.refresh_token,
          plan: 'FREE',
        },
      });
    } else {
      // Always update refresh token if a new one was provided
      const updateData: any = { googleId: userInfo.id, picture: userInfo.picture };
      if (tokens.refresh_token) {
        updateData.googleRefreshToken = tokens.refresh_token;
      }
      user = await this.prisma.user.update({
        where: { email: userInfo.email },
        data: updateData,
      });
    }

    // Sign and return JWT
    const jwtToken = this.jwtService.sign({ sub: user.id, email: user.email });
    return {
      token: jwtToken,
      plan: user.plan,
      email: user.email,
      name: user.name,
      picture: user.picture,
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('settings')
  async updateSettings(@Req() req: any, @Body() body: any) {
    return this.authService.updateSettings(req.user.userId, body);
  }
}

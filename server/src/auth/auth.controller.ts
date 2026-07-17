import { Controller, Post, Get, Body, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

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
  constructor(private readonly authService: AuthService) {}

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

  @UseGuards(AuthGuard('jwt'))
  @Post('settings')
  async updateSettings(@Req() req: any, @Body() body: any) {
    return this.authService.updateSettings(req.user.userId, body);
  }
}

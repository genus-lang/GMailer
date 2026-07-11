import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';

@Controller('templates')
@UseGuards(AuthGuard('jwt'))
export class TemplatesController {
  constructor(
    private readonly templatesService: TemplatesService,
    private readonly prisma: PrismaService
  ) {}

  @Get('builtin')
  async getBuiltinTemplates(@Req() req: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { plan: true }
    });
    
    const plan = user?.plan || 'FREE';
    return this.templatesService.getBuiltinTemplates(plan);
  }
}

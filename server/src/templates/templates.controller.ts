import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
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

  @Get()
  async getCustomTemplates(@Req() req: any) {
    return this.templatesService.findAllCustom(req.user.userId);
  }

  @Post()
  async upsertCustomTemplate(@Req() req: any, @Body() body: any) {
    return this.templatesService.upsertCustom(req.user.userId, body);
  }

  @Delete(':id')
  async deleteCustomTemplate(@Req() req: any, @Param('id') id: string) {
    return this.templatesService.deleteCustom(req.user.userId, id);
  }
}

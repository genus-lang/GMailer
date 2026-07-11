import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('campaigns')
@UseGuards(AuthGuard('jwt'))
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  async getCampaigns(@Req() req: any) {
    return this.campaignsService.findAll(req.user.userId);
  }

  @Post()
  async createCampaign(@Req() req: any, @Body() data: any) {
    return this.campaignsService.create(req.user.userId, data);
  }

  @Get(':id')
  async getCampaign(@Req() req: any, @Param('id') id: string) {
    return this.campaignsService.findOne(req.user.userId, id);
  }
}

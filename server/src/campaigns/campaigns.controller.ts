import { Controller, Get, Post, Body, Param, UseGuards, Req, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as os from 'os';

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

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: os.tmpdir(),
      filename: (req: any, file: any, cb: any) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        cb(null, `${randomName}${extname(file.originalname)}`);
      }
    }),
    fileFilter: (req: any, file: any, cb: any) => {
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Only PDF files are allowed'), false);
      }
    }
  }))
  async uploadFile(@Req() req: any, @UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('File is required and must be a PDF');
    }
    return {
      success: true,
      path: file.path // e.g., 'uploads/xxxx.pdf'
    };
  }

  @Get(':id')
  async getCampaign(@Req() req: any, @Param('id') id: string) {
    return this.campaignsService.findOne(req.user.userId, id);
  }

  @Post(':id/pause')
  async pauseCampaign(@Req() req: any, @Param('id') id: string) {
    return this.campaignsService.pause(req.user.userId, id);
  }

  @Post(':id/resume')
  async resumeCampaign(@Req() req: any, @Param('id') id: string) {
    return this.campaignsService.resume(req.user.userId, id);
  }

  @Post(':id/stop')
  async stopCampaign(@Req() req: any, @Param('id') id: string) {
    return this.campaignsService.stop(req.user.userId, id);
  }
}

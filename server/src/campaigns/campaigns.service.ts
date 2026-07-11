import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  async findAll(userId: string) {
    return this.prisma.campaign.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { emails: true },
    });
  }

  async findOne(userId: string, id: string) {
    return this.prisma.campaign.findUnique({
      where: { id, userId },
      include: { emails: true },
    });
  }

  async create(userId: string, data: any) {
    const { name, subject, body, recipients } = data; // recipients is array of emails

    const campaign = await this.prisma.campaign.create({
      data: {
        userId,
        name,
        subject,
        body,
        status: 'RUNNING',
        stats: { total: recipients?.length || 0, sent: 0, failed: 0, opened: 0 },
      },
    });

    if (recipients && Array.isArray(recipients)) {
      for (const email of recipients) {
        await this.queueService.addEmailToQueue(
          userId,
          campaign.id,
          email,
          subject,
          body,
        );
      }
    }

    return campaign;
  }
}

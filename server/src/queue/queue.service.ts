import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('email-queue') private emailQueue: Queue,
    private prisma: PrismaService,
  ) {}

  async addEmailToQueue(
    userId: string,
    campaignId: string,
    toEmail: string,
    subject: string,
    body: string,
    attachmentPath?: string,
  ) {
    // 1. Create DB Record
    const emailQueueRecord = await this.prisma.emailQueue.create({
      data: {
        campaignId,
        userId,
        toEmail,
        attachmentPath,
        status: 'PENDING',
      },
    });

    // 2. Add to BullMQ
    await this.emailQueue.add(
      'send-email',
      {
        emailQueueId: emailQueueRecord.id,
        userId,
        toEmail,
        subject,
        body,
        attachmentPath,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );

    this.logger.log(`Added email to queue for ${toEmail}`);
    return emailQueueRecord;
  }
}

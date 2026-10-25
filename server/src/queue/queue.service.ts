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
        campaignId,
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
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log(`[QueueService] Added email to queue for ${toEmail} (Campaign: ${campaignId}, QueueId: ${emailQueueRecord.id})`);
    return emailQueueRecord;
  }

  async addExistingEmailToQueue(
    userId: string,
    emailQueueId: string,
    campaignId: string,
    toEmail: string,
    subject: string,
    body: string,
    attachmentPath?: string,
  ) {
    await this.emailQueue.add(
      'send-email',
      {
        emailQueueId,
        campaignId,
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
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log(`[QueueService] Re-queued existing email for ${toEmail} (Campaign: ${campaignId}, QueueId: ${emailQueueId})`);
  }

  async removeCampaignJobs(campaignId: string): Promise<number> {
    let removedCount = 0;
    try {
      const jobs = await this.emailQueue.getJobs(['waiting', 'delayed']);
      for (const job of jobs) {
        if (job?.data?.campaignId === campaignId) {
          try {
            await job.remove();
            removedCount++;
            this.logger.log(`[QueueService] Removed pending job ${job.id} for campaign ${campaignId}`);
          } catch (e: any) {
            this.logger.warn(`[QueueService] Could not remove job ${job.id}: ${e.message}`);
          }
        }
      }
    } catch (err: any) {
      this.logger.error(`[QueueService] Error removing jobs for campaign ${campaignId}: ${err.message}`);
    }
    return removedCount;
  }
}

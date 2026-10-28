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
    delayMs: number = 0,
    sendAt: Date = new Date(),
  ) {
    // 1. Create DB Record with sendAt
    const emailQueueRecord = await this.prisma.emailQueue.create({
      data: {
        campaignId,
        userId,
        toEmail,
        attachmentPath,
        status: 'PENDING',
        sendAt,
      },
    });

    // 2. Add to BullMQ with delay
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
        delay: delayMs,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log(`[QueueService] Added email to queue for ${toEmail} (Campaign: ${campaignId}, Delay: ${delayMs}ms, SendAt: ${sendAt.toISOString()})`);
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
    delayMs: number = 0,
    sendAt?: Date,
  ) {
    if (sendAt) {
      await this.prisma.emailQueue.update({
        where: { id: emailQueueId },
        data: { sendAt, status: 'PENDING' },
      });
    }

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
        delay: delayMs,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log(`[QueueService] Re-queued existing email for ${toEmail} (Campaign: ${campaignId}, Delay: ${delayMs}ms, QueueId: ${emailQueueId})`);
  }

  async removeCampaignJobs(campaignId: string): Promise<number> {
    let removedCount = 0;
    try {
      const batchSize = 500;
      let start = 0;
      let hasMore = true;

      while (hasMore) {
        const jobs = await this.emailQueue.getJobs(['waiting', 'delayed', 'paused'], start, start + batchSize - 1);
        if (!jobs || jobs.length === 0) {
          hasMore = false;
          break;
        }

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

        if (jobs.length < batchSize) {
          hasMore = false;
        } else {
          start += batchSize;
        }
      }
    } catch (err: any) {
      this.logger.error(`[QueueService] Error removing jobs for campaign ${campaignId}: ${err.message}`);
    }
    return removedCount;
  }
}

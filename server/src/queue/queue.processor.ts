import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GmailService } from '../gmail/gmail.service';

@Processor('email-queue')
export class EmailQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailQueueProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gmailService: GmailService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { emailQueueId, toEmail, subject, body, userId, attachmentPath } = job.data;
    
    this.logger.log(`Processing job ${job.id} for email ${toEmail}`);

    try {
      // 1. Mark as processing
      await this.prisma.emailQueue.update({
        where: { id: emailQueueId },
        data: { status: 'PROCESSING' },
      });

      // 2. Fetch User to get Refresh Token
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.googleRefreshToken) {
        throw new Error('User not found or missing Google Refresh Token');
      }

      // 3. Add random delay to simulate human sending (20s - 45s)
      const delay = Math.floor(Math.random() * (45000 - 20000 + 1) + 20000);
      this.logger.log(`Delaying sending for ${delay}ms to simulate human...`);
      await new Promise((resolve) => setTimeout(resolve, delay));

      // 4. Send via Gmail API
      await this.gmailService.sendEmail(
        user.googleRefreshToken,
        toEmail,
        subject,
        body,
        attachmentPath,
      );

      // 5. Mark as sent
      await this.prisma.emailQueue.update({
        where: { id: emailQueueId },
        data: { status: 'SENT' },
      });

      // 6. Update Campaign Stats
      const queueItem = await this.prisma.emailQueue.findUnique({ where: { id: emailQueueId }});
      if (queueItem) {
        const campaign = await this.prisma.campaign.findUnique({ where: { id: queueItem.campaignId } });
        if (campaign) {
          const stats: any = campaign.stats || { total: 0, sent: 0, failed: 0, opened: 0 };
          stats.sent = (stats.sent || 0) + 1;
          await this.prisma.campaign.update({
            where: { id: campaign.id },
            data: { stats }
          });
        }
      }

      this.logger.log(`Job ${job.id} completed successfully.`);
      return { success: true };

    } catch (error) {
      this.logger.error(`Job ${job.id} failed: ${error.message}`);
      
      // Mark as failed
      await this.prisma.emailQueue.update({
        where: { id: emailQueueId },
        data: { status: 'FAILED', error: error.message },
      });
      
      const queueItem = await this.prisma.emailQueue.findUnique({ where: { id: emailQueueId }});
      if (queueItem) {
        const campaign = await this.prisma.campaign.findUnique({ where: { id: queueItem.campaignId } });
        if (campaign) {
          const stats: any = campaign.stats || { total: 0, sent: 0, failed: 0, opened: 0 };
          stats.failed = (stats.failed || 0) + 1;
          await this.prisma.campaign.update({
            where: { id: campaign.id },
            data: { stats }
          });
        }
      }

      throw error; // BullMQ will retry if configured
    }
  }
}

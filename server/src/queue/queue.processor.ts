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
    const { emailQueueId, toEmail, subject, body, userId, attachmentPath, campaignId } = job.data;
    
    this.logger.log(`[QueueProcessor] Starting job ${job.id} for email ${toEmail} (QueueId: ${emailQueueId})`);

    // 1. Initial State Check from Database (Source of Truth)
    const queueItem = await this.prisma.emailQueue.findUnique({
      where: { id: emailQueueId },
      include: { campaign: true }
    });

    if (!queueItem || !queueItem.campaign) {
      this.logger.warn(`[QueueProcessor] Job ${job.id}: Record ${emailQueueId} or parent campaign not found. Skipping.`);
      return { skipped: true, reason: 'Record not found' };
    }

    const currentCampaignId = campaignId || queueItem.campaignId;

    // Guard against duplicate send
    if (queueItem.status === 'SENT') {
      this.logger.log(`[QueueProcessor] Job ${job.id}: Email to ${toEmail} already marked SENT. Skipping.`);
      return { skipped: true, reason: 'Already sent' };
    }

    // Guard against STOPPED or COMPLETED campaigns
    if (queueItem.campaign.status === 'STOPPED' || queueItem.campaign.status === 'COMPLETED' || queueItem.status === 'STOPPED') {
      this.logger.log(`[QueueProcessor] Job ${job.id}: Campaign ${currentCampaignId} is ${queueItem.campaign.status}. Aborting.`);
      if (queueItem.status !== 'STOPPED' && queueItem.status !== 'SENT') {
        await this.prisma.emailQueue.update({
          where: { id: emailQueueId },
          data: { status: 'STOPPED', error: 'Campaign was stopped' }
        });
      }
      return { skipped: true, reason: `Campaign ${queueItem.campaign.status}` };
    }

    // Guard against PAUSED campaigns
    if (queueItem.campaign.status === 'PAUSED' || queueItem.status === 'PAUSED') {
      this.logger.log(`[QueueProcessor] Job ${job.id}: Campaign ${currentCampaignId} is PAUSED. Halting.`);
      if (queueItem.status !== 'PAUSED' && queueItem.status !== 'SENT') {
        await this.prisma.emailQueue.update({
          where: { id: emailQueueId },
          data: { status: 'PAUSED' }
        });
      }
      return { paused: true, reason: 'Campaign is paused' };
    }

    // Guard against any non-RUNNING state
    if (queueItem.campaign.status !== 'RUNNING') {
      this.logger.log(`[QueueProcessor] Job ${job.id}: Campaign ${currentCampaignId} is not RUNNING (${queueItem.campaign.status}). Halting.`);
      return { skipped: true, reason: queueItem.campaign.status };
    }

    try {
      // 2. Mark as PROCESSING in DB
      await this.prisma.emailQueue.update({
        where: { id: emailQueueId },
        data: { status: 'PROCESSING' },
      });

      // 3. Fetch User to get Refresh Token
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.googleRefreshToken) {
        throw new Error('User not found or missing Google Refresh Token');
      }

      // 4. Add human sending delay with 1.5s sliced checks for Pause / Stop
      const delayMs = Math.floor(Math.random() * (45000 - 20000 + 1) + 20000);
      this.logger.log(`[QueueProcessor] Job ${job.id}: Delaying ${delayMs}ms before send to simulate human behavior...`);
      
      const checkIntervalMs = 1500;
      let elapsedMs = 0;
      while (elapsedMs < delayMs) {
        const sleepTime = Math.min(checkIntervalMs, delayMs - elapsedMs);
        await new Promise((resolve) => setTimeout(resolve, sleepTime));
        elapsedMs += sleepTime;

        // Periodic check on campaign status in DB
        const statusCheck = await this.prisma.campaign.findUnique({
          where: { id: currentCampaignId },
          select: { status: true }
        });

        if (statusCheck?.status === 'PAUSED') {
          this.logger.log(`[QueueProcessor] Job ${job.id}: Campaign ${currentCampaignId} was PAUSED during delay. Aborting email to ${toEmail}.`);
          await this.prisma.emailQueue.update({
            where: { id: emailQueueId },
            data: { status: 'PAUSED' }
          });
          return { paused: true, reason: 'paused_during_delay' };
        }

        if (statusCheck?.status === 'STOPPED' || statusCheck?.status === 'COMPLETED') {
          this.logger.log(`[QueueProcessor] Job ${job.id}: Campaign ${currentCampaignId} was ${statusCheck?.status} during delay. Aborting email to ${toEmail}.`);
          await this.prisma.emailQueue.update({
            where: { id: emailQueueId },
            data: { status: 'STOPPED', error: 'Campaign stopped during delay' }
          });
          return { stopped: true, reason: 'stopped_during_delay' };
        }
      }

      // 5. Final pre-flight verification immediately before Gmail API call
      const preSendCheck = await this.prisma.campaign.findUnique({
        where: { id: currentCampaignId },
        select: { status: true }
      });

      if (preSendCheck?.status !== 'RUNNING') {
        this.logger.log(`[QueueProcessor] Job ${job.id}: Pre-send check failed. Campaign ${currentCampaignId} is ${preSendCheck?.status}. Aborting.`);
        const targetStatus = preSendCheck?.status === 'PAUSED' ? 'PAUSED' : 'STOPPED';
        await this.prisma.emailQueue.update({
          where: { id: emailQueueId },
          data: { status: targetStatus, error: targetStatus === 'STOPPED' ? 'Campaign stopped' : null }
        });
        return { aborted: true, reason: targetStatus };
      }

      // 6. Send via Gmail API
      this.logger.log(`[QueueProcessor] Job ${job.id}: Sending email to ${toEmail} via Gmail API...`);
      await this.gmailService.sendEmail(
        user.googleRefreshToken,
        toEmail,
        subject,
        body,
        attachmentPath,
      );

      // 7. Mark as SENT in DB
      await this.prisma.emailQueue.update({
        where: { id: emailQueueId },
        data: { status: 'SENT', error: null },
      });

      // 8. Update Campaign Stats accurately from DB
      await this.updateCampaignStats(currentCampaignId);

      this.logger.log(`[QueueProcessor] Job ${job.id} for email ${toEmail} completed successfully.`);
      return { success: true };

    } catch (error: any) {
      this.logger.error(`[QueueProcessor] Job ${job.id} for email ${toEmail} failed: ${error.message}`);
      
      // Check if campaign was PAUSED or STOPPED while job was running
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: currentCampaignId },
        select: { status: true }
      });

      if (campaign?.status === 'PAUSED') {
        await this.prisma.emailQueue.update({
          where: { id: emailQueueId },
          data: { status: 'PAUSED', error: `Paused during processing: ${error.message}` },
        });
        return { paused: true, error: error.message };
      }

      if (campaign?.status === 'STOPPED' || campaign?.status === 'COMPLETED') {
        await this.prisma.emailQueue.update({
          where: { id: emailQueueId },
          data: { status: 'STOPPED', error: `Campaign stopped: ${error.message}` },
        });
        return { stopped: true, error: error.message };
      }

      // Mark as failed in DB
      await this.prisma.emailQueue.update({
        where: { id: emailQueueId },
        data: { status: 'FAILED', error: error.message },
      });
      
      await this.updateCampaignStats(currentCampaignId);

      // Only retry if campaign is still RUNNING and attempts remain
      if (job.attemptsMade < (job.opts?.attempts || 3)) {
        throw error; // Let BullMQ retry
      }
    }
  }

  private async updateCampaignStats(campaignId: string) {
    try {
      const [sentCount, failedCount, pendingCount, pausedCount, totalCount] = await Promise.all([
        this.prisma.emailQueue.count({ where: { campaignId, status: 'SENT' } }),
        this.prisma.emailQueue.count({ where: { campaignId, status: { in: ['FAILED', 'STOPPED'] } } }),
        this.prisma.emailQueue.count({ where: { campaignId, status: { in: ['PENDING', 'PROCESSING'] } } }),
        this.prisma.emailQueue.count({ where: { campaignId, status: 'PAUSED' } }),
        this.prisma.emailQueue.count({ where: { campaignId } }),
      ]);

      const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
      if (!campaign) return;

      const stats: any = campaign.stats || {};
      stats.total = totalCount;
      stats.sent = sentCount;
      stats.failed = failedCount;

      const isCompleted = pendingCount === 0 && pausedCount === 0;
      // Only transition to COMPLETED if campaign is currently RUNNING and nothing is left
      const newStatus = (isCompleted && campaign.status === 'RUNNING') ? 'COMPLETED' : campaign.status;

      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { 
          stats,
          status: newStatus
        }
      });

      this.logger.log(`[QueueProcessor] Updated stats for Campaign ${campaignId}: sent=${sentCount}, failed=${failedCount}, pending=${pendingCount}, paused=${pausedCount}, status=${newStatus}`);
    } catch (err: any) {
      this.logger.error(`[QueueProcessor] Error updating stats for campaign ${campaignId}: ${err.message}`);
    }
  }
}

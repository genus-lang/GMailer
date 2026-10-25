import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

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
    const { name, subject, body, recipients, attachmentPath, allowResend } = data; // recipients is array of emails

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      throw new BadRequestException('No recipients provided for the campaign.');
    }

    let finalRecipients = recipients;

    if (!allowResend) {
      // Prevent sending duplicate emails to the same contact if already sent or in progress
      const pastEmails = await this.prisma.emailQueue.findMany({
        where: { 
          userId, 
          toEmail: { in: recipients },
          status: { in: ['SENT', 'PROCESSING', 'PENDING'] }
        },
        select: { toEmail: true }
      });
      const sentBefore = new Set(pastEmails.map(e => e.toEmail.toLowerCase().trim()));
      
      finalRecipients = recipients.filter(email => !sentBefore.has(email.toLowerCase().trim()));
    }

    if (finalRecipients.length === 0) {
      throw new BadRequestException(
        'All selected recipients have already been emailed previously. Enable "Allow re-sending" in campaign settings or select new contacts.'
      );
    }

    const campaign = await this.prisma.campaign.create({
      data: {
        userId,
        name,
        subject,
        body,
        attachmentPath,
        status: 'RUNNING',
        stats: { total: finalRecipients.length, sent: 0, failed: 0, opened: 0 },
      },
    });

    for (const email of finalRecipients) {
      await this.queueService.addEmailToQueue(
        userId,
        campaign.id,
        email,
        subject,
        body,
        attachmentPath
      );
    }

    return campaign;
  }

  async pause(userId: string, id: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id, userId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status === 'PAUSED') {
      return campaign;
    }

    if (campaign.status !== 'RUNNING') {
      throw new BadRequestException(`Cannot pause campaign with status "${campaign.status}". Only RUNNING campaigns can be paused.`);
    }

    // 1. Atomically update Campaign status to PAUSED in DB
    const updated = await this.prisma.campaign.update({
      where: { id },
      data: { status: 'PAUSED' },
    });

    // 2. Put any PENDING or in-flight PROCESSING queue items on hold in DB
    await this.prisma.emailQueue.updateMany({
      where: { campaignId: id, status: { in: ['PENDING', 'PROCESSING'] } },
      data: { status: 'PAUSED' },
    });

    // 3. Remove pending/delayed jobs from BullMQ so worker halts pulling them
    await this.queueService.removeCampaignJobs(id);

    this.logger.log(`[CampaignsService] Campaign ${id} paused by user ${userId}`);
    return updated;
  }

  async resume(userId: string, id: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id, userId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status === 'RUNNING') {
      return campaign;
    }

    if (campaign.status !== 'PAUSED') {
      throw new BadRequestException(`Cannot resume campaign with status "${campaign.status}". Only PAUSED campaigns can be resumed.`);
    }

    // 1. Find all remaining unsent emails
    const unsentEmails = await this.prisma.emailQueue.findMany({
      where: {
        campaignId: id,
        status: { in: ['PAUSED', 'PENDING'] },
      },
    });

    if (unsentEmails.length === 0) {
      // Nothing left to send, mark completed
      const completed = await this.prisma.campaign.update({
        where: { id },
        data: { status: 'COMPLETED' },
      });
      return completed;
    }

    // 2. Atomically update Campaign status to RUNNING
    const updated = await this.prisma.campaign.update({
      where: { id },
      data: { status: 'RUNNING' },
    });

    // 3. Update unsent emails from PAUSED back to PENDING
    await this.prisma.emailQueue.updateMany({
      where: { campaignId: id, status: 'PAUSED' },
      data: { status: 'PENDING' },
    });

    // 4. Re-queue only the remaining unsent emails into BullMQ
    for (const emailRecord of unsentEmails) {
      await this.queueService.addExistingEmailToQueue(
        userId,
        emailRecord.id,
        id,
        emailRecord.toEmail,
        campaign.subject || '',
        campaign.body || '',
        campaign.attachmentPath || undefined,
      );
    }

    this.logger.log(`[CampaignsService] Campaign ${id} resumed by user ${userId}. Re-queued ${unsentEmails.length} unsent emails.`);
    return updated;
  }

  async stop(userId: string, id: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id, userId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status === 'STOPPED' || campaign.status === 'COMPLETED') {
      return campaign;
    }

    // 1. Atomically update Campaign status to STOPPED
    const updated = await this.prisma.campaign.update({
      where: { id },
      data: { status: 'STOPPED' },
    });

    // 2. Invalidate / cancel all remaining unsent emails in EmailQueue
    await this.prisma.emailQueue.updateMany({
      where: { campaignId: id, status: { in: ['PENDING', 'PAUSED', 'PROCESSING'] } },
      data: { status: 'STOPPED', error: 'Campaign was stopped by user' },
    });

    // 3. Remove all pending/delayed jobs from BullMQ
    await this.queueService.removeCampaignJobs(id);

    this.logger.log(`[CampaignsService] Campaign ${id} stopped by user ${userId}`);
    return updated;
  }
}

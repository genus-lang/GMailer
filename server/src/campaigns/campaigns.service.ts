import { Injectable, BadRequestException } from '@nestjs/common';
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
    const campaign = await this.prisma.campaign.update({
      where: { id, userId },
      data: { status: 'PAUSED' }
    });
    // Optional: could also update PENDING queue items to PAUSED, but our processor can just check campaign status if needed, 
    // or we can update queue directly:
    await this.prisma.emailQueue.updateMany({
      where: { campaignId: id, status: 'PENDING' },
      data: { status: 'PAUSED' }
    });
    return campaign;
  }

  async resume(userId: string, id: string) {
    const campaign = await this.prisma.campaign.update({
      where: { id, userId },
      data: { status: 'RUNNING' }
    });
    await this.prisma.emailQueue.updateMany({
      where: { campaignId: id, status: 'PAUSED' },
      data: { status: 'PENDING' }
    });
    return campaign;
  }

  async stop(userId: string, id: string) {
    const campaign = await this.prisma.campaign.update({
      where: { id, userId },
      data: { status: 'COMPLETED' }
    });
    await this.prisma.emailQueue.updateMany({
      where: { campaignId: id, status: { in: ['PENDING', 'PAUSED'] } },
      data: { status: 'FAILED', error: 'Campaign stopped' }
    });
    return campaign;
  }
}

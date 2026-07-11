import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueService } from './queue.service';
import { EmailQueueProcessor } from './queue.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { GmailModule } from '../gmail/gmail.module';

@Module({
  imports: [
    PrismaModule,
    GmailModule,
    BullModule.registerQueue({
      name: 'email-queue',
    }),
  ],
  providers: [QueueService, EmailQueueProcessor],
  exports: [QueueService],
})
export class QueueModule {}

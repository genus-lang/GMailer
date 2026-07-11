import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PaymentModule } from './payment/payment.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { WebhookModule } from './webhook/webhook.module';
import { BullModule } from '@nestjs/bullmq';
import { CampaignsModule } from './campaigns/campaigns.module';
import { ContactsModule } from './contacts/contacts.module';
import { TemplatesModule } from './templates/templates.module';
import { QueueModule } from './queue/queue.module';
import { GmailModule } from './gmail/gmail.module';

@Module({
  imports: [
    PrismaModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '14555'),
        username: process.env.REDIS_USER,
        password: process.env.REDIS_PASSWORD,
        tls: { rejectUnauthorized: false }, // Required for secure Aiven connection
      },
    }),
    AuthModule,
    PaymentModule,
    SubscriptionModule,
    WebhookModule,
    CampaignsModule,
    ContactsModule,
    TemplatesModule,
    QueueModule,
    GmailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

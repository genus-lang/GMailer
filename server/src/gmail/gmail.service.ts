import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class GmailService {
  private readonly logger = new Logger(GmailService.name);

  private getOAuth2Client(refreshToken: string) {
    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL,
    );
    oAuth2Client.setCredentials({ refresh_token: refreshToken });
    return oAuth2Client;
  }

  async sendEmail(
    refreshToken: string,
    to: string,
    subject: string,
    body: string,
    attachmentPath?: string,
  ): Promise<boolean> {
    try {
      const auth = this.getOAuth2Client(refreshToken);
      const gmail = google.gmail({ version: 'v1', auth });

      const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
      let messageParts: string[] = [];

      if (attachmentPath && fs.existsSync(attachmentPath)) {
        // Construct multipart/mixed email
        const boundary = 'foo1234567890boundary';
        messageParts = [
          `To: ${to}`,
          `Subject: ${utf8Subject}`,
          'MIME-Version: 1.0',
          `Content-Type: multipart/mixed; boundary="${boundary}"`,
          '',
          `--${boundary}`,
          'Content-Type: text/html; charset=utf-8',
          '',
          body,
          '',
          `--${boundary}`,
          `Content-Type: application/pdf; name="${path.basename(attachmentPath)}"`,
          `Content-Disposition: attachment; filename="${path.basename(attachmentPath)}"`,
          'Content-Transfer-Encoding: base64',
          '',
          fs.readFileSync(attachmentPath, { encoding: 'base64' }),
          '',
          `--${boundary}--`
        ];
      } else {
        // Simple HTML email
        messageParts = [
          `To: ${to}`,
          'Content-Type: text/html; charset=utf-8',
          'MIME-Version: 1.0',
          `Subject: ${utf8Subject}`,
          '',
          body,
        ];
      }

      const message = messageParts.join('\r\n');
      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const res = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      this.logger.log(`Email sent to ${to}, Message Id: ${res.data.id}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      throw error;
    }
  }
}

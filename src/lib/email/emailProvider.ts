/**
 * Email Provider Abstraction
 * Allows GMailer to work with Gmail, Outlook, SMTP, SES, or Resend.
 * Every provider implements the same interface.
 */

export interface EmailSendOptions {
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
  from?: string;
  replyTo?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Core interface that all email providers must implement.
 */
export interface EmailProvider {
  name: string;
  sendEmail(options: EmailSendOptions, token: string): Promise<EmailSendResult>;
  validateToken(token: string): Promise<boolean>;
}

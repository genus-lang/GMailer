/**
 * Outlook Email Provider (Stub)
 * Implementation of the EmailProvider interface for Microsoft Outlook/Office365.
 */

import { EmailProvider, EmailSendOptions, EmailSendResult } from './emailProvider';

export class OutlookProvider implements EmailProvider {
  name = 'Outlook';

  async sendEmail(options: EmailSendOptions, token: string): Promise<EmailSendResult> {
    // This is a stub for future implementation using Microsoft Graph API
    // https://graph.microsoft.com/v1.0/me/sendMail
    
    console.warn(`[OutlookProvider] Stub called for sending email to ${options.to}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Simulate successful send
    return { 
      success: true, 
      messageId: `mock_outlook_${Date.now()}` 
    };
  }

  async validateToken(token: string): Promise<boolean> {
    // Validate against MS Graph
    return true; 
  }
}

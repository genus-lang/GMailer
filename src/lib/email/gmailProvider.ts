/**
 * Gmail Email Provider
 * Implements the EmailProvider interface using the Gmail REST API.
 * Uses RFC 2822 MIME format encoded as base64url.
 */

import { EmailProvider, EmailSendOptions, EmailSendResult } from './emailProvider';

function buildMimeMessage(options: EmailSendOptions): string {
  const isHtml = options.isHtml ?? (options.body.includes('<') && options.body.includes('>'));

  // RFC 2822 compliant MIME message
  const boundary = `gmailer_${Date.now()}`;
  let raw: string;

  if (isHtml) {
    raw = [
      `To: ${options.to}`,
      `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(options.subject)))}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      btoa(unescape(encodeURIComponent(options.body.replace(/<[^>]*>/g, '')))),
      `--${boundary}`,
      `Content-Type: text/html; charset="UTF-8"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      btoa(unescape(encodeURIComponent(options.body))),
      `--${boundary}--`,
    ].join('\r\n');
  } else {
    raw = [
      `To: ${options.to}`,
      `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(options.subject)))}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset="UTF-8"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      btoa(unescape(encodeURIComponent(options.body))),
    ].join('\r\n');
  }

  // base64url encode
  return btoa(unescape(encodeURIComponent(raw)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export class GmailProvider implements EmailProvider {
  name = 'Gmail';

  async sendEmail(options: EmailSendOptions, token: string): Promise<EmailSendResult> {
    console.log('[GmailProvider] Attempting to send email to:', options.to);
    console.log('[GmailProvider] Subject:', options.subject);

    try {
      const encodedMessage = buildMimeMessage(options);

      const response = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ raw: encodedMessage }),
        }
      );

      const responseText = await response.text();
      console.log('[GmailProvider] Response status:', response.status);
      console.log('[GmailProvider] Response body:', responseText);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error?.message || errorMessage;
        } catch (_) {}
        console.error('[GmailProvider] Send failed:', errorMessage);
        return { success: false, error: errorMessage };
      }

      const data = JSON.parse(responseText);
      console.log('[GmailProvider] Email sent successfully! Message ID:', data.id);
      return { success: true, messageId: data.id };
    } catch (error: any) {
      console.error('[GmailProvider] Network/parse error:', error);
      return { success: false, error: error.message || 'Network error' };
    }
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + token);
      const data = await res.json();
      console.log('[GmailProvider] Token info:', data);
      // Check if the token has gmail.send scope
      const hasScope = data.scope && (
        data.scope.includes('gmail.send') || 
        data.scope.includes('gmail.modify') || 
        data.scope.includes('mail.google.com')
      );
      if (!hasScope) {
        console.warn('[GmailProvider] Token is missing gmail.send scope! Scopes:', data.scope);
      }
      return res.ok;
    } catch {
      return false;
    }
  }
}

export async function sendEmail(
  token: string, 
  to: string, 
  subject: string, 
  body: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Construct MIME email (base64url encoded)
    // We use a simple plain text or HTML structure
    const isHtml = body.includes('<') && body.includes('>');
    
    // In a real app we would get the user's name from userInfo, but for now we just omit the From header and let Gmail fill it in
    const messageParts = [
      `To: ${to}`,
      `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      `Content-Type: ${isHtml ? 'text/html' : 'text/plain'}; charset="UTF-8"`,
      '',
      body
    ];

    const message = messageParts.join('\r\n');
    const encodedMessage = btoa(unescape(encodeURIComponent(message)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await fetch('https://gmail.googleapis.com/upload/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encodedMessage
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to send email');
    }

    return { success: true };
  } catch (error: any) {
    console.error('Gmail API Error:', error);
    return { success: false, error: error.message || 'Unknown network error' };
  }
}

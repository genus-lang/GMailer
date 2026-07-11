import { EmailThread, EmailMessage } from '../../store/useInboxStore';

// Helper to decode Base64 URL safe string
function decodeBase64Url(str: string) {
  try {
    return decodeURIComponent(
      atob(str.replace(/-/g, '+').replace(/_/g, '/'))
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch (e) {
    return '';
  }
}

function getHeader(headers: any[], name: string) {
  const header = headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
  return header ? header.value : '';
}

function parseMessagePart(part: any): { text: string; html: string } {
  let text = '';
  let html = '';

  if (part.mimeType === 'text/plain' && part.body?.data) {
    text = decodeBase64Url(part.body.data);
  } else if (part.mimeType === 'text/html' && part.body?.data) {
    html = decodeBase64Url(part.body.data);
  } else if (part.parts) {
    for (const p of part.parts) {
      const parsed = parseMessagePart(p);
      text += parsed.text;
      html += parsed.html;
    }
  }

  return { text, html };
}

async function fetchThreadDetail(token: string, threadId: string): Promise<EmailThread | null> {
  try {
    const threadRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=full`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!threadRes.ok) return null;
    const threadData = await threadRes.json();

    const messages: EmailMessage[] = [];
    let isUnread = false;
    const participants = new Set<string>();
    let threadSubject = '';

    threadData.messages.forEach((msg: any) => {
      const headers = msg.payload.headers;
      const subject = getHeader(headers, 'Subject');
      const from = getHeader(headers, 'From');
      const to = getHeader(headers, 'To');
      const date = getHeader(headers, 'Date');

      if (!threadSubject && subject) threadSubject = subject;
      
      // Extract display name from "Name <email>" format
      const displayName = from.includes('<') 
        ? from.split('<')[0].trim().replace(/^"(.*)"$/, '$1')
        : from;
      participants.add(displayName || from);

      if (msg.labelIds?.includes('UNREAD')) isUnread = true;

      const parsedBody = parseMessagePart(msg.payload);

      messages.push({
        id: msg.id,
        threadId: threadData.id,
        subject,
        from,
        to,
        date,
        snippet: msg.snippet,
        bodyText: parsedBody.text,
        bodyHtml: parsedBody.html || parsedBody.text.replace(/\n/g, '<br/>')
      });
    });

    return {
      id: threadData.id,
      snippet: threadData.snippet || messages[messages.length - 1]?.snippet || '',
      lastMessageDate: messages[messages.length - 1]?.date || '',
      isUnread,
      messages,
      participants: Array.from(participants),
      subject: threadSubject
    };
  } catch (error) {
    console.error('Error fetching thread detail:', threadId, error);
    return null;
  }
}

export async function fetchInboxThreads(token: string, contacts: any[]): Promise<EmailThread[]> {
  try {
    console.log('[InboxProvider] Fetching inbox, contacts count:', contacts?.length);
    
    // Strategy 1: Fetch all threads that are INBOX replies (from anyone) 
    // that are part of a thread we sent — this is the most reliable approach.
    // We look for emails in INBOX with the label "SENT" also in the thread
    // 
    // Strategy 2 (used here): Fetch recently received emails from our contact list
    // Split into batches of 20 contacts max to keep query URLs short

    const contactEmails = (contacts || [])
      .map((c: any) => c.email?.toLowerCase())
      .filter(Boolean);

    let threads: EmailThread[] = [];
    const seenIds = new Set<string>();

    if (contactEmails.length === 0) {
      // No contacts — fallback: show all INBOX threads that have a reply (thread with >1 message)
      console.log('[InboxProvider] No contacts, fetching recent inbox threads with replies...');
      const query = 'in:inbox';
      const url = `https://gmail.googleapis.com/gmail/v1/users/me/threads?q=${encodeURIComponent(query)}&maxResults=30`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        for (const t of (data.threads || [])) {
          if (seenIds.has(t.id)) continue;
          seenIds.add(t.id);
          const detail = await fetchThreadDetail(token, t.id);
          if (detail && detail.messages.length > 1) threads.push(detail); // only threads with replies
        }
      }
    } else {
      // Batch contacts into groups of 15 to stay within URL limits
      const BATCH_SIZE = 15;
      for (let i = 0; i < Math.min(contactEmails.length, 200); i += BATCH_SIZE) {
        const batch = contactEmails.slice(i, i + BATCH_SIZE);
        const queryParts = batch.map((email: string) => `from:${email}`);
        const query = `in:inbox (${queryParts.join(' OR ')})`;
        const url = `https://gmail.googleapis.com/gmail/v1/users/me/threads?q=${encodeURIComponent(query)}&maxResults=20`;
        
        console.log(`[InboxProvider] Fetching batch ${i / BATCH_SIZE + 1}, query: ${query.substring(0, 80)}...`);
        
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
          console.warn('[InboxProvider] Batch fetch failed:', response.status, await response.text());
          continue;
        }
        const data = await response.json();

        for (const t of (data.threads || [])) {
          if (seenIds.has(t.id)) continue;
          seenIds.add(t.id);
          const detail = await fetchThreadDetail(token, t.id);
          if (detail) threads.push(detail);
        }
      }
    }

    // Sort by most recent first
    threads.sort((a, b) => {
      const dateA = a.lastMessageDate ? new Date(a.lastMessageDate).getTime() : 0;
      const dateB = b.lastMessageDate ? new Date(b.lastMessageDate).getTime() : 0;
      return dateB - dateA;
    });

    console.log('[InboxProvider] Total threads found:', threads.length);
    return threads;
  } catch (error) {
    console.error('[InboxProvider] Error fetching inbox threads:', error);
    return [];
  }
}

export async function markThreadAsReadAPI(token: string, threadId: string): Promise<boolean> {
  try {
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}/modify`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        removeLabelIds: ['UNREAD']
      })
    });
    return response.ok;
  } catch (error) {
    console.error('Error marking thread as read:', error);
    return false;
  }
}

export async function sendReplyAPI(token: string, threadId: string, to: string, subject: string, body: string, messageId: string): Promise<boolean> {
  try {
    // Ensure Re: prefix
    const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;
    
    const emailLines = [
      `To: ${to}`,
      `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(replySubject)))}?=`,
      `In-Reply-To: ${messageId}`,
      `References: ${messageId}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      body
    ];

    const emailStr = emailLines.join('\r\n');
    const base64EncodedEmail = btoa(unescape(encodeURIComponent(emailStr)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: base64EncodedEmail,
        threadId: threadId
      })
    });
    
    if (!response.ok) {
      const err = await response.text();
      console.error('[InboxProvider] Reply send failed:', err);
    }
    return response.ok;
  } catch (error) {
    console.error('Error sending reply:', error);
    return false;
  }
}
